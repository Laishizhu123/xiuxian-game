(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const N = XW.Noise;
  const T = XW.Terrain;
  const MeshBuilder = XW.MeshBuilder;

  // 1. Upgraded Base Mesh: Dense 5-Blade Curved Stylized Grass Tuft (pos(3), uv(2))
  function createGrassTuftMesh() {
    const verts = [];
    const indices = [];
    let vc = 0;

    const blades = [
      { ang: 0.00, offX: -0.18, offZ:  0.08, h: 1.06, w: 0.16, lean: 0.30 },
      { ang: 1.26, offX:  0.16, offZ:  0.14, h: 0.92, w: 0.15, lean: 0.32 },
      { ang: 2.52, offX:  0.18, offZ: -0.12, h: 1.00, w: 0.15, lean: 0.28 },
      { ang: 3.78, offX: -0.12, offZ: -0.18, h: 0.86, w: 0.14, lean: 0.34 },
      { ang: 5.04, offX:  0.00, offZ:  0.02, h: 1.14, w: 0.16, lean: 0.24 },
    ];

    for (const b of blades) {
      const ca = Math.cos(b.ang), sa = Math.sin(b.ang);
      const rx = -sa, rz = ca;
      const baseV = vc;
      const segs = 3;

      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const w = b.w * (1.0 - t * 0.88);
        const y = b.h * t;
        const bend = b.lean * t * t;
        const cx = b.offX + ca * bend;
        const cz = b.offZ + sa * bend;

        if (i === segs) {
          verts.push(cx, y, cz, 0.5, 1.0);
          vc++;
        } else {
          verts.push(cx - rx * w, y, cz - rz * w, 0.0, t);
          verts.push(cx + rx * w, y, cz + rz * w, 1.0, t);
          vc += 2;
        }
      }

      for (let i = 0; i < segs - 1; i++) {
        const a = baseV + i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const lastQuad = baseV + (segs - 1) * 2;
      indices.push(lastQuad, lastQuad + 1, lastQuad + 2);
    }

    return {
      vertices: new Float32Array(verts),
      indices: new Uint16Array(indices),
    };
  }

  // 2. Base Mesh: 3D Multi-Lobe Sculpted Foliage Cluster (5 overlapping 3D leaf-crown lobes — eliminates flat pancake look!)
  function createCanopyPuffMesh() {
    const verts = [];
    const indices = [];
    const latSegs = 6;
    const lonSegs = 10;

    // 5 staggered 3D leaf sub-crowns forming one organic billowy foliage cluster
    const lobes = [
      { ox:  0.00, oy:  0.24, oz:  0.00, rx: 0.82, ry: 0.72, rz: 0.82, shade: 1.00, phase: 0.0 },
      { ox:  0.46, oy: -0.06, oz:  0.28, rx: 0.68, ry: 0.58, rz: 0.66, shade: 0.88, phase: 1.3 },
      { ox: -0.44, oy: -0.02, oz:  0.32, rx: 0.66, ry: 0.60, rz: 0.68, shade: 0.90, phase: 2.6 },
      { ox:  0.30, oy: -0.10, oz: -0.46, rx: 0.65, ry: 0.56, rz: 0.66, shade: 0.82, phase: 3.9 },
      { ox: -0.34, oy: -0.14, oz: -0.38, rx: 0.68, ry: 0.55, rz: 0.65, shade: 0.78, phase: 5.1 },
    ];

    let baseV = 0;
    const stride = lonSegs + 1;

    for (let L = 0; L < lobes.length; L++) {
      const lb = lobes[L];
      for (let il = 0; il <= latSegs; il++) {
        const v = il / latSegs;
        const phi = v * Math.PI;
        const sp = Math.sin(phi), cp = Math.cos(phi);

        for (let io = 0; io <= lonSegs; io++) {
          const u = io / lonSegs;
          const theta = u * Math.PI * 2;
          const ct = Math.cos(theta), st = Math.sin(theta);

          const nx = sp * ct, ny = cp, nz = sp * st;
          const ruffle = 1.0
            + 0.16 * Math.sin(theta * 3.0 + phi * 2.0 + lb.phase) * sp
            + 0.10 * Math.cos(theta * 5.0 - phi * 2.0 + lb.phase);

          const lx = lb.ox + nx * lb.rx * ruffle;
          const ly = lb.oy + ny * (ny > 0 ? lb.ry : lb.ry * 0.78) * ruffle;
          const lz = lb.oz + nz * lb.rz * ruffle;

          // Blend sub-lobe normal with overall 3D cluster dome normal for crisp volume & leaf-clump separation!
          let snx = nx * 0.65 + lx * 0.45;
          let sny = ny * 0.75 + ly * 0.45 + 0.25;
          let snz = nz * 0.65 + lz * 0.45;
          const nLen = Math.hypot(snx, sny, snz) || 1;

          // UV.x = normalized cluster height [-0.7..0.95] -> [0..1]; UV.y = sub-lobe AO & cleft self-shadow [0.25..1.0]
          const hGrad = Math.max(0.0, Math.min(1.0, (ly + 0.68) / 1.62));
          const cleftAO = lb.shade * (0.52 + 0.48 * (ny * 0.5 + 0.5)) * (0.85 + 0.15 * ruffle);
          verts.push(lx, ly, lz, snx / nLen, sny / nLen, snz / nLen, hGrad, cleftAO);
        }
      }

      for (let il = 0; il < latSegs; il++) {
        for (let io = 0; io < lonSegs; io++) {
          const a = baseV + il * stride + io;
          indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
        }
      }
      baseV += (latSegs + 1) * stride;
    }

    return {
      vertices: new Float32Array(verts),
      indices: new Uint16Array(indices),
    };
  }

  // 3. Base Mesh: Sculpted Mossy Karst Boulder (higher detail 6x10)
  function createBoulderMesh() {
    const verts = [];
    const indices = [];
    const lat = 6, lon = 10;
    const pts = [];

    for (let il = 0; il <= lat; il++) {
      const phi = (il / lat) * Math.PI;
      const row = [];
      for (let io = 0; io <= lon; io++) {
        const theta = (io / lon) * Math.PI * 2;
        const sx = Math.sin(phi) * Math.cos(theta);
        const sy = Math.cos(phi);
        const sz = Math.sin(phi) * Math.sin(theta);
        const n = 0.80 + 0.28 * N.noise2D(sx * 2.3 + 1.3, sz * 2.3 - sy * 1.7);
        row.push([sx * n * 1.18, sy * n * 0.78, sz * n * 1.06]);
      }
      pts.push(row);
    }

    let vc = 0;
    for (let il = 0; il < lat; il++) {
      for (let io = 0; io < lon; io++) {
        const p00 = pts[il][io], p10 = pts[il][io + 1], p11 = pts[il + 1][io + 1], p01 = pts[il + 1][io];
        // Diagonal cross product works cleanly even at north/south poles where top/bottom edges collapse!
        const d1x = p11[0] - p00[0], d1y = p11[1] - p00[1], d1z = p11[2] - p00[2];
        const d2x = p01[0] - p10[0], d2y = p01[1] - p10[1], d2z = p01[2] - p10[2];
        let nx = d1y * d2z - d1z * d2y;
        let ny = d1z * d2x - d1x * d2z;
        let nz = d1x * d2y - d1y * d2x;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;
        const cx = (p00[0] + p10[0] + p11[0] + p01[0]) * 0.25;
        const cy = (p00[1] + p10[1] + p11[1] + p01[1]) * 0.25;
        const cz = (p00[2] + p10[2] + p11[2] + p01[2]) * 0.25;
        if (nx * cx + ny * cy + nz * cz < 0) { nx = -nx; ny = -ny; nz = -nz; }

        // Outward-facing CCW quad order [p00, p10, p11, p01] (verified against outward normal!)
        const quad = [p00, p10, p11, p01];
        const e1x = quad[1][0] - quad[0][0], e1y = quad[1][1] - quad[0][1], e1z = quad[1][2] - quad[0][2];
        const e2x = quad[2][0] - quad[0][0], e2y = quad[2][1] - quad[0][1], e2z = quad[2][2] - quad[0][2];
        const tnx = e1y * e2z - e1z * e2y;
        const tny = e1z * e2x - e1x * e2z;
        const tnz = e1x * e2y - e1y * e2x;
        const a = vc;
        for (const p of quad) {
          verts.push(p[0], p[1], p[2], nx, ny, nz);
          vc++;
        }
        if (tnx * nx + tny * ny + tnz * nz >= 0) {
          indices.push(a, a + 1, a + 2, a, a + 2, a + 3);
        } else {
          indices.push(a, a + 2, a + 1, a, a + 3, a + 2);
        }
      }
    }

    return {
      vertices: new Float32Array(verts),
      indices: new Uint16Array(indices),
    };
  }

  // 4. Base Mesh: Stylized White Crane (白鹤)
  function createCraneMesh() {
    const verts = [];
    const indices = [];
    let vc = 0;

    function pushQuad(p0, p1, p2, p3, col, w0, w1, w2, w3) {
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
      const vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const base = vc;
      const ps = [p0, p1, p2, p3], ws = [w0, w1, w2, w3];
      for (let i = 0; i < 4; i++) {
        verts.push(ps[i][0], ps[i][1], ps[i][2], nx, ny, nz, col[0], col[1], col[2], ws[i]);
        vc++;
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      const base2 = vc;
      for (let i = 0; i < 4; i++) {
        verts.push(ps[i][0], ps[i][1], ps[i][2], -nx, -ny, -nz, col[0], col[1], col[2], ws[i]);
        vc++;
      }
      indices.push(base2, base2 + 2, base2 + 1, base2, base2 + 3, base2 + 2);
    }

    const white = [0.97, 0.98, 0.99];
    const wingTip = [0.16, 0.19, 0.24];
    const redCrown = [0.88, 0.22, 0.20];

    pushQuad([-0.22, 0, -0.8], [0.22, 0, -0.8], [0.14, 0.08, 1.45], [-0.14, 0.08, 1.45], white, 0, 0, 0, 0);
    pushQuad([-0.08, 0.10, 1.45], [0.08, 0.10, 1.45], [0.03, 0.08, 1.85], [-0.03, 0.08, 1.85], redCrown, 0, 0, 0, 0);
    pushQuad([-0.18, 0, -0.8], [0.18, 0, -0.8], [0.30, -0.02, -1.55], [-0.30, -0.02, -1.55], wingTip, 0, 0, 0, 0);

    for (const s of [-1, 1]) {
      pushQuad([s * 0.18, 0.02, 0.48], [s * 1.35, 0.08, 0.34], [s * 1.25, 0.06, -0.45], [s * 0.18, 0.00, -0.45], white, 0.0, 0.55, 0.55, 0.0);
      pushQuad([s * 1.35, 0.08, 0.34], [s * 2.55, 0.12, -0.08], [s * 2.35, 0.10, -0.58], [s * 1.25, 0.06, -0.45], wingTip, 0.55, 1.0, 1.0, 0.55);
    }

    return {
      vertices: new Float32Array(verts),
      indices: new Uint16Array(indices),
    };
  }

  // 5. Refined Trees, Bamboo & Ecological Grove Clusters across the 5400m Open World!
  function buildTreesAndBamboo(collisionWorld = null) {
    const trunkMb = new MeshBuilder(null);
    const canopyInstances = [];
    const groveBoulders = [];
    const groveHerbsAndReeds = [];
    const rand = N.createRNG(314159);
    const nrm = new Float32Array(3);

    const barkPine = [0.34, 0.23, 0.18];
    const barkPineDark = [0.22, 0.15, 0.12];
    const barkBroad = [0.33, 0.24, 0.18];
    const barkBroadDark = [0.21, 0.15, 0.11];
    const barkPeach = [0.31, 0.19, 0.17];
    const barkPeachDark = [0.20, 0.12, 0.11];
    const bambooCol = [0.22, 0.54, 0.28];
    const bambooNode = [0.34, 0.64, 0.34];

    // Helper: Flared organic ground root buttresses (树根抓地 + Canvas 木纹 matType=1.30)
    function addRootButtresses(x, y, z, rBase, barkCol, scale) {
      for (let r = 0; r < 4; r++) {
        const ra = (r / 4) * Math.PI * 2 + rand() * 0.7;
        const rx = x + Math.cos(ra) * rBase * 2.4;
        const rz = z + Math.sin(ra) * rBase * 2.4;
        const tipY = (y < 145) ? Math.min(y - 0.55 * scale, T.getMeshTerrainHeight(rx, rz) - 0.75 * scale) : (y - 0.55 * scale);
        trunkMb.addTaperedTube([x, y + 0.65 * scale, z], [rx, tipY, rz], rBase * 0.52, rBase * 0.16, 5, barkCol, 0.86, 0, 1.30);
      }
    }

    // Helper: Push a 3D multi-lobe foliage cluster with natural 3D volume (never a flat pancake!)
    function pushFoliageCluster(x, y, z, rx, ry, rz, r, g, b) {
      canopyInstances.push(x, y, z, rx, ry, rz, r, g, b, rand() * 6.283185);
    }

    // A) Sculpted Gnarled Welcoming Immortal Pine (迎客松 / 苍松): S-curved trunk, sweeping welcoming arm, forked boughs & 3D dark-to-light needle clusters!
    function addPineTree(x, y, z, scale) {
      const leanAngle = rand() * Math.PI * 2;
      const lean = 0.24 + rand() * 0.30;
      const h = (8.6 + rand() * 4.8) * scale;
      const segs = 5;
      let cx = x, cy = y - 0.5, cz = z;
      let r = 0.56 * scale;

      if (collisionWorld) {
        collisionWorld.addCylinder(x, y - 0.6, z, Math.max(0.58, 0.60 * scale), h * 0.92, 'tree', false);
      }
      addRootButtresses(x, y, z, r, barkPineDark, scale);

      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        const segH = h / segs;
        // Organic S-curve twist along trunk
        const curveA = leanAngle + Math.sin(t * Math.PI * 1.35) * 0.65;
        const nx = cx + Math.cos(curveA) * lean * segH * (1.15 - t * 0.3);
        const ny = cy + segH;
        const nz = cz + Math.sin(curveA) * lean * segH * (1.15 - t * 0.3);
        const nextR = r * 0.77;
        const segCol = i === 0 ? barkPineDark : barkPine;
        trunkMb.addTaperedTube([cx, cy, cz], [nx, ny, nz], r, nextR, 7, segCol, 0.84, 0, 1.30);
        cx = nx; cy = ny; cz = nz;
        r = nextR;

        if (i >= 1) {
          // Primary curved bough (i===2 is the long sweeping 迎客长枝 Welcoming Arm!)
          const isWelcomeArm = (i === 2);
          const bAng = leanAngle + (i % 2 === 0 ? 1.18 : -1.28) + (rand() - 0.5) * 0.45;
          const bLen = (isWelcomeArm ? (4.2 + rand() * 1.6) : (2.7 + rand() * 1.8)) * scale * (1.14 - t * 0.28);

          // 2-segment curved primary branch (dipping slightly then lifting gracefully at the tip)
          const midLen = bLen * 0.54;
          const mx = cx + Math.cos(bAng) * midLen;
          const my = cy + (isWelcomeArm ? -0.15 : 0.18) * scale;
          const mz = cz + Math.sin(bAng) * midLen;
          const bx = cx + Math.cos(bAng + 0.16) * bLen;
          const by = my + (isWelcomeArm ? 0.55 : 0.72) * scale;
          const bz = cz + Math.sin(bAng + 0.16) * bLen;

          trunkMb.addTaperedTube([cx, cy, cz], [mx, my, mz], r * 0.78, r * 0.46, 5, barkPine, 0.84, 0, 1.30);
          trunkMb.addTaperedTube([mx, my, mz], [bx, by, bz], r * 0.46, r * 0.20, 5, barkPine, 0.84, 0, 1.30);

          // Secondary forked side twig from the bough elbow
          const forkAng = bAng + (i % 2 === 0 ? 0.72 : -0.72);
          const fx = mx + Math.cos(forkAng) * bLen * 0.46;
          const fy = my + 0.62 * scale;
          const fz = mz + Math.sin(forkAng) * bLen * 0.46;
          trunkMb.addTaperedTube([mx, my, mz], [fx, fy, fz], r * 0.38, r * 0.14, 5, barkPine, 0.84, 0, 1.30);

          // Staggered 3D pine foliage clusters with dark-to-light vertex color gradation (no flat pancakes!)
          const padR = (2.1 + rand() * 1.0) * scale;
          const gShift = (rand() - 0.5) * 0.03;
          // 1) Lower/inner shaded foliage cluster at secondary fork (deep苍翠 pine shade)
          pushFoliageCluster(
            fx, fy + 0.36 * scale, fz,
            padR * 0.78, padR * 0.56, padR * 0.78,
            0.06 + gShift, 0.23 + gShift, 0.14 + gShift * 0.5
          );
          // 2) Mid-tier foliage cluster at primary bough tip (rich emerald pine)
          pushFoliageCluster(
            bx, by + 0.42 * scale, bz,
            padR, padR * 0.68, padR,
            0.11 + gShift, 0.35 + t * 0.05 + gShift, 0.18 + gShift * 0.5
          );
          // 3) Upper sunlit crown cluster staggered above bough (warm sunlit jade-pine)
          pushFoliageCluster(
            bx + Math.cos(bAng + 0.5) * padR * 0.36, by + 1.02 * scale, bz + Math.sin(bAng + 0.5) * padR * 0.36,
            padR * 0.74, padR * 0.58, padR * 0.74,
            0.17 + gShift, 0.45 + t * 0.05 + gShift, 0.22
          );
        }
      }

      // Staggered 3D multi-layered summit crown with dark-to-light vertical gradient
      for (let k = 0; k < 3; k++) {
        const cAng = leanAngle + k * 2.1;
        const cOff = (k === 2 ? 0.15 : 0.75) * scale;
        const tx = cx + Math.cos(cAng) * cOff;
        const ty = cy + (0.20 + k * 0.68) * scale;
        const tz = cz + Math.sin(cAng) * cOff;
        if (k < 2) {
          trunkMb.addTaperedTube([cx, cy, cz], [tx, ty, tz], r * 0.75, r * 0.22, 5, barkPine, 0.84, 0, 1.30);
        }
        const padR = (2.55 - k * 0.42) * scale;
        pushFoliageCluster(
          tx, ty + 0.35 * scale, tz,
          padR, padR * 0.72, padR,
          0.10 + k * 0.045, 0.33 + k * 0.075, 0.18 + k * 0.02
        );
      }
    }

    // B) Ancient Xianxia Camphor / Broadleaf Tree (青林古木): Curved trunk, 2-stage forked limbs & billowy 3D dark-to-light leaf crowns!
    function addBroadleafTree(x, y, z, scale) {
      const h = (7.2 + rand() * 3.6) * scale;
      const leanA = rand() * Math.PI * 2;
      const bendX = x + Math.cos(leanA) * 0.42 * scale;
      const bendY = y + h * 0.26;
      const bendZ = z + Math.sin(leanA) * 0.42 * scale;
      const midX = bendX + Math.cos(leanA + 0.65) * 0.38 * scale;
      const midY = y + h * 0.50;
      const midZ = bendZ + Math.sin(leanA + 0.65) * 0.38 * scale;

      if (collisionWorld) {
        collisionWorld.addCylinder(x, y - 0.6, z, Math.max(0.56, 0.58 * scale), h * 0.90, 'tree', false);
      }
      addRootButtresses(x, y, z, 0.54 * scale, barkBroadDark, scale);
      trunkMb.addTaperedTube([x, y - 0.5, z], [bendX, bendY, bendZ], 0.54 * scale, 0.41 * scale, 7, barkBroadDark, 0.84, 0, 1.30);
      trunkMb.addTaperedTube([bendX, bendY, bendZ], [midX, midY, midZ], 0.41 * scale, 0.31 * scale, 7, barkBroad, 0.82, 0, 1.30);

      const bCount = 5;
      const warmTint = rand();
      for (let i = 0; i < bCount; i++) {
        const a = (i / bCount) * Math.PI * 2 + (rand() - 0.5) * 0.42;
        const bLen = (2.4 + rand() * 1.5) * scale;
        // 2-segment curved primary limb
        const elbowX = midX + Math.cos(a) * bLen * 0.52;
        const elbowY = midY + (0.85 + rand() * 0.65) * scale;
        const elbowZ = midZ + Math.sin(a) * bLen * 0.52;
        const bx = midX + Math.cos(a + 0.22) * bLen;
        const by = elbowY + (1.05 + rand() * 0.85) * scale;
        const bz = midZ + Math.sin(a + 0.22) * bLen;

        trunkMb.addTaperedTube([midX, midY, midZ], [elbowX, elbowY, elbowZ], 0.26 * scale, 0.16 * scale, 5, barkBroad, 0.82, 0, 1.30);
        trunkMb.addTaperedTube([elbowX, elbowY, elbowZ], [bx, by, bz], 0.16 * scale, 0.08 * scale, 5, barkBroad, 0.82, 0, 1.30);

        // Secondary forked sub-branch
        const subA = a + (i % 2 === 0 ? 0.68 : -0.68);
        const sx = elbowX + Math.cos(subA) * bLen * 0.48;
        const sy = elbowY + (0.55 + rand() * 0.55) * scale;
        const sz = elbowZ + Math.sin(subA) * bLen * 0.48;
        trunkMb.addTaperedTube([elbowX, elbowY, elbowZ], [sx, sy, sz], 0.14 * scale, 0.06 * scale, 5, barkBroad, 0.82, 0, 1.30);

        const cR = (2.05 + rand() * 0.95) * scale;
        const gVar = (rand() - 0.5) * 0.04;
        const rBase = M.lerp(0.15, 0.27, warmTint) + gVar;
        const gBase = M.lerp(0.45, 0.55, warmTint) + gVar;
        const bBase = M.lerp(0.19, 0.16, warmTint);

        // 1) Lower shaded under-bough leaf cluster (deep mossy forest shadow)
        pushFoliageCluster(
          sx, sy + 0.35 * scale, sz,
          cR * 0.78, cR * 0.66, cR * 0.78,
          rBase * 0.62, gBase * 0.68, bBase * 0.85
        );
        // 2) Mid-canopy billowy 3D leaf cluster
        pushFoliageCluster(
          bx, by + 0.48 * scale, bz,
          cR, cR * 0.82, cR,
          rBase, gBase, bBase
        );
        // 3) Upper sunlit sub-crown cluster (warm golden-emerald highlight)
        pushFoliageCluster(
          bx + Math.cos(a + 0.4) * cR * 0.38, by + 1.18 * scale, bz + Math.sin(a + 0.4) * cR * 0.38,
          cR * 0.72, cR * 0.66, cR * 0.72,
          rBase + 0.08, gBase + 0.09, bBase + 0.02
        );
      }

      // Multi-dome sunlit top crown
      const topR = 2.45 * scale;
      pushFoliageCluster(
        midX, midY + 3.15 * scale, midZ,
        topR, topR * 0.84, topR,
        M.lerp(0.24, 0.34, warmTint), M.lerp(0.55, 0.64, warmTint), 0.20
      );
    }

    // C) Sculpted Spirit Peach Blossom Tree (灵桃树): Curved dark-plum limbs, forked twigs & 3D rose-to-snow blossom gradation!
    function addPeachTree(x, y, z, scale) {
      const h = (5.8 + rand() * 2.8) * scale;
      const leanA = rand() * Math.PI * 2;
      const midX = x + Math.cos(leanA) * 0.40 * scale;
      const midY = y + h * 0.25;
      const midZ = z + Math.sin(leanA) * 0.40 * scale;
      const forkX = midX + Math.cos(leanA - 0.55) * 0.42 * scale;
      const forkY = y + h * 0.48;
      const forkZ = midZ + Math.sin(leanA - 0.55) * 0.42 * scale;

      if (collisionWorld) {
        collisionWorld.addCylinder(x, y - 0.6, z, Math.max(0.50, 0.52 * scale), h * 0.90, 'tree', false);
      }
      addRootButtresses(x, y, z, 0.48 * scale, barkPeachDark, scale);
      trunkMb.addTaperedTube([x, y - 0.5, z], [midX, midY, midZ], 0.48 * scale, 0.36 * scale, 7, barkPeachDark, 0.82, 0, 1.30);
      trunkMb.addTaperedTube([midX, midY, midZ], [forkX, forkY, forkZ], 0.36 * scale, 0.27 * scale, 7, barkPeach, 0.80, 0, 1.30);

      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + (rand() - 0.5) * 0.45;
        const bLen = (2.2 + rand() * 1.4) * scale;
        const elbowX = forkX + Math.cos(a) * bLen * 0.50;
        const elbowY = forkY + (0.65 + rand() * 0.55) * scale;
        const elbowZ = forkZ + Math.sin(a) * bLen * 0.50;
        const bx = forkX + Math.cos(a + 0.25) * bLen;
        const by = elbowY + (0.95 + rand() * 0.75) * scale;
        const bz = forkZ + Math.sin(a + 0.25) * bLen;

        trunkMb.addTaperedTube([forkX, forkY, forkZ], [elbowX, elbowY, elbowZ], 0.23 * scale, 0.14 * scale, 5, barkPeach, 0.80, 0, 1.30);
        trunkMb.addTaperedTube([elbowX, elbowY, elbowZ], [bx, by, bz], 0.14 * scale, 0.07 * scale, 5, barkPeach, 0.80, 0, 1.30);

        const twigA = a + (i % 2 === 0 ? 0.65 : -0.65);
        const tx = elbowX + Math.cos(twigA) * bLen * 0.45;
        const ty = elbowY + 0.45 * scale;
        const tz = elbowZ + Math.sin(twigA) * bLen * 0.45;
        trunkMb.addTaperedTube([elbowX, elbowY, elbowZ], [tx, ty, tz], 0.12 * scale, 0.05 * scale, 5, barkPeach, 0.80, 0, 1.30);

        const cR = (1.85 + rand() * 0.88) * scale;
        const sh = rand();

        // 1) Lower/inner fork cluster: deep carmine-rose shaded blossoms (or tender spring-green leaf buds on 1 bough!)
        if (i === 1) {
          pushFoliageCluster(tx, ty + 0.30 * scale, tz, cR * 0.62, cR * 0.52, cR * 0.62, 0.25, 0.54, 0.24);
        } else {
          pushFoliageCluster(tx, ty + 0.32 * scale, tz, cR * 0.72, cR * 0.60, cR * 0.72, 0.74, 0.30, 0.46);
        }
        // 2) Mid-canopy lush peach-pink blossom cluster
        pushFoliageCluster(
          bx, by + 0.44 * scale, bz,
          cR, cR * 0.80, cR,
          M.lerp(0.92, 0.98, sh), M.lerp(0.48, 0.62, sh), M.lerp(0.62, 0.74, sh)
        );
        // 3) Upper sunlit snow-blushed blossom crown
        pushFoliageCluster(
          bx + Math.cos(a) * cR * 0.34, by + 1.05 * scale, bz + Math.sin(a) * cR * 0.34,
          cR * 0.68, cR * 0.62, cR * 0.68,
          1.00, 0.76, 0.85
        );
      }
      const topR = 2.15 * scale;
      pushFoliageCluster(forkX, forkY + 2.65 * scale, forkZ, topR, topR * 0.82, topR, 0.99, 0.70, 0.80);
    }

    // D) Refined Segmented Emerald Bamboo Cluster (翠竹丛 — with visible bamboo culm nodes!)
    function addBambooCluster(x, y, z, stalks = 6) {
      if (collisionWorld) {
        collisionWorld.addCylinder(x, y - 0.5, z, 1.2, 12.0, 'tree', false);
      }
      for (let i = 0; i < stalks; i++) {
        const ox = x + (rand() - 0.5) * 3.4;
        const oz = z + (rand() - 0.5) * 3.4;
        const oy = T.getTerrainHeight(ox, oz);
        const h = 11.5 + rand() * 8.0;
        const r = 0.14 + rand() * 0.06;
        const leanX = (rand() - 0.5) * 1.6;
        const leanZ = (rand() - 0.5) * 1.6;
        let px = ox, py = oy - 0.4, pz = oz;
        for (let s = 0; s < 3; s++) {
          const t0 = s / 3, t1 = (s + 1) / 3;
          const nx = ox + leanX * t1 * t1, ny = oy + h * t1, nz = oz + leanZ * t1 * t1;
          trunkMb.addTaperedTube([px, py, pz], [nx, ny, nz], r * (1 - t0 * 0.35), r * (1 - t1 * 0.35), 5, bambooCol, 0.52, 0, 1.30);
          if (s < 2) {
            trunkMb.addCylinder(nx, ny - 0.06, nz, r * 1.15, r * 1.15, 0.12, 6, bambooNode, 0.48, 0, 1.30, false, false);
          }
          px = nx; py = ny; pz = nz;
        }
        for (let k = 0; k < 3; k++) {
          const frac = 0.62 + k * 0.19;
          const lr = 1.55 + rand() * 0.95;
          pushFoliageCluster(
            ox + leanX * frac * frac + (rand() - 0.5) * 1.4, oy + h * frac, oz + leanZ * frac * frac + (rand() - 0.5) * 1.4,
            lr, lr * 0.64, lr,
            0.16 + k * 0.04 + rand() * 0.05, 0.48 + k * 0.07 + rand() * 0.06, 0.21 + rand() * 0.04
          );
        }
      }
    }

    // Helper: Place a natural multi-sized rock & glowing Spirit Herb group (大小山石 + 灵草伴生)
    function addRockAndHerbGroup(cx, cz, baseScale, herbQuota = 5) {
      const rockCount = 2 + ((rand() * 3) | 0);
      for (let r = 0; r < rockCount; r++) {
        const ra = rand() * Math.PI * 2;
        const rd = r === 0 ? 0.0 : (1.2 + rand() * 3.2) * baseScale * 0.45;
        const rx = cx + Math.cos(ra) * rd;
        const rz = cz + Math.sin(ra) * rd;
        // First rock is a large anchor boulder; companion rocks are medium & small stones!
        const sc = r === 0 ? baseScale : baseScale * (0.34 + rand() * 0.42);
        const sx = sc, sy = sc * (0.56 + rand() * 0.48), sz = sc * (0.82 + rand() * 0.36);
        const footY = T.getMeshFootHeight(rx, rz, Math.max(sx, sz) * 0.75);
        const by = footY + sy * 0.08; // Embedded firmly below lowest perimeter terrain point — ZERO floating on slopes!
        groveBoulders.push(rx, by, rz, rand() * 6.283185, sx, sy, sz, rand());
        if (collisionWorld && sc >= 0.42) {
          collisionWorld.addCylinder(rx, by - sy * 0.6, rz, Math.max(sx, sz) * 0.86, sy * 1.48, 'rock', sy < 1.85);
        }
      }
      // Cluster luminous cyan-jade & golden Spirit Herbs (灵草, hue = 5.8) around the boulder base!
      for (let h = 0; h < herbQuota; h++) {
        const ha = rand() * Math.PI * 2;
        const hd = (0.8 + rand() * 2.8) * Math.max(1.0, baseScale * 0.48);
        const hx = cx + Math.cos(ha) * hd;
        const hz = cz + Math.sin(ha) * hd;
        const hy = T.getMeshTerrainHeight(hx, hz);
        groveHerbsAndReeds.push(
          hx, hy - 0.16, hz,
          1.15 + rand() * 0.65,
          rand() * Math.PI * 2,
          5.8, // 5.8 = Luminous Xianxia Spirit Herb (灵草)
          1.10 + rand() * 0.45,
          rand() * Math.PI * 2
        );
      }
    }

    // --- Curated Immortal Trees gracing 青石仙城's 260m×240m gates, lotus pools & residential boulevards ---
    for (const [px, pz, sc, kind] of [
      [-26, 140, 1.38, 'peach'], [ 26, 140, 1.38, 'pine'],
      [-144, 18, 1.32, 'pine'],  [-144, -18, 1.30, 'peach'],
      [ 144, 18, 1.32, 'broad'], [ 144, -18, 1.30, 'pine'],
      [ -22, -128, 1.32, 'peach'], [ 22, -128, 1.32, 'pine'],
      [-24, -64, 1.25, 'peach'], [ 24, -64, 1.25, 'peach'], // Blossoming spirit peaches flanking 聚宝轩 & lotus pools
      [-32, -24, 1.18, 'peach'], [ 32, -24, 1.18, 'peach'],
      [-76, -12, 1.20, 'broad'], [ 76, -12, 1.20, 'broad'],
      [-76,  14, 1.18, 'peach'], [ 76,  14, 1.18, 'peach'],
      [-114, -98, 1.28, 'pine'], [ 114, -98, 1.28, 'pine'],
      [-114, 108, 1.26, 'peach'],[ 114, 108, 1.26, 'broad'],
      [ -26,  92, 1.18, 'peach'],[  26,  92, 1.18, 'broad'],
      [ -76,  92, 1.16, 'pine'], [  76,  92, 1.16, 'peach'],
    ]) {
      const py = T.getTerrainHeight(px, pz);
      if (kind === 'peach') addPeachTree(px, py, pz, sc);
      else if (kind === 'pine') addPineTree(px, py, pz, sc);
      else addBroadleafTree(px, py, pz, sc);
    }

    // --- Curated Natural Grove Clusters framing the 低云平原 Spawn Glade (-1020, 1120) ---
    const lc = T.LOW_CLOUD_PLAINS;
    for (const [px, pz, sc, kind] of [
      [lc.spawnX + 42, lc.spawnZ - 36, 1.42, 'broad'],
      [lc.spawnX + 51, lc.spawnZ - 44, 0.98, 'peach'],
      [lc.spawnX - 46, lc.spawnZ - 42, 1.36, 'pine'],
      [lc.spawnX - 54, lc.spawnZ - 34, 0.94, 'pine'],
      [lc.spawnX + 66, lc.spawnZ + 18, 1.28, 'peach'],
      [lc.spawnX - 58, lc.spawnZ + 32, 1.36, 'broad'],
      [lc.spawnX + 86, lc.spawnZ - 88, 1.46, 'broad'],
      [lc.spawnX + 12, lc.spawnZ - 94, 1.34, 'pine'],
    ]) {
      const py = T.getTerrainHeight(px, pz);
      if (kind === 'peach') addPeachTree(px, py, pz, sc);
      else if (kind === 'pine') addPineTree(px, py, pz, sc);
      else addBroadleafTree(px, py, pz, sc);
      addRockAndHerbGroup(px + (rand() - 0.5) * 6.5, pz + (rand() - 0.5) * 6.5, 1.4 + rand() * 1.1, 5);
    }

    // Helper: Check if a position is clear of roads, water, and building plazas
    function isValidGroveSpot(x, z, isLowCloud) {
      if (T.getSwampMask(x, z) > 0.16) return false;
      if (T.getAncientRoadMask(x, z) > 0.16) return false;
      if (T.getSpiritForestMask(x, z) > 0.16) return false;
      if (T.getCloudMountainMask(x, z) > 0.16) return false;
      if (T.getDesertMask(x, z) > 0.14) return false;
      if (T.getSnowfieldMask(x, z) > 0.16) return false;
      if (T.getFrostMountainMask(x, z) > 0.14) return false;
      if (T.getHiddenMountainsMask && T.getHiddenMountainsMask(x, z) > 0.14) return false;
      if (isLowCloud) {
        if (T.getLowCloudPlainsMask(x, z) < 0.25) return false;
        if (Math.hypot(x - lc.spawnX, z - lc.spawnZ) < 38) return false;
      } else {
        if (T.getLowCloudPlainsMask(x, z) > 0.35) return false;
        if (T.getPathMask(x, z) > 0.12) return false;
        // Keep grand 260m×240m 青石仙城 interior & wall perimeter completely free of wild forest groves!
        if (Math.abs(x) < 150 && z > -136 && z < 146) return false;
      }
      const y = T.getTerrainHeight(x, z);
      if (y < T.RIVER_WATER_Y + 2.2 || y > (isLowCloud ? 82 : 140)) return false;
      T.getTerrainNormal(x, z, nrm);
      return nrm[1] >= (isLowCloud ? 0.75 : 0.70);
    }

    // Helper: Spawn an organic Ecological Grove Cluster (1-2 Mother Trees + 4-8 Companion Trees + Multi-Sized Rocks + Spirit Herbs!)
    function spawnEcologicalGrove(gx, gz, isLowCloud) {
      const gy = T.getTerrainHeight(gx, gz);
      const groveRad = 16.0 + rand() * 28.0;
      const treeCount = 5 + ((rand() * 6) | 0);
      // Choose grove theme (0: Broadleaf & Peach Copse, 1: Welcoming Pine & Boulder Outcrop, 2: Peach Blossom Sanctuary)
      const themeRoll = rand();
      const theme = gy > 44 ? 1 : (themeRoll < 0.52 ? 0 : (themeRoll < 0.80 ? 1 : 2));

      let placed = 0;
      for (let i = 0; i < treeCount; i++) {
        const isMother = i < 2;
        const ang = (i / treeCount) * Math.PI * 2 + (rand() - 0.5) * 0.75;
        const dist = isMother ? (rand() * 5.5) : (5.5 + Math.pow(rand(), 0.8) * groveRad);
        const tx = gx + Math.cos(ang) * dist;
        const tz = gz + Math.sin(ang) * dist;
        if (!isValidGroveSpot(tx, tz, isLowCloud)) continue;
        const sc = isMother ? (1.26 + rand() * 0.38) : (0.64 + rand() * 0.52);
        const ty = T.getMeshFootHeight(tx, tz, 0.85 * sc);
        const rKind = rand();
        if (theme === 1) {
          if (rKind < 0.74) addPineTree(tx, ty, tz, sc);
          else if (rKind < 0.90) addBroadleafTree(tx, ty, tz, sc);
          else addPeachTree(tx, ty, tz, sc * 0.95);
        } else if (theme === 2) {
          if (rKind < 0.65) addPeachTree(tx, ty, tz, sc);
          else if (rKind < 0.85) addBroadleafTree(tx, ty, tz, sc);
          else addPineTree(tx, ty, tz, sc);
        } else {
          if (rKind < 0.60) addBroadleafTree(tx, ty, tz, sc);
          else if (rKind < 0.82) addPineTree(tx, ty, tz, sc);
          else addPeachTree(tx, ty, tz, sc * 0.95);
        }
        placed++;
      }

      // Interleave 1-2 multi-sized mountain rock & glowing Spirit Herb outcrops right inside the grove!
      if (placed > 0) {
        const outcropCount = 1 + (rand() < 0.65 ? 1 : 0);
        for (let k = 0; k < outcropCount; k++) {
          const oa = rand() * Math.PI * 2;
          const od = 3.0 + rand() * (groveRad * 0.65);
          const ox = gx + Math.cos(oa) * od;
          const oz = gz + Math.sin(oa) * od;
          if (isValidGroveSpot(ox, oz, isLowCloud)) {
            addRockAndHerbGroup(ox, oz, 1.5 + rand() * 2.2, 4 + ((rand() * 4) | 0));
          }
        }
      }
      return placed;
    }

    // A) 低云平原 Natural Ecological Grove Clusters (~3,350 trees clustered into organic groves across the southern-expanded plain — ZERO buildings!)
    let placedLowCloud = 0;
    let lcAttempts = 0;
    while (placedLowCloud < 3350 && lcAttempts < 8400) {
      lcAttempts++;
      const gx = -4350 + rand() * 4420;
      const gz = 220 + rand() * 7280;
      if (!isValidGroveSpot(gx, gz, true)) continue;
      const groveField = N.fbm2D(gx * 0.0028 + 1.8, gz * 0.0028 - 3.4, 3);
      if (groveField < -0.08 && rand() > 0.08) continue;
      placedLowCloud += spawnEcologicalGrove(gx, gz, true);
    }

    // B) Central & Outer Shan-Shui Continent Natural Grove Clusters (~1,520 trees)
    let placedTrees = 0;
    let attempts = 0;
    while (placedTrees < 1520 && attempts < 3200) {
      attempts++;
      const gx = -1240 + rand() * 2680;
      const gz = -1260 + rand() * 2460;
      if (!isValidGroveSpot(gx, gz, false)) continue;
      const forestDensity = N.fbm2D(gx * 0.0044 + 3.7, gz * 0.0044 - 1.9, 3);
      if (forestDensity < -0.12 && rand() > 0.10) continue;
      placedTrees += spawnEcologicalGrove(gx, gz, false);
    }

    // C) 沉烟迷泽 Exclusive Gnarled Marsh Willows & Sprawling-Root Deadwood Trees (盘根枯柳 / 迷泽老树)
    const barkSwamp = [0.23, 0.21, 0.16];
    const barkSwampMoss = [0.19, 0.24, 0.17];
    function addSwampWillowTree(x, y, z, scale, isDeadwood = false) {
      const h = (7.4 + rand() * 4.2) * scale;
      const leanA = rand() * Math.PI * 2;
      const lean = 0.28 + rand() * 0.34;
      let cx = x, cy = y - 0.8, cz = z;
      let r = 0.62 * scale;

      if (collisionWorld) {
        collisionWorld.addCylinder(x, y - 0.8, z, Math.max(0.62, 0.66 * scale), h * 0.88, 'tree', false);
      }

      // 6 dramatic sprawling arched exposed roots (盘根错节) plunging into the wet mud & shallow water!
      for (let rr = 0; rr < 6; rr++) {
        const ra = (rr / 6) * Math.PI * 2 + (rand() - 0.5) * 0.45;
        const archR = r * (2.6 + rand() * 1.4);
        const mx = x + Math.cos(ra) * archR * 0.52;
        const my = y + (0.65 + rand() * 0.55) * scale;
        const mz = z + Math.sin(ra) * archR * 0.52;
        const ex = x + Math.cos(ra) * archR;
        const ez = z + Math.sin(ra) * archR;
        const ey = Math.min(T.getTerrainHeight(ex, ez), T.SWAMP_WATER_Y) - 1.2 * scale;
        trunkMb.addTaperedTube([x, y + 0.85 * scale, z], [mx, my, mz], r * 0.52, r * 0.34, 5, barkSwampMoss, 0.86, 0, 1.30);
        trunkMb.addTaperedTube([mx, my, mz], [ex, ey, ez], r * 0.34, r * 0.12, 5, barkSwamp, 0.88, 0, 1.30);
      }

      // 4-segment crooked gnarled trunk
      const segs = 4;
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        const segH = (h * 0.58) / segs;
        const twistA = leanA + Math.sin(t * Math.PI * 1.4) * 0.8;
        const nx = cx + Math.cos(twistA) * lean * segH;
        const ny = cy + segH;
        const nz = cz + Math.sin(twistA) * lean * segH;
        const nextR = r * 0.78;
        trunkMb.addTaperedTube([cx, cy, cz], [nx, ny, nz], r, nextR, 7, i < 2 ? barkSwampMoss : barkSwamp, 0.86, 0, 1.30);
        cx = nx; cy = ny; cz = nz;
        r = nextR;
      }

      // 5 crooked gnarled spreading boughs + stark deadwood upper twigs
      const bCount = 5;
      for (let i = 0; i < bCount; i++) {
        const a = (i / bCount) * Math.PI * 2 + (rand() - 0.5) * 0.55;
        const bLen = (3.0 + rand() * 2.2) * scale;
        const ex = cx + Math.cos(a) * bLen * 0.55;
        const ey = cy + (1.1 + rand() * 1.0) * scale;
        const ez = cz + Math.sin(a) * bLen * 0.55;
        // Weeping willow limbs arch up then droop down at the tips; deadwood twists upward
        const bx = cx + Math.cos(a + 0.25) * bLen;
        const by = ey + (isDeadwood ? (1.2 + rand() * 1.1) : (-0.35 + rand() * 0.85)) * scale;
        const bz = cz + Math.sin(a + 0.25) * bLen;

        trunkMb.addTaperedTube([cx, cy, cz], [ex, ey, ez], r * 0.72, r * 0.36, 5, barkSwamp, 0.86, 0, 1.30);
        trunkMb.addTaperedTube([ex, ey, ez], [bx, by, bz], r * 0.36, r * 0.11, 5, barkSwamp, 0.86, 0, 1.30);

        // Crooked bare secondary deadwood twig
        const twA = a + (i % 2 === 0 ? 0.75 : -0.75);
        const tx = ex + Math.cos(twA) * bLen * 0.48;
        const ty = ey + (0.95 + rand() * 0.85) * scale;
        const tz = ez + Math.sin(twA) * bLen * 0.48;
        trunkMb.addTaperedTube([ex, ey, ez], [tx, ty, tz], r * 0.26, r * 0.06, 4, barkSwamp, 0.88, 0, 1.30);

        if (!isDeadwood) {
          // Sparse drooping misty celadon-olive weeping willow foliage curtains!
          const wR = (1.65 + rand() * 0.95) * scale;
          const tint = (rand() - 0.5) * 0.04;
          pushFoliageCluster(bx, by - 0.65 * scale, bz, wR * 0.78, wR * 1.32, wR * 0.78, 0.22 + tint, 0.36 + tint, 0.23 + tint * 0.5);
          pushFoliageCluster(
            (ex + bx) * 0.5, (ey + by) * 0.5 + 0.35 * scale, (ez + bz) * 0.5,
            wR * 0.92, wR * 0.88, wR * 0.92,
            0.30 + tint, 0.44 + tint, 0.29 + tint * 0.5
          );
        } else if (i % 2 === 0 && rand() < 0.45) {
          // Sparse weathered hanging Spanish-moss tuft on gnarled deadwood
          const mR = (0.95 + rand() * 0.55) * scale;
          pushFoliageCluster(bx, by - 0.35 * scale, bz, mR * 0.62, mR * 1.15, mR * 0.62, 0.32, 0.40, 0.31);
        }
      }
      if (!isDeadwood) {
        const topR = 2.0 * scale;
        pushFoliageCluster(cx, cy + 2.4 * scale, cz, topR, topR * 0.86, topR, 0.34, 0.48, 0.31);
      }
    }

    // Curated hero gnarled willows & ancient deadwood framing the 沉烟迷泽 boardwalks & shoals
    for (const [wx, wz, sc, dead] of [
      [252, 1882, 1.36, false],
      [398, 2035, 1.44, false],
      [446, 2075, 1.25, true],
      [622, 2248, 1.52, false],
      [668, 2205, 1.32, true],
      [848, 2376, 1.46, false],
      [888, 2345, 1.28, true],
      [576, 2475, 1.42, false],
      [615, 2505, 1.30, true],
    ]) {
      const wy = T.getTerrainHeight(wx, wz);
      addSwampWillowTree(wx, wy, wz, sc, dead);
    }

    // ~155 natural gnarled marsh willows & deadwood trees across the expanded 沉烟迷泽 shoals & low earth hummocks
    let placedSwamp = 0;
    let swTries = 0;
    while (placedSwamp < 155 && swTries < 2400) {
      swTries++;
      const x = 60 + rand() * 3480;
      const z = 1360 + rand() * 2240;
      if (T.getSwampMask(x, z) < 0.25) continue;
      // Keep central stele dais clear
      if (Math.hypot(x - 645, z - 2225) < 16) continue;
      const y = T.getTerrainHeight(x, z);
      // Rooted on muddy shoals, shallow edges & low hummocks (y = 5.9..14.8)
      if (y < T.SWAMP_WATER_Y - 0.55 || y > 15.2) continue;
      const sc = 0.92 + rand() * 0.72;
      const isDead = rand() < 0.38;
      addSwampWillowTree(x, y, z, sc, isDead);
      placedSwamp++;
    }

    // C2) 沉烟迷泽 Mossy Fallen Rotting Logs & Half-Submerged Driftwood (覆苔朽木与半沉枯干 — 3-point contour-hugging, ZERO floating!)
    let placedLogs = 0, logTries = 0;
    while (placedLogs < 95 && logTries < 2200) {
      logTries++;
      const lx = 120 + rand() * 3380;
      const lz = 1400 + rand() * 2140;
      if (T.getSwampMask(lx, lz) < 0.24) continue;
      if (Math.hypot(lx - 645, lz - 2225) < 16) continue;
      const ly = T.getMeshTerrainHeight(lx, lz);
      if (ly < T.SWAMP_WATER_Y - 0.55 || ly > T.SWAMP_WATER_Y + 4.2) continue;

      const ang = rand() * Math.PI * 2;
      const len = 3.2 + rand() * 4.4;
      const rad = 0.26 + rand() * 0.26;
      const x1 = lx + Math.cos(ang) * len;
      const z1 = lz + Math.sin(ang) * len;
      const mx = (lx + x1) * 0.5, mz = (lz + z1) * 0.5;
      const ym = T.getMeshTerrainHeight(mx, mz);
      const y1 = T.getMeshTerrainHeight(x1, z1);
      if (Math.abs(y1 - ly) > len * 0.28) continue;
      const col = rand() < 0.65 ? barkSwampMoss : barkSwamp;
      trunkMb.addTubeChain(
        [[lx, ly + rad * 0.16, lz], [mx, ym + rad * 0.14, mz], [x1, y1 + rad * 0.10, z1]],
        [rad, rad * 0.82, rad * 0.58],
        6, col, 0.88, 0, 1.30, true
      );
      if (collisionWorld && rad >= 0.25) {
        collisionWorld.addBox(mx, ym + rad * 0.20, mz, rad * 1.65, rad * 1.25, len * 0.88, Math.atan2(x1 - lx, z1 - lz), 'tree', true);
      }
      // 1-2 short broken rotting branch stubs rising off the fallen log
      const stubs = 1 + (rand() < 0.5 ? 1 : 0);
      for (let s = 0; s < stubs; s++) {
        const st = 0.3 + rand() * 0.45;
        const sx = M.lerp(lx, x1, st), sz = M.lerp(lz, z1, st);
        const sy = T.getMeshTerrainHeight(sx, sz) + rad * 0.18;
        const sa = ang + (s === 0 ? 0.9 : -0.9) + (rand() - 0.5) * 0.4;
        const sl = 0.9 + rand() * 1.2;
        trunkMb.addTaperedTube([sx, sy, sz], [sx + Math.cos(sa) * sl, sy + 0.55 + rand() * 0.75, sz + Math.sin(sa) * sl], rad * 0.42, rad * 0.14, 4, barkSwamp, 0.88, 0, 1.30);
      }
      placedLogs++;
    }

    // D) 残阵古道 Arid Deadwood Trees (枯木) & Gnarled Old Shrubs (盘曲老灌木) — clustered naturally along ruined road & slopes!
    const barkDry = [0.35, 0.30, 0.24];
    const barkDryDark = [0.25, 0.21, 0.17];

    function addAridDeadwoodTree(x, y, z, scale) {
      const h = (5.4 + rand() * 3.4) * scale;
      const leanA = rand() * Math.PI * 2;
      const lean = 0.30 + rand() * 0.32;
      let cx = x, cy = y - 0.5, cz = z;
      let r = 0.46 * scale;

      if (collisionWorld) {
        collisionWorld.addCylinder(x, y - 0.5, z, Math.max(0.46, 0.48 * scale), h * 0.82, 'tree', false);
      }
      addRootButtresses(x, y, z, r * 0.95, barkDryDark, scale * 0.9);

      const segs = 4;
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        const segH = (h * 0.65) / segs;
        const tw = leanA + Math.sin(t * Math.PI * 1.5) * 0.85;
        const nx = cx + Math.cos(tw) * lean * segH;
        const ny = cy + segH;
        const nz = cz + Math.sin(tw) * lean * segH;
        const nextR = r * 0.75;
        trunkMb.addTaperedTube([cx, cy, cz], [nx, ny, nz], r, nextR, 6, i === 0 ? barkDryDark : barkDry, 0.90, 0, 1.30);
        cx = nx; cy = ny; cz = nz;
        r = nextR;
      }

      // 4 stark twisted bare branches reaching jaggedly outward
      const bCount = 3 + ((rand() * 2) | 0);
      for (let i = 0; i < bCount; i++) {
        const a = (i / bCount) * Math.PI * 2 + (rand() - 0.5) * 0.65;
        const bLen = (2.2 + rand() * 1.8) * scale;
        const ex = cx + Math.cos(a) * bLen * 0.52;
        const ey = cy + (0.85 + rand() * 0.95) * scale;
        const ez = cz + Math.sin(a) * bLen * 0.52;
        const bx = cx + Math.cos(a + 0.32) * bLen;
        const by = ey + (0.95 + rand() * 1.15) * scale;
        const bz = cz + Math.sin(a + 0.32) * bLen;
        trunkMb.addTaperedTube([cx, cy, cz], [ex, ey, ez], r * 0.76, r * 0.36, 5, barkDry, 0.90, 0, 1.30);
        trunkMb.addTaperedTube([ex, ey, ez], [bx, by, bz], r * 0.36, r * 0.10, 4, barkDry, 0.90, 0, 1.30);
        if (i === 0 && rand() < 0.24) {
          // Occasional sparse surviving withered autumn-olive twig tuft on ~24% of ancient deadwoods
          const sr = (0.95 + rand() * 0.45) * scale;
          pushFoliageCluster(bx, by + 0.2 * scale, bz, sr, sr * 0.65, sr, 0.46, 0.42, 0.21);
        }
      }
    }

    function addGnarledShrub(x, y, z, scale) {
      const baseY = T.getMeshFootHeight(x, z, 0.65 * scale) - 0.22;
      const stems = 3 + ((rand() * 3) | 0);
      for (let i = 0; i < stems; i++) {
        const a = (i / stems) * Math.PI * 2 + (rand() - 0.5) * 0.7;
        const len = (1.1 + rand() * 1.15) * scale;
        const h = (0.75 + rand() * 0.85) * scale;
        const mx = x + Math.cos(a) * len * 0.52;
        const my = baseY + h * 0.55;
        const mz = z + Math.sin(a) * len * 0.52;
        const ex = x + Math.cos(a + 0.35) * len;
        const ey = baseY + h;
        const ez = z + Math.sin(a + 0.35) * len;
        trunkMb.addTubeChain([[x, baseY, z], [mx, my, mz], [ex, ey, ez]], [0.14 * scale, 0.08 * scale, 0.03 * scale], 4, barkDryDark, 0.90, 0, 1.30, false);
        if (rand() < 0.72) {
          const fr = (0.68 + rand() * 0.52) * scale;
          const dryShift = (rand() - 0.5) * 0.05;
          pushFoliageCluster(ex, ey + 0.18 * scale, ez, fr, fr * 0.62, fr, 0.38 + dryShift, 0.39 + dryShift, 0.20);
        }
      }
    }

    // Curated natural ruin vegetation clusters framing extended 残阵古道 bends, pillars, large ruins & mountain-foot slopes!
    const ruinClusters = [
      [-2565, 1365, 1.25], [-2635, 1260, 1.10], [-2710, 1305, 1.18],
      [-2785, 1170, 1.30], [-2880, 1235, 1.15], [-2908, 1025, 1.22],
      [-3035, 1135, 1.12], [-3085,  975, 1.28], [-3165, 1045, 1.16],
      [-3215,  865, 1.22], [-3285,  940, 1.18], [-3345,  845, 1.32],
      [-3420,  795, 1.26], [-3355,  725, 1.18], [-3445,  735, 1.14],
      [-2725, 1130, 1.20], [-2905,  995, 1.22], [-3150,  880, 1.18],
      [-2645, 1415, 1.15], [-2875, 1315, 1.20], [-3185, 1125, 1.15],
      // Extended forward segment clusters (WP 6 -> WP 9 & framing Large Ruin #2!)
      [-3475,  645, 1.24], [-3555,  665, 1.18], [-3545,  545, 1.28],
      [-3575,  385, 1.22], [-3685,  495, 1.26], [-3745,  395, 1.24],
      [-3845,  345, 1.30], [-3785,  255, 1.22], [-3865,  265, 1.18],
    ];
    for (const [cx, cz, cScale] of ruinClusters) {
      const cy = T.getTerrainHeight(cx, cz);
      // 1-2 stark deadwood trees per organic cluster
      const deadN = 1 + (rand() < 0.55 ? 1 : 0);
      for (let d = 0; d < deadN; d++) {
        const da = rand() * Math.PI * 2;
        const dd = d === 0 ? 0.0 : (4.5 + rand() * 8.5);
        const tx = cx + Math.cos(da) * dd;
        const tz = cz + Math.sin(da) * dd;
        const rp = T.getAncientRoadPathInfo(tx, tz);
        if (rp.roadMask > 0.35 || rp.altarMask > 0.18) continue;
        addAridDeadwoodTree(tx, T.getTerrainHeight(tx, tz), tz, cScale * (0.85 + rand() * 0.42));
      }
      // 2-4 gnarled low shrubs nestled nearby around boulders & pillar bases
      const shN = 2 + ((rand() * 3) | 0);
      for (let s = 0; s < shN; s++) {
        const sa = rand() * Math.PI * 2;
        const sd = 2.8 + rand() * 14.0;
        const sx = cx + Math.cos(sa) * sd;
        const sz = cz + Math.sin(sa) * sd;
        const rp = T.getAncientRoadPathInfo(sx, sz);
        if (rp.roadMask > 0.52 || rp.altarMask > 0.25) continue;
        addGnarledShrub(sx, T.getTerrainHeight(sx, sz), sz, 0.85 + rand() * 0.65);
      }
      // Paired weathered scree rocks right inside the cluster
      const ra = rand() * Math.PI * 2;
      const rx = cx + Math.cos(ra) * (3.5 + rand() * 6.5);
      const rz = cz + Math.sin(ra) * (3.5 + rand() * 6.5);
      const rpRock = T.getAncientRoadPathInfo(rx, rz);
      if (rpRock.altarMask < 0.20) {
        const sc = 1.2 + rand() * 1.8;
        const sy = sc * 0.62;
        const by = T.getMeshFootHeight(rx, rz, sc * 0.75) + sy * 0.08;
        groveBoulders.push(rx, by, rz, rand() * 6.283185, sc, sy, sc * 0.9, rand());
        if (collisionWorld) {
          collisionWorld.addCylinder(rx, by - sy * 0.6, rz, sc * 0.86, sy * 1.48, 'rock', sy < 1.85);
        }
      }
    }

    // Sparse extra organic dry shrubs & deadwood pockets across the wider extended 残阵古道 barren slopes (~56 clusters)
    let placedRuin = 0, ruinTries = 0;
    while (placedRuin < 56 && ruinTries < 1400) {
      ruinTries++;
      const gx = -4180 + rand() * 1840;
      const gz = 80 + rand() * 1540;
      if (T.getAncientRoadMask(gx, gz) < 0.28) continue;
      const rp = T.getAncientRoadPathInfo(gx, gz);
      if (rp.roadMask > 0.28 || rp.altarMask > 0.18) continue;
      const gy = T.getTerrainHeight(gx, gz);
      T.getTerrainNormal(gx, gz, nrm);
      if (nrm[1] < 0.72 || gy > 125) continue;
      if (rand() < 0.45) {
        addAridDeadwoodTree(gx, gy, gz, 0.82 + rand() * 0.62);
      }
      const shCount = 2 + ((rand() * 2) | 0);
      for (let k = 0; k < shCount; k++) {
        const ka = rand() * Math.PI * 2;
        const kd = 2.0 + rand() * 8.5;
        const kx = gx + Math.cos(ka) * kd;
        const kz = gz + Math.sin(ka) * kd;
        if (T.getAncientRoadPathInfo(kx, kz).altarMask > 0.22) continue;
        addGnarledShrub(kx, T.getTerrainHeight(kx, kz), kz, 0.75 + rand() * 0.65);
      }
      placedRuin++;
    }

    // E) 通天灵木林 Towering Primeval Spirit Trees (参天巨木 36m..82m!) + Graduated Perimeter Trees & Understory Shrubs!
    const barkSpirit = [0.27, 0.21, 0.16];
    const barkSpiritMoss = [0.18, 0.24, 0.16];
    const spiritVeinCyan = [0.28, 0.88, 0.78];
    const spiritVeinGold = [0.92, 0.80, 0.44];

    function addSkywardSpiritTree(x, y, z, scale, hasSpiritVeins = true, isMother = false) {
      const h = (isMother ? (68.0 + rand() * 14.0) : (38.0 + rand() * 24.0)) * scale;
      const rBase = (isMother ? 3.85 : (2.15 + rand() * 0.95)) * scale;
      const leanA = rand() * Math.PI * 2;
      const leanAmt = isMother ? 0.06 : (0.05 + rand() * 0.08);
      const isGoldSpirit = rand() < 0.34;
      const veinCol = isGoldSpirit ? spiritVeinGold : spiritVeinCyan;

      if (collisionWorld) {
        // Tapered trunk collider matches trunk silhouette accurately at ground AND mid-air flight!
        collisionWorld.addCylinder(x, y - 1.5, z, Math.max(1.8, rBase * 0.94), h * 0.80, 'tree', false, Math.max(0.65, rBase * 0.34));
      }

      // 6-segment continuous monumental trunk via parallel-transport tube chain (sunk firmly below lowest foot height -> ZERO floating!)
      const footY = T.getMeshFootHeight(x, z, rBase * 0.95);
      const segs = 6;
      const trunkPts = [[x, footY - 2.2, z]];
      const trunkRads = [rBase * 1.12];
      const trunkCols = [barkSpiritMoss];
      let cx = x, cy = footY - 2.2, cz = z;
      let r = rBase;
      const tierPoints = [];
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        const segH = h / segs;
        const curveA = leanA + Math.sin(t * Math.PI * 1.2) * 0.55;
        cx += Math.cos(curveA) * leanAmt * segH;
        cy += segH;
        cz += Math.sin(curveA) * leanAmt * segH;
        r *= (i < 2 ? 0.84 : 0.80);
        trunkPts.push([cx, cy, cz]);
        trunkRads.push(r);
        trunkCols.push(i < 2 ? barkSpiritMoss : barkSpirit);
        if (i === 2 || i === 3 || i === 4) {
          tierPoints.push({ x: cx, y: cy, z: cz, r, segH, tier: i - 2 });
        }
      }
      trunkMb.addTubeChain(trunkPts, trunkRads, 8, trunkCols, 0.86, 0, 1.30, true);

      // Subtle continuous luminous bark vein ribbon hugging slightly outside the trunk (no Z-fighting!)
      if (hasSpiritVeins) {
        const veinPts = [];
        const veinRads = [];
        for (let i = 1; i <= 4; i++) {
          const va = leanA + i * 1.45;
          const p = trunkPts[i];
          const vr = trunkRads[i] * 1.035;
          veinPts.push([p[0] + Math.cos(va) * vr, p[1], p[2] + Math.sin(va) * vr]);
          veinRads.push(Math.max(0.06, trunkRads[i] * 0.055));
        }
        trunkMb.addTubeChain(veinPts, veinRads, 4, veinCol, 0.34, 0.82, 2.0, true);
      }

      // 6-7 smoothly curved continuous buttress roots emerging cleanly from staggered heights inside the flared trunk wall (ZERO root fighting!)
      const rootCount = isMother ? 7 : 6;
      for (let rr = 0; rr < rootCount; rr++) {
        const ra = (rr / rootCount) * Math.PI * 2 + (rand() - 0.5) * 0.24;
        const reach = rBase * (2.85 + rand() * 1.25);
        const startY = y + ((isMother ? 5.8 : 3.8) + ((rr % 3) - 1) * 0.55) * scale;
        const rootR0 = rBase * 0.34; // Stays cleanly narrower than trunk sector so adjacent roots never collide!
        const startX = x + Math.cos(ra) * (rBase * 0.52);
        const startZ = z + Math.sin(ra) * (rBase * 0.52);
        const knee1X = x + Math.cos(ra) * (rBase * 1.25);
        const knee1Y = y + (isMother ? 3.2 : 2.1) * scale;
        const knee1Z = z + Math.sin(ra) * (rBase * 1.25);
        const midX = x + Math.cos(ra) * reach * 0.58;
        const midY = y + (isMother ? 1.5 : 0.95) * scale;
        const midZ = z + Math.sin(ra) * reach * 0.58;
        const endX = x + Math.cos(ra) * reach;
        const endZ = z + Math.sin(ra) * reach;
        const endY = T.getMeshTerrainHeight(endX, endZ) - 1.8 * scale;
        trunkMb.addTubeChain(
          [[startX, startY, startZ], [knee1X, knee1Y, knee1Z], [midX, midY, midZ], [endX, endY, endZ]],
          [rootR0, rootR0 * 0.78, rootR0 * 0.54, rootR0 * 0.22],
          5, barkSpiritMoss, 0.88, 0, 1.30, true
        );
        // Solid step-friendly root-arch collider so players physically feel massive flared roots!
        if (collisionWorld && rBase >= 2.2) {
          collisionWorld.addCylinder(midX, y - 0.8, midZ, rBase * 0.34, Math.max(1.5, (midY - y) + 0.8), 'tree', true, rBase * 0.22);
        }
      }

      // 3 distinct vertical branching strata: continuous curved boughs staggered vertically & inset cleanly into trunk wall (ZERO branch fighting!)
      for (const tp of tierPoints) {
        const bCount = tp.tier === 0 ? 4 : (tp.tier === 1 ? 5 : 4);
        const reachScale = tp.tier === 0 ? 0.30 : (tp.tier === 1 ? 0.34 : 0.25);
        for (let b = 0; b < bCount; b++) {
          const ba = (b / bCount) * Math.PI * 2 + tp.tier * 0.65 + (rand() - 0.5) * 0.32;
          const bLen = h * reachScale * (0.85 + rand() * 0.32);
          // Stagger each branch vertically along the trunk node so adjacent branches NEVER overlap at a single Y point!
          const yStagger = ((b / Math.max(1, bCount - 1)) - 0.5) * Math.min(tp.segH * 0.52, tp.r * 2.2);
          const sy = tp.y + yStagger;
          const sx = tp.x + Math.cos(ba) * (tp.r * 0.38);
          const sz = tp.z + Math.sin(ba) * (tp.r * 0.38);
          const qx = tp.x + Math.cos(ba) * bLen * 0.30;
          const qy = sy + bLen * 0.08;
          const qz = tp.z + Math.sin(ba) * bLen * 0.30;
          const mx = tp.x + Math.cos(ba + 0.08) * bLen * 0.62;
          const my = sy + bLen * (0.16 + rand() * 0.08);
          const mz = tp.z + Math.sin(ba + 0.08) * bLen * 0.62;
          const ex = tp.x + Math.cos(ba + 0.18) * bLen;
          const ey = my + bLen * (0.16 + rand() * 0.12);
          const ez = tp.z + Math.sin(ba + 0.18) * bLen;

          const br0 = tp.r * 0.46;
          trunkMb.addTubeChain(
            [[sx, sy, sz], [qx, qy, qz], [mx, my, mz], [ex, ey, ez]],
            [br0, br0 * 0.72, br0 * 0.48, br0 * 0.22],
            5, barkSpirit, 0.86, 0, 1.30, true
          );

          // Lush overarching cathedral foliage clusters (reuses single instanced canopy draw call!)
          const cR = (isMother ? 6.8 : 4.8) * scale * (0.85 + rand() * 0.35);
          const gVar = (rand() - 0.5) * 0.04;
          // Deep emerald shade near mid-bough
          pushFoliageCluster(mx, my + cR * 0.42, mz, cR * 0.95, cR * 0.62, cR * 0.95, 0.08 + gVar, 0.30 + gVar, 0.19);
          // Main broad jade canopy crown at bough tip
          pushFoliageCluster(ex, ey + cR * 0.38, ez, cR * 1.15, cR * 0.68, cR * 1.15, 0.13 + gVar, 0.42 + tp.tier * 0.05 + gVar, 0.25);

          // Selective subtle glowing cyan-jade or pale-gold spirit foliage accents on outer sunlit boughs!
          if (hasSpiritVeins && ((b + tp.tier) % 2 === 0)) {
            const spCol = isGoldSpirit ? [0.84, 0.76, 0.38] : [0.22, 0.76, 0.66];
            pushFoliageCluster(
              ex + Math.cos(ba) * cR * 0.45, ey + cR * 0.72, ez + Math.sin(ba) * cR * 0.45,
              cR * 0.72, cR * 0.52, cR * 0.72,
              spCol[0], spCol[1], spCol[2]
            );
            // Delicate hanging luminous spirit-vine tendril drooping gently beneath lower-tier hero boughs!
            if (tp.tier === 0 && (isMother || rand() < 0.35)) {
              const vLen = (5.5 + rand() * 6.5) * scale;
              trunkMb.addTubeChain([[mx, my - 0.5, mz], [mx, my - vLen, mz]], [0.10, 0.03], 3, veinCol, 0.32, 0.85, 2.0, false);
            }
          }
        }
      }

      // Monumental multi-dome summit canopy soaring against the sky!
      const topR = (isMother ? 8.6 : 6.0) * scale;
      pushFoliageCluster(cx, cy + topR * 0.48, cz, topR * 1.25, topR * 0.78, topR * 1.25, 0.16, 0.48, 0.28);
      if (hasSpiritVeins) {
        const spTop = isGoldSpirit ? [0.86, 0.78, 0.40] : [0.26, 0.80, 0.70];
        pushFoliageCluster(cx, cy + topR * 0.92, cz, topR * 0.82, topR * 0.58, topR * 0.82, spTop[0], spTop[1], spTop[2]);
      }
    }

    function addForestUnderstoryShrub(x, y, z, scale) {
      const baseY = T.getMeshFootHeight(x, z, 0.70 * scale) - 0.25;
      const stems = 3 + ((rand() * 2) | 0);
      for (let i = 0; i < stems; i++) {
        const a = (i / stems) * Math.PI * 2 + rand() * 0.7;
        const len = (1.3 + rand() * 1.1) * scale;
        const hh = (1.1 + rand() * 0.9) * scale;
        const ex = x + Math.cos(a) * len, ey = baseY + hh, ez = z + Math.sin(a) * len;
        trunkMb.addTaperedTube([x, baseY, z], [ex, ey, ez], 0.15 * scale, 0.05 * scale, 4, barkSpiritMoss, 0.88, 0, 1.30);
        const fr = (0.95 + rand() * 0.55) * scale;
        pushFoliageCluster(ex, ey + 0.25 * scale, ez, fr, fr * 0.68, fr, 0.12 + rand() * 0.06, 0.38 + rand() * 0.08, 0.22);
      }
    }

    // 0) ONE COLOSSAL SKY-PIERCING BLUE-AURA WORLD TREE LANDMARK RIGHT IN THE CENTER OF 通天灵木林 (-3520, -1720)!
    // ~445m tall, ~26m trunk radius, ~155m canopy radius — unmistakable from miles away across the entire continent!
    function addColossalBlueWorldTree(x, y, z) {
      const totalH = 415.0; // trunk rises 415m -> crown tops ~460m high!
      const rBase = 26.0;
      const barkWorld = [0.24, 0.21, 0.19];
      const barkWorldMoss = [0.16, 0.25, 0.22];
      const spiritBlue = [0.18, 0.74, 1.00];
      const spiritCyan = [0.34, 0.90, 1.00];

      if (collisionWorld) {
        // Full-height stacked tapered colliders covering the 415m colossal World Tree trunk (solid on ground AND in flight!)
        collisionWorld.addCylinder(x, y - 4.0, z, rBase * 0.96, 150.0, 'tree', false, rBase * 0.64);
        collisionWorld.addCylinder(x, y + 146.0, z, rBase * 0.65, 145.0, 'tree', false, rBase * 0.44);
        collisionWorld.addCylinder(x, y + 290.0, z, rBase * 0.45, 130.0, 'tree', false, rBase * 0.28);
      }

      // 10-segment continuous gently-twisting World Tree trunk via parallel-transport tube chain (ZERO joint seams!)
      const segs = 10;
      const wtPts = [[x, y - 6.0, z]];
      const wtRads = [rBase * 1.10];
      const wtCols = [barkWorldMoss];
      let cx = x, cy = y - 6.0, cz = z;
      let r = rBase;
      const boughTiers = [];
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        const segH = totalH / segs;
        const curveA = 0.65 + Math.sin(t * Math.PI * 1.4) * 0.75;
        const sway = (i < 2) ? 0.04 : 0.07;
        cx += Math.cos(curveA) * sway * segH;
        cy += segH;
        cz += Math.sin(curveA) * sway * segH;
        r *= (i < 3 ? 0.88 : 0.86);
        wtPts.push([cx, cy, cz]);
        wtRads.push(r);
        wtCols.push(i < 2 ? barkWorldMoss : barkWorld);
        if (i === 4 || i === 6 || i === 7 || i === 8) {
          boughTiers.push({ x: cx, y: cy, z: cz, r, segH, tier: boughTiers.length });
        }
      }
      trunkMb.addTubeChain(wtPts, wtRads, 12, wtCols, 0.84, 0, 1.30, true);

      // 4 Smooth Continuous Spiral Luminous Sapphire-Blue Spirit Veins sitting slightly proud of the 415m trunk (ZERO Z-fighting!)
      for (let v = 0; v < 4; v++) {
        const vPts = [];
        const vRads = [];
        for (let i = 0; i <= segs; i++) {
          const va = v * (Math.PI * 0.5) + (i / segs) * Math.PI * 2.2;
          const p = wtPts[i];
          const vr = wtRads[i] * 1.03;
          vPts.push([p[0] + Math.cos(va) * vr, p[1], p[2] + Math.sin(va) * vr]);
          vRads.push(Math.max(0.65, wtRads[i] * 0.075));
        }
        trunkMb.addTubeChain(vPts, vRads, 5, v % 2 === 0 ? spiritBlue : spiritCyan, 0.22, 1.55, 2.0, true);
      }

      // 12 Seamless Continuous Arching Buttress Roots emerging cleanly from staggered heights inside trunk wall (ZERO root fighting!)
      for (let rr = 0; rr < 12; rr++) {
        const ra = (rr / 12) * Math.PI * 2 + (rand() - 0.5) * 0.14;
        const reach = 64.0 + rand() * 30.0;
        const startY = y + 40.0 + (rr % 3) * 6.5;
        const startX = x + Math.cos(ra) * (rBase * 0.58);
        const startZ = z + Math.sin(ra) * (rBase * 0.58);
        const kneeX = x + Math.cos(ra) * (rBase * 1.18);
        const kneeY = y + 24.0 + (rr % 2) * 3.5;
        const kneeZ = z + Math.sin(ra) * (rBase * 1.18);
        const midX = x + Math.cos(ra) * reach * 0.54;
        const midY = y + 11.0 + rand() * 4.5;
        const midZ = z + Math.sin(ra) * reach * 0.54;
        const endX = x + Math.cos(ra) * reach;
        const endZ = z + Math.sin(ra) * reach;
        const endY = T.getTerrainHeight(endX, endZ) - 5.0;
        trunkMb.addTubeChain(
          [[startX, startY, startZ], [kneeX, kneeY, kneeZ], [midX, midY, midZ], [endX, endY, endZ]],
          [6.8, 5.4, 3.8, 1.5],
          6, barkWorldMoss, 0.86, 0, 1.30, true
        );
        // Solid walkable-top colliders along the colossal buttress root legs!
        if (collisionWorld) {
          collisionWorld.addCylinder(midX, y - 2.0, midZ, 4.4, Math.max(4.0, midY - y + 1.5), 'tree', true, 3.2);
          const ox = M.lerp(midX, endX, 0.55), oz = M.lerp(midZ, endZ, 0.55);
          collisionWorld.addCylinder(ox, T.getTerrainHeight(ox, oz) - 1.5, oz, 2.8, 5.0, 'tree', true, 1.8);
        }
        // Glowing sapphire-blue spirit energy vein running along top ridge of every 2nd buttress root!
        if (rr % 2 === 0) {
          trunkMb.addTubeChain(
            [[kneeX, kneeY + 4.4, kneeZ], [midX, midY + 3.2, midZ], [M.lerp(midX, endX, 0.65), M.lerp(midY, endY, 0.65) + 2.2, M.lerp(midZ, endZ, 0.65)]],
            [1.05, 0.72, 0.38],
            4, spiritBlue, 0.24, 1.48, 2.0, true
          );
          // Towering glowing blue spirit crystal spire nestled beside root arch (with solid crystal collision!)
          const crx = x + Math.cos(ra + 0.22) * (rBase + 13.0);
          const crz = z + Math.sin(ra + 0.22) * (rBase + 13.0);
          const cry = T.getTerrainHeight(crx, crz);
          const cH = 12.0 + rand() * 7.0;
          trunkMb.addTubeChain([[crx, cry - 1.0, crz], [crx + Math.cos(ra) * 3.0, cry + cH, crz + Math.sin(ra) * 3.0]], [2.2, 0.15], 5, spiritCyan, 0.18, 1.65, 2.0, true);
          if (collisionWorld) {
            collisionWorld.addCylinder(crx, cry - 1.0, crz, 2.1, cH * 0.82, 'crystal', false, 0.45);
          }
        }
      }

      // 4 Monumental Sky-Canopy Branching Tiers: continuous curved boughs staggered vertically (ZERO branch fighting!)
      for (const tp of boughTiers) {
        const bCount = tp.tier === 0 ? 6 : (tp.tier === 1 ? 7 : (tp.tier === 2 ? 7 : 6));
        const reachBase = tp.tier === 0 ? 112.0 : (tp.tier === 1 ? 136.0 : (tp.tier === 2 ? 118.0 : 84.0));
        for (let b = 0; b < bCount; b++) {
          const ba = (b / bCount) * Math.PI * 2 + tp.tier * 0.52 + (rand() - 0.5) * 0.18;
          const bLen = reachBase * (0.88 + rand() * 0.24);
          const yStagger = ((b / Math.max(1, bCount - 1)) - 0.5) * Math.min(tp.segH * 0.58, tp.r * 1.8);
          const sy = tp.y + yStagger;
          const sx = tp.x + Math.cos(ba) * (tp.r * 0.42);
          const sz = tp.z + Math.sin(ba) * (tp.r * 0.42);
          const qx = tp.x + Math.cos(ba) * bLen * 0.28;
          const qy = sy + bLen * 0.06;
          const qz = tp.z + Math.sin(ba) * bLen * 0.28;
          const mx = tp.x + Math.cos(ba + 0.06) * bLen * 0.60;
          const my = sy + bLen * (0.14 + rand() * 0.07);
          const mz = tp.z + Math.sin(ba + 0.06) * bLen * 0.60;
          const ex = tp.x + Math.cos(ba + 0.14) * bLen;
          const ey = my + bLen * (0.14 + rand() * 0.09);
          const ez = tp.z + Math.sin(ba + 0.14) * bLen;

          const br0 = tp.r * 0.48;
          trunkMb.addTubeChain(
            [[sx, sy, sz], [qx, qy, qz], [mx, my, mz], [ex, ey, ez]],
            [br0, br0 * 0.72, br0 * 0.48, br0 * 0.22],
            6, barkWorld, 0.86, 0, 1.30, true
          );
          // Luminous blue vein ribbon tracing smoothly along underside of the bough (no trunk center overlap!)
          trunkMb.addTubeChain(
            [[qx, qy - br0 * 0.72, qz], [mx, my - br0 * 0.48, mz]],
            [0.65, 0.36],
            4, spiritBlue, 0.24, 1.38, 2.0, true
          );

          // Huge GPU-instanced multi-lobe canopy clouds forming a majestic glowing blue-jade World Tree crown!
          const cR = (tp.tier === 1 ? 34.0 : 28.0) * (0.86 + rand() * 0.28);
          // Deep shaded emerald-teal under-crown
          pushFoliageCluster(mx, my + cR * 0.35, mz, cR * 1.15, cR * 0.65, cR * 1.15, 0.09, 0.34, 0.32);
          // Radiant sapphire-azure & cyan-blue spirit foliage haloing every monumental bough (visible from miles away!)
          pushFoliageCluster(ex, ey + cR * 0.35, ez, cR * 1.28, cR * 0.72, cR * 1.28, 0.16, 0.66, 0.96);
          pushFoliageCluster(
            ex + Math.cos(ba) * cR * 0.42, ey + cR * 0.76, ez + Math.sin(ba) * cR * 0.42,
            cR * 0.86, cR * 0.56, cR * 0.86,
            0.30, 0.84, 1.00
          );
        }
      }

      // Colossal Sky-Crowning Luminous Blue-Jade Summit Dome (~455m altitude!)
      pushFoliageCluster(cx, cy + 16.0, cz, 56.0, 34.0, 56.0, 0.12, 0.50, 0.72);
      pushFoliageCluster(cx, cy + 36.0, cz, 44.0, 28.0, 44.0, 0.20, 0.74, 0.98);
      pushFoliageCluster(cx, cy + 52.0, cz, 30.0, 20.0, 30.0, 0.36, 0.88, 1.00);
    }

    const wtX = T.SPIRIT_FOREST.worldTreeX;
    const wtZ = T.SPIRIT_FOREST.worldTreeZ;
    addColossalBlueWorldTree(wtX, T.getTerrainHeight(wtX, wtZ), wtZ);

    // 1) 6 Surrounding Colossal Mother Spirit Trees (70m..84m!) + Curated Hero Giants framing the inner & expanded outer forest trails!
    const heroSpiritTrees = [
      [-4132,  -278, 1.08, true,  true ], // Inner Mother Spirit Tree towering over the first sanctuary glade!
      [-4015,  -545, 1.02, true,  true ], // Mid Skylight Mother Tree
      [-4235,  -790, 1.05, true,  true ], // Mid-North Ancient Mother Tree
      [-3880, -1320, 1.06, true,  true ], // Expanded Deep-North Crossing Mother Tree
      [-2840, -1580, 1.04, true,  true ], // Eastern Primeval Glade Mother Tree
      [-3460, -3080, 1.10, true,  true ], // Far-North Ancient Sanctuary Mother Tree
      [-3875,   125, 1.18, true,  false], // Forest Threshold Guardian Giant (Left)
      [-3935,   158, 1.12, true,  false], // Forest Threshold Guardian Giant (Right)
      [-3952,   -15, 1.24, true,  false],
      [-4022,   -72, 1.15, false, false],
      [-4065,  -210, 1.28, true,  false],
      [-4168,  -215, 1.20, false, false],
      [-4095,  -435, 1.25, true,  false],
      [-4175,  -635, 1.22, true,  false],
      [-3985, -1165, 1.24, true,  false],
      [-3140, -2185, 1.24, true,  false],
      [-3540, -2820, 1.26, true,  false],
    ];
    const giantPosList = [[wtX, wtZ]];
    for (const [tx, tz, sc, veins, mother] of heroSpiritTrees) {
      addSkywardSpiritTree(tx, T.getTerrainHeight(tx, tz), tz, sc, veins, mother);
      giantPosList.push([tx, tz]);
    }

    // 2) ~680 Ultra-Dense Deep-Forest Towering Spirit Giants across west-expanded 通天灵木林!
    let placedGiants = 0, giantTries = 0;
    while (placedGiants < 680 && giantTries < 24500) {
      giantTries++;
      const gx = -8120 + rand() * 7080;
      const gz = -4680 + rand() * 5020;
      if (T.getSpiritForestMask(gx, gz) < 0.30) continue;
      if (Math.hypot(gx - wtX, gz - wtZ) < 114.0) continue; // Keep monumental sanctuary clearing open around 450m World Tree!
      if (T.getSpiritForestTrailInfo(gx, gz).dist < 13.5) continue;
      const minGap = (gz < -1600 || gx > -2900 || gx < -5000) ? 34.0 : 26.5;
      let tooClose = false;
      for (let i = 0; i < giantPosList.length; i++) {
        if (Math.hypot(gx - giantPosList[i][0], gz - giantPosList[i][1]) < minGap) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      T.getTerrainNormal(gx, gz, nrm);
      if (nrm[1] < 0.72) continue;
      const gy = T.getTerrainHeight(gx, gz);
      addSkywardSpiritTree(gx, gy, gz, 0.86 + rand() * 0.60, rand() < 0.54, false);
      giantPosList.push([gx, gz]);
      placedGiants++;
    }

    // 3) Ultra-Dense Height-Transition Mid-Canopy Trees (~1,020 trees, 14m..24m) & Mossy Understory Shrubs (~780)
    let placedMid = 0, midTries = 0;
    while (placedMid < 1020 && midTries < 22000) {
      midTries++;
      const tx = -8140 + rand() * 7200;
      const tz = -4780 + rand() * 5240;
      const sm = T.getSpiritForestMask(tx, tz);
      if (sm < 0.14) continue;
      if (Math.hypot(tx - wtX, tz - wtZ) < 96.0) continue;
      if (T.getSpiritForestTrailInfo(tx, tz).dist < 8.5) continue;
      if (T.getAncientRoadPathInfo(tx, tz).roadMask > 0.25) continue;
      let nearGiant = false;
      for (let i = 0; i < giantPosList.length; i++) {
        if (Math.hypot(tx - giantPosList[i][0], tz - giantPosList[i][1]) < 8.8) {
          nearGiant = true;
          break;
        }
      }
      if (nearGiant) continue;
      T.getTerrainNormal(tx, tz, nrm);
      if (nrm[1] < 0.70) continue;
      const ty = T.getTerrainHeight(tx, tz);
      const sc = M.lerp(1.05, 2.02, sm) * (0.85 + rand() * 0.30);
      if (rand() < 0.58) addBroadleafTree(tx, ty, tz, sc);
      else addPineTree(tx, ty, tz, sc);
      placedMid++;
    }

    let placedShr = 0, shrTries = 0;
    while (placedShr < 780 && shrTries < 12800) {
      shrTries++;
      const sx = -8120 + rand() * 7120;
      const sz = -4720 + rand() * 5120;
      if (T.getSpiritForestMask(sx, sz) < 0.18) continue;
      if (Math.hypot(sx - wtX, sz - wtZ) < 42.0) continue;
      if (T.getSpiritForestTrailInfo(sx, sz).dist < 5.5) continue;
      const sy = T.getTerrainHeight(sx, sz);
      T.getTerrainNormal(sx, sz, nrm);
      if (nrm[1] < 0.72) continue;
      addForestUnderstoryShrub(sx, sy, sz, 0.90 + rand() * 0.80);
      placedShr++;
    }

    // 4) 通天灵木林 Rich Forest Floor Details: ~230 Mossy Fallen Ancient Logs (3-point terrain-hugging, ZERO floating!) & ~205 Glowing Spirit Mushroom Clusters!
    let placedSfLogs = 0, sfLogTries = 0;
    while (placedSfLogs < 230 && sfLogTries < 4800) {
      sfLogTries++;
      const lx = -8100 + rand() * 7080;
      const lz = -4680 + rand() * 5000;
      if (T.getSpiritForestMask(lx, lz) < 0.28) continue;
      if (Math.hypot(lx - wtX, lz - wtZ) < 58.0) continue;
      if (T.getSpiritForestTrailInfo(lx, lz).dist < 9.0) continue;
      const ang = rand() * Math.PI * 2;
      const len = 5.0 + rand() * 7.5;
      const rad = 0.55 + rand() * 0.58;
      const x1 = lx + Math.cos(ang) * len, z1 = lz + Math.sin(ang) * len;
      const mx = (lx + x1) * 0.5, mz = (lz + z1) * 0.5;
      const ly = T.getMeshTerrainHeight(lx, lz);
      const ym = T.getMeshTerrainHeight(mx, mz);
      const y1 = T.getMeshTerrainHeight(x1, z1);
      if (Math.abs(y1 - ly) > len * 0.28 || Math.abs(ym - (ly + y1) * 0.5) > 1.2) continue;
      trunkMb.addTubeChain(
        [[lx, ly + rad * 0.16, lz], [mx, ym + rad * 0.14, mz], [x1, y1 + rad * 0.10, z1]],
        [rad, rad * 0.84, rad * 0.62],
        6, barkSpiritMoss, 0.88, 0, 1.30, true
      );
      if (collisionWorld && rad >= 0.35) {
        collisionWorld.addBox(mx, ym + rad * 0.20, mz, rad * 1.70, rad * 1.25, len * 0.90, Math.atan2(x1 - lx, z1 - lz), 'tree', true);
      }
      placedSfLogs++;
    }

    const fStem = [0.78, 0.82, 0.80];
    const fGlowCyan = [0.26, 0.90, 0.86];
    const fGlowGold = [0.92, 0.82, 0.42];
    let placedSfMush = 0, sfMushTries = 0;
    while (placedSfMush < 205 && sfMushTries < 3600) {
      sfMushTries++;
      const fx = -8100 + rand() * 7080;
      const fz = -4680 + rand() * 5000;
      if (T.getSpiritForestMask(fx, fz) < 0.25) continue;
      if (T.getSpiritForestTrailInfo(fx, fz).dist < 5.0) continue;
      const isGold = rand() < 0.35;
      const caps = 3 + ((rand() * 3) | 0);
      for (let c = 0; c < caps; c++) {
        const ca = rand() * Math.PI * 2;
        const cd = c === 0 ? 0.0 : (0.35 + rand() * 1.25);
        const mx = fx + Math.cos(ca) * cd, mz = fz + Math.sin(ca) * cd;
        const my = T.getMeshTerrainHeight(mx, mz);
        const sc = c === 0 ? 0.58 : (0.28 + rand() * 0.32);
        const stH = sc * (1.35 + rand() * 0.7);
        trunkMb.addCylinder(mx, my - 0.16, mz, sc * 0.22, sc * 0.15, stH, 5, fStem, 0.65, 0.12, 1.0, false, false);
        trunkMb.addCylinder(mx, my + stH - 0.18, mz, sc * 0.88, sc * 0.14, sc * 0.38, 6, isGold ? fGlowGold : fGlowCyan, 0.36, 0.92, 2.0, true, false);
      }
      placedSfMush++;
    }

    // F) 云雾山 Hardy Wind-Sculpted Highland Pines (~190 pines on lower-mid 7-tier alpine slopes, y=42..460m!)
    const cm = T.CLOUD_MOUNTAIN;
    let placedMtnPines = 0, mtnPineTries = 0;
    while (placedMtnPines < 190 && mtnPineTries < 4800) {
      mtnPineTries++;
      const px = 620 + rand() * 4120;
      const pz = 3140 + rand() * 1860;
      if (T.getCloudMountainMask(px, pz) < 0.20) continue;
      if (Math.hypot((px - cm.cx) * cm.scaleX, (pz - cm.cz) * cm.scaleZ) < 182.0) continue; // Keep 760m summit plateau open!
      if (T.getCloudMountainPathInfo(px, pz).dist < 32.0) continue; // Keep wide spiral road unobstructed!
      let inTerrace = false;
      for (const tc of cm.terraces) {
        if (Math.hypot(px - tc.x, pz - tc.z) < tc.r * 0.74) { inTerrace = true; break; }
      }
      if (inTerrace) continue;
      const py = T.getTerrainHeight(px, pz);
      if (py < 42.0 || py > 465.0) continue;
      T.getTerrainNormal(px, pz, nrm);
      if (nrm[1] < 0.74) continue;
      const sc = M.lerp(1.26, 0.74, M.smoothstep(80, 450, py)) * (0.85 + rand() * 0.35);
      addPineTree(px, T.getMeshFootHeight(px, pz, 0.85 * sc), pz, sc);
      placedMtnPines++;
    }

    // G) 流沙荒漠 Ultra-Sparse Drought Camelthorn & Withered Scrub (~94 tiny dry bushes ONLY in leeward hollows & ruin/rock bases across expanded desert!)
    const desertBark = [0.42, 0.33, 0.22];
    function addCamelthornScrub(x, y, z, scale) {
      const baseY = T.getMeshFootHeight(x, z, 0.60 * scale) - 0.24;
      const stems = 3 + ((rand() * 2) | 0);
      for (let i = 0; i < stems; i++) {
        const a = (i / stems) * Math.PI * 2 + (rand() - 0.5) * 0.75;
        const len = (0.72 + rand() * 0.78) * scale;
        const hh = (0.48 + rand() * 0.58) * scale;
        const mx = x + Math.cos(a) * len * 0.55;
        const my = baseY + hh * 0.52;
        const mz = z + Math.sin(a) * len * 0.55;
        const ex = x + Math.cos(a + 0.30) * len;
        const ey = baseY + hh;
        const ez = z + Math.sin(a + 0.30) * len;
        trunkMb.addTubeChain([[x, baseY, z], [mx, my, mz], [ex, ey, ez]], [0.09 * scale, 0.05 * scale, 0.02 * scale], 4, desertBark, 0.92, 0, 1.30, false);
        if (rand() < 0.78) {
          const fr = (0.46 + rand() * 0.36) * scale;
          const dryShift = (rand() - 0.5) * 0.04;
          pushFoliageCluster(ex, ey + 0.12 * scale, ez, fr, fr * 0.58, fr, 0.49 + dryShift, 0.43 + dryShift, 0.22);
        }
      }
    }

    // Tuck 2-3 sparse dry camelthorn tufts right at the sheltered sand roots of each expanded desert ruin site
    for (const site of T.DESERT_DUNES.ruinSites) {
      for (let k = 0; k < 3; k++) {
        const a = rand() * Math.PI * 2;
        const d = 6.5 + rand() * 14.0;
        const sx = site.x + Math.cos(a) * d;
        const sz = site.z + Math.sin(a) * d;
        addCamelthornScrub(sx, T.getMeshTerrainHeight(sx, sz), sz, 0.78 + rand() * 0.52);
      }
    }
    // ~96 sparse camelthorn / dry scrub pockets strictly inside sheltered leeward dune hollows across west-expanded 流沙荒漠!
    let placedDesertScrub = 0, dsTries = 0;
    while (placedDesertScrub < 96 && dsTries < 4200) {
      dsTries++;
      const sx = -8980 + rand() * 4940;
      const sz = 1620 + rand() * 5580;
      if (T.getDesertMask(sx, sz) < 0.30) continue;
      // Only grow in sheltered leeward troughs (never uniformly across open sunlit sand crests!)
      if (T.getDesertDuneWave(sx, sz) > -0.22) continue;
      addCamelthornScrub(sx, T.getMeshTerrainHeight(sx, sz), sz, 0.70 + rand() * 0.62);
      placedDesertScrub++;
    }

    // H) 霜雪原 & 霜雪山 Abundant Snow-Draped Pines (~415 pines!) & Partially Snow-Covered Winter Shrubs (~340 shrubs!)
    // Note: CANOPY_FS naturally drapes crisp patchy snow across upper lobes of every pine bough & winter shrub while dark green needles show underneath!
    const fsN = T.FROST_SNOWFIELD;
    const fmN = T.FROST_MOUNTAIN;
    const barkFrost = [0.22, 0.24, 0.28];
    const barkFrostDark = [0.15, 0.17, 0.21];

    function addFrostPine(x, y, z, scale) {
      const h = (9.5 + rand() * 5.8) * scale;
      const r0 = 0.54 * scale;
      const leanA = rand() * Math.PI * 2;
      const lean = 0.14 + rand() * 0.20;
      if (collisionWorld) {
        collisionWorld.addCylinder(x, y - 0.8, z, Math.max(0.52, r0 * 1.05), h * 0.88, 'tree', false, r0 * 0.24);
      }
      const p0 = [x, y - 1.0, z];
      const p1 = [x + Math.cos(leanA) * lean * h * 0.35, y + h * 0.36, z + Math.sin(leanA) * lean * h * 0.35];
      const p2 = [p1[0] + Math.cos(leanA + 0.55) * lean * h * 0.32, y + h * 0.72, p1[2] + Math.sin(leanA + 0.55) * lean * h * 0.32];
      const p3 = [p2[0] + Math.cos(leanA + 0.9) * lean * h * 0.18, y + h, p2[2] + Math.sin(leanA + 0.9) * lean * h * 0.18];
      trunkMb.addTubeChain([p0, p1, p2, p3], [r0, r0 * 0.72, r0 * 0.44, r0 * 0.14], 6, [barkFrostDark, barkFrostDark, barkFrost, barkFrost], 0.86, 0, 1.30, true);

      // 4 spreading multi-tier evergreen boughs (deep dark pine foliage underneath, crisp snow blanketed on top by CANOPY_FS!)
      const boughStarts = [
        { p: p1, r: r0 * 0.44, len: 3.4 * scale, cR: 2.35 * scale },
        { p: [M.lerp(p1[0], p2[0], 0.55), M.lerp(p1[1], p2[1], 0.55), M.lerp(p1[2], p2[2], 0.55)], r: r0 * 0.36, len: 2.85 * scale, cR: 2.05 * scale },
        { p: p2, r: r0 * 0.28, len: 2.25 * scale, cR: 1.75 * scale },
      ];
      for (let t = 0; t < boughStarts.length; t++) {
        const bs = boughStarts[t];
        const bCount = t === 0 ? 4 : 3;
        for (let b = 0; b < bCount; b++) {
          const ba = leanA + t * 0.85 + (b / bCount) * Math.PI * 2 + (rand() - 0.5) * 0.35;
          const bx = bs.p[0] + Math.cos(ba) * bs.len;
          const by = bs.p[1] + (0.25 + rand() * 0.45) * scale;
          const bz = bs.p[2] + Math.sin(ba) * bs.len;
          trunkMb.addTubeChain([bs.p, [M.lerp(bs.p[0], bx, 0.55), bs.p[1] - 0.10 * scale, M.lerp(bs.p[2], bz, 0.55)], [bx, by, bz]], [bs.r, bs.r * 0.58, bs.r * 0.20], 4, barkFrost, 0.86, 0, 1.30, true);
          const gShift = (rand() - 0.5) * 0.03;
          pushFoliageCluster(bx, by + 0.35 * scale, bz, bs.cR, bs.cR * 0.64, bs.cR, 0.07 + gShift, 0.24 + gShift, 0.17);
        }
      }
      // Summit winter pine crown
      const topR = 2.05 * scale;
      pushFoliageCluster(p3[0], p3[1] + 0.35 * scale, p3[2], topR, topR * 0.82, topR, 0.09, 0.28, 0.19);
    }

    function addFrostShrub(x, y, z, scale) {
      const baseY = T.getMeshFootHeight(x, z, 0.68 * scale) - 0.24;
      const stems = 3 + ((rand() * 2) | 0);
      for (let i = 0; i < stems; i++) {
        const a = (i / stems) * Math.PI * 2 + (rand() - 0.5) * 0.65;
        const len = (0.95 + rand() * 0.95) * scale;
        const hh = (0.72 + rand() * 0.72) * scale;
        const mx = x + Math.cos(a) * len * 0.55, my = baseY + hh * 0.52, mz = z + Math.sin(a) * len * 0.55;
        const ex = x + Math.cos(a + 0.28) * len, ey = baseY + hh, ez = z + Math.sin(a + 0.28) * len;
        trunkMb.addTubeChain([[x, baseY, z], [mx, my, mz], [ex, ey, ez]], [0.12 * scale, 0.07 * scale, 0.03 * scale], 4, barkFrostDark, 0.90, 0, 1.30, false);
        const fr = (0.72 + rand() * 0.48) * scale;
        const isOlive = rand() < 0.38;
        pushFoliageCluster(ex, ey + 0.16 * scale, ez, fr, fr * 0.64, fr, isOlive ? 0.24 : 0.10, isOlive ? 0.31 : 0.26, isOlive ? 0.20 : 0.19);
      }
    }

    function isClearOfFrostMtnZones(x, z, roadPad = 32.0) {
      if (Math.hypot((x - fmN.cx) * fmN.scaleX, (z - fmN.cz) * fmN.scaleZ) < 156.0) return false;
      if (T.getFrostMountainPathInfo(x, z).dist < roadPad) return false;
      for (const tc of fmN.terraces) {
        if (Math.hypot(x - tc.x, z - tc.z) < tc.r * 0.75) return false;
      }
      return true;
    }

    // 1) ~410 Snow-Draped Pines clustered organically in winter groves across the expanded W/N/NE 霜雪原!
    let placedFrostPines = 0, fpTries = 0;
    while (placedFrostPines < 410 && fpTries < 7200) {
      fpTries++;
      const gx = -8260 + rand() * 12000;
      const gz = -9020 + rand() * 4760;
      if (T.getSnowfieldMask(gx, gz) < 0.18) continue;
      if (T.getFrostMountainMask(gx, gz) > 0.20) continue;
      if (Math.hypot(gx - fsN.pondX, gz - fsN.pondZ) < fsN.pondR + 48) continue;
      if (Math.hypot(gx + 4180, gz + 6080) < 38) continue;
      // Organic grove clustering so open snowy plains & crisp pine copses alternate naturally!
      const groveW = N.fbm2D(gx * 0.0022 + 2.4, gz * 0.0022 - 3.7, 3);
      if (groveW < -0.10 && rand() > 0.12) continue;
      const count = 3 + ((rand() * 4) | 0);
      for (let k = 0; k < count && placedFrostPines < 410; k++) {
        const a = rand() * Math.PI * 2;
        const d = k === 0 ? 0.0 : (5.5 + rand() * 24.0);
        const px = gx + Math.cos(a) * d, pz = gz + Math.sin(a) * d;
        if (T.getSnowfieldMask(px, pz) < 0.16 || T.getFrostMountainMask(px, pz) > 0.22) continue;
        if (Math.hypot(px - fsN.pondX, pz - fsN.pondZ) < fsN.pondR + 36) continue;
        T.getTerrainNormal(px, pz, nrm);
        if (nrm[1] < 0.75) continue;
        const sc = (k === 0 ? 1.18 : 0.80) + rand() * 0.56;
        addFrostPine(px, T.getMeshFootHeight(px, pz, 0.85 * sc), pz, sc);
        placedFrostPines++;
      }
    }

    // 2) ~95 Hardy Alpine Snow Pines climbing the lower-mid tiers of 霜雪山 (y = 95..430m, keeping terraces & spiral road clear!)
    let placedFmPines = 0, fmPineTries = 0;
    while (placedFmPines < 95 && fmPineTries < 3200) {
      fmPineTries++;
      const px = -2680 + rand() * 2400;
      const pz = -7840 + rand() * 1920;
      if (T.getFrostMountainMask(px, pz) < 0.20) continue;
      if (!isClearOfFrostMtnZones(px, pz, 30.0)) continue;
      const py = T.getMeshTerrainHeight(px, pz);
      if (py < 92.0 || py > 435.0) continue;
      T.getTerrainNormal(px, pz, nrm);
      if (nrm[1] < 0.74) continue;
      const sc = M.lerp(1.22, 0.72, M.smoothstep(100, 420, py)) * (0.84 + rand() * 0.36);
      addFrostPine(px, T.getMeshFootHeight(px, pz, 0.80 * sc), pz, sc);
      placedFmPines++;
    }

    // 3) ~430 Partially Snow-Covered Winter Shrubs across expanded W/N/NE 霜雪原 & lower 霜雪山 slopes!
    let placedFrostShrubs = 0, fsShrubTries = 0;
    while (placedFrostShrubs < 430 && fsShrubTries < 8200) {
      fsShrubTries++;
      const sx = -8260 + rand() * 12020;
      const sz = -9020 + rand() * 4780;
      const sm = T.getSnowfieldMask(sx, sz);
      const fmM = T.getFrostMountainMask(sx, sz);
      if (sm < 0.16 && fmM < 0.18) continue;
      if (Math.hypot(sx - fsN.pondX, sz - fsN.pondZ) < fsN.pondR + 24) continue;
      if (Math.hypot(sx + 4180, sz + 6080) < 26) continue;
      if (fmM > 0.15 && !isClearOfFrostMtnZones(sx, sz, 24.0)) continue;
      const sy = T.getMeshTerrainHeight(sx, sz);
      if (sy > 360.0) continue;
      T.getTerrainNormal(sx, sz, nrm);
      if (nrm[1] < 0.74) continue;
      addFrostShrub(sx, sy, sz, 0.82 + rand() * 0.72);
      placedFrostShrubs++;
    }

    // 10. 灵竹幽谷 Swaying Emerald-Jade Spirit Bamboo Leaf Canopies anchored directly onto every glowing bamboo crown!
    const bvCrowns = (XW.Landmarks && XW.Landmarks.getBambooCrowns) ? XW.Landmarks.getBambooCrowns() : [];
    for (let i = 0; i < bvCrowns.length; i++) {
      const c = bvCrowns[i];
      const sc = c.scale || 1.0;
      const gR = c.glow ? 0.24 : (0.14 + rand() * 0.08);
      const gG = c.glow ? 0.76 : (0.56 + rand() * 0.16);
      const gB = c.glow ? 0.56 : (0.24 + rand() * 0.10);
      pushFoliageCluster(c.x, c.y, c.z, 2.35 * sc, 0.95 * sc, 2.35 * sc, gR, gG, gB);
      const oa = rand() * Math.PI * 2;
      pushFoliageCluster(
        c.x + Math.cos(oa) * 1.15 * sc,
        c.y + 0.55 * sc,
        c.z + Math.sin(oa) * 1.15 * sc,
        1.75 * sc, 0.78 * sc, 1.75 * sc,
        gR + 0.04, Math.min(0.95, gG + 0.10), gB + 0.06
      );
    }

    // 11. 幽林秘岭 Ultra-Dense Towering Ancient Mountain Forest (密林参天古松/巨柏 22m..48m!)
    const hmN = T.HIDDEN_MOUNTAINS;
    if (hmN && T.getHiddenMountainsMask) {
      const barkDeepCedar = [0.22, 0.16, 0.12];
      const barkDeepMoss  = [0.16, 0.21, 0.14];

      // Tall soaring ancient mountain cedar / giant pine (22m..48m tall, sloped-cliff root anchoring, dense layered dark-emerald canopy!)
      function addToweringMountainCedar(x, y, z, scale) {
        const h = (19.5 + rand() * 12.5) * scale;
        const leanA = rand() * Math.PI * 2;
        const lean = 0.06 + rand() * 0.10;
        let cx = x, cy = y - 1.65 * scale, cz = z;
        let r = (0.78 + rand() * 0.22) * scale;

        if (collisionWorld) {
          collisionWorld.addCylinder(x, y - 1.8 * scale, z, Math.max(0.75, r * 0.92), h * 0.88, 'tree', false);
        }
        // 3 strong root buttresses gripping steep mountain slopes
        for (let rr = 0; rr < 3; rr++) {
          const ra = leanA + (rr / 3) * Math.PI * 2 + (rand() - 0.5) * 0.4;
          const rx = x + Math.cos(ra) * r * 2.6;
          const rz = z + Math.sin(ra) * r * 2.6;
          const ry = Math.min(y - 0.8 * scale, T.getMeshTerrainHeight(rx, rz) - 0.9 * scale);
          trunkMb.addTaperedTube([x, y + 0.8 * scale, z], [rx, ry, rz], r * 0.56, r * 0.16, 4, barkDeepMoss, 0.88, 0, 1.30);
        }

        const segs = 4;
        const segH = (h + 1.65 * scale) / segs;
        const shadeShift = (rand() - 0.5) * 0.035;
        for (let i = 0; i < segs; i++) {
          const t = (i + 1) / segs;
          const curveA = leanA + Math.sin(t * Math.PI * 1.3) * 0.45;
          const nx = cx + Math.cos(curveA) * lean * segH;
          const ny = cy + segH;
          const nz = cz + Math.sin(curveA) * lean * segH;
          const nextR = r * 0.72;
          trunkMb.addTaperedTube([cx, cy, cz], [nx, ny, nz], r, nextR, 6, i === 0 ? barkDeepMoss : barkDeepCedar, 0.86, 0, 1.30);
          cx = nx; cy = ny; cz = nz;
          r = nextR;

          // Layered dense sweeping cedar boughs & lush deep-pine foliage whorls on upper 75% of trunk
          if (i >= 1) {
            const tierFrac = (i - 1) / (segs - 1); // 0 -> 1 bottom-to-top
            const boughs = i === 1 ? 3 : 2;
            for (let b = 0; b < boughs; b++) {
              const ba = leanA + i * 2.15 + (b / boughs) * Math.PI * 2 + (rand() - 0.5) * 0.5;
              const bLen = (4.8 - tierFrac * 1.6 + rand() * 1.4) * scale;
              const bx = cx + Math.cos(ba) * bLen;
              const by = cy + (0.35 - (1.0 - tierFrac) * 0.55) * scale;
              const bz = cz + Math.sin(ba) * bLen;
              trunkMb.addTaperedTube([cx, cy, cz], [bx, by, bz], r * 0.68, r * 0.18, 4, barkDeepCedar, 0.86, 0, 1.30);

              const fR = (3.4 - tierFrac * 0.65 + rand() * 0.85) * scale;
              // Outer rich dark-emerald needle shelf
              pushFoliageCluster(
                bx, by + 0.55 * scale, bz,
                fR, fR * 0.64, fR,
                0.07 + tierFrac * 0.05 + shadeShift,
                0.24 + tierFrac * 0.11 + shadeShift,
                0.14 + tierFrac * 0.03
              );
              // Inner shaded canopy body bridging toward trunk for thick unbroken hidden-forest cover
              pushFoliageCluster(
                M.lerp(cx, bx, 0.48), M.lerp(cy, by, 0.48) + 0.95 * scale, M.lerp(cz, bz, 0.48),
                fR * 0.88, fR * 0.68, fR * 0.88,
                0.05 + tierFrac * 0.04 + shadeShift,
                0.19 + tierFrac * 0.09 + shadeShift,
                0.12 + tierFrac * 0.02
              );
            }
          }
        }
        // Towering sunlit emerald spire crown
        const topR = (3.2 + rand() * 0.7) * scale;
        pushFoliageCluster(cx, cy + 0.6 * scale, cz, topR, topR * 0.92, topR, 0.11 + shadeShift, 0.36 + shadeShift, 0.18);
        pushFoliageCluster(cx, cy + 2.4 * scale, cz, topR * 0.68, topR * 0.88, topR * 0.68, 0.15 + shadeShift, 0.44 + shadeShift, 0.21);
      }

      // Curated Towering Cliffside Pines framing the Abandoned Cave-Mansion (keeping the North portal sightline clear!)
      const caveFrameTrees = [
        [hmN.caveX - 24, hmN.caveZ -  8, 1.48, 'cedar'],
        [hmN.caveX + 25, hmN.caveZ -  6, 1.54, 'cedar'],
        [hmN.caveX - 22, hmN.caveZ - 22, 1.38, 'pine' ],
        [hmN.caveX + 23, hmN.caveZ - 20, 1.42, 'pine' ],
        [hmN.caveX - 30, hmN.caveZ + 12, 1.62, 'cedar'],
        [hmN.caveX + 32, hmN.caveZ + 10, 1.58, 'cedar'],
        [hmN.caveX - 18, hmN.caveZ + 32, 1.72, 'cedar'],
        [hmN.caveX + 16, hmN.caveZ + 34, 1.68, 'cedar'],
        [hmN.caveX +  2, hmN.caveZ + 40, 1.82, 'cedar'],
        [hmN.caveX - 34, hmN.caveZ - 32, 1.55, 'cedar'],
        [hmN.caveX + 36, hmN.caveZ - 30, 1.60, 'cedar'],
        [hmN.caveX - 28, hmN.caveZ - 48, 1.65, 'cedar'],
        [hmN.caveX + 30, hmN.caveZ - 46, 1.58, 'cedar'],
        [hmN.caveX - 42, hmN.caveZ -  2, 1.70, 'cedar'],
        [hmN.caveX + 44, hmN.caveZ +  4, 1.66, 'cedar'],
        [hmN.caveX - 16, hmN.caveZ - 58, 1.50, 'pine' ],
      ];
      for (const [tx, tz, sc, kind] of caveFrameTrees) {
        const ty = T.getMeshFootHeight(tx, tz, 1.15 * sc);
        if (kind === 'cedar') addToweringMountainCedar(tx, ty, tz, sc);
        else addPineTree(tx, ty, tz, sc * 1.45);
      }

      // ~1,580 Ultra-Dense Towering Ancient Mountain Trees blanketing the steep ridges & winding ravines of 幽林秘岭!
      let placedHmTrees = 0;
      let hmTries = 0;
      while (placedHmTrees < 1580 && hmTries < 9800) {
        hmTries++;
        const gx = -160 + rand() * 3360;
        const gz = 4860 + rand() * 3720;
        const hmW = T.getHiddenMountainsMask(gx, gz);
        if (hmW < 0.18) continue;
        if (Math.hypot(gx - hmN.caveX, gz - (hmN.caveZ - 4.0)) < 29.0) continue;
        if (T.getHiddenMountainPathInfo(gx, gz).dist < 9.8) continue;
        const gy = T.getMeshTerrainHeight(gx, gz);
        if (gy < 22.0 || gy > 272.0) continue;
        T.getTerrainNormal(gx, gz, nrm);
        if (nrm[1] < 0.54) continue;

        // Place tight multi-tree mountain clusters (2-4 towering trees per grove pocket) for lush labyrinthine forest density!
        const clusterN = 2 + ((rand() * 3) | 0);
        for (let c = 0; c < clusterN && placedHmTrees < 1580; c++) {
          const ca = rand() * Math.PI * 2;
          const cd = c === 0 ? 0.0 : (5.5 + rand() * 14.5);
          const tx = gx + Math.cos(ca) * cd;
          const tz = gz + Math.sin(ca) * cd;
          if (T.getHiddenMountainsMask(tx, tz) < 0.16) continue;
          if (Math.hypot(tx - hmN.caveX, tz - (hmN.caveZ - 4.0)) < 28.0) continue;
          if (T.getHiddenMountainPathInfo(tx, tz).dist < 9.5) continue;
          T.getTerrainNormal(tx, tz, nrm);
          if (nrm[1] < 0.54) continue;
          const ty = T.getMeshFootHeight(tx, tz, 1.15);
          const roll = rand();
          if (roll < 0.72) {
            const sc = 1.05 + rand() * 0.65; // 22m..52m towering mountain cedars!
            addToweringMountainCedar(tx, ty, tz, sc);
          } else if (roll < 0.90) {
            const sc = 1.65 + rand() * 0.85; // 18m..33m gnarled tall cliff pines!
            addPineTree(tx, ty, tz, sc);
          } else {
            const sc = 1.55 + rand() * 0.75; // 15m..25m deep-ravine ancient broadleafs!
            addBroadleafTree(tx, ty, tz, sc);
          }
          placedHmTrees++;
        }
      }
    }

    return {
      trunkMesh: trunkMb.build(),
      canopyData: new Float32Array(canopyInstances),
      canopyCount: canopyInstances.length / 10,
      groveBoulders,
      groveHerbsAndReeds,
    };
  }

  // 6A. Ultra-Dense GPU World-Snapped Toroidal Grass Carpet (67,600 5-blade tufts ALWAYS carpeting 142m around camera!)
  function buildToroidalGrassGrid(gridN = 260) {
    const count = gridN * gridN;
    const out = new Float32Array(count * 8);
    const half = gridN * 0.5;
    let ptr = 0;
    for (let iz = 0; iz < gridN; iz++) {
      for (let ix = 0; ix < gridN; ix++) {
        out[ptr++] = ix - half;
        out[ptr++] = 0.0;
        out[ptr++] = iz - half;
        out[ptr++] = 1.0;
        out[ptr++] = 0.0;
        out[ptr++] = 0.0;
        out[ptr++] = 1.0;
        out[ptr++] = 0.0;
      }
    }
    return { data: out, count, gridN, cellSpacing: 1.12 };
  }

  // 6B. Floating Island Grass + Grove Spirit Herbs (灵草) + Waterside Swaying Reeds & Cattails (岸边芦苇)!
  function buildFloatingIslandGrass(extraHerbsAndReeds = []) {
    const list = extraHerbsAndReeds.slice();
    const rand = N.createRNG(202605);

    // 1. Lush grass & wildflowers crowning all 7 Floating Immortal Islands
    for (const isl of T.FLOATING_ISLANDS) {
      const quota = isl.hasPavilion ? 1500 : 480;
      let placed = 0;
      for (let i = 0; i < quota * 2 && placed < quota; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * 0.90;
        const gx = isl.x + Math.cos(a) * isl.rx * r;
        const gz = isl.z + Math.sin(a) * isl.rz * r;
        if (isl.hasPavilion && Math.hypot(gx - (isl.x - 4), gz - (isl.z - 2)) < 14.0) continue;
        const gy = T.getIslandTopHeight(gx, gz, isl);
        if (gy === null) continue;
        list.push(
          gx, gy - 0.08, gz,
          0.86 + rand() * 0.78,
          rand() * Math.PI * 2,
          rand() < 0.14 ? (2.0 + ((rand() * 4) | 0)) : (0.2 + rand() * 0.4),
          0.9 + rand() * 0.48,
          rand() * Math.PI * 2
        );
        placed++;
      }
    }

    // Helper: Spawn a natural shoreline reed colony (岸边芦苇丛, hue = 7.0..7.8 — snapped to exact terrain mesh!)
    function addReedColony(cx, cz, waterY, count, spread) {
      for (let i = 0; i < count; i++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * spread;
        const rx = cx + Math.cos(a) * d;
        const rz = cz + Math.sin(a) * d;
        const ry = T.getMeshTerrainHeight(rx, rz);
        if (ry < waterY - 0.55 || ry > waterY + 1.65) continue;
        list.push(
          rx, ry - 0.16, rz,
          1.25 + rand() * 0.65,
          rand() * Math.PI * 2,
          7.0 + rand() * 0.8, // 7.0+ = Tall Waterside Reed & Golden Cattail Plume (岸边芦苇)
          1.55 + rand() * 0.65,
          rand() * Math.PI * 2
        );
      }
    }

    // 5. 沉烟迷泽 White Reed Marshes (白芦苇荡, hue=8.2..8.7) & Aquatic Cattails (水生蒲草, hue=9.2..9.6)!
    let swColonies = 0;
    let swReedTries = 0;
    while (swColonies < 380 && swReedTries < 5200) {
      swReedTries++;
      const cx = 60 + rand() * 3520;
      const cz = 1360 + rand() * 2240;
      if (T.getSwampMask(cx, cz) < 0.22) continue;
      if (Math.hypot(cx - 645, cz - 2225) < 11) continue; // keep stele center open
      const cy = T.getTerrainHeight(cx, cz);
      if (cy < T.SWAMP_WATER_Y - 0.65 || cy > T.SWAMP_WATER_Y + 1.95) continue;

      const isCattailColony = rand() < 0.34;
      const spread = 4.2 + rand() * 6.8;
      const tufts = 14 + ((rand() * 12) | 0);
      for (let k = 0; k < tufts; k++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * spread;
        const rx = cx + Math.cos(a) * d;
        const rz = cz + Math.sin(a) * d;
        const ry = T.getMeshTerrainHeight(rx, rz);
        if (ry < T.SWAMP_WATER_Y - 0.72 || ry > T.SWAMP_WATER_Y + 2.15) continue;
        const useCattail = isCattailColony ? (rand() < 0.80) : (rand() < 0.18);
        list.push(
          rx, ry - 0.18, rz,
          1.35 + rand() * 0.72,
          rand() * Math.PI * 2,
          useCattail ? (9.2 + rand() * 0.4) : (8.2 + rand() * 0.5), // 8.2+ = 白芦苇, 9.2+ = 水生蒲草
          useCattail ? (1.42 + rand() * 0.52) : (1.72 + rand() * 0.75),
          rand() * Math.PI * 2
        );
      }
      swColonies++;
    }

    // 5B. 沉烟迷泽 Low Damp Wetland Bog Sedge & Fern Tussocks (湿地莎草与苔蕨丛, hue=6.05..6.42) carpeting muddy shoals!
    let sedgeColonies = 0, sedgeTries = 0;
    while (sedgeColonies < 260 && sedgeTries < 4200) {
      sedgeTries++;
      const cx = 100 + rand() * 3420;
      const cz = 1380 + rand() * 2180;
      if (T.getSwampMask(cx, cz) < 0.24) continue;
      if (Math.hypot(cx - 645, cz - 2225) < 12) continue;
      const cy = T.getTerrainHeight(cx, cz);
      if (cy < T.SWAMP_WATER_Y + 0.12 || cy > T.SWAMP_WATER_Y + 3.8) continue;
      const spread = 2.8 + rand() * 5.2;
      const tufts = 10 + ((rand() * 10) | 0);
      for (let k = 0; k < tufts; k++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * spread;
        const rx = cx + Math.cos(a) * d;
        const rz = cz + Math.sin(a) * d;
        const ry = T.getMeshTerrainHeight(rx, rz);
        if (ry < T.SWAMP_WATER_Y + 0.06 || ry > T.SWAMP_WATER_Y + 4.2) continue;
        list.push(
          rx, ry - 0.16, rz,
          0.92 + rand() * 0.56,
          rand() * Math.PI * 2,
          6.05 + rand() * 0.36, // 6.05..6.41 = Damp Emerald Bog Sedge & Wetland Fern Tussocks
          0.78 + rand() * 0.42,
          rand() * Math.PI * 2
        );
      }
      sedgeColonies++;
    }

    // 6. 残阵古道 Clustered Dry Weed Tufts (枯黄杂草丛, hue=-2.45..-1.95) poking beside broken flagstones & fallen pillars!
    const czPts = T.CANZHEN_ROAD.waypoints;
    for (let s = 0; s < czPts.length - 1; s++) {
      const a = czPts[s], b = czPts[s + 1];
      for (let i = 0; i < 16; i++) {
        const t = rand();
        const side = (rand() < 0.5 ? -1 : 1) * (2.6 + rand() * 9.5);
        const ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
        const cx = M.lerp(a[0], b[0], t) + Math.cos(ang) * side;
        const cz = M.lerp(a[1], b[1], t) - Math.sin(ang) * side;
        const tufts = 5 + ((rand() * 6) | 0);
        for (let k = 0; k < tufts; k++) {
          const wa = rand() * Math.PI * 2;
          const wd = Math.sqrt(rand()) * 2.8;
          const wx = cx + Math.cos(wa) * wd;
          const wz = cz + Math.sin(wa) * wd;
          const wy = T.getMeshTerrainHeight(wx, wz);
          list.push(
            wx, wy - 0.16, wz,
            0.85 + rand() * 0.55,
            rand() * Math.PI * 2,
            -2.45 + rand() * 0.55, // Withered golden-ochre dry weeds!
            0.85 + rand() * 0.48,
            rand() * Math.PI * 2
          );
        }
      }
    }

    // 7. 通天灵木林 Rich Forest Floor Ferns, Moss Sedge (苔蕨, hue=6.05..6.40) & Luminous Spirit Herbs (灵草, hue=5.8)!
    let sfColonies = 0, sfTries = 0;
    while (sfColonies < 860 && sfTries < 12600) {
      sfTries++;
      const cx = -8120 + rand() * 7140;
      const cz = -4720 + rand() * 5100;
      if (T.getSpiritForestMask(cx, cz) < 0.24) continue;
      if (T.getSpiritForestTrailInfo(cx, cz).dist < 4.5) continue;
      const isHerbPatch = rand() < 0.34;
      const tufts = isHerbPatch ? (4 + ((rand() * 4) | 0)) : (8 + ((rand() * 8) | 0));
      const spread = isHerbPatch ? 2.8 : (3.2 + rand() * 4.5);
      for (let k = 0; k < tufts; k++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * spread;
        const rx = cx + Math.cos(a) * d;
        const rz = cz + Math.sin(a) * d;
        const ry = T.getMeshTerrainHeight(rx, rz);
        list.push(
          rx, ry - 0.16, rz,
          isHerbPatch ? (1.05 + rand() * 0.55) : (0.95 + rand() * 0.58),
          rand() * Math.PI * 2,
          isHerbPatch ? 5.8 : (6.05 + rand() * 0.35),
          isHerbPatch ? (1.05 + rand() * 0.40) : (0.82 + rand() * 0.46),
          rand() * Math.PI * 2
        );
      }
      sfColonies++;
    }

    // 8. 霜雪原 Partially Snow-Covered Winter Grass & Frosted Sedge Tussocks (~410 colonies, hue = 10.2..10.8, snapped to mesh!)
    const fsG = T.FROST_SNOWFIELD;
    let snGrassCols = 0, snGrassTries = 0;
    while (snGrassCols < 410 && snGrassTries < 7200) {
      snGrassTries++;
      const cx = -8260 + rand() * 12000;
      const cz = -9020 + rand() * 4760;
      if (T.getSnowfieldMask(cx, cz) < 0.20) continue;
      if (Math.hypot(cx - fsG.pondX, cz - fsG.pondZ) < fsG.pondR + 24) continue;
      if (T.getFrostMountainMask(cx, cz) > 0.28) continue;
      const spread = 2.8 + rand() * 4.8;
      const tufts = 7 + ((rand() * 7) | 0);
      for (let k = 0; k < tufts; k++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * spread;
        const rx = cx + Math.cos(a) * d;
        const rz = cz + Math.sin(a) * d;
        const ry = T.getMeshTerrainHeight(rx, rz);
        list.push(
          rx, ry - 0.16, rz,
          0.88 + rand() * 0.58,
          rand() * Math.PI * 2,
          10.2 + rand() * 0.6, // 10.2..10.8 = Partially Snow-Covered Winter Grass (覆雪寒草)
          0.82 + rand() * 0.48,
          rand() * Math.PI * 2
        );
      }
      snGrassCols++;
    }

    // 9. 灵竹幽谷 Deep Valley Bamboo Ferns (outside central Boss arena!)
    const bvG = T.BAMBOO_VALLEY;
    for (let c = 0; c < 68; c++) {
      const cx = bvG.cx - 460 + rand() * 920;
      const cz = 5360 + rand() * 1020;
      if (T.getBambooValleyMask(cx, cz) < 0.24) continue;
      if (Math.hypot(cx - bvG.cx, cz - bvG.cz) < 48.0) continue;
      for (let k = 0; k < 6; k++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * 3.8;
        const rx = cx + Math.cos(a) * d;
        const rz = cz + Math.sin(a) * d;
        const ry = T.getMeshTerrainHeight(rx, rz);
        list.push(rx, ry - 0.14, rz, 0.90 + rand() * 0.50, rand() * Math.PI * 2, 6.08 + rand() * 0.30, 0.80 + rand() * 0.42, rand() * Math.PI * 2);
      }
    }

    // 10. 蚀骨毒潭 Sparse Withered Dark Weeds (毒潭岸边与荒滩枯草, hue = -2.45..-1.95)
    const vmG = T.VENOM_MIRE;
    for (let c = 0; c < 68; c++) {
      const cx = 4140 + rand() * 1340;
      const cz = 1600 + rand() * 1140;
      if (T.getVenomMireMask(cx, cz) < 0.22) continue;
      if (Math.hypot(cx - vmG.cx, cz - vmG.cz) < 77.0) continue;
      for (let k = 0; k < 5; k++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * 3.6;
        const rx = cx + Math.cos(a) * d;
        const rz = cz + Math.sin(a) * d;
        const ry = T.getMeshTerrainHeight(rx, rz);
        if (ry < vmG.waterY + 0.15) continue;
        list.push(rx, ry - 0.16, rz, 0.84 + rand() * 0.52, rand() * Math.PI * 2, -2.45 + rand() * 0.45, 0.78 + rand() * 0.45, rand() * Math.PI * 2);
      }
    }

    // 11. 幽林秘岭 Shadowed Mountain Ferns, Deep Moss Tussocks & Hidden Spirit Herbs (深山苔蕨与幽林灵草)
    const hmG = T.HIDDEN_MOUNTAINS;
    if (hmG && T.getHiddenMountainsMask) {
      let hmFernCols = 0, hmFernTries = 0;
      while (hmFernCols < 210 && hmFernTries < 3200) {
        hmFernTries++;
        const cx = -80 + rand() * 3200;
        const cz = 4920 + rand() * 3560;
        if (T.getHiddenMountainsMask(cx, cz) < 0.22) continue;
        if (Math.hypot(cx - hmG.caveX, cz - (hmG.caveZ - 4.0)) < 28.0) continue;
        if (T.getHiddenMountainPathInfo(cx, cz).dist < 7.5) continue;
        const isHerb = rand() < 0.22;
        const tufts = isHerb ? (4 + ((rand() * 3) | 0)) : (7 + ((rand() * 6) | 0));
        const spread = isHerb ? 2.6 : (3.0 + rand() * 4.2);
        for (let k = 0; k < tufts; k++) {
          const a = rand() * Math.PI * 2;
          const d = Math.sqrt(rand()) * spread;
          const rx = cx + Math.cos(a) * d;
          const rz = cz + Math.sin(a) * d;
          const ry = T.getMeshTerrainHeight(rx, rz);
          list.push(
            rx, ry - 0.16, rz,
            isHerb ? (1.05 + rand() * 0.50) : (0.95 + rand() * 0.58),
            rand() * Math.PI * 2,
            isHerb ? 5.8 : (6.05 + rand() * 0.35),
            isHerb ? (1.05 + rand() * 0.38) : (0.85 + rand() * 0.48),
            rand() * Math.PI * 2
          );
        }
        hmFernCols++;
      }
    }

    return { data: new Float32Array(list), count: list.length / 8 };
  }

  // 7. Clustered Mountain Boulders + Shoreline Cobblestone Outcrops (山石聚落与岸边碎石)
  function buildBoulderInstances(collisionWorld = null, extraGroveBoulders = []) {
    const list = extraGroveBoulders.slice();
    const rand = N.createRNG(61803);
    const lc = T.LOW_CLOUD_PLAINS;

    // Helper: Add a clustered rock outcrop (snapped firmly to lowest perimeter mesh height — ZERO floating stones!)
    function addBoulderCluster(cx, cz, mainSc, count, isShore = false) {
      for (let k = 0; k < count; k++) {
        const a = rand() * Math.PI * 2;
        const d = k === 0 ? 0.0 : (0.9 + rand() * 2.6) * mainSc * 0.55;
        const rx = cx + Math.cos(a) * d;
        const rz = cz + Math.sin(a) * d;
        const sc = k === 0 ? mainSc : mainSc * (0.32 + rand() * 0.45);
        const sx = sc * (0.9 + rand() * 0.35);
        const sy = sc * (isShore ? (0.36 + rand() * 0.32) : (0.55 + rand() * 0.48));
        const sz = sc * (0.85 + rand() * 0.35);
        const fY = T.getMeshFootHeight(rx, rz, Math.max(sx, sz) * 0.78);
        const by = fY + sy * (isShore ? 0.04 : 0.08);
        list.push(rx, by, rz, rand() * 6.283185, sx, sy, sz, rand());
        if (collisionWorld && sc >= 0.42) {
          collisionWorld.addCylinder(rx, by - sy * 0.6, rz, Math.max(sx, sz) * 0.86, sy * 1.48, 'rock', sy < 1.85);
        }
      }
    }

    // 1. Additional Rocky Outcrop Clusters on vast 低云平原 ridges & knolls (expanded far South!)
    let placedLC = 0;
    let lcTries = 0;
    while (placedLC < 310 && lcTries < 4400) {
      lcTries++;
      const x = -4350 + rand() * 4420;
      const z = 220 + rand() * 7280;
      if (T.getLowCloudPlainsMask(x, z) < 0.25) continue;
      if (T.getAncientRoadMask(x, z) > 0.20) continue;
      if (T.getDesertMask(x, z) > 0.16) continue;
      if (Math.hypot(x - lc.spawnX, z - lc.spawnZ) < 30) continue;
      const sc = 1.4 + Math.pow(rand(), 1.6) * 3.4;
      addBoulderCluster(x, z, sc, 2 + ((rand() * 3) | 0), false);
      placedLC++;
    }

    // 2. Mountain Ridge & Slope Rock Clusters across the Central/Outer Continent (keeping 青石城 clean!)
    for (let i = 0; i < 160; i++) {
      const x = -1120 + rand() * 2240;
      const z = -1080 + rand() * 2160;
      if (T.getLowCloudPlainsMask(x, z) > 0.35) continue;
      if (T.getPathMask(x, z) > 0.14) continue;
      if (Math.abs(x) < 150 && z > -136 && z < 146) continue;
      const y = T.getTerrainHeight(x, z);
      if (y < 4.0 || y > 165) continue;

      const sc = 1.5 + Math.pow(rand(), 1.5) * 3.8;
      addBoulderCluster(x, z, sc, 2 + ((rand() * 3) | 0), false);
    }

    // 4. 沉烟迷泽 Half-Submerged Mossy Marsh Stones (半沉入水中的青苔石块)
    let placedSwRocks = 0;
    let swRockTries = 0;
    while (placedSwRocks < 195 && swRockTries < 2800) {
      swRockTries++;
      const rx = 80 + rand() * 3460;
      const rz = 1380 + rand() * 2200;
      if (T.getSwampMask(rx, rz) < 0.22) continue;
      if (Math.hypot(rx - 645, rz - 2225) < 12) continue;
      const ry = T.getTerrainHeight(rx, rz);
      if (ry < T.SWAMP_WATER_Y - 1.35 || ry > T.SWAMP_WATER_Y + 1.55) continue;
      const sc = 1.15 + rand() * 2.35;
      addBoulderCluster(rx, rz, sc, 2 + ((rand() * 3) | 0), true);
      placedSwRocks++;
    }

    // 4B. 沉烟迷泽 Low Shoal Pebble Beds & Mossy Mud-Bank Stone Accents (滩涂碎石斑)
    let placedSwPeb = 0, swPebTries = 0;
    while (placedSwPeb < 110 && swPebTries < 1800) {
      swPebTries++;
      const rx = 120 + rand() * 3380;
      const rz = 1400 + rand() * 2140;
      if (T.getSwampMask(rx, rz) < 0.25) continue;
      if (Math.hypot(rx - 645, rz - 2225) < 14) continue;
      const ry = T.getTerrainHeight(rx, rz);
      if (ry < T.SWAMP_WATER_Y + 0.10 || ry > T.SWAMP_WATER_Y + 3.6) continue;
      addBoulderCluster(rx, rz, 0.55 + rand() * 0.72, 3 + ((rand() * 3) | 0), true);
      placedSwPeb++;
    }

    // 5. 残阵古道 Weathered Scree Outcrops & Rubble Clusters along Extended Barren Valley Slopes (荒坡碎石堆)
    let placedCzRocks = 0, czRockTries = 0;
    while (placedCzRocks < 105 && czRockTries < 2000) {
      czRockTries++;
      const rx = -4180 + rand() * 1840;
      const rz = 80 + rand() * 1540;
      if (T.getAncientRoadMask(rx, rz) < 0.22) continue;
      const rp = T.getAncientRoadPathInfo(rx, rz);
      if (rp.roadMask > 0.35 || rp.altarMask > 0.22) continue;
      const sc = 0.85 + Math.pow(rand(), 1.4) * 2.4;
      addBoulderCluster(rx, rz, sc, 2 + ((rand() * 3) | 0), false);
      placedCzRocks++;
    }

    // 6. 通天灵木林 Rich Mossy Forest Boulder Clusters (林间苔石) nestled near roots & trail edges
    let placedSfRocks = 0, sfRockTries = 0;
    while (placedSfRocks < 410 && sfRockTries < 7400) {
      sfRockTries++;
      const rx = -8100 + rand() * 7100;
      const rz = -4680 + rand() * 5040;
      if (T.getSpiritForestMask(rx, rz) < 0.24) continue;
      if (T.getSpiritForestTrailInfo(rx, rz).dist < 5.5) continue;
      const sc = 1.05 + Math.pow(rand(), 1.5) * 2.6;
      addBoulderCluster(rx, rz, sc, 2 + ((rand() * 3) | 0), false);
      placedSfRocks++;
    }

    // 7. 云雾山 Rich Natural Alpine Boulders & Scree Clusters (~280 clusters across all 7 tiers, keeping spiral ramp & flat plateaus clear!)
    const cmB = T.CLOUD_MOUNTAIN;
    let placedCmRocks = 0, cmRockTries = 0;
    while (placedCmRocks < 280 && cmRockTries < 6400) {
      cmRockTries++;
      const rx = 580 + rand() * 4180;
      const rz = 3100 + rand() * 1900;
      if (T.getCloudMountainMask(rx, rz) < 0.18) continue;
      if (Math.hypot((rx - cmB.cx) * cmB.scaleX, (rz - cmB.cz) * cmB.scaleZ) < 168.0) continue; // Keep 760m summit plateau clean!
      if (T.getCloudMountainPathInfo(rx, rz).dist < 30.0) continue; // Keep spiral ramp snag-free!
      let inPatrol = false;
      for (const tc of cmB.terraces) {
        if (Math.hypot(rx - tc.x, rz - tc.z) < tc.r * 0.72) { inPatrol = true; break; }
      }
      if (inPatrol) continue;
      const ry = T.getTerrainHeight(rx, rz);
      if (ry < 38.0) continue;
      const altBoost = M.smoothstep(100.0, 650.0, ry);
      const sc = 1.40 + Math.pow(rand(), 1.35) * (3.8 + altBoost * 3.6);
      addBoulderCluster(rx, rz, sc, 3 + ((rand() * 3) | 0), false);
      placedCmRocks++;
    }

    // 7B. Natural Sculpted Alpine Rock Cradle hugging the base of 云雾山's 44m Glowing Spirit Stone (pure organic boulders, ZERO grid cubes!)
    for (let r = 0; r < 10; r++) {
      const ra = (r / 10) * Math.PI * 2 + (rand() - 0.5) * 0.25;
      const rd = 8.2 + rand() * 4.2;
      const bx = cmB.cx + Math.cos(ra) * rd, bz = cmB.cz + Math.sin(ra) * rd;
      const sx = 2.6 + rand() * 2.0, sy = 2.2 + rand() * 2.2, sz = 2.4 + rand() * 1.8;
      const fY = T.getMeshFootHeight(bx, bz, Math.max(sx, sz) * 0.78);
      const by = fY + sy * 0.08;
      list.push(bx, by, bz, ra, sx, sy, sz, rand());
      if (collisionWorld) {
        collisionWorld.addCylinder(bx, by - sy * 0.6, bz, Math.max(sx, sz) * 0.86, sy * 1.48, 'rock', false);
      }
    }

    // 8. 流沙荒漠 Restrained Wind-Eroded Sandstone Boulder Outcrops (~64 sparse groups in dune hollows & beside expanded desert ruins!)
    for (const site of T.DESERT_DUNES.ruinSites) {
      for (let k = 0; k < 2; k++) {
        const a = rand() * Math.PI * 2;
        const d = 9.0 + rand() * 12.0;
        addBoulderCluster(site.x + Math.cos(a) * d, site.z + Math.sin(a) * d, 1.15 + rand() * 1.5, 2 + ((rand() * 2) | 0), false);
      }
    }
    let placedDsRocks = 0, dsRockTries = 0;
    while (placedDsRocks < 72 && dsRockTries < 3400) {
      dsRockTries++;
      const rx = -8980 + rand() * 4940;
      const rz = 1600 + rand() * 5620;
      if (T.getDesertMask(rx, rz) < 0.28) continue;
      if (T.getDesertDuneWave(rx, rz) > -0.15) continue; // Mostly emerge in wind-scoured troughs
      addBoulderCluster(rx, rz, 1.2 + Math.pow(rand(), 1.4) * 2.4, 2 + ((rand() * 2) | 0), false);
      placedDsRocks++;
    }

    // 9. 霜雪原 Frost-Etched Cold Rock Outcrops (~155 clusters across expanded W/N/NE snowfield) + 霜雪山 Alpine Cold Boulders (~165 clusters across all 6 tiers!)
    const fsB = T.FROST_SNOWFIELD;
    const fmB = T.FROST_MOUNTAIN;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + (rand() - 0.5) * 0.25;
      const d = fsB.pondR * (1.02 + rand() * 0.24);
      addBoulderCluster(fsB.pondX + Math.cos(a) * (d / 0.94), fsB.pondZ + Math.sin(a) * (d / 1.08), 1.3 + rand() * 1.8, 2 + ((rand() * 3) | 0), false);
    }
    let placedSnowRocks = 0, snRockTries = 0;
    while (placedSnowRocks < 155 && snRockTries < 5800) {
      snRockTries++;
      const rx = -8260 + rand() * 12020;
      const rz = -9040 + rand() * 4820;
      if (T.getSnowfieldMask(rx, rz) < 0.22) continue;
      if (T.getFrostMountainMask(rx, rz) > 0.16) continue;
      if (Math.hypot(rx - fsB.pondX, rz - fsB.pondZ) < fsB.pondR + 35) continue;
      if (Math.hypot(rx + 4180, rz + 6080) < 32) continue;
      addBoulderCluster(rx, rz, 1.25 + Math.pow(rand(), 1.4) * 2.8, 2 + ((rand() * 3) | 0), false);
      placedSnowRocks++;
    }
    // 霜雪山 6-tier cold snow-capped mountain boulders (keeping spiral road, patrol terraces & 680m summit clear!)
    let placedFmRocks = 0, fmRockTries = 0;
    while (placedFmRocks < 165 && fmRockTries < 4200) {
      fmRockTries++;
      const rx = -2700 + rand() * 2440;
      const rz = -7860 + rand() * 1960;
      if (T.getFrostMountainMask(rx, rz) < 0.18) continue;
      if (Math.hypot((rx - fmB.cx) * fmB.scaleX, (rz - fmB.cz) * fmB.scaleZ) < 148.0) continue;
      if (T.getFrostMountainPathInfo(rx, rz).dist < 28.0) continue;
      let inPatrol = false;
      for (const tc of fmB.terraces) {
        if (Math.hypot(rx - tc.x, rz - tc.z) < tc.r * 0.72) { inPatrol = true; break; }
      }
      if (inPatrol) continue;
      const ry = T.getMeshTerrainHeight(rx, rz);
      if (ry < 95.0) continue;
      const altBoost = M.smoothstep(140.0, 580.0, ry);
      const sc = 1.35 + Math.pow(rand(), 1.35) * (3.4 + altBoost * 3.0);
      addBoulderCluster(rx, rz, sc, 3 + ((rand() * 3) | 0), false);
      placedFmRocks++;
    }
    // Natural snow-capped rock cradle hugging the base of 霜雪山's 680m summit glacial crystal crown
    for (let r = 0; r < 8; r++) {
      const ra = (r / 8) * Math.PI * 2 + (rand() - 0.5) * 0.28;
      const rd = 6.2 + rand() * 3.2;
      const bx = fmB.cx + Math.cos(ra) * rd, bz = fmB.cz + Math.sin(ra) * rd;
      const sx = 2.0 + rand() * 1.6, sy = 1.8 + rand() * 1.8, sz = 1.9 + rand() * 1.5;
      const fY = T.getMeshFootHeight(bx, bz, Math.max(sx, sz) * 0.78);
      const by = fY + sy * 0.08;
      list.push(bx, by, bz, ra, sx, sy, sz, rand());
      if (collisionWorld) {
        collisionWorld.addCylinder(bx, by - sy * 0.6, bz, Math.max(sx, sz) * 0.86, sy * 1.48, 'rock', false);
      }
    }

    // 10. 幽林秘岭 Rugged Moss-Covered Steep Mountain Cliff Boulders & Ravine Rock Clusters (~220 clusters)
    const hmB = T.HIDDEN_MOUNTAINS;
    if (hmB && T.getHiddenMountainsMask) {
      let placedHmRocks = 0, hmRockTries = 0;
      while (placedHmRocks < 220 && hmRockTries < 4200) {
        hmRockTries++;
        const rx = -120 + rand() * 3260;
        const rz = 4900 + rand() * 3620;
        if (T.getHiddenMountainsMask(rx, rz) < 0.20) continue;
        if (Math.hypot(rx - hmB.caveX, rz - (hmB.caveZ - 4.0)) < 28.0) continue;
        if (T.getHiddenMountainPathInfo(rx, rz).dist < 10.5) continue;
        const sc = 1.45 + Math.pow(rand(), 1.35) * 4.2;
        addBoulderCluster(rx, rz, sc, 2 + ((rand() * 3) | 0), false);
        placedHmRocks++;
      }
    }

    return { data: new Float32Array(list), count: list.length / 8 };
  }

  // 8. Vast Sea of Clouds Sheet Mesh (15500m span!)
  function buildCloudSeaMesh() {
    const verts = [];
    const indices = [];
    let vc = 0;

    function addCloudLayer(yBase, size, segs, layerId) {
      const start = vc;
      for (let iz = 0; iz <= segs; iz++) {
        const vz = iz / segs;
        const z = (vz - 0.5) * size;
        for (let ix = 0; ix <= segs; ix++) {
          const vx = ix / segs;
          const x = (vx - 0.5) * size;
          const wave = N.fbm2D(x * 0.0011 + layerId * 3.1, z * 0.0011 - layerId * 2.2, 3) * 20.0;
          verts.push(x, yBase + wave, z, vx, vz, layerId);
          vc++;
        }
      }
      const stride = segs + 1;
      for (let iz = 0; iz < segs; iz++) {
        for (let ix = 0; ix < segs; ix++) {
          const a = start + iz * stride + ix;
          indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
        }
      }
    }

    addCloudLayer(56.0, 42000, 76, 0.0);
    addCloudLayer(144.0, 39000, 68, 1.0);

    return {
      vertices: new Float32Array(verts),
      indices: new Uint32Array(indices),
    };
  }

  // 9. Soft FBM Volumetric Cloud Puffs (including 160 Low-Drifting Clouds over the vast 低云平原!)
  function buildCloudPuffs() {
    const list = [];
    const rand = N.createRNG(90210);

    // Signature Low-Altitude Wispy Morning Clouds skimming gracefully over the vast southern-expanded 低云平原!
    for (let i = 0; i < 290; i++) {
      const x = -4300 + rand() * 4350;
      const z = 260 + rand() * 7180;
      if (T.getLowCloudPlainsMask(x, z) < 0.20) continue;
      const cy = 62 + rand() * 40;
      const s = 28 + rand() * 48;
      list.push(x, cy, z, 0.28 + rand() * 0.45, s * 2.0, s * 0.28, s * 1.4, rand() * 6.28);
    }

    // Ground-Hugging Marsh Morning Mist & Miasma Layers skimming right over the expanded 沉烟迷泽 water & reeds (低空体积雾层)!
    let placedMistBanks = 0;
    let mistTries = 0;
    while (placedMistBanks < 165 && mistTries < 980) {
      mistTries++;
      const x = 120 + rand() * 3400;
      const z = 1420 + rand() * 2140;
      if (T.getSwampMask(x, z) < 0.25) continue;
      const cy = T.SWAMP_WATER_Y + 2.2 + rand() * 8.6;
      const s = 32 + rand() * 48;
      list.push(x, cy, z, 0.14 + rand() * 0.22, s * 1.95, s * 0.13, s * 1.65, rand() * 6.28);
      placedMistBanks++;
    }

    // 6 Layered Sky-Piercing Cloud-Sea Strata wrapping the 7 cliff tiers & skimming the outer rim of 云雾山's 760m Summit!
    const cmC = T.CLOUD_MOUNTAIN;
    const tierBands = [
      { yMin: 138, ySpan: 34, rMin: 980, rSpan: 240, count: 32 }, // Tier 1->2 cloud belt
      { yMin: 248, ySpan: 36, rMin: 815, rSpan: 220, count: 30 }, // Tier 2->3 cloud belt
      { yMin: 358, ySpan: 38, rMin: 660, rSpan: 200, count: 28 }, // Tier 3->4 cloud belt
      { yMin: 468, ySpan: 38, rMin: 515, rSpan: 180, count: 26 }, // Tier 4->5 cloud belt
      { yMin: 578, ySpan: 38, rMin: 375, rSpan: 150, count: 24 }, // Tier 5->6 cloud belt
      { yMin: 718, ySpan: 32, rMin: 205, rSpan: 135, count: 24 }, // Skimming outer rim of 760m Summit Plateau!
    ];
    for (const tb of tierBands) {
      for (let i = 0; i < tb.count; i++) {
        const a = (i / tb.count) * Math.PI * 2 + (rand() - 0.5) * 0.35;
        const r = tb.rMin + rand() * tb.rSpan;
        const x = cmC.cx + Math.cos(a) * (r / cmC.scaleX);
        const z = cmC.cz + Math.sin(a) * (r / cmC.scaleZ);
        const cy = tb.yMin + rand() * tb.ySpan;
        const s = 42 + rand() * 58;
        list.push(x, cy, z, 0.16 + rand() * 0.24, s * 2.15, s * 0.22, s * 1.55, rand() * 6.28);
      }
    }

    // 5 Layered Glacial Cloud-Mist Strata wrapping 霜雪山's 6 snowy cliff tiers & 680m summit rim!
    const fmC = T.FROST_MOUNTAIN;
    const fmBands = [
      { yMin: 205, ySpan: 32, rMin: 815, rSpan: 200, count: 22 },
      { yMin: 310, ySpan: 34, rMin: 660, rSpan: 185, count: 20 },
      { yMin: 415, ySpan: 36, rMin: 510, rSpan: 165, count: 18 },
      { yMin: 525, ySpan: 36, rMin: 365, rSpan: 145, count: 16 },
      { yMin: 642, ySpan: 30, rMin: 180, rSpan: 120, count: 16 },
    ];
    for (const fb of fmBands) {
      for (let i = 0; i < fb.count; i++) {
        const a = (i / fb.count) * Math.PI * 2 + (rand() - 0.5) * 0.35;
        const r = fb.rMin + rand() * fb.rSpan;
        const x = fmC.cx + Math.cos(a) * (r / fmC.scaleX);
        const z = fmC.cz + Math.sin(a) * (r / fmC.scaleZ);
        const cy = fb.yMin + rand() * fb.ySpan;
        const s = 34 + rand() * 48;
        list.push(x, cy, z, 0.15 + rand() * 0.22, s * 2.05, s * 0.20, s * 1.48, rand() * 6.28);
      }
    }

    for (const isl of T.FLOATING_ISLANDS) {
      const n = isl.hasPavilion ? 16 : 9;
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2;
        const dist = isl.rx * (0.45 + rand() * 0.95);
        const s = 14 + rand() * 18;
        list.push(
          isl.x + Math.cos(a) * dist,
          isl.y - isl.depth * (0.28 + rand() * 0.52),
          isl.z + Math.sin(a) * dist,
          0.35 + rand() * 0.4, s * 1.48, s * 0.42, s * 1.18, rand() * 6.28
        );
      }
    }

    for (let i = 0; i < 280; i++) {
      const a = rand() * Math.PI * 2;
      const r = 1950 + Math.pow(rand(), 0.85) * 4400;
      const cy = (i % 3 === 0) ? (148 + rand() * 72) : (68 + rand() * 48);
      const s = 42 + rand() * 74;
      list.push(Math.cos(a) * r, cy, Math.sin(a) * r, 0.25 + rand() * 0.55, s * 1.65, s * 0.38, s * 1.25, rand() * 6.28);
    }

    return { data: new Float32Array(list), count: list.length / 8 };
  }

  // 10. Living Particles (Spirit Motes, Peach Petals, Waterfall Mist)
  function buildParticles() {
    const list = [];
    const rand = N.createRNG(424242);

    function pushP(x, y, z, size, r, g, b, speed, phase, kind) {
      list.push(x, y, z, size, r, g, b, speed, phase, kind);
    }

    const moteHotspots = [
      { x: -1020, y: 20,  z: 1120, rad: 340, h: 26, n: 240, col: [0.96, 0.95, 0.66] }, // 低云平原 Spawn Motes!
      { x: -1950, y: 20,  z: 1580, rad: 480, h: 24, n: 180, col: [0.94, 0.95, 0.68] }, // 低云平原 Mid West!
      { x: -2750, y: 20,  z: 2450, rad: 560, h: 26, n: 180, col: [0.95, 0.96, 0.70] }, // 低云平原 Deep SW!
      { x: -1350, y: 20,  z: 2720, rad: 480, h: 24, n: 160, col: [0.95, 0.95, 0.68] }, // 低云平原 Far South!
      { x: -1580, y: 20,  z: 3980, rad: 560, h: 25, n: 150, col: [0.95, 0.95, 0.68] }, // 低云平原 Deep South!
      { x: -2820, y: 20,  z: 4080, rad: 580, h: 26, n: 150, col: [0.95, 0.96, 0.70] }, // 低云平原 Deep SW!
      { x: -1750, y: 20,  z: 5850, rad: 620, h: 25, n: 135, col: [0.95, 0.95, 0.68] }, // 低云平原 Outer South Ring!
      { x: -2450, y: 20,  z: 6650, rad: 620, h: 26, n: 125, col: [0.95, 0.96, 0.70] }, // 低云平原 Far South Ring!
      { x: 0,     y: 23,  z: 0,    rad: 42,  h: 24, n: 150, col: [0.32, 0.98, 0.94] }, // 青石仙城 · 聚灵传送大阵台漫天灵光!
      { x: 0,     y: 26,  z: -62,  rad: 85,  h: 26, n: 130, col: [1.00, 0.90, 0.56] }, // 北城殿阁金碧灵气微尘!
      { x: 0,     y: 25,  z: 46,   rad: 115, h: 18, n: 140, col: [1.00, 0.88, 0.54] }, // 坊市灯火暖光!
      { x: 645,   y: 7.5, z: 2225, rad: 360, h: 12, n: 120, col: [0.48, 0.96, 0.78] }, // 沉烟迷泽 Inner Marsh Fireflies
      { x: 1880,  y: 7.5, z: 2540, rad: 560, h: 13, n: 110, col: [0.46, 0.95, 0.76] }, // 沉烟迷泽 Outer East/SE Fireflies
      { x: -2845, y: 31,  z: 1195, rad: 28,  h: 10, n: 18,  col: [0.68, 0.74, 0.56] }, // 残阵古道 Minor Array Residual Motes
      { x: -3115, y: 40,  z: 1005, rad: 28,  h: 10, n: 18,  col: [0.68, 0.74, 0.56] }, // 残阵古道 Minor Array Residual Motes
      { x: -3375, y: 50,  z: 775,  rad: 42,  h: 14, n: 26,  col: [0.48, 0.78, 0.70] }, // 残阵古道 Mid-Upper Altar Motes
      { x: -3612, y: 60,  z: 426,  rad: 34,  h: 14, n: 24,  col: [0.54, 0.80, 0.72] }, // 残阵古道 Ruined Grand Hall Motes
      { x: -3800, y: 65,  z: 310,  rad: 48,  h: 16, n: 36,  col: [0.46, 0.78, 0.72] }, // 残阵古道 Extended Grand Altar Motes
      { x: -3970, y: 64,  z:   -20, rad: 185, h: 36, n: 58,  col: [0.42, 0.94, 0.80] }, // 通天灵木林 Outer Spirit Dust Motes
      { x: -4120, y: 62,  z:  -270, rad: 220, h: 46, n: 68,  col: [0.46, 0.96, 0.82] }, // 通天灵木林 Inner Sanctuary Motes
      { x: -4165, y: 62,  z:  -660, rad: 210, h: 44, n: 54,  col: [0.88, 0.92, 0.56] }, // 通天灵木林 Mid-North Motes
      { x: -3860, y: 62,  z: -1320, rad: 340, h: 48,  n: 48,  col: [0.44, 0.94, 0.80] }, // 通天灵木林 Expanded Crossing Motes
      { x: -3520, y: 65,  z: -1720, rad: 185, h: 360, n: 160, col: [0.24, 0.78, 1.00] }, // Colossal 450m Blue-Aura World Tree Motes!
      { x: -2820, y: 62,  z: -1620, rad: 380, h: 48,  n: 44,  col: [0.86, 0.90, 0.54] }, // 通天灵木林 Eastern Glade Motes
      { x: -3480, y: 62,  z: -2980, rad: 420, h: 52,  n: 48,  col: [0.46, 0.95, 0.82] }, // 通天灵木林 Far North Motes
      { x: -5850, y: 62,  z: -1550, rad: 480, h: 48,  n: 52,  col: [0.44, 0.94, 0.80] }, // 通天灵木林 West Outer Ring Motes
      { x: -6550, y: 62,  z: -2650, rad: 480, h: 50,  n: 48,  col: [0.86, 0.92, 0.56] }, // 通天灵木林 Far West Ring Motes
      // Living Swirling Spirit Qi Motes orbiting 云雾山 760m Summit Colossal Glowing Spirit Stone (2660, 760, 4120)!
      { x: 2660,  y: 762, z: 4120,  rad: 38,  h: 48,  n: 175, col: [0.24, 0.96, 1.00] },
      { x: 2660,  y: 768, z: 4120,  rad: 68,  h: 42,  n: 85,  col: [0.76, 0.96, 1.00] },
      // 灵竹幽谷 Soft Drifting Pale-Cyan Spirit Bamboo Motes across the full deep valley!
      { x: 2660,  y: 21,  z: 5620,  rad: 260, h: 20,  n: 85,  col: [0.38, 0.96, 0.84] },
      { x: 2660,  y: 21,  z: 6020,  rad: 180, h: 20,  n: 95,  col: [0.38, 0.96, 0.84] },
      // 蚀骨毒潭 Eerie Rising Purple & Toxic-Green Venom Spores across the full sinister mire!
      { x: 4540,  y: 10.2, z: 2180, rad: 240, h: 14,  n: 65,  col: [0.62, 0.22, 0.96] },
      { x: 4960,  y: 9.2,  z: 2160, rad: 165, h: 14,  n: 78,  col: [0.62, 0.22, 0.96] },
      { x: 4960,  y: 9.2,  z: 2160, rad: 195, h: 13,  n: 72,  col: [0.24, 0.94, 0.48] },
      // 幽林秘岭 · 废弃洞府 Ethereal Jade & Warm Lantern Spirit Motes around the Abandoned Cave-Mansion & Deep Mountain Gorges!
      { x: 1220,  y: 179.0, z: 6634, rad: 44,  h: 18,  n: 75,  col: [0.34, 0.94, 0.86] },
      { x: 1060,  y: 96.0,  z: 6040, rad: 380, h: 65,  n: 85,  col: [0.46, 0.92, 0.78] },
      { x: 1380,  y: 112.0, z: 7240, rad: 440, h: 72,  n: 80,  col: [0.44, 0.90, 0.76] },
    ];

    for (const hs of moteHotspots) {
      for (let i = 0; i < hs.n; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * hs.rad;
        const goldMix = rand() < 0.26 ? 1 : 0;
        const col = goldMix ? [1.0, 0.90, 0.56] : hs.col;
        pushP(hs.x + Math.cos(a) * r, hs.y + rand() * hs.h, hs.z + Math.sin(a) * r, 0.18 + rand() * 0.24, col[0], col[1], col[2], 0.35 + rand() * 0.65, rand() * 6.28, 0.0);
      }
    }

    const petalZones = [
      { x: -980, y: 24,  z: 1100, rad: 120, n: 90 },
      { x: 0,    y: 26,  z: -42,  rad: 44,  n: 55 }, // 青石城后院桃树落英
    ];
    for (const pz of petalZones) {
      for (let i = 0; i < pz.n; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * pz.rad;
        pushP(pz.x + Math.cos(a) * r, pz.y + (rand() - 0.3) * 14, pz.z + Math.sin(a) * r, 0.18 + rand() * 0.16, 1.0, 0.70 + rand() * 0.14, 0.78 + rand() * 0.1, 0.45 + rand() * 0.55, rand() * 6.28, 1.0);
      }
    }

    const mistZones = [
      // 沉烟迷泽 Water-Skimming Morning Mist / Pale Miasma Particles (lightweight budget for smooth FPS!)
      { x: 430,  y: 6.8,  z: 2060, rad: 170, n: 55, szMin: 14.0, szSpan: 16.0, col: [0.76, 0.88, 0.84] },
      { x: 645,  y: 6.8,  z: 2225, rad: 210, n: 75, szMin: 15.0, szSpan: 18.0, col: [0.74, 0.86, 0.82] },
      { x: 865,  y: 6.8,  z: 2360, rad: 180, n: 55, szMin: 14.0, szSpan: 16.0, col: [0.76, 0.87, 0.83] },
      { x: 590,  y: 6.8,  z: 2490, rad: 165, n: 45, szMin: 14.0, szSpan: 15.0, col: [0.75, 0.86, 0.83] },
      { x: 1480, y: 6.8,  z: 2260, rad: 340, n: 50, szMin: 16.0, szSpan: 18.0, col: [0.74, 0.86, 0.82] },
      { x: 2080, y: 6.8,  z: 2560, rad: 380, n: 55, szMin: 17.0, szSpan: 18.0, col: [0.73, 0.85, 0.81] },
      { x: 2580, y: 6.8,   z: 2980, rad: 380, n: 50, szMin: 17.0, szSpan: 18.0, col: [0.74, 0.86, 0.82] },
      { x: 1420, y: 6.8,   z: 3040, rad: 340, n: 45, szMin: 16.0, szSpan: 17.0, col: [0.75, 0.86, 0.83] },
      // 云雾山 Lightweight 7-Tier Cloud-Mist Belts & Summit Rim Mist (高耸入云、穿云而上, smooth FPS!)
      { x: 2660, y: 165.0, z: 3320, rad: 380, n: 32, szMin: 22.0, szSpan: 24.0, col: [0.86, 0.92, 0.96] },
      { x: 3560, y: 315.0, z: 4180, rad: 360, n: 32, szMin: 22.0, szSpan: 24.0, col: [0.88, 0.94, 0.98] },
      { x: 1860, y: 475.0, z: 4220, rad: 340, n: 32, szMin: 22.0, szSpan: 24.0, col: [0.88, 0.94, 0.98] },
      { x: 2860, y: 625.0, z: 4320, rad: 300, n: 32, szMin: 20.0, szSpan: 22.0, col: [0.90, 0.95, 0.99] },
      { x: 2660, y: 745.0, z: 4120, rad: 255, n: 36, szMin: 18.0, szSpan: 20.0, col: [0.90, 0.96, 1.00] },
      // 霜雪原 Subtle Chilly Cold Mist skimming softly over the Frozen Frost Tarn (寒潭冰面薄雾) & 霜雪山 snow-cloud belts!
      { x: -3460, y: 75.2,  z: -5940, rad: 165, n: 38, szMin: 14.0, szSpan: 16.0, col: [0.82, 0.93, 1.00] },
      { x: -1480, y: 295.0, z: -6320, rad: 280, n: 24, szMin: 20.0, szSpan: 22.0, col: [0.86, 0.94, 1.00] },
      { x: -1480, y: 505.0, z: -7260, rad: 250, n: 24, szMin: 18.0, szSpan: 20.0, col: [0.88, 0.95, 1.00] },
      { x: -1480, y: 668.0, z: -6880, rad: 210, n: 28, szMin: 16.0, szSpan: 18.0, col: [0.90, 0.96, 1.00] },
      // 灵竹幽谷 Light Drifting Jade-Cyan Valley Mist
      { x: 2660,  y: 21.5,  z: 5640,  rad: 260, n: 24, szMin: 15.0, szSpan: 16.0, col: [0.68, 0.90, 0.84] },
      { x: 2660,  y: 21.5,  z: 6020,  rad: 185, n: 28, szMin: 14.0, szSpan: 15.0, col: [0.68, 0.90, 0.84] },
      // 蚀骨毒潭 Low-Hugging Sinister Purple-Green Venom Miasma
      { x: 4560,  y: 9.8,   z: 2180,  rad: 240, n: 26, szMin: 14.0, szSpan: 16.0, col: [0.46, 0.28, 0.56] },
      { x: 4960,  y: 9.0,   z: 2160,  rad: 155, n: 34, szMin: 13.0, szSpan: 15.0, col: [0.46, 0.28, 0.56] },
      { x: 4960,  y: 8.8,   z: 2160,  rad: 195, n: 26, szMin: 13.0, szSpan: 14.0, col: [0.30, 0.56, 0.40] },
      // 幽林秘岭 Deep Mountain Ravine Mist & Cliffside Cloud-Veil below the Abandoned Cave-Mansion!
      { x: 1120,  y: 122.0, z: 6260,  rad: 360, n: 34, szMin: 18.0, szSpan: 22.0, col: [0.74, 0.88, 0.86] },
      { x:  860,  y:  88.0, z: 5620,  rad: 340, n: 30, szMin: 17.0, szSpan: 20.0, col: [0.75, 0.88, 0.86] },
      { x: 1420,  y: 132.0, z: 7260,  rad: 420, n: 32, szMin: 19.0, szSpan: 22.0, col: [0.74, 0.87, 0.85] },
      { x: 1220,  y: 154.0, z: 6560,  rad: 165, n: 24, szMin: 15.0, szSpan: 18.0, col: [0.78, 0.91, 0.90] },
    ];
    for (const mz of mistZones) {
      for (let i = 0; i < mz.n; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * mz.rad;
        pushP(mz.x + Math.cos(a) * r, mz.y + rand() * 7.5, mz.z + Math.sin(a) * r, mz.szMin + rand() * mz.szSpan, mz.col[0], mz.col[1], mz.col[2], 0.22 + rand() * 0.28, rand() * 6.28, 2.0);
      }
    }

    // 流沙荒漠 Lightweight Ground-Hugging Drifting Sand / Dust Veil Particles (460 soft low-alpha particles across west-expanded desert, kind = 3.0!)
    let placedSandDust = 0, sandDustTries = 0;
    while (placedSandDust < 460 && sandDustTries < 4200) {
      sandDustTries++;
      const sx = -8980 + rand() * 4940;
      const sz = 1600 + rand() * 5620;
      if (T.getDesertMask(sx, sz) < 0.28) continue;
      const sy = T.getMeshTerrainHeight(sx, sz) + 1.2 + rand() * 4.8;
      pushP(sx, sy, sz, 11.0 + rand() * 14.0, 0.88, 0.74, 0.48, 0.55 + rand() * 0.55, rand() * 6.28, 3.0);
      placedSandDust++;
    }

    // 霜雪原 & 霜雪山 Lightweight Slowly Falling Snowflakes (650 crisp gentle snowflakes across expanded W/N/NE snowfield, kind = 4.0!)
    let placedSnowFlakes = 0, snowFlakeTries = 0;
    while (placedSnowFlakes < 650 && snowFlakeTries < 5600) {
      snowFlakeTries++;
      const sx = -8260 + rand() * 12020;
      const sz = -9020 + rand() * 4760;
      if (T.getSnowfieldMask(sx, sz) < 0.22 && T.getFrostMountainMask(sx, sz) < 0.22) continue;
      const sy = T.getMeshTerrainHeight(sx, sz) + 16.0 + rand() * 28.0;
      pushP(sx, sy, sz, 0.22 + rand() * 0.22, 0.94, 0.98, 1.00, 0.45 + rand() * 0.45, rand() * 6.28, 4.0);
      placedSnowFlakes++;
    }

    return {
      data: new Float32Array(list),
      count: list.length / 10,
    };
  }

  // 11. 56 Circling White Cranes across the vast sky!
  function buildCranes() {
    const rand = N.createRNG(10801);
    const cranes = [];
    const centers = [
      { x: -1020, y: 86,  z: 1100, rMin: 140, rMax: 320 },
      { x: -1880, y: 92,  z: 1620, rMin: 180, rMax: 380 },
      { x: -2750, y: 96,  z: 2450, rMin: 200, rMax: 420 },
      { x: -1350, y: 90,  z: 2780, rMin: 180, rMax: 380 },
      { x: -2050, y: 92,  z: 4050, rMin: 200, rMax: 420 },
      { x: -3050, y: 94,  z: 4120, rMin: 200, rMax: 420 },
      { x: -1950, y: 92,  z: 6150, rMin: 220, rMax: 440 },
      { x: 0,     y: 78,  z: 0,    rMin: 90,  rMax: 185 }, // 白鹤盘旋于青石城上空
    ];
    for (let i = 0; i < 56; i++) {
      const c = centers[i % centers.length];
      cranes.push({
        cx: c.x + (rand() - 0.5) * 56,
        cy: c.y + (rand() - 0.5) * 26,
        cz: c.z + (rand() - 0.5) * 56,
        radius: M.lerp(c.rMin, c.rMax, rand()),
        speed: (0.10 + rand() * 0.11) * (i % 2 === 0 ? 1 : -1),
        phase: rand() * Math.PI * 2,
        flapSpeed: 4.8 + rand() * 1.4,
        scale: 1.2 + rand() * 0.52,
      });
    }
    return cranes;
  }

  function buildAllNature(collisionWorld = null) {
    const trees = buildTreesAndBamboo(collisionWorld);
    return {
      grassMesh: createGrassTuftMesh(),
      toroidalGrass: buildToroidalGrassGrid(252),
      islandGrass: buildFloatingIslandGrass(trees.groveHerbsAndReeds),
      canopyMesh: createCanopyPuffMesh(),
      trunkMesh: trees.trunkMesh,
      canopyInstances: { data: trees.canopyData, count: trees.canopyCount },
      boulderMesh: createBoulderMesh(),
      boulderInstances: buildBoulderInstances(collisionWorld, trees.groveBoulders),
      cloudSeaMesh: buildCloudSeaMesh(),
      cloudPuffs: buildCloudPuffs(),
      particles: buildParticles(),
      craneMesh: createCraneMesh(),
      cranes: buildCranes(),
    };
  }

  XW.Nature = {
    buildAllNature,
  };
})(window);
