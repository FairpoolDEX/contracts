#!/usr/bin/env bash

set -eu

./run.solc.sh --model-checker-engine chc --model-checker-invariants all --model-checker-show-unproved "$@"
