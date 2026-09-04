#!/usr/bin/env bash
#
# Vercel's ignored build step, shared by every app in this repo.
#
# The exit codes are inverted from what a script normally means by them, and
# that is Vercel's contract, not a bug here: exit 0 SKIPS the build, exit 1
# runs it.
#
# Production deploys only when the app's own package.json version changed in
# this commit. The bump is the deploy gesture — a docs edit or a refactor
# lands on main and reaches nobody until someone decides it should ship. That
# also means a change to packages/ui or packages/db deploys nothing on its
# own: bump each app that should carry it, in the same commit.
#
# Previews gate on turbo-ignore instead: a preview builds only when this app,
# or a workspace package it depends on, changed since the app's own last
# deployment. A pull request scoped to one app stops rebuilding the other
# three across every review commit. turbo-ignore reads the same dependency
# graph turbo does, so a packages/db change still rebuilds every app that
# imports it, and a root lockfile or turbo.json change rebuilds everything.
# With no previous deployment to diff against it falls back to HEAD^ and
# builds rather than guess.
#
# The two versions are compared as values rather than as diff lines. A line
# diff calls it a bump when anything merely rewrites that line — adding a key
# after it moves its trailing comma, which `pnpm add` does routinely.
#
# ponytail: HEAD^..HEAD only sees the tip commit, so a bump buried inside a
# multi-commit push is invisible and that app does not deploy. It fails as a
# missing deploy rather than a wrong one — redeploy from the Vercel dashboard,
# or push an empty patch bump. Diff against the previously deployed SHA if
# that ever stops being tolerable.
set -u

app="${1:?usage: deploy-if-bumped.sh <path/to/app>}"

[ "${VERCEL_ENV:-}" = 'production' ] || exec npx --yes turbo-ignore --fallback=HEAD^

# First deploy, or a clone too shallow to have a parent commit: build rather
# than guess at what changed.
git rev-parse --verify --quiet 'HEAD^' >/dev/null || exit 1

version_at() {
  git show "$1:$app/package.json" 2>/dev/null |
    sed -n 's/[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' |
    head -1
}

# A new app has no package.json at HEAD^, so its first version reads as empty
# and differs — which is the right answer.
[ "$(version_at 'HEAD^')" = "$(version_at HEAD)" ] || exit 1

exit 0
