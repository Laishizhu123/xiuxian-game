(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;

  // =========================================================================
  // 1. PURE-CODE HERB MESH BUILDER (12 floats/vert: pos3, nrm3, col3, meta3)
  //    Compatible with renderer._uploadWorldVAO() & this.prog.monster!
  // =========================================================================
  class HerbMeshBuilder {
    constructor() {
      this.verts = [];
      this.indices = [];
      this.vCount = 0;
    }

    pushVert(x, y, z, nx, ny, nz, col, rough = 0.52, emissive = 0.0) {
      const len = Math.hypot(nx, ny, nz) || 1.0;
      this.verts.push(x, y, z, nx / len, ny / len, nz / len, col[0], col[1], col[2], rough, emissive, 0.0);
      return this.vCount++;
    }

    addTri(a, b, c) { this.indices.push(a, b, c); }
    addQuad(a, b, c, d) { this.indices.push(a, b, c, a, c, d); }

    _rotVec(x, y, z, rx, ry, rz) {
      let x1 = x, y1 = y, z1 = z;
      if (rx) { const c = Math.cos(rx), s = Math.sin(rx); const ny = y1 * c - z1 * s, nz = y1 * s + z1 * c; y1 = ny; z1 = nz; }
      if (rz) { const c = Math.cos(rz), s = Math.sin(rz); const nx = x1 * c - y1 * s, ny = x1 * s + y1 * c; x1 = nx; y1 = ny; }
      if (ry) { const c = Math.cos(ry), s = Math.sin(ry); const nx = x1 * c + z1 * s, nz = -x1 * s + z1 * c; x1 = nx; z1 = nz; }
      return [x1, y1, z1];
    }

    addEllipsoid(cx, cy, cz, rx, ry, rz, col, rough = 0.45, emissive = 0.0, uSegs = 12, vSegs = 8, topCol = null) {
      const base = this.vCount;
      const stride = uSegs + 1;
      const tc = topCol || col;
      for (let iv = 0; iv <= vSegs; iv++) {
        const phi = (iv / vSegs) * Math.PI;
        const sp = Math.sin(phi), cp = Math.cos(phi);
        const hm = Math.max(0, cp);
        const cRow = [M.lerp(col[0], tc[0], hm), M.lerp(col[1], tc[1], hm), M.lerp(col[2], tc[2], hm)];
        for (let iu = 0; iu <= uSegs; iu++) {
          const th = (iu / uSegs) * Math.PI * 2;
          const ct = Math.cos(th), st = Math.sin(th);
          this.pushVert(cx + rx * sp * ct, cy + ry * cp, cz + rz * sp * st, sp * ct / Math.max(rx, 0.01), cp / Math.max(ry, 0.01), sp * st / Math.max(rz, 0.01), cRow, rough, emissive);
        }
      }
      for (let iv = 0; iv < vSegs; iv++) {
        for (let iu = 0; iu < uSegs; iu++) {
          const a = base + iv * stride + iu;
          this.addTri(a, a + stride, a + 1);
          this.addTri(a + 1, a + stride, a + stride + 1);
        }
      }
    }

    addCylinder(cx, cy, cz, rBot, rTop, h, segs, col, rough = 0.58, emissive = 0.0, rx = 0, ry = 0, rz = 0, topCol = null) {
      const tc = topCol || col;
      const base = this.vCount;
      const stride = segs + 1;
      for (let iy = 0; iy <= 1; iy++) {
        const y = iy * h;
        const r = iy === 0 ? rBot : rTop;
        const cRow = iy === 0 ? col : tc;
        for (let is = 0; is <= segs; is++) {
          const a = (is / segs) * Math.PI * 2;
          const ca = Math.cos(a), sa = Math.sin(a);
          const rp = this._rotVec(ca * r, y, sa * r, rx, ry, rz);
          const rn = this._rotVec(ca, (rBot - rTop) / Math.max(h, 0.05), sa, rx, ry, rz);
          this.pushVert(cx + rp[0], cy + rp[1], cz + rp[2], rn[0], rn[1], rn[2], cRow, rough, emissive);
        }
      }
      for (let is = 0; is < segs; is++) {
        const a = base + is, b = a + stride;
        this.addQuad(a, a + 1, b + 1, b);
      }
    }

    addCone(cx, cy, cz, rBot, h, segs, col, rough = 0.45, emissive = 0.0, rx = 0, ry = 0, rz = 0, tipCol = null) {
      const tc = tipCol || col;
      const tipP = this._rotVec(0, h, 0, rx, ry, rz);
      const tipN = this._rotVec(0, 1, 0, rx, ry, rz);
      const tipIdx = this.pushVert(cx + tipP[0], cy + tipP[1], cz + tipP[2], tipN[0], tipN[1], tipN[2], tc, rough, emissive);
      const base = this.vCount;
      for (let is = 0; is <= segs; is++) {
        const a = (is / segs) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const rp = this._rotVec(ca * rBot, 0, sa * rBot, rx, ry, rz);
        const rn = this._rotVec(ca, rBot / Math.max(h, 0.05), sa, rx, ry, rz);
        this.pushVert(cx + rp[0], cy + rp[1], cz + rp[2], rn[0], rn[1], rn[2], col, rough, emissive * 0.6);
      }
      for (let is = 0; is < segs; is++) {
        this.addTri(tipIdx, base + is + 1, base + is);
      }
    }

    // Curved arched leaf / petal blade starting from (cx, cy, cz) pointing outward along yaw!
    addBlade(cx, cy, cz, yaw, tilt, len, width, arch, baseCol, tipCol, rough = 0.50, baseEm = 0.0, tipEm = 0.0, edgeGlow = false) {
      const segs = 5;
      const base = this.vCount;
      const cY = Math.cos(yaw), sY = Math.sin(yaw);
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const w = width * Math.sin(t * Math.PI * 0.92 + 0.08) * (1.0 - t * 0.28);
        const fwd = t * len * Math.cos(tilt);
        const up = t * len * Math.sin(tilt) - t * t * arch;
        const col = [M.lerp(baseCol[0], tipCol[0], t), M.lerp(baseCol[1], tipCol[1], t), M.lerp(baseCol[2], tipCol[2], t)];
        const em = M.lerp(baseEm, tipEm, t * t);
        const edgeEm = edgeGlow ? Math.max(em, 0.45) : em;
        const edgeCol = edgeGlow ? tipCol : col;

        // Left, center-ridge, right vertices across blade width
        const pts = [[-w, -0.02, edgeCol, edgeEm], [0, 0.02, col, em], [w, -0.02, edgeCol, edgeEm]];
        for (const pt of pts) {
          const lx = pt[0], ly = up + pt[1], lz = fwd;
          const wx = cx + lx * cY + lz * sY;
          const wz = cz - lx * sY + lz * cY;
          this.pushVert(wx, cy + ly, wz, sY * 0.25, 0.92, cY * 0.25, pt[2], rough, pt[3]);
        }
      }
      for (let i = 0; i < segs; i++) {
        const a = base + i * 3, b = a + 3;
        this.addQuad(a, a + 1, b + 1, b);
        this.addQuad(a + 1, a + 2, b + 2, b + 1);
      }
    }

    addTorus(cx, cy, cz, majorR, minorR, col, rough = 0.30, emissive = 0.35, rx = 0, ry = 0, rz = 0, segs = 20, tubeSegs = 6) {
      const base = this.vCount;
      const stride = tubeSegs + 1;
      for (let i = 0; i <= segs; i++) {
        const u = (i / segs) * Math.PI * 2;
        const cu = Math.cos(u), su = Math.sin(u);
        for (let j = 0; j <= tubeSegs; j++) {
          const v = (j / tubeSegs) * Math.PI * 2;
          const cv = Math.cos(v), sv = Math.sin(v);
          const r = majorR + minorR * cv;
          const rp = this._rotVec(r * cu, minorR * sv, r * su, rx, ry, rz);
          const rn = this._rotVec(cv * cu, sv, cv * su, rx, ry, rz);
          this.pushVert(cx + rp[0], cy + rp[1], cz + rp[2], rn[0], rn[1], rn[2], col, rough, emissive);
        }
      }
      for (let i = 0; i < segs; i++) {
        for (let j = 0; j < tubeSegs; j++) {
          const a = base + i * stride + j;
          const b = a + stride;
          this.addQuad(a, b, b + 1, a + 1);
        }
      }
    }

    addLingzhiCap(cx, cy, cz, rx, rz, thick, capCol, rimCol, rimEm = 0.35, rotY = 0) {
      // Wavy kidney/fan-shaped glossy Lingzhi mushroom cap with glowing rim!
      const segs = 16;
      const topC = this.pushVert(cx, cy + thick, cz, 0, 1, 0, capCol, 0.36, 0.05);
      const botC = this.pushVert(cx, cy - thick * 0.35, cz, 0, -1, 0, [capCol[0] * 0.7, capCol[1] * 0.7, capCol[2] * 0.7], 0.65, 0.0);
      const topBase = this.vCount;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const wave = 1.0 + 0.14 * Math.sin(a * 3.0) + 0.07 * Math.cos(a * 5.0);
        const lx = Math.cos(a) * rx * wave;
        const lz = Math.sin(a) * rz * wave;
        const rp = this._rotVec(lx, 0, lz, 0, rotY, 0);
        const midX = cx + rp[0] * 0.76, midZ = cz + rp[2] * 0.76;
        const outX = cx + rp[0], outZ = cz + rp[2];
        this.pushVert(midX, cy + thick * 0.65, midZ, rp[0] * 0.4, 0.9, rp[2] * 0.4, capCol, 0.36, 0.08);
        this.pushVert(outX, cy + thick * 0.08, outZ, rp[0], 0.25, rp[2], rimCol, 0.28, rimEm);
      }
      for (let i = 0; i < segs; i++) {
        const a = topBase + i * 2, b = a + 2;
        this.addTri(topC, a, b);
        this.addQuad(a, a + 1, b + 1, b);
        this.addTri(botC, b + 1, a + 1);
      }
    }

    build() {
      return {
        vertices: new Float32Array(this.verts),
        indices: this.vCount > 65000 ? new Uint32Array(this.indices) : new Uint16Array(this.indices),
      };
    }
  }

  // =========================================================================
  // 2. ALL 16 PURE-CODE SPIRIT HERB MESHES (2 Generic Tiers + 14 Special)
  //    Sized generously (~1.35m..1.95m) so every herb reads clearly in grass!
  // =========================================================================

  // --- 通用一阶灵药 (练气期): 温润青玉三瓣灵芽 + 中央柔光灵珠 ---
  function buildTier1HerbMesh() {
    const b = new HerbMeshBuilder();
    const jadeLeaf = [0.34, 0.80, 0.56];
    const jadeTip  = [0.74, 0.98, 0.88];
    const orbCol   = [0.68, 0.98, 0.90];
    b.addCylinder(0, 0, 0, 0.10, 0.06, 0.42, 8, [0.24, 0.56, 0.36], 0.55, 0.05);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      b.addBlade(0, 0.16, 0, a, 0.55, 0.78, 0.22, 0.22, jadeLeaf, jadeTip, 0.40, 0.06, 0.36);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      b.addBlade(0, 0.34, 0, a, 1.05, 0.68, 0.18, 0.14, [0.46, 0.88, 0.68], [0.86, 1.0, 0.94], 0.34, 0.15, 0.52);
    }
    b.addEllipsoid(0, 0.78, 0, 0.18, 0.20, 0.18, orbCol, 0.20, 0.65, 14, 10, [0.94, 1.0, 0.98]);
    b.addTorus(0, 0.08, 0, 0.42, 0.024, [0.58, 0.96, 0.82], 0.28, 0.45);
    return b.build();
  }

  // --- 通用二阶灵药 (筑基期): 更炫酷双层金边玉莲 + 悬浮青金灵丹晶核 + 旋转金环 ---
  function buildTier2HerbMesh() {
    const b = new HerbMeshBuilder();
    const deepJade = [0.22, 0.74, 0.64];
    const goldTip  = [1.00, 0.88, 0.44];
    const cyanGold = [0.76, 1.00, 0.88];
    b.addCylinder(0, 0, 0, 0.13, 0.08, 0.48, 10, [0.24, 0.54, 0.46], 0.48, 0.12);
    // Outer 6 lush jade petals with bright gold tips
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.addBlade(0, 0.20, 0, a, 0.48, 0.98, 0.25, 0.26, deepJade, goldTip, 0.34, 0.14, 0.58, true);
    }
    // Inner 5 upright luminous cyan-gold petals cupping the floating spirit core
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.35;
      b.addBlade(0, 0.40, 0, a, 1.08, 0.82, 0.20, 0.12, [0.46, 0.92, 0.82], [1.0, 0.94, 0.62], 0.26, 0.26, 0.68);
    }
    // Floating golden-cyan diamond spirit core
    b.addCone(0, 1.04, 0, 0.22, 0.38, 6, cyanGold, 0.18, 0.85, 0, 0, 0, [1.0, 0.96, 0.72]);
    b.addCone(0, 1.04, 0, 0.22, 0.32, 6, goldTip, 0.18, 0.78, Math.PI, 0, 0, cyanGold);
    // Twin glowing golden halo rings (tilted mid halo + ground ring)
    b.addTorus(0, 1.06, 0, 0.46, 0.025, goldTip, 0.18, 0.82, 0.38, 0, 0.24, 24, 6);
    b.addTorus(0, 0.10, 0, 0.62, 0.032, [0.48, 0.96, 0.82], 0.24, 0.58);
    return b.build();
  }

  // --- 1) 低云平原 · 清风草: 淡青色细叶小草丛，叶尖带亮白微光 ---
  function buildQingfengHerbMesh() {
    const b = new HerbMeshBuilder();
    const baseC = [0.44, 0.82, 0.74];
    const tipC  = [0.95, 1.00, 1.00];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.22;
      const len = 0.85 + (i % 3) * 0.18;
      const tilt = 0.72 + (i % 3) * 0.22;
      b.addBlade(Math.cos(a) * 0.08, 0.04, Math.sin(a) * 0.08, a, tilt, len, 0.11, 0.26, baseC, tipC, 0.44, 0.06, 0.78);
    }
    return b.build();
  }

  // --- 2) 低云平原 · 云露花: 浅蓝小花朵，花心有一颗晶莹小水珠 ---
  function buildYunluHerbMesh() {
    const b = new HerbMeshBuilder();
    b.addCylinder(0, 0, 0, 0.065, 0.045, 0.68, 8, [0.32, 0.68, 0.40], 0.58, 0.04);
    for (let i = 0; i < 3; i++) {
      b.addBlade(0, 0.16, 0, i * 2.1, 0.45, 0.56, 0.17, 0.18, [0.30, 0.66, 0.38], [0.48, 0.82, 0.52], 0.52, 0.0, 0.08);
    }
    // 5 sky-blue curved flower petals
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.addBlade(0, 0.64, 0, a, 0.52, 0.48, 0.22, 0.14, [0.56, 0.82, 1.0], [0.84, 0.96, 1.0], 0.34, 0.14, 0.36);
    }
    // Crystal luminous dewdrop in flower heart
    b.addEllipsoid(0, 0.78, 0, 0.14, 0.16, 0.14, [0.76, 0.96, 1.0], 0.12, 0.86, 14, 10, [1.0, 1.0, 1.0]);
    return b.build();
  }

  // --- 3) 迷雾湿地 · 泽兰叶: 深青宽叶草丛，边缘泛着幽绿微光 ---
  function buildZelanHerbMesh() {
    const b = new HerbMeshBuilder();
    const deepTeal = [0.12, 0.38, 0.36];
    const glowGreen = [0.32, 0.98, 0.62];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const len = 0.82 + (i % 2) * 0.20;
      b.addBlade(Math.cos(a) * 0.06, 0.06, Math.sin(a) * 0.06, a, 0.56 + (i % 2) * 0.26, len, 0.27, 0.24, deepTeal, glowGreen, 0.46, 0.05, 0.55, true);
    }
    return b.build();
  }

  // --- 4) 迷雾湿地 · 腐心菇: 紫褐小伞盖蘑菇，菌盖带暗紫光斑 ---
  function buildFuxinHerbMesh() {
    const b = new HerbMeshBuilder();
    const stemC = [0.56, 0.48, 0.52];
    const capC  = [0.36, 0.18, 0.32];
    const spotC = [0.76, 0.34, 0.96];
    // Main mushroom + companion small mushroom
    b.addCylinder(0, 0, 0, 0.11, 0.08, 0.58, 10, stemC, 0.64, 0.04);
    b.addEllipsoid(0, 0.62, 0, 0.42, 0.24, 0.42, capC, 0.46, 0.10, 14, 8, [0.48, 0.24, 0.44]);
    // Dark-purple glowing spots dotted on cap
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      b.addEllipsoid(Math.cos(a) * 0.24, 0.72 + (i % 2) * 0.05, Math.sin(a) * 0.24, 0.065, 0.045, 0.065, spotC, 0.24, 0.82, 8, 6);
    }
    // Companion baby mushroom
    b.addCylinder(0.32, 0, 0.18, 0.065, 0.05, 0.36, 8, stemC, 0.64, 0.04);
    b.addEllipsoid(0.32, 0.38, 0.18, 0.24, 0.15, 0.24, capC, 0.46, 0.10, 12, 8);
    b.addEllipsoid(0.32, 0.50, 0.18, 0.05, 0.035, 0.05, spotC, 0.24, 0.82, 8, 6);
    return b.build();
  }

  // --- 5) 云雾山 · 雾隐参: 土黄根茎配翠绿小叶，顶端带一团淡白雾气环 ---
  function buildWuyinHerbMesh() {
    const b = new HerbMeshBuilder();
    const rootC = [0.78, 0.64, 0.34];
    b.addEllipsoid(0, 0.28, 0, 0.18, 0.30, 0.16, rootC, 0.68, 0.04, 12, 8, [0.88, 0.76, 0.44]);
    // Forked ginseng rootlets
    b.addCone(0.14, 0.0, 0.06, 0.06, 0.24, 6, rootC, 0.70, 0.0, 0.3, 0, -0.4);
    b.addCone(-0.14, 0.0, -0.05, 0.06, 0.24, 6, rootC, 0.70, 0.0, -0.25, 0, 0.4);
    // Emerald small leaves sprouting from crown
    b.addCylinder(0, 0.52, 0, 0.05, 0.035, 0.34, 8, [0.30, 0.68, 0.34], 0.55, 0.06);
    for (let i = 0; i < 4; i++) {
      b.addBlade(0, 0.74, 0, i * 1.57 + 0.3, 0.45, 0.48, 0.16, 0.14, [0.24, 0.74, 0.38], [0.54, 0.94, 0.58], 0.46, 0.08, 0.24);
    }
    // Pale-white floating mist ring at apex!
    b.addTorus(0, 1.06, 0, 0.32, 0.055, [0.92, 0.97, 1.0], 0.40, 0.62, 0.18, 0, 0.1, 20, 8);
    return b.build();
  }

  // --- 6) 云雾山 · 灵岩芝: 暗褐小灵芝盖，边缘镶一圈极细暖黄灵边 ---
  function buildLingyanHerbMesh() {
    const b = new HerbMeshBuilder();
    const brown = [0.34, 0.20, 0.12];
    const warmGold = [1.00, 0.84, 0.40];
    b.addCylinder(0, 0, 0, 0.10, 0.075, 0.46, 8, [0.28, 0.16, 0.10], 0.62, 0.02);
    b.addLingzhiCap(0, 0.48, 0, 0.48, 0.38, 0.14, brown, warmGold, 0.72, 0.2);
    b.addCylinder(-0.24, 0, 0.14, 0.065, 0.05, 0.28, 8, [0.28, 0.16, 0.10], 0.62, 0.02);
    b.addLingzhiCap(-0.24, 0.30, 0.14, 0.28, 0.24, 0.09, brown, warmGold, 0.68, 2.2);
    return b.build();
  }

  // --- 7) 沙漠 · 流沙刺: 枯黄/浅褐带尖刺小灌木，顶部有一点微弱金光 ---
  function buildLiushaHerbMesh() {
    const b = new HerbMeshBuilder();
    const dryWood = [0.64, 0.50, 0.28];
    const paleTan = [0.78, 0.66, 0.40];
    b.addCylinder(0, 0, 0, 0.09, 0.055, 0.72, 8, dryWood, 0.74, 0.0);
    // Spiky desert branches
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const h = 0.22 + (i % 3) * 0.16;
      b.addCone(Math.cos(a) * 0.06, h, Math.sin(a) * 0.06, 0.055, 0.52, 5, dryWood, 0.72, 0.04, Math.sin(a) * 0.75, 0, -Math.cos(a) * 0.75, paleTan);
    }
    // Faint glowing golden bud at top
    b.addEllipsoid(0, 0.80, 0, 0.12, 0.14, 0.12, [1.0, 0.86, 0.38], 0.24, 0.78, 10, 8);
    return b.build();
  }

  // --- 8) 沙漠 · 烈阳果: 赤红小果实挂在矮灌木上，泛着暖橙光泽 ---
  function buildLieyangHerbMesh() {
    const b = new HerbMeshBuilder();
    const shrub = [0.46, 0.42, 0.22];
    b.addCylinder(0, 0, 0, 0.09, 0.05, 0.56, 8, [0.42, 0.28, 0.16], 0.72, 0.0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.addBlade(0, 0.28, 0, a, 0.46, 0.58, 0.16, 0.16, shrub, [0.64, 0.52, 0.24], 0.62, 0.0, 0.08);
    }
    // 3 glowing crimson-orange Sun Fruits hanging on shrub
    const fruits = [[0.24, 0.56, 0.12], [-0.22, 0.52, 0.16], [0.02, 0.66, -0.22]];
    for (const f of fruits) {
      b.addEllipsoid(f[0], f[1], f[2], 0.14, 0.14, 0.14, [0.96, 0.22, 0.10], 0.22, 0.68, 12, 8, [1.0, 0.62, 0.20]);
    }
    return b.build();
  }

  // --- 9) 通天木林 · 古木灵芝: 深褐大灵芝造型，菌盖泛浓郁翠绿光晕 ---
  function buildGumuLingzhiHerbMesh() {
    const b = new HerbMeshBuilder();
    const darkBark = [0.28, 0.16, 0.10];
    const lushEmerald = [0.28, 0.98, 0.54];
    b.addCylinder(0, 0, 0, 0.16, 0.11, 0.62, 10, darkBark, 0.62, 0.04);
    b.addLingzhiCap(0, 0.64, 0, 0.68, 0.54, 0.18, darkBark, lushEmerald, 0.84, 0.0);
    b.addLingzhiCap(0.24, 0.42, 0.18, 0.40, 0.34, 0.12, darkBark, lushEmerald, 0.76, 1.9);
    b.addTorus(0, 0.84, 0, 0.52, 0.028, lushEmerald, 0.24, 0.75);
    return b.build();
  }

  // --- 10) 通天木林 · 千叶翠: 多层叠放的亮绿叶片小丛，叶脉带淡金光点 ---
  function buildQianyeHerbMesh() {
    const b = new HerbMeshBuilder();
    const brightG = [0.34, 0.88, 0.42];
    const lushG   = [0.58, 0.98, 0.52];
    const goldDot = [1.00, 0.90, 0.46];
    // 3 stacked rosette tiers of bright green leaves
    for (let tier = 0; tier < 3; tier++) {
      const cnt = 6 - tier;
      const y = 0.10 + tier * 0.26;
      const len = 0.76 - tier * 0.14;
      for (let i = 0; i < cnt; i++) {
        const a = (i / cnt) * Math.PI * 2 + tier * 0.55;
        b.addBlade(0, y, 0, a, 0.42 + tier * 0.28, len, 0.20, 0.18, brightG, lushG, 0.40, 0.08, 0.36);
        // Pale-gold luminous vein dot on leaf
        b.addEllipsoid(Math.sin(a) * len * 0.52, y + 0.14 + tier * 0.06, Math.cos(a) * len * 0.52, 0.042, 0.042, 0.042, goldDot, 0.20, 0.85, 8, 6);
      }
    }
    return b.build();
  }

  // --- 11) 残阵古道 · 古阵草: 青灰带暗金纹路小草，根部极简几何符文光环 ---
  function buildGuzhenHerbMesh() {
    const b = new HerbMeshBuilder();
    const ashTeal = [0.40, 0.48, 0.46];
    const darkGold = [0.94, 0.76, 0.30];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      b.addBlade(Math.cos(a) * 0.08, 0.06, Math.sin(a) * 0.08, a, 0.85 + (i % 2) * 0.22, 0.92, 0.14, 0.22, ashTeal, darkGold, 0.44, 0.08, 0.56, true);
    }
    // Minimalist geometric octagonal rune rings at root base
    b.addTorus(0, 0.08, 0, 0.56, 0.026, darkGold, 0.22, 0.82, 0, 0, 0, 8, 6);
    b.addTorus(0, 0.10, 0, 0.36, 0.020, darkGold, 0.22, 0.72, 0, Math.PI / 8, 0, 8, 6);
    return b.build();
  }

  // --- 12) 残阵古道 · 蕴灵花: 淡紫与亮金交错小花，花心持续散发微弱灵光 ---
  function buildYunlingHerbMesh() {
    const b = new HerbMeshBuilder();
    const lilac = [0.76, 0.56, 0.96];
    const gold  = [1.00, 0.86, 0.38];
    b.addCylinder(0, 0, 0, 0.07, 0.05, 0.72, 8, [0.38, 0.34, 0.46], 0.55, 0.08);
    // Alternating pale-purple & bright-gold petals
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const cA = i % 2 === 0 ? lilac : gold;
      const cB = i % 2 === 0 ? [0.92, 0.80, 1.0] : [1.0, 0.96, 0.68];
      b.addBlade(0, 0.68, 0, a, 0.56, 0.56, 0.21, 0.14, cA, cB, 0.30, 0.24, 0.58);
    }
    // Glowing spirit heart + subtle floating aura halo
    b.addEllipsoid(0, 0.84, 0, 0.15, 0.15, 0.15, [1.0, 0.92, 0.64], 0.18, 0.88, 12, 8);
    b.addTorus(0, 0.96, 0, 0.34, 0.018, lilac, 0.22, 0.66, 0.2, 0, 0);
    return b.build();
  }

  // --- 13) 雪原 · 冰魄莲: 冰蓝/雪白多瓣小莲花，花心冷冽亮蓝光 ---
  function buildBingpoHerbMesh() {
    const b = new HerbMeshBuilder();
    const iceBlue = [0.56, 0.86, 1.00];
    const snowW   = [0.94, 0.98, 1.00];
    const coreB   = [0.34, 0.78, 1.00];
    // Outer snow-white & ice-blue lotus petals
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      b.addBlade(0, 0.16, 0, a, 0.45, 0.74, 0.22, 0.14, iceBlue, snowW, 0.24, 0.20, 0.48);
    }
    // Inner upright crystal lotus petals
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      b.addBlade(0, 0.28, 0, a, 0.96, 0.58, 0.18, 0.08, coreB, snowW, 0.20, 0.34, 0.62);
    }
    // Piercing cold bright-blue lotus heart
    b.addEllipsoid(0, 0.56, 0, 0.17, 0.19, 0.17, coreB, 0.14, 0.94, 14, 10, [0.80, 0.96, 1.0]);
    return b.build();
  }

  // --- 14) 雪原 · 寒霜参: 银白根茎配浅蓝小叶，周围飘着极细冰晶光点 ---
  function buildHanshuangHerbMesh() {
    const b = new HerbMeshBuilder();
    const silverW = [0.88, 0.93, 0.98];
    const iceLeaf = [0.58, 0.86, 1.00];
    const crystal = [0.76, 0.95, 1.00];
    b.addEllipsoid(0, 0.30, 0, 0.18, 0.32, 0.16, silverW, 0.36, 0.16, 12, 8);
    b.addCone(0.14, 0, 0.05, 0.055, 0.24, 6, silverW, 0.40, 0.12, 0.25, 0, -0.35);
    b.addCone(-0.14, 0, -0.05, 0.055, 0.24, 6, silverW, 0.40, 0.12, -0.25, 0, 0.35);
    b.addCylinder(0, 0.56, 0, 0.048, 0.036, 0.34, 8, iceLeaf, 0.34, 0.22);
    for (let i = 0; i < 4; i++) {
      b.addBlade(0, 0.78, 0, i * 1.57 + 0.4, 0.48, 0.50, 0.16, 0.14, iceLeaf, [0.92, 0.98, 1.0], 0.28, 0.22, 0.46);
    }
    // Tiny ice crystal motes hovering around the ginseng
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 0.42 + (i % 2) * 0.12;
      const y = 0.45 + (i % 3) * 0.26;
      b.addCone(Math.cos(a) * r, y, Math.sin(a) * r, 0.045, 0.09, 4, crystal, 0.14, 0.92);
    }
    return b.build();
  }

  // =========================================================================
  // 3. ALL 16 SPIRIT HERB SPECIES DEFINITIONS
  // =========================================================================
  const HERB_DEFS = [
    {
      id: 'herb_tier1', name: '一阶灵药', icon: '灵', tier: 1, isGeneric: true, region: 'lianqi',
      scale: 1.55, nameHeight: 1.85, tint: [0.64, 0.98, 0.86],
      desc: '通用一阶灵药 · 产自练气期各大灵地，温润青玉灵芽蕴含纯净灵气',
      buildMesh: buildTier1HerbMesh,
    },
    {
      id: 'herb_tier2', name: '二阶灵药', icon: '仙', tier: 2, isGeneric: true, region: 'zhuji',
      scale: 1.72, nameHeight: 2.35, tint: [1.00, 0.90, 0.48],
      desc: '通用二阶灵药 · 产自筑基期险地，金边玉莲托举青金灵丹，灵韵浓郁',
      buildMesh: buildTier2HerbMesh,
    },
    {
      id: 'herb_qingfeng', name: '清风草', icon: '风', tier: 1, isGeneric: false, region: 'lowcloud',
      scale: 1.52, nameHeight: 1.72, tint: [0.76, 0.98, 0.94],
      desc: '低云平原特殊灵药 · 淡青细叶草丛，叶尖凝结亮白清风微光',
      buildMesh: buildQingfengHerbMesh,
    },
    {
      id: 'herb_yunlu', name: '云露花', icon: '露', tier: 1, isGeneric: false, region: 'lowcloud',
      scale: 1.56, nameHeight: 1.76, tint: [0.72, 0.92, 1.00],
      desc: '低云平原特殊灵药 · 浅蓝花朵，花心凝有一颗晶莹朝露水珠',
      buildMesh: buildYunluHerbMesh,
    },
    {
      id: 'herb_zelan', name: '泽兰叶', icon: '兰', tier: 1, isGeneric: false, region: 'swamp',
      scale: 1.58, nameHeight: 1.74, tint: [0.38, 0.96, 0.66],
      desc: '迷雾湿地特殊灵药 · 深青宽叶草丛，叶缘泛着幽绿泽兰灵光',
      buildMesh: buildZelanHerbMesh,
    },
    {
      id: 'herb_fuxin', name: '腐心菇', icon: '菇', tier: 1, isGeneric: false, region: 'swamp',
      scale: 1.56, nameHeight: 1.65, tint: [0.80, 0.42, 0.96],
      desc: '迷雾湿地特殊灵药 · 紫褐小伞盖蘑菇，菌盖点缀暗紫灵斑',
      buildMesh: buildFuxinHerbMesh,
    },
    {
      id: 'herb_wuyin', name: '雾隐参', icon: '参', tier: 1, isGeneric: false, region: 'cloudmtn',
      scale: 1.52, nameHeight: 1.92, tint: [0.92, 0.96, 0.82],
      desc: '云雾山特殊灵药 · 土黄根茎配翠绿小叶，顶端浮绕一团淡白雾气环',
      buildMesh: buildWuyinHerbMesh,
    },
    {
      id: 'herb_lingyan', name: '灵岩芝', icon: '芝', tier: 1, isGeneric: false, region: 'cloudmtn',
      scale: 1.58, nameHeight: 1.58, tint: [1.00, 0.84, 0.44],
      desc: '云雾山特殊灵药 · 暗褐小灵芝盖，边缘镶着极细暖黄灵边',
      buildMesh: buildLingyanHerbMesh,
    },
    {
      id: 'herb_liusha', name: '流沙刺', icon: '刺', tier: 1, isGeneric: false, region: 'desert',
      scale: 1.58, nameHeight: 1.74, tint: [1.00, 0.86, 0.42],
      desc: '流沙荒漠特殊灵药 · 枯黄带刺小灌木，枝顶凝有一点微弱金光',
      buildMesh: buildLiushaHerbMesh,
    },
    {
      id: 'herb_lieyang', name: '烈阳果', icon: '果', tier: 1, isGeneric: false, region: 'desert',
      scale: 1.58, nameHeight: 1.68, tint: [1.00, 0.56, 0.22],
      desc: '流沙荒漠特殊灵药 · 赤红小果挂于矮灌木上，泛着暖橙阳炎光泽',
      buildMesh: buildLieyangHerbMesh,
    },
    {
      id: 'herb_gumulingzhi', name: '古木灵芝', icon: '芝', tier: 2, isGeneric: false, region: 'spiritwood',
      scale: 1.68, nameHeight: 1.92, tint: [0.36, 0.98, 0.58],
      desc: '通天木林特殊灵药 · 深褐大灵芝造型，菌盖泛着浓郁翠绿光晕',
      buildMesh: buildGumuLingzhiHerbMesh,
    },
    {
      id: 'herb_qianye', name: '千叶翠', icon: '翠', tier: 2, isGeneric: false, region: 'spiritwood',
      scale: 1.62, nameHeight: 1.82, tint: [0.64, 0.98, 0.56],
      desc: '通天木林特殊灵药 · 多层叠放亮绿叶片小丛，叶脉嵌淡金光点',
      buildMesh: buildQianyeHerbMesh,
    },
    {
      id: 'herb_guzhen', name: '古阵草', icon: '阵', tier: 2, isGeneric: false, region: 'canzhen',
      scale: 1.62, nameHeight: 1.92, tint: [0.96, 0.80, 0.36],
      desc: '残阵古道特殊灵药 · 青灰带暗金纹路小草，根部环绕极简几何符文光环',
      buildMesh: buildGuzhenHerbMesh,
    },
    {
      id: 'herb_yunling', name: '蕴灵花', icon: '韵', tier: 2, isGeneric: false, region: 'canzhen',
      scale: 1.64, nameHeight: 1.96, tint: [0.90, 0.72, 1.00],
      desc: '残阵古道特殊灵药 · 淡紫与亮金交错花瓣，花心持续散发灵光',
      buildMesh: buildYunlingHerbMesh,
    },
    {
      id: 'herb_bingpo', name: '冰魄莲', icon: '莲', tier: 2, isGeneric: false, region: 'frost',
      scale: 1.66, nameHeight: 1.68, tint: [0.54, 0.88, 1.00],
      desc: '霜雪原特殊灵药 · 冰蓝雪白多瓣小莲花，花心透着冷冽亮蓝光',
      buildMesh: buildBingpoHerbMesh,
    },
    {
      id: 'herb_hanshuang', name: '寒霜参', icon: '霜', tier: 2, isGeneric: false, region: 'frost',
      scale: 1.62, nameHeight: 1.96, tint: [0.76, 0.94, 1.00],
      desc: '霜雪原特殊灵药 · 银白根茎配浅蓝小叶，周身飘浮极细冰晶光点',
      buildMesh: buildHanshuangHerbMesh,
    },
  ];

  const HERB_MAP = {};
  for (const d of HERB_DEFS) HERB_MAP[d.id] = d;

  function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // =========================================================================
  // 4. REGIONAL SPIRIT HERB SPAWNER (Generic >> Special, Well-Spaced!)
  // =========================================================================
  function generateHerbSpawns() {
    const herbs = [];
    const rand = makeRng(20261123);
    const nrm = new Float32Array(3);

    const tooClose = (x, z, minDist) => {
      const m2 = minDist * minDist;
      for (let i = 0; i < herbs.length; i++) {
        const dx = herbs[i].x - x, dz = herbs[i].z - z;
        if (dx * dx + dz * dz < m2) return true;
      }
      return false;
    };

    const addHerb = (defId, x, z) => {
      const def = HERB_MAP[defId];
      if (!def) return;
      const y = T.getMeshTerrainHeight(x, z);
      herbs.push({
        uid: herbs.length,
        id: defId,
        def,
        x, y, z,
        yaw: rand() * Math.PI * 2,
        phase: rand() * Math.PI * 2,
        collected: false,
        respawnTimer: 0,
        visible: true,
        modelMat: M.mat4(),
      });
    };

    const scatter = (defId, targetCount, minX, maxX, minZ, maxZ, minSpacing, validator) => {
      let added = 0;
      for (let tries = 0; tries < 2200 && added < targetCount; tries++) {
        const x = minX + rand() * (maxX - minX);
        const z = minZ + rand() * (maxZ - minZ);
        if (tooClose(x, z, minSpacing)) continue;
        T.getTerrainNormal(x, z, nrm);
        const y = T.getMeshTerrainHeight(x, z);
        if (!validator(x, y, z, nrm)) continue;
        addHerb(defId, x, z);
        added++;
      }
    };

    // --- 1) 低云平原 (练气期: 一阶灵药 × 18, 清风草 × 5, 云露花 × 5) ---
    const spX = T.LOW_CLOUD_PLAINS.spawnX;
    const spZ = T.LOW_CLOUD_PLAINS.spawnZ;
    // Curated starter herbs gently visible right near spawn so player can immediately experience gathering!
    addHerb('herb_tier1',    spX - 11, spZ - 14);
    addHerb('herb_qingfeng', spX + 15, spZ - 13);
    addHerb('herb_yunlu',    spX - 24, spZ - 26);

    const validLowCloud = (x, y, z, n) => {
      if (Math.hypot(x - spX, z - spZ) < 42) return false;
      if (T.getLowCloudPlainsMask(x, z) < 0.42) return false;
      if (T.getSwampMask(x, z) > 0.08 || T.getAncientRoadMask(x, z) > 0.08 || T.getDesertMask(x, z) > 0.05) return false;
      if (T.getRiverInfo(x, z).riverMask > 0.15) return false;
      return y > 10.0 && y < 48.0 && n[1] > 0.87;
    };
    scatter('herb_tier1',    17, -4200, -180, 440, 6800, 145, validLowCloud);
    scatter('herb_qingfeng',  4, -4200, -180, 440, 6800, 180, validLowCloud);
    scatter('herb_yunlu',     4, -4200, -180, 440, 6800, 180, validLowCloud);

    // --- 2) 迷雾湿地 (练气期: 一阶灵药 × 18, 泽兰叶 × 5, 腐心菇 × 5) ---
    addHerb('herb_tier1', T.CHENYAN_SWAMP.viewX + 16, T.CHENYAN_SWAMP.viewZ - 18);
    addHerb('herb_zelan', T.CHENYAN_SWAMP.viewX - 22, T.CHENYAN_SWAMP.viewZ - 24);
    addHerb('herb_fuxin', T.CHENYAN_SWAMP.viewX + 28, T.CHENYAN_SWAMP.viewZ + 14);
    const validSwamp = (x, y, z, n) => {
      if (T.getSwampMask(x, z) < 0.34) return false;
      if (T.getCloudMountainMask(x, z) > 0.10) return false;
      return y >= T.SWAMP_WATER_Y - 0.15 && y <= 14.5 && n[1] > 0.84;
    };
    scatter('herb_tier1', 17, 220, 3260, 1520, 3340, 110, validSwamp);
    scatter('herb_zelan',  4, 220, 3260, 1520, 3340, 150, validSwamp);
    scatter('herb_fuxin',  4, 220, 3260, 1520, 3340, 150, validSwamp);

    // --- 3) 云雾山 (练气期: 一阶灵药 × 16, 雾隐参 × 5, 灵岩芝 × 5) ---
    const cm = T.CLOUD_MOUNTAIN;
    for (let i = 0; i < cm.terraces.length; i++) {
      const tc = cm.terraces[i];
      addHerb('herb_tier1', tc.x + 18, tc.z - 16);
      addHerb('herb_tier1', tc.x - 24, tc.z + 20);
      if (i % 2 === 0) addHerb('herb_wuyin', tc.x + 28, tc.z + 18);
      else addHerb('herb_lingyan', tc.x - 20, tc.z - 26);
    }
    addHerb('herb_wuyin',   cm.cx + 42, cm.cz - 22);
    addHerb('herb_lingyan', cm.cx - 46, cm.cz + 26);
    addHerb('herb_tier1',   cm.viewX + 14, cm.viewZ - 16);

    // --- 4) 流沙荒漠 (练气期: 一阶灵药 × 18, 流沙刺 × 5, 烈阳果 × 5) ---
    const dVx = T.DESERT_DUNES.viewX, dVz = T.DESERT_DUNES.viewZ;
    addHerb('herb_tier1',   dVx - 18, dVz + 16);
    addHerb('herb_liusha',  dVx + 22, dVz + 18);
    addHerb('herb_lieyang', dVx - 28, dVz + 34);
    const validDesert = (x, y, z, n) => {
      if (T.getDesertMask(x, z) < 0.36) return false;
      if (T.getLowCloudPlainsMask(x, z) > 0.12) return false;
      return y > 12.0 && y < 78.0 && n[1] > 0.83;
    };
    scatter('herb_tier1',   17, -8600, -4240, 1740, 6800, 165, validDesert);
    scatter('herb_liusha',   4, -8600, -4240, 1740, 6800, 210, validDesert);
    scatter('herb_lieyang',  4, -8600, -4240, 1740, 6800, 210, validDesert);

    // --- 5) 通天木林 (筑基期: 二阶灵药 × 18, 古木灵芝 × 5, 千叶翠 × 5) ---
    const sf = T.SPIRIT_FOREST;
    addHerb('herb_tier2',       sf.viewX - 16, sf.viewZ - 20);
    addHerb('herb_gumulingzhi', sf.viewX + 20, sf.viewZ - 26);
    addHerb('herb_qianye',      sf.viewX - 28, sf.viewZ - 36);
    const validSpiritWood = (x, y, z, n) => {
      if (T.getSpiritForestMask(x, z) < 0.35) return false;
      if (T.getSnowfieldMask(x, z) > 0.12 || T.getAncientRoadMask(x, z) > 0.18) return false;
      if (Math.hypot(x - sf.worldTreeX, z - sf.worldTreeZ) < 62) return false;
      return y > 38.0 && y < 95.0 && n[1] > 0.80;
    };
    scatter('herb_tier2',       17, -6050, -1480, -4000, 240, 160, validSpiritWood);
    scatter('herb_gumulingzhi',  4, -6050, -1480, -4000, 240, 210, validSpiritWood);
    scatter('herb_qianye',       4, -6050, -1480, -4000, 240, 210, validSpiritWood);

    // --- 6) 残阵古道 (筑基期: 二阶灵药 × 16, 古阵草 × 5, 蕴灵花 × 5) ---
    const cr = T.CANZHEN_ROAD;
    addHerb('herb_tier2',   cr.viewX - 18, cr.viewZ - 14);
    addHerb('herb_guzhen',  cr.viewX - 34, cr.viewZ - 26);
    addHerb('herb_yunling', cr.viewX + 22, cr.viewZ - 28);
    const validAncientRoad = (x, y, z, n) => {
      if (T.getAncientRoadMask(x, z) < 0.28) return false;
      if (T.getSpiritForestMask(x, z) > 0.22) return false;
      return y > 18.0 && y < 88.0 && n[1] > 0.80;
    };
    scatter('herb_tier2',   15, -4020, -2460, 190, 1500, 105, validAncientRoad);
    scatter('herb_guzhen',   4, -4020, -2460, 190, 1500, 145, validAncientRoad);
    scatter('herb_yunling',  4, -4020, -2460, 190, 1500, 145, validAncientRoad);

    // --- 7) 霜雪原 (筑基期: 二阶灵药 × 18, 冰魄莲 × 5, 寒霜参 × 5) ---
    const fs = T.FROST_SNOWFIELD;
    addHerb('herb_tier2',     fs.viewX - 16, fs.viewZ - 22);
    addHerb('herb_bingpo',    fs.viewX + 22, fs.viewZ - 26);
    addHerb('herb_hanshuang', fs.viewX - 26, fs.viewZ - 36);
    const validFrost = (x, y, z, n) => {
      if (T.getSnowfieldMask(x, z) < 0.34) return false;
      if (T.getFrostMountainMask(x, z) > 0.16) return false;
      return y > 62.0 && y < 145.0 && n[1] > 0.84;
    };
    scatter('herb_tier2',     17, -8000, 3300, -8850, -4620, 185, validFrost);
    scatter('herb_bingpo',     4, -8000, 3300, -8850, -4620, 230, validFrost);
    scatter('herb_hanshuang',  4, -8000, 3300, -8850, -4620, 230, validFrost);

    return herbs;
  }

  // =========================================================================
  // 5. SPIRIT HERB SYSTEM (Visibility, Proximity Gather Prompt, Labels)
  // =========================================================================
  class HerbSystem {
    constructor() {
      this.defs = HERB_DEFS;
      this.defMap = HERB_MAP;
      this.meshes = {};
      for (const d of HERB_DEFS) {
        this.meshes[d.id] = d.buildMesh();
      }
      this.herbs = generateHerbSpawns();
      this.drawList = []; // [{ id, modelMat, tint, glow }]
      this.nearestCollectible = null;
      this.collectRange = 4.5;
    }

    update(dt, elapsed, playerPos, paused) {
      const cdt = Math.min(dt, 0.05);
      const px = playerPos[0], pz = playerPos[2];
      this.drawList.length = 0;

      let bestHerb = null;
      let bestDist = this.collectRange;

      for (let i = 0; i < this.herbs.length; i++) {
        const h = this.herbs[i];
        if (h.collected) {
          h.visible = false;
          if (!paused) {
            h.respawnTimer -= cdt;
            if (h.respawnTimer <= 0) {
              h.collected = false;
              h.respawnTimer = 0;
            }
          }
          continue;
        }

        const dx = h.x - px, dz = h.z - pz;
        const distSq = dx * dx + dz * dz;
        h.visible = distSq < 360.0 * 360.0;
        if (!h.visible) continue;

        const dist = Math.sqrt(distSq);
        if (dist < bestDist) {
          bestDist = dist;
          bestHerb = h;
        }

        const def = h.def;
        const sc = def.scale;
        // Tier-2 generic & special herbs get slightly livelier gentle hover/rotation accent
        const rotY = def.id === 'herb_tier2' ? (h.yaw + elapsed * 0.55) : h.yaw;
        const pulseGlow = (def.tier === 2 ? 0.34 : 0.22) + Math.sin(elapsed * 2.4 + h.phase) * 0.14;
        M.m4ComposeTRS(h.modelMat, h.x, h.y - 0.03, h.z, 0, rotY, 0, sc, sc, sc);
        this.drawList.push({
          id: h.id,
          modelMat: h.modelMat,
          tint: def.tint,
          glow: Math.max(0.05, pulseGlow),
        });
      }

      this.nearestCollectible = bestHerb;
    }

    tryCollectNearest(onAddBagItem, monsterSystem) {
      const h = this.nearestCollectible;
      if (!h || h.collected) return { ok: false, reason: 'none' };

      const itemPayload = {
        id: h.def.id,
        name: h.def.name,
        icon: h.def.icon,
        tier: h.def.tier,
        isGeneric: h.def.isGeneric,
        slotType: 'herb',
        desc: h.def.desc,
        count: 1,
      };
      const added = onAddBagItem ? onAddBagItem(itemPayload) : true;
      if (!added) {
        if (monsterSystem) {
          monsterSystem.spawnFloatingText(h.x, h.y + 1.8, h.z, '背包已满!', '#ff9888');
        }
        return { ok: false, reason: 'full' };
      }

      h.collected = true;
      h.visible = false;
      h.respawnTimer = 60.0;
      this.nearestCollectible = null;

      if (monsterSystem) {
        monsterSystem._spawnEffect({
          shape: 'ring',
          x: h.x, y: h.y + 0.22, z: h.z,
          s0: 0.35, s1: 1.95, life: 0.45,
          col: h.def.tint, alpha: 0.62,
        });
        monsterSystem.spawnFloatingText(
          h.x, h.y + h.def.nameHeight, h.z,
          `采集 +1 ${h.def.name}`,
          h.def.tier === 2 ? '#ffe994' : '#9cffcc'
        );
      }
      return { ok: true, herb: h.def };
    }

    // Draw subtle nearby herb name plaques onto existing 2D #nametag-canvas (no clearRect — overlays cleanly!)
    renderLabels(ctx, cssW, cssH, dpr, vpMat, camPos) {
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '600 11.5px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cx = camPos[0], cy = camPos[1], cz = camPos[2];
      for (let i = 0; i < this.herbs.length; i++) {
        const h = this.herbs[i];
        if (h.collected || !h.visible) continue;
        const dx = h.x - cx, dy = h.y - cy, dz = h.z - cz;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > 46.0) continue;

        const wx = h.x, wy = h.y + h.def.nameHeight, wz = h.z;
        const clipX = vpMat[0] * wx + vpMat[4] * wy + vpMat[8]  * wz + vpMat[12];
        const clipY = vpMat[1] * wx + vpMat[5] * wy + vpMat[9]  * wz + vpMat[13];
        const clipW = vpMat[3] * wx + vpMat[7] * wy + vpMat[11] * wz + vpMat[15];
        if (clipW <= 0.2) continue;
        const ndcX = clipX / clipW, ndcY = clipY / clipW;
        if (ndcX < -1.05 || ndcX > 1.05 || ndcY < -1.05 || ndcY > 1.05) continue;

        const sx = (ndcX * 0.5 + 0.5) * cssW;
        const sy = (0.5 - ndcY * 0.5) * cssH;
        const alpha = 1.0 - M.smoothstep(30.0, 46.0, dist);
        if (alpha <= 0.03) continue;

        const isNear = this.nearestCollectible && this.nearestCollectible.uid === h.uid;
        const isT2 = h.def.tier === 2;
        const label = isNear ? `[C] 采集 · ${h.def.name}` : h.def.name;

        ctx.globalAlpha = alpha;
        const tw = ctx.measureText(label).width;
        const bw = Math.ceil(tw + 16), bh = 20;
        const bx = Math.round(sx - bw * 0.5), by = Math.round(sy - bh * 0.5);

        ctx.fillStyle = isNear ? 'rgba(20, 52, 42, 0.88)' : 'rgba(10, 24, 24, 0.68)';
        ctx.strokeStyle = isNear
          ? 'rgba(136, 255, 192, 0.92)'
          : (isT2 ? 'rgba(246, 214, 118, 0.72)' : 'rgba(128, 224, 178, 0.58)');
        ctx.lineWidth = isNear ? 1.4 : 1.0;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 10);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillText(label, sx, sy + 1);
        ctx.fillStyle = isNear ? '#c8ffe2' : (isT2 ? '#ffeca8' : '#d6fced');
        ctx.fillText(label, sx, sy);
      }

      ctx.restore();
    }
  }

  XW.Herbs = {
    HERB_DEFS,
    HERB_MAP,
    createHerbSystem: () => new HerbSystem(),
  };
})(window);
