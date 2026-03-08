# Shelf

## Project Overview

Self-hosted markdown-backed tracker for media (movies/shows), workouts, habits, and activities. Uses markdown files with YAML frontmatter as the data store in `contents/`.

## Tech Stack

- **Backend:** Python 3.14, FastAPI, python-frontmatter, python-slugify
- **Frontend:** React 19, TypeScript, Vite, TanStack Query, Tailwind CSS 4, DaisyUI 5
- **Tooling:** uv (Python), npm (frontend), ruff (linting/formatting), ESLint, Prettier

## Build Tools

| Tool | Command | Purpose |
|------|---------|---------|
| uv | `uv run fastapi dev` | Run backend dev server |
| npm | `cd frontend && npm run dev` | Run frontend dev server |
| npm | `cd frontend && npm run build` | Build frontend (tsc + vite) |
| npm | `cd frontend && npm run lint` | Lint frontend |
| ruff | `uv run ruff check .` | Lint Python |
| ruff | `uv run ruff format .` | Format Python |

## Development Standards

### General
- Keep changes minimal and focused
- Prefer editing existing files over creating new ones
- No autocommit — the developer commits when ready

### Language-Specific
See CLAUDE.local.md for language-specific standards.

## Architecture Decisions

<!-- Record why things are built a certain way so an agent can revisit the reasoning. -->

## Lessons Learned

<!-- One-line discoveries appended by /ap-plan after each run. Do not duplicate entries. -->
- FastAPI path parameter names (e.g. `{id}` vs `{media_id}`) are internal — renaming them does not change URL structure or require frontend changes
- Logger `%`-style formatting in Python logging calls is intentional (lazy evaluation) — do not convert to f-strings
- `ruff` does not flag missing docstrings by default; docstring coverage requires manual review or enabling `pydocstyle` rules
