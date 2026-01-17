#!/bin/bash
echo "Stopping containers..."
docker compose down

echo "Starting containers..."
docker compose up -d

echo "Waiting for containers to start..."
sleep 5

echo "Showing logs..."
docker compose logs --tail=50 app
