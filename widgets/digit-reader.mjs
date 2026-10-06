// Live digit reader for chapters/1986-backpropagation.md.
// Uses the weights the chapter's Python code trained and saved, and the
// tested JavaScript forward pass in shared/mlp.js.
import { createPanel, diverging, element, loadData, prepareCanvas, roundedRect, showLoadError } from "../widgets/shared/ui.js";
import { forward } from "../widgets/shared/mlp.js";

function renderReader(el, data) {
  const { width, height, patterns, layers } = data;
  const [hiddenLayer, outputLayer] = layers;
  const panel = createPanel(el, {
    title: "Digit reader",
    subtitle: `The trained ${width * height}-${hiddenLayer.length}-${outputLayer.length} network, running in your browser.`,
  });

  let pixels = [...patterns["3"]];

  // ----- Drawing grid
  const gridCanvas = element("canvas", { role: "img", "aria-label": "5 by 7 drawing grid. Click or drag to toggle pixels.", tabindex: "0" });
  const digitButtons = Object.keys(patterns).map((digit) => {
    const button = element("button", { type: "button", class: "tl-icon-only", text: digit, "aria-label": `Load digit ${digit}` });
    button.addEventListener("click", () => { pixels = [...patterns[digit]]; draw(); });
    return button;
  });
  const flipButton = element("button", { type: "button", text: "Flip 3 random pixels" });
  flipButton.addEventListener("click", () => {
    // Pick 3 different pixels, each choice equally likely (partial Fisher-Yates shuffle).
    const indexes = [...pixels.keys()];
    for (let i = 0; i < 3; i += 1) {
      const j = i + Math.floor(Math.random() * (indexes.length - i));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
      pixels[indexes[i]] = 1 - pixels[indexes[i]];
    }
    draw();
  });
  const clearButton = element("button", { type: "button", text: "Clear" });
  clearButton.addEventListener("click", () => { pixels = pixels.map(() => 0); draw(); });

  const reading = element("p", { class: "tl-title tl-numbers", "aria-live": "polite" });
  const hiddenCanvas = element("canvas", { role: "img", "aria-label": "Hidden neurons: input weights and current activation" });
  const outputList = element("div", { class: "tl-stack", style: "gap: 4px" });

  const drawCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "Input: draw on the grid" }),
    gridCanvas,
    element("div", { class: "tl-row", style: "margin-top: 10px; gap: 4px" }, digitButtons),
    element("div", { class: "tl-row", style: "margin-top: 8px" }, [flipButton, clearButton]),
  ]);
  const hiddenCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: `Hidden neurons (${hiddenLayer.length})` }),
    hiddenCanvas,
    element("p", { class: "tl-note", text: "Image: the neuron's input weights (blue excites, orange inhibits). Bar: how strongly it fires now." }),
  ]);
  const outputCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "Output neurons" }),
    reading,
    outputList,
    element("p", { class: "tl-note", text: "Each output is a separate sigmoid between 0 and 1. They are not probabilities and do not add up to 1." }),
  ]);
  panel.body.append(element("div", { class: "tl-columns" }, [drawCard, hiddenCard, outputCard]));

  const cellSize = 30;
  function drawGrid() {
    const context = prepareCanvas(gridCanvas, width * cellSize, height * cellSize);
    context.fillStyle = panel.color("surface");
    context.fillRect(0, 0, width * cellSize, height * cellSize);
    pixels.forEach((value, index) => {
      const x = (index % width) * cellSize;
      const y = Math.floor(index / width) * cellSize;
      context.fillStyle = value ? panel.color("text") : panel.color("neutral");
      roundedRect(context, x + 2, y + 2, cellSize - 4, cellSize - 4, 5);
      context.fill();
    });
  }

  function drawHidden(activations) {
    const columns = 4;
    const gap = 10;
    const available = Math.min(hiddenCard.clientWidth - 26, 320);
    const tile = (available - gap * (columns - 1)) / columns;
    const pixel = tile / width;
    const tileHeight = pixel * height;
    const rows = Math.ceil(hiddenLayer.length / columns);
    const context = prepareCanvas(hiddenCanvas, available, rows * (tileHeight + 16 + gap));
    // One color scale for all hidden weights, so tiles can be compared with each other.
    const maxWeight = Math.max(...hiddenLayer.flatMap((neuron) => neuron.weights.map(Math.abs)));

    hiddenLayer.forEach((neuron, index) => {
      const left = (index % columns) * (tile + gap);
      const top = Math.floor(index / columns) * (tileHeight + 16 + gap);
      neuron.weights.forEach((weight, pixelIndex) => {
        context.fillStyle = diverging(panel, weight / maxWeight);
        context.fillRect(left + (pixelIndex % width) * pixel, top + Math.floor(pixelIndex / width) * pixel, Math.ceil(pixel), Math.ceil(pixel));
      });
      context.fillStyle = panel.color("grid");
      roundedRect(context, left, top + tileHeight + 5, tile, 6, 3);
      context.fill();
      context.fillStyle = panel.color("accent");
      roundedRect(context, left, top + tileHeight + 5, Math.max(2, tile * activations[index]), 6, 3);
      context.fill();
    });
  }

  function drawOutputs(outputs) {
    const winner = outputs.indexOf(Math.max(...outputs));
    reading.textContent = outputs[winner] >= 0.5
      ? `Reads as ${winner}`
      : `Reads as ${winner}, weakly (highest output ${outputs[winner].toFixed(2)})`;
    outputList.innerHTML = "";
    outputs.forEach((value, digit) => {
      const isWinner = digit === winner;
      outputList.append(element("div", { class: "tl-row tl-numbers", style: "gap: 8px; flex-wrap: nowrap" }, [
        element("span", { text: String(digit), style: `width: 1ch; font-weight: ${isWinner ? 700 : 400}` }),
        element("span", { style: "flex: 1; height: 10px; border-radius: 5px; background: var(--tl-grid); overflow: hidden" }, [
          element("span", { style: `display: block; height: 100%; width: ${(value * 100).toFixed(1)}%; background: ${isWinner ? "var(--tl-accent)" : "var(--tl-muted)"}` }),
        ]),
        element("span", { text: value.toFixed(3), style: "width: 5ch; text-align: right; font-size: 12px; color: var(--tl-muted)" }),
      ]));
    });
  }

  function draw() {
    const [, hidden, outputs] = forward(layers, pixels);
    drawGrid();
    drawHidden(hidden);
    drawOutputs(outputs);
  }

  // The first cell touched decides whether dragging draws or erases.
  let paintValue = null;
  const paint = (event) => {
    const box = gridCanvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - box.left) / cellSize);
    const y = Math.floor((event.clientY - box.top) / cellSize);
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    if (paintValue === null) paintValue = pixels[index] ? 0 : 1;
    if (pixels[index] !== paintValue) {
      pixels[index] = paintValue;
      draw();
    }
  };
  gridCanvas.addEventListener("pointerdown", (event) => {
    gridCanvas.setPointerCapture(event.pointerId);
    paintValue = null;
    paint(event);
  });
  gridCanvas.addEventListener("pointermove", (event) => { if (paintValue !== null) paint(event); });
  const stopPainting = () => { paintValue = null; };
  gridCanvas.addEventListener("pointerup", stopPainting);
  gridCanvas.addEventListener("pointercancel", stopPainting);

  panel.onThemeChange(draw);
  new ResizeObserver(() => draw()).observe(hiddenCard);
  draw();
}

export default {
  async render({ model, el }) {
    try {
      renderReader(el, await loadData(model.get("data")));
    } catch (error) {
      showLoadError(el, error);
    }
  },
};
