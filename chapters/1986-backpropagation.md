---
kernelspec:
  name: python3
  display_name: Python 3
---

# 1986 Backpropagation

Backpropagation is how neural networks with hidden layers learn. It measures how wrong the network's output is, then sends that error backward through the network to work out how much each weight should change. In 1986 David Rumelhart, Geoffrey Hinton, and Ronald Williams published "Learning representations by back-propagating errors" in *Nature*. They showed that it trains networks with hidden layers, and that the hidden units learn useful features of the input on their own.

They did not invent the underlying math. Seppo Linnainmaa described the same backward way of computing derivatives (reverse-mode automatic differentiation) in 1970, and Paul Werbos proposed using it to train neural networks in his 1974 thesis. The 1986 work is the one that made the method widely used, because it showed working networks that learned internal representations.

## High-Level Ideas

The [1957 perceptron chapter](1957-perceptron.md) showed that a single perceptron draws one straight line and puts each input on one side of it, so it cannot learn *XOR* (exclusive or). XOR outputs `1` when exactly one input is `1`:

| `x1` | `x2` | XOR |
| --- | --- | --- |
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

The two `1` cases sit on opposite corners of a square, so no single straight line separates them from the two `0` cases. Marvin Minsky and Seymour Papert made this limit of single-layer perceptrons widely known in their 1969 book *Perceptrons*.

A *hidden layer* fixes this. Each hidden neuron draws its own line, and the output neuron combines them. The network on this page has two inputs, two hidden neurons, and one output (a 2-2-1 network).

Each neuron computes a weighted sum `z` of its inputs plus a bias, then squashes it into the range 0 to 1 with the *sigmoid* function:

$$a = \frac{1}{1 + e^{-z}}$$

Training measures how wrong the output is with the squared error, where `t` is the desired output and `y` is the network's output:

$$E = \tfrac{1}{2}\sum (t - y)^2$$

The ½ only makes the derivative tidier. Backpropagation then computes a *delta* for every neuron: how fast the error falls when that neuron's weighted sum `z` rises (in calculus terms, δ = −∂E/∂z). It starts at the output and works backward:

$$\delta_{output} = (t - y)\, a(1 - a)$$

$$\delta_{hidden} = \left(\sum w_{next}\, \delta_{next}\right) a(1 - a)$$

The factor `a(1 - a)` is the slope of the sigmoid. Each weight then moves in the direction that lowers the error, scaled by the *learning rate* `η` and by the input `x` that flows through that weight:

$$w \leftarrow w + \eta\, \delta\, x$$

$$b \leftarrow b + \eta\, \delta$$

With real numbers: the output neuron answers `y = 0.8` but should answer `t = 1`. Its delta is `(1 − 0.8) × 0.8 × (1 − 0.8) = 0.032`. A hidden neuron feeding it has activation `0.6`, and the learning rate is `0.5`, so the weight between them grows by `0.5 × 0.032 × 0.6 = 0.0096`. Next time the output will be a little closer to 1. Repeating this for every weight and every example, thousands of times, is training.

## Example: One Training Step

This example runs one training step on the 2-2-1 network, one formula at a time, and prints every number. In the code, a network is a list of layers, and each neuron is a dictionary with its `weights` and its `bias`. The starting weights are random numbers between −1 and 1. Python makes them with a random number generator, and the number that starts the generator is called the *seed*. The same seed always produces the same numbers, so this page gives the same results every time it runs. This example uses seed 1.

```{code-cell} python
import math
import random


def new_network(layer_sizes, seed):
    # [2, 2, 1] means 2 inputs, 2 hidden neurons, 1 output neuron.
    rng = random.Random(seed)
    network = []
    for inputs, neurons in zip(layer_sizes, layer_sizes[1:]):
        layer = []
        for _ in range(neurons):
            weights = [rng.uniform(-1, 1) for _ in range(inputs)]
            layer.append({"weights": weights, "bias": rng.uniform(-1, 1)})
        network.append(layer)
    return network


network = new_network([2, 2, 1], seed=1)
NAMES = ["hidden 1", "hidden 2", "output"]
for name, neuron in zip(NAMES, network[0] + network[1]):
    weights = ", ".join(f"{w:+.3f}" for w in neuron["weights"])
    print(f"{name:>8}: weights {weights}, bias {neuron['bias']:+.3f}")
```

