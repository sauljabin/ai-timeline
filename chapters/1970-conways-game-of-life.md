---
kernelspec:
  name: python3
  display_name: Python 3
---

# 1970 Conway's Game of Life

The Game of Life is a grid of cells that live or die by four simple rules. After you choose the starting cells, nobody plays: the rules alone decide everything that happens. The mathematician John Conway invented it in 1970, and Martin Gardner published it in his "Mathematical Games" column in *Scientific American* that October. Life is not an AI algorithm. It is on this timeline because it shows how complex, organized behavior can come from a few local rules with no central controller, an idea that later shaped artificial life and the study of emergent computation.

## High-Level Ideas

The world is a grid of square cells. Each cell is *alive* or *dead*. Its eight surrounding cells are its neighbors. All cells update at the same time, once per generation, using four rules:

1. A live cell with fewer than two live neighbors dies (underpopulation).
2. A live cell with two or three live neighbors survives.
3. A live cell with more than three live neighbors dies (overpopulation).
4. A dead cell with exactly three live neighbors becomes alive (birth).

Take three live cells in a horizontal row. The middle cell has two live neighbors, so it survives. The two end cells have one live neighbor each, so they die. The dead cells directly above and below the middle each touch all three live cells, so they are born. The row becomes a vertical column, and one generation later it is a row again. This pattern is called a *blinker*.

Nobody wrote "flip between a row and a column" into the rules. That behavior comes from the local rules, and the general name for behavior like this is *emergence*. Life is full of it: some patterns never change, some repeat (oscillators), and some travel across the grid (spaceships).

## Example: The Rules in Python

The code stores only the live cells, as a set of `(x, y)` coordinates. The grid has no edges: coordinates can grow in any direction, which matches Conway's original infinite plane.

To build the next generation, the code counts how many live neighbors every candidate cell has. Only cells next to a live cell can have a nonzero count, so those are the only candidates that need checking.

```{code-cell} python
from collections import Counter

# The eight offsets that lead from a cell to its neighbors.
NEIGHBOR_OFFSETS = [
    (x_offset, y_offset)
    for y_offset in (-1, 0, 1)
    for x_offset in (-1, 0, 1)
    if (x_offset, y_offset) != (0, 0)
]


def next_generation(live_cells):
    # Every live cell adds 1 to each of its eight neighbors' counts.
    # Dead cells next to life get counted too, so births are found here.
    neighbor_counts = Counter(
        (x + x_offset, y + y_offset)
        for x, y in live_cells
        for x_offset, y_offset in NEIGHBOR_OFFSETS
    )

    # Rule 4 (birth) and rule 2 (survival) are the only ways to be alive next.
    # Rules 1 and 3 need no code: those cells are simply left out.
    return {
        cell
        for cell, live_neighbors in neighbor_counts.items()
        if live_neighbors == 3 or (live_neighbors == 2 and cell in live_cells)
    }
```

```{code-cell} python
:tags: [remove-cell]
def render(live_cells, width, height):
    # Draw a window of the infinite plane as text: █ is alive, · is dead.
    return "\n".join(
        "".join("█" if (x, y) in live_cells else "·" for x in range(width))
        for y in range(height)
    )
```

The blinker from the section above, as code:

```{code-cell} python
blinker = {(1, 2), (2, 2), (3, 2)}
vertical_blinker = next_generation(blinker)

print("Generation 0")
print(render(blinker, width=5, height=5))
print("\nGeneration 1")
print(render(vertical_blinker, width=5, height=5))

# Check the exact cells, not only the picture:
# a column at x = 2, then back to the row.
assert vertical_blinker == {(2, 1), (2, 2), (2, 3)}
assert next_generation(vertical_blinker) == blinker
```

A *glider* has five cells. After four generations it has the same shape again, moved one cell right and one cell down. It is the smallest spaceship in Life.

```{code-cell} python
glider = {(1, 0), (2, 1), (0, 2), (1, 2), (2, 2)}

generations = [glider]
for _ in range(4):
    generations.append(next_generation(generations[-1]))

for number, cells in enumerate(generations):
    print(f"Generation {number}")
    print(render(cells, width=6, height=6), end="\n\n")

# Generation 4 is generation 0 shifted by (+1, +1).
assert generations[4] == {(x + 1, y + 1) for x, y in glider}
```

## Example: Five Cells, 1,103 Generations

Small starts can take a long time to settle. The *R-pentomino* has five cells. The code below runs it on the infinite plane and records the population (the number of live cells) of every generation.

