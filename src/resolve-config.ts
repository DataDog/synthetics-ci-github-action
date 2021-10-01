import * as core from '@actions/core'
import deepExtend from 'deep-extend'
import {SyntheticsCIConfig} from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'

const DEFAULT_CONFIG: SyntheticsCIConfig = {
  apiKey: '',
  appKey: '',
  configPath: 'datadog-ci.json',
  datadogSite: 'datadoghq.com',
  files: ['{,!(node_modules)/**/}*.synthetics.json'],
  global: {},
  locations: [],
  pollingTimeout: 2 * 60 * 1000,
  proxy: {protocol: 'http'},
  publicIds: [],
  subdomain: 'app',
  tunnel: false
}

const removeUndefinedValues = <T extends {[key: string]: any}>(
  object: T
): T => {
  const newObject = {...object}
  Object.keys(newObject).forEach(
    k => newObject[k] === undefined && delete newObject[k]
  )

  return newObject
}

export const resolveConfig = async (): Promise<SyntheticsCIConfig> => {
  const apiKey = core.getInput('api_key', {required: true})
  const appKey = core.getInput('app_key', {required: true})
  const publicIds = core.getInput('public_ids')
    ? core.getInput('public_ids').split(',')
    : undefined

  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG))

  // GHA config > default config
  config = deepExtend(
    config,
    removeUndefinedValues({
      apiKey: apiKey,
      appKey: appKey,
      publicIds: publicIds
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
