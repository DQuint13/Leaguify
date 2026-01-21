# Leagues Selection Page for Game Management

## Overview

Remove the "Manage Games" button from the dashboard and create a new page at `/leagues` that lists all leagues and allows selecting which league to manage (navigate to game outcomes page).

## Current State

- Dashboard has "Manage Games" button that links to `/league/:id/games`
- HomePage exists at `/` that shows leagues and navigates to dashboard
- GameOutcomes page exists at `/league/:id/games`

## Desired State

- Remove "Manage Games" button from dashboard
- Create new page at `/leagues` route
- Page displays list of all leagues
- Clicking a league navigates to `/league/:id/games` (game outcomes page)
- Minimal design consistent with the app

## Implementation Details

### Remove Manage Games Button

**File: `frontend/src/pages/LeagueDashboard.jsx`**
- Remove the "Manage Games" button and Link import
- Keep only the league name in the header

### Create Leagues Management Page

**New File: `frontend/src/pages/LeaguesManagement.jsx`**
- Display list of all leagues
- Each league is clickable
- Clicking navigates to `/league/:id/games`
- Minimal card-based design
- Show league name and basic info

### Routing Updates

**File: `frontend/src/App.jsx`**
- Add route: `/leagues` for LeaguesManagement page

## Files to Create/Modify

### New Files
- `frontend/src/pages/LeaguesManagement.jsx` - New page for selecting league to manage

### Modified Files
- `frontend/src/pages/LeagueDashboard.jsx` - Remove Manage Games button
- `frontend/src/App.jsx` - Add /leagues route
