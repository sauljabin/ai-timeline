---
kernelspec:
  name: python3
  display_name: Python 3
---

# 1975 Genetic Algorithms

A genetic algorithm searches for good answers the way evolution improves a species: it keeps a population of candidate answers, lets the better ones have children, and mixes and mutates their features. John Holland, at the University of Michigan, described it in his 1975 book *Adaptation in Natural and Artificial Systems*. The same year his student Kenneth De Jong tested genetic algorithms on a set of standard optimization problems in his PhD thesis.

## High-Level Ideas

A genetic algorithm needs two things from the problem: a way to write a candidate answer as a string of genes, called its *chromosome*, and a score that says how good a candidate is, called its *fitness*. Then it repeats one cycle, called a *generation*:

1. Selection: pick parents, giving fitter candidates a better chance.
2. Crossover: build a child from the start of one parent's chromosome and the end of the other's.
3. Mutation: flip a few of the child's genes at random, so the search can reach options that neither parent had.

The children replace the old population, and the cycle repeats. A genetic algorithm does not guarantee the best answer. It is useful when the space of possible answers is too large to check completely, because it spends its effort around the best answers found so far.

## Example: Packing a Field Kit

A hiker can carry 40 kg and has 30 items to choose from. Each item has a weight and a value. The goal is the most valuable pack that is not too heavy. This is the *0/1 knapsack problem*.

```{code-cell} python
:tags: [remove-input]
ITEMS = [  # (name, weight in kg, value)
    ("water filter", 3, 10), ("first aid kit", 4, 9), ("radio", 5, 8), ("food pack", 6, 12),
    ("flashlight", 2, 6), ("battery pack", 3, 7), ("blanket", 4, 6), ("rope", 5, 7),
    ("map", 1, 4), ("jacket", 4, 8), ("compass", 1, 5), ("tent", 9, 14),
    ("stove", 5, 9), ("fuel can", 4, 5), ("knife", 1, 6), ("sleeping bag", 7, 11),
    ("water bottles", 4, 8), ("solar charger", 3, 6), ("tarp", 3, 5), ("whistle", 1, 2),
    ("sunscreen", 1, 3), ("binoculars", 3, 4), ("cooking pot", 3, 5), ("repair kit", 2, 5),
    ("rain poncho", 2, 4), ("camera", 2, 3), ("notebook", 1, 1), ("hand warmers", 1, 2),
    ("bear spray", 2, 6), ("trekking poles", 3, 4),
]
CAPACITY = 40

# Two columns: item, weight, value.
for row in range(0, len(ITEMS), 2):
    print("    ".join(f"{name:<15}{weight:>2} kg {value:>3}" for name, weight, value in ITEMS[row:row + 2]))
print(f"\n{len(ITEMS)} items, {sum(weight for _, weight, _ in ITEMS)} kg in total, capacity {CAPACITY} kg.")
```

Each item is either packed or not, so there are 2<sup>30</sup> = 1,073,741,824 possible packs. Trying them all is too slow in Python. For this problem an exact method exists, *dynamic programming*, which finds the best value without trying every pack. This page uses it only to grade the genetic algorithm.

```{code-cell} python
def best_value_exact(items, capacity):
    # best[limit] = the highest value that fits in `limit` kg,
    # using only the items seen so far.
    best = [0] * (capacity + 1)
    for _, weight, value in items:
        # Go from high limits to low, so each item is used at most once.
        for limit in range(capacity, weight - 1, -1):
            best[limit] = max(best[limit], best[limit - weight] + value)
    return best[capacity]


OPTIMUM = best_value_exact(ITEMS, CAPACITY)
print(f"Best possible value: {OPTIMUM}")
```

The genetic algorithm writes a pack as 30 genes, one per item, where `1` means packed. A pack that is too heavy gets fitness 0, which gives the search nothing to improve. That is why `random_pack` includes each item with only a 15% chance; the measurement after the code shows the difference this makes.

`evolve` runs the cycle from the start of this page with one addition: the best pack of each generation is copied unchanged into the next, so the best score never drops. This is called *elitism*.

