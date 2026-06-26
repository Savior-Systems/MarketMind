# ==============================================================================
# MarketMind Makefile
# ==============================================================================

.PHONY: dev migrate test lint clean

# Starts core database infrastructure (Postgres and Redis) locally
dev:
	@echo "Starting local infrastructure..."
	docker compose -f docker-compose.dev.yml up -d

# Run database schema migrations using Alembic
migrate:
	@echo "Running database migrations..."
	cd backend && alembic upgrade head

# Run backend test coverage checks
test:
	@echo "Running Pytest suite..."
	cd backend && pytest

# Run Ruff check and MyPy typing validations
lint:
	@echo "Checking code guidelines..."
	cd backend && ruff check . && mypy .

# Stops local docker composition and purges volumes
clean:
	@echo "Cleaning development environment..."
	docker compose -f docker-compose.dev.yml down -v
