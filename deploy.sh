#!/bin/bash
# Lucky Draw Platform - Production Deployment Script
# Usage: ./deploy.sh

set -e

echo "=== Lucky Draw Platform - Deploy ==="

# Check .env exists
if [ ! -f .env.production ]; then
    echo "ERROR: .env.production not found!"
    echo "Copy .env.production.example to .env.production and fill in values"
    exit 1
fi

# Load env
export $(cat .env.production | xargs)

echo "1. Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo "2. Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "3. Waiting for services to start..."
sleep 10

echo "4. Checking health..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== Deploy complete! ==="
echo "Frontend: https://luckydraw.work"
echo "Admin:    https://luckydraw.work/admin"
echo ""
echo "Default admin: admin@luckydraw.work / admin123"
echo "IMPORTANT: Change default admin password after first login!"
