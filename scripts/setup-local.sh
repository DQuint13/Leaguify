#!/bin/bash

# Local development setup script for Leaguify

set -e

echo "Setting up Leaguify for local development..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18.x or higher."
    exit 1
fi

# Check if Docker is installed (for local PostgreSQL)
if ! command -v docker &> /dev/null; then
    echo "Warning: Docker is not installed. You'll need to set up PostgreSQL manually."
else
    echo "Starting PostgreSQL container..."
    docker run --name leaguify-db \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=leaguify \
        -p 5432:5432 \
        -d postgres:15 || docker start leaguify-db
    
    echo "PostgreSQL container started on port 5432"
    echo "Connection: postgresql://postgres:postgres@localhost:5432/leaguify"
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "Setup complete!"
echo ""
echo "To start development:"
echo "1. Backend: cd backend && npm run dev"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "Backend will run on http://localhost:3001"
echo "Frontend will run on http://localhost:3000"
