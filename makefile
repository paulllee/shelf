## help: show available commands
help:
	@echo "usage: make [target]"
	@echo ""
	@echo "targets:"
	@grep -E '^##' $(MAKEFILE_LIST) | sed -e 's/^## //' | column -t -s ':'

## lint: lint python files with ruff
lint:
	uv run ruff check

## format-all: formats python + html/js/css files
format-all:
	uv run ruff format
	@echo ""
	npx prettier -w **/*.html **/*.js **/*.css

## build-css: build tailwindcss
build-css:
	npx @tailwindcss/cli -i src/input.css -o static/css/output.css

## watch-css: watching for any changes to rebuild tailwindcss
watch-css:
	npx @tailwindcss/cli -i src/input.css -o static/css/output.css -w

## dev: run dev fastapi configuration
dev:
	uv run fastapi dev app/main.py --host 0.0.0.0 --port 80

## prod: run prod fastapi configuration
prod:
	uv run fastapi run app/main.py --host 0.0.0.0 --port 80
