// Checks the recorded genetic algorithm run against the JavaScript fitness function.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { fitness } from "../shared/knapsack.js";

const data = JSON.parse(readFileSync(new URL("../data/ga-evolution.json", import.meta.url)));

test("every recorded score is the fitness of its pack", () => {
  for (const generation of data.generations) {
    generation.population.forEach((pack, index) => {
      assert.equal(fitness(data.items, data.capacity, pack), generation.scores[index]);
    });
  }
});

test("the best score never drops (elitism) and reaches the recorded optimum", () => {
  const best = data.generations.map((generation) => Math.max(...generation.scores));
  best.slice(1).forEach((value, index) => assert.ok(value >= best[index]));
  assert.equal(best.at(-1), data.optimum);
});

test("random search has one entry per generation and never gets worse", () => {
  assert.equal(data.random_search.length, data.generations.length);
  data.random_search.slice(1).forEach((value, index) => assert.ok(value >= data.random_search[index]));
});
