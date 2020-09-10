import { Entity } from './entity'
import { Result } from './result'

export interface IRepo<T extends Entity<any>, R = void> {
  save (t: T, args: any): Promise<Result<R>>
  load (t: string, args: any): Promise<Result<T>>
}
