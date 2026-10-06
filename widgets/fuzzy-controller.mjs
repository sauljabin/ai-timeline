// Live fuzzy fan controller for chapters/1965-fuzzy-logic.md.
// Uses the tested JavaScript copy of the controller in shared/fuzzy.js.
import { Transport, createPanel, drawLineChart, element, prefersReducedMotion, prepareCanvas, showLoadError } from "../widgets/shared/ui.js";
import { RULES, fanSpeed } from "../widgets/shared/fuzzy.js";

// The scrubber moves the temperature from -10 °C to 60 °C in 0.5 °C steps.
const LOW = -10;
const STEP = 0.5;
const FRAMES = 141;
const temperatureAt = (frame) => LOW + frame * STEP;
const CURVE = Array.from({ length: 701 }, (_, index) => LOW + index / 10);
const COLORS = ["positive", "fuzzy-warm", "fuzzy-hot"];

function renderController(el) {
  const panel = createPanel(el, {
    title: "Fuzzy fan controller",
    subtitle: "Move the temperature, or press Play to sweep from −10 °C to 60 °C.",
  });
  // Cold is blue; warm and hot get yellow and red, which stay distinct in both themes.
  panel.root.style.setProperty("--tl-fuzzy-warm", "#eab308");
  panel.root.style.setProperty("--tl-fuzzy-hot", "#ef4444");
  let frame = 0;
  const temperature = () => temperatureAt(frame);

  const transport = new Transport({
    stepsPerSecond: 8,
    frameCount: FRAMES,
    onNext: () => {
      if (frame >= FRAMES - 1) return false;
      frame += 1;
      draw();
      return true;
    },
    onPrevious: () => { frame = Math.max(0, frame - 1); draw(); },
    onReset: () => { frame = 0; draw(); },
    onSeek: (position) => { frame = position; draw(); },
    getState: () => ({
      label: `Temperature ${temperature().toFixed(1).replace("-", "−")} °C`,
      canGoBack: frame > 0,
      canGoForward: frame < FRAMES - 1,
      position: frame,
    }),
  });

  const membershipCanvas = element("canvas", { role: "img", "aria-label": "Membership functions with the current temperature" });
  const outputCanvas = element("canvas", { role: "img", "aria-label": "Fan speed for every temperature" });
  const fanCanvas = element("canvas", { role: "img", "aria-label": "Fan turning at the computed speed" });
  const rules = element("div", { class: "tl-stack", style: "gap: 8px" });
  const formula = element("p", { class: "tl-numbers", style: "margin: 0; font-size: 14px" });
  const result = element("p", { class: "tl-title tl-numbers", style: "font-size: 22px" });

  const fuzzifyCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "1. Fuzzify: how true is each word at this temperature?" }),
    membershipCanvas,
  ]);
  const rulesCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "2. Fire the rules: each one as strongly as its word is true" }),
    rules,
  ]);
  const outputCard = element("div", { class: "tl-card" }, [
    element("p", { class: "tl-label", text: "3. Defuzzify: average of the speeds, weighted by rule strength" }),
    formula,
    element("div", { class: "tl-row", style: "margin-top: 8px; gap: 16px; flex-wrap: nowrap" }, [fanCanvas, result]),
    outputCanvas,
  ]);
  panel.body.append(transport.element, element("div", { class: "tl-columns" }, [fuzzifyCard, rulesCard]), outputCard);

  function drawMemberships() {
    const t = temperature();
    drawLineChart(panel, membershipCanvas, {
      width: fuzzifyCard.clientWidth - 24,
      height: 190,
      xTicks: [-10, 0, 10, 20, 30, 40, 50, 60],
      yTicks: [0, 0.5, 1],
      series: RULES.map((rule, index) => ({ points: CURVE.map((x) => [x, rule.membership(x)]), color: panel.color(COLORS[index]) })),
      markers: RULES.map((rule, index) => ({ x: t, y: rule.membership(t), color: panel.color(COLORS[index]) })),
      cursorX: t,
      xFormat: (value) => `${String(value).replace("-", "−")}°`,
    });
  }

  function drawRules() {
    const t = temperature();
    rules.replaceChildren(...RULES.map((rule, index) => {
      const strength = rule.membership(t);
      return element("div", { class: "tl-stack", style: "gap: 3px" }, [
        element("div", { class: "tl-numbers", style: "font-size: 13px", html: `IF temperature is <b style="color: var(--tl-${COLORS[index]})">${rule.name}</b> THEN fan ${rule.speed}% <span style="color: var(--tl-muted)">· strength ${strength.toFixed(2)}</span>` }),
        element("span", { style: "display: block; height: 8px; border-radius: 4px; background: var(--tl-grid); overflow: hidden" }, [
          element("span", { style: `display: block; height: 100%; width: ${(strength * 100).toFixed(1)}%; background: var(--tl-${COLORS[index]})` }),
        ]),
      ]);
    }));
  }

  function drawOutput() {
    const t = temperature();
    const strengths = RULES.map((rule) => rule.membership(t));
    const used = RULES.map((rule, index) => [rule, strengths[index]]).filter(([, strength]) => strength > 0);
    const top = used.map(([rule, strength]) => `${strength.toFixed(2)} × ${rule.speed}`).join(" + ");
    const bottom = used.map(([, strength]) => strength.toFixed(2)).join(" + ");
    const speed = fanSpeed(t);
    formula.textContent = used.length === 1
      ? `Only the ${used[0][0].name} rule fires, so the speed is its speed: ${used[0][0].speed}%.`
      : `(${top}) / (${bottom}) = ${speed.toFixed(1)}%`;
    result.textContent = `Fan speed ${speed.toFixed(1)}%`;
    fanSpeedNow = speed;
    drawLineChart(panel, outputCanvas, {
      width: outputCard.clientWidth - 24,
      height: 170,
      xTicks: [-10, 0, 10, 20, 30, 40, 50, 60],
      yTicks: [0, 25, 50, 75, 100],
      series: [{ points: CURVE.map((x) => [x, fanSpeed(x)]), color: panel.color("accent") }],
      markers: [{ x: t, y: speed, color: panel.color("accent") }],
      cursorX: t,
      xFormat: (value) => `${String(value).replace("-", "−")}°`,
      yFormat: (value) => `${value}%`,
    });
  }

  // The fan turns at a rate proportional to the computed speed (one turn per second at 100%).
  let fanSpeedNow = 0;
  let angle = 0;
  let lastTime = null;
  function drawFan() {
    const size = 64;
    const context = prepareCanvas(fanCanvas, size, size);
    context.translate(size / 2, size / 2);
    context.rotate(angle);
    context.fillStyle = panel.color("accent");
    for (let blade = 0; blade < 3; blade += 1) {
      context.rotate((Math.PI * 2) / 3);
      context.beginPath();
      context.ellipse(0, -15, 7, 15, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = panel.color("text");
    context.beginPath();
    context.arc(0, 0, 5, 0, Math.PI * 2);
    context.fill();
  }
  function spin(time) {
    if (lastTime !== null && !document.hidden) angle += ((time - lastTime) / 1000) * (fanSpeedNow / 100) * Math.PI * 2;
    lastTime = time;
    drawFan();
    requestAnimationFrame(spin);
  }

  function draw() {
    drawMemberships();
    drawRules();
    drawOutput();
    drawFan();
    transport.update();
  }

  panel.onThemeChange(draw);
  new ResizeObserver(() => draw()).observe(panel.body);
  draw();
  transport.autoplayWhenVisible(panel.root);
  if (!prefersReducedMotion()) requestAnimationFrame(spin);
}

export default {
  render({ el }) {
    try {
      renderController(el);
    } catch (error) {
      showLoadError(el, error);
    }
  },
};
