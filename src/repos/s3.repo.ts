import * as AWS from 'aws-sdk'
import * as Rx from 'rxjs'
import * as RxOps from 'rxjs/operators'
import { Entity } from '../entity'
import { IRepo } from '../repo'
import { Result } from '../result'
import hash from 'object-hash'

export type ListResponse = AWS.S3.ListObjectsV2Output
export type ListParams = AWS.S3.ListObjectsV2Request
export type LoadResponse = AWS.S3.GetObjectOutput
export type LoadParams = AWS.S3.GetObjectRequest
export type SaveResponse = AWS.S3.PutObjectOutput
export type SaveParams = AWS.S3.PutObjectRequest

const HASH_KEY_LENGTH = 6

export interface IS3RepoConfig {
  bucketName: string
  model: AWS.S3
}

export abstract class S3Repo<T extends Entity<any>, R = void, U extends IS3RepoConfig = IS3RepoConfig> implements IRepo<T, R> {
  public readonly bucketName: string
  public model: AWS.S3

  constructor (config: U) {
    this.bucketName = config.bucketName
    this.model = config.model
  }

  public abstract objectPrefix (): string

  /**
   * Return the S3 URI of the bucket or an object within the bucket
   */
  public getS3Uri (objectKey?: string): string {
    if (typeof objectKey === 'string') {
      return `s3://${this.bucketName}/${objectKey}`
    }
    return `s3://${this.bucketName}/`
  }

  private s3KeyPrefix (objectId: string): string {
    const keyHash: string = hash(objectId, { algorithm: 'sha1'}).slice(0, HASH_KEY_LENGTH)
    return `${this.objectPrefix()}:${keyHash}:`
  }

  /**
   * Generate the actual S3 Key. Reverse with {@link S3Repo.getObjectId}.
   *
   * @remarks
   *
   * This is necessary for S3 performance reasons, i.e. prevent "hot-spots".
   * See here for more: https://docs.aws.amazon.com/AmazonS3/latest/dev/optimizing-performance.html
   */
  public getS3Key (objectId: string): string {
    return `${this.s3KeyPrefix(objectId)}${objectId}`
  }

  /**
   * Retrieve the intial object ID from the S3 Key. Reverse with {@link S3Repo.getS3Key}.
   */
  public getObjectId (key: string): string {
    if (key.startsWith(this.objectPrefix())) {
      const hashAndObjectId = key.slice(`${this.objectPrefix()}:`.length)
      const objectId = hashAndObjectId.slice(HASH_KEY_LENGTH + ':'.length)
      if (key === this.getS3Key(objectId)) {
        return objectId
      }
      throw new Error('unable to extract ID from S3 key: extracted objectId does not match key')
    }
    throw new Error('unable to extract object ID from S3 key: use correct key generator')
  }

  protected getListParams (params: Partial<ListParams> = {}): ListParams {
    return {
      MaxKeys: 1000,
      ...params,
      ...{ Prefix: `${this.objectPrefix()}:`, Bucket: this.bucketName }
    }
  }

  protected getLoadParams (key: string, params: Partial<LoadParams> = {}): LoadParams {
    return Object.assign(params, { Key: this.getS3Key(key), Bucket: this.bucketName })
  }

  protected getSaveParams (key: string, body: string, params: Partial<SaveParams> = {}): SaveParams {
    return Object.assign(params, { Body: body, Key: this.getS3Key(key), Bucket: this.bucketName })
  }

  public abstract async load (key: string, partialParams: Partial<LoadParams>): Promise<Result<T>>
  public abstract async save (object: T, partialParams: Partial<SaveParams>): Promise<Result<R>>

  public loadAll (): Rx.Observable<T> {
    return this.listAllObjects().pipe(
      RxOps.mergeMap(async item => {
        return await this.load(this.getObjectId(item.Key), {})
      }),
      RxOps.mergeMap(mapResult => {
        if (mapResult.isSuccess) {
          return Rx.of(mapResult.getValue())
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
        return Result.ok<Map<string, Result<T>>>(objects.reduce((map, object) => {
          map.set(object.key, object.value)
          return map
        }, new Map<string, Result<T>>()))
      }),
    ).toPromise()
  }

  public listAllObjects (partialParams: Partial<ListParams> = {}): Rx.Observable<ListResponse['Contents'][0]> {
    return Rx.defer(async () => await this.listObjects(this.getListParams(partialParams))).pipe(
      RxOps.expand((response: Result<ListResponse>) => {
        if (response.isSuccess && response.getValue().IsTruncated) {
          const params = this.getListParams(Object.assign(
            partialParams,
            { ContinuationToken: response.getValue().NextContinuationToken }
          ))
          return Rx.defer(async () => await this.listObjects(params))
        }
        return Rx.EMPTY
      }),
      RxOps.mergeMap((response: Result<ListResponse>) => {
        if (response.isSuccess) {
          return Rx.from(response.getValue().Contents)
        }
        return Rx.from([])
      }),
      RxOps.take(20_0000)
    )
  }

  public async listObjects (partialParams: Partial<ListParams> = {}): Promise<Result<ListResponse>> {
    try {
      const params = this.getListParams(partialParams)
      return Result.ok<ListResponse>(await this.model.listObjectsV2(params).promise())
    } catch (e) {
      return Result.fail<ListResponse>(e)
    }
  }

  protected async putObject (key: string, body: string, partialParams: Partial<SaveParams> = {}): Promise<Result<SaveResponse>> {
    try {
      const params = this.getSaveParams(key, body, partialParams)
      return Result.ok<SaveResponse>(await this.model.putObject(params).promise())
    } catch (e) {
      return Result.fail<SaveResponse>(e)
    }
  }

  protected async getObject (key: string, partialParams: Partial<LoadParams> = {}): Promise<Result<LoadResponse>> {
    try {
      const params = this.getLoadParams(key, partialParams)
      return Result.ok<LoadResponse>(await this.model.getObject(params).promise())
    } catch (e) {
      return Result.fail<LoadResponse>(e)
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
