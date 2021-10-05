import * as core from '@actions/core'

import {DefaultReporter} from '@datadog/datadog-ci/dist/commands/synthetics/reporters/default'
import {executeTests} from '@datadog/datadog-ci/dist/commands/synthetics/run-test'
import {CiError} from '@datadog/datadog-ci/dist/commands/synthetics/errors'
import {getReporter} from '@datadog/datadog-ci/dist/commands/synthetics/utils'
import {BaseContext} from 'clipanion'

import {resolveConfig} from './resolve-config'
import {reportCiError} from './report-ci-error'
import {Summary} from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'

const run = async (): Promise<void> => {
  const context = {
    context : {
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr
    } as BaseContext
  }
    
  const reporter = getReporter([new DefaultReporter(context as any)])
  const config = await resolveConfig()

  try {
    const {results, summary, tests, triggers} = await executeTests(
      reporter,
      config
    )
    if (
      summary.criticalErrors > 0 ||
      summary.failed > 0 ||
      summary.timedOut > 0 ||
      summary.notFound > 0
    )
      core.setFailed(
        `Datadog Synthetics tests failed : ${printSummary(summary)}`
      )
  } catch (error) {
    if (error instanceof CiError) {
      reportCiError(error, reporter)
    }
    core.setFailed('Running Datadog Synthetics tests failed.')
  }
}

const printSummary = (summary: Summary) => (`{criticalErrors: ${summary.criticalErrors}, passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}, notFound: ${summary.notFound}, timedOut: ${summary.timedOut}}`)


if (require.main === module) {
  run()
}

export default run
