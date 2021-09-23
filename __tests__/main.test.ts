import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import chalk from 'chalk'
import {expect, test} from '@jest/globals'
import {run} from '../src/main'
import {runTests} from '../src/run-tests'

//set timeout long enough for tests to run
jest.setTimeout(20000)

jest.mock('@actions/core', () => {
  const originalModule = jest.requireActual('@actions/core');

  return {
    __esModule: true,
    ...originalModule,
    getInput: jest.fn((arg) => {
      switch(arg){   
        case 'apiKey': return "xxx";
        case 'appKey': return "yyy";
        case 'publicIds': return 'public_id1'; 
    }
    })
  };
});

jest.mock('../src/run-tests')
jest.mock('@datadog/datadog-ci/dist/commands/synthetics/run-test')
const context = {stdout: process.stdout, stderr: process.stderr} as any

test('Github Action calls runTests', async () => {
  await run()
  expect(runTests).toHaveBeenCalledWith('xxx', 'yyy',['public_id1'], context );
})

test('Github Action runs from js file', async () => {

  const np = process.execPath
  const ip = path.join(__dirname, '..', 'lib', 'main.js')

  const result = await new Promise<string>((resolve, reject) => cp.execFile(np, [ip], (error, stdout, stderr) => error ? reject(error) : resolve(stdout.toString())))
  expect(result).toContain(`Missing ${chalk.red.bold('DATADOG_API_KEY')} in your environment.`)
  
})

