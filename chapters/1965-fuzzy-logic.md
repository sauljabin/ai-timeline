---
kernelspec:
  name: python3
  display_name: Python 3
---

# 1965 Fuzzy Logic

Fuzzy logic lets a statement be partly true, by a degree between 0 and 1, instead of only true or false. Lotfi Zadeh, at the University of California, Berkeley, introduced it in 1965 in a paper called "Fuzzy Sets". It gave computers a way to work with vague words such as "warm" or "fast", which people use all the time and classical logic cannot express.

## High-Level Ideas

Is 27 °C warm? Classical logic needs a cutoff, such as "warm means 20 °C to 30 °C", and then 29.9 °C is warm while 30.1 °C is not. Fuzzy logic instead gives 27 °C a degree of warmth, such as `0.875`: mostly warm. That degree is the *membership* of 27 °C in the *fuzzy set* "warm", written $\mu_{warm}(27) = 0.875$.

A *membership function* gives the degree for every temperature. A common shape is the triangle: the degree rises in a straight line from 0 to 1, then falls back to 0.

Zadeh's paper also defined how to combine degrees. For two fuzzy sets `A` and `B`:

$$NOT\ A = 1 - \mu_A(x)$$

$$A\ AND\ B = \min(\mu_A(x), \mu_B(x))$$

$$A\ OR\ B = \max(\mu_A(x), \mu_B(x))$$

When every degree is 0 or 1, these give the same results as ordinary true/false logic.

## Example: Temperature Membership

```{code-cell} python
def triangle(value, left, peak, right):
    # 0 outside (left, right), rising to 1 at the peak, then falling.
    if value <= left or value >= right:
        return 0.0
    if value <= peak:
        return (value - left) / (peak - left)
    return (right - value) / (right - peak)


def fuzzy_not(a):
    return 1 - a


def fuzzy_and(a, b):
    return min(a, b)


def fuzzy_or(a, b):
    return max(a, b)


warm_degree = triangle(27, left=18, peak=26, right=34)
hot_degree = triangle(27, left=28, peak=36, right=44)

print(f"27 °C is warm to degree {warm_degree:.3f}")
print(f"27 °C is hot to degree  {hot_degree:.3f}")
print(f"warm AND hot = {fuzzy_and(warm_degree, hot_degree):.3f}")
print(f"warm OR hot  = {fuzzy_or(warm_degree, hot_degree):.3f}")
print(f"NOT warm     = {fuzzy_not(warm_degree):.3f}")

assert warm_degree == 0.875 and hot_degree == 0.0
```

*Warm* peaks at 26 °C and falls to 0 at 34 °C, a drop of 1 over 8 degrees. 27 °C is one degree past the peak, so its warm degree is `1 − 1/8 = 0.875`. *Hot* only starts at 28 °C, so 27 °C is hot to degree 0.

## Example: A Fuzzy Fan Controller

A fuzzy controller follows rules written in words:

- IF temperature is *cold* THEN fan speed is 25%
- IF temperature is *warm* THEN fan speed is 55%
- IF temperature is *hot* THEN fan speed is 90%

At 30 °C, *warm* is true to degree 0.5 and *hot* to degree 0.25, so the warm rule fires at strength 0.5 and the hot rule at 0.25. The controller averages the two speeds, giving each rule as much weight as its strength:

$$\frac{0.5 \times 55 + 0.25 \times 90}{0.5 + 0.25} = 66.7\%$$

Turning the rules' results back into one number this way is called *defuzzification*.

The two outer sets are *shoulders*: *cold* stays at 1 up to 10 °C, and *hot* stays at 1 from 36 °C up. With the triangle from the first example, which ends at 44 °C, 50 °C would be hot to degree 0, no rule would fire, and the controller would have no answer.