```{code-cell} python
r_pentomino = {(1, 0), (2, 0), (0, 1), (1, 1), (1, 2)}

populations = [len(r_pentomino)]
cells = r_pentomino
for generation in range(1, 1301):
    cells = next_generation(cells)
    populations.append(len(cells))
    if generation == 1103:
        cells_at_1103 = cells

# The last generation whose population differs from the one before it.
last_change = max(
    generation
    for generation in range(1, len(populations))
    if populations[generation] != populations[generation - 1]
)

for generation in (0, 100, 500, 1000):
    print(f"Generation {generation:>4}: population {populations[generation]}")
largest = max(populations)
print(f"Largest population: {largest}, "
      f"at generation {populations.index(largest)}")
print(f"The population stops changing at generation {last_change}, "
      f"with {populations[last_change]} cells.")

# Checked up to generation 1,300: nothing changes after 1,103.
assert last_change == 1103
assert populations[last_change] == 116


def width(cells):
    xs = [x for x, _ in cells]
    return max(xs) - min(xs) + 1


print(f"Width of the pattern: {width(cells_at_1103)} cells at generation "
      f"1,103, {width(cells)} cells at generation 1,300.")
assert width(cells) > width(cells_at_1103)
```

From generation 1,103 to 1,300, where this run stops, the population stays at 116, yet the pattern keeps getting wider. Something is still moving: some of those cells are gliders flying away forever, which is possible only because the plane has no edges.

## Example: A Gun That Builds Gliders

Conway asked whether any pattern can grow forever and offered a $50 prize for an answer. In November 1970 a team led by Bill Gosper found the *glider gun*: a pattern that returns to its own shape every 30 generations and leaves one new glider behind each time.

The pattern below is written as a picture, where `O` is a live cell. The code runs it for 30 generations and checks Gosper's claim. A helper turns the picture into coordinates, and `is_glider` checks that a set of cells moves one cell diagonally in 4 generations.

```{code-cell} python
:tags: [remove-cell]
def parse_pattern(picture):
    # Each text row is one grid row; "O" marks a live cell.
    rows = picture.strip().splitlines()
    return {
        (x, y)
        for y, row in enumerate(rows)
        for x, character in enumerate(row)
        if character == "O"
    }


def is_glider(cells):
    # A glider is back in its own shape after 4 generations,
    # one cell diagonally away.
    later = cells
    for _ in range(4):
        later = next_generation(later)
    return any(
        later == {(x + dx, y + dy) for x, y in cells}
        for dx in (-1, 1)
        for dy in (-1, 1)
    )
```

```{code-cell} python
gosper_glider_gun = parse_pattern("""
........................O...........
......................O.O...........
............OO......OO............OO
...........O...O....OO............OO
OO........O.....O...OO..............
OO........O...O.OO....O.O...........
..........O.....O.......O...........
...........O...O....................
............OO......................
""")

after_30 = gosper_glider_gun
for _ in range(30):
    after_30 = next_generation(after_30)

new_cells = after_30 - gosper_glider_gun

print(f"Gun cells: {len(gosper_glider_gun)}")
print(f"After 30 generations: {len(after_30)} cells")
print(f"Every original cell is back: {gosper_glider_gun <= after_30}")
print(f"The {len(new_cells)} new cells form a glider: {is_glider(new_cells)}")

assert gosper_glider_gun <= after_30
assert len(new_cells) == 5 and is_glider(new_cells)
```

The gun adds one glider every 30 generations, so the population grows without limit. That answered Conway's question.

## Example: Play With the Board

A screen cannot show an infinite plane, so the board below *wraps around*: the right edge touches the left edge, and the bottom touches the top (the surface of a donut, or torus). The rules are the same. Only the neighbor coordinates change, using the remainder after division (`%`).

```{code-cell} python
def next_generation_on_torus(live_cells, width, height):
    # Same counting as before; % width and % height wrap coordinates
    # around the edges.
    neighbor_counts = Counter(
        ((x + x_offset) % width, (y + y_offset) % height)
        for x, y in live_cells
        for x_offset, y_offset in NEIGHBOR_OFFSETS
    )
    return {
        cell
        for cell, live_neighbors in neighbor_counts.items()
        if live_neighbors == 3 or (live_neighbors == 2 and cell in live_cells)
    }


# On a 12 x 12 torus a glider moves 1 cell per 4 generations,
# so after 12 * 4 = 48 generations it is back where it started.
cells = glider
for generation in range(1, 49):
    cells = next_generation_on_torus(cells, width=12, height=12)
    if generation == 24:
        halfway = cells

assert halfway == {((x + 6) % 12, (y + 6) % 12) for x, y in glider}
assert cells == glider
print("On a 12 x 12 torus the glider is back home after 48 generations.")
```

The board at the end of this section runs the same `next_generation_on_torus` rules in your browser.

