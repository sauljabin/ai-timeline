// Checks the JavaScript Life rules against generations computed in Python.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { cellKey, nextGenerationOnTorus } from "../shared/life.js";

const readData = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url)));
const reference = readData("game-of-life-reference.json");
const board = readData("game-of-life-board.json");
const { width, height } = reference;

const toKeys = (cells) => new Set(cells.map(([x, y]) => cellKey(x, y, width)));
const sorted = (keys) => [...keys].sort((a, b) => a - b);

for (const run of reference.runs) {
  test(`${run.name}: every one of ${run.generations.length - 1} generations matches Python`, () => {
    let cells = toKeys(run.generations[0]);
    run.generations.slice(1).forEach((expected, index) => {
      cells = nextGenerationOnTorus(cells, width, height);
      assert.deepEqual(sorted(cells), sorted(toKeys(expected)), `generation ${index + 1}`);
    });
  });
}

test("the board's starting patterns are the ones Python checked", () => {
  assert.equal(board.width, width);
  assert.equal(board.height, height);
  for (const preset of board.presets) {
    const run = reference.runs.find((candidate) => candidate.name === preset.name);
    assert.ok(run, `no reference run for ${preset.name}`);
    assert.deepEqual(preset.cells, run.generations[0]);
  }
});
