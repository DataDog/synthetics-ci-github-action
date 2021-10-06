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
  const publicIds = getDefinedInput('public_ids')?.split(',').map((publicId: string) => publicId.trim())
  const datadogSite = getDefinedInput('datadog_site')
  const configPath = getDefinedInput('config_path')
  const files = getDefinedInput('files')?.split(',').map((files: string) => files.trim()) 
  const testSearchQuery = getDefinedInput('test_search_query')
  const subdomain = getDefinedInput('subdomain')
  const tunnel = getDefinedInput('tunnel')

  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
  let fileConfig: SyntheticsCIConfig = {} as SyntheticsCIConfig
  try {
    fileConfig = await parseConfigFile(config, configPath ?? DEFAULT_CONFIG.configPath)
  } catch (error) {
      if (configPath) {
        core.error(`Unable to parse config file! Please verify config path : ${configPath}`)
      }else{
        core.error(`Unable to parse config file! Please verify config path : ${DEFAULT_CONFIG.configPath}`)
      }
  } 

  
  // file config > default config
  config = deepExtend(
    config,
    removeUndefinedValues({
    apiKey: fileConfig.apiKey,
    appKey: fileConfig.appKey,
    configPath: fileConfig.configPath,
    datadogSite: fileConfig.datadogSite,
    files: fileConfig.files,
    publicIds: fileConfig.publicIds,
    subdomain: fileConfig.subdomain,
    testSearchQuery: fileConfig.testSearchQuery,
    tunnel: fileConfig.tunnel
    })
)
  

  // GHA config > file config
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

const getDefinedInput = (name: string) => {
  const input = core.getInput(name)
  return input !== '' ? input : undefined
}