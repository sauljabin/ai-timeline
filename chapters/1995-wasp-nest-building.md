---
kernelspec:
  name: python3
  display_name: Python 3
---

# 1995 Wasp Nest Building

A swarm of simple agents can build a complex structure with no plan, no leader, and no messages, if each agent follows local rules of the form "if the bricks around me look like this, add that brick here". In 1995 Guy Theraulaz and Eric Bonabeau showed that agents wandering at random on a 3D grid, each following such rules, build structures that look strikingly like the nests of particular wasp species. They called the model *lattice swarms*.

## High-Level Ideas

A paper wasp nest is made of *combs*, flat plates of six-sided cells where the young grow, joined by short stalks called *pedicels*. Nests of the hornet genus *Vespa* stack several combs, one under another, each hanging from the comb above. How do insects with tiny brains build such regular shapes?

One old idea, which W. H. Thorpe described in 1963, is that each wasp carries a mental *blueprint* of the nest and compares it with what has been built. In 1978 A. P. Smith tested this with a mud wasp, *Paralastor*. He changed nests while they were being built, and the wasps skipped some stages or repeated others depending on what they found. They were not following a stored plan. They were reacting to the structure in front of them, and each finished part became the signal for the next step.

Building that way is a form of *stigmergy*, coordination through changes left in the shared environment, the term Pierre-Paul Grassé coined in 1959 for termite building. The [1991 ant colony chapter](1991-ant-colony-optimization.md) shows the *quantitative* kind: ants react to how much pheromone a path has. Wasps show the *qualitative* kind: they react to which shape is there, and different local shapes trigger different actions.

The lattice swarm model turns this into an algorithm:

1. Space is a 3D grid of cubes. Each cube is empty or holds a brick of a few types.
2. Agents fly from cube to cube at random.
3. At each empty cube, an agent looks at the 26 cubes around it. If that pattern exactly matches one of its rules, it adds the rule's brick in the cube.

A nest grows from a single starting brick, one rule match at a time. Theraulaz and Bonabeau found that most random rule sets produce shapeless clumps. The interesting ones are *coordinated*: each stage of the building creates the exact pattern that triggers the next stage, and nothing else. A coordinated rule set builds the same architecture every time, even though the agents move at random.

## Example: Rules as Code

This page uses three brick types: *cells* of the inner comb, *rim* cells around them, and *pedicels*. A rule lists the neighboring cubes that must hold bricks, as offsets `(dx, dy, dz)` from the agent's cube, where `dz = 1` is the layer above. Every other neighboring cube must be empty. The rules describe one side of the comb; turning each rule by 90°, three times, covers the other sides.

```{code-cell} python
from itertools import product

CELL, PEDICEL, RIM = 1, 2, 3
NAMES = {CELL: "cell", PEDICEL: "pedicel", RIM: "rim"}

ABOVE = 1  # dz = 1: the layer above the agent
RULES = [
    # A comb starts under a pedicel.
    ({(0, 0, ABOVE): PEDICEL}, CELL),
    # The four cells beside the first one, with 0, 1, or 2 of the
    # others already in place. The pedicel is diagonally above.
    ({(-1, 0, 0): CELL, (-1, 0, ABOVE): PEDICEL}, CELL),
    ({(-1, 0, 0): CELL, (-1, 0, ABOVE): PEDICEL, (-1, 1, 0): CELL}, CELL),
    ({(-1, 0, 0): CELL, (-1, 0, ABOVE): PEDICEL, (-1, -1, 0): CELL}, CELL),
    ({(-1, 0, 0): CELL, (-1, 0, ABOVE): PEDICEL,
      (-1, 1, 0): CELL, (-1, -1, 0): CELL}, CELL),
    # A corner of the 3 x 3 inner comb, once both of its sides exist.
    ({(-1, -1, 0): CELL, (0, -1, 0): CELL, (-1, 0, 0): CELL,
      (-1, -1, ABOVE): PEDICEL}, CELL),
    # The rim: the ring of 16 cubes around the inner comb.
    ({(-1, -1, 0): CELL, (-1, 0, 0): CELL, (-1, 1, 0): CELL}, RIM),
    ({(0, -1, 0): RIM, (-1, -1, 0): CELL, (-1, 0, 0): CELL}, RIM),
    ({(0, -1, 0): RIM, (-1, -1, 0): CELL, (-1, 0, 0): CELL,
      (-1, 1, 0): RIM}, RIM),
    # Mirror images of the two rules above; turning never produces them.
    ({(0, 1, 0): RIM, (-1, 1, 0): CELL, (-1, 0, 0): CELL}, RIM),
    ({(0, 1, 0): RIM, (-1, 1, 0): CELL, (-1, 0, 0): CELL,
      (-1, -1, 0): RIM}, RIM),
    # A rim corner, between two rim cells.
    ({(-1, -1, 0): CELL, (-1, 0, 0): RIM, (0, -1, 0): RIM}, RIM),
    # A new pedicel hangs from the middle of a finished 3 x 3 inner comb.
    ({(dx, dy, ABOVE): CELL for dx in (-1, 0, 1) for dy in (-1, 0, 1)},
     PEDICEL),
]

# The 26 neighbors, always listed in the same order.
NEIGHBORS = [d for d in product((-1, 0, 1), repeat=3) if d != (0, 0, 0)]


def turn(offset):
    # 90 degrees around the vertical axis.
    dx, dy, dz = offset
    return (-dy, dx, dz)


def compile_rules(rules):
    # Each pattern of 26 neighbor states maps to the brick to add.
    table = {}
    for occupied, brick in rules:
        for _ in range(4):
            pattern = tuple(occupied.get(d, 0) for d in NEIGHBORS)
            assert table.get(pattern, brick) == brick, "two rules disagree"
            table[pattern] = brick
            occupied = {turn(d): b for d, b in occupied.items()}
    return table


TABLE = compile_rules(RULES)
print(f"{len(RULES)} rules, {len(TABLE)} patterns after turning")
```

