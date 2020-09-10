import { fromUrl, parseDomain } from 'parse-domain'

/**
 * Service to work with URL string
 */
/* eslint-disable-next-line @typescript-eslint/no-extraneous-class */
export class UrlService {

  /**
   * Check if provided string is a valid URL string. See tests for more.
   */
  public static isUrl (url: string): boolean {
    try {
      /* eslint-disable-next-line no-new */
      new URL(url)
      return true
    } catch (e) {
      return false
    }
  }

  /**
   * Check if provided string is a valid Domain string. See tests for more.
   */
  public static isDomain (domain: string): boolean {
    const result = parseDomain(fromUrl(domain))
    if (result.type === 'INVALID') {
      return false
    }
    return true
  }

  /**
   * Check if provided string is a valid & listed Domain string. See tests for more.
   */
  public static isListedDomain (domain: string): boolean {
    const result = parseDomain(fromUrl(domain))
    if (result.type === 'LISTED') {
      return true
    }
    return false
  }

  public static toUrl (url: string): URL {
    return new URL(url)
  }

  public static toDomain (url: string): ReturnType<typeof parseDomain> {
    return parseDomain(fromUrl(url))
  }
}
