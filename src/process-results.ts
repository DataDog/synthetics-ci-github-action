import {synthetics} from '@datadog/datadog-ci'

export const renderResults = (args: {
  config: synthetics.CommandConfig
  reporter: synthetics.MainReporter
  results: synthetics.Result[]
  startTime: number
  summary: synthetics.Summary
}): synthetics.Summary => {
  synthetics.utils.renderResults(args)
  return args.summary
}
