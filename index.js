const bmp = require("bmp-js");
const fs = require("node:fs");
const { noise } = require('./perlin');
const { Buffer } = require('node:buffer');

noise.seed(Math.random());

const width = 1000;
const height = 1000;
const scale = 100;

// lacunarity = frequency of octives

const toNoiseMap = (height, width, scale, octives = 3, lacunarity = 2, persistence = 0.5) => {
  const baseMap = Array.from({ length: width }, () => Array.from({ length: height }));

  return baseMap.map((row, x) => {
    return row.map((cell, y) => {

      // for (const octive = 0; octive < octives; octive++) {
      //   const sampleX = x / scale * (lacunarity ^ )

      // }

      const base = noise.simplex2(x / scale, y / scale);
      const aBit = noise.simplex2(x / scale * lacunarity**1, y / scale * lacunarity**1);
      const aBitLess = noise.simplex2(x / scale * lacunarity**2, y / scale * lacunarity**2);

      return base + (aBit * persistence**1) + (aBitLess * persistence**2);
      // return (base + 1) / 2;
      // return base;
    })
  });
}

const maxMatrix = (matrix) => matrix.flat(2).reduce((acc, curr) => curr > acc ? curr : acc, Number.MIN_VALUE);

const minMatrix = (matrix) => matrix.flat(2).reduce((acc, curr) => curr < acc ? curr : acc, Number.MAX_VALUE)

const terrain = toNoiseMap(height, width, scale, 3, 2.1, 0.7);

const scaledToRange = (min, max) => (v) => {
  const range = max - min;

  const x = v - min;

  return Math.abs(x) / range;
}


const maxValue = maxMatrix(terrain);
const minValue = minMatrix(terrain);

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
 if (v > 150) {
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

const terrainArr = terrain.flatMap((row) => {
  return row.flatMap((cell) => {
    const v = scaledToRange(minValue, maxValue)(cell);

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
