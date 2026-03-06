# Leaguify - League Statistics Tracker

A web application for creating leagues, tracking game statistics, and managing player rankings. Built with React, Node.js/Express, PostgreSQL, and deployed on AWS using CloudFormation.

## Features

- **League Management**: Create leagues with a specified number of players and games
- **Game Tracking**: Track game outcomes and scores (victory points)
- **Statistics Dashboard**: View cycle wins (by victory points), game wins, and current-cycle points
- **Cycles**: Games are grouped into cycles; completing all games in a cycle can start the next one automatically

## Architecture

- **Frontend**: React + Vite, deployed to S3 + CloudFront
- **Backend**: Node.js/Express on AWS Lambda via API Gateway
- **Database**: PostgreSQL on AWS RDS
- **Infrastructure**: CloudFormation stacks + AWS SAM for Lambda

## Project Structure

```
Leaguify/
├── frontend/          # React + Vite app (pages, components, services/api.js)
├── backend/           # Express API (routes, controllers, models/database.js), SAM template
├── infrastructure/    # CloudFormation templates and deploy scripts
├── scripts/           # Local setup (setup-local.ps1, setup-local.sh)
└── README.md
```

## Prerequisites

- **Local development**: Node.js 18+, npm. Optional: Docker (for PostgreSQL).
- **AWS deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md).

## Starting the Local Environment

You need three things running: **PostgreSQL**, the **backend API**, and the **frontend**.

### Option A: Quick start (recommended)

1. **One-time setup** (installs deps, optionally starts PostgreSQL via Docker):

   **Windows (PowerShell):**
   ```powershell
   .\scripts\setup-local.ps1
   ```
   **Linux/Mac:**
   ```bash
   ./scripts/setup-local.sh
   ```

2. **Backend** – from the repo root:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env if your DB is not localhost:5432 / postgres / postgres / leaguify
   npm run dev
   ```
   Backend runs at **http://localhost:3001**.

3. **Frontend** – in a second terminal:
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs at **http://localhost:5173** (Vite default). It uses `http://localhost:3001` for the API unless you set `VITE_API_BASE_URL`.

4. Open the frontend URL in your browser. If you have no leagues, create one from the home page.

### Option B: Manual setup

1. **PostgreSQL**  
   - With Docker:  
     `docker run --name leaguify-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=leaguify -p 5432:5432 -d postgres:15`  
   - Or install PostgreSQL and create a database (e.g. `leaguify`).

2. **Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env
   npm run dev
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The backend creates the required tables on first run (schema in `backend/src/models/database.js`).

## Documentation

- **[SPEC.md](SPEC.md)** – Product spec, architecture, API reference, and design notes
- **[DEPLOYMENT.md](DEPLOYMENT.md)** – AWS deployment runbook (code-only updates, full infra, custom domain, troubleshooting)

## License

MIT
