# Datadog Synthetic CI Github Action

This Datadog Github Action allows you to trigger your Datadog Synthetics test suite, wait for the results and report the status, using the [datadog-ci](https://github.com/DataDog/datadog-ci) tool.

## Setup
Get started in two steps:

1. Add your Datadog API and application keys as environment variables to your Github repository (find out more [here](https://docs.datadoghq.com/account_management/api-app-keys/)).
2. Use the `DataDog/synthetics-ci-github-action` in your Github workflow


[Simple workflows](#simple-workflows)\
[Complex workflows](#complex-workflows)

## Simple workflows

### Example workflow using public IDs


```yaml
name: Run Synthetics tests using the test public IDs

jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Run Datadog Synthetics tests
        uses: DataDog/synthetics-ci-github-action@v1
        with:
          api_key: ${{secrets.DD_API_KEY}}
          app_key: ${{secrets.DD_APP_KEY}}
          public_ids: 'abc-d3f-ghi, jkl-mn0-pqr' 
        
```
### Example workflow using an existing synthetics.json file

```yaml
name: Run Synthetics tests using existing synthetics.json file

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Run Datadog Synthetics tests
        uses: DataDog/synthetics-ci-github-action@v1
        with:
          api_key: ${{secrets.DD_API_KEY}}
          app_key: ${{secrets.DD_APP_KEY}}
        
```

**Note**:
  By default this will run all the tests listed in the  `{,!(node_modules)/**/}*.synthetics.json` files (every files ending with `.synthetics.json` except those in the `node_modules` folder). It is also possible to specify a list of Synthetics tests to trigger by public id or by using a search query.

## Complex workflows

### Example workflow using the `test_search_query`:

```yaml
name: Run Synthetics tests by test tag

jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Run Datadog Synthetics tests
        uses: DataDog/synthetics-ci-github-action@v1
        with:
          api_key: ${{secrets.DD_API_KEY}}
          app_key: ${{secrets.DD_APP_KEY}}
          test_search_query: 'tag:e2e-tests'

```

### Example workflow using a global configuration override using `config_path`:

```yaml
name: Run Synthetics tests with custom config

jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Run Datadog Synthetics tests
        uses: DataDog/synthetics-ci-github-action@v1
        with:
          api_key: ${{secrets.DD_API_KEY}}
          app_key: ${{secrets.DD_APP_KEY}}
          config_path: './synthetics-config.json'

```

## Inputs

| Name  | Type | Requirement | Default | Description   |
|-----|------|----|----|-----|
| `api_key`          | string | **_required_**  | none                                      | Your Datadog API key. This key is created by your [Datadog organization](https://docs.datadoghq.com/account_management/api-app-keys/) and should be stored as a [secret](https://docs.github.com/en/actions/reference/encrypted-secrets).         |
| `app_key`          | string | **_required_** | none                                      | Your Datadog Application key. This key is created by your [Datadog organization](https://docs.datadoghq.com/account_management/api-app-keys/) and should be stored as a [secret](https://docs.github.com/en/actions/reference/encrypted-secrets). |
| `datadog_site`     | string | _optional_  | `datadoghq.com`                           | The Datadog site. Needs to be set to `datadoghq.eu` for Datadog EU users. Ex: `datadoghq.com` or `datadoghq.eu`.                                                                                                                                  |
| `public_ids`       | string | _optional_  | none                                      | String of **comma-separated** Synthetics test public IDs you want to trigger. If no value is provided the action will look for files with `synthetics.json` in the name.  |
| `config_path`      | string | _optional_  | `datadog-ci.json`                         | The global JSON configuration to be used when launching tests. Please see the [example configuration here](https://docs.datadoghq.com/synthetics/cicd_testing/?tab=npm#setup-the-client) for more details.                                        |
| `files`            | string | _optional_  | `{,!(node_modules)/**/}*.synthetics.json` | Glob pattern to detect synthetic tests config files.                                                                                                                                                                                              |
| `subdomain`        | string | _optional_  | app                                       | The name of the custom subdomain set to access your Datadog application. If the URL used to access Datadog is `myorg.datadoghq.com` the subdomain value then needs to be set to `myorg`.                                                          |
| `test_search_query`| string | _optional_  | none                                      | Trigger tests corresponding to a [search](https://docs.datadoghq.com/synthetics/search/#search) query.                                                                                                                                            |
| `tunnel`           | boolean | _optional_  | false                                     | Use the [testing tunnel](https://docs.datadoghq.com/synthetics/cicd_testing/?tab=npm#use-the-testing-tunnel) to trigger tests.                                                                                                                    |


