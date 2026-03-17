# Shelf

## Project Overview

Self-hosted markdown-backed tracker for media (movies/shows), workouts, habits, and activities. Uses markdown files with YAML frontmatter as the data store in `contents/`.

## Tech Stack

- **Backend:** Python 3.14, FastAPI, python-frontmatter, python-slugify
- **Frontend:** React 19, TypeScript, Vite, TanStack Query, Tailwind CSS 4
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

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | No | Enables AI chat in the tasks section. If not set, the app starts normally but the chat endpoint returns 503. |
| `GEMINI_MODEL` | No | Override the Gemini model used for chat. Defaults to `gemini-3-flash-preview`. |

## Design Context

### Users
Solo developer using Shelf as a personal self-hosted tracker for media, workouts, habits, and tasks. Used on both mobile and desktop. The interface should feel like a private, well-crafted tool — not a product being sold.

### Brand Personality
**Calm, minimal, functional.** Shelf is a quiet tool that stays out of the way. It should feel like a clean notebook — not an app competing for attention.

### Aesthetic Direction
- **Visual reference**: Linear — clean, fast, developer-oriented. Minimal chrome, strong typography, precise spacing.
- **Theme**: Dark-first. Dark mode is the primary experience; light mode also supported. Theme driven by `.dark` class on `<html>`.
- **Font**: Josefin Sans — the single distinctive design choice. Note: Josefin Sans has unusually tall ascenders, which affects vertical alignment of icons next to text. Always test icon/text alignment visually.
- **Colors**: Custom CSS variable semantic tokens defined in `frontend/src/input.css` `@theme` block (`primary`, `error`, `warning`, `info`, `success`, `base-*`). Use Tailwind utilities (`bg-primary`, `text-base-content`, etc.). No hardcoded hex values in components.
- **Icons**: Lucide React, sized consistently (`w-4 h-4` for inline, `w-6 h-6` for buttons).
- **Anti-references**: No corporate/enterprise feel (Jira), no generic bootstrap look, no gratuitous gradients or decorative elements, no gamification (badges, streaks, points).

### Design Principles
1. **Invisible until needed** — UI chrome should disappear. Content and data come first. Controls appear on hover/interaction.
2. **Typographic hierarchy over decoration** — Use font size, weight, and opacity to create hierarchy. Never add borders, backgrounds, or icons where typography alone suffices.
3. **Consistent density** — Maintain tight, information-dense layouts (like Linear) without feeling cramped. Spacing should be purposeful, not generous.
4. **Accessible by default** — Every transition includes `motion-reduce:transition-none`. Focus states use `focus-visible:ring-2`. Touch targets meet 44px minimum.
5. **One typeface, one icon set, one color system** — All visual variety comes from size, weight, and opacity within these three constraints. No exceptions.

## Architecture Decisions

<!-- Record why things are built a certain way so an agent can revisit the reasoning. -->

## Lessons Learned

<!-- One-line discoveries appended by /ap-plan after each run. Do not duplicate entries. -->
- FastAPI path parameter names (e.g. `{id}` vs `{media_id}`) are internal — renaming them does not change URL structure or require frontend changes
- Logger `%`-style formatting in Python logging calls is intentional (lazy evaluation) — do not convert to f-strings
- `ruff` does not flag missing docstrings by default; docstring coverage requires manual review or enabling `pydocstyle` rules
- When implementing cascade delete for hierarchical data (parent/child), always use recursive deletion to handle arbitrary nesting depth — single-level deletes leave orphaned grandchildren
- AI tool-use chat endpoints need a loop to process multiple tool calls before returning the final text response to the user
