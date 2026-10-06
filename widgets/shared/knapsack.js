// JavaScript copy of fitness from chapters/1975-genetic-algorithms.md.
// A pack is stored as an integer: bit i is 1 when item i is packed.
// tests/knapsack.test.mjs checks it against scores computed in Python.

export function isPacked(pack, index) {
  return Math.floor(pack / 2 ** index) % 2 === 1;
}

export function totals(items, pack) {
  let weight = 0;
  let value = 0;
  items.forEach((item, index) => {
    if (isPacked(pack, index)) {
      weight += item.weight;
      value += item.value;
    }
  });
  return { weight, value };
}

export function fitness(items, capacity, pack) {
  const { weight, value } = totals(items, pack);
  return weight <= capacity ? value : 0;
}
