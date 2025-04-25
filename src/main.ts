import * as core from '@actions/core'
import {getReporter, resolveConfig} from './resolve-config'
import {synthetics} from '@datadog/datadog-ci'

const run = async (): Promise<void> => {
  synthetics.utils.setCiTriggerApp('github_action')

  const reporter = getReporter()
  const config = await resolveConfig(reporter)
  const startTime = Date.now()

  try {
    const {results, summary} = await synthetics.executeTests(reporter, config)
    const orgSettings = await synthetics.utils.getOrgSettings(reporter, config)

    synthetics.utils.renderResults({
      config,
      orgSettings,
      reporter,
      results,
      startTime,
      summary,
    })

    synthetics.utils.reportExitLogs(reporter, config, {results})

    const exitReason = synthetics.utils.getExitReason(config, {results})
    if (exitReason !== 'passed') {
      core.setFailed(`Datadog Synthetics tests failed: ${printSummary(summary, config)}`)
    } else {
      core.info(`\n\nDatadog Synthetics tests succeeded: ${printSummary(summary, config)}`)
    }
  } catch (error) {
    synthetics.utils.reportExitLogs(reporter, config, {error})

    const exitReason = synthetics.utils.getExitReason(config, {error})
    if (exitReason !== 'passed') {
      core.setFailed('Running Datadog Synthetics tests failed.')
    }
  }
}

export const printSummary = (summary: synthetics.Summary, config: synthetics.RunTestsCommandConfig): string => {
  const baseUrl = synthetics.utils.getAppBaseURL(config)
  const batchUrl = synthetics.utils.getBatchUrl(baseUrl, summary.batchId)
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
/* eslint-disable */
require('../package.json').name
require('../package.json').version
