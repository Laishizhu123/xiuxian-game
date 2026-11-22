(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;

  // =========================================================================
  // 20-BONE HUMANOID SKELETON — Human: Fall Flat Q-Version Clay Proportions (~1.62m)
  // Large round head sitting directly on plump shoulders (NO neck), stubby rounded limbs (NO hands/feet).
  // Local bind pose: stands on y = 0.000m, faces +Z, Left is +X, Right is -X.
  // =========================================================================
  const BONE = {
    ROOT:        0,
    PELVIS:      1,
    SPINE_LOW:   2,
    SPINE_UP:    3,
    NECK:        4,
    HEAD:        5,
    SHOULDER_L:  6,
    UPPER_ARM_L: 7,
    FOREARM_L:   8,
    HAND_L:      9,
    SHOULDER_R:  10,
    UPPER_ARM_R: 11,
    FOREARM_R:   12,
    HAND_R:      13,
    THIGH_L:     14,
    SHIN_L:      15,
    FOOT_L:      16,
    THIGH_R:     17,
    SHIN_R:      18,
    FOOT_R:      19,
  };
  const BONE_COUNT = 20;

  const BONE_DEF = [
    { name: 'root',        parent: -1,               pos: [ 0.000, 0.000,  0.000] },
    { name: 'pelvis',      parent: BONE.ROOT,        pos: [ 0.000, 0.620,  0.000] },
    { name: 'spine_low',   parent: BONE.PELVIS,      pos: [ 0.000, 0.770,  0.004] },
    { name: 'spine_up',    parent: BONE.SPINE_LOW,   pos: [ 0.000, 0.990,  0.002] },
    { name: 'neck',        parent: BONE.SPINE_UP,    pos: [ 0.000, 1.145,  0.004] },
    { name: 'head',        parent: BONE.NECK,        pos: [ 0.000, 1.185,  0.006] },
    { name: 'shoulder_l',  parent: BONE.SPINE_UP,    pos: [ 0.145, 1.075, -0.004] },
    { name: 'upper_arm_l', parent: BONE.SHOULDER_L,  pos: [ 0.242, 1.055, -0.005] },
    { name: 'forearm_l',   parent: BONE.UPPER_ARM_L, pos: [ 0.268, 0.840, -0.006] },
    { name: 'hand_l',      parent: BONE.FOREARM_L,   pos: [ 0.278, 0.650,  0.004] },
    { name: 'shoulder_r',  parent: BONE.SPINE_UP,    pos: [-0.145, 1.075, -0.004] },
    { name: 'upper_arm_r', parent: BONE.SHOULDER_R,  pos: [-0.242, 1.055, -0.005] },
    { name: 'forearm_r',   parent: BONE.UPPER_ARM_R, pos: [-0.268, 0.840, -0.006] },
    { name: 'hand_r',      parent: BONE.FOREARM_R,   pos: [-0.278, 0.650,  0.004] },
    { name: 'thigh_l',     parent: BONE.PELVIS,      pos: [ 0.118, 0.595,  0.000] },
    { name: 'shin_l',      parent: BONE.THIGH_L,     pos: [ 0.122, 0.305,  0.004] },
    { name: 'foot_l',      parent: BONE.SHIN_L,      pos: [ 0.122, 0.055,  0.000] },
    { name: 'thigh_r',     parent: BONE.PELVIS,      pos: [-0.118, 0.595,  0.000] },
    { name: 'shin_r',      parent: BONE.THIGH_R,     pos: [-0.122, 0.305,  0.004] },
    { name: 'foot_r',      parent: BONE.SHIN_R,      pos: [-0.122, 0.055,  0.000] },
  ];

  // Reserved semantic mount sockets for future optional Wardrobe / Weapon / Realm VFX systems
  const MOUNT_SOCKETS = {
    headCrown:     { bone: BONE.HEAD,      offset: [0.0,  0.430, -0.010] },
    backWeapon:    { bone: BONE.SPINE_UP,  offset: [0.0,  0.040, -0.175] },
    waistLeft:     { bone: BONE.PELVIS,    offset: [0.220, 0.040,  0.020] },
    waistRight:    { bone: BONE.PELVIS,    offset: [-0.220, 0.040, 0.020] },
    shoulderCloak: { bone: BONE.SPINE_UP,  offset: [0.0,  0.140, -0.125] },
    handRight:     { bone: BONE.HAND_R,    offset: [0.0, -0.030,  0.010] },
    handLeft:      { bone: BONE.HAND_L,    offset: [0.0, -0.030,  0.010] },
    realmAura:     { bone: BONE.PELVIS,    offset: [0.0,  0.180,  0.000] },
  };

  // Pure Solid Matte-Clay Alabaster Color (Human: Fall Flat minimalist clay doll aesthetic!)
  const CLAY_COL = [0.94, 0.945, 0.96];

  // =========================================================================
  // HIGH-RESOLUTION SMOOTH CLAY MESH BUILDER
  // Vertex layout: 20 floats/vert = pos(3), nrm(3), col(3), mat(3: rough, emissive, ao), joints(4), weights(4)
  // =========================================================================
  class SkinnedMeshBuilder {
    constructor() {
      this.verts = [];
      this.indices = [];
      this.vCount = 0;
    }

    pushVertex(x, y, z, nx, ny, nz, col, rough, emissive, ao, j0, j1 = 0, w0 = 1.0, w1 = 0.0, j2 = 0, w2 = 0.0) {
      const len = Math.hypot(nx, ny, nz) || 1;
      const sum = (w0 + w1 + w2) || 1;
      this.verts.push(
        x, y, z,
        nx / len, ny / len, nz / len,
        col[0], col[1], col[2],
        rough, emissive, ao,
        j0, j1, j2, 0.0,
        w0 / sum, w1 / sum, w2 / sum, 0.0
      );
      return this.vCount++;
    }

    pushTri(a, b, c) {
      this.indices.push(a, b, c);
    }

    _catmull(p0, p1, p2, p3, t) {
      const t2 = t * t, t3 = t2 * t;
      return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
      );
    }

    _subdivideRings(rings, subSteps) {
      if (subSteps <= 1 || rings.length < 3) return rings;
      const out = [];
      const n = rings.length;
      for (let i = 0; i < n - 1; i++) {
        const r0 = rings[Math.max(0, i - 1)];
        const r1 = rings[i];
        const r2 = rings[i + 1];
        const r3 = rings[Math.min(n - 1, i + 2)];
        const steps = (i === n - 2) ? subSteps : subSteps - 1;
        for (let s = 0; s <= steps; s++) {
          if (i < n - 2 && s === subSteps) continue;
          const t = s / subSteps;
          const ts = t * t * (3 - 2 * t);
          const cx = this._catmull(r0.cx || 0, r1.cx || 0, r2.cx || 0, r3.cx || 0, t);
          const y  = this._catmull(r0.y,       r1.y,       r2.y,       r3.y,       t);
          const cz = this._catmull(r0.cz || 0, r1.cz || 0, r2.cz || 0, r3.cz || 0, t);
          const rx = Math.max(0.002, this._catmull(r0.rx, r1.rx, r2.rx, r3.rx, t));
          const rz = Math.max(0.002, this._catmull(r0.rz, r1.rz, r2.rz, r3.rz, t));
          const ao = M.lerp(r1.ao !== undefined ? r1.ao : 1.0, r2.ao !== undefined ? r2.ao : 1.0, ts);

          const wMap = {};
          const addW = (b, w) => {
            if (b === undefined || w <= 1e-5) return;
            wMap[b] = (wMap[b] || 0) + w;
          };
          addW(r1.b0, (r1.w0 !== undefined ? r1.w0 : 1.0) * (1 - ts));
          addW(r1.b1, (r1.w1 || 0.0) * (1 - ts));
          addW(r1.b2, (r1.w2 || 0.0) * (1 - ts));
          addW(r2.b0, (r2.w0 !== undefined ? r2.w0 : 1.0) * ts);
          addW(r2.b1, (r2.w1 || 0.0) * ts);
          addW(r2.b2, (r2.w2 || 0.0) * ts);

          const pairs = Object.keys(wMap)
            .map((k) => [parseInt(k, 10), wMap[k]])
            .sort((a, b) => b[1] - a[1]);

          const p0 = pairs[0] || [0, 1];
          const p1 = pairs[1] || [p0[0], 0];
          const p2 = pairs[2] || [p0[0], 0];
          const wSum = (p0[1] + p1[1] + p2[1]) || 1;

          out.push({
            cx, y, cz, rx, rz, ao,
            col: r1.col || CLAY_COL,
            b0: p0[0], w0: p0[1] / wSum,
            b1: p1[0], w1: p1[1] / wSum,
            b2: p2[0], w2: p2[1] / wSum,
            shapeFn: (t < 0.5 ? r1.shapeFn : r2.shapeFn) || r1.shapeFn || r2.shapeFn || null,
          });
        }
      }
      return out;
    }

    addSmoothLoft(rawRings, segs = 32, subSteps = 3, rough = 0.48, capBot = true, capTop = true) {
      const rings = this._subdivideRings(rawRings, subSteps);
      const nR = rings.length;
      if (nR < 2) return;
      const reversed = rings[nR - 1].y < rings[0].y;
      const ordRings = reversed ? rings.slice().reverse() : rings;
      const useCapBot = reversed ? capTop : capBot;
      const useCapTop = reversed ? capBot : capTop;
      const grid = [];

      for (let r = 0; r < nR; r++) {
        const rg = ordRings[r];
        const row = [];
        for (let s = 0; s <= segs; s++) {
          const theta = (s / segs) * Math.PI * 2;
          const ct = Math.cos(theta), st = Math.sin(theta);
          const p = [
            (rg.cx || 0) + ct * rg.rx,
            rg.y,
            (rg.cz || 0) + st * rg.rz,
          ];
          if (rg.shapeFn) rg.shapeFn(theta, p, rg);
          row.push(p);
        }
        grid.push(row);
      }

      const stride = segs + 1;
      const baseV = this.vCount;
      for (let r = 0; r < nR; r++) {
        const rg = ordRings[r];
        const rPrev = Math.max(0, r - 1);
        const rNext = Math.min(nR - 1, r + 1);
        for (let s = 0; s <= segs; s++) {
          const sPrev = (s - 1 + segs) % segs;
          const sNext = (s + 1) % segs;
          const pL = grid[r][sPrev];
          const pR = grid[r][sNext];
          const pD = grid[rPrev][s];
          const pU = grid[rNext][s];
          const tx = pR[0] - pL[0], ty = pR[1] - pL[1], tz = pR[2] - pL[2];
          const ux = pU[0] - pD[0], uy = pU[1] - pD[1], uz = pU[2] - pD[2];
          let nx = uy * tz - uz * ty;
          let ny = uz * tx - ux * tz;
          let nz = ux * ty - uy * tx;
          const nLen = Math.hypot(nx, ny, nz);
          if (nLen < 1e-5) {
            const p = grid[r][s];
            nx = p[0] - (rg.cx || 0);
            ny = (r === nR - 1) ? 0.9 : (r === 0 ? -0.9 : 0.0);
            nz = p[2] - (rg.cz || 0);
          }
          const pos = grid[r][s];
          this.pushVertex(
            pos[0], pos[1], pos[2],
            nx, ny, nz,
            rg.col || CLAY_COL, rough, 0.0, rg.ao !== undefined ? rg.ao : 1.0,
            rg.b0, rg.b1 !== undefined ? rg.b1 : rg.b0,
            rg.w0 !== undefined ? rg.w0 : 1.0,
            rg.w1 !== undefined ? rg.w1 : 0.0,
            rg.b2 !== undefined ? rg.b2 : rg.b0,
            rg.w2 !== undefined ? rg.w2 : 0.0
          );
        }
      }

      for (let r = 0; r < nR - 1; r++) {
        for (let s = 0; s < segs; s++) {
          const a = baseV + r * stride + s;
          const b = a + stride;
          this.pushTri(a, b, a + 1);
          this.pushTri(a + 1, b, b + 1);
        }
      }

      if (useCapBot) {
        const rg = ordRings[0];
        const cIdx = this.pushVertex(
          rg.cx || 0, rg.y, rg.cz || 0, 0, -1, 0,
          rg.col || CLAY_COL, rough, 0.0, rg.ao !== undefined ? rg.ao : 0.92,
          rg.b0, rg.b1 || rg.b0, rg.w0 !== undefined ? rg.w0 : 1, rg.w1 || 0,
          rg.b2 || rg.b0, rg.w2 || 0
        );
        for (let s = 0; s < segs; s++) {
          this.pushTri(cIdx, baseV + s, baseV + s + 1);
        }
      }
      if (useCapTop) {
        const rg = ordRings[nR - 1];
        const topStart = baseV + (nR - 1) * stride;
        const cIdx = this.pushVertex(
          rg.cx || 0, rg.y, rg.cz || 0, 0, 1, 0,
          rg.col || CLAY_COL, rough, 0.0, rg.ao !== undefined ? rg.ao : 1.0,
          rg.b0, rg.b1 || rg.b0, rg.w0 !== undefined ? rg.w0 : 1, rg.w1 || 0,
          rg.b2 || rg.b0, rg.w2 || 0
        );
        for (let s = 0; s < segs; s++) {
          this.pushTri(cIdx, topStart + s + 1, topStart + s);
        }
      }
    }

    addSmoothEllipsoid(cx, cy, cz, rx, ry, rz, latSegs, lonSegs, rough, ao, b0, b1 = 0, w0 = 1, w1 = 0, rotX = 0, rotY = 0, rotZ = 0, shapeFn = null) {
      const cX = Math.cos(rotX), sX = Math.sin(rotX);
      const cY = Math.cos(rotY), sY = Math.sin(rotY);
      const cZ = Math.cos(rotZ), sZ = Math.sin(rotZ);
      const xf = (lx, ly, lz) => {
        const x1 = lx * cZ - ly * sZ, y1 = lx * sZ + ly * cZ, z1 = lz;
        const x2 = x1, y2 = y1 * cX - z1 * sX, z2 = y1 * sX + z1 * cX;
        return [cx + x2 * cY + z2 * sY, cy + y2, cz - x2 * sY + z2 * cY];
      };
      const xfN = (lx, ly, lz) => {
        const x1 = lx * cZ - ly * sZ, y1 = lx * sZ + ly * cZ, z1 = lz;
        const x2 = x1, y2 = y1 * cX - z1 * sX, z2 = y1 * sX + z1 * cX;
        return [x2 * cY + z2 * sY, y2, -x2 * sY + z2 * cY];
      };

      const pts = [];
      for (let il = 0; il <= latSegs; il++) {
        const phi = (il / latSegs) * Math.PI;
        const sp = Math.sin(phi), cp = Math.cos(phi);
        const row = [];
        for (let io = 0; io <= lonSegs; io++) {
          const theta = (io / lonSegs) * Math.PI * 2;
          const ct = Math.cos(theta), st = Math.sin(theta);
          const p = [sp * ct * rx, cp * ry, sp * st * rz];
          if (shapeFn) shapeFn(phi, theta, p);
          row.push(xf(p[0], p[1], p[2]));
        }
        pts.push(row);
      }

      const baseV = this.vCount;
      const stride = lonSegs + 1;
      for (let il = 0; il <= latSegs; il++) {
        const ilP = Math.max(0, il - 1), ilN = Math.min(latSegs, il + 1);
        for (let io = 0; io <= lonSegs; io++) {
          const ioP = (io - 1 + lonSegs) % lonSegs, ioN = (io + 1) % lonSegs;
          let nx, ny, nz;
          if (il === 0) {
            const topN = xfN(0, 1, 0);
            nx = topN[0]; ny = topN[1]; nz = topN[2];
          } else if (il === latSegs) {
            const botN = xfN(0, -1, 0);
            nx = botN[0]; ny = botN[1]; nz = botN[2];
          } else {
            const pL = pts[il][ioP], pR = pts[il][ioN];
            const pU = pts[ilP][io], pD = pts[ilN][io];
            const tx = pR[0] - pL[0], ty = pR[1] - pL[1], tz = pR[2] - pL[2];
            const vx = pD[0] - pU[0], vy = pD[1] - pU[1], vz = pD[2] - pU[2];
            nx = ty * vz - tz * vy;
            ny = tz * vx - tx * vz;
            nz = tx * vy - ty * vx;
          }
          const wp = pts[il][io];
          this.pushVertex(wp[0], wp[1], wp[2], nx, ny, nz, CLAY_COL, rough, 0.0, ao, b0, b1, w0, w1);
        }
      }

      for (let il = 0; il < latSegs; il++) {
        for (let io = 0; io < lonSegs; io++) {
          const a = baseV + il * stride + io;
          this.pushTri(a, a + 1, a + stride);
          this.pushTri(a + 1, a + stride + 1, a + stride);
        }
      }
    }

    build() {
      return {
        vertices: new Float32Array(this.verts),
        indices: new Uint32Array(this.indices),
      };
    }
  }

  // =========================================================================
  // PURE-CODE Q-VERSION HUMAN: FALL FLAT CLAY DOLL (大圆头、无脖子、无手掌脚掌、圆润无毛边!)
  // =========================================================================
  let _sharedClayMannequinMesh = null;
  function buildClayMannequinMesh() {
    if (_sharedClayMannequinMesh) return _sharedClayMannequinMesh;
    const mb = new SkinnedMeshBuilder();
    const rough = 0.46;

    // 1. Oversized Cute Smooth Clay Head (y = 1.155 .. 1.625m, sits DIRECTLY on shoulders with ZERO neck!)
    mb.addSmoothEllipsoid(
      0.0, 1.390, 0.006,
      0.225, 0.235, 0.215,
      26, 36, rough, 1.00,
      BONE.HEAD, BONE.SPINE_UP, 0.96, 0.04,
      0.0, 0.0, 0.0,
      (phi, theta, p) => {
        // Soft chubby Q-version cheek fullness & gentle flat-rounded bottom nestled seamlessly onto shoulders
        const lower = Math.max(0, -Math.cos(phi));
        p[0] *= (1.0 + Math.sin(phi) * 0.03 - lower * lower * 0.14);
        p[2] *= (1.0 - lower * lower * 0.10);
      }
    );

    // 2. Plump Chubby Q-Version Bean Torso + Pelvis (NO neck — smooth rounded shoulders directly under head!)
    mb.addSmoothLoft([
      { y: 0.515, cz:  0.000, rx: 0.042, rz: 0.036, ao: 0.88, b0: BONE.PELVIS,    w0: 1.00 },
      { y: 0.555, cz:  0.002, rx: 0.178, rz: 0.138, ao: 0.93, b0: BONE.PELVIS,    w0: 1.00 },
      { y: 0.635, cz:  0.006, rx: 0.228, rz: 0.172, ao: 0.97, b0: BONE.PELVIS,    w0: 0.92, b1: BONE.SPINE_LOW, w1: 0.08 },
      { y: 0.745, cz:  0.012, rx: 0.236, rz: 0.180, ao: 0.99, b0: BONE.SPINE_LOW, w0: 0.74, b1: BONE.PELVIS,    w1: 0.26 },
      { y: 0.880, cz:  0.010, rx: 0.232, rz: 0.174, ao: 1.00, b0: BONE.SPINE_LOW, w0: 0.45, b1: BONE.SPINE_UP,  w1: 0.55 },
      { y: 1.020, cz:  0.006, rx: 0.242, rz: 0.168, ao: 1.00, b0: BONE.SPINE_UP,  w0: 0.90, b1: BONE.SPINE_LOW, w1: 0.10 },
      { y: 1.125, cz:  0.004, rx: 0.214, rz: 0.146, ao: 0.96, b0: BONE.SPINE_UP,  w0: 1.00 },
      { y: 1.185, cz:  0.005, rx: 0.148, rz: 0.118, ao: 0.92, b0: BONE.SPINE_UP,  w0: 0.70, b1: BONE.HEAD,      w1: 0.30 },
      { y: 1.215, cz:  0.006, rx: 0.070, rz: 0.064, ao: 0.90, b0: BONE.HEAD,      w0: 0.85, b1: BONE.SPINE_UP,  w1: 0.15 },
    ], 34, 3, rough, true, true);

    // 3. Cute Stubby Rounded Clay Arms — Smooth Capsule Nubs at ends (ZERO hands/palms/fingers!)
    for (const side of [1, -1]) {
      const bSh = side === 1 ? BONE.SHOULDER_L  : BONE.SHOULDER_R;
      const bUp = side === 1 ? BONE.UPPER_ARM_L : BONE.UPPER_ARM_R;
      const bFo = side === 1 ? BONE.FOREARM_L   : BONE.FOREARM_R;
      const bHa = side === 1 ? BONE.HAND_L      : BONE.HAND_R;

      // Plump rounded deltoid shoulder cap merging torso -> arm seamlessly
      mb.addSmoothEllipsoid(
        side * 0.228, 1.055, -0.004,
        0.088, 0.086, 0.082,
        16, 24, rough, 0.96,
        bUp, BONE.SPINE_UP, 0.56, 0.44
      );

      // Stubby rounded Q-version arm tube ending cleanly at wrist (no separate hand!)
      mb.addSmoothLoft([
        { cx: side * 0.236, y: 1.072, cz: -0.004, rx: 0.078, rz: 0.076, ao: 0.95, b0: bUp, w0: 0.65, b1: bSh, w1: 0.35 },
        { cx: side * 0.250, y: 0.965, cz: -0.005, rx: 0.076, rz: 0.074, ao: 0.99, b0: bUp, w0: 1.00 },
        { cx: side * 0.266, y: 0.845, cz: -0.006, rx: 0.073, rz: 0.071, ao: 0.98, b0: bUp, w0: 0.50, b1: bFo, w1: 0.50 },
        { cx: side * 0.274, y: 0.730, cz: -0.001, rx: 0.068, rz: 0.066, ao: 1.00, b0: bFo, w0: 0.92, b1: bUp, w1: 0.08 },
        { cx: side * 0.278, y: 0.625, cz:  0.004, rx: 0.062, rz: 0.060, ao: 1.00, b0: bFo, w0: 0.80, b1: bHa, w1: 0.20 },
      ], 26, 3, rough, false, true);

      // Rounded elbow interior ball for silky-smooth bends
      mb.addSmoothEllipsoid(
        side * 0.266, 0.840, -0.006,
        0.071, 0.071, 0.071,
        12, 18, rough, 0.98,
        bUp, bFo, 0.50, 0.50
      );

      // Smooth rounded capsule arm tip (NO palm, NO fingers — pure Human: Fall Flat stub nub!)
      mb.addSmoothEllipsoid(
        side * 0.278, 0.618, 0.004,
        0.062, 0.064, 0.060,
        14, 22, rough, 1.00,
        bFo, bHa, 0.72, 0.28
      );
    }

    // 4. Cute Stubby Rounded Clay Legs — Smooth Capsule Bottoms touching EXACT y = 0.000m (ZERO feet/shoes!)
    for (const side of [1, -1]) {
      const bTh = side === 1 ? BONE.THIGH_L : BONE.THIGH_R;
      const bSh = side === 1 ? BONE.SHIN_L  : BONE.SHIN_R;
      const bFt = side === 1 ? BONE.FOOT_L  : BONE.FOOT_R;
      const lx = side * 0.120;

      // Plump rounded hip ball tucked seamlessly into pelvis
      mb.addSmoothEllipsoid(
        lx, 0.585, 0.000,
        0.098, 0.096, 0.098,
        14, 22, rough, 0.94,
        bTh, BONE.PELVIS, 0.56, 0.44
      );

      // Continuous stubby rounded leg capsule (NO protruding foot/sole!)
      mb.addSmoothLoft([
        { cx: lx, y: 0.600, cz: 0.000, rx: 0.096, rz: 0.098, ao: 0.94, b0: bTh, w0: 0.66, b1: BONE.PELVIS, w1: 0.34 },
        { cx: lx, y: 0.460, cz: 0.003, rx: 0.090, rz: 0.092, ao: 0.99, b0: bTh, w0: 1.00 },
        { cx: lx, y: 0.310, cz: 0.004, rx: 0.084, rz: 0.086, ao: 0.98, b0: bTh, w0: 0.50, b1: bSh, w1: 0.50 },
        { cx: lx, y: 0.180, cz: 0.002, rx: 0.079, rz: 0.080, ao: 1.00, b0: bSh, w0: 0.94, b1: bTh, w1: 0.06 },
        { cx: lx, y: 0.072, cz: 0.000, rx: 0.074, rz: 0.074, ao: 0.99, b0: bSh, w0: 0.82, b1: bFt, w1: 0.18 },
      ], 26, 3, rough, false, true);

      // Rounded knee ball interior
      mb.addSmoothEllipsoid(
        lx, 0.305, 0.004,
        0.082, 0.082, 0.084,
        12, 18, rough, 0.98,
        bTh, bSh, 0.50, 0.50
      );

      // Smooth rounded leg bottom nub resting cleanly at EXACT y = 0.000m (NO foot!)
      mb.addSmoothEllipsoid(
        lx, 0.068, 0.000,
        0.074, 0.068, 0.074,
        14, 22, rough, 0.98,
        bSh, bFt, 0.72, 0.28,
        0.0, 0.0, 0.0,
        (phi, theta, p) => {
          // Gently flatten extreme bottom tip at y = 0.000m so the rounded stub sits solidly without sinking
          if (p[1] < -0.060) p[1] = -0.068 + (p[1] + 0.060) * 0.25;
          if (p[1] < -0.068) p[1] = -0.068;
        }
      );
    }

    _sharedClayMannequinMesh = mb.build();
    return _sharedClayMannequinMesh;
  }

  // =========================================================================
  // OPTIONAL EXTENSION REGISTRY (Preserved for compatibility)
  // =========================================================================
  const COSMETIC_REGISTRY = {
    hair: {}, outfitTop: {}, outfitBottom: {}, boots: {}, belt: {},
    headAccessory: {}, backAccessory: {}, waistAccessory: {}, realmAura: {},
  };

  const REALM_PRESETS = {
    minimal: {
      hair: null, outfitTop: null, outfitBottom: null, boots: null, belt: null,
      headAccessory: null, backAccessory: null, waistAccessory: null, realmAura: null,
    },
  };

  // =========================================================================
  // PROTAGONIST CONTROLLER & FLUID Q-VERSION CLAY ANIMATION SYSTEM
  // =========================================================================
  class ProtagonistCharacter {
    constructor() {
      this.boneCount = BONE_COUNT;
      this.skinMatrices = new Float32Array(BONE_COUNT * 16);
      this.worldBones = [];
      this.localBones = [];
      this.animRot = [];
      this.animPos = [];
      for (let i = 0; i < BONE_COUNT; i++) {
        this.worldBones.push(M.mat4());
        this.localBones.push(M.mat4());
        this.animRot.push([0, 0, 0]);
        this.animPos.push([0, 0, 0]);
      }

      this.restOffsets = BONE_DEF.map((b) => {
        if (b.parent < 0) return [0, 0, 0];
        const pp = BONE_DEF[b.parent].pos;
        return [b.pos[0] - pp[0], b.pos[1] - pp[1], b.pos[2] - pp[2]];
      });

      this.pos = new Float32Array([0, 0, 0]);
      this.scale = 1.36; // Enlarged Q-version clay mannequin (~2.20m) so protagonist reads clearly above meadow grass & beside Spirit Beasts!
      this.yaw = 0;
      this.walkPhase = 0;
      this.blendMove = 0;
      this.blendSprint = 0;
      this.blendFly = 0;
      this.blendAir = 0;
      this.turnLean = 0;
      this.headLookYaw = 0;
      this.accelLean = 0;
      this.landingDip = 0;
      this.landingVel = 0;
      this.smoothVy = 0;
      this.prevYaw = 0;
      this.prevY = null;
      this.prevSpeed = 0;
      this.wasGrounded = true;

      this.realmId = 'minimal';
      this.slots = {
        baseBody:       { id: 'clay_chibi', mesh: buildClayMannequinMesh(), dirty: true },
        hair:           { id: null, mesh: null, dirty: false },
        outfitTop:      { id: null, mesh: null, dirty: false },
        outfitBottom:   { id: null, mesh: null, dirty: false },
        boots:          { id: null, mesh: null, dirty: false },
        belt:           { id: null, mesh: null, dirty: false },
        headAccessory:  { id: null, mesh: null, dirty: false },
        backAccessory:  { id: null, mesh: null, dirty: false },
        waistAccessory: { id: null, mesh: null, dirty: false },
        realmAura:      { id: null, mesh: null, dirty: false },
      };
      this.slotVersion = 1;
      this.blendMeditate = 0;

      this._solveSkeleton();
    }

    registerCosmetic(slotName, itemId, builderFn) {
      if (!COSMETIC_REGISTRY[slotName]) COSMETIC_REGISTRY[slotName] = {};
      COSMETIC_REGISTRY[slotName][itemId] = builderFn;
    }

    equip(slotName, itemOrBuilder) {
      if (!this.slots[slotName] || slotName === 'baseBody') return false;
      if (!itemOrBuilder) {
        this.slots[slotName].id = null;
        this.slots[slotName].mesh = null;
        this.slots[slotName].dirty = true;
        this.slotVersion++;
        return true;
      }
      let builder = null;
      let id = 'custom';
      if (typeof itemOrBuilder === 'function') builder = itemOrBuilder;
      else if (typeof itemOrBuilder === 'string') {
        id = itemOrBuilder;
        builder = COSMETIC_REGISTRY[slotName] && COSMETIC_REGISTRY[slotName][itemOrBuilder];
      }
      if (!builder) return false;
      this.slots[slotName].id = id;
      this.slots[slotName].mesh = builder(this);
      this.slots[slotName].dirty = true;
      this.slotVersion++;
      return true;
    }

    unequip(slotName) {
      return this.equip(slotName, null);
    }

    setRealmAppearance(realmId) {
      const preset = REALM_PRESETS[realmId];
      if (!preset) return false;
      this.realmId = realmId;
      for (const slotName of Object.keys(preset)) {
        this.equip(slotName, preset[slotName]);
      }
      return true;
    }

    getSlots() {
      const out = {};
      for (const k of Object.keys(this.slots)) out[k] = this.slots[k].id;
      return { realmId: this.realmId, slots: out, sockets: Object.keys(MOUNT_SOCKETS) };
    }

    getSocketWorldMatrix(socketName, out = M.mat4()) {
      const sock = MOUNT_SOCKETS[socketName];
      if (!sock) return M.m4Identity(out);
      const bm = this.worldBones[sock.bone];
      const localOff = M.m4Translate(M.mat4(), sock.offset[0], sock.offset[1], sock.offset[2]);
      return M.m4Multiply(out, bm, localOff);
    }

    // Playful, Fluid, Non-Stiff Human: Fall Flat Q-Version Animation System!
    update(dt, time, state) {
      const cdt = M.clamp(dt, 0.001, 0.05);
      const prevY = this.prevY !== null ? this.prevY : state.y;
      const rawVy = (state.y - prevY) / cdt;
      this.prevY = state.y;

      this.pos[0] = state.x;
      this.pos[1] = state.y;
      this.pos[2] = state.z;
      this.yaw = state.yaw;

      const hSpeed = state.horizontalSpeed || 0;
      const flying = !!state.flying;
      const grounded = state.grounded !== false;
      const sprinting = !!state.sprinting && hSpeed > 13.5;

      if (!this.wasGrounded && grounded && !flying && this.smoothVy < -2.2) {
        const impact = M.clamp(-this.smoothVy / 16.0, 0.20, 1.0);
        this.landingVel = Math.max(this.landingVel, impact * 8.2);
      }
      this.wasGrounded = grounded;
      const kSpring = 92.0, kDamp = 14.5;
      this.landingVel += (-kSpring * this.landingDip - kDamp * this.landingVel) * cdt;
      this.landingDip = M.clamp(this.landingDip + this.landingVel * cdt, -0.08, 0.95);
      const land = Math.max(0.0, this.landingDip);

      const kSmooth = 1 - Math.exp(-11.0 * cdt);
      const kSlow   = 1 - Math.exp(-6.5 * cdt);
      this.smoothVy = M.lerp(this.smoothVy, M.clamp(rawVy, -30, 30), kSmooth);

      const targetMove   = (!flying && grounded && !state.meditating) ? M.clamp(hSpeed / 10.5, 0, 1) : 0;
      const targetSprint = (!flying && grounded && !state.meditating && sprinting) ? M.clamp((hSpeed - 11.5) / 14.0, 0, 1) : 0;
      const targetFly    = flying ? 1 : 0;
      const targetAir    = (!flying && !grounded && !state.meditating) ? 1 : 0;
      const targetMed    = state.meditating ? 1 : 0;

      this.blendMove     = M.lerp(this.blendMove, targetMove, kSmooth);
      this.blendSprint   = M.lerp(this.blendSprint, targetSprint, kSmooth);
      this.blendFly      = M.lerp(this.blendFly, targetFly, kSmooth);
      this.blendAir      = M.lerp(this.blendAir, targetAir, kSmooth);
      this.blendMeditate = M.lerp(this.blendMeditate || 0, targetMed, 1 - Math.exp(-9.0 * cdt));

      const rawAccel = M.clamp((hSpeed - this.prevSpeed) / cdt, -24, 24);
      this.prevSpeed = hSpeed;
      this.accelLean = M.lerp(this.accelLean, rawAccel * 0.009 * (1 - this.blendFly), kSlow);

      let dyaw = ((this.yaw - this.prevYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (dyaw < -Math.PI) dyaw += Math.PI * 2;
      this.prevYaw = this.yaw;
      const yawRate = M.clamp(dyaw / cdt, -8, 8);
      const targetBank = M.clamp(yawRate * 0.058, -0.28, 0.28) * Math.max(this.blendMove, this.blendFly * 0.95);
      this.turnLean    = M.lerp(this.turnLean, targetBank, kSlow);
      this.headLookYaw = M.lerp(this.headLookYaw, M.clamp(yawRate * 0.085, -0.34, 0.34), kSlow);

      // Faster lively Q-version stride cadence matching stubby legs!
      if (this.blendMove > 0.01) {
        const strideFreq = M.lerp(7.8, 12.2, this.blendSprint);
        this.walkPhase += cdt * strideFreq * M.lerp(0.45, 1.0, this.blendMove);
      } else {
        const nearestRest = Math.round(this.walkPhase / Math.PI) * Math.PI;
        this.walkPhase = M.lerp(this.walkPhase, nearestRest, 1 - Math.exp(-5.2 * cdt));
      }

      for (let i = 0; i < BONE_COUNT; i++) {
        this.animRot[i][0] = 0; this.animRot[i][1] = 0; this.animRot[i][2] = 0;
        this.animPos[i][0] = 0; this.animPos[i][1] = 0; this.animPos[i][2] = 0;
      }

      const w = this.walkPhase;
      const sw = Math.sin(w);
      const cw = Math.cos(w);
      const cw2 = Math.cos(w * 2.0);

      const mv = this.blendMove;
      const sp = this.blendSprint;
      const fl = this.blendFly;
      const ar = this.blendAir;
      const id = M.clamp(1.0 - mv - fl - ar, 0.0, 1.0);
      const flySpd = flying ? M.clamp(hSpeed / 60.0, 0, 1) : 0;

      const breathe = Math.sin(time * 2.05);
      const weightShift = Math.sin(time * 0.85);
      const idleGlance = Math.sin(time * 0.52) * 0.13 + Math.sin(time * 0.23 + 1.3) * 0.06;

      const airRise = M.clamp(this.smoothVy / 10.0, -1.0, 1.0);
      const airUp = Math.max(0.0, airRise);
      const airDown = Math.max(0.0, -airRise);

      // 1) PELVIS: Playful Q-version waddle-bounce, weight shift & squishy landing dip!
      const walkBounce = (-cw2 * 0.5 + 0.5) * (0.042 + 0.032 * sp) * mv;
      const dropOffset = (0.018 + 0.025 * sp) * mv + land * 0.12;
      const flyHover = Math.sin(time * 2.4) * 0.095 * fl;
      this.animPos[BONE.PELVIS][1] = walkBounce - dropOffset + breathe * 0.008 * id + flyHover;
      this.animPos[BONE.PELVIS][0] = sw * (0.028 + 0.012 * sp) * mv + weightShift * 0.020 * id;

      this.animRot[BONE.PELVIS][0] = (0.05 + 0.10 * sp) * mv + land * 0.14 + (0.08 + 0.26 * flySpd) * fl - 0.10 * airUp * ar;
      this.animRot[BONE.PELVIS][1] = sw * (0.16 + 0.08 * sp) * mv + weightShift * 0.03 * id;
      this.animRot[BONE.PELVIS][2] = -cw * (0.085 + 0.035 * sp) * mv - weightShift * 0.045 * id + this.turnLean * 0.70;

      // 2) SPINE: Soft wobbly follow-through & breathing
      this.animRot[BONE.SPINE_LOW][0] = (0.06 + 0.16 * sp) * mv + this.accelLean + land * 0.18 + (0.06 + 0.20 * flySpd) * fl + (0.08 * airDown - 0.06 * airUp) * ar;
      this.animRot[BONE.SPINE_LOW][1] = -sw * (0.16 + 0.08 * sp) * mv;
      this.animRot[BONE.SPINE_LOW][2] = cw * 0.065 * mv + weightShift * 0.035 * id + this.turnLean * 0.35;

      this.animRot[BONE.SPINE_UP][0]  = 0.026 * breathe * (id + 0.5 * fl) + (0.04 + 0.09 * sp) * mv + land * 0.08 - 0.10 * fl + 0.05 * flySpd * fl;
      this.animRot[BONE.SPINE_UP][1]  = -sw * (0.10 + 0.05 * sp) * mv;
      this.animRot[BONE.SPINE_UP][2]  = cw * 0.035 * mv + this.turnLean * 0.28;

      // 3) BIG Q-HEAD: Cute lively bob & horizon-stabilized look!
      this.animRot[BONE.HEAD][0] = -0.028 * breathe * id - (0.06 + 0.16 * sp) * mv - land * 0.14 - (0.12 + 0.34 * flySpd) * fl + cw2 * 0.035 * mv;
      this.animRot[BONE.HEAD][1] = idleGlance * id + this.headLookYaw * 0.85 + sw * 0.06 * mv;
      this.animRot[BONE.HEAD][2] = -this.turnLean * 0.38 - cw * 0.045 * mv + Math.sin(time * 0.52 + 0.8) * 0.035 * id;

      // 4) STUBBY Q-LEGS: Lively bouncy stride & jump tuck (no stiff knees!)
      const legAmp = (0.62 + 0.40 * sp) * mv;
      const lSwing = sw * legAmp;
      const rSwing = -sw * legAmp;
      const lKnee = Math.pow(Math.max(0, -Math.cos(w - 0.30)), 1.2) * (0.82 + 0.42 * sp) * mv + 0.08 * mv;
      const rKnee = Math.pow(Math.max(0,  Math.cos(w - 0.30)), 1.2) * (0.82 + 0.42 * sp) * mv + 0.08 * mv;
      const landKnee = land * 0.58;

      this.animRot[BONE.THIGH_L][0] = -lSwing - 0.04 * id - landKnee * 0.55 - (0.48 * airUp + 0.22 * airDown) * ar - (0.14 + 0.12 * flySpd) * fl;
      this.animRot[BONE.THIGH_L][2] =  0.04 * id + 0.03 * mv + 0.06 * fl;
      this.animRot[BONE.SHIN_L][0]  =  lKnee  + 0.04 * id + landKnee        + (0.76 * airUp + 0.38 * airDown) * ar + (0.30 + 0.16 * flySpd) * fl;

      this.animRot[BONE.THIGH_R][0] = -rSwing - 0.04 * id - landKnee * 0.55 + (0.24 * airUp - 0.10 * airDown) * ar + (0.06 + 0.16 * flySpd) * fl;
      this.animRot[BONE.THIGH_R][2] = -0.04 * id - 0.03 * mv - 0.06 * fl;
      this.animRot[BONE.SHIN_R][0]  =  rKnee  + 0.04 * id + landKnee        + (0.26 * airUp + 0.28 * airDown) * ar + (0.16 + 0.12 * flySpd) * fl;

      // 5) STUBBY Q-ARMS: Expressive playful swing & Human: Fall Flat floppy balance!
      const armAmp = (0.58 + 0.44 * sp) * mv;
      const lArmSwing = -Math.sin(w - 0.14) * armAmp;
      const rArmSwing =  Math.sin(w - 0.14) * armAmp;
      const lLag = -Math.sin(w - 0.60) * mv;
      const rLag =  Math.sin(w - 0.60) * mv;

      this.animRot[BONE.SHOULDER_L][2] =  0.03 * breathe * id + 0.05 * ar + 0.07 * fl;
      this.animRot[BONE.SHOULDER_R][2] = -0.03 * breathe * id - 0.05 * ar - 0.07 * fl;
      this.animRot[BONE.SHOULDER_L][1] =  lArmSwing * 0.22;
      this.animRot[BONE.SHOULDER_R][1] = -rArmSwing * 0.22;

      const armOut = 0.18 + 0.06 * mv + (0.48 * airDown + 0.32 * airUp) * ar + (0.42 - 0.12 * flySpd) * fl + land * 0.22;
      this.animRot[BONE.UPPER_ARM_L][2] =  armOut + 0.02 * breathe * id;
      this.animRot[BONE.UPPER_ARM_R][2] = -armOut - 0.02 * breathe * id;

      this.animRot[BONE.UPPER_ARM_L][0] = -lArmSwing - 0.05 * id - (0.62 * airUp + 0.26 * airDown) * ar + (0.20 + 0.56 * flySpd) * fl + land * 0.20;
      this.animRot[BONE.UPPER_ARM_R][0] = -rArmSwing - 0.05 * id - (0.48 * airUp + 0.26 * airDown) * ar + (0.20 + 0.56 * flySpd) * fl + land * 0.20;

      const lElbow = 0.16 * id + (0.24 + 0.48 * sp + Math.max(0, lLag) * 0.48) * mv + (0.48 * airUp + 0.30 * airDown) * ar + (0.24 - 0.10 * flySpd) * fl + land * 0.20;
      const rElbow = 0.16 * id + (0.24 + 0.48 * sp + Math.max(0, rLag) * 0.48) * mv + (0.44 * airUp + 0.30 * airDown) * ar + (0.24 - 0.10 * flySpd) * fl + land * 0.20;
      this.animRot[BONE.FOREARM_L][0] = -lElbow;
      this.animRot[BONE.FOREARM_R][0] = -rElbow;

      // 6) SUBTLE Q-VERSION SKILL CASTING POSTURES (前摇/施放/后摇)
      const ca = state.castAnim;
      if (ca && ca.active) {
        const wBlend = ca.phase === 'windup'
          ? M.smoothstep(0, 1, ca.progress)
          : (1.0 - M.smoothstep(0, 1, ca.progress));
        if (ca.kind === 'cast_push') {
          const thrust = ca.phase === 'windup' ? -0.35 * wBlend : 1.05 * wBlend;
          this.animRot[BONE.SPINE_UP][1] += thrust * 0.26;
          this.animRot[BONE.UPPER_ARM_R][0] = M.lerp(this.animRot[BONE.UPPER_ARM_R][0], -1.25 * (ca.phase === 'windup' ? 0.35 : 1.0), wBlend * 0.85);
          this.animRot[BONE.UPPER_ARM_R][2] -= 0.18 * wBlend;
          this.animRot[BONE.FOREARM_R][0] = M.lerp(this.animRot[BONE.FOREARM_R][0], ca.phase === 'windup' ? -0.95 : -0.18, wBlend * 0.85);
        } else if (ca.kind === 'cast_stomp') {
          this.animPos[BONE.PELVIS][1] -= 0.10 * wBlend;
          this.animRot[BONE.SPINE_LOW][0] += 0.22 * wBlend;
          this.animRot[BONE.UPPER_ARM_L][2] += 0.55 * wBlend;
          this.animRot[BONE.UPPER_ARM_R][2] -= 0.55 * wBlend;
        } else if (ca.kind === 'cast_meditate') {
          this.animRot[BONE.UPPER_ARM_L][0] = M.lerp(this.animRot[BONE.UPPER_ARM_L][0], -0.82, wBlend * 0.8);
          this.animRot[BONE.UPPER_ARM_R][0] = M.lerp(this.animRot[BONE.UPPER_ARM_R][0], -0.82, wBlend * 0.8);
          this.animRot[BONE.UPPER_ARM_L][2] -= 0.24 * wBlend;
          this.animRot[BONE.UPPER_ARM_R][2] += 0.24 * wBlend;
          this.animRot[BONE.FOREARM_L][0] = M.lerp(this.animRot[BONE.FOREARM_L][0], -0.85, wBlend * 0.8);
          this.animRot[BONE.FOREARM_R][0] = M.lerp(this.animRot[BONE.FOREARM_R][0], -0.85, wBlend * 0.8);
        } else if (ca.kind === 'dash') {
          this.animRot[BONE.SPINE_LOW][0] += 0.34 * wBlend;
          this.animRot[BONE.UPPER_ARM_L][0] += 0.55 * wBlend;
          this.animRot[BONE.UPPER_ARM_R][0] += 0.55 * wBlend;
        }
      }

      // 7) CROSS-LEGGED MEDITATION POSTURE ON SPIRIT PLATFORM (灵台盘腿打坐 · 双手结印 · 吐纳微息)
      const med = this.blendMeditate || 0;
      if (med > 0.005) {
        const medBreathe = Math.sin(time * 1.55);
        // Drop pelvis smoothly down onto the meditation cushion with gentle Qi breathing lift
        this.animPos[BONE.PELVIS][0] = M.lerp(this.animPos[BONE.PELVIS][0], 0.0, med);
        this.animPos[BONE.PELVIS][1] = M.lerp(this.animPos[BONE.PELVIS][1], -0.38 + medBreathe * 0.015, med);
        this.animRot[BONE.PELVIS][0] = M.lerp(this.animRot[BONE.PELVIS][0], 0.0, med);
        this.animRot[BONE.PELVIS][1] = M.lerp(this.animRot[BONE.PELVIS][1], 0.0, med);
        this.animRot[BONE.PELVIS][2] = M.lerp(this.animRot[BONE.PELVIS][2], 0.0, med);

        // Serene straight spine & lightly bowed meditative head
        this.animRot[BONE.SPINE_LOW][0] = M.lerp(this.animRot[BONE.SPINE_LOW][0], -0.02, med);
        this.animRot[BONE.SPINE_LOW][1] = M.lerp(this.animRot[BONE.SPINE_LOW][1], 0.0, med);
        this.animRot[BONE.SPINE_LOW][2] = M.lerp(this.animRot[BONE.SPINE_LOW][2], 0.0, med);
        this.animRot[BONE.SPINE_UP][0]  = M.lerp(this.animRot[BONE.SPINE_UP][0],  0.028 * medBreathe, med);
        this.animRot[BONE.SPINE_UP][1]  = M.lerp(this.animRot[BONE.SPINE_UP][1],  0.0, med);
        this.animRot[BONE.SPINE_UP][2]  = M.lerp(this.animRot[BONE.SPINE_UP][2],  0.0, med);
        this.animRot[BONE.HEAD][0]      = M.lerp(this.animRot[BONE.HEAD][0],      0.08 + 0.022 * medBreathe, med);
        this.animRot[BONE.HEAD][1]      = M.lerp(this.animRot[BONE.HEAD][1],      0.0, med);
        this.animRot[BONE.HEAD][2]      = M.lerp(this.animRot[BONE.HEAD][2],      0.0, med);

        // Crossed Lotus Legs (盘膝打坐: thighs lifted forward & splayed outward, shins folded inward across lap!)
        this.animRot[BONE.THIGH_L][0] = M.lerp(this.animRot[BONE.THIGH_L][0], -1.32, med);
        this.animRot[BONE.THIGH_L][1] = M.lerp(this.animRot[BONE.THIGH_L][1],  0.58, med);
        this.animRot[BONE.THIGH_L][2] = M.lerp(this.animRot[BONE.THIGH_L][2],  0.26, med);
        this.animRot[BONE.SHIN_L][0]  = M.lerp(this.animRot[BONE.SHIN_L][0],   1.76, med);
        this.animRot[BONE.SHIN_L][1]  = M.lerp(this.animRot[BONE.SHIN_L][1],  -0.36, med);
        this.animRot[BONE.SHIN_L][2]  = M.lerp(this.animRot[BONE.SHIN_L][2],  -0.56, med);

        this.animRot[BONE.THIGH_R][0] = M.lerp(this.animRot[BONE.THIGH_R][0], -1.32, med);
        this.animRot[BONE.THIGH_R][1] = M.lerp(this.animRot[BONE.THIGH_R][1], -0.58, med);
        this.animRot[BONE.THIGH_R][2] = M.lerp(this.animRot[BONE.THIGH_R][2], -0.26, med);
        this.animRot[BONE.SHIN_R][0]  = M.lerp(this.animRot[BONE.SHIN_R][0],   1.76, med);
        this.animRot[BONE.SHIN_R][1]  = M.lerp(this.animRot[BONE.SHIN_R][1],   0.36, med);
        this.animRot[BONE.SHIN_R][2]  = M.lerp(this.animRot[BONE.SHIN_R][2],   0.56, med);

        // Relaxed arms resting forward with hands in serene Daoist mudra on knees / dantian!
        this.animRot[BONE.SHOULDER_L][2]  = M.lerp(this.animRot[BONE.SHOULDER_L][2],  0.04 + 0.015 * medBreathe, med);
        this.animRot[BONE.SHOULDER_R][2]  = M.lerp(this.animRot[BONE.SHOULDER_R][2], -0.04 - 0.015 * medBreathe, med);
        this.animRot[BONE.UPPER_ARM_L][0] = M.lerp(this.animRot[BONE.UPPER_ARM_L][0], -0.44, med);
        this.animRot[BONE.UPPER_ARM_L][2] = M.lerp(this.animRot[BONE.UPPER_ARM_L][2],  0.26, med);
        this.animRot[BONE.FOREARM_L][0]   = M.lerp(this.animRot[BONE.FOREARM_L][0],   -0.96, med);
        this.animRot[BONE.FOREARM_L][2]   = M.lerp(this.animRot[BONE.FOREARM_L][2],   -0.44, med);

        this.animRot[BONE.UPPER_ARM_R][0] = M.lerp(this.animRot[BONE.UPPER_ARM_R][0], -0.44, med);
        this.animRot[BONE.UPPER_ARM_R][2] = M.lerp(this.animRot[BONE.UPPER_ARM_R][2], -0.26, med);
        this.animRot[BONE.FOREARM_R][0]   = M.lerp(this.animRot[BONE.FOREARM_R][0],   -0.96, med);
        this.animRot[BONE.FOREARM_R][2]   = M.lerp(this.animRot[BONE.FOREARM_R][2],    0.44, med);
      }

      this._solveSkeleton();
    }

    _solveSkeleton() {
      const sc = this.scale || 1.0;
      M.m4ComposeTRS(this.worldBones[0], this.pos[0], this.pos[1], this.pos[2], 0, this.yaw + Math.PI, 0, sc, sc, sc);

      for (let i = 1; i < BONE_COUNT; i++) {
        const def = BONE_DEF[i];
        const off = this.restOffsets[i];
        const ap = this.animPos[i];
        const ar = this.animRot[i];
        M.m4ComposeTRS(
          this.localBones[i],
          off[0] + ap[0], off[1] + ap[1], off[2] + ap[2],
          ar[0], ar[1], ar[2],
          1, 1, 1
        );
        M.m4Multiply(this.worldBones[i], this.worldBones[def.parent], this.localBones[i]);
      }

      for (let i = 0; i < BONE_COUNT; i++) {
        const wb = this.worldBones[i];
        const bp = BONE_DEF[i].pos;
        const o = i * 16;
        for (let k = 0; k < 12; k++) this.skinMatrices[o + k] = wb[k];
        this.skinMatrices[o + 12] = wb[12] - (wb[0] * bp[0] + wb[4] * bp[1] + wb[8]  * bp[2]);
        this.skinMatrices[o + 13] = wb[13] - (wb[1] * bp[0] + wb[5] * bp[1] + wb[9]  * bp[2]);
        this.skinMatrices[o + 14] = wb[14] - (wb[2] * bp[0] + wb[6] * bp[1] + wb[10] * bp[2]);
        this.skinMatrices[o + 15] = 1.0;
      }
    }
  }

  XW.Character = {
    BONE,
    BONE_COUNT,
    MOUNT_SOCKETS,
    SkinnedMeshBuilder,
    ProtagonistCharacter,
    getSharedBaseMesh: buildClayMannequinMesh,
    createProtagonist() {
      return new ProtagonistCharacter();
    },
  };
})(window);
