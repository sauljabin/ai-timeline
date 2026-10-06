// One backpropagation training step in slow motion, for
// chapters/1986-backpropagation.md. Every value shown was recorded by the
// chapter's Python code; this module only draws them (and writes t − y).
import { Transport, createPanel, element, formatNumber, loadData, mix, prepareCanvas, roundedRect, showLoadError } from "../widgets/shared/ui.js";

// Which part of the step each frame shows.
const FRAMES = ["start", "input", "hidden", "output", "error", "output-delta", "hidden-delta", "update"];

function renderStep(el, data) {
  const panel = createPanel(el, {
    title: "One training step in slow motion",
    subtitle: `Input (${data.inputs.join(", ")}), desired output ${data.target}, learning rate ${data.learning_rate}.`,
  });

  let frame = 0;
  const stage = () => FRAMES[frame];
  const reached = (name) => frame >= FRAMES.indexOf(name);

  const transport = new Transport({
    stepsPerSecond: 0.5,
    frameCount: FRAMES.length,
    onNext: () => {
      if (frame >= FRAMES.length - 1) return false;
      frame += 1;
      draw();
      return true;
    },
    onPrevious: () => { frame = Math.max(0, frame - 1); draw(); },
    onReset: () => { frame = 0; draw(); },
    onSeek: (position) => { frame = position; draw(); },
    getState: () => ({
      label: `Part ${frame + 1} of ${FRAMES.length}`,
      canGoBack: frame > 0,
      canGoForward: frame < FRAMES.length - 1,
      position: frame,
    }),
  });

  const canvas = element("canvas", { role: "img", "aria-label": "Network diagram for one training step" });
  const card = element("div", { class: "tl-card" }, [canvas]);
  const explanation = element("div", { class: "tl-stack tl-numbers", style: "gap: 6px; font-size: 14px" });
  panel.body.append(transport.element, card, element("div", { class: "tl-card" }, [explanation]));

  const [x1, x2] = data.inputs;
  const [[h1, h2], [y]] = [data.activations[1], data.activations[2]];
  const [[zh1, zh2], [zy]] = data.z;
  const [[dh1, dh2], [dy]] = data.deltas;
  const fmt = (value, digits = 3) => formatNumber(value, digits);

  function explain() {
    const lines = {
      start: [
        "The network before the step. Weights are on the lines, biases under the neurons.",
        "Blue lines are positive weights, orange lines negative.",
      ],
      input: [`Forward pass: the input x1 = ${x1}, x2 = ${x2} enters the network.`],
      hidden: [
        `Hidden 1: z = ${fmt(zh1)}, a = sigmoid(z) = ${fmt(h1)}`,
        `Hidden 2: z = ${fmt(zh2)}, a = sigmoid(z) = ${fmt(h2)}`,
      ],
      output: [`Output: z = ${fmt(zy)}, y = sigmoid(z) = ${fmt(y)}`],
      error: [`Error: t − y = ${data.target} − ${fmt(y)} = ${fmt(data.target - y)}`, "The output is too low, so the step should raise it."],
      "output-delta": [`Backward pass, output delta: (t − y) · y(1 − y) = ${fmt(dy, 4)}`],
      "hidden-delta": [
        "Each hidden delta: (output weight · output delta) · a(1 − a).",
        `Hidden 1: ${fmt(dh1, 4)}`,
        `Hidden 2: ${fmt(dh2, 4)}`,
      ],
      update: [
        `Update: every weight moves by η · δ · x, with η = ${data.learning_rate}. Changes:`,
        ...changes(),
      ],
    };
    explanation.replaceChildren(...lines[stage()].map((text) => element("div", { text })));
  }

  // One line per weight and bias: old value, new value.
  function changes() {
    const sources = [["x1", "x2"], ["hidden 1", "hidden 2"]];
    const targets = [["hidden 1", "hidden 2"], ["output"]];
    const result = [];
    data.before.forEach((layer, layerIndex) => {
      layer.forEach((neuron, neuronIndex) => {
        const after = data.after[layerIndex][neuronIndex];
        neuron.weights.forEach((weight, inputIndex) => {
          const target = targets[layerIndex][neuronIndex];
          const change = after.weights[inputIndex] === weight ? "unchanged" : `→ ${fmt(after.weights[inputIndex])}`;
          result.push(`${sources[layerIndex][inputIndex]} → ${target}: ${fmt(weight)} ${change}`);
        });
        result.push(`bias of ${targets[layerIndex][neuronIndex]}: ${fmt(neuron.bias)} → ${fmt(after.bias)}`);
      });
    });
    return result;
  }

  function drawNetwork() {
    const width = card.clientWidth - 24;
    const scale = Math.min(width / 420, 1.4);
    const height = Math.round(250 * scale);
    const context = prepareCanvas(canvas, width, height);
    const offset = (width - 420 * scale) / 2;
    const at = ([px, py]) => [offset + px * scale, py * scale];
    const positions = [
      [[50, 70], [50, 190]],
      [[210, 70], [210, 190]],
      [[370, 130]],
    ];
    const network = reached("update") ? data.after : data.before;
    const forwardDone = [true, reached("hidden"), reached("output")];
    const deltaDone = [reached("hidden-delta"), reached("output-delta")];
    const maxWeight = Math.max(...[data.before, data.after].flat(2).flatMap((neuron) => neuron.weights.map(Math.abs)));
    context.font = `${Math.round(12 * scale)}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    // Connections, with the weight written on each.
    network.forEach((layer, layerIndex) => {
      layer.forEach((neuron, neuronIndex) => {
        const [toX, toY] = at(positions[layerIndex + 1][neuronIndex]);
        neuron.weights.forEach((weight, inputIndex) => {
          const [fromX, fromY] = at(positions[layerIndex][inputIndex]);
          // During the backward pass, the output neuron's connections carry the error back.
          const flowingBack = layerIndex === 1 && (stage() === "output-delta" || stage() === "hidden-delta");
          context.strokeStyle = weight >= 0 ? panel.color("positive") : panel.color("negative");
          context.globalAlpha = flowingBack ? 1 : 0.75;
          context.lineWidth = 1 + 6 * (Math.abs(weight) / maxWeight) * scale;
          context.beginPath();
          context.moveTo(fromX, fromY);
          context.lineTo(toX, toY);
          context.stroke();
          context.globalAlpha = 1;
          const along = layerIndex === 1 ? 0.5 : inputIndex === neuronIndex ? 0.38 : 0.62;
          const labelX = fromX + (toX - fromX) * along;
          const labelY = fromY + (toY - fromY) * along;
          const label = fmt(weight);
          const changed = reached("update") && weight !== data.before[layerIndex][neuronIndex].weights[inputIndex];
          const labelWidth = context.measureText(label).width + 8;
          // After the update, weights that changed get a tinted label.
          context.fillStyle = changed ? mix(panel.color("surface"), panel.color("accent"), 0.3) : panel.color("surface");
          roundedRect(context, labelX - labelWidth / 2, labelY - 9 * scale, labelWidth, 18 * scale, 4);
          context.fill();
          context.fillStyle = panel.color("text");
          context.fillText(label, labelX, labelY);
        });
      });
    });

    // Neurons: inputs show their values; others show a after the forward pass and δ after the backward pass.
    const radius = 26 * scale;
    positions.forEach((layer, layerIndex) => {
      layer.forEach((position, neuronIndex) => {
        const [cx, cy] = at(position);
        const active = (stage() === "input" && layerIndex === 0) || (stage() === "hidden" && layerIndex === 1) ||
          ((stage() === "output" || stage() === "error") && layerIndex === 2) ||
          (stage() === "output-delta" && layerIndex === 2) || (stage() === "hidden-delta" && layerIndex === 1);
        context.fillStyle = panel.color("surface");
        context.strokeStyle = active ? panel.color("accent") : panel.color("muted");
        context.lineWidth = active ? 3 : 1.5;
        context.beginPath();
        context.arc(cx, cy, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.fillStyle = panel.color("text");
        if (layerIndex === 0) {
          context.fillText(`x${neuronIndex + 1}`, cx, cy - 8 * scale);
          if (reached("input")) context.fillText(String(data.inputs[neuronIndex]), cx, cy + 9 * scale);
        } else {
          const showA = forwardDone[layerIndex];
          const delta = data.deltas[layerIndex - 1][neuronIndex];
          if (showA) context.fillText(`a ${fmt(data.activations[layerIndex][neuronIndex])}`, cx, cy - 7 * scale);
          if (deltaDone[layerIndex - 1]) {
            context.fillStyle = panel.color("accent");
            context.fillText(`δ ${fmt(delta, 3)}`, cx, cy + 10 * scale);
          }
          context.fillStyle = panel.color("muted");
          context.fillText(`b ${fmt(network[layerIndex - 1][neuronIndex].bias)}`, cx, cy + radius + 12 * scale);
        }
      });
    });
    if (reached("error")) {
      const [ox, oy] = at(positions[2][0]);
      context.fillStyle = panel.color("negative");
      context.fillText(`t = ${data.target}`, ox, oy - radius - 12 * scale);
    }
  }

  function draw() {
    drawNetwork();
    explain();
    transport.update();
  }

  panel.onThemeChange(draw);
  new ResizeObserver(() => draw()).observe(card);
  draw();
  transport.autoplayWhenVisible(panel.root);
}

export default {
  async render({ model, el }) {
    try {
      renderStep(el, await loadData(model.get("data")));
    } catch (error) {
      showLoadError(el, error);
    }
  },
};
