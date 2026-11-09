#!/usr/bin/env bash
set -e
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
