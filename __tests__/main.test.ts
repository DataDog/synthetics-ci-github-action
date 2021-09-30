import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'
import * as runTests from '@datadog/datadog-ci/dist/commands/synthetics/run-test'
import { config } from '../src/fixtures'
import * as core from '@actions/core'
import run from '../src/main'

jest.mock('@actions/core', () => {
  const originalModule = jest.requireActual('@actions/core')

  return {
    __esModule: true,
    ...originalModule,
    getInput: jest.fn(arg => {
      switch (arg) {
        case 'apiKey':
          return 'xxx'
        case 'appKey':
          return 'yyy'
        case 'publicIds':
          return 'public_id1'
      }
    })
  }
})

test('Github Action called with dummy parameter fails ', async () => {
  const setFailedMock = jest.spyOn(core, 'setFailed')
  await run()
  expect(setFailedMock).toHaveBeenCalledWith('Running Datadog Synthetics tests failed.')
})  

test('runTests called with minimum require params provided by Github Action', async () => {
  jest
  .spyOn(runTests, 'executeTests')
  .mockImplementation(() => ({} as any))
 
  await run()
  expect(runTests.executeTests).toHaveBeenCalledWith(expect.anything(), {...config , apiKey:'xxx', appKey: 'yyy', publicIds: ['public_id1']})
}) 

test('Failing Synthetics tests make Github Action fail', async () => {
  const setFailedMock = jest.spyOn(core, 'setFailed')
  jest
  .spyOn(runTests, 'executeTests')
  .mockReturnValue(Promise.resolve({
    summary: {criticalErrors: 0, passed: 5, failed: 2, skipped: 0, notFound: 1, timedOut: 3},
  } as any))

  await run()
  expect(setFailedMock).toHaveBeenCalledWith('Datadog Synthetics tests failed : {criticalErrors: 0, passed: 5, failed: 2, skipped: 0, notFound: 1, timedOut: 3}')
})

test('Github Action does not fail if no failed Synthetics tests', async () => {
  const setFailedMock = jest.spyOn(core, 'setFailed')
  jest
  .spyOn(runTests, 'executeTests')
  .mockReturnValue(Promise.resolve({
    summary: {criticalErrors: 0, passed: 5, failed: 0, skipped: 0, notFound: 0, timedOut: 0},
  } as any))

  await run()
  expect(setFailedMock).not.toHaveBeenCalled()
})

test('Github Action runs from js file', async () => {

  const np = process.execPath
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  try{
    const result = await new Promise<string>((resolve, reject) => 
      cp.execFile(np, [ip], (error, stdout, stderr) =>
        error ? reject(error) : resolve(stdout.toString())
      )
  )
  }catch(error){
    expect(error.code).toBe(1)
  }
})



 






