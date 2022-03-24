#!/bin/bash

if [ $# -eq 0 ]; then
    echo "usage: local-run-test.sh pub-lic-ids[,abc-def-hij]"
    exit 1
fi

set -e

INPUT_PUBLIC_IDS=$@ \
  INPUT_API_KEY=$DATADOG_API_KEY \
  INPUT_APP_KEY=$DATADOG_APP_KEY \
  node dist
