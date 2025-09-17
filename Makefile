.PHONY: help install build test lint format clean dev up down logs

# Default target
help:
	@echo "PRISM - Predictive Rockfall Intelligence & Safety Management"
	@echo ""
	@echo "Available commands:"
	@echo "  install     Install dependencies for all services"
	@echo "  build       Build all services"
	@echo "  test        Run tests for all services"
	@echo "  lint        Run linting for all services"
	@echo "  format      Format code for all services"
	@echo "  clean       Clean build artifacts"
	@echo "  dev         Start development environment"
	@echo "  up          Start production environment"
	@echo "  down        Stop all services"
	@echo "  logs        Show logs from all services"

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install
	@for service in api-gateway data-ingestion digital-twin ai-pipeline alert-management user-management; do \
		echo "Installing dependencies for $$service..."; \
		cd services/$$service && npm install && cd ../..; \
	done

# Build all services
build:
	@echo "Building all services..."
	npm run build

# Run tests
test:
	@echo "Running tests..."
	npm test

# Run linting
lint:
	@echo "Running linting..."
	npm run lint

# Format code
format:
	@echo "Formatting code..."
	npm run format

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	@for service in api-gateway data-ingestion digital-twin ai-pipeline alert-management user-management; do \
		echo "Cleaning $$service..."; \
		rm -rf services/$$service/dist/; \
	done

# Start development environment
dev:
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d

# Start production environment
up:
	@echo "Starting production environment..."
	docker-compose up -d

# Stop all services
down:
	@echo "Stopping all services..."
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

# Show logs
logs:
	@echo "Showing logs..."
	docker-compose logs -f

# Database setup
db-setup:
	@echo "Setting up databases..."
	docker-compose up -d timescaledb postgis neo4j
	@echo "Waiting for databases to be ready..."
	sleep 30
	@echo "Databases should be ready!"

# Kubernetes deployment
k8s-deploy:
	@echo "Deploying to Kubernetes..."
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/api-gateway.yaml

# Kubernetes cleanup
k8s-clean:
	@echo "Cleaning up Kubernetes resources..."
	kubectl delete namespace prism