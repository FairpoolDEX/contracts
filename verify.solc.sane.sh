#!/usr/bin/env bash

set -eu

./verify.solc.sh --model-checker-targets assert,divByZero,constantCondition,balance "$@"
