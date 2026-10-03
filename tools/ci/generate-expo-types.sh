#!/usr/bin/env bash
# Genera los tipos de Expo Router (.expo/types/router.d.ts) y expo-env.d.ts para que `tsc`
# en la CI revise lo mismo que en local (experiments.typedRoutes). Expo solo los genera
# con el servidor de desarrollo, así que se lo levanta hasta que aparecen y se lo corta.
set -euo pipefail

CI=1 bunx expo start --port 8090 > /tmp/expo-typegen.log 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  if [ -f .expo/types/router.d.ts ] && [ -f expo-env.d.ts ]; then
    echo "Tipos de Expo Router generados."
    exit 0
  fi
  sleep 1
done

echo "No se generaron los tipos de Expo Router en 60 s." >&2
cat /tmp/expo-typegen.log >&2
exit 1
