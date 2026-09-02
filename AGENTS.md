# AGENTS.md

Guidance for future coding agents working in this repository.

## Project Shape

- This is a Python Jupyter notebook project for AI history examples.
- Treat the repository as notebook-first, not as an installable Python package.
- Keep `pyproject.toml` configured for environment management with `[tool.poetry] package-mode = false`.
- Current notebook sources live under `notebooks/`.
- `poetry.lock` is committed and should stay in sync with `pyproject.toml`.

## Setup

Use Poetry for the project environment:

```sh
poetry install
```

Launch JupyterLab through Poetry:

```sh
poetry run jupyter lab
```

Run Python scripts through Poetry when possible:

```sh
poetry run python notebooks/fuzzy_logic_plot.py
```

Install and run the repository's pre-commit hooks through Poetry:

```sh
poetry run pre-commit install
poetry run pre-commit run --all-files
```

## Dependency Changes

- Add runtime notebook dependencies to the `[project] dependencies` list in `pyproject.toml`.
- After changing dependencies, update `poetry.lock`.
- If `poetry lock` fails because Poetry tries to write to an unwritable user cache, use:

```sh
POETRY_CACHE_DIR=/private/tmp/poetry-cache POETRY_VIRTUALENVS_IN_PROJECT=true poetry lock
```

- Verify Poetry metadata and lock consistency with:

```sh
poetry check --lock
```

## Notebook Work

- Avoid rewriting whole `.ipynb` files unless the notebook content genuinely changed.
- Keep generated checkpoint files out of commits; `.ipynb_checkpoints/` is ignored.
- Keep notebook helper code small and local unless a repeated pattern clearly needs extraction.
- If adding plots or deterministic examples, prefer reproducible code cells and checked-in helper scripts over hidden manual state.
- The pre-commit hook executes all notebooks, saves their outputs, and removes volatile execution timestamps and interpreter-version metadata. Keep notebook outputs deterministic so a second hook run is clean.
- Keep notebooks standardized around this structure:

```text
# Year Topic
## High-Level Ideas
## Example: ...
## Why This Mattered
```

- The opening title cell should name the year and topic, then briefly place the topic in AI history.
- `## High-Level Ideas` should explain the core concepts and vocabulary before code.
- `## Example: ...` sections should contain the runnable demonstration or worked example. Use multiple example sections when the notebook naturally has more than one demonstration, such as a controller and a plot.
- `## Why This Mattered` should close the notebook with concise historical significance.
- Preserve this structure when adding or revising notebooks unless the user explicitly asks for a different format.

## Git Hygiene

- Before editing, check `git status --short` and preserve unrelated user changes.
- Do not delete or revert existing notebook edits unless the user explicitly asks.
- Keep changes scoped; this repo is intentionally small.
- Use Conventional Commits for commit and PR titles, with short imperative descriptions. Release notes derive from squash titles; use accurate user-facing types such as `feat`, `fix`, `perf`, `docs`, `fix(security)`, and dependency `build(deps)` or `chore(deps)`.
- End commit messages and PR descriptions with `Assisted-by: <AI model> <version>` after a blank line, using the actual model.
