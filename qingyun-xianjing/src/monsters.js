(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;

  // =========================================================
  // 1. PURE-CODE MONSTER MESH BUILDER (12 floats/vert: pos3, nrm3, col3, meta3)
  //    meta.x = roughness, meta.y = emissive, meta.z = partId (0..6 for procedural animation!)
  // =========================================================
  class MonsterMeshBuilder {
    constructor() {
      this.verts = [];
      this.indices = [];
      this.vCount = 0;
    }

    pushVert(x, y, z, nx, ny, nz, r, g, b, rough = 0.65, emissive = 0.0, partId = 0.0) {
      const len = Math.hypot(nx, ny, nz) || 1.0;
      this.verts.push(x, y, z, nx / len, ny / len, nz / len, r, g, b, rough, emissive, partId);
      return this.vCount++;
    }

    addTri(a, b, c) {
      this.indices.push(a, b, c);
    }

    addQuad(a, b, c, d) {
      this.indices.push(a, b, c, a, c, d);
    }

    _rotVec(x, y, z, rx, ry, rz) {
      let x1 = x, y1 = y, z1 = z;
      if (rx) {
        const c = Math.cos(rx), s = Math.sin(rx);
        const ny = y1 * c - z1 * s;
        const nz = y1 * s + z1 * c;
        y1 = ny; z1 = nz;
      }
      if (rz) {
        const c = Math.cos(rz), s = Math.sin(rz);
        const nx = x1 * c - y1 * s;
        const ny = x1 * s + y1 * c;
        x1 = nx; y1 = ny;
      }
      if (ry) {
        const c = Math.cos(ry), s = Math.sin(ry);
        const nx = x1 * c + z1 * s;
        const nz = -x1 * s + z1 * c;
        x1 = nx; z1 = nz;
      }
      return [x1, y1, z1];
    }

    addEllipsoid(opts) {
      const cx = opts.cx || 0, cy = opts.cy || 0, cz = opts.cz || 0;
      const rx = opts.rx || 0.5, ry = opts.ry || 0.5, rz = opts.rz || 0.5;
      const rotX = opts.rotX || 0, rotY = opts.rotY || 0, rotZ = opts.rotZ || 0;
      const uSegs = opts.uSegs || 16;
      const vSegs = opts.vSegs || 12;
      const col = opts.col || [0.7, 0.7, 0.7];
      const topCol = opts.topCol || col;
      const botCol = opts.botCol || col;
      const rough = opts.rough !== undefined ? opts.rough : 0.65;
      const emissive = opts.emissive || 0.0;
      const partId = opts.partId || 0.0;
      const flatBottom = opts.flatBottom || 0.0;
      const ribs = opts.ribs || 0;
      const ribAmp = opts.ribAmp || 0.0;
      const ribCol = opts.ribCol || null;
      const rockSeed = opts.rockSeed || 0;

      const base = this.vCount;
      const stride = uSegs + 1;

      for (let iv = 0; iv <= vSegs; iv++) {
        const v = iv / vSegs;
        const phi = v * Math.PI;
        const sinP = Math.sin(phi);
        const cosP = Math.cos(phi);
        for (let iu = 0; iu <= uSegs; iu++) {
          const u = iu / uSegs;
          const theta = u * Math.PI * 2;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);

          let radMod = 1.0;
          let ribVal = 0.0;
          if (ribs > 0) {
            ribVal = 0.5 + 0.5 * Math.cos(theta * ribs);
            radMod += (ribVal - 0.5) * 2.0 * ribAmp * Math.pow(sinP, 0.75);
          }
          if (rockSeed !== 0) {
            const w1 = Math.sin(theta * 3.0 + rockSeed) * Math.cos(phi * 2.0 - rockSeed * 0.7);
            const w2 = Math.cos(theta * 5.0 - rockSeed * 1.3) * Math.sin(phi * 3.0 + rockSeed);
            radMod += (w1 * 0.11 + w2 * 0.065);
          }

          let lx = rx * sinP * cosT * radMod;
          let ly = ry * cosP * radMod;
          let lz = rz * sinP * sinT * radMod;
          if (flatBottom > 0 && ly < 0) {
            ly *= (1.0 - flatBottom);
          }

          let nx = sinP * cosT / Math.max(rx, 0.02);
          let ny = cosP / Math.max(ry, 0.02);
          let nz = sinP * sinT / Math.max(rz, 0.02);
          if (ribs > 0) {
            const dRib = -Math.sin(theta * ribs) * ribAmp * 1.4;
            nx += -sinT * dRib;
            nz += cosT * dRib;
          }

          const rp = this._rotVec(lx, ly, lz, rotX, rotY, rotZ);
          const rn = this._rotVec(nx, ny, nz, rotX, rotY, rotZ);

          let r, g, b;
          const hMix = cosP * 0.5 + 0.5;
          if (hMix >= 0.5) {
            const t = (hMix - 0.5) * 2.0;
            r = M.lerp(col[0], topCol[0], t);
            g = M.lerp(col[1], topCol[1], t);
            b = M.lerp(col[2], topCol[2], t);
          } else {
            const t = hMix * 2.0;
            r = M.lerp(botCol[0], col[0], t);
            g = M.lerp(botCol[1], col[1], t);
            b = M.lerp(botCol[2], col[2], t);
          }
          if (ribCol && ribs > 0) {
            const stripe = M.smoothstep(0.32, 0.84, ribVal) * Math.pow(sinP, 0.5);
            r = M.lerp(r, ribCol[0], stripe * 0.68);
            g = M.lerp(g, ribCol[1], stripe * 0.68);
            b = M.lerp(b, ribCol[2], stripe * 0.68);
          }

          this.pushVert(cx + rp[0], cy + rp[1], cz + rp[2], rn[0], rn[1], rn[2], r, g, b, rough, emissive, partId);
        }
      }

      for (let iv = 0; iv < vSegs; iv++) {
        for (let iu = 0; iu < uSegs; iu++) {
          const a = base + iv * stride + iu;
          const b = a + 1;
          const c = a + stride;
          const d = c + 1;
          this.addTri(a, c, b);
          this.addTri(b, c, d);
        }
      }
    }

    // Oriented Box / Slab / Pillar / Armor Plate / Talisman Strip
    addBox(opts) {
      const cx = opts.cx || 0, cy = opts.cy || 0, cz = opts.cz || 0;
      const hx = opts.hx || 0.2, hy = opts.hy || 0.2, hz = opts.hz || 0.2;
      const rotX = opts.rotX || 0, rotY = opts.rotY || 0, rotZ = opts.rotZ || 0;
      const col = opts.col || [0.6, 0.6, 0.6];
      const topCol = opts.topCol || col;
      const botCol = opts.botCol || col;
      const rough = opts.rough !== undefined ? opts.rough : 0.62;
      const emissive = opts.emissive || 0.0;
      const partId = opts.partId || 0.0;

      const faces = [
        { n: [ 0,  0,  1], v: [[-hx,-hy, hz], [ hx,-hy, hz], [ hx, hy, hz], [-hx, hy, hz]] },
        { n: [ 0,  0, -1], v: [[ hx,-hy,-hz], [-hx,-hy,-hz], [-hx, hy,-hz], [ hx, hy,-hz]] },
        { n: [ 1,  0,  0], v: [[ hx,-hy, hz], [ hx,-hy,-hz], [ hx, hy,-hz], [ hx, hy, hz]] },
        { n: [-1,  0,  0], v: [[-hx,-hy,-hz], [-hx,-hy, hz], [-hx, hy, hz], [-hx, hy,-hz]] },
        { n: [ 0,  1,  0], v: [[-hx, hy, hz], [ hx, hy, hz], [ hx, hy,-hz], [-hx, hy,-hz]] },
        { n: [ 0, -1,  0], v: [[-hx,-hy,-hz], [ hx,-hy,-hz], [ hx,-hy, hz], [-hx,-hy, hz]] },
      ];

      for (const f of faces) {
        const rn = this._rotVec(f.n[0], f.n[1], f.n[2], rotX, rotY, rotZ);
        const base = this.vCount;
        for (const pt of f.v) {
          const rp = this._rotVec(pt[0], pt[1], pt[2], rotX, rotY, rotZ);
          const c = pt[1] > 0 ? topCol : (pt[1] < 0 ? botCol : col);
          this.pushVert(cx + rp[0], cy + rp[1], cz + rp[2], rn[0], rn[1], rn[2], c[0], c[1], c[2], rough, emissive, partId);
        }
        this.addQuad(base, base + 1, base + 2, base + 3);
      }
    }

    // Smooth Torus / Halo / Array Ring / Collar
    addTorus(opts) {
      const cx = opts.cx || 0, cy = opts.cy || 0, cz = opts.cz || 0;
      const majorR = opts.majorR || 0.65;
      const minorR = opts.minorR || 0.045;
      const rotX = opts.rotX || 0, rotY = opts.rotY || 0, rotZ = opts.rotZ || 0;
      const segs = opts.segs || 28;
      const tubeSegs = opts.tubeSegs || 8;
      const col = opts.col || [0.9, 0.78, 0.36];
      const rough = opts.rough !== undefined ? opts.rough : 0.35;
      const emissive = opts.emissive || 0.0;
      const partId = opts.partId || 0.0;

      const base = this.vCount;
      const stride = tubeSegs + 1;
      for (let i = 0; i <= segs; i++) {
        const u = (i / segs) * Math.PI * 2;
        const cu = Math.cos(u), su = Math.sin(u);
        for (let j = 0; j <= tubeSegs; j++) {
          const v = (j / tubeSegs) * Math.PI * 2;
          const cv = Math.cos(v), sv = Math.sin(v);
          const r = majorR + minorR * cv;
          const lx = r * cu;
          const ly = minorR * sv;
          const lz = r * su;
          const nx = cv * cu;
          const ny = sv;
          const nz = cv * su;
          const rp = this._rotVec(lx, ly, lz, rotX, rotY, rotZ);
          const rn = this._rotVec(nx, ny, nz, rotX, rotY, rotZ);
          this.pushVert(cx + rp[0], cy + rp[1], cz + rp[2], rn[0], rn[1], rn[2], col[0], col[1], col[2], rough, emissive, partId);
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

    // Curved Multi-Segment Organic Tube [{p:[x,y,z], r, col}]
    addTube(pts, segs = 8, rough = 0.65, emissive = 0.0, partId = 0.0) {
      const n = pts.length;
      if (n < 2) return;
      const base = this.vCount;
      const stride = segs + 1;
      for (let i = 0; i < n; i++) {
        const cur = pts[i];
        const prev = pts[Math.max(0, i - 1)].p;
        const next = pts[Math.min(n - 1, i + 1)].p;
        let ax = next[0] - prev[0], ay = next[1] - prev[1], az = next[2] - prev[2];
        const al = Math.hypot(ax, ay, az) || 1.0;
        ax /= al; ay /= al; az /= al;
        const ref = Math.abs(ay) < 0.88 ? [0, 1, 0] : [1, 0, 0];
        let tx = ref[1] * az - ref[2] * ay;
        let ty = ref[2] * ax - ref[0] * az;
        let tz = ref[0] * ay - ref[1] * ax;
        const tl = Math.hypot(tx, ty, tz) || 1.0;
        tx /= tl; ty /= tl; tz /= tl;
        const bx = ay * tz - az * ty;
        const by = az * tx - ax * tz;
        const bz = ax * ty - ay * tx;

        for (let j = 0; j <= segs; j++) {
          const ang = (j / segs) * Math.PI * 2;
          const c = Math.cos(ang), s = Math.sin(ang);
          const nx = tx * c + bx * s;
          const ny = ty * c + by * s;
          const nz = tz * c + bz * s;
          this.pushVert(
            cur.p[0] + nx * cur.r, cur.p[1] + ny * cur.r, cur.p[2] + nz * cur.r,
            nx, ny, nz,
            cur.col[0], cur.col[1], cur.col[2],
            rough, emissive, partId
          );
        }
      }
      for (let i = 0; i < n - 1; i++) {
        const r0 = base + i * stride;
        const r1 = r0 + stride;
        for (let j = 0; j < segs; j++) {
          this.addQuad(r0 + j, r1 + j, r1 + j + 1, r0 + j + 1);
        }
      }
    }

    addCone(p0, p1, r0, r1, segs, col0, col1, rough = 0.62, emissive = 0.0, partId = 0.0) {
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
      const len = Math.hypot(dx, dy, dz) || 1.0;
      const ax = dx / len, ay = dy / len, az = dz / len;
      const up = Math.abs(ay) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let tx = up[1] * az - up[2] * ay;
      let ty = up[2] * ax - up[0] * az;
      let tz = up[0] * ay - up[1] * ax;
      const tl = Math.hypot(tx, ty, tz) || 1.0;
      tx /= tl; ty /= tl; tz /= tl;
      const bx = ay * tz - az * ty;
      const by = az * tx - ax * tz;
      const bz = ax * ty - ay * tx;

      const base = this.vCount;
      for (let i = 0; i <= segs; i++) {
        const ang = (i / segs) * Math.PI * 2;
        const c = Math.cos(ang), s = Math.sin(ang);
        const nx = tx * c + bx * s;
        const ny = ty * c + by * s;
        const nz = tz * c + bz * s;
        this.pushVert(
          p0[0] + nx * r0, p0[1] + ny * r0, p0[2] + nz * r0,
          nx, ny, nz, col0[0], col0[1], col0[2], rough, emissive, partId
        );
        this.pushVert(
          p1[0] + nx * r1, p1[1] + ny * r1, p1[2] + nz * r1,
          nx * 0.85 + ax * 0.4, ny * 0.85 + ay * 0.4, nz * 0.85 + az * 0.4,
          col1[0], col1[1], col1[2], rough, emissive, partId
        );
      }
      for (let i = 0; i < segs; i++) {
        const a = base + i * 2;
        this.addQuad(a, a + 2, a + 3, a + 1);
      }
    }

    addCurvedBlade(pts, sideSegs = 2, rough = 0.55, emissive = 0.0, partId = 0.0) {
      const n = pts.length;
      if (n < 2) return;
      const base = this.vCount;
      const ringW = 4;
      for (let i = 0; i < n; i++) {
        const cur = pts[i];
        const prev = pts[Math.max(0, i - 1)].p;
        const next = pts[Math.min(n - 1, i + 1)].p;
        let fx = next[0] - prev[0], fy = next[1] - prev[1], fz = next[2] - prev[2];
        const fl = Math.hypot(fx, fy, fz) || 1.0;
        fx /= fl; fy /= fl; fz /= fl;

        const ref = cur.up || (Math.abs(fy) < 0.88 ? [0, 1, 0] : [0, 0, 1]);
        let rx = fy * ref[2] - fz * ref[1];
        let ry = fz * ref[0] - fx * ref[2];
        let rz = fx * ref[1] - fy * ref[0];
        const rl = Math.hypot(rx, ry, rz) || 1.0;
        rx /= rl; ry /= rl; rz /= rl;
        const ux = ry * fz - rz * fy;
        const uy = rz * fx - rx * fz;
        const uz = rx * fy - ry * fx;

        const w = cur.w;
        const th = cur.t;
        const c = cur.col;
        const offsets = [
          [ux * th,  uy * th,  uz * th,  ux,  uy,  uz],
          [rx * w,   ry * w,   rz * w,   rx,  ry,  rz],
          [-ux * th, -uy * th, -uz * th, -ux, -uy, -uz],
          [-rx * w,  -ry * w,  -rz * w,  -rx, -ry, -rz],
        ];
        for (let k = 0; k < ringW; k++) {
          const o = offsets[k];
          this.pushVert(
            cur.p[0] + o[0], cur.p[1] + o[1], cur.p[2] + o[2],
            o[3], o[4], o[5],
            c[0], c[1], c[2], rough, emissive, partId
          );
        }
      }
      for (let i = 0; i < n - 1; i++) {
        const r0 = base + i * ringW;
        const r1 = r0 + ringW;
        for (let k = 0; k < ringW; k++) {
          const kn = (k + 1) % ringW;
          this.addQuad(r0 + k, r1 + k, r1 + kn, r0 + kn);
        }
      }
    }

    addCrystal(cx, cy, cz, rx, ry, rz, sides, col, coreCol, emissive = 0.72, partId = 4.0, rotX = 0, rotY = 0, rotZ = 0) {
      const topR = this._rotVec(0, ry, 0, rotX, rotY, rotZ);
      const botR = this._rotVec(0, -ry, 0, rotX, rotY, rotZ);
      const topN = this._rotVec(0, 1, 0, rotX, rotY, rotZ);
      const botN = this._rotVec(0, -1, 0, rotX, rotY, rotZ);
      const topIdx = this.pushVert(cx + topR[0], cy + topR[1], cz + topR[2], topN[0], topN[1], topN[2], coreCol[0], coreCol[1], coreCol[2], 0.16, emissive * 1.15, partId);
      const botIdx = this.pushVert(cx + botR[0], cy + botR[1], cz + botR[2], botN[0], botN[1], botN[2], col[0], col[1], col[2], 0.20, emissive * 0.90, partId);
      const ring = [];
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const rp = this._rotVec(ca * rx, 0, sa * rz, rotX, rotY, rotZ);
        const rn = this._rotVec(ca, 0.14, sa, rotX, rotY, rotZ);
        ring.push(this.pushVert(
          cx + rp[0], cy + rp[1], cz + rp[2],
          rn[0], rn[1], rn[2],
          col[0], col[1], col[2], 0.20, emissive, partId
        ));
      }
      for (let i = 0; i < sides; i++) {
        const n = (i + 1) % sides;
        this.addTri(topIdx, ring[n], ring[i]);
        this.addTri(botIdx, ring[i], ring[n]);
      }
    }

    alignBottom(targetMinY = 0.0) {
      let minY = Infinity;
      for (let i = 1; i < this.verts.length; i += 12) {
        if (this.verts[i] < minY) minY = this.verts[i];
      }
      if (!isFinite(minY)) return;
      const dy = targetMinY - minY;
      for (let i = 1; i < this.verts.length; i += 12) {
        this.verts[i] += dy;
      }
    }

    build() {
      return {
        vertices: new Float32Array(this.verts),
        indices: this.vCount > 65534 ? new Uint32Array(this.indices) : new Uint16Array(this.indices),
      };
    }
  }

  // =========================================================
  // 2. ENRICHED PURE-CODE MESHES — 8 QI-REFINING MONSTERS (练气期, High Detail!)
  // =========================================================

  // 0) 青草团精 (低云平原): 扁圆嫩绿草团 + 环绕叶裙 + 露珠灵光 + 头顶两片带脉小嫩叶与嫩芽
  function buildGrassSlimeMesh() {
    const b = new MonsterMeshBuilder();
    // Main plump ribbed grass-blob body
    b.addEllipsoid({
      cx: 0, cy: 0.48, cz: 0,
      rx: 0.76, ry: 0.50, rz: 0.74,
      uSegs: 24, vSegs: 16,
      col: [0.34, 0.74, 0.26],
      topCol: [0.58, 0.90, 0.36],
      botCol: [0.16, 0.44, 0.16],
      ribs: 8, ribAmp: 0.032, ribCol: [0.46, 0.84, 0.30],
      flatBottom: 0.28,
      rough: 0.52, partId: 0.0,
    });
    // Layered grassy petal skirt ringing the lower rim
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      b.addCurvedBlade([
        { p: [ca * 0.56, 0.16, sa * 0.56], w: 0.12, t: 0.025, col: [0.22, 0.52, 0.18] },
        { p: [ca * 0.78, 0.22, sa * 0.78], w: 0.11, t: 0.020, col: [0.36, 0.74, 0.26] },
        { p: [ca * 0.92, 0.12, sa * 0.92], w: 0.02, t: 0.008, col: [0.52, 0.86, 0.34] },
      ], 2, 0.55, 0.0, 0.0);
    }
    // Mottled bright moss spots + glossy dewdrops on dome
    const spots = [[-0.45, 0.72, 0.28], [0.48, 0.68, -0.22], [-0.22, 0.82, -0.44], [0.32, 0.78, 0.36]];
    for (const sp of spots) {
      b.addEllipsoid({ cx: sp[0], cy: sp[1], cz: sp[2], rx: 0.10, ry: 0.05, rz: 0.10, uSegs: 8, vSegs: 6, col: [0.62, 0.92, 0.42], rough: 0.22, partId: 0.0 });
    }
    // Expressive eyes with white catchlights & soft rosy leaf-blush cheeks
    b.addEllipsoid({ cx: -0.24, cy: 0.52, cz: 0.68, rx: 0.075, ry: 0.095, rz: 0.055, uSegs: 10, vSegs: 8, col: [0.08, 0.12, 0.08], rough: 0.12, partId: 0.0 });
    b.addEllipsoid({ cx:  0.24, cy: 0.52, cz: 0.68, rx: 0.075, ry: 0.095, rz: 0.055, uSegs: 10, vSegs: 8, col: [0.08, 0.12, 0.08], rough: 0.12, partId: 0.0 });
    b.addEllipsoid({ cx: -0.21, cy: 0.56, cz: 0.725, rx: 0.024, ry: 0.026, rz: 0.018, uSegs: 6, vSegs: 6, col: [0.96, 1.0, 0.94], rough: 0.1, emissive: 0.25, partId: 0.0 });
    b.addEllipsoid({ cx:  0.27, cy: 0.56, cz: 0.725, rx: 0.024, ry: 0.026, rz: 0.018, uSegs: 6, vSegs: 6, col: [0.96, 1.0, 0.94], rough: 0.1, emissive: 0.25, partId: 0.0 });
    b.addEllipsoid({ cx: -0.40, cy: 0.42, cz: 0.61, rx: 0.085, ry: 0.048, rz: 0.04, uSegs: 8, vSegs: 6, col: [0.78, 0.56, 0.46], rough: 0.6, partId: 0.0 });
    b.addEllipsoid({ cx:  0.40, cy: 0.42, cz: 0.61, rx: 0.085, ry: 0.048, rz: 0.04, uSegs: 8, vSegs: 6, col: [0.78, 0.56, 0.46], rough: 0.6, partId: 0.0 });
    // Crown stem collar + twin detailed curved tender leaves + tiny glowing spirit dewdrop pearl!
    b.addEllipsoid({ cx: 0, cy: 0.94, cz: 0, rx: 0.15, ry: 0.07, rz: 0.15, uSegs: 10, vSegs: 6, col: [0.24, 0.58, 0.20], rough: 0.55, partId: 3.0 });
    b.addCone([0, 0.92, 0], [0, 1.18, 0.02], 0.065, 0.036, 8, [0.24, 0.58, 0.18], [0.44, 0.80, 0.26], 0.55, 0.0, 3.0);
    // Tiny glowing dew pearl cradled between the two leaves
    b.addEllipsoid({ cx: 0, cy: 1.24, cz: 0.04, rx: 0.068, ry: 0.078, rz: 0.068, uSegs: 10, vSegs: 8, col: [0.68, 0.98, 0.72], topCol: [0.90, 1.0, 0.92], rough: 0.12, emissive: 0.42, partId: 4.0 });
    const leafColA = [0.40, 0.82, 0.28];
    const leafColB = [0.72, 0.96, 0.44];
    b.addCurvedBlade([
      { p: [0.00, 1.14, 0.01], w: 0.045, t: 0.022, col: leafColA },
      { p: [-0.18, 1.38, 0.05], w: 0.165, t: 0.026, col: leafColA },
      { p: [-0.42, 1.48, 0.08], w: 0.175, t: 0.022, col: leafColB },
      { p: [-0.64, 1.38, 0.05], w: 0.092, t: 0.015, col: leafColB },
      { p: [-0.76, 1.26, 0.02], w: 0.014, t: 0.008, col: leafColB },
    ], 2, 0.42, 0.06, 3.0);
    b.addCurvedBlade([
      { p: [0.00, 1.14, 0.01], w: 0.045, t: 0.022, col: leafColA },
      { p: [0.19, 1.40, -0.02], w: 0.155, t: 0.026, col: leafColA },
      { p: [0.43, 1.50, -0.05], w: 0.168, t: 0.022, col: leafColB },
      { p: [0.63, 1.41, -0.03], w: 0.088, t: 0.015, col: leafColB },
      { p: [0.74, 1.30, -0.01], w: 0.014, t: 0.008, col: leafColB },
    ], 2, 0.42, 0.06, 3.0);
    // Braided grass-vine crown ring + central leaf midrib veins + curling tender shoot + 4 stubby grass paws!
    b.addTorus({ cx: 0, cy: 0.78, cz: 0, majorR: 0.54, minorR: 0.028, rotX: 0.08, segs: 20, tubeSegs: 6, col: [0.54, 0.88, 0.34], rough: 0.48, partId: 0.0 });
    b.addTube([
      { p: [0, 1.16, 0.02], r: 0.024, col: leafColB },
      { p: [0.04, 1.36, 0.14], r: 0.018, col: leafColB },
      { p: [0.10, 1.44, 0.06], r: 0.010, col: [0.84, 1.0, 0.56] },
    ], 6, 0.36, 0.18, 3.0);
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      b.addEllipsoid({ cx: s * 0.36, cy: 0.08, cz:  0.42, rx: 0.12, ry: 0.07, rz: 0.15, uSegs: 8, vSegs: 6, col: [0.22, 0.54, 0.18], rough: 0.65, partId: pid });
      b.addEllipsoid({ cx: s * 0.38, cy: 0.08, cz: -0.36, rx: 0.12, ry: 0.07, rz: 0.14, uSegs: 8, vSegs: 6, col: [0.20, 0.48, 0.16], rough: 0.65, partId: pid });
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 1) 赤尾野兔妖 (低云平原): 圆滚滚灰白小兔 + 蓬松颈毛颊毛 + 灵动长耳 + 烈焰赤红尾簇
  function buildRedtailRabbitMesh() {
    const b = new MonsterMeshBuilder();
    const furMain = [0.76, 0.78, 0.80];
    const furTop  = [0.89, 0.90, 0.92];
    const furDark = [0.56, 0.59, 0.63];
    const redHot  = [0.96, 0.28, 0.18];
    const redTip  = [1.00, 0.46, 0.24];

    // Plump muscular rabbit torso + chest ruff collar
    b.addEllipsoid({ cx: 0, cy: 0.48, cz: -0.06, rx: 0.50, ry: 0.45, rz: 0.58, uSegs: 20, vSegs: 14, col: furMain, topCol: furTop, botCol: furDark, rough: 0.70, partId: 0.0 });
    // Fluffy white neck ruff tufts
    for (let i = -2; i <= 2; i++) {
      const a = i * 0.42;
      b.addEllipsoid({ cx: Math.sin(a) * 0.34, cy: 0.66, cz: 0.28 + Math.cos(a) * 0.18, rx: 0.14, ry: 0.15, rz: 0.14, uSegs: 10, vSegs: 8, col: furTop, botCol: furMain, rough: 0.72, partId: 0.0 });
    }
    // Chubby sculpted head + fluffy cheek tufts + muzzle
    b.addEllipsoid({ cx: 0, cy: 0.88, cz: 0.35, rx: 0.35, ry: 0.32, rz: 0.36, uSegs: 18, vSegs: 14, col: furTop, topCol: [0.94, 0.95, 0.96], botCol: furMain, rough: 0.66, partId: 0.0 });
    b.addEllipsoid({ cx: -0.26, cy: 0.80, cz: 0.42, rx: 0.16, ry: 0.13, rz: 0.15, uSegs: 10, vSegs: 8, col: furTop, rough: 0.74, partId: 0.0 });
    b.addEllipsoid({ cx:  0.26, cy: 0.80, cz: 0.42, rx: 0.16, ry: 0.13, rz: 0.15, uSegs: 10, vSegs: 8, col: furTop, rough: 0.74, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.81, cz: 0.66, rx: 0.14, ry: 0.10, rz: 0.12, uSegs: 10, vSegs: 8, col: furTop, rough: 0.64, partId: 0.0 });
    // Pink nose + fierce-cute crimson-amber spirit eyes + slight forehead tuft
    b.addEllipsoid({ cx: 0, cy: 0.85, cz: 0.76, rx: 0.055, ry: 0.042, rz: 0.042, uSegs: 10, vSegs: 8, col: [0.90, 0.48, 0.52], rough: 0.40, partId: 0.0 });
    b.addEllipsoid({ cx: -0.17, cy: 0.95, cz: 0.63, rx: 0.056, ry: 0.068, rz: 0.048, uSegs: 10, vSegs: 8, col: [0.82, 0.22, 0.18], rough: 0.14, emissive: 0.28, partId: 0.0 });
    b.addEllipsoid({ cx:  0.17, cy: 0.95, cz: 0.63, rx: 0.056, ry: 0.068, rz: 0.048, uSegs: 10, vSegs: 8, col: [0.82, 0.22, 0.18], rough: 0.14, emissive: 0.28, partId: 0.0 });
    b.addCone([0, 1.14, 0.46], [0, 1.28, 0.56], 0.08, 0.015, 7, furTop, redHot, 0.66, 0.05, 0.0);
    // Long sculpted slightly bent ears with soft pink inner & faint crimson tips! (partId 1=L, 2=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addEllipsoid({ cx: s * 0.18, cy: 1.48, cz: 0.24, rx: 0.105, ry: 0.48, rz: 0.072, rotX: -0.18, rotZ: -s * 0.17, uSegs: 14, vSegs: 10, col: furMain, topCol: [0.86, 0.46, 0.42], botCol: furMain, rough: 0.68, partId: pid });
      b.addEllipsoid({ cx: s * 0.18, cy: 1.46, cz: 0.29, rx: 0.058, ry: 0.34, rz: 0.028, rotX: -0.18, rotZ: -s * 0.17, uSegs: 10, vSegs: 8, col: [0.90, 0.62, 0.66], rough: 0.62, partId: pid });
    }
    // Muscular hind haunches + long rabbit feet + nimble front paws
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      b.addEllipsoid({ cx: s * 0.23, cy: 0.18, cz: 0.36, rx: 0.12, ry: 0.17, rz: 0.16, uSegs: 10, vSegs: 8, col: furMain, botCol: furDark, rough: 0.70, partId: pid });
      b.addEllipsoid({ cx: s * 0.35, cy: 0.26, cz: -0.24, rx: 0.20, ry: 0.25, rz: 0.28, uSegs: 12, vSegs: 8, col: furMain, botCol: furDark, rough: 0.70, partId: pid });
      b.addEllipsoid({ cx: s * 0.34, cy: 0.09, cz: -0.12, rx: 0.13, ry: 0.09, rz: 0.26, uSegs: 10, vSegs: 8, col: furDark, topCol: furMain, rough: 0.74, partId: pid });
    }
    // Fluffy grey-white tail base + 5 fanned vivid red flame-tuft locks + whiskers + crimson forehead spirit sigil!
    b.addEllipsoid({ cx: 0, cy: 0.44, cz: -0.66, rx: 0.21, ry: 0.20, rz: 0.23, uSegs: 14, vSegs: 10, col: furTop, botCol: furMain, rough: 0.74, partId: 3.0 });
    b.addCone([0, 0.46, -0.78], [0, 0.68, -1.20], 0.16, 0.022, 10, redHot, redTip, 0.48, 0.30, 3.0);
    b.addCone([-0.08, 0.44, -0.76], [-0.22, 0.60, -1.08], 0.10, 0.018, 8, redHot, redTip, 0.50, 0.25, 3.0);
    b.addCone([ 0.08, 0.44, -0.76], [ 0.22, 0.60, -1.08], 0.10, 0.018, 8, redHot, redTip, 0.50, 0.25, 3.0);
    b.addCone([-0.04, 0.52, -0.78], [-0.14, 0.72, -1.04], 0.08, 0.015, 7, redTip, [1.0, 0.66, 0.32], 0.46, 0.34, 3.0);
    b.addCone([ 0.04, 0.52, -0.78], [ 0.14, 0.72, -1.04], 0.08, 0.015, 7, redTip, [1.0, 0.66, 0.32], 0.46, 0.34, 3.0);
    // Glowing crimson flame-diamond sigil on forehead + whisker bristles
    b.addCrystal(0, 1.04, 0.68, 0.042, 0.085, 0.032, 4, redHot, redTip, 0.65, 4.0);
    for (const s of [-1, 1]) {
      b.addCone([s * 0.12, 0.82, 0.70], [s * 0.38, 0.85, 0.74], 0.014, 0.004, 5, furTop, furTop, 0.5, 0.0, 0.0);
      b.addCone([s * 0.12, 0.79, 0.69], [s * 0.36, 0.76, 0.72], 0.014, 0.004, 5, furTop, furTop, 0.5, 0.0, 0.0);
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 2) 腐泥软泥怪 (迷雾湿地): 暗褐墨绿分层泥丘 + 垂滴泥边 + 8颗脉动气泡 + 枯枝杂物 + 幽黄沼眼
  function buildMudSlimeMesh() {
    const b = new MonsterMeshBuilder();
    // Wide multi-tiered glistening dark-brown / ink-green ooze dome
    b.addEllipsoid({
      cx: 0, cy: 0.44, cz: 0,
      rx: 0.90, ry: 0.52, rz: 0.86,
      uSegs: 22, vSegs: 16,
      col: [0.18, 0.24, 0.14],
      topCol: [0.14, 0.33, 0.17],
      botCol: [0.14, 0.11, 0.08],
      flatBottom: 0.36, rockSeed: 2.7,
      rough: 0.22, partId: 0.0,
    });
    // Secondary overhanging dark-emerald mud cap
    b.addEllipsoid({
      cx: 0.04, cy: 0.72, cz: -0.05,
      rx: 0.58, ry: 0.32, rz: 0.54,
      uSegs: 18, vSegs: 12,
      col: [0.15, 0.29, 0.15], topCol: [0.22, 0.40, 0.19], botCol: [0.14, 0.18, 0.11],
      rockSeed: 4.5, rough: 0.20, partId: 0.0,
    });
    // Irregular oozing mud puddles & dripping rim lobes
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.2;
      const dist = 0.68 + (i % 3) * 0.11;
      b.addEllipsoid({
        cx: Math.cos(a) * dist, cy: 0.13, cz: Math.sin(a) * dist,
        rx: 0.28, ry: 0.14, rz: 0.25,
        uSegs: 10, vSegs: 8,
        col: [0.15, 0.14, 0.09], topCol: [0.17, 0.26, 0.14],
        rough: 0.18, partId: 0.0,
      });
    }
    // Half-submerged weathered marsh twig sticking out of mud back
    b.addCone([0.36, 0.62, -0.32], [0.68, 1.06, -0.58], 0.055, 0.022, 6, [0.24, 0.18, 0.12], [0.34, 0.27, 0.18], 0.85, 0.0, 0.0);
    b.addCone([0.52, 0.84, -0.45], [0.74, 0.96, -0.30], 0.032, 0.012, 5, [0.26, 0.20, 0.13], [0.36, 0.28, 0.18], 0.85, 0.0, 0.0);
    // 8 varied glossy surface bubbles (partId=4 -> pulses organically!)
    const bubbles = [
      [-0.38, 0.78,  0.24, 0.15],
      [ 0.30, 0.86, -0.14, 0.17],
      [ 0.54, 0.58,  0.38, 0.13],
      [-0.16, 0.94, -0.30, 0.14],
      [-0.56, 0.56, -0.24, 0.12],
      [ 0.12, 0.98,  0.14, 0.11],
      [-0.64, 0.38,  0.34, 0.10],
      [ 0.44, 0.74, -0.44, 0.11],
    ];
    for (const bb of bubbles) {
      b.addEllipsoid({
        cx: bb[0], cy: bb[1], cz: bb[2],
        rx: bb[3], ry: bb[3] * 0.90, rz: bb[3],
        uSegs: 12, vSegs: 10,
        col: [0.30, 0.50, 0.25], topCol: [0.54, 0.78, 0.38], botCol: [0.18, 0.30, 0.15],
        rough: 0.10, emissive: 0.18, partId: 4.0,
      });
    }
    // Glowing marsh-yellow eyes + dark sunken mud maw + 2 oozing mud pseudopod arms & sunken bronze ring relic!
    b.addEllipsoid({ cx: -0.25, cy: 0.50, cz: 0.80, rx: 0.080, ry: 0.068, rz: 0.052, uSegs: 10, vSegs: 8, col: [0.84, 0.88, 0.26], rough: 0.15, emissive: 0.38, partId: 0.0 });
    b.addEllipsoid({ cx:  0.25, cy: 0.50, cz: 0.80, rx: 0.080, ry: 0.068, rz: 0.052, uSegs: 10, vSegs: 8, col: [0.84, 0.88, 0.26], rough: 0.15, emissive: 0.38, partId: 0.0 });
    b.addEllipsoid({ cx: 0.0, cy: 0.28, cz: 0.82, rx: 0.26, ry: 0.09, rz: 0.08, uSegs: 12, vSegs: 8, col: [0.06, 0.08, 0.05], rough: 0.3, partId: 0.0 });
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addTube([
        { p: [s * 0.72, 0.34, 0.22], r: 0.14, col: [0.16, 0.26, 0.14] },
        { p: [s * 0.88, 0.46, 0.52], r: 0.10, col: [0.22, 0.36, 0.18] },
        { p: [s * 0.78, 0.38, 0.74], r: 0.12, col: [0.28, 0.46, 0.22] },
      ], 7, 0.20, 0.05, pid);
    }
    b.addTorus({ cx: -0.26, cy: 0.82, cz: -0.36, majorR: 0.16, minorR: 0.032, rotX: 0.55, rotZ: -0.35, segs: 14, tubeSegs: 6, col: [0.38, 0.46, 0.34], rough: 0.52, partId: 0.0 });

    b.alignBottom(0.0);
    return b.build();
  }

  // 3) 毒瘴蟾蜍 (迷雾湿地): 蹲伏墨绿斑点大肚蟾蜍 + 脊骨棘突 + 鼓胀发光淡紫毒囊 + 蹼爪 + 探出紫舌
  function buildVenomToadMesh() {
    const b = new MonsterMeshBuilder();
    const skinDark = [0.12, 0.28, 0.16];
    const skinMid  = [0.18, 0.39, 0.22];
    const bellyCol = [0.52, 0.55, 0.36];
    const sacCol   = [0.66, 0.44, 0.80];

    // Crouched big-bellied toad torso + broad head + lower jaw ridge
    b.addEllipsoid({ cx: 0, cy: 0.50, cz: -0.05, rx: 0.72, ry: 0.50, rz: 0.76, rotX: -0.22, uSegs: 22, vSegs: 16, col: skinMid, topCol: skinDark, botCol: bellyCol, flatBottom: 0.18, rough: 0.44, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.70, cz: 0.48, rx: 0.54, ry: 0.30, rz: 0.46, uSegs: 18, vSegs: 12, col: skinMid, topCol: skinDark, botCol: bellyCol, rough: 0.42, partId: 0.0 });
    // Wide mouth seam + peeking magenta tongue tip
    b.addEllipsoid({ cx: 0, cy: 0.56, cz: 0.86, rx: 0.34, ry: 0.05, rz: 0.08, uSegs: 10, vSegs: 6, col: [0.16, 0.10, 0.14], rough: 0.3, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.55, cz: 0.94, rx: 0.11, ry: 0.045, rz: 0.12, uSegs: 10, vSegs: 6, col: [0.84, 0.36, 0.56], rough: 0.24, partId: 0.0 });
    // Dorsal ridge nodules & mottled dark-emerald/violet poison warts
    for (let i = 0; i < 4; i++) {
      b.addEllipsoid({ cx: 0, cy: 0.94 - i * 0.08, cz: 0.18 - i * 0.24, rx: 0.11, ry: 0.09, rz: 0.12, uSegs: 10, vSegs: 8, col: [0.09, 0.20, 0.11], topCol: [0.46, 0.34, 0.56], rough: 0.45, partId: 0.0 });
    }
    const warts = [
      [-0.32, 0.88, -0.02, 0.13], [0.32, 0.86, -0.10, 0.14],
      [-0.44, 0.72, -0.34, 0.12], [0.44, 0.74, -0.30, 0.12],
      [-0.24, 0.82,  0.22, 0.10], [0.24, 0.82,  0.22, 0.10],
      [-0.50, 0.64,  0.08, 0.10], [0.50, 0.64,  0.08, 0.10],
    ];
    for (const w of warts) {
      b.addEllipsoid({ cx: w[0], cy: w[1], cz: w[2], rx: w[3], ry: w[3] * 0.60, rz: w[3], uSegs: 10, vSegs: 8, col: [0.08, 0.17, 0.10], topCol: [0.52, 0.36, 0.66], rough: 0.42, emissive: 0.08, partId: 0.0 });
    }
    // Bulging pale-purple poison cheek sacs with glowing toxic veins + inflating throat sac & brow horns (partId=4!)
    b.addEllipsoid({ cx: 0, cy: 0.42, cz: 0.72, rx: 0.28, ry: 0.18, rz: 0.24, uSegs: 14, vSegs: 10, col: sacCol, topCol: [0.82, 0.62, 0.92], botCol: [0.48, 0.30, 0.62], rough: 0.22, emissive: 0.24, partId: 4.0 });
    for (const s of [-1, 1]) {
      b.addEllipsoid({ cx: s * 0.50, cy: 0.62, cz: 0.58, rx: 0.26, ry: 0.22, rz: 0.25, uSegs: 16, vSegs: 12, col: sacCol, topCol: [0.84, 0.66, 0.94], botCol: [0.46, 0.28, 0.60], rough: 0.20, emissive: 0.28, partId: 4.0 });
      b.addEllipsoid({ cx: s * 0.68, cy: 0.64, cz: 0.58, rx: 0.09, ry: 0.08, rz: 0.09, uSegs: 10, vSegs: 8, col: [0.86, 0.62, 0.98], rough: 0.16, emissive: 0.42, partId: 4.0 });
      b.addCone([s * 0.32, 1.04, 0.54], [s * 0.42, 1.18, 0.48], 0.055, 0.014, 6, skinDark, sacCol, 0.44, 0.15, 0.0);
    }
    // Protruding heavy brow sockets + glowing amber-slit eyes
    for (const s of [-1, 1]) {
      b.addEllipsoid({ cx: s * 0.27, cy: 0.96, cz: 0.58, rx: 0.14, ry: 0.12, rz: 0.13, uSegs: 10, vSegs: 8, col: skinDark, rough: 0.40, partId: 0.0 });
      b.addEllipsoid({ cx: s * 0.28, cy: 0.97, cz: 0.68, rx: 0.075, ry: 0.068, rz: 0.048, uSegs: 10, vSegs: 8, col: [0.96, 0.78, 0.22], rough: 0.14, emissive: 0.32, partId: 0.0 });
      b.addEllipsoid({ cx: s * 0.28, cy: 0.97, cz: 0.725, rx: 0.045, ry: 0.018, rz: 0.016, uSegs: 6, vSegs: 6, col: [0.06, 0.04, 0.06], rough: 0.1, partId: 0.0 });
    }
    // Powerful crouched hind legs & forelegs with splayed webbed toes!
    for (const s of [-1, 1]) {
      const pidLeg = s < 0 ? 5.0 : 6.0;
      const pidArm = s < 0 ? 1.0 : 2.0;
      b.addEllipsoid({ cx: s * 0.64, cy: 0.30, cz: -0.34, rx: 0.24, ry: 0.26, rz: 0.38, rotY: -s * 0.32, uSegs: 12, vSegs: 8, col: skinDark, botCol: bellyCol, rough: 0.50, partId: pidLeg });
      b.addEllipsoid({ cx: s * 0.46, cy: 0.20, cz:  0.46, rx: 0.14, ry: 0.21, rz: 0.15, rotZ: -s * 0.18, uSegs: 10, vSegs: 8, col: skinMid, rough: 0.50, partId: pidArm });
      for (let t = -1; t <= 1; t++) {
        b.addCone([s * 0.48, 0.06, 0.52], [s * (0.50 + t * 0.10), 0.03, 0.72 + (1 - Math.abs(t)) * 0.05], 0.04, 0.015, 5, skinMid, bellyCol, 0.55, 0.0, pidArm);
        b.addCone([s * 0.72, 0.07, -0.18], [s * (0.84 + t * 0.10), 0.03, 0.06 + t * 0.06], 0.045, 0.016, 5, skinDark, bellyCol, 0.55, 0.0, pidLeg);
      }
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 4) 山岩小石灵 (云雾山): 多块圆角山石拼装 + 苔藓肩甲 + 悬浮石环 + 符文石拳 + 胸口淡青灵石簇
  function buildRockSpiritMesh() {
    const b = new MonsterMeshBuilder();
    const stoneLight = [0.76, 0.79, 0.82];
    const stoneMid   = [0.56, 0.61, 0.66];
    const stoneDark  = [0.38, 0.43, 0.48];
    const mossCol    = [0.28, 0.48, 0.34];
    const cyanGem    = [0.40, 0.90, 0.90];
    const cyanBright = [0.78, 1.00, 1.00];

    // Stacked multi-boulder chest & waist core
    b.addEllipsoid({ cx: 0, cy: 0.84, cz: 0, rx: 0.58, ry: 0.46, rz: 0.46, uSegs: 14, vSegs: 10, col: stoneMid, topCol: stoneLight, botCol: stoneDark, rockSeed: 1.7, rough: 0.84, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.46, cz: 0, rx: 0.42, ry: 0.22, rz: 0.36, uSegs: 12, vSegs: 8, col: stoneDark, topCol: stoneMid, rockSeed: 2.3, rough: 0.86, partId: 0.0 });
    // Floating mossy shoulder crag plates & jagged basalt dorsal crystals
    b.addEllipsoid({ cx: -0.46, cy: 1.16, cz: -0.04, rx: 0.28, ry: 0.18, rz: 0.26, rotZ: 0.28, uSegs: 10, vSegs: 8, col: stoneLight, topCol: mossCol, botCol: stoneMid, rockSeed: 3.9, rough: 0.82, partId: 0.0 });
    b.addEllipsoid({ cx:  0.46, cy: 1.16, cz: -0.04, rx: 0.28, ry: 0.18, rz: 0.26, rotZ: -0.28, uSegs: 10, vSegs: 8, col: stoneLight, topCol: mossCol, botCol: stoneMid, rockSeed: 5.1, rough: 0.82, partId: 0.0 });
    b.addCrystal(-0.22, 1.24, -0.34, 0.09, 0.24, 0.09, 5, cyanGem, cyanBright, 0.52, 4.0, -0.35, 0, 0.25);
    b.addCrystal( 0.22, 1.20, -0.36, 0.08, 0.20, 0.08, 5, cyanGem, cyanBright, 0.52, 4.0, -0.32, 0, -0.28);
    // Stone head nestled between crags + glowing cyan brow rune & slit eyes
    b.addEllipsoid({ cx: 0, cy: 1.34, cz: 0.06, rx: 0.34, ry: 0.28, rz: 0.32, uSegs: 12, vSegs: 10, col: stoneLight, topCol: [0.84, 0.88, 0.90], botCol: stoneMid, rockSeed: 3.1, rough: 0.80, partId: 0.0 });
    b.addBox({ cx: 0, cy: 1.44, cz: 0.35, hx: 0.04, hy: 0.07, hz: 0.02, col: cyanGem, topCol: cyanBright, rough: 0.2, emissive: 0.65, partId: 4.0 });
    b.addEllipsoid({ cx: -0.12, cy: 1.34, cz: 0.34, rx: 0.052, ry: 0.036, rz: 0.03, uSegs: 8, vSegs: 6, col: cyanBright, rough: 0.18, emissive: 0.72, partId: 4.0 });
    b.addEllipsoid({ cx:  0.12, cy: 1.34, cz: 0.34, rx: 0.052, ry: 0.036, rz: 0.03, uSegs: 8, vSegs: 6, col: cyanBright, rough: 0.18, emissive: 0.72, partId: 4.0 });
    // Chest recessed stone collar + glowing pale-cyan 3-crystal Spirit Stone cluster! (partId=4)
    b.addTorus({ cx: 0, cy: 0.86, cz: 0.40, majorR: 0.23, minorR: 0.055, rotX: Math.PI * 0.5, segs: 14, tubeSegs: 6, col: stoneDark, rough: 0.86, partId: 0.0 });
    b.addCrystal(0, 0.86, 0.45, 0.16, 0.25, 0.14, 6, cyanGem, cyanBright, 0.82, 4.0);
    b.addCrystal(-0.14, 0.80, 0.42, 0.08, 0.14, 0.08, 5, cyanGem, cyanBright, 0.70, 4.0, 0, 0, 0.38);
    b.addCrystal( 0.14, 0.80, 0.42, 0.08, 0.14, 0.08, 5, cyanGem, cyanBright, 0.70, 4.0, 0, 0, -0.38);
    // Bulky articulated boulder arms + glowing cyan forearm bands + chunky fists with crystal knuckles (partId 1=L, 2=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addEllipsoid({ cx: s * 0.72, cy: 0.98, cz: 0.04, rx: 0.23, ry: 0.21, rz: 0.22, uSegs: 10, vSegs: 8, col: stoneLight, botCol: stoneMid, rockSeed: 4.2 + s, rough: 0.84, partId: pid });
      b.addTorus({ cx: s * 0.78, cy: 0.76, cz: 0.10, majorR: 0.17, minorR: 0.025, segs: 12, tubeSegs: 6, col: cyanGem, rough: 0.22, emissive: 0.62, partId: pid });
      b.addEllipsoid({ cx: s * 0.80, cy: 0.56, cz: 0.16, rx: 0.24, ry: 0.27, rz: 0.25, uSegs: 10, vSegs: 8, col: stoneMid, botCol: stoneDark, rockSeed: 6.5 + s, rough: 0.86, partId: pid });
      b.addCrystal(s * 0.92, 0.56, 0.34, 0.06, 0.12, 0.06, 5, cyanGem, cyanBright, 0.68, pid, 0.6, 0, -s * 0.5);
    }
    // Carved stone jawbeard & floating spirit-rune halo behind stone head
    b.addBox({ cx: 0, cy: 1.14, cz: 0.32, hx: 0.14, hy: 0.10, hz: 0.08, col: stoneDark, topCol: stoneMid, rough: 0.84, partId: 0.0 });
    b.addTorus({ cx: 0, cy: 1.36, cz: -0.18, majorR: 0.36, minorR: 0.022, rotX: 1.45, segs: 18, tubeSegs: 5, col: cyanGem, rough: 0.24, emissive: 0.58, partId: 4.0 });
    // Chunky stone pillar legs + ankle plates (partId 5=L, 6=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      b.addEllipsoid({ cx: s * 0.28, cy: 0.24, cz: 0.0, rx: 0.22, ry: 0.26, rz: 0.24, uSegs: 10, vSegs: 8, col: stoneDark, topCol: stoneMid, rockSeed: 8.2 + s, flatBottom: 0.25, rough: 0.86, partId: pid });
      b.addBox({ cx: s * 0.28, cy: 0.08, cz: 0.06, hx: 0.18, hy: 0.08, hz: 0.22, col: stoneDark, topCol: stoneMid, rough: 0.88, partId: pid });
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 5) 云雀灵禽 (云雾山): 圆润青白灵鸟 + 三羽冠翎 + 分层翼羽 + 金爪 + 尾羽双缕流动白云气与灵珠
  function buildCloudLarkMesh() {
    const b = new MonsterMeshBuilder();
    const celadon = [0.66, 0.88, 0.86];
    const whitePlume = [0.94, 0.98, 1.00];
    const tealBack = [0.40, 0.72, 0.76];
    const goldCol = [0.94, 0.80, 0.40];

    // Plump sculpted bird body + soft white chest plumage + tucked golden talons
    b.addEllipsoid({ cx: 0, cy: 0.54, cz: 0.0, rx: 0.36, ry: 0.32, rz: 0.48, uSegs: 20, vSegs: 14, col: celadon, topCol: tealBack, botCol: whitePlume, rough: 0.48, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.48, cz: 0.22, rx: 0.28, ry: 0.22, rz: 0.28, uSegs: 14, vSegs: 10, col: whitePlume, botCol: celadon, rough: 0.46, partId: 0.0 });
    for (const s of [-1, 1]) {
      b.addCone([s * 0.14, 0.28, 0.04], [s * 0.16, 0.14, 0.14], 0.04, 0.015, 6, goldCol, goldCol, 0.4, 0.0, 0.0);
    }
    // Round head + ornate 3-feather celadon-gold crest + curved beak + bright eyes
    b.addEllipsoid({ cx: 0, cy: 0.80, cz: 0.32, rx: 0.25, ry: 0.24, rz: 0.27, uSegs: 16, vSegs: 12, col: whitePlume, topCol: celadon, botCol: whitePlume, rough: 0.45, partId: 0.0 });
    b.addCurvedBlade([
      { p: [0, 1.00, 0.32], w: 0.04, t: 0.014, col: celadon },
      { p: [0, 1.18, 0.14], w: 0.06, t: 0.012, col: tealBack },
      { p: [0, 1.24, -0.06], w: 0.014, t: 0.006, col: whitePlume },
    ], 2, 0.42, 0.12, 0.0);
    b.addCone([0, 0.78, 0.56], [0, 0.74, 0.78], 0.068, 0.008, 8, goldCol, [1.0, 0.88, 0.55], 0.34, 0.0, 0.0);
    b.addEllipsoid({ cx: -0.15, cy: 0.85, cz: 0.49, rx: 0.045, ry: 0.050, rz: 0.038, uSegs: 8, vSegs: 6, col: [0.06, 0.14, 0.18], rough: 0.10, partId: 0.0 });
    b.addEllipsoid({ cx:  0.15, cy: 0.85, cz: 0.49, rx: 0.045, ry: 0.050, rz: 0.038, uSegs: 8, vSegs: 6, col: [0.06, 0.14, 0.18], rough: 0.10, partId: 0.0 });
    // Layered primary + secondary sweeping wings (partId 1=L, 2=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addCurvedBlade([
        { p: [s * 0.26, 0.60,  0.08], w: 0.22, t: 0.045, col: whitePlume },
        { p: [s * 0.66, 0.70,  0.00], w: 0.26, t: 0.035, col: celadon },
        { p: [s * 1.06, 0.66, -0.10], w: 0.18, t: 0.022, col: tealBack },
        { p: [s * 1.36, 0.58, -0.22], w: 0.03, t: 0.008, col: whitePlume },
      ], 2, 0.40, 0.08, pid);
      // Secondary trailing wingtip feather pinions
      b.addCurvedBlade([
        { p: [s * 0.42, 0.58, -0.06], w: 0.14, t: 0.026, col: celadon },
        { p: [s * 0.88, 0.60, -0.22], w: 0.12, t: 0.016, col: whitePlume },
        { p: [s * 1.18, 0.52, -0.34], w: 0.02, t: 0.006, col: tealBack },
      ], 2, 0.40, 0.10, pid);
    }
    // Fanned triple tail feathers + TWO long flowing white cloud-qi ribbons & tiny floating cloud pearls! (partId=3)
    for (let f = -1; f <= 1; f++) {
      b.addCurvedBlade([
        { p: [f * 0.06, 0.52, -0.40], w: 0.10, t: 0.022, col: celadon },
        { p: [f * 0.18, 0.50, -0.78], w: 0.12, t: 0.015, col: tealBack },
        { p: [f * 0.26, 0.47, -1.04], w: 0.025, t: 0.007, col: whitePlume },
      ], 2, 0.42, 0.08, 3.0);
    }
    const wispCol = [0.92, 0.98, 1.00];
    b.addCurvedBlade([
      { p: [-0.09, 0.52, -0.60], w: 0.055, t: 0.024, col: wispCol },
      { p: [-0.22, 0.60, -1.06], w: 0.075, t: 0.026, col: wispCol },
      { p: [-0.12, 0.46, -1.56], w: 0.055, t: 0.020, col: wispCol },
      { p: [-0.26, 0.54, -2.04], w: 0.016, t: 0.008, col: wispCol },
    ], 2, 0.30, 0.42, 3.0);
    b.addCurvedBlade([
      { p: [0.09, 0.50, -0.60], w: 0.055, t: 0.024, col: wispCol },
      { p: [0.22, 0.44, -1.10], w: 0.072, t: 0.026, col: wispCol },
      { p: [0.12, 0.56, -1.60], w: 0.052, t: 0.020, col: wispCol },
      { p: [0.26, 0.48, -2.08], w: 0.016, t: 0.008, col: wispCol },
    ], 2, 0.30, 0.42, 3.0);
    b.addEllipsoid({ cx: -0.18, cy: 0.58, cz: -1.32, rx: 0.06, ry: 0.06, rz: 0.06, uSegs: 8, vSegs: 6, col: wispCol, rough: 0.2, emissive: 0.48, partId: 3.0 });
    b.addEllipsoid({ cx:  0.19, cy: 0.48, cz: -1.42, rx: 0.055, ry: 0.055, rz: 0.055, uSegs: 8, vSegs: 6, col: wispCol, rough: 0.2, emissive: 0.48, partId: 3.0 });
    // Glowing celadon spirit-feather chest emblem + 2 side crown plumes
    b.addCrystal(0, 0.54, 0.48, 0.055, 0.095, 0.035, 4, celadon, whitePlume, 0.65, 0.0);
    for (const s of [-1, 1]) {
      b.addCurvedBlade([
        { p: [s * 0.08, 0.98, 0.30], w: 0.03, t: 0.012, col: celadon },
        { p: [s * 0.16, 1.14, 0.14], w: 0.042, t: 0.010, col: whitePlume },
        { p: [s * 0.22, 1.18, -0.02], w: 0.012, t: 0.005, col: whitePlume },
      ], 2, 0.42, 0.14, 0.0);
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 6) 沙蝎幼兽 (流沙荒漠): 土黄多层甲壳 + 节肢双颚螯钳 + 八只甲足 + 脊刺弯尾 + 微黄沙光毒钩
  function buildSandScorpionMesh() {
    const b = new MonsterMeshBuilder();
    const shellMain = [0.78, 0.58, 0.28];
    const shellTop  = [0.92, 0.76, 0.44];
    const shellDark = [0.46, 0.31, 0.14];
    const sandGlow  = [1.00, 0.88, 0.42];

    // Sculpted layered carapace thorax + 4 overlapping armoured abdominal plates with dark ridge trim
    b.addEllipsoid({ cx: 0, cy: 0.34, cz: 0.28, rx: 0.42, ry: 0.25, rz: 0.40, uSegs: 18, vSegs: 12, col: shellMain, topCol: shellTop, botCol: shellDark, rough: 0.36, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.44, cz: 0.34, rx: 0.26, ry: 0.14, rz: 0.24, uSegs: 12, vSegs: 8, col: shellDark, topCol: shellMain, rough: 0.40, partId: 0.0 });
    for (let i = 0; i < 4; i++) {
      const z = -0.02 - i * 0.19;
      const sc = 1.0 - i * 0.14;
      b.addEllipsoid({ cx: 0, cy: 0.32 + i * 0.01, cz: z, rx: 0.38 * sc, ry: 0.22 * sc, rz: 0.20 * sc, uSegs: 14, vSegs: 10, col: shellMain, topCol: shellTop, botCol: shellDark, rough: 0.38, partId: 0.0 });
      b.addCone([0, 0.48 * sc + 0.08, z], [0, 0.58 * sc + 0.12, z - 0.06], 0.045 * sc, 0.008, 5, shellDark, shellTop, 0.42, 0.0, 0.0);
    }
    // Sharp glinting amber-black eyes + front mandibles
    for (const s of [-1, 1]) {
      b.addEllipsoid({ cx: s * 0.16, cy: 0.45, cz: 0.62, rx: 0.048, ry: 0.045, rz: 0.04, uSegs: 8, vSegs: 6, col: [0.14, 0.08, 0.04], rough: 0.10, partId: 0.0 });
      b.addCone([s * 0.09, 0.26, 0.64], [s * 0.05, 0.22, 0.78], 0.042, 0.01, 6, shellDark, shellTop, 0.38, 0.0, 0.0);
    }
    // Jointed twin pincer arms with serrated double-jaw claws! (partId 1=L, 2=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addTube([
        { p: [s * 0.30, 0.32, 0.48], r: 0.095, col: shellDark },
        { p: [s * 0.56, 0.34, 0.68], r: 0.088, col: shellMain },
        { p: [s * 0.54, 0.36, 0.90], r: 0.115, col: shellTop },
      ], 8, 0.36, 0.0, pid);
      // Outer curved claw + inner snapping thumb
      b.addCone([s * 0.58, 0.36, 0.96], [s * 0.38, 0.38, 1.24], 0.068, 0.012, 7, shellTop, shellDark, 0.34, 0.0, pid);
      b.addCone([s * 0.44, 0.35, 0.96], [s * 0.30, 0.36, 1.18], 0.052, 0.010, 6, shellMain, shellDark, 0.34, 0.0, pid);
    }
    // 8 jointed armoured desert legs (4 pairs, partId 5=L, 6=R)
    for (let i = 0; i < 4; i++) {
      const z = 0.34 - i * 0.22;
      for (const s of [-1, 1]) {
        const pid = s < 0 ? 5.0 : 6.0;
        b.addTube([
          { p: [s * 0.32, 0.28, z], r: 0.058, col: shellDark },
          { p: [s * 0.56, 0.34, z - 0.03], r: 0.048, col: shellMain },
          { p: [s * 0.68, 0.04, z - 0.07], r: 0.022, col: shellDark },
        ], 6, 0.48, 0.0, pid);
      }
    }
    // High arched segmented tail with dorsal barbs (partId=3)
    const tailPts = [
      [0, 0.38, -0.68, 0.145],
      [0, 0.58, -0.82, 0.130],
      [0, 0.84, -0.80, 0.118],
      [0, 1.06, -0.64, 0.106],
      [0, 1.18, -0.38, 0.095],
    ];
    for (const ts of tailPts) {
      b.addEllipsoid({ cx: ts[0], cy: ts[1], cz: ts[2], rx: ts[3], ry: ts[3] * 1.1, rz: ts[3] * 1.18, uSegs: 12, vSegs: 8, col: shellMain, topCol: shellTop, botCol: shellDark, rough: 0.36, partId: 3.0 });
      b.addCone([0, ts[1] + ts[3] * 0.7, ts[2] - ts[3] * 0.4], [0, ts[1] + ts[3] * 1.35, ts[2] - ts[3] * 0.95], 0.036, 0.008, 5, shellDark, shellTop, 0.4, 0.0, 3.0);
    }
    // Faceted glowing golden-sand stinger vesicle & curved glowing barb + lateral carapace spikes! (partId=4)
    b.addEllipsoid({ cx: 0, cy: 1.20, cz: -0.18, rx: 0.125, ry: 0.11, rz: 0.145, uSegs: 12, vSegs: 10, col: [0.96, 0.80, 0.32], topCol: sandGlow, botCol: [0.82, 0.60, 0.18], rough: 0.18, emissive: 0.68, partId: 4.0 });
    b.addCone([0, 1.20, -0.04], [0, 1.08, 0.24], 0.062, 0.008, 8, [0.98, 0.84, 0.36], [1.0, 0.96, 0.68], 0.16, 0.82, 4.0);
    for (const s of [-1, 1]) {
      b.addCone([s * 0.38, 0.36, 0.20], [s * 0.52, 0.42, 0.12], 0.038, 0.008, 5, shellDark, shellTop, 0.38, 0.0, 0.0);
      b.addCone([s * 0.32, 0.35, -0.14], [s * 0.46, 0.40, -0.22], 0.032, 0.008, 5, shellDark, shellTop, 0.38, 0.0, 0.0);
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 7) 滚沙仙人掌精 (流沙荒漠): 12道浅绿竖纹圆球 + 簇生三针短刺 + 小巧侧臂 + 沙根底环 + 重瓣小黄花
  function buildCactusSpriteMesh() {
    const b = new MonsterMeshBuilder();
    const cacMid = [0.28, 0.58, 0.26];
    const cacTop = [0.40, 0.70, 0.34];
    const cacBot = [0.20, 0.42, 0.18];
    const ribLite = [0.68, 0.90, 0.50];

    // Deeply sculpted 12-ribbed spherical cactus body
    b.addEllipsoid({
      cx: 0, cy: 0.60, cz: 0,
      rx: 0.62, ry: 0.60, rz: 0.62,
      uSegs: 36, vSegs: 18,
      col: cacMid, topCol: cacTop, botCol: cacBot,
      ribs: 12, ribAmp: 0.095, ribCol: ribLite,
      flatBottom: 0.14, rough: 0.60, partId: 0.0,
    });
    // Braided sandy-root skirt ring at bottom
    b.addTorus({ cx: 0, cy: 0.08, cz: 0, majorR: 0.46, minorR: 0.08, segs: 16, tubeSegs: 6, col: [0.58, 0.44, 0.24], rough: 0.86, partId: 0.0 });
    // Cute small stubby ribbed cactus side arms! (partId 1=L, 2=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addEllipsoid({ cx: s * 0.68, cy: 0.62, cz: 0.06, rx: 0.17, ry: 0.14, rz: 0.16, rotZ: -s * 0.45, uSegs: 12, vSegs: 8, col: cacMid, topCol: ribLite, rough: 0.62, partId: pid });
      b.addEllipsoid({ cx: s * 0.80, cy: 0.78, cz: 0.08, rx: 0.13, ry: 0.19, rz: 0.13, uSegs: 12, vSegs: 8, col: cacTop, topCol: ribLite, rough: 0.62, partId: pid });
    }
    // Star-burst clustered short pale thorns along the 12 ribs
    const spineA = [0.84, 0.80, 0.60];
    const spineB = [0.98, 0.94, 0.78];
    const rings = [0.28, 0.60, 0.92];
    for (let ir = 0; ir < rings.length; ir++) {
      const y = rings[ir];
      const lat = (y - 0.60) / 0.60;
      const rad = Math.sqrt(Math.max(0.12, 1.0 - lat * lat)) * 0.64;
      const count = ir === 1 ? 12 : 6;
      for (let k = 0; k < count; k++) {
        const ang = (k / count) * Math.PI * 2;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const sx = ca * rad, sz = sa * rad;
        // White wool areole cushion + twin angled short spines
        b.addEllipsoid({ cx: sx, cy: y, cz: sz, rx: 0.032, ry: 0.032, rz: 0.032, uSegs: 6, vSegs: 5, col: [0.92, 0.88, 0.74], rough: 0.7, partId: 0.0 });
        b.addCone([sx, y, sz], [sx + ca * 0.16, y + lat * 0.12 + 0.05, sz + sa * 0.16], 0.020, 0.004, 5, spineA, spineB, 0.56, 0.0, 0.0);
        b.addCone([sx, y, sz], [sx + ca * 0.14 - sa * 0.05, y + lat * 0.12 - 0.04, sz + sa * 0.14 + ca * 0.05], 0.018, 0.004, 5, spineA, spineB, 0.56, 0.0, 0.0);
      }
    }
    // Cute expressive eyes on front
    b.addEllipsoid({ cx: -0.19, cy: 0.66, cz: 0.62, rx: 0.060, ry: 0.075, rz: 0.045, uSegs: 10, vSegs: 8, col: [0.09, 0.11, 0.08], rough: 0.14, partId: 0.0 });
    b.addEllipsoid({ cx:  0.19, cy: 0.66, cz: 0.62, rx: 0.060, ry: 0.075, rz: 0.045, uSegs: 10, vSegs: 8, col: [0.09, 0.11, 0.08], rough: 0.14, partId: 0.0 });
    // Rich double-ring desert yellow flower with warm orange center & calyx on top! (partId=3)
    b.addEllipsoid({ cx: 0, cy: 1.24, cz: 0, rx: 0.12, ry: 0.075, rz: 0.12, uSegs: 12, vSegs: 8, col: [0.96, 0.58, 0.12], topCol: [1.0, 0.82, 0.24], rough: 0.40, emissive: 0.16, partId: 3.0 });
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      b.addEllipsoid({ cx: ca * 0.20, cy: 1.26, cz: sa * 0.20, rx: 0.13, ry: 0.04, rz: 0.082, rotY: -a, rotZ: -0.22, uSegs: 10, vSegs: 8, col: [0.98, 0.84, 0.18], topCol: [1.0, 0.96, 0.44], rough: 0.38, emissive: 0.14, partId: 3.0 });
    }
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2 + 0.3;
      const ca = Math.cos(a), sa = Math.sin(a);
      b.addEllipsoid({ cx: ca * 0.13, cy: 1.32, cz: sa * 0.13, rx: 0.085, ry: 0.032, rz: 0.06, rotY: -a, rotZ: -0.45, uSegs: 8, vSegs: 6, col: [1.0, 0.92, 0.34], topCol: [1.0, 0.98, 0.62], rough: 0.36, emissive: 0.18, partId: 3.0 });
      b.addCone([ca * 0.05, 1.28, sa * 0.05], [ca * 0.09, 1.39, sa * 0.09], 0.014, 0.018, 5, [0.96, 0.58, 0.12], [1.0, 0.96, 0.52], 0.3, 0.45, 3.0);
    }
    // Small yellow flower buds crowning both waving side cactus arms
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addEllipsoid({ cx: s * 0.80, cy: 0.98, cz: 0.08, rx: 0.065, ry: 0.055, rz: 0.065, uSegs: 8, vSegs: 6, col: [0.98, 0.84, 0.20], topCol: [1.0, 0.95, 0.50], rough: 0.38, emissive: 0.15, partId: pid });
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // =========================================================
  // 3. PURE-CODE MESHES — 6 FOUNDATION-ESTABLISHMENT MONSTERS (筑基期, Large & Imposing!)
  // =========================================================

  // 8) 青藤树妖 (通天木林): 高大深褐树干躯干，肩绕发光青藤，头顶茂密树冠
  function buildVineTreantMesh() {
    const b = new MonsterMeshBuilder();
    const barkDark = [0.22, 0.14, 0.09];
    const barkMid  = [0.33, 0.22, 0.14];
    const barkLite = [0.42, 0.29, 0.19];
    const vineGlow = [0.30, 0.94, 0.62];
    const leafDark = [0.14, 0.42, 0.20];
    const leafMid  = [0.24, 0.60, 0.26];
    const leafTop  = [0.42, 0.80, 0.36];

    // Tall gnarled tree-trunk torso with sculpted vertical bark flutes
    b.addEllipsoid({
      cx: 0, cy: 1.15, cz: 0,
      rx: 0.48, ry: 0.72, rz: 0.42,
      uSegs: 18, vSegs: 14,
      col: barkMid, topCol: barkLite, botCol: barkDark,
      ribs: 7, ribAmp: 0.11, ribCol: barkDark,
      rough: 0.88, partId: 0.0,
    });
    // Broad gnarled wooden shoulder ridge & ancient carved face brow
    b.addEllipsoid({ cx: 0, cy: 1.66, cz: 0.02, rx: 0.62, ry: 0.28, rz: 0.44, uSegs: 16, vSegs: 10, col: barkMid, topCol: barkDark, rockSeed: 2.2, rough: 0.88, partId: 0.0 });
    // Glowing emerald-cyan spirit eyes recessed under bark brow
    b.addEllipsoid({ cx: -0.17, cy: 1.56, cz: 0.40, rx: 0.068, ry: 0.044, rz: 0.04, uSegs: 8, vSegs: 6, col: [0.58, 1.0, 0.72], rough: 0.15, emissive: 0.85, partId: 4.0 });
    b.addEllipsoid({ cx:  0.17, cy: 1.56, cz: 0.40, rx: 0.068, ry: 0.044, rz: 0.04, uSegs: 8, vSegs: 6, col: [0.58, 1.0, 0.72], rough: 0.15, emissive: 0.85, partId: 4.0 });
    b.addEllipsoid({ cx: 0, cy: 1.38, cz: 0.42, rx: 0.14, ry: 0.05, rz: 0.04, uSegs: 8, vSegs: 6, col: [0.10, 0.07, 0.05], rough: 0.9, partId: 0.0 });

    // Thick flared root legs (partId 5=L, 6=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      b.addTube([
        { p: [s * 0.24, 0.62, 0.0], r: 0.22, col: barkMid },
        { p: [s * 0.34, 0.30, 0.04], r: 0.20, col: barkDark },
        { p: [s * 0.42, 0.04, 0.12], r: 0.17, col: barkDark },
      ], 8, 0.90, 0.0, pid);
      // Secondary root toes gripping soil
      b.addCone([s * 0.36, 0.16, 0.08], [s * 0.56, 0.02, 0.30], 0.09, 0.03, 6, barkDark, barkMid, 0.9, 0.0, pid);
      b.addCone([s * 0.34, 0.16, 0.02], [s * 0.52, 0.02, -0.22], 0.08, 0.025, 6, barkDark, barkMid, 0.9, 0.0, pid);
    }

    // Long gnarled wooden branch arms with twig fingers (partId 1=L, 2=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addTube([
        { p: [s * 0.52, 1.60, 0.0], r: 0.18, col: barkMid },
        { p: [s * 0.82, 1.24, 0.10], r: 0.15, col: barkDark },
        { p: [s * 0.88, 0.72, 0.26], r: 0.13, col: barkMid },
      ], 8, 0.88, 0.0, pid);
      for (let f = -1; f <= 1; f++) {
        b.addCone([s * 0.88, 0.74, 0.26], [s * (0.94 + f * 0.06), 0.46, 0.36 + f * 0.09], 0.055, 0.014, 5, barkDark, barkLite, 0.88, 0.0, pid);
      }
      // Glowing cyan vine coiled tightly around upper arm/shoulder!
      b.addTorus({ cx: s * 0.66, cy: 1.48, cz: 0.06, majorR: 0.23, minorR: 0.042, rotZ: s * 0.7, segs: 16, tubeSegs: 6, col: vineGlow, rough: 0.26, emissive: 0.78, partId: 4.0 });
    }

    // Luminous glowing cyan vines spiraling gracefully across shoulders & chest! (partId=4)
    const vineSpiral = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const ang = t * Math.PI * 2.4 - 0.6;
      const y = 0.88 + t * 0.88;
      const rad = 0.46 + Math.sin(t * Math.PI) * 0.14;
      vineSpiral.push({ p: [Math.cos(ang) * rad, y, Math.sin(ang) * rad], r: 0.045, col: vineGlow });
    }
    b.addTube(vineSpiral, 6, 0.24, 0.76, 4.0);
    // Shoulder luminous vine drape loops + stag-horn wooden crown + hanging glowing spirit pods!
    b.addTorus({ cx: 0, cy: 1.72, cz: 0.02, majorR: 0.56, minorR: 0.048, rotX: 0.24, segs: 24, tubeSegs: 6, col: vineGlow, rough: 0.24, emissive: 0.80, partId: 4.0 });
    for (const s of [-1, 1]) {
      b.addTube([
        { p: [s * 0.26, 1.76, 0.14], r: 0.065, col: barkDark },
        { p: [s * 0.44, 2.02, 0.22], r: 0.045, col: barkMid },
        { p: [s * 0.52, 2.24, 0.16], r: 0.022, col: barkLite },
      ], 6, 0.86, 0.0, 0.0);
      // Hanging glowing cyan-green spirit fruit pod beneath canopy boughs
      b.addCrystal(s * 0.62, 1.76, 0.20, 0.068, 0.14, 0.068, 6, vineGlow, [0.80, 1.0, 0.86], 0.90, 4.0);
    }

    // Dense multi-lobe lush leafy canopy crowning its head! (partId=3 -> gentle wind sway!)
    const lobes = [
      [ 0.00, 2.26,  0.00, 0.66, 0.42, 0.62],
      [-0.56, 2.08,  0.14, 0.46, 0.34, 0.44],
      [ 0.56, 2.10, -0.10, 0.48, 0.34, 0.46],
      [ 0.08, 2.04,  0.50, 0.44, 0.30, 0.40],
      [-0.12, 2.06, -0.48, 0.46, 0.32, 0.42],
      [ 0.00, 2.52,  0.04, 0.44, 0.28, 0.42],
    ];
    for (let i = 0; i < lobes.length; i++) {
      const lb = lobes[i];
      b.addEllipsoid({
        cx: lb[0], cy: lb[1], cz: lb[2],
        rx: lb[3], ry: lb[4], rz: lb[5],
        uSegs: 14, vSegs: 10,
        col: leafMid, topCol: leafTop, botCol: leafDark,
        rockSeed: 1.5 + i * 2.1, rough: 0.68, partId: 3.0,
      });
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 9) 灵纹影豹 (通天木林): 矫健暗青妖豹，背脊浮现亮青灵纹，双目幽绿
  function buildSpiritLeopardMesh() {
    const b = new MonsterMeshBuilder();
    const furDark  = [0.09, 0.20, 0.24];
    const furMid   = [0.13, 0.29, 0.33];
    const furBelly = [0.19, 0.36, 0.38];
    const runeCyan = [0.26, 0.96, 0.92];
    const eyeGreen = [0.34, 1.00, 0.46];

    // Sleek muscular feline chest + narrow agile waist + muscular haunch
    b.addEllipsoid({ cx: 0, cy: 0.72, cz:  0.32, rx: 0.32, ry: 0.30, rz: 0.44, uSegs: 18, vSegs: 12, col: furMid, topCol: furDark, botCol: furBelly, rough: 0.52, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.70, cz: -0.06, rx: 0.25, ry: 0.24, rz: 0.36, uSegs: 16, vSegs: 10, col: furMid, topCol: furDark, botCol: furBelly, rough: 0.52, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.72, cz: -0.42, rx: 0.28, ry: 0.27, rz: 0.36, uSegs: 16, vSegs: 12, col: furMid, topCol: furDark, botCol: furBelly, rough: 0.52, partId: 0.0 });
    // Sleek neck + predatory feline head + sharp muzzle + pointed ears
    b.addTube([
      { p: [0, 0.78, 0.56], r: 0.21, col: furMid },
      { p: [0, 0.94, 0.78], r: 0.18, col: furDark },
    ], 10, 0.52, 0.0, 0.0);
    b.addEllipsoid({ cx: 0, cy: 0.98, cz: 0.90, rx: 0.21, ry: 0.19, rz: 0.24, uSegs: 16, vSegs: 12, col: furMid, topCol: furDark, botCol: furBelly, rough: 0.48, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.91, cz: 1.12, rx: 0.12, ry: 0.095, rz: 0.14, uSegs: 12, vSegs: 8, col: furMid, botCol: furBelly, rough: 0.48, partId: 0.0 });
    // Pointed swept-back panther ears
    for (const s of [-1, 1]) {
      b.addCone([s * 0.15, 1.10, 0.84], [s * 0.22, 1.30, 0.76], 0.075, 0.012, 6, furDark, furMid, 0.52, 0.0, 0.0);
      // Eerie glowing emerald-green eyes! (partId=4)
      b.addEllipsoid({ cx: s * 0.11, cy: 1.02, cz: 1.08, rx: 0.048, ry: 0.032, rz: 0.036, rotZ: -s * 0.24, uSegs: 8, vSegs: 6, col: eyeGreen, rough: 0.12, emissive: 0.92, partId: 4.0 });
    }
    // Luminous bright-cyan Spirit Runes running along spine ridge & flanking haunches! (partId=4)
    for (let i = 0; i < 6; i++) {
      const z = 0.58 - i * 0.22;
      const w = 0.048 + (i % 2) * 0.024;
      b.addBox({ cx: 0, cy: 0.98 - (i === 2 ? 0.04 : 0), cz: z, hx: w, hy: 0.025, hz: 0.09, col: runeCyan, topCol: [0.76, 1.0, 1.0], rough: 0.16, emissive: 0.92, partId: 4.0 });
      // Side spirit chevron markings on flanks
      if (i > 0 && i < 5) {
        for (const s of [-1, 1]) {
          b.addBox({ cx: s * 0.25, cy: 0.84, cz: z, hx: 0.02, hy: 0.09, hz: 0.04, rotX: 0.45, rotZ: s * 0.35, col: runeCyan, rough: 0.18, emissive: 0.82, partId: 4.0 });
        }
      }
    }
    // 4 agile muscular clawed legs (partId 5=L, 6=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      // Front leg
      b.addTube([
        { p: [s * 0.24, 0.66, 0.44], r: 0.12, col: furDark },
        { p: [s * 0.26, 0.36, 0.48], r: 0.088, col: furMid },
        { p: [s * 0.25, 0.06, 0.54], r: 0.075, col: furDark },
      ], 8, 0.54, 0.0, pid);
      // Hind leg
      b.addTube([
        { p: [s * 0.24, 0.68, -0.46], r: 0.135, col: furDark },
        { p: [s * 0.26, 0.38, -0.60], r: 0.092, col: furMid },
        { p: [s * 0.25, 0.06, -0.50], r: 0.078, col: furDark },
      ], 8, 0.54, 0.0, pid);
      // Luminous cyan ankle rings
      b.addTorus({ cx: s * 0.25, cy: 0.18, cz: 0.52, majorR: 0.085, minorR: 0.016, segs: 10, tubeSegs: 5, col: runeCyan, rough: 0.2, emissive: 0.72, partId: pid });
      b.addTorus({ cx: s * 0.25, cy: 0.18, cz: -0.53, majorR: 0.085, minorR: 0.016, segs: 10, tubeSegs: 5, col: runeCyan, rough: 0.2, emissive: 0.72, partId: pid });
    }
    // Long graceful whip-like shadow tail ending in glowing cyan spirit tuft + saber fangs & shoulder spirit-rings!
    b.addTube([
      { p: [0, 0.78, -0.72], r: 0.078, col: furDark },
      { p: [0, 0.86, -1.04], r: 0.062, col: furMid },
      { p: [0, 1.04, -1.32], r: 0.050, col: furDark },
      { p: [0, 1.24, -1.48], r: 0.042, col: runeCyan },
    ], 8, 0.48, 0.08, 3.0);
    b.addCrystal(0, 1.32, -1.52, 0.055, 0.14, 0.055, 5, runeCyan, [0.80, 1.0, 1.0], 0.82, 3.0, -0.45, 0, 0);
    for (const s of [-1, 1]) {
      b.addCone([s * 0.07, 0.86, 1.20], [s * 0.07, 0.76, 1.22], 0.022, 0.004, 5, [0.92, 0.98, 0.98], runeCyan, 0.2, 0.45, 0.0);
      b.addTorus({ cx: s * 0.31, cy: 0.74, cz: 0.36, majorR: 0.14, minorR: 0.015, rotY: Math.PI * 0.5, segs: 14, tubeSegs: 5, col: runeCyan, rough: 0.18, emissive: 0.84, partId: 4.0 });
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 10) 残甲阵兵 (残阵古道): 披破损青铜甲的空心战魂，眼眶燃幽蓝魂火，执断戟
  function buildRuinedSoldierMesh() {
    const b = new MonsterMeshBuilder();
    const bronzeMain = [0.34, 0.42, 0.36]; // Weathered patina bronze
    const bronzeGold = [0.56, 0.48, 0.30]; // Tarnished antique bronze trim
    const bronzeDark = [0.20, 0.24, 0.22];
    const soulBlue   = [0.24, 0.76, 1.00];
    const soulCore   = [0.68, 0.94, 1.00];

    // HOLLOW spectral torso: front & back cracked bronze armor plates with visible glowing eerie-blue soul-wisp core inside!
    b.addBox({ cx: 0, cy: 1.18, cz:  0.22, hx: 0.32, hy: 0.32, hz: 0.05, col: bronzeMain, topCol: bronzeGold, botCol: bronzeDark, rough: 0.54, partId: 0.0 });
    b.addBox({ cx: 0, cy: 1.18, cz: -0.22, hx: 0.30, hy: 0.30, hz: 0.05, col: bronzeMain, topCol: bronzeDark, rough: 0.56, partId: 0.0 });
    // Side ribs leaving hollow gap visible + floating eerie-blue spectral flame core inside chest! (partId=4)
    b.addBox({ cx: -0.32, cy: 1.24, cz: 0, hx: 0.04, hy: 0.18, hz: 0.20, col: bronzeDark, rough: 0.6, partId: 0.0 });
    b.addBox({ cx:  0.32, cy: 1.12, cz: 0, hx: 0.04, hy: 0.16, hz: 0.20, col: bronzeDark, rough: 0.6, partId: 0.0 });
    b.addCrystal(0, 1.18, 0.0, 0.14, 0.26, 0.14, 6, soulBlue, soulCore, 0.92, 4.0);
    // Cracked bronze waist belt & tattered hanging armored fauld tassets
    b.addBox({ cx: 0, cy: 0.80, cz: 0, hx: 0.34, hy: 0.07, hz: 0.24, col: bronzeGold, botCol: bronzeDark, rough: 0.48, partId: 0.0 });
    for (let i = -1; i <= 1; i++) {
      b.addBox({ cx: i * 0.22, cy: 0.56, cz: 0.22, hx: 0.09, hy: 0.20, hz: 0.03, rotX: -0.10, col: bronzeMain, botCol: bronzeDark, rough: 0.58, partId: 0.0 });
      b.addBox({ cx: i * 0.22, cy: 0.58, cz: -0.22, hx: 0.09, hy: 0.18, hz: 0.03, rotX: 0.10, col: bronzeDark, rough: 0.60, partId: 0.0 });
    }
    // Asymmetrical battered bronze pauldrons (left jagged & large, right chipped)
    b.addEllipsoid({ cx: -0.48, cy: 1.48, cz: 0.0, rx: 0.24, ry: 0.18, rz: 0.26, rotZ: 0.32, uSegs: 12, vSegs: 8, col: bronzeMain, topCol: bronzeGold, botCol: bronzeDark, rockSeed: 3.1, rough: 0.50, partId: 1.0 });
    b.addEllipsoid({ cx:  0.46, cy: 1.46, cz: 0.0, rx: 0.20, ry: 0.15, rz: 0.22, rotZ: -0.24, uSegs: 10, vSegs: 8, col: bronzeDark, topCol: bronzeMain, rockSeed: 5.4, rough: 0.54, partId: 2.0 });

    // Hollow Ancient Bronze War Helm with Horned Crest + Burning Eerie-Blue Soul-Fire Eyes!
    b.addEllipsoid({ cx: 0, cy: 1.74, cz: 0.0, rx: 0.23, ry: 0.25, rz: 0.24, uSegs: 14, vSegs: 10, col: bronzeMain, topCol: bronzeGold, botCol: bronzeDark, rough: 0.48, partId: 0.0 });
    // Recessed dark hollow visor face + twin burning blue soul-fire eyes & crown soul-plume (partId=4)
    b.addBox({ cx: 0, cy: 1.68, cz: 0.20, hx: 0.15, hy: 0.12, hz: 0.05, col: [0.03, 0.06, 0.10], rough: 0.9, partId: 0.0 });
    b.addEllipsoid({ cx: -0.08, cy: 1.71, cz: 0.24, rx: 0.048, ry: 0.036, rz: 0.032, uSegs: 8, vSegs: 6, col: soulCore, rough: 0.10, emissive: 1.05, partId: 4.0 });
    b.addEllipsoid({ cx:  0.08, cy: 1.71, cz: 0.24, rx: 0.048, ry: 0.036, rz: 0.032, uSegs: 8, vSegs: 6, col: soulCore, rough: 0.10, emissive: 1.05, partId: 4.0 });
    b.addCone([0, 1.96, -0.02], [0, 2.26, -0.18], 0.08, 0.012, 7, soulBlue, soulCore, 0.2, 0.85, 4.0);
    // Asymmetric broken bronze helm wings (left intact, right snapped short!)
    b.addCone([-0.18, 1.88, 0.04], [-0.38, 2.14, -0.06], 0.045, 0.010, 6, bronzeGold, bronzeMain, 0.48, 0.0, 0.0);
    b.addCone([ 0.18, 1.88, 0.04], [ 0.28, 2.00, -0.02], 0.045, 0.025, 6, bronzeGold, bronzeDark, 0.50, 0.0, 0.0);

    // Armored floating gauntlets (partId 1=L, 2=R) + MASSIVE BROKEN BRONZE HALBERD (断戟) in right hand!
    b.addBox({ cx: -0.52, cy: 1.06, cz: 0.10, hx: 0.10, hy: 0.22, hz: 0.11, rotX: -0.25, col: bronzeMain, topCol: bronzeGold, rough: 0.54, partId: 1.0 });
    b.addBox({ cx:  0.52, cy: 1.08, cz: 0.18, hx: 0.10, hy: 0.22, hz: 0.11, rotX: -0.45, col: bronzeMain, topCol: bronzeGold, rough: 0.54, partId: 2.0 });
    // Broken Halberd (断戟): tall bronze shaft + jagged snapped spear tip + curved side crescent blade + faint soul-blue edge!
    b.addTube([
      { p: [0.58, 0.18, 0.22], r: 0.042, col: bronzeDark },
      { p: [0.58, 1.20, 0.36], r: 0.044, col: bronzeMain },
      { p: [0.58, 2.22, 0.50], r: 0.046, col: bronzeGold },
    ], 8, 0.52, 0.0, 2.0);
    // Snapped jagged spear point at top
    b.addBox({ cx: 0.58, cy: 2.38, cz: 0.52, hx: 0.035, hy: 0.20, hz: 0.08, rotZ: 0.12, col: bronzeGold, topCol: soulBlue, rough: 0.38, emissive: 0.22, partId: 2.0 });
    // Iconic crescent halberd side-blade (月牙刃) with cracked notch
    b.addCurvedBlade([
      { p: [0.58, 2.18, 0.56], w: 0.03, t: 0.09, col: bronzeGold },
      { p: [0.58, 2.04, 0.88], w: 0.026, t: 0.14, col: bronzeMain },
      { p: [0.58, 1.78, 0.82], w: 0.022, t: 0.10, col: soulBlue },
      { p: [0.58, 1.66, 0.56], w: 0.014, t: 0.04, col: bronzeDark },
    ], 2, 0.38, 0.25, 2.0);

    // Floating hollow armored greaves + tattered spectral back battle-cape & glowing halberd rune rings!
    b.addCurvedBlade([
      { p: [0, 1.48, -0.26], w: 0.28, t: 0.02, col: bronzeDark },
      { p: [0, 1.04, -0.36], w: 0.34, t: 0.018, col: [0.16, 0.26, 0.32] },
      { p: [0, 0.52, -0.48], w: 0.26, t: 0.014, col: [0.12, 0.36, 0.52] },
      { p: [0, 0.24, -0.58], w: 0.08, t: 0.008, col: soulBlue },
    ], 2, 0.62, 0.22, 3.0);
    b.addTorus({ cx: 0.58, cy: 1.66, cz: 0.42, majorR: 0.07, minorR: 0.016, rotX: 0.14, segs: 12, tubeSegs: 5, col: soulBlue, rough: 0.2, emissive: 0.88, partId: 2.0 });
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      b.addBox({ cx: s * 0.22, cy: 0.36, cz: 0.02, hx: 0.10, hy: 0.26, hz: 0.11, col: bronzeMain, topCol: bronzeGold, botCol: bronzeDark, rough: 0.54, partId: pid });
      b.addBox({ cx: s * 0.22, cy: 0.06, cz: 0.06, hx: 0.11, hy: 0.06, hz: 0.15, col: bronzeDark, rough: 0.58, partId: pid });
      b.addCone([s * 0.22, 0.52, 0.12], [s * 0.22, 0.62, 0.22], 0.045, 0.010, 5, bronzeGold, soulBlue, 0.38, 0.35, pid);
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 11) 镇道符傀 (残阵古道): 悬浮黑石方柱机关傀儡，四面贴暗金符箓，身周绕阵环
  function buildRuneGolemMesh() {
    const b = new MonsterMeshBuilder();
    const basaltDark = [0.13, 0.14, 0.17];
    const basaltMid  = [0.21, 0.23, 0.27];
    const basaltEdge = [0.30, 0.33, 0.38];
    const goldDark   = [0.76, 0.58, 0.20];
    const goldBright = [1.00, 0.84, 0.36];

    // Main monolithic black-stone square obelisk body + stepped ancient carved cap & floating base keystone
    b.addBox({ cx: 0, cy: 1.18, cz: 0, hx: 0.38, hy: 0.72, hz: 0.38, col: basaltMid, topCol: basaltEdge, botCol: basaltDark, rough: 0.72, partId: 0.0 });
    b.addBox({ cx: 0, cy: 1.98, cz: 0, hx: 0.30, hy: 0.10, hz: 0.30, col: basaltEdge, topCol: goldDark, botCol: basaltDark, rough: 0.64, partId: 0.0 });
    b.addCrystal(0, 2.20, 0, 0.18, 0.18, 0.18, 4, goldDark, goldBright, 0.76, 4.0);
    // Inverted pointed basalt floating keel underneath
    b.addCrystal(0, 0.28, 0, 0.26, 0.22, 0.26, 4, basaltDark, basaltMid, 0.0, 0.0);

    // 4 Prominent Dark-Gold Talisman Strips (暗金符箓) affixed cleanly to ALL FOUR vertical faces! (partId=4)
    const dirs = [
      { cx: 0, cz:  0.395, hx: 0.14, hz: 0.018 },
      { cx: 0, cz: -0.395, hx: 0.14, hz: 0.018 },
      { cx:  0.395, cz: 0, hx: 0.018, hz: 0.14 },
      { cx: -0.395, cz: 0, hx: 0.018, hz: 0.14 },
    ];
    for (const d of dirs) {
      // Backing parchment-gold talisman strip
      b.addBox({ cx: d.cx, cy: 1.22, cz: d.cz, hx: d.hx, hy: 0.50, hz: d.hz, col: goldDark, topCol: goldBright, botCol: goldDark, rough: 0.30, emissive: 0.72, partId: 4.0 });
      // Raised bright-gold horizontal rune bars across each talisman
      for (let k = -2; k <= 2; k++) {
        const s = 1.08;
        b.addBox({ cx: d.cx * 1.03, cy: 1.22 + k * 0.16, cz: d.cz * 1.03, hx: d.hx * (d.hx > d.hz ? 0.72 : s), hy: 0.025, hz: d.hz * (d.hz > d.hx ? 0.72 : s), col: goldBright, rough: 0.20, emissive: 0.95, partId: 4.0 });
      }
    }

    // 2 Floating Detached Black-Stone Guardian Shoulder Blocks with Gold Sigils (partId 1=L, 2=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addBox({ cx: s * 0.76, cy: 1.32, cz: 0.0, hx: 0.16, hy: 0.34, hz: 0.18, rotZ: s * 0.12, col: basaltMid, topCol: basaltEdge, botCol: basaltDark, rough: 0.70, partId: pid });
      b.addBox({ cx: s * 0.76, cy: 1.32, cz: 0.19, hx: 0.07, hy: 0.22, hz: 0.016, rotZ: s * 0.12, col: goldBright, rough: 0.22, emissive: 0.80, partId: pid });
    }

    // Wide Orbiting Dark-Gold Ancient Array Ring + Counter-Tilted Inner Ring + Corner Bronze Brackets! (身周绕阵环, partId=3)
    b.addTorus({ cx: 0, cy: 1.12, cz: 0, majorR: 1.08, minorR: 0.036, rotX: 0.22, segs: 36, tubeSegs: 6, col: goldBright, rough: 0.22, emissive: 0.85, partId: 3.0 });
    b.addTorus({ cx: 0, cy: 1.12, cz: 0, majorR: 0.92, minorR: 0.022, rotX: 0.22, segs: 32, tubeSegs: 5, col: goldDark, rough: 0.28, emissive: 0.65, partId: 3.0 });
    b.addTorus({ cx: 0, cy: 1.16, cz: 0, majorR: 0.76, minorR: 0.020, rotX: -0.28, rotZ: 0.18, segs: 28, tubeSegs: 5, col: goldBright, rough: 0.22, emissive: 0.78, partId: 3.0 });
    // Glowing golden guardian eye-sigil on upper front obelisk face
    b.addCrystal(0, 1.76, 0.40, 0.085, 0.12, 0.045, 4, goldDark, goldBright, 0.95, 4.0);
    // 6 cardinal glowing rune nodes embedded along the orbiting array ring
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rx = Math.cos(a) * 1.00;
      const rz = Math.sin(a) * 1.00;
      const ry = 1.12 - rz * Math.sin(0.22);
      b.addCrystal(rx, ry, rz, 0.065, 0.11, 0.065, 4, goldDark, goldBright, 0.90, 3.0);
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 12) 玄冰狼妖 (冰霜雪原): 硕大银白巨狼，背与四肢凝半透明冰晶刺，吐寒雾
  function buildFrostWolfMesh() {
    const b = new MonsterMeshBuilder();
    const furWhite = [0.88, 0.93, 0.98];
    const furSilv  = [0.70, 0.79, 0.88];
    const furShade = [0.50, 0.60, 0.72];
    const iceCyan  = [0.50, 0.88, 1.00];
    const iceCore  = [0.84, 0.98, 1.00];

    // Massive muscular silver-white dire wolf chest, thick frosted mane ruff & hindquarters
    b.addEllipsoid({ cx: 0, cy: 0.82, cz:  0.38, rx: 0.42, ry: 0.38, rz: 0.48, uSegs: 20, vSegs: 14, col: furWhite, topCol: furWhite, botCol: furSilv, rough: 0.64, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.78, cz: -0.10, rx: 0.33, ry: 0.31, rz: 0.42, uSegs: 18, vSegs: 12, col: furSilv, topCol: furWhite, botCol: furShade, rough: 0.66, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.80, cz: -0.52, rx: 0.35, ry: 0.34, rz: 0.40, uSegs: 18, vSegs: 12, col: furSilv, topCol: furWhite, botCol: furShade, rough: 0.66, partId: 0.0 });
    // Shaggy frost-mane ruff around shoulders
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.addCone([Math.cos(a) * 0.34, 0.92, 0.56], [Math.cos(a) * 0.52, 0.98 + Math.sin(a) * 0.14, 0.34], 0.13, 0.025, 6, furWhite, furSilv, 0.68, 0.0, 0.0);
    }
    // Fierce lupine head + long wolf snout + tall pointed ears + glowing icy-blue eyes + frost breath wisp!
    b.addEllipsoid({ cx: 0, cy: 1.08, cz: 0.92, rx: 0.26, ry: 0.24, rz: 0.28, uSegs: 16, vSegs: 12, col: furWhite, topCol: [0.95, 0.98, 1.0], botCol: furSilv, rough: 0.60, partId: 0.0 });
    b.addCone([0, 1.02, 1.08], [0, 0.97, 1.44], 0.16, 0.075, 8, furWhite, furSilv, 0.58, 0.0, 0.0);
    b.addEllipsoid({ cx: 0, cy: 0.99, cz: 1.44, rx: 0.06, ry: 0.048, rz: 0.045, uSegs: 8, vSegs: 6, col: [0.14, 0.18, 0.24], rough: 0.22, partId: 0.0 });
    // Faint frost breath mist wisps curling near jaws (吐寒雾)
    b.addEllipsoid({ cx: -0.10, cy: 0.92, cz: 1.38, rx: 0.09, ry: 0.07, rz: 0.12, uSegs: 8, vSegs: 6, col: iceCore, rough: 0.2, emissive: 0.55, partId: 4.0 });
    b.addEllipsoid({ cx:  0.10, cy: 0.90, cz: 1.42, rx: 0.08, ry: 0.06, rz: 0.11, uSegs: 8, vSegs: 6, col: iceCyan, rough: 0.2, emissive: 0.55, partId: 4.0 });
    for (const s of [-1, 1]) {
      b.addCone([s * 0.17, 1.24, 0.86], [s * 0.24, 1.54, 0.80], 0.09, 0.015, 6, furWhite, furShade, 0.62, 0.0, 0.0);
      b.addEllipsoid({ cx: s * 0.13, cy: 1.13, cz: 1.12, rx: 0.052, ry: 0.036, rz: 0.038, rotZ: -s * 0.22, uSegs: 8, vSegs: 6, col: iceCore, rough: 0.10, emissive: 0.92, partId: 4.0 });
    }
    // Dramatic jagged translucent ice-crystal spikes along spine ridge! (partId=4)
    const backSpikes = [
      [ 0.00, 1.26,  0.48, 0.12, 0.34, -0.28, 0.0],
      [-0.18, 1.20,  0.30, 0.09, 0.26, -0.26, 0.32],
      [ 0.18, 1.20,  0.30, 0.09, 0.26, -0.26, -0.32],
      [ 0.00, 1.18,  0.04, 0.11, 0.32, -0.34, 0.0],
      [ 0.00, 1.14, -0.34, 0.10, 0.28, -0.40, 0.0],
      [-0.16, 1.10, -0.48, 0.08, 0.22, -0.42, 0.34],
      [ 0.16, 1.10, -0.48, 0.08, 0.22, -0.42, -0.34],
    ];
    for (const sp of backSpikes) {
      b.addCrystal(sp[0], sp[1], sp[2], sp[3], sp[4], sp[3], 5, iceCyan, iceCore, 0.72, 4.0, sp[5], 0, sp[6]);
    }
    // 4 powerful legs encrusted with jutting ice-crystal spikes! (partId 5=L, 6=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      b.addTube([
        { p: [s * 0.30, 0.72, 0.48], r: 0.15, col: furWhite },
        { p: [s * 0.32, 0.38, 0.52], r: 0.11, col: furSilv },
        { p: [s * 0.31, 0.06, 0.58], r: 0.10, col: furWhite },
      ], 8, 0.62, 0.0, pid);
      b.addTube([
        { p: [s * 0.30, 0.74, -0.56], r: 0.16, col: furWhite },
        { p: [s * 0.32, 0.40, -0.72], r: 0.115, col: furSilv },
        { p: [s * 0.31, 0.06, -0.60], r: 0.10, col: furWhite },
      ], 8, 0.62, 0.0, pid);
      // Translucent ice crystals encasing all 4 knees/forearms
      b.addCrystal(s * 0.42, 0.46, 0.44, 0.075, 0.20, 0.075, 5, iceCyan, iceCore, 0.68, pid, -0.4, 0, -s * 0.55);
      b.addCrystal(s * 0.42, 0.46, -0.74, 0.075, 0.20, 0.075, 5, iceCyan, iceCore, 0.68, pid, -0.45, 0, -s * 0.55);
    }
    // Bushy frost-tipped wolf tail + icy brow horn crown & frost fangs! (partId=3)
    b.addTube([
      { p: [0, 0.84, -0.84], r: 0.13, col: furWhite },
      { p: [0, 0.94, -1.20], r: 0.16, col: furSilv },
      { p: [0, 0.86, -1.56], r: 0.11, col: iceCore },
      { p: [0, 0.78, -1.78], r: 0.03, col: iceCyan },
    ], 8, 0.60, 0.12, 3.0);
    b.addCrystal(0, 1.38, 0.96, 0.06, 0.18, 0.06, 5, iceCyan, iceCore, 0.82, 4.0, -0.25, 0, 0);
    for (const s of [-1, 1]) {
      b.addCone([s * 0.08, 0.94, 1.34], [s * 0.08, 0.84, 1.36], 0.025, 0.005, 5, iceCore, iceCyan, 0.15, 0.55, 0.0);
      b.addCrystal(s * 0.44, 0.96, 0.38, 0.08, 0.22, 0.08, 5, iceCyan, iceCore, 0.72, 4.0, -0.2, 0, -s * 0.65);
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 13) 寒魄雪灵 (冰霜雪原): 悬浮深蓝冰晶核心裹旋转雪雾长袍，身周绕三枚冰棱
  function buildSnowSpiritMesh() {
    const b = new MonsterMeshBuilder();
    const deepIce  = [0.10, 0.32, 0.78];
    const coreBlue = [0.36, 0.76, 1.00];
    const robeSnow = [0.88, 0.95, 1.00];
    const robePale = [0.64, 0.84, 0.98];
    const prismIce = [0.46, 0.86, 1.00];

    // Radiant Faceted Deep-Blue Ice Crystal Core suspended at heart! (partId=4)
    b.addCrystal(0, 1.34, 0, 0.26, 0.44, 0.26, 6, deepIce, coreBlue, 0.95, 4.0);
    b.addCrystal(0, 1.34, 0, 0.18, 0.30, 0.18, 6, coreBlue, [0.82, 0.98, 1.0], 1.10, 4.0, 0, 0.52, 0);

    // Swirling layered snow-mist cloak & trailing spiral robes wrapping the crystal core (partId=0 -> twists softly in shader!)
    // Outer flowing bell-skirt layers with spiral pleats
    for (let layer = 0; layer < 4; layer++) {
      const a0 = (layer / 4) * Math.PI * 2;
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const ang = a0 + t * 1.15;
        const rad = 0.26 + t * 0.34;
        const y = 1.64 - t * 1.48;
        pts.push({
          p: [Math.cos(ang) * rad, y, Math.sin(ang) * rad],
          w: 0.24 + t * 0.16,
          t: 0.032,
          col: i < 2 ? robeSnow : (i < 5 ? robePale : deepIce),
        });
      }
      b.addCurvedBlade(pts, 2, 0.34, 0.18, 0.0);
    }
    // Ethereal high snow-mist collar & frosted ice-diadem halo above core
    b.addTorus({ cx: 0, cy: 1.72, cz: 0, majorR: 0.32, minorR: 0.085, segs: 20, tubeSegs: 8, col: robeSnow, rough: 0.36, emissive: 0.24, partId: 0.0 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.addCrystal(Math.cos(a) * 0.24, 1.94, Math.sin(a) * 0.24, 0.045, 0.14, 0.045, 4, prismIce, robeSnow, 0.72, 0.0, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    }

    // THREE Distinct Orbiting Faceted Ice Prisms + 3 Companion Frost Diamonds & Floating Ice Hands (身周绕三枚冰棱, partId=3)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addCrystal(s * 0.48, 1.18, 0.34, 0.075, 0.18, 0.075, 5, prismIce, robeSnow, 0.82, pid, 0.55, 0, -s * 0.25);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const px = Math.cos(a) * 0.96;
      const pz = Math.sin(a) * 0.96;
      const py = 1.24 + (i - 1) * 0.10;
      b.addCrystal(px, py, pz, 0.12, 0.36, 0.12, 6, deepIce, [0.76, 0.96, 1.0], 0.88, 3.0, 0.15, a, 0.12);
      // Thin luminous frost ring accent around each prism + secondary trailing frost crystal
      b.addTorus({ cx: px, cy: py, cz: pz, majorR: 0.16, minorR: 0.016, rotX: 0.3, segs: 12, tubeSegs: 5, col: robeSnow, rough: 0.2, emissive: 0.75, partId: 3.0 });
      const a2 = a + Math.PI / 3;
      b.addCrystal(Math.cos(a2) * 0.82, 1.05, Math.sin(a2) * 0.82, 0.065, 0.16, 0.065, 4, prismIce, robeSnow, 0.78, 3.0);
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // =========================================================
  // 3B. PURE-CODE MESHES — 7 REGIONAL ELITE MONSTERS (精英怪: 4 练气精英 + 3 筑基精英!)
  // =========================================================

  // 14) 青鬃奔雷马 (低云平原 · 练气精英): 体型比普通马略大，通体青灰带淡淡青光，鬃毛和马尾呈电光青色，蹄下带微弱气旋
  function buildThunderHorseMesh() {
    const b = new MonsterMeshBuilder();
    const coatMain  = [0.42, 0.56, 0.60]; // 通体青灰
    const coatLight = [0.58, 0.74, 0.78]; // 淡青微光脊背
    const coatDark  = [0.26, 0.36, 0.42];
    const elecCyan  = [0.22, 0.96, 1.00]; // 电光青色鬃毛与马尾
    const elecCore  = [0.78, 1.00, 1.00];
    const hoofCol   = [0.16, 0.24, 0.28];

    // Sculpted proud equine torso: deep muscular chest, barrel belly, rounded athletic croup (faint cyan sheen emissive 0.08)
    b.addEllipsoid({ cx: 0, cy: 1.02, cz:  0.46, rx: 0.40, ry: 0.42, rz: 0.52, uSegs: 20, vSegs: 14, col: coatMain, topCol: coatLight, botCol: coatDark, rough: 0.48, emissive: 0.08, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.98, cz: -0.04, rx: 0.36, ry: 0.37, rz: 0.50, uSegs: 18, vSegs: 12, col: coatMain, topCol: coatLight, botCol: coatDark, rough: 0.48, emissive: 0.08, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 1.04, cz: -0.54, rx: 0.41, ry: 0.40, rz: 0.48, uSegs: 20, vSegs: 14, col: coatMain, topCol: coatLight, botCol: coatDark, rough: 0.48, emissive: 0.08, partId: 0.0 });

    // Subtle glowing cyan lightning-vein markings across shoulders & flanks
    for (const s of [-1, 1]) {
      b.addBox({ cx: s * 0.38, cy: 1.08, cz: 0.42, hx: 0.022, hy: 0.14, hz: 0.045, rotX: 0.45, rotZ: s * 0.15, col: elecCyan, topCol: elecCore, rough: 0.20, emissive: 0.72, partId: 4.0 });
      b.addBox({ cx: s * 0.39, cy: 1.06, cz: -0.48, hx: 0.022, hy: 0.15, hz: 0.048, rotX: -0.50, rotZ: s * 0.18, col: elecCyan, topCol: elecCore, rough: 0.20, emissive: 0.72, partId: 4.0 });
    }

    // Arched powerful neck + sculpted noble stallion head + elongated muzzle + pointed equine ears + bright electric-cyan eyes
    b.addTube([
      { p: [0, 1.16, 0.74], r: 0.28, col: coatMain },
      { p: [0, 1.48, 0.96], r: 0.22, col: coatLight },
      { p: [0, 1.76, 1.08], r: 0.18, col: coatLight },
    ], 12, 0.48, 0.08, 0.0);
    b.addEllipsoid({ cx: 0, cy: 1.82, cz: 1.18, rx: 0.19, ry: 0.20, rz: 0.28, rotX: 0.22, uSegs: 16, vSegs: 12, col: coatLight, topCol: [0.68, 0.84, 0.88], botCol: coatMain, rough: 0.44, emissive: 0.09, partId: 0.0 });
    b.addCone([0, 1.78, 1.32], [0, 1.62, 1.68], 0.155, 0.088, 10, coatMain, coatDark, 0.46, 0.06, 0.0);
    // Faint electric-cyan forehead lightning blaze
    b.addCrystal(0, 1.86, 1.44, 0.042, 0.12, 0.032, 4, elecCyan, elecCore, 0.90, 4.0, 0.42, 0, 0);
    for (const s of [-1, 1]) {
      b.addCone([s * 0.12, 1.96, 1.06], [s * 0.17, 2.24, 1.04], 0.065, 0.012, 6, coatDark, elecCyan, 0.46, 0.24, 0.0);
      b.addEllipsoid({ cx: s * 0.15, cy: 1.84, cz: 1.30, rx: 0.042, ry: 0.034, rz: 0.038, uSegs: 8, vSegs: 6, col: elecCore, rough: 0.10, emissive: 0.98, partId: 4.0 });
    }

    // ELECTRIC-CYAN FLOWING MANE (电光青色鬃毛, jagged crackling crests running along neck to crown, partId=3)
    const maneCrests = [
      [[0, 2.00, 1.08], [0, 2.28, 0.90], 0.08],
      [[0, 1.88, 0.96], [0, 2.18, 0.72], 0.10],
      [[0, 1.72, 0.86], [0, 2.02, 0.56], 0.11],
      [[0, 1.54, 0.74], [0, 1.84, 0.42], 0.11],
      [[0, 1.38, 0.62], [0, 1.66, 0.28], 0.10],
    ];
    for (const mc of maneCrests) {
      b.addCurvedBlade([
        { p: mc[0], w: 0.055, t: 0.032, col: elecCyan },
        { p: [(mc[0][0] + mc[1][0]) * 0.5, (mc[0][1] + mc[1][1]) * 0.5 + 0.05, (mc[0][2] + mc[1][2]) * 0.5], w: mc[2], t: 0.028, col: elecCore },
        { p: mc[1], w: 0.018, t: 0.010, col: elecCore },
      ], 2, 0.22, 0.90, 3.0);
    }

    // ELECTRIC-CYAN SWEEPING LIGHTNING HORSE TAIL (电光青色马尾, multi-stream flowing plumes, partId=3)
    b.addCurvedBlade([
      { p: [0, 1.12, -0.92], w: 0.09, t: 0.05, col: elecCyan },
      { p: [0, 1.20, -1.32], w: 0.17, t: 0.055, col: elecCyan },
      { p: [0, 0.94, -1.72], w: 0.15, t: 0.042, col: elecCore },
      { p: [0, 0.62, -2.02], w: 0.03, t: 0.014, col: elecCore },
    ], 2, 0.22, 0.92, 3.0);
    for (const s of [-1, 1]) {
      b.addCurvedBlade([
        { p: [s * 0.05, 1.08, -0.94], w: 0.06, t: 0.03, col: elecCyan },
        { p: [s * 0.18, 1.08, -1.38], w: 0.10, t: 0.03, col: elecCore },
        { p: [s * 0.26, 0.76, -1.80], w: 0.02, t: 0.01, col: elecCore },
      ], 2, 0.22, 0.88, 3.0);
    }

    // 4 Tall Athletic Equine Legs + Glowing Electric Fetlocks + Faint Hoof Wind-Vortex Rings! (蹄下带微弱气旋)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      // Front leg
      b.addTube([
        { p: [s * 0.26, 0.96, 0.64], r: 0.13, col: coatMain },
        { p: [s * 0.27, 0.52, 0.68], r: 0.088, col: coatLight },
        { p: [s * 0.27, 0.14, 0.72], r: 0.072, col: coatDark },
        { p: [s * 0.27, 0.02, 0.74], r: 0.085, col: hoofCol },
      ], 8, 0.50, 0.06, pid);
      // Hind leg
      b.addTube([
        { p: [s * 0.27, 0.98, -0.64], r: 0.15, col: coatMain },
        { p: [s * 0.28, 0.56, -0.80], r: 0.095, col: coatLight },
        { p: [s * 0.27, 0.14, -0.68], r: 0.074, col: coatDark },
        { p: [s * 0.27, 0.02, -0.66], r: 0.085, col: hoofCol },
      ], 8, 0.50, 0.06, pid);
      // Glowing electric fetlock tufts & faint swirling wind-vortex torus rings around all 4 hooves!
      b.addTorus({ cx: s * 0.27, cy: 0.10, cz:  0.73, majorR: 0.17, minorR: 0.018, rotX: 0.12, segs: 16, tubeSegs: 5, col: elecCyan, rough: 0.18, emissive: 0.78, partId: pid });
      b.addTorus({ cx: s * 0.27, cy: 0.10, cz: -0.67, majorR: 0.17, minorR: 0.018, rotX: -0.12, segs: 16, tubeSegs: 5, col: elecCyan, rough: 0.18, emissive: 0.78, partId: pid });
      b.addCone([s * 0.27, 0.22,  0.66], [s * 0.27, 0.14,  0.50], 0.048, 0.010, 6, elecCyan, elecCore, 0.24, 0.85, pid);
      b.addCone([s * 0.27, 0.22, -0.74], [s * 0.27, 0.14, -0.90], 0.048, 0.010, 6, elecCyan, elecCore, 0.24, 0.85, pid);
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 15) 沼泽毒蛙精 (迷雾湿地 · 练气精英): 直立矮壮蛙形精怪，暗绿与紫斑交错，背部鼓起发暗绿光的毒疱，眼珠泛黄
  function buildSwampFrogEliteMesh() {
    const b = new MonsterMeshBuilder();
    const skinGreen  = [0.13, 0.34, 0.17]; // 暗绿蛙皮
    const skinDark   = [0.08, 0.22, 0.12];
    const bellyMud   = [0.36, 0.44, 0.26];
    const purpleSpot = [0.40, 0.18, 0.50]; // 交错紫斑
    const toxinGlow  = [0.22, 0.82, 0.24]; // 发暗绿光的毒疱
    const toxinCore  = [0.48, 0.96, 0.36];
    const eyeYellow  = [0.98, 0.90, 0.20]; // 泛黄眼珠

    // Upright stocky hulking frog-demon torso (standing bipedal, wide barrel chest & protruding belly!)
    b.addEllipsoid({ cx: 0, cy: 0.84, cz: 0.02, rx: 0.64, ry: 0.56, rz: 0.54, uSegs: 22, vSegs: 16, col: skinGreen, topCol: skinDark, botCol: bellyMud, rough: 0.40, partId: 0.0 });
    // Prominent pale-olive protruding frog belly plate
    b.addEllipsoid({ cx: 0, cy: 0.74, cz: 0.32, rx: 0.44, ry: 0.40, rz: 0.32, uSegs: 16, vSegs: 12, col: bellyMud, topCol: skinGreen, botCol: [0.28, 0.34, 0.20], rough: 0.44, partId: 0.0 });
    // Hunched muscular frog shoulders
    b.addEllipsoid({ cx: 0, cy: 1.24, cz: -0.06, rx: 0.58, ry: 0.28, rz: 0.44, uSegs: 16, vSegs: 10, col: skinDark, topCol: skinGreen, rough: 0.42, partId: 0.0 });

    // Interlacing purple mottled skin patches (暗绿与紫斑交错) across flanks, shoulders, chest & thighs
    const purpPatches = [
      [-0.48, 0.98,  0.22, 0.17, 0.12, 0.14],
      [ 0.48, 0.94,  0.20, 0.18, 0.13, 0.14],
      [-0.44, 0.66,  0.24, 0.15, 0.11, 0.13],
      [ 0.42, 0.68,  0.26, 0.16, 0.11, 0.13],
      [-0.36, 1.30,  0.14, 0.15, 0.10, 0.14],
      [ 0.36, 1.28,  0.14, 0.15, 0.10, 0.14],
      [-0.42, 1.12, -0.32, 0.16, 0.13, 0.13],
      [ 0.42, 1.10, -0.34, 0.16, 0.13, 0.13],
      [ 0.00, 1.38,  0.22, 0.18, 0.09, 0.14],
    ];
    for (const pp of purpPatches) {
      b.addEllipsoid({ cx: pp[0], cy: pp[1], cz: pp[2], rx: pp[3], ry: pp[4], rz: pp[5], uSegs: 10, vSegs: 8, col: purpleSpot, topCol: [0.54, 0.26, 0.64], botCol: skinDark, rough: 0.36, partId: 0.0 });
    }

    // 7 Prominent Bulging Dark-Green Glowing Poison Pustules on Back (背部鼓起几颗发暗绿光的毒疱, partId=4)
    const pustules = [
      [ 0.00, 1.24, -0.48, 0.17],
      [-0.28, 1.32, -0.40, 0.15],
      [ 0.28, 1.30, -0.42, 0.16],
      [-0.36, 1.00, -0.48, 0.14],
      [ 0.34, 0.98, -0.48, 0.15],
      [ 0.00, 0.92, -0.54, 0.16],
      [ 0.02, 1.46, -0.28, 0.13],
    ];
    for (const ps of pustules) {
      // Dark purple-green rim collar + glowing dark-green toxic blister dome
      b.addEllipsoid({ cx: ps[0], cy: ps[1], cz: ps[2] + 0.04, rx: ps[3] * 1.14, ry: ps[3] * 1.08, rz: ps[3] * 0.72, uSegs: 10, vSegs: 8, col: purpleSpot, rough: 0.42, partId: 0.0 });
      b.addEllipsoid({ cx: ps[0], cy: ps[1], cz: ps[2] - 0.02, rx: ps[3], ry: ps[3] * 0.95, rz: ps[3] * 0.92, uSegs: 12, vSegs: 10, col: toxinGlow, topCol: toxinCore, botCol: [0.12, 0.48, 0.14], rough: 0.16, emissive: 0.78, partId: 4.0 });
    }

    // Broad upright frog head + wide grimacing jaw + inflated throat pouch + bulging YELLOW EYES (眼珠泛黄)
    b.addEllipsoid({ cx: 0, cy: 1.48, cz: 0.16, rx: 0.48, ry: 0.28, rz: 0.42, uSegs: 18, vSegs: 12, col: skinGreen, topCol: skinDark, botCol: bellyMud, rough: 0.38, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 1.24, cz: 0.42, rx: 0.30, ry: 0.17, rz: 0.24, uSegs: 14, vSegs: 10, col: [0.34, 0.44, 0.24], topCol: purpleSpot, rough: 0.34, emissive: 0.10, partId: 4.0 });
    b.addEllipsoid({ cx: 0, cy: 1.38, cz: 0.52, rx: 0.34, ry: 0.055, rz: 0.09, uSegs: 12, vSegs: 6, col: [0.10, 0.06, 0.10], rough: 0.35, partId: 0.0 });
    for (const s of [-1, 1]) {
      // Heavy raised frog eye sockets + big vivid glowing YELLOW eyeballs + dark horizontal pupils
      b.addEllipsoid({ cx: s * 0.26, cy: 1.72, cz: 0.28, rx: 0.15, ry: 0.14, rz: 0.14, uSegs: 12, vSegs: 8, col: skinDark, topCol: purpleSpot, rough: 0.38, partId: 0.0 });
      b.addEllipsoid({ cx: s * 0.27, cy: 1.73, cz: 0.39, rx: 0.092, ry: 0.088, rz: 0.064, uSegs: 12, vSegs: 8, col: eyeYellow, topCol: [1.0, 0.98, 0.56], rough: 0.12, emissive: 0.72, partId: 0.0 });
      b.addEllipsoid({ cx: s * 0.27, cy: 1.73, cz: 0.448, rx: 0.052, ry: 0.020, rz: 0.018, uSegs: 6, vSegs: 6, col: [0.05, 0.04, 0.03], rough: 0.1, partId: 0.0 });
    }

    // Burly muscular frog arms with purple spots & 3-fingered webbed claws (partId 1=L, 2=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addTube([
        { p: [s * 0.58, 1.18, 0.04], r: 0.19, col: skinDark },
        { p: [s * 0.80, 0.88, 0.18], r: 0.16, col: skinGreen },
        { p: [s * 0.76, 0.54, 0.38], r: 0.15, col: purpleSpot },
      ], 9, 0.42, 0.0, pid);
      for (let f = -1; f <= 1; f++) {
        b.addCone([s * 0.76, 0.52, 0.42], [s * (0.80 + f * 0.09), 0.34, 0.62 + (1 - Math.abs(f)) * 0.06], 0.048, 0.016, 6, skinGreen, toxinGlow, 0.38, 0.22, pid);
      }
    }

    // Thick squat muscular upright frog legs & wide webbed feet (partId 5=L, 6=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      b.addEllipsoid({ cx: s * 0.42, cy: 0.40, cz: -0.02, rx: 0.24, ry: 0.28, rz: 0.26, uSegs: 12, vSegs: 8, col: skinGreen, topCol: purpleSpot, botCol: skinDark, rough: 0.44, partId: pid });
      b.addTube([
        { p: [s * 0.42, 0.34, -0.04], r: 0.15, col: skinDark },
        { p: [s * 0.46, 0.10,  0.08], r: 0.13, col: skinGreen },
      ], 8, 0.46, 0.0, pid);
      for (let t = -1; t <= 1; t++) {
        b.addCone([s * 0.46, 0.07, 0.14], [s * (0.48 + t * 0.13), 0.03, 0.46 + (1 - Math.abs(t)) * 0.06], 0.055, 0.018, 6, skinGreen, bellyMud, 0.48, 0.0, pid);
      }
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 16) 灵羽山雀 (云雾山 · 练气精英): 比普通山雀大一圈，浅青和云白羽毛为主，尾羽带淡金光泽
  function buildSpiritTitEliteMesh() {
    const b = new MonsterMeshBuilder();
    const paleCyan   = [0.54, 0.88, 0.90]; // 浅青灵羽
    const cloudWhite = [0.95, 0.99, 1.00]; // 云白胸腹与羽缘
    const deepTeal   = [0.30, 0.66, 0.74];
    const paleGold   = [0.98, 0.88, 0.50]; // 尾羽淡金光泽
    const goldShine  = [1.00, 0.96, 0.72];

    // Fuller, regal plump mountain-tit torso: cloud-white underside + pale-cyan back & shoulders
    b.addEllipsoid({ cx: 0, cy: 0.58, cz: 0.0, rx: 0.42, ry: 0.36, rz: 0.54, uSegs: 22, vSegs: 16, col: paleCyan, topCol: deepTeal, botCol: cloudWhite, rough: 0.42, emissive: 0.06, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.52, cz: 0.24, rx: 0.35, ry: 0.28, rz: 0.34, uSegs: 16, vSegs: 12, col: cloudWhite, botCol: paleCyan, rough: 0.40, emissive: 0.06, partId: 0.0 });
    // Delicate pale-gold chest collar sheen
    b.addTorus({ cx: 0, cy: 0.68, cz: 0.28, majorR: 0.26, minorR: 0.022, rotX: 0.65, segs: 18, tubeSegs: 6, col: paleGold, rough: 0.28, emissive: 0.38, partId: 0.0 });

    // Sculpted tit head: cloud-white cheeks, pale-cyan crown, 3-plume regal spirit crest, golden beak & dark bright eyes
    b.addEllipsoid({ cx: 0, cy: 0.88, cz: 0.36, rx: 0.29, ry: 0.27, rz: 0.30, uSegs: 18, vSegs: 14, col: cloudWhite, topCol: paleCyan, botCol: cloudWhite, rough: 0.40, partId: 0.0 });
    for (let c = -1; c <= 1; c++) {
      b.addCurvedBlade([
        { p: [c * 0.06, 1.10, 0.34], w: 0.045, t: 0.015, col: paleCyan },
        { p: [c * 0.12, 1.32 - Math.abs(c) * 0.05, 0.14], w: 0.068, t: 0.014, col: c === 0 ? paleGold : cloudWhite },
        { p: [c * 0.16, 1.38 - Math.abs(c) * 0.07, -0.10], w: 0.015, t: 0.007, col: goldShine },
      ], 2, 0.34, 0.28, 0.0);
    }
    b.addCone([0, 0.86, 0.64], [0, 0.80, 0.90], 0.076, 0.009, 8, paleGold, goldShine, 0.28, 0.12, 0.0);
    for (const s of [-1, 1]) {
      b.addEllipsoid({ cx: s * 0.18, cy: 0.93, cz: 0.56, rx: 0.056, ry: 0.060, rz: 0.042, uSegs: 10, vSegs: 8, col: [0.06, 0.12, 0.16], rough: 0.10, partId: 0.0 });
      b.addEllipsoid({ cx: s * 0.19, cy: 0.95, cz: 0.59, rx: 0.018, ry: 0.018, rz: 0.014, uSegs: 6, vSegs: 6, col: goldShine, rough: 0.10, emissive: 0.65, partId: 0.0 });
      // Tucked golden mountain-bird talons
      b.addCone([s * 0.16, 0.26, 0.04], [s * 0.18, 0.10, 0.16], 0.045, 0.014, 6, paleGold, goldShine, 0.34, 0.10, 0.0);
    }

    // Broad Majestic 3-Tier Flapping Wings in Cloud-White & Pale-Cyan with Faint Gold Wingtips! (partId 1=L, 2=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addCurvedBlade([
        { p: [s * 0.30, 0.66,  0.10], w: 0.26, t: 0.052, col: cloudWhite },
        { p: [s * 0.78, 0.78,  0.00], w: 0.32, t: 0.040, col: paleCyan },
        { p: [s * 1.28, 0.74, -0.14], w: 0.22, t: 0.025, col: deepTeal },
        { p: [s * 1.66, 0.64, -0.28], w: 0.035, t: 0.010, col: paleGold },
      ], 2, 0.36, 0.14, pid);
      b.addCurvedBlade([
        { p: [s * 0.48, 0.62, -0.08], w: 0.18, t: 0.030, col: paleCyan },
        { p: [s * 1.04, 0.64, -0.26], w: 0.15, t: 0.018, col: cloudWhite },
        { p: [s * 1.44, 0.56, -0.40], w: 0.024, t: 0.008, col: goldShine },
      ], 2, 0.34, 0.20, pid);
      b.addCurvedBlade([
        { p: [s * 0.36, 0.68, 0.18], w: 0.14, t: 0.032, col: cloudWhite },
        { p: [s * 0.86, 0.76, 0.08], w: 0.12, t: 0.022, col: cloudWhite },
        { p: [s * 1.24, 0.72, -0.02], w: 0.025, t: 0.009, col: paleCyan },
      ], 2, 0.38, 0.10, pid);
    }

    // 5 Fanned Long Elegant Tail Plumes with Subtle Pale-Gold Sheen + Twin Cloud-Gold Streamers! (尾羽带一点淡金光泽, partId=3)
    for (let f = -2; f <= 2; f++) {
      const len = 1.42 - Math.abs(f) * 0.14;
      b.addCurvedBlade([
        { p: [f * 0.06, 0.56, -0.44], w: 0.10, t: 0.022, col: paleCyan },
        { p: [f * 0.17, 0.54, -0.44 - len * 0.52], w: 0.13, t: 0.016, col: cloudWhite },
        { p: [f * 0.28, 0.50, -0.44 - len], w: 0.032, t: 0.008, col: paleGold },
      ], 2, 0.30, 0.34, 3.0);
    }
    for (const s of [-1, 1]) {
      b.addCurvedBlade([
        { p: [s * 0.10, 0.56, -0.78], w: 0.052, t: 0.020, col: cloudWhite },
        { p: [s * 0.26, 0.66, -1.36], w: 0.072, t: 0.022, col: paleGold },
        { p: [s * 0.16, 0.48, -1.94], w: 0.052, t: 0.016, col: goldShine },
        { p: [s * 0.32, 0.56, -2.42], w: 0.014, t: 0.007, col: goldShine },
      ], 2, 0.26, 0.52, 3.0);
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 17) 沙地赤蝎 (沙漠荒原 · 练气精英): 甲壳土红与暗褐拼接，钳子厚实，尾钩泛暗红微光
  function buildCrimsonScorpionEliteMesh() {
    const b = new MonsterMeshBuilder();
    const terraRed   = [0.74, 0.23, 0.15]; // 土红甲壳
    const redBright  = [0.88, 0.34, 0.20];
    const umberDark  = [0.28, 0.15, 0.10]; // 暗褐拼接甲壳
    const umberMid   = [0.42, 0.22, 0.14];
    const crimsonGlw = [0.86, 0.14, 0.12]; // 暗红微光尾钩
    const crimsonTip = [1.00, 0.34, 0.22];

    // Heavy wide terracotta-red & dark-umber spliced armored thorax + 5 overlapping ridged carapace plates
    b.addEllipsoid({ cx: 0, cy: 0.38, cz: 0.30, rx: 0.48, ry: 0.28, rz: 0.46, uSegs: 18, vSegs: 12, col: terraRed, topCol: redBright, botCol: umberDark, rough: 0.38, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.52, cz: 0.34, rx: 0.32, ry: 0.15, rz: 0.30, uSegs: 14, vSegs: 8, col: umberDark, topCol: umberMid, rough: 0.42, partId: 0.0 });
    for (let i = 0; i < 5; i++) {
      const z = -0.02 - i * 0.20;
      const sc = 1.0 - i * 0.12;
      const isRed = (i % 2 === 0);
      b.addEllipsoid({
        cx: 0, cy: 0.36 + i * 0.012, cz: z,
        rx: 0.44 * sc, ry: 0.25 * sc, rz: 0.22 * sc,
        uSegs: 14, vSegs: 10,
        col: isRed ? terraRed : umberMid,
        topCol: isRed ? redBright : umberDark,
        botCol: umberDark,
        rough: 0.38, partId: 0.0,
      });
      b.addCone([0, 0.54 * sc + 0.08, z], [0, 0.68 * sc + 0.14, z - 0.08], 0.055 * sc, 0.010, 5, umberDark, redBright, 0.40, 0.0, 0.0);
    }
    // Glowing fierce crimson-amber eyes + armored mandibles + flanking armor spikes
    for (const s of [-1, 1]) {
      b.addEllipsoid({ cx: s * 0.18, cy: 0.50, cz: 0.70, rx: 0.056, ry: 0.050, rz: 0.044, uSegs: 8, vSegs: 6, col: crimsonTip, rough: 0.12, emissive: 0.72, partId: 0.0 });
      b.addCone([s * 0.11, 0.28, 0.72], [s * 0.05, 0.23, 0.92], 0.054, 0.012, 6, umberDark, terraRed, 0.38, 0.0, 0.0);
      b.addCone([s * 0.46, 0.40, 0.22], [s * 0.64, 0.48, 0.10], 0.048, 0.010, 5, umberDark, redBright, 0.40, 0.0, 0.0);
      b.addCone([s * 0.40, 0.38, -0.16], [s * 0.58, 0.46, -0.26], 0.042, 0.010, 5, umberDark, redBright, 0.40, 0.0, 0.0);
    }

    // MASSIVE THICK HEAVY ARMORED PINCERS (钳子厚实! partId 1=L, 2=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 1.0 : 2.0;
      b.addTube([
        { p: [s * 0.36, 0.36, 0.50], r: 0.135, col: umberDark },
        { p: [s * 0.68, 0.38, 0.74], r: 0.130, col: terraRed },
        { p: [s * 0.66, 0.42, 1.04], r: 0.175, col: redBright },
      ], 9, 0.36, 0.0, pid);
      // Heavy bulbous pincer palm & thick crushing double jaws!
      b.addEllipsoid({ cx: s * 0.64, cy: 0.42, cz: 1.08, rx: 0.21, ry: 0.16, rz: 0.24, uSegs: 12, vSegs: 10, col: terraRed, topCol: redBright, botCol: umberDark, rough: 0.34, partId: pid });
      b.addCone([s * 0.72, 0.42, 1.20], [s * 0.44, 0.44, 1.56], 0.105, 0.018, 7, redBright, umberDark, 0.34, 0.0, pid);
      b.addCone([s * 0.52, 0.40, 1.20], [s * 0.36, 0.42, 1.48], 0.082, 0.015, 7, umberMid, umberDark, 0.34, 0.0, pid);
    }

    // 8 Sturdy Jointed Desert Scorpion Legs (partId 5=L, 6=R)
    for (let i = 0; i < 4; i++) {
      const z = 0.38 - i * 0.24;
      for (const s of [-1, 1]) {
        const pid = s < 0 ? 5.0 : 6.0;
        b.addTube([
          { p: [s * 0.38, 0.32, z], r: 0.072, col: umberDark },
          { p: [s * 0.68, 0.40, z - 0.04], r: 0.060, col: terraRed },
          { p: [s * 0.82, 0.04, z - 0.08], r: 0.028, col: umberDark },
        ], 6, 0.46, 0.0, pid);
      }
    }

    // High Arched 6-Segment Armored Tail (partId=3) + Glowing DARK-CRIMSON Stinger Vesicle & Barb (尾钩泛暗红微光, partId=4)
    const tailPts = [
      [0, 0.44, -0.82, 0.165],
      [0, 0.68, -0.98, 0.150],
      [0, 0.96, -0.94, 0.135],
      [0, 1.22, -0.76, 0.122],
      [0, 1.38, -0.46, 0.110],
    ];
    for (let i = 0; i < tailPts.length; i++) {
      const ts = tailPts[i];
      const isR = (i % 2 === 0);
      b.addEllipsoid({ cx: ts[0], cy: ts[1], cz: ts[2], rx: ts[3], ry: ts[3] * 1.12, rz: ts[3] * 1.20, uSegs: 12, vSegs: 8, col: isR ? terraRed : umberMid, topCol: isR ? redBright : umberDark, botCol: umberDark, rough: 0.36, partId: 3.0 });
      b.addCone([0, ts[1] + ts[3] * 0.72, ts[2] - ts[3] * 0.42], [0, ts[1] + ts[3] * 1.42, ts[2] - ts[3] * 0.98], 0.042, 0.010, 5, umberDark, redBright, 0.4, 0.0, 3.0);
    }
    b.addEllipsoid({ cx: 0, cy: 1.42, cz: -0.22, rx: 0.16, ry: 0.14, rz: 0.18, uSegs: 14, vSegs: 10, col: crimsonGlw, topCol: crimsonTip, botCol: [0.46, 0.06, 0.06], rough: 0.16, emissive: 0.78, partId: 4.0 });
    b.addCone([0, 1.42, -0.05], [0, 1.24, 0.34], 0.078, 0.010, 8, crimsonGlw, crimsonTip, 0.14, 0.90, 4.0);

    b.alignBottom(0.0);
    return b.build();
  }

  // 18) 古木灵鹿 (通天木林 · 筑基精英): 体型偏修长鹿形精怪，皮毛深褐带青苔绿，鹿角生嫩绿灵叶，蹄子带木系微光
  function buildAncientWoodDeerMesh() {
    const b = new MonsterMeshBuilder();
    const furBrown   = [0.30, 0.20, 0.12]; // 深褐皮毛
    const furDark    = [0.18, 0.12, 0.08];
    const mossGreen  = [0.22, 0.50, 0.24]; // 青苔绿
    const mossLite   = [0.34, 0.68, 0.30];
    const leafBright = [0.46, 0.96, 0.42]; // 嫩绿灵叶
    const woodGlow   = [0.28, 0.96, 0.60]; // 蹄子木系微光
    const woodCore   = [0.74, 1.00, 0.80];

    // Slender, tall, graceful stag torso with deep bark-brown coat & mossy green back saddle!
    b.addEllipsoid({ cx: 0, cy: 1.18, cz:  0.40, rx: 0.30, ry: 0.34, rz: 0.48, uSegs: 18, vSegs: 14, col: furBrown, topCol: mossGreen, botCol: furDark, rough: 0.62, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 1.16, cz: -0.06, rx: 0.26, ry: 0.28, rz: 0.46, uSegs: 16, vSegs: 12, col: furBrown, topCol: mossGreen, botCol: furDark, rough: 0.62, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 1.18, cz: -0.48, rx: 0.30, ry: 0.32, rz: 0.44, uSegs: 18, vSegs: 12, col: furBrown, topCol: mossGreen, botCol: furDark, rough: 0.62, partId: 0.0 });
    // Sculpted mossy-green foliage patches & delicate glowing wood-veins across shoulders & back
    const mossPatches = [
      [-0.22, 1.38,  0.34, 0.16, 0.10, 0.20],
      [ 0.22, 1.38,  0.32, 0.16, 0.10, 0.20],
      [ 0.00, 1.44, -0.02, 0.20, 0.08, 0.30],
      [-0.24, 1.34, -0.38, 0.15, 0.10, 0.18],
      [ 0.24, 1.34, -0.38, 0.15, 0.10, 0.18],
    ];
    for (const mp of mossPatches) {
      b.addEllipsoid({ cx: mp[0], cy: mp[1], cz: mp[2], rx: mp[3], ry: mp[4], rz: mp[5], uSegs: 10, vSegs: 8, col: mossGreen, topCol: mossLite, botCol: furDark, rough: 0.72, partId: 0.0 });
    }

    // Long slender arched deer neck + refined stag head + elongated snout + delicate ears + emerald spirit eyes
    b.addTube([
      { p: [0, 1.34, 0.64], r: 0.20, col: furBrown },
      { p: [0, 1.72, 0.80], r: 0.15, col: furBrown },
      { p: [0, 2.04, 0.90], r: 0.13, col: mossGreen },
    ], 10, 0.58, 0.0, 0.0);
    b.addEllipsoid({ cx: 0, cy: 2.10, cz: 1.00, rx: 0.15, ry: 0.16, rz: 0.24, rotX: 0.15, uSegs: 14, vSegs: 10, col: furBrown, topCol: mossGreen, botCol: furDark, rough: 0.56, partId: 0.0 });
    b.addCone([0, 2.08, 1.12], [0, 1.98, 1.46], 0.12, 0.055, 8, furBrown, furDark, 0.56, 0.0, 0.0);
    // Glowing wood-spirit emerald forehead diamond
    b.addCrystal(0, 2.18, 1.20, 0.036, 0.085, 0.028, 4, woodGlow, woodCore, 0.88, 4.0, 0.35, 0, 0);
    for (const s of [-1, 1]) {
      b.addCone([s * 0.12, 2.20, 0.88], [s * 0.28, 2.38, 0.76], 0.055, 0.012, 6, furBrown, mossLite, 0.58, 0.0, 0.0);
      b.addEllipsoid({ cx: s * 0.12, cy: 2.13, cz: 1.12, rx: 0.036, ry: 0.030, rz: 0.032, uSegs: 8, vSegs: 6, col: woodCore, rough: 0.12, emissive: 0.92, partId: 4.0 });
    }

    // MAJESTIC ANCIENT BRANCHING WOOD ANTLERS WITH TENDER LUMINOUS GREEN SPIRIT LEAVES! (鹿角生嫩绿灵叶, partId=3)
    for (const s of [-1, 1]) {
      // Main sweeping antler beam
      b.addTube([
        { p: [s * 0.09, 2.24, 0.94], r: 0.042, col: furDark },
        { p: [s * 0.28, 2.54, 0.88], r: 0.035, col: furBrown },
        { p: [s * 0.54, 2.86, 0.80], r: 0.026, col: furBrown },
        { p: [s * 0.68, 3.16, 0.72], r: 0.014, col: mossLite },
      ], 7, 0.74, 0.0, 3.0);
      // Forward & upward antler tines
      b.addCone([s * 0.24, 2.48, 0.90], [s * 0.32, 2.74, 1.16], 0.028, 0.008, 6, furBrown, mossLite, 0.72, 0.0, 3.0);
      b.addCone([s * 0.44, 2.74, 0.83], [s * 0.36, 3.06, 0.94], 0.024, 0.008, 6, furBrown, mossLite, 0.72, 0.0, 3.0);
      b.addCone([s * 0.56, 2.90, 0.78], [s * 0.78, 3.02, 0.88], 0.020, 0.007, 6, furBrown, mossLite, 0.72, 0.0, 3.0);

      // 5 Tender Glowing Green Spirit Leaves sprouting gracefully from each antler!
      const leafNodes = [
        [s * 0.32, 2.72, 1.14,  s * 0.18,  0.14,  0.18],
        [s * 0.36, 3.04, 0.94, -s * 0.12,  0.18,  0.12],
        [s * 0.66, 3.14, 0.74,  s * 0.18,  0.16, -0.10],
        [s * 0.76, 3.00, 0.88,  s * 0.20,  0.08,  0.12],
        [s * 0.46, 2.78, 0.82,  s * 0.14,  0.12, -0.18],
      ];
      for (const ln of leafNodes) {
        b.addCurvedBlade([
          { p: [ln[0], ln[1], ln[2]], w: 0.025, t: 0.012, col: mossLite },
          { p: [ln[0] + ln[3] * 0.55, ln[1] + ln[4] * 0.65, ln[2] + ln[5] * 0.55], w: 0.082, t: 0.016, col: leafBright },
          { p: [ln[0] + ln[3], ln[1] + ln[4], ln[2] + ln[5]], w: 0.014, t: 0.006, col: woodCore },
        ], 2, 0.32, 0.54, 3.0);
      }
    }

    // Short bushy moss-tipped deer tail (partId=3)
    b.addCone([0, 1.24, -0.88], [0, 1.38, -1.14], 0.10, 0.022, 7, furBrown, mossLite, 0.62, 0.08, 3.0);

    // 4 Long Slender Graceful Stag Legs with WOOD-ELEMENT GLOWING HOOVES! (蹄子带木系微光, partId 5=L, 6=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      // Slender front leg
      b.addTube([
        { p: [s * 0.20, 1.12, 0.52], r: 0.098, col: furBrown },
        { p: [s * 0.21, 0.60, 0.56], r: 0.064, col: furDark },
        { p: [s * 0.21, 0.14, 0.58], r: 0.052, col: furDark },
      ], 8, 0.58, 0.0, pid);
      // Slender hind leg
      b.addTube([
        { p: [s * 0.21, 1.14, -0.54], r: 0.115, col: furBrown },
        { p: [s * 0.22, 0.64, -0.70], r: 0.070, col: furDark },
        { p: [s * 0.21, 0.14, -0.58], r: 0.054, col: furDark },
      ], 8, 0.58, 0.0, pid);
      // Glowing emerald wood-spirit hooves & subtle floating emerald ankle-aura rings!
      b.addEllipsoid({ cx: s * 0.21, cy: 0.06, cz:  0.60, rx: 0.072, ry: 0.075, rz: 0.082, uSegs: 10, vSegs: 8, col: woodGlow, topCol: woodCore, rough: 0.18, emissive: 0.88, partId: pid });
      b.addEllipsoid({ cx: s * 0.21, cy: 0.06, cz: -0.56, rx: 0.072, ry: 0.075, rz: 0.082, uSegs: 10, vSegs: 8, col: woodGlow, topCol: woodCore, rough: 0.18, emissive: 0.88, partId: pid });
      b.addTorus({ cx: s * 0.21, cy: 0.11, cz:  0.60, majorR: 0.135, minorR: 0.015, segs: 14, tubeSegs: 5, col: leafBright, rough: 0.20, emissive: 0.80, partId: pid });
      b.addTorus({ cx: s * 0.21, cy: 0.11, cz: -0.56, majorR: 0.135, minorR: 0.015, segs: 14, tubeSegs: 5, col: leafBright, rough: 0.20, emissive: 0.80, partId: pid });
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 19) 古剑灵卫 (残阵古道 · 筑基精英): 残破古剑剑气与青铜碎甲凝聚的人形剑灵，身侧悬浮幽蓝剑影，周身剑阵光环
  function buildAncientSwordWraithMesh() {
    const b = new MonsterMeshBuilder();
    const bronzeMain = [0.34, 0.44, 0.40]; // 青铜碎甲
    const bronzeGold = [0.60, 0.52, 0.32];
    const bronzeDark = [0.18, 0.23, 0.22];
    const swordBlue  = [0.24, 0.78, 1.00]; // 幽蓝剑气
    const swordCore  = [0.76, 0.96, 1.00];
    const swordDeep  = [0.12, 0.42, 0.84];

    // Condensing humanoid sword-qi inner body core wrapped by fractured hovering bronze armor shards!
    b.addCrystal(0, 1.24, 0.0, 0.22, 0.48, 0.18, 6, swordBlue, swordCore, 0.96, 4.0);
    // Fractured floating bronze breastplate, backplate & waist tassets (intentionally separated to reveal glowing sword-qi!)
    b.addBox({ cx: -0.14, cy: 1.32, cz:  0.22, hx: 0.17, hy: 0.26, hz: 0.045, rotZ: 0.08, col: bronzeMain, topCol: bronzeGold, botCol: bronzeDark, rough: 0.46, partId: 0.0 });
    b.addBox({ cx:  0.15, cy: 1.24, cz:  0.21, hx: 0.15, hy: 0.22, hz: 0.045, rotZ: -0.12, col: bronzeMain, topCol: bronzeGold, botCol: bronzeDark, rough: 0.46, partId: 0.0 });
    b.addBox({ cx:  0.00, cy: 1.28, cz: -0.22, hx: 0.28, hy: 0.30, hz: 0.045, col: bronzeDark, topCol: bronzeMain, rough: 0.50, partId: 0.0 });
    b.addBox({ cx:  0.00, cy: 0.86, cz:  0.00, hx: 0.30, hy: 0.06, hz: 0.22, col: bronzeGold, botCol: bronzeDark, rough: 0.44, partId: 0.0 });
    // Flowing spectral sword-qi waist robes & shredded ancient bronze fauld plates
    for (let i = -1; i <= 1; i++) {
      b.addBox({ cx: i * 0.22, cy: 0.56, cz: 0.18, hx: 0.08, hy: 0.22, hz: 0.025, rotX: -0.14, col: bronzeMain, botCol: swordBlue, rough: 0.44, emissive: 0.24, partId: 0.0 });
    }
    b.addCurvedBlade([
      { p: [0, 0.84, -0.18], w: 0.26, t: 0.025, col: swordDeep },
      { p: [0, 0.44, -0.28], w: 0.32, t: 0.022, col: swordBlue },
      { p: [0, 0.08, -0.44], w: 0.12, t: 0.012, col: swordCore },
    ], 2, 0.26, 0.65, 0.0);

    // Crowned Ancient Bronze Sword-Helm + Burning Ghostly-Blue Sword-Qi Visor Eyes & Vertical Crown Crest
    b.addEllipsoid({ cx: 0, cy: 1.84, cz: 0, rx: 0.22, ry: 0.25, rz: 0.23, uSegs: 14, vSegs: 10, col: bronzeMain, topCol: bronzeGold, botCol: bronzeDark, rough: 0.44, partId: 0.0 });
    b.addBox({ cx: 0, cy: 1.78, cz: 0.19, hx: 0.14, hy: 0.10, hz: 0.04, col: [0.02, 0.06, 0.12], rough: 0.9, partId: 0.0 });
    b.addEllipsoid({ cx: -0.075, cy: 1.80, cz: 0.23, rx: 0.050, ry: 0.028, rz: 0.028, rotZ: -0.22, uSegs: 8, vSegs: 6, col: swordCore, rough: 0.10, emissive: 1.15, partId: 4.0 });
    b.addEllipsoid({ cx:  0.075, cy: 1.80, cz: 0.23, rx: 0.050, ry: 0.028, rz: 0.028, rotZ:  0.22, uSegs: 8, vSegs: 6, col: swordCore, rough: 0.10, emissive: 1.15, partId: 4.0 });
    b.addCrystal(0, 2.22, -0.02, 0.065, 0.26, 0.032, 4, swordBlue, swordCore, 0.95, 4.0);
    for (const s of [-1, 1]) {
      b.addCone([s * 0.18, 1.98, 0.02], [s * 0.36, 2.24, -0.08], 0.045, 0.008, 6, bronzeGold, swordBlue, 0.38, 0.35, 0.0);
    }

    // Floating Fragmented Bronze Pauldrons + Gauntlets (partId 1=L, 2=R) + Grand Fractured Ancient Greatsword!
    b.addEllipsoid({ cx: -0.48, cy: 1.54, cz: 0, rx: 0.22, ry: 0.16, rz: 0.24, rotZ:  0.34, uSegs: 10, vSegs: 8, col: bronzeMain, topCol: bronzeGold, botCol: bronzeDark, rockSeed: 2.4, rough: 0.46, partId: 1.0 });
    b.addEllipsoid({ cx:  0.48, cy: 1.54, cz: 0, rx: 0.22, ry: 0.16, rz: 0.24, rotZ: -0.34, uSegs: 10, vSegs: 8, col: bronzeMain, topCol: bronzeGold, botCol: bronzeDark, rockSeed: 4.7, rough: 0.46, partId: 2.0 });
    b.addBox({ cx: -0.52, cy: 1.12, cz: 0.12, hx: 0.09, hy: 0.20, hz: 0.10, rotX: -0.25, col: bronzeMain, topCol: bronzeGold, rough: 0.48, partId: 1.0 });
    b.addBox({ cx:  0.54, cy: 1.14, cz: 0.20, hx: 0.09, hy: 0.20, hz: 0.10, rotX: -0.42, col: bronzeMain, topCol: bronzeGold, rough: 0.48, partId: 2.0 });
    // Held Fractured Ancient Greatsword (bronze hilt & crossguard + fractured glowing ghostly-blue spirit blade!)
    b.addBox({ cx: 0.56, cy: 1.02, cz: 0.40, hx: 0.032, hy: 0.032, hz: 0.18, rotX: -0.32, col: bronzeGold, rough: 0.40, partId: 2.0 });
    b.addBox({ cx: 0.56, cy: 1.12, cz: 0.56, hx: 0.18, hy: 0.04, hz: 0.04, rotX: -0.32, col: bronzeGold, topCol: swordBlue, rough: 0.36, emissive: 0.28, partId: 2.0 });
    b.addBox({ cx: 0.56, cy: 1.38, cz: 0.88, hx: 0.075, hy: 0.020, hz: 0.36, rotX: -0.62, col: bronzeMain, topCol: swordBlue, rough: 0.28, emissive: 0.55, partId: 2.0 });
    b.addCrystal(0.56, 1.72, 1.24, 0.088, 0.38, 0.025, 4, swordBlue, swordCore, 1.00, 2.0, 0.94, 0, 0);

    // 5 FLOATING GHOSTLY-BLUE SWORD SHADOWS (身侧悬浮几道半透明幽蓝剑影) + SWORD-ARRAY HALO (周身剑阵光环, partId=3)!
    b.addTorus({ cx: 0, cy: 1.16, cz: 0, majorR: 1.16, minorR: 0.024, rotX: 0.18, segs: 36, tubeSegs: 6, col: swordBlue, rough: 0.18, emissive: 0.88, partId: 3.0 });
    b.addTorus({ cx: 0, cy: 1.16, cz: 0, majorR: 0.94, minorR: 0.016, rotX: -0.20, segs: 32, tubeSegs: 5, col: swordCore, rough: 0.16, emissive: 0.82, partId: 3.0 });
    // 5 hovering radiant ghostly-blue spirit swords arranged around its flanks & back
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.35;
      const sx = Math.cos(a) * 1.04;
      const sz = Math.sin(a) * 1.04;
      const sy = 1.38 + Math.sin(i * 1.9) * 0.22;
      // Sleek elongated glowing energy sword blade + crossguard
      b.addCrystal(sx, sy + 0.14, sz, 0.068, 0.54, 0.022, 4, swordBlue, swordCore, 0.98, 3.0, 0.14, -a + Math.PI * 0.5, 0.06);
      b.addBox({ cx: sx, cy: sy - 0.26, cz: sz, hx: 0.13, hy: 0.024, hz: 0.024, rotY: -a + Math.PI * 0.5, col: swordCore, rough: 0.18, emissive: 0.95, partId: 3.0 });
      b.addBox({ cx: sx, cy: sy - 0.36, cz: sz, hx: 0.022, hy: 0.10, hz: 0.022, rotY: -a + Math.PI * 0.5, col: swordDeep, rough: 0.22, emissive: 0.78, partId: 3.0 });
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // 20) 霜纹雪狐 (极北雪原 · 筑基精英): 通体雪白，耳尖/尾巴/体侧带浅蓝冰霜纹路，尾巴蓬松，步履轻巧带寒气
  function buildFrostPatternFoxMesh() {
    const b = new MonsterMeshBuilder();
    const snowWhite  = [0.95, 0.98, 1.00]; // 通体雪白
    const snowSoft   = [0.84, 0.91, 0.98];
    const frostBlue  = [0.44, 0.84, 1.00]; // 浅蓝冰霜纹路
    const frostCore  = [0.76, 0.96, 1.00];
    const iceDeep    = [0.24, 0.64, 0.94];

    // Lithe, graceful snow-white fox body with fluffy snow chest ruff & arched agile back
    b.addEllipsoid({ cx: 0, cy: 0.74, cz:  0.34, rx: 0.32, ry: 0.30, rz: 0.42, uSegs: 20, vSegs: 14, col: snowWhite, topCol: snowWhite, botCol: snowSoft, rough: 0.56, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.70, cz: -0.06, rx: 0.25, ry: 0.25, rz: 0.36, uSegs: 18, vSegs: 12, col: snowWhite, topCol: snowWhite, botCol: snowSoft, rough: 0.56, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.74, cz: -0.44, rx: 0.29, ry: 0.28, rz: 0.36, uSegs: 18, vSegs: 12, col: snowWhite, topCol: snowWhite, botCol: snowSoft, rough: 0.56, partId: 0.0 });
    // Fluffy white snow-fox neck ruff tufts
    for (let i = -2; i <= 2; i++) {
      const a = i * 0.46;
      b.addEllipsoid({ cx: Math.sin(a) * 0.26, cy: 0.86, cz: 0.56 + Math.cos(a) * 0.14, rx: 0.14, ry: 0.16, rz: 0.14, uSegs: 10, vSegs: 8, col: snowWhite, botCol: frostCore, rough: 0.58, partId: 0.0 });
    }

    // Pale-Blue Frost Pattern Markings along BOTH Flanks & Shoulders! (体侧带浅蓝冰霜纹路, partId=4)
    for (const s of [-1, 1]) {
      b.addBox({ cx: s * 0.31, cy: 0.78, cz:  0.36, hx: 0.020, hy: 0.11, hz: 0.055, rotX:  0.52, rotZ: s * 0.18, col: frostBlue, topCol: frostCore, rough: 0.22, emissive: 0.68, partId: 4.0 });
      b.addBox({ cx: s * 0.26, cy: 0.74, cz:  0.02, hx: 0.020, hy: 0.10, hz: 0.050, rotX: -0.42, rotZ: s * 0.16, col: frostBlue, topCol: frostCore, rough: 0.22, emissive: 0.68, partId: 4.0 });
      b.addBox({ cx: s * 0.29, cy: 0.78, cz: -0.34, hx: 0.020, hy: 0.12, hz: 0.055, rotX:  0.48, rotZ: s * 0.18, col: frostBlue, topCol: frostCore, rough: 0.22, emissive: 0.68, partId: 4.0 });
      b.addCrystal(s * 0.30, 0.82, -0.14, 0.030, 0.095, 0.030, 4, frostBlue, frostCore, 0.75, 4.0, 0.5, 0, s * 0.7);
    }

    // Refined clever fox head + slender pointed fox muzzle + icy-blue spirit eyes + tall white ears with PALE-BLUE FROST TIPS! (耳尖带浅蓝冰霜纹路)
    b.addEllipsoid({ cx: 0, cy: 1.04, cz: 0.82, rx: 0.22, ry: 0.20, rz: 0.25, uSegs: 16, vSegs: 12, col: snowWhite, topCol: snowWhite, botCol: snowSoft, rough: 0.54, partId: 0.0 });
    b.addCone([0, 0.98, 0.96], [0, 0.94, 1.32], 0.14, 0.042, 8, snowWhite, snowSoft, 0.52, 0.0, 0.0);
    b.addEllipsoid({ cx: 0, cy: 0.95, cz: 1.33, rx: 0.036, ry: 0.030, rz: 0.028, uSegs: 8, vSegs: 6, col: [0.12, 0.20, 0.32], rough: 0.20, partId: 0.0 });
    // Pale-blue frost forehead crest mark
    b.addCrystal(0, 1.14, 1.00, 0.036, 0.082, 0.024, 4, frostBlue, frostCore, 0.82, 4.0, 0.35, 0, 0);
    for (const s of [-1, 1]) {
      // Base of tall fox ear (snow white) + upper ear tip (pale-blue frost pattern!)
      b.addCone([s * 0.14, 1.18, 0.78], [s * 0.21, 1.44, 0.74], 0.095, 0.052, 7, snowWhite, frostCore, 0.54, 0.08, 0.0);
      b.addCone([s * 0.21, 1.42, 0.74], [s * 0.26, 1.62, 0.72], 0.054, 0.010, 7, frostBlue, iceDeep, 0.28, 0.62, 0.0);
      // Glowing icy-blue fox eyes
      b.addEllipsoid({ cx: s * 0.12, cy: 1.07, cz: 1.00, rx: 0.044, ry: 0.030, rz: 0.032, rotZ: -s * 0.26, uSegs: 8, vSegs: 6, col: frostCore, rough: 0.10, emissive: 0.94, partId: 4.0 });
    }

    // ULTRA-FLUFFY OVERSIZED SNOW-WHITE FOX TAIL WITH PALE-BLUE FROST PATTERNS! (尾巴蓬松、带浅蓝冰霜纹路, partId=3)
    b.addEllipsoid({ cx: 0, cy: 0.88, cz: -0.94, rx: 0.26, ry: 0.26, rz: 0.36, rotX: 0.36, uSegs: 16, vSegs: 12, col: snowWhite, topCol: snowWhite, botCol: frostCore, rough: 0.54, partId: 3.0 });
    b.addEllipsoid({ cx: 0, cy: 1.12, cz: -1.32, rx: 0.34, ry: 0.34, rz: 0.44, rotX: 0.32, uSegs: 18, vSegs: 14, col: snowWhite, topCol: frostCore, botCol: snowSoft, rough: 0.52, partId: 3.0 });
    b.addEllipsoid({ cx: 0, cy: 1.32, cz: -1.68, rx: 0.26, ry: 0.26, rz: 0.36, rotX: 0.15, uSegs: 16, vSegs: 12, col: frostCore, topCol: frostBlue, botCol: snowWhite, rough: 0.44, emissive: 0.24, partId: 3.0 });
    b.addCone([0, 1.36, -1.86], [0, 1.46, -2.26], 0.18, 0.022, 10, frostBlue, frostCore, 0.30, 0.65, 3.0);
    // Decorative pale-blue frost stripe rings & wispy frost ribbons wrapping the fluffy tail
    b.addTorus({ cx: 0, cy: 1.10, cz: -1.28, majorR: 0.33, minorR: 0.028, rotX: 1.25, segs: 20, tubeSegs: 6, col: frostBlue, rough: 0.22, emissive: 0.72, partId: 3.0 });
    b.addTorus({ cx: 0, cy: 1.28, cz: -1.62, majorR: 0.26, minorR: 0.024, rotX: 1.42, segs: 18, tubeSegs: 6, col: frostBlue, rough: 0.22, emissive: 0.76, partId: 3.0 });
    for (const s of [-1, 1]) {
      b.addCurvedBlade([
        { p: [s * 0.24, 1.06, -1.16], w: 0.06, t: 0.024, col: frostCore },
        { p: [s * 0.40, 1.26, -1.64], w: 0.08, t: 0.022, col: frostBlue },
        { p: [s * 0.28, 1.44, -2.08], w: 0.02, t: 0.008, col: frostCore },
      ], 2, 0.28, 0.56, 3.0);
    }

    // 4 Nimble Light-Footed Legs with Frosted Pale-Blue Paws & Faint Cold-Mist Ankle Rings (步履轻巧带寒气, partId 5=L, 6=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      b.addTube([
        { p: [s * 0.21, 0.68, 0.44], r: 0.095, col: snowWhite },
        { p: [s * 0.22, 0.36, 0.48], r: 0.068, col: snowSoft },
        { p: [s * 0.22, 0.06, 0.52], r: 0.062, col: frostBlue },
      ], 8, 0.48, 0.12, pid);
      b.addTube([
        { p: [s * 0.21, 0.70, -0.46], r: 0.110, col: snowWhite },
        { p: [s * 0.22, 0.38, -0.58], r: 0.072, col: snowSoft },
        { p: [s * 0.22, 0.06, -0.48], r: 0.064, col: frostBlue },
      ], 8, 0.48, 0.12, pid);
      b.addTorus({ cx: s * 0.22, cy: 0.10, cz:  0.52, majorR: 0.13, minorR: 0.014, segs: 14, tubeSegs: 5, col: frostCore, rough: 0.20, emissive: 0.68, partId: pid });
      b.addTorus({ cx: s * 0.22, cy: 0.10, cz: -0.48, majorR: 0.13, minorR: 0.014, segs: 14, tubeSegs: 5, col: frostCore, rough: 0.20, emissive: 0.68, partId: pid });
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // =========================================================
  // 3C. MINI-BOSS 1: 灵竹幽谷 · 青冥异貊 (异化灵竹大熊猫/貊兽, 固定练气十层, 体型庞大!)
  // =========================================================
  function buildQingmingPandaBossMesh() {
    const b = new MonsterMeshBuilder();
    const inkTeal    = [0.09, 0.17, 0.18]; // 深青墨灰主暗毛
    const inkDark    = [0.05, 0.09, 0.11]; // 浓墨四肢与眼斑
    const bambooJade = [0.56, 0.72, 0.60]; // 带竹叶青的灰白躯干毛
    const jadeShade  = [0.24, 0.42, 0.34]; // 竹青阴影渐变
    const cyanRune   = [0.30, 0.98, 0.86]; // 幽青灵纹微光
    const darkGold   = [0.94, 0.72, 0.24]; // 暗金灵纹微光
    const fangIvory  = [0.92, 0.90, 0.78];
    const clawDark   = [0.12, 0.14, 0.16];

    // 1. Hulking Broad Quadrupedal Beast Torso (敦实魁梧的四足兽躯，极具分量感)
    b.addEllipsoid({ cx: 0, cy: 1.02, cz:  0.34, rx: 0.68, ry: 0.60, rz: 0.66, uSegs: 20, vSegs: 14, col: inkTeal, topCol: inkTeal, botCol: inkDark, rough: 0.68, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.96, cz: -0.22, rx: 0.66, ry: 0.58, rz: 0.64, uSegs: 20, vSegs: 14, col: bambooJade, topCol: bambooJade, botCol: jadeShade, rough: 0.66, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 0.94, cz: -0.78, rx: 0.60, ry: 0.54, rz: 0.54, uSegs: 18, vSegs: 12, col: inkTeal, topCol: inkTeal, botCol: inkDark, rough: 0.68, partId: 0.0 });
    // Broad shoulder hump & thick bull neck (头大颈粗)
    b.addEllipsoid({ cx: 0, cy: 1.32, cz:  0.56, rx: 0.58, ry: 0.42, rz: 0.46, uSegs: 16, vSegs: 12, col: inkTeal, topCol: jadeShade, botCol: inkDark, rough: 0.66, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 1.36, cz:  0.90, rx: 0.44, ry: 0.38, rz: 0.34, uSegs: 14, vSegs: 10, col: bambooJade, topCol: bambooJade, botCol: jadeShade, rough: 0.66, partId: 0.0 });

    // 2. Massive Panda-Tapir Head with Dark-Ink Eye Patches, Round Ears, Snout & Spirit Fangs
    b.addEllipsoid({ cx: 0, cy: 1.48, cz: 1.24, rx: 0.48, ry: 0.44, rz: 0.46, uSegs: 20, vSegs: 14, col: bambooJade, topCol: bambooJade, botCol: jadeShade, rough: 0.62, partId: 0.0 });
    // Cheek fur ruffs with faint cyan shimmer tips
    for (const s of [-1, 1]) {
      b.addEllipsoid({ cx: s * 0.44, cy: 1.34, cz: 1.18, rx: 0.18, ry: 0.20, rz: 0.18, uSegs: 10, vSegs: 8, col: bambooJade, topCol: cyanRune, botCol: jadeShade, rough: 0.58, emissive: 0.14, partId: 0.0 });
      // Iconic round dark-ink panda ears
      b.addEllipsoid({ cx: s * 0.38, cy: 1.88, cz: 1.12, rx: 0.17, ry: 0.17, rz: 0.11, uSegs: 12, vSegs: 8, col: inkDark, topCol: inkTeal, botCol: inkDark, rough: 0.68, partId: 0.0 });
      // Iconic dark-ink panda eye patches + glowing cyan-gold mutated eyes
      b.addEllipsoid({ cx: s * 0.21, cy: 1.54, cz: 1.58, rx: 0.15, ry: 0.13, rz: 0.08, rotZ: s * 0.32, uSegs: 12, vSegs: 8, col: inkDark, rough: 0.64, partId: 0.0 });
      b.addEllipsoid({ cx: s * 0.20, cy: 1.55, cz: 1.65, rx: 0.056, ry: 0.044, rz: 0.036, uSegs: 8, vSegs: 6, col: cyanRune, rough: 0.10, emissive: 1.05, partId: 4.0 });
      // Twin mutated spirit tusks / fangs
      b.addCone([s * 0.15, 1.26, 1.66], [s * 0.18, 1.10, 1.76], 0.055, 0.012, 6, fangIvory, darkGold, 0.28, 0.22, 0.0);
    }
    // Broad snout & dark nose
    b.addEllipsoid({ cx: 0, cy: 1.36, cz: 1.64, rx: 0.24, ry: 0.19, rz: 0.20, uSegs: 14, vSegs: 10, col: bambooJade, botCol: jadeShade, rough: 0.58, partId: 0.0 });
    b.addEllipsoid({ cx: 0, cy: 1.42, cz: 1.82, rx: 0.10, ry: 0.075, rz: 0.06, uSegs: 10, vSegs: 8, col: inkDark, rough: 0.26, partId: 0.0 });

    // 3. Mutated Cyan & Dark-Gold Spirit Rune Seams (额头、脊背与肩胛骨缝隙里透出的幽青/暗金灵纹, partId=4)
    // Forehead glowing spirit rune mark
    b.addCrystal(0, 1.74, 1.58, 0.075, 0.18, 0.042, 4, cyanRune, darkGold, 1.05, 4.0, 0.45, 0, 0);
    b.addBox({ cx: 0, cy: 1.78, cz: 1.48, hx: 0.14, hy: 0.028, hz: 0.035, rotX: 0.35, col: darkGold, rough: 0.22, emissive: 0.88, partId: 4.0 });
    // Spinal glowing spirit-bamboo rune ridge + shimmering fur tufts down the back
    const spineZ = [0.68, 0.36, 0.04, -0.28, -0.58];
    const spineY = [1.68, 1.64, 1.56, 1.52, 1.44];
    for (let i = 0; i < spineZ.length; i++) {
      const col = i % 2 === 0 ? cyanRune : darkGold;
      b.addCrystal(0, spineY[i], spineZ[i], 0.068, 0.19 + (i === 0 ? 0.06 : 0), 0.11, 4, col, cyanRune, 0.96, 4.0, -0.25, 0, 0);
    }
    // Shoulder-blade glowing spiritual crevices on both flanks (肩胛骨缝隙灵纹)
    for (const s of [-1, 1]) {
      b.addBox({ cx: s * 0.65, cy: 1.18, cz: 0.42, hx: 0.036, hy: 0.26, hz: 0.052, rotX:  0.48, rotZ: s * 0.22, col: cyanRune, topCol: darkGold, rough: 0.22, emissive: 0.92, partId: 4.0 });
      b.addBox({ cx: s * 0.63, cy: 1.08, cz: 0.22, hx: 0.032, hy: 0.22, hz: 0.048, rotX: -0.40, rotZ: s * 0.18, col: darkGold, topCol: cyanRune, rough: 0.22, emissive: 0.86, partId: 4.0 });
      // Shimmering spirit-touched fur spikes sprouting off shoulders
      b.addCone([s * 0.62, 1.34, 0.46], [s * 0.88, 1.56, 0.34], 0.11, 0.018, 6, jadeShade, cyanRune, 0.42, 0.48, 4.0);
      b.addCone([s * 0.60, 1.24, 0.26], [s * 0.84, 1.42, 0.12], 0.095, 0.016, 6, inkTeal, darkGold, 0.42, 0.42, 4.0);
    }

    // Short stubby panda tail with faint bamboo-jade glow tip
    b.addEllipsoid({ cx: 0, cy: 0.98, cz: -1.32, rx: 0.17, ry: 0.17, rz: 0.16, uSegs: 10, vSegs: 8, col: bambooJade, topCol: cyanRune, botCol: inkTeal, rough: 0.60, emissive: 0.18, partId: 3.0 });

    // 4. Four Massive Pillar-Like Legs & Clawed Paws (四肢柱子一样结实, partId 5=L, 6=R)
    for (const s of [-1, 1]) {
      const pid = s < 0 ? 5.0 : 6.0;
      // Front pillar leg
      b.addTube([
        { p: [s * 0.48, 0.98, 0.46], r: 0.28, col: inkTeal },
        { p: [s * 0.50, 0.52, 0.50], r: 0.25, col: inkDark },
        { p: [s * 0.50, 0.14, 0.52], r: 0.27, col: inkDark },
      ], 10, 0.66, 0.0, pid);
      // Rear pillar leg
      b.addTube([
        { p: [s * 0.46, 0.92, -0.72], r: 0.27, col: inkTeal },
        { p: [s * 0.48, 0.48, -0.76], r: 0.24, col: inkDark },
        { p: [s * 0.48, 0.14, -0.74], r: 0.26, col: inkDark },
      ], 10, 0.66, 0.0, pid);
      // Glowing cyan-gold wrist/ankle rune bands + heavy dark claws
      b.addTorus({ cx: s * 0.50, cy: 0.26, cz:  0.52, majorR: 0.27, minorR: 0.026, segs: 14, tubeSegs: 5, col: cyanRune, rough: 0.22, emissive: 0.78, partId: pid });
      b.addTorus({ cx: s * 0.48, cy: 0.26, cz: -0.74, majorR: 0.26, minorR: 0.024, segs: 14, tubeSegs: 5, col: darkGold, rough: 0.22, emissive: 0.72, partId: pid });
      for (let c = -1; c <= 1; c++) {
        b.addCone([s * 0.50 + c * 0.085, 0.12, 0.74], [s * 0.50 + c * 0.10, 0.02, 0.94], 0.046, 0.010, 5, clawDark, cyanRune, 0.32, 0.18, pid);
        b.addCone([s * 0.48 + c * 0.080, 0.12, -0.52], [s * 0.48 + c * 0.095, 0.02, -0.34], 0.044, 0.010, 5, clawDark, darkGold, 0.32, 0.14, pid);
      }
    }

    b.alignBottom(0.0);
    return b.build();
  }

  // =========================================================
  // 3D. MINI-BOSS 2: 蚀骨毒潭 · 异化腐鳞蛇妖 (盘踞昂首毒鳞大蛇, 固定练气十层, 体型庞大!)
  // =========================================================
  function buildCorruptSerpentBossMesh() {
    const b = new MonsterMeshBuilder();
    const scalePurple = [0.22, 0.10, 0.34]; // 暗紫主鳞
    const scaleDarkG  = [0.10, 0.26, 0.18]; // 墨绿腐鳞
    const scaleBrown  = [0.16, 0.12, 0.11]; // 黑褐腹甲
    const venomGreen  = [0.24, 0.98, 0.46]; // 病态幽绿光泽
    const venomViolet = [0.68, 0.20, 0.98]; // 毒紫幽光
    const eyeGlow     = [0.58, 1.00, 0.28]; // 狭长发亮毒眸
    const tongueRed   = [0.92, 0.16, 0.46]; // 猩红毒紫蛇信
    const fangPale    = [0.88, 0.96, 0.84];

    // 1. Long Sinuous Coiling Lower Serpent Body + Elevated S-Curved Upper Torso (修长蜿蜒蛇躯盘踞、上半身昂起!)
    const spinePts = [
      { p: [ 0.72, 0.14, -1.35], r: 0.09, col: scaleDarkG  }, // Spiked whip tail tip
      { p: [ 1.10, 0.18, -0.82], r: 0.18, col: scalePurple },
      { p: [ 0.98, 0.24, -0.10], r: 0.25, col: scaleDarkG  },
      { p: [ 0.42, 0.28,  0.48], r: 0.30, col: scalePurple },
      { p: [-0.46, 0.30,  0.54], r: 0.33, col: scaleBrown  },
      { p: [-1.02, 0.32,  0.04], r: 0.35, col: scalePurple },
      { p: [-0.88, 0.36, -0.68], r: 0.36, col: scaleDarkG  },
      { p: [-0.22, 0.42, -0.92], r: 0.37, col: scalePurple }, // Thick coiled anchor base
      { p: [ 0.34, 0.54, -0.58], r: 0.35, col: scaleDarkG  },
      { p: [ 0.28, 0.86, -0.18], r: 0.32, col: scalePurple }, // Rising upright torso!
      { p: [ 0.04, 1.28,  0.08], r: 0.29, col: scaleDarkG  },
      { p: [-0.04, 1.66,  0.26], r: 0.26, col: scalePurple }, // Arched cobra-like neck
      { p: [ 0.00, 1.92,  0.52], r: 0.22, col: scaleDarkG  }, // Head base
    ];
    b.addTube(spinePts, 12, 0.38, 0.08, 0.0);

    // 2. Overlapping Corrupted Dorsal Scale Plates Rimmed with Sickly Toxic-Green & Venom-Purple Glow! (边缘泛着病态幽绿/毒紫光泽)
    for (let i = 2; i < spinePts.length - 1; i++) {
      const pt = spinePts[i].p;
      const rr = spinePts[i].r;
      const isGreen = (i % 2 === 0);
      const glowCol = isGreen ? venomGreen : venomViolet;
      const plateCol = isGreen ? scaleDarkG : scalePurple;
      b.addCrystal(pt[0], pt[1] + rr * 0.92, pt[2], 0.065 + rr * 0.14, 0.22 + rr * 0.36, 0.10, 4, plateCol, glowCol, 0.68, 4.0, -0.35, 0, 0);
      // Glowing lateral corruption seams on raised upper body
      if (i >= 8) {
        for (const s of [-1, 1]) {
          b.addBox({ cx: pt[0] + s * (rr * 0.92), cy: pt[1], cz: pt[2], hx: 0.026, hy: 0.09, hz: 0.055, rotZ: s * 0.25, col: glowCol, rough: 0.22, emissive: 0.82, partId: 4.0 });
        }
      }
    }

    // 3. Flared Venomous Hood + 6 Protruding Barbed Cheek & Neck Scale Plates (头侧与颈部几片突出的倒刺鳞甲!)
    b.addEllipsoid({ cx: 0, cy: 1.72, cz: 0.28, rx: 0.56, ry: 0.36, rz: 0.14, rotX: 0.25, uSegs: 16, vSegs: 10, col: scalePurple, topCol: scaleDarkG, botCol: scaleBrown, rough: 0.42, partId: 0.0 });
    for (const s of [-1, 1]) {
      // Glowing venom-vein trim along hood rim
      b.addCurvedBlade([
        { p: [s * 0.26, 1.38, 0.14], w: 0.09, t: 0.032, col: scaleDarkG  },
        { p: [s * 0.60, 1.72, 0.26], w: 0.14, t: 0.038, col: venomViolet },
        { p: [s * 0.38, 2.02, 0.46], w: 0.06, t: 0.022, col: venomGreen  },
      ], 2, 0.30, 0.55, 4.0);

      // 3 prominent protruding barbed armored scale spikes on EACH side of cheeks & neck (倒刺鳞甲!)
      for (let k = 0; k < 3; k++) {
        const y0 = 1.56 + k * 0.18;
        const z0 = 0.26 + k * 0.16;
        const x0 = s * (0.28 + (k === 1 ? 0.12 : 0.05));
        const gCol = k % 2 === 0 ? venomGreen : venomViolet;
        b.addCurvedBlade([
          { p: [x0,               y0,        z0],        w: 0.11, t: 0.036, col: scalePurple },
          { p: [x0 + s * 0.34,    y0 + 0.08, z0 - 0.14], w: 0.08, t: 0.026, col: scaleDarkG  },
          { p: [x0 + s * 0.56,    y0 + 0.16, z0 - 0.36], w: 0.02, t: 0.010, col: gCol        },
        ], 2, 0.26, 0.72, 4.0);
      }
    }

    // 4. Angular Viper Skull, Narrow Glowing Venomous Eyes, Curved Fangs & Flicking Forked Tongue (狭长发亮眼眸 + 蛇信吞吐!)
    b.addEllipsoid({ cx: 0, cy: 1.98, cz: 0.66, rx: 0.28, ry: 0.20, rz: 0.38, uSegs: 16, vSegs: 12, col: scaleDarkG, topCol: scalePurple, botCol: scaleBrown, rough: 0.36, partId: 0.0 });
    // Tapered viper snout & lower jaw
    b.addCone([0, 1.98, 0.90], [0, 1.92, 1.30], 0.21, 0.075, 8, scalePurple, scaleDarkG, 0.34, 0.08, 0.0);
    b.addCone([0, 1.84, 0.84], [0, 1.76, 1.18], 0.16, 0.055, 8, scaleBrown, scaleDarkG, 0.44, 0.0, 0.0);
    // Glowing venomous forehead diamond crest
    b.addCrystal(0, 2.15, 0.78, 0.065, 0.16, 0.085, 4, venomViolet, venomGreen, 1.05, 4.0, 0.40, 0, 0);
    for (const s of [-1, 1]) {
      // Narrow glowing slitted venomous eyes (眼眸狭长发亮，像淬了毒一样!)
      b.addBox({ cx: s * 0.21, cy: 2.04, cz: 0.88, hx: 0.028, hy: 0.032, hz: 0.125, rotX: -0.14, rotY: s * 0.26, rotZ: -s * 0.32, col: eyeGlow, rough: 0.08, emissive: 1.18, partId: 4.0 });
      // Dripping venom fangs
      b.addCone([s * 0.11, 1.90, 1.16], [s * 0.12, 1.70, 1.24], 0.038, 0.008, 6, fangPale, venomGreen, 0.18, 0.65, 0.0);
    }
    // Forked crimson-violet flicking serpent tongue (蛇信吞吐, partId=3 animates flutter!)
    b.addCone([0, 1.84, 1.20], [0, 1.80, 1.56], 0.026, 0.012, 5, tongueRed, venomViolet, 0.28, 0.72, 3.0);
    for (const s of [-1, 1]) {
      b.addCone([0, 1.80, 1.54], [s * 0.11, 1.78, 1.76], 0.014, 0.005, 4, tongueRed, venomViolet, 0.26, 0.82, 3.0);
    }

    // Venom-tipped tail stinger barb
    b.addCone([0.72, 0.14, -1.35], [0.48, 0.28, -1.78], 0.085, 0.012, 6, scalePurple, venomGreen, 0.24, 0.78, 3.0);

    b.alignBottom(0.0);
    return b.build();
  }

  // =========================================================
  // 4. SHARED UNIT VFX MESHES (Orb, Ground Ring, Directional Shard)
  // =========================================================
  function buildUnitOrbMesh() {
    const verts = [];
    const indices = [];
    const uSegs = 12, vSegs = 8;
    const stride = uSegs + 1;
    for (let iv = 0; iv <= vSegs; iv++) {
      const phi = (iv / vSegs) * Math.PI;
      const sp = Math.sin(phi), cp = Math.cos(phi);
      for (let iu = 0; iu <= uSegs; iu++) {
        const th = (iu / uSegs) * Math.PI * 2;
        const nx = sp * Math.cos(th), ny = cp, nz = sp * Math.sin(th);
        verts.push(nx, ny, nz, nx, ny, nz);
      }
    }
    for (let iv = 0; iv < vSegs; iv++) {
      for (let iu = 0; iu < uSegs; iu++) {
        const a = iv * stride + iu;
        indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
      }
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitRingMesh() {
    const verts = [];
    const indices = [];
    const segs = 28;
    const innerR = 0.72, outerR = 1.0;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      verts.push(c * innerR, 0.05, s * innerR, 0, 1, 0);
      verts.push(c * outerR, 0.05, s * outerR, 0, 1, 0);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2;
      indices.push(a, a + 2, a + 3, a, a + 3, a + 1);
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitShardMesh() {
    const verts = new Float32Array([
       0.0,  0.0,  1.0,   0.0,  0.2,  0.98,
       0.42, 0.0,  0.05,  0.9,  0.3,  0.0,
       0.0,  0.20, 0.05,  0.0,  1.0,  0.0,
      -0.42, 0.0,  0.05, -0.9,  0.3,  0.0,
       0.0, -0.20, 0.05,  0.0, -1.0,  0.0,
       0.0,  0.0, -0.85,  0.0,  0.2, -0.98,
    ]);
    const indices = new Uint16Array([
      0, 2, 1,  0, 3, 2,  0, 4, 3,  0, 1, 4,
      5, 1, 2,  5, 2, 3,  5, 3, 4,  5, 4, 1,
    ]);
    return { vertices: verts, indices };
  }

  // =========================================================
  // 5. ALL 14 MONSTER SPECIES CONFIGURATIONS
  //    0..7  = 练气期 (Qi-Refining, enlarged 1.68..1.92x!)
  //    8..13 = 筑基期 (Foundation-Establishment, another full tier larger 2.25..2.38x!)
  // =========================================================
  const SPECIES = [
    // --- 练气期 (Qi-Refining: 4 regions × 8 species · 练气1~6层, 每层固定核心增量, 实际数值为核心 80%~110% 联动浮动) ---
    {
      id: 0, key: 'grass_slime', name: '青草团精', realm: '练气期', region: 'lowcloud',
      scale: 1.72, radius: 1.38, colRadius: 1.12, colHeight: 1.95, nameHeight: 2.65, hoverY: 0.0,
      moveSpeed: 5.4, patrolRadius: 18.0, aggroRange: 21.0, leashRange: 54.0,
      tint: [0.48, 0.88, 0.36],
      coreBase: { hp: 64, mp: 60, atk: 8, def: 3 },
      coreStep: { hp: 11, mp: 8, atk: 1.2, def: 0.6 },
      buildMesh: buildGrassSlimeMesh,
      moves: [
        { key: 'basic',  name: '草团撞击', kind: 'lunge',      range: 3.8,  dmgPct: 1.00, mpCost: 0,  windup: 0.45, cd: 2.0, col: [0.50, 0.88, 0.38] },
        { key: 'skill1', name: '嫩叶飞刃', kind: 'volley',     range: 14.5, dmgPct: 0.85, mpCost: 12, windup: 0.58, cd: 5.4, count: 2, spread: 0.22, speed: 18.5, shape: 'shard', scale: [0.58, 0.20, 0.78], col: [0.56, 0.92, 0.38] },
        { key: 'skill2', name: '藤蔓微缠', kind: 'groundRing', range: 12.5, dmgPct: 1.15, mpCost: 15, windup: 0.64, cd: 7.2, radius: 3.1, slowSec: 1.6, col: [0.40, 0.82, 0.34] },
      ],
    },
    {
      id: 1, key: 'redtail_rabbit', name: '赤尾野兔妖', realm: '练气期', region: 'lowcloud',
      scale: 1.68, radius: 1.32, colRadius: 0.95, colHeight: 2.40, nameHeight: 3.10, hoverY: 0.0,
      moveSpeed: 7.6, patrolRadius: 20.0, aggroRange: 22.0, leashRange: 58.0,
      tint: [0.94, 0.34, 0.26],
      coreBase: { hp: 56, mp: 55, atk: 9, def: 2 },
      coreStep: { hp: 10, mp: 8, atk: 1.4, def: 0.5 },
      buildMesh: buildRedtailRabbitMesh,
      moves: [
        { key: 'basic',  name: '后蹬飞踢', kind: 'lunge',  range: 3.9,  dmgPct: 1.00, mpCost: 0,  windup: 0.40, cd: 1.9, col: [0.88, 0.86, 0.82] },
        { key: 'skill1', name: '赤影突进', kind: 'dash',   range: 12.0, dmgPct: 1.35, mpCost: 14, windup: 0.50, cd: 5.6, dashSpeed: 20.0, dashDur: 0.48, col: [0.94, 0.32, 0.26] },
        { key: 'skill2', name: '红尾扫击', kind: 'volley', range: 11.5, dmgPct: 1.25, mpCost: 12, windup: 0.48, cd: 6.0, count: 1, spread: 0.0, speed: 20.0, shape: 'shard', scale: [1.05, 0.22, 0.68], col: [0.96, 0.34, 0.28] },
      ],
    },
    {
      id: 2, key: 'mud_slime', name: '腐泥软泥怪', realm: '练气期', region: 'chenyan',
      scale: 1.85, radius: 1.62, colRadius: 1.38, colHeight: 1.85, nameHeight: 2.35, hoverY: 0.0,
      moveSpeed: 4.5, patrolRadius: 16.0, aggroRange: 22.0, leashRange: 54.0,
      tint: [0.36, 0.58, 0.28],
      coreBase: { hp: 82, mp: 70, atk: 8, def: 4 },
      coreStep: { hp: 14, mp: 9, atk: 1.1, def: 0.8 },
      buildMesh: buildMudSlimeMesh,
      moves: [
        { key: 'basic',  name: '腐泥拍击', kind: 'lunge', range: 4.0,  dmgPct: 1.00, mpCost: 0,  windup: 0.52, cd: 2.2, col: [0.34, 0.46, 0.24] },
        { key: 'skill1', name: '泥浆吐沫', kind: 'lob',   range: 15.0, dmgPct: 1.25, mpCost: 14, windup: 0.62, cd: 5.4, speed: 15.0, arcY: 4.2, splashR: 2.8, col: [0.32, 0.44, 0.22] },
        { key: 'skill2', name: '气泡微爆', kind: 'nova',  range: 7.2,  dmgPct: 1.40, mpCost: 18, windup: 0.72, cd: 7.0, radius: 5.6, col: [0.42, 0.64, 0.30] },
      ],
    },
    {
      id: 3, key: 'venom_toad', name: '毒瘴蟾蜍', realm: '练气期', region: 'chenyan',
      scale: 1.88, radius: 1.65, colRadius: 1.36, colHeight: 2.15, nameHeight: 2.65, hoverY: 0.0,
      moveSpeed: 5.6, patrolRadius: 17.0, aggroRange: 23.0, leashRange: 56.0,
      tint: [0.72, 0.48, 0.86],
      coreBase: { hp: 70, mp: 85, atk: 9, def: 3 },
      coreStep: { hp: 12, mp: 12, atk: 1.3, def: 0.6 },
      buildMesh: buildVenomToadMesh,
      moves: [
        { key: 'basic',  name: '长舌抽击', kind: 'volley',   range: 7.8,  dmgPct: 1.00, mpCost: 0,  windup: 0.42, cd: 2.2, count: 1, spread: 0.0, speed: 25.0, shape: 'shard', scale: [0.28, 0.20, 1.38], col: [0.84, 0.42, 0.64] },
        { key: 'skill1', name: '毒泡喷吐', kind: 'volley',   range: 16.0, dmgPct: 0.90, mpCost: 16, windup: 0.58, cd: 5.5, count: 2, spread: 0.26, speed: 12.5, shape: 'orb', scale: [0.44, 0.44, 0.44], col: [0.72, 0.48, 0.88] },
        { key: 'skill2', name: '瘴气重跃', kind: 'leapSlam', range: 10.8, dmgPct: 1.45, mpCost: 20, windup: 0.64, cd: 7.4, radius: 5.2, col: [0.68, 0.44, 0.84] },
      ],
    },
    {
      id: 4, key: 'rock_spirit', name: '山岩小石灵', realm: '练气期', region: 'cloudmtn',
      scale: 1.92, radius: 1.68, colRadius: 1.32, colHeight: 2.95, nameHeight: 3.45, hoverY: 0.0,
      moveSpeed: 5.0, patrolRadius: 18.0, aggroRange: 24.0, leashRange: 58.0,
      tint: [0.48, 0.90, 0.90],
      coreBase: { hp: 86, mp: 65, atk: 9, def: 5 },
      coreStep: { hp: 15, mp: 8, atk: 1.2, def: 0.9 },
      buildMesh: buildRockSpiritMesh,
      moves: [
        { key: 'basic',  name: '石拳重锤', kind: 'lunge',  range: 4.3,  dmgPct: 1.00, mpCost: 0,  windup: 0.58, cd: 2.4, col: [0.66, 0.84, 0.86] },
        { key: 'skill1', name: '飞石投掷', kind: 'volley', range: 17.0, dmgPct: 1.25, mpCost: 14, windup: 0.64, cd: 5.6, count: 1, spread: 0.0, speed: 18.0, shape: 'orb', scale: [0.48, 0.40, 0.48], col: [0.64, 0.80, 0.84] },
        { key: 'skill2', name: '灵石微震', kind: 'nova',   range: 7.8,  dmgPct: 1.45, mpCost: 18, windup: 0.74, cd: 7.5, radius: 6.2, col: [0.46, 0.90, 0.90] },
      ],
    },
    {
      id: 5, key: 'cloud_lark', name: '云雀灵禽', realm: '练气期', region: 'cloudmtn',
      scale: 1.78, radius: 1.45, colRadius: 1.05, colHeight: 2.20, nameHeight: 2.55, hoverY: 3.1,
      moveSpeed: 8.2, patrolRadius: 24.0, aggroRange: 26.0, leashRange: 66.0,
      tint: [0.84, 0.96, 0.98],
      coreBase: { hp: 58, mp: 80, atk: 9, def: 2 },
      coreStep: { hp: 10, mp: 11, atk: 1.3, def: 0.5 },
      buildMesh: buildCloudLarkMesh,
      moves: [
        { key: 'basic',  name: '灵喙啄击', kind: 'lunge',  range: 4.8,  dmgPct: 1.00, mpCost: 0,  windup: 0.42, cd: 2.0, col: [0.86, 0.96, 0.98] },
        { key: 'skill1', name: '微风羽箭', kind: 'volley', range: 18.0, dmgPct: 0.90, mpCost: 14, windup: 0.52, cd: 5.0, count: 2, spread: 0.20, speed: 22.0, shape: 'shard', scale: [0.32, 0.18, 0.88], col: [0.72, 0.94, 0.94] },
        { key: 'skill2', name: '云气旋风', kind: 'volley', range: 16.5, dmgPct: 1.35, mpCost: 18, windup: 0.64, cd: 6.6, count: 1, spread: 0.0, speed: 13.5, shape: 'ring', scale: [1.45, 1.0, 1.45], col: [0.88, 0.96, 1.00] },
      ],
    },
    {
      id: 6, key: 'sand_scorpion', name: '沙蝎幼兽', realm: '练气期', region: 'desert',
      scale: 1.82, radius: 1.52, colRadius: 1.24, colHeight: 2.25, nameHeight: 2.75, hoverY: 0.0,
      moveSpeed: 6.8, patrolRadius: 19.0, aggroRange: 22.0, leashRange: 56.0,
      tint: [0.96, 0.82, 0.36],
      coreBase: { hp: 68, mp: 65, atk: 10, def: 3 },
      coreStep: { hp: 12, mp: 9, atk: 1.4, def: 0.7 },
      buildMesh: buildSandScorpionMesh,
      moves: [
        { key: 'basic',  name: '双螯夹击', kind: 'lunge',  range: 4.0,  dmgPct: 1.00, mpCost: 0,  windup: 0.42, cd: 2.0, col: [0.92, 0.78, 0.42] },
        { key: 'skill1', name: '尾钩刺毒', kind: 'volley', range: 14.5, dmgPct: 1.30, mpCost: 14, windup: 0.52, cd: 5.2, count: 1, spread: 0.0, speed: 21.5, shape: 'shard', scale: [0.28, 0.22, 0.84], col: [0.98, 0.84, 0.36] },
        { key: 'skill2', name: '沙刃横扫', kind: 'volley', range: 13.5, dmgPct: 1.40, mpCost: 18, windup: 0.60, cd: 6.4, count: 1, spread: 0.0, speed: 17.5, shape: 'shard', scale: [1.35, 0.20, 0.60], col: [0.88, 0.70, 0.36] },
      ],
    },
    {
      id: 7, key: 'cactus_sprite', name: '滚沙仙人掌精', realm: '练气期', region: 'desert',
      scale: 1.78, radius: 1.48, colRadius: 1.18, colHeight: 2.35, nameHeight: 2.75, hoverY: 0.0,
      moveSpeed: 5.8, patrolRadius: 18.0, aggroRange: 22.0, leashRange: 56.0,
      tint: [0.84, 0.90, 0.42],
      coreBase: { hp: 76, mp: 70, atk: 9, def: 4 },
      coreStep: { hp: 13, mp: 10, atk: 1.3, def: 0.7 },
      buildMesh: buildCactusSpriteMesh,
      moves: [
        { key: 'basic',  name: '刺球撞击', kind: 'lunge',  range: 3.9,  dmgPct: 1.00, mpCost: 0,  windup: 0.46, cd: 2.1, col: [0.86, 0.84, 0.48] },
        { key: 'skill1', name: '针刺齐射', kind: 'volley', range: 15.5, dmgPct: 0.80, mpCost: 16, windup: 0.56, cd: 5.4, count: 3, spread: 0.24, speed: 20.0, shape: 'shard', scale: [0.18, 0.18, 0.68], col: [0.94, 0.90, 0.58] },
        { key: 'skill2', name: '滚沙突袭', kind: 'dash',   range: 12.5, dmgPct: 1.40, mpCost: 18, windup: 0.58, cd: 6.6, dashSpeed: 17.5, dashDur: 0.56, rollSpin: true, col: [0.86, 0.72, 0.40] },
      ],
    },

    // --- 筑基期普通妖兽 (Foundation-Establishment: 3 regions × 6 species · 筑基前期/筑基中期) ---
    {
      id: 8, key: 'vine_treant', name: '青藤树妖', realm: '筑基期', region: 'spiritwood',
      scale: 2.38, radius: 2.10, colRadius: 1.68, colHeight: 5.60, nameHeight: 6.50, hoverY: 0.0,
      moveSpeed: 5.2, patrolRadius: 20.0, aggroRange: 26.0, leashRange: 64.0,
      tint: [0.30, 0.94, 0.62],
      coreBase: { hp: 360, mp: 320, atk: 36, def: 19 },
      coreStep: { hp: 80, mp: 65, atk: 7, def: 4 },
      buildMesh: buildVineTreantMesh,
      moves: [
        { key: 'basic',  name: '巨木横扫', kind: 'lunge',      range: 5.2,  dmgPct: 1.00, mpCost: 0,  windup: 0.62, cd: 2.5, col: [0.36, 0.86, 0.52] },
        { key: 'skill1', name: '青藤缠缚', kind: 'groundRing', range: 16.0, dmgPct: 1.25, mpCost: 28, windup: 0.68, cd: 6.8, radius: 4.2, slowSec: 2.2, col: [0.28, 0.94, 0.62] },
        { key: 'skill2', name: '古木灵种', kind: 'volley',     range: 18.5, dmgPct: 0.85, mpCost: 30, windup: 0.66, cd: 6.2, count: 3, spread: 0.28, speed: 17.0, shape: 'orb', scale: [0.52, 0.52, 0.52], col: [0.34, 0.96, 0.66] },
      ],
    },
    {
      id: 9, key: 'spirit_leopard', name: '灵纹影豹', realm: '筑基期', region: 'spiritwood',
      scale: 2.25, radius: 1.85, colRadius: 1.48, colHeight: 2.95, nameHeight: 3.45, hoverY: 0.0,
      moveSpeed: 9.2, patrolRadius: 24.0, aggroRange: 27.0, leashRange: 68.0,
      tint: [0.26, 0.96, 0.92],
      coreBase: { hp: 285, mp: 290, atk: 41, def: 15 },
      coreStep: { hp: 62, mp: 58, atk: 8, def: 3 },
      buildMesh: buildSpiritLeopardMesh,
      moves: [
        { key: 'basic',  name: '幽影利爪', kind: 'lunge',  range: 4.8,  dmgPct: 1.00, mpCost: 0,  windup: 0.42, cd: 1.9, col: [0.28, 0.94, 0.88] },
        { key: 'skill1', name: '灵纹瞬袭', kind: 'dash',   range: 15.0, dmgPct: 1.40, mpCost: 28, windup: 0.48, cd: 5.8, dashSpeed: 24.0, dashDur: 0.48, col: [0.26, 0.96, 0.92] },
        { key: 'skill2', name: '青影裂波', kind: 'volley', range: 16.5, dmgPct: 0.95, mpCost: 26, windup: 0.54, cd: 6.2, count: 2, spread: 0.18, speed: 23.0, shape: 'shard', scale: [1.10, 0.22, 0.92], col: [0.26, 0.96, 0.92] },
      ],
    },
    {
      id: 10, key: 'ruined_soldier', name: '残甲阵兵', realm: '筑基期', region: 'canzhen',
      scale: 2.30, radius: 1.90, colRadius: 1.45, colHeight: 4.80, nameHeight: 5.65, hoverY: 0.0,
      moveSpeed: 6.2, patrolRadius: 18.0, aggroRange: 26.0, leashRange: 64.0,
      tint: [0.28, 0.78, 1.00],
      coreBase: { hp: 340, mp: 280, atk: 39, def: 21 },
      coreStep: { hp: 74, mp: 56, atk: 8, def: 4 },
      buildMesh: buildRuinedSoldierMesh,
      moves: [
        { key: 'basic',  name: '断戟横斩', kind: 'lunge',  range: 5.4,  dmgPct: 1.00, mpCost: 0,  windup: 0.56, cd: 2.3, col: [0.36, 0.80, 1.00] },
        { key: 'skill1', name: '魂火突刺', kind: 'volley', range: 17.0, dmgPct: 1.35, mpCost: 26, windup: 0.58, cd: 5.6, count: 1, spread: 0.0, speed: 24.0, shape: 'shard', scale: [0.46, 0.30, 1.55], col: [0.28, 0.78, 1.00] },
        { key: 'skill2', name: '残阵裂地', kind: 'nova',   range: 8.8,  dmgPct: 1.45, mpCost: 34, windup: 0.76, cd: 7.6, radius: 7.0, col: [0.42, 0.78, 0.96] },
      ],
    },
    {
      id: 11, key: 'rune_golem', name: '镇道符傀', realm: '筑基期', region: 'canzhen',
      scale: 2.35, radius: 2.00, colRadius: 1.65, colHeight: 5.10, nameHeight: 5.55, hoverY: 1.15,
      moveSpeed: 5.8, patrolRadius: 18.0, aggroRange: 28.0, leashRange: 66.0,
      tint: [1.00, 0.82, 0.34],
      coreBase: { hp: 310, mp: 380, atk: 38, def: 18 },
      coreStep: { hp: 68, mp: 78, atk: 7, def: 4 },
      buildMesh: buildRuneGolemMesh,
      moves: [
        { key: 'basic',  name: '符印灵弹',   kind: 'volley',     range: 17.5, dmgPct: 1.00, mpCost: 0,  windup: 0.54, cd: 2.4, count: 1, spread: 0.0, speed: 21.0, shape: 'orb', scale: [0.54, 0.54, 0.54], col: [1.00, 0.82, 0.34] },
        { key: 'skill1', name: '镇道金光阵', kind: 'groundRing', range: 17.5, dmgPct: 1.35, mpCost: 30, windup: 0.70, cd: 6.8, radius: 4.5, slowSec: 1.8, col: [1.00, 0.84, 0.38] },
        { key: 'skill2', name: '四方符雨',   kind: 'volley',     range: 19.0, dmgPct: 0.82, mpCost: 36, windup: 0.68, cd: 7.2, count: 4, spread: 0.36, speed: 19.5, shape: 'shard', scale: [0.42, 0.16, 0.96], col: [0.98, 0.78, 0.28] },
      ],
    },
    {
      id: 12, key: 'frost_wolf', name: '玄冰狼妖', realm: '筑基期', region: 'frost',
      scale: 2.36, radius: 2.05, colRadius: 1.62, colHeight: 3.45, nameHeight: 4.05, hoverY: 0.0,
      moveSpeed: 8.6, patrolRadius: 24.0, aggroRange: 28.0, leashRange: 70.0,
      tint: [0.56, 0.90, 1.00],
      coreBase: { hp: 315, mp: 310, atk: 40, def: 17 },
      coreStep: { hp: 70, mp: 64, atk: 8, def: 4 },
      buildMesh: buildFrostWolfMesh,
      moves: [
        { key: 'basic',  name: '霜牙撕咬', kind: 'lunge',    range: 5.0,  dmgPct: 1.00, mpCost: 0,  windup: 0.46, cd: 2.1, col: [0.68, 0.92, 1.00] },
        { key: 'skill1', name: '寒雾吐息', kind: 'volley',   range: 15.5, dmgPct: 0.85, mpCost: 28, windup: 0.62, cd: 6.0, count: 3, spread: 0.32, speed: 16.0, shape: 'orb', scale: [0.68, 0.56, 0.68], slowSec: 1.8, col: [0.74, 0.94, 1.00] },
        { key: 'skill2', name: '冰刺狂扑', kind: 'leapSlam', range: 13.5, dmgPct: 1.50, mpCost: 34, windup: 0.66, cd: 7.4, radius: 6.0, col: [0.52, 0.88, 1.00] },
      ],
    },
    {
      id: 13, key: 'snow_spirit', name: '寒魄雪灵', realm: '筑基期', region: 'frost',
      scale: 2.28, radius: 1.90, colRadius: 1.50, colHeight: 4.65, nameHeight: 5.15, hoverY: 1.25,
      moveSpeed: 6.6, patrolRadius: 22.0, aggroRange: 28.0, leashRange: 68.0,
      tint: [0.36, 0.76, 1.00],
      coreBase: { hp: 295, mp: 390, atk: 39, def: 16 },
      coreStep: { hp: 64, mp: 80, atk: 8, def: 3 },
      buildMesh: buildSnowSpiritMesh,
      moves: [
        { key: 'basic',  name: '冰棱飞射', kind: 'volley', range: 18.0, dmgPct: 1.00, mpCost: 0,  windup: 0.50, cd: 2.3, count: 1, spread: 0.0, speed: 23.0, shape: 'shard', scale: [0.34, 0.34, 1.28], col: [0.44, 0.84, 1.00] },
        { key: 'skill1', name: '三棱齐发', kind: 'volley', range: 19.5, dmgPct: 0.85, mpCost: 30, windup: 0.64, cd: 6.2, count: 3, spread: 0.26, speed: 21.5, shape: 'shard', scale: [0.32, 0.32, 1.18], col: [0.36, 0.76, 1.00] },
        { key: 'skill2', name: '寒魄霜暴', kind: 'nova',   range: 9.2,  dmgPct: 1.45, mpCost: 36, windup: 0.74, cd: 7.6, radius: 7.2, slowSec: 1.8, col: [0.46, 0.82, 1.00] },
      ],
    },

    // --- 练气区精英怪 (Qi-Refining Elites: 练气6~10层随机 · 每层固定核心增量) ---
    {
      id: 14, key: 'thunder_horse', name: '青鬃奔雷马', realm: '练气期', region: 'lowcloud', isElite: true,
      scale: 2.22, radius: 2.10, colRadius: 1.58, colHeight: 4.65, nameHeight: 5.45, hoverY: 0.0,
      moveSpeed: 9.6, patrolRadius: 26.0, aggroRange: 25.0, leashRange: 68.0,
      tint: [0.24, 0.96, 1.00],
      coreBase: { hp: 230, mp: 170, atk: 18, def: 8 },
      coreStep: { hp: 26, mp: 18, atk: 1.8, def: 0.9 },
      ambientTrail: { kind: 'hoofVortex', col: [0.34, 0.96, 1.00], interval: 0.24 },
      buildMesh: buildThunderHorseMesh,
      moves: [
        { key: 'basic',  name: '奔雷蹄踏',   kind: 'lunge',     range: 5.2,  dmgPct: 1.00, mpCost: 0,  windup: 0.44, cd: 2.0, col: [0.28, 0.96, 1.00] },
        { key: 'skill1', name: '电鬃奔雷冲', kind: 'eliteDash', range: 16.5, dmgPct: 1.40, mpCost: 22, windup: 0.56, cd: 5.8, dashSpeed: 26.5, dashDur: 0.54, burstRadius: 5.8, burstShards: 4, col: [0.24, 0.96, 1.00] },
        { key: 'skill2', name: '青雷骤雨',   kind: 'multiRing', range: 18.0, dmgPct: 1.35, mpCost: 26, windup: 0.68, cd: 7.2, ringCount: 3, radius: 3.8, spreadDist: 4.4, pillarCol: [0.76, 1.00, 1.00], col: [0.22, 0.94, 1.00] },
      ],
    },
    {
      id: 15, key: 'swamp_frog_elite', name: '沼泽毒蛙精', realm: '练气期', region: 'chenyan', isElite: true,
      scale: 2.24, radius: 2.05, colRadius: 1.62, colHeight: 3.95, nameHeight: 4.65, hoverY: 0.0,
      moveSpeed: 6.2, patrolRadius: 20.0, aggroRange: 25.0, leashRange: 64.0,
      tint: [0.28, 0.86, 0.30],
      coreBase: { hp: 275, mp: 195, atk: 17, def: 9 },
      coreStep: { hp: 30, mp: 22, atk: 1.6, def: 1.1 },
      ambientTrail: { kind: 'toxinMist', col: [0.24, 0.80, 0.26], interval: 0.42 },
      buildMesh: buildSwampFrogEliteMesh,
      moves: [
        { key: 'basic',  name: '毒爪重拍', kind: 'lunge',      range: 5.0,  dmgPct: 1.00, mpCost: 0,  windup: 0.48, cd: 2.1, slowSec: 1.2, col: [0.26, 0.84, 0.28] },
        { key: 'skill1', name: '腐毒疱爆', kind: 'barrageLob', range: 18.5, dmgPct: 1.10, mpCost: 24, windup: 0.64, cd: 6.0, count: 3, spread: 0.34, speed: 16.5, splashR: 3.6, slowSec: 2.0, col: [0.24, 0.86, 0.28] },
        { key: 'skill2', name: '沼泽瘴潮', kind: 'eliteNova',  range: 9.2,  dmgPct: 1.50, mpCost: 30, windup: 0.72, cd: 7.4, radius: 7.2, radialCount: 6, radialSpeed: 15.5, radialShape: 'orb', radialScale: [0.54, 0.54, 0.54], slowSec: 2.2, col: [0.34, 0.88, 0.34], subCol: [0.62, 0.32, 0.78] },
      ],
    },
    {
      id: 16, key: 'spirit_tit_elite', name: '灵羽山雀', realm: '练气期', region: 'cloudmtn', isElite: true,
      scale: 2.18, radius: 1.90, colRadius: 1.38, colHeight: 2.85, nameHeight: 3.35, hoverY: 3.5,
      moveSpeed: 9.2, patrolRadius: 28.0, aggroRange: 28.0, leashRange: 74.0,
      tint: [0.98, 0.88, 0.52],
      coreBase: { hp: 215, mp: 200, atk: 19, def: 7 },
      coreStep: { hp: 24, mp: 22, atk: 1.9, def: 0.8 },
      ambientTrail: { kind: 'featherGlint', col: [0.98, 0.90, 0.58], interval: 0.34 },
      buildMesh: buildSpiritTitEliteMesh,
      moves: [
        { key: 'basic',  name: '灵羽疾啄',     kind: 'lunge',       range: 5.4,  dmgPct: 1.00, mpCost: 0,  windup: 0.42, cd: 1.9, col: [0.76, 0.96, 0.96] },
        { key: 'skill1', name: '金翎风刃阵',   kind: 'volley',      range: 20.5, dmgPct: 0.80, mpCost: 22, windup: 0.56, cd: 5.4, count: 5, spread: 0.36, speed: 24.5, shape: 'shard', scale: [0.38, 0.18, 1.12], col: [0.98, 0.88, 0.52] },
        { key: 'skill2', name: '云岚金羽旋风', kind: 'spiralStorm', range: 19.5, dmgPct: 1.25, mpCost: 28, windup: 0.66, cd: 6.8, count: 2, spread: 0.24, speed: 15.5, ringScale: [1.85, 1.25, 1.85], shardCol: [1.00, 0.90, 0.54], col: [0.78, 0.96, 1.00] },
      ],
    },
    {
      id: 17, key: 'crimson_scorpion_elite', name: '沙地赤蝎', realm: '练气期', region: 'desert', isElite: true,
      scale: 2.26, radius: 2.05, colRadius: 1.62, colHeight: 3.15, nameHeight: 3.80, hoverY: 0.0,
      moveSpeed: 7.4, patrolRadius: 22.0, aggroRange: 25.0, leashRange: 64.0,
      tint: [0.92, 0.24, 0.18],
      coreBase: { hp: 250, mp: 175, atk: 19, def: 10 },
      coreStep: { hp: 28, mp: 18, atk: 1.8, def: 1.0 },
      ambientTrail: { kind: 'sandDust', col: [0.84, 0.64, 0.38], interval: 0.22 },
      buildMesh: buildCrimsonScorpionEliteMesh,
      moves: [
        { key: 'basic',  name: '厚螯重钳',   kind: 'lunge',     range: 5.0,  dmgPct: 1.00, mpCost: 0,  windup: 0.44, cd: 2.0, col: [0.88, 0.30, 0.20] },
        { key: 'skill1', name: '赤毒连尾刺', kind: 'volley',    range: 18.0, dmgPct: 0.90, mpCost: 22, windup: 0.54, cd: 5.4, count: 3, spread: 0.22, speed: 24.5, shape: 'shard', scale: [0.34, 0.26, 1.18], col: [0.96, 0.22, 0.16] },
        { key: 'skill2', name: '赤沙裂地冲', kind: 'eliteDash', range: 16.0, dmgPct: 1.45, mpCost: 28, windup: 0.60, cd: 6.8, dashSpeed: 23.0, dashDur: 0.56, burstRadius: 6.0, burstShards: 5, col: [0.90, 0.26, 0.18] },
      ],
    },

    // --- 筑基区精英怪 (Foundation-Establishment Elites: 筑基后期) ---
    {
      id: 18, key: 'ancient_wood_deer', name: '古木灵鹿', realm: '筑基期', region: 'spiritwood', isElite: true,
      scale: 2.74, radius: 2.35, colRadius: 1.75, colHeight: 7.80, nameHeight: 9.00, hoverY: 0.0,
      moveSpeed: 9.4, patrolRadius: 28.0, aggroRange: 30.0, leashRange: 76.0,
      tint: [0.34, 0.96, 0.54],
      coreBase: { hp: 920, mp: 560, atk: 60, def: 31 },
      coreStep: { hp: 140, mp: 85, atk: 10, def: 5 },
      ambientTrail: { kind: 'woodGlow', col: [0.34, 0.96, 0.56], interval: 0.28 },
      buildMesh: buildAncientWoodDeerMesh,
      moves: [
        { key: 'basic',  name: '灵角突撞',   kind: 'lunge',       range: 6.2,  dmgPct: 1.00, mpCost: 0,  windup: 0.48, cd: 2.2, col: [0.38, 0.96, 0.56] },
        { key: 'skill1', name: '古林藤狱阵', kind: 'multiRing',   range: 21.0, dmgPct: 1.40, mpCost: 42, windup: 0.68, cd: 6.8, ringCount: 3, radius: 4.8, spreadDist: 5.2, slowSec: 2.4, pillarCol: [0.52, 1.00, 0.62], col: [0.26, 0.94, 0.52] },
        { key: 'skill2', name: '万叶青岚破', kind: 'spiralStorm', range: 22.0, dmgPct: 1.20, mpCost: 46, windup: 0.64, cd: 6.4, count: 3, spread: 0.30, speed: 20.5, ringScale: [2.15, 1.25, 2.15], shardCol: [0.54, 1.00, 0.48], col: [0.32, 0.96, 0.58] },
      ],
    },
    {
      id: 19, key: 'ancient_sword_wraith', name: '古剑灵卫', realm: '筑基期', region: 'canzhen', isElite: true,
      scale: 2.78, radius: 2.35, colRadius: 1.72, colHeight: 6.40, nameHeight: 7.15, hoverY: 0.55,
      moveSpeed: 7.2, patrolRadius: 22.0, aggroRange: 30.0, leashRange: 74.0,
      tint: [0.28, 0.82, 1.00],
      coreBase: { hp: 840, mp: 520, atk: 66, def: 33 },
      coreStep: { hp: 130, mp: 80, atk: 11, def: 5 },
      ambientTrail: { kind: 'swordAura', col: [0.30, 0.82, 1.00], interval: 0.34 },
      buildMesh: buildAncientSwordWraithMesh,
      moves: [
        { key: 'basic',  name: '断剑裂斩',           kind: 'lunge',     range: 6.4,  dmgPct: 1.00, mpCost: 0,  windup: 0.50, cd: 2.2, col: [0.34, 0.84, 1.00] },
        { key: 'skill1', name: '幽蓝剑影齐发',       kind: 'volley',    range: 23.0, dmgPct: 0.85, mpCost: 38, windup: 0.62, cd: 5.8, count: 5, spread: 0.38, speed: 27.0, shape: 'shard', scale: [0.44, 0.24, 1.85], col: [0.28, 0.82, 1.00] },
        { key: 'skill2', name: '古剑残阵·万剑归宗', kind: 'eliteNova', range: 12.5, dmgPct: 1.60, mpCost: 48, windup: 0.76, cd: 7.6, radius: 9.0, radialCount: 8, radialSpeed: 22.5, radialShape: 'shard', radialScale: [0.42, 0.24, 1.65], col: [0.26, 0.80, 1.00], subCol: [0.76, 0.96, 1.00] },
      ],
    },
    {
      id: 20, key: 'frost_pattern_fox', name: '霜纹雪狐', realm: '筑基期', region: 'frost', isElite: true,
      scale: 2.70, radius: 2.20, colRadius: 1.65, colHeight: 4.35, nameHeight: 5.10, hoverY: 0.0,
      moveSpeed: 10.2, patrolRadius: 28.0, aggroRange: 30.0, leashRange: 78.0,
      tint: [0.54, 0.88, 1.00],
      coreBase: { hp: 760, mp: 600, atk: 64, def: 27 },
      coreStep: { hp: 120, mp: 90, atk: 10, def: 4 },
      ambientTrail: { kind: 'frostMist', col: [0.64, 0.92, 1.00], interval: 0.22 },
      buildMesh: buildFrostPatternFoxMesh,
      moves: [
        { key: 'basic',  name: '霜爪掠影',   kind: 'lunge',     range: 5.6,  dmgPct: 1.00, mpCost: 0,  windup: 0.42, cd: 1.9, slowSec: 1.4, col: [0.62, 0.90, 1.00] },
        { key: 'skill1', name: '霜华冰狐闪', kind: 'eliteDash', range: 19.5, dmgPct: 1.45, mpCost: 40, windup: 0.50, cd: 5.8, dashSpeed: 28.5, dashDur: 0.52, burstRadius: 6.8, burstShards: 6, slowSec: 2.0, col: [0.52, 0.88, 1.00] },
        { key: 'skill2', name: '九霄霜纹暴', kind: 'eliteNova', range: 12.0, dmgPct: 1.55, mpCost: 48, windup: 0.70, cd: 7.4, radius: 8.6, radialCount: 6, radialSpeed: 20.5, radialShape: 'shard', radialScale: [0.46, 0.28, 1.38], slowSec: 2.4, col: [0.56, 0.88, 1.00], subCol: [0.86, 0.98, 1.00] },
      ],
    },

    // --- 区域小BOSS (固定练气十层 · 体型比筑基后期妖兽再大一圈 · 1普攻 + 3技能!) ---
    {
      id: 21, key: 'qingming_panda_boss', name: '青冥异貊', realm: '练气期', region: 'bamboovalley', isElite: true, isBoss: true,
      scale: 3.35, radius: 3.15, colRadius: 2.45, colHeight: 6.85, nameHeight: 7.75, hoverY: 0.0,
      moveSpeed: 8.8, patrolRadius: 16.0, aggroRange: 38.0, leashRange: 62.0,
      tint: [0.30, 0.98, 0.86],
      coreBase: { hp: 540, mp: 280, atk: 26, def: 13 },
      coreStep: { hp: 48, mp: 26, atk: 2.4, def: 1.2 },
      ambientTrail: { kind: 'woodGlow', col: [0.32, 0.96, 0.84], interval: 0.26 },
      buildMesh: buildQingmingPandaBossMesh,
      moves: [
        { key: 'basic',  name: '重掌裂竹',   kind: 'lunge',     range: 7.6,  dmgPct: 1.00, mpCost: 0,  windup: 0.48, cd: 2.1, col: [0.34, 0.96, 0.84] },
        { key: 'skill1', name: '幽冥狂冲',   kind: 'eliteDash', range: 25.0, dmgPct: 1.40, mpCost: 26, windup: 0.58, cd: 6.2, dashSpeed: 28.0, dashDur: 0.62, burstRadius: 8.2, burstShards: 8, col: [0.30, 0.96, 0.86] },
        { key: 'skill2', name: '震地崩岳',   kind: 'leapSlam',  range: 19.0, dmgPct: 1.55, mpCost: 32, windup: 0.66, cd: 7.2, radius: 9.2, slowSec: 2.0, col: [0.94, 0.74, 0.26] },
        { key: 'skill3', name: '青冥灵竹破', kind: 'eliteNova', range: 16.5, dmgPct: 1.70, mpCost: 40, windup: 0.78, cd: 8.4, radius: 10.5, radialCount: 10, radialSpeed: 22.0, radialShape: 'shard', radialScale: [0.54, 0.30, 1.75], col: [0.30, 0.98, 0.86], subCol: [0.96, 0.78, 0.30] },
      ],
    },
    {
      id: 22, key: 'corrupt_scale_serpent_boss', name: '异化腐鳞蛇妖', realm: '练气期', region: 'venommire', isElite: true, isBoss: true,
      scale: 3.35, radius: 3.10, colRadius: 2.35, colHeight: 7.60, nameHeight: 8.55, hoverY: 0.0,
      moveSpeed: 8.4, patrolRadius: 14.0, aggroRange: 38.0, leashRange: 54.0,
      tint: [0.56, 0.22, 0.94],
      coreBase: { hp: 480, mp: 340, atk: 28, def: 11 },
      coreStep: { hp: 44, mp: 30, atk: 2.6, def: 1.0 },
      ambientTrail: { kind: 'venomSpore', col: [0.36, 0.94, 0.48], interval: 0.24 },
      buildMesh: buildCorruptSerpentBossMesh,
      moves: [
        { key: 'basic',  name: '毒牙突噬',   kind: 'lunge',     range: 8.0,  dmgPct: 1.00, mpCost: 0,  windup: 0.46, cd: 2.0, slowSec: 1.5, col: [0.32, 0.98, 0.48] },
        { key: 'skill1', name: '腐鳞毒雨',   kind: 'volley',    range: 27.0, dmgPct: 0.78, mpCost: 26, windup: 0.60, cd: 5.6, count: 7, spread: 0.44, speed: 24.5, shape: 'shard', scale: [0.46, 0.26, 1.60], slowSec: 1.8, col: [0.64, 0.22, 0.96] },
        { key: 'skill2', name: '蚀骨毒潭爆', kind: 'multiRing', range: 25.0, dmgPct: 1.45, mpCost: 34, windup: 0.68, cd: 7.0, ringCount: 4, radius: 5.4, spreadDist: 5.8, slowSec: 2.4, pillarCol: [0.66, 0.22, 0.96], col: [0.24, 0.96, 0.48] },
        { key: 'skill3', name: '万毒噬魂阵', kind: 'eliteNova', range: 16.5, dmgPct: 1.65, mpCost: 42, windup: 0.78, cd: 8.6, radius: 10.6, radialCount: 10, radialSpeed: 21.5, radialShape: 'shard', radialScale: [0.52, 0.28, 1.72], slowSec: 2.2, col: [0.64, 0.20, 0.96], subCol: [0.24, 0.98, 0.48] },
      ],
    },
  ];

  // Shared Sub-Realm & Stat Roller (同一妖兽每次升级核心数值增量一致，实际四维属性以 80%~110% 联动随机浮动!)
  const LIANQI_LAYER_NAMES       = ['练气一层', '练气二层', '练气三层', '练气四层', '练气五层', '练气六层'];
  const LIANQI_EXP_TABLE         = [24, 30, 36, 44, 52, 62];

  const ELITE_LIANQI_LAYER_NAMES = ['练气六层', '练气七层', '练气八层', '练气九层', '练气十层'];
  const ELITE_LIANQI_EXP_TABLE   = [105, 125, 148, 175, 205];

  const ZHUJI_STAGE_NAMES        = ['筑基前期', '筑基中期'];
  const ZHUJI_EXP_TABLE          = [95, 135];

  function computeMonsterCoreStats(sp, lvIdx) {
    const b = sp.coreBase || { hp: 80, mp: 60, atk: 9, def: 3 };
    const s = sp.coreStep || { hp: 12, mp: 8, atk: 1.2, def: 0.6 };
    const lv = Math.max(0, lvIdx || 0);
    return {
      hp:  Math.max(10, Math.round(b.hp  + lv * s.hp)),
      mp:  Math.max(10, Math.round(b.mp  + lv * s.mp)),
      atk: Math.max(2,  Math.round(b.atk + lv * s.atk)),
      def: Math.max(1,  Math.round(b.def + lv * s.def)),
    };
  }

  function rollMonsterSubRealm(sp, rFn) {
    let subRealmLabel = '练气一层';
    let subRealmIdx = 1;
    let lvIdx = 0;
    let expReward = 24;

    if (sp.isBoss) {
      subRealmLabel = '练气十层';
      subRealmIdx = 10;
      lvIdx = 0;
      expReward = 340;
    } else if (sp.isElite) {
      if (sp.realm === '筑基期') {
        subRealmLabel = '筑基后期';
        subRealmIdx = 3;
        lvIdx = 0;
        expReward = 285;
      } else {
        lvIdx = Math.min(4, Math.floor(rFn() * 5)); // 练气6到10层随机
        subRealmLabel = ELITE_LIANQI_LAYER_NAMES[lvIdx];
        subRealmIdx = lvIdx + 6;
        expReward = ELITE_LIANQI_EXP_TABLE[lvIdx];
      }
    } else if (sp.realm === '筑基期') {
      lvIdx = rFn() < 0.5 ? 0 : 1; // 筑基前期 / 筑基中期随机
      subRealmLabel = ZHUJI_STAGE_NAMES[lvIdx];
      subRealmIdx = lvIdx + 1;
      expReward = ZHUJI_EXP_TABLE[lvIdx];
    } else {
      lvIdx = Math.min(5, Math.floor(rFn() * 6)); // 练气1到6层随机
      subRealmLabel = LIANQI_LAYER_NAMES[lvIdx];
      subRealmIdx = lvIdx + 1;
      expReward = LIANQI_EXP_TABLE[lvIdx];
    }

    const core = computeMonsterCoreStats(sp, lvIdx);
    // Linked 80% ~ 110% variance across ALL 4 attributes together (四个属性连一起随机浮动)
    const varRoll = 0.80 + rFn() * 0.30;
    return {
      subRealmLabel,
      subRealmIdx,
      coreStats: core,
      varRoll,
      maxHp: Math.max(10, Math.round(core.hp  * varRoll)),
      maxMp: Math.max(10, Math.round(core.mp  * varRoll)),
      atk:   Math.max(2,  Math.round(core.atk * varRoll)),
      def:   Math.max(1,  Math.round(core.def * varRoll)),
      expReward,
    };
  }

  function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function getMonsterGroundY(x, z) {
    let y = T.getMeshTerrainHeight(x, z);
    const vm = T.VENOM_MIRE;
    if (vm && Math.hypot(x - vm.cx, z - vm.cz) <= vm.arenaR + 1.5) {
      if (y < vm.arenaY + 0.04) y = vm.arenaY + 0.04;
    }
    return y;
  }

  // =========================================================
  // 6. STRICT REGIONAL SPAWNER (7 Regions × 14 Normal + 7 Regional Elites + 2 Mini-Bosses!)
  // =========================================================
  function generateMonsterSpawns() {
    const spawns = [];
    const rand = makeRng(20261122);
    const nrm = new Float32Array(3);

    const tooClose = (x, z, minDist) => {
      const m2 = minDist * minDist;
      for (let i = 0; i < spawns.length; i++) {
        const dx = spawns[i].homeX - x;
        const dz = spawns[i].homeZ - z;
        if (dx * dx + dz * dz < m2) return true;
      }
      return false;
    };

    const addSpawn = (specId, x, z) => {
      const sp = SPECIES[specId];
      const groundY = getMonsterGroundY(x, z);
      const y = groundY + sp.hoverY;
      const sr = rollMonsterSubRealm(sp, rand);
      spawns.push({
        id: spawns.length,
        specId,
        spec: sp,
        subRealmLabel: sr.subRealmLabel,
        subRealmIdx: sr.subRealmIdx,
        varRoll: sr.varRoll,
        expReward: sr.expReward,
        homeX: x, homeY: y, homeZ: z,
        x, y, z,
        yaw: rand() * Math.PI * 2,
        rollAngle: 0,
        maxHp: sr.maxHp,
        hp: sr.maxHp,
        maxMp: sr.maxMp,
        mp: sr.maxMp,
        atk: sr.atk,
        def: sr.def,
        alive: true,
        respawnTimer: 0,
        hitFlash: 0,
        staggerTimer: 0,
        stunTimer: 0,
        rootTimer: 0,
        slowTimer: 0,
        slowFactor: 1.0,
        knockVx: 0,
        knockVz: 0,
        state: 'patrol',
        stateTimer: 1.5 + rand() * 3.5,
        patrolX: x, patrolZ: z,
        activeMove: null,
        moveCooldowns: sp.moves.map((_, idx) => (idx === 0 ? 0 : (0.9 * idx + rand() * 1.4))),
        globalCd: 0.4 + rand() * 0.8,
        animPhase: rand() * Math.PI * 2,
        trailTimer: rand() * 0.4,
        moveBlend: 0,
        attackProgress: 0,
        chargeGlow: 0,
        dashVx: 0, dashVz: 0, dashHit: false,
        leapStartX: x, leapStartY: y, leapStartZ: z,
        leapEndX: x, leapEndY: y, leapEndZ: z,
        leapDur: 0.55,
        modelMat: M.mat4(),
        visible: true,
      });
    };

    const scatterInRegion = (specId, targetCount, minX, maxX, minZ, maxZ, minSpacing, validator) => {
      let added = 0;
      for (let tries = 0; tries < 2400 && added < targetCount; tries++) {
        const x = minX + rand() * (maxX - minX);
        const z = minZ + rand() * (maxZ - minZ);
        if (tooClose(x, z, minSpacing)) continue;
        T.getTerrainNormal(x, z, nrm);
        const y = T.getMeshTerrainHeight(x, z);
        if (!validator(x, y, z, nrm)) continue;
        addSpawn(specId, x, z);
        added++;
      }
    };

    // --- 1) 低云平原 (练气期: 青草团精=0, 赤尾野兔妖=1; ~12 each) ---
    const spX = T.LOW_CLOUD_PLAINS.spawnX;
    const spZ = T.LOW_CLOUD_PLAINS.spawnZ;
    addSpawn(0, spX + 42, spZ - 30); // 青草团精 (clearly visible ahead-right from spawn, safely outside 21m aggro!)
    addSpawn(1, spX - 44, spZ - 44); // 赤尾野兔妖 (ahead-left)
    addSpawn(0, spX + 95, spZ + 52);
    addSpawn(1, spX - 96, spZ + 68);

    const validLowCloud = (x, y, z, n) => {
      if (Math.hypot(x - spX, z - spZ) < 92) return false;
      if (T.getLowCloudPlainsMask(x, z) < 0.42) return false;
      if (T.getSwampMask(x, z) > 0.08 || T.getAncientRoadMask(x, z) > 0.08 || T.getDesertMask(x, z) > 0.05) return false;
      if (T.getRiverInfo(x, z).riverMask > 0.15) return false;
      return y > 10.0 && y < 48.0 && n[1] > 0.87;
    };
    scatterInRegion(0, 10, -4250, -180, 420, 6850, 175, validLowCloud);
    scatterInRegion(1, 10, -4250, -180, 420, 6850, 175, validLowCloud);
    // 精英 · 青鬃奔雷马 (14): 低云平原 (练气6~10层随机)
    addSpawn(14, spX + 115, spZ - 95);
    scatterInRegion(14, 3, -4150, -280, 560, 6600, 320, validLowCloud);

    // --- 2) 迷雾湿地 / 沉烟迷泽 (练气期: 腐泥软泥怪=2, 毒瘴蟾蜍=3; ~12 each) ---
    addSpawn(2, 412, 2048);
    addSpawn(3, 622, 2212);
    addSpawn(2, 855, 2350);
    addSpawn(3, 588, 2480);

    const validSwamp = (x, y, z, n) => {
      if (T.getSwampMask(x, z) < 0.34) return false;
      if (T.getCloudMountainMask(x, z) > 0.10) return false;
      return y >= T.SWAMP_WATER_Y - 0.35 && y <= 14.5 && n[1] > 0.83;
    };
    scatterInRegion(2, 10, 220, 3280, 1500, 3360, 125, validSwamp);
    scatterInRegion(3, 10, 220, 3280, 1500, 3360, 125, validSwamp);
    // 精英 · 沼泽毒蛙精 (15): 迷雾湿地 (练气6~10层随机)
    addSpawn(15, 735, 2140);
    scatterInRegion(15, 3, 280, 3160, 1560, 3260, 260, validSwamp);

    // --- 3) 云雾山 (练气期: 山岩小石灵=4, 云雀灵禽=5; ~12 each) ---
    const cm = T.CLOUD_MOUNTAIN;
    for (let i = 0; i < cm.terraces.length; i++) {
      const tc = cm.terraces[i];
      const angA = i * 1.1 + 0.4;
      addSpawn(4, tc.x + Math.cos(angA) * 34, tc.z + Math.sin(angA) * 34);
      addSpawn(4, tc.x + Math.cos(angA + 2.2) * 58, tc.z + Math.sin(angA + 2.2) * 58);
      addSpawn(5, tc.x + Math.cos(angA + 1.1) * 44, tc.z + Math.sin(angA + 1.1) * 44);
      addSpawn(5, tc.x + Math.cos(angA + 3.4) * 66, tc.z + Math.sin(angA + 3.4) * 66);
      // 精英 · 灵羽山雀 (16): 常在云雾山山腰低空与树梢间扑腾 (练气6~10层随机)
      if (i < 4) {
        addSpawn(16, tc.x + Math.cos(angA + 4.5) * 52, tc.z + Math.sin(angA + 4.5) * 52);
      }
    }
    // Summit rim sightings
    addSpawn(4, cm.cx + 78, cm.cz - 34);
    addSpawn(5, cm.cx - 84, cm.cz + 28);

    // --- 4) 流沙荒漠 (练气期: 沙蝎幼兽=6, 滚沙仙人掌精=7; ~12 each) ---
    const dVx = T.DESERT_DUNES.viewX;
    const dVz = T.DESERT_DUNES.viewZ;
    addSpawn(6, dVx - 52, dVz + 38);
    addSpawn(7, dVx + 44, dVz + 54);
    addSpawn(6, dVx - 120, dVz + 135);
    addSpawn(7, dVx + 110, dVz + 165);

    const validDesert = (x, y, z, n) => {
      if (T.getDesertMask(x, z) < 0.36) return false;
      if (T.getLowCloudPlainsMask(x, z) > 0.12) return false;
      return y > 12.0 && y < 78.0 && n[1] > 0.83;
    };
    scatterInRegion(6, 10, -8650, -4220, 1720, 6850, 185, validDesert);
    scatterInRegion(7, 10, -8650, -4220, 1720, 6850, 185, validDesert);
    // 精英 · 沙地赤蝎 (17): 沙漠荒原 (练气6~10层随机)
    addSpawn(17, dVx - 92, dVz + 96);
    scatterInRegion(17, 3, -8450, -4380, 1880, 6600, 340, validDesert);

    // --- 5) 通天木林 (筑基期: 青藤树妖=8, 灵纹影豹=9; ~12 each) ---
    const sf = T.SPIRIT_FOREST;
    addSpawn(8, sf.viewX - 38, sf.viewZ - 58);  // 青藤树妖 guarding forest threshold
    addSpawn(9, sf.viewX + 46, sf.viewZ - 76);  // 灵纹影豹 prowling nearby
    addSpawn(8, -4020, -210);
    addSpawn(9, -3960, -490);

    const validSpiritWood = (x, y, z, n) => {
      if (T.getSpiritForestMask(x, z) < 0.35) return false;
      if (T.getSnowfieldMask(x, z) > 0.12 || T.getAncientRoadMask(x, z) > 0.18) return false;
      if (Math.hypot(x - sf.worldTreeX, z - sf.worldTreeZ) < 62) return false; // Keep central world-tree trunk clear
      return y > 38.0 && y < 95.0 && n[1] > 0.80;
    };
    scatterInRegion(8, 10, -6100, -1450, -4050, 260, 190, validSpiritWood);
    scatterInRegion(9, 10, -6100, -1450, -4050, 260, 190, validSpiritWood);
    // 精英 · 古木灵鹿 (18): 通天木林 (筑基后期)
    addSpawn(18, sf.viewX - 86, sf.viewZ - 118);
    scatterInRegion(18, 3, -5950, -1620, -3850, 120, 340, validSpiritWood);

    // --- 6) 残阵古道 (筑基期: 残甲阵兵=10, 镇道符傀=11; ~11 each) ---
    const cr = T.CANZHEN_ROAD;
    // Curated ancient-road & ruin-site sentinels along the winding ruined path!
    addSpawn(10, -2675, 1280); // 残甲阵兵 near road entrance (~92m ahead of viewX/viewZ)
    addSpawn(11, -2825, 1185); // 镇道符傀 guarding Minor Altar #1
    addSpawn(10, -2965, 1080); // 残甲阵兵 beside Ruin #1
    addSpawn(11, -3130,  995); // 镇道符傀 guarding Minor Altar #2
    addSpawn(10, -3355,  790); // 残甲阵兵 at Mid-Upper Altar
    addSpawn(11, -3635,  445); // 镇道符傀 beside Ruin #2
    addSpawn(10, -3775,  330); // 残甲阵兵 at Grand Ruined Array Sanctum
    // 精英 · 古剑灵卫 (19): 残阵古道 (筑基后期)
    addSpawn(19, -3060, 1025); // 残阵古道中段剑阵遗址
    addSpawn(19, -3710,  380); // 古道大阵残坛守卫

    const validAncientRoad = (x, y, z, n) => {
      if (T.getAncientRoadMask(x, z) < 0.28) return false;
      if (T.getSpiritForestMask(x, z) > 0.22) return false;
      if (Math.hypot(x - cr.viewX, z - cr.viewZ) < 42) return false;
      return y > 18.0 && y < 88.0 && n[1] > 0.80;
    };
    scatterInRegion(10, 7, -4050, -2450, 180, 1520, 115, validAncientRoad);
    scatterInRegion(11, 8, -4050, -2450, 180, 1520, 115, validAncientRoad);
    scatterInRegion(19, 2, -3980, -2560, 240, 1420, 240, validAncientRoad);

    // --- 7) 冰霜雪原 (筑基期: 玄冰狼妖=12, 寒魄雪灵=13; ~12 each) ---
    const fs = T.FROST_SNOWFIELD;
    addSpawn(12, fs.viewX - 42, fs.viewZ - 64); // 玄冰狼妖 near Frost Snowfield entrance
    addSpawn(13, fs.viewX + 48, fs.viewZ - 82); // 寒魄雪灵 hovering toward Frozen Tarn
    addSpawn(12, fs.pondX - 185, fs.pondZ - 95);
    addSpawn(13, fs.pondX + 178, fs.pondZ - 110);
    // 精英 · 霜纹雪狐 (20): 极北雪原 (筑基后期)
    addSpawn(20, fs.viewX + 96, fs.viewZ - 122);
    // Also place 2 of each cleanly on the flat terraces of 霜雪山!
    const fm = T.FROST_MOUNTAIN;
    if (fm && fm.terraces && fm.terraces.length >= 4) {
      addSpawn(12, fm.terraces[0].x + 28, fm.terraces[0].z - 22);
      addSpawn(13, fm.terraces[1].x - 26, fm.terraces[1].z + 24);
      addSpawn(12, fm.terraces[2].x + 24, fm.terraces[2].z + 22);
      addSpawn(13, fm.terraces[3].x - 22, fm.terraces[3].z - 24);
      addSpawn(20, fm.terraces[0].x - 36, fm.terraces[0].z + 32);
    }

    const validFrost = (x, y, z, n) => {
      if (T.getSnowfieldMask(x, z) < 0.34) return false;
      if (T.getFrostMountainMask(x, z) > 0.16) return false;
      if (Math.hypot(x - fs.viewX, z - fs.viewZ) < 44) return false;
      return y > 62.0 && y < 145.0 && n[1] > 0.84;
    };
    scatterInRegion(12, 8, -8100, 3400, -8900, -4600, 220, validFrost);
    scatterInRegion(13, 8, -8100, 3400, -8900, -4600, 220, validFrost);
    scatterInRegion(20, 2, -7800, 3100, -8600, -4800, 420, validFrost);

    // --- 8) 区域小BOSS (固定练气十层 · 1普攻 + 3技能!) ---
    // (1) 灵竹幽谷 · 青冥异貊 (21): 正中央空地
    if (T.BAMBOO_VALLEY) {
      addSpawn(21, T.BAMBOO_VALLEY.cx, T.BAMBOO_VALLEY.cz);
    }
    // (2) 蚀骨毒潭 · 异化腐鳞蛇妖 (22): 中心凸起石滩空场
    if (T.VENOM_MIRE) {
      addSpawn(22, T.VENOM_MIRE.cx, T.VENOM_MIRE.cz);
    }

    return spawns;
  }

  // =========================================================
  // 7. MONSTER MANAGER: AI, 1 BASIC + 2 SKILLS, COLLISION, OVERHEAD NAMES & VFX
  // =========================================================
  class MonsterSystem {
    constructor(collisionWorld = null) {
      this.collisionWorld = collisionWorld;
      this.speciesMeshes = SPECIES.map((sp) => sp.buildMesh());
      this.vfxMeshes = {
        orb: buildUnitOrbMesh(),
        ring: buildUnitRingMesh(),
        shard: buildUnitShardMesh(),
      };
      this.monsters = generateMonsterSpawns();
      this.projectiles = [];
      this.effects = [];
      this.floatingTexts = [];
      this.maxEffects = 110;
      this.maxProjectiles = 76;
      this.onMonsterDeath = null;
      this.playerDmgMul = 1.0;
      this._tmpMat = M.mat4();
    }

    spawnFloatingText(x, y, z, text, color = '#ffe688') {
      if (this.floatingTexts.length >= 32) this.floatingTexts.shift();
      this.floatingTexts.push({
        x: x + (Math.random() - 0.5) * 0.55,
        y,
        z: z + (Math.random() - 0.5) * 0.55,
        text,
        color,
        age: 0,
        life: 0.95,
      });
    }

    applyDamageToMonster(m, dmg, opts = {}) {
      if (!m || !m.alive) return false;
      // 全员暴击机制：默认 5% 暴击率，暴击造成额外 50% 伤害 (1.5×)；主角叠加符箓暴击率
      let effRawDmg = dmg;
      let isCrit = false;
      const baseCritRate = 0.05;
      const bonusRate = (!opts.attackerNpc && this.playerCritState) ? (this.playerCritState.rate || 0) : 0;
      const critMul = (!opts.attackerNpc && this.playerCritState)
        ? Math.max(1.5, this.playerCritState.mul || 1.5)
        : 1.5;
      if (Math.random() < (baseCritRate + bonusRate)) {
        isCrit = true;
        effRawDmg = dmg * critMul;
      }
      // 伤害公式：实际伤害 = max(1, 攻击方招式原始伤害 - 目标防御)
      const amount = Math.max(1, Math.round(effRawDmg) - (m.def || 0));
      m.hp = Math.max(0, m.hp - amount);
      m.hitFlash = 0.22;
      m.lastHitByPlayer = !opts.attackerNpc;

      if (opts.attackerNpc && opts.attackerNpc.alive) {
        if (!m.targetNpc || !m.targetNpc.alive) m.targetNpc = opts.attackerNpc;
      } else {
        m.targetNpc = null;
      }
      if (m.state === 'patrol' || m.state === 'return') {
        m.state = 'chase';
      }
      if (opts.staggerSec && opts.staggerSec > m.staggerTimer) {
        m.staggerTimer = opts.staggerSec;
        if (m.state === 'windup') {
          m.state = 'chase';
          m.activeMove = null;
        }
      }
      if (opts.stunSec && opts.stunSec > m.stunTimer) {
        m.stunTimer = opts.stunSec;
        if (m.state === 'windup' || m.state === 'dash') {
          m.state = 'chase';
          m.activeMove = null;
        }
      }
      if (opts.rootSec && opts.rootSec > m.rootTimer) {
        m.rootTimer = opts.rootSec;
      }
      if (opts.slowSec) {
        m.slowTimer = Math.max(m.slowTimer, opts.slowSec);
        m.slowFactor = Math.min(m.slowFactor || 1.0, opts.slowRatio || 0.70);
      }
      if (opts.knockX || opts.knockZ) {
        const resist = m.spec.isElite ? 0.35 : (m.spec.realm === '筑基期' ? 0.55 : 1.0);
        m.knockVx += (opts.knockX || 0) * 3.0 * resist;
        m.knockVz += (opts.knockZ || 0) * 3.0 * resist;
      }

      const tagY = m.y + (m.spec.nameHeight || 2.8) + 0.35;
      const baseLbl = opts.label ? `-${amount} ${opts.label}` : `-${amount}`;
      const label = isCrit ? `暴击 ${baseLbl}` : baseLbl;
      this.spawnFloatingText(m.x, tagY, m.z, label, isCrit ? '#ff7c44' : (opts.color || '#ffe690'));

      if (m.hp <= 0) {
        m.alive = false;
        m.visible = false;
        m.respawnTimer = m.spec.isElite ? 26.0 : 18.0;
        m.state = 'patrol';
        m.activeMove = null;
        m.targetNpc = null;
        m.stunTimer = 0;
        m.staggerTimer = 0;
        m.rootTimer = 0;
        m.slowTimer = 0;
        m.sprintTimer = 0;
        m.airFlyTimer = 0;
        m.airYOffset = 0;
        m.knockVx = 0;
        m.knockVz = 0;
        this._spawnEffect({
          shape: 'ring',
          x: m.x, y: m.y + 0.35, z: m.z,
          s0: 0.6, s1: (m.spec.radius || 1.4) * (m.spec.isElite ? 2.8 : 2.1),
          life: m.spec.isElite ? 0.85 : 0.65,
          col: m.spec.tint || [0.7, 0.95, 0.8],
          alpha: m.spec.isElite ? 0.72 : 0.55,
          spin: m.spec.isElite ? 3.5 : 0,
        });
        this.spawnFloatingText(m.x, tagY + 0.45, m.z, m.spec.isElite ? `击败精英 · ${m.spec.name}` : `击败 ${m.spec.name}`, m.spec.isElite ? '#ffde78' : '#fff1b0');
        if (this.onMonsterDeath) {
          this.onMonsterDeath(m);
        }
      }
      return true;
    }

    // Physical Entity Collision between Protagonist Capsule and Nearby Monsters!
    resolvePlayerCollision(playerEyePos, vel, eyeHeight, playerRadius) {
      const footY = playerEyePos[1] - eyeHeight;
      const headY = playerEyePos[1] + 0.45;
      const px = playerEyePos[0], pz = playerEyePos[2];
      let hitMonster = false;

      for (let i = 0; i < this.monsters.length; i++) {
        const m = this.monsters[i];
        if (!m.alive || !m.visible) continue;
        const sp = m.spec;
        const mMinY = m.y;
        const mMaxY = m.y + (sp.colHeight || 2.2);
        if (headY <= mMinY + 0.08 || footY >= mMaxY - 0.08) continue;

        const mRad = sp.colRadius || (sp.radius * 0.78);
        const sumR = playerRadius + mRad;
        const dx = px - m.x;
        const dz = pz - m.z;
        const dSq = dx * dx + dz * dz;
        if (dSq >= sumR * sumR) continue;

        const dist = Math.sqrt(dSq) || 0.001;
        const nx = dx / dist;
        const nz = dz / dist;
        const pen = sumR - dist;

        // Push player out 85%, nudge monster back 15% for solid tactile weight!
        playerEyePos[0] += nx * pen * 0.85;
        playerEyePos[2] += nz * pen * 0.85;
        m.x -= nx * pen * 0.15;
        m.z -= nz * pen * 0.15;

        const vn = vel[0] * nx + vel[2] * nz;
        if (vn < 0) {
          vel[0] -= vn * nx;
          vel[2] -= vn * nz;
        }
        hitMonster = true;
      }
      return hitMonster;
    }

    // Project & Render Crisp Overhead Monster Name Tags onto 2D Overlay Canvas!
    renderNameTags(ctx, cssW, cssH, dpr, vpMat, camPos) {
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.font = '600 12.5px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cx = camPos[0], cy = camPos[1], cz = camPos[2];
      const visibleTags = [];

      for (let i = 0; i < this.monsters.length; i++) {
        const m = this.monsters[i];
        if (!m.alive || !m.visible) continue;
        const dx = m.x - cx, dy = m.y - cy, dz = m.z - cz;
        const dist = Math.hypot(dx, dy, dz);
        const maxTagDist = m.spec.isElite ? 175.0 : 135.0;
        if (dist > maxTagDist) continue;

        const wx = m.x;
        const wy = m.y + (m.spec.nameHeight || 2.8);
        const wz = m.z;

        const clipX = vpMat[0] * wx + vpMat[4] * wy + vpMat[8]  * wz + vpMat[12];
        const clipY = vpMat[1] * wx + vpMat[5] * wy + vpMat[9]  * wz + vpMat[13];
        const clipW = vpMat[3] * wx + vpMat[7] * wy + vpMat[11] * wz + vpMat[15];
        if (clipW <= 0.2) continue;

        const ndcX = clipX / clipW;
        const ndcY = clipY / clipW;
        if (ndcX < -1.08 || ndcX > 1.08 || ndcY < -1.08 || ndcY > 1.08) continue;

        const sx = (ndcX * 0.5 + 0.5) * cssW;
        const sy = (0.5 - ndcY * 0.5) * cssH;
        const alpha = 1.0 - M.smoothstep(maxTagDist - 42.0, maxTagDist, dist);
        if (alpha <= 0.02) continue;

        visibleTags.push({ m, sx, sy, dist, alpha });
      }

      // Draw back-to-front so closer monster name plaques layer cleanly on top
      visibleTags.sort((a, b) => b.dist - a.dist);

      for (let i = 0; i < visibleTags.length; i++) {
        const t = visibleTags[i];
        const m = t.m;
        const sp = m.spec;
        const isBoss = !!sp.isBoss;
        const isElite = !!sp.isElite;
        const isZhuji = sp.realm === '筑基期';
        const isAggro = m.state !== 'patrol' && m.state !== 'return';
        const statuses = [];
        if (m.stunTimer > 0) statuses.push('震晕');
        if (m.rootTimer > 0) statuses.push('定身');
        if (m.staggerTimer > 0) statuses.push('硬直');
        if (m.slowTimer > 0) statuses.push('缓速');
        const statusSuffix = statuses.length > 0 ? ` [${statuses.join('·')}]` : '';
        const realmText = m.subRealmLabel || sp.realm;
        const label = isBoss
          ? `◆首领 · ${realmText} · ${sp.name}${statusSuffix}`
          : (isElite
            ? `★精英 · ${realmText} · ${sp.name}${statusSuffix}`
            : `${realmText} · ${sp.name}${statusSuffix}`);

        ctx.globalAlpha = t.alpha;
        const textW = ctx.measureText(label).width;
        const padX = isBoss ? 14 : (isElite ? 12 : 10);
        const boxW = Math.ceil(textW + padX * 2);
        const boxH = isBoss ? 26 : (isElite ? 24 : 22);
        const bx = Math.round(t.sx - boxW * 0.5);
        const by = Math.round(t.sy - boxH * 0.5);

        // Rounded dark-jade / royal-violet-gold / crimson-gold Boss glass plaque
        ctx.fillStyle = isBoss
          ? 'rgba(42, 10, 26, 0.88)'
          : (isAggro
            ? 'rgba(42, 12, 18, 0.82)'
            : (isElite
              ? (isZhuji ? 'rgba(26, 14, 42, 0.84)' : 'rgba(14, 28, 42, 0.82)')
              : (isZhuji ? 'rgba(14, 24, 38, 0.78)' : 'rgba(12, 26, 24, 0.74)')));
        ctx.strokeStyle = isBoss
          ? 'rgba(255, 186, 82, 0.96)'
          : (isAggro
            ? 'rgba(248, 112, 98, 0.90)'
            : (isElite
              ? (isZhuji ? 'rgba(255, 212, 102, 0.94)' : 'rgba(116, 240, 255, 0.88)')
              : (isZhuji ? 'rgba(240, 204, 112, 0.78)' : 'rgba(132, 224, 168, 0.62)')));
        ctx.lineWidth = isBoss ? 2.2 : (isElite ? 1.8 : (isZhuji || isAggro ? 1.3 : 1.0));

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(bx, by, boxW, boxH, 11);
        } else {
          ctx.rect(bx, by, boxW, boxH);
        }
        ctx.fill();
        ctx.stroke();

        // Crisp text shadow + realm/elite/boss-tinted name text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillText(label, t.sx, t.sy + 1);
        ctx.fillStyle = isBoss
          ? '#ffe294'
          : (isAggro
            ? '#ffd4cc'
            : (isElite ? (isZhuji ? '#ffe98a' : '#bdf8ff') : (isZhuji ? '#ffeaa8' : '#e6faee')));
        ctx.fillText(label, t.sx, t.sy);

        // Slim HP bar under plaque when monster is damaged, engaged, elite, or Boss
        if (m.hp < m.maxHp || isAggro || isElite || isBoss) {
          const barW = Math.max(isBoss ? 118 : (isElite ? 84 : 66), Math.min(168, boxW - 10));
          const barH = isBoss ? 7 : (isElite ? 6 : 5);
          const barX = Math.round(t.sx - barW * 0.5);
          const barY = by + boxH + 4;
          const ratio = M.clamp(m.hp / Math.max(1, m.maxHp), 0, 1);
          ctx.fillStyle = 'rgba(10, 14, 18, 0.82)';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          ctx.fillStyle = isBoss ? '#ff6248' : (isElite ? (isZhuji ? '#f6b93b' : '#40d9e8') : (isZhuji ? '#f0a642' : '#e0584c'));
          ctx.fillRect(barX, barY, Math.round(barW * ratio), barH);
        }
      }

      // Render crisp floating damage / status / heal numbers
      if (this.floatingTexts.length > 0) {
        ctx.font = '700 13.5px "PingFang SC", "Microsoft YaHei", sans-serif';
        for (let i = 0; i < this.floatingTexts.length; i++) {
          const ft = this.floatingTexts[i];
          const u = M.clamp(ft.age / ft.life, 0, 1);
          const wy = ft.y + u * 1.35;
          const clipX = vpMat[0] * ft.x + vpMat[4] * wy + vpMat[8]  * ft.z + vpMat[12];
          const clipY = vpMat[1] * ft.x + vpMat[5] * wy + vpMat[9]  * ft.z + vpMat[13];
          const clipW = vpMat[3] * ft.x + vpMat[7] * wy + vpMat[11] * ft.z + vpMat[15];
          if (clipW <= 0.2) continue;
          const sx = ((clipX / clipW) * 0.5 + 0.5) * cssW;
          const sy = (0.5 - (clipY / clipW) * 0.5) * cssH;
          ctx.globalAlpha = u < 0.72 ? 1.0 : Math.max(0, 1.0 - (u - 0.72) / 0.28);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
          ctx.fillText(ft.text, sx + 1, sy + 1);
          ctx.fillStyle = ft.color;
          ctx.fillText(ft.text, sx, sy);
        }
      }

      ctx.restore();
    }

    _spawnEffect(opts) {
      if (this.effects.length >= this.maxEffects) {
        this.effects.shift();
      }
      this.effects.push({
        shape: opts.shape || 'ring',
        x: opts.x, y: opts.y, z: opts.z,
        vx: opts.vx || 0, vy: opts.vy || 0, vz: opts.vz || 0,
        yaw: opts.yaw || 0,
        spin: opts.spin || 0,
        s0: opts.s0 || 0.5,
        s1: opts.s1 || 2.8,
        sy: opts.sy || 1.0,
        age: 0,
        life: opts.life || 0.48,
        col: opts.col || [0.7, 0.9, 0.7],
        alpha: opts.alpha !== undefined ? opts.alpha : 0.50,
        modelMat: M.mat4(),
      });
    }

    _spawnProjectile(opts) {
      if (this.projectiles.length >= this.maxProjectiles) {
        this.projectiles.shift();
      }
      this.projectiles.push({
        shape: opts.shape || 'orb',
        x: opts.x, y: opts.y, z: opts.z,
        vx: opts.vx, vy: opts.vy, vz: opts.vz,
        gravity: opts.gravity || 0,
        pitch: opts.pitch || 0,
        yaw: opts.yaw || Math.atan2(opts.vx, opts.vz),
        spin: opts.spin || 0,
        scale: opts.scale || [0.35, 0.35, 0.35],
        col: opts.col || [0.6, 0.9, 0.6],
        alpha: opts.alpha !== undefined ? opts.alpha : 0.66,
        dmg: opts.dmg || 8,
        slowSec: opts.slowSec || 0,
        hitRadius: opts.hitRadius || 1.25,
        splashR: opts.splashR || 0,
        age: 0,
        life: opts.life || 1.9,
        modelMat: M.mat4(),
      });
    }

    _isRangedMove(mv) {
      return mv && (mv.kind === 'volley' || mv.kind === 'lob' || mv.kind === 'barrageLob');
    }

    _chooseMove(m, dist, dyTarget = 0) {
      const moves = m.spec.moves;
      const absDy = Math.abs(dyTarget);
      const dist3 = Math.hypot(dist, dyTarget);
      const candidates = [];
      const rangedCands = [];
      for (let i = 0; i < moves.length; i++) {
        const mv = moves[i];
        const needMp = mv.mpCost || 0;
        if (m.moveCooldowns[i] > 0 || (m.mp || 0) < needMp) continue;
        const isRanged = this._isRangedMove(mv);
        if (isRanged) {
          // 远程技能可全向对空：按三维距离判定射程，仰射高空目标给予适当射程宽容度
          if (dist3 <= mv.range * 1.25) {
            candidates.push(i);
            rangedCands.push(i);
          }
        } else {
          // 近战/地面技需要目标处于高度可达范围内（筑基妖兽短暂低空飞行追近后也可空中出招）
          if (dist <= mv.range && absDy < 4.2) {
            candidates.push(i);
          }
        }
      }
      if (candidates.length === 0) return -1;
      // 目标处于高处或御剑浮空时，优先释放可对空的远程技能！
      if (dyTarget > 3.0 && rangedCands.length > 0) {
        return rangedCands[Math.floor(Math.random() * rangedCands.length)];
      }
      if (candidates.length > 1) {
        const skills = candidates.filter((idx) => idx > 0);
        if (skills.length > 0 && Math.random() < 0.68) {
          return skills[Math.floor(Math.random() * skills.length)];
        }
      }
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    _executeMove(m, moveIdx, playerPos, onPlayerHit) {
      const mv = m.spec.moves[moveIdx];
      m.moveCooldowns[moveIdx] = mv.cd;
      if (mv.mpCost) m.mp = Math.max(0, (m.mp || 0) - mv.mpCost);
      m.globalCd = 1.3;

      const dx = playerPos[0] - m.x;
      const dz = playerPos[2] - m.z;
      const horizDist = Math.hypot(dx, dz) || 0.001;
      const dirX = dx / horizDist;
      const dirZ = dz / horizDist;
      const targetY = playerPos[1] + 1.15;
      const startY = m.y + Math.max(1.1, m.spec.scale * 0.72);
      const baseYaw = Math.atan2(dirX, dirZ);
      const isElite = !!m.spec.isElite;
      const isZhuji = m.spec.realm === '筑基期';
      const vfxAlpha = isElite ? 0.74 : (isZhuji ? 0.62 : 0.46);
      const scaledMoveDmg = Math.max(1, Math.round((m.atk || 8) * (mv.dmgPct || 1.0)));

      if (mv.kind === 'lunge') {
        const stepDist = Math.min(isElite ? 1.85 : 1.35, Math.max(0.0, horizDist - ((m.spec.colRadius || m.spec.radius) + 0.95)));
        m.x += dirX * stepDist;
        m.z += dirZ * stepDist;
        m.y = getMonsterGroundY(m.x, m.z) + m.spec.hoverY + (m.airYOffset || 0);
        const postDist = Math.hypot(playerPos[0] - m.x, playerPos[2] - m.z);
        const postDy = Math.abs((playerPos[1] + 1.0) - (m.y + 1.0));
        this._spawnEffect({
          shape: 'ring', x: m.x + dirX * (m.spec.radius * 0.75), y: m.y + 0.30, z: m.z + dirZ * (m.spec.radius * 0.75),
          s0: 0.45, s1: isElite ? (isZhuji ? 4.4 : 3.2) : (isZhuji ? 3.1 : 2.1), life: isElite ? 0.48 : 0.38, col: mv.col, alpha: vfxAlpha, spin: isElite ? 4.2 : 0,
        });
        if (isElite) {
          this._spawnEffect({
            shape: 'orb', x: m.x + dirX * (m.spec.radius * 0.8), y: m.y + 1.25, z: m.z + dirZ * (m.spec.radius * 0.8),
            s0: 0.35, s1: isZhuji ? 1.8 : 1.35, life: 0.34, col: mv.col, alpha: vfxAlpha * 0.62,
          });
        }
        if (postDist <= mv.range + 1.0 && postDy < 3.8) {
          onPlayerHit(scaledMoveDmg, mv.slowSec || 0, m.spec.name, mv.name);
        }
      } else if (mv.kind === 'volley') {
        const count = mv.count || 1;
        const spread = mv.spread || 0;
        const dy = targetY - startY;
        const dist3 = Math.hypot(dx, dy, dz) || 1.0;
        // 真三维全向对空瞄准：玩家御剑飞行或位于高处时直接抬角仰射！
        const hRatio = Math.max(0.18, horizDist / dist3);
        const vyNorm = dy / dist3;
        const projPitch = -Math.asin(M.clamp(vyNorm, -0.94, 0.94));
        if (isElite) {
          this._spawnEffect({
            shape: 'ring', x: m.x, y: m.y + 0.32, z: m.z,
            s0: 0.65, s1: m.spec.radius * 2.1, life: 0.44, col: mv.col, alpha: vfxAlpha * 0.78, spin: 5.0,
          });
        }
        for (let i = 0; i < count; i++) {
          const offset = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * 2.0 * spread;
          const a = baseYaw + offset;
          const vx = Math.sin(a) * mv.speed * hRatio;
          const vz = Math.cos(a) * mv.speed * hRatio;
          const vy = vyNorm * mv.speed;
          this._spawnProjectile({
            shape: mv.shape || 'shard',
            x: m.x + Math.sin(a) * (m.spec.radius * 0.85),
            y: startY,
            z: m.z + Math.cos(a) * (m.spec.radius * 0.85),
            vx, vy, vz,
            pitch: projPitch,
            yaw: a,
            spin: mv.shape === 'ring' ? 7.0 : (mv.shape === 'shard' ? 9.0 : 0.0),
            scale: mv.scale || [0.42, 0.24, 0.68],
            col: mv.col,
            alpha: isElite ? 0.78 : (isZhuji ? 0.68 : 0.56),
            dmg: scaledMoveDmg,
            slowSec: mv.slowSec || 0,
            hitRadius: mv.shape === 'ring' ? 1.95 : (isElite ? 1.55 : 1.35),
            life: (Math.max(mv.range * 1.25, dist3) / mv.speed) + 0.85,
          });
        }
      } else if (mv.kind === 'lob') {
        const dist3 = Math.hypot(dx, targetY - startY, dz) || 1.0;
        const flightTime = M.clamp(dist3 / (mv.speed * 1.05), 0.42, 1.48);
        const grav = 14.0;
        const vx = dx / flightTime;
        const vz = dz / flightTime;
        const vy = ((targetY - startY) + 0.5 * grav * flightTime * flightTime) / flightTime;
        this._spawnProjectile({
          shape: 'orb',
          x: m.x + dirX * (m.spec.radius * 0.7), y: startY + 0.15, z: m.z + dirZ * (m.spec.radius * 0.7),
          vx, vy, vz,
          gravity: grav,
          scale: [0.44, 0.36, 0.44],
          col: mv.col,
          alpha: 0.64,
          dmg: scaledMoveDmg,
          slowSec: mv.slowSec || 0,
          hitRadius: 1.45,
          splashR: mv.splashR || 2.8,
          life: flightTime + 0.55,
        });
      } else if (mv.kind === 'barrageLob') {
        // Elite Multi-Arc Toxic/Elemental Barrage (可高抛对空追踪玩家高度!)
        const count = mv.count || 3;
        const spread = mv.spread || 0.34;
        const grav = 15.0;
        this._spawnEffect({
          shape: 'ring', x: m.x, y: m.y + 0.26, z: m.z,
          s0: 0.8, s1: 4.2, life: 0.48, col: mv.col, alpha: vfxAlpha * 0.75, spin: 4.5,
        });
        for (let i = 0; i < count; i++) {
          const offset = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * 2.0 * spread;
          const a = baseYaw + offset;
          const distScale = 0.82 + (i % 2) * 0.28;
          const tDist = M.clamp(horizDist * distScale, 4.5, mv.range * 1.18);
          const tx = m.x + Math.sin(a) * tDist;
          const tz = m.z + Math.cos(a) * tDist;
          const groundTy = T.getMeshTerrainHeight(tx, tz) + 0.35;
          const ty = Math.max(groundTy, targetY);
          const dist3 = Math.hypot(tx - m.x, ty - startY, tz - m.z) || 1.0;
          const ft = M.clamp(dist3 / (mv.speed || 16.0), 0.50, 1.48);
          const vx = (tx - m.x) / ft;
          const vz = (tz - m.z) / ft;
          const vy = ((ty - startY) + 0.5 * grav * ft * ft) / ft;
          this._spawnProjectile({
            shape: 'orb',
            x: m.x + Math.sin(a) * (m.spec.radius * 0.65), y: startY + 0.35, z: m.z + Math.cos(a) * (m.spec.radius * 0.65),
            vx, vy, vz,
            gravity: grav,
            scale: [0.64, 0.54, 0.64],
            col: mv.col,
            alpha: 0.78,
            dmg: scaledMoveDmg,
            slowSec: mv.slowSec || 1.8,
            hitRadius: 1.65,
            splashR: mv.splashR || 3.6,
            life: ft + 0.55,
          });
        }
      } else if (mv.kind === 'groundRing') {
        const gx = playerPos[0], gz = playerPos[2];
        const gy = T.getMeshTerrainHeight(gx, gz) + 0.14;
        this._spawnEffect({
          shape: 'ring', x: gx, y: gy, z: gz,
          s0: 0.75, s1: mv.radius || 3.4, life: 0.68, col: mv.col, alpha: vfxAlpha, spin: 3.8,
        });
        if (Math.abs(playerPos[1] - gy) < 2.6) {
          onPlayerHit(scaledMoveDmg, mv.slowSec || 1.6, m.spec.name, mv.name);
        }
      } else if (mv.kind === 'multiRing') {
        // Elite Multi-Array Ground Eruption (3 linked spinning double-ring pillars!)
        const rCnt = mv.ringCount || 3;
        const rad = mv.radius || 4.0;
        const spDist = mv.spreadDist || 4.5;
        let hitAny = false;
        for (let i = 0; i < rCnt; i++) {
          let gx = playerPos[0], gz = playerPos[2];
          if (i > 0) {
            const ang = baseYaw + (i === 1 ? 1.15 : -1.15) + Math.PI * 0.5;
            gx += Math.sin(ang) * spDist * 0.65;
            gz += Math.cos(ang) * spDist * 0.65;
          }
          const gy = T.getMeshTerrainHeight(gx, gz) + 0.16;
          this._spawnEffect({
            shape: 'ring', x: gx, y: gy, z: gz,
            s0: 0.65, s1: rad, life: 0.82, col: mv.col, alpha: vfxAlpha, spin: 4.8 * (i % 2 === 0 ? 1 : -1),
          });
          this._spawnEffect({
            shape: 'ring', x: gx, y: gy + 0.45, z: gz,
            s0: 0.35, s1: rad * 0.65, life: 0.62, col: mv.pillarCol || mv.col, alpha: vfxAlpha * 0.85, spin: -6.2,
          });
          this._spawnEffect({
            shape: 'orb', x: gx, y: gy + 1.4, z: gz,
            vy: 4.2,
            s0: 0.55, s1: rad * 0.42, life: 0.48, col: mv.pillarCol || mv.col, alpha: vfxAlpha * 0.68,
          });
          if (!hitAny && Math.hypot(playerPos[0] - gx, playerPos[2] - gz) <= rad && Math.abs(playerPos[1] - gy) < 3.4) {
            hitAny = true;
          }
        }
        if (hitAny) {
          onPlayerHit(scaledMoveDmg, mv.slowSec || 0, m.spec.name, mv.name);
        }
      } else if (mv.kind === 'spiralStorm') {
        // Elite Twin/Triple Cyclone + Flanking Glowing Shards!
        const cnt = mv.count || 2;
        const spread = mv.spread || 0.24;
        const dy = targetY - startY;
        const dist3 = Math.hypot(dx, dy, dz) || 1.0;
        const vyNorm = dy / dist3;
        this._spawnEffect({
          shape: 'ring', x: m.x, y: m.y + 0.35, z: m.z,
          s0: 0.8, s1: 4.8, life: 0.55, col: mv.col, alpha: vfxAlpha * 0.82, spin: 6.5,
        });
        for (let i = 0; i < cnt; i++) {
          const offset = cnt === 1 ? 0 : ((i / (cnt - 1)) - 0.5) * 2.0 * spread;
          const a = baseYaw + offset;
          const vx = Math.sin(a) * mv.speed;
          const vz = Math.cos(a) * mv.speed;
          const vy = M.clamp(vyNorm * mv.speed, -6.5, 6.5);
          this._spawnProjectile({
            shape: 'ring',
            x: m.x + Math.sin(a) * (m.spec.radius * 0.9),
            y: startY,
            z: m.z + Math.cos(a) * (m.spec.radius * 0.9),
            vx, vy, vz,
            yaw: a,
            spin: 9.5,
            scale: mv.ringScale || [1.9, 1.2, 1.9],
            col: mv.col,
            alpha: 0.78,
            dmg: scaledMoveDmg,
            slowSec: mv.slowSec || 0,
            hitRadius: 2.0,
            life: (mv.range / mv.speed) + 0.75,
          });
          // Companion shimmering golden-feather / jade-leaf shard streaking alongside each cyclone
          this._spawnProjectile({
            shape: 'shard',
            x: m.x + Math.sin(a + 0.14) * (m.spec.radius * 0.85),
            y: startY + 0.45,
            z: m.z + Math.cos(a + 0.14) * (m.spec.radius * 0.85),
            vx: Math.sin(a + 0.08) * (mv.speed * 1.22),
            vy,
            vz: Math.cos(a + 0.08) * (mv.speed * 1.22),
            yaw: a + 0.08,
            spin: 11.0,
            scale: [0.42, 0.22, 1.18],
            col: mv.shardCol || mv.col,
            alpha: 0.82,
            dmg: Math.max(1, Math.round(scaledMoveDmg * 0.75)),
            slowSec: mv.slowSec || 0,
            hitRadius: 1.35,
            life: (mv.range / mv.speed) + 0.65,
          });
        }
      } else if (mv.kind === 'nova') {
        this._spawnEffect({
          shape: 'ring', x: m.x, y: m.y + 0.20, z: m.z,
          s0: 0.85, s1: mv.radius || 5.8, life: 0.58, col: mv.col, alpha: vfxAlpha, spin: isZhuji ? 2.6 : 0,
        });
        this._spawnEffect({
          shape: 'orb', x: m.x, y: m.y + 1.1, z: m.z,
          s0: 0.65, s1: (mv.radius || 5.8) * 0.44, life: 0.38, col: mv.col, alpha: vfxAlpha * 0.55,
        });
        if (horizDist <= (mv.radius || 5.8) && Math.abs(playerPos[1] - m.y) < 3.5) {
          onPlayerHit(scaledMoveDmg, mv.slowSec || 0, m.spec.name, mv.name);
        }
      } else if (mv.kind === 'eliteNova') {
        // Elite Grand Multi-Layer Shockwave + 360° Radial Projectile Burst!
        const rad = mv.radius || 8.0;
        const subCol = mv.subCol || mv.col;
        this._spawnEffect({
          shape: 'ring', x: m.x, y: m.y + 0.24, z: m.z,
          s0: 0.9, s1: rad, life: 0.78, col: mv.col, alpha: vfxAlpha, spin: 4.5,
        });
        this._spawnEffect({
          shape: 'ring', x: m.x, y: m.y + 0.85, z: m.z,
          s0: 0.55, s1: rad * 0.72, life: 0.64, col: subCol, alpha: vfxAlpha * 0.86, spin: -6.0,
        });
        this._spawnEffect({
          shape: 'orb', x: m.x, y: m.y + 1.45, z: m.z,
          s0: 0.8, s1: rad * 0.48, life: 0.48, col: subCol, alpha: vfxAlpha * 0.58,
        });
        const rCnt = mv.radialCount || 6;
        const rSpd = mv.radialSpeed || 18.0;
        for (let i = 0; i < rCnt; i++) {
          const a = baseYaw + (i / rCnt) * Math.PI * 2;
          this._spawnProjectile({
            shape: mv.radialShape || 'shard',
            x: m.x + Math.sin(a) * (m.spec.radius * 0.8),
            y: startY,
            z: m.z + Math.cos(a) * (m.spec.radius * 0.8),
            vx: Math.sin(a) * rSpd,
            vy: 0.0,
            vz: Math.cos(a) * rSpd,
            yaw: a,
            spin: 8.0,
            scale: mv.radialScale || [0.46, 0.28, 1.30],
            col: i % 2 === 0 ? mv.col : subCol,
            alpha: 0.80,
            dmg: Math.max(1, Math.round(scaledMoveDmg * 0.78)),
            slowSec: mv.slowSec || 0,
            hitRadius: 1.45,
            life: 1.15,
          });
        }
        if (horizDist <= rad && Math.abs(playerPos[1] - m.y) < 4.2) {
          onPlayerHit(scaledMoveDmg, mv.slowSec || 0, m.spec.name, mv.name);
        }
      } else if (mv.kind === 'dash' || mv.kind === 'eliteDash') {
        m.state = 'dash';
        m.stateTimer = mv.dashDur || 0.48;
        m.dashVx = dirX * (mv.dashSpeed || 19.0);
        m.dashVz = dirZ * (mv.dashSpeed || 19.0);
        m.dashHit = false;
        m.activeMove = mv;
        if (mv.kind === 'eliteDash') {
          this._spawnEffect({
            shape: 'ring', x: m.x, y: m.y + 0.24, z: m.z,
            s0: 0.7, s1: 4.4, life: 0.48, col: mv.col, alpha: vfxAlpha, spin: 5.5,
          });
        }
        return;
      } else if (mv.kind === 'leapSlam') {
        m.state = 'leap';
        m.leapDur = 0.56;
        m.stateTimer = m.leapDur;
        m.leapStartX = m.x; m.leapStartY = m.y; m.leapStartZ = m.z;
        const jumpDist = Math.min(horizDist, isZhuji ? 10.5 : 8.0);
        m.leapEndX = m.x + dirX * jumpDist;
        m.leapEndZ = m.z + dirZ * jumpDist;
        m.leapEndY = getMonsterGroundY(m.leapEndX, m.leapEndZ);
        m.activeMove = mv;
        return;
      }

      m.state = 'chase';
      m.activeMove = null;
    }

    update(dt, elapsed, playerPos, playerFlying, paused, onPlayerHit, npcSystem = null) {
      const clampedDt = Math.min(dt, 0.05);
      const px = playerPos[0], py = playerPos[1], pz = playerPos[2];
      const hitCb = onPlayerHit || (() => {});
      const npcList = npcSystem ? npcSystem.npcs : null;
      const tmpNpcPos = [0, 0, 0];

      for (let i = 0; i < this.monsters.length; i++) {
        const m = this.monsters[i];
        const sp = m.spec;

        if (!m.alive) {
          m.visible = false;
          if (!paused) {
            m.respawnTimer -= clampedDt;
            if (m.respawnTimer <= 0) {
              const sr = rollMonsterSubRealm(sp, Math.random);
              m.subRealmLabel = sr.subRealmLabel;
              m.subRealmIdx = sr.subRealmIdx;
              m.varRoll = sr.varRoll;
              m.maxHp = sr.maxHp;
              m.maxMp = sr.maxMp;
              m.atk = sr.atk;
              m.def = sr.def;
              m.expReward = sr.expReward;
              m.alive = true;
              m.hp = m.maxHp;
              m.mp = m.maxMp;
              m.x = m.homeX;
              m.y = m.homeY;
              m.z = m.homeZ;
              m.patrolX = m.homeX;
              m.patrolZ = m.homeZ;
              m.state = 'patrol';
              m.stateTimer = 2.0;
              m.activeMove = null;
            }
          }
          continue;
        }

        const dxP = px - m.x;
        const dzP = pz - m.z;
        const distP2 = dxP * dxP + dzP * dzP;

        m.visible = distP2 < 560.0 * 560.0;

        if (!paused && distP2 < 310.0 * 310.0) {
          const distP = Math.sqrt(distP2);
          const distHome = Math.hypot(m.x - m.homeX, m.z - m.homeZ);
          if (m.hitFlash > 0) m.hitFlash = Math.max(0, m.hitFlash - clampedDt);
          if (m.staggerTimer > 0) m.staggerTimer = Math.max(0, m.staggerTimer - clampedDt);
          if (m.stunTimer > 0) m.stunTimer = Math.max(0, m.stunTimer - clampedDt);
          if (m.rootTimer > 0) m.rootTimer = Math.max(0, m.rootTimer - clampedDt);
          if (m.slowTimer > 0) {
            m.slowTimer = Math.max(0, m.slowTimer - clampedDt);
            if (m.slowTimer <= 0) m.slowFactor = 1.0;
          }

          // Smooth decaying knockback displacement
          if (Math.abs(m.knockVx) > 0.04 || Math.abs(m.knockVz) > 0.04) {
            m.x += m.knockVx * clampedDt;
            m.z += m.knockVz * clampedDt;
            const kDecay = Math.exp(-7.5 * clampedDt);
            m.knockVx *= kDecay;
            m.knockVz *= kDecay;
          }

          const isStunned = m.stunTimer > 0 || m.staggerTimer > 0;
          const isRooted = m.rootTimer > 0;
          const speedMul = isRooted ? 0.0 : (m.slowTimer > 0 ? m.slowFactor : 1.0);

          m.animPhase += clampedDt * (isStunned ? 0.8 : (sp.hoverY > 0 ? 6.4 : 3.4 + m.moveBlend * 5.0) * (m.slowTimer > 0 ? 0.72 : 1.0));
          m.globalCd = Math.max(0, m.globalCd - clampedDt);
          if (m.mp < m.maxMp) {
            m.mp = Math.min(m.maxMp, m.mp + Math.max(2.5, m.maxMp * 0.045) * clampedDt);
          }
          for (let c = 0; c < m.moveCooldowns.length; c++) {
            m.moveCooldowns[c] = Math.max(0, m.moveCooldowns[c] - clampedDt);
          }
          // 追击冲刺计时与冷却（有限时长快速奔跑，非无限、非瞬移）
          if (m.sprintCd > 0) m.sprintCd = Math.max(0, m.sprintCd - clampedDt);
          if (m.sprintTimer > 0) m.sprintTimer = Math.max(0, m.sprintTimer - clampedDt);
          // 筑基期妖兽短暂低空飞行计时与冷却（仅在主角飞行够不到时起飞，平时不飞）
          if (m.airFlyCd > 0) m.airFlyCd = Math.max(0, m.airFlyCd - clampedDt);
          if (m.airFlyTimer > 0) m.airFlyTimer = Math.max(0, m.airFlyTimer - clampedDt);

          const isZhujiMon = sp.realm === '筑基期';
          const hasRangedMove = sp.moves.some((mv) => this._isRangedMove(mv));
          const dyP = py - m.y;
          const playerReachable = !playerFlying || dyP < (isZhujiMon ? 48.0 : (hasRangedMove ? 38.0 : (sp.hoverY > 0 ? 28.0 : 18.0)));

          // Resolve active combat target (Player OR fighting NPC!)
          if (m.targetNpc) {
            if (!m.targetNpc.alive || Math.hypot(m.targetNpc.x - m.x, m.targetNpc.z - m.z) > sp.aggroRange * 2.5) {
              m.targetNpc = null;
            }
          }
          let useNpcTarget = !!(m.targetNpc && npcSystem);
          let tPos = playerPos;
          let tDx = dxP, tDz = dzP, tDist = distP, tY = py;
          let tReachable = playerReachable;
          let activeHitCb = hitCb;
          if (useNpcTarget) {
            const tn = m.targetNpc;
            tmpNpcPos[0] = tn.x; tmpNpcPos[1] = tn.y; tmpNpcPos[2] = tn.z;
            tPos = tmpNpcPos;
            tDx = tn.x - m.x; tDz = tn.z - m.z;
            tDist = Math.hypot(tDx, tDz);
            tY = tn.y;
            tReachable = true;
            activeHitCb = (dmg, slowSec) => {
              npcSystem.applyDamageToNpc(tn, dmg, { slowSec: slowSec || 0, attackerMonster: m }, this);
            };
          }

          let targetMoveBlend = 0.0;
          const targetGlow = m.hitFlash > 0 ? 0.85 : 0.0;
          m.chargeGlow = M.lerp(m.chargeGlow, targetGlow, 1 - Math.exp(-12 * clampedDt));
          m.attackProgress = M.lerp(m.attackProgress, 0.0, 1 - Math.exp(-10 * clampedDt));
          if (m.state !== 'dash') {
            m.rollAngle = M.lerp(m.rollAngle, 0.0, 1 - Math.exp(-10 * clampedDt));
          }

          if (isStunned) {
            // Brief stagger / stun pauses AI actions
          } else if (m.state === 'patrol') {
            if (distP < sp.aggroRange && playerReachable) {
              m.targetNpc = null;
              m.state = 'chase';
            } else {
              // Check if a wild/guard NPC is nearby to brawl with!
              if (npcList && distP < 260.0) {
                let nearNpc = null, nearD = sp.aggroRange * 0.90;
                for (let ni = 0; ni < npcList.length; ni++) {
                  const nn = npcList[ni];
                  if (!nn.alive || nn.kind === 'shopkeeper') continue;
                  const nd = Math.hypot(nn.x - m.x, nn.z - m.z);
                  if (nd < nearD) { nearD = nd; nearNpc = nn; }
                }
                if (nearNpc) {
                  m.targetNpc = nearNpc;
                  m.state = 'chase';
                }
              }
              if (m.state === 'patrol') {
              m.stateTimer -= clampedDt;
              const pdx = m.patrolX - m.x;
              const pdz = m.patrolZ - m.z;
              const pDist = Math.hypot(pdx, pdz);
              if (pDist > 1.2 && speedMul > 0.01) {
                const spd = sp.moveSpeed * 0.38 * speedMul;
                m.x += (pdx / pDist) * spd * clampedDt;
                m.z += (pdz / pDist) * spd * clampedDt;
                const wantYaw = Math.atan2(pdx, pdz);
                let dy = ((wantYaw - m.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
                if (dy < -Math.PI) dy += Math.PI * 2;
                m.yaw += dy * (1 - Math.exp(-5.0 * clampedDt));
                targetMoveBlend = 0.55;
              } else if (m.stateTimer <= 0) {
                const ang = Math.random() * Math.PI * 2;
                const rad = (0.35 + Math.random() * 0.65) * sp.patrolRadius;
                m.patrolX = m.homeX + Math.cos(ang) * rad;
                m.patrolZ = m.homeZ + Math.sin(ang) * rad;
                m.stateTimer = 2.6 + Math.random() * 3.8;
              }
              }
            }
          } else if (m.state === 'chase') {
            // Keep aggro locked during active combat unless target flees far beyond pursuit range (>2.6x aggro) or extreme territory leash (>3.5x leash)!
            const lostTarget = tDist > sp.aggroRange * 2.6 || !tReachable;
            const extremeLeash = distHome > sp.leashRange * 3.5 && tDist > sp.aggroRange * 1.35;
            if (lostTarget || extremeLeash) {
              m.targetNpc = null;
              m.state = 'return';
            } else {
              const wantYaw = Math.atan2(tDx, tDz);
              let dy = ((wantYaw - m.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
              if (dy < -Math.PI) dy += Math.PI * 2;
              m.yaw += dy * (1 - Math.exp(-9.0 * clampedDt));

              if (m.globalCd <= 0) {
                const chosen = this._chooseMove(m, tDist, tY - m.y);
                if (chosen >= 0) {
                  m.state = 'windup';
                  m.activeMove = chosen;
                  m.stateTimer = sp.moves[chosen].windup;
                  m.sprintTimer = 0;
                }
              }
              const stopDist = (sp.colRadius || sp.radius) + 1.05;
              if (m.state === 'chase' && tDist > stopDist && speedMul > 0.01) {
                // 追击冲刺：当目标有一定距离且冷却就绪时，爆发 2.2~3.2s 的高速奔跑冲刺（绝非瞬移！）
                if ((m.sprintTimer || 0) <= 0 && (m.sprintCd || 0) <= 0 && tDist > stopDist + 2.6 && tDist < sp.aggroRange * 2.35 && !isRooted) {
                  m.sprintTimer = 2.2 + Math.random() * 1.0;
                  m.sprintCd = 7.5 + Math.random() * 3.0;
                  this._spawnEffect({
                    shape: 'ring', x: m.x, y: m.y + 0.18, z: m.z,
                    s0: 0.4, s1: (sp.radius || 1.2) * 1.65, life: 0.34,
                    col: sp.tint || [0.82, 0.88, 0.78], alpha: 0.42, spin: 4.0,
                  });
                }
                const isSprinting = (m.sprintTimer || 0) > 0;
                const sprintBoost = isSprinting ? 1.72 : 1.0;
                const spd = sp.moveSpeed * sprintBoost * speedMul;
                m.x += (tDx / (tDist || 1)) * spd * clampedDt;
                m.z += (tDz / (tDist || 1)) * spd * clampedDt;
                targetMoveBlend = (isSprinting ? 1.48 : 1.0) * speedMul;
                if (isSprinting && Math.random() < 0.28) {
                  this._spawnEffect({
                    shape: 'orb',
                    x: m.x - Math.sin(m.yaw) * (sp.radius * 0.55) + (Math.random() - 0.5) * 0.6,
                    y: m.y + 0.25,
                    z: m.z - Math.cos(m.yaw) * (sp.radius * 0.55) + (Math.random() - 0.5) * 0.6,
                    vy: 0.75, s0: 0.24, s1: 0.65, life: 0.34,
                    col: sp.tint || [0.78, 0.84, 0.74], alpha: 0.30,
                  });
                }
              } else {
                m.sprintTimer = 0;
              }
            }
          } else if (m.state === 'windup') {
            const mv = sp.moves[m.activeMove];
            const wantYaw = Math.atan2(tDx, tDz);
            let dy = ((wantYaw - m.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
            if (dy < -Math.PI) dy += Math.PI * 2;
            m.yaw += dy * (1 - Math.exp(-10.0 * clampedDt));

            m.stateTimer -= clampedDt;
            const prog = 1.0 - M.clamp(m.stateTimer / Math.max(0.1, mv.windup), 0, 1);
            m.attackProgress = prog;
            m.chargeGlow = 0.25 + prog * 0.75;
            if (m.stateTimer <= 0) {
              this._executeMove(m, m.activeMove, tPos, activeHitCb);
            }
          } else if (m.state === 'dash') {
            const mv = m.activeMove;
            m.stateTimer -= clampedDt;
            const preD = Math.hypot(tPos[0] - m.x, tPos[2] - m.z);
            // Stop advancing once within melee contact so dashing monsters never overshoot 12m past target!
            if (preD > (sp.colRadius || sp.radius) + 0.95 && !isRooted) {
              m.x += m.dashVx * speedMul * clampedDt;
              m.z += m.dashVz * speedMul * clampedDt;
            }
            targetMoveBlend = 1.0;
            m.attackProgress = 1.0;
            m.chargeGlow = 0.72;
            if (mv && mv.rollSpin) {
              m.rollAngle += clampedDt * 13.0;
            }
            if (Math.random() < (mv && mv.kind === 'eliteDash' ? 0.78 : 0.5)) {
              this._spawnEffect({
                shape: (mv && mv.kind === 'eliteDash' && Math.random() < 0.55) ? 'ring' : 'orb',
                x: m.x, y: m.y + (mv && mv.kind === 'eliteDash' ? 0.45 : 0.85), z: m.z,
                s0: 0.42, s1: (mv && mv.kind === 'eliteDash') ? 2.4 : 0.85,
                life: 0.36, col: mv ? mv.col : sp.tint, alpha: (mv && mv.kind === 'eliteDash') ? 0.56 : 0.38, spin: 5.0,
              });
            }
            const curD = Math.hypot(tPos[0] - m.x, tPos[2] - m.z);
            const dashRawDmg = mv ? Math.max(1, Math.round((m.atk || 8) * (mv.dmgPct || 1.0))) : 1;
            if (!m.dashHit && curD < sp.radius + 1.55 && Math.abs(tY - m.y) < 3.4) {
              m.dashHit = true;
              if (mv) activeHitCb(dashRawDmg, mv.slowSec || 0, sp.name, mv.name);
            }
            if (m.stateTimer <= 0) {
              if (mv && mv.kind === 'eliteDash') {
                const bRad = mv.burstRadius || 5.8;
                this._spawnEffect({
                  shape: 'ring', x: m.x, y: m.y + 0.22, z: m.z,
                  s0: 0.75, s1: bRad, life: 0.62, col: mv.col, alpha: 0.72, spin: 5.5,
                });
                const shCnt = mv.burstShards || 4;
                const shDmg = Math.max(1, Math.round(dashRawDmg * 0.65));
                for (let si = 0; si < shCnt; si++) {
                  const sa = m.yaw + (si / shCnt) * Math.PI * 2;
                  this._spawnProjectile({
                    shape: 'shard',
                    x: m.x + Math.sin(sa) * 1.1, y: m.y + 1.35, z: m.z + Math.cos(sa) * 1.1,
                    vx: Math.sin(sa) * 18.5, vy: 0.0, vz: Math.cos(sa) * 18.5,
                    yaw: sa, spin: 9.0, scale: [0.38, 0.22, 1.05], col: mv.col, alpha: 0.76,
                    dmg: shDmg, slowSec: mv.slowSec || 0, hitRadius: 1.3, life: 0.95,
                  });
                }
                if (!m.dashHit && curD <= bRad && Math.abs(tY - m.y) < 3.5) {
                  activeHitCb(dashRawDmg, mv.slowSec || 0, sp.name, mv.name);
                }
              }
              m.state = 'chase';
              m.activeMove = null;
            }
          } else if (m.state === 'leap') {
            const mv = m.activeMove;
            m.stateTimer -= clampedDt;
            const u = 1.0 - M.clamp(m.stateTimer / m.leapDur, 0, 1);
            m.x = M.lerp(m.leapStartX, m.leapEndX, u);
            m.z = M.lerp(m.leapStartZ, m.leapEndZ, u);
            m.y = M.lerp(m.leapStartY, m.leapEndY, u) + Math.sin(u * Math.PI) * 4.2;
            m.attackProgress = Math.sin(u * Math.PI);
            m.chargeGlow = 0.62;
            if (m.stateTimer <= 0) {
              m.y = getMonsterGroundY(m.x, m.z);
              this._spawnEffect({
                shape: 'ring', x: m.x, y: m.y + 0.16, z: m.z,
                s0: 0.8, s1: mv ? mv.radius : 5.4, life: 0.58, col: mv ? mv.col : sp.tint, alpha: 0.54,
              });
              if (sp.isBoss) {
                this._spawnEffect({
                  shape: 'ring', x: m.x, y: m.y + 0.36, z: m.z,
                  s0: 1.1, s1: (mv ? mv.radius : 8.0) * 1.18, life: 0.72, col: sp.tint, alpha: 0.68, spin: 5.5,
                });
              }
              const landD = Math.hypot(tPos[0] - m.x, tPos[2] - m.z);
              if (mv && landD <= mv.radius && Math.abs(tY - m.y) < 3.2) {
                activeHitCb(Math.max(1, Math.round((m.atk || 8) * (mv.dmgPct || 1.0))), mv.slowSec || 0, sp.name, mv.name);
              }
              m.state = 'chase';
              m.activeMove = null;
            }
          } else if (m.state === 'return') {
            if (distP < sp.aggroRange * 0.9 && playerReachable && distHome < sp.leashRange * 2.5) {
              m.state = 'chase';
            } else {
              const hx = m.homeX - m.x;
              const hz = m.homeZ - m.z;
              const hd = Math.hypot(hx, hz);
              if (hd < 2.2) {
                m.state = 'patrol';
                m.patrolX = m.homeX; m.patrolZ = m.homeZ;
                m.stateTimer = 2.0;
                m.hp = m.maxHp;
                m.mp = m.maxMp;
              } else if (speedMul > 0.01) {
                const spd = sp.moveSpeed * 0.92 * speedMul;
                m.x += (hx / hd) * spd * clampedDt;
                m.z += (hz / hd) * spd * clampedDt;
                const wantYaw = Math.atan2(hx, hz);
                let dy = ((wantYaw - m.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
                if (dy < -Math.PI) dy += Math.PI * 2;
                m.yaw += dy * (1 - Math.exp(-7.0 * clampedDt));
                targetMoveBlend = 0.85;
              }
            }
          }

          m.moveBlend = M.lerp(m.moveBlend, targetMoveBlend, 1 - Math.exp(-9 * clampedDt));

          // Elite Ambient Micro-VFX (跑动蹄下微弱气旋 / 爬行细碎沙尘 / 步履寒气 / 木系蹄光 / 剑阵光环等!)
          if (sp.ambientTrail && distP < 145.0) {
            m.trailTimer = (m.trailTimer || 0) - clampedDt;
            const tr = sp.ambientTrail;
            const needsMove = tr.kind === 'hoofVortex' || tr.kind === 'sandDust' || tr.kind === 'frostMist' || tr.kind === 'woodGlow';
            if (m.trailTimer <= 0 && (!needsMove || m.moveBlend > 0.22)) {
              m.trailTimer = tr.interval * (0.85 + Math.random() * 0.35);
              const bx = m.x - Math.sin(m.yaw) * (sp.radius * 0.42) + (Math.random() - 0.5) * 0.9;
              const bz = m.z - Math.cos(m.yaw) * (sp.radius * 0.42) + (Math.random() - 0.5) * 0.9;
              const by = T.getMeshTerrainHeight(bx, bz);
              if (tr.kind === 'hoofVortex') {
                // 青鬃奔雷马: 跑动时蹄下带微弱青色气旋!
                this._spawnEffect({
                  shape: 'ring', x: bx, y: by + 0.16, z: bz,
                  vy: 0.65, s0: 0.38, s1: 1.55, life: 0.44, col: tr.col, alpha: 0.42, spin: 7.5,
                });
              } else if (tr.kind === 'sandDust') {
                // 沙地赤蝎: 爬行时拖出细碎沙尘!
                this._spawnEffect({
                  shape: 'orb', x: bx, y: by + 0.24, z: bz,
                  vy: 0.85, s0: 0.24, s1: 0.88, life: 0.52, col: tr.col, alpha: 0.38,
                });
              } else if (tr.kind === 'frostMist') {
                // 霜纹雪狐: 步履轻巧带寒气!
                this._spawnEffect({
                  shape: 'ring', x: bx, y: by + 0.14, z: bz,
                  vy: 0.55, s0: 0.32, s1: 1.45, life: 0.50, col: tr.col, alpha: 0.36, spin: 3.2,
                });
                this._spawnEffect({
                  shape: 'orb', x: bx, y: by + 0.36, z: bz,
                  vy: 0.72, s0: 0.22, s1: 0.75, life: 0.46, col: [0.84, 0.96, 1.00], alpha: 0.30,
                });
              } else if (tr.kind === 'woodGlow') {
                // 古木灵鹿: 蹄子带木系微光!
                this._spawnEffect({
                  shape: 'ring', x: bx, y: by + 0.16, z: bz,
                  vy: 0.42, s0: 0.34, s1: 1.38, life: 0.48, col: tr.col, alpha: 0.36, spin: 2.8,
                });
              } else if (tr.kind === 'swordAura') {
                // 古剑灵卫: 周身微弱剑阵光环微脉动!
                this._spawnEffect({
                  shape: 'ring', x: m.x, y: m.y + 0.35, z: m.z,
                  vy: 0.35, s0: 1.85, s1: 3.15, life: 0.62, col: tr.col, alpha: 0.28, spin: 3.6,
                });
              } else if (tr.kind === 'toxinMist') {
                // 沼泽毒蛙精: 背部毒疱偶尔溢散微弱暗绿毒雾
                this._spawnEffect({
                  shape: 'orb', x: m.x + (Math.random() - 0.5) * 1.1, y: m.y + 2.4, z: m.z + (Math.random() - 0.5) * 1.1,
                  vy: 0.95, s0: 0.24, s1: 0.78, life: 0.54, col: tr.col, alpha: 0.34,
                });
              } else if (tr.kind === 'featherGlint') {
                // 灵羽山雀: 扑腾飘落淡金灵羽微光
                this._spawnEffect({
                  shape: 'shard', x: bx, y: m.y + 0.9, z: bz,
                  vy: -0.65, s0: 0.34, s1: 0.14, life: 0.56, col: tr.col, alpha: 0.44, spin: 6.0,
                });
              } else if (tr.kind === 'venomSpore') {
                // 异化腐鳞蛇妖: 周身蒸腾紫绿毒雾微光
                this._spawnEffect({
                  shape: 'orb', x: m.x + (Math.random() - 0.5) * 2.8, y: m.y + 1.4 + Math.random() * 2.6, z: m.z + (Math.random() - 0.5) * 2.8,
                  vy: 0.85, s0: 0.28, s1: 0.86, life: 0.58, col: Math.random() < 0.5 ? [0.62, 0.20, 0.96] : tr.col, alpha: 0.40,
                });
              }
            }
          }

          // Resolve Monster-vs-World Entity Collision (trees, boulders, ruins, crystals) & Monster-vs-Monster separation!
          const mRad = sp.colRadius || (sp.radius * 0.78);
          if (this.collisionWorld && m.state !== 'leap' && (m.airYOffset || 0) < 2.6) {
            this.collisionWorld.resolveEntityXZ(m, mRad, sp.colHeight || 2.2);
          }
          for (let j = i + 1; j < this.monsters.length; j++) {
            const m2 = this.monsters[j];
            if (!m2.alive || !m2.visible) continue;
            const r2 = m2.spec.colRadius || (m2.spec.radius * 0.78);
            const minSep = mRad + r2;
            const mdx = m.x - m2.x;
            const mdz = m.z - m2.z;
            const md2 = mdx * mdx + mdz * mdz;
            if (md2 < minSep * minSep && md2 > 1e-6) {
              const md = Math.sqrt(md2);
              const push = (minSep - md) * 0.5;
              const ux = mdx / md, uz = mdz / md;
              m.x += ux * push; m.z += uz * push;
              m2.x -= ux * push; m2.z -= uz * push;
            }
          }

          if (m.state !== 'leap') {
            const gY = getMonsterGroundY(m.x, m.z);
            // 筑基期妖兽短暂低空飞行：严格只在主角御剑浮空、地面够不到时起飞，平时绝不飞！
            const playerAboveGround = py - gY;
            const inPlayerCombat = !useNpcTarget && (m.state === 'chase' || m.state === 'windup');
            if (isZhujiMon && inPlayerCombat && playerFlying && playerAboveGround > 3.2 && !isRooted) {
              if ((m.airFlyTimer || 0) <= 0 && (m.airFlyCd || 0) <= 0) {
                m.airFlyTimer = 7.5;
                m.airFlyCd = 15.5;
                this._spawnEffect({
                  shape: 'ring', x: m.x, y: gY + 0.25, z: m.z,
                  s0: 0.75, s1: (sp.radius || 1.6) * 2.4, life: 0.52,
                  col: sp.tint || [0.64, 0.94, 1.0], alpha: 0.62, spin: 5.5,
                });
              }
            } else if ((m.airFlyTimer || 0) > 0 && (!inPlayerCombat || !playerFlying || playerAboveGround < 2.2)) {
              // 主角落地或脱战后立即结束低空飞行，平滑降落回地面
              m.airFlyTimer = 0;
            }

            if ((m.airFlyTimer || 0) > 0) {
              const desiredOff = M.clamp(playerAboveGround - 0.6, 2.8, 22.0);
              const curOff = m.airYOffset || 0;
              const diff = desiredOff - curOff;
              const step = Math.min(Math.abs(diff), 9.5 * clampedDt);
              m.airYOffset = curOff + Math.sign(diff) * step;
              m.airVfxAcc = (m.airVfxAcc || 0) + clampedDt;
              if (m.airVfxAcc >= 0.34) {
                m.airVfxAcc = 0;
                this._spawnEffect({
                  shape: 'ring', x: m.x, y: gY + m.airYOffset - 0.15, z: m.z,
                  vy: -0.6, s0: (sp.radius || 1.5) * 0.85, s1: (sp.radius || 1.5) * 1.55,
                  life: 0.42, col: sp.tint || [0.68, 0.94, 1.0], alpha: 0.42, spin: 4.5,
                });
              }
            } else if ((m.airYOffset || 0) > 0.01) {
              m.airYOffset = Math.max(0, (m.airYOffset || 0) - 11.0 * clampedDt);
            } else {
              m.airYOffset = 0;
            }

            const hoverBob = sp.hoverY > 0
              ? (sp.hoverY + Math.sin(elapsed * 2.2 + m.id) * 0.45)
              : ((m.airYOffset || 0) > 0.2 ? Math.sin(elapsed * 3.2 + m.id) * 0.28 : 0.0);
            m.y = gY + hoverBob + (m.airYOffset || 0);
          }
        }

        if (m.visible) {
          M.m4ComposeTRS(
            m.modelMat,
            m.x, m.y, m.z,
            m.rollAngle, m.yaw, 0,
            sp.scale, sp.scale, sp.scale
          );
        }
      }

      if (!paused) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const p = this.projectiles[i];
          p.age += clampedDt;
          p.vy -= p.gravity * clampedDt;
          p.x += p.vx * clampedDt;
          p.y += p.vy * clampedDt;
          p.z += p.vz * clampedDt;
          p.yaw += p.spin * clampedDt;

          const gY = T.getMeshTerrainHeight(p.x, p.z);
          const hitPlayer = Math.hypot(p.x - px, p.z - pz) < p.hitRadius && Math.abs(p.y - (py + 1.15)) < 1.55;
          const hitGround = p.y <= gY + 0.14;

          if (hitPlayer) {
            hitCb(p.dmg, p.slowSec || 0, '妖兽', '灵气攻击');
            this._spawnEffect({
              shape: 'ring', x: p.x, y: Math.max(gY + 0.14, p.y - 0.3), z: p.z,
              s0: 0.3, s1: 1.8, life: 0.32, col: p.col, alpha: 0.48,
            });
            this.projectiles.splice(i, 1);
            continue;
          }
          if (npcList) {
            let hitNpc = false;
            for (let ni = 0; ni < npcList.length; ni++) {
              const nn = npcList[ni];
              if (!nn.alive || nn.kind === 'shopkeeper') continue;
              if (Math.hypot(p.x - nn.x, p.z - nn.z) < p.hitRadius + nn.colRadius * 0.5 && Math.abs(p.y - (nn.y + 1.15)) < 1.55) {
                npcSystem.applyDamageToNpc(nn, p.dmg, { slowSec: p.slowSec || 0 }, this);
                this._spawnEffect({
                  shape: 'ring', x: p.x, y: Math.max(gY + 0.14, p.y - 0.3), z: p.z,
                  s0: 0.3, s1: 1.8, life: 0.32, col: p.col, alpha: 0.48,
                });
                hitNpc = true;
                break;
              }
            }
            if (hitNpc) {
              this.projectiles.splice(i, 1);
              continue;
            }
          }
          if (hitGround || p.age >= p.life) {
            if (p.splashR > 0) {
              const burstY = Math.max(gY + 0.14, p.y);
              this._spawnEffect({
                shape: 'ring', x: p.x, y: burstY, z: p.z,
                s0: 0.45, s1: p.splashR, life: 0.52, col: p.col, alpha: 0.58, spin: 3.2,
              });
              if (Math.hypot(p.x - px, p.z - pz) < p.splashR && Math.abs((py + 1.0) - burstY) < 3.0) {
                hitCb(Math.round(p.dmg * 0.8), p.slowSec || 0, '妖兽', '灵气溅射');
              }
            }
            this.projectiles.splice(i, 1);
            continue;
          }

          M.m4ComposeTRS(p.modelMat, p.x, p.y, p.z, p.pitch || 0, p.yaw, 0, p.scale[0], p.scale[1], p.scale[2]);
        }

        for (let i = this.effects.length - 1; i >= 0; i--) {
          const ef = this.effects[i];
          ef.age += clampedDt;
          if (ef.age >= ef.life) {
            this.effects.splice(i, 1);
            continue;
          }
          ef.x += ef.vx * clampedDt;
          ef.y += ef.vy * clampedDt;
          ef.z += ef.vz * clampedDt;
          ef.yaw += ef.spin * clampedDt;
          const u = ef.age / ef.life;
          const sc = M.lerp(ef.s0, ef.s1, 1.0 - (1.0 - u) * (1.0 - u));
          const sy = ef.shape === 'ring' ? ef.sy : sc;
          M.m4ComposeTRS(ef.modelMat, ef.x, ef.y, ef.z, 0, ef.yaw, 0, sc, sy, sc);
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
          const ft = this.floatingTexts[i];
          ft.age += clampedDt;
          if (ft.age >= ft.life) {
            this.floatingTexts.splice(i, 1);
          }
        }
      }
    }

    getSummary() {
      const counts = {};
      for (const m of this.monsters) {
        counts[m.spec.name] = (counts[m.spec.name] || 0) + 1;
      }
      return { total: this.monsters.length, counts };
    }
  }

  const BESTIARY_REGION_NAMES = {
    lowcloud:     '低云平原',
    chenyan:      '沉烟迷泽 · 迷雾湿地',
    cloudmtn:     '云雾山',
    desert:       '流沙荒漠',
    spiritwood:   '通天灵木林',
    canzhen:      '残阵古道',
    frost:        '霜雪原 / 霜雪山',
    bamboovalley: '灵竹幽谷',
    venommire:    '蚀骨毒潭',
  };

  const BESTIARY_MOVE_KINDS = {
    lunge:      '近战突击',
    volley:     '远程弹幕',
    lob:        '抛射轰炸',
    barrageLob: '多重抛射',
    groundRing: '地面阵环',
    multiRing:  '连环阵爆',
    spiralStorm:'旋风连斩',
    nova:       '周身震爆',
    eliteNova:  '强域新星',
    dash:       '直线突进',
    eliteDash:  '狂冲突袭',
    leapSlam:   '跃击震地',
  };

  function getBestiaryData() {
    return SPECIES.map((sp) => {
      let categoryKey = 'lianqi_normal';
      let categoryLabel = '练气普通';
      let realmSpecs = [];

      if (sp.isBoss) {
        categoryKey = 'boss';
        categoryLabel = '区域首领';
        realmSpecs = [{ label: '练气十层（固定）', lvIdx: 0, expReward: 340 }];
      } else if (sp.isElite && sp.realm === '筑基期') {
        categoryKey = 'zhuji_elite';
        categoryLabel = '筑基精英';
        realmSpecs = [{ label: '筑基后期', lvIdx: 0, expReward: 285 }];
      } else if (sp.isElite) {
        categoryKey = 'lianqi_elite';
        categoryLabel = '练气精英';
        realmSpecs = ELITE_LIANQI_LAYER_NAMES.map((label, idx) => ({
          label,
          lvIdx: idx,
          expReward: ELITE_LIANQI_EXP_TABLE[idx],
        }));
      } else if (sp.realm === '筑基期') {
        categoryKey = 'zhuji_normal';
        categoryLabel = '筑基普通';
        realmSpecs = ZHUJI_STAGE_NAMES.map((label, idx) => ({
          label,
          lvIdx: idx,
          expReward: ZHUJI_EXP_TABLE[idx],
        }));
      } else {
        categoryKey = 'lianqi_normal';
        categoryLabel = '练气普通';
        realmSpecs = LIANQI_LAYER_NAMES.map((label, idx) => ({
          label,
          lvIdx: idx,
          expReward: LIANQI_EXP_TABLE[idx],
        }));
      }

      const moves = sp.moves.map((mv, idx) => ({
        slotLabel: idx === 0 ? '普攻' : `技能${idx}`,
        name: mv.name,
        kindLabel: BESTIARY_MOVE_KINDS[mv.kind] || mv.kind,
        dmgPct: mv.dmgPct || 1.0,
        mpCost: mv.mpCost || 0,
        cd: mv.cd,
        windup: mv.windup,
        range: mv.range,
        radius: mv.radius || mv.splashR || mv.burstRadius || 0,
        count: mv.count || mv.ringCount || mv.radialCount || 1,
        slowSec: mv.slowSec || 0,
      }));

      const realms = realmSpecs.map((row) => {
        const core = computeMonsterCoreStats(sp, row.lvIdx);
        return {
          label: row.label,
          coreHp: core.hp,
          coreMp: core.mp,
          coreAtk: core.atk,
          coreDef: core.def,
          hpMin: Math.max(10, Math.round(core.hp * 0.80)),
          hpMax: Math.round(core.hp * 1.10),
          atkMin: Math.max(2, Math.round(core.atk * 0.80)),
          atkMax: Math.round(core.atk * 1.10),
          defMin: Math.max(1, Math.round(core.def * 0.80)),
          defMax: Math.round(core.def * 1.10),
          expReward: row.expReward,
          moveDamages: sp.moves.map((mv) => Math.max(1, Math.round(core.atk * (mv.dmgPct || 1.0)))),
        };
      });

      return {
        id: sp.id,
        key: sp.key,
        name: sp.name,
        realm: sp.realm,
        regionKey: sp.region,
        regionName: BESTIARY_REGION_NAMES[sp.region] || sp.region,
        categoryKey,
        categoryLabel,
        isElite: !!sp.isElite,
        isBoss: !!sp.isBoss,
        coreStep: sp.coreStep || { hp: 0, mp: 0, atk: 0, def: 0 },
        scale: sp.scale,
        moveSpeed: sp.moveSpeed,
        aggroRange: sp.aggroRange,
        leashRange: sp.leashRange,
        patrolRadius: sp.patrolRadius,
        colRadius: sp.colRadius || sp.radius,
        colHeight: sp.colHeight || 2.2,
        respawnSec: sp.isElite ? 26 : 18,
        moves,
        realms,
      };
    });
  }

  XW.Monsters = {
    SPECIES,
    getBestiaryData,
    createMonsterSystem: (collisionWorld) => new MonsterSystem(collisionWorld),
  };
})(window);
