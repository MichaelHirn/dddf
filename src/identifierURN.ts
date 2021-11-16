import { Result } from './result'
import { ValueObject } from './valueObject'

export interface IdentifierURNProps {
  // Namespace IdentifierURN
  nid: string
  // Namespace Specific Strings
  nss: string[]
}

/**
 * A Uniform Resource Name Identifier, aka. a Uniform Resource Identifier (URI) that uses the urn scheme.
 *
 * @remarks
 * For more information check out: https://en.wikipedia.org/wiki/Uniform_Resource_Name
 *
 * @beta
 */
export class IdentifierURN extends ValueObject<IdentifierURNProps> {

  public nid (): IdentifierURNProps['nid'] {
    return this.props.nid
  }

  public nss (): IdentifierURNProps['nss'] {
    return this.props.nss
  }

  public namestring (): string {
    return `urn:${this.nid()}:${this.nss().join(':')}`
  }

  public static from (namestring: string): Result<IdentifierURN> {
    try {
      if (!namestring.startsWith('urn')) {
        throw new Error(`invalid namestring provided: must start with "urn": ${namestring}`)
      }
      const urnParts = namestring.split(':')
      return Result.ok(new IdentifierURN({
        nid: urnParts[1],
        nss: urnParts.slice(2)
      }))
    } catch (error) {
      return Result.fail(error)
    }
  }
}

export const IdentifierURNMapper = {
  serialize: (identifier: IdentifierURN): string => {
    return identifier.namestring()
  },

  deserialize: (namestring: string): Result<IdentifierURN> => {
    return IdentifierURN.from(namestring)
  }
}
