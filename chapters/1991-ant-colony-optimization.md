---
kernelspec:
  name: python3
  display_name: Python 3
---

# 1991 Ant Colony Optimization

Ant colony optimization is a way to find short routes the way ant colonies find them: many simple agents leave a chemical trail, and later agents tend to follow the strongest trails. Alberto Colorni, Marco Dorigo, and Vittorio Maniezzo, at the Politecnico di Milano, presented the first version, the *Ant System*, in 1991. Dorigo developed it in his 1992 PhD thesis, and the three published the full method in 1996.

## High-Level Ideas

A single ant cannot see the whole map, so it cannot compare two routes. A colony can. Each ant lays a chemical, a *pheromone*, as it walks, and at a fork each ant tends to take the branch that smells strongest.

Picture a nest joined to food by two branches, one twice as long as the other. At first both branches are bare, and ants split about evenly. Ants on the short branch reach the food and come back sooner, so the short branch collects pheromone faster. That attracts more ants to it, which adds even more pheromone. This loop is called *positive feedback*. Jean-Louis Deneubourg, Simon Goss, and colleagues ran this *double bridge* experiment with Argentine ants in 1989 and 1990, and in most trials the colony ended up on the short branch.

The ants never talk to each other. They coordinate by changing their surroundings and reacting to the changes. Pierre-Paul Grassé named this *stigmergy* in 1959, after watching termites build. The [1995 wasp nest chapter](1995-wasp-nest-building.md) shows another kind of stigmergy.

The Ant System turns the trick into an algorithm for the *traveling salesman problem*: find the shortest round trip through a set of cities. Each artificial ant builds a complete trip. From city `i`, it picks the next city `j` with probability proportional to

$$\tau_{ij}^{\alpha} \cdot \eta_{ij}^{\beta}$$

where $\tau_{ij}$ is the pheromone on the road from `i` to `j` and $\eta_{ij} = 1/d_{ij}$ is the inverse of its length, so near cities are attractive even before there is any pheromone. The exponents $\alpha$ and $\beta$ set how much each one counts. After all ants finish a trip, some pheromone evaporates, and each ant adds pheromone along its own trip, more for shorter trips:

$$\tau_{ij} \leftarrow \rho\,\tau_{ij} + \sum_{\text{ants } k \text{ that used } ij} \frac{Q}{L_k}$$

Here $\rho$ is the share of pheromone that stays (so $1 - \rho$ evaporates), $L_k$ is the length of ant `k`'s trip, and `Q` is a constant.

## Example: The Double Bridge

Marco Dorigo and Thomas Stützle describe a simple model of the double bridge in their 2004 book, based on Deneubourg's work. Ants arrive at each end of the bridge at a rate of 0.5 ants per second. Crossing the short branch takes $t_s$ seconds; crossing the long one takes $r \cdot t_s$. Each ant adds one unit of pheromone to its branch where it enters and again where it leaves. At a fork, an ant takes the short branch with probability

$$p_{short} = \frac{(t_s + \varphi_{short})^2}{(t_s + \varphi_{short})^2 + (t_s + \varphi_{long})^2}$$

where $\varphi$ is the pheromone on each branch at that end. The constant $t_s$ makes the first few ants choose almost at random; the exponent 2 was measured by Deneubourg and colleagues. The model has no evaporation. This page uses $t_s = 20$ seconds; the book does not give the value it used.

```{code-cell} python
import random

T_SHORT = 20   # seconds to cross the short branch
RATE = 0.5     # ants arriving at each end per second


def p_short(short_pheromone, long_pheromone):
    a = (T_SHORT + short_pheromone) ** 2
    b = (T_SHORT + long_pheromone) ** 2
    return a / (a + b)


def cross_bridge(r, seed, ants=1000):
    # r: the long branch is r times longer than the short one.
    rng = random.Random(seed)
    travel = {"short": T_SHORT, "long": r * T_SHORT}
    # Pheromone at each end of the bridge, one count per branch.
    pheromone = {end: {"short": 0, "long": 0} for end in ("nest", "food")}
    arriving = {}  # second -> ants reaching an end at that second
    choices, t = [], 0
    while len(choices) < ants:
        for end, branch in arriving.pop(t, []):
            pheromone[end][branch] += 1  # mark the branch on arrival
        for end, other_end in (("nest", "food"), ("food", "nest")):
            if rng.random() < RATE:
                here = pheromone[end]
                is_short = rng.random() < p_short(here["short"], here["long"])
                branch = "short" if is_short else "long"
                here[branch] += 1  # mark the branch on entry
                arrival = t + travel[branch]
                arriving.setdefault(arrival, []).append((other_end, branch))
                choices.append(branch)
        t += 1
    return choices
```

