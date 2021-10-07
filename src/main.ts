import * as core from '@actions/core'

import {DefaultReporter} from '@datadog/datadog-ci/dist/commands/synthetics/reporters/default'
import {executeTests} from '@datadog/datadog-ci/dist/commands/synthetics/run-test'
import {CiError} from '@datadog/datadog-ci/dist/commands/synthetics/errors'
import {getReporter} from '@datadog/datadog-ci/dist/commands/synthetics/utils'
import {BaseContext} from 'clipanion'

import {resolveConfig} from './resolve-config'
import {reportCiError} from './report-ci-error'
import { handleResults, renderResults } from './process-results'
import { SyntheticsCIConfig } from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'

const run = async (): Promise<void> => {
  const context = {
    context : {
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr
    } as BaseContext
  }
  const startTime = Date.now()
  const reporter = getReporter([new DefaultReporter(context as any)])
  let config : SyntheticsCIConfig = {} as SyntheticsCIConfig
  try {
    config = await resolveConfig()
  } catch(error) {
    core.setFailed(`Failed resolving Synthetics test configuration.`)
  }
   

  try {
    const {results, summary, tests, triggers} = await executeTests(reporter, config)
    const finalSummary = renderResults(config, results, summary, tests, triggers, startTime, reporter)
    handleResults(finalSummary)
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
