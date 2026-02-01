# shelf

a self-hosted, markdown-backed personal tracker for media (movies, shows, etc.)
and workouts

## features

- **media tracking**: track movies, shows, and other media with status
  (queued/watching/watched), ratings, and reviews
- **workout logging**: log workouts with exercise groups, sets, reps, and
  weights
- **workout templates**: save workout routines as templates for quick reuse
- **calendar view**: visual calendar showing workout days
- **markdown storage**: all data stored as markdown files with yaml frontmatter
  - easy to edit, backup, and version control
- **dark/light theme**: toggle between themes, preference saved locally

## requirements

- python 3.14+
- [uv](https://github.com/astral-sh/uv) (python package manager)
- node.js (for tailwindcss)

## setup

1. clone the repository:
   ```bash
   git clone <repo-url>
   cd shelf
   ```

2. install python dependencies:
   ```bash
   uv sync
   ```

3. install node dependencies:
   ```bash
   npm install
   ```

4. create content directories:
   ```bash
   mkdir -p contents/media contents/workout contents/templates
   ```

5. configure paths in `config.toml`:
   ```toml
   media_dir = "./contents/media"
   workout_dir = "./contents/workout"
   template_dir = "./contents/templates"
   ```

## running

development server (with hot reload):
```bash
make dev
```

production server:
```bash
make prod
```

the app runs on `http://localhost:80` by default

## available commands

```bash
make help        # show all commands
make dev         # run dev server
make prod        # run production server
make lint        # lint python with ruff
make format-all  # format python + html/js/css
make build-css   # build tailwindcss
make watch-css   # watch and rebuild tailwindcss
```

## project structure

```
shelf/
├── app/
│   ├── main.py          # fastapi app, lifespan, parsing
│   ├── models.py        # data models (media, workout, templates)
│   ├── writer.py        # markdown serialization
│   └── routes/          # api and htmx routes
│       ├── media.py
│       └── workout.py
├── templates/           # jinja2 templates
│   ├── base.html
│   ├── index.html
│   └── partials/        # htmx partials
├── static/
│   └── css/output.css   # compiled tailwindcss
├── contents/            # markdown data (gitignored)
│   ├── media/
│   ├── workout/
│   └── templates/
├── config.toml          # directory configuration
├── pyproject.toml       # python dependencies
└── package.json         # node dependencies (tailwind, prettier)
```

## data format

### media item

```markdown
---
name: reply 1988
country: korea
type: drama
status: watched
rating: 5
---
optional review content here
```

### workout

```markdown
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
          - reps: 8
            weight: 155
---
optional notes here
```

## tech stack

- **backend**: fastapi + jinja2
- **frontend**: htmx + tailwindcss + daisyui
- **data**: markdown with yaml frontmatter
- **tooling**: uv, ruff, prettier