```{code-cell} python
:tags: [remove-cell]
import json
import random
from pathlib import Path

BOARD_WIDTH, BOARD_HEIGHT = 64, 40


def place(cells, left, top):
    return {(x + left, y + top) for x, y in cells}


pulsar = parse_pattern("""
..OOO...OOO..
.............
O....O.O....O
O....O.O....O
O....O.O....O
..OOO...OOO..
.............
..OOO...OOO..
O....O.O....O
O....O.O....O
O....O.O....O
.............
..OOO...OOO..
""")

# Pulsar is an oscillator: generation 3 equals generation 0, generations 1 and 2 differ.
pulsar_1 = next_generation(pulsar)
pulsar_2 = next_generation(pulsar_1)
assert next_generation(pulsar_2) == pulsar and pulsar not in (pulsar_1, pulsar_2)

presets = [
    ("Glider", "Five cells that travel diagonally, one cell every 4 generations.", place(glider, 4, 4)),
    ("Pulsar", "An oscillator that repeats every 3 generations.", place(pulsar, 25, 13)),
    ("Gosper glider gun", "Fires a new glider every 30 generations.", place(gosper_glider_gun, 2, 2)),
    ("R-pentomino", "Five cells with a long, chaotic history.", place(r_pentomino, 31, 19)),
]

# A fixed seed makes this random test pattern the same on every build.
soup_generator = random.Random(1970)
random_soup = {
    (x, y)
    for y in range(BOARD_HEIGHT)
    for x in range(BOARD_WIDTH)
    if soup_generator.random() < 0.3
}


def run_on_board(cells, generations):
    history = [cells]
    for _ in range(generations):
        history.append(next_generation_on_torus(history[-1], BOARD_WIDTH, BOARD_HEIGHT))
    return history


def to_json_cells(cells):
    return sorted([x, y] for x, y in cells)


data_directory = Path("../widgets/data")
data_directory.mkdir(parents=True, exist_ok=True)

board = {
    "width": BOARD_WIDTH,
    "height": BOARD_HEIGHT,
    "presets": [
        {"name": name, "description": description, "cells": to_json_cells(cells)}
        for name, description, cells in presets
    ],
}
reference = {
    "width": BOARD_WIDTH,
    "height": BOARD_HEIGHT,
    "runs": [
        {"name": name, "generations": [to_json_cells(state) for state in run_on_board(cells, 100)]}
        for name, cells in [(name, cells) for name, _, cells in presets] + [("Random soup", random_soup)]
    ],
}
(data_directory / "game-of-life-board.json").write_text(json.dumps(board))
(data_directory / "game-of-life-reference.json").write_text(json.dumps(reference))

for run in reference["runs"]:
    print(f"{run['name']:>17}: {len(run['generations'][0]):>4} cells at generation 0, "
          f"{len(run['generations'][-1]):>4} at generation 100")
```

Wrapping changes what patterns do over time, because gliders that would fly away forever come back around. Here is what happens to two of the board's patterns on the wrapped board:

```{code-cell} python
:tags: [remove-input]
board_patterns = {name: cells for name, _, cells in presets}

# Every 30 generations an intact gun is back in its original shape (plus gliders).
cells = board_patterns["Gosper glider gun"]
gun_broken_at = None
for generation in range(1, 3001):
    cells = next_generation_on_torus(cells, BOARD_WIDTH, BOARD_HEIGHT)
    if generation % 30 == 0 and not board_patterns["Gosper glider gun"] <= cells:
        gun_broken_at = generation
        break

# Same population check as on the infinite plane, run for 3,000 generations.
cells = board_patterns["R-pentomino"]
board_populations = [len(cells)]
for _ in range(3000):
    cells = next_generation_on_torus(cells, BOARD_WIDTH, BOARD_HEIGHT)
    board_populations.append(len(cells))
board_last_change = max(
    generation
    for generation in range(1, len(board_populations))
    if board_populations[generation] != board_populations[generation - 1]
)

print(f"Gosper glider gun: at generation {gun_broken_at} it is no longer intact; "
      f"returning gliders have hit it.")
print(f"R-pentomino: the population stops changing at generation {board_last_change}, "
      f"with {board_populations[board_last_change]} cells "
      f"(on the infinite plane: generation {last_change}, with {populations[last_change]} cells).")

assert gun_broken_at == 300
assert (board_last_change, board_populations[board_last_change]) == (388, 46)
```

Click or drag on the board to draw cells. Press **Play**, or move one generation at a time with the step buttons. When **Show changes** is on, paler cells were just born and cells outlined in orange just died, which makes the four rules visible step by step.

```{anywidget} ../widgets/game-of-life.mjs
{ "data": "game-of-life-board.json" }
```

The code that runs this panel is in [chapters/1970-conways-game-of-life.md](https://github.com/sauljabin/ai-timeline-notebook/blob/main/chapters/1970-conways-game-of-life.md).

## Why This Mattered

Life showed that a tiny set of deterministic rules can produce behavior that is hard to predict even when you know every rule. Conway sketched a proof that Life can compute anything a computer can (it is *Turing complete*), published in *Winning Ways* (1982), and Paul Rendell later built a working Turing machine out of Life patterns. Researchers in artificial life, complex systems, and distributed computing kept returning to the same question Life raises: how much organized behavior can grow from simple parts that only see their neighbors?

## Sources

- Martin Gardner, "Mathematical Games: The fantastic combinations of John Conway's new solitaire game 'life'", *Scientific American* 223(4), October 1970, pp. 120–123.
- Elwyn Berlekamp, John Conway, and Richard Guy, *Winning Ways for Your Mathematical Plays*, vol. 2, chapter 25 "What is Life?", Academic Press, 1982.
- Paul Rendell, "Turing Universality of the Game of Life", in Andrew Adamatzky (ed.), *Collision-Based Computing*, Springer, 2002.
