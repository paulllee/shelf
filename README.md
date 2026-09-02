# shelf

a self-hosted, markdown-backed media tracker

## features

- track movies, shows, and other media by status, country, type, rating, and review
- store every media item as a plain markdown file with yaml frontmatter
- detect direct markdown edits through background polling
- update open browser sessions through server-sent events

## requirements

- [pixi](https://pixi.prefix.dev/)

## setup

```bash
pixi run install
```

set the media markdown directory in `config.toml`. the directory is created when the app starts

```toml
media_dir = "./contents/media"
```

## running

```bash
pixi run dev
pixi run prod
```

dev runs the frontend at `http://localhost:5173` and the api at `http://localhost:8000`

prod builds the frontend and serves the full app at `http://localhost:80`

## tech stack

- backend: fastapi and python-frontmatter
- frontend: react 19, vite, tailwindcss 4, and tanstack query
- data: markdown with yaml frontmatter
- tooling: pixi, ruff, prettier, and typescript
