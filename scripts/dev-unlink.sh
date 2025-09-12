#!/usr/bin/env bash
# TermDeck dev unlink helper
# Removes global npm link for termdeck and cleans up the optional 'tdk' alias from shell configs.
# Usage:
#   scripts/dev-unlink.sh [--purge] [--dry-run] [--verbose]
#
# Options:
#   --purge     Also uninstall global 'termdeck' if installed from the registry
#   --dry-run   Show what would be done without changing the system
#   --verbose   Print extra info
#
# Notes:
# - This script is safe to run multiple times. It will ignore missing entries.
# - If you linked 'termdeck' inside other projects (npm link termdeck), run `npm unlink termdeck` in those projects too.

# If executed with sh or a non-bash shell, re-exec with bash
if [ -z "${BASH_VERSION:-}" ]; then
  if command -v bash >/dev/null 2>&1; then
    exec bash "$0" "$@"
  else
    echo "[dev-unlink] This script requires bash. Please run: bash $0 [options]" >&2
    exit 1
  fi
fi

set -euo pipefail

PURGE=0
DRY_RUN=0
VERBOSE=0

for arg in "$@"; do
  case "$arg" in
    --purge) PURGE=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --verbose) VERBOSE=1 ;;
    -h|--help)
      sed -n '1,40p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

log() { echo "[dev-unlink] $*"; }
vecho() { [ "$VERBOSE" -eq 1 ] && log "$@" || true; }
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] $*"
  else
    eval "$@"
  fi
}

npm_root_global() {
  npm root -g 2>/dev/null || true
}

is_bsd_sed() {
  sed --version >/dev/null 2>&1 && return 1 || return 0
}

sed_inplace() {
  local pattern="$1" file="$2"
  if is_bsd_sed; then
    # macOS/BSD sed requires an explicit backup suffix (use empty string)
    run "sed -i '' -e $pattern '$file'"
  else
    run "sed -i -e $pattern '$file'"
  fi
}

remove_alias_line() {
  local file="$1"
  [ -f "$file" ] || { vecho "skip $file (not found)"; return 0; }
  vecho "checking $file for alias tdk"
  # Remove lines that start with alias tdk=
  sed_inplace "/^alias \\s*tdk=/d" "$file"
}

# 1) Show current resolution
log "Detecting current 'termdeck' resolution (if any)"
command -v termdeck >/dev/null 2>&1 && which termdeck || log "termdeck not in PATH (ok)"

# 2) Unlink global
log "Unlinking global npm link (if present)"
run "npm unlink -g termdeck || true"

# 3) Optionally uninstall global package
if [ "$PURGE" -eq 1 ]; then
  log "Purging global install from registry (if present)"
  run "npm uninstall -g termdeck || true"
fi

# 4) Clean alias from shell configs
log "Removing optional 'tdk' alias from shell configs"
remove_alias_line "$HOME/.zshrc"
remove_alias_line "$HOME/.bashrc"
remove_alias_line "$HOME/.bash_profile"

# 5) Summary
log "Done. Notes:"
log "- If you linked termdeck inside other projects, run 'npm unlink termdeck' in those projects."
log "- Open a new shell (or 'source ~/.zshrc') to refresh aliases/paths."

# 6) Show final status
if command -v termdeck >/dev/null 2>&1; then
  log "termdeck still resolves to: $(which termdeck)"
  log "If this points to the npm global directory and you wanted a full cleanup, re-run with --purge."
else
  log "termdeck command no longer resolves in PATH (as expected)."
fi
