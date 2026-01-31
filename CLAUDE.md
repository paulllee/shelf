# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shelf is a self-hosted, markdown-backed personal media tracker (reviews and watchlist). Media items are stored as markdown files with YAML frontmatter in `contents/media/`.

## Commands

```bash
make run          # Run dev server (FastAPI with hot reload)
make lint         # Lint Python with ruff
make format-all   # Format Python (ruff) + HTML/JS/CSS (prettier)
make build-css    # Build Tailwind CSS
make watch-css    # Watch and rebuild Tailwind CSS
```

Uses `uv` for Python package management.

## Architecture

**Backend**: FastAPI app in `main.py` serving Jinja2 templates with HTMX for interactivity.

**Data Layer**: Media items are markdown files with frontmatter (name, country, type, status, rating). Parsed via `python-frontmatter`. Files are polled every 5 seconds and cached in `app.state.media_items`.

**Key Files**:
- `main.py` - FastAPI routes and media parsing
- `models.py` - `Media` dataclass, `MediaModel` Pydantic model, and enums (`MediaCountry`, `MediaType`, `MediaStatus`)
- `writer.py` - Serializes media items back to markdown

**Frontend**: Tailwind CSS (via DaisyUI), built from `src/input.css` to `static/css/output.css`.

## Media Data Model

```yaml
---
name: title
country: korea | japan | america
type: variety | drama | movie | series
status: queued | watching | watched
rating: n/a or number
---
optional review content
```

Filenames are slugified from the media name (e.g., "Reply 1988" → `reply-1988.md`).
