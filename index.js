const bmp = require("bmp-js");
const fs = require("node:fs");
const { noise } = require('./perlin');
const { Buffer } = require('node:buffer');

noise.seed(Math.random());

const width = 250;
const height = 250;

// lacunarity = frequency of octives
// persistence = how amplitude decreases with octive
const toNoiseMap = (height, width, scale, octives = 3, lacunarity = 2, persistence = 0.5) => {
  const baseMap = Array.from({ length: width }, () => Array.from({ length: height }));

  return baseMap.map((row, x) => {
    return row.map((cell, y) => {
      return Array.from({ length: octives }).reduce((total, _curr, octive) => {
        const noiseForThisOctive = noise.simplex2(x / scale * lacunarity**octive, y / scale * lacunarity**octive);

        const withPersistence = noiseForThisOctive * persistence**octive;
        return total + withPersistence;
      }, 0)
    })
  });
}

// subtract a basin shape from the base map to add water around the edges
const toFalloffMap = (height, width, depthFactor = 0.2, maxMagnitudeFactor = 0.3) => {
  const baseMap = Array.from({ length: width }, () => Array.from({ length: height }));

  return baseMap.map((row, x) => row.map((cell, y) => {
    const distanceFromEdgeX = Math.min(x, width - x);
    const distanceFromEdgeY = Math.min(y, height - y);

    const percentageOfTheWayToMaxX = Math.min(distanceFromEdgeX / (depthFactor * (width / 2)), 1);
    const percentageOfTheWayToMaxY = Math.min(distanceFromEdgeY / (depthFactor * (height / 2)), 1);

    return Math.min(
      percentageOfTheWayToMaxX * maxMagnitudeFactor,
      percentageOfTheWayToMaxY * maxMagnitudeFactor,
    )
  }))
}

const mapMatrix = (arrArr, mapper) => {
  return arrArr.map((row, x) => row.map((cell, y) => {
    return mapper(cell, x, y);
  }));
};

// this is misnamed, it actually seems to try to normalize a value in a range to 0-1
const scaledToRange = (min, max) => (v) => {
  const range = max - min;

  const x = v - min;

  return Math.abs(x) / range;
}

const maxMatrix = (matrix) => matrix.flat(2).reduce((acc, curr) => curr > acc ? curr : acc, Number.MIN_VALUE);
const minMatrix = (matrix) => matrix.flat(2).reduce((acc, curr) => curr < acc ? curr : acc, Number.MAX_VALUE);

const noiseMap = toNoiseMap(height, width, 100, 5, 2, 0.4);

const maxValue = maxMatrix(noiseMap);
const minValue = minMatrix(noiseMap);

const scaledNoiseMap = mapMatrix(
  noiseMap,
  (cell) => scaledToRange(minValue, maxValue)(cell)
);

const fallOffMap = //mapMatrix(
  toFalloffMap(height, width);
  // (cell) => scaledToRange(minValue, maxValue)(cell)
//);

const terrain1 = mapMatrix(
  scaledNoiseMap,
  (cell, x, y) => cell + fallOffMap[x][y]
)

const newMax = maxMatrix(terrain1);
const newMin = minMatrix(terrain1);

const terrain = mapMatrix(
  terrain1,
  (cell, x, y) => scaledToRange(newMin, newMax)(cell)
)

const snow = [ 255, 255, 255];
const mountain = [ 99, 102, 106];
const forest = [ 21, 71, 53];
const plain = [31, 89, 31];
const sand = [76, 70, 50];
const water = [ 15, 94, 156];

const toColor = (v) => {
 if (v > 225) {
  return snow;
 }
 if (v > 180) {
  return mountain;
 }
 if (v > 140) {
  return forest;
 }
 if (v > 110) {
  return plain;
 }
 if (v > 100) {
  return sand
 }

 return water;
}

const terrainArr = terrain.flatMap((row, x) => {
  return row.flatMap((cell, y) => {
    let v = cell;

    // const raw = v * 256 * 256 * 256;
    // const r = (raw & 0xFF);
    // const g = (raw & 0xFF00) >> 8;
    // const b = (raw & 0xFF0000) >> 16;

    const asByte = Math.floor(v * 256);

    return [255, ...toColor(asByte).toReversed() ]
    // return [ 255, Math.floor(v * 256), 0 , 0]
    // return [ 255, r, g, b]
  })
});

const file = bmp.encode({ data: Buffer.from(terrainArr), width, height })

fs.writeFileSync('./test.bmp', file.data);
