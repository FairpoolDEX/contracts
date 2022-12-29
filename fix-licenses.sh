#!/usr/bin/env bash

if ! command -v gsed > /dev/null 2>&1; then
  echo "Install gsed via \`brew install gnu-sed\`"
  exit 1
fi

find . -type f -name "*.sol" -exec sh -c 'if ! grep -q "SPDX-License-Identifier" "$0"; then gsed -i "1i //\ SPDX-License-Identifier:\ UNLICENSED" "$0"; fi' {} \;
