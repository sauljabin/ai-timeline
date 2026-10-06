// JavaScript copy of next_generation_on_torus from
// chapters/1970-conways-game-of-life.md. tests/life.test.mjs checks it
// against generations computed by that Python function.

// A cell (x, y) is stored as the single number y * width + x.
export function cellKey(x, y, width) {
  return y * width + x;
}

export function nextGenerationOnTorus(liveCells, width, height) {
  // Every live cell adds 1 to each of its eight neighbors' counts.
  // The modulo wraps coordinates around the edges.
  const neighborCounts = new Map();
  for (const key of liveCells) {
    const x = key % width;
    const y = (key - x) / width;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const neighbor = cellKey((x + dx + width) % width, (y + dy + height) % height, width);
        neighborCounts.set(neighbor, (neighborCounts.get(neighbor) ?? 0) + 1);
      }
    }
  }

  // Birth with exactly 3 neighbors, survival with 2 or 3.
  const next = new Set();
  for (const [key, count] of neighborCounts) {
    if (count === 3 || (count === 2 && liveCells.has(key))) next.add(key);
  }
  return next;
}
