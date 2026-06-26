#!/bin/bash
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Edit it with your API keys."
fi
docker compose up -d
echo "Waiting for database to be healthy..."
sleep 5
docker compose exec backend alembic upgrade head
echo "MarketMind is ready at http://localhost:3000"
