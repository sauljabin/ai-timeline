// Checks the JavaScript perceptron against the training steps recorded in Python.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { predict } from "../shared/perceptron.js";

const data = JSON.parse(readFileSync(new URL("../data/perceptron-training.json", import.meta.url)));

for (const gate of data.gates) {
  test(`${gate.name}: every recorded step matches predict and the learning rule`, () => {
    for (const step of gate.steps) {
      const { weights, bias } = step.before;
      assert.equal(predict(weights, bias, step.inputs), step.prediction);
      assert.equal(step.error, step.desired - step.prediction);
      // w <- w + error * x, b <- b + error
      assert.deepEqual(step.weights, weights.map((weight, index) => weight + step.error * step.inputs[index]));
      assert.equal(step.bias, bias + step.error);
    }
  });
}
