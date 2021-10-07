# Datadog Synthetic CI Github Action

This Datadog Github Action allows you to trigger your Datadog Synthetics test suite using the [datadog-ci](https://github.com/DataDog/datadog-ci) tool.

## Usage

### Prerequisite

### Setup

```yaml
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Run Datadog Synthetics tests
        uses: datadog/github-action-synthetics-ci@v1
        with:
          api_key: <DATADOG_API_KEY>
          app_key: <DATADOG_APP_KEY>
          public_ids: <public_ids> 
          site: <site> # Optional
        
```

### Inputs

| Name           | Requirement | Default         | Description                                                                                                                                                                                                                                       |
|----------------|-------------|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `api_key`      | _required_  | none            | Your Datadog API key. This key is created by your [Datadog organization](https://docs.datadoghq.com/account_management/api-app-keys/) and should be stored as a [secret](https://docs.github.com/en/actions/reference/encrypted-secrets).         |
| `app_key`      | _required_  | none            | Your Datadog Application key. This key is created by your [Datadog organization](https://docs.datadoghq.com/account_management/api-app-keys/) and should be stored as a [secret](https://docs.github.com/en/actions/reference/encrypted-secrets). |
| `public_ids`   | _required_  | none            | String of comma-separated Synthetics test public IDs you want to trigger.                                                                                                                                                                         |
| `datadog_site` | _optional_  | `datadoghq.com` | The Datadog site. Needs to be set to `datadoghq.eu` for Datadog EU users. Ex: `datadoghq.com` or `datadoghq.eu`                                                                                                                                   |



