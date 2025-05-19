import fs from 'fs'

import {expect, test} from '@jest/globals'
import * as resolveConfig from '../src/resolve-config'
import {config} from '../src/fixtures'
import type {synthetics} from '@datadog/datadog-ci'
import * as core from '@actions/core'

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
      'INPUT_API-KEY': requiredInputs.apiKey,
      'INPUT_APP-KEY': requiredInputs.appKey,
    }

    jest.spyOn(core, 'setFailed').mockImplementation()
  })

  test('Default configuration parameters get overridden by global configuration file', async () => {
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

  test('Default configuration applied if global configuration is empty', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation(() => false)

    await expect(resolveConfig.resolveConfig(mockReporter)).resolves.toStrictEqual({
      ...config,
      ...requiredInputs,
    })
  })

  test('Variable strings input set in the config when defined', async () => {
    process.env = {
      ...process.env,
      INPUT_VARIABLES: 'START_URL=https://example.org,MY_VARIABLE=My title',
    }

    await expect(resolveConfig.resolveConfig(mockReporter)).resolves.toStrictEqual({
      ...config,
      ...requiredInputs,
      defaultTestOverrides: {
        ...config.defaultTestOverrides,
        variables: {START_URL: 'https://example.org', MY_VARIABLE: 'My title'},
      },
    })

    delete process.env['INPUT_VARIABLES']

    await expect(resolveConfig.resolveConfig(mockReporter)).resolves.toStrictEqual({
      ...config,
      ...requiredInputs,
    })
  })

  test('Locations input set in the config when defined', async () => {
    process.env = {
      ...process.env,
      INPUT_LOCATIONS: 'aws:eu-central-1,aws:eu-west-1',
    }

    await expect(resolveConfig.resolveConfig(mockReporter)).resolves.toStrictEqual({
      ...config,
      ...requiredInputs,
      defaultTestOverrides: {
        ...config.defaultTestOverrides,
        locations: ['aws:eu-central-1', 'aws:eu-west-1'],
      },
    })

    delete process.env['INPUT_LOCATIONS']

    await expect(resolveConfig.resolveConfig(mockReporter)).resolves.toStrictEqual({
      ...config,
      ...requiredInputs,
    })
  })

  describe('selectiveRerun', () => {
    test('undefined when not set', async () => {
      expect((await resolveConfig.resolveConfig(mockReporter)).selectiveRerun).toBeUndefined()
    })

    test('true when set to true', async () => {
      process.env = {
        ...process.env,
        'INPUT_SELECTIVE-RERUN': 'true',
      }
      expect((await resolveConfig.resolveConfig(mockReporter)).selectiveRerun).toBe(true)
      delete process.env['INPUT_SELECTIVE-RERUN']
    })

    test('false when set to false', async () => {
      process.env = {
        ...process.env,
        'INPUT_SELECTIVE-RERUN': 'false',
      }
      expect((await resolveConfig.resolveConfig(mockReporter)).selectiveRerun).toBe(false)
      delete process.env['INPUT_SELECTIVE-RERUN']
    })

    test('throws if incorrect value', async () => {
      process.env = {
        ...process.env,
        'INPUT_SELECTIVE-RERUN': 'not_a_bool',
      }
      await expect(resolveConfig.resolveConfig(mockReporter)).rejects.toThrow(
        /Input does not meet YAML 1.2 \"Core Schema\" specification: selective-rerun/
      )
      delete process.env['INPUT_SELECTIVE-RERUN']
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

  describe('parses integer', () => {
    test('falls back to default if input is not set', async () => {
      expect(resolveConfig.getDefinedInteger('batch_timeout')).toBeUndefined()
      expect((await resolveConfig.resolveConfig(mockReporter)).batchTimeout).toStrictEqual(30 * 60 * 1000)
    })

    test('falls back to default if input is an empty value', async () => {
      process.env = {
        ...process.env,
        'INPUT_BATCH-TIMEOUT': '',
      }
      expect(resolveConfig.getDefinedInteger('batch_timeout')).toBeUndefined()
      expect((await resolveConfig.resolveConfig(mockReporter)).batchTimeout).toStrictEqual(30 * 60 * 1000)
    })

    test('throws if input is a float', async () => {
      process.env = {
        ...process.env,
        'INPUT_BATCH-TIMEOUT': '1.2',
      }
      await expect(resolveConfig.resolveConfig(mockReporter)).rejects.toThrow('1.2 is not an integer')
    })

    test('returns the value if input is an integer', async () => {
      process.env = {
        ...process.env,
        'INPUT_BATCH-TIMEOUT': '1',
      }
      expect((await resolveConfig.resolveConfig(mockReporter)).batchTimeout).toStrictEqual(1)
    })
  })
})
