// Interactive Game of Life board for chapters/1970-conways-game-of-life.md.
// Starting patterns come from the chapter's Python code; the rules are the
// tested JavaScript copy in shared/life.js.
import { Transport, createPanel, element, loadData, mix, prepareCanvas, roundedRect, showLoadError } from "../widgets/shared/ui.js";
import { cellKey, nextGenerationOnTorus } from "../widgets/shared/life.js";

const HISTORY_LIMIT = 1000;
const SPARKLINE_LENGTH = 240;

// Small seeded random generator (mulberry32), so a random board can be recreated from its seed.
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderBoard(el, data) {
  const { width, height, presets } = data;
  const panel = createPanel(el, {
    title: "Game of Life board",
    subtitle: `${width} × ${height} cells. The edges wrap around: what leaves on one side comes back on the other.`,
  });

  // history[i] is the set of live cells at generation firstGeneration + i.
  let history = [];
  let firstGeneration = 0;
  let populations = [];
  let showChanges = true;
  let randomSeed = 1;
  let currentStart = { label: "", cells: new Set() };

  const current = () => history[history.length - 1];
  const generation = () => firstGeneration + history.length - 1;

  const startFrom = (label, cells) => {
    currentStart = { label, cells };
    history = [cells];
    firstGeneration = 0;
    populations = [cells.size];
    draw();
  };

  const presetCells = (preset) => new Set(preset.cells.map(([x, y]) => cellKey(x, y, width)));

  // ----- Controls
  const presetSelect = element("select", { "aria-label": "Starting pattern" });
  presets.forEach((preset, index) => presetSelect.append(element("option", { value: String(index), text: preset.name })));
  presetSelect.append(element("option", { value: "random", text: "Random cells" }), element("option", { value: "empty", text: "Empty board" }));

  const loadSelection = () => {
    transport.pause();
    const value = presetSelect.value;
    if (value === "empty") startFrom("Empty board", new Set());
    else if (value === "random") {
      // Each choice of "Random cells" uses the next seed; 30% of cells start alive.
      const random = seededRandom(randomSeed);
      const cells = new Set();
      for (let key = 0; key < width * height; key += 1) if (random() < 0.3) cells.add(key);
      startFrom(`Random cells, seed ${randomSeed}`, cells);
      randomSeed += 1;
    } else startFrom(presets[Number(value)].name, presetCells(presets[Number(value)]));
    description.textContent = value === "random" || value === "empty"
      ? (value === "random" ? "Each cell starts alive with a 30% chance. The seed number recreates the same board." : "Click or drag on the board to draw your own pattern.")
      : presets[Number(value)].description;
  };
  presetSelect.addEventListener("change", loadSelection);

  const changesToggle = element("input", { type: "checkbox", checked: "" });
  changesToggle.addEventListener("change", () => {
    showChanges = changesToggle.checked;
    legend.hidden = !showChanges;
    draw();
  });

  const description = element("p", { class: "tl-note" });
  const stats = element("p", { class: "tl-note tl-numbers" });

  const transport = new Transport({
    stepsPerSecond: 10,
    onNext: () => {
      history.push(nextGenerationOnTorus(current(), width, height));
      if (history.length > HISTORY_LIMIT) {
        history.shift();
        firstGeneration += 1;
      }
      populations.push(current().size);
      if (populations.length > SPARKLINE_LENGTH) populations.shift();
      draw();
      return true;
    },
    onPrevious: () => {
      if (history.length < 2) return;
      history.pop();
      populations.pop();
      draw();
    },
    onReset: () => startFrom(currentStart.label, currentStart.cells),
    getState: () => ({
      label: `Generation ${generation().toLocaleString("en-US")}`,
      canGoBack: history.length > 1,
      canGoForward: true,
    }),
  });

  // ----- Board canvas
  const canvas = element("canvas", { role: "img", "aria-label": "Game of Life board. Click or drag to toggle cells.", tabindex: "0", style: "margin: 0 auto; cursor: crosshair" });
  const sparkline = element("canvas", { role: "img", "aria-label": "Population over recent generations" });
  const swatch = (style) => element("span", { class: "tl-swatch", style });
  const legend = element("div", { class: "tl-legend" }, [
    element("span", {}, [swatch("background: var(--tl-accent)"), "alive"]),
    element("span", {}, [swatch("background: color-mix(in srgb, var(--tl-accent) 45%, var(--tl-surface))"), "born this step"]),
    element("span", {}, [swatch("border: 1.5px solid var(--tl-negative)"), "died this step"]),
  ]);

  const boardCard = element("div", { class: "tl-card" }, [canvas]);
  panel.body.append(
    element("div", { class: "tl-row" }, [
      presetSelect,
      element("label", { class: "tl-check" }, [changesToggle, "Show changes"]),
    ]),
    description,
    boardCard,
    legend,
    transport.element,
    element("div", { class: "tl-card" }, [element("p", { class: "tl-label", text: "Population (live cells), last 240 generations" }), sparkline]),
    stats,
  );

  let cellSize = 10;

  function draw() {
    const boardWidth = boardCard.clientWidth - 24;
    cellSize = Math.max(4, Math.floor(boardWidth / width));
    const context = prepareCanvas(canvas, cellSize * width, cellSize * height);
    const surface = panel.color("surface");
    const accent = panel.color("accent");
    const born = mix(accent, surface, 0.55);
    const died = panel.color("negative");
    const cells = current();
    const previous = showChanges && history.length > 1 ? history[history.length - 2] : null;

    context.fillStyle = surface;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Faint grid so single cells are easy to aim at.
    context.strokeStyle = panel.color("grid");
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= width; x += 1) {
      context.moveTo(x * cellSize + 0.5, 0);
      context.lineTo(x * cellSize + 0.5, height * cellSize);
    }
    for (let y = 0; y <= height; y += 1) {
      context.moveTo(0, y * cellSize + 0.5);
      context.lineTo(width * cellSize, y * cellSize + 0.5);
    }
    context.stroke();

    const inset = cellSize >= 8 ? 1.5 : 0.5;
    const radius = Math.min(3, cellSize / 4);
    for (const key of cells) {
      const x = key % width;
      const y = (key - x) / width;
      context.fillStyle = previous && !previous.has(key) ? born : accent;
      roundedRect(context, x * cellSize + inset, y * cellSize + inset, cellSize - 2 * inset, cellSize - 2 * inset, radius);
      context.fill();
    }
    if (previous) {
      context.strokeStyle = died;
      context.lineWidth = 1.5;
      for (const key of previous) {
        if (cells.has(key)) continue;
        const x = key % width;
        const y = (key - x) / width;
        roundedRect(context, x * cellSize + inset + 0.75, y * cellSize + inset + 0.75, cellSize - 2 * inset - 1.5, cellSize - 2 * inset - 1.5, radius);
        context.stroke();
      }
    }

    drawSparkline();
    const bornCount = previous ? [...cells].filter((key) => !previous.has(key)).length : 0;
    const diedCount = previous ? [...previous].filter((key) => !cells.has(key)).length : 0;
    stats.textContent = `${currentStart.label} · ${cells.size} live cells` +
      (previous ? ` · ${bornCount} born and ${diedCount} died in the last step` : "");
    transport.update();
  }

  function drawSparkline() {
    const sparkWidth = sparkline.parentElement.clientWidth - 26;
    const sparkHeight = 44;
    const context = prepareCanvas(sparkline, sparkWidth, sparkHeight);
    const maximum = Math.max(1, ...populations);
    context.strokeStyle = panel.color("accent");
    context.lineWidth = 1.5;
    context.beginPath();
    populations.forEach((population, index) => {
      const x = (index / (SPARKLINE_LENGTH - 1)) * sparkWidth;
      const y = sparkHeight - 2 - (population / maximum) * (sparkHeight - 4);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    context.fillStyle = panel.color("muted");
    context.font = "11px system-ui, sans-serif";
    context.textAlign = "right";
    context.fillText(`max ${maximum}`, sparkWidth, 11);
  }

  // ----- Drawing on the board: the first cell touched decides draw or erase.
  let paintValue = null;
  const cellAt = (event) => {
    const box = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - box.left) / cellSize);
    const y = Math.floor((event.clientY - box.top) / cellSize);
    return x >= 0 && x < width && y >= 0 && y < height ? cellKey(x, y, width) : null;
  };
  const paint = (key) => {
    if (key === null) return;
    // Editing changes the current generation in place, so its change colors no longer apply.
    const cells = new Set(current());
    if (paintValue) cells.add(key);
    else cells.delete(key);
    history[history.length - 1] = cells;
    populations[populations.length - 1] = cells.size;
    draw();
  };
  canvas.addEventListener("pointerdown", (event) => {
    const key = cellAt(event);
    if (key === null) return;
    transport.pause();
    paintValue = !current().has(key);
    canvas.setPointerCapture(event.pointerId);
    paint(key);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (paintValue !== null) paint(cellAt(event));
  });
  const stopPainting = () => { paintValue = null; };
  canvas.addEventListener("pointerup", stopPainting);
  canvas.addEventListener("pointercancel", stopPainting);

  panel.onThemeChange(draw);
  new ResizeObserver(() => draw()).observe(boardCard);

  // Start with the glider gun: it shows growth, spaceships, and (after a while) wrap-around collisions.
  presetSelect.value = String(Math.max(0, presets.findIndex((preset) => preset.name === "Gosper glider gun")));
  loadSelection();
  transport.autoplayWhenVisible(panel.root);
}

export default {
  async render({ model, el }) {
    try {
      renderBoard(el, await loadData(model.get("data")));
    } catch (error) {
      showLoadError(el, error);
    }
  },
};
