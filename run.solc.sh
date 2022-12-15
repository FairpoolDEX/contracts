#!/usr/bin/env bash

set -eu

solc --base-path . --include-path node_modules --error-codes "$@"
