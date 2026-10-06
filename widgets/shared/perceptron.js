// JavaScript copy of predict from chapters/1957-perceptron.md.
// tests/perceptron.test.mjs checks it against predictions made in Python.

export function predict(weights, bias, inputs) {
  // Same order as the Python code: weighted sum first, then the bias.
  let total = 0;
  for (let i = 0; i < weights.length; i += 1) total += weights[i] * inputs[i];
  return total + bias >= 0 ? 1 : 0;
}
