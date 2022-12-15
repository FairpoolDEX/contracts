#!/usr/bin/env bash

set -eu

scribble --compiler-version 0.8.16 --debug-events --output-mode flat "contracts/Fairpool.sol" -o "/tmp/Fairpool.instrumented.sol"
scribble --compiler-version 0.8.16 --debug-events --output-mode flat "contracts/GenericToken.sol" -o "/tmp/GenericToken.instrumented.sol"
