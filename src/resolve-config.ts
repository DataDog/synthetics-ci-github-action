import * as core from '@actions/core'
import {SyntheticsCIConfig} from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'
import deepExtend from 'deep-extend'
import {removeUndefinedValues} from './utils'

const DEFAULT_CONFIG: SyntheticsCIConfig = {
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

export const resolveConfig = async (): Promise<SyntheticsCIConfig> => {
  const apiKey = core.getInput('api_key', {required: true})
  const appKey = core.getInput('app_key', {required: true})
  const publicIds = core
        .getInput('public_ids', {required: true})
        .split(',')
        .map((publicId: string) => publicId.trim())
  const datadogSite = core.getInput('datadog_site')
    ? core.getInput('datadog_site')
    : undefined

  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG))

  // GHA config > default config
  config = deepExtend(
    config,
    removeUndefinedValues({
      apiKey: apiKey,
      appKey: appKey,
      publicIds: publicIds,
      datadogSite: datadogSite
    })
  )

  return config
}
