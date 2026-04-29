.PHONY: install build check-python prepare-python-venv test-js test-python test-python-analytics test-offline-rl paper-artifacts verify ci clean distclean

PY_ANALYTICS_DIR := data analysis/analytics_v1
PY_OFFLINE_RL_DIR := offline_rl
PAPER_PYTHON ?= python3
PYTHON ?= $(shell for python in python3.12 python3.11 python3.10 python3; do \
	if command -v $$python >/dev/null 2>&1 && $$python -c 'import sys; raise SystemExit(sys.version_info < (3, 10))' >/dev/null 2>&1; then \
		echo $$python; \
		break; \
	fi; \
done)
PY_VENV := .venv
PY_BIN := $(PY_VENV)/bin/python

install:
	npm ci

build:
	npm run build

test-js:
	npm run test:js

check-python:
	@test -n "$(PYTHON)" || (echo "Python 3.10+ is required. Install python3.10+ or run 'make PYTHON=/path/to/python3.11 test-python'."; exit 1)
	@$(PYTHON) -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' || (echo "Python 3.10+ is required. Current PYTHON=$(PYTHON)."; exit 1)

prepare-python-venv: check-python
	@if [ -x "$(PY_BIN)" ]; then \
		"$(PY_BIN)" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' || rm -rf "$(PY_VENV)"; \
	fi
	@if [ ! -x "$(PY_BIN)" ]; then $(PYTHON) -m venv "$(PY_VENV)"; fi
	"$(PY_BIN)" -m pip install --upgrade pip setuptools wheel

test-python: test-python-analytics test-offline-rl

test-python-analytics: prepare-python-venv
	cd "$(PY_ANALYTICS_DIR)" && "../../$(PY_BIN)" -m pip install -e ".[dev]" && "../../$(PY_BIN)" -m pytest

test-offline-rl: prepare-python-venv
	cd "$(PY_OFFLINE_RL_DIR)" && "../$(PY_BIN)" -m pip install -e ".[dev]" && "../$(PY_BIN)" -m pytest

paper-artifacts:
	PYTHON="$(PAPER_PYTHON)" npm run paper:artifacts -- --analysis-dir paper_artifacts/fixtures/analysis --publication-dir paper_artifacts/fixtures/publication_export --model-dir paper_artifacts/fixtures/model_cql --out-dir paper_artifacts/out/fixture

verify: build test-js test-python

ci: install verify

clean:
	rm -rf build .svelte-kit .vercel package dist coverage
	find . -name "__pycache__" -type d -prune -exec rm -rf {} +
	find . -name ".pytest_cache" -type d -prune -exec rm -rf {} +
	find . -name "*.egg-info" -type d -prune -exec rm -rf {} +

distclean: clean
	rm -rf node_modules .venv
