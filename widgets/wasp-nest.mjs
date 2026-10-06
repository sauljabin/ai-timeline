// Replays lattice swarm builds recorded by chapters/1995-wasp-nest-building.md,
// drawn as isometric cubes. Each frame is the recorded state at that step:
// the bricks added so far and where every agent was.
import { Transport, createPanel, element, loadData, mix, prepareCanvas, showLoadError } from "../widgets/shared/ui.js";

const CELL = 1;
const PEDICEL = 2;
const RIM = 3;

function renderNest(el, data) {
  const { width, height } = data;
  const panel = createPanel(el, {
    title: "Wasps building a nest",
    subtitle: `${width} × ${width} × ${height} grid. Agents fly at random and add a brick only where the cubes around them match a rule.`,
  });

  let runIndex = 0;
  let frame = 0;
  let turns = 0; // quarter turns of the view around the vertical axis
  const run = () => data.runs[runIndex];

  const runButtons = data.runs.map((candidate, index) => {
    const button = element("button", { type: "button", "aria-pressed": String(index === 0), text: candidate.name });
    button.addEventListener("click", () => {
      runIndex = index;
      frame = 0;
      runButtons.forEach((other, otherIndex) => other.setAttribute("aria-pressed", String(otherIndex === index)));
      transport.setFrameCount(run().frames.length);
      transport.play();
      draw();
    });
    return button;
  });
  const turnButton = element("button", { type: "button", text: "Turn the view 90°" });
  turnButton.addEventListener("click", () => { turns = (turns + 1) % 4; draw(); });

  const transport = new Transport({
    stepsPerSecond: 8,
    frameCount: run().frames.length,
    onNext: () => {
      if (frame >= run().frames.length - 1) return false;
      frame += 1;
      draw();
      return true;
    },
    onPrevious: () => { frame = Math.max(0, frame - 1); draw(); },
    onReset: () => { frame = 0; draw(); },
    onSeek: (position) => { frame = position; draw(); },
    getState: () => ({
      label: `Step ${run().frames[frame].step.toLocaleString("en-US")}`,
      canGoBack: frame > 0,
      canGoForward: frame < run().frames.length - 1,
      position: frame,
    }),
  });

  const canvas = element("canvas", { role: "img", "aria-label": "The nest in 3D, with flying agents" });
  const card = element("div", { class: "tl-card" }, [canvas]);
  const stats = element("p", { class: "tl-note tl-numbers" });
  const swatch = (color) => element("span", { class: "tl-swatch", style: `background: ${color}` });
  panel.body.append(
    element("div", { class: "tl-row" }, [...runButtons, turnButton]),
    transport.element,
    card,
    stats,
    element("div", { class: "tl-legend" }, [
      element("span", {}, [swatch("var(--tl-accent)"), "comb cell"]),
      element("span", {}, [swatch("color-mix(in srgb, var(--tl-accent) 45%, var(--tl-surface))"), "comb rim"]),
      element("span", {}, [swatch("var(--tl-negative)"), "pedicel (stalk)"]),
      element("span", {}, [swatch("var(--tl-text)"), "agent"]),
    ]),
  );

  function draw() {
    const canvasWidth = card.clientWidth - 24;
    // Isometric projection; the size fits the whole grid in the card.
    // A flat viewing angle (small `half`) shows the gaps between the combs.
    const unit = Math.min(canvasWidth / (2 * width + 2), 14);
    const half = unit * 0.38;
    const rise = unit * 1.05;
    const canvasHeight = Math.ceil(2 * width * half + height * rise + unit * 2);
    const context = prepareCanvas(canvas, canvasWidth, canvasHeight);
    const center = (width - 1) / 2;
    const rotate = ([x, y, z]) => {
      let [a, b] = [x - center, y - center];
      for (let i = 0; i < turns; i += 1) [a, b] = [-b, a];
      return [a + center, b + center, z];
    };
    const project = ([x, y, z]) => [
      canvasWidth / 2 + (x - y) * unit,
      unit + (x + y) * half + (height - 1 - z) * rise,
    ];

    // The ceiling the nest hangs from: the top face of the grid.
    const corners = [[0, 0], [width, 0], [width, width], [0, width]].map(([x, y]) => project([x - 0.5, y - 0.5, height - 0.5]));
    context.fillStyle = mix(panel.color("surface"), panel.color("muted"), 0.18);
    context.beginPath();
    corners.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
    context.closePath();
    context.fill();

    const step = run().frames[frame].step;
    // The starting pedicel is there from step 0.
    const placed = [[...data.start, PEDICEL, 0], ...run().bricks.filter((brick) => brick[4] <= step)];
    const colors = {
      [CELL]: panel.color("accent"),
      [RIM]: mix(panel.color("surface"), panel.color("accent"), 0.45),
      [PEDICEL]: panel.color("negative"),
    };
    // Painter's order: far cubes first, lower cubes before higher ones.
    const cubes = placed.map(([x, y, z, type]) => ({ position: rotate([x, y, z]), type }));
    cubes.sort((a, b) => (a.position[0] + a.position[1]) - (b.position[0] + b.position[1]) || a.position[2] - b.position[2]);
    for (const { position, type } of cubes) {
      const [x, y, z] = position;
      // Cubes are drawn a little smaller than their cell, so neighbors stay distinct.
      const s = 0.43;
      const top = [[x - s, y - s], [x + s, y - s], [x + s, y + s], [x - s, y + s]].map(([a, b]) => project([a, b, z + s]));
      const bottom = [[x + s, y - s], [x + s, y + s], [x - s, y + s]].map(([a, b]) => project([a, b, z - s]));
      const base = colors[type];
      const face = (points, shade) => {
        context.fillStyle = mix(base, "#000000", shade);
        context.beginPath();
        points.forEach(([px, py], index) => (index === 0 ? context.moveTo(px, py) : context.lineTo(px, py)));
        context.closePath();
        context.fill();
      };
      face(top, 0); // top face, lit
      face([top[1], top[2], bottom[1], bottom[0]], 0.25); // right face
      face([top[2], top[3], bottom[2], bottom[1]], 0.4); // left face
    }

    // Agents at their recorded cubes.
    context.fillStyle = panel.color("text");
    for (const agent of run().frames[frame].agents) {
      const [px, py] = project(rotate(agent));
      context.beginPath();
      context.arc(px, py, Math.max(1.5, unit / 6), 0, Math.PI * 2);
      context.fill();
    }

    const count = (type) => placed.filter((brick) => brick[3] === type).length;
    stats.textContent = `${placed.length} bricks: ${count(CELL)} comb cells, ${count(RIM)} rim, ${count(PEDICEL)} pedicels.`;
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
      renderNest(el, await loadData(model.get("data")));
    } catch (error) {
      showLoadError(el, error);
    }
  },
};
