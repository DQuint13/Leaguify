# PowerShell local development setup script for Leaguify

Write-Host "Setting up Leaguify for local development..." -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed. Please install Node.js 18.x or higher." -ForegroundColor Red
    exit 1
}

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "Starting PostgreSQL container..." -ForegroundColor Yellow
    
    $containerExists = docker ps -a --filter "name=leaguify-db" --format "{{.Names}}"
    if ($containerExists -eq "leaguify-db") {
        docker start leaguify-db
        Write-Host "PostgreSQL container started" -ForegroundColor Green
    } else {
        docker run --name leaguify-db `
            -e POSTGRES_PASSWORD=postgres `
            -e POSTGRES_DB=leaguify `
            -p 5432:5432 `
            -d postgres:15
        Write-Host "PostgreSQL container created and started" -ForegroundColor Green
    }
    
    Write-Host "Connection: postgresql://postgres:postgres@localhost:5432/leaguify" -ForegroundColor Cyan
} catch {
    Write-Host "Warning: Docker is not installed. You'll need to set up PostgreSQL manually." -ForegroundColor Yellow
}

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
Set-Location ..

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start development:" -ForegroundColor Cyan
Write-Host "1. Backend: cd backend; npm run dev"
Write-Host "2. Frontend: cd frontend; npm run dev"
Write-Host ""
Write-Host "Backend will run on http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend will run on http://localhost:3000" -ForegroundColor Cyan
