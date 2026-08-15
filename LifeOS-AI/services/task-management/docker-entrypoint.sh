#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# API container entrypoint.
# Ensures the Prisma client is present, applies the schema to Postgres and
# seeds demo data (idempotent) before starting the process passed as CMD.
# -----------------------------------------------------------------------------
set -euo pipefail

echo "[entrypoint] Generating Prisma client..."
npx prisma generate

echo "[entrypoint] Applying schema to database (prisma db push)..."
npx prisma db push --skip-generate

echo "[entrypoint] Seeding database (idempotent)..."
npx prisma db seed || echo "[entrypoint] Seed step reported a non-zero exit (continuing)."

echo "[entrypoint] Starting API: $*"
exec "$@"
