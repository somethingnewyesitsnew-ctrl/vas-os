#!/usr/bin/env bash
# Builds the self-hosting package from the current checkout.
#   scripts/build-package.sh [output-zip]      (default: dist/vas-os-hosting-package.zip)
#
# Ships ONLY: css/, icons/, js/*.js (not js/archived/), manifest.json,
# material.html, index.html, sw.js.
# Fails (exit 1) if ANY shipped file mentions GitHub - the server admin must
# never be able to see the GitHub account. The zip is deterministic (fixed
# timestamps and file order) so an unchanged app produces byte-identical output.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/vas-os-hosting-package.zip}"
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
PKG="$WORK/vas-os-hosting-package"
mkdir -p "$PKG/js"
cp -r "$ROOT/css" "$ROOT/icons" "$PKG/"
cp "$ROOT"/js/*.js "$PKG/js/"
cp "$ROOT/manifest.json" "$ROOT/material.html" "$ROOT/index.html" "$ROOT/sw.js" "$PKG/"

echo "files: $(find "$PKG" -type f | wc -l)"
HITS="$(grep -rail -E 'github|somethingnewyesitsnew|\.github\.io|api\.github|uploads\.github' "$PKG" || true)"
if [ -n "$HITS" ]; then echo "LEAK: GitHub reference found in shipped files:"; echo "$HITS"; exit 1; fi
echo "leak sweep: zero hits"

STAMP="${SOURCE_DATE_EPOCH:-$(git -C "$ROOT" log -1 --format=%ct 2>/dev/null || date +%s)}"
find "$WORK" -exec touch -d "@$STAMP" {} +
mkdir -p "$(dirname "$OUT")"; rm -f "$OUT"
( cd "$WORK" && find vas-os-hosting-package -type f | LC_ALL=C sort | zip -X -q "$OUT" -@ )
unzip -tq "$OUT" >/dev/null
echo "built: $OUT ($(wc -c < "$OUT") bytes)"
