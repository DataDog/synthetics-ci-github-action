import * as core from '@actions/core'
import {synthetics, utils} from '@datadog/datadog-ci'
import {BaseContext} from 'clipanion'
import {Reporter} from '@datadog/datadog-ci/dist/commands/synthetics'
import deepExtend from 'deep-extend'

const DEFAULT_CONFIG: synthetics.CommandConfig = {
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
  subdomain: 'app',
  tunnel: false,
  variableStrings: [],
}

export const resolveConfig = async (reporter: synthetics.MainReporter): Promise<synthetics.CommandConfig> => {
  let apiKey
  let appKey
  try {
    apiKey = core.getInput('api_key', {required: true})
    appKey = core.getInput('app_key', {required: true})
  } catch (error) {
    core.setFailed('Missing API or APP keys to initialize datadog-ci!')
    throw error
  }
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
  const variableStrings = getDefinedInput('variables')
    ?.split(',')
    .map((variableString: string) => variableString.trim())
  const tunnel = getDefinedBoolean('tunnel')

  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
  // Override with file config variables
  try {
    config = await utils.resolveConfigFromFile(config, {configPath, defaultConfigPath: DEFAULT_CONFIG.configPath})
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
    utils.removeUndefinedValues({
      apiKey,
      appKey,
      configPath,
      datadogSite,
      files,
      publicIds,
      subdomain,
      testSearchQuery,
      tunnel,
      global: deepExtend(
        config.global,
        utils.removeUndefinedValues({
          variables: synthetics.utils.parseVariablesFromCli(variableStrings, reporter.log.bind(reporter)),
        })
      ),
    })
  )

  return config
}

export const getDefinedInput = (name: string): string | undefined => {
  const input = core.getInput(name)

  return input !== '' ? input : undefined
}

export const getDefinedBoolean = (name: string): boolean | undefined => {
  try {
    if (!getDefinedInput(name)) {
      return undefined
    }
    return core.getBooleanInput(name)
  } catch (error) {
    core.setFailed(String(error))
    throw error
  }
}

export const getReporter = (): synthetics.MainReporter => {
  const context: BaseContext = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  }

  const reporters: Reporter[] = [new synthetics.DefaultReporter({context})]

  const jUnitReportFilename = getDefinedInput('junit_report')
  if (jUnitReportFilename) {
    reporters.push(new synthetics.JUnitReporter({context, jUnitReport: jUnitReportFilename}))
  }

  return synthetics.utils.getReporter(reporters)
}
