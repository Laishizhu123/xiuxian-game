(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const N = XW.Noise;

  class MeshBuilder {
    constructor(collisionWorld = null) {
      this.verts = [];
      this.indices = [];
      this.vCount = 0;
      this.colWorld = collisionWorld;
      this.colEnabled = !!collisionWorld;
      this.colTag = 'building';
    }

    setCollision(enabled, tag = 'building') {
      this.colEnabled = !!enabled && !!this.colWorld;
      if (tag) this.colTag = tag;
    }

    pushVertex(x, y, z, nx, ny, nz, r, g, b, rough = 0.65, emissive = 0.0, matType = 1.0) {
      this.verts.push(x, y, z, nx, ny, nz, r, g, b, rough, emissive, matType);
      return this.vCount++;
    }

    pushTri(a, b, c) {
      this.indices.push(a, b, c);
    }

    pushQuad(a, b, c, d) {
      this.indices.push(a, b, c, a, c, d);
    }

    addFlatTri(p0, p1, p2, col, rough = 0.65, emissive = 0.0, matType = 1.0) {
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
      const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const a = this.pushVertex(p0[0], p0[1], p0[2], nx, ny, nz, col[0], col[1], col[2], rough, emissive, matType);
      const b = this.pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, col[0], col[1], col[2], rough, emissive, matType);
      const c = this.pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, col[0], col[1], col[2], rough, emissive, matType);
      this.pushTri(a, b, c);
    }

    addFlatQuad(p0, p1, p2, p3, col, rough = 0.65, emissive = 0.0, matType = 1.0) {
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
      const vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const a = this.pushVertex(p0[0], p0[1], p0[2], nx, ny, nz, col[0], col[1], col[2], rough, emissive, matType);
      const b = this.pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, col[0], col[1], col[2], rough, emissive, matType);
      const c = this.pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, col[0], col[1], col[2], rough, emissive, matType);
      const d = this.pushVertex(p3[0], p3[1], p3[2], nx, ny, nz, col[0], col[1], col[2], rough, emissive, matType);
      this.pushQuad(a, b, c, d);
    }

    addShadedQuad(p0, p1, p2, p3, colBot, colTop, rough = 0.65, emissive = 0.0, matType = 1.0) {
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
      const vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const a = this.pushVertex(p0[0], p0[1], p0[2], nx, ny, nz, colBot[0], colBot[1], colBot[2], rough, emissive, matType);
      const b = this.pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, colBot[0], colBot[1], colBot[2], rough, emissive, matType);
      const c = this.pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, colTop[0], colTop[1], colTop[2], rough, emissive, matType);
      const d = this.pushVertex(p3[0], p3[1], p3[2], nx, ny, nz, colTop[0], colTop[1], colTop[2], rough, emissive, matType);
      this.pushQuad(a, b, c, d);
    }

    static xformY(lx, ly, lz, cx, cy, cz, cosY, sinY) {
      return [
        cx + lx * cosY + lz * sinY,
        cy + ly,
        cz - lx * sinY + lz * cosY,
      ];
    }

    static xformEuler(lx, ly, lz, cx, cy, cz, rx, ry, rz) {
      const cosZ = Math.cos(rz), sinZ = Math.sin(rz);
      const x1 = lx * cosZ - ly * sinZ;
      const y1 = lx * sinZ + ly * cosZ;
      const z1 = lz;

      const cosX = Math.cos(rx), sinX = Math.sin(rx);
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      const cosY = Math.cos(ry), sinY = Math.sin(ry);
      return [
        cx + x2 * cosY + z2 * sinY,
        cy + y2,
        cz - x2 * sinY + z2 * cosY,
      ];
    }

    addBox(cx, cy, cz, sx, sy, sz, rotY, col, rough = 0.65, emissive = 0.0, matType = 1.0) {
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const cY = Math.cos(rotY), sY = Math.sin(rotY);
      const xf = (x, y, z) => MeshBuilder.xformY(x, y, z, cx, cy, cz, cY, sY);

      const v000 = xf(-hx, -hy, -hz);
      const v100 = xf( hx, -hy, -hz);
      const v110 = xf( hx,  hy, -hz);
      const v010 = xf(-hx,  hy, -hz);
      const v001 = xf(-hx, -hy,  hz);
      const v101 = xf( hx, -hy,  hz);
      const v111 = xf( hx,  hy,  hz);
      const v011 = xf(-hx,  hy,  hz);

      const aoBot = (emissive < 0.05 && matType < 1.8 && sy >= 0.32) ? 0.76 : 1.0;
      const colBot = [col[0] * aoBot, col[1] * aoBot, col[2] * aoBot];

      this.addShadedQuad(v001, v101, v111, v011, colBot, col, rough, emissive, matType);
      this.addShadedQuad(v100, v000, v010, v110, colBot, col, rough, emissive, matType);
      this.addShadedQuad(v101, v100, v110, v111, colBot, col, rough, emissive, matType);
      this.addShadedQuad(v000, v001, v011, v010, colBot, col, rough, emissive, matType);
      this.addFlatQuad(v011, v111, v110, v010, col, rough, emissive, matType);
      this.addFlatQuad(v000, v100, v101, v001, colBot, rough, emissive, matType);

      if (this.colEnabled && sy >= 0.30 && (sx >= 0.35 || sz >= 0.35) && Math.min(sx, sz) >= 0.22) {
        this.colWorld.addBox(cx, cy, cz, sx, sy, sz, rotY, this.colTag, true);
      }
    }

    addBoxEuler(cx, cy, cz, sx, sy, sz, rx, ry, rz, col, rough = 0.65, emissive = 0.0, matType = 1.0) {
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const xf = (x, y, z) => MeshBuilder.xformEuler(x, y, z, cx, cy, cz, rx, ry, rz);

      const v000 = xf(-hx, -hy, -hz);
      const v100 = xf( hx, -hy, -hz);
      const v110 = xf( hx,  hy, -hz);
      const v010 = xf(-hx,  hy, -hz);
      const v001 = xf(-hx, -hy,  hz);
      const v101 = xf( hx, -hy,  hz);
      const v111 = xf( hx,  hy,  hz);
      const v011 = xf(-hx,  hy,  hz);

      const aoBot = (emissive < 0.05 && matType < 1.8 && sy >= 0.32) ? 0.76 : 1.0;
      const colBot = [col[0] * aoBot, col[1] * aoBot, col[2] * aoBot];

      this.addShadedQuad(v001, v101, v111, v011, colBot, col, rough, emissive, matType);
      this.addShadedQuad(v100, v000, v010, v110, colBot, col, rough, emissive, matType);
      this.addShadedQuad(v101, v100, v110, v111, colBot, col, rough, emissive, matType);
      this.addShadedQuad(v000, v001, v011, v010, colBot, col, rough, emissive, matType);
      this.addFlatQuad(v011, v111, v110, v010, col, rough, emissive, matType);
      this.addFlatQuad(v000, v100, v101, v001, colBot, rough, emissive, matType);

      if (this.colEnabled && sy >= 0.8 && sx >= 0.5 && sz >= 0.4) {
        this.colWorld.addBox(cx, cy, cz, sx, sy, sz, ry, this.colTag, false);
      }
    }

    addCylinder(cx, cy, cz, rBot, rTop, height, segs, col, rough = 0.6, emissive = 0.0, matType = 1.0, capTop = true, capBot = false) {
      const y0 = cy;
      const y1 = cy + height;
      const slopeN = (rBot - rTop) / (height || 1);
      const baseIdx = this.vCount;

      const aoBot = (emissive < 0.05 && matType < 1.8 && height >= 0.30) ? 0.76 : 1.0;
      const bR = col[0] * aoBot, bG = col[1] * aoBot, bB = col[2] * aoBot;

      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const len = Math.hypot(ca, slopeN, sa) || 1;
        const nx = ca / len, ny = slopeN / len, nz = sa / len;
        this.pushVertex(cx + ca * rBot, y0, cz + sa * rBot, nx, ny, nz, bR, bG, bB, rough, emissive, matType);
        this.pushVertex(cx + ca * rTop, y1, cz + sa * rTop, nx, ny, nz, col[0], col[1], col[2], rough, emissive, matType);
      }
      for (let i = 0; i < segs; i++) {
        const a = baseIdx + i * 2;
        this.pushTri(a, a + 1, a + 2);
        this.pushTri(a + 2, a + 1, a + 3);
      }

      if (capTop && rTop > 0.001) {
        const centerIdx = this.pushVertex(cx, y1, cz, 0, 1, 0, col[0], col[1], col[2], rough, emissive, matType);
        const ringStart = this.vCount;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          this.pushVertex(cx + Math.cos(a) * rTop, y1, cz + Math.sin(a) * rTop, 0, 1, 0, col[0], col[1], col[2], rough, emissive, matType);
        }
        for (let i = 0; i < segs; i++) {
          this.pushTri(centerIdx, ringStart + i + 1, ringStart + i);
        }
      }
      if (capBot && rBot > 0.001) {
        const centerIdx = this.pushVertex(cx, y0, cz, 0, -1, 0, col[0], col[1], col[2], rough, emissive, matType);
        const ringStart = this.vCount;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          this.pushVertex(cx + Math.cos(a) * rBot, y0, cz + Math.sin(a) * rBot, 0, -1, 0, col[0], col[1], col[2], rough, emissive, matType);
        }
        for (let i = 0; i < segs; i++) {
          this.pushTri(centerIdx, ringStart + i, ringStart + i + 1);
        }
      }

      const rCol = Math.max(rBot, rTop);
      if (this.colEnabled && height >= 0.25 && rCol >= 0.20) {
        this.colWorld.addCylinder(cx, cy, cz, rCol, height, this.colTag, capTop || height < 2.2);
      }
    }

    // Tapered 3D Beam / Tube connecting arbitrary points (x0,y0,z0) -> (x1,y1,z1) with smooth radial normals & end caps
    addTaperedBeam(x0, y0, z0, x1, y1, z1, r0, r1, segs = 6, col = [0.5, 0.5, 0.5], rough = 0.65, emissive = 0.0, matType = 1.0) {
      const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
      const len = Math.hypot(dx, dy, dz);
      if (len < 1e-4) return;
      const ax = dx / len, ay = dy / len, az = dz / len;
      // Orthonormal frame (ux,uy,uz), (vx,vy,vz) perpendicular to beam axis
      let rx = 0, ry = 1, rz = 0;
      if (Math.abs(ay) > 0.92) { rx = 1; ry = 0; rz = 0; }
      let ux = ry * az - rz * ay;
      let uy = rz * ax - rx * az;
      let uz = rx * ay - ry * ax;
      const uLen = Math.hypot(ux, uy, uz) || 1.0;
      ux /= uLen; uy /= uLen; uz /= uLen;
      const vx = ay * uz - az * uy;
      const vy = az * ux - ax * uz;
      const vz = ax * uy - ay * ux;

      const s = Math.max(3, segs | 0);
      const colBot = [col[0] * 0.88, col[1] * 0.88, col[2] * 0.88];
      const baseV = this.vCount;
      for (let i = 0; i <= s; i++) {
        const a = (i / s) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const nx = ux * ca + vx * sa;
        const ny = uy * ca + vy * sa;
        const nz = uz * ca + vz * sa;
        this.pushVertex(x0 + nx * r0, y0 + ny * r0, z0 + nz * r0, nx, ny, nz, colBot[0], colBot[1], colBot[2], rough, emissive, matType);
        this.pushVertex(x1 + nx * r1, y1 + ny * r1, z1 + nz * r1, nx, ny, nz, col[0], col[1], col[2], rough, emissive, matType);
      }
      for (let i = 0; i < s; i++) {
        const b = baseV + i * 2;
        this.pushTri(b, b + 1, b + 2);
        this.pushTri(b + 2, b + 1, b + 3);
      }
      if (r1 > 0.002) {
        const topC = this.pushVertex(x1, y1, z1, ax, ay, az, col[0], col[1], col[2], rough, emissive, matType);
        const topR = this.vCount;
        for (let i = 0; i <= s; i++) {
          const a = (i / s) * Math.PI * 2;
          const ca = Math.cos(a), sa = Math.sin(a);
          const nx = ux * ca + vx * sa, ny = uy * ca + vy * sa, nz = uz * ca + vz * sa;
          this.pushVertex(x1 + nx * r1, y1 + ny * r1, z1 + nz * r1, ax, ay, az, col[0], col[1], col[2], rough, emissive, matType);
        }
        for (let i = 0; i < s; i++) {
          this.pushTri(topC, topR + i, topR + i + 1);
        }
      }
    }

    // Refined Chinese Lacquered Pillar with 3-Stage Carved Jade Drum Plinth (莲瓣柱础) & Multi-Tier Dou-Gong Capital
    addPillarWithBase(cx, baseY, cz, r, height, pillarCol, baseCol = [0.86, 0.87, 0.84], goldCol = [0.88, 0.72, 0.36]) {
      const prevCol = this.colEnabled;
      this.colEnabled = false;
      // 3-stage carved stone drum plinth (须弥方座 + 覆盆莲瓣柱础)
      this.addBox(cx, baseY + 0.14, cz, r * 3.15, 0.28, r * 3.15, 0, baseCol, 0.56, 0, 1.0);
      this.addCylinder(cx, baseY + 0.28, cz, r * 1.56, r * 1.32, 0.26, 12, baseCol, 0.52, 0, 1.0);
      this.addCylinder(cx, baseY + 0.54, cz, r * 1.26, r * 1.10, 0.16, 12, [baseCol[0] * 0.94, baseCol[1] * 0.94, baseCol[2] * 0.94], 0.50, 0, 1.0);
      // Tapered lacquered wooden column shaft (matType = 1.30 -> Canvas Wood Grain!)
      this.addCylinder(cx, baseY + 0.68, cz, r * 1.04, r * 0.92, Math.max(0.5, height - 1.22), 12, pillarCol, 0.42, 0, 1.30);
      // Golden decorative collar ring + Multi-tier Dou-Gong cap block (栌斗 + 华拱)
      this.addCylinder(cx, baseY + height - 0.64, cz, r * 1.18, r * 1.22, 0.20, 10, goldCol, 0.26, 0.08, 3.0);
      this.addBox(cx, baseY + height - 0.34, cz, r * 2.25, 0.26, r * 2.25, 0, [0.34, 0.18, 0.12], 0.55, 0, 1.30);
      this.addBox(cx, baseY + height - 0.12, cz, r * 2.85, 0.24, r * 2.85, 0, [0.42, 0.21, 0.14], 0.55, 0, 1.30);
      this.colEnabled = prevCol;
      if (this.colEnabled) {
        this.colWorld.addCylinder(cx, baseY, cz, r * 1.35, height, 'building', false);
      }
    }

    // Ornate Suspended Palace Eave Lantern (飞檐朱红宫灯 + 金饰流苏)
    addHangingLantern(x, eaveY, z, scale = 1.0, glowCol = [1.0, 0.78, 0.38]) {
      const prevCol = this.colEnabled;
      this.colEnabled = false;
      const s = scale;
      const woodRed = [0.58, 0.16, 0.12];
      const gold = [0.92, 0.76, 0.38];
      // Suspension chain from under-eave hook
      this.addCylinder(x, eaveY - 0.38 * s, z, 0.03 * s, 0.03 * s, 0.42 * s, 5, gold, 0.28, 0.05, 3.0);
      // Hexagonal palace lantern top canopy cap (宫灯华盖)
      this.addCylinder(x, eaveY - 0.54 * s, z, 0.36 * s, 0.14 * s, 0.20 * s, 6, woodRed, 0.45, 0, 1.30);
      this.addCylinder(x, eaveY - 0.58 * s, z, 0.38 * s, 0.36 * s, 0.05 * s, 6, gold, 0.26, 0.10, 3.0);
      // Glowing warm silk lantern core
      this.addCylinder(x, eaveY - 1.12 * s, z, 0.24 * s, 0.26 * s, 0.56 * s, 6, glowCol, 0.18, 2.35, 2.0);
      // Carved lower gold ring & hanging crimson tassel (流苏穗子)
      this.addCylinder(x, eaveY - 1.22 * s, z, 0.16 * s, 0.30 * s, 0.12 * s, 6, woodRed, 0.45, 0, 1.30);
      this.addCylinder(x, eaveY - 1.30 * s, z, 0.10 * s, 0.14 * s, 0.10 * s, 6, gold, 0.25, 0.12, 3.0);
      this.addCylinder(x, eaveY - 1.72 * s, z, 0.02 * s, 0.06 * s, 0.44 * s, 5, [0.86, 0.18, 0.14], 0.50, 0.35, 2.0);
      this.colEnabled = prevCol;
    }

    // Stepped Chinese Stone Stairway with Flanking Sloped Cheek-Walls & Lotus Newel Posts (垂带踏跺石阶)
    addSteppedStairway(cx, baseY, cz, width, totalH, depth, steps, rotY, stoneCol = [0.86, 0.87, 0.84], cheekCol = [0.78, 0.77, 0.72]) {
      const cY = Math.cos(rotY), sY = Math.sin(rotY);
      const xf = (x, y, z) => MeshBuilder.xformY(x, y, z, cx, baseY, cz, cY, sY);
      const stepH = totalH / steps;
      const stepD = depth / steps;
      const cheekW = Math.min(0.46, Math.max(0.28, width * 0.09));
      const innerW = Math.max(0.6, width - cheekW * 2.0);

      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const curH = (i + 1) * stepH + 0.36; // Embeds 0.36m into ground so zero gap!
        const curY = (i + 1) * stepH - curH * 0.5;
        const curZ = (0.5 - (i + 0.5) / steps) * depth;
        const p = xf(0, curY, curZ);
        this.addBox(p[0], p[1], p[2], innerW, curH, stepD * 1.12, rotY, stoneCol, 0.54, 0, 1.0);
      }

      // Flanking sloped stone cheek-walls (垂带石) & carved newel posts (望柱)
      const prevCol = this.colEnabled;
      this.colEnabled = false;
      for (const s of [-1, 1]) {
        const lx = s * (innerW * 0.5 + cheekW * 0.5);
        for (let i = 0; i < steps; i++) {
          const h1 = (i + 1) * stepH + 0.24;
          const cy = h1 * 0.5 - 0.12;
          const czStep = (0.5 - (i + 0.5) / steps) * depth;
          const cp = xf(lx, cy, czStep);
          this.addBox(cp[0], cp[1], cp[2], cheekW, h1 + 0.24, stepD * 1.08, rotY, cheekCol, 0.52, 0, 1.0);
        }
        // Bottom & top lotus-capped newel posts (台阶望柱)
        const botP = xf(lx, 0.42, depth * 0.5 - stepD * 0.35);
        this.addBox(botP[0], botP[1], botP[2], cheekW * 1.18, 0.92, cheekW * 1.18, rotY, stoneCol, 0.50, 0, 1.0);
        this.addCylinder(botP[0], botP[1] + 0.46, botP[2], cheekW * 0.52, cheekW * 0.18, 0.28, 6, stoneCol, 0.48, 0, 1.0);
      }
      this.colEnabled = prevCol;
    }

    // Carved Chinese Lattice Window / Door with wooden mullions (雕花窗棂)
    addLatticeWindow(cx, cy, cz, w, h, rotY, frameCol, glowCol, glowAmt = 1.3) {
      const prevCol = this.colEnabled;
      this.colEnabled = false;
      const cY = Math.cos(rotY), sY = Math.sin(rotY);
      const xf = (x, y, z) => MeshBuilder.xformY(x, y, z, cx, cy, cz, cY, sY);
      // Glowing paper pane
      this.addBox(cx, cy, cz, w, h, 0.16, rotY, glowCol, 0.22, glowAmt, 2.0);
      // Outer wooden frame (top, bottom, left, right) -> matType = 1.30 (Wood Grain)
      const t = 0.18;
      this.addBox(...xf(0,  h * 0.5, 0.08), w + t, t, 0.24, rotY, frameCol, 0.48, 0, 1.30);
      this.addBox(...xf(0, -h * 0.5, 0.08), w + t, t, 0.24, rotY, frameCol, 0.48, 0, 1.30);
      this.addBox(...xf(-w * 0.5, 0, 0.08), t, h, 0.24, rotY, frameCol, 0.48, 0, 1.30);
      this.addBox(...xf( w * 0.5, 0, 0.08), t, h, 0.24, rotY, frameCol, 0.48, 0, 1.30);
      // Inner vertical & horizontal lattice mullions
      const cols = Math.max(2, Math.round(w / 1.1));
      const rows = Math.max(2, Math.round(h / 1.15));
      for (let i = 1; i < cols; i++) {
        const lx = (-0.5 + i / cols) * w;
        this.addBox(...xf(lx, 0, 0.10), 0.10, h, 0.12, rotY, frameCol, 0.48, 0, 1.30);
      }
      for (let j = 1; j < rows; j++) {
        const ly = (-0.5 + j / rows) * h;
        this.addBox(...xf(0, ly, 0.10), w, 0.10, 0.12, rotY, frameCol, 0.48, 0, 1.30);
      }
      this.colEnabled = prevCol;
    }

    // Carved White-Jade Balustrade with lotus-capped posts & open-work rails (雕栏玉砌 + 望柱 + 寻杖华板)
    addCarvedBalustrade(ax, ay, az, bx, by, bz, height = 1.15, stoneCol = [0.86, 0.87, 0.84]) {
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 0.5) return;
      const rotY = Math.atan2(dx, dz);
      const mx = (ax + bx) * 0.5, my = (ay + by) * 0.5, mz = (az + bz) * 0.5;

      const prevCol = this.colEnabled;
      this.colEnabled = false;
      // Lower stone curb (地栿) + middle carved panel (华板) + upper open rail (寻杖)
      this.addBox(mx, my + 0.16, mz, 0.44, 0.32, len, rotY, stoneCol, 0.58, 0, 1.0);
      this.addBox(mx, my + height * 0.50, mz, 0.18, height * 0.44, len, rotY, [stoneCol[0] * 0.92, stoneCol[1] * 0.92, stoneCol[2] * 0.92], 0.60, 0, 1.0);
      this.addBox(mx, my + height * 0.82, mz, 0.28, 0.10, len, rotY, stoneCol, 0.54, 0, 1.0);
      this.addBox(mx, my + height, mz, 0.36, 0.16, len, rotY, stoneCol, 0.50, 0, 1.0);

      const postCount = Math.max(2, Math.round(len / 3.2) + 1);
      for (let i = 0; i < postCount; i++) {
        const t = i / (postCount - 1);
        const px = M.lerp(ax, bx, t), py = M.lerp(ay, by, t), pz = M.lerp(az, bz, t);
        this.addBox(px, py + height * 0.62, pz, 0.40, height * 1.24, 0.40, rotY, stoneCol, 0.52, 0, 1.0);
        // Sculpted lotus neck + bud finial atop every balustrade post (望柱云头莲瓣)
        this.addBox(px, py + height * 1.22, pz, 0.46, 0.10, 0.46, rotY, stoneCol, 0.50, 0, 1.0);
        this.addCylinder(px, py + height * 1.26, pz, 0.22, 0.07, 0.36, 6, stoneCol, 0.48, 0, 1.0);
      }
      this.colEnabled = prevCol;
      if (this.colEnabled) {
        this.colWorld.addBox(mx, my + height * 0.6, mz, 0.52, height * 1.35, len, rotY, 'building', false);
      }
    }

    // Seamless 3D Tapered Tube connecting p0 -> p1 (gnarled trunks & branches)
    addTaperedTube(p0, p1, r0, r1, segs, col, rough = 0.82, emissive = 0.0, matType = 1.0) {
      let dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
      const len = Math.hypot(dx, dy, dz);
      if (len < 1e-4) return;
      dx /= len; dy /= len; dz /= len;

      const refX = Math.abs(dy) < 0.92 ? 0 : 1;
      const refY = Math.abs(dy) < 0.92 ? 1 : 0;
      const refZ = 0;
      let ux = dy * refZ - dz * refY;
      let uy = dz * refX - dx * refZ;
      let uz = dx * refY - dy * refX;
      const uLen = Math.hypot(ux, uy, uz) || 1;
      ux /= uLen; uy /= uLen; uz /= uLen;

      const vx = dy * uz - dz * uy;
      const vy = dz * ux - dx * uz;
      const vz = dx * uy - dy * ux;

      const baseIdx = this.vCount;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const nx = ux * ca + vx * sa;
        const ny = uy * ca + vy * sa;
        const nz = uz * ca + vz * sa;
        this.pushVertex(p0[0] + nx * r0, p0[1] + ny * r0, p0[2] + nz * r0, nx, ny, nz, col[0], col[1], col[2], rough, emissive, matType);
        this.pushVertex(p1[0] + nx * r1, p1[1] + ny * r1, p1[2] + nz * r1, nx, ny, nz, col[0], col[1], col[2], rough, emissive, matType);
      }
      for (let i = 0; i < segs; i++) {
        const a = baseIdx + i * 2;
        // Outward-facing CCW winding (v_theta x +d = +N_outward)
        this.pushTri(a, a + 2, a + 1);
        this.pushTri(a + 2, a + 3, a + 1);
      }
    }

    // Continuous Parallel-Transport Multi-Segment Tapered Tube Chain (zero joint cracks, zero twist, outward CCW!)
    addTubeChain(points, radii, segs, col, rough = 0.84, emissive = 0.0, matType = 1.30, capEnd = true) {
      const n = points.length;
      if (n < 2) return;

      // Compute smooth vertex tangents
      const tangs = [];
      for (let k = 0; k < n; k++) {
        const pPrev = points[Math.max(0, k - 1)];
        const pNext = points[Math.min(n - 1, k + 1)];
        let dx = pNext[0] - pPrev[0], dy = pNext[1] - pPrev[1], dz = pNext[2] - pPrev[2];
        const len = Math.hypot(dx, dy, dz) || 1;
        tangs.push([dx / len, dy / len, dz / len]);
      }

      // Build parallel-transported orthonormal frames (u, v, t) so adjacent rings never twist or pinch
      const t0 = tangs[0];
      const refX = Math.abs(t0[1]) < 0.92 ? 0 : 1;
      const refY = Math.abs(t0[1]) < 0.92 ? 1 : 0;
      const refZ = 0;
      let ux = t0[1] * refZ - t0[2] * refY;
      let uy = t0[2] * refX - t0[0] * refZ;
      let uz = t0[0] * refY - t0[1] * refX;
      let uLen = Math.hypot(ux, uy, uz) || 1;
      ux /= uLen; uy /= uLen; uz /= uLen;

      const stride = segs + 1;
      const baseIdx = this.vCount;

      for (let k = 0; k < n; k++) {
        const t = tangs[k];
        if (k > 0) {
          // Project previous u orthogonal to current tangent t (Gram-Schmidt parallel transport)
          const dot = ux * t[0] + uy * t[1] + uz * t[2];
          ux -= t[0] * dot;
          uy -= t[1] * dot;
          uz -= t[2] * dot;
          uLen = Math.hypot(ux, uy, uz);
          if (uLen > 1e-4) {
            ux /= uLen; uy /= uLen; uz /= uLen;
          } else {
            const rx = Math.abs(t[1]) < 0.92 ? 0 : 1;
            const ry = Math.abs(t[1]) < 0.92 ? 1 : 0;
            ux = -t[2] * ry; uy = t[2] * rx; uz = t[0] * ry - t[1] * rx;
            uLen = Math.hypot(ux, uy, uz) || 1;
            ux /= uLen; uy /= uLen; uz /= uLen;
          }
        }
        // v = t x u -> (u, v, t) is guaranteed right-handed (u x v = +t)
        const vx = t[1] * uz - t[2] * uy;
        const vy = t[2] * ux - t[0] * uz;
        const vz = t[0] * uy - t[1] * ux;

        const p = points[k];
        const r = radii[k];
        const c = Array.isArray(col[0]) ? col[k] : col;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          const ca = Math.cos(a), sa = Math.sin(a);
          const nx = ux * ca + vx * sa;
          const ny = uy * ca + vy * sa;
          const nz = uz * ca + vz * sa;
          this.pushVertex(p[0] + nx * r, p[1] + ny * r, p[2] + nz * r, nx, ny, nz, c[0], c[1], c[2], rough, emissive, matType);
        }
      }

      for (let k = 0; k < n - 1; k++) {
        const row0 = baseIdx + k * stride;
        const row1 = row0 + stride;
        for (let i = 0; i < segs; i++) {
          // Outward-facing CCW winding (along +theta x +tangent = +normal)
          this.pushTri(row0 + i, row0 + i + 1, row1 + i);
          this.pushTri(row0 + i + 1, row1 + i + 1, row1 + i);
        }
      }

      if (capEnd && radii[n - 1] > 0.02) {
        const tipP = points[n - 1];
        const tipT = tangs[n - 1];
        const c = Array.isArray(col[0]) ? col[n - 1] : col;
        const tipCenter = this.pushVertex(tipP[0], tipP[1], tipP[2], tipT[0], tipT[1], tipT[2], c[0], c[1], c[2], rough, emissive, matType);
        const lastRow = baseIdx + (n - 1) * stride;
        for (let i = 0; i < segs; i++) {
          this.pushTri(tipCenter, lastRow + i, lastRow + i + 1);
        }
      }
    }

    // Refined Chinese Curved Hip-and-Gable Roof with 3D Tile Ribs, Dou-Gong Brackets & Sweeping Flying Eaves!
    addCurvedRoof(cx, cy, cz, width, depth, height, rotY, flare, upturned, roofCol, ridgeCol, eavesCol) {
      const cY = Math.cos(rotY), sY = Math.sin(rotY);
      const xf = (x, y, z) => MeshBuilder.xformY(x, y, z, cx, cy, cz, cY, sY);

      const hw = width * 0.5;
      const hd = depth * 0.5;
      const ridgeHalfW = Math.max(0.25, hw - hd * 0.56);
      const segU = 14;
      const segV = 8;

      const evalPoint = (side, u, v) => {
        const cornerness = Math.pow(Math.abs(u), 2.7) * Math.pow(v, 2.2);
        const sag = Math.pow(1.0 - v, 1.58);
        const eaveLift = upturned * cornerness + upturned * 0.14 * Math.pow(v, 3.0);
        const y = height * sag + eaveLift;
        const flareOut = 1.0 + flare * Math.pow(v, 2.2) * (0.45 + 0.55 * Math.pow(Math.abs(u), 2.0));

        let lx = 0, lz = 0;
        if (side === 0 || side === 1) {
          const sign = side === 0 ? 1 : -1;
          const halfSpanX = M.lerp(ridgeHalfW, hw, v) * flareOut;
          lx = u * halfSpanX;
          lz = sign * (hd * v * flareOut);
        } else {
          const sign = side === 2 ? 1 : -1;
          const halfSpanZ = (hd * v) * flareOut;
          lz = u * halfSpanZ;
          lx = sign * M.lerp(ridgeHalfW, hw, v) * flareOut;
        }
        return [lx, y, lz];
      };

      for (let side = 0; side < 4; side++) {
        const grid = [];
        for (let iv = 0; iv <= segV; iv++) {
          const v = iv / segV;
          const row = [];
          for (let iu = 0; iu <= segU; iu++) {
            const u = -1 + (2 * iu) / segU;
            const p = evalPoint(side, u, v);
            // Subtle 3D corrugated glazed tile rib undulation (瓦垄)!
            const ribLift = (iu % 2 === 0 ? 0.11 : -0.04) * Math.sin(v * Math.PI);
            row.push(xf(p[0], p[1] + ribLift, p[2]));
          }
          grid.push(row);
        }

        for (let iv = 0; iv < segV; iv++) {
          for (let iu = 0; iu < segU; iu++) {
            const p00 = grid[iv][iu];
            const p10 = grid[iv][iu + 1];
            const p11 = grid[iv + 1][iu + 1];
            const p01 = grid[iv + 1][iu];

            const rib = (iu % 2 === 0) ? 1.07 : 0.90;
            const eaveTrim = iv === segV - 1;
            const c = eaveTrim
              ? [M.lerp(roofCol[0], eavesCol[0], 0.52), M.lerp(roofCol[1], eavesCol[1], 0.52), M.lerp(roofCol[2], eavesCol[2], 0.52)]
              : [roofCol[0] * rib, roofCol[1] * rib, roofCol[2] * rib];

            if (side === 0 || side === 3) {
              this.addFlatQuad(p00, p01, p11, p10, c, 0.30, 0.0, 1.15);
              this.addFlatQuad(p00, p10, p11, p01, [0.30, 0.15, 0.10], 0.68, 0.0, 1.30);
            } else {
              this.addFlatQuad(p00, p10, p11, p01, c, 0.30, 0.0, 1.15);
              this.addFlatQuad(p00, p01, p11, p10, [0.30, 0.15, 0.10], 0.68, 0.0, 1.30);
            }
          }
        }
      }

      const prevCol = this.colEnabled;
      this.colEnabled = false;

      // Multi-Tier Dou-Gong Wooden Bracket Clusters (重昂斗拱) & Under-Eave Flying Rafters (檐下飞椽)!
      const dgY = -0.35;
      const dgStep = 2.2;
      const countX = Math.max(2, Math.floor((width * 0.76) / dgStep));
      for (let i = 0; i <= countX; i++) {
        const lx = (-0.5 + i / countX) * width * 0.76;
        for (const sz of [-1, 1]) {
          this.addBox(...xf(lx, dgY - 0.12, sz * hd * 0.70), 0.38, 0.42, 0.64, rotY, [0.36, 0.18, 0.12], 0.56, 0, 1.30);
          this.addBox(...xf(lx, dgY + 0.18, sz * hd * 0.76), 0.54, 0.28, 0.92, rotY, [0.48, 0.23, 0.15], 0.52, 0, 1.30);
          this.addBox(...xf(lx, dgY + 0.32, sz * hd * 0.88), 0.20, 0.16, 0.86, rotY, [0.58, 0.26, 0.16], 0.48, 0, 1.30);
        }
      }

      // Main Top Ridge (正脊) + Sculpted Upturned Chiwen Dragon Finials (吞脊鸱吻)
      this.addBox(cx, cy + height + 0.30, cz, ridgeHalfW * 2.0 + 0.8, 0.66, 0.58, rotY, ridgeCol, 0.26, 0.08, 3.0);
      this.addBox(cx, cy + height + 0.68, cz, ridgeHalfW * 1.92, 0.22, 0.28, rotY, ridgeCol, 0.24, 0.10, 3.0);
      for (const s of [-1, 1]) {
        this.addBox(...xf(s * (ridgeHalfW + 0.32), height + 0.92, 0), 0.56, 1.18, 0.48, rotY, ridgeCol, 0.24, 0.12, 3.0);
        this.addBox(...xf(s * (ridgeHalfW + 0.68), height + 1.50, 0), 0.44, 0.74, 0.36, rotY, ridgeCol, 0.22, 0.14, 3.0);
        this.addBox(...xf(s * (ridgeHalfW + 0.94), height + 1.92, 0), 0.28, 0.48, 0.26, rotY, ridgeCol, 0.20, 0.18, 3.0);
      }

      // Sweeping Golden Corner Ridges (戗脊), Sculpted Ridge Beasts (走兽) & Suspended Eave Lanterns (飞檐挂灯)
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          for (let iv = 0; iv < segV; iv++) {
            const v0 = iv / segV;
            const v1 = (iv + 1) / segV;
            const p0 = evalPoint(sz > 0 ? 0 : 1, sx, v0);
            const p1 = evalPoint(sz > 0 ? 0 : 1, sx, v1);
            const w0 = xf(p0[0], p0[1] + 0.16, p0[2]);
            const w1 = xf(p1[0], p1[1] + 0.18, p1[2]);
            this.addTaperedTube(w0, w1, 0.18, 0.15, 5, ridgeCol, 0.24, 0.06, 3.0);
            // Sculpted ridge beasts (仙人走兽) near the upturned corner tip
            if (iv >= segV - 3) {
              const bm = xf((p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5 + 0.42, (p0[2] + p1[2]) * 0.5);
              this.addBox(bm[0], bm[1], bm[2], 0.22, 0.38, 0.22, rotY + 0.78, ridgeCol, 0.22, 0.12, 3.0);
            }
          }
          const tip = evalPoint(sz > 0 ? 0 : 1, sx, 0.99);
          const wt = xf(tip[0], tip[1] + 0.32, tip[2]);
          const tipOut = xf(tip[0] * 1.04, tip[1] + 0.78, tip[2] * 1.04);
          this.addTaperedTube(wt, tipOut, 0.18, 0.05, 5, ridgeCol, 0.20, 0.16, 3.0);

          // Hang ornate palace lanterns beneath the 4 upturned flying eave corners!
          if (width >= 6.5) {
            const lanHook = xf(tip[0] * 0.93, tip[1] - 0.06, tip[2] * 0.93);
            const lanScale = Math.min(1.25, Math.max(0.72, width * 0.042));
            this.addHangingLantern(lanHook[0], lanHook[1], lanHook[2], lanScale);
          }
        }
      }
      this.colEnabled = prevCol;
      if (this.colEnabled) {
        this.colWorld.addBox(cx, cy + height * 0.48, cz, width * 1.02, height * 0.96, depth * 1.02, rotY, 'building', true);
      }
    }

    // Refined Polygonal Pavilion / Pagoda Roof with Tile Ribs, Sweeping Corner Ridges, Rafters & Hanging Lanterns
    addPagodaRoof(cx, cy, cz, radius, height, sides, flare, upturned, roofCol, ridgeCol) {
      const prevCol = this.colEnabled;
      this.colEnabled = false;
      const segV = 8;
      const segU = 6;

      const evalCorner = (cornerIdx, v) => {
        const a = (cornerIdx / sides) * Math.PI * 2 + Math.PI / sides;
        const flareOut = 1.0 + flare * Math.pow(v, 2.2);
        const r = Math.max(0.06, radius * v * flareOut);
        const y = height * Math.pow(1.0 - v, 1.62) + upturned * Math.pow(v, 2.8);
        return [cx + Math.cos(a) * r, cy + y, cz + Math.sin(a) * r];
      };

      for (let s = 0; s < sides; s++) {
        const grid = [];
        for (let iv = 0; iv <= segV; iv++) {
          const v = iv / segV;
          const cA = evalCorner(s, v);
          const cB = evalCorner((s + 1) % sides, v);
          const row = [];
          for (let iu = 0; iu <= segU; iu++) {
            const u = iu / segU;
            const edgeFactor = Math.sin(u * Math.PI);
            const dipY = -upturned * 0.42 * edgeFactor * Math.pow(v, 2.4);
            const ribLift = (iu % 2 === 0 ? 0.08 : -0.02) * Math.sin(v * Math.PI) * Math.min(1, radius * 0.14);
            row.push([
              M.lerp(cA[0], cB[0], u),
              M.lerp(cA[1], cB[1], u) + dipY + ribLift,
              M.lerp(cA[2], cB[2], u),
            ]);
          }
          grid.push(row);
        }

        for (let iv = 0; iv < segV; iv++) {
          for (let iu = 0; iu < segU; iu++) {
            const p00 = grid[iv][iu];
            const p10 = grid[iv][iu + 1];
            const p11 = grid[iv + 1][iu + 1];
            const p01 = grid[iv + 1][iu];
            const shade = (iu % 2 === 0) ? 1.06 : 0.91;
            const c = [roofCol[0] * shade, roofCol[1] * shade, roofCol[2] * shade];
            this.addFlatQuad(p00, p01, p11, p10, c, 0.30, 0.0, 1.15);
            this.addFlatQuad(p00, p10, p11, p01, [0.30, 0.15, 0.10], 0.68, 0.0, 1.30);
          }
        }

        // Smooth 3D Golden Corner Rib + Upturned Horn Tip + Under-Eave Hanging Lanterns!
        if (radius > 2.2) {
          for (let iv = 0; iv < segV; iv++) {
            const p0 = evalCorner(s, iv / segV);
            const p1 = evalCorner(s, (iv + 1) / segV);
            this.addTaperedTube(
              [p0[0], p0[1] + 0.10, p0[2]],
              [p1[0], p1[1] + 0.10, p1[2]],
              0.14, 0.12, 5, ridgeCol, 0.24, 0.05, 3.0
            );
          }
          const tip = evalCorner(s, 0.99);
          const a = (s / sides) * Math.PI * 2 + Math.PI / sides;
          const finScale = Math.min(1.1, radius * 0.15);
          this.addTaperedTube(
            [tip[0], tip[1] + 0.10, tip[2]],
            [tip[0] + Math.cos(a) * 0.42 * finScale, tip[1] + 0.68 * finScale, tip[2] + Math.sin(a) * 0.42 * finScale],
            0.14 * finScale, 0.04 * finScale, 5, ridgeCol, 0.20, 0.16, 3.0
          );
          // Radial wooden flying eave rafter (角梁飞椽) beneath each corner
          const rafIn = evalCorner(s, 0.66);
          this.addTaperedTube(
            [rafIn[0], rafIn[1] - 0.14, rafIn[2]],
            [tip[0], tip[1] - 0.06, tip[2]],
            0.15 * finScale, 0.11 * finScale, 5, [0.46, 0.22, 0.14], 0.52, 0, 1.30
          );
          // Hang glowing palace eave lanterns beneath pavilion & pagoda corners!
          if (radius >= 4.2 && (sides <= 6 || s % 2 === 0)) {
            const hook = evalCorner(s, 0.92);
            const lanSc = Math.min(0.95, Math.max(0.56, radius * 0.085));
            this.addHangingLantern(hook[0], hook[1] - 0.08, hook[2], lanSc);
          }
        }
      }

      // Sculpted Multi-Tier Lotus Spire Finial (莲花宝顶)
      this.addCylinder(cx, cy + height - 0.12, cz, 0.82 * Math.min(1.2, radius * 0.12), 0.42 * Math.min(1.2, radius * 0.12), 0.65, 10, ridgeCol, 0.22, 0.15, 3.0);
      this.addCylinder(cx, cy + height + 0.52, cz, 0.48 * Math.min(1.2, radius * 0.12), 0.18 * Math.min(1.2, radius * 0.12), 0.72, 10, ridgeCol, 0.20, 0.22, 3.0);
      this.addCylinder(cx, cy + height + 1.20, cz, 0.22 * Math.min(1.2, radius * 0.12), 0.04, 1.35 * Math.min(1.2, radius * 0.12), 8, ridgeCol, 0.18, 0.30, 3.0);

      this.colEnabled = prevCol;
      if (this.colEnabled && radius > 1.5) {
        this.colWorld.addCylinder(cx, cy + 0.15, cz, radius * 0.96, height * 0.95, 'building', true);
      }
    }

    // Faceted Hexagonal Glowing Spirit Crystal Spire
    addCrystalSpire(cx, cy, cz, radius, height, rx, ry, rz, col, emissive = 1.65) {
      const sides = 6;
      const bodyH = height * 0.72;
      const xf = (x, y, z) => MeshBuilder.xformEuler(x, y, z, cx, cy, cz, rx, ry, rz);

      const bot = [];
      const mid = [];
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        bot.push(xf(ca * radius, 0, sa * radius));
        mid.push(xf(ca * radius * 0.86, bodyH, sa * radius * 0.86));
      }
      const apex = xf(0, height, 0);

      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides;
        const tint = 0.88 + 0.22 * ((i % 2) ? 1 : 0.4);
        const c = [col[0] * tint, col[1] * tint, col[2] * tint];
        this.addFlatQuad(bot[i], bot[j], mid[j], mid[i], c, 0.18, emissive * 0.85, 2.0);
        this.addFlatTri(mid[i], mid[j], apex, [col[0] * 1.12, col[1] * 1.12, col[2] * 1.12], 0.14, emissive * 1.18, 2.0);
      }

      if (this.colEnabled && height >= 1.6 && radius >= 0.4) {
        const minY = Math.min(cy, apex[1]);
        const maxY = Math.max(cy, apex[1]);
        const midP = xf(0, height * 0.45, 0);
        this.colWorld.addCylinder(midP[0], minY, midP[2], radius * 1.05, Math.max(0.5, maxY - minY), 'crystal', false);
      }
    }

    // Refined Ancient Immortal Sword (Multi-bevelled blade, glowing rune fuller, cloud-scroll guard, ribbed hilt!)
    addAncientSword(cx, cy, cz, scale, rx, ry, rz, isColossal = false) {
      const prevCol = this.colEnabled;
      this.colEnabled = false;
      const xf = (x, y, z) => MeshBuilder.xformEuler(x * scale, y * scale, z * scale, cx, cy, cz, rx, ry, rz);

      const bladeCol = isColossal ? [0.45, 0.53, 0.60] : [0.36, 0.42, 0.48];
      const edgeCol = isColossal ? [0.72, 0.80, 0.86] : [0.56, 0.62, 0.68];
      const guardCol = isColossal ? [0.80, 0.66, 0.36] : [0.58, 0.48, 0.30];
      const bronzeDark = [0.46, 0.38, 0.22];
      const gripCol = [0.22, 0.18, 0.24];
      const runeCol = [0.36, 0.96, 1.0];
      const runeGlow = isColossal ? 2.5 : 1.0;

      const segs = isColossal ? 12 : 4;
      const yStart = -0.32;
      const yGuard = 0.66;

      const bladeRing = (t) => {
        const y = M.lerp(yStart, yGuard, t);
        const w = (0.014 + 0.056 * Math.pow(t, 0.55)) * (0.94 + 0.12 * Math.sin(t * Math.PI));
        const innerW = w * 0.34;
        const thick = (0.008 + 0.018 * t);
        return {
          left:  xf(-w, y, 0),
          right: xf( w, y, 0),
          fL:    xf(-innerW, y,  thick),
          fR:    xf( innerW, y,  thick),
          bL:    xf(-innerW, y, -thick),
          bR:    xf( innerW, y, -thick),
        };
      };

      let prev = bladeRing(0);
      for (let i = 1; i <= segs; i++) {
        const cur = bladeRing(i / segs);
        // Hexagonal bevelled sword cross-section (sharp razor edges + crisp central flat fuller!)
        this.addFlatQuad(prev.left,  prev.fL,    cur.fL,    cur.left,  edgeCol,  0.24, 0.0, 3.0);
        this.addFlatQuad(prev.fL,    prev.fR,    cur.fR,    cur.fL,    bladeCol, 0.32, 0.0, 3.0);
        this.addFlatQuad(prev.fR,    prev.right, cur.right, cur.fR,    edgeCol,  0.24, 0.0, 3.0);
        this.addFlatQuad(prev.right, prev.bR,    cur.bR,    cur.right, edgeCol,  0.24, 0.0, 3.0);
        this.addFlatQuad(prev.bR,    prev.bL,    cur.bL,    cur.bR,    bladeCol, 0.32, 0.0, 3.0);
        this.addFlatQuad(prev.bL,    prev.left,  cur.left,  cur.bL,    edgeCol,  0.24, 0.0, 3.0);
        prev = cur;
      }

      // Luminous Engraved Ancient Rune Channel along both sides of the colossal blade!
      if (isColossal) {
        for (let i = 0; i < 8; i++) {
          const y0 = -0.02 + i * 0.08;
          const y1 = y0 + 0.052;
          const wR = 0.010;
          const zO = 0.022 + (i / 8) * 0.005;
          this.addFlatQuad(xf(-wR, y0, zO), xf(wR, y0, zO), xf(wR, y1, zO), xf(-wR, y1, zO), runeCol, 0.14, runeGlow, 2.0);
          this.addFlatQuad(xf(wR, y0, -zO), xf(-wR, y0, -zO), xf(-wR, y1, -zO), xf(wR, y1, -zO), runeCol, 0.14, runeGlow, 2.0);
        }
      }

      // Swept Winged Cloud-Scroll Crossguard (云纹双翼剑格)
      const gPts = [
        { x: -0.25, y: 0.74, w: 0.018, h: 0.016 },
        { x: -0.17, y: 0.67, w: 0.030, h: 0.032 },
        { x: -0.09, y: 0.64, w: 0.040, h: 0.048 },
        { x:  0.00, y: 0.67, w: 0.052, h: 0.064 },
        { x:  0.09, y: 0.64, w: 0.040, h: 0.048 },
        { x:  0.17, y: 0.67, w: 0.030, h: 0.032 },
        { x:  0.25, y: 0.74, w: 0.018, h: 0.016 },
      ];
      for (let i = 0; i < gPts.length - 1; i++) {
        const a = gPts[i], b = gPts[i + 1];
        const aTF = xf(a.x, a.y + a.h * 0.5, a.w), aBF = xf(a.x, a.y - a.h * 0.5, a.w);
        const bTF = xf(b.x, b.y + b.h * 0.5, b.w), bBF = xf(b.x, b.y - b.h * 0.5, b.w);
        const aTB = xf(a.x, a.y + a.h * 0.5, -a.w), aBB = xf(a.x, a.y - a.h * 0.5, -a.w);
        const bTB = xf(b.x, b.y + b.h * 0.5, -b.w), bBB = xf(b.x, b.y - b.h * 0.5, -b.w);

        this.addFlatQuad(aBF, bBF, bTF, aTF, guardCol, 0.28, 0.05, 3.0);
        this.addFlatQuad(bBB, aBB, aTB, bTB, guardCol, 0.28, 0.05, 3.0);
        this.addFlatQuad(aTF, bTF, bTB, aTB, guardCol, 0.22, 0.08, 3.0);
        this.addFlatQuad(aBB, bBB, bBF, aBF, bronzeDark, 0.35, 0.0, 3.0);
      }

      if (isColossal) {
        // Faceted glowing cyan Spirit Core Gem in crossguard heart
        this.addBoxEuler(...xf(0, 0.67, 0), 0.048 * scale, 0.072 * scale, 0.12 * scale, rx, ry, rz, runeCol, 0.12, 2.8, 2.0);
        // Decorative bronze ribbed grip bands
        for (let r = 0; r < 5; r++) {
          this.addBoxEuler(...xf(0, 0.73 + r * 0.046, 0), 0.048 * scale, 0.016 * scale, 0.048 * scale, rx, ry, rz, guardCol, 0.28, 0.05, 3.0);
        }
      }

      this.addBoxEuler(...xf(0, 0.82, 0), 0.040 * scale, 0.26 * scale, 0.040 * scale, rx, ry, rz, gripCol, 0.72, 0.0, 1.0);
      this.addBoxEuler(...xf(0, 0.96, 0), 0.074 * scale, 0.068 * scale, 0.074 * scale, rx, ry, rz, guardCol, 0.24, isColossal ? 0.35 : 0.0, 3.0);
      if (isColossal) {
        this.addBoxEuler(...xf(0, 1.015, 0), 0.042 * scale, 0.046 * scale, 0.042 * scale, rx, ry, rz, runeCol, 0.14, 2.1, 2.0);
      }

      this.colEnabled = prevCol;
      if (this.colEnabled) {
        if (isColossal) {
          for (let i = 0; i < 8; i++) {
            const p = xf(0, -0.15 + i * 0.125, 0);
            this.colWorld.addCylinder(p[0], p[1] - 5.0, p[2], 3.8, 11.0, 'building', false);
          }
          const gp = xf(0, 0.67, 0);
          this.colWorld.addBox(gp[0], gp[1], gp[2], 0.48 * scale, 5.2, 6.2, ry, 'building', true);
        } else {
          const baseP = xf(0, 0.28, 0);
          this.colWorld.addCylinder(baseP[0], baseP[1] - scale * 0.45, baseP[2], Math.max(0.35, scale * 0.08), scale * 0.85, 'building', false);
        }
      }
    }

    // Floating Immortal Island Sculpted Rock Mass + Lush Meadow Cap + Spirit Core Crystal
    addFloatingIsland(isl) {
      const rings = 14;
      const segs = 32;
      const grid = [];

      for (let ir = 0; ir <= rings; ir++) {
        const v = ir / rings;
        const row = [];
        for (let is = 0; is <= segs; is++) {
          const a = (is / segs) * Math.PI * 2;
          const ca = Math.cos(a), sa = Math.sin(a);
          const angNoise = N.fbm2D(ca * 1.9 + isl.x * 0.05, sa * 1.9 + isl.z * 0.05, 3);
          const jagged = 0.82 + 0.34 * angNoise;

          let rScale, yOff;
          if (v <= 0.38) {
            const tTop = v / 0.38;
            rScale = tTop * (0.94 + 0.10 * angNoise);
            yOff = (1 - M.smoothstep(0.55, 1.0, tTop)) * 2.6 + N.fbm2D((isl.x + ca * isl.rx * rScale) * 0.05, (isl.z + sa * isl.rz * rScale) * 0.05, 2) * 0.85 * (1 - tTop * 0.4);
          } else {
            const tBot = (v - 0.38) / 0.62;
            const crag = N.fbm2D(ca * 3.1 + tBot * 2.5 + isl.x * 0.03, sa * 3.1 - tBot * 2.2 + isl.z * 0.03, 3);
            rScale = Math.pow(1.0 - tBot, 0.78) * jagged * (1.02 + 0.26 * crag * Math.sin(tBot * Math.PI));
            const ledge = Math.sin(tBot * Math.PI * 4.0) * 0.06 * (1 - tBot);
            rScale = Math.max(0.015, rScale + ledge);
            yOff = -Math.pow(tBot, 1.18) * isl.depth + crag * 3.4 * (1 - tBot);
          }

          row.push({
            pos: [isl.x + ca * isl.rx * rScale, isl.y + yOff, isl.z + sa * isl.rz * rScale],
            v,
            angNoise,
          });
        }
        grid.push(row);
      }

      for (let ir = 0; ir < rings; ir++) {
        for (let is = 0; is < segs; is++) {
          const p00 = grid[ir][is];
          const p10 = grid[ir][is + 1];
          const p11 = grid[ir + 1][is + 1];
          const p01 = grid[ir + 1][is];

          let col, rough = 0.72, emissive = 0.0, matType = 1.0;
          if (p00.v < 0.37) {
            const gVar = 0.92 + 0.14 * p00.angNoise;
            col = [0.24 * gVar, 0.52 * gVar, 0.24 * gVar];
            rough = 0.78;
            matType = 0.0;
          } else if (p00.v > 0.82) {
            const tipT = M.smoothstep(0.80, 0.96, p00.v);
            col = [0.28, M.lerp(0.36, 0.92, tipT), M.lerp(0.42, 0.96, tipT)];
            emissive = tipT * 1.95;
            rough = M.lerp(0.68, 0.22, tipT);
            matType = tipT > 0.4 ? 2.0 : 1.0;
          } else {
            const strata = 0.5 + 0.5 * Math.sin(p00.pos[1] * 0.45);
            col = [M.lerp(0.30, 0.46, strata), M.lerp(0.35, 0.49, strata), M.lerp(0.41, 0.53, strata)];
            rough = 0.76;
          }
          this.addFlatQuad(p00.pos, p10.pos, p11.pos, p01.pos, col, rough, emissive, matType);
        }
      }

      this.addCrystalSpire(
        isl.x, isl.y - isl.depth + 2.5, isl.z,
        Math.max(1.6, isl.rx * 0.075), Math.max(6.0, isl.depth * 0.22),
        Math.PI, 0.3, 0,
        [0.28, 0.94, 0.96], 2.3
      );

      if (this.colWorld) {
        this.colWorld.addFloatingIsland(isl);
      }
    }

    // Refined Single-Arch or Multi-Arch Chinese Stone Bridge (单孔/三孔/多孔石拱桥) with sculpted balustrades & stone piers!
    addArchedBridge(cx, baseY, cz, length, width, archHeight, rotY, arches = 1) {
      const prevCol = this.colEnabled;
      this.colEnabled = false;
      const cY = Math.cos(rotY), sY = Math.sin(rotY);
      const xf = (x, y, z) => MeshBuilder.xformY(x, y, z, cx, baseY, cz, cY, sY);
      const segs = Math.max(18, arches * 10);
      const hw = width * 0.5;
      const stoneCol = [0.76, 0.76, 0.72];
      const darkStone = [0.54, 0.56, 0.55];
      const trimCol = [0.86, 0.85, 0.80];

      for (let i = 0; i < segs; i++) {
        const t0 = i / segs;
        const t1 = (i + 1) / segs;
        const z0 = (t0 - 0.5) * length;
        const z1 = (t1 - 0.5) * length;
        const y0 = Math.sin(t0 * Math.PI) * archHeight;
        const y1 = Math.sin(t1 * Math.PI) * archHeight;

        // Multi-arch scalloped underside vault!
        const a0 = Math.abs(Math.sin(t0 * Math.PI * arches));
        const a1 = Math.abs(Math.sin(t1 * Math.PI * arches));
        const thick0 = 1.0 + (1.0 - a0) * 3.8;
        const thick1 = 1.0 + (1.0 - a1) * 3.8;

        this.addFlatQuad(xf(-hw, y0, z0), xf(hw, y0, z0), xf(hw, y1, z1), xf(-hw, y1, z1), stoneCol, 0.65);
        this.addFlatQuad(xf(-hw, y0 - thick0, z0), xf(-hw, y1 - thick1, z1), xf(hw, y1 - thick1, z1), xf(hw, y0 - thick0, z0), darkStone, 0.75);
        this.addFlatQuad(xf(-hw, y0 - thick0, z0), xf(-hw, y0, z0), xf(-hw, y1, z1), xf(-hw, y1 - thick1, z1), trimCol, 0.68);
        this.addFlatQuad(xf(hw, y0, z0), xf(hw, y0 - thick0, z0), xf(hw, y1 - thick1, z1), xf(hw, y1, z1), trimCol, 0.68);

        // Carved stone side parapet wall & top rail
        for (const side of [-1, 1]) {
          const sx = side * (hw - 0.32);
          this.addFlatQuad(xf(sx, y0, z0), xf(sx, y0 + 1.08, z0), xf(sx, y1 + 1.08, z1), xf(sx, y1, z1), trimCol, 0.60);
          this.addFlatQuad(xf(sx, y0 + 1.08, z0), xf(sx, y0, z0), xf(sx, y1, z1), xf(sx, y1 + 1.08, z1), trimCol, 0.60);
        }

        // Sculpted lotus-capped stone balustrade posts + apex lanterns
        const postEvery = Math.max(2, Math.round(segs / 10));
        if (i % postEvery === 0 || i === segs - 1) {
          for (const side of [-1, 1]) {
            const p = xf(side * (hw - 0.32), y0 + 0.74, z0);
            this.addBox(p[0], p[1], p[2], 0.50, 1.54, 0.50, rotY, trimCol, 0.56);
            if (Math.abs(i - segs / 2) <= 1) {
              this.addBox(p[0], p[1] + 0.98, p[2], 0.40, 0.48, 0.40, rotY, [1.0, 0.86, 0.52], 0.2, 2.2, 2.0);
            } else {
              this.addCylinder(p[0], p[1] + 0.77, p[2], 0.24, 0.08, 0.36, 6, trimCol, 0.52);
            }
          }
        }
      }

      // Deep stone cutwater piers between multi-arches anchoring solidly into riverbed!
      for (let a = 1; a < arches; a++) {
        const tp = a / arches;
        const zp = (tp - 0.5) * length;
        const yp = Math.sin(tp * Math.PI) * archHeight;
        const pp = xf(0, yp - 7.8, zp);
        this.addBox(pp[0], pp[1], pp[2], width + 1.0, 14.5, 3.2, rotY, darkStone, 0.74);
      }

      // Solid stone abutment foundations at both ends
      for (const endSign of [-1, 1]) {
        const ap = xf(0, -6.2, endSign * (length * 0.5 - 1.6));
        this.addBox(ap[0], ap[1], ap[2], width + 1.4, 12.6, 5.2, rotY, darkStone, 0.76);
      }

      this.colEnabled = prevCol;
      if (this.colEnabled) {
        const railSegs = Math.max(6, Math.round(length / 10));
        const segLen = length / railSegs;
        for (let i = 0; i < railSegs; i++) {
          const tm = (i + 0.5) / railSegs;
          const zm = (tm - 0.5) * length;
          const ym = Math.sin(tm * Math.PI) * archHeight;
          for (const side of [-1, 1]) {
            const rp = xf(side * (hw - 0.25), ym + 0.7, zm);
            this.colWorld.addBox(rp[0], rp[1], rp[2], 0.62, 1.85, segLen * 1.04, rotY, 'building', false);
          }
        }
      }
    }

    // Refined Xianxia Carved Stone Lantern (石灯笼)
    addStoneLantern(x, y, z, scale = 1.0, glowCol = [1.0, 0.84, 0.48]) {
      const prevCol = this.colEnabled;
      this.colEnabled = false;
      const s = scale;
      const stone = [0.70, 0.72, 0.68];
      const roof = [0.46, 0.52, 0.54];
      this.addBox(x, y + 0.22 * s, z, 1.10 * s, 0.44 * s, 1.10 * s, 0, stone, 0.70);
      this.addCylinder(x, y + 0.44 * s, z, 0.34 * s, 0.22 * s, 0.32 * s, 6, stone, 0.68);
      this.addCylinder(x, y + 0.72 * s, z, 0.22 * s, 0.19 * s, 1.48 * s, 8, stone, 0.66);
      this.addBox(x, y + 2.28 * s, z, 0.90 * s, 0.22 * s, 0.90 * s, 0, stone, 0.64);
      this.addBox(x, y + 2.74 * s, z, 0.52 * s, 0.70 * s, 0.52 * s, 0, glowCol, 0.18, 2.3, 2.0);
      this.addPagodaRoof(x, y + 3.08 * s, z, 0.92 * s, 0.66 * s, 4, 0.22, 0.16 * s, roof, [0.76, 0.68, 0.44]);
      this.colEnabled = prevCol;
      if (this.colEnabled) {
        this.colWorld.addCylinder(x, y, z, 0.56 * s, 3.6 * s, 'building', false);
      }
    }

    build() {
      return {
        vertices: new Float32Array(this.verts),
        indices: new Uint32Array(this.indices),
      };
    }
  }

  XW.MeshBuilder = MeshBuilder;
})(window);