Following Dorigo and Stützle, the next cell runs the model 1,000 times for each bridge and counts how ants 501 to 1,000 split between the branches. Each run uses a different *seed*, the number that starts Python's random number generator: seeds 0 to 999. A seed always gives the same run, so the results below are the same every time this page runs. With equal branches, "short" just names one of the two.

```{code-cell} python
def short_share(r, seed):
    later_ants = cross_bridge(r, seed)[500:1000]  # ants 501 to 1,000
    return later_ants.count("short") / len(later_ants)


BINS = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"]
histograms = {}
for r in (1, 2):
    shares = [short_share(r, seed) for seed in range(1000)]
    counts = [0] * 5
    for share in shares:
        counts[min(int(share * 5), 4)] += 1
    histograms[r] = counts
    print(f"r = {r}: runs by share of ants on the short branch")
    for label, count in zip(BINS, counts):
        print(f"  {label:>7} {'█' * (count // 20)} {count / 10:.1f}%")
```

```{code-cell} python
:tags: [remove-cell]
# The text below quotes these numbers.
assert histograms[1] == [374, 87, 85, 89, 365]
assert histograms[2] == [151, 64, 73, 103, 609]
```

With equal branches, about three runs in four end with at least 80% of the ants on one branch: 36.5% of runs on one, 37.4% on the other. Which branch wins is a coin toss decided by the first few ants. With the short branch half as long, 60.9% of runs send at least 80% of the ants down the short branch, and 15.1% send more than 80% down the long one, because early random choices built a trail there first. Real Argentine ants behaved like the first case on equal bridges and chose the short branch in most trials on unequal ones.

The panel replays three runs of each bridge, second by second. Dots are ants; the thickness of each branch shows its pheromone.

```{code-cell} python
:tags: [remove-cell]
import json
from pathlib import Path


def record_bridge(r, seed, seconds=600):
    # The same model as cross_bridge, recorded second by second for the panel.
    rng = random.Random(seed)
    travel = {"short": T_SHORT, "long": r * T_SHORT}
    pheromone = {end: {"short": 0, "long": 0} for end in ("nest", "food")}
    arriving, ants, history = {}, [], []
    for t in range(seconds):
        for end, branch in arriving.pop(t, []):
            pheromone[end][branch] += 1
        for end, other_end in (("nest", "food"), ("food", "nest")):
            if rng.random() < RATE:
                here = pheromone[end]
                is_short = rng.random() < p_short(here["short"], here["long"])
                branch = "short" if is_short else "long"
                here[branch] += 1
                arriving.setdefault(t + travel[branch], []).append((other_end, branch))
                ants.append([t, end, branch])
        # Compact form: [nest short, nest long, food short, food long].
        history.append([pheromone["nest"]["short"], pheromone["nest"]["long"],
                        pheromone["food"]["short"], pheromone["food"]["long"]])
    # The recording follows exactly the same random choices as cross_bridge.
    assert [a[2] for a in ants] == cross_bridge(r, seed, ants=len(ants))
    # Ants as [start second, 0 = from nest / 1 = from food, 0 = short / 1 = long].
    ants = [[t, int(end == "food"), int(branch == "long")] for t, end, branch in ants]
    return {"r": r, "seed": seed, "ants": ants, "pheromone": history}


data_directory = Path("../widgets/data")
data_directory.mkdir(parents=True, exist_ok=True)
(data_directory / "ant-bridge.json").write_text(json.dumps({
    "t_short": T_SHORT,
    "runs": [record_bridge(r, seed) for r in (1, 2) for seed in (1, 2, 3)],
}))
```

```{anywidget} ../widgets/ant-bridge.mjs
{ "data": "ant-bridge.json" }
```

