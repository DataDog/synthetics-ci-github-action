#!/bin/bash

# Run the Github Action though build dist/ files for developement with default parameters,
# inputs provided by the Github Action config are given through `INPUT_` environment variables,
# comma-separated public IDs to run should be provided as the first argument.

if [ $# -eq 0 ]; then
    echo "usage: local-run-test.sh pub-lic-ids[,abc-def-hij]"
    exit 1
fi

set -e

INPUT_PUBLIC_IDS=$@ \
  INPUT_API_KEY=$DATADOG_API_KEY \
  INPUT_APP_KEY=$DATADOG_APP_KEY \
  node dist
