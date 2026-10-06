// Shared look and controls for every interactive panel on the site.
// Each panel renders inside a shadow root, so it carries its own styles.

const STYLES = `
.tl {
  --tl-panel: #fafaf9;
  --tl-surface: #ffffff;
  --tl-border: #e7e5e4;
  --tl-text: #1c1917;
  --tl-muted: #78716c;
  --tl-accent: #2563eb;
  --tl-on-accent: #ffffff;
  --tl-positive: #2563eb;
  --tl-negative: #ea580c;
  --tl-neutral: #f5f5f4;
  --tl-grid: #eeedeb;
  box-sizing: border-box;
  margin: 1.5rem 0;
  padding: 16px;
  border: 1px solid var(--tl-border);
  border-radius: 14px;
  background: var(--tl-panel);
  color: var(--tl-text);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.45;
}
.tl[data-theme="dark"] {
  --tl-panel: #23201e;
  --tl-surface: #1c1917;
  --tl-border: #3d3834;
  --tl-text: #f5f5f4;
  --tl-muted: #a8a29e;
  --tl-accent: #60a5fa;
  --tl-on-accent: #0b1220;
  --tl-positive: #60a5fa;
  --tl-negative: #fb923c;
  --tl-neutral: #2b2724;
  --tl-grid: #2e2a27;
}
.tl *, .tl *::before, .tl *::after { box-sizing: border-box; }
.tl-header { margin-bottom: 12px; }
.tl-title { margin: 0; font-size: 15px; font-weight: 600; }
.tl-subtitle { margin: 2px 0 0; font-size: 13px; color: var(--tl-muted); }
.tl-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.tl-stack { display: grid; gap: 12px; }
.tl-columns { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.tl-card {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--tl-border);
  border-radius: 10px;
  background: var(--tl-surface);
}
.tl-label { margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--tl-muted); }
.tl-note { margin: 8px 0 0; font-size: 12px; color: var(--tl-muted); }
.tl-numbers { font-variant-numeric: tabular-nums; }
.tl button, .tl select {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--tl-border);
  border-radius: 8px;
  background: var(--tl-surface);
  color: var(--tl-text);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.tl button:hover:not(:disabled), .tl select:hover { border-color: var(--tl-muted); }
.tl button:focus-visible, .tl select:focus-visible, .tl input:focus-visible, .tl canvas:focus-visible {
  outline: 2px solid var(--tl-accent);
  outline-offset: 2px;
}
.tl button:disabled { opacity: 0.4; cursor: default; }
.tl button.tl-primary { background: var(--tl-accent); border-color: transparent; color: var(--tl-on-accent); }
.tl button[aria-pressed="true"] {
  border-color: var(--tl-accent);
  background: color-mix(in srgb, var(--tl-accent) 14%, var(--tl-surface));
}
.tl button.tl-icon-only { width: 32px; justify-content: center; padding: 0; }
.tl-icon { width: 16px; height: 16px; fill: currentColor; flex: none; }
.tl-segmented { display: inline-flex; gap: 4px; flex-wrap: wrap; }
.tl-scrubber { flex: 1 1 160px; min-width: 120px; accent-color: var(--tl-accent); }
.tl-counter { font-size: 13px; color: var(--tl-muted); font-variant-numeric: tabular-nums; }
.tl-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--tl-muted); }
.tl-swatch { display: inline-block; width: 10px; height: 10px; margin-right: 5px; border-radius: 3px; vertical-align: -1px; }
.tl canvas { display: block; max-width: 100%; touch-action: none; }
.tl table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; font-size: 13px; }
.tl th { font-weight: 600; color: var(--tl-muted); font-size: 12px; }
.tl th, .tl td { padding: 4px 6px; text-align: right; border-bottom: 1px solid var(--tl-border); }
.tl th:first-child, .tl td:first-child { text-align: left; }
.tl label.tl-check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
.tl label.tl-check input { accent-color: var(--tl-accent); }
.tl-error { color: var(--tl-negative); }
`;

const ICONS = {
  play: "M8 5v14l11-7z",
  pause: "M6 5h4v14H6zM14 5h4v14h-4z",
  next: "M6 5v14l9-7zM16 5h2v14h-2z",
  previous: "M18 5v14l-9-7zM6 5h2v14H6z",
  reset: "M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z",
};