The code that runs this panel is in [chapters/1991-ant-colony-optimization.md](https://github.com/sauljabin/ai-timeline/blob/main/chapters/1991-ant-colony-optimization.md).

## Example: Ant System on 51 Cities

The 1996 Ant System paper tested a 51-city problem published by Samuel Eilon and colleagues in 1969. It is now part of TSPLIB, a standard collection of test problems, as `eil51`. TSPLIB measures distances as straight-line lengths rounded to the nearest whole number, and the best possible round trip is known: 426. The file `eil51.opt.tour` holds that optimal trip; the next cell checks its length.

```{code-cell} python
import math


def read_tsplib(path):
    # Each data line is "index x y" (cities) or a single index (tours).
    lines = [line.split() for line in open(path)]
    cities = [(float(x), float(y)) for i, x, y in
              (p for p in lines if len(p) == 3 and p[0].isdigit())]
    tour = [int(p[0]) - 1 for p in lines
            if len(p) == 1 and p[0].isdigit()]
    return cities, tour


CITIES, _ = read_tsplib("eil51.tsp")
_, OPTIMAL_TOUR = read_tsplib("eil51.opt.tour")
N = len(CITIES)
# TSPLIB rule: Euclidean distance rounded to the nearest whole number.
DIST = [[int(math.dist(a, b) + 0.5) for b in CITIES] for a in CITIES]


def tour_length(tour):
    return sum(DIST[a][b] for a, b in zip(tour, tour[1:] + tour[:1]))


print(f"{N} cities, optimal tour length {tour_length(OPTIMAL_TOUR)}")
assert sorted(OPTIMAL_TOUR) == list(range(N))
assert tour_length(OPTIMAL_TOUR) == 426
```

A simple baseline is the *nearest neighbor* rule: start somewhere and always go to the closest city not yet visited. Trying all 51 starting cities:

```{code-cell} python
def nearest_neighbor(start):
    tour = [start]
    while len(tour) < N:
        here = tour[-1]
        tour.append(min((c for c in range(N) if c not in tour),
                        key=lambda c: DIST[here][c]))
    return tour


greedy = min(tour_length(nearest_neighbor(s)) for s in range(N))
print(f"Best nearest-neighbor tour: {greedy} "
      f"({greedy / 426 - 1:.1%} longer than the optimum)")
assert greedy == 482
```

The Ant System below uses the parameters the 1996 paper found best: $\alpha = 1$, $\beta = 5$, $\rho = 0.5$, $Q = 100$, and one ant starting from each city, 51 ants in all. Every road starts with a tiny amount of pheromone. One *cycle* is every ant building one tour, followed by the pheromone update.

```{code-cell} python
def ant_system(seed, cycles=200, alpha=1, beta=5, rho=0.5, q=100,
               on_cycle=None):
    rng = random.Random(seed)
    tau = [[1e-6] * N for _ in range(N)]  # pheromone on each road
    # Closeness term, eta^beta with eta = 1 / distance.
    eta_beta = [[0 if i == j else (1 / DIST[i][j]) ** beta
                 for j in range(N)] for i in range(N)]
    best_length, best_tour = math.inf, None

    for cycle in range(1, cycles + 1):
        tours = []
        for start in range(N):
            tour, unvisited = [start], [c for c in range(N) if c != start]
            while unvisited:
                i = tour[-1]
                weights = [tau[i][j] ** alpha * eta_beta[i][j]
                           for j in unvisited]
                j = rng.choices(unvisited, weights)[0]
                tour.append(j)
                unvisited.remove(j)
            tours.append(tour)

        # Evaporation, then each ant adds Q / L on its own tour.
        for row in tau:
            for j in range(N):
                row[j] *= rho
        for tour in tours:
            length = tour_length(tour)
            for a, b in zip(tour, tour[1:] + tour[:1]):
                tau[a][b] += q / length
                tau[b][a] += q / length
            if length < best_length:
                best_length, best_tour = length, tour

        if on_cycle:
            on_cycle(cycle, tau, best_length, best_tour)
    return best_length, best_tour
```

Run it once, with seed 1:

```{code-cell} python
progress = {}


def note(cycle, tau, best_length, best_tour):
    progress[cycle] = best_length


best_length, best_tour = ant_system(seed=1, on_cycle=note)
for cycle in (1, 10, 25, 50, 100, 200):
    print(f"cycle {cycle:>3}: best tour so far {progress[cycle]}")
print(f"\nBest: {best_length}, {best_length / 426 - 1:.1%} above the optimum")
```

## Example: What the Pheromone Adds

Is the pheromone doing anything, or is the closeness term doing all the work? The next cell runs the Ant System with 10 seeds, then again with $\alpha = 0$. With $\alpha = 0$ the pheromone has no effect, so the ants build the same number of tours, guided by distance alone.

```{code-cell} python
summary = {}
for name, alpha in (("with pheromone", 1), ("without pheromone", 0)):
    lengths = [ant_system(seed, alpha=alpha)[0] for seed in range(1, 11)]
    summary[name] = lengths
    mean = sum(lengths) / len(lengths)
    print(f"{name:>17}: best {min(lengths)}, mean {mean:.1f} "
          f"({mean / 426 - 1:.1%} above the optimum), worst {max(lengths)}")

assert sorted(summary["with pheromone"]) == [444, 444, 445, 445, 446,
                                             446, 450, 452, 452, 456]
assert max(summary["with pheromone"]) < min(summary["without pheromone"])
assert sum(summary["without pheromone"]) == 4805  # mean 480.5
```

With pheromone, every run beats every run without it: the mean drops from 480.5 to 448.0. The colony learns which roads belong to good tours. No run reaches the optimum of 426, though. The best runs end 4.2% above it, because after a while most pheromone sits on a few roads and the ants stop exploring. Later versions, described below, fixed much of that.

The panel replays the seed 1 run. Line darkness shows pheromone on each road, the blue tour is the best found so far, and the dashed tour is the optimum.

```{code-cell} python
:tags: [remove-cell]
SNAPSHOTS = set(range(1, 11)) | set(range(20, 201, 10))
snapshots = []


def snapshot(cycle, tau, best_length, best_tour):
    progress[cycle] = best_length
    if cycle in SNAPSHOTS:
        top = max(max(row) for row in tau)
        # Pheromone on each road (i < j) as 0-1000 of the strongest road.
        strength = [round(1000 * tau[i][j] / top)
                    for i in range(N) for j in range(i + 1, N)]
        snapshots.append({"cycle": cycle, "best_length": best_length,
                          "best_tour": best_tour, "pheromone": strength})


progress = {}
replay_best, _ = ant_system(seed=1, on_cycle=snapshot)
assert replay_best == best_length  # the same run as above

(data_directory / "ant-tsp.json").write_text(json.dumps({
    "cities": CITIES,
    "optimal_tour": OPTIMAL_TOUR,
    "optimum": 426,
    "nearest_neighbor": greedy,
    "best_by_cycle": [progress[c] for c in range(1, 201)],
    "snapshots": snapshots,
}))
```

```{anywidget} ../widgets/ant-tsp.mjs
{ "data": "ant-tsp.json" }
```

The code that runs this panel is in [chapters/1991-ant-colony-optimization.md](https://github.com/sauljabin/ai-timeline/blob/main/chapters/1991-ant-colony-optimization.md).

## Why This Mattered

Ant colony optimization showed that a population of very simple agents, communicating only through marks left in a shared environment, can solve hard search problems. It became a family of methods: Ant Colony System (Dorigo and Gambardella, 1997) and MAX–MIN Ant System (Stützle and Hoos, 2000) limit how much pheromone one road can collect and add local improvements, and they find optimal or near-optimal tours on problems much larger than `eil51`. Ant-based methods have been used for vehicle routing, scheduling, and routing data in networks, and they are one of the founding ideas of *swarm intelligence*.

## How This Differs from the Original

- The 1996 paper starts every road at "a small positive constant" without giving its value. This page uses one millionth. It also stops after 200 cycles and runs on TSPLIB's `eil51` with rounded distances.
- The double bridge uses the simplified model from Dorigo and Stützle's book, not the original experiments, and the crossing time $t_s = 20$ seconds is this page's choice.

## Sources

- Simon Goss, Serge Aron, Jean-Louis Deneubourg, and Jacques M. Pasteels, "Self-organized shortcuts in the Argentine ant", *Naturwissenschaften* 76, 1989, pp. 579–581.
- Jean-Louis Deneubourg, Serge Aron, Simon Goss, and Jacques M. Pasteels, "The self-organizing exploratory pattern of the Argentine ant", *Journal of Insect Behavior* 3, 1990, pp. 159–168.
- Pierre-Paul Grassé, "La reconstruction du nid et les coordinations interindividuelles chez *Bellicositermes natalensis* et *Cubitermes* sp. La théorie de la stigmergie", *Insectes Sociaux* 6, 1959, pp. 41–81.
- Alberto Colorni, Marco Dorigo, and Vittorio Maniezzo, "Distributed optimization by ant colonies", *Proceedings of the First European Conference on Artificial Life*, Elsevier, 1991, pp. 134–142.
- Marco Dorigo, *Optimization, Learning and Natural Algorithms*, PhD thesis, Politecnico di Milano, 1992.
- Marco Dorigo, Vittorio Maniezzo, and Alberto Colorni, "Ant System: Optimization by a colony of cooperating agents", *IEEE Transactions on Systems, Man, and Cybernetics, Part B* 26(1), 1996, pp. 29–41.
- Marco Dorigo and Luca Maria Gambardella, "Ant Colony System: A cooperative learning approach to the traveling salesman problem", *IEEE Transactions on Evolutionary Computation* 1(1), 1997, pp. 53–66.
- Thomas Stützle and Holger H. Hoos, "MAX–MIN Ant System", *Future Generation Computer Systems* 16(8), 2000, pp. 889–914.
- Marco Dorigo and Thomas Stützle, *Ant Colony Optimization*, MIT Press, 2004, chapter 1: source of the double bridge model.
- Samuel Eilon, C. D. T. Watson-Gandy, and Nicos Christofides, "Distribution management: Mathematical modelling and practical analysis", *Operational Research Quarterly* 20, 1969, pp. 37–53: origin of the 51-city problem.
- Gerhard Reinelt, "TSPLIB: A traveling salesman problem library", *ORSA Journal on Computing* 3(4), 1991, pp. 376–384: source of `eil51.tsp` and `eil51.opt.tour`.
