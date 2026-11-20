#!/usr/bin/env bash
# Start the standalone production server for Playwright.
# `next start` does not work with `output: "standalone"` — the document
# streams, but the page segment stays hidden behind app/loading.tsx.
set -euo pipefail
cd "$(dirname "$0")/.."

DIST="${NEXT_DIST_DIR:-.next-playwright}"
STAND="$DIST/standalone/apps/web"

if [[ ! -f "$STAND/server.js" ]]; then
  echo "Missing $STAND/server.js. Build the web app with NEXT_DIST_DIR=$DIST first." >&2
  exit 1
fi

mkdir -p "$STAND/$DIST"
rm -rf "$STAND/$DIST/static"
cp -a "$DIST/static" "$STAND/$DIST/static"
rm -rf "$STAND/public"
cp -a public "$STAND/public"

export HOSTNAME="${HOSTNAME:-127.0.0.1}"
export PORT="${PORT:-3001}"
cd "$STAND"
exec node server.js
