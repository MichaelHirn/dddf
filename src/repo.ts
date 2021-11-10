import { Entity } from './entity'
import { Result } from './result'

export interface IRepo<T extends Entity<any>, R = void> {
  save: (t: T, args: any) => Promise<Result<R>>
  load: (t: string, args: any) => Promise<Result<T>>
  remove: (t: string, args: any) => Promise<Result<R>>
}

export interface IRepoLoadWithVersionResultBody<T extends Entity<any>> {
  // the creation date of that version
  createdAt: Date
  // can be a Date (e.g. to support Last-Modified flows) or a string (e.g. to support ETag flows)
  version: string | Date
  entity: T
}

export interface IRepoVersionAwareCurrent<T extends Entity<any>, R = void> extends IRepo<T, R> {

  /**
  * Necessary for Cache to support {@link CacheControlEntity} to determine if cache entry is expired or not
  */
  loadWithVersion: (t: string, args: any) => Promise<Result<IRepoLoadWithVersionResultBody<T>>>
}

export interface IRepoLoadIfNewerVersionExistsResultBody<T extends Entity<any>> {
  // indicates if a newer version than the one submitted in the request (see currentVersion) exists
  newerVersionExists: boolean
  // needs to be present if `newerVersionExists` is `true`. Otherwise it must be `undefined`.
  newestVersion?: T
}

export interface IRepoVersionAwareNewer<T extends Entity<any>, R = void> extends IRepo<T, R> {

  /**
  * Necessary for Cache to support {@link CacheControlEntity} and its revalidate flow
  *
  * @param currentVersion - can be a Date (e.g. to support Last-Modified flows) or a string (e.g. to support ETag flows)
  */
  loadIfNewerVersionExists: (t: string, currentVersion: string | Date, args: any) => Promise<Result<IRepoLoadIfNewerVersionExistsResultBody<T>>>
}
