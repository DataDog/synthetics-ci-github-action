import {synthetics} from '@datadog/datadog-ci'

export const config = synthetics.DEFAULT_COMMAND_CONFIG

export const mockReporter: synthetics.MainReporter = {
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

export const EMPTY_SUMMARY: synthetics.Summary = {
  criticalErrors: 0,
  expected: 0,
  passed: 0,
  previouslyPassed: 0,
  failed: 0,
  failedNonBlocking: 0,
  skipped: 0,
  testsNotAuthorized: new Set(),
  testsNotFound: new Set(),
  timedOut: 0,
  batchId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
}
