#!/bin/sh
set -e

echo "Waiting for database..."
retries=10
until npx drizzle-kit migrate 2>/dev/null; do
  retries=$((retries - 1))
  if [ "$retries" -le 0 ]; then
    echo "Database not reachable after multiple attempts, exiting."
    exit 1
  fi
  echo "Database not ready, retrying in 3s... ($retries attempts left)"
  sleep 3
done
echo "Migrations done."

echo "Starting application..."
node .output/server/index.mjs
