#!/bin/sh
set -e

# Run Prisma migrations in production (apply any pending migrations)
if [ -f ./node_modules/.bin/prisma ]; then
  echo "⏳ Applying Prisma migrations..."
  npx prisma migrate deploy
else
  echo "⚠️ Prisma binary not found, skipping migrations."
fi

# Finally start the Next.js server (listening on PORT env, default 3001)
exec "$@"
