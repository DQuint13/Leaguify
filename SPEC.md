# Leaguify – Product Spec & Ideas

Product specification, architecture, API, and design notes for the Leaguify league statistics tracker.

## Overview

Leaguify is a web application for creating leagues, tracking game statistics, and managing player rankings. Users create leagues with a fixed number of players and games per cycle; they record game outcomes (scores and wins), and the app computes cycle wins, game wins, and current-cycle points.

## Features (current)

- **League management:** Create leagues with a specified number of players and games per cycle.
- **Game tracking:** Record game outcomes and scores (victory points) per player.
- **Statistics dashboard:** View cycle wins (by total victory points in a cycle), game wins, and current-cycle points.
- **Cycles:** Games are grouped into cycles; completing all games in a cycle can start the next one (manually or automatically).

## Architecture

- **Frontend:** React + Vite SPA. Locally: Vite dev server. Deployed: static assets on S3, served via CloudFront.
- **Backend:** Node.js/Express API. Locally: Node. Deployed: AWS SAM package run as Lambda behind API Gateway.
- **Database:** PostgreSQL. Locally: Docker or local install. Deployed: RDS in a VPC; Lambda connects via VPC and reads credentials from Parameter Store.
- **Infrastructure:** CloudFormation stacks (main/VPC, database, backend Lambda, frontend S3/CloudFront) plus AWS SAM for the Lambda app.

**Data flow:** The frontend calls `/api/*` (leagues, players, games, statistics). The backend is a single Express app talking to PostgreSQL; in Lambda, `serverless-http` wraps that app. All API routes are prefixed with `/api/`.

## How the project works

1. **Leagues** have a fixed number of players and a **games-per-cycle** (e.g. 4). Creating a league creates the players and initial games for cycle 1.
2. **Games** belong to a cycle and are either pending or completed. Completion is done by submitting **game outcomes**: each player gets a score (victory points) and a win/loss for that game (highest score wins).
3. **Cycle wins** are awarded by **total victory points** in a completed cycle: the player(s) with the most points in that cycle get +1 cycle win. When all games in a cycle are completed, the next cycle can start (manually or automatically after the last outcome).
4. **Statistics** (cycle wins, game wins, current-cycle points) are computed in the backend and shown on the league dashboard and in player columns.

## API endpoints

### Leagues

- `GET /api/leagues` – List all leagues
- `POST /api/leagues` – Create a new league
- `GET /api/leagues/:id` – Get league details
- `GET /api/leagues/:id/players` – Get all players in a league
- `PUT /api/leagues/:id/players` – Update players
- `GET /api/leagues/:id/games` – Get all games in a league
- `GET /api/leagues/:id/outcomes` – Get outcomes for all games in the league

### Games

- `POST /api/leagues/:leagueId/games` – Add a game
- `POST /api/games/:gameId/outcomes` – Add game outcomes
- `GET /api/games/:gameId/outcomes` – Get game outcomes

### Statistics

- `GET /api/statistics/leagues/:id` – Get league statistics and rankings

## Database schema

- **leagues:** League information (name, num_players, num_games, etc.)
- **players:** Player information (name, league_id, avatar, etc.)
- **games:** Game information (league_id, cycle, status)
- **game_outcomes:** Individual game results (game_id, player_id, score, win, etc.)

Schema and queries are defined in `backend/src/models/database.js`; tables are created on first run.

## Design notes / cost considerations

Default AWS configuration uses:

- `db.t3.micro` RDS (free tier eligible)
- Lambda 512MB memory
- S3 and CloudFront (pay-per-use)

For production, consider: RDS Multi-AZ, higher Lambda memory/timeout, CloudFront caching policies, RDS automated backups.

## Future ideas

- Placeholder for backlog and feature ideas (e.g. multi-league improvements, export, notifications).
