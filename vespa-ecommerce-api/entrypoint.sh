#!/bin/sh
# Script will exit immediately if a command fails
set -e

echo "Running database migrations..."
# Applies the latest database schema changes
npx prisma migrate deploy

# --- BAGIAN YANG DITAMBAHKAN ---
echo "Running database seeding..."
# Runs the seed script defined in package.json
npx prisma db seed
# -----------------------------

echo "Generating Prisma client..."
# Generates the Prisma Client based on the schema
npx prisma generate

echo "Starting the application..."
# Executes the main command passed to the script (the CMD in the Dockerfile)
exec "$@"