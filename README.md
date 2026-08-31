# shelf

a self-hosted, markdown-backed personal tracker for media, workouts, habits, and tasks

## features

- **media tracking**: track movies, shows, and other media with status, ratings, and reviews
- **workout logging**: log workouts with exercise groups, sets, reps, and weights with drag-and-drop ordering
- **workout templates**: save routines as templates for quick reuse
- **habit tracking**: track daily habits with completion history and a monthly calendar view
- **activity logging**: log one-off activities with preset quick-add
- **task management**: hierarchical tasks with drag-and-drop reordering and an optional ai chat assistant powered by Gemini
- **markdown storage**: all data stored as plain markdown files with yaml frontmatter

## requirements

- [pixi](https://pixi.prefix.dev/)

## setup

```bash
pixi run install
```

configure paths in `config.toml` if needed. content directories are created automatically on first run

views can be enabled or disabled at startup. disabled views are hidden and their markdown directories are not loaded or polled. all views default to enabled when this table is omitted:

```toml
[views]
media = true
workouts = false
habits = false
tasks = false
```

### environment variables

- `GEMINI_API_KEY`: enables ai chat in the tasks section. without it, the app starts normally but the chat endpoint returns 503
- `GEMINI_MODEL`: overrides the Gemini model used for chat. the default is `gemini-3.1-flash-lite`

## running

```bash
pixi run dev
pixi run prod
```

dev: frontend at `http://localhost:5173`, api at `http://localhost:8000`
prod: everything at `http://localhost:80`

## tech stack

- **backend**: fastapi + python-frontmatter
- **frontend**: react 19 + vite + tailwindcss 4 + tanstack query
- **data**: markdown with yaml frontmatter
- **tooling**: Pixi, ruff, prettier, typescript
