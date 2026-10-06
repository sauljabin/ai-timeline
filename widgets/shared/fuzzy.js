// JavaScript copy of the fan controller from chapters/1965-fuzzy-logic.md.
// tests/fuzzy.test.mjs checks it against values computed in Python.

export function triangle(value, left, peak, right) {
  if (value <= left || value >= right) return 0;
  if (value <= peak) return (value - left) / (peak - left);
  return (right - value) / (right - peak);
}

export const cold = (t) => (t <= 10 ? 1 : triangle(t, 10, 10, 24));
export const warm = (t) => triangle(t, 18, 26, 34);
export const hot = (t) => (t >= 36 ? 1 : triangle(t, 28, 36, 36));

export const RULES = [
  { name: "cold", membership: cold, speed: 25 },
  { name: "warm", membership: warm, speed: 55 },
  { name: "hot", membership: hot, speed: 90 },
];

// Weighted average of the rule outputs, weighted by how strongly each rule fires.
export function fanSpeed(t) {
  let weighted = 0;
  let total = 0;
  for (const rule of RULES) {
    const strength = rule.membership(t);
    weighted += strength * rule.speed;
    total += strength;
  }
  return weighted / total;
}
