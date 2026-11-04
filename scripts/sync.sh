#!/usr/bin/env bash
# Pull the latest main and verify the backend still builds + tests.
# Safe to run repeatedly (e.g. every 15 minutes). Autostashes uncommitted local
# work, rebases onto origin/main, then builds and tests the backend.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[sync $(date '+%H:%M:%S')] pulling origin/main…"
git pull --rebase --autostash origin main

echo "[sync] building + testing backend…"
cd backend
forge build
forge test

echo "[sync] OK — backend green at $(git rev-parse --short HEAD)"
