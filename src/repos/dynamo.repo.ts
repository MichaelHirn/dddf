/* eslint-disable max-lines */
import * as AWS from 'aws-sdk'
import * as Rx from 'rxjs'
import * as RxOps from 'rxjs/operators'
import { injectable, unmanaged } from 'inversify'
import { Entity } from '../entity'
import { IRepo } from '../repo'
import { Result } from '../result'

type SaveBatcheParams = AWS.DynamoDB.DocumentClient.BatchWriteItemInput
type LoadBatchParams = AWS.DynamoDB.DocumentClient.BatchGetItemInput
type ScanParams = AWS.DynamoDB.DocumentClient.ScanInput
type ScanResponse = AWS.DynamoDB.DocumentClient.ScanOutput
interface ParallelScanResponse {
  scanResponse: ScanResponse
  params: Partial<ScanParams>
}
type QueryParams = AWS.DynamoDB.DocumentClient.QueryInput
type QueryResponse = AWS.DynamoDB.DocumentClient.QueryOutput
interface ParallelQueryResponse {
  queryResponse: QueryResponse
  params: Partial<QueryParams>
}

export interface IDynamoRepoConfig {
  model: AWS.DynamoDB
  tableName: string
}

@injectable()
export abstract class DynamoRepo<T extends Entity<any>, U extends IDynamoRepoConfig = IDynamoRepoConfig> implements IRepo<T> {
  public readonly tableName: string
  protected db: AWS.DynamoDB
  public model: AWS.DynamoDB.DocumentClient

  constructor (@unmanaged() config: U) {
    this.db = config.model
    this.tableName = config.tableName
    this.model = new AWS.DynamoDB.DocumentClient({
      params: {
        TableName: this.tableName
      },
      service: this.db
    })
  }

  public abstract serialize (object: T): Result<any>

  public abstract deserialize (dynamoItem: any): Result<T>

  /**
   * A single primary key attribute values that define specific items in the table.
   *
   * @remarks
   *
   * For each primary key, you must provide all of the key attributes. For example, with a simple primary key,
   * you only need to provide the partition key value. For a composite key, you must provide both the partition
   * key value and the sort key value.
   *
   * @example
   *
   * ```typescript
   * public toPrimaryKeyAttribute (input: string): object {
   *    return { singlePrimaryKey: input }
   * }
   * ```
   *
   * or
   *
   * ```typescript
   * public toPrimaryKeyAttribute (input: {partitionKey: string, sortKey: number}): object {
   *    return { id: partitionKey, exampleField: sortKey }
   * }
   * ```
   *
   */
  public abstract toPrimaryKeyAttribute (input: any): object

  public generateSaveBatchParams (objects: T[]): SaveBatcheParams {
    const param: SaveBatcheParams = { RequestItems: {} }
    param.RequestItems[this.tableName] = objects.map(object => {
      return {
        PutRequest: {
          Item: this.serialize(object).unwrap()
        }
      }
    })
    return param
  }

  public generateDeleteBatchParams (keys: string[]): SaveBatcheParams {
    const param: SaveBatcheParams = { RequestItems: {} }
    param.RequestItems[this.tableName] = keys.map(key => {
      return {
        DeleteRequest: {
          Key: this.toPrimaryKeyAttribute(key)
        }
      }
    })
    return param
  }

  public generateLoadBatchParams (keys: string[]): LoadBatchParams {
    const param: LoadBatchParams = { RequestItems: {} }
    param.RequestItems[this.tableName] = {
      Keys: keys.map(key => this.toPrimaryKeyAttribute(key))
    }
    return param
  }

  protected generateScanParams (scanParams: Partial<ScanParams>): ScanParams {
    return Object.assign(scanParams, { TableName: this.tableName })
  }

  protected generateQueryParams (queryParams: Partial<QueryParams>): QueryParams {
    return Object.assign(queryParams, { TableName: this.tableName })
  }

  public async removeBatch (keys: string[]): Promise<Result<void>> {
    const results = await Rx.from(keys).pipe(
      // we can have a maximum of 25 request items in a DynamoDB `batchWrite` request
      RxOps.bufferCount(25),
      RxOps.mergeMap(async (objectBatch) => {
        try {
          const params = this.generateDeleteBatchParams(objectBatch)
          await this.model.batchWrite(params).promise()
          return Result.ok<void>()
        } catch (error) {
          return Result.fail<void>(error)
        }
      }),
      RxOps.toArray()
    ).toPromise()
    if (results.every(result => result.isSuccess)) {
      return Result.ok()
    }
    const failedResults = results.filter(result => result.isFailure)
    return Result.fail(failedResults[0].error)
  }

  public async saveBatch (objects: T[]): Promise<Result<void>> {
    const results = await Rx.from(objects).pipe(
      // we can have a maximum of 25 request items in a DynamoDB `batchWrite` request
      RxOps.bufferCount(25),
      RxOps.mergeMap(async (objectBatch) => {
        try {
          const params = this.generateSaveBatchParams(objectBatch)
          await this.model.batchWrite(params).promise()
          return Result.ok<void>()
        } catch (error) {
          return Result.fail<void>(error)
        }
      }),
      RxOps.toArray()
    ).toPromise()
    if (results.every(result => result.isSuccess)) {
      return Result.ok()
    }
    const failedResults = results.filter(result => result.isFailure)
    return Result.fail(failedResults[0].error)
  }

