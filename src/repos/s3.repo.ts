/* eslint-disable max-lines */
import * as AWS from 'aws-sdk'
import * as Rx from 'rxjs'
import * as RxOps from 'rxjs/operators'
import { injectable, unmanaged } from 'inversify'
import { Entity } from '../entity'
import { IRepo } from '../repo'
import { Result } from '../result'

export type ListObjectsResponse = AWS.S3.ListObjectsV2Output
export type ListObjectsParams = AWS.S3.ListObjectsV2Request
export type ListVersionsResponse = AWS.S3.ListObjectVersionsOutput
export type ListVersionsParams = AWS.S3.ListObjectVersionsRequest
export type LoadResponse = AWS.S3.GetObjectOutput
export type LoadParams = AWS.S3.GetObjectRequest
export type SaveResponse = AWS.S3.PutObjectOutput
export type SaveParams = AWS.S3.PutObjectRequest
export type RemoveResponse = AWS.S3.DeleteObjectOutput
export type RemoveParams = AWS.S3.DeleteObjectRequest

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

@injectable()
export abstract class S3Repo<T extends Entity<any>, R = void, U extends IS3RepoConfig = IS3RepoConfig> implements IRepo<T, R> {
  public readonly bucketName: string
  public model: AWS.S3
  public readonly objectPrefix: string

  constructor (@unmanaged() config: U) {
    this.bucketName = config.bucketName
    this.model = config.model
    this.objectPrefix = config.objectPrefix ?? ''
  }

  public abstract deserialize (data: string): Result<T>
  public abstract serialize (object: T): Result<string>

  protected getListParams (params: Partial<ListObjectsParams> = {}): ListObjectsParams {
    if (this.objectPrefix && this.objectPrefix !== '') {
      return {
        MaxKeys: 1000,
        ...params,
        ...{ Prefix: this.objectPrefix, Bucket: this.bucketName }
      }
    }
    return {
      MaxKeys: 1000,
      ...params,
      ...{ Bucket: this.bucketName }
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

  protected getRemoveParams (key: string, params: Partial<RemoveParams> = {}): Result<RemoveParams> {
    if (key.startsWith(this.objectPrefix)) {
      return Result.ok(Object.assign(params, { Key: key, Bucket: this.bucketName }))
    }
    return Result.fail(new Error(`invalid key: "${key}" does not match with prefix "${this.objectPrefix}"`))
  }

  protected getListVersionsParams (params: Partial<ListVersionsParams> = {}): Result<ListVersionsParams> {
    if (typeof params.Prefix === 'undefined') {
      params.Prefix = this.objectPrefix
    }
    if (params.Prefix.startsWith(this.objectPrefix)) {
      return Result.ok({ MaxKeys: 1000, ...params, ...{Bucket: this.bucketName} })
    }
    return Result.fail(new Error(`invalid Prefix: ${params.Prefix} does not match with prefix ${this.objectPrefix}`))
  }

  public async load (key: string, partialParams: Partial<LoadParams> = {}): Promise<Result<T>> {
    try {
      const responseResult = await this.getObject(key, partialParams)
      if (responseResult.isSuccess) {
        const response = responseResult.unwrap()
        const result = this.deserialize((response.Body as Buffer).toString('utf8'))
        return result
      }
      return Result.fail(responseResult.error)
    } catch (e) {
      return Result.fail(e)
    }
  }

  public async save (object: T, partialParams: Partial<SaveParams> = {}): Promise<Result<R>> {
    try {
      const key = object.id
      const serializedResult = this.serialize(object)
      if (serializedResult.isSuccess) {
        const responseResult = await this.putObject(key, serializedResult.unwrap(), partialParams)
        if (responseResult.isSuccess) {
          return Result.ok()
        }
        return Result.fail(responseResult.error)
      }
      return Result.fail(serializedResult.error)
    } catch (e) {
      return Result.fail(e)
    }
  }

  public async remove (key: string, partialParams: Partial<RemoveParams> = {}): Promise<Result<R>> {
    try {
      const responseResult = await this.deleteObject(key, partialParams)
      if (responseResult.isSuccess) {
        return Result.ok()
      }
      return Result.fail(responseResult.error)
    } catch (e) {
      return Result.fail(e)
    }
  }

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

  public async getObjectVersions (key: string): Promise<ListVersionsResponse['Versions']> {
    return await this.listAllObjectVersions({ Prefix: key }).pipe(
      RxOps.filter(versionObject => {
        return versionObject.Key === key
      }),
      RxOps.toArray()
    ).toPromise()
  }

  public listAllObjectVersions (partialParams: Partial<ListVersionsParams> = {}): Rx.Observable<AWS.S3.ObjectVersionList[0]> {
    return Rx.defer(async () => {
      return await this.listObjectVersions(this.getListVersionsParams(partialParams).unwrap())
    }).pipe(
      RxOps.expand(response => {
        if (response.isSuccess && response.unwrap().IsTruncated) {
          const params = this.getListParams(Object.assign(
            partialParams,
            {
              KeyMarker: response.unwrap().NextKeyMarker,
              VersionIdMarker: response.unwrap().NextVersionIdMarker
            }
          ))
          return Rx.defer(async () => await this.listObjectVersions(params))
        }
        return Rx.EMPTY
      }),
      RxOps.mergeMap(response => {
        if (response.isSuccess) {
          return Rx.from(response.unwrap().Versions)
        }
        return Rx.from([])
      })
    )
  }

  public async listObjectVersions (
    partialParams: Partial<ListVersionsParams>
  ): Promise<Result<ListVersionsResponse>> {
    try {
      const paramsResult = this.getListVersionsParams(partialParams)
      if (paramsResult.isSuccess) {
        return Result.ok(await this.model.listObjectVersions(paramsResult.unwrap()).promise())
      }
      return paramsResult
    } catch (e) {
      return Result.fail(e)
    }
  }

  public listAllObjectKeys (partialParams: Partial<ListObjectsParams> = {}): Rx.Observable<string> {
    return this.listAllObjects(partialParams).pipe(
      RxOps.map(object => object.Key)
    )
  }

  public listAllObjects (partialParams: Partial<ListObjectsParams> = {}): Rx.Observable<AWS.S3.ObjectList[0]> {
    return Rx.defer(async () => await this.listObjects(this.getListParams(partialParams))).pipe(
      RxOps.expand(response => {
        if (response.isSuccess && response.unwrap().IsTruncated) {
          const params = this.getListParams(Object.assign(
            partialParams,
            { ContinuationToken: response.unwrap().NextContinuationToken }
          ))
          return Rx.defer(async () => await this.listObjects(params))
        }
        return Rx.EMPTY
      }),
      RxOps.mergeMap(response => {
        if (response.isSuccess) {
          return Rx.from(response.unwrap().Contents)
        }
        return Rx.from([])
      })
    )
  }

  public async listObjects (partialParams: Partial<ListObjectsParams> = {}): Promise<Result<ListObjectsResponse>> {
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

  protected async deleteObject (key: string, partialParams: Partial<RemoveParams> = {}): Promise<Result<RemoveResponse>> {
    try {
      const paramsResult = this.getRemoveParams(key, partialParams)
      if (paramsResult.isSuccess) {
        return Result.ok(await this.model.deleteObject(paramsResult.unwrap()).promise())
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
