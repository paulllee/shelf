## help: show available commands
help:
	@echo "usage: make [target]"
	@echo ""
	@echo "targets:"
	@grep -E '^##' $(MAKEFILE_LIST) | sed -e 's/^## //' | column -t -s ':'

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

## run: run dev fastapi configuration
run:
	uv run fastapi dev main.py
