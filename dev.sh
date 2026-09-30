#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 [Denzo Music] Starting development environment..."

# 1. Check if Docker services (PostgreSQL, Redis, MinIO) are up
if command -v docker >/dev/null 2>&1; then
  echo "📦 Ensuring Docker containers are running (Postgres, Redis, MinIO)..."
  docker compose up -d
else
  echo "⚠️ Docker command not found. Make sure PostgreSQL, Redis and MinIO are running."
fi

echo "✨ Launching Backend (NestJS :4000) and Frontend (Vite :3000)..."
echo "💡 Press Ctrl+C at any time to stop all services."

# 2. Run backend & frontend simultaneously with colorized prefixes
npx --yes concurrently \
  --names "SERVER,CLIENT" \
  --prefix-colors "magenta.bold,cyan.bold" \
  --kill-others \
  "npm run start:dev --prefix server" \
  "npm run dev --prefix client"