The *forward pass* sends the input through the network. Every neuron computes its weighted sum `z` and its activation `a = sigmoid(z)`, layer by layer. The example is the input `(1, 0)`, whose desired XOR output is `1`.

```{code-cell} python
def sigmoid(z):
    return 1 / (1 + math.exp(-z))


def weighted_sum(neuron, inputs):
    # z = w1*x1 + w2*x2 + ... + b
    weights, bias = neuron["weights"], neuron["bias"]
    return sum(w * x for w, x in zip(weights, inputs)) + bias


def forward(network, inputs):
    # Keep every layer's activations: the backward pass needs them.
    activations = [list(inputs)]
    for layer in network:
        previous = activations[-1]
        activations.append(
            [sigmoid(weighted_sum(neuron, previous)) for neuron in layer]
        )
    return activations


inputs, targets = (1, 0), [1]
activations = forward(network, inputs)
hidden, (y,) = activations[1], activations[2]
print(f"hidden activations: {hidden[0]:.4f}, {hidden[1]:.4f}")
print(f"output y = {y:.4f}, desired t = {targets[0]}")
print(f"error t - y = {targets[0] - y:+.4f}")
```

The *backward pass* computes the deltas, starting at the output: first `(t − y) · y(1 − y)` for the output neuron, then, for each hidden neuron, the output delta times the weight that connects them, times `a(1 − a)`.

```{code-cell} python
def backpropagate(network, activations, targets):
    # Output layer: delta = (t - y) * y(1 - y)
    outputs = activations[-1]
    deltas = [[(t - y) * (y * (1 - y)) for t, y in zip(targets, outputs)]]

    # Hidden layers, from right to left:
    # delta = (sum of w_next * delta_next) * a(1 - a).
    # activations[i + 1] holds the outputs of network[i],
    # because activations[0] is the input.
    for i in range(len(network) - 2, -1, -1):
        next_layer, next_deltas = network[i + 1], deltas[0]
        layer_deltas = []
        for j, a in enumerate(activations[i + 1]):
            downstream = sum(
                neuron["weights"][j] * delta
                for neuron, delta in zip(next_layer, next_deltas)
            )
            layer_deltas.append(downstream * (a * (1 - a)))
        deltas.insert(0, layer_deltas)
    return deltas


deltas = backpropagate(network, activations, targets)
print(f"output delta: {deltas[1][0]:+.5f}")
print(f"hidden deltas: {deltas[0][0]:+.5f}, {deltas[0][1]:+.5f}")
```

Finally the *update* moves every weight by `η · δ · x`, where `x` is the value that flowed through that weight. With a learning rate of 0.5:

```{code-cell} python
import copy


def update(network, activations, deltas, learning_rate):
    # w <- w + rate * delta * x.
    # The bias works like a weight whose input is always 1.
    for layer, inputs, layer_deltas in zip(network, activations, deltas):
        for neuron, delta in zip(layer, layer_deltas):
            neuron["weights"] = [
                w + learning_rate * delta * x
                for w, x in zip(neuron["weights"], inputs)
            ]
            neuron["bias"] += learning_rate * delta


before = copy.deepcopy(network)
update(network, activations, deltas, learning_rate=0.5)
pairs = zip(NAMES, before[0] + before[1], network[0] + network[1])
for name, old, new in pairs:
    changes = [
        f"{w:+.3f} -> {v:+.3f}"
        for w, v in zip(old["weights"], new["weights"])
    ]
    print(f"{name:>8}: weights {', '.join(changes)}")

y_after = forward(network, inputs)[-1][0]
print(f"\noutput for (1, 0): {y:.4f} before the step, {y_after:.4f} after")

assert abs(1 - y_after) < abs(1 - y)  # The output moved toward 1.
# x2 = 0, so the weights it feeds into the hidden neurons stay the same.
assert [n["weights"][1] for n in network[0]] == [
    n["weights"][1] for n in before[0]
]
```

The output moved toward the desired `1`. Notice that the weight from `x2` to each hidden neuron did not change: `x2` is 0 in this example, so `η · δ · 0 = 0`. The panel replays this step in slow motion on the network diagram.

