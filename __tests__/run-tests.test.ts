import {runTests} from '../src/run-tests'
import chalk from 'chalk'
import {expect, test} from '@jest/globals'

//set timeout long enough for tests to run
jest.setTimeout(20000)


const createMockContext = () => {
  let data = ''

  return {
    stdout: {
      toString: () => data,
      write: (input: string) => {
        data += input
      },  
    },
    stderr: {
        toString: () => data,
        write: (input: string) => {
          data += input
        },
    },
  }
}

const DATADOG_API_KEY = 'xxx'
const DATADOG_APP_KEY = 'yyy'
const publicId = ['public_id1']

// Need to mock network requests for this test
test('runTest execute test successfully', async () => {
    const context = await runTests(DATADOG_API_KEY,DATADOG_APP_KEY,publicId, createMockContext())
    const stdout = context.stdout.toString()
    expect(stdout).toContain(`${chalk.bold('1')} passed`)
})

test('runTest fails when API key missing', async () => {
    const write = jest.fn()
    const context = await runTests('',DATADOG_APP_KEY,publicId, {stdout: {write}} as any)
    expect(write.mock.calls[0][0]).toContain('DATADOG_API_KEY')
  })

test('runTest fails when publicId missing', async () => {
    const context = await runTests(DATADOG_API_KEY,DATADOG_APP_KEY, [], createMockContext())
    const stderr = context.stderr.toString()
    expect(stderr).toContain(`No test suites to run`)
})