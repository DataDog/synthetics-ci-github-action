import * as core from '@actions/core'
import {parseMultiline, parseVariableStrings} from './utils'
import {synthetics, utils} from '@datadog/datadog-ci'
import deepExtend from 'deep-extend'

export const resolveConfig = async (reporter: synthetics.MainReporter): Promise<synthetics.RunTestsCommandConfig> => {
  let apiKey
  let appKey
  try {
    apiKey = core.getInput('api_key', {required: true})
    appKey = core.getInput('app_key', {required: true})
  } catch (error) {
    core.setFailed('Missing API or APP keys to initialize datadog-ci!')
    throw error
  }
  const batchTimeout = getDefinedInteger('batch_timeout')
  const publicIds = parseMultiline(getDefinedInput('public_ids'))
  const datadogSite = getDefinedInput('datadog_site')
  const configPath = getDefinedInput('config_path')
  const files = getDefinedInput('files')
    ?.split(',')
    .map((file: string) => file.trim())
  const testSearchQuery = getDefinedInput('test_search_query')
  const subdomain = getDefinedInput('subdomain')
  const variableStrings = parseMultiline(getDefinedInput('variables'))
  const tunnel = getDefinedBoolean('tunnel')
  const failOnCriticalErrors = getDefinedBoolean('fail_on_critical_errors')
  const failOnMissingTests = getDefinedBoolean('fail_on_missing_tests')
  const failOnTimeout = getDefinedBoolean('fail_on_timeout')

  let config = JSON.parse(JSON.stringify(synthetics.DEFAULT_COMMAND_CONFIG))
  // Override with file config variables
  try {
    config = await utils.resolveConfigFromFile(config, {
      configPath,
      defaultConfigPaths: [synthetics.DEFAULT_COMMAND_CONFIG.configPath],
    })
  } catch (error) {
    if (configPath) {
      core.setFailed(`Unable to parse config file! Please verify config path: ${configPath}`)
      throw error
    }
    // Here, if configPath is not present it means that default config file does not exist: in this case it's expected for the github action to be silent.
  }

  // Override with Github Action inputs
  config = deepExtend(
    config,
    utils.removeUndefinedValues({
      apiKey,
      appKey,
      batchTimeout,
      configPath,
      datadogSite,
      defaultTestOverrides: deepExtend(
        config.defaultTestOverrides,
        utils.removeUndefinedValues({
          variables: parseVariableStrings(variableStrings, reporter.log.bind(reporter)),
        })
      ),
      failOnCriticalErrors,
      failOnMissingTests,
      failOnTimeout,
      files,
      publicIds,
      subdomain,
      testSearchQuery,
      tunnel,
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

export const getDefinedInteger = (name: string): number | undefined => {
  const input = getDefinedInput(name)
  if (!input) {
    return undefined
  }

  const number = parseFloat(input)
  if (!Number.isInteger(number)) {
    const error = Error(`Invalid value for ${name}: ${number} is not an integer`)
    core.setFailed(error)
    throw error
  }

  return number
}

export const getReporter = (): synthetics.MainReporter => {
  const reporters: synthetics.Reporter[] = [new synthetics.DefaultReporter({context: process})]

  const jUnitReportFilename = getDefinedInput('junit_report')
  if (jUnitReportFilename) {
    reporters.push(new synthetics.JUnitReporter({context: process, jUnitReport: jUnitReportFilename}))
  }

  return synthetics.utils.getReporter(reporters)
}
