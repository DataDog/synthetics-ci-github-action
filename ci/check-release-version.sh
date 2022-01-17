#!/bin/bash
set -e

# Get release version from package.json
PACKAGE_RELEASE_VERSION=$(grep -Po '"version": "\K[^"]+' package.json)

# Ensure build files have been built from latest version
DIST_VERSION=$(grep datadog-synthetics-github-action dist/index.js)
if [[ $DIST_VERSION != *"$PACKAGE_RELEASE_VERSION"* ]]; then
  INVALID=true
  echo "dist/ files are not built from latest version $PACKAGE_RELEASE_VERSION"
  echo "=> $DIST_VERSION"
  echo
fi

# Ensure README example workflows reference latest version
README_VERSIONS=$(grep "uses: DataDog/synthetics-ci-github-action@v" README.md)
while IFS= read -r README_VERSION; do
  if [[ $README_VERSION != *"$PACKAGE_RELEASE_VERSION"* ]]; then
    INVALID=true
    echo "REAME.md workflow not up to date with latest version v$PACKAGE_RELEASE_VERSION"
    echo "=> $README_VERSION"
    echo
  fi
done <<< "$README_VERSIONS"

if [ $INVALID ]; then
  exit -1
fi
