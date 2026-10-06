---
kernelspec:
  name: python3
  display_name: Python 3
---

# 1957 Perceptron

The perceptron is a machine that learns a yes-or-no rule from examples, by adjusting a few numbers every time it gets an example wrong. Frank Rosenblatt described it in 1957 at the Cornell Aeronautical Laboratory and first ran it as a simulation on an IBM 704 computer in 1958. His team then built it as a machine, the Mark I Perceptron, first shown in public in 1960: a 20-by-20 grid of light sensors was its "retina", and electric motors turned adjustable resistors to change its weights. It was one of the first machines that learned instead of following rules someone wrote for it.

## High-Level Ideas

Take two inputs, `x1` and `x2`, each `0` or `1`. The perceptron multiplies each input by a number called its *weight*, adds one more number called the *bias*, and looks at the sign of the total:

$$total = w_1x_1 + w_2x_2 + b$$

$$\text{answer} = \begin{cases} 1, & total \ge 0 \\ 0, & total < 0 \end{cases}$$

With weights `1` and `1` and bias `-1`:

| input | total | answer |
| --- | --- | --- |
| (0, 0) | 1·0 + 1·0 − 1 = −1 | 0 |
| (0, 1) | 1·0 + 1·1 − 1 = 0 | 1 |
| (1, 0) | 1·1 + 1·0 − 1 = 0 | 1 |
| (1, 1) | 1·1 + 1·1 − 1 = 1 | 1 |

That is the logical `OR`. The perceptron does not need anyone to choose these numbers. It starts with every weight and the bias at `0` and goes through the examples. After a wrong answer it changes each number by the *error*, the desired answer minus its answer:

$$error = desired - answer$$

$$w_i \leftarrow w_i + error \times x_i$$

$$b \leftarrow b + error$$

Say it answered `0` for `(0, 1)` but should have said `1`. The error is `+1`, so `w2` grows by 1 (its input was 1), `w1` stays the same (its input was 0), and the bias grows by 1. One pass through all examples is an *epoch*. Training stops after an epoch with no mistakes. This procedure is the *perceptron learning rule*.

## Example: Learning AND and OR

```{code-cell} python
def predict(weights, bias, inputs):
    # Weighted sum plus bias, then the step: 1 if the total is at least 0.
    total = sum(w * x for w, x in zip(weights, inputs)) + bias
    return 1 if total >= 0 else 0


def train(examples, max_epochs):
    weights, bias = [0, 0], 0
    history = []  # (mistakes, weights, bias) at the end of each epoch

    for _ in range(max_epochs):
        mistakes = 0
        for inputs, desired in examples:
            error = desired - predict(weights, bias, inputs)
            if error != 0:
                # Only mistakes change anything. An input of 0
                # leaves its weight alone.
                weights = [w + error * x for w, x in zip(weights, inputs)]
                bias += error
                mistakes += 1
        history.append((mistakes, weights, bias))
        if mistakes == 0:
            break

    return weights, bias, history
```

The truth tables of `AND` and `OR` are the training examples:

```{code-cell} python
AND = [((0, 0), 0), ((0, 1), 0), ((1, 0), 0), ((1, 1), 1)]
OR = [((0, 0), 0), ((0, 1), 1), ((1, 0), 1), ((1, 1), 1)]

learned = {}
for name, examples in [("AND", AND), ("OR", OR)]:
    weights, bias, history = train(examples, max_epochs=100)
    learned[name] = (weights, bias)
    mistakes = [count for count, _, _ in history]
    print(f"{name}: weights {weights}, bias {bias}, "
          f"learned in {len(history)} epochs")
    print(f"     mistakes per epoch: {mistakes}")
    for inputs, desired in examples:
        assert predict(weights, bias, inputs) == desired

assert learned == {"AND": ([2, 1], -3), "OR": ([1, 1], -1)}
```

`OR` ends with exactly the weights `[1, 1]` and bias `-1` from the table above. `AND` ends with `[2, 1]` and `-3`: only `(1, 1)` reaches a total of at least 0, because `2 + 1 − 3 = 0`.

## Example: What a Perceptron Cannot Learn

The answer flips where the total is exactly 0, which is the straight line `w1·x1 + w2·x2 + b = 0`. Every input on one side of that line gets `1`, every input on the other side gets `0`. So a perceptron with two inputs can only learn rules where one straight line separates the `1` cases from the `0` cases.

`XOR` (exclusive or) answers `1` when exactly one input is `1`. Its `1` cases, `(0, 1)` and `(1, 0)`, are on opposite corners of the square, and no straight line separates them from `(0, 0)` and `(1, 1)`.

