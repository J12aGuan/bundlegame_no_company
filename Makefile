.PHONY: install build check-python prepare-python-venv test-js test-python test-python-analytics test-offline-rl test-offline-rl-deep paper-artifacts figures-pdf figures-schematic-pdf figures-verify verify ci clean distclean

# Where camera-ready vector figures are written.
FIGURES_PDF_DIR := publishing/paper_artifacts/out/figures_pdf
FIGURES_SCHEMATIC_DIR := publishing/paper/raw_materials/figures/vector
SCREENSHOTS_DIR := publishing/paper/figures/screenshots

PY_ANALYTICS_DIR := publishing/data_analysis/analytics_v1
PY_OFFLINE_RL_DIR := offline_rl
PY_OFFLINE_RL_DEEP_DIR := offline_rl_deep
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
	"$(PY_BIN)" -m pip install --upgrade pip "setuptools<82" wheel

test-python: test-python-analytics test-offline-rl test-offline-rl-deep

test-python-analytics: prepare-python-venv
	cd "$(PY_ANALYTICS_DIR)" && "../../../$(PY_BIN)" -m pip install -e ".[dev]" && "../../../$(PY_BIN)" -m pytest --cov=analytics --cov-report=term-missing

test-offline-rl: prepare-python-venv
	cd "$(PY_OFFLINE_RL_DIR)" && "../$(PY_BIN)" -m pip install -e ".[dev]" && "../$(PY_BIN)" -m pytest --cov=offline_rl --cov-report=term-missing

test-offline-rl-deep: prepare-python-venv
	"$(PY_BIN)" -m pip install --index-url https://download.pytorch.org/whl/cpu "torch>=2.2,<3"
	cd "$(PY_OFFLINE_RL_DEEP_DIR)" && "../$(PY_BIN)" -m pip install -e ".[dev]" && "../$(PY_BIN)" -m pytest --cov=offline_rl_deep --cov-report=term-missing

paper-artifacts:
	PYTHON="$(PAPER_PYTHON)" npm run paper:artifacts -- --analysis-dir publishing/paper_artifacts/fixtures/analysis --publication-dir publishing/paper_artifacts/fixtures/publication_export --model-dir publishing/paper_artifacts/fixtures/model_cql --out-dir publishing/paper_artifacts/out/fixture

# Camera-ready vector figures (matplotlib, embedded TrueType fonts). These need
# matplotlib + pypdf, which are installed into the project venv on demand so the
# target is self-contained for CI.
figures-pdf: prepare-python-venv
	"$(PY_BIN)" -m pip install "matplotlib>=3.6" "pypdf>=4"
	"$(PY_BIN)" publishing/paper_artifacts/figures_pdf.py --analysis-dir publishing/paper_artifacts/fixtures/analysis --publication-dir publishing/paper_artifacts/fixtures/publication_export --out-dir "$(FIGURES_PDF_DIR)"
	"$(PY_BIN)" publishing/paper_artifacts/verify_figures_pdf.py "$(FIGURES_PDF_DIR)"

# Conceptual diagrams (worked example, archetype panels, store geometry) redrawn
# as native vector figures from the frozen raw_materials sources.
figures-schematic-pdf: prepare-python-venv
	"$(PY_BIN)" -m pip install "matplotlib>=3.6" "pypdf>=4"
	"$(PY_BIN)" publishing/paper/raw_materials/scripts/figures_schematic_pdf.py --out-dir "$(FIGURES_SCHEMATIC_DIR)"
	"$(PY_BIN)" publishing/paper_artifacts/verify_figures_pdf.py "$(FIGURES_SCHEMATIC_DIR)"

# Verify every generated figure PDF + the genuine screenshot PDFs in one pass.
figures-verify: prepare-python-venv
	"$(PY_BIN)" -m pip install "pypdf>=4"
	"$(PY_BIN)" publishing/paper_artifacts/verify_figures_pdf.py "$(FIGURES_PDF_DIR)" "$(FIGURES_SCHEMATIC_DIR)" --screenshots-dir "$(SCREENSHOTS_DIR)"

verify: build test-js test-python

ci: install verify

clean:
	rm -rf build .svelte-kit .vercel package dist coverage
	find . -name "__pycache__" -type d -prune -exec rm -rf {} +
	find . -name ".pytest_cache" -type d -prune -exec rm -rf {} +
	find . -name "*.egg-info" -type d -prune -exec rm -rf {} +

distclean: clean
	rm -rf node_modules .venv