```{code-cell} python
:tags: [remove-cell]
import json
from pathlib import Path

z_values = [
    [weighted_sum(neuron, layer_inputs) for neuron in layer]
    for layer, layer_inputs in zip(before, activations)
]
data_directory = Path("../widgets/data")
data_directory.mkdir(parents=True, exist_ok=True)
(data_directory / "backprop-step.json").write_text(json.dumps({
    "inputs": list(inputs),
    "target": targets[0],
    "learning_rate": 0.5,
    "before": before,
    "after": network,
    "z": z_values,
    "activations": activations,
    "deltas": deltas,
}))
```

```{anywidget} ../widgets/backprop-step.mjs
{ "data": "backprop-step.json" }
```

The code that runs this panel is in [chapters/1986-backpropagation.md](https://github.com/sauljabin/ai-timeline/blob/main/chapters/1986-backpropagation.md).

## Example: Training on XOR

Training repeats that step for every example, over and over. One pass over all four XOR examples is an *epoch*. Training stops when the sum of the squared errors `(t − y)²` over one epoch drops below 0.01 (this is the error `E` from above without the ½), or after 10,000 epochs.

```{code-cell} python
def train(network, examples, learning_rate, max_epochs, target_error,
          on_epoch_end=None):
    for epoch in range(1, max_epochs + 1):
        squared_errors = []
        for inputs, targets in examples:
            activations = forward(network, inputs)
            outputs = activations[-1]
            # Measure the error before this example's update.
            squared_errors.append(
                sum((t - y) ** 2 for t, y in zip(targets, outputs))
            )
            deltas = backpropagate(network, activations, targets)
            update(network, activations, deltas, learning_rate)
        if on_epoch_end:
            on_epoch_end(epoch, sum(squared_errors))
        if sum(squared_errors) < target_error:
            return epoch
    return None  # The error never dropped below target_error.


def output(network, inputs):
    return forward(network, inputs)[-1]


XOR = [((0, 0), [0]), ((0, 1), [1]), ((1, 0), [1]), ((1, 1), [0])]

xor_network = new_network([2, 2, 1], seed=1)
stopped_at = train(
    xor_network, XOR, learning_rate=0.5, max_epochs=10_000, target_error=0.01
)

print(f"Error below 0.01 after {stopped_at:,} epochs.\n")
for inputs, (desired,) in XOR:
    y = output(xor_network, inputs)[0]
    print(f"{inputs} -> {y:.3f}, read as {int(y >= 0.5)} (desired {desired})")
    assert int(y >= 0.5) == desired

assert stopped_at == 3390
```

The output is a number between 0 and 1, read as `1` when it is at least 0.5. It is not a calibrated probability, only how strongly the output neuron fires.

## Example: Watching XOR Being Learned

A different seed gives different starting weights. Here are the starting weights for seed 1, the run above, and for seed 7:

```{code-cell} python
for seed in (1, 7):
    start = new_network([2, 2, 1], seed=seed)
    print(f"seed {seed}:")
    for name, neuron in zip(NAMES, start[0] + start[1]):
        weights = ", ".join(f"{w:+.3f}" for w in neuron["weights"])
        print(f"  {name:>8}: weights {weights}, bias {neuron['bias']:+.3f}")
```

Everything else about the two runs is the same: the same network, the same four XOR examples, the same learning rate. Seed 1 learns XOR at epoch 3,390. Seed 7 does not: after 10,000 epochs it answers two cases correctly and the other two with about 0.49. The animation below replays both runs, showing every weight and bias every 10 epochs.

```{code-cell} python
:tags: [remove-input]
import copy
import json
from pathlib import Path

SNAPSHOT_EVERY = 10


def snapshot(network, epoch):
    return {
        "epoch": epoch,
        "layers": copy.deepcopy(network),
        # The output for each XOR case, computed in Python, shown in the animation's table.
        "outputs": [output(network, inputs)[0] for inputs, _ in XOR],
    }


def record_training(seed):
    network = new_network([2, 2, 1], seed=seed)
    snapshots, errors = [snapshot(network, 0)], []

    def on_epoch_end(epoch, total_error):
        errors.append(total_error)
        if epoch % SNAPSHOT_EVERY == 0 or total_error < 0.01:
            snapshots.append(snapshot(network, epoch))

    stopped = train(network, XOR, learning_rate=0.5, max_epochs=10_000, target_error=0.01, on_epoch_end=on_epoch_end)
    return {"seed": seed, "stopped_at": stopped, "errors": errors, "snapshots": snapshots}


learns, stuck = record_training(seed=1), record_training(seed=7)

# The recorded seed-1 run must end exactly where the run above ended.
assert learns["stopped_at"] == stopped_at
assert learns["snapshots"][-1]["layers"] == xor_network
# The text above: seed 7 gets (0, 0) and (0, 1) right, and answers about 0.49 for the other two.
assert stuck["stopped_at"] is None
stuck_outputs = stuck["snapshots"][-1]["outputs"]
assert stuck_outputs[0] < 0.5 <= stuck_outputs[1]
assert [round(value, 2) for value in stuck_outputs[2:]] == [0.49, 0.49]

for run in (learns, stuck):
    outputs = ", ".join(f"{value:.3f}" for value in run["snapshots"][-1]["outputs"])
    result = f"learns XOR at epoch {run['stopped_at']:,}" if run["stopped_at"] else "does not learn XOR in 10,000 epochs"
    print(f"Seed {run['seed']} {result}. Final outputs: {outputs}")

data_directory = Path("../widgets/data")
data_directory.mkdir(parents=True, exist_ok=True)
(data_directory / "xor-training.json").write_text(json.dumps({
    "inputs": [list(inputs) for inputs, _ in XOR],
    "targets": [desired for _, (desired,) in XOR],
    "snapshot_every": SNAPSHOT_EVERY,
    "runs": [learns, stuck],
}))
```

In the animation, blue means positive and orange means negative. Line thickness shows the size of each weight. The small squares on the hidden neurons show what each one outputs for every point of the input square, so you can watch each one learn its own line. The large square shows the network's output, with the four XOR cases as dots.

```{anywidget} ../widgets/xor-training.mjs
{ "data": "xor-training.json" }
```

The code that runs this panel is in [chapters/1986-backpropagation.md](https://github.com/sauljabin/ai-timeline/blob/main/chapters/1986-backpropagation.md).

## Example: Not Every Start Works

Seed 7 is not special. It is simply the first of the seeds that fail, and failing is not a bug in the code. The starting weights decide where gradient descent begins, and from some starts it cannot get to a solution in practice. The code below trains 50 networks, one per seed from 1 to 50, with the same 10,000-epoch budget.

```{code-cell} python
failed = {}
for seed in range(1, 51):
    network = new_network([2, 2, 1], seed=seed)
    stopped = train(
        network, XOR, learning_rate=0.5, max_epochs=10_000, target_error=0.01
    )
    if stopped is None:
        failed[seed] = [output(network, inputs)[0] for inputs, _ in XOR]

print(f"{50 - len(failed)} of 50 seeds learned XOR within 10,000 epochs.\n")
print("Failed seeds, outputs for (0,0), (0,1), (1,0), (1,1):")
for seed, outputs in failed.items():
    print(f"  seed {seed:>2}: " + ", ".join(f"{y:.2f}" for y in outputs))
    # Two cases stay within 0.05 of 0.5; the other two are answered right.
    undecided = [abs(y - 0.5) < 0.05 for y in outputs]
    assert sum(undecided) == 2
    for y, (_, (desired,)), unsure in zip(outputs, XOR, undecided):
        assert unsure or int(y >= 0.5) == desired

assert len(failed) == 10
assert list(failed)[0] == 7  # seed 7 is the first one that fails
```

Every failed run ends the same way: two cases are right, and the other two outputs are within 0.05 of 0.5. Training longer does not help. Continuing seed 7 for 100,000 epochs gives:

```{code-cell} python
:tags: [remove-input]
network = new_network([2, 2, 1], seed=7)
checkpoints = {}


def remember(epoch, total_error):
    if epoch in (1_000, 10_000, 100_000):
        largest = max(abs(value) for layer in network for neuron in layer for value in neuron["weights"] + [neuron["bias"]])
        checkpoints[epoch] = (total_error, largest)


train(network, XOR, learning_rate=0.5, max_epochs=100_000, target_error=0.01, on_epoch_end=remember)

for epoch, (total_error, largest) in checkpoints.items():
    print(f"epoch {epoch:>7,}: error {total_error:.4f}, largest |weight| {largest:.2f}")

# The error barely moves while the weights keep growing.
assert checkpoints[10_000][0] - checkpoints[100_000][0] < 0.01
assert checkpoints[100_000][1] > checkpoints[10_000][1] > checkpoints[1_000][1]
```

Between epoch 10,000 and 100,000 the error barely moves while the weights keep growing. Leonard Hamey proved in 1998 that this exact 2-2-1 network has no true local minimum, no pit the error cannot get out of. The stuck runs are on a slope so flat that following it would take an impractical number of epochs. In practice the fix is to restart training from other random weights.

## Example: Reading Digits from Pixels

An image becomes network input by turning each pixel into a number. This example uses digits drawn on a 5-by-7 grid, so each image is 35 numbers: `1.0` for a dark pixel, `0.0` for a white one. The network has 35 inputs, 16 hidden neurons, and 10 outputs, one per digit. The desired output for the digit 3 is `1` for output 3 and `0` for the other nine.

The training set has each clean digit plus 4 noisy copies, where each pixel flips with a 4% chance.

```{code-cell} python
# "#" is a dark pixel and "." a white pixel.
DIGITS = {
    0: (".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."),
    1: ("..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."),
    2: (".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"),
    3: ("####.", "....#", "....#", ".###.", "....#", "....#", "####."),
    4: ("...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."),
    5: ("#####", "#....", "#....", "####.", "....#", "....#", "####."),
    6: (".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."),
    7: ("#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."),
    8: (".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."),
    9: (".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."),
}


def pixels(pattern):
    # Read the grid row by row into 35 numbers.
    return [1.0 if pixel == "#" else 0.0 for row in pattern for pixel in row]


def add_noise(image, flip_chance, rng):
    # Each pixel independently flips from dark to white or white to dark.
    return [
        1.0 - pixel if rng.random() < flip_chance else pixel for pixel in image
    ]


def read_digit(network, image):
    # The most active of the 10 output neurons is the answer.
    outputs = output(network, image)
    return outputs.index(max(outputs))


def one_hot(digit):
    return [1.0 if candidate == digit else 0.0 for candidate in range(10)]


training_noise = random.Random(1986)
digit_examples = []
for digit, pattern in DIGITS.items():
    digit_examples.append((pixels(pattern), one_hot(digit)))
    for _ in range(4):
        noisy = add_noise(pixels(pattern), 0.04, training_noise)
        digit_examples.append((noisy, one_hot(digit)))

digit_reader = new_network([35, 16, 10], seed=1986)
digit_epochs = train(
    digit_reader, digit_examples,
    learning_rate=0.3, max_epochs=3_000, target_error=0.05,
)
print(f"{len(digit_examples)} training images.")
print(f"Error below 0.05 after {digit_epochs} epochs.")
assert digit_epochs is not None  # training reached the target

for digit, pattern in DIGITS.items():
    assert read_digit(digit_reader, pixels(pattern)) == digit
print("All 10 clean digits are read correctly.")
```

Reading the clean digits correctly only shows that the network remembers its training data. The real test is images it has never seen. The next cell makes 50 new noisy copies of every digit, with a different random seed, and counts how many the network reads correctly.

```{code-cell} python
test_noise = random.Random(2024)
accuracy = {}

for flip_chance in (0.04, 0.10, 0.20):
    # 50 new noisy copies of every digit, in the same order on every run.
    tests = [
        (add_noise(pixels(pattern), flip_chance, test_noise), digit)
        for digit, pattern in DIGITS.items()
        for _ in range(50)
    ]
    correct = sum(read_digit(digit_reader, image) == d for image, d in tests)
    accuracy[flip_chance] = correct / len(tests)
    print(f"{flip_chance:.0%} of pixels flipped: {correct}/{len(tests)} "
          f"correct ({accuracy[flip_chance]:.1%})")

assert accuracy[0.04] > accuracy[0.10] > accuracy[0.20]
```

Accuracy drops as the noise grows. At 20% about 7 of the 35 pixels are flipped, and some noisy digits look like other digits even to a person.

Real images come as files. Below, the number `1986` is drawn into a PNG file, loaded back, cut into four 5-by-7 cells, and read. Pillow stores white as 255 and black as 0, so each pixel becomes `1 - value / 255`, which turns black into `1.0` as the network expects. The four digits are the clean training patterns, so this checks the image handling, not how well the network generalizes.

```{code-cell} python
:tags: [remove-input]
from io import BytesIO

from IPython.display import display
from PIL import Image


def create_number_image(number):
    # Black digits on a white grayscale image, with a 1-pixel gap between digits.
    image = Image.new("L", (len(number) * 6 - 1, 7), color=255)
    for index, character in enumerate(number):
        for y, row in enumerate(DIGITS[int(character)]):
            for x, pixel in enumerate(row):
                if pixel == "#":
                    image.putpixel((index * 6 + x, y), 0)
    return image


png_file = BytesIO()
create_number_image("1986").save(png_file, format="PNG")
png_file.seek(0)
loaded_image = Image.open(png_file).convert("L")

recognized = ""
for index in range((loaded_image.width + 1) // 6):
    cell = loaded_image.crop((index * 6, 0, index * 6 + 5, 7))
    image = [1 - cell.getpixel((x, y)) / 255 for y in range(7) for x in range(5)]
    recognized += str(read_digit(digit_reader, image))

# Enlarge 12x without smoothing so each pixel stays a sharp square.
display(loaded_image.resize((loaded_image.width * 12, loaded_image.height * 12), Image.Resampling.NEAREST))
print(f"Recognized number: {recognized}")
assert recognized == "1986"
```

The panel below runs the trained network in your browser. Draw a digit, or start from one of the ten patterns and flip some pixels. The middle card shows the 16 hidden neurons. Each small image is that neuron's 35 input weights laid out on the 5-by-7 grid: blue pixels push the neuron to fire, orange pixels hold it back.

```{code-cell} python
:tags: [remove-cell]
check_noise = random.Random(7)
check_images = [pixels(pattern) for pattern in DIGITS.values()]
check_images += [add_noise(pixels(pattern), 0.1, check_noise) for pattern in DIGITS.values() for _ in range(10)]

(data_directory / "digit-reader.json").write_text(json.dumps({
    "width": 5,
    "height": 7,
    "patterns": {str(digit): pixels(pattern) for digit, pattern in DIGITS.items()},
    "layers": digit_reader,
    "checks": [{"inputs": image, "outputs": output(digit_reader, image)} for image in check_images],
}))
```

```{anywidget} ../widgets/digit-reader.mjs
{ "data": "digit-reader.json" }
```

The code that runs this panel is in [chapters/1986-backpropagation.md](https://github.com/sauljabin/ai-timeline/blob/main/chapters/1986-backpropagation.md).

## Why This Mattered

Backpropagation gave a practical way to train the hidden layers that single-layer perceptrons lacked. The XOR example shows the smallest case: two hidden neurons each learn a line, and together they solve a problem no single line can. The 1986 paper's main point was that hidden units discover their own features of the input. The same algorithm, run on far bigger networks and datasets, still trains almost every deep learning model.

## How This Differs from the Original

- The 1986 paper added up the gradients from all training cases before changing the weights, and it added a "momentum" term that keeps part of the previous weight change. This page updates after every example and uses no momentum, to keep the code short.
- The paper's examples were different tasks, such as detecting symmetry in a row of bits and learning a family tree. XOR and digits are standard classroom examples.

## Sources

- David E. Rumelhart, Geoffrey E. Hinton, and Ronald J. Williams, "Learning representations by back-propagating errors", *Nature* 323, 1986, pp. 533–536.
- David E. Rumelhart, Geoffrey E. Hinton, and Ronald J. Williams, "Learning internal representations by error propagation", in Rumelhart and McClelland (eds.), *Parallel Distributed Processing*, vol. 1, MIT Press, 1986.
- Marvin Minsky and Seymour Papert, *Perceptrons*, MIT Press, 1969.
- Seppo Linnainmaa, master's thesis on the Taylor expansion of accumulated rounding errors (reverse-mode differentiation), University of Helsinki, 1970.
- Paul J. Werbos, *Beyond Regression: New Tools for Prediction and Analysis in the Behavioral Sciences*, PhD thesis, Harvard University, 1974.
- Leonard G. C. Hamey, "XOR has no local minima: A case study in neural network error surface analysis", *Neural Networks* 11(4), 1998, pp. 669–681.
