#!/usr/bin/env bash

set -eu

scribble --debug-events --output-mode flat "$@"
# scribble --compiler-version 0.8.16 --debug-events --output-mode flat "contracts/GenericToken.sol" -o "/tmp/GenericToken.instrumented.sol"
