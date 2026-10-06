// Replays the genetic algorithm run recorded by chapters/1975-genetic-algorithms.md.
// Every generation shown is a population the Python code produced.
import { Transport, createPanel, drawLineChart, element, loadData, mix, prepareCanvas, showLoadError } from "../widgets/shared/ui.js";
import { isPacked, totals } from "../widgets/shared/knapsack.js";

function renderEvolution(el, data) {
  const { items, capacity, optimum, generations, random_search: randomSearch } = data;
  const panel = createPanel(el, {
    title: "A population evolving",
    subtitle: `${generations[0].population.length} packs per generation, ${items.length} genes each (one per item), seed ${data.seed}.`,
  });

  let frame = 0;
  const generation = () => generations[frame];

  const transport = new Transport({
    stepsPerSecond: 6,
    frameCount: generations.length,
    onNext: () => {
      if (frame >= generations.length - 1) return false;
      frame += 1;
      draw();
      return true;
    },
    onPrevious: () => { frame = Math.max(0, frame - 1); draw(); },
    onReset: () => { frame = 0; draw(); },
    onSeek: (position) => { frame = position; draw(); },
    getState: () => ({
      label: `Generation ${frame} of ${generations.length - 1} · ${generation().evaluations.toLocaleString("en-US")} packs scored`,
      canGoBack: frame > 0,
      canGoForward: frame < generations.length - 1,
      position: frame,
    }),
  });

  const gridCanvas = element("canvas", { role: "img", "aria-label": "Population: one row per pack, one column per item" });
  const chartCanvas = element("canvas", { role: "img", "aria-label": "Best value found so far" });
  const bestText = element("div", { class: "tl-stack tl-numbers", style: "gap: 4px; font-size: 13px" });
  const gridCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "Population, best pack on top. Columns are items; a filled cell means packed." }),
    gridCanvas,
  ]);
  const bestCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "Best pack in this generation" }),
    bestText,
  ]);
  const chartCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "Best value found so far, by packs scored" }),
    chartCanvas,
  ]);
  const swatch = (style) => element("span", { class: "tl-swatch", style });
  panel.body.append(
    transport.element,
    element("div", { class: "tl-columns" }, [gridCard, element("div", { class: "tl-stack" }, [bestCard, chartCard])]),
    element("div", { class: "tl-legend" }, [
      element("span", {}, [swatch("background: var(--tl-accent)"), "packed"]),
      element("span", {}, [swatch("background: var(--tl-positive); opacity: .5"), "bar: value, compared with the best possible"]),
      element("span", {}, [swatch("background: var(--tl-negative)"), "too heavy: fitness 0"]),
      element("span", {}, [swatch("background: var(--tl-muted)"), "chart: random search, same number of packs"]),
    ]),
  );

  function drawGrid() {
    const width = gridCard.clientWidth - 24;
    const barWidth = 54;
    const cell = Math.max(4, Math.floor((width - barWidth - 8) / items.length));
    const rows = generation().population.map((pack, index) => ({ pack, score: generation().scores[index] }));
    rows.sort((a, b) => b.score - a.score);
    const rowHeight = Math.max(3, Math.min(cell, 7));
    const frequencyHeight = 14;
    const height = frequencyHeight + 6 + rows.length * rowHeight;
    const context = prepareCanvas(gridCanvas, cell * items.length + 8 + barWidth, height);
    const accent = panel.color("accent");
    const neutral = panel.color("neutral");

    // Top strip: how many packs in the population include each item.
    items.forEach((_, column) => {
      const share = rows.filter((row) => isPacked(row.pack, column)).length / rows.length;
      context.fillStyle = mix(neutral, accent, share);
      context.fillRect(column * cell, 0, cell - 1, frequencyHeight);
    });

    rows.forEach((row, rowIndex) => {
      const y = frequencyHeight + 6 + rowIndex * rowHeight;
      items.forEach((_, column) => {
        context.fillStyle = isPacked(row.pack, column) ? accent : neutral;
        context.fillRect(column * cell, y, cell - 1, rowHeight - 1);
      });
      const barLeft = items.length * cell + 8;
      if (row.score === 0) {
        context.fillStyle = panel.color("negative");
        context.fillRect(barLeft, y, 8, rowHeight - 1);
      } else {
        context.fillStyle = mix(neutral, panel.color("positive"), 0.55);
        context.fillRect(barLeft, y, (row.score / optimum) * barWidth, rowHeight - 1);
      }
    });
  }

  function drawBest() {
    const scores = generation().scores;
    const best = generation().population[scores.indexOf(Math.max(...scores))];
    const { weight, value } = totals(items, best);
    const names = items.filter((_, index) => isPacked(best, index)).map((item) => item.name);
    const tooHeavy = scores.filter((score) => score === 0).length;
    bestText.replaceChildren(
      element("div", { class: "tl-title", text: `Value ${value} of ${optimum} possible · ${weight} of ${capacity} kg` }),
      element("div", { text: names.join(", ") }),
      element("div", { style: "color: var(--tl-muted)", text: `${tooHeavy} of ${scores.length} packs in this generation are too heavy.` }),
    );
  }

  function drawChart() {
    const lastEvaluations = generations[generations.length - 1].evaluations;
    // Start the value axis at the multiple of 20 below the lowest value shown.
    const lowest = Math.min(randomSearch[0], Math.max(...generations[0].scores));
    const yTicks = [];
    for (let tick = Math.floor(lowest / 20) * 20; tick < optimum + 20; tick += 20) yTicks.push(tick);
    drawLineChart(panel, chartCanvas, {
      width: chartCard.clientWidth - 24,
      height: 170,
      xTicks: [0, 3000, 6000, 9000],
      yTicks,
      series: [
        { points: [[0, optimum], [lastEvaluations, optimum]], color: panel.color("muted"), width: 1, dashed: true },
        { points: randomSearch.slice(0, frame + 1).map((best, index) => [generations[index].evaluations, best]), color: panel.color("muted"), width: 1.5 },
        { points: generations.slice(0, frame + 1).map((g) => [g.evaluations, Math.max(...g.scores)]), color: panel.color("accent") },
      ],
      markers: [{ x: generation().evaluations, y: Math.max(...generation().scores), color: panel.color("accent") }],
      cursorX: generation().evaluations,
      xFormat: (value) => value.toLocaleString("en-US"),
    });
  }

  function draw() {
    drawGrid();
    drawBest();
    drawChart();
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
      renderEvolution(el, await loadData(model.get("data")));
    } catch (error) {
      showLoadError(el, error);
    }
  },
};
