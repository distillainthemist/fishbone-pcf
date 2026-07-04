#!/usr/bin/env bash
# Regenerate the Solution/ wrapper using the Power Platform CLI (guaranteed to
# match your installed pac/MSBuild versions). Only needed if `dotnet build`
# inside Solution/ fails against the checked-in wrapper files.
set -euo pipefail

cd "$(dirname "$0")"

rm -rf Solution
mkdir Solution
cd Solution

pac solution init --publisher-name BenOBrien --publisher-prefix ben
pac solution add-reference --path ..

echo
echo "Done. Now build the importable solution zip:"
echo "  cd Solution && dotnet build -c Release"
echo "Output: Solution/bin/Release/Solution.zip"
