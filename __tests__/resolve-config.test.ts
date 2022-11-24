import fs from 'fs'

import {expect, test} from '@jest/globals'
import * as resolveConfig from '../src/resolve-config'
import {config} from '../src/fixtures'
import type {synthetics} from '@datadog/datadog-ci'

const requiredInputs = {
  apiKey: 'xxx',
  appKey: 'yyy',
}

const mockReporter: synthetics.MainReporter = {
  error: jest.fn(),
  initErrors: jest.fn(),
  log: jest.fn(),
  reportStart: jest.fn(),
  resultEnd: jest.fn(),
  resultReceived: jest.fn(),
  runEnd: jest.fn(),
  testTrigger: jest.fn(),
  testWait: jest.fn(),
  testsWait: jest.fn(),
}

describe('Resolves Config', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    process.env = {
      ...process.env,
      INPUT_API_KEY: requiredInputs.apiKey,
      INPUT_APP_KEY: requiredInputs.appKey,
    }
  })

  test('Default configuration parameters get overriden by global configuration file', async () => {
    const fakeReadFile = ((
      path: string,
      encoding: string,
      callback: (error: NodeJS.ErrnoException | null, data: Buffer) => void
    ) => {
      callback(null, Buffer.from(JSON.stringify({files: ['foobar.synthetics.json']})))
    }) as typeof fs.readFile
    jest.spyOn(fs, 'existsSync').mockImplementation(() => true)
    jest.spyOn(fs, 'readFile').mockImplementation(fakeReadFile)
    await expect(resolveConfig.resolveConfig(mockReporter)).resolves.toStrictEqual({
      ...config,
      ...requiredInputs,
      files: ['foobar.synthetics.json'],
    })
  })

  test('Default configuration applied if global configuration empty', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation(() => false)
    await expect(resolveConfig.resolveConfig(mockReporter)).resolves.toStrictEqual({...config, ...requiredInputs})
  })

  test('Variable strings input set in the config when defined', async () => {
    process.env = {
      ...process.env,
      INPUT_VARIABLES: 'START_URL=https://example.org,MY_VARIABLE=My title',
    }

    await expect(resolveConfig.resolveConfig(mockReporter)).resolves.toStrictEqual({
      ...config,
      ...requiredInputs,
      global: {
        variables: {START_URL: 'https://example.org', MY_VARIABLE: 'My title'},
      },
    })

    delete process.env.INPUT_VARIABLES

    await expect(resolveConfig.resolveConfig(mockReporter)).resolves.toStrictEqual({
      ...config,
      ...requiredInputs,
    })
  })

  test('getDefinedInput returns undefined if Github Action input not set', async () => {
    expect(resolveConfig.getDefinedInput('foobar')).toBeUndefined()
  })

  test('core.getInputs throws if required params not defined', async () => {
    process.env = {}
    await expect(resolveConfig.resolveConfig(mockReporter)).rejects.toThrowError()
  })

  describe('parses boolean', () => {
    test('but throws if incorrect value', async () => {
      process.env = {
        ...process.env,
        INPUT_TUNNEL: 'not_a_bool',
      }
      await expect(resolveConfig.resolveConfig(mockReporter)).rejects.toThrow(
        /Input does not meet YAML 1.2 \"Core Schema\" specification: tunnel/
      )
    })

    test('if value meets YAML 1.2', async () => {
      process.env = {
        ...process.env,
        INPUT_TUNNEL: 'True',
      }
      expect((await resolveConfig.resolveConfig(mockReporter)).tunnel).toBe(true)
    })
  })
})
