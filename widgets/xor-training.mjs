// Replays XOR training recorded by chapters/1986-backpropagation.md.
// Every frame is a snapshot the Python code saved; nothing is interpolated.
// Heat maps use the tested JavaScript forward pass in shared/mlp.js.
import { Transport, createPanel, diverging, element, formatNumber, loadData, prepareCanvas, roundedRect, showLoadError } from "../widgets/shared/ui.js";
import { forward } from "../widgets/shared/mlp.js";

const MAP_RESOLUTION = 40;
// Maps show inputs from -0.15 to 1.15, so the four cases at 0 and 1 sit inside the square.
const DOMAIN = [-0.15, 1.15];
const toPixel = (value, size) => ((value - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * size;
const toInput = (pixel, size) => DOMAIN[0] + (pixel / size) * (DOMAIN[1] - DOMAIN[0]);

function renderTraining(el, data) {
  const panel = createPanel(el, {
    title: "Backpropagation learning XOR",
    subtitle: `Recorded training of a 2-2-1 network. One frame every ${data.snapshot_every} epochs.`,
  });

  let runIndex = 0;
  let frame = 0;
  const run = () => data.runs[runIndex];
  const snapshot = () => run().snapshots[frame];
  const lastEpoch = Math.max(...data.runs.map((candidate) => candidate.errors.length));
  const allErrors = data.runs.flatMap((candidate) => candidate.errors);
  const errorRange = [Math.min(...allErrors, 0.01), Math.max(...allErrors)];

  // ----- Controls
  const runButtons = data.runs.map((candidate, index) => {
    const button = element("button", {
      type: "button",
      "aria-pressed": String(index === 0),
      text: `Seed ${candidate.seed}: ${candidate.stopped_at ? "learns XOR" : "gets stuck"}`,
    });
    button.addEventListener("click", () => {
      runIndex = index;
      frame = 0;
      runButtons.forEach((other, otherIndex) => other.setAttribute("aria-pressed", String(otherIndex === index)));
      transport.setFrameCount(run().snapshots.length);
      transport.play();
      draw();
    });
    return button;
  });

  const transport = new Transport({
    stepsPerSecond: 20,
    frameCount: run().snapshots.length,
    onNext: () => {
      if (frame >= run().snapshots.length - 1) return false;
      frame += 1;
      draw();
      return true;
    },
    onPrevious: () => { frame = Math.max(0, frame - 1); draw(); },
    onReset: () => { frame = 0; draw(); },
    onSeek: (position) => { frame = position; draw(); },
    getState: () => {
      const final = run().errors.length;
      const result = run().stopped_at ? `stopped at ${final.toLocaleString("en-US")}: error below 0.01` : `budget of ${final.toLocaleString("en-US")} used up`;
      return {
        label: `Epoch ${snapshot().epoch.toLocaleString("en-US")} (${result})`,
        canGoBack: frame > 0,
        canGoForward: frame < run().snapshots.length - 1,
        position: frame,
      };
    },
  });

  // ----- Layout
  const networkCanvas = element("canvas", { role: "img", "aria-label": "Network diagram with current weights" });
  const mapCanvas = element("canvas", { role: "img", "aria-label": "Network output over the input square" });
  const errorCanvas = element("canvas", { role: "img", "aria-label": "Error per epoch" });
  const table = element("table");
  const networkCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "Network: weights on the lines, bias under each neuron" }),
    networkCanvas,
  ]);
  const mapCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "Output for inputs from −0.15 to 1.15 (x1 to the right, x2 up)" }),
    mapCanvas,
    table,
  ]);
  const errorCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "Sum of squared errors over the 4 cases, every epoch (log scale)" }),
    errorCanvas,
  ]);
  const swatch = (color) => element("span", { class: "tl-swatch", style: `background: var(--tl-${color})` });
  panel.body.append(
    element("div", { class: "tl-segmented" }, runButtons),
    transport.element,
    element("div", { class: "tl-columns" }, [networkCard, mapCard]),
    errorCard,
    element("div", { class: "tl-legend" }, [
      element("span", {}, [swatch("positive"), "positive weight, output near 1"]),
      element("span", {}, [swatch("negative"), "negative weight, output near 0"]),
      element("span", {}, ["Small squares: each neuron's output over the whole input square"]),
    ]),
  );

  // Paints one neuron's (or the network's) output over the unit square.
  function paintMap(context, x, y, size, layers, layerIndex, neuronIndex, resolution) {
    const cell = size / resolution;
    for (let row = 0; row < resolution; row += 1) {
      for (let column = 0; column < resolution; column += 1) {
        const inputs = [toInput((column + 0.5) * cell, size), toInput(size - (row + 0.5) * cell, size)];
        const value = forward(layers, inputs)[layerIndex][neuronIndex];
        context.fillStyle = diverging(panel, 2 * value - 1);
        context.fillRect(x + column * cell, y + row * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
  }

  function drawNetwork() {
    const width = networkCard.clientWidth - 26;
    const height = Math.round(width * 0.74);
    const context = prepareCanvas(networkCanvas, width, height);
    const { layers } = snapshot();
    const scale = width / 360;
    const text = panel.color("text");
    const muted = panel.color("muted");
    const surface = panel.color("surface");
    const node = 46 * scale;
    const positions = [
      [[44, 70], [44, 210]],
      [[190, 70], [190, 210]],
      [[316, 140]],
    ].map((layer) => layer.map(([x, y]) => [x * scale, y * scale]));

    // Line thickness uses one fixed scale for the whole run, so thickness is comparable across frames.
    const maxWeight = Math.max(...run().snapshots.flatMap((s) => s.layers.flat().flatMap((n) => n.weights.map(Math.abs))));
    context.font = `${Math.max(10, 11 * scale)}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    layers.forEach((layer, layerIndex) => {
      layer.forEach((neuron, neuronIndex) => {
        const [toX, toY] = positions[layerIndex + 1][neuronIndex];
        neuron.weights.forEach((weight, inputIndex) => {
          const [fromX, fromY] = positions[layerIndex][inputIndex];
          context.strokeStyle = weight >= 0 ? panel.color("positive") : panel.color("negative");
          context.lineWidth = 1 + 7 * (Math.abs(weight) / maxWeight) * scale;
          context.beginPath();
          context.moveTo(fromX, fromY);
          context.lineTo(toX, toY);
          context.stroke();
        });
      });
    });
    // Weight labels after all lines, so no line crosses a label.
    layers.forEach((layer, layerIndex) => {
      layer.forEach((neuron, neuronIndex) => {
        const [toX, toY] = positions[layerIndex + 1][neuronIndex];
        neuron.weights.forEach((weight, inputIndex) => {
          const [fromX, fromY] = positions[layerIndex][inputIndex];
          // Straight lines get their label near the start; the two crossing lines near
          // their end, so the labels do not meet where the lines cross.
          const along = layerIndex === 1 ? 0.5 : inputIndex === neuronIndex ? 0.3 : 0.6;
          const labelX = fromX + (toX - fromX) * along;
          const labelY = fromY + (toY - fromY) * along;
          const label = formatNumber(weight);
          const labelWidth = context.measureText(label).width + 8;
          context.fillStyle = surface;
          roundedRect(context, labelX - labelWidth / 2, labelY - 9 * scale, labelWidth, 18 * scale, 4);
          context.fill();
          context.fillStyle = text;
          context.fillText(label, labelX, labelY);
        });
      });
    });

    // Input neurons are plain circles; the others show their own output maps.
    positions[0].forEach(([x, y], index) => {
      context.fillStyle = surface;
      context.strokeStyle = muted;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(x, y, 18 * scale, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = text;
      context.fillText(`x${index + 1}`, x, y);
    });
    layers.forEach((layer, layerIndex) => {
      layer.forEach((neuron, neuronIndex) => {
        const [x, y] = positions[layerIndex + 1][neuronIndex];
        context.save();
        roundedRect(context, x - node / 2, y - node / 2, node, node, 8);
        context.clip();
        paintMap(context, x - node / 2, y - node / 2, node, layers, layerIndex + 1, neuronIndex, 16);
        context.restore();
        context.strokeStyle = muted;
        context.lineWidth = 1;
        roundedRect(context, x - node / 2, y - node / 2, node, node, 8);
        context.stroke();
        context.fillStyle = muted;
        context.fillText(`b ${formatNumber(neuron.bias)}`, x, y + node / 2 + 11 * scale);
      });
    });
    context.fillStyle = muted;
    context.fillText("inputs", positions[0][0][0], 18 * scale);
    context.fillText("hidden", positions[1][0][0], 18 * scale);
    context.fillText("output", positions[2][0][0], 18 * scale);
  }

  function drawMap() {
    const size = Math.min(mapCard.clientWidth - 26, 300);
    const context = prepareCanvas(mapCanvas, size, size);
    const { layers } = snapshot();
    paintMap(context, 0, 0, size, layers, 2, 0, MAP_RESOLUTION);

    // The four training cases, colored by their desired output.
    data.inputs.forEach(([x1, x2], index) => {
      const x = toPixel(x1, size);
      const y = size - toPixel(x2, size);
      context.fillStyle = data.targets[index] === 1 ? panel.color("positive") : panel.color("negative");
      context.strokeStyle = panel.color("surface");
      context.lineWidth = 3;
      context.beginPath();
      context.arc(x, y, 8, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    });

    table.innerHTML = "";
    table.append(element("tr", {}, ["input", "desired", "output", "class"].map((heading) => element("th", { text: heading }))));
    data.inputs.forEach((inputs, index) => {
      const output = snapshot().outputs[index];
      const predicted = output >= 0.5 ? 1 : 0;
      const right = predicted === data.targets[index];
      table.append(element("tr", {}, [
        element("td", { text: `(${inputs.join(", ")})` }),
        element("td", { text: String(data.targets[index]) }),
        element("td", { text: output.toFixed(3) }),
        element("td", { text: `${predicted} ${right ? "✓" : "✗"}`, style: right ? "" : "color: var(--tl-negative)" }),
      ]));
    });
  }

  function drawErrors() {
    const width = errorCard.clientWidth - 26;
    const height = 150;
    const context = prepareCanvas(errorCanvas, width, height);
    const left = 40;
    const bottom = height - 20;
    const top = 6;
    const [low, high] = errorRange.map(Math.log10);
    // Leave 24 px on the right so the last x label is not cut off.
    const xFor = (epoch) => left + (epoch / lastEpoch) * (width - left - 24);
    const yFor = (error) => bottom - ((Math.log10(error) - low) / (high - low)) * (bottom - top);
    const muted = panel.color("muted");

    context.font = "11px system-ui, sans-serif";
    context.fillStyle = muted;
    context.strokeStyle = panel.color("grid");
    context.lineWidth = 1;
    context.textAlign = "right";
    context.textBaseline = "middle";
    for (let power = Math.ceil(low); power <= Math.floor(high); power += 1) {
      const y = yFor(10 ** power);
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(width, y);
      context.stroke();
      context.fillText(String(10 ** power), left - 6, y);
    }
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    for (let epoch = 0; epoch <= lastEpoch; epoch += 2500) context.fillText(epoch.toLocaleString("en-US"), xFor(epoch), height - 4);

    // Dashed line: the stopping target.
    context.setLineDash([4, 4]);
    context.strokeStyle = muted;
    context.beginPath();
    context.moveTo(left, yFor(0.01));
    context.lineTo(width, yFor(0.01));
    context.stroke();
    context.setLineDash([]);

    // Whole run faint, the part already played in the accent color.
    const errors = run().errors;
    const shown = snapshot().epoch;
    const trace = (from, to) => {
      context.beginPath();
      for (let epoch = from; epoch <= to; epoch += 1) {
        const x = xFor(epoch);
        const y = yFor(errors[epoch - 1]);
        if (epoch === from) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    };
    context.lineWidth = 1.5;
    context.strokeStyle = panel.color("grid");
    trace(1, errors.length);
    if (shown >= 1) {
      context.strokeStyle = panel.color("accent");
      trace(1, shown);
      context.fillStyle = panel.color("accent");
      context.beginPath();
      context.arc(xFor(shown), yFor(errors[shown - 1]), 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function draw() {
    drawNetwork();
    drawMap();
    drawErrors();
    transport.update();
  }

  panel.onThemeChange(draw);
  new ResizeObserver(() => draw()).observe(panel.body);
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