```{code-cell} python
XOR = [((0, 0), 0), ((0, 1), 1), ((1, 0), 1), ((1, 1), 0)]

weights, bias, history = train(XOR, max_epochs=100)
mistakes = [count for count, _, _ in history]
print(f"Mistakes in the first 8 epochs: {mistakes[:8]}")

# Training is deterministic: once the end-of-epoch state repeats,
# every later epoch repeats too, so training can never finish.
end_states = [(tuple(weights), bias) for _, weights, bias in history]
repeat_at = next(
    epoch for epoch in range(1, len(end_states))
    if end_states[epoch] in end_states[:epoch]
)
print(f"After epoch {repeat_at + 1}, the weights and bias "
      f"{end_states[repeat_at]}")
print("are the same as after an earlier epoch.")

assert all(count > 0 for count in mistakes)
assert repeat_at + 1 == 3
```

Every epoch has mistakes, and from epoch 3 on, training goes round the same loop forever. Marvin Minsky and Seymour Papert made this limit widely known in their 1969 book *Perceptrons*. The fix is a hidden layer trained by backpropagation, the [1986 chapter](1986-backpropagation.md).

## Example: Watching Each Step

The panel replays training one example at a time. The shaded areas show what the perceptron currently answers for every point of the plane: blue for `1`, orange for `0`. The line is where the total is exactly 0. The right side shows the arithmetic of each step with the real numbers. Choose `XOR` to watch the loop from the previous example.

```{code-cell} python
:tags: [remove-cell]
import json
from pathlib import Path


def record_steps(examples, max_epochs):
    # The same learning rule as train(), saved one example at a time for the panel.
    weights, bias, steps = [0, 0], 0, []
    for epoch in range(1, max_epochs + 1):
        mistakes = 0
        for index, (inputs, desired) in enumerate(examples):
            before = {"weights": list(weights), "bias": bias}
            total = sum(weight * value for weight, value in zip(weights, inputs)) + bias
            prediction = predict(weights, bias, inputs)
            error = desired - prediction
            if error != 0:
                weights = [weight + error * value for weight, value in zip(weights, inputs)]
                bias += error
                mistakes += 1
            steps.append({
                "epoch": epoch, "index": index, "inputs": list(inputs), "desired": desired,
                "total": total, "prediction": prediction, "error": error, "before": before,
                "weights": list(weights), "bias": bias, "mistakes_in_epoch": mistakes,
            })
        if mistakes == 0:
            break
    return steps, weights, bias


gates = []
for name, examples, max_epochs in [("AND", AND, 100), ("OR", OR, 100), ("XOR", XOR, 4)]:
    steps, weights, bias = record_steps(examples, max_epochs)
    # The recording must end exactly where train() ends.
    assert (weights, bias) == train(examples, max_epochs)[:2]
    gates.append({"name": name, "examples": [[*inputs, desired] for inputs, desired in examples], "steps": steps})

data_directory = Path("../widgets/data")
data_directory.mkdir(parents=True, exist_ok=True)
(data_directory / "perceptron-training.json").write_text(json.dumps({"gates": gates}))
```

```{anywidget} ../widgets/perceptron-training.mjs
{ "data": "perceptron-training.json" }
```

The code that runs this panel is in [chapters/1957-perceptron.md](https://github.com/sauljabin/ai-timeline/blob/main/chapters/1957-perceptron.md).

## Why This Mattered

The perceptron showed that a machine can find a decision rule from labeled examples. When one straight line (or, with more inputs, one flat plane) can separate the classes, the learning rule always stops after a finite number of mistakes. Albert Novikoff proved this *perceptron convergence theorem* in 1962. Weights adjusted after each error are still the core of every neural network.

## How This Differs from the Original

Rosenblatt's perceptron had three layers of units. Sensor units fed "association" units through fixed, randomly chosen connections, and only the weights from the association units to the response unit were learned. This page connects the inputs straight to the response unit, which is the version most textbooks now call "the perceptron".

## Sources

- Frank Rosenblatt, "The Perceptron: A Perceiving and Recognizing Automaton", Report 85-460-1, Cornell Aeronautical Laboratory, 1957.
- Frank Rosenblatt, "The perceptron: A probabilistic model for information storage and organization in the brain", *Psychological Review* 65(6), 1958, pp. 386–408.
- Albert B. J. Novikoff, "On convergence proofs on perceptrons", *Proceedings of the Symposium on the Mathematical Theory of Automata* 12, 1962, pp. 615–622.
- Marvin Minsky and Seymour Papert, *Perceptrons*, MIT Press, 1969.
