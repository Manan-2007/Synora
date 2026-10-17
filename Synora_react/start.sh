#!/usr/bin/env bash
# Start Synora and open it in your browser.
#
# Press Ctrl+C to stop the server.

set -euo pipefail
cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "Synora needs Node.js 22.22 or newer: https://nodejs.org" >&2
  exit 1
fi
node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 22 || (a === 22 && b >= 22) ? 0 : 1)' \
  || echo "Warning: Node.js $(node -v) is older than 22.22, which React Router 8 needs." >&2

if [ ! -d node_modules ]; then npm install; fi
echo "Starting Synora…"
# Vite opens the browser itself as soon as the dev server is ready.
exec npm run dev -- --open
