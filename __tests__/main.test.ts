import * as core from '@actions/core'
import {Summary} from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'
import * as runTests from '@datadog/datadog-ci/dist/commands/synthetics/run-test'
import * as utils from '@datadog/datadog-ci/dist/helpers/utils'
import {expect, test} from '@jest/globals'

import {execFile} from 'child_process'
import * as path from 'path'

import {config} from '../src/fixtures'
import run from '../src/main'
import * as processResults from '../src/process-results'
import * as resolveConfig from '../src/resolve-config'

const emptySummary: Summary = {criticalErrors: 0, passed: 0, failed: 0, skipped: 0, notFound: 0, timedOut: 0}
const inputs = {
  apiKey: 'xxx',
  appKey: 'yyy',
  publicIds: ['public_id1']
}

describe('Run Github Action', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    process.env = {
      ...process.env,
      INPUT_API_KEY: inputs.apiKey,
      INPUT_APP_KEY: inputs.appKey,
      INPUT_PUBLIC_IDS: inputs.publicIds.join(', ')
    }
    process.stdout.write = jest.fn()

  })
  describe('Handle input parameters', () => {
    test('Github Action called with dummy parameter fails with core.setFailed', async () => {
      const setFailedMock = jest.spyOn(core, 'setFailed')
      await run()
      expect(setFailedMock).toHaveBeenCalledWith(
        'Running Datadog Synthetics tests failed.'
      )
    })
  
    test('Github Action core.getInput parameters are passed on to runTests', async () => {
      jest.spyOn(runTests, 'executeTests').mockImplementation(() => ({} as any))
  
      await run()
      expect(runTests.executeTests).toHaveBeenCalledWith(expect.anything(), {
        ...config,
        ...inputs
      })
    })
    test('Github Action parses out publicIds string', async () => {
      const publicIds = ['public_id1', 'public_id2', 'public_id3']
      process.env = {
        ...process.env,
        INPUT_PUBLIC_IDS: publicIds.join(', ')
      }
      jest.spyOn(runTests, 'executeTests').mockImplementation(() => ({} as any))
  
      await run()
      expect(runTests.executeTests).toHaveBeenCalledWith(expect.anything(), {
        ...config,
        ...inputs,
        publicIds
      })
    })
  })
  describe('Handle invalid and undefined input parameters', () => {
    test('Use default configuration if Github Action input is not set ', async () => {
      jest.spyOn(runTests, 'executeTests').mockImplementation(() => ({} as any))
      await run()
      expect(runTests.executeTests).toHaveBeenCalledWith(expect.anything(), {...config, ...inputs, datadogSite : "datadoghq.com"})
    })

    test('getDefinedInput returns undefined if Github Action input not set', async () => {
      const mockGetDefinedInput = jest.spyOn(resolveConfig, 'getDefinedInput')
      resolveConfig.getDefinedInput("foobar")
      expect(mockGetDefinedInput).toReturnWith(undefined)
    })
  })
  
  describe('Handle configuration file', () => {

    test('Github Action throws if unable to parse config file ', async () => {
      const configPath =  'foobar'
      process.env = {
        ...process.env,
       'INPUT_CONFIG_PATH': configPath
      }
      const errorMock = jest.spyOn(core, 'error')
      await run()
      expect(errorMock).toHaveBeenCalledWith(
        'Unable to parse config file! Please verify config path : foobar'
      )
      process.env = {}
    })
  
    test('Default configuration parameters get overriden by global configuration file ', async () => {
      jest.spyOn(utils, 'getConfig').mockImplementation(()=> ({"files" : [ 'foobar.synthetics.json' ]} as any))
      jest.spyOn(runTests, 'executeTests').mockImplementation(() => ({} as any))
      await run()
      expect(runTests.executeTests).toHaveBeenCalledWith(expect.anything(), {...config, ...inputs, files : [ 'foobar.synthetics.json' ]})
    })

    test('Default configuration applied if global configuration empty', async () => {
      jest.spyOn(utils, 'getConfig').mockImplementation(()=> ({} as any))
      jest.spyOn(runTests, 'executeTests').mockImplementation(() => ({} as any))
      await run()
      expect(runTests.executeTests).toHaveBeenCalledWith(expect.anything(), {...config, ...inputs})
    })
  })

  describe('Handle Synthetics test results', () => {
    beforeEach(() => {
      jest.spyOn(runTests, 'executeTests').mockImplementation(()=> ({} as any))
    })

    test('Github Action fails if Synthetics tests fail ', async () => {
      const setFailedMock = jest.spyOn(core, 'setFailed')
      jest
        .spyOn(processResults, 'renderResults')
        .mockReturnValue({...emptySummary, failed: 1} as any)
  
      await run()
      expect(setFailedMock).toHaveBeenCalledWith(
        `Datadog Synthetics tests failed : criticalErrors: 0, passed: 0, failed: 1, skipped: 0, notFound: 0, timedOut: 0`
      )
    })
  
    test('Github Action fails if Synthetics tests timed out', async () => {
      const setFailedMock = jest.spyOn(core, 'setFailed')
      jest
        .spyOn(processResults, 'renderResults')
        .mockReturnValue({...emptySummary, timedOut: 1} as any)
  
      await run()
      expect(setFailedMock).toHaveBeenCalledWith(
        `Datadog Synthetics tests failed : criticalErrors: 0, passed: 0, failed: 0, skipped: 0, notFound: 0, timedOut: 1`
      )
    })
  
    test('Github Action fails if Synthetics tests not found', async () => {
      const setFailedMock = jest.spyOn(core, 'setFailed')
      jest
        .spyOn(processResults, 'renderResults')
        .mockReturnValue({...emptySummary, notFound: 1} as any)
  
      await run()
      expect(setFailedMock).toHaveBeenCalledWith(
        `Datadog Synthetics tests failed : criticalErrors: 0, passed: 0, failed: 0, skipped: 0, notFound: 1, timedOut: 0`
      )
    })
  
    test('Github Action succeeds if Synthetics tests do not fail', async () => {
      const setFailedMock = jest.spyOn(core, 'setFailed')
      jest
      .spyOn(processResults, 'renderResults')
      .mockReturnValue({...emptySummary, passed: 1} as any)
  
      await run()
      expect(setFailedMock).not.toHaveBeenCalled()
    })
  })

  describe('Github Action execution', () => {
    test('Github Action runs from js file', async () => {
      const nodePath = process.execPath
      const scriptPath = path.join(__dirname, '..', 'lib', 'main.js')
      try {
        const result = await new Promise<string>((resolve, reject) =>
          execFile(nodePath, [scriptPath], (error, stdout, stderr) =>
            error ? reject(error) : resolve(stdout.toString())
          )
        )
      } catch (error) {
        expect(error.code).toBe(1)
      }
    })
  })
})
