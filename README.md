# ai-timeline-notebook

Jupyter notebooks for the history of AI.

## Notebooks

This project has 5 notebooks:

- [1957 Perceptron](notebooks/1957-perceptron.ipynb): single-layer perceptron examples for the `AND` and `OR` logic gates.
- [1965 Fuzzy Logic](notebooks/1965-fuzzy-logic.ipynb): fuzzy set membership, rule-based inference, and a fan-speed controller example with a plotted graph.
- [1972 Prolog](notebooks/1972-prolog.ipynb): family-tree facts, rules, recursive ancestors, and PySwip queries.
- [1975 Genetic Algorithms](notebooks/1975-genetic-algorithms.ipynb): evolutionary search with fitness, selection, crossover, and mutation over a small knapsack packing problem.
- [1986 Backpropagation](notebooks/1986-backpropagation.ipynb): multilayer perceptron training with backpropagation for the `XOR` logic gate.

## Setup

Install dependencies with Poetry:

```sh
poetry install
```

Install the Git hooks:

```sh
poetry run pre-commit install
```

The pre-commit hook executes every notebook and saves deterministic outputs. It removes execution timestamps and interpreter-version metadata so rerunning unchanged notebooks does not produce metadata-only diffs. Run it manually with:

```sh
poetry run pre-commit run --all-files
```

Launch JupyterLab:

```sh
poetry run jupyter lab
```

Run Jupyter Book website:

```sh
poetry run jupyter book start
```

Build the notebooks as a Jupyter Book website:

```sh
poetry run jupyter book build --html
```

The book structure is configured in `myst.yml`, with this README as the opening page and the notebooks listed in historical order.

## AI Assistance

This project was created with AI-assisted development using OpenAI Codex powered by GPT-5.
