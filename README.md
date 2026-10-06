# ai-timeline

AI Timeline is a free website that teaches the history of artificial intelligence by running it. Each chapter takes one milestone, such as the perceptron of 1957 or backpropagation in 1986, explains the idea in plain language, and runs a small working version in Python. The site is published at <https://sauljabin.github.io/ai-timeline/>.

## What This Is

The site is for curious readers who want to see how AI ideas actually work, not only read about them. You need no AI background. Reading the Python code helps, but every chapter explains its ideas in words and pictures first.

Every chapter has the same parts:

1. The idea, explained with one concrete example and real numbers.
2. Short Python code that runs the idea, with its real output.
3. An interactive panel that animates the idea: training a network, evolving a population, searching for a proof.
4. Why the idea mattered, how this version differs from the original, and the primary sources.

## Chapters

| Year | Chapter |
| --- | --- |
| 1957 | [Perceptron](chapters/1957-perceptron.md): a single neuron learns `AND` and `OR`, and cannot learn `XOR`. |
| 1965 | [Fuzzy logic](chapters/1965-fuzzy-logic.md): fuzzy sets and a fan-speed controller. |
| 1970 | [Conway's Game of Life](chapters/1970-conways-game-of-life.md): rules, famous patterns, and a live board. |
| 1972 | [Prolog](chapters/1972-prolog.md): facts, rules, queries, search trees, and how statement order changes the search. |
| 1975 | [Genetic algorithms](chapters/1975-genetic-algorithms.md): a 30-item knapsack, checked against the exact answer and random search. |
| 1986 | [Backpropagation](chapters/1986-backpropagation.md): one training step in slow motion, XOR training replay, and a live digit reader. |
| 1991 | [Ant colony optimization](chapters/1991-ant-colony-optimization.md): the double bridge model and Ant System on the 51-city `eil51` problem. |
| 1995 | [Wasp nest building](chapters/1995-wasp-nest-building.md): lattice swarms that build a nest from local rules, and why coordination matters. |

## How the site is checked

Chapters are [MyST Markdown](https://mystmd.org) pages built with [Jupyter Book](https://jupyterbook.org). `scripts/build_site.py` does five things, in order:

1. Checks that every line of code shown on the site is at most 79 characters, so it fits the page column.
2. Deletes the previous build and the widget data.
3. Builds the site. This runs every code cell, and a failing cell, such as a failed `assert`, stops the build. The chapters' code also writes the data the widgets use to `widgets/data/`.
4. Runs `node --test widgets/tests`. The tests check that the widgets' JavaScript copies of the algorithms give the same results as the Python code.
5. Copies `widgets/` into the built site.

Each widget either replays data the Python code recorded or runs one of those tested JavaScript copies.

## Setup

You need [Poetry](https://python-poetry.org), Python 3.14, Node.js 24 or newer, and [SWI-Prolog](https://www.swi-prolog.org/download/stable) (the Prolog chapter's runtime).

```sh
poetry install
poetry run pre-commit install
```

The pre-commit hook runs the full build when chapters, widgets, or dependencies change.

## Build and preview the site

```sh
poetry run python scripts/build_site.py
```

```sh
python3 -m http.server 8000 --directory _build/html
```

Then open <http://localhost:8000>.

`jupyter book start` does not copy `widgets/` into the site, so the interactive panels do not load there. Use the build script instead.

## Publishing

`.github/workflows/site.yml` builds the site on every push and pull request. Pushes to `main` also deploy it to GitHub Pages. In the repository settings, set **Pages → Source** to **GitHub Actions**.

## AI Assistance

This project was developed with AI assistance.