export function icon(name) {
  return `<svg class="tl-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
}

export function element(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "html") node.innerHTML = value;
    else if (name === "text") node.textContent = value;
    else node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

// Builds the outer panel and keeps it in sync with the site's light/dark theme.
export function createPanel(el, { title, subtitle }) {
  const root = element("div", { class: "tl" });
  const body = element("div", { class: "tl-stack" });
  root.append(
    element("div", { class: "tl-header" }, [
      element("h3", { class: "tl-title", text: title }),
      element("p", { class: "tl-subtitle", text: subtitle }),
    ]),
    body,
  );
  el.append(element("style", { text: STYLES }), root);

  const themeListeners = [];
  const applyTheme = () => {
    // The book theme marks dark mode with a "dark" class on <html>.
    root.dataset.theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    themeListeners.forEach((listener) => listener());
  };
  applyTheme();
  const observer = new MutationObserver(applyTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  return {
    root,
    body,
    onThemeChange: (listener) => themeListeners.push(listener),
    color: (name) => getComputedStyle(root).getPropertyValue(`--tl-${name}`).trim(),
    destroy: () => observer.disconnect(),
  };
}

// Data files are written by the chapter's Python code at build time.
export async function loadData(fileName) {
  const response = await fetch(new URL(`../data/${fileName}`, import.meta.url));
  if (!response.ok) throw new Error(`Could not load ${fileName} (HTTP ${response.status}).`);
  return response.json();
}

export function showLoadError(el, error) {
  el.append(element("style", { text: STYLES }), element("div", { class: "tl" }, [
    element("p", { class: "tl-error", text: `This interactive panel could not load: ${error.message}` }),
  ]));
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Play, pause, step, and (for recorded runs) a scrubber.
// The widget owns its state; the transport calls back and asks getState()
// for { label, canGoBack, canGoForward, position } whenever it redraws.
export class Transport {
  constructor({ stepsPerSecond, onNext, onPrevious, onReset, onSeek, getState, frameCount = null }) {
    Object.assign(this, { stepsPerSecond, onNext, onPrevious, onReset, onSeek, getState });
    this.speed = 1;
    this.playing = false;
    this.visible = false;

    this.playButton = element("button", { type: "button", class: "tl-primary" });
    this.previousButton = element("button", { type: "button", class: "tl-icon-only", "aria-label": "Step back", title: "Step back", html: icon("previous") });
    this.nextButton = element("button", { type: "button", class: "tl-icon-only", "aria-label": "Step forward", title: "Step forward", html: icon("next") });
    this.resetButton = element("button", { type: "button", class: "tl-icon-only", "aria-label": "Back to start", title: "Back to start", html: icon("reset") });
    this.speedSelect = element("select", { "aria-label": "Speed" });
    for (const speed of [0.25, 0.5, 1, 2, 4]) {
      this.speedSelect.append(element("option", { value: String(speed), text: `${speed}×` }));
    }
    this.speedSelect.value = "1";
    this.counter = element("span", { class: "tl-counter", "aria-live": "polite" });

    const controls = [this.playButton, this.previousButton, this.nextButton, this.resetButton];
    if (frameCount !== null) {
      this.scrubber = element("input", { type: "range", class: "tl-scrubber", min: "0", max: String(frameCount - 1), step: "1", value: "0", "aria-label": "Position" });
      this.scrubber.addEventListener("input", () => {
        // Read the new position first: pause() redraws and would reset the slider.
        const position = Number(this.scrubber.value);
        this.pause();
        this.onSeek(position);
      });
      controls.push(this.scrubber);
    }
    controls.push(this.speedSelect);
    this.element = element("div", { class: "tl-stack" }, [
      element("div", { class: "tl-row" }, controls),
      this.counter,
    ]);

    this.playButton.addEventListener("click", () => (this.playing ? this.pause() : this.play()));
    this.previousButton.addEventListener("click", () => { this.pause(); this.onPrevious(); });
    this.nextButton.addEventListener("click", () => { this.pause(); this.onNext(); });
    this.resetButton.addEventListener("click", () => { this.pause(); this.onReset(); });
    this.speedSelect.addEventListener("change", () => { this.speed = Number(this.speedSelect.value); });
    this.tick = this.tick.bind(this);
  }

  // Start playing the first time the panel scrolls into view, unless the
  // reader asked the system for reduced motion. Pause while off screen.
  autoplayWhenVisible(target) {
    let started = false;
    const thresholds = Array.from({ length: 11 }, (_, index) => index / 10);
    new IntersectionObserver(([entry]) => {
      // Any visible part keeps an animation running.
      this.visible = entry.isIntersecting;
      // Autoplay once a good part of the panel (or of the screen, for tall panels) is in view.
      const shown = entry.intersectionRect.height;
      const enough = Math.min(entry.boundingClientRect.height, window.innerHeight) * 0.4;
      if (this.visible && !started && shown >= enough) {
        started = true;
        if (!prefersReducedMotion()) this.play();
      }
      if (this.visible && this.playing) this.schedule();
    }, { threshold: thresholds }).observe(target);
  }

  play() {
    this.playing = true;
    this.lastTime = null;
    this.carry = 0;
    this.schedule();
    this.update();
  }

  pause() {
    this.playing = false;
    this.update();
  }

  schedule() {
    if (!this.frameRequest) this.frameRequest = requestAnimationFrame(this.tick);
  }

  tick(time) {
    this.frameRequest = null;
    if (!this.playing || !this.visible) return;
    if (this.lastTime !== null) {
      // Advance whole steps only: there are no in-between states to show.
      this.carry += ((time - this.lastTime) / 1000) * this.stepsPerSecond * this.speed;
      const steps = Math.min(Math.floor(this.carry), 8);
      this.carry -= Math.floor(this.carry);
      for (let i = 0; i < steps; i += 1) {
        if (this.onNext() === false) {
          this.pause();
          return;
        }
      }
    }
    this.lastTime = time;
    this.schedule();
  }

  update() {
    const { label, canGoBack, canGoForward, position } = this.getState();
    this.playButton.innerHTML = this.playing ? `${icon("pause")}Pause` : `${icon("play")}Play`;
    this.playButton.setAttribute("aria-label", this.playing ? "Pause" : "Play");
    this.previousButton.disabled = !canGoBack;
    this.nextButton.disabled = !canGoForward;
    if (this.scrubber && position !== undefined) this.scrubber.value = String(position);
    this.counter.textContent = label;
  }

  setFrameCount(frameCount) {
    this.scrubber.max = String(frameCount - 1);
  }
}

// Sizes a canvas for sharp drawing on high-density screens.
export function prepareCanvas(canvas, width, height) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
}

function parseHex(color) {
  const value = color.replace("#", "");
  return [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16));
}

export function mix(colorA, colorB, amount) {
  const a = parseHex(colorA);
  const b = parseHex(colorB);
  const channels = a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount));
  return `rgb(${channels.join(", ")})`;
}

// value in [-1, 1]: negative is orange, zero is neutral, positive is blue.
export function diverging(panel, value) {
  const clamped = Math.max(-1, Math.min(1, value));
  const end = clamped < 0 ? panel.color("negative") : panel.color("positive");
  return mix(panel.color("neutral"), end, Math.abs(clamped));
}

export function formatNumber(value, digits = 2) {
  // Use a real minus sign so negative numbers line up and read clearly.
  return value.toFixed(digits).replace("-", "−");
}

export function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

// A small line chart on a canvas, shared by the widgets.
// series: [{ points: [[x, y], ...], color, width?, dashed? }]
// markers: [{ x, y, color }] are drawn as dots; cursorX draws a vertical line.
export function drawLineChart(panel, canvas, { width, height, xTicks, yTicks, series, markers = [], cursorX = null, xFormat = String, yFormat = String }) {
  const context = prepareCanvas(canvas, width, height);
  const left = 40;
  const right = 24;  // room for the last x label
  const top = 8;
  const bottom = 24;
  const [xLow, xHigh] = [xTicks[0], xTicks[xTicks.length - 1]];
  const [yLow, yHigh] = [yTicks[0], yTicks[yTicks.length - 1]];
  const x = (value) => left + ((value - xLow) / (xHigh - xLow)) * (width - left - right);
  const y = (value) => height - bottom - ((value - yLow) / (yHigh - yLow)) * (height - top - bottom);

  context.font = "11px system-ui, sans-serif";
  context.fillStyle = panel.color("muted");
  context.strokeStyle = panel.color("grid");
  context.lineWidth = 1;
  context.textAlign = "right";
  context.textBaseline = "middle";
  for (const tick of yTicks) {
    context.beginPath();
    context.moveTo(left, y(tick));
    context.lineTo(width - right, y(tick));
    context.stroke();
    context.fillText(yFormat(tick), left - 6, y(tick));
  }
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  for (const tick of xTicks) context.fillText(xFormat(tick), x(tick), height - 6);

  for (const line of series) {
    context.strokeStyle = line.color;
    context.lineWidth = line.width ?? 2;
    context.setLineDash(line.dashed ? [5, 4] : []);
    context.beginPath();
    line.points.forEach(([px, py], index) => (index === 0 ? context.moveTo(x(px), y(py)) : context.lineTo(x(px), y(py))));
    context.stroke();
  }
  context.setLineDash([]);

  if (cursorX !== null) {
    context.strokeStyle = panel.color("text");
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x(cursorX), top);
    context.lineTo(x(cursorX), height - bottom);
    context.stroke();
  }
  for (const marker of markers) {
    context.fillStyle = marker.color;
    context.strokeStyle = panel.color("surface");
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x(marker.x), y(marker.y), 5, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
}