The last rule is what makes the set coordinated. A new pedicel needs the whole 3 × 3 inner comb above it, so it cannot start until that comb is done.

## Example: Building a Nest

The world below is 15 × 15 cubes wide and 14 layers tall. A single pedicel hangs from the middle of the top layer, and 60 agents start in random cubes. At each step every agent moves to one of the six cubes next to it, then checks the rules.

```{code-cell} python
import random

MOVES = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]


def build(table, seed, width=15, height=14, agents=60, steps=8000,
          on_step=None):
    rng = random.Random(seed)
    bricks = {(width // 2, width // 2, height - 1): PEDICEL}
    log = []  # (step, cube, brick) for every brick added

    def inside(x, y, z):
        return 0 <= x < width and 0 <= y < width and 0 <= z < height

    walkers = [(rng.randrange(width), rng.randrange(width),
                rng.randrange(height)) for _ in range(agents)]
    for step in range(steps):
        for k, (x, y, z) in enumerate(walkers):
            dx, dy, dz = MOVES[rng.randrange(6)]
            if inside(x + dx, y + dy, z + dz):
                x, y, z = x + dx, y + dy, z + dz
            walkers[k] = (x, y, z)
            if (x, y, z) in bricks:
                continue
            # Look at the 26 neighbors; outside the world counts as empty.
            pattern = tuple(bricks.get((x + a, y + b, z + c), 0)
                            for a, b, c in NEIGHBORS)
            brick = table.get(pattern)
            if brick:
                bricks[(x, y, z)] = brick
                log.append((step, (x, y, z), brick))
        if on_step:
            on_step(step, walkers)
    return bricks, log


def describe(bricks):
    # Count comb bricks (cells and rim) on each layer, top to bottom.
    layers = sorted({z for _, _, z in bricks}, reverse=True)
    combs = [sum(1 for (_, _, z), b in bricks.items() if z == layer
                 and b != PEDICEL) for layer in layers]
    return [size for size in combs if size]


nests = {}
for seed in range(1, 6):
    bricks, log = build(TABLE, seed)
    nests[seed] = bricks
    print(f"seed {seed}: {len(bricks)} bricks, last one added at step "
          f"{log[-1][0]:,}, comb sizes {describe(bricks)}")

distinct = {frozenset(bricks.items()) for bricks in nests.values()}
print(f"\nAll five nests are identical: {len(distinct) == 1}")
```

```{code-cell} python
:tags: [remove-cell]
# The text below quotes these results.
assert len(distinct) == 1
assert len(nests[1]) == 182 and describe(nests[1]) == [25] * 7
```

Each run moves the agents differently, and the last brick lands at a different step, but all five nests are the same: 7 combs of 25 bricks, each hanging from a pedicel under the middle of the comb above, 182 bricks in all. The panel at the end of the next section replays this build.

```{code-cell} python
:tags: [remove-cell]
import json
from pathlib import Path

FRAME_EVERY = 25


def record(table, seed):
    frames = []

    def on_step(step, walkers):
        if step % FRAME_EVERY == 0:
            frames.append({"step": step, "agents": list(walkers)})

    bricks, log = build(table, seed, on_step=on_step)
    last = log[-1][0]
    return bricks, {
        "seed": seed,
        "bricks": [[*cube, brick, step] for step, cube, brick in log],
        "frames": [f for f in frames if f["step"] <= last + 2 * FRAME_EVERY],
    }
```

## Example: One Rule Too Many

Coordination is fragile. The next cell adds a single rule: a rim brick may start as soon as one inner cell is next to it. It sounds harmless, but now a rim brick can appear before the inner comb's corners, and the corner rule does not allow a rim brick in its view. Whether that happens depends on where the agents happen to fly.

