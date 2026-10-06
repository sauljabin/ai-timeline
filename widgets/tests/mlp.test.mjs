// Checks the JavaScript forward pass against outputs computed in Python.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { forward } from "../shared/mlp.js";

const readData = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url)));

// Python's sum() and math.exp can differ from JavaScript in the last bit of a
// 64-bit float, so outputs must agree to 12 decimal places, not bit for bit.
const TOLERANCE = 1e-12;

function assertClose(actual, expected, context) {
  assert.equal(actual.length, expected.length, context);
  actual.forEach((value, index) => {
    assert.ok(Math.abs(value - expected[index]) <= TOLERANCE, `${context}, output ${index}: ${value} vs ${expected[index]}`);
  });
}

test("XOR: every recorded snapshot gives the outputs Python recorded", () => {
  const xor = readData("xor-training.json");
  let checked = 0;
  for (const run of xor.runs) {
    for (const snapshot of run.snapshots) {
      const outputs = xor.inputs.map((inputs) => forward(snapshot.layers, inputs).at(-1)[0]);
      assertClose(outputs, snapshot.outputs, `seed ${run.seed}, epoch ${snapshot.epoch}`);
      checked += 1;
    }
  }
  assert.ok(checked > 0);
});

test("XOR: snapshots follow the recording rule", () => {
  const xor = readData("xor-training.json");
  for (const run of xor.runs) {
    const epochs = run.snapshots.map((snapshot) => snapshot.epoch);
    assert.equal(epochs[0], 0);
    assert.equal(run.errors.length, epochs.at(-1));
    for (const epoch of epochs.slice(1, -1)) assert.equal(epoch % xor.snapshot_every, 0);
  }
});

test("digit reader: every reference image gives the outputs Python computed", () => {
  const digits = readData("digit-reader.json");
  assert.equal(digits.checks.length, 110);
  digits.checks.forEach((check, index) => {
    assertClose(forward(digits.layers, check.inputs).at(-1), check.outputs, `image ${index}`);
  });
});

test("one training step: recorded values match forward() and the update rule", () => {
  const step = readData("backprop-step.json");
  const activations = forward(step.before, step.inputs);
  step.activations.slice(1).forEach((layer, index) => assertClose(activations[index + 1], layer, `layer ${index + 1}`));
  step.after.forEach((layer, layerIndex) => {
    layer.forEach((neuron, neuronIndex) => {
      const delta = step.deltas[layerIndex][neuronIndex];
      const old = step.before[layerIndex][neuronIndex];
      // w <- w + rate * delta * x, and the bias with x = 1.
      const expected = old.weights.map((weight, index) => weight + step.learning_rate * delta * step.activations[layerIndex][index]);
      assertClose(neuron.weights, expected, `weights of layer ${layerIndex}, neuron ${neuronIndex}`);
      assertClose([neuron.bias], [old.bias + step.learning_rate * delta], `bias of layer ${layerIndex}, neuron ${neuronIndex}`);
    });
  });
});
