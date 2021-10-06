import * as core from '@actions/core'
import deepExtend from 'deep-extend'
import { SyntheticsCIConfig, CommandConfig } from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'
import { removeUndefinedValues } from './utils'
import { parseConfigFile } from '@datadog/datadog-ci/dist/helpers/utils'

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
  const publicIds = core.getInput('public_ids')?.split(',').map((publicId: string) => publicId.trim())
  const datadogSite = core.getInput('datadog_site') || undefined
  const configPath = core.getInput('config_path')  ? core.getInput('config_path') : undefined
  const files = core.getInput('files')? core.getInput('files').split(',') : undefined
  const testSearchQuery = core.getInput('test_search_query') ? core.getInput('test_search_query') : undefined
  const subdomain = core.getInput('subdomain') ? core.getInput('subdomain') : undefined
  const tunnel = core.getInput('tunnel') ? core.getInput('tunnel') : undefined

  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
  try {
    config = await parseConfigFile(config, configPath ?? DEFAULT_CONFIG.configPath)
  } catch (error) {
      if (configPath) {
        core.error(`Unable to parse config file! Please verify config path : ${configPath}`)
      }else{
        core.error(`Unable to parse config file! Please verify config path : ${DEFAULT_CONFIG.configPath}`)
      }
  } 

// GHA config > default config
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

  if (typeof config.files === 'string') {
    core.warning(
      '[DEPRECATED] "files" should be an array of string instead of a string.\n'
    )
    config.files = [config.files]
  }

  return config
}