```{code-cell} python
import random


def fitness(pack):
    chosen = [item for item, packed in zip(ITEMS, pack) if packed]
    weight = sum(item_weight for _, item_weight, _ in chosen)
    value = sum(item_value for _, _, item_value in chosen)
    return value if weight <= CAPACITY else 0


def random_pack(rng):
    return tuple(1 if rng.random() < 0.15 else 0 for _ in ITEMS)


def tournament(population, scores, rng):
    # Pick 3 packs at random; the fittest of them becomes a parent.
    contestants = rng.sample(range(len(population)), 3)
    return population[max(contestants, key=lambda index: scores[index])]


def crossover(mother, father, rng):
    # The start of one parent and the end of the other,
    # split at a random point.
    cut = rng.randint(1, len(mother) - 1)
    return mother[:cut] + father[cut:]


def mutate(pack, rng):
    # Each gene flips with chance 1/30, so about one flip per child.
    return tuple(
        1 - gene if rng.random() < 1 / len(pack) else gene for gene in pack
    )


def evolve(seed, population_size=60, generations=150):
    rng = random.Random(seed)
    population = [random_pack(rng) for _ in range(population_size)]
    scores = [fitness(pack) for pack in population]
    evaluations = population_size
    history = [(evaluations, population, scores)]

    for _ in range(generations):
        # Elitism: the best pack always survives unchanged,
        # so the best score never drops.
        best_score = max(scores)
        children = [population[scores.index(best_score)]]
        child_scores = [best_score]
        while len(children) < population_size:
            mother = tournament(population, scores, rng)
            father = tournament(population, scores, rng)
            child = mutate(crossover(mother, father, rng), rng)
            children.append(child)
            child_scores.append(fitness(child))
        population, scores = children, child_scores
        evaluations += population_size - 1
        history.append((evaluations, population, scores))

    return population[scores.index(max(scores))], history
```

```{code-cell} python
:tags: [remove-input]
def pack_weight(pack):
    return sum(item_weight for (_, item_weight, _), packed in zip(ITEMS, pack) if packed)


sample_rng = random.Random(0)
too_heavy_share = {}
for chance in (0.5, 0.15):
    packs = [tuple(1 if sample_rng.random() < chance else 0 for _ in ITEMS) for _ in range(10_000)]
    too_heavy_share[chance] = sum(pack_weight(pack) > CAPACITY for pack in packs) / len(packs)
    average_weight = sum(pack_weight(pack) for pack in packs) / len(packs)
    print(f"Each item with a {chance:.0%} chance: average weight {average_weight:.1f} kg, "
          f"{too_heavy_share[chance]:.1%} of 10,000 random packs too heavy")

assert 0.7 < too_heavy_share[0.5] < 0.8 and too_heavy_share[0.15] < 0.01
```

With a 50% chance per item, about three packs in four are too heavy. With 15%, almost none are, so the first population starts with valid packs to improve.

Every random choice in `evolve` comes from a random number generator, and the number that starts it is called the *seed*. The same seed always gives the same run, so this page shows the same results every time it runs. Run the genetic algorithm once with seed 1975:

```{code-cell} python
best_pack, history = evolve(seed=1975)

for generation in (0, 10, 25, 50, 100, 150):
    evaluations, _, scores = history[generation]
    print(f"generation {generation:>3}: best value {max(scores):>3}, "
          f"{evaluations:>5,} packs scored")

packed = [name for (name, _, _), gene in zip(ITEMS, best_pack) if gene]
print(f"\nFinal pack: value {fitness(best_pack)} "
      f"(best possible {OPTIMUM}), weight {pack_weight(best_pack)} kg")
print("Items:", ", ".join(packed))

assert fitness(best_pack) == OPTIMUM
```

```{code-cell} python
:tags: [remove-cell]
# The text below quotes this count: 60 packs, then 59 new ones
# in each of 150 generations (the elite pack is not scored again).
assert history[-1][0] == 8910 and round(2**30 / 8910, -4) == 120_000
```

This run ends with a best possible pack. It scored 8,910 packs in total, about one in 120,000 of all possible packs.

## Example: Watching a Population Evolve

The panel replays the run above, one generation per frame. Each row of the grid is one pack in the population, sorted with the best on top, and each column is one item. The strip above the grid shows how many packs include each item. Watch the population agree on which items to pack, and watch the chart: the genetic algorithm (blue) against random search scoring the same number of packs (gray).

