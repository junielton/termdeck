#!/usr/bin/env bash
set -euo pipefail
# Helper script to (re)build and npm link termdeck locally, then append a shell alias if missing.

PKG_NAME="termdeck"
ALIAS_NAME="tdk"
ALIAS_CMD="termdeck"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

pushd "$ROOT_DIR" >/dev/null

echo "[termdeck] Checking dependencies..."
if [ ! -d node_modules ]; then
  echo "[termdeck] node_modules missing → running npm install"
  npm install
fi

# Verify critical dev dependency @intlify/unplugin-vue-i18n is installed
if ! node -e "require.resolve('@intlify/unplugin-vue-i18n/package.json')" >/dev/null 2>&1; then
  echo "[termdeck] '@intlify/unplugin-vue-i18n' not found → installing dev deps"
  npm install
fi

echo "[termdeck] Building project (showing output)..."
if ! npm run build; then
  echo "[termdeck] Build failed. Aborting link." >&2
  exit 1
fi

echo "[termdeck] Running npm link..."
if ! npm link; then
  echo "[termdeck] npm link failed" >&2
  exit 1
fi

echo "[termdeck] Ensuring shell aliases..."
add_alias() {
  local file="$1"
  local line="alias ${ALIAS_NAME}='${ALIAS_CMD}'"
  if [ -f "$file" ]; then
    if grep -Fq "$line" "$file"; then
      echo "[termdeck] Alias already present in $file"
    else
      echo "$line" >> "$file"
      echo "[termdeck] Added alias to $file"
    fi
  fi
}

add_alias "$HOME/.zshrc"
add_alias "$HOME/.bashrc"

cat <<EOF
[termdeck] Done.
Usage:
  ${ALIAS_NAME}   # launches termdeck (alias to 'termdeck')
To re-run after changes:
  scripts/dev-link.sh
To unlink later:
  npm unlink -g ${PKG_NAME}

Troubleshooting:
  - Delete dist + rebuild: rm -rf dist && npm run build
  - Force reinstall deps: rm -rf node_modules package-lock.json && npm install
EOF

popd >/dev/null
