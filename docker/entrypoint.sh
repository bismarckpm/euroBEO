#!/bin/sh
set -eu
npx prisma migrate deploy
if [ "$#" -gt 0 ]; then
  exec "$@"
fi
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
