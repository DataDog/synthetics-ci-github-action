import * as core from '@actions/core'
import {Synthetics} from '@datadog/datadog-ci'
import {renderResults} from './process-results'

import {BaseContext} from 'clipanion'
import {resolveConfig} from './resolve-config'
import {reportCiError} from './report-ci-error'

const run = async (): Promise<void> => {
  const context: BaseContext = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  }

  const reporter = Synthetics.utils.getReporter([new Synthetics.DefaultReporter({context})])
  const config = await resolveConfig()

  try {
    const startTime = Date.now()
    const {results, summary, tests, triggers} = await Synthetics.executeTests(reporter, config)
    const resultSummary = renderResults(results, summary, tests, triggers, config, startTime, reporter)
    if (
      resultSummary.criticalErrors > 0 ||
      resultSummary.failed > 0 ||
      resultSummary.timedOut > 0 ||
      resultSummary.testsNotFound.size > 0
    ) {
      core.setFailed(`Datadog Synthetics tests failed : ${printSummary(resultSummary)}`)
    } else {
      core.info(`Datadog Synthetics tests succeeded : ${printSummary(resultSummary)}`)
    }
  } catch (error) {
    if (error instanceof Synthetics.CiError) {
      reportCiError(error, reporter)
    }
    core.setFailed('Running Datadog Synthetics tests failed.')
  }
}

export const printSummary = (summary: Synthetics.Summary) =>
  `criticalErrors: ${summary.criticalErrors}, passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}, notFound: ${summary.testsNotFound.size}, timedOut: ${summary.timedOut}`

if (require.main === module) {
  run()
}

export default run
