#!/usr/bin/env bash
#
# Tags the apps a commit deploys, one tag each, as `<name>@<version>`.
#
# The tag is the version-to-SHA mapping the footers cannot give you: every app
# renders its own version through `@bandzen/ui`'s `Version`, so what is live is
# never in doubt, but the tree that built it is. Reading `0.3.0` off production
# and wanting the exact commit is what this exists for.
#
# It mirrors `deploy-if-bumped.sh` on purpose — same commit pair, same version
# extraction — so a tag exists if and only if that app's production build was
# attempted. Widening this to the whole push would catch bumps the gate's
# blind spot skips, and would then name versions that never shipped. A missing
# row beats a lying one in a lookup table.
#
# Tags are created, never pushed, and never moved. The caller pushes what this
# prints, which is also how the run stays a no-op on a re-run.
#
# Backfill or check any historical commit by passing it:
#
#   scripts/tag-deployed.sh c4b6368
#
set -eu

ref="${1:-HEAD}"

# No parent means nothing to compare against — the first commit, or a clone too
# shallow to hold one. Silence rather than a guess.
git rev-parse --verify --quiet "$ref^" >/dev/null || exit 0

# Read a field out of a package.json as a value rather than as a diff line: a
# line diff calls it a change when anything merely rewrites that line.
field_at() {
  git show "$1:$3" 2>/dev/null |
    sed -n 's/[[:space:]]*"'"$2"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' |
    head -1
}

for app in $(git ls-tree --name-only "$ref" apps/); do
  pkg="$app/package.json"

  version="$(field_at "$ref" version "$pkg")"
  [ -n "$version" ] || continue

  # A new app has no package.json at the parent, so its first version reads as
  # empty and differs — which is the right answer.
  [ "$version" != "$(field_at "$ref^" version "$pkg")" ] || continue

  tag="$(field_at "$ref" name "$pkg")@$version"

  if git rev-parse --verify --quiet "refs/tags/$tag" >/dev/null; then
    continue
  fi

  git tag "$tag" "$ref"
  echo "$tag"
done
