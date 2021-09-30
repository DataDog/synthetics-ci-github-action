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

 






