#!/bin/sh
set -eu
npx prisma migrate deploy
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
