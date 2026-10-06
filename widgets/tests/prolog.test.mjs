// Checks that the recorded Prolog search trees are well formed.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const data = JSON.parse(readFileSync(new URL("../data/prolog-tree.json", import.meta.url)));
const lineCount = data.program.split("\n").length;

for (const search of data.searches) {
  test(`${search.query}: every node hangs from an earlier node and every node finishes`, () => {
    const created = new Set();
    const finished = new Set();
    for (const event of search.events) {
      if (event.type === "node") {
        assert.ok(!created.has(event.id));
        if (event.parent === null) assert.equal(event.id, 1);
        else assert.ok(created.has(event.parent), `parent of ${event.id} appears first`);
        if (typeof event.line === "number") assert.ok(event.line >= 1 && event.line <= lineCount);
        created.add(event.id);
      } else {
        assert.ok(created.has(event.id));
        if (event.type === "done") finished.add(event.id);
      }
    }
    // Every node that is not an answer is finished by the end of the search.
    const answers = new Set(search.events.filter((event) => event.type === "answer").map((event) => event.id));
    for (const id of created) assert.ok(finished.has(id) || answers.has(id), `node ${id} finishes`);
  });

  test(`${search.query}: the recorded answers are the answers SWI-Prolog gave directly`, () => {
    const recorded = search.events.filter((event) => event.type === "answer").map((event) => event.bindings);
    assert.deepEqual(recorded, search.answers);
  });
}
