import * as Faast from 'faastjs'
import * as Rx from 'rxjs'
import { Result } from '../../result'

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never

type FaastModel<T extends object> = Faast.FaastModule<T> | Faast.AwsFaastModule<T>

export interface IFaastUseCaseConfig<T extends object> {
  environment: 'local' | 'aws'
  functions: T
  params: Faast.CommonOptions | Faast.AwsOptions
}

export abstract class FaastUseCase<T extends object, U, V = void> {
  public readonly environment: IFaastUseCaseConfig<T>['environment']
  protected _model: FaastModel<T>
  private readonly functions: IFaastUseCaseConfig<T>['functions']
  private readonly params: IFaastUseCaseConfig<T>['params']

  protected constructor (config: IFaastUseCaseConfig<T>) {
    this.environment = config.environment
    this.functions = config.functions
    this.params = config.params
  }

  public abstract async main (stream: Rx.Observable<U>, config: any): Promise<Result<V>>

  /**
   * Create the Faast instance.
   *
   * @remarks
   *
   * This is asynchronous as it may have to generate artifacts and upload to cloud
   * provider behind the scenes.
   */
  public async setupModel (): Promise<FaastModel<T>> {
    if (this.environment === 'local') {
      return await Faast.faast(this.environment, this.functions, this.params)
    }
    /* eslint-disable-next-line new-cap */
    return await Faast.faastAws(this.functions, this.params)
  }

  public async model (): Promise<FaastModel<T>> {
    if (typeof this._model === 'undefined') {
      this._model = await this.setupModel()
    }
    return this._model
  }

  /**
   * Provide execution environment for {@link FaastUseCase.main}.
   *
   * @remarks
   *
   * When inherited, do not overwrite this method. Instead implement logic in
   * {@link FaastUseCase.main}.
   */
  public async exec (
    stream: ArgumentTypes<FaastUseCase<T, U, V>['main']>[0],
    config: ArgumentTypes<FaastUseCase<T, U, V>['main']>[1] = {},
  ): Promise<Result<V>> {
    let setupStart = Date.now()
    const setupDuration = (Date.now() - setupStart) / 1000

    try {
      console.log('\n## Logs')
      console.log((await this.model()).logUrl())

      console.log('\n## Console')
      const start = Date.now()

      const result = await this.main(stream, config)

      console.log('\n## Result')
      if (result.isSuccess) {
        console.log('success: TRUE')
      } else {
        console.log(
          `success: FALSE
          ${result.error.message}
          ${result.error.stack}`
        )
      }

      console.log('\n## Performance')
      const duration = (Date.now() - start) / 1000
      console.log(`setup: ${setupDuration}s; runtime: ${duration}s;`)

      console.log('\n## Costs')
      console.log(`${((await this.model()).costSnapshot()) as unknown as string}`)

      console.log('\n## Stats')
      console.log(`${(await this.model()).stats() as unknown as string}`)

      return result
    } catch (error) {
      console.log('\n## ERROR')
      console.log(error)
    } finally {
      await (await this.model()).cleanup()
    }
  }
}
