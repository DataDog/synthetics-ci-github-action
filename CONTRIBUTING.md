# Contributing

First of all, thanks for contributing!

This document provides some basic guidelines for contributing to this repository. To propose improvements, feel free to submit a pull request.

## Submitting issues

Github issues are welcome, feel free to submit error reports and feature requests!

- Ensure the bug was not already reported by searching on GitHub under [Issues](https://github.com/DataDog/synthetics-ci-github-action/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/DataDog/synthetics-ci-github-action/issues/new/choose).
- Make sure to add enough details to explain your use case.

If you require further assistance, you can also contact [our support](https://docs.datadoghq.com/help/).

## Development

```bash
# Run the tests
yarn test

# Build project
yarn build

# Compile project and its dependencies for release
yarn package
```

## Submitting pull requests

Have you fixed a bug or written a new feature and want to share it? Many thanks!

In order to ease/speed up our review, here are some items you can check/improve when submitting your pull request:

- **Write meaningful commit messages**
Messages should be concise but explanatory.
The commit message should describe the reason for the change, to later understand quickly the thing you've been working on for a day.

- **Keep it small and focused.**
Pull requests should contain only one fix, or one feature improvement.
Bundling several fixes or features in the same PR will make it harder to review, and eventually take more time to release.

- **Write tests for the code you wrote.**
Each module should be tested.
The tests for a module are located in the [`__tests__` folder](https://github.com/DataDog/synthetics-ci-github-action/tree/main/__tests__), under a file with the same name as the module.
Our CI is not (yet) public, so it may be difficult to understand why your pull request status is failing. Make sure that all tests pass locally, and we'll try to sort it out in our CI.

## Style guide

The code under this repository follows a format enforced by prettier, and a style guide enforced by eslint.

## Releasing a new version

The integration has workflows set up to automate the release process, by creating commits, PRs, tags and releases.

The PRs created as part of the release process will need to be merged manually and each will contain instructions inside them for what needs to be done.

Whenever a new version of [datadog-ci](https://github.com/DataDog/datadog-ci) is released, a new PR will automatically be created on the current repository. The PR will be named `[dep] Bump datadog-ci to {version}` and will contain the changes to update to the latest version of datadog-ci and the steps you need to follow to continue the release process.

After completing the steps from the **[dep]** PR, a new **[release]** PR will automatically be created. When this happens, go to the PR and follow the instructions there on how to finalize the release process.

You can see examples of past releases [here](https://github.com/DataDog/synthetics-ci-github-action/pulls?q=is%3Apr+is%3Amerged+%28%22%5Bdep%5D+Bump+datadog-ci%22+OR+%22%5Brelease%3Aminor%5D%22%29+).

## Asking a questions

Need help? Contact [Datadog support](https://docs.datadoghq.com/help/).
