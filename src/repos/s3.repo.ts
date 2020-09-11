import * as AWS from 'aws-sdk'
import * as Rx from 'rxjs'
import * as RxOps from 'rxjs/operators'
import { Entity } from '../entity'
import { IRepo } from '../repo'
import { Result } from '../result'

export type ListResponse = AWS.S3.ListObjectsV2Output
export type ListParams = AWS.S3.ListObjectsV2Request
export type LoadResponse = AWS.S3.GetObjectOutput
export type LoadParams = AWS.S3.GetObjectRequest
export type SaveResponse = AWS.S3.PutObjectOutput
export type SaveParams = AWS.S3.PutObjectRequest

export interface IS3RepoConfig {

  /**
   * The name of the Bucket that this Repo will access
   */
  bucketName: string

  /**
   * The AWS.S3 instance that this repo will use to make requests
   *
   * @remarks
   *
   * Authentication is best setup when instantiating the AWS.S3 client
   *
   */
  model: AWS.S3

  /**
   * Optional prefix that the Repo will access.
   *
   * @remarks
   *
   * If a objectPrefix is provided it will only acccess or see objects
   * that have the objectPrefix.
   *
   */
  objectPrefix?: string
}

export abstract class S3Repo<T extends Entity<any>, R = void, U extends IS3RepoConfig = IS3RepoConfig> implements IRepo<T, R> {
  public readonly bucketName: string
  public model: AWS.S3
  public readonly objectPrefix: string = ''

  constructor (config: U) {
    this.bucketName = config.bucketName
    this.model = config.model
    this.objectPrefix = config.objectPrefix
  }

  protected getListParams (params: Partial<ListParams> = {}): ListParams {
    return {
      MaxKeys: 1000,
      ...params,
      ...{ Prefix: this.objectPrefix, Bucket: this.bucketName }
    }
  }

  protected getLoadParams (key: string, params: Partial<LoadParams> = {}): Result<LoadParams> {
    if (key.startsWith(this.objectPrefix)) {
      return Result.ok(Object.assign(params, { Key: key, Bucket: this.bucketName }))
    }
    return Result.fail(new Error(`invalid key: "${key}" does not match with prefix "${this.objectPrefix}"`))
  }

  protected getSaveParams (key: string, body: string, params: Partial<SaveParams> = {}): Result<SaveParams> {
    if (key.startsWith(this.objectPrefix)) {
      return Result.ok(Object.assign(params, { Body: body, Key: key, Bucket: this.bucketName }))
    }
    return Result.fail(new Error(`invalid key: "${key}" does not match with prefix "${this.objectPrefix}"`))
  }

  public abstract async load (key: string, partialParams: Partial<LoadParams>): Promise<Result<T>>
  public abstract async save (object: T, partialParams: Partial<SaveParams>): Promise<Result<R>>

  public loadAll (): Rx.Observable<T> {
    return this.listAllObjects().pipe(
      RxOps.mergeMap(async item => {
        return await this.load(item.Key, {})
      }),
      RxOps.mergeMap(mapResult => {
        if (mapResult.isSuccess) {
          return Rx.of(mapResult.unwrap())
        }
        return Rx.empty()
      })
    )
  }

  public async saveBatch (objects: T[], partialParams: Partial<SaveParams> = {}): Promise<Result<R>> {
    return await Rx.from(objects).pipe(
      RxOps.mergeMap(async object => {
        return await this.save(object, partialParams)
      })
    ).toPromise()
  }

  public async loadBatch (keys: string[], partialParams: Partial<LoadParams> = {}): Promise<Result<Map<string, Result<T>>>> {
    return await Rx.from(keys).pipe(
      RxOps.mergeMap(async key => {
        return {
          key,
          value: await this.load(key, partialParams)
        }
      }),
      RxOps.toArray(),
      RxOps.map(objects => {
        return Result.ok(objects.reduce((map, object) => {
          map.set(object.key, object.value)
          return map
        }, new Map<string, Result<T>>()))
      }),
    ).toPromise()
  }

  public listAllObjectKeys (partialParams: Partial<ListParams> = {}): Rx.Observable<string> {
    return this.listAllObjects(partialParams).pipe(
      RxOps.map(object => object.Key)
    )
  }

  public listAllObjects (partialParams: Partial<ListParams> = {}): Rx.Observable<ListResponse['Contents'][0]> {
    return Rx.defer(async () => await this.listObjects(this.getListParams(partialParams))).pipe(
      RxOps.expand((response: Result<ListResponse>) => {
        if (response.isSuccess && response.unwrap().IsTruncated) {
          const params = this.getListParams(Object.assign(
            partialParams,
            { ContinuationToken: response.unwrap().NextContinuationToken }
          ))
          return Rx.defer(async () => await this.listObjects(params))
        }
        return Rx.EMPTY
      }),
      RxOps.mergeMap((response: Result<ListResponse>) => {
        if (response.isSuccess) {
          return Rx.from(response.unwrap().Contents)
        }
        return Rx.from([])
      })
    )
  }

  public async listObjects (partialParams: Partial<ListParams> = {}): Promise<Result<ListResponse>> {
    try {
      const params = this.getListParams(partialParams)
      return Result.ok(await this.model.listObjectsV2(params).promise())
    } catch (e) {
      return Result.fail(e)
    }
  }

  protected async putObject (key: string, body: string, partialParams: Partial<SaveParams> = {}): Promise<Result<SaveResponse>> {
    try {
      const paramsResult = this.getSaveParams(key, body, partialParams)
      if (paramsResult.isSuccess) {
        return Result.ok(await this.model.putObject(paramsResult.unwrap()).promise())
      }
      return paramsResult
    } catch (e) {
      return Result.fail(e)
    }
  }

  protected async getObject (key: string, partialParams: Partial<LoadParams> = {}): Promise<Result<LoadResponse>> {
    try {
      const paramsResult = this.getLoadParams(key, partialParams)
      if (paramsResult.isSuccess) {
        return Result.ok(await this.model.getObject(paramsResult.unwrap()).promise())
      }
      return paramsResult
    } catch (e) {
      return Result.fail(e)
    }
  }

  protected static addMissingKeys<T>(keys: string[], map: Map<string, Result<T>>): Map<string, Result<T>> {
    return keys.reduce((map, key) => {
      if (!map.has(key)) {
        map.set(key, Result.fail(new Error('not found')))
      }
      return map
    }, map)
  }
}
