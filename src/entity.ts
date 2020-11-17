const isEntity = (v: any): v is Entity<any> => {
  return v instanceof Entity
}

export abstract class Entity<T, U extends string = string> {
  protected readonly _id: U
  protected props: T

  constructor (props: T, id: U) {
    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */
    this._id = id
    this.props = props
  }

  // Entities are compared based on their referential
  // equality.
  public equals (object?: Entity<T>): boolean {

    if (object === null || typeof object === 'undefined') {
      return false
    }

    if (this === object) {
      return true
    }

    if (!isEntity(object)) {
      return false
    }

    return this._id === object._id
  }

  public get id (): U {
    return this._id
  }
}
