#!/usr/bin/env bash
# nuke — wipe every regenerable cache/build artifact from a Nuxt or Astro
# project so the next `dev` or `build` starts from an absolutely clean slate.
#
# PORTABLE: drop this single file into the root of ANY Nuxt or Astro project.
# It auto-detects the framework by locating nuxt.config.* or astro.config.*
# (in the repo root, or a ./nuxt or ./astro subfolder), then removes ONLY
# known-regenerable directories. It never touches source, never removes the
# whole node_modules, never deletes anything it cannot regenerate.
#
# Removed for both frameworks (each, if present):
#   dist/                Build output
#   .cache/              App-level caches. For Strapi-backed apps this holds
#                        .cache/strapi/<sha256>.json — GraphQL responses cached
#                        on disk with NO TTL and NO invalidation. After you edit
#                        content in Strapi, dev keeps rendering the cached copy
#                        until this is deleted. Also holds fetched CMS images
#                        (.cache/cms-img), which the build re-downloads.
#   node_modules/.vite   Vite dependency-optimization cache
#   node_modules/.cache  Bundler/framework cache. Often the largest, and the one
#                        most likely to survive a .nuxt/.astro delete and keep
#                        serving stale modules.
#
# Nuxt only:
#   .nuxt/  .output/  .nitro/  .data/
#   Afterwards `nuxt prepare` reruns, so typecheck and IDE types work again
#   without a full dev run.
#
# Astro only:
#   .astro/              Content-layer store and generated types
#
# Adapter output (.netlify/, .vercel/) is purged of build artifacts, but the
# CLI link state (.netlify/state.json, .vercel/project.json) is PRESERVED.
# `dev` and `build` cannot regenerate it — only `netlify link` / `vercel link`
# can — so deleting it would silently unlink the repo from its deploy target.
#
# Usage:
#   ./nuke.sh                     remove everything listed above
#   ./nuke.sh --dry-run           show what WOULD be removed, delete nothing
#   ./nuke.sh --framework nuxt    skip auto-detection (nuxt | astro)
#   ./nuke.sh --help
#
# In this repo you can also run it via:  yarn nuke

set -euo pipefail

DRY_RUN=0
FORCE_FRAMEWORK=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run|-n) DRY_RUN=1 ;;
    --framework|-f)
      shift
      [ $# -gt 0 ] || { echo "nuke: --framework needs a value (nuxt|astro)" >&2; exit 2; }
      FORCE_FRAMEWORK="$1" ;;
    --help|-h)
      grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "nuke: unknown option '$1' (try --help)" >&2; exit 2 ;;
  esac
  shift
done

case "$FORCE_FRAMEWORK" in
  ""|nuxt|astro) ;;
  *) echo "nuke: --framework must be 'nuxt' or 'astro', got '$FORCE_FRAMEWORK'" >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Glob-based config lookup, so this works on stock macOS bash 3.2 (no compgen,
# no nullglob): an unmatched glob stays literal and `[ -e ]` on it is false.
has_config() {
  local dir="$1" name="$2" f
  for f in "$dir"/"$name".config.*; do
    [ -e "$f" ] && return 0
  done
  return 1
}

# Collect every framework/app-dir pair we can see, so an ambiguous repo is an
# explicit error rather than a coin flip.
MATCHES=""
for dir in "$ROOT" "$ROOT/nuxt" "$ROOT/astro"; do
  [ -d "$dir" ] || continue
  # `if` rather than `cmd && assign`: under `set -e` a trailing failed AND-list
  # makes the loop itself return non-zero and aborts the script.
  if has_config "$dir" nuxt; then
    MATCHES="${MATCHES}nuxt|$dir
"
  fi
  if has_config "$dir" astro; then
    MATCHES="${MATCHES}astro|$dir
"
  fi
done
MATCHES="$(printf '%s' "$MATCHES" | grep -v '^$' || true)"

if [ -z "$MATCHES" ]; then
  echo "nuke: no nuxt.config.* or astro.config.* found in '$ROOT', '$ROOT/nuxt' or '$ROOT/astro'." >&2
  echo "  Run nuke from the root of a Nuxt or Astro project (or copy it there)." >&2
  exit 1
fi

if [ -n "$FORCE_FRAMEWORK" ]; then
  SELECTED="$(printf '%s\n' "$MATCHES" | grep "^$FORCE_FRAMEWORK|" | head -1 || true)"
  if [ -z "$SELECTED" ]; then
    echo "nuke: --framework $FORCE_FRAMEWORK requested, but no $FORCE_FRAMEWORK project was found." >&2
    exit 1
  fi
elif [ "$(printf '%s\n' "$MATCHES" | wc -l | tr -d ' ')" -gt 1 ]; then
  echo "nuke: ambiguous — more than one project detected:" >&2
  printf '%s\n' "$MATCHES" | sed 's/|/  →  /; s/^/  /' >&2
  echo "  Disambiguate with --framework nuxt  or  --framework astro" >&2
  exit 1
else
  SELECTED="$MATCHES"
fi

FRAMEWORK="${SELECTED%%|*}"
APP_DIR="${SELECTED#*|}"

# Shared targets, then framework-specific ones. Adapter dirs are handled
# separately below, because they mix build output with link state.
TARGETS="dist .cache node_modules/.vite node_modules/.cache"
case "$FRAMEWORK" in
  nuxt)  TARGETS="$TARGETS .nuxt .output .nitro .data" ;;
  astro) TARGETS="$TARGETS .astro" ;;
