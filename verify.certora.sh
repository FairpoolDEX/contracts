#!/usr/bin/env bash

set -eu

CONTRACT=$1; shift;

time certoraRun "contracts/$CONTRACT.sol" --verify "$CONTRACT:contracts/$CONTRACT.cvl" "$@" # \
#  --solc solc7.6 \
#  --rule integrityOfDeposit \
#  --msg "$1"
