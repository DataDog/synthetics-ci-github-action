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
          public_ids: <public_ids>
          site: <site> # Optional
        env:
          DATADOG_API_KEY: <datadog-api-key>
          DATADOG_APP_KEY: <datadog-app-key>
```

### Inputs

| Name              | Requirement | Default         | Description                                                                                                                                                                                                                                       |
|-------------------|-------------|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `DATADOG_API_KEY` | _required_  | none            | Your Datadog API key. This key is created by your [Datadog organization](https://docs.datadoghq.com/account_management/api-app-keys/) and should be stored as a [secret](https://docs.github.com/en/actions/reference/encrypted-secrets).         |
| `DATADOG_APP_KEY` | _required_  | none            | Your Datadog Application key. This key is created by your [Datadog organization](https://docs.datadoghq.com/account_management/api-app-keys/) and should be stored as a [secret](https://docs.github.com/en/actions/reference/encrypted-secrets). |
| `public_ids`      | _required_  | none            | String of comma-separated Synthetics test public IDs you want to trigger.                                                                                                                                                                         |
| `site`            | _optional_  | `datadoghq.com` | The Datadog site. Needs to be set to `datadoghq.eu` for Datadog EU users. Ex: `datadoghq.com` or `datadoghq.eu`                                                                                                                                   |


## Contributing

### Setup 
> First, you'll need to have a reasonably modern version of `node` handy. This won't work with versions older than 9, for instance.

Install the dependencies  
```bash
$ npm install
```

Build the typescript and package it for distribution
```bash
$ npm run build && npm run package
```

Run the tests :heavy_check_mark:  
```bash
$ npm test

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)

...
```

### Publishing to a distribution branch

Actions are run from GitHub repos so we will checkin the packed dist folder. 

Then run [ncc](https://github.com/zeit/ncc) and push the results:
```bash
$ npm run package
$ git add dist
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

Note: We recommend using the `--license` option for ncc, which will create a license file for all of the production node modules used in your project.

Your action is now published! :rocket: 

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

### Validating Action

You can now validate the action by referencing `./` in a workflow in your repo (see [test.yml](.github/workflows/test.yml))

```yaml
uses: ./
with:
  milliseconds: 1000
```

See the [actions tab](https://github.com/actions/typescript-action/actions) for runs of this action! :rocket:


