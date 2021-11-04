import * as core from '@actions/core'
import {parseConfigFile, Synthetics} from '@datadog/datadog-ci'
import deepExtend from 'deep-extend'
import {removeUndefinedValues} from './utils'

const DEFAULT_CONFIG: Synthetics.SyntheticsCIConfig = {
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
  tunnel: false,
}

export const resolveConfig = async (): Promise<Synthetics.SyntheticsCIConfig> => {
  const apiKey = core.getInput('api_key', {required: true})
  const appKey = core.getInput('app_key', {required: true})
  const publicIds = getDefinedInput('public_ids')
    ?.split(',')
    .map((publicId: string) => publicId.trim())
  const datadogSite = getDefinedInput('datadog_site')
  const configPath = getDefinedInput('config_path')
  const files = getDefinedInput('files')
    ?.split(',')
    .map((file: string) => file.trim())
  const testSearchQuery = getDefinedInput('test_search_query')
  const subdomain = getDefinedInput('subdomain')
  const tunnel = getDefinedInput('tunnel')

  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
  // Override with file config variables
  try {
    config = await parseConfigFile(config, configPath ?? DEFAULT_CONFIG.configPath)
  } catch (error) {
    if (configPath) {
      core.setFailed(`Unable to parse config file! Please verify config path : ${configPath}`)
      throw error
    }
    // Here, if configPath is not present it means that default config file does not exist: in this case it's expected for the github action to be silent.
  }

  // Override with GithubAction inputs
  config = deepExtend(
    config,
    removeUndefinedValues({
      apiKey: apiKey,
      appKey: appKey,
      configPath: configPath,
      datadogSite: datadogSite,
      files: files,
      publicIds: publicIds,
      subdomain: subdomain,
      testSearchQuery: testSearchQuery,
      tunnel: tunnel,
    })
  )

  return config
}

export const getDefinedInput = (name: string) => {
  const input = core.getInput(name)

  return input !== '' ? input : undefined
}
