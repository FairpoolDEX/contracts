#!/usr/bin/env bash

set -eu

lefthook install

# Fix licenses if $CI is not set
if [ -z ${CI+x} ]; then ./fix-licenses.sh; else echo "Skipping ./fix-licenses.sh in CI"; fi
