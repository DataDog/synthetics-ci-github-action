import * as core from '@actions/core'
import chalk from 'chalk'
import {DefaultReporter} from '@datadog/datadog-ci/dist/commands/synthetics/reporters/default'
import {executeTests} from '@datadog/datadog-ci/dist/commands/synthetics/run-test'
import {CiError} from '@datadog/datadog-ci/dist/commands/synthetics/errors'
import {CommandConfig, PollResult, Summary, Test, Trigger} from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'
import {getReporter} from '@datadog/datadog-ci/dist/commands/synthetics/utils'
import {BaseContext} from 'clipanion'
import deepExtend from 'deep-extend'

const DEFAULT_CONFIG: CommandConfig = {
  apiKey: '',
  appKey: '',
  configPath: 'datadog-ci.json',
  datadogSite: 'datadoghq.com',
  failOnCriticalErrors: false,
  failOnTimeout: true,
  files: ['{,!(node_modules)/**/}*.synthetics.json'],
  global: {},
  locations: [],
  pollingTimeout: 2 * 60 * 1000,
  proxy: {protocol: 'http'},
  publicIds: [],
  subdomain: 'app',
  tunnel: false
}

const removeUndefinedValues = <T extends {[key: string]: any}>(object: T): T => {
  const newObject = {...object}
  Object.keys(newObject).forEach((k) => newObject[k] === undefined && delete newObject[k])

  return newObject
}

const printSummary = (summary: Summary) => {
  return `{criticalErrors: ${summary.criticalErrors}, passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}, notFound: ${summary.notFound}, timedOut: ${summary.timedOut}}`
}

const run = async (): Promise<void> => {
  const apiKey = core.getInput('apiKey')
  const appKey = core.getInput('appKey')
  const publicIds = core.getInput('publicIds')?.split(',')
  const datadogSite = core.getInput('datadogSite')
  const configPath = core.getInput('configPath')
  const files = core.getInput('files')?.split(',')
  const testSearchQuery = core.getInput('testSearchQuery')
  const subdomain = core.getInput('subdomain')
  const tunnel = core.getInput('tunnel') as unknown

  const context = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr
  } as BaseContext

  const reporter = getReporter([new DefaultReporter(context as any)])

  // Config from Github Actions > default config
  const config = deepExtend(
    DEFAULT_CONFIG,
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

  if (typeof config.files === 'string') {
    reporter!.log('[DEPRECATED] "files" should be an array of string instead of a string.\n')
    config.files = [config.files]
  }


  
  try {
    const {results, summary, tests, triggers} = await executeTests(reporter, config)
    if ( summary.criticalErrors > 0 || summary.failed > 0 || summary.timedOut > 0 || summary.notFound > 0) core.setFailed(`Datadog Synthetics tests failed : ${printSummary(summary)}`) 
  } catch (error) {
    if (error instanceof CiError) {
      switch (error.code) {
        case 'NO_TESTS_TO_RUN':
          reporter.log('No test to run.\n')
          break
        case 'MISSING_APP_KEY':
          reporter.error(
            `Missing ${chalk.red.bold(
              'DATADOG_APP_KEY'
            )} in your environment.\n`
          )
          break
        case 'MISSING_API_KEY':
          reporter.error(
            `Missing ${chalk.red.bold(
              'DATADOG_API_KEY'
            )} in your environment.\n`
          )
          break
        case 'POLL_RESULTS_FAILED':
          reporter.error(
            `\n${chalk.bgRed.bold(' ERROR: unable to poll test results ')}\n${
              error.message
            }\n\n`
          )
          break
        case 'TUNNEL_START_FAILED':
          reporter.error(
            `\n${chalk.bgRed.bold(' ERROR: unable to start tunnel')}\n${
              error.message
            }\n\n`
          )
          break
        case 'TRIGGER_TESTS_FAILED':
          reporter.error(
            `\n${chalk.bgRed.bold(' ERROR: unable to trigger tests')}\n${
              error.message
            }\n\n`
          )
          break
        case 'UNAVAILABLE_TEST_CONF':
          
          reporter.error(
            `\n${chalk.bgRed.bold(
              ' ERROR: unable to obtain test configurations with search query '
            )}\n${error.message}\n\n`
          )
          break
        case 'UNAVAILABLE_TUNNEL_CONF':
          reporter.error(
            `\n${chalk.bgRed.bold(
              ' ERROR: unable to get tunnel configuration'
            )}\n${error.message}\n\n`
          )
      }
    }
    core.setFailed('Running Datadog Synthetics tests failed.')
  }
}

if (require.main === module) {
  run()
}

export default run

