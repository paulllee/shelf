# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shelf is a self-hosted, markdown-backed personal tracker for media (movies, shows) and workouts. All data is stored as markdown files with YAML frontmatter in `contents/`.

## Commands

```bash
make dev          # Run dev server (FastAPI with hot reload)
make prod         # Run production server
make lint         # Lint Python with ruff
make format-all   # Format Python (ruff) + HTML/JS/CSS (prettier)
make build-css    # Build Tailwind CSS
make watch-css    # Watch and rebuild Tailwind CSS
```

Uses `uv` for Python package management. Requires Python 3.14+.

## Architecture

**Backend**: FastAPI app in `app/main.py` serving Jinja2 templates with HTMX for interactivity.

**Data Layer**: Markdown files with YAML frontmatter parsed via `python-frontmatter`. Files are polled every 5 seconds and cached in `app.state` (`media_items`, `workout_items`, `template_items`). Directory paths configured in `config.toml`.

**Key Files**:
- `app/main.py` - FastAPI app, lifespan, parsing functions
- `app/models.py` - Dataclasses (`Media`, `Workout`, `WorkoutTemplate`) and Pydantic models for form validation
- `app/writer.py` - Serializes items back to markdown
- `app/routes/media.py` - Media CRUD routes
- `app/routes/workout.py` - Workout and template CRUD routes

**Frontend**: Tailwind CSS (via DaisyUI), HTMX partials in `templates/partials/`.

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
