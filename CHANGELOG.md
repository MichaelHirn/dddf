## [2.0.0](https://github.com/MichaelHirn/dddf/compare/v1.12.4...v2.0.0) (2021-11-16)


### ⚠ BREAKING CHANGES

* add cache-control

### Features

* add cache-control ([85940d3](https://github.com/MichaelHirn/dddf/commit/85940d3bc42aafb12a13575564cefabd63c737da))


### Bug Fixes

* export all IRepo types ([b3b96b8](https://github.com/MichaelHirn/dddf/commit/b3b96b81ebbf615155bf6d2a6c574db8597f1bc9))
* export CacheRepoMethodConfig ([b122b5c](https://github.com/MichaelHirn/dddf/commit/b122b5c8ce3cc77d841d1d3e05d7608ed91fb2e9))
* generic type version ([ae02237](https://github.com/MichaelHirn/dddf/commit/ae0223711be2403286464589500cf7c0af1998aa))
* provide CacheControlActions ([b357b38](https://github.com/MichaelHirn/dddf/commit/b357b38718a19d21877224076fb2e9d24333ba16))

### [1.12.4](https://github.com/MichaelHirn/dddf/compare/v1.12.3...v1.12.4) (2021-02-26)


### Bug Fixes

* **deps:** add missing rxjs dep ([5d113c2](https://github.com/MichaelHirn/dddf/commit/5d113c23f43ad65ef0d747b6a20f40b20211d5cc))

### [1.12.3](https://github.com/MichaelHirn/dddf/compare/v1.12.2...v1.12.3) (2020-12-02)


### Bug Fixes

* fix dynamo loadBatch bug ([ab27d2a](https://github.com/MichaelHirn/dddf/commit/ab27d2af2383fa9167f0fa308aa6a2008d5cae69))

### [1.12.2](https://github.com/MichaelHirn/dddf/compare/v1.12.1...v1.12.2) (2020-12-02)


### Bug Fixes

* fix hard coded dynamo hashKey ([63a6689](https://github.com/MichaelHirn/dddf/commit/63a6689b941c93d854cb90aab67f292d268eeb07))

### [1.12.1](https://github.com/MichaelHirn/dddf/compare/v1.12.0...v1.12.1) (2020-11-26)


### Bug Fixes

* prevent reflect-metadata error ([fe7c3c5](https://github.com/MichaelHirn/dddf/commit/fe7c3c5568611337a4cbc02b90f1108ba53ef672))

## [1.12.0](https://github.com/MichaelHirn/dddf/compare/v1.11.0...v1.12.0) (2020-11-17)


### Features

* allow string type for Entity ID ([6e2d873](https://github.com/MichaelHirn/dddf/commit/6e2d87305f811334066d72472e11e38a63355bc8))

## [1.11.0](https://github.com/MichaelHirn/dddf/compare/v1.10.0...v1.11.0) (2020-09-24)


### Features

* **s3:** add remove support ([7956895](https://github.com/MichaelHirn/dddf/commit/795689555deab1c189ff44f56cbfb060126c5fcc))

## [1.10.0](https://github.com/MichaelHirn/dddf/compare/v1.9.5...v1.10.0) (2020-09-17)


### Features

* **repos:** add JsonS3Repo implementation ([116464f](https://github.com/MichaelHirn/dddf/commit/116464fa27a5283cec1ad6bcadac29b4996b6d89))

### [1.9.5](https://github.com/MichaelHirn/dddf/compare/v1.9.4...v1.9.5) (2020-09-17)


### Bug Fixes

* **faast:** remove faast useCase ([5d646b4](https://github.com/MichaelHirn/dddf/commit/5d646b472bad173ddd1a0ad070ba8caae3b38d6f))

### [1.9.4](https://github.com/MichaelHirn/dddf/compare/v1.9.3...v1.9.4) (2020-09-17)


### Bug Fixes

* **faast:** add missing inversify support ([2865608](https://github.com/MichaelHirn/dddf/commit/28656082b20e91da2f2e434e46367682ee2ad154))

### [1.9.3](https://github.com/MichaelHirn/dddf/compare/v1.9.2...v1.9.3) (2020-09-16)


### Bug Fixes

* **s3:** fix objectPrefix default ([6709729](https://github.com/MichaelHirn/dddf/commit/6709729db5c1c3e2dfd17887caded78815f4aee4))

### [1.9.2](https://github.com/MichaelHirn/dddf/compare/v1.9.1...v1.9.2) (2020-09-16)


### Bug Fixes

* **s3:** provide defaults for save & load ([6c09aa2](https://github.com/MichaelHirn/dddf/commit/6c09aa23f5e44a2086e99f42d98218dff3a4fd3d))

### [1.9.1](https://github.com/MichaelHirn/dddf/compare/v1.9.0...v1.9.1) (2020-09-16)


### Bug Fixes

* **s3:** simplify (de)serialize interface ([dd69616](https://github.com/MichaelHirn/dddf/commit/dd69616582e12534552309c3719b6fcff9b34ee5))

## [1.9.0](https://github.com/MichaelHirn/dddf/compare/v1.8.0...v1.9.0) (2020-09-16)


### Features

* **s3:** improve implementation requirements ([2538be7](https://github.com/MichaelHirn/dddf/commit/2538be7773fe41abc84d4ebac406c45423d03885))

## [1.8.0](https://github.com/MichaelHirn/dddf/compare/v1.7.0...v1.8.0) (2020-09-15)


### Features

* **dynamo:** add delete support ([38cdd08](https://github.com/MichaelHirn/dddf/commit/38cdd08a01c189da93d4afdc809d29255f0f754a))

## [1.7.0](https://github.com/MichaelHirn/dddf/compare/v1.6.1...v1.7.0) (2020-09-15)


### Features

* **dynamo:** add query support ([126b968](https://github.com/MichaelHirn/dddf/commit/126b96830399e2abc45014479b25aec34e482479))

### [1.6.1](https://github.com/MichaelHirn/dddf/compare/v1.6.0...v1.6.1) (2020-09-15)


### Bug Fixes

* **dynamo:** fix (de)serialize result handling ([728c635](https://github.com/MichaelHirn/dddf/commit/728c635d3383d99497ed0228fa295b9fa674f263))

## [1.6.0](https://github.com/MichaelHirn/dddf/compare/v1.5.0...v1.6.0) (2020-09-15)


### Features

* add inversify.js support ([89212ac](https://github.com/MichaelHirn/dddf/commit/89212ac99ac2fb9d5a629dc6b3bbdc609e8aeac2))

## [1.5.0](https://github.com/MichaelHirn/dddf/compare/v1.4.1...v1.5.0) (2020-09-14)


### Features

* simplify and complete export ([4957593](https://github.com/MichaelHirn/dddf/commit/49575939a9744b61497a91a44404d04f9d6d72f0))

### [1.4.1](https://github.com/MichaelHirn/dddf/compare/v1.4.0...v1.4.1) (2020-09-14)


### Bug Fixes

* **dynamo:** improve implementation abstraction ([398ccbd](https://github.com/MichaelHirn/dddf/commit/398ccbde18e5e7438b0443cc60c98e7dc92a557d))

## [1.4.0](https://github.com/MichaelHirn/dddf/compare/v1.3.0...v1.4.0) (2020-09-14)


### Features

* **dynamo:** extend dynamo functionality ([998fe96](https://github.com/MichaelHirn/dddf/commit/998fe96dfd780fef8ba7816b4bdcb871664755b2))

## [1.3.0](https://github.com/MichaelHirn/dddf/compare/v1.2.0...v1.3.0) (2020-09-14)


### Features

* **s3:** add object versioning support ([6686b0f](https://github.com/MichaelHirn/dddf/commit/6686b0f6efce34789e8285b1e83e10e8f5bfc33f))


### Bug Fixes

* **s3:** fix objectPrefix internals ([94f0210](https://github.com/MichaelHirn/dddf/commit/94f0210275f10aedae594a4673c78d1ba81099d1))

## [1.2.0](https://github.com/MichaelHirn/dddf/compare/v1.1.0...v1.2.0) (2020-09-11)


### Features

* add faast useCase ([7ed7221](https://github.com/MichaelHirn/dddf/commit/7ed722122e0686aec89f8fe3b497768aa1404e36))

## [1.1.0](https://github.com/MichaelHirn/dddf/compare/v1.0.0...v1.1.0) (2020-09-10)


### Features

* add cache repo ([3537a24](https://github.com/MichaelHirn/dddf/commit/3537a24b26c604f79c41673bda139588109023e0))

## 1.0.0 (2020-09-10)


### Features

* add core classes ([0c10664](https://github.com/MichaelHirn/dddf/commit/0c10664105c352622931e0635cb91e264c919f54))

### [1.2.3](https://github.com/MichaelHirn/ts-template/compare/v1.2.2...v1.2.3) (2020-09-09)


### Bug Fixes

* **github:** fix coverage report on master ([d411973](https://github.com/MichaelHirn/ts-template/commit/d411973665646068907bd4393a6c2e9579dfcd56))

### [1.2.2](https://github.com/MichaelHirn/ts-template/compare/v1.2.1...v1.2.2) (2020-07-11)


### Bug Fixes

* **package:** change prepublish -> prepare ([7e67c35](https://github.com/MichaelHirn/ts-template/commit/7e67c356bd3c6ab8e5f226c218c6e7b8ac056e15))

### [1.2.1](https://github.com/MichaelHirn/ts-template/compare/v1.2.0...v1.2.1) (2020-06-12)


### Bug Fixes

* **package:** add prepublish build hook ([0c9ffa2](https://github.com/MichaelHirn/ts-template/commit/0c9ffa2434d2c4f25017aef8a19157abe5bf7c88))

## [1.2.0](https://github.com/MichaelHirn/ts-template/compare/v1.1.0...v1.2.0) (2020-05-25)


### Features

* **docs:** replace typedocs -> ms/tsdocs ([238e698](https://github.com/MichaelHirn/ts-template/commit/238e6988b3f3d53450e96f0497b02f5c68a351c7))


### Bug Fixes

* **docs:** fix npm run docs command ([b76a002](https://github.com/MichaelHirn/ts-template/commit/b76a002c6fa97d2f62f0130f1c41a18f0f2bfb4c))
* **docs:** set tsconfig removeComments = false ([ff5eb33](https://github.com/MichaelHirn/ts-template/commit/ff5eb33c23d328a650de165ca79a99709ad7946c))

## [1.1.0](https://github.com/MichaelHirn/ts-template/compare/v1.0.0...v1.1.0) (2020-05-14)


### Features

* **readme:** add install todo list ([dfdd8d5](https://github.com/MichaelHirn/ts-template/commit/dfdd8d5afe7877518e5d47eeace1a66549369725))

## 1.0.0 (2020-05-14)


### Features

* **npm:** set repository to private ([289813f](https://github.com/MichaelHirn/ts-template/commit/289813f777e2faa85d44bfb16041e29640f947b4))
* provide minimum working code ([1c7ba0b](https://github.com/MichaelHirn/ts-template/commit/1c7ba0b1dc7e6e18cf401db0ec9648b700832439))
* **jest:** add jest testing framework ([dd72928](https://github.com/MichaelHirn/ts-template/commit/dd72928bfbcbeecf2f0a9badd29187be03e5ac04))