```{code-cell} python
EAGER_RIM = ({(-1, 0, 0): CELL}, RIM)
EAGER_TABLE = compile_rules(RULES + [EAGER_RIM])

eager_nests = {}
for seed in range(1, 11):
    bricks, log = build(EAGER_TABLE, seed)
    eager_nests[seed] = bricks
    print(f"seed {seed:>2}: {len(bricks):>3} bricks, comb sizes "
          f"{describe(bricks)}")

shapes = {frozenset(b.items()) for b in eager_nests.values()}
print(f"\n{len(shapes)} different structures in 10 runs")
```

```{code-cell} python
:tags: [remove-cell]
assert len(shapes) == 4
assert all(len(describe(b)) == 1 and describe(b)[0] < 25 for b in eager_nests.values())

data_directory = Path("../widgets/data")
data_directory.mkdir(parents=True, exist_ok=True)
coordinated, coordinated_run = record(TABLE, 1)
eager, eager_run = record(EAGER_TABLE, 1)
assert coordinated == nests[1] and eager == eager_nests[1]  # same runs as above
(data_directory / "wasp-nest.json").write_text(json.dumps({
    "width": 15,
    "height": 14,
    "start": [15 // 2, 15 // 2, 14 - 1],  # the starting pedicel
    "names": NAMES,
    "rules": [[[list(d) + [b] for d, b in occupied.items()], brick]
              for occupied, brick in RULES],
    "eager_rule": [[list(d) + [b] for d, b in EAGER_RIM[0].items()], EAGER_RIM[1]],
    "runs": [
        {"name": "Coordinated rules", **coordinated_run},
        {"name": "One rule too many", **eager_run},
    ],
}))
```

In every run the colony stops inside the first comb, with 8 to 11 comb bricks, in 4 different broken shapes. One extra rule turned a reliable builder into one that depends on luck and always gets stuck. The panel replays both builds with seed 1: choose **Coordinated rules** or **One rule too many**, and turn the view to see the combs from other sides.

```{anywidget} ../widgets/wasp-nest.mjs
{ "data": "wasp-nest.json" }
```

The code that runs this panel is in [chapters/1995-wasp-nest-building.md](https://github.com/sauljabin/ai-timeline-notebook/blob/main/chapters/1995-wasp-nest-building.md).

## Why This Mattered

Lattice swarms showed that complex, species-specific architecture does not need a blueprint: local rules plus a shared, growing structure are enough, and the right rules make the result reliable. The idea moved into engineering as *collective construction*. In 2014 Justin Werfel, Kirstin Petersen, and Radhika Nagpal showed TERMES, a team of small climbing robots that build structures from blocks by following local rules, inspired by termites. Swarm robotics, self-assembly, and generative architecture all borrow the same principle.

## How This Differs from the Original

- Theraulaz and Bonabeau used rule sets found by exploring the space of possible rules, mostly on a hexagonal grid that resembles real comb cells. Their rule files are not freely available, so this page uses a rule set written for it on a cubic grid, as Bonabeau and colleagues did in 1994. It reproduces the Vespa-like design of stacked combs on single pedicels, not their exact nests.
- Each rule is used in four turned copies, the approach Marcin Pilat found necessary when he reimplemented lattice swarms in 2006; the mirrored rim rules are written out by hand.
- The agents and rules here are deterministic given a seed: each move is random, but the same seed always produces the same nest.

## Sources

- Pierre-Paul Grassé, "La reconstruction du nid et les coordinations interindividuelles chez *Bellicositermes natalensis* et *Cubitermes* sp. La théorie de la stigmergie", *Insectes Sociaux* 6, 1959, pp. 41–81.
- W. H. Thorpe, *Learning and Instinct in Animals*, Methuen, 1963.
- A. P. Smith, "An investigation of the mechanisms underlying nest construction in the mud wasp *Paralastor* sp. (Hymenoptera: Eumenidae)", *Animal Behaviour* 26, 1978, pp. 232–240.
- Eric Bonabeau, Guy Theraulaz, Eric Arpin, and Emmanuel Sardet, "The building behavior of lattice swarms", in *Artificial Life IV*, MIT Press, 1994, pp. 307–312.
- Guy Theraulaz and Eric Bonabeau, "Coordination in distributed building", *Science* 269, 1995, pp. 686–688.
- Guy Theraulaz and Eric Bonabeau, "Modelling the collective building of complex architectures in social insects with lattice swarms", *Journal of Theoretical Biology* 177, 1995, pp. 381–400.
- Eric Bonabeau, Marco Dorigo, and Guy Theraulaz, *Swarm Intelligence: From Natural to Artificial Systems*, Oxford University Press, 1999.
- Marcin L. Pilat, "Wasp-Inspired Construction Algorithms", University of Calgary, 2006, <http://hdl.handle.net/1880/46477>.
- Justin Werfel, Kirstin Petersen, and Radhika Nagpal, "Designing collective behavior in a termite-inspired robot construction team", *Science* 343, 2014, pp. 754–758.
