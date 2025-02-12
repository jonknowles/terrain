const bmp = require("bmp-js");
const fs = require("node:fs");
const { noise } = require('./perlin');
const { Buffer } = require('node:buffer');

const startDate = new Date();

noise.seed(Math.random());

const width = 1000;
const height = 1000;

const toEmptyMap = (height, width) => {
  return  Array.from({ length: width }, () => Array.from({ length: height }));
};

// this is misnamed, it actually seems to try to normalize a value in a range to 0-1
const scaledToRange = (min, max) => (v) => {
  const range = max - min;
  const x = v - min;

  return Math.abs(x) / range;
}

const maxMatrix = (matrix) => matrix.flat(2).reduce((acc, curr) => curr > acc ? curr : acc, Number.MIN_VALUE);
const minMatrix = (matrix) => matrix.flat(2).reduce((acc, curr) => curr < acc ? curr : acc, Number.MAX_VALUE);

// lacunarity = frequency of octives
// persistence = how amplitude decreases with octive
const toNoiseMap = (height, width, scale, octives = 3, lacunarity = 2, persistence = 0.5) => {
  const baseMap = toEmptyMap(height, width);

  const noiseMap = baseMap.map((row, x) => {
    return row.map((_cell, y) => {
      return Array.from({ length: octives }).reduce((total, _curr, octive) => {
        const noiseForThisOctive = noise.simplex2(x / scale * lacunarity**octive, y / scale * lacunarity**octive);

        const withPersistence = noiseForThisOctive * persistence**octive;
        return total + withPersistence;
      }, 0)
    })
  });

  // Scale the perlin noise to a float from 0-1
  const maxValue = maxMatrix(noiseMap);
  const minValue = minMatrix(noiseMap);

  const scaledNoiseMap = mapMatrix(
    noiseMap,
    (cell) => scaledToRange(minValue, maxValue)(cell)
  );

  return scaledNoiseMap;
}

// subtract a basin shape from the base map to add water around the edges
// TODO: This is a linear falloff, it should be curved
const toFalloffMap = (height, width, depthFactor = 0.2, maxMagnitudeFactor = 0.3) => {
  const baseMap = toEmptyMap(height, width);

  return baseMap.map((row, x) => row.map((_cell, y) => {
    const distanceFromEdgeX = Math.min(x, width - x);
    const distanceFromEdgeY = Math.min(y, height - y);

    const percentageOfTheWayToMaxX = Math.min(distanceFromEdgeX / (depthFactor * (width / 2)), 1);
    const percentageOfTheWayToMaxY = Math.min(distanceFromEdgeY / (depthFactor * (height / 2)), 1);

    return Math.min(
      percentageOfTheWayToMaxX * maxMagnitudeFactor,
      percentageOfTheWayToMaxY * maxMagnitudeFactor,
    );
  }))
}

const mapMatrix = (arrArr, mapper) => {
  return arrArr.map((row, x) => row.map((cell, y) => {
    return mapper(cell, x, y);
  }));
};

const scaledNoiseMap = toNoiseMap(height, width, 100, 8, 2, 0.4);

const fallOffMap = toFalloffMap(height, width, 0.5, 0.5);

const terrainWithFalloff = mapMatrix(
  scaledNoiseMap,
  (cell, x, y) => cell - (1 - fallOffMap[x][y])
);

const newMax = maxMatrix(terrainWithFalloff);
const newMin = minMatrix(terrainWithFalloff);

const terrain = mapMatrix(
  terrainWithFalloff,
  (cell, x, y) => scaledToRange(newMin, newMax)(cell)
);

const snow = [ 255, 255, 255];
const mountain = [ 99, 102, 106];
const forest = [ 21, 71, 53];
const plain = [31, 89, 31];
const sand = [76, 70, 50];
const water = [ 15, 94, 156];
const deepWater = [8, 47, 78];
const ocean = [6, 35, 58];

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
 if (v > 70) {
  return water
 }
 if (v > 30) {
  return deepWater
 }

 return ocean;
}

const toTerrainRgb = (uint8) => {
  return [255, ...toColor(uint8).toReversed() ]
}

const toBlueRgb = (uint8) => {
  return [ 255, uint8, 0 , 0]
}

const toBmpOutput = (map, toRgb = toTerrainRgb) => {
  return map.flatMap((row, x) => {
    return row.flatMap((cell, y) => {
      const asByte = Math.floor(cell * 256);

      return toRgb(asByte);
    });
  });
}

const terrainArr = toBmpOutput(terrain)
const falloffArr = toBmpOutput(fallOffMap, toBlueRgb)
const originalScaled = toBmpOutput(scaledNoiseMap)

const file = bmp.encode({ data: Buffer.from(terrainArr), width, height })
const file2 = bmp.encode({ data: Buffer.from(falloffArr), width, height })
const file3 = bmp.encode({ data: Buffer.from(originalScaled), width, height })

fs.writeFileSync('./test.bmp', file.data);
fs.writeFileSync('./test2.bmp', file2.data);
fs.writeFileSync('./test3.bmp', file3.data);

console.log(`Completed in ${new Date() - startDate}ms`)