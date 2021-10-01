import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'
import * as runTests from '@datadog/datadog-ci/dist/commands/synthetics/run-test'
import {config} from '../src/fixtures'
import * as core from '@actions/core'
import run from '../src/main'

// set Github action input value through env var : https://github.com/actions/toolkit/blob/
const setInput = (name: string, value: string) =>
  (process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = value)

describe('execute Github Action', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    process.env = {}
    process.stdout.write = jest.fn()
    setInput('api_key', 'xxx')
    setInput('app_key', 'yyy')
    setInput('public_ids', 'public_id1')
  })
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
      apiKey: 'xxx',
      appKey: 'yyy',
      publicIds: ['public_id1']
    })
  })

  test('Github Action fails if Synthetics tests fail ', async () => {
    const setFailedMock = jest.spyOn(core, 'setFailed')
    jest.spyOn(runTests, 'executeTests').mockReturnValue(
      Promise.resolve({
        summary: {
          criticalErrors: 0,
          passed: 0,
          failed: 1,
          skipped: 0,
          notFound: 0,
          timedOut: 0
        }
      } as any)
    )

    await run()
    expect(setFailedMock).toHaveBeenCalledWith(
      'Datadog Synthetics tests failed : {criticalErrors: 0, passed: 0, failed: 1, skipped: 0, notFound: 0, timedOut: 0}'
    )
  })

  test('Github Action fails if Synthetics tests timed out ', async () => {
    const setFailedMock = jest.spyOn(core, 'setFailed')
    jest.spyOn(runTests, 'executeTests').mockReturnValue(
      Promise.resolve({
        summary: {
          criticalErrors: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          notFound: 0,
          timedOut: 1
        }
      } as any)
    )

    await run()
    expect(setFailedMock).toHaveBeenCalledWith(
      'Datadog Synthetics tests failed : {criticalErrors: 0, passed: 0, failed: 0, skipped: 0, notFound: 0, timedOut: 1}'
    )
  })

  test('Github Action fails if Synthetics tests not found ', async () => {
    const setFailedMock = jest.spyOn(core, 'setFailed')
    jest.spyOn(runTests, 'executeTests').mockReturnValue(
      Promise.resolve({
        summary: {
          criticalErrors: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          notFound: 1,
          timedOut: 0
        }
      } as any)
    )

    await run()
    expect(setFailedMock).toHaveBeenCalledWith(
      'Datadog Synthetics tests failed : {criticalErrors: 0, passed: 0, failed: 0, skipped: 0, notFound: 1, timedOut: 0}'
    )
  })

  test('Github Action succeeds if Synthetics tests do not fail', async () => {
    const setFailedMock = jest.spyOn(core, 'setFailed')
    jest.spyOn(runTests, 'executeTests').mockReturnValue(
      Promise.resolve({
        summary: {
          criticalErrors: 0,
          passed: 1,
          failed: 0,
          skipped: 0,
          notFound: 0,
          timedOut: 0
        }
      } as any)
    )

    await run()
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  test('Github Action runs from js file', async () => {
    const np = process.execPath
    const ip = path.join(__dirname, '..', 'lib', 'main.js')
    try {
      const result = await new Promise<string>((resolve, reject) =>
        cp.execFile(np, [ip], (error, stdout, stderr) =>
          error ? reject(error) : resolve(stdout.toString())
        )
      )
    } catch (error) {
      expect(error.code).toBe(1)
    }
  })
})
