## Overview

![GitHub Release](https://img.shields.io/github/v/release/DataDog/synthetics-ci-github-action)

Trigger Synthetic tests from your GitHub workflows.

For more information on the available configuration, see the [`datadog-ci run-tests` documentation][1].

## Setup

To get started:

1. Add your Datadog API and Application Keys as secrets to your GitHub repository.
   - For more information, see [API and Application Keys][2].
2. In your GitHub workflow, use `DataDog/synthetics-ci-github-action`.

Your workflow can be [simple](#simple-workflows) or [complex](#complex-workflows).

## Simple workflows

### Example workflow using public IDs

```yaml
name: Run Synthetic tests using the test public IDs
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Run Datadog Synthetic tests
        uses: DataDog/synthetics-ci-github-action@v2.2.0
        with:
          api-key: ${{secrets.DD_API_KEY}}
          app-key: ${{secrets.DD_APP_KEY}}
          public-ids: |
            abc-d3f-ghi
            jkl-mn0-pqr
```

### Example workflow using an existing `synthetics.json` file

```yaml
name: Run Synthetic tests using an existing synthetics.json file
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Run Datadog Synthetic tests
        uses: DataDog/synthetics-ci-github-action@v2.2.0
        with:
          api-key: ${{secrets.DD_API_KEY}}
          app-key: ${{secrets.DD_APP_KEY}}
```

For an example test file, see this [`test.synthetics.json` file][12].

**Note**: By default, this workflow runs all the tests listed in `{,!(node_modules)/**/}*.synthetics.json` files (every file ending with `.synthetics.json` except for those in the `node_modules` folder). You can also trigger a list of Synthetic tests by specifying a `public_id` or using a search query.

## Complex workflows

### Example workflow using the `test_search_query`

```yaml
name: Run Synthetic tests by test tag
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Run Datadog Synthetic tests
        uses: DataDog/synthetics-ci-github-action@v2.2.0
        with:
          api-key: ${{secrets.DD_API_KEY}}
          app-key: ${{secrets.DD_APP_KEY}}
          test-search-query: 'tag:e2e-tests'
```

### Example workflow using a test search query and variable overrides

```yaml
name: Run Synthetic tests using search query
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Run Datadog Synthetic tests
        uses: DataDog/synthetics-ci-github-action@v2.2.0
        with:
          api-key: ${{secrets.DD_API_KEY}}
          app-key: ${{secrets.DD_APP_KEY}}
          test-search-query: 'tag:staging'
          variables: 'START_URL=https://staging.website.com,PASSWORD=stagingpassword'
```

### Example workflow using a global configuration file with `config_path`

By default, the path to the global configuration file is `datadog-ci.json`. You can override this path with the `config_path` input.

```yaml
name: Run Synthetic tests with custom config
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Run Datadog Synthetic tests
        uses: DataDog/synthetics-ci-github-action@v2.2.0
        with:
          api-key: ${{secrets.DD_API_KEY}}
          app-key: ${{secrets.DD_APP_KEY}}
          config-path: './global.config.json'
```

## Inputs

For more information on the available configuration, see the [`datadog-ci run-tests` documentation][1].

| Name                      | Description                                                                                                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api-key`                 | (**Required**) Your Datadog API key. This key is [created in your Datadog organization][2] and should be stored as a [secret][3].                                                                                                                          |
| `app-key`                 | (**Required**) Your Datadog application key. This key is created by your [Datadog organization][2] and should be stored as a [secret][3].                                                                                                                  |
| `batch-timeout`           | The duration (in milliseconds) after which the batch fails as timed out. <br><sub>**Default:** `1800000` (30 minutes)</sub>                                                                                                                                |
| `config-path`             | The [global JSON configuration][4] to be used when launching tests. See the [example configuration file][13] for more details. <br><sub>**Default:** `datadog-ci.json`</sub>                                                                               |
| `datadog-site`            | The [Datadog site][11] to send data to. <br><sub>**Default:** `datadoghq.com`</sub>                                                                                                                                                                        |
| `fail-on-critical-errors` | Fail the CI job if no tests were triggered, or results could not be fetched from Datadog. <br><sub>**Default:** `false`</sub>                                                                                                                              |
| `fail-on-missing-tests`   | Fail the CI job if at least one specified test with a public ID (using `public_ids` or listed in a [test file][12]) is missing in a run (for example, if it has been deleted programmatically or on the Datadog site). <br><sub>**Default:** `false`</sub> |
| `fail-on-timeout`         | Fail the CI job if at least one test exceeds the default test timeout. <br><sub>**Default:** `true`</sub>                                                                                                                                                  |
| `files`                   | Glob pattern to detect Synthetic test configuration files. <br><sub>**Default:** `{,!(node_modules)/**/}*.synthetics.json`</sub>                                                                                                                           |
| `junit-report`            | The filename for a JUnit report if you want to generate one. <br><sub>**Default:** none</sub>                                                                                                                                                              |
| `public-ids`              | Public IDs of Synthetic tests to run, separated by new lines or commas. If no value is provided, tests are discovered in `*.synthetics.json` files. <br><sub>**Default:** none</sub>                                                                       |
| `subdomain`               | The name of the custom subdomain set to access your Datadog application. If the URL used to access Datadog is `myorg.datadoghq.com`, the subdomain value needs to be set to `myorg`. <br><sub>**Default:** `app`</sub>                                     |
| `test-search-query`       | Trigger tests corresponding to a [search query][5]. <br><sub>**Default:** none</sub>                                                                                                                                                                       |
| `tunnel`                  | Use the [Continuous Testing Tunnel][9] to execute your test batch. <br><sub>**Default:** `false`</sub>                                                                                                                                                     |
| `variables`               | Key-value pairs for injecting variables into tests, separated by newlines or commas. For example: `START_URL=https://example.org,MY_VARIABLE=My title`. <br><sub>**Default:** none</sub>                                                                   |

## Outputs

| Name                        | Description                                |
| --------------------------- | ------------------------------------------ |
| `batch-url`                 | The URL of the batch.                      |
| `critical-errors-count`     | The number of critical errors.             |
| `failed-count`              | The number of failed results.              |
| `failed-non-blocking-count` | The number of failed non-blocking results. |
| `passed-count`              | The number of passed results.              |
| `previously-passed-count`   | The number of previously passed results.   |
| `tests-not-found-count`     | The number of not found tests.             |
| `tests-skipped-count`       | The number of skipped tests.               |
| `timed-out-count`           | The number of timed out results.           |
| `raw-results`               | The list of results, as a raw JSON string. |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Further reading

Additional helpful documentation, links, and articles:

- [Continuous Testing and CI/CD Configuration][6]
- [Best practices for continuous testing with Datadog][10]

[1]: https://docs.datadoghq.com/continuous_testing/cicd_integrations/configuration/?tab=npm#run-tests-command
[2]: https://docs.datadoghq.com/account_management/api-app-keys/
[3]: https://docs.github.com/en/actions/reference/encrypted-secrets
[4]: https://docs.datadoghq.com/continuous_testing/cicd_integrations/configuration/?tab=npm#setup-the-client
[5]: https://docs.datadoghq.com/synthetics/search/#search
[6]: https://docs.datadoghq.com/continuous_testing/cicd_integrations/configuration
[7]: https://semver.org/#summary
[8]: https://github.com/DataDog/synthetics-ci-github-action/tags
[9]: https://docs.datadoghq.com/continuous_testing/testing_tunnel/
[10]: https://www.datadoghq.com/blog/best-practices-datadog-continuous-testing/
[11]: https://docs.datadoghq.com/getting_started/site
[12]: https://docs.datadoghq.com/continuous_testing/cicd_integrations/configuration/?tab=npm#test-files
[13]: https://github.com/DataDog/datadog-ci/blob/master/.github/workflows/e2e/global.config.json
