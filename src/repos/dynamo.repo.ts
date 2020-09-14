import * as AWS from 'aws-sdk'
import { Entity } from '../entity'
import { IRepo } from '../repo'
import { Result } from '../result'

type SaveBatcheParams = AWS.DynamoDB.DocumentClient.BatchWriteItemInput
type LoadBatchParams = AWS.DynamoDB.DocumentClient.BatchGetItemInput

export interface IDynamoRepoConfig {
  model: AWS.DynamoDB
  tableName: string
}

export abstract class DynamoRepo<T extends Entity<any>, U extends IDynamoRepoConfig = IDynamoRepoConfig> implements IRepo<T> {
  public readonly tableName: string
  protected db: AWS.DynamoDB
  public model: AWS.DynamoDB.DocumentClient

  constructor (config: U) {
    this.db = config.model
    this.tableName = config.tableName
    this.model = new AWS.DynamoDB.DocumentClient({
      params: {
        TableName: this.tableName
      },
      service: this.db
    })
  }

  public abstract async saveBatch (objects: T[]): Promise<Result<void>>
  public abstract async loadBatch (keys: string[]): Promise<Result<Map<string, Result<T>>>>

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
