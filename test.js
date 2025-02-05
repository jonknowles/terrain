const assert = require('node:assert')

const scaledToRange = (min, max) => (v) => {
  const range = max - min;

  const x = v - min;

  return Math.abs(x) / range;
}


assert(scaledToRange(0, 10)(5) === 0.5)
assert(scaledToRange(-5, 5)(0) === 0.5)
assert(scaledToRange(-5, 5)(-5) === 0)