esac

# Render a KB count the way `du -h` would.
human() {
  awk -v kb="$1" 'BEGIN {
    if (kb >= 1048576) printf "%.1fG", kb / 1048576
    else if (kb >= 1024) printf "%.1fM", kb / 1024
    else printf "%dK", kb
  }'
}

FREED_KB=0
REMOVED=0

remove_path() {
  local label="$1" path="$2" kb
  [ -e "$path" ] || return 0
  kb="$(du -sk "$path" 2>/dev/null | cut -f1 || true)"
  kb="${kb:-0}"
  FREED_KB=$((FREED_KB + kb))
  REMOVED=$((REMOVED + 1))
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '  would rm  %-28s %8s\n' "$label" "$(human "$kb")"
  else
    rm -rf "$path"
    printf '  removed   %-28s %8s\n' "$label" "$(human "$kb")"
  fi
}

# Empty an adapter dir of build output, keeping only the file that records which
# remote site this repo is linked to.
purge_adapter() {
  local dir="$1" keep="$2" entry base
  [ -d "$APP_DIR/$dir" ] || return 0
  for entry in "$APP_DIR/$dir"/* "$APP_DIR/$dir"/.[!.]*; do
    [ -e "$entry" ] || continue
    base="$(basename "$entry")"
    if [ "$base" = "$keep" ]; then
      printf '  kept      %-28s %8s\n' "$dir/$base" "(link)"
      continue
    fi
    remove_path "$dir/$base" "$entry"
  done
}

echo
echo "nuke: $FRAMEWORK project → $APP_DIR"
[ "$DRY_RUN" -eq 1 ] && echo "nuke: DRY RUN — nothing will be deleted"
echo

for t in $TARGETS; do
  remove_path "$t" "$APP_DIR/$t"
done
purge_adapter ".netlify" "state.json"
purge_adapter ".vercel"  "project.json"

echo
if [ "$REMOVED" -eq 0 ]; then
  echo "nuke: nothing to remove — already clean."
  exit 0
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "nuke: dry run — $REMOVED target(s), $(human "$FREED_KB") would be freed."
  exit 0
fi

# Nuxt regenerates .nuxt/types on `dev`, but typecheck and the IDE need them
# sooner. Skipped when node_modules is absent; `yarn install` runs prepare via
# its postinstall hook.
if [ "$FRAMEWORK" = "nuxt" ] && [ -x "$APP_DIR/node_modules/.bin/nuxt" ]; then
  echo "nuke: regenerating types (nuxt prepare)..."
  (cd "$APP_DIR" && ./node_modules/.bin/nuxt prepare >/dev/null 2>&1) \
    || echo "nuke: warning — nuxt prepare failed; run 'yarn install' to recover" >&2
fi

echo "nuke: done — $REMOVED target(s) removed, $(human "$FREED_KB") freed."
echo
