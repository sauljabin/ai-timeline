// Replays the Ant System run on eil51 recorded by
// chapters/1991-ant-colony-optimization.md: pheromone on every road and the
// best tour found so far, at the cycles the Python code saved.
import { Transport, createPanel, drawLineChart, element, loadData, prepareCanvas, showLoadError } from "../widgets/shared/ui.js";

function renderTsp(el, data) {
  const { cities, snapshots } = data;
  const n = cities.length;
  const panel = createPanel(el, {
    title: "Ant System on 51 cities",
    subtitle: `${n} ants per cycle. Darker roads carry more pheromone.`,
  });

  let frame = 0;
  const snapshot = () => snapshots[frame];
  let showOptimal = false;

  const transport = new Transport({
    stepsPerSecond: 2,
    frameCount: snapshots.length,
    onNext: () => {
      if (frame >= snapshots.length - 1) return false;
      frame += 1;
      draw();
      return true;
    },
    onPrevious: () => { frame = Math.max(0, frame - 1); draw(); },
    onReset: () => { frame = 0; draw(); },
    onSeek: (position) => { frame = position; draw(); },
    getState: () => ({
      label: `Cycle ${snapshot().cycle} of 200`,
      canGoBack: frame > 0,
      canGoForward: frame < snapshots.length - 1,
      position: frame,
    }),
  });

  const optimalToggle = element("input", { type: "checkbox" });
  optimalToggle.addEventListener("change", () => { showOptimal = optimalToggle.checked; draw(); });
  const mapCanvas = element("canvas", { role: "img", "aria-label": "Cities, pheromone on roads, and the best tour" });
  const chartCanvas = element("canvas", { role: "img", "aria-label": "Best tour length by cycle" });
  const status = element("p", { class: "tl-title tl-numbers", style: "font-size: 14px" });
  const mapCard = element("div", { class: "tl-card" }, [mapCanvas]);
  const chartCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "Best tour so far, by cycle" }),
    chartCanvas,
  ]);
  const swatch = (style) => element("span", { class: "tl-swatch", style });
  panel.body.append(
    transport.element,
    element("div", { class: "tl-row" }, [element("label", { class: "tl-check" }, [optimalToggle, `Show the optimal tour (${data.optimum})`])]),
    status,
    element("div", { class: "tl-columns" }, [mapCard, chartCard]),
    element("div", { class: "tl-legend" }, [
      element("span", {}, [swatch("background: var(--tl-accent)"), "best tour so far"]),
      element("span", {}, [swatch("background: var(--tl-muted)"), "pheromone (darker is more)"]),
      element("span", {}, [swatch("border: 1.5px dashed var(--tl-negative)"), "optimal tour"]),
    ]),
  );

  function drawMap() {
    const size = Math.min(mapCard.clientWidth - 24, 420);
    const context = prepareCanvas(mapCanvas, size, size);
    const xs = cities.map(([x]) => x);
    const ys = cities.map(([, y]) => y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const scale = (size - 30) / Math.max(maxX - minX, maxY - minY);
    const point = (index) => [15 + (cities[index][0] - minX) * scale, size - 15 - (cities[index][1] - minY) * scale];

    // Pheromone on every road i < j, as saved: 0 to 1000 of the strongest road.
    const strength = snapshot().pheromone;
    context.strokeStyle = panel.color("muted");
    context.lineWidth = 1;
    let index = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const value = strength[index];
        index += 1;
        if (value < 20) continue;
        context.globalAlpha = value / 1000;
        const [x1, y1] = point(i);
        const [x2, y2] = point(j);
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
      }
    }
    context.globalAlpha = 1;

    const drawTour = (tour, color, width, dash) => {
      context.strokeStyle = color;
      context.lineWidth = width;
      context.setLineDash(dash);
      context.beginPath();
      tour.forEach((city, position) => {
        const [x, y] = point(city);
        if (position === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
      context.stroke();
      context.setLineDash([]);
    };
    drawTour(snapshot().best_tour, panel.color("accent"), 2.5, []);
    if (showOptimal) drawTour(data.optimal_tour, panel.color("negative"), 2, [6, 5]);

    context.fillStyle = panel.color("text");
    for (let i = 0; i < n; i += 1) {
      const [x, y] = point(i);
      context.beginPath();
      context.arc(x, y, 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawChart() {
    const best = data.best_by_cycle;
    drawLineChart(panel, chartCanvas, {
      width: chartCard.clientWidth - 24,
      height: 220,
      xTicks: [0, 50, 100, 150, 200],
      yTicks: [400, 450, 500, 550],
      series: [
        { points: [[0, data.optimum], [200, data.optimum]], color: panel.color("negative"), width: 1, dashed: true },
        { points: [[0, data.nearest_neighbor], [200, data.nearest_neighbor]], color: panel.color("muted"), width: 1, dashed: true },
        { points: best.slice(0, snapshot().cycle).map((length, cycle) => [cycle + 1, length]), color: panel.color("accent") },
      ],
      markers: [{ x: snapshot().cycle, y: snapshot().best_length, color: panel.color("accent") }],
      cursorX: snapshot().cycle,
    });
  }

  function draw() {
    const length = snapshot().best_length;
    status.textContent = `Best tour so far: ${length}, ${((length / data.optimum - 1) * 100).toFixed(1)}% above the optimum of ${data.optimum}. ` +
      `Nearest-neighbor baseline: ${data.nearest_neighbor}.`;
    drawMap();
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
      renderTsp(el, await loadData(model.get("data")));
    } catch (error) {
      showLoadError(el, error);
    }
  },
};
