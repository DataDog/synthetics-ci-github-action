import {expect, test} from '@jest/globals'
import * as resolveConfig from '../src/resolve-config'
import * as utils from '@datadog/datadog-ci/dist/helpers/utils'
import {config} from '../src/fixtures'

const requiredInputs = {
  apiKey: 'xxx',
  appKey: 'yyy'
}

describe('Resolves Config', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    process.env = {
      ...process.env,
      INPUT_API_KEY: requiredInputs.apiKey,
      INPUT_APP_KEY: requiredInputs.appKey
    }
  })

  test('Default configuration parameters get overriden by global configuration file ', async () => {
    jest.spyOn(utils, 'getConfig').mockImplementation(() => ({files: ['foobar.synthetics.json']} as any))
    await expect(resolveConfig.resolveConfig()).resolves.toStrictEqual({...config, ...requiredInputs, files: ['foobar.synthetics.json']})
  })

  test('Default configuration applied if global configuration empty', async () => {
    await expect(resolveConfig.resolveConfig()).resolves.toStrictEqual({...config, ...requiredInputs,})
  })

  test('getDefinedInput returns undefined if Github Action input not set', async () => {
    expect(resolveConfig.getDefinedInput('foobar')).toBeUndefined()
  })

  test('core.getInputs throws if required params not defined', async () => {
    process.env = {}
    await expect(resolveConfig.resolveConfig()).rejects.toThrowError()
  })
})
