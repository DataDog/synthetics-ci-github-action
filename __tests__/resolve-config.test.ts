import {readFile} from 'fs'

import {expect, test} from '@jest/globals'
import * as resolveConfig from '../src/resolve-config'
import {config} from '../src/fixtures'

jest.mock('fs')
const mockedReadFile = readFile as unknown as jest.MockedFunction<typeof readFile>

const requiredInputs = {
  apiKey: 'xxx',
  appKey: 'yyy',
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

  test('Default configuration parameters get overriden by global configuration file ', async () => {
    const fakeReadFile = ((
      path: string,
      encoding: string,
      callback: (error: NodeJS.ErrnoException | null, data: Buffer) => void
    ) => {
      callback(null, Buffer.from(JSON.stringify({files: ['foobar.synthetics.json']})))
    }) as typeof readFile
    mockedReadFile.mockImplementation(fakeReadFile)
    await expect(resolveConfig.resolveConfig()).resolves.toStrictEqual({
      ...config,
      ...requiredInputs,
      files: ['foobar.synthetics.json'],
    })
  })

  test('Default configuration applied if global configuration empty', async () => {
    const fakeReadFile = ((path: string, cb: (error: NodeJS.ErrnoException | null, data?: Buffer) => void) =>
      cb({code: 'ENOENT'} as NodeJS.ErrnoException)) as typeof readFile
    mockedReadFile.mockImplementation(fakeReadFile)
    await expect(resolveConfig.resolveConfig()).resolves.toStrictEqual({...config, ...requiredInputs})
  })

  test('getDefinedInput returns undefined if Github Action input not set', async () => {
    expect(resolveConfig.getDefinedInput('foobar')).toBeUndefined()
  })
  test('core.getInputs throws if required params not defined', async () => {
    process.env = {}
    await expect(resolveConfig.resolveConfig()).rejects.toThrowError()
  })
})
