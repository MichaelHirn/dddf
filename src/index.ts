import { DynamoRepo } from './repos/dynamo.repo'
import { FaastUseCase } from './useCases/faast.useCase'
import { S3Repo } from './repos/s3.repo'
import { UrlService } from './services/url.service'

export { AggregateRoot } from './aggregate'
export { Entity } from './entity'
export { Mapper } from './mapper'
export { IRepo } from './repo'
export { Result } from './result'
export { ValueObject } from './valueObject'

export const repos = {
  S3Repo,
  DynamoRepo
}

export const useCases = {
  FaastUseCase
}

export const services = {
  UrlService
}
