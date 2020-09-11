import { CacheRepo } from './repos/cache.repo'
import { DynamoRepo } from './repos/dynamo.repo'
import { S3Repo } from './repos/s3.repo'
import { UrlService } from './services/url.service'

export { FaastUseCase, IFaastUseCaseConfig } from './useCases/faast'
export { AggregateRoot } from './aggregate'
export { Entity } from './entity'
export { Mapper } from './mapper'
export { IRepo } from './repo'
export { Result } from './result'
export { ValueObject } from './valueObject'

export const repos = {
  S3Repo,
  DynamoRepo,
  CacheRepo
}

export const services = {
  UrlService
}
