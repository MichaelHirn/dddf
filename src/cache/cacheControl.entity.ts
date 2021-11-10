import { Entity } from '../entity'
import { Result } from '../result'

export enum CacheControlAge {
  SECOND = 1,
  MINUTE = 60,
  HOUR = 3_600,
  DAY = 86_400,
  WEEK = 604_800,
  MONTH = 2_592_000,
  QUARTER = 7_776_000,
  YEAR = 31_536_000,
  // constant value of 9007199254740991 or 285 million years
  ETERNAL = Number.MAX_SAFE_INTEGER
}

export interface CacheControlProps {

  /**
   * An identifier that uniquely identifies the subject for which the cache-control applies.
   *
   * @remarks
   *
   * In HTTP caching this would be a URL that uniquely identifies the resource.
   *
   */
  subjectId: string

  noStore: boolean
  noCache: boolean
  mustRevalidate: boolean

  /**
   * The maximum allowd lifetime of the cache subject in seconds.
   */
  maxAge: number
}

/**
* Universal control for caching behavior, e.g. with {@link CacheRepo}.
*
* @remarks
* For more information on caching and cache-control have a look at these two links:
* - https://developers.google.com/web/fundamentals/performance/get-started/httpcaching-6
* - https://jakearchibald.com/2016/caching-best-practices/
*
* @remarks
* To get started you need to know that there are only four types of CacheControl:
* 1. No Cache Control
* 2. Immutable Cache Control
* 3. Mutable Cache Control (Strict)
* 4. Mutable Cache Control (Not Strict)
* (see the four static methods below to create them easily)
*
* and they differ in how they handle fresh and expired caches (see `maxAge` and `isExpired`).
*
* There are only three ways they can respond to a fresh or expired cache (see `mustDoWhat`):
* 1. refresh - load version directly from origin server, to not use any possible cache entries
* 2. revalidate - check with origin server if a newer version exists before returning any possible cache entries
* 3. nothing - return possible cache entries, do not check with origin server
*
* to see how each of the four types respond to fresh and expired caches see the CacheControl spec test file.
*/
export class CacheControlEntity extends Entity<CacheControlProps> {
  public subjectId (): string {
    return this.props.subjectId
  }

  public isNoStore (): boolean {
    return this.props.noStore
  }

  public isNoCache (): boolean {
    return this.props.noCache
  }

  public isMustRevalidate (): boolean {
    return this.props.mustRevalidate
  }

  public maxAge (): number {
    return this.props.maxAge
  }

  public isExpired (startDate: Date, nowDate: Date = new Date()): boolean {
    // must always be refreshed if cache-control is no-store
    if (this.isNoStore()) {
      return true
    }
    const timestampStartSeconds = Math.round(startDate.getTime() / 1000)
    const timestampNowSeconds = Math.round(nowDate.getTime() / 1000)
    const age = timestampNowSeconds - timestampStartSeconds
    return age > this.maxAge()
  }

  public doNotCache (): boolean {
    if (this.isNoStore()) {
      return true
    }
    return false
  }

  public doCache (): boolean {
    return !this.doNotCache()
  }

  public mustRevalidate (startDate: Date, nowDate: Date = new Date()): boolean {
    // must always be *refreshed* if cache-control is no-store
    if (this.isNoStore()) {
      return false
    }
    // must always be revalidated if cache-control is no-cache, even if it is not expired
    if (this.isNoCache()) {
      return true
    }
    // only revalidated if it is actually expired
    if (this.isMustRevalidate() && this.isExpired(startDate, nowDate)) {
      return true
    }
    // in all other cases must not be revalidated
    return false
  }

  public mustRefresh (startDate: Date, nowDate: Date = new Date()): boolean {
    // must always be refreshed if cache-control is no-store
    if (this.isNoStore()) {
      return true
    }
    // immutable subject and is finally expired so we can directly refresh as revalidate would not be useful
    if (!this.isNoCache() && !this.isMustRevalidate() && this.isExpired(startDate, nowDate)) {
      return true
    }
    // in all other cases must only be refreshed if revalidate reveals that it needs to be refreshed
    return false
  }

  public mustDoWhat (startDate: Date, nowDate: Date = new Date()): 'refresh' | 'revalidate' | 'nothing' {
    if (this.mustRefresh(startDate, nowDate)) {
      return 'refresh'
    } else if (this.mustRevalidate(startDate, nowDate)) {
      return 'revalidate'
    }
    return 'nothing'
  }

  public static from (props: CacheControlProps): Result<CacheControlEntity> {
    if (props.noStore && (props.noCache || props.mustRevalidate)) {
      return Result.fail(new Error('invalid input: if no-store is true, no-cache and must-revalidate must be false'))
    }
    if (props.noCache && (props.noStore || props.mustRevalidate)) {
      return Result.fail(new Error('invalid input: if no-cache is true, no-store and must-revalidate must be false'))
    }
    if (props.mustRevalidate && (props.noStore || props.noCache)) {
      return Result.fail(new Error('invalid input: if must-revalidate is true, no-store and no-cache must be false'))
    }
    return Result.ok(new CacheControlEntity(props, props.subjectId))
  }

  public static asNoCache (maxAge: number, subjectId: string): Result<CacheControlEntity> {
    return CacheControlEntity.from({
      subjectId,
      noStore: true,
      noCache: false,
      mustRevalidate: false,
      maxAge
    })
  }

  public static asImmutableCache (maxAge: number, subjectId: string): Result<CacheControlEntity> {
    return CacheControlEntity.from({
      subjectId,
      noStore: false,
      noCache: false,
      mustRevalidate: false,
      maxAge
    })
  }

  public static asMutableCacheStrict (maxAge: number, subjectId: string): Result<CacheControlEntity> {
    return CacheControlEntity.from({
      subjectId,
      noStore: false,
      noCache: true,
      mustRevalidate: false,
      maxAge
    })
  }

  public static asMutableCacheNotStrict (maxAge: number, subjectId: string): Result<CacheControlEntity> {
    return CacheControlEntity.from({
      subjectId,
      noStore: false,
      noCache: false,
      mustRevalidate: true,
      maxAge
    })
  }
}
