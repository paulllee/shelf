## help: show available commands
help:
	@echo "usage: make [target]"
	@echo ""
	@echo "targets:"
	@grep -E '^##' $(MAKEFILE_LIST) | sed -e 's/^## //' | column -t -s ':'

## lint: lint python and typescript
lint:
	uv run ruff check
	cd frontend && npx tsc --noEmit

## format-all: format python + frontend files
format-all:
	uv run ruff format
	cd frontend && npx prettier -w src/

## dev-api: run fastapi backend only
dev-api:
	uv run fastapi dev app/main.py --host 0.0.0.0 --port 8000

## install: install frontend npm dependencies
install:
	cd frontend && npm install && cd ..

## dev-ui: run vite frontend only
dev-ui:
	cd frontend && npm run dev

## dev: run both backend and frontend dev servers
dev:
	(cd frontend && npm run dev) & uv run fastapi dev app/main.py --host 0.0.0.0 --port 8000

## build-frontend: build react app for production
build-frontend:
	cd frontend && npm run build

## prod: build frontend and run production server
prod: build-frontend
	uv run fastapi run app/main.py --host 0.0.0.0 --port 80
