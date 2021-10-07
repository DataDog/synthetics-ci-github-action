import * as core from '@actions/core'
import {CiError} from '@datadog/datadog-ci/dist/commands/synthetics/errors'
import {DefaultReporter} from '@datadog/datadog-ci/dist/commands/synthetics/reporters/default'
import {executeTests} from '@datadog/datadog-ci/dist/commands/synthetics/run-test'
import {getReporter} from '@datadog/datadog-ci/dist/commands/synthetics/utils'
import {handleResults, renderResults} from './process-results'

import {BaseContext} from 'clipanion'
import {resolveConfig} from './resolve-config'
import {reportCiError} from './report-ci-error'


const run = async (): Promise<void> => {
  const context = {
    context: {
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr
    } as BaseContext
  }
  const startTime = Date.now()
  const reporter = getReporter([new DefaultReporter(context as any)])
  const config = await resolveConfig()

  try {
    const {results, summary, tests, triggers} = await executeTests(reporter, config)
    const resultSummary = renderResults(results, summary, tests, triggers, config, reporter, startTime)
    handleResults(resultSummary)
  } catch (error) {
    console.log(error)
    if (error instanceof CiError) {
      reportCiError(error, reporter)
    }
    core.setFailed('Running Datadog Synthetics tests failed.')
  }
}

if (require.main === module) {
  run()
}

export default run
