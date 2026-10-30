#!/usr/bin/env bash
# Compiles every design-pattern program and regenerates its trace.
#
# Only needed if you change the C++. The traces are committed, so the labs build
# (npm run build at the root) is enough after a clone.
set -euo pipefail
cd "$(dirname "$0")"

CXX=${CXX:-g++}
CXXFLAGS="-Wall -Wextra -std=c++17 -O2"
mkdir -p .bin traces

only="${1:-}"
count=0
for src in cpp/*/*.cpp; do
  case "$src" in cpp/tracer/*) continue;; esac
  name="$(basename "$src" .cpp)"
  if [ -n "$only" ] && [ "$name" != "$only" ]; then continue; fi
  printf '%-24s' "$name"
  # __FILE__ stays relative to this directory: the tracer reads the source back.
  "$CXX" $CXXFLAGS -o ".bin/$name" "$src"
  "./.bin/$name"
  count=$((count + 1))
done
echo "built $count pattern(s)"
for f in traces/*.js views/*.js views/renderers/*.js; do node --check "$f"; done
