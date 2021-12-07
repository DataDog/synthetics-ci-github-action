import {synthetics} from '@datadog/datadog-ci'

export const renderResults = (
  results: {[key: string]: synthetics.PollResult[]},
  summary: synthetics.Summary,
  tests: synthetics.Test[],
  triggers: synthetics.Trigger,
  config: synthetics.SyntheticsCIConfig,
  startTime: number,
  reporter: synthetics.MainReporter
): synthetics.Summary => {
  // Sort tests to show success first then non blocking failures and finally blocking failures.
  tests.sort(sortTestsByOutcome(results, config))

  // Rendering the results.
  reporter.reportStart({startTime})
  const locationNames = triggers.locations.reduce((mapping, location) => {
    mapping[location.id] = location.display_name

    return mapping
  }, {} as synthetics.LocationsMapping)
  for (const test of tests) {
    const testResults = results[test.public_id]

    const hasTimeout = testResults.some(pollResult => pollResult.result.error === synthetics.ERRORS.TIMEOUT)
    if (hasTimeout) {
      summary.timedOut++
    }

    if (!config.failOnCriticalErrors) {
      const hasCriticalErrors = testResults.some(pollResult => synthetics.utils.isCriticalError(pollResult.result))
      if (hasCriticalErrors) {
        summary.criticalErrors++
      }
    }

    const passed = synthetics.utils.hasTestSucceeded(testResults, config.failOnCriticalErrors, false)
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
  results: {[key: string]: synthetics.PollResult[]},
  config: synthetics.SyntheticsCIConfig
) => {
  return (t1: synthetics.Test, t2: synthetics.Test) => {
    const success1 = synthetics.utils.hasTestSucceeded(results[t1.public_id], config.failOnCriticalErrors, false)
    const success2 = synthetics.utils.hasTestSucceeded(results[t2.public_id], config.failOnCriticalErrors, false)
    const isNonBlockingTest1 = t1.options.ci?.executionRule === synthetics.ExecutionRule.NON_BLOCKING
    const isNonBlockingTest2 = t2.options.ci?.executionRule === synthetics.ExecutionRule.NON_BLOCKING

    if (success1 === success2) {
      if (isNonBlockingTest1 === isNonBlockingTest2) {
        return 0
      }

      return isNonBlockingTest1 ? -1 : 1
    }

    return success1 ? -1 : 1
  }
}
