import * as core from '@actions/core'
import {CiError} from '@datadog/datadog-ci/dist/commands/synthetics/errors'
import {
  Summary,
  SyntheticsCIConfig
} from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'
import {DefaultReporter} from '@datadog/datadog-ci/dist/commands/synthetics/reporters/default'
import {executeTests} from '@datadog/datadog-ci/dist/commands/synthetics/run-test'
import {getReporter} from '@datadog/datadog-ci/dist/commands/synthetics/utils'

import {BaseContext} from 'clipanion'
import {renderResults} from './process-results'
import {reportCiError} from './report-ci-error'
import {resolveConfig} from './resolve-config'

const run = async (): Promise<void> => {
  const context = {
    context: {
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout
    } as BaseContext
  }

  const reporter = getReporter([new DefaultReporter(context as any)])
  let config: SyntheticsCIConfig = {} as SyntheticsCIConfig
  try {
    config = await resolveConfig()
  } catch (error) {
    core.setFailed('Failed resolving Synthetics test configuration.')
  }

  try {
    const startTime = Date.now()
    const {results, summary, tests, triggers} = await executeTests(
      reporter,
      config
    )
    const resultSummary = renderResults(
      results,
      summary,
      tests,
      triggers,
      config,
      startTime,
      reporter
    )
    if (
      resultSummary.criticalErrors > 0 ||
      resultSummary.failed > 0 ||
      resultSummary.timedOut > 0 ||
      resultSummary.notFound > 0
    ) {
      core.setFailed(
        `Datadog Synthetics tests failed : ${printSummary(resultSummary)}`
      )
    } else {
      core.info(
        `Datadog Synthetics tests succeeded : ${printSummary(resultSummary)}`
      )
    }
  } catch (error) {
    console.log(error)
    if (error instanceof CiError) {
      reportCiError(error, reporter)
    }
    core.setFailed('Running Datadog Synthetics tests failed.')
  }
}

export const printSummary = (summary: Summary) =>
  `criticalErrors: ${summary.criticalErrors}, passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}, notFound: ${summary.notFound}, timedOut: ${summary.timedOut}`

if (require.main === module) {
  run()
}

export default run
