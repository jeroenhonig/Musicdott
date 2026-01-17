#!/bin/bash

# MusicDott Deployment Script
# Usage: ./deploy.sh [--fresh]
#   --fresh  Reset database and start with clean data

set -e

FRESH_START=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --fresh)
      FRESH_START=true
      shift
      ;;
  esac
done

echo "================================"
echo "  MusicDott Deployment"
echo "================================"
echo ""

# Stop existing containers
echo "Stopping containers..."
docker compose down

# Fresh start - remove database volume
if [ "$FRESH_START" = true ]; then
  echo ""
  echo "Fresh start requested - removing database volume..."
  docker volume rm musicdott_postgres_data 2>/dev/null || true
  echo "Database volume removed."
fi

# Build and start containers
echo ""
echo "Building and starting containers..."
docker compose up -d --build

# Wait for containers to start
echo ""
echo "Waiting for containers to start..."
sleep 10

# Show status
echo ""
echo "Container status:"
docker compose ps

# Show logs
echo ""
echo "Recent logs:"
docker compose logs --tail=50 app

echo ""
echo "================================"
echo "  Deployment Complete!"
echo "================================"
echo ""
echo "The app should be available at your configured domain."
echo ""
echo "Default login credentials (if fresh start):"
echo "  Admin:   admin / admin123"
echo "  Teacher: teacher / teacher123"
echo ""
echo "To view live logs: docker compose logs -f app"
echo ""
