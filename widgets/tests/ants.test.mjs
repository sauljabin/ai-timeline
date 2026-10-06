// Checks the ant colony recordings for internal consistency.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readData = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url)));

test("double bridge: pheromone counts match the recorded ants, every second", () => {
  const bridge = readData("ant-bridge.json");
  for (const run of bridge.runs) {
    const travel = [bridge.t_short, run.r * bridge.t_short];
    run.pheromone.forEach((counts, second) => {
      // [nest short, nest long, food short, food long]
      const expected = [0, 0, 0, 0];
      for (const [start, from, branch] of run.ants) {
        if (start <= second) expected[from * 2 + branch] += 1; // marked on entry
        if (start + travel[branch] <= second) expected[(1 - from) * 2 + branch] += 1; // and on arrival
      }
      assert.deepEqual(counts, expected, `r=${run.r} seed=${run.seed} second ${second}`);
    });
  }
});

test("Ant System: recorded tours are real tours with the recorded lengths", () => {
  const tsp = readData("ant-tsp.json");
  const n = tsp.cities.length;
  // TSPLIB EUC_2D: Euclidean distance rounded to the nearest whole number.
  const distance = (a, b) => Math.floor(Math.hypot(tsp.cities[a][0] - tsp.cities[b][0], tsp.cities[a][1] - tsp.cities[b][1]) + 0.5);
  const length = (tour) => tour.reduce((sum, city, index) => sum + distance(city, tour[(index + 1) % tour.length]), 0);
  const isTour = (tour) => tour.length === n && new Set(tour).size === n;

  assert.ok(isTour(tsp.optimal_tour));
  assert.equal(length(tsp.optimal_tour), tsp.optimum);
  for (const snapshot of tsp.snapshots) {
    assert.ok(isTour(snapshot.best_tour), `cycle ${snapshot.cycle}`);
    assert.equal(length(snapshot.best_tour), snapshot.best_length, `cycle ${snapshot.cycle}`);
    assert.equal(tsp.best_by_cycle[snapshot.cycle - 1], snapshot.best_length);
    assert.equal(snapshot.pheromone.length, (n * (n - 1)) / 2);
  }
  tsp.best_by_cycle.slice(1).forEach((value, index) => assert.ok(value <= tsp.best_by_cycle[index]));
});
