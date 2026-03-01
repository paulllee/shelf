# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shelf is a self-hosted, markdown-backed personal tracker for media (movies, shows), workouts, and habits. All data is stored as markdown files with YAML frontmatter in `contents/`.

## Commands

```bash
make dev          # Run both backend (port 8000) and frontend (port 80) dev servers
make dev-api      # Run FastAPI backend only
make dev-ui       # Run Vite frontend only (port 5173)
make prod         # Build frontend and run production server
make lint         # Lint Python (ruff) and TypeScript (tsc --noEmit)
make format-all   # Format Python (ruff) + frontend (prettier)
make build-frontend  # Build React app for production
```

Uses `uv` for Python package management. Requires Python 3.14+. Uses `npm` for frontend.

## Architecture

**Backend**: FastAPI app in `app/main.py` serving a JSON API under `/api/`. In production, also serves the built SPA from `static/spa/`.

**Data Layer**: Markdown files with YAML frontmatter parsed via `python-frontmatter`. Files are polled every 5 seconds and cached in `app.state` (`media_items`, `workout_items`, `template_items`, `habit_items`, `activity_items`, `preset_items`). Directory paths configured in `config.toml`.

**Frontend**: React SPA built with Vite + TypeScript. Uses TanStack Query for data fetching/caching, Tailwind CSS + DaisyUI for styling, `useReducer` for the nested workout form builder. No router — section/tab state stored in localStorage. Vite dev server proxies `/api/*` → `http://localhost:8000` (see `vite.config.ts`).

**Key Files**:
- `app/main.py` - FastAPI app, lifespan, parsing functions, CORS, SPA catch-all
- `app/models.py` - Dataclasses (`Media`, `Workout`, `WorkoutTemplate`) and Pydantic models for form validation
- `app/writer.py` - Serializes items back to markdown
- `app/routes/media.py` - Media JSON API endpoints
- `app/routes/workout.py` - Workout and template JSON API endpoints
- `app/routes/habits.py` - Habit, activity, and preset JSON API endpoints
- `frontend/src/App.tsx` - React app entry, section toggle
- `frontend/src/api/` - Typed API client functions
- `frontend/src/components/` - React components
- `frontend/src/types/` - TypeScript interfaces mirroring backend models
- `frontend/src/hooks/useLocalStorage.ts` - Generic typed localStorage hook
- `frontend/src/utils/date.ts` - `formatDateStr(date)` → YYYY-MM-DD string

## Key Patterns

- **ID generation**: Media IDs are slugified names (e.g., "Reply 1988" → `reply-1988`). Workout IDs are `YYYYMMDD-HHMMSS` from date/time fields. Template IDs are slugified names.
- **Edit with rename**: PUT endpoints handle ID changes (when name/date changes) by deleting old file and creating new one.
- **Polling**: Background async tasks poll markdown directories every 5 seconds, updating `app.state`. This allows detecting external file edits.
- **No router**: Frontend uses localStorage (`shelf-section`) to track active section (media/workouts/habits). `shelf-media-tab` persists the active media filter tab. No URL-based routing.
- **Workout form state**: `WorkoutFormModal.tsx` uses `useReducer` for the deeply nested group → exercise → set structure. Actions include `add_group`, `remove_group`, `add_exercise`, `update_set`, etc.
- **Responsive views**: Media uses card layout on mobile, table on desktop. Controlled by Tailwind breakpoints.
- **No tests**: No test infrastructure exists yet.
- **Habit toggle**: `POST /api/habit/{id}/toggle/{date}` adds/removes a date from the habit's `completions` list.
- **Preset merging**: `GET /api/habit-presets` merges explicit presets (`contents/presets/`) with activity names auto-derived from `contents/activities/`, deduped by name.

## Data Models

Media files stored in `contents/media/` with slugified filenames:
```yaml
---
name: title
country: korea | japan | america
type: variety | drama | movie | series
status: queued | watching | watched
rating: n/a or number
---
```

Workout files stored in `contents/workout/` with date-time ID filenames:
```yaml
---
date: 2026-02-01
time: "09:30:00"
groups:
  - name: chest & triceps
    rest_seconds: 60
    exercises:
      - name: bench press
        sets:
          - reps: 10
            weight: 135
---
```

Habit files stored in `contents/habits/` with slugified name filenames:
```yaml
---
name: Meditate
days: [0, 1, 2, 3, 4, 5, 6]  # 0=Sun … 6=Sat
color: "#4ade80"
completions:
  - 2026-02-01
  - 2026-02-03
---
```

Activity files stored in `contents/activities/` with `{date}-{slug}` filenames:
```yaml
---
name: Running
date: 2026-02-01
---
```

Preset files stored in `contents/presets/` with slugified name filenames:
```yaml
---
name: Running
---
```

Workout template files stored in `contents/template/` with slugified name filenames:
```yaml
---
name: Push Day
groups:
  - name: chest & triceps
    rest_seconds: 60
    exercises:
      - name: bench press
        sets:
          - reps: 10
            weight: 135
---
```
