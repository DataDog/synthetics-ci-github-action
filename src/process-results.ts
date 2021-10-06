import * as core from '@actions/core'

import { ERRORS, ExecutionRule, LocationsMapping, MainReporter, PollResult, Summary, SyntheticsCIConfig, Test, Trigger } from "@datadog/datadog-ci/dist/commands/synthetics/interfaces"
import { hasTestSucceeded, isCriticalError } from "@datadog/datadog-ci/dist/commands/synthetics/utils"

export const handleResults = (summary : Summary) => {
    if (
      summary.criticalErrors > 0 ||
      summary.failed > 0 ||
      summary.timedOut > 0 ||
      summary.notFound > 0
    ) 
    core.setFailed(
        `Datadog Synthetics tests failed : ${printSummary(summary)}`
      )
      
  }


export const printSummary = (summary: Summary) => (`{criticalErrors: ${summary.criticalErrors}, passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}, notFound: ${summary.notFound}, timedOut: ${summary.timedOut}}`)

export const renderResults = (
  config: SyntheticsCIConfig,
  results: {[key: string]: PollResult[]},
  summary: Summary,
  tests: Test[],
  triggers: Trigger,
  startTime: number,
  reporter: MainReporter
) => {
  
  tests.sort(sortTestsByOutcome(results, config))
  // Rendering the results.
  reporter?.reportStart({startTime})
  const locationNames = triggers.locations.reduce((mapping, location) => {
    mapping[location.id] = location.display_name

    return mapping
  }, {} as LocationsMapping)
  let hasSucceeded = true // Determine if all the tests have succeeded
  for (const test of tests) {
    const testResults = results[test.public_id]
    
    if (!summary.timedOut) {
      summary.timedOut = 0
    }

    const hasTimeout = testResults.some((pollResult) => pollResult.result.error === ERRORS.TIMEOUT)
    if (hasTimeout) {
      summary.timedOut++
    }
    
    if (!config.failOnCriticalErrors) {
      if (!summary.criticalErrors) {
        summary.criticalErrors = 0
      }
      const hasCriticalErrors = testResults.some((pollResult) => isCriticalError(pollResult.result))
      if (hasCriticalErrors) {
        summary.criticalErrors++
      }
    }

    const passed = hasTestSucceeded(testResults, config.failOnCriticalErrors, false)
    if (passed) {
      summary.passed++
    } else {
      summary.failed++
      if (test.options.ci?.executionRule !== ExecutionRule.NON_BLOCKING) {
        hasSucceeded = false
      }
    }

    reporter?.testEnd(
      test,
      testResults,
      `https://${config.subdomain}.${config.datadogSite}`,
      locationNames,
      config.failOnCriticalErrors,
      false
    )
  }

  reporter?.runEnd(summary)
  return summary
}

export const sortTestsByOutcome = (results: {[key: string]: PollResult[]}, config: SyntheticsCIConfig) => {
  return (t1: Test, t2: Test) => {
    const success1 = hasTestSucceeded(
      results[t1.public_id],
      config.failOnCriticalErrors,
      false
    )
    const success2 = hasTestSucceeded(
      results[t2.public_id],
      config.failOnCriticalErrors,
      false
    )
    const isNonBlockingTest1 = t1.options.ci?.executionRule === ExecutionRule.NON_BLOCKING
    const isNonBlockingTest2 = t2.options.ci?.executionRule === ExecutionRule.NON_BLOCKING

    if (success1 === success2) {
      if (isNonBlockingTest1 === isNonBlockingTest2) {
        return 0
      }

      return isNonBlockingTest1 ? -1 : 1
    }

    return success1 ? -1 : 1
  }
}