```{code-cell} python
def cold(t):
    # Left shoulder: fully cold up to 10 °C, then falling to 0 at 24 °C.
    return 1.0 if t <= 10 else triangle(t, left=10, peak=10, right=24)


def warm(t):
    return triangle(t, left=18, peak=26, right=34)


def hot(t):
    # Right shoulder: rising from 28 °C, fully hot from 36 °C up.
    return 1.0 if t >= 36 else triangle(t, left=28, peak=36, right=36)


RULES = [(cold, 25), (warm, 55), (hot, 90)]  # (condition, fan speed in %)


def fan_speed(t):
    strengths = [condition(t) for condition, _ in RULES]
    # Weighted average of the rule outputs. The shoulders make sure at
    # least one rule fires at every temperature, so this never divides by 0.
    weighted = sum(s * speed for s, (_, speed) in zip(strengths, RULES))
    return weighted / sum(strengths)


for t in (5, 21, 30, 50):
    strengths = ", ".join(f"{r.__name__} {r(t):.2f}" for r, _ in RULES)
    print(f"{t:>2} °C: {strengths} -> fan {fan_speed(t):.1f}%")
```

Because neighboring sets overlap, the speed changes gradually instead of jumping between three fixed settings. The next cell checks the whole range from −10 °C to 60 °C: the speed stays between 25% and 90%, and it never drops as the temperature rises.

```{code-cell} python
# -10 °C to 60 °C in steps of 0.1 °C
temperatures = [step / 10 for step in range(-100, 601)]
speeds = [fan_speed(t) for t in temperatures]

# Floating-point division can be off in the 15th decimal place
# (25.000000000000004), so "never drops" allows that much rounding error.
never_drops = all(a <= b + 1e-9 for a, b in zip(speeds, speeds[1:]))
print(f"Lowest speed {min(speeds):.1f}%, highest {max(speeds):.1f}%")
print(f"The speed never drops as the temperature rises: {never_drops}")

assert abs(fan_speed(30) - 200 / 3) < 1e-12
assert abs(min(speeds) - 25) < 1e-9 and abs(max(speeds) - 90) < 1e-9
assert never_drops
```

## Example: Try the Controller

The panel runs the controller in your browser and shows its three steps for one temperature at a time. Press **Play** to sweep from −10 °C to 60 °C, or drag the slider. The fan turns at the computed speed.

```{code-cell} python
:tags: [remove-cell]
import json
from pathlib import Path

# Reference values for the test that compares the panel's JavaScript copy with this code.
data_directory = Path("../widgets/data")
data_directory.mkdir(parents=True, exist_ok=True)
(data_directory / "fuzzy-reference.json").write_text(json.dumps({
    "points": [{"t": t, "cold": cold(t), "warm": warm(t), "hot": hot(t), "speed": fan_speed(t)} for t in temperatures],
}))
```

```{anywidget} ../widgets/fuzzy-controller.mjs
{}
```

The code that runs this panel is in [chapters/1965-fuzzy-logic.md](https://github.com/sauljabin/ai-timeline/blob/main/chapters/1965-fuzzy-logic.md).

## Why This Mattered

Fuzzy logic let engineers write control rules the way an expert would say them, then run those rules on a computer. In 1975 Ebrahim Mamdani and Sedrak Assilian used fuzzy rules to control a laboratory steam engine. Fuzzy control later ran real systems, such as the automatic train operation of the Sendai subway in Japan, which opened in 1987.

## How This Differs from the Original

Zadeh's 1965 paper defined fuzzy sets and their operations, not controllers. Mamdani's 1975 controller described each rule's output as a fuzzy set too, and combined those sets before turning the result into a number. This page gives each rule a single number (25%, 55%, 90%) and takes their weighted average. Tomohiro Takagi and Michio Sugeno formalized that shortcut in 1985.

## Sources

- Lotfi A. Zadeh, "Fuzzy sets", *Information and Control* 8(3), 1965, pp. 338–353.
- Ebrahim H. Mamdani and Sedrak Assilian, "An experiment in linguistic synthesis with a fuzzy logic controller", *International Journal of Man-Machine Studies* 7(1), 1975, pp. 1–13.
- Tomohiro Takagi and Michio Sugeno, "Fuzzy identification of systems and its applications to modeling and control", *IEEE Transactions on Systems, Man, and Cybernetics* 15(1), 1985, pp. 116–132.
