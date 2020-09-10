export interface Mapper<T, U> {
  deserialize: (value: U) => T
  serialize: (domain: T) => U
}
