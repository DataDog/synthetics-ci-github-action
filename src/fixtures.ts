import {synthetics} from '@datadog/datadog-ci'

export const config: synthetics.RunTestsCommandConfig = {
  apiKey: '',
  appKey: '',
  configPath: 'datadog-ci.json',
  datadogSite: 'datadoghq.com',
  failOnCriticalErrors: false,
  failOnMissingTests: false,
  failOnTimeout: true,
  files: ['{,!(node_modules)/**/}*.synthetics.json'],
  global: {},
  locations: [],
  pollingTimeout: 30 * 60 * 1000,
  proxy: {protocol: 'http'},
  publicIds: [],
  selectiveRerun: false,
  subdomain: 'app',
  tunnel: false,
  variableStrings: [],
}

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
  passed: 0,
  failed: 0,
  failedNonBlocking: 0,
  skipped: 0,
  testsNotFound: new Set(),
  timedOut: 0,
  batchId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
}
