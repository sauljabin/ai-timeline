// JavaScript copy of the forward pass of MultilayerPerceptron from
// chapters/1986-backpropagation.md. tests/mlp.test.mjs checks it against
// outputs computed by the Python code.

export function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

// layers: [[{ weights: [...], bias }, ...], ...] exactly as the Python code saves them.
// Returns the activations of every layer, starting with the inputs.
export function forward(layers, inputs) {
  const activations = [Array.from(inputs)];
  for (const layer of layers) {
    const previous = activations[activations.length - 1];
    activations.push(layer.map((neuron) => {
      let z = 0;
      for (let i = 0; i < neuron.weights.length; i += 1) z += neuron.weights[i] * previous[i];
      return sigmoid(z + neuron.bias);
    }));
  }
  return activations;
}
