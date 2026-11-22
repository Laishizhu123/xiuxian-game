(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});

  function createRNG(seed) {
    let s = seed >>> 0;
    return function rand() {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Deterministic 2D Perlin-style gradient noise
  const perm = new Uint8Array(512);
  const gradX = new Float32Array(256);
  const gradY = new Float32Array(256);
  (function initPerm() {
    const rand = createRNG(20261120);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
      const a = rand() * Math.PI * 2;
      gradX[i] = Math.cos(a);
      gradY[i] = Math.sin(a);
    }
    for (let i = 255; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function noise2D(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;

    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];

    const dAA = gradX[aa] * xf + gradY[aa] * yf;
    const dBA = gradX[ba] * (xf - 1) + gradY[ba] * yf;
    const dAB = gradX[ab] * xf + gradY[ab] * (yf - 1);
    const dBB = gradX[bb] * (xf - 1) + gradY[bb] * (yf - 1);

    const x1 = dAA + u * (dBA - dAA);
    const x2 = dAB + u * (dBB - dAB);
    return x1 + v * (x2 - x1);
  }

  function fbm2D(x, y, octaves = 4, lacunarity = 2.02, gain = 0.5) {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise2D(x * freq, y * freq);
      norm += amp;
      freq *= lacunarity;
      amp *= gain;
    }
    return sum / norm;
  }

  function ridged2D(x, y, octaves = 4, lacunarity = 2.1, gain = 0.5) {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let weight = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      let n = 1.0 - Math.abs(noise2D(x * freq, y * freq));
      n = n * n * weight;
      weight = Math.min(1, Math.max(0.15, n * 1.6));
      sum += n * amp;
      norm += amp;
      freq *= lacunarity;
      amp *= gain;
    }
    return sum / norm;
  }

  XW.Noise = {
    createRNG,
    noise2D,
    fbm2D,
    ridged2D,
  };
})(window);
