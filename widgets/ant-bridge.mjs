// Replays double bridge runs recorded by chapters/1991-ant-colony-optimization.md.
// Every frame is one second of the model; ants move at constant speed, so an
// ant's position is (seconds since it entered) / (seconds to cross its branch).
import { Transport, createPanel, drawLineChart, element, loadData, prepareCanvas, showLoadError } from "../widgets/shared/ui.js";

const SHORT = 0;
const LONG = 1;
const WINDOW = 50; // the chart shows the share of the last 50 ants on the short branch

function renderBridge(el, data) {
  const panel = createPanel(el, {
    title: "The double bridge",
    subtitle: "Ants walk between the nest and the food. At each end they choose a branch, more likely the one with more pheromone.",
  });

  let runIndex = 0;
  let second = 0;
  const run = () => data.runs[runIndex];
  const seconds = () => run().pheromone.length;
  const travel = (branch) => (branch === SHORT ? data.t_short : run().r * data.t_short);

  const groups = [1, 2].map((r) => {
    const label = r === 1 ? "Equal branches" : "Short branch half as long";
    const buttons = data.runs
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ candidate }) => candidate.r === r)
      .map(({ candidate, index }, position) => {
        const button = element("button", { type: "button", "aria-pressed": String(index === 0), text: `run ${position + 1}` });
        button.addEventListener("click", () => {
          runIndex = index;
          second = 0;
          allButtons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
          transport.setFrameCount(seconds());
          transport.play();
          draw();
        });
        return button;
      });
    return { label, buttons };
  });
  const allButtons = groups.flatMap((group) => group.buttons);

  const transport = new Transport({
    stepsPerSecond: 20,
    frameCount: seconds(),
    onNext: () => {
      if (second >= seconds() - 1) return false;
      second += 1;
      draw();
      return true;
    },
    onPrevious: () => { second = Math.max(0, second - 1); draw(); },
    onReset: () => { second = 0; draw(); },
    onSeek: (position) => { second = position; draw(); },
    getState: () => ({
      label: `Second ${second} of ${seconds() - 1}`,
      canGoBack: second > 0,
      canGoForward: second < seconds() - 1,
      position: second,
    }),
  });

  const bridgeCanvas = element("canvas", { role: "img", "aria-label": "Ants on the two branches of the bridge" });
  const chartCanvas = element("canvas", { role: "img", "aria-label": "Share of recent ants on the short branch" });
  const stats = element("p", { class: "tl-note tl-numbers" });
  const bridgeCard = element("div", { class: "tl-card" }, [bridgeCanvas, stats]);
  const chartCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: `Share of the last ${WINDOW} ants that took the short (lower) branch` }),
    chartCanvas,
  ]);
  panel.body.append(
    ...groups.map((group) => element("div", { class: "tl-row" }, [element("span", { class: "tl-label", style: "margin: 0; min-width: 12em", text: group.label }), ...group.buttons])),
    transport.element,
    bridgeCard,
    chartCard,
  );

  // A branch is a curve from the nest (left) to the food (right): t = 0 at the nest, 1 at the food.
  function branchPoint(branch, t, width, height) {
    const left = 70;
    const right = width - 70;
    const middle = height / 2;
    const bulge = branch === SHORT ? height * 0.22 : -height * (run().r === 1 ? 0.22 : 0.4);
    const x = left + (right - left) * t;
    return [x, middle + bulge * Math.sin(Math.PI * t)];
  }

  function drawBridge() {
    const width = bridgeCard.clientWidth - 24;
    const height = 220;
    const context = prepareCanvas(bridgeCanvas, width, height);
    const [nestShort, nestLong, foodShort, foodLong] = run().pheromone[second];
    const final = run().pheromone[seconds() - 1];
    const most = Math.max(1, final[0] + final[2], final[1] + final[3]);
    const amount = [nestShort + foodShort, nestLong + foodLong];

    // Branches: thickness follows the pheromone on them, against the run's maximum.
    for (const branch of [LONG, SHORT]) {
      context.strokeStyle = panel.color(branch === SHORT ? "positive" : "negative");
      context.globalAlpha = 0.35 + 0.65 * (amount[branch] / most);
      context.lineWidth = 2 + 16 * (amount[branch] / most);
      context.lineCap = "round";
      context.beginPath();
      for (let step = 0; step <= 40; step += 1) {
        const [x, y] = branchPoint(branch, step / 40, width, height);
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    context.globalAlpha = 1;

    // Ants currently on the bridge.
    context.fillStyle = panel.color("text");
    for (const [start, from, branch] of run().ants) {
      if (start > second) break;
      const progress = (second - start) / travel(branch);
      if (progress >= 1) continue;
      const t = from === 0 ? progress : 1 - progress;
      const [x, y] = branchPoint(branch, t, width, height);
      context.beginPath();
      context.arc(x, y, 3, 0, Math.PI * 2);
      context.fill();
    }

    // Nest and food.
    for (const [x, label] of [[40, "nest"], [width - 40, "food"]]) {
      context.fillStyle = panel.color("surface");
      context.strokeStyle = panel.color("muted");
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(x, height / 2, 28, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = panel.color("text");
      context.font = "13px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(label, x, height / 2);
    }
    context.fillStyle = panel.color("muted");
    context.font = "12px system-ui, sans-serif";
    const shortLabel = run().r === 1 ? "lower branch" : "short branch";
    const longLabel = run().r === 1 ? "upper branch" : "long branch (twice as long)";
    context.fillText(shortLabel, width / 2, height / 2 + height * 0.22 + 22);
    context.fillText(longLabel, width / 2, height / 2 - height * (run().r === 1 ? 0.22 : 0.4) - 14);

    const entered = run().ants.filter(([start]) => start <= second).length;
    stats.textContent = `${entered} ants have entered the bridge. Pheromone (ants that marked each branch): ` +
      `short/lower ${amount[SHORT]}, long/upper ${amount[LONG]}.`;
  }

  function drawChart() {
    const choices = run().ants.map(([start, , branch]) => [start, branch]);
    const points = [];
    for (let index = WINDOW; index <= choices.length; index += 1) {
      const recent = choices.slice(index - WINDOW, index);
      const short = recent.filter(([, branch]) => branch === SHORT).length / WINDOW;
      const time = recent[recent.length - 1][0];
      if (time <= second) points.push([time, short * 100]);
    }
    drawLineChart(panel, chartCanvas, {
      width: chartCard.clientWidth - 24,
      height: 150,
      xTicks: [0, 100, 200, 300, 400, 500, 600],
      yTicks: [0, 25, 50, 75, 100],
      series: [
        { points: [[0, 50], [600, 50]], color: panel.color("muted"), width: 1, dashed: true },
        { points, color: panel.color("positive") },
      ],
      cursorX: second,
      xFormat: (value) => `${value}s`,
      yFormat: (value) => `${value}%`,
    });
  }

  function draw() {
    drawBridge();
    drawChart();
    transport.update();
  }

  panel.onThemeChange(draw);
  new ResizeObserver(() => draw()).observe(bridgeCard);
  draw();
  transport.autoplayWhenVisible(panel.root);
}

export default {
  async render({ model, el }) {
    try {
      renderBridge(el, await loadData(model.get("data")));
    } catch (error) {
      showLoadError(el, error);
    }
  },
};
