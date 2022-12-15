#!/usr/bin/env bash

set -eu

# NOTE: --solver-timeout is in milliseconds
myth analyze \
  --solver-log "/tmp/solver" \
  --parallel-solving \
  --statespace-json "/tmp/statespace.json" \
  "/tmp/Fairpool.instrumented.sol:Fairpool"
#  --transaction-count 10 \
#  --execution-timeout 86400 \
#  --solver-timeout 100000 \
#  --graph "/tmp/graph" \
