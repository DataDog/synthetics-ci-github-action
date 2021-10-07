import {
  SyntheticsCIConfig,
  MainReporter
} from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'

export const config: SyntheticsCIConfig = {
  apiKey: '',
  appKey: '',
  configPath: 'datadog-ci.json',
  datadogSite: 'datadoghq.com',
  failOnCriticalErrors: false,
  files: ['{,!(node_modules)/**/}*.synthetics.json'],
  global: {},
  locations: [],
  pollingTimeout: 2 * 60 * 1000,
  proxy: {protocol: 'http'},
  publicIds: [],
  subdomain: 'app',
  tunnel: false
}

export const mockReporter: MainReporter = {
  error: jest.fn(),
  initErrors: jest.fn(),
  log: jest.fn(),
  reportStart: jest.fn(),
  runEnd: jest.fn(),
  testEnd: jest.fn(),
  testTrigger: jest.fn(),
  testWait: jest.fn()
}

export const mockResult = {
  location: 1,
  public_id: '123-456-789',
  result: {
    dc_id: 1,
    result: {
      device: 'chrome_laptop.large',
      passed: true,
      public_id: '123-456-789',
    },
    result_id: '1',
  },
  result_id: '1',
}

export const mockFailedResult = {
  location: 1,
  public_id: '123-456-789',
  result: {
    dc_id: 1,
    result: {
      device: 'chrome_laptop.large',
      passed: false,
      public_id: '123-456-789',
    },
    result_id: '1',
  },
  result_id: '1',
}


export const mockTestTriggerResponse = {
  locations: ['location-1'],
  results: [],
  triggered_check_ids: ['123-456-789'],
}