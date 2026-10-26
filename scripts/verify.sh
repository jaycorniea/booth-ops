#!/usr/bin/env bash
# Local iteration gate — tests + production build, no Vercel.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm test
npm run build

echo ""
echo "Verify: tests + build passed"
echo "Local dev: http://127.0.0.1:3010 (npm run dev)"
