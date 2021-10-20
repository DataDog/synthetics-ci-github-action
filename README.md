# Datadog Synthetic CI Github Action

This Datadog Github Action allows you to trigger your Datadog Synthetics test suite using the [datadog-ci](https://github.com/DataDog/datadog-ci) tool.

## Setup & Usage

First you'll need to make sure you have Datadog API and application key setup as environment variables in your Github repository.
Then you can simply call the `synthetics-ci-github-action` in your Github workflow as follows : 


```yaml
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Run Datadog Synthetics tests
        uses: datadog/synthetics-ci-github-action@v1
        with:
          api_key: <DATADOG_API_KEY>
          app_key: <DATADOG_APP_KEY>
        
```

By default this will run all the tests listed in the  `{,!(node_modules)/**/}*.synthetics.json` files (every files ending with `.synthetics.json` except those in the `node_modules` folder). It is also possible to specify a list of Synthetics tests to trigger by public id or by using a search query.

#### Example of a workflow using the `public_ids`:

```yaml
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Run Datadog Synthetics tests
        uses: datadog/synthetics-ci-github-action@v1
        with:
          api_key: <DATADOG_API_KEY>
          app_key: <DATADOG_APP_KEY>
          site: <site> # Optional
          public_ids: 'public_id1, public_id2' 
        
```

#### Example of a workflow using the `test_search_query`:

```yaml
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Run Datadog Synthetics tests
        uses: datadog/synthetics-ci-github-action@v1
        with:
          api_key: <DATADOG_API_KEY>
          app_key: <DATADOG_APP_KEY>
          test_search_query: <my_search_query> # Optional

```

#### Example of a workflow using a global configuration override using `config_path`:

```yaml
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Run Datadog Synthetics tests
        uses: datadog/synthetics-ci-github-action@v1
        with:
          api_key: <DATADOG_API_KEY>
          app_key: <DATADOG_APP_KEY>
          config_path: <path_to_global_config> # Optional

```

## Inputs

| Name                | Requirement | Default                                   | Description                                                                                                                                                                                                                                       |
|---------------------|-------------|-------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `api_key`           | _required_  | none                                      | Your Datadog API key. This key is created by your [Datadog organization](https://docs.datadoghq.com/account_management/api-app-keys/) and should be stored as a [secret](https://docs.github.com/en/actions/reference/encrypted-secrets).         |
| `app_key`           | _required_  | none                                      | Your Datadog Application key. This key is created by your [Datadog organization](https://docs.datadoghq.com/account_management/api-app-keys/) and should be stored as a [secret](https://docs.github.com/en/actions/reference/encrypted-secrets). |
| `datadog_site`      | _optional_  | `datadoghq.com`                           | The Datadog site. Needs to be set to `datadoghq.eu` for Datadog EU users. Ex: `datadoghq.com` or `datadoghq.eu`.                                                                                                                                  |
| `public_ids`        | _optional_  | none                                      | String of comma-separated Synthetics test public IDs you want to trigger.                                                                                                                                                                         |
| `config_path`       | _optional_  | `datadog-ci.json`                         | The global JSON configuration to be used when launching tests. Please see the [example configuration here](https://docs.datadoghq.com/synthetics/cicd_testing/?tab=npm#setup-the-client) for more details.                                        |
| `files`             | _optional_  | `{,!(node_modules)/**/}*.synthetics.json` | Glob pattern to detect synthetic tests config files.                                                                                                                                                                                              |
| `subdomain`         | _optional_  | app                                       | The name of the custom subdomain set to access your Datadog application. If the URL used to access Datadog is `myorg.datadoghq.com` the subdomain value then needs to be set to `myorg`.                                                          |
| `test_search_query` | _optional_  | none                                      | Trigger tests corresponding to a [search](https://docs.datadoghq.com/synthetics/search/#search) query.                                                                                                                                            |
| `tunnel`            | _optional_  | false                                     | Use the [testing tunnel](https://docs.datadoghq.com/synthetics/cicd_testing/?tab=npm#use-the-testing-tunnel) to trigger tests.                                                                                                                    |


