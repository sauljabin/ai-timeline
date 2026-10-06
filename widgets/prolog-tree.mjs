// Replays Prolog search trees recorded by chapters/1972-prolog.md with
// SWI-Prolog and the recorder in chapters/search_tree.pl. Nodes appear in
// the order the search reached them; the layout is computed from the whole
// tree first, so nodes never move.
import { Transport, createPanel, element, loadData, prepareCanvas, roundedRect, showLoadError } from "../widgets/shared/ui.js";

// The clause starting at `line` ends at the first line that ends with a period.
function clauseLines(lines, line) {
  const covered = new Set();
  for (let index = line - 1; index < lines.length; index += 1) {
    covered.add(index + 1);
    if (lines[index].trim().endsWith(".")) break;
  }
  return covered;
}

function buildTree(search) {
  const nodes = new Map();
  search.events.forEach((event, index) => {
    if (event.type === "node") {
      nodes.set(event.id, { ...event, created: index, children: [], answerAt: null, doneAt: null });
      if (event.parent !== null) nodes.get(event.parent).children.push(event.id);
    } else if (event.type === "answer") {
      Object.assign(nodes.get(event.id), { answerAt: index, bindings: event.bindings });
    } else {
      nodes.get(event.id).doneAt = index;
    }
  });
  // Leaves get evenly spaced columns in search order; a parent sits above its children.
  let column = 0;
  let maxDepth = 0;
  const place = (node, depth) => {
    node.depth = depth;
    maxDepth = Math.max(maxDepth, depth);
    if (node.children.length === 0) {
      node.column = column;
      column += 1;
    } else {
      node.children.forEach((id) => place(nodes.get(id), depth + 1));
      const first = nodes.get(node.children[0]);
      const last = nodes.get(node.children[node.children.length - 1]);
      node.column = (first.column + last.column) / 2;
    }
  };
  place(nodes.get(1), 0);
  return { nodes, leafCount: column, maxDepth };
}

