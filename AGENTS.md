# AGENTS.md

Guidance for coding agents working in this repository.

## Project

- This repository builds a static teaching website about the history of AI, published on GitHub Pages. It is not an installable package.
- Readers are web readers. Prioritize clear explanations, approachable examples, and visible learning steps over production-oriented abstraction or optimization.
- Be rigorous: everything the site shows must be runnable, reproducible, and real. Every number or claim in the prose must be computed by the chapter's code, checked with an `assert`, or cited to a source.
- Keep `[tool.poetry] package-mode = false` in `pyproject.toml`.
- Chapters live in `chapters/` as MyST Markdown (`.md` with `{code-cell}` blocks). Small files a chapter needs, such as `family.pl`, live next to it.
- Interactive widgets live in `widgets/`. See [Widgets](#widgets).
- Keep `poetry.lock` synchronized with `pyproject.toml`; never discard unrelated user changes.

## Commands

```sh
poetry install
poetry run python scripts/build_site.py
python3 -m http.server 8000 --directory _build/html
poetry run pre-commit install
poetry run pre-commit run --all-files
poetry check --lock
```

`scripts/build_site.py` checks that shown code lines are at most 79 characters, deletes old output, runs every chapter with `--strict` (any failing cell fails the build), runs `node --test widgets/tests`, and copies `widgets/` into `_build/html`. `jupyter book start` does not load widgets.

If Poetry cannot write to its user cache while locking:

```sh
POETRY_CACHE_DIR=/private/tmp/poetry-cache POETRY_VIRTUALENVS_IN_PROJECT=true poetry lock
```

## Dependencies

- Python is pinned to 3.14 (`.python-version` and `requires-python`), because seeded `random.choice`, `sample`, and `randint` are not guaranteed to give the same results across Python versions.
- Add runtime dependencies to `[project] dependencies` in `pyproject.toml`, then update `poetry.lock`.
- Keep development-only tools in `[dependency-groups].dev`.
- Widgets use plain JavaScript modules with no npm dependencies or build step.

## Chapter Standard

- Keep this sequence unless the user asks otherwise: `# Year Topic`, `## High-Level Ideas`, one or more `## Example: ...` sections, `## Why This Mattered`, then `## How This Differs from the Original` (when the code simplifies the historical work) and `## Sources` (primary sources first).
- Teach visually first. Every chapter has at least one interactive panel that animates or lets the reader try the idea (see [Widgets](#widgets)).
- Write with the explain-simply style: open with what the idea is, give one concrete example with real numbers before naming terms, plain words, no em dashes. Introduce terms in *italics*; use bold only for button names or one must-not-miss phrase per section.
- Introduce the topic in AI history, explain concepts before code, and give credit to earlier work when the famous date is not the first one.
- Show only the code a reader needs to understand the idea. Plumbing (saving widget data, drawing helpers, file handling) still runs and is checked, but goes in cells tagged `:tags: [remove-cell]` (no output needed) or `:tags: [remove-input]` (output only). Under each panel, add one line: "The code that runs this panel is in [chapters/<file>](GitHub link)." Do not call code "hidden", and do not tell readers the site is real or tested; they assume it.
- Keep every shown code line at most 79 characters (the build fails otherwise), and put one equation per display formula, so nothing scrolls sideways on desktop.
- Show limits honestly: seed sensitivity, baselines, and tests on data the model has not seen.
- Add concise teaching comments to chapter code and helpers, including embedded languages such as Prolog. Explain algorithmic intent, state changes, non-obvious math, and verification, not obvious syntax.
- Make code deterministic: fixed seeds, no hidden state, no silent fallbacks that let the build pass while an example did not run. Do not print absolute paths or other machine-specific output.
- Never commit `.ipynb_checkpoints/`, `_build/`, or `widgets/data/`.

## Widgets

- A widget is an [anywidget](https://anywidget.dev) ES module embedded with ```` ```{anywidget} ../widgets/<name>.mjs ````. Its body passes the data file name, for example `{ "data": "xor-training.json" }`.
- Every frame shows a state the algorithm actually reached. Either replay data recorded by the chapter's Python code, or run a JavaScript copy of the algorithm in `widgets/shared/`. Do not tween between recorded states.
- Every JavaScript copy needs a test in `widgets/tests/` that compares it with reference results the chapter's Python code writes to `widgets/data/`.
- Import shared code with `../widgets/shared/<file>.js` from entry modules: the build serves entry modules from `build/`, so this path works both in the repository and on the site.
- Use `createPanel`, `Transport`, and the color helpers in `widgets/shared/ui.js`, so all widgets share one style: same controls, blue for positive or "on", orange for negative or "off", light and dark themes, and no autoplay when the reader prefers reduced motion.

## Git

- Before editing, run `git status --short`; preserve unrelated changes and keep edits scoped.
- Use Conventional Commits for commit and PR titles with short imperative descriptions. Choose accurate user-facing types such as `feat`, `fix`, `perf`, `docs`, `fix(security)`, and dependency `build(deps)` or `chore(deps)`.
- End commit messages (not PR descriptions or other files), after a blank line, with `Assisted-by: <AI model> <version>` using the actual model.
