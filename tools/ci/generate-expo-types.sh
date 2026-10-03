#!/usr/bin/env bash
# Generates the Expo Router types (.expo/types/router.d.ts) and expo-env.d.ts so that `tsc`
# in CI checks the same as locally (experiments.typedRoutes). Expo only generates them
# from the dev server, so it is started until they appear and then stopped.
set -euo pipefail

CI=1 bunx expo start --port 8090 > /tmp/expo-typegen.log 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  if [ -f .expo/types/router.d.ts ] && [ -f expo-env.d.ts ]; then
    echo "Expo Router types generated."
    exit 0
  fi
  sleep 1
done

echo "Expo Router types were not generated within 60 s." >&2
cat /tmp/expo-typegen.log >&2
exit 1