function renderTree(el, data) {
  const lines = data.program.split("\n");
  const trees = data.searches.map(buildTree);
  const panel = createPanel(el, {
    title: "Prolog's search tree",
    subtitle: "Each node is the list of goals still to prove. Each branch uses one clause for the first goal.",
  });

  let searchIndex = 0;
  let frame = 0;
  const search = () => data.searches[searchIndex];
  const tree = () => trees[searchIndex];

  const queryButtons = data.searches.map((candidate, index) => {
    const button = element("button", { type: "button", "aria-pressed": String(index === 0), text: `?- ${candidate.query}.` });
    button.addEventListener("click", () => {
      searchIndex = index;
      frame = 0;
      queryButtons.forEach((other, otherIndex) => other.setAttribute("aria-pressed", String(otherIndex === index)));
      transport.setFrameCount(search().events.length);
      transport.play();
      draw();
    });
    return button;
  });

  const transport = new Transport({
    stepsPerSecond: 1.5,
    frameCount: search().events.length,
    onNext: () => {
      if (frame >= search().events.length - 1) return false;
      frame += 1;
      draw();
      return true;
    },
    onPrevious: () => { frame = Math.max(0, frame - 1); draw(); },
    onReset: () => { frame = 0; draw(); },
    onSeek: (position) => { frame = position; draw(); },
    getState: () => ({
      label: `Step ${frame + 1} of ${search().events.length}`,
      canGoBack: frame > 0,
      canGoForward: frame < search().events.length - 1,
      position: frame,
    }),
  });

  const treeCanvas = element("canvas", { role: "img", "aria-label": "Search tree" });
  const treeCard = element("div", { class: "tl-card" }, [treeCanvas]);
  const detail = element("div", { class: "tl-stack", style: "gap: 6px; font-size: 14px" });
  const answers = element("p", { class: "tl-title tl-numbers", style: "font-size: 14px" });
  const programView = element("pre", { style: "margin: 0; font-size: 12.5px; line-height: 1.55; overflow-x: auto" });
  const swatch = (style) => element("span", { class: "tl-swatch", style });
  panel.body.append(
    element("div", { class: "tl-segmented" }, queryButtons),
    transport.element,
    treeCard,
    element("div", { class: "tl-legend" }, [
      element("span", {}, [swatch("border: 2px solid var(--tl-accent)"), "still being explored"]),
      element("span", {}, [swatch("background: var(--tl-positive)"), "answer: every goal proved"]),
      element("span", {}, [swatch("background: var(--tl-negative)"), "dead end: no clause matches"]),
      element("span", {}, [swatch("background: var(--tl-neutral); border: 1px solid var(--tl-muted)"), "finished: every option tried"]),
    ]),
    element("div", { class: "tl-columns" }, [
      element("div", { class: "tl-card" }, [element("p", { class: "tl-label", text: "What happens in this step" }), detail, answers]),
      element("div", { class: "tl-card" }, [element("p", { class: "tl-label", text: "Program (family.pl): the clause just used" }), programView]),
    ]),
  );

  // Status of a node at the current frame.
  function status(node) {
    if (node.answerAt !== null && node.answerAt <= frame) return "answer";
    if (node.doneAt !== null && node.doneAt <= frame) {
      return node.children.some((id) => tree().nodes.get(id).created <= frame) ? "finished" : "dead end";
    }
    return "open";
  }

  function currentNode() {
    return tree().nodes.get(search().events[frame].id);
  }

  // The text a node shows: its goals one per line, or its answer.
  function nodeLines(node) {
    if (node.answerAt !== null && node.answerAt <= frame) return [node.bindings || "true"];
    return node.goals.length ? node.goals : ["(no goals left)"];
  }

  function drawTree() {
    const { nodes, leafCount, maxDepth } = tree();
    const width = treeCard.clientWidth - 24;
    const spacing = width / leafCount;
    // Resizing a canvas resets its font, so keep the font in one place.
    const font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    const context = prepareCanvas(treeCanvas, width, 10);
    context.font = font;

    // Text boxes only when every node's longest goal fits its column; otherwise dots.
    const widest = Math.max(...[...nodes.values()].flatMap((node) => [...node.goals, node.bindings ?? ""].map((text) => context.measureText(text).width)));
    const labeled = widest + 16 <= Math.min(spacing - 8, 240);
    const boxWidth = labeled ? widest + 16 : 0;
    const tallest = Math.max(...[...nodes.values()].map((node) => Math.max(node.goals.length, 1)));
    const levelHeight = labeled ? tallest * 14 + 44 : 40;
    const height = (maxDepth + 1) * levelHeight + (labeled ? 10 : 90);
    const drawing = prepareCanvas(treeCanvas, width, height);
    drawing.font = font;
    const x = (node) => (node.column + 0.5) * spacing;
    const y = (node) => (labeled ? 14 + (tallest * 14 + 10) / 2 : 22) + node.depth * levelHeight;

    // Nodes on the path from the root to the current node.
    const current = currentNode();
    const path = new Set();
    for (let node = current; node; node = node.parent === null ? null : nodes.get(node.parent)) path.add(node.id);

    const visible = [...nodes.values()].filter((node) => node.created <= frame);
    for (const node of visible) {
      if (node.parent === null) continue;
      const parent = nodes.get(node.parent);
      const onPath = path.has(node.id);
      drawing.strokeStyle = onPath ? panel.color("accent") : panel.color("muted");
      drawing.lineWidth = onPath ? 2.5 : 1;
      drawing.beginPath();
      drawing.moveTo(x(parent), y(parent));
      drawing.lineTo(x(node), y(node));
      drawing.stroke();
      if (labeled) {
        // Which clause the branch used, written beside the branch.
        const label = node.line === "builtin" ? "test" : `line ${node.line}`;
        drawing.fillStyle = panel.color("muted");
        drawing.textAlign = "left";
        drawing.textBaseline = "middle";
        drawing.fillText(label, (x(parent) + x(node)) / 2 + 6, y(node) - levelHeight / 2);
      }
    }

    const fills = {
      answer: panel.color("positive"),
      "dead end": panel.color("negative"),
      finished: panel.color("neutral"),
      open: panel.color("surface"),
    };
    const drawBox = (centerX, centerY, textLines, state, isCurrent, width) => {
      const boxHeight = textLines.length * 14 + 10;
      const left = centerX - width / 2;
      const top = centerY - boxHeight / 2;
      drawing.fillStyle = fills[state];
      roundedRect(drawing, left, top, width, boxHeight, 6);
      drawing.fill();
      drawing.strokeStyle = state === "open" || isCurrent ? panel.color("accent") : panel.color("muted");
      drawing.lineWidth = isCurrent ? 3 : state === "open" ? 2 : 1;
      drawing.stroke();
      drawing.fillStyle = state === "answer" || state === "dead end" ? panel.color("surface") : panel.color("text");
      drawing.textAlign = "center";
      drawing.textBaseline = "middle";
      textLines.forEach((text, index) => drawing.fillText(text, centerX, top + 12 + index * 14));
    };

    for (const node of visible) {
      const state = status(node);
      const isCurrent = node.id === current.id;
      if (labeled) {
        drawBox(x(node), y(node), nodeLines(node), state, isCurrent, boxWidth);
      } else {
        drawing.fillStyle = fills[state];
        drawing.strokeStyle = state === "open" || isCurrent ? panel.color("accent") : panel.color("muted");
        drawing.lineWidth = isCurrent ? 3 : 1.5;
        drawing.beginPath();
        drawing.arc(x(node), y(node), isCurrent ? 8 : 6, 0, Math.PI * 2);
        drawing.fill();
        drawing.stroke();
      }
    }

    // Dots mode: a callout under the tree shows the current node's text,
    // joined to the node by a thin line.
    if (!labeled) {
      const textLines = nodeLines(current);
      const calloutWidth = Math.min(Math.max(...textLines.map((text) => drawing.measureText(text).width)) + 16, width - 4);
      const calloutY = (maxDepth + 1) * levelHeight + 40;
      const calloutX = Math.min(Math.max(x(current), calloutWidth / 2 + 2), width - calloutWidth / 2 - 2);
      drawing.strokeStyle = panel.color("accent");
      drawing.lineWidth = 1;
      drawing.setLineDash([3, 3]);
      drawing.beginPath();
      drawing.moveTo(x(current), y(current) + 8);
      drawing.lineTo(calloutX, calloutY - textLines.length * 7 - 5);
      drawing.stroke();
      drawing.setLineDash([]);
      drawBox(calloutX, calloutY, textLines, status(current), true, calloutWidth);
    }
  }

  function drawDetail() {
    const event = search().events[frame];
    const node = tree().nodes.get(event.id);
    const line = (text, style = "") => element("div", { text, style });
    const code = (goals) => element("code", { text: goals.length ? goals.join(", ") : "nothing", style: "font-size: 13px" });
    detail.replaceChildren();
    if (event.type === "node" && node.parent === null) {
      detail.append(line("The search starts with the query as its only goal:"), code(node.goals));
    } else if (event.type === "node") {
      const how = node.line === "builtin"
        ? `The built-in test ${node.resolved} succeeds.`
        : `Prolog uses the clause on line ${node.line} for the first goal, ${node.resolved}.`;
      detail.append(line(how), line("Goals left to prove:"), code(node.goals));
    } else if (event.type === "answer") {
      detail.append(line("No goals left: the query is proved.", "font-weight: 600"), line(`Answer: ${event.bindings || "true"}`), line("Prolog reports it, then backtracks to look for more answers.", "color: var(--tl-muted)"));
    } else if (status(node) === "dead end") {
      const first = node.goals[0];
      const why = event.reason === "test" ? `Dead end: the test ${first} fails.` : `Dead end: no clause matches ${first}.`;
      detail.append(line(why, "color: var(--tl-negative); font-weight: 600"), line("Prolog backtracks to the nearest node with an untried option.", "color: var(--tl-muted)"));
    } else {
      detail.append(line("Every option for this node has been tried.", "font-weight: 600"), line(node.parent === null ? "The search is complete." : "Prolog backtracks to the node above.", "color: var(--tl-muted)"));
    }
    const found = search().events.slice(0, frame + 1).filter((candidate) => candidate.type === "answer").map((candidate) => candidate.bindings || "true");
    answers.textContent = found.length ? `Answers so far: ${found.join("; ")}` : "No answers yet.";
  }

  function drawProgram() {
    // Highlight the clause used to reach the current node, or the nearest one above it.
    let highlighted = new Set();
    for (let node = currentNode(); node; node = node.parent === null ? null : tree().nodes.get(node.parent)) {
      if (typeof node.line === "number") {
        highlighted = clauseLines(lines, node.line);
        break;
      }
    }
    programView.replaceChildren(...lines.map((text, index) => element("div", {
      style: highlighted.has(index + 1) ? "background: color-mix(in srgb, var(--tl-accent) 20%, transparent); border-radius: 3px" : "",
    }, [element("span", { style: "color: var(--tl-muted); display: inline-block; width: 2.5ch", text: String(index + 1) }), ` ${text}`])));
  }

  function draw() {
    drawTree();
    drawDetail();
    drawProgram();
    transport.update();
  }

  panel.onThemeChange(draw);
  new ResizeObserver(() => draw()).observe(treeCard);
  draw();
  transport.autoplayWhenVisible(panel.root);
}

export default {
  async render({ model, el }) {
    try {
      renderTree(el, await loadData(model.get("data")));
    } catch (error) {
      showLoadError(el, error);
    }
  },
};
