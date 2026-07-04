#!/usr/bin/env bash
# Cut a release: bumps the control + solution versions, commits, and tags.
# Pushing the tag triggers the GitHub Actions Release workflow, which builds
# the solution zips and attaches them to a GitHub Release.
#
#   ./release.sh 1.2.1
#   git push origin main --tags
set -euo pipefail

VERSION="${1:-}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage: ./release.sh <major.minor.patch>   e.g. ./release.sh 1.2.1" >&2
  exit 1
fi

cd "$(dirname "$0")"

# control manifest: version="x.y.z"
perl -pi -e "s/version=\"[0-9]+\\.[0-9]+\\.[0-9]+\"/version=\"$VERSION\"/ if /<control /../control-type=/" \
  Fishbone/ControlManifest.Input.xml

# solution manifest: <Version>x.y.z.0</Version>
perl -pi -e "s/<Version>[0-9.]+<\\/Version>/<Version>$VERSION.0<\\/Version>/" \
  Solution/src/Other/Solution.xml

echo "Set control version $VERSION, solution version $VERSION.0"

git add Fishbone/ControlManifest.Input.xml Solution/src/Other/Solution.xml
git commit -m "Release v$VERSION"
git tag "v$VERSION"

echo
echo "Tagged v$VERSION. Publish with:"
echo "  git push origin main --tags"
