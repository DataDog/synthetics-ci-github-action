import {Synthetics} from '@datadog/datadog-ci'
import {hasTestSucceeded, isCriticalError} from '@datadog/datadog-ci/dist/commands/synthetics/utils'

export const renderResults = (
  results: {[key: string]: Synthetics.PollResult[]},
  summary: Synthetics.Summary,
  tests: Synthetics.Test[],
  triggers: Synthetics.Trigger,
  config: Synthetics.SyntheticsCIConfig,
  startTime: number,
  reporter: Synthetics.MainReporter
) => {
  // Sort tests to show success first then non blocking failures and finally blocking failures.
  tests.sort(sortTestsByOutcome(results, config))

  // Rendering the results.
  reporter.reportStart({startTime})
  const locationNames = triggers.locations.reduce((mapping, location) => {
    mapping[location.id] = location.display_name

    return mapping
  }, {} as Synthetics.LocationsMapping)
  for (const test of tests) {
    const testResults = results[test.public_id]

    const hasTimeout = testResults.some(pollResult => pollResult.result.error === Synthetics.ERRORS.TIMEOUT)
    if (hasTimeout) {
      summary.timedOut++
    }

    if (!config.failOnCriticalErrors) {
      const hasCriticalErrors = testResults.some(pollResult => isCriticalError(pollResult.result))
      if (hasCriticalErrors) {
        summary.criticalErrors++
      }
    }

    const passed = hasTestSucceeded(testResults, config.failOnCriticalErrors, false)
    passed ? summary.passed++ : summary.failed++

    reporter.testEnd(
      test,
      testResults,
      `https://${config.subdomain}.${config.datadogSite}/`,
      locationNames,
      config.failOnCriticalErrors,
      false
    )
  }

  reporter.runEnd(summary)

  return summary
}

export const sortTestsByOutcome = (
  results: {[key: string]: Synthetics.PollResult[]},
  config: Synthetics.SyntheticsCIConfig
) => {
  return (t1: Synthetics.Test, t2: Synthetics.Test) => {
    const success1 = hasTestSucceeded(results[t1.public_id], config.failOnCriticalErrors, false)
    const success2 = hasTestSucceeded(results[t2.public_id], config.failOnCriticalErrors, false)
    const isNonBlockingTest1 = t1.options.ci?.executionRule === Synthetics.ExecutionRule.NON_BLOCKING
    const isNonBlockingTest2 = t2.options.ci?.executionRule === Synthetics.ExecutionRule.NON_BLOCKING

    if (success1 === success2) {
      if (isNonBlockingTest1 === isNonBlockingTest2) {
        return 0
      }

      return isNonBlockingTest1 ? -1 : 1
    }

    return success1 ? -1 : 1
  }
}
