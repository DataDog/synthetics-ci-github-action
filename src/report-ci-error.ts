import {CiError} from '@datadog/datadog-ci/dist/commands/synthetics/errors'
import {MainReporter} from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'
import chalk from 'chalk'

export const reportCiError = (error: CiError, reporter: MainReporter) => {
  switch (error.code) {
    case 'NO_RESULTS_TO_POLL':
      reporter.log('No results to poll.\n')
      break
    case 'NO_TESTS_TO_RUN':
      reporter.log('No test to run.\n')
      break
    case 'MISSING_APP_KEY':
      reporter.error(
        `Missing ${chalk.red.bold('DATADOG_APP_KEY')} in your environment.\n`
      )
      break
    case 'MISSING_API_KEY':
      reporter.error(
        `Missing ${chalk.red.bold('DATADOG_API_KEY')} in your environment.\n`
      )
      break
    case 'POLL_RESULTS_FAILED':
      reporter.error(
        `\n${chalk.bgRed.bold(' ERROR: unable to poll test results ')}\n${
          error.message
        }\n\n`
      )
      break
    case 'TUNNEL_START_FAILED':
      reporter.error(
        `\n${chalk.bgRed.bold(' ERROR: unable to start tunnel')}\n${
          error.message
        }\n\n`
      )
      break
    case 'TRIGGER_TESTS_FAILED':
      reporter.error(
        `\n${chalk.bgRed.bold(' ERROR: unable to trigger tests')}\n${
          error.message
        }\n\n`
      )
      break
    case 'UNAVAILABLE_TEST_CONFIG':
      reporter.error(
        `\n${chalk.bgRed.bold(
          ' ERROR: unable to obtain test configurations with search query '
        )}\n${error.message}\n\n`
      )
      break
    case 'UNAVAILABLE_TUNNEL_CONFIG':
      reporter.error(
        `\n${chalk.bgRed.bold(' ERROR: unable to get tunnel configuration')}\n${
          error.message
        }\n\n`
      )
  }
}
