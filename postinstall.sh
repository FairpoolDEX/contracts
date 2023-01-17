#!/usr/bin/env bash

set -eu

lefthook install

# Fix licenses if $CI is not set
[ -z ${CI+x} ] && ./fix-licenses.sh
