// Replays perceptron training recorded by chapters/1957-perceptron.md,
// one training example per frame. The shaded regions use the tested
// JavaScript copy of predict in shared/perceptron.js.
import { Transport, createPanel, element, loadData, mix, prepareCanvas, showLoadError } from "../widgets/shared/ui.js";
import { predict } from "../widgets/shared/perceptron.js";

// The square shows inputs from -0.5 to 1.5, so the four cases sit well inside it.
const DOMAIN = [-0.5, 1.5];

// Negative numbers inside a sum get parentheses; results are shown plainly.
const signed = (value) => (value < 0 ? `(−${-value})` : String(value));
const plain = (value) => (value < 0 ? `−${-value}` : String(value));

function renderTraining(el, data) {
  const panel = createPanel(el, {
    title: "Perceptron training, one example at a time",
    subtitle: "Each step shows one training example: the prediction, the error, and the weight change it causes.",
  });

  let gateIndex = 0;
  let frame = 0;
  const gate = () => data.gates[gateIndex];
  // Frame 0 is the starting state; frame k shows the result of training step k.
  const frameCount = () => gate().steps.length + 1;
  const state = () => (frame === 0 ? { weights: [0, 0], bias: 0 } : gate().steps[frame - 1]);

  const gateButtons = data.gates.map((candidate, index) => {
    const button = element("button", { type: "button", "aria-pressed": String(index === 0), text: candidate.name });
    button.addEventListener("click", () => {
      gateIndex = index;
      frame = 0;
      gateButtons.forEach((other, otherIndex) => other.setAttribute("aria-pressed", String(otherIndex === index)));
      transport.setFrameCount(frameCount());
      transport.play();
      draw();
    });
    return button;
  });

  const transport = new Transport({
    stepsPerSecond: 1.5,
    frameCount: frameCount(),
    onNext: () => {
      if (frame >= frameCount() - 1) return false;
      frame += 1;
      draw();
      return true;
    },
    onPrevious: () => { frame = Math.max(0, frame - 1); draw(); },
    onReset: () => { frame = 0; draw(); },
    onSeek: (position) => { frame = position; draw(); },
    getState: () => ({
      label: frame === 0 ? "Start: all weights and the bias are 0" : `Epoch ${gate().steps[frame - 1].epoch}, example ${gate().steps[frame - 1].index + 1} of 4`,
      canGoBack: frame > 0,
      canGoForward: frame < frameCount() - 1,
      position: frame,
    }),
  });

  const canvas = element("canvas", { role: "img", "aria-label": "Inputs, decision line, and predicted regions" });
  const plotCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "Inputs (x1 to the right, x2 up) and the decision line" }),
    canvas,
  ]);
  const explanation = element("div", { class: "tl-stack tl-numbers", style: "gap: 6px; font-size: 14px" });
  const tableHolder = element("div");
  const explainCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "What happens in this step" }),
    explanation,
    element("p", { class: "tl-label", style: "margin-top: 14px", text: "Current answers for all four inputs" }),
    tableHolder,
  ]);
  const swatch = (style) => element("span", { class: "tl-swatch", style });
  panel.body.append(
    element("div", { class: "tl-segmented" }, gateButtons),
    transport.element,
    element("div", { class: "tl-columns" }, [plotCard, explainCard]),
    element("div", { class: "tl-legend" }, [
      element("span", {}, [swatch("background: color-mix(in srgb, var(--tl-positive) 30%, var(--tl-surface))"), "predicts 1"]),
      element("span", {}, [swatch("background: color-mix(in srgb, var(--tl-negative) 30%, var(--tl-surface))"), "predicts 0"]),
      element("span", {}, [swatch("background: var(--tl-positive); border-radius: 50%"), "desired 1"]),
      element("span", {}, [swatch("background: var(--tl-negative); border-radius: 50%"), "desired 0"]),
    ]),
  );

  function drawPlot() {
    const size = Math.min(plotCard.clientWidth - 24, 340);
    const context = prepareCanvas(canvas, size, size);
    const { weights, bias } = state();
    const toPixel = (value) => ((value - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * size;
    const toInput = (pixel) => DOMAIN[0] + (pixel / size) * (DOMAIN[1] - DOMAIN[0]);
    const surface = panel.color("surface");
    const yes = mix(surface, panel.color("positive"), 0.28);
    const no = mix(surface, panel.color("negative"), 0.28);

    // Shade every small block by what the perceptron predicts there.
    const block = 4;
    for (let px = 0; px < size; px += block) {
      for (let py = 0; py < size; py += block) {
        const inputs = [toInput(px + block / 2), toInput(size - py - block / 2)];
        context.fillStyle = predict(weights, bias, inputs) ? yes : no;
        context.fillRect(px, py, block, block);
      }
    }

    // The decision line w1*x1 + w2*x2 + b = 0, where the prediction switches.
    const [w1, w2] = weights;
    context.strokeStyle = panel.color("text");
    context.lineWidth = 2;
    context.beginPath();
    if (w2 !== 0) {
      const yAt = (x1) => -(w1 * x1 + bias) / w2;
      context.moveTo(0, size - toPixel(yAt(DOMAIN[0])));
      context.lineTo(size, size - toPixel(yAt(DOMAIN[1])));
    } else if (w1 !== 0) {
      const x1 = -bias / w1;
      context.moveTo(toPixel(x1), 0);
      context.lineTo(toPixel(x1), size);
    }
    context.stroke();

    // The four training cases; the current example gets a ring.
    const current = frame === 0 ? null : gate().steps[frame - 1].index;
    gate().examples.forEach(([x1, x2, desired], index) => {
      const px = toPixel(x1);
      const py = size - toPixel(x2);
      if (index === current) {
        context.strokeStyle = panel.color("text");
        context.lineWidth = 2.5;
        context.beginPath();
        context.arc(px, py, 16, 0, Math.PI * 2);
        context.stroke();
      }
      context.fillStyle = desired ? panel.color("positive") : panel.color("negative");
      context.strokeStyle = surface;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(px, py, 9, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = panel.color("text");
      context.font = "12px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(`(${x1}, ${x2})`, px, py + 26);
    });
  }

  function drawExplanation() {
    explanation.innerHTML = "";
    const line = (text, style = "") => explanation.append(element("div", { text, style }));
    if (frame === 0) {
      line("Weights w1 = 0, w2 = 0 and bias b = 0.");
      line("Every input gives a total of 0, and 0 ≥ 0, so the perceptron answers 1 everywhere. There is no line yet.");
      return;
    }
    const step = gate().steps[frame - 1];
    const [x1, x2] = step.inputs;
    const [w1, w2] = step.before.weights;
    const b = step.before.bias;
    line(`Example (${x1}, ${x2}), desired answer ${step.desired}.`, "font-weight: 600");
    line(`Total: ${signed(w1)}·${x1} + ${signed(w2)}·${x2} + ${signed(b)} = ${plain(step.total)}, so it predicts ${step.prediction}.`);
    if (step.error === 0) {
      line("Correct, so nothing changes.", "color: var(--tl-muted)");
    } else {
      line(`Wrong: error = ${step.desired} − ${step.prediction} = ${plain(step.error)}.`, "color: var(--tl-negative)");
      line(`w1 = ${signed(w1)} + ${signed(step.error)}·${x1} = ${plain(step.weights[0])}`);
      line(`w2 = ${signed(w2)} + ${signed(step.error)}·${x2} = ${plain(step.weights[1])}`);
      line(`b = ${signed(b)} + ${signed(step.error)} = ${plain(step.bias)}`);
    }
    line(`Mistakes so far in epoch ${step.epoch}: ${step.mistakes_in_epoch}`, "color: var(--tl-muted)");
  }

  function drawTable() {
    const { weights, bias } = state();
    const table = element("table");
    table.append(element("tr", {}, ["input", "desired", "predicts"].map((heading) => element("th", { text: heading }))));
    for (const [x1, x2, desired] of gate().examples) {
      const answer = predict(weights, bias, [x1, x2]);
      table.append(element("tr", {}, [
        element("td", { text: `(${x1}, ${x2})` }),
        element("td", { text: String(desired) }),
        element("td", { text: `${answer} ${answer === desired ? "✓" : "✗"}`, style: answer === desired ? "" : "color: var(--tl-negative)" }),
      ]));
    }
    tableHolder.replaceChildren(table);
  }

  function draw() {
    drawPlot();
    drawExplanation();
    drawTable();
    transport.update();
  }

  panel.onThemeChange(draw);
  new ResizeObserver(() => draw()).observe(plotCard);
  draw();
  transport.autoplayWhenVisible(panel.root);
}

export default {
  async render({ model, el }) {
    try {
      renderTraining(el, await loadData(model.get("data")));
    } catch (error) {
      showLoadError(el, error);
    }
  },
};
