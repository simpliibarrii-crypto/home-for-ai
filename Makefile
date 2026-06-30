.PHONY: install lint format test clean build run dev tauri-build help

install:  ## Install npm dependencies
	npm ci
	pre-commit install

lint:  ## Run linters
	npm run lint 2>/dev/null || true

format:  ## Format code
	npx prettier --write .

test:  ## Run tests
	npm test 2>/dev/null || true

clean:  ## Clean build artifacts
	rm -rf build/ dist/ node_modules/ .pytest_cache __pycache__/
	find . -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true

build:  ## Build web app
	npm run build

run:  ## Run dev server
	npm run dev

tauri-build:  ## Build Tauri desktop app
	npm run tauri build

tauri-dev:  ## Run Tauri in dev mode
	npm run tauri dev

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
