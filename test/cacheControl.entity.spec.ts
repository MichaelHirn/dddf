import 'reflect-metadata'
import { CacheControlAge, CacheControlEntity } from '../src'

describe('CacheControlEntity', () => {
  test('isExpired works correctly for expired dates', () => {
    const cacheControl = CacheControlEntity.asMutableCacheNotStrict(60, '123').unwrap()
    expect(cacheControl.isExpired(new Date(Date.now() - 61 * 1_000))).toBe(true)
  })

  test('isExpired works correctly for non-expired dates', () => {
    const cacheControl = CacheControlEntity.asMutableCacheNotStrict(60, '123').unwrap()
    expect(cacheControl.isExpired(new Date())).toBe(false)
  })

  describe('mustDoWhat', () => {
    const subjectId = 'abc'
    const maxAge = CacheControlAge.MINUTE
    const expiredStartDate = new Date(Date.now() - 1.2 * CacheControlAge.MINUTE * 1_000)
    const freshStartDate = new Date(Date.now() - 0.2 * CacheControlAge.MINUTE * 1_000)

    // No Cache

    test('NoCache & expired -> refresh', () => {
      const cacheControl = CacheControlEntity.asNoCache(maxAge, subjectId).unwrap()
      expect(cacheControl.mustDoWhat(expiredStartDate)).toBe('refresh')
    })

    test('NoCache & fresh -> refresh', () => {
      const cacheControl = CacheControlEntity.asNoCache(maxAge, subjectId).unwrap()
      expect(cacheControl.mustDoWhat(freshStartDate)).toBe('refresh')
    })

    // Immutable

    test('Immutable & expired -> refresh', () => {
      const cacheControl = CacheControlEntity.asImmutableCache(maxAge, subjectId).unwrap()
      expect(cacheControl.mustDoWhat(expiredStartDate)).toBe('refresh')
    })

    test('Immutable & fresh -> nothing', () => {
      const cacheControl = CacheControlEntity.asImmutableCache(maxAge, subjectId).unwrap()
      expect(cacheControl.mustDoWhat(freshStartDate)).toBe('nothing')
    })

    // Mutable Strict

    test('MutableStrict & expired -> revalidate', () => {
      const cacheControl = CacheControlEntity.asMutableCacheStrict(maxAge, subjectId).unwrap()
      expect(cacheControl.mustDoWhat(expiredStartDate)).toBe('revalidate')
    })

    test('MutableStrict & fresh -> revalidate', () => {
      const cacheControl = CacheControlEntity.asMutableCacheStrict(maxAge, subjectId).unwrap()
      expect(cacheControl.mustDoWhat(freshStartDate)).toBe('revalidate')
    })

    // Mutable Not Strict

    test('MutableNotStrict & expired -> refresh', () => {
      const cacheControl = CacheControlEntity.asMutableCacheNotStrict(maxAge, subjectId).unwrap()
      expect(cacheControl.mustDoWhat(expiredStartDate)).toBe('revalidate')
    })

    test('MutableNotStrict & fresh -> nothing', () => {
      const cacheControl = CacheControlEntity.asMutableCacheNotStrict(maxAge, subjectId).unwrap()
      expect(cacheControl.mustDoWhat(freshStartDate)).toBe('nothing')
    })
  })
})
