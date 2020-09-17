import { Result } from '../result'
import { S3Repo } from './s3.repo'

export class JsonS3Repo extends S3Repo<any> {

  /* eslint-disable-next-line class-methods-use-this */
  public serialize (plainJsonObject: any): Result<string> {
    try {
      return Result.ok(JSON.stringify(plainJsonObject))
    } catch (error) {
      return Result.fail(error)
    }
  }

  /* eslint-disable-next-line class-methods-use-this */
  public deserialize (jsonString: string): Result<any> {
    try {
      return Result.ok(JSON.parse(jsonString))
    } catch (error) {
      return Result.fail(error)
    }
  }
}
