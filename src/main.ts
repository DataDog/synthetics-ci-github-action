import * as core from '@actions/core'
import {BaseContext} from 'clipanion'
import {renderResults} from './process-results'
import {reportCiError} from './report-ci-error'
import {resolveConfig} from './resolve-config'
import {synthetics} from '@datadog/datadog-ci'

const run = async (): Promise<void> => {
  const context: BaseContext = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  }

  synthetics.utils.setCiTriggerApp('github_action')
  const reporter = synthetics.utils.getReporter([new synthetics.DefaultReporter({context})])
  const config = await resolveConfig(reporter)

  try {
    const startTime = Date.now()
    const {results, summary} = await synthetics.executeTests(reporter, config)
    const resultSummary = renderResults({config, reporter, results, startTime, summary})
    if (
      resultSummary.criticalErrors > 0 ||
      resultSummary.failed > 0 ||
      resultSummary.timedOut > 0 ||
      resultSummary.testsNotFound.size > 0
    ) {
      core.setFailed(`Datadog Synthetics tests failed : ${printSummary(resultSummary, config)}`)
    } else {
      core.info(`Datadog Synthetics tests succeeded : ${printSummary(resultSummary, config)}`)
    }
  } catch (error) {
    if (error instanceof synthetics.CiError) {
      reportCiError(error, reporter)
    } else {
      core.info(`Internal error: ${String(error)}`)
    }
    core.setFailed('Running Datadog Synthetics tests failed.')
  }
}

export const printSummary = (summary: synthetics.Summary, config: synthetics.SyntheticsCIConfig): string => {
  const baseUrl = synthetics.utils.getAppBaseURL(config)
  const batchUrl = synthetics.utils.getBatchUrl(baseUrl, String(summary.batchId))
  return (
    `criticalErrors: ${summary.criticalErrors}, passed: ${summary.passed}, failedNonBlocking: ${summary.failedNonBlocking}, failed: ${summary.failed}, skipped: ${summary.skipped}, notFound: ${summary.testsNotFound.size}, timedOut: ${summary.timedOut}\n` +
    `Results URL: ${batchUrl}`
  )
}

if (require.main === module) {
  run()
}

export default run

// Force embed of version in build files from package.json for release check
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
require('../package.json').name
require('../package.json').version
