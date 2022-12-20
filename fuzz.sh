#!/usr/bin/env bash

#./run.scribble.sh contracts/ERC20Enumerable.sol -o contracts/ERC20Enumerable.instrumented.sol
#./fuzz.echidna.sh --contract ERC20EnumerableTestEchidnaScribble contracts/ERC20EnumerableTestEchidnaScribble.sol "$@"

#./fuzz.ERC20Enumerable.local.sh "$@"
#./fuzz.SharedOwnership.local.sh "$@"
./fuzz.Fairpool.local.sh "$@"
