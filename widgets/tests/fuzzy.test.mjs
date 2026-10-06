// Checks the JavaScript fuzzy controller against values computed in Python.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { cold, fanSpeed, hot, warm } from "../shared/fuzzy.js";

const data = JSON.parse(readFileSync(new URL("../data/fuzzy-reference.json", import.meta.url)));
const TOLERANCE = 1e-12;

test(`memberships and fan speed match Python at ${data.points.length} temperatures`, () => {
  for (const point of data.points) {
    for (const [name, membership] of [["cold", cold], ["warm", warm], ["hot", hot]]) {
      assert.ok(Math.abs(membership(point.t) - point[name]) <= TOLERANCE, `${name} at ${point.t}`);
    }
    assert.ok(Math.abs(fanSpeed(point.t) - point.speed) <= TOLERANCE, `speed at ${point.t}`);
  }
});
