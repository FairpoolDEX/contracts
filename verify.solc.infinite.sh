#!/usr/bin/env bash

set -eu

./verify.solc.sane.sh --model-checker-timeout 0 "$@"
