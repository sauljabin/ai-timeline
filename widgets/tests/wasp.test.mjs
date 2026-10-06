// Checks that every recorded wasp brick was allowed by a rule when it was placed.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const data = JSON.parse(readFileSync(new URL("../data/wasp-nest.json", import.meta.url)));

// The 26 neighbor offsets, in the same order as the Python code: itertools.product order.
const NEIGHBORS = [];
for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
  if (dx || dy || dz) NEIGHBORS.push([dx, dy, dz]);
}

// JavaScript copy of compile_rules: every rule in four quarter turns.
function compile(rules) {
  const table = new Map();
  for (const [occupied, brick] of rules) {
    let cells = occupied.map(([dx, dy, dz, b]) => [dx, dy, dz, b]);
    for (let turn = 0; turn < 4; turn += 1) {
      const lookup = new Map(cells.map(([dx, dy, dz, b]) => [`${dx},${dy},${dz}`, b]));
      const key = NEIGHBORS.map(([dx, dy, dz]) => lookup.get(`${dx},${dy},${dz}`) ?? 0).join("");
      table.set(key, brick);
      cells = cells.map(([dx, dy, dz, b]) => [-dy, dx, dz, b]);
    }
  }
  return table;
}

const tables = {
  "Coordinated rules": compile(data.rules),
  "One rule too many": compile([...data.rules, data.eager_rule]),
};

for (const run of data.runs) {
  test(`${run.name}: each brick matched a rule when it was added`, () => {
    const table = tables[run.name];
    const bricks = new Map([[data.start.join(","), 2]]); // the starting pedicel
    for (const [x, y, z, brick, step] of run.bricks) {
      const key = NEIGHBORS.map(([dx, dy, dz]) => bricks.get(`${x + dx},${y + dy},${z + dz}`) ?? 0).join("");
      assert.ok(!bricks.has(`${x},${y},${z}`), `cube ${x},${y},${z} was empty`);
      assert.equal(table.get(key), brick, `brick at ${x},${y},${z}, step ${step}`);
      bricks.set(`${x},${y},${z}`, brick);
    }
  });
}

test("the coordinated nest has 7 combs of 25 bricks and 7 pedicels", () => {
  const run = data.runs.find((candidate) => candidate.name === "Coordinated rules");
  assert.equal(run.bricks.length + 1, 182); // plus the starting pedicel
  assert.equal(run.bricks.filter((brick) => brick[3] !== 2).length, 7 * 25);
});