  public async loadBatch (keys: string[]): Promise<Result<Map<string, Result<T>>>> {
    try {
      const responseItems = await Rx.from(keys).pipe(
        // we can have a maximum of 100 request items in a DynamoDB `batchGet` request
        RxOps.bufferCount(100),
        RxOps.mergeMap(async keys => {
          const params = this.generateLoadBatchParams(keys)
          const response = await this.model.batchGet(params).promise()
          const responseItems = response.Responses[this.tableName]
          return responseItems
        }),
        RxOps.concatMap(responseItems => responseItems),
        RxOps.toArray()
      ).toPromise()
      // NOTE: this does not work when both a hashKey and a rangeKey are defined for the table
      const indexKeys = Object.keys(this.toPrimaryKeyAttribute(''))
      const map = (responseItems as any).reduce((profiles, responseObject: any) => {
        profiles.set(
          responseObject[indexKeys[0]],
          this.deserialize(responseObject)
        )
        return profiles
      }, new Map<string, Result<T>>())
      DynamoRepo.addMissingKeys<T>(keys, map)
      return Result.ok(map)
    } catch (e) {
      return Result.fail(e)
    }
  }

  public loadAll (concurrency: number = 10): Rx.Observable<T> {
    return this._parallelScan(concurrency).pipe(
      RxOps.expand((response: ParallelScanResponse) => {
        const { LastEvaluatedKey } = response.scanResponse
        if (LastEvaluatedKey instanceof Object) {
          return this._scan({
            ...response.params,
            ExclusiveStartKey: LastEvaluatedKey
          })
        }
        return Rx.EMPTY
      }),
      RxOps.mergeMap(response => {
        const profiles = response.scanResponse.Items.map((item: any) => {
          return this.deserialize(item).unwrap()
        })
        return Rx.from(profiles)
      })
    )
  }

  /**
   * Make initial parallel scan requests with desired concurrency.
   *
   * @remarks
   *
   * To continue a parallel scan use {@link DynamoRepo._scan}.
   *
   */
  public _parallelScan (concurrency: number, scanParams: Partial<ScanParams> = {}): Rx.Observable<ParallelScanResponse> {
    return Rx.range(0, concurrency).pipe(
      RxOps.mergeMap(async segment => {
        const segmentParams = { Segment: segment, TotalSegments: concurrency }
        const params = this.generateScanParams({...scanParams, ...segmentParams })
        return this._scan(params)
      }),
      RxOps.mergeMap(response => Rx.from(response))
    )
  }

  protected _scan (scanParams: Partial<ScanParams>): Rx.Observable<ParallelScanResponse> {
    return Rx.defer(async () => {
      const params = this.generateScanParams(scanParams)
      const result = await this.model.scan(params).promise()
      return {
        scanResponse: result,
        params
      }
    })
  }

  public async scan (startKey?: {[index: string]: string | number}): Promise<Result<T[]>> {
    try {
      const params = this.generateScanParams({ ExclusiveStartKey: startKey })
      const response = await this.model.scan(params).promise()
      const result = response.Items.map((responseObject: any) => {
        return this.deserialize(responseObject).unwrap()
      })
      return Result.ok(result)
    } catch (e) {
      return Result.fail(e)
    }
  }

  public query (queryParams: Partial<QueryParams>): Rx.Observable<T> {
    return this._query(queryParams).pipe(
      RxOps.expand((response: ParallelQueryResponse) => {
        const { LastEvaluatedKey } = response.queryResponse
        if (LastEvaluatedKey instanceof Object) {
          return this._query({
            ...response.params,
            ExclusiveStartKey: LastEvaluatedKey
          })
        }
        return Rx.EMPTY
      }),
      RxOps.mergeMap(response => {
        const objects = response.queryResponse.Items.map((item: any) => {
          return this.deserialize(item).unwrap()
        })
        return Rx.from(objects)
      })
    )
  }

  protected _query (queryParams: Partial<QueryParams>): Rx.Observable<ParallelQueryResponse> {
    return Rx.defer(async () => {
      const params = this.generateQueryParams(queryParams)
      const result = await this.model.query(params).promise()
      return {
        queryResponse: result,
        params
      }
    })
  }

  public async remove (key: string): Promise<Result<void>> {
    return await this.removeBatch([key])
  }

  public async save (object: T): Promise<Result<void>> {
    return await this.saveBatch([object])
  }

  public async load (key: string): Promise<Result<T>> {
    const batchResult = await this.loadBatch([key])
    if (batchResult.isSuccess) {
      if (batchResult.unwrap().has(key)) {
        return batchResult.unwrap().get(key)
      }
      return Result.fail(new Error(`failed to load ${key}`))
    }
    return Result.fail(batchResult.error)
  }

  protected static addMissingKeys<T>(keys: string[], map: Map<string, Result<T>>): Map<string, Result<T>> {
    return keys.reduce((map, key) => {
      if (!map.has(key)) {
        map.set(key, Result.fail<T>(new Error('not found')))
      }
      return map
    }, map)
  }
}
