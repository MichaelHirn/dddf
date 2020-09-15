import { injectable, unmanaged } from 'inversify'
import { Entity } from '../entity'
import { IRepo } from '../repo'
import { Result } from '../result'

export interface ICacheRepoConfig<T extends Entity<any>> {

  /**
   * The repo that serves as the cache storage
   */
  cacheRepo: IRepo<T>

  /**
   * The repo that serves as the data storage
   */
  dataRepo: IRepo<T>
}

/**
 * Generic Cache Repo that can be constructed from two other repos.
 *
 * @alpha
 */
@injectable()
export class CacheRepo<T extends Entity<any>> implements IRepo<T> {
  protected readonly cacheRepo: IRepo<T>
  protected readonly dataRepo: IRepo<T>

  public constructor (@unmanaged() config: ICacheRepoConfig<T>) {
    this.cacheRepo = config.cacheRepo
    this.dataRepo = config.dataRepo
  }

  public async load (key: string, config: { cacheRepo: any, dataRepo: any }): Promise<Result<T>> {
    const cacheLoadResult = await this.cacheRepo.load(key, config.cacheRepo)
    if (cacheLoadResult.isSuccess) {
      return cacheLoadResult
    }
    const dataLoadResult = await this.dataRepo.load(key, config.dataRepo)
    if (dataLoadResult.isSuccess) {
      await this.cacheRepo.save(dataLoadResult.unwrap(), {})
    }
    return dataLoadResult
  }

  public async save (domainObject: T, config: { cacheRepo: any, dataRepo: any }): Promise<Result<void>> {
    const cacheLoadResult = await this.cacheRepo.load(domainObject.id, {})
    if (cacheLoadResult.isSuccess) {
      await this.cacheRepo.save(domainObject, config.cacheRepo)
    }
    return await this.dataRepo.save(domainObject, config.dataRepo)
  }
}
