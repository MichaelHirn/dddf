import { IRepo, IRepoVersionAwareCurrent, IRepoVersionAwareNewer } from '../repo'
import { injectable, unmanaged } from 'inversify'
import { CacheControlEntity } from '../cache/cacheControl.entity'
import { Entity } from '../entity'
import { Result } from '../result'

export interface ICacheRepoConfig<T extends Entity<any>> {

  /**
   * The repo that serves as the cache storage
   */
  cacheRepo: IRepoVersionAwareCurrent<T>

  /**
   * The repo that serves as the data storage
   */
  dataRepo: IRepoVersionAwareNewer<T>
}

export interface CacheRepoMethodConfig {
  // controlling the {@link CacheRepo.cacheRepo} service behavior
  cacheControl?: CacheControlEntity
  // passed on the the {@link CacheRepo.cacheRepo} service when called
  cacheRepo: any
  // passed on the the {@link CacheRepo.dataRepo} service when called
  dataRepo: any
}

/**
 * Generic Cache Repo that can be constructed from two other repos.
 *
 * @alpha
 */
@injectable()
export class CacheRepo<T extends Entity<any>> implements IRepo<T> {
  protected readonly cacheRepo: IRepoVersionAwareCurrent<T>
  protected readonly dataRepo: IRepoVersionAwareNewer<T>

  public constructor (@unmanaged() config: ICacheRepoConfig<T>) {
    this.cacheRepo = config.cacheRepo
    this.dataRepo = config.dataRepo
  }

  public async load (key: string, config: CacheRepoMethodConfig): Promise<Result<T>> {
    const cacheControl = config.cacheControl

    // 1. no cache-control provided; default is immutable cache with no expiry, i.e. never hit data source again if we have something in cache
    if (typeof cacheControl !== 'object') {
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

    // 2. cache-control provided ...
    // 2.1. ... and cache is disabled
    if (typeof cacheControl === 'object' && cacheControl.doNotCache()) {
      // bypass the cache entirely
      return await this.dataRepo.load(key, config.dataRepo)
    }

    // 2.2 ... and cache is enabled ...
    // check if the cache holds a version
    const cacheVersionResult = await this.cacheRepo.loadWithVersion(key, config.cacheRepo)

    // 2.2.1 ... and cache does not hold a version
    if (cacheVersionResult.isFailure) {
      // fetch from data repo and write to cache for next time
      const dataLoadResult = await this.dataRepo.load(key, config.dataRepo)
      if (dataLoadResult.isSuccess) {
        await this.cacheRepo.save(dataLoadResult.unwrap(), {})
      }
      return dataLoadResult
    }

    // 2.2.2 ... and cache does hold a version - let's figure out what action we should take: refresh, revalidate, or return cache
    const cacheExistsBody = cacheVersionResult.unwrap()
    const cacheAction = cacheControl.mustDoWhat(cacheExistsBody.createdAt)
    if (cacheAction === 'refresh') {
      // 2.2.2.1 ... refresh
      const dataLoadResult = await this.dataRepo.load(key, config.dataRepo)
      if (dataLoadResult.isSuccess) {
        await this.cacheRepo.save(dataLoadResult.unwrap(), {})
      }
      return dataLoadResult
    } else if (cacheAction === 'revalidate') {
      // 2.2.2.2 ... revalidate
      const newestVersionResult = await this.dataRepo.loadIfNewerVersionExists(key, cacheExistsBody.createdAt, config.dataRepo)
      if (newestVersionResult.isSuccess) {
        const newestVersionBody = newestVersionResult.unwrap()
        // check if newer version exists
        if (newestVersionBody.newerVersionExists) {
          // newer version exists
          // store newest version in cache
          await this.cacheRepo.save(newestVersionBody.newestVersion, {})
          // and return newest version
          return Result.ok(newestVersionBody.newestVersion)
        }
        // no newer version exists so we can return the cache entry
        return Result.ok(cacheExistsBody.entity)
      }
      return Result.fail(newestVersionResult.error)
    }
    // 2.2.2.3 ... nothing
    return Result.ok(cacheExistsBody.entity)
  }

  public async save (domainObject: T, config: CacheRepoMethodConfig): Promise<Result<void>> {
    const cacheControl = config.cacheControl

    // 1. cache-control provided and cache is disabled
    if (typeof cacheControl === 'object' && cacheControl.doNotCache()) {
      // bypass the cache entirely
      return await this.dataRepo.save(domainObject, config.dataRepo)
    }

    // 2. no cache-control provided or cache-control provided and cache is enabled
    const cacheSaveResult = await this.cacheRepo.save(domainObject, config.cacheRepo)
    if (cacheSaveResult.isFailure) {
      return Result.fail(cacheSaveResult.error)
    }
    const dataSaveResult = await this.dataRepo.save(domainObject, config.dataRepo)
    if (dataSaveResult.isFailure) {
      // rollback the cache
      const cacheRemoveResult = await this.cacheRepo.remove(domainObject.id, {})
      if (cacheRemoveResult.isFailure) {
        return Result.fail(cacheRemoveResult.error)
      }
      return Result.fail(dataSaveResult.error)
    }
    return dataSaveResult
  }

  /* eslint-disable-next-line class-methods-use-this */
  public async remove (key: string, config: CacheRepoMethodConfig): Promise<Result<void>> {
    throw new Error('remove is not implemented for Cache; provide custom implementation')
  }
}
