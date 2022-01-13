#!/bin/bash
set -e

# Ensure all dependencies and devDepencencies is present in LICENSE-3rdparty.csv
PACKAGE_DEPENDENCIES=$(
  grep -Poz '[dD]ependencies": {\n\K[^\}]+' package.json | \
  grep -Poa '"\K[^"]+(?=":)' | \
  sort
)
LICENSE_DEPENDENCIES=$(cut -d, -f1 LICENSE-3rdparty.csv)

diff -u --label "package.json" --label "LICENSE-3rdparty.csv" \
  <(echo "$PACKAGE_DEPENDENCIES") \
  <(echo "$LICENSE_DEPENDENCIES")
