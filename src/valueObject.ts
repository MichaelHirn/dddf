import { Result } from './result'
import { shallowEqual } from 'shallow-equal-object'

interface ValueObjectProps {
  [index: string]: any
}

export abstract class ValueObject<T extends ValueObjectProps> {
  protected readonly props: T

  constructor (props: T) {
    this.props = Object.freeze(props)
  }

  public equals (vo?: ValueObject<T>): boolean {
    if (vo === null || typeof vo === 'undefined') {
      return false
    }

    if (typeof vo.props === 'undefined') {
      return false
    }

    return shallowEqual(this.props, vo.props)
  }

  protected static toObject<T, U>(Construct: (U) => T | Result<T>, object: U, objectName: string): Result<T> {
    if (object instanceof Object) {
      const constructorResult = Construct(object)
      if (constructorResult instanceof Result) {
        if (constructorResult.isSuccess) {
          return Result.ok<T>(constructorResult.unwrap())
        }
        return Result.fail<T>(constructorResult.error)
      }
      return Result.ok<T>(constructorResult)
    }
    return Result.fail<T>(new Error(`${objectName} not provided`))
  }

  protected static toResultStringMap (data: any, name: string): Result<Map<string, string>> {
    return this.toObject(data => new Map(Object.entries(data)), data, name)
  }

  protected static toObjects<T>(Construct: (any) => T, objects: object[], objectName: string): Result<T[]> {
    if (objects instanceof Array) {
      return Result.ok<T[]>(objects.map(object => Construct(object)))
    }
    return Result.fail<T[]>(new Error(`${objectName} not provided`))
  }

  protected static toResultString (string: string, name: string): Result<string> {
    if (typeof string === 'string') {
      return Result.ok<string>(string)
    }
    return Result.fail<string>(new Error(`${name} not provided`))
  }

  protected static toResultStrings (strings: string[], name: string): Result<string[]> {
    if (strings instanceof Array) {
      return Result.ok<string[]>(strings)
    }
    return Result.fail<string[]>(new Error(`${name} not provided`))
  }

  protected static toResultNumber (input: number, name: string): Result<number> {
    if (typeof input === 'number') {
      return Result.ok<number>(input)
    }
    return Result.fail<number>(new Error(`${name} not provided`))
  }
}