```{code-cell} python
:tags: [remove-cell]
import json
from pathlib import Path


def random_search(seed, evaluations):
    # Score `evaluations` random packs, built like the first population, and keep the best.
    rng = random.Random(seed)
    best, trace = 0, []
    for _ in range(evaluations):
        best = max(best, fitness(random_pack(rng)))
        trace.append(best)
    return best, trace


_, random_trace = random_search(1975, history[-1][0])


def as_number(pack):
    # Bit i is 1 when item i is packed.
    return sum(gene << index for index, gene in enumerate(pack))


data_directory = Path("../widgets/data")
data_directory.mkdir(parents=True, exist_ok=True)
(data_directory / "ga-evolution.json").write_text(json.dumps({
    "seed": 1975,
    "items": [{"name": name, "weight": weight, "value": value} for name, weight, value in ITEMS],
    "capacity": CAPACITY,
    "optimum": OPTIMUM,
    "generations": [
        {"evaluations": evaluations, "population": [as_number(pack) for pack in population], "scores": scores}
        for evaluations, population, scores in history
    ],
    # Random search's best value after the same number of packs as each generation.
    "random_search": [random_trace[evaluations - 1] for evaluations, _, _ in history],
}))
```

```{anywidget} ../widgets/ga-evolution.mjs
{ "data": "ga-evolution.json" }
```

The code that runs this panel is in [chapters/1975-genetic-algorithms.md](https://github.com/sauljabin/ai-timeline/blob/main/chapters/1975-genetic-algorithms.md).

## Example: Is It Better Than Guessing?

One run proves little. The next cell runs the genetic algorithm with 20 different seeds, and random search with the same 20 seeds and the same budget of 8,910 scored packs.

```{code-cell} python
evaluation_budget = history[-1][0]

seeds = range(1, 21)
genetic_results = [fitness(evolve(seed)[0]) for seed in seeds]
random_results = [
    random_search(seed, evaluation_budget)[0] for seed in seeds
]

for name, results in [
    ("Genetic algorithm", genetic_results),
    ("Random search", random_results),
]:
    hits = sum(value == OPTIMUM for value in results)
    average = sum(results) / len(results) / OPTIMUM
    print(f"{name}: best possible pack in {hits} of 20 runs,")
    print(f"    average {average:.1%} of the best value")

assert sum(value == OPTIMUM for value in genetic_results) == 17
assert sum(value == OPTIMUM for value in random_results) == 0
assert min(genetic_results) >= 0.98 * OPTIMUM
assert round(sum(random_results) / len(random_results) / OPTIMUM, 2) == 0.80
```

The genetic algorithm finds a best possible pack in 17 of 20 runs and comes within 2% of it in the other three. Random search never finds one and averages 80% of the best value. Random search improves quickly at first and then almost stops, because good packs are rare among random ones. The genetic algorithm keeps improving, because selection keeps breeding from the best packs found so far, and crossover and mutation build new candidates out of them.

## Why This Mattered

Genetic algorithms gave AI a general-purpose way to search huge spaces where no exact method is known: they need only a way to encode candidates and a way to score them. They were used for scheduling, engineering design, and evolving programs and neural network weights. For the knapsack problem an exact method exists, which is what let this page check the answers. Genetic algorithms are useful for problems without one.

## How This Differs from the Original

- Holland chose parents with probability proportional to their fitness. This page uses tournament selection, a later method; Goldberg and Deb (1991) compared the two.
- Elitism, keeping the best candidate unchanged from one generation to the next, comes from De Jong's 1975 thesis, not from Holland's book.

## Sources

- John H. Holland, *Adaptation in Natural and Artificial Systems*, University of Michigan Press, 1975.
- Kenneth A. De Jong, *An Analysis of the Behavior of a Class of Genetic Adaptive Systems*, PhD thesis, University of Michigan, 1975.
- David E. Goldberg and Kalyanmoy Deb, "A comparative analysis of selection schemes used in genetic algorithms", *Foundations of Genetic Algorithms* 1, 1991, pp. 69–93.
