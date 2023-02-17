## Overview

Trigger Synthetic tests from your GitHub workflows with the [Datadog CI Synthetics command][1].

## Setup

To get started:

1. Add your Datadog API and Application Keys as secrets to your GitHub repository. For more information, see [API and Application Keys][2].
2. In your GitHub workflow, use `DataDog/synthetics-ci-github-action`.

Your workflow can be [simple](#simple-workflows) or [complex](#complex-workflows).

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
        uses: DataDog/synthetics-ci-github-action@v0.10.0
        with:
          api_key: ${{secrets.DD_API_KEY}}
          app_key: ${{secrets.DD_APP_KEY}}
          public_ids: 'abc-d3f-ghi, jkl-mn0-pqr'
```

### Example workflow using an existing `synthetics.json` file

```yaml
name: Run Synthetics tests using an existing synthetics.json file
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Run Datadog Synthetics tests
        uses: DataDog/synthetics-ci-github-action@v0.10.0
        with:
          api_key: ${{secrets.DD_API_KEY}}
          app_key: ${{secrets.DD_APP_KEY}}
```

**Note**: By default, this workflow runs all the tests listed in `{,!(node_modules)/**/}*.synthetics.json` files (every file ending with `.synthetics.json` except for those in the `node_modules` folder). You can also trigger a list of Synthetics tests by specifying a `public_id` or using a search query.

## Complex workflows

### Example workflow using the `test_search_query`

```yaml
name: Run Synthetics tests by test tag
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Run Datadog Synthetics tests
        uses: DataDog/synthetics-ci-github-action@v0.10.0
        with:
          api_key: ${{secrets.DD_API_KEY}}
          app_key: ${{secrets.DD_APP_KEY}}
          test_search_query: 'tag:e2e-tests'
```

### Example workflow using a test search query and variable overrides

```yaml
name: Run Synthetics tests using search query
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Run Datadog Synthetics tests
        uses: DataDog/synthetics-ci-github-action@v0.10.0
        with:
          api_key: ${{secrets.DD_API_KEY}}
          app_key: ${{secrets.DD_APP_KEY}}
          test_search_query: 'tag:staging'
          variables: 'START_URL=https://staging.website.com,PASSWORD=stagingpassword'
```

### Example workflow using a global configuration override with `config_path`

```yaml
name: Run Synthetics tests with custom config
jobs:
  e2e_testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Run Datadog Synthetics tests
        uses: DataDog/synthetics-ci-github-action@v0.10.0
        with:
          api_key: ${{secrets.DD_API_KEY}}
          app_key: ${{secrets.DD_APP_KEY}}
          config_path: './synthetics-config.json'
```

## Inputs

| Name                | Type    | Requirement | Description                                                                                                                                                                                              |
| ------------------- | ------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api_key`           | string  | _required_  | Your Datadog API key. This key is created by your [Datadog organization][2] and should be stored as a [secret][3]. **Default:** none.                                                                    |
| `app_key`           | string  | _required_  | Your Datadog Application key. This key is created by your [Datadog organization][2] and should be stored as a [secret][3]. **Default:** none.                                                            |
| `public_ids`        | string  | _optional_  | Comma-separated list of public IDs for Synthetic tests you want to trigger. If no value is provided, the action looks for files named with `synthetics.json`. **Default:** none.                         |
| `test_search_query` | string  | _optional_  | Trigger tests corresponding to a [search][5] query. **Default:** none.                                                                                                                                   |
| `subdomain`         | string  | _optional_  | The name of the custom subdomain set to access your Datadog application. If the URL used to access Datadog is `myorg.datadoghq.com`, the subdomain value needs to be set to `myorg`. **Default:** `app`. |
| `files`             | string  | _optional_  | Glob pattern to detect Synthetic tests config files. **Default:** `{,!(node_modules)/**/}*.synthetics.json`.                                                                                             |
| `datadog_site`      | string  | _optional_  | The Datadog site. For users in the EU, set to `datadoghq.eu`. For example: `datadoghq.com` or `datadoghq.eu`. **Default:** `datadoghq.com`.                                                              |
| `config_path`       | string  | _optional_  | The global JSON configuration is used when launching tests. See the [example configuration][4] for more details. **Default:** `datadog-ci.json`.                                                         |
| `variables`         | string  | _optional_  | Comma-separated list of global variables to use for Synthetic tests. For example: `START_URL=https://example.org,MY_VARIABLE=My title`. **Default:** `[]`.                                               |
| `junit_report`      | string  | _optional_  | The filename for a JUnit report if you want to generate one. **Default:** none.                                                                                                                          |
| `tunnel`            | boolean | _optional_  | Use the [secure tunnel][9] to execute your test batch. **Default:** `false`.                                                                                                                             |
## Development

```bash

# Run the tests
yarn test

# Build project
yarn build

# Compile project and its dependencies for release
yarn package
```

### Release Process

To release a new version of `synthetics-ci-github-action`:

1. Create a new branch for the version upgrade.
2. Update the package version using `yarn version [--patch|--minor|--major]` depending on the nature of your changes. See [Semantic Versioning][7] to determine what you need to increment. Once the `yarn version` command is done, a new commit `vX.Y.Z` along with a new tag should be added to the Git tree.
3. Update the `README.md` example versions, and build and package the project with `yarn build && yarn package`.

   Make sure to commit these changes within the **same commit that holds the `vX.Y.Z` tag**. You can use `git commit --amend` or `git rebase -i HEAD~2` to merge the changes into the same commit.

4. Push the branch along with the release tag (`git push --tags`) to the upstream (GitHub).

   Create a pull request with the changes introduced in the description. This pull request requires at least one approval.

5. Merge the pull request.
6. Create a GitHub Release from the [Tags page][8] with a description of your changes.

⚠️ Ensure the release version follows the expected format `vX.Y.Z`.

Once the release is created, the new version of the Github Action is available as a workflow.

## Further reading

Additional helpful documentation, links, and articles:

- [Continuous Testing and CI/CD Configuration][6]
- [Best practices for continuous testing with Datadog][10]

[1]: https://github.com/DataDog/datadog-ci
[2]: https://docs.datadoghq.com/account_management/api-app-keys/
[3]: https://docs.github.com/en/actions/reference/encrypted-secrets
[4]: https://docs.datadoghq.com/continuous_testing/cicd_integrations/configuration/?tab=npm#setup-a-client
[5]: https://docs.datadoghq.com/synthetics/search/#search
[6]: https://docs.datadoghq.com/continuous_testing/cicd_integrations/configuration
[7]: https://semver.org/#summary
[8]: https://github.com/DataDog/synthetics-ci-github-action/tags
[9]: https://docs.datadoghq.com/continuous_testing/testing_tunnel/
[10]: https://www.datadoghq.com/blog/best-practices-datadog-continuous-testing/
