import * as core from '@actions/core'
import {SyntheticsCIConfig} from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'
import {parseConfigFile} from '@datadog/datadog-ci/dist/helpers/utils'
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
  const publicIds = getDefinedInput('public_ids')?.split(',').map((publicId: string) => publicId.trim())
  const datadogSite = getDefinedInput('datadog_site')
  const configPath = getDefinedInput('config_path')
  const files = getDefinedInput('files')?.split(',').map((file: string) => file.trim())
  const testSearchQuery = getDefinedInput('test_search_query')
  const subdomain = getDefinedInput('subdomain')
  const tunnel = getDefinedInput('tunnel')

  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
  // Override with file config variables
  try {
    config = await parseConfigFile(config, configPath ?? DEFAULT_CONFIG.configPath)
  } catch (error) {
    if (configPath) {
      core.error(
        `Unable to parse config file! Please verify config path : ${configPath}`
      )
    }
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
      tunnel: tunnel
    })
  )

  return config
}

export const getDefinedInput = (name: string) => {
  const input = core.getInput(name)

  return input !== '' ? input : undefined
}
