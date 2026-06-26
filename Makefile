# ==============================================================================
# MarketMind Makefile
# ==============================================================================

.PHONY: dev migrate test clean setup

# Starts core database infrastructure (Postgres and Redis) locally
dev:
	@echo "Starting local infrastructure..."
	docker compose -f docker-compose.dev.yml up -d

# Run database schema migrations using Alembic
migrate:
	@echo "Running database migrations..."
	cd backend && alembic upgrade head

# Run backend tests
test:
	@echo "Running Pytest suite..."
	cd backend && pytest

# Stops local docker composition and purges volumes and caches
clean:
	@echo "Cleaning development environment..."
	docker compose -f docker-compose.dev.yml down -v

# Installs backend dependencies
setup:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
