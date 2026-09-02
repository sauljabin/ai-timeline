# AGENTS.md

Guidance for coding agents working in this repository.

## Project

- This is a notebook-first Python project for runnable AI-history examples, not an installable package.
- This repository is educational; prioritize clear explanations, approachable examples, and visible learning steps over production-oriented abstraction or optimization.
- Keep `[tool.poetry] package-mode = false` in `pyproject.toml`.
- Store notebooks and their small, local helper scripts under `notebooks/`.
- Keep `poetry.lock` synchronized with `pyproject.toml`; never discard unrelated user changes.

## Commands

```sh
poetry install
poetry run jupyter lab
poetry run python notebooks/fuzzy_logic_plot.py
poetry run pre-commit install
poetry run pre-commit run --all-files
poetry check --lock
```

If Poetry cannot write to its user cache while locking:

```sh
POETRY_CACHE_DIR=/private/tmp/poetry-cache POETRY_VIRTUALENVS_IN_PROJECT=true poetry lock
```

## Dependencies

- Add runtime notebook dependencies to `[project] dependencies` in `pyproject.toml`, then update `poetry.lock`.
- Keep development-only tools in `[dependency-groups].dev`.

## Notebook Standard

- Preserve this sequence unless the user requests otherwise: `# Year Topic`, `## High-Level Ideas`, one or more `## Example: ...` sections, then `## Why This Mattered`.
- Introduce the topic in AI history, explain concepts before code, keep demonstrations reproducible, and close with concise historical significance.
- Add concise teaching comments to notebook code and referenced helpers, including embedded languages such as Prolog. Explain algorithmic intent, state changes, non-obvious math or transformations, and verification—not obvious syntax.
- Prefer deterministic code cells and checked-in helpers over hidden manual state. The pre-commit hook executes every notebook, saves outputs, and removes volatile timing and interpreter-version metadata; a second run must be clean.
- Avoid whole-notebook rewrites unless content changed. Never commit `.ipynb_checkpoints/`.

## Git

- Before editing, run `git status --short`; preserve unrelated changes and keep edits scoped.
- Use Conventional Commits for commit and PR titles with short imperative descriptions. Choose accurate user-facing types such as `feat`, `fix`, `perf`, `docs`, `fix(security)`, and dependency `build(deps)` or `chore(deps)`.
- End commit messages and PR descriptions, after a blank line, with `Assisted-by: <AI model> <version>` using the actual model.
