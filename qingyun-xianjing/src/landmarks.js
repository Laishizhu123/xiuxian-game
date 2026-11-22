(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const N = XW.Noise;
  const T = XW.Terrain;
  const MeshBuilder = XW.MeshBuilder;

  const COL = {
    marble:      [0.86, 0.87, 0.84],
    marbleWarm:  [0.82, 0.80, 0.74],
    stoneDark:   [0.48, 0.52, 0.54],
    vermilion:   [0.68, 0.21, 0.17],
    woodDark:    [0.32, 0.20, 0.14],
    wallCream:   [0.88, 0.86, 0.80],
    roofJade:    [0.17, 0.44, 0.48],
    roofAzure:   [0.19, 0.36, 0.51],
    gold:        [0.88, 0.72, 0.36],
    eaveTrim:    [0.82, 0.74, 0.50],
    windowGlow:  [1.00, 0.82, 0.46],
    spiritCyan:  [0.24, 0.94, 0.96],
    spiritJade:  [0.28, 0.96, 0.78],
    spiritViolet:[0.58, 0.62, 1.00],
    lotusPink:   [0.98, 0.72, 0.82],
    lotusLeaf:   [0.20, 0.48, 0.28],
  };

  // Refined Multi-Tier Pavilion (亭) with 3-tier stepped Xumi stone foundation, staircases, balustrades, Dou-Gong beams & flying eave lanterns
  function buildPavilion(mb, cx, baseY, cz, radius, sides, doubleTier, roofCol) {
    // 3-tier carved Xumi marble foundation (三层须弥座石质台基 — deeply anchored so pillars never touch raw ground!)
    mb.addCylinder(cx, baseY - 2.6, cz, radius * 1.38, radius * 1.30, 3.0, sides, COL.stoneDark, 0.66, 0, 1.0);
    mb.addCylinder(cx, baseY + 0.4, cz, radius * 1.18, radius * 1.16, 0.42, sides, COL.marbleWarm, 0.58, 0, 1.0);
    mb.addCylinder(cx, baseY + 0.82, cz, radius * 1.08, radius * 1.07, 0.46, sides, COL.marble, 0.52, 0, 1.0);

    const floorY = baseY + 1.28;
    const colH = radius * 1.14;
    const colR = radius * 0.86;
    const halfBay = Math.floor(sides / 2);

    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + Math.PI / sides;
      const aNext = ((i + 1) / sides) * Math.PI * 2 + Math.PI / sides;
      const px = cx + Math.cos(a) * colR;
      const pz = cz + Math.sin(a) * colR;
      const nx = cx + Math.cos(aNext) * colR;
      const nz = cz + Math.sin(aNext) * colR;

      mb.addPillarWithBase(px, floorY, pz, Math.max(0.24, radius * 0.042), colH, COL.vermilion, COL.marble, COL.gold);

      const mx = (px + nx) * 0.5, mz = (pz + nz) * 0.5;
      const span = Math.hypot(nx - px, nz - pz);
      const ang = Math.atan2(nx - px, nz - pz);
      const midA = (a + aNext) * 0.5;

      // 2 opposing entry bays receive 4-step stone staircases (垂带踏跺台阶); other bays get carved wooden benches & stone balustrades!
      if (i === 0 || i === halfBay) {
        const stairDist = radius * 1.24;
        const sx = cx + Math.cos(midA) * stairDist;
        const sz = cz + Math.sin(midA) * stairDist;
        mb.addSteppedStairway(sx, baseY - 0.10, sz, span * 0.78, 1.38, radius * 0.42, 4, midA, COL.marble, COL.marbleWarm);
      } else {
        // Outer stone balustrade curb + inner lacquered wooden 美人靠 bench
        const bx = cx + Math.cos(midA) * (radius * 1.01);
        const bz = cz + Math.sin(midA) * (radius * 1.01);
        mb.addCarvedBalustrade(
          cx + Math.cos(a) * (radius * 1.01), floorY, cz + Math.sin(a) * (radius * 1.01),
          cx + Math.cos(aNext) * (radius * 1.01), floorY, cz + Math.sin(aNext) * (radius * 1.01),
          0.88, COL.marble
        );
        mb.addBox(mx, floorY + 0.44, mz, 0.44, 0.46, span * 0.86, ang, COL.woodDark, 0.52, 0, 1.30);
        mb.addBox(mx, floorY + 0.90, mz, 0.22, 0.44, span * 0.86, ang, COL.vermilion, 0.46, 0, 1.30);
      }
    }

    // Overhead ring architrave (额枋) & central hanging warm pavilion palace lantern
    mb.setCollision(false);
    mb.addCylinder(cx, floorY + colH - 0.30, cz, radius * 0.96, radius * 0.96, 0.66, sides, COL.woodDark, 0.52, 0, 1.30);
    mb.addCylinder(cx, floorY + colH + 0.22, cz, radius * 0.98, radius * 0.98, 0.16, sides, COL.gold, 0.28, 0.08, 3.0);
    mb.addHangingLantern(cx, floorY + colH - 0.10, cz, Math.max(0.95, radius * 0.16), COL.windowGlow);
    mb.setCollision(true, 'building');

    const roofY = floorY + colH + 0.08;
    mb.addPagodaRoof(cx, roofY, cz, radius * 1.48, radius * 0.74, sides, 0.24, radius * 0.30, roofCol, COL.gold);

    if (doubleTier) {
      const tierY = roofY + radius * 0.38;
      const r2 = radius * 0.66;
      const h2 = radius * 0.62;
      mb.addCylinder(cx, tierY, cz, r2, r2, h2, sides, COL.vermilion, 0.48, 0, 1.30);
      mb.setCollision(false);
      // Upper tier wrap-around wooden balcony balustrade (平座勾栏)
      mb.addCylinder(cx, tierY - 0.10, cz, r2 * 1.18, r2 * 1.14, 0.22, sides, COL.woodDark, 0.52, 0, 1.30);
      mb.addCylinder(cx, tierY + 0.12, cz, r2 * 1.16, r2 * 1.16, 0.42, sides, COL.vermilion, 0.48, 0, 1.30);
      mb.addCylinder(cx, tierY + h2 * 0.24, cz, r2 * 1.02, r2 * 1.02, h2 * 0.48, sides, COL.windowGlow, 0.24, 1.15, 2.0);
      mb.setCollision(true, 'building');
      mb.addPagodaRoof(cx, tierY + h2 - 0.08, cz, r2 * 1.56, radius * 0.72, sides, 0.26, radius * 0.28, roofCol, COL.gold);
    }
  }

  // 1. South & Central Plains Architecture (入山牌坊, 问仙石台, 歇脚亭, 渡仙三孔桥)
  function buildPlainsLandmarks(mb) {
    // A) South Welcome Archway (入山牌坊) at (0, 19.5, 680) — Multi-tier Xumi Stone Platform & Stepped Approaches!
    const ax = 0, ay = 19.5, az = 680;
    mb.addBox(ax, ay - 0.90, az, 26.0, 2.20, 11.6, 0, COL.stoneDark, 0.66, 0, 1.0);
    mb.addBox(ax, ay + 0.28, az, 23.2, 0.56, 9.2, 0, COL.marbleWarm, 0.56, 0, 1.0);
    mb.addSteppedStairway(ax, ay - 0.40, az + 5.6, 10.4, 0.96, 2.6, 4, 0, COL.marble, COL.marbleWarm);
    mb.addSteppedStairway(ax, ay - 0.40, az - 5.6, 10.4, 0.96, 2.6, 4, Math.PI, COL.marble, COL.marbleWarm);
    // Flanking stone balustrades on the archway terrace
    mb.addCarvedBalustrade(ax - 11.2, ay + 0.56, az + 4.2, ax - 11.2, ay + 0.56, az - 4.2, 1.05, COL.marble);
    mb.addCarvedBalustrade(ax + 11.2, ay + 0.56, az + 4.2, ax + 11.2, ay + 0.56, az - 4.2, 1.05, COL.marble);

    for (const px of [-8.2, -3.9, 3.9, 8.2]) {
      const isInner = Math.abs(px) < 5;
      // Sculpted stone drum buttresses (抱鼓石/夹杆石) anchoring each pillar into the terrace
      mb.addBox(ax + px, ay + 1.05, az, 2.1, 1.45, 2.8, 0, COL.marble, 0.54, 0, 1.0);
      mb.addCylinder(ax + px, ay + 1.15, az + 1.35, 0.72, 0.72, 1.10, 10, COL.marbleWarm, 0.52, 0, 1.0);
      mb.addCylinder(ax + px, ay + 1.15, az - 1.35, 0.72, 0.72, 1.10, 10, COL.marbleWarm, 0.52, 0, 1.0);
      mb.addPillarWithBase(ax + px, ay + 1.5, az, isInner ? 0.50 : 0.42, isInner ? 10.2 : 7.8, COL.vermilion);
    }
    mb.addBox(ax, ay + 11.4, az, 9.2, 1.2, 1.3, 0, COL.woodDark, 0.52, 0, 1.30);
    mb.addCurvedRoof(ax, ay + 12.0, az, 12.2, 5.8, 4.1, 0, 0.24, 2.0, COL.roofJade, COL.gold, COL.eaveTrim);
    for (const s of [-1, 1]) {
      mb.addBox(ax + s * 6.05, ay + 9.0, az, 4.8, 0.9, 1.05, 0, COL.vermilion, 0.48, 0, 1.30);
      mb.addCurvedRoof(ax + s * 6.2, ay + 9.5, az, 6.8, 4.5, 2.7, 0, 0.22, 1.35, COL.roofJade, COL.gold, COL.eaveTrim);
    }
    mb.addStoneLantern(ax - 11.5, ay + 0.56, az + 5.2, 1.2, COL.windowGlow);
    mb.addStoneLantern(ax + 11.5, ay + 0.56, az + 5.2, 1.2, COL.windowGlow);

    // B) Spawn Trailhead Stone Terrace (问仙石台) at (0, 21.0, 420) — 3-Tier Carved Jade Platform with Balustrades & Steps!
    mb.addCylinder(0, 18.6, 420, 14.2, 13.6, 2.2, 20, COL.stoneDark, 0.64, 0, 1.0);
    mb.addCylinder(0, 20.1, 420, 12.4, 12.1, 0.65, 20, COL.marbleWarm, 0.56, 0, 1.0);
    mb.addCylinder(0, 20.6, 420, 11.3, 11.1, 0.58, 20, COL.marble, 0.50, 0, 1.0);
    mb.addSteppedStairway(0, 20.0, 432.2, 5.6, 1.18, 2.8, 4, 0, COL.marble, COL.marbleWarm);
    mb.addSteppedStairway(0, 20.0, 407.8, 5.6, 1.18, 2.8, 4, Math.PI, COL.marble, COL.marbleWarm);
    mb.addCarvedBalustrade(-10.5, 21.15, 423.5, -4.2, 21.15, 429.8, 1.05, COL.marble);
    mb.addCarvedBalustrade( 4.2,  21.15, 429.8, 10.5, 21.15, 423.5, 1.05, COL.marble);
    mb.addCarvedBalustrade(-10.5, 21.15, 416.5, -4.2, 21.15, 410.2, 1.05, COL.marble);
    mb.addCarvedBalustrade( 4.2,  21.15, 410.2, 10.5, 21.15, 416.5, 1.05, COL.marble);
    mb.addStoneLantern(-10.0, 21.15, 412.5, 1.15, COL.windowGlow);
    mb.addStoneLantern( 10.0, 21.15, 412.5, 1.15, COL.windowGlow);

    // C) Roadside Octagonal Rest Pavilion (半山歇脚亭) at (28, 17.5, 290)
    buildPavilion(mb, 28, 17.5, 290, 6.6, 8, false, COL.roofJade);
    mb.addStoneLantern(19, 17.5, 284, 1.05, COL.windowGlow);
    mb.addStoneLantern(37, 17.5, 296, 1.05, COL.windowGlow);

    // D) Guiding Stone Lanterns sparsely marking the sweeping Pilgrim Post-Road
    for (const [lx, lz] of [
      [-9, 590], [9, 505], [16, 355], [18, 225], [-9, 175],
      [-9, 20], [9, -65], [-10, -155], [10, -210],
    ]) {
      mb.addStoneLantern(lx, T.getTerrainHeight(lx, lz), lz, 1.05, COL.windowGlow);
    }

    // E) Central Plains Triple-Arch Stone Bridge (渡仙三孔桥) spanning the meandering river at (0, 14.2, 105)!
    mb.addArchedBridge(0, 14.2, 105, 82, 11.4, 4.8, 0, 3);
    mb.addStoneLantern(-7.6, 14.2, 148, 1.2, COL.windowGlow);
    mb.addStoneLantern( 7.6, 14.2, 148, 1.2, COL.windowGlow);
    mb.addStoneLantern(-7.6, 14.2,  62, 1.2, COL.windowGlow);
    mb.addStoneLantern( 7.6, 14.2,  62, 1.2, COL.windowGlow);
  }

  // 2. Grand Mountain Gate (青云山门) at (0, 42.0, -260) & 140m Ascending Celestial Stairway
  function buildMountainGateAndStairs(mb) {
    const cx = 0, baseY = 42.0, cz = -260;
    const pillarXs = [-13.2, -5.8, 5.8, 13.2];

    // Monumental 3-Tier Xumi Stone Foundation Platform (三层须弥座山门台基) so outer pillars stand proudly on stone!
    mb.addBox(cx, baseY - 1.4, cz, 38.0, 3.2, 16.0, 0, COL.stoneDark, 0.66, 0, 1.0);
    mb.addBox(cx, baseY + 0.35, cz, 34.8, 0.72, 13.2, 0, COL.marbleWarm, 0.56, 0, 1.0);
    mb.addBox(cx, baseY + 0.85, cz, 32.4, 0.54, 11.2, 0, COL.marble, 0.50, 0, 1.0);
    // Front & Rear Imperial Stepped Stone Approaches (踏跺石阶)
    mb.addSteppedStairway(cx, baseY - 0.15, cz + 7.2, 14.0, 1.28, 3.4, 5, 0, COL.marble, COL.marbleWarm);
    mb.addSteppedStairway(cx, baseY - 0.15, cz - 7.2, 14.0, 1.28, 3.4, 5, Math.PI, COL.marble, COL.marbleWarm);
    // Flanking Carved Stone Balustrades around the Mountain Gate Terrace
    mb.addCarvedBalustrade(cx - 15.8, baseY + 1.12, cz + 5.2, cx - 7.5, baseY + 1.12, cz + 5.2, 1.15, COL.marble);
    mb.addCarvedBalustrade(cx + 7.5,  baseY + 1.12, cz + 5.2, cx + 15.8, baseY + 1.12, cz + 5.2, 1.15, COL.marble);
    mb.addCarvedBalustrade(cx - 15.8, baseY + 1.12, cz + 5.2, cx - 15.8, baseY + 1.12, cz - 5.2, 1.15, COL.marble);
    mb.addCarvedBalustrade(cx + 15.8, baseY + 1.12, cz + 5.2, cx + 15.8, baseY + 1.12, cz - 5.2, 1.15, COL.marble);

    for (const px of pillarXs) {
      const isInner = Math.abs(px) < 7;
      mb.addBox(cx + px, baseY + 1.35, cz, 2.9, 1.9, 3.6, 0, COL.marble, 0.52, 0, 1.0);
      mb.addCylinder(cx + px, baseY + 1.50, cz + 1.65, 0.88, 0.88, 1.35, 12, COL.marbleWarm, 0.50, 0, 1.0);
      mb.addCylinder(cx + px, baseY + 1.50, cz - 1.65, 0.88, 0.88, 1.35, 12, COL.marbleWarm, 0.50, 0, 1.0);
      mb.addPillarWithBase(cx + px, baseY + 2.1, cz, isInner ? 0.68 : 0.56, isInner ? 13.8 : 10.4, COL.vermilion);
    }

    // Main central lintel beams & ornate gilded jade Mountain Gate plaque (青云宗匾额)
    mb.addBox(cx, baseY + 12.4, cz, 12.2, 1.15, 1.35, 0, COL.vermilion, 0.46, 0, 1.30);
    mb.addBox(cx, baseY + 14.8, cz, 13.0, 1.50, 1.55, 0, COL.woodDark, 0.52, 0, 1.30);
    mb.setCollision(false);
    for (const sZ of [-1, 1]) {
      mb.addBox(cx, baseY + 13.5, cz + sZ * 0.80, 5.2, 1.95, 0.24, 0, COL.gold, 0.24, 0.16, 3.0);
      mb.addBox(cx, baseY + 13.5, cz + sZ * 0.90, 4.5, 1.38, 0.14, 0, [0.10, 0.24, 0.30], 0.38, 0.0, 1.30);
      for (const gx of [-1.2, 0, 1.2]) {
        mb.addBox(cx + gx, baseY + 13.5, cz + sZ * 0.98, 0.52, 0.72, 0.08, 0, COL.spiritCyan, 0.18, 1.65, 2.0);
      }
    }
    mb.setCollision(true, 'building');

    for (const s of [-1, 1]) {
      mb.addBox(cx + s * 9.5, baseY + 10.2, cz, 7.6, 1.05, 1.20, 0, COL.vermilion, 0.46, 0, 1.30);
      mb.addBox(cx + s * 9.5, baseY + 11.7, cz, 8.0, 1.05, 1.35, 0, COL.woodDark, 0.52, 0, 1.30);
      mb.addCurvedRoof(cx + s * 9.8, baseY + 12.2, cz, 10.0, 5.8, 3.8, 0, 0.24, 1.85, COL.roofJade, COL.gold, COL.eaveTrim);
    }

    mb.addCurvedRoof(cx, baseY + 15.6, cz, 16.8, 7.6, 5.4, 0, 0.28, 2.75, COL.roofJade, COL.gold, COL.eaveTrim);
    mb.addStoneLantern(cx - 16.5, baseY + 0.6, cz + 6.5, 1.4, COL.windowGlow);
    mb.addStoneLantern(cx + 16.5, baseY + 0.6, cz + 6.5, 1.4, COL.windowGlow);

    // Grand 140m Ascending Celestial Stairway (登仙长梯: z = -274 -> -412, y = 42 -> 74)
    const upperSteps = 56;
    for (let i = 0; i < upperSteps; i++) {
      const t = i / (upperSteps - 1);
      const z = M.lerp(-274, -412, t);
      const y = T.getTerrainHeight(0, z);
      mb.addBox(0, y - 0.18, z, 12.6, 0.92, 2.65, 0, COL.marble, 0.54, 0, 1.0);
      for (const s of [-1, 1]) {
        mb.addBox(s * 6.7, y + 0.58, z, 0.76, 1.42, 2.70, 0, COL.marble, 0.52, 0, 1.0);
        if (i % 9 === 2) {
          mb.addStoneLantern(s * 8.2, y, z, 1.2, COL.spiritCyan);
        }
      }
    }
  }

  // 3. Lingxiao Immortal Palace Complex (凌霄仙殿) perched high on Northern Sect Peak (0, 74, -462)
  function buildImmortalPalace(mb) {
    const cy = 74.0;
    const plazaZ = -456;

    // Grand Carved White-Jade Courtyard Disc & Multi-Tier Perimeter Retaining Foundation
    mb.addBox(0, cy - 2.4, -460, 114.0, 4.5, 98.0, 0, COL.stoneDark, 0.66, 0, 1.0);
    mb.addCylinder(0, cy - 1.2, plazaZ, 26.5, 26.0, 1.35, 28, COL.marble, 0.50, 0, 1.0);
    mb.addCylinder(0, cy + 0.12, plazaZ, 20.0, 20.0, 0.18, 28, COL.marbleWarm, 0.46, 0, 1.0);

    // Front Carved Jade Balustrades framing the overlook edge of the Palace Plaza
    mb.addCarvedBalustrade(-54, cy, -412, -8, cy, -412, 1.25, COL.marble);
    mb.addCarvedBalustrade(  8, cy, -412, 54, cy, -412, 1.25, COL.marble);
    mb.addCarvedBalustrade(-54, cy, -412, -54, cy, -502, 1.25, COL.marble);
    mb.addCarvedBalustrade( 54, cy, -412,  54, cy, -502, 1.25, COL.marble);

    // 8 Carved Jade Spirit Formation Pillars ringing the courtyard array
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      if (Math.abs(Math.sin(a)) > 0.85 && Math.abs(Math.cos(a)) < 0.45) continue;
      const px = Math.cos(a) * 23.2;
      const pz = plazaZ + Math.sin(a) * 23.2;
      mb.addBox(px, cy + 0.6, pz, 1.65, 1.25, 1.65, -a, COL.marble, 0.52, 0, 1.0);
      mb.addCylinder(px, cy + 1.2, pz, 0.50, 0.40, 4.8, 10, COL.marble, 0.48, 0, 1.0);
      mb.addCrystalSpire(px, cy + 6.0, pz, 0.48, 1.9, 0, a, 0, COL.spiritCyan, 2.15);
    }

    // --- Main Immortal Hall (凌霄主殿) at (0, 77.2, -492) ---
    const cx = 0, baseY = 77.2, cz = -492;
    // 3-tier Xumi Sculpted Marble Podium with Perimeter Balustrades!
    mb.addBox(cx, baseY - 1.8, cz, 41.2, 4.2, 27.4, 0, COL.stoneDark, 0.64, 0, 1.0);
    mb.addBox(cx, baseY + 0.3, cz, 38.0, 2.2, 24.6, 0, COL.marbleWarm, 0.56, 0, 1.0);
    mb.addBox(cx, baseY + 1.9, cz, 33.8, 2.0, 21.2, 0, COL.marble, 0.50, 0, 1.0);

    // Imperial Front Marble Stairs + Flanking Cheek-Walls & Balustrades
    for (let i = 0; i < 7; i++) {
      const sy = baseY - 2.6 + i * 0.80;
      const sz = cz + 15.2 - i * 0.90;
      mb.addBox(cx, sy, sz, 11.6, 0.92, 1.48, 0, COL.marble, 0.52, 0, 1.0);
    }
    mb.addCarvedBalustrade(-5.9, baseY - 2.6, cz + 15.6, -5.9, baseY + 2.9, cz + 10.2, 1.10, COL.marble);
    mb.addCarvedBalustrade( 5.9, baseY - 2.6, cz + 15.6,  5.9, baseY + 2.9, cz + 10.2, 1.10, COL.marble);

    const deckY = baseY + 2.9;
    // Podium deck perimeter jade balustrades around the Main Hall peristyle!
    mb.addCarvedBalustrade(-16.4, deckY, cz + 10.2, -6.0,  deckY, cz + 10.2, 1.12, COL.marble);
    mb.addCarvedBalustrade(  6.0, deckY, cz + 10.2,  16.4, deckY, cz + 10.2, 1.12, COL.marble);
    mb.addCarvedBalustrade(-16.4, deckY, cz + 10.2, -16.4, deckY, cz - 10.2, 1.12, COL.marble);
    mb.addCarvedBalustrade( 16.4, deckY, cz + 10.2,  16.4, deckY, cz - 10.2, 1.12, COL.marble);
    mb.addCarvedBalustrade(-16.4, deckY, cz - 10.2,  16.4, deckY, cz - 10.2, 1.12, COL.marble);

    mb.addBox(cx, deckY + 4.8, cz, 23.6, 9.6, 13.6, 0, COL.wallCream, 0.58, 0, 1.42);

    // Ornate Gilded Hall Plaque above Main Doors
    mb.setCollision(false);
    mb.addBox(cx, deckY + 8.0, cz + 6.96, 7.0, 2.0, 0.32, 0, COL.gold, 0.24, 0.14, 3.0);
    mb.addBox(cx, deckY + 8.0, cz + 7.10, 6.2, 1.35, 0.16, 0, [0.10, 0.22, 0.28], 0.38, 0.0, 1.30);
    for (const gx of [-1.8, -0.6, 0.6, 1.8]) {
      mb.addBox(cx + gx, deckY + 8.0, cz + 7.20, 0.54, 0.72, 0.08, 0, COL.gold, 0.2, 1.0, 2.0);
    }
    mb.setCollision(true, 'building');

    // Carved Wooden Lattice Doors & Side Windows (雕花门窗)
    mb.addLatticeWindow(cx, deckY + 3.2, cz + 6.90, 6.8, 5.4, 0, COL.vermilion, COL.windowGlow, 1.35);
    for (const sx of [-7.6, 7.6]) {
      mb.addLatticeWindow(cx + sx, deckY + 4.4, cz + 6.90, 4.0, 3.6, 0, COL.vermilion, COL.windowGlow, 1.15);
    }
    for (const sx of [-11.90, 11.90]) {
      mb.addLatticeWindow(cx + sx, deckY + 4.4, cz, 6.0, 3.6, Math.PI * 0.5, COL.vermilion, COL.windowGlow, 1.15);
    }

    // 14 Grand Vermilion Peristyle Columns with Carved Jade Bases & Golden Capitals
    for (const px of [-13.8, -7.2, -3.0, 3.0, 7.2, 13.8]) {
      mb.addPillarWithBase(cx + px, deckY, cz + 8.4, 0.56, 9.6, COL.vermilion);
      mb.addPillarWithBase(cx + px, deckY, cz - 8.4, 0.56, 9.6, COL.vermilion);
    }
    for (const pz of [-3.0, 3.0]) {
      mb.addPillarWithBase(cx - 13.8, deckY, cz + pz, 0.56, 9.6, COL.vermilion);
      mb.addPillarWithBase(cx + 13.8, deckY, cz + pz, 0.56, 9.6, COL.vermilion);
    }

    mb.addBox(cx, deckY + 9.7, cz, 29.2, 1.45, 18.4, 0, COL.woodDark, 0.52, 0, 1.30);
    mb.addBox(cx, deckY + 10.3, cz, 29.8, 0.50, 19.0, 0, COL.gold, 0.28, 0.08, 3.0);

    // Lower Tier Monumental Tile-Ribbed Flying-Eaves Roof (下檐重檐)
    mb.addCurvedRoof(cx, deckY + 10.5, cz, 35.6, 23.0, 6.4, 0, 0.25, 3.4, COL.roofJade, COL.gold, COL.eaveTrim);

    // Upper Clerestory Story (重楼) + Wrap-Around Wooden Balcony (平座勾栏) + Grand Upper Flying-Eaves Roof
    const upperY = deckY + 15.2;
    mb.addBox(cx, upperY - 0.15, cz, 21.2, 0.45, 13.4, 0, COL.woodDark, 0.52, 0, 1.30);
    mb.addCarvedBalustrade(cx - 10.2, upperY + 0.05, cz + 6.4, cx + 10.2, upperY + 0.05, cz + 6.4, 0.92, COL.vermilion);
    mb.addCarvedBalustrade(cx - 10.2, upperY + 0.05, cz - 6.4, cx + 10.2, upperY + 0.05, cz - 6.4, 0.92, COL.vermilion);
    mb.addBox(cx, upperY + 2.6, cz, 18.4, 5.2, 10.8, 0, COL.vermilion, 0.48, 0, 1.30);
    mb.addLatticeWindow(cx, upperY + 2.6, cz + 5.50, 12.2, 2.4, 0, COL.woodDark, COL.windowGlow, 1.3);
    mb.addLatticeWindow(cx, upperY + 2.6, cz - 5.50, 12.2, 2.4, Math.PI, COL.woodDark, COL.windowGlow, 1.15);
    mb.addCurvedRoof(cx, upperY + 5.2, cz, 26.2, 17.0, 7.4, 0, 0.28, 3.8, COL.roofAzure, COL.gold, COL.eaveTrim);

    // Flanking Twin Side Halls (东西配殿) — Upgraded with 3-tier stone foundations, stepped stairs & perimeter balustrades!
    for (const s of [-1, 1]) {
      const sx = s * 41.5, sz = -464, rot = -s * 0.24;
      const cR = Math.cos(rot), sR = Math.sin(rot);
      // 3-tier stepped stone Xumi podium
      mb.addBox(sx, cy - 1.4, sz, 20.4, 3.2, 15.6, rot, COL.stoneDark, 0.64, 0, 1.0);
      mb.addBox(sx, cy + 0.2, sz, 18.4, 1.2, 13.6, rot, COL.marbleWarm, 0.56, 0, 1.0);
      mb.addBox(sx, cy + 0.9, sz, 16.8, 0.65, 12.0, rot, COL.marble, 0.50, 0, 1.0);
      // Front 4-step stone staircase leading into each side hall
      const stP = MeshBuilder.xformY(0, 0, 7.2, sx, cy - 0.1, sz, cR, sR);
      mb.addSteppedStairway(stP[0], stP[1], stP[2], 6.4, 1.35, 2.8, 4, rot, COL.marble, COL.marbleWarm);

      mb.addBox(sx, cy + 4.5, sz, 13.0, 6.8, 8.4, rot, COL.wallCream, 0.58, 0, 1.42);
      const wp = MeshBuilder.xformY(0, 4.1, 4.30, sx, cy, sz, cR, sR);
      mb.addLatticeWindow(wp[0], wp[1], wp[2], 5.8, 3.6, rot, COL.vermilion, COL.windowGlow, 1.25);
      for (const lx of [-6.4, 0, 6.4]) {
        for (const lz of [-4.6, 4.6]) {
          const p = MeshBuilder.xformY(lx, 0, lz, sx, cy + 1.22, sz, cR, sR);
          mb.addPillarWithBase(p[0], p[1], p[2], 0.36, 6.8, COL.vermilion);
        }
      }
      mb.addCurvedRoof(sx, cy + 8.0, sz, 18.6, 13.0, 5.0, rot, 0.25, 2.55, COL.roofJade, COL.gold, COL.eaveTrim);
    }

    // Twin Corner Bell & Drum Octagonal Pavilions (钟鼓双亭) framing the outer Palace Courtyard!
    buildPavilion(mb, -44, cy, -424, 6.2, 8, false, COL.roofAzure);
    buildPavilion(mb,  44, cy, -424, 6.2, 8, false, COL.roofAzure);
  }

  // 4. Bamboo Valley Spirit Spring (幽篁灵泉 — Far West at -540, 12.2, 80)
  function buildSpiritSpringDetails(mb) {
    // Graceful Arched Stone Footbridge crossing the outflow brook at (-474, 13.6, 108)
    mb.addArchedBridge(-474, 13.6, 108, 33, 6.8, 3.2, 0.45, 1);

    // Lakeside Water Pavilion (听泉水榭) at (-504, 15.0, 134)
    buildPavilion(mb, -504, 15.0, 134, 7.2, 8, true, COL.roofJade);
    mb.addStoneLantern(-494, 15.2, 128, 1.1, COL.spiritJade);
    mb.addStoneLantern(-514, 15.2, 140, 1.1, COL.spiritJade);

    // Floating Lotus Pads & Luminous Spirit Lotuses
    mb.setCollision(false);
    const rand = N.createRNG(88103);
    for (let i = 0; i < 58; i++) {
      const a = rand() * Math.PI * 2;
      const r = 6.0 + Math.sqrt(rand()) * 46.0;
      const x = -540 + Math.cos(a) * r;
      const z = 80 + Math.sin(a) * r;
      if (T.getTerrainHeight(x, z) > T.SPRING_WATER_Y - 0.5) continue;

      const padR = 0.80 + rand() * 0.90;
      mb.addCylinder(x, T.SPRING_WATER_Y + 0.02, z, padR, padR, 0.08, 8, COL.lotusLeaf, 0.58);
      if (i % 3 === 0) {
        const isJade = i % 6 === 0;
        const petalCol = isJade ? COL.spiritJade : COL.lotusPink;
        for (let p = 0; p < 6; p++) {
          const pa = (p / 6) * Math.PI * 2 + rand() * 0.2;
          mb.addBoxEuler(
            x + Math.cos(pa) * 0.34,
            T.SPRING_WATER_Y + 0.32,
            z + Math.sin(pa) * 0.34,
            0.28, 0.52, 0.14,
            0.52, -pa + Math.PI * 0.5, 0,
            petalCol, 0.28, isJade ? 1.55 : 0.95, 2.0
          );
        }
        mb.addCylinder(x, T.SPRING_WATER_Y + 0.14, z, 0.18, 0.24, 0.36, 6, [1.0, 0.92, 0.55], 0.2, 2.2, 2.0);
      }
    }
    mb.setCollision(true, 'building');

    // Subtle glowing jade crystals along the plunge pool cliffs
    for (let i = 0; i < 14; i++) {
      const a = -2.8 + i * 0.24;
      const x = -562 + Math.cos(a) * (24 + (i % 3) * 6);
      const z = 54 + Math.sin(a) * (24 + (i % 2) * 6);
      const y = T.getTerrainHeight(x, z);
      mb.addCrystalSpire(x, y - 0.5, z, 0.8 + (i % 3) * 0.35, 3.4 + (i % 4) * 1.5, (rand() - 0.5) * 0.45, rand() * 6.28, (rand() - 0.5) * 0.45, COL.spiritJade, 1.75);
    }
  }

  // 5. Eastern Spirit-Vein River Gorge Crystal Clusters (灵晶碧峡 — x in [145..410], z in [-260..60])
  function buildSpiritStoneGorge(mb) {
    const rand = N.createRNG(55219);
    const nrm = new Float32Array(3);

    // Curated Hero Crystal Vein Clusters framing the eastern river gorge!
    const heroClusters = [
      { x: 225, z: -10,  col: COL.spiritCyan,   sc: 1.45, leanX: 0.2, leanZ: 0.45 },
      { x: 262, z: -38,  col: COL.spiritJade,   sc: 1.35, leanX: -0.2, leanZ: -0.45 },
      { x: 298, z: -85,  col: COL.spiritViolet, sc: 1.40, leanX: 0.15, leanZ: 0.42 },
      { x: 332, z: -138, col: COL.spiritCyan,   sc: 1.40, leanX: -0.15, leanZ: -0.42 },
      { x: 245, z: 38,   col: COL.spiritCyan,   sc: 1.35, leanX: -0.1, leanZ: -0.48 },
      { x: 282, z: 18,   col: COL.spiritJade,   sc: 1.30, leanX: 0.2, leanZ: 0.45 },
    ];
    for (const hc of heroClusters) {
      const y = T.getTerrainHeight(hc.x, hc.z);
      for (let k = 0; k < 5; k++) {
        const s = hc.sc * (0.65 + (k === 0 ? 0.55 : rand() * 0.45));
        mb.addCrystalSpire(
          hc.x + (rand() - 0.5) * 3.8,
          y - 0.8 + (rand() - 0.5) * 1.4,
          hc.z + (rand() - 0.5) * 3.8,
          (0.65 + rand() * 0.45) * s,
          (3.6 + rand() * 4.2) * s,
          hc.leanZ + (rand() - 0.5) * 0.35,
          rand() * Math.PI * 2,
          hc.leanX + (rand() - 0.5) * 0.35,
          hc.col,
          2.0
        );
      }
    }

    // Procedural crystals strictly along the Eastern Gorge cliff walls (leaving the central plains river serene & natural!)
    for (let i = 0; i < 240; i++) {
      const x = 140 + rand() * 270;
      const z = -265 + rand() * 340;
      const gMask = T.getCanyonMask(x, z);
      if (gMask < 0.14 || gMask > 0.84) continue;
      const y = T.getTerrainHeight(x, z);
      if (y < T.RIVER_WATER_Y + 0.6 || y > 38) continue;
      T.getTerrainNormal(x, z, nrm);
      if (1.0 - nrm[1] < 0.16) continue;

      const tiltX = Math.atan2(nrm[2], nrm[1]) * 0.55;
      const tiltZ = -Math.atan2(nrm[0], nrm[1]) * 0.55;
      const baseCol = rand() < 0.24 ? COL.spiritViolet : (rand() < 0.5 ? COL.spiritCyan : COL.spiritJade);
      const count = 2 + ((rand() * 3) | 0);
      for (let k = 0; k < count; k++) {
        const sc = 0.65 + rand() * 1.15;
        mb.addCrystalSpire(
          x + (rand() - 0.5) * 2.0, y - 0.6 + (rand() - 0.5) * 1.2, z + (rand() - 0.5) * 2.0,
          (0.55 + rand() * 0.55) * sc, (2.8 + rand() * 4.6) * sc,
          tiltX + (rand() - 0.5) * 0.45, rand() * Math.PI * 2, tiltZ + (rand() - 0.5) * 0.45,
          baseCol, 1.7 + rand() * 0.7
        );
      }
    }
  }

  // 6. Solitary Ancient Giant Sword Peak & Sword Tomb (断剑绝峰 · 太古剑冢 — Far East at 620, 92, -60)
  function buildGiantSwordRuins(mb) {
    const cx = 620, cy = 92.0, cz = -60;
    const rand = N.createRNG(77731);

    // 94m Monumental Refined Ancient Immortal Sword!
    mb.addAncientSword(cx, cy + 16.0, cz, 94.0, 0.14, -0.62, -0.22, true);

    // Fractured upturned cliff slabs circling impact point
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rand() * 0.25;
      const dist = 7.0 + rand() * 8.5;
      const rx = cx + Math.cos(a) * dist;
      const rz = cz + Math.sin(a) * dist;
      const ry = T.getTerrainHeight(rx, rz);
      mb.addBoxEuler(
        rx, ry + 1.8, rz,
        3.2 + rand() * 2.8, 5.2 + rand() * 4.4, 1.6 + rand() * 1.4,
        0.35 + rand() * 0.25, -a + Math.PI * 0.5, (rand() - 0.5) * 0.3,
        [0.24, 0.29, 0.34], 0.78
      );
    }

    // Glowing fissure crystals radiating from impact crater
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rand() * 0.3;
      const dist = 5.5 + rand() * 15.0;
      const x = cx + Math.cos(a) * dist;
      const z = cz + Math.sin(a) * dist;
      const y = T.getTerrainHeight(x, z) - 0.4;
      mb.addCrystalSpire(
        x, y, z, 0.55 + rand() * 0.70, 2.4 + rand() * 4.2,
        (rand() - 0.5) * 0.6, rand() * Math.PI * 2, (rand() - 0.5) * 0.6,
        i % 3 === 0 ? [0.96, 0.84, 0.44] : COL.spiritCyan, 1.85
      );
    }

    // 56 Ancient Sword Tomb Blades planted across the summit ridge
    for (let i = 0; i < 56; i++) {
      const a = rand() * Math.PI * 2;
      const dist = 10.5 + Math.pow(rand(), 0.72) * 44.0;
      const x = cx + Math.cos(a) * dist;
      const z = cz + Math.sin(a) * dist;
      const y = T.getTerrainHeight(x, z);
      if (y < 64.0) continue;
      const sc = 4.6 + rand() * 9.0;
      mb.addAncientSword(x, y + sc * 0.14, z, sc, (rand() - 0.5) * 0.45, rand() * Math.PI * 2, (rand() - 0.5) * 0.48, false);
    }

    // Ancient broken stone steles
    for (let i = 0; i < 8; i++) {
      const a = 0.6 + i * 0.78;
      const x = cx + Math.cos(a) * 23.0;
      const z = cz + Math.sin(a) * 23.0;
      const y = T.getTerrainHeight(x, z);
      mb.addBoxEuler(x, y + 2.8, z, 2.3, 6.2 + (i % 2) * 2.0, 0.82, (rand() - 0.5) * 0.20, -a, (rand() - 0.5) * 0.16, COL.stoneDark, 0.74);
    }
  }

  // 7. Vast Cloud-Dream Lake & Seven-Story Immortal Pagoda (云梦大泽 · 镇湖七层宝塔 — Far NE at 520, 14.8, -560)
  function buildCloudDreamPagoda(mb) {
    const cx = 520, baseY = 14.8, cz = -560;

    // 170m Five-Arch Jade Bridge spanning smoothly across the tranquil lake!
    mb.addArchedBridge(520, 13.8, -439, 170, 8.6, 3.4, 0, 5);
    mb.addStoneLantern(513.5, 13.8, -352, 1.3, COL.spiritCyan);
    mb.addStoneLantern(526.5, 13.8, -352, 1.3, COL.spiritCyan);

    // Circular Sculpted 3-Tier Island Sanctum Platform with Cardinal Stepped Staircases & Balustrades!
    mb.addCylinder(cx, baseY - 2.6, cz, 28.0, 26.8, 3.0, 24, COL.stoneDark, 0.64, 0, 1.0);
    mb.addCylinder(cx, baseY + 0.4, cz, 24.5, 24.0, 0.55, 24, COL.marbleWarm, 0.56, 0, 1.0);
    mb.addCylinder(cx, baseY + 0.85, cz, 18.6, 18.0, 0.92, 16, COL.marble, 0.50, 0, 1.0);
    // 4 Cardinal Stepped Stone Staircases ascending the Pagoda Xumi Podium
    for (let s = 0; s < 4; s++) {
      const sa = s * Math.PI * 0.5;
      mb.addSteppedStairway(cx + Math.sin(sa) * 19.2, baseY + 0.35, cz + Math.cos(sa) * 19.2, 6.2, 1.38, 3.2, 4, sa, COL.marble, COL.marbleWarm);
    }

    // Towering 58m Seven-Story Octagonal Immortal Pagoda (镇湖七层宝塔)
    let curY = baseY + 1.77;
    let curR = 12.6;
    for (let tier = 0; tier < 7; tier++) {
      const tierH = 6.6 - tier * 0.44;
      const roofCol = tier % 2 === 0 ? COL.roofAzure : COL.roofJade;

      mb.addCylinder(cx, curY, cz, curR * 0.82, curR * 0.80, tierH, 8, tier === 0 ? COL.vermilion : COL.wallCream, 0.56, 0, tier === 0 ? 1.30 : 1.42);
      mb.setCollision(false);
      // Wrap-around octagonal wooden balcony balustrade (平座勾栏) on upper stories
      if (tier > 0) {
        mb.addCylinder(cx, curY - 0.14, cz, curR * 1.06, curR * 1.02, 0.24, 8, COL.woodDark, 0.52, 0, 1.30);
        mb.addCylinder(cx, curY + 0.10, cz, curR * 1.04, curR * 1.04, 0.52, 8, COL.vermilion, 0.48, 0, 1.30);
      }
      mb.addCylinder(cx, curY + tierH * 0.25, cz, curR * 0.835, curR * 0.825, tierH * 0.44, 8, COL.windowGlow, 0.22, 1.25, 2.0);
      for (let c = 0; c < 8; c++) {
        const a = (c / 8) * Math.PI * 2 + Math.PI / 8;
        mb.addPillarWithBase(cx + Math.cos(a) * curR * 0.90, curY, cz + Math.sin(a) * curR * 0.90, 0.26, tierH, COL.vermilion);
      }
      mb.setCollision(true, 'building');

      mb.addPagodaRoof(cx, curY + tierH - 0.15, cz, curR * 1.46, 3.0 + (6 - tier) * 0.16, 8, 0.25, 1.25 - tier * 0.08, roofCol, COL.gold);
      curY += tierH + 1.22;
      curR *= 0.855;
    }

    mb.addCylinder(cx, curY + 1.2, cz, 1.2, 0.12, 9.6, 10, COL.gold, 0.20, 0.65, 3.0);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      if (Math.abs(Math.sin(a) - 1) < 0.18) continue;
      mb.addStoneLantern(cx + Math.cos(a) * 22.4, baseY + 0.4, cz + Math.sin(a) * 22.4, 1.2, COL.spiritCyan);
    }
  }

  // 8. Spacious Celestial Floating Islands (碧落浮岛群)
  function buildFloatingIslands(mb) {
    const rand = N.createRNG(99104);
    for (const isl of T.FLOATING_ISLANDS) {
      mb.addFloatingIsland(isl);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + rand() * 0.4;
        mb.addCrystalSpire(
          isl.x + Math.cos(a) * isl.rx * 0.65,
          isl.y - isl.depth * 0.35,
          isl.z + Math.sin(a) * isl.rz * 0.65,
          0.75 + rand() * 0.5, 3.6 + rand() * 3.4,
          Math.PI * 0.72 + (rand() - 0.5) * 0.3, a, 0,
          COL.spiritCyan, 1.9
        );
      }

      if (isl.hasPavilion) {
        buildPavilion(mb, isl.x - 4, isl.y + 2.4, isl.z - 2, 9.6, 8, true, COL.roofAzure);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          mb.addStoneLantern(isl.x - 4 + Math.cos(a) * 17.5, isl.y + 2.0, isl.z - 2 + Math.sin(a) * 17.5, 1.15, COL.spiritCyan);
        }
      }
    }

    // Floating Jade Stepping Stones spiraling up from Palace sky to Main Floating Island!
    const stepCount = 26;
    for (let i = 0; i < stepCount; i++) {
      const t = i / (stepCount - 1);
      const angle = t * Math.PI * 1.25;
      const x = M.lerp(42, -32, t) + Math.sin(angle) * 24.0;
      const y = M.lerp(96, 192, M.smoothstep(0, 1, t)) + Math.sin(t * Math.PI * 3) * 0.8;
      const z = M.lerp(-520, -648, t) - Math.cos(angle) * 10.0;
      const r = 2.6 + (i % 3) * 0.5;
      mb.addCylinder(x, y - 0.6, z, r * 0.78, r, 0.92, 6, COL.marble, 0.52);
      mb.setCollision(false);
      mb.addCylinder(x, y - 0.98, z, r * 0.38, r * 0.58, 0.36, 6, COL.spiritCyan, 0.2, 1.65, 2.0);
      mb.setCollision(true, 'building');
    }
  }

  // 9. Chenyan Misty Wetland Boardwalks, Stepping Stones & Ruined Pier (沉烟迷泽 · 残破木栈道与青石步汀)
  function buildChenyanSwampLandmarks(mb) {
    const rand = N.createRNG(40961);
    const oldTimber = [0.27, 0.22, 0.17];
    const darkTimber = [0.20, 0.17, 0.13];
    const mossySlab = [0.46, 0.50, 0.45];
    const marshGlow = [0.56, 0.96, 0.82];

    // Helper: Weathered/broken wooden marsh boardwalk connecting shoals across shallow misty pools!
    function addMarshBoardwalk(x0, z0, x1, z1, width = 3.6) {
      const dx = x1 - x0, dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      const rotY = Math.atan2(dx, dz);
      const nx = Math.cos(rotY), nz = -Math.sin(rotY); // perpendicular right vector
      const plankStep = 1.05;
      const plankCount = Math.max(4, Math.floor(len / plankStep));
      const baseDeckY = T.SWAMP_WATER_Y + 0.82;

      // Support pilings & side stringers every 4.2m
      const bayStep = 4.2;
      const bays = Math.max(2, Math.floor(len / bayStep));
      for (let i = 0; i <= bays; i++) {
        const t = i / bays;
        const bx = M.lerp(x0, x1, t);
        const bz = M.lerp(z0, z1, t);
        const terrY = T.getTerrainHeight(bx, bz);
        const deckY = Math.max(baseDeckY, terrY + 0.48);

        // Timber support pilings driven deep into the marsh mud
        for (const s of [-1, 1]) {
          const px = bx + nx * s * (width * 0.44);
          const pz = bz + nz * s * (width * 0.44);
          const isBrokenPost = rand() < 0.34;
          const postTop = isBrokenPost ? (deckY + 0.28 + rand() * 0.42) : (deckY + 1.15);
          const pileBot = Math.min(terrY, T.SWAMP_WATER_Y) - 2.6;
          mb.setCollision(false);
          mb.addCylinder(px, pileBot, pz, 0.20, 0.17, postTop - pileBot, 6, darkTimber, 0.84, 0, 1.30);
          // Occasional weathered horizontal railing bar between intact posts
          if (!isBrokenPost && i < bays && rand() < 0.62) {
            const nt = (i + 1) / bays;
            const nbx = M.lerp(x0, x1, nt), nbz = M.lerp(z0, z1, nt);
            const nDeckY = Math.max(baseDeckY, T.getTerrainHeight(nbx, nbz) + 0.48);
            const mx = (px + nbx + nx * s * (width * 0.44)) * 0.5;
            const mz = (pz + nbz + nz * s * (width * 0.44)) * 0.5;
            mb.addBox(mx, (deckY + nDeckY) * 0.5 + 0.96, mz, 0.14, 0.14, bayStep * 0.98, rotY, oldTimber, 0.80, 0, 1.30);
          }
          mb.setCollision(true, 'building');
        }

        // Longitudinal deck beams
        if (i < bays) {
          const nt = (i + 1) / bays;
          const nbx = M.lerp(x0, x1, nt), nbz = M.lerp(z0, z1, nt);
          const nDeckY = Math.max(baseDeckY, T.getTerrainHeight(nbx, nbz) + 0.48);
          const mx = (bx + nbx) * 0.5, mz = (bz + nbz) * 0.5;
          const my = (deckY + nDeckY) * 0.5 - 0.14;
          mb.setCollision(false);
          for (const s of [-1, 1]) {
            mb.addBox(mx + nx * s * (width * 0.36), my, mz + nz * s * (width * 0.36), 0.22, 0.24, bayStep * 1.04, rotY, darkTimber, 0.82, 0, 1.30);
          }
          mb.setCollision(true, 'building');
          // Smooth walkable deck collision slab spanning each bay so player traverses boardwalk effortlessly!
          if (mb.colEnabled) {
            mb.colWorld.addBox(mx, my + 0.08, mz, width * 0.95, 0.36, bayStep * 1.04, rotY, 'building', true);
          }
        }
      }

      // Individual weathered wooden planks with organic tilt & occasional broken/missing gaps!
      mb.setCollision(false);
      for (let p = 0; p < plankCount; p++) {
        // Leave occasional weathered missing plank gaps (skip ~9% in middle bays)
        if (p > 2 && p < plankCount - 2 && rand() < 0.09) continue;
        const t = (p + 0.5) / plankCount;
        const px = M.lerp(x0, x1, t);
        const pz = M.lerp(z0, z1, t);
        const deckY = Math.max(baseDeckY, T.getTerrainHeight(px, pz) + 0.48);
        const shade = 0.86 + rand() * 0.26;
        const plankCol = [oldTimber[0] * shade, oldTimber[1] * shade, oldTimber[2] * shade];
        const yawJitter = rotY + (rand() - 0.5) * 0.09;
        const tilt = (rand() - 0.5) * 0.06;
        const pWidth = width * (0.90 + rand() * 0.14);
        mb.addBoxEuler(px, deckY + (rand() - 0.5) * 0.04, pz, pWidth, 0.14, 0.72 + rand() * 0.18, tilt, yawJitter, (rand() - 0.5) * 0.05, plankCol, 0.82, 0, 1.30);
      }
      mb.setCollision(true, 'building');

      // Mossy guide stone lanterns softly lighting boardwalk heads through the marsh fog!
      const yStart = Math.max(baseDeckY, T.getTerrainHeight(x0, z0) + 0.2);
      const yEnd = Math.max(baseDeckY, T.getTerrainHeight(x1, z1) + 0.2);
      mb.addStoneLantern(x0 + nx * (width * 0.75), yStart - 0.2, z0 + nz * (width * 0.75), 0.98, marshGlow);
      mb.addStoneLantern(x1 - nx * (width * 0.75), yEnd - 0.2, z1 - nz * (width * 0.75), 0.98, marshGlow);
    }

    // Helper: Half-sunken mossy bluestone stepping-slab trail (青石板步汀小径) across shallow marsh channels
    function addSteppingStoneTrail(x0, z0, x1, z1, count) {
      const dx = x1 - x0, dz = z1 - z0;
      const rotY = Math.atan2(dx, dz);
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const wobble = Math.sin(t * Math.PI * 3.0) * 2.4;
        const sx = M.lerp(x0, x1, t) + Math.cos(rotY) * wobble + (rand() - 0.5) * 0.8;
        const sz = M.lerp(z0, z1, t) - Math.sin(rotY) * wobble + (rand() - 0.5) * 0.8;
        const terrY = T.getTerrainHeight(sx, sz);
        const topY = Math.max(T.SWAMP_WATER_Y + 0.22, terrY + 0.16);
        const sw = 2.0 + rand() * 1.1;
        const sd = 1.6 + rand() * 0.9;
        const sh = 0.85;
        const tone = 0.86 + rand() * 0.22;
        mb.addBox(sx, topY - sh * 0.5, sz, sw, sh, sd, rotY + (rand() - 0.5) * 0.5, [mossySlab[0] * tone, mossySlab[1] * tone, mossySlab[2] * tone], 0.58, 0, 1.0);
      }
    }

    // 1. Entry Wooden Boardwalk descending from 低云平原 SE Overlook (275, 1915) -> West Reed Shoal (415, 2045)
    addMarshBoardwalk(275, 1915, 415, 2045, 3.8);

    // 2. Main Broken Marsh Boardwalk spanning the wide misty pool: West Reed Shoal (465, 2085) -> Central Stele Shoal (612, 2200)
    addMarshBoardwalk(465, 2085, 612, 2200, 3.6);

    // 3. Eastern Marsh Boardwalk: Central Stele Shoal (685, 2248) -> East Willow Shoal (838, 2345)
    addMarshBoardwalk(685, 2248, 838, 2345, 3.5);

    // 4. Half-Sunken Bluestone Stepping-Slab Path: Central Stele Shoal (636, 2272) -> South Mist-Cove Shoal (598, 2452)
    addSteppingStoneTrail(636, 2272, 598, 2452, 24);

    // 5. Short Weathered Wooden Mist Pier jutting into the deep Eastern Pool from (895, 2385) -> (945, 2418)
    addMarshBoardwalk(895, 2385, 945, 2418, 3.4);

    // 5B. Outer Wetland Trails extending deep into the expanded East & Southeast 沉烟迷泽 shoals!
    addSteppingStoneTrail(960, 2395, 1345, 2265, 36);
    addMarshBoardwalk(1465, 2275, 1875, 2520, 3.5);
    addSteppingStoneTrail(1985, 2610, 2365, 2985, 42);
    addMarshBoardwalk(2015, 2515, 2495, 2310, 3.4);

    // 6. Ancient Moss-Draped Boundary Stele & Sunken Stone Dais on Central Shoal (645, 2225)
    const sx = 645, sz = 2225;
    const sy = T.getTerrainHeight(sx, sz);
    mb.addCylinder(sx, sy - 0.8, sz, 6.2, 5.8, 1.15, 8, mossySlab, 0.62, 0, 1.0);
    mb.addBoxEuler(sx, sy + 2.8, sz, 2.0, 5.4, 0.72, 0.08, -0.68, -0.09, [0.36, 0.42, 0.40], 0.70, 0, 1.0);
    mb.setCollision(false);
    // Faint glowing ancient carved marsh rune seal on the stele face
    mb.addBoxEuler(sx + 0.30, sy + 3.2, sz + 0.25, 0.48, 1.85, 0.14, 0.08, -0.68, -0.09, marshGlow, 0.24, 1.35, 2.0);
    mb.setCollision(true, 'building');
    mb.addStoneLantern(sx - 4.4, sy + 0.2, sz + 3.6, 1.08, marshGlow);
    mb.addStoneLantern(sx + 4.4, sy + 0.2, sz - 3.6, 1.08, marshGlow);

    // 7. 沉烟迷泽 Rich Ground & Water-Edge Details (浮萍残荷叶、湿林幽菇、系船腐木桩、半沉残石遗迹)
    const lilyFresh = [0.20, 0.38, 0.19];
    const lilyDark  = [0.14, 0.28, 0.15];
    const lilyDry   = [0.36, 0.30, 0.16];
    const budPale   = [0.92, 0.90, 0.84];
    const fungStem  = [0.76, 0.74, 0.66];
    const fungAmber = [0.64, 0.42, 0.22];
    const fungTeal  = [0.38, 0.78, 0.68];

    // 7A) Floating Marsh Lily Pads & Duckweed Clusters (~145 organic clusters across shallow pools & boardwalk sides!)
    mb.setCollision(false);
    let placedLily = 0, lilyTries = 0;
    while (placedLily < 145 && lilyTries < 2200) {
      lilyTries++;
      const lx = 140 + rand() * 3360;
      const lz = 1420 + rand() * 2120;
      if (T.getSwampMask(lx, lz) < 0.24) continue;
      const ly = T.getTerrainHeight(lx, lz);
      // Float only on genuine shallow water pools (depth 0.15m .. 2.4m)
      if (ly > T.SWAMP_WATER_Y - 0.15 || ly < T.SWAMP_WATER_Y - 2.4) continue;
      const pads = 4 + ((rand() * 4) | 0);
      for (let p = 0; p < pads; p++) {
        const pa = rand() * Math.PI * 2;
        const pd = p === 0 ? 0.0 : (0.55 + rand() * 2.8);
        const px = lx + Math.cos(pa) * pd;
        const pz = lz + Math.sin(pa) * pd;
        if (T.getTerrainHeight(px, pz) > T.SWAMP_WATER_Y - 0.08) continue;
        const pr = 0.28 + rand() * 0.46;
        const roll = rand();
        const col = roll < 0.55 ? lilyFresh : (roll < 0.84 ? lilyDark : lilyDry);
        mb.addCylinder(px, T.SWAMP_WATER_Y + 0.025, pz, pr, pr * 0.96, 0.035, 6, col, 0.46, 0, 1.0, true, false);
        if (p === 0 && rand() < 0.22) {
          // Occasional tiny pale marsh lotus bud rising from the lily cluster
          mb.addCylinder(px, T.SWAMP_WATER_Y + 0.05, pz, 0.12, 0.02, 0.26, 5, budPale, 0.42, 0.12, 1.0, true, false);
        }
      }
      placedLily++;
    }

    // 7B) Damp Marsh Mushroom & Softly Glowing Spirit Fungi Clusters (~120 clusters on muddy shoals & hummocks!)
    let placedFung = 0, fungTries = 0;
    while (placedFung < 120 && fungTries < 1900) {
      fungTries++;
      const fx = 120 + rand() * 3380;
      const fz = 1400 + rand() * 2140;
      if (T.getSwampMask(fx, fz) < 0.25) continue;
      const fy = T.getTerrainHeight(fx, fz);
      if (fy < T.SWAMP_WATER_Y + 0.25 || fy > T.SWAMP_WATER_Y + 4.4) continue;
      const isSpiritFung = rand() < 0.42;
      const caps = 3 + ((rand() * 3) | 0);
      for (let c = 0; c < caps; c++) {
        const ca = rand() * Math.PI * 2;
        const cd = c === 0 ? 0.0 : (0.28 + rand() * 0.95);
        const mx = fx + Math.cos(ca) * cd;
        const mz = fz + Math.sin(ca) * cd;
        const my = T.getTerrainHeight(mx, mz);
        if (my < T.SWAMP_WATER_Y + 0.15) continue;
        const sc = (c === 0 ? 0.42 : (0.22 + rand() * 0.24));
        const stH = sc * (1.25 + rand() * 0.65);
        mb.addCylinder(mx, my - 0.06, mz, sc * 0.20, sc * 0.14, stH, 5, fungStem, 0.72, 0, 1.0, false, false);
        const capCol = isSpiritFung ? fungTeal : fungAmber;
        const capEm = isSpiritFung ? 0.58 : 0.0;
        mb.addCylinder(mx, my + stH - 0.08, mz, sc * 0.78, sc * 0.12, sc * 0.34, 6, capCol, 0.48, capEm, isSpiritFung ? 2.0 : 1.0, true, false);
      }
      placedFung++;
    }

    // 7C) Weathered Wooden Mooring Stakes & Broken Marsh Fence Posts (~48 clusters along muddy banks & coves!)
    let placedStakes = 0, stakeTries = 0;
    while (placedStakes < 48 && stakeTries < 1200) {
      stakeTries++;
      const px = 140 + rand() * 3340;
      const pz = 1420 + rand() * 2120;
      if (T.getSwampMask(px, pz) < 0.25) continue;
      const py = T.getTerrainHeight(px, pz);
      if (py < T.SWAMP_WATER_Y - 0.55 || py > T.SWAMP_WATER_Y + 1.35) continue;
      const posts = 2 + ((rand() * 3) | 0);
      const baseYaw = rand() * Math.PI * 2;
      for (let k = 0; k < posts; k++) {
        const ox = px + Math.cos(baseYaw) * k * 1.15 + (rand() - 0.5) * 0.35;
        const oz = pz + Math.sin(baseYaw) * k * 1.15 + (rand() - 0.5) * 0.35;
        const oy = T.getTerrainHeight(ox, oz);
        const h = 1.25 + rand() * 1.35;
        mb.addBoxEuler(ox, oy + h * 0.38, oz, 0.22, h, 0.22, (rand() - 0.5) * 0.26, rand() * 3.14, (rand() - 0.5) * 0.26, darkTimber, 0.86, 0, 1.30);
      }
      // Optional weathered broken crossbar tying two stakes
      if (posts >= 2 && rand() < 0.55) {
        const mx = px + Math.cos(baseYaw) * 0.6;
        const mz = pz + Math.sin(baseYaw) * 0.6;
        mb.addBoxEuler(mx, Math.max(py, T.SWAMP_WATER_Y) + 0.68, mz, 0.12, 0.12, 1.6, 0.08, baseYaw + Math.PI * 0.5, 0.06, oldTimber, 0.84, 0, 1.30);
      }
      placedStakes++;
    }

    // 7D) Scattered Half-Sunken Mossy Relic Stones, Broken Slabs & Small Marsh Lanterns (~40 shoal accents!)
    let placedRelics = 0, relicTries = 0;
    while (placedRelics < 40 && relicTries < 1200) {
      relicTries++;
      const rx = 180 + rand() * 3280;
      const rz = 1460 + rand() * 2040;
      if (T.getSwampMask(rx, rz) < 0.28) continue;
      if (Math.hypot(rx - 645, rz - 2225) < 18) continue;
      const ry = T.getTerrainHeight(rx, rz);
      if (ry < T.SWAMP_WATER_Y + 0.15 || ry > T.SWAMP_WATER_Y + 3.4) continue;
      const kind = rand();
      const tone = 0.82 + rand() * 0.24;
      const stCol = [mossySlab[0] * tone, mossySlab[1] * tone, mossySlab[2] * tone];
      if (kind < 0.42) {
        // Half-buried cracked mossy ancient flagstone cluster
        for (let s = 0; s < 3; s++) {
          const sx2 = rx + (rand() - 0.5) * 3.2;
          const sz2 = rz + (rand() - 0.5) * 3.2;
          const sy2 = T.getTerrainHeight(sx2, sz2);
          mb.addBoxEuler(sx2, sy2 + 0.06, sz2, 1.4 + rand() * 1.2, 0.36, 1.1 + rand() * 0.9, (rand() - 0.5) * 0.18, rand() * 3.14, (rand() - 0.5) * 0.18, stCol, 0.72, 0, 1.0);
        }
      } else if (kind < 0.76) {
        // Sunken weathered mossy boundary stone / broken stone drum
        mb.setCollision(true, 'building');
        mb.addBoxEuler(rx, ry + 0.85, rz, 0.95, 2.2 + rand() * 0.9, 0.55, (rand() - 0.5) * 0.32, rand() * 3.14, (rand() - 0.5) * 0.28, stCol, 0.76, 0, 1.0);
        mb.setCollision(false);
      } else {
        // Lonely half-sunken marsh guide lantern glowing softly in the outer mist
        mb.setCollision(true, 'building');
        mb.addStoneLantern(rx, ry - 0.25, rz, 0.86 + rand() * 0.18, marshGlow);
        mb.setCollision(false);
      }
      placedRelics++;
    }
    mb.setCollision(true, 'building');
  }

  // 10. Canzhen Ancient Ruined Array Path (残阵古道 · 残破青石古道、倾倒刻阵石柱、残缺石碑与风化阵基)
  function buildCanzhenAncientRoad(mb) {
    const rand = N.createRNG(88421);
    const pts = T.CANZHEN_ROAD.waypoints;
    const blueStone   = [0.48, 0.49, 0.45];
    const dustStone   = [0.54, 0.49, 0.39];
    const darkSlate   = [0.36, 0.38, 0.37];
    const rustBronze  = [0.34, 0.40, 0.33]; // Oxidized weathered bronze-verdigris (锈蚀铜绿)
    const darkRust    = [0.36, 0.25, 0.17]; // Corroded iron-rust accent
    const faintJade   = [0.36, 0.72, 0.64]; // Faint dormant ancient array rune glow
    const faintAmber  = [0.78, 0.64, 0.34];

    // A) Widened & Extended Winding Ruined Bluestone Ancient Road (加宽且前扩的残破青石古道!)
    mb.setCollision(false);
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], b = pts[s + 1];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const segLen = Math.hypot(dx, dz);
      const rotY = Math.atan2(dx, dz);
      const rx = Math.cos(rotY), rz = -Math.sin(rotY); // perpendicular right vector
      const stepDist = 3.6;
      const steps = Math.max(4, Math.floor(segLen / stepDist));

      for (let i = 0; i < steps; i++) {
        const u = (i + 0.5) / steps;
        const cx = M.lerp(a[0], b[0], u) + rx * Math.sin(u * Math.PI * 2.0 + s * 1.3) * 1.8;
        const cz = M.lerp(a[1], b[1], u) + rz * Math.sin(u * Math.PI * 2.0 + s * 1.3) * 1.8;

        // Skip slabs directly inside the raised central altar platforms or large ruin building foundations
        let inStructure = false;
        for (const nd of T.CANZHEN_ROAD.altarNodes) {
          if (Math.hypot(cx - nd.x, cz - nd.z) < (nd.major ? 17.0 : (nd.r > 24 ? 12.5 : 9.4))) {
            inStructure = true;
            break;
          }
        }
        if (!inStructure && T.CANZHEN_ROAD.ruinSites) {
          for (const rs of T.CANZHEN_ROAD.ruinSites) {
            if (Math.hypot(cx - rs.x, cz - rs.z) < rs.r * 0.72) {
              inStructure = true;
              break;
            }
          }
        }
        if (inStructure) continue;

        // ~20% completely missing road sections swallowed by earth & weeds
        if (rand() < 0.20) continue;

        // Widened ancient bluestone road: 3-4 staggered stone columns (~10.5-12m wide!)
        const slabCols = rand() < 0.35 ? 3 : 4;
        for (let k = 0; k < slabCols; k++) {
          if (rand() < 0.17) continue; // individual missing flagstone
          const lat = (k - (slabCols - 1) * 0.5) * 2.68 + (rand() - 0.5) * 0.42;
          const sx = cx + rx * lat + (rand() - 0.5) * 0.4;
          const sz = cz + rz * lat + (rand() - 0.5) * 0.4;
          const sy = T.getTerrainHeight(sx, sz);

          const isBroken = rand() < 0.30;
          const dustMix = rand();
          const shade = 0.84 + rand() * 0.26;
          const col = [
            M.lerp(blueStone[0], dustStone[0], dustMix * 0.55) * shade,
            M.lerp(blueStone[1], dustStone[1], dustMix * 0.55) * shade,
            M.lerp(blueStone[2], dustStone[2], dustMix * 0.55) * shade,
          ];
          const sink = rand() < 0.35 ? -0.10 : 0.04;

          if (isBroken) {
            // Fractured into two slightly separated, tilted stone pieces
            const w1 = 1.15 + rand() * 0.58;
            const d1 = 1.20 + rand() * 0.68;
            mb.addBoxEuler(sx - rx * 0.48, sy + sink, sz - rz * 0.48, w1, 0.34, d1, (rand() - 0.5) * 0.14, rotY + (rand() - 0.5) * 0.28, (rand() - 0.5) * 0.14, col, 0.74, 0, 1.0);
            mb.addBoxEuler(sx + rx * 0.58, sy + sink - 0.04, sz + rz * 0.58, w1 * 0.86, 0.30, d1 * 0.84, (rand() - 0.5) * 0.16, rotY + (rand() - 0.5) * 0.35, (rand() - 0.5) * 0.16, col, 0.78, 0, 1.0);
          } else {
            const sw = 2.25 + rand() * 0.70;
            const sd = 2.35 + rand() * 0.85;
            mb.addBoxEuler(sx, sy + sink, sz, sw, 0.34, sd, (rand() - 0.5) * 0.09, rotY + (rand() - 0.5) * 0.14, (rand() - 0.5) * 0.09, col, 0.70, 0, 1.0);
          }
        }
      }
    }
    mb.setCollision(true, 'building');

    // B) Helper: Ruined Rune-Carved Stone Pillar (倾倒、断折或半埋的刻阵石柱 — low-poly 6-sided!)
    function addRuinedRunePillar(x, z, scale, state = 'standing', yawHint = 0) {
      const y = T.getTerrainHeight(x, z);
      const r = 0.62 * scale;
      const h = (5.4 + rand() * 2.2) * scale;
      const shade = 0.88 + rand() * 0.20;
      const pCol = [darkSlate[0] * shade, darkSlate[1] * shade, darkSlate[2] * shade];
      const bCol = [dustStone[0] * shade, dustStone[1] * shade, dustStone[2] * shade];
      const runeCol = rand() < 0.65 ? faintJade : faintAmber;

      if (state === 'standing') {
        // Upright or subtly leaning fractured stone pillar on weathered plinth
        const intactH = h * (0.58 + rand() * 0.34);
        mb.addBox(x, y + 0.25 * scale, z, r * 3.1, 0.75 * scale, r * 3.1, yawHint, bCol, 0.76, 0, 1.0);
        mb.addCylinder(x, y + 0.55 * scale, z, r * 1.06, r * 0.92, intactH, 6, pCol, 0.72, 0, 1.0);
        // Faint archaic rune band wrapped around mid-shaft
        mb.setCollision(false);
        mb.addCylinder(x, y + intactH * 0.54, z, r * 1.01, r * 0.99, 0.32 * scale, 6, runeCol, 0.36, 0.44, 2.0, false, false);
        mb.addCylinder(x, y + intactH * 0.78, z, r * 0.97, r * 0.95, 0.20 * scale, 6, rustBronze, 0.58, 0.0, 3.0, false, false);
        // Fallen broken upper shaft drum resting in the nearby dust!
        const fa = yawHint + 0.7 + rand() * 1.8;
        const fx = x + Math.cos(fa) * (2.2 + rand() * 1.8) * scale;
        const fz = z + Math.sin(fa) * (2.2 + rand() * 1.8) * scale;
        const fy = T.getTerrainHeight(fx, fz);
        mb.addBoxEuler(fx, fy + r * 0.52, fz, r * 1.65, h * 0.36, r * 1.65, 1.46, fa, 0.14, pCol, 0.76, 0, 1.0);
        mb.setCollision(true, 'building');
      } else if (state === 'fallen') {
        // Toppled pillar lying across the slope next to its empty weathered plinth
        mb.addBox(x, y + 0.20 * scale, z, r * 2.9, 0.65 * scale, r * 2.9, yawHint, bCol, 0.78, 0, 1.0);
        const fa = yawHint + (rand() - 0.5) * 1.2;
        const fx = x + Math.cos(fa) * (h * 0.44);
        const fz = z + Math.sin(fa) * (h * 0.44);
        const fy = T.getTerrainHeight(fx, fz);
        mb.addBoxEuler(fx, fy + r * 0.56, fz, r * 1.72, h * 0.76, r * 1.72, 1.42 + (rand() - 0.5) * 0.14, fa, (rand() - 0.5) * 0.18, pCol, 0.76, 0, 1.0);
        mb.setCollision(false);
        mb.addBoxEuler(fx, fy + r * 0.62, fz, r * 1.78, 0.28 * scale, r * 1.78, 1.42, fa, 0.0, runeCol, 0.38, 0.38, 2.0);
        mb.setCollision(true, 'building');
      } else {
        // Half-buried tilted rune pillar emerging diagonally from dry soil & scree
        const tilt = 0.48 + rand() * 0.42;
        const subH = h * (0.48 + rand() * 0.28);
        mb.addBoxEuler(x, y + subH * 0.28, z, r * 1.72, subH, r * 1.72, tilt, yawHint, (rand() - 0.5) * 0.25, pCol, 0.76, 0, 1.0);
        mb.setCollision(false);
        mb.addBoxEuler(x, y + subH * 0.36, z, r * 1.78, 0.24 * scale, r * 1.78, tilt, yawHint, 0.0, runeCol, 0.38, 0.36, 2.0);
        mb.setCollision(true, 'building');
      }
    }

    // C) Helper: Broken Ancient Stele (残缺石碑)
    function addBrokenStele(x, z, rotY, scale = 1.0) {
      const y = T.getTerrainHeight(x, z);
      const w = 1.65 * scale;
      const h = (3.4 + rand() * 1.4) * scale;
      const d = 0.56 * scale;
      const tiltX = (rand() - 0.5) * 0.20;
      const tiltZ = (rand() - 0.5) * 0.22;
      mb.addBox(x, y + 0.22 * scale, z, w * 1.42, 0.65 * scale, d * 2.1, rotY, dustStone, 0.78, 0, 1.0);
      mb.addBoxEuler(x, y + h * 0.48, z, w, h, d, tiltX, rotY, tiltZ, blueStone, 0.72, 0, 1.0);
      mb.setCollision(false);
      // Faint carved archaic inscription groove on the stele face
      const fx = Math.sin(rotY) * (d * 0.52);
      const fz = Math.cos(rotY) * (d * 0.52);
      mb.addBoxEuler(x + fx, y + h * 0.52, z + fz, w * 0.34, h * 0.54, 0.08, tiltX, rotY, tiltZ, faintJade, 0.36, 0.35, 2.0);
      // Chipped-off stele corner fragment resting nearby
      const bx = x + Math.cos(rotY) * (1.55 * scale);
      const bz = z - Math.sin(rotY) * (1.55 * scale);
      mb.addBoxEuler(bx, T.getTerrainHeight(bx, bz) + 0.18 * scale, bz, w * 0.68, h * 0.28, d * 0.92, 1.48, rotY + 0.65, 0.22, blueStone, 0.76, 0, 1.0);
      mb.setCollision(true, 'building');
    }

    // D) Helper: Corroded / Weathered Array Pedestal (锈蚀/风化的阵法基座)
    function addArrayPedestal(cx, cz, isMajor = false) {
      const cy = T.getTerrainHeight(cx, cz);
      const rOuter = isMajor ? 14.5 : 7.2;
      const rMid   = isMajor ? 9.6  : 4.5;
      const h1 = isMajor ? 1.15 : 0.72;
      const h2 = isMajor ? 0.95 : 0.52;

      // Cracked octagonal stone foundation tiers
      mb.addCylinder(cx, cy - 0.6, cz, rOuter + 0.6, rOuter, h1 + 0.6, 8, dustStone, 0.74, 0, 1.0);
      mb.addCylinder(cx, cy + h1, cz, rMid + 0.4, rMid, h2, 8, blueStone, 0.68, 0, 1.0);

      // Corroded oxidized bronze-verdigris ring segments inlaid into the stone altar floor
      mb.setCollision(false);
      const ringR = isMajor ? 11.8 : 5.7;
      const segs = isMajor ? 12 : 8;
      for (let i = 0; i < segs; i++) {
        if (rand() < 0.28) continue; // corroded & missing ring arcs!
        const a = (i / segs) * Math.PI * 2;
        const px = cx + Math.cos(a) * ringR;
        const pz = cz + Math.sin(a) * ringR;
        const arcW = (2 * Math.PI * ringR / segs) * 0.84;
        mb.addBox(px, cy + h1 + 0.06, pz, arcW, 0.12, 0.52, -a, i % 3 === 0 ? darkRust : rustBronze, 0.58, 0, 3.0);
      }

      // Central weathered bronze & stone array focus pedestal (阵眼基座)
      const topY = cy + h1 + h2;
      mb.setCollision(true, 'building');
      const coreR = isMajor ? 2.4 : 1.35;
      mb.addCylinder(cx, topY - 0.1, cz, coreR * 1.15, coreR * 0.88, isMajor ? 1.65 : 1.05, 6, darkSlate, 0.68, 0, 1.0);
      mb.addCylinder(cx, topY + (isMajor ? 1.55 : 0.95), cz, coreR * 0.96, coreR * 0.76, 0.34, 6, rustBronze, 0.52, 0, 3.0);

      // Tilted corroded bronze ring arcs & faint dormant fractured core stone
      mb.setCollision(false);
      if (isMajor) {
        for (let k = 0; k < 3; k++) {
          const ka = (k / 3) * Math.PI * 2 + 0.4;
          mb.addBoxEuler(cx + Math.cos(ka) * 1.85, topY + 2.85, cz + Math.sin(ka) * 1.85, 0.28, 2.35, 0.42, 0.36, ka, 0.22, rustBronze, 0.54, 0, 3.0);
        }
        mb.addCylinder(cx, topY + 1.85, cz, 0.52, 0.26, 1.65, 6, faintJade, 0.28, 0.78, 2.0);
      } else {
        mb.addCylinder(cx, topY + 1.25, cz, 0.34, 0.18, 0.95, 6, faintAmber, 0.32, 0.58, 2.0);
      }

      // Chipped stone stairs descending on the SE road-approach side of the grand altar
      if (isMajor) {
        mb.setCollision(true, 'building');
        const stDir = Math.atan2(130, 115); // facing SE toward waypoint 5
        for (let st = 0; st < 5; st++) {
          const d = rOuter + 0.6 + st * 1.25;
          const sy2 = cy + h1 - st * 0.22;
          mb.addBox(cx + Math.sin(stDir) * d, sy2 - 0.25, cz + Math.cos(stDir) * d, 6.2 - st * 0.2, 0.52, 1.45, stDir, blueStone, 0.72, 0, 1.0);
        }
      }

      // Perimeter ruined rune pillars ringing the array altar
      const pCount = isMajor ? 8 : 4;
      const pRad = isMajor ? 18.2 : 9.4;
      for (let i = 0; i < pCount; i++) {
        const a = (i / pCount) * Math.PI * 2 + (isMajor ? 0.32 : 0.55);
        // Leave road approach gap on SE side
        if (isMajor && Math.abs(a - 0.78) < 0.38) continue;
        const px = cx + Math.cos(a) * pRad;
        const pz = cz + Math.sin(a) * pRad;
        const stRoll = rand();
        const st = stRoll < 0.48 ? 'standing' : (stRoll < 0.78 ? 'fallen' : 'half_buried');
        addRuinedRunePillar(px, pz, isMajor ? (1.15 + rand() * 0.35) : (0.82 + rand() * 0.22), st, a);
      }
      mb.setCollision(true, 'building');
    }

    // Place all 4 Ancient Array Pedestals (3 roadside/mid nodes + 1 extended grand mountain-foot sanctuary!)
    for (const nd of T.CANZHEN_ROAD.altarNodes) {
      addArrayPedestal(nd.x, nd.z, nd.major);
    }

    // E) TWO LARGE RUINED ARCHITECTURAL COMPLEXES (两处大点的残垣断壁建筑!)
    const agedTimber  = [0.34, 0.23, 0.17];
    const fadedRedCol = [0.46, 0.24, 0.20];
    const brokenTile  = [0.27, 0.34, 0.36];
    const wallPlaster = [0.64, 0.59, 0.50];

    // Local-to-world transform helper for clean rotated ruined building layouts
    function ruinToWorld(cx, cy, cz, rotY, lx, ly, lz) {
      const c = Math.cos(rotY), s = Math.sin(rotY);
      return [cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c];
    }

    // Helper: Build a jagged stepped broken stone masonry wall (残垣断壁) with rubble chunks at its base!
    function addBrokenWallSegment(cx, cy, cz, rotY, lx, lz, length, thickness, heights, alongX = true) {
      const n = heights.length;
      const segW = length / n;
      for (let i = 0; i < n; i++) {
        const h = heights[i];
        if (h <= 0.15) continue; // breached opening!
        const offset = (i + 0.5 - n * 0.5) * segW;
        const wx = alongX ? (lx + offset) : lx;
        const wz = alongX ? lz : (lz + offset);
        const p = ruinToWorld(cx, cy, cz, rotY, wx, h * 0.5, wz);
        const wX = alongX ? (segW * 1.02) : thickness;
        const wZ = alongX ? thickness : (segW * 1.02);
        const shade = 0.88 + (i % 3) * 0.05;
        const baseC = h > 3.2 ? wallPlaster : dustStone;
        const col = [baseC[0] * shade, baseC[1] * shade, baseC[2] * shade];
        mb.addBox(p[0], p[1], p[2], wX, h, wZ, rotY, col, 0.78, 0, 1.0);
        // Darker weathered stone dado along the lower wall course
        if (h > 1.6) {
          mb.setCollision(false);
          const pd = ruinToWorld(cx, cy, cz, rotY, wx, 0.65, wz);
          mb.addBox(pd[0], pd[1], pd[2], wX * 1.03, 1.3, wZ * 1.08, rotY, darkSlate, 0.80, 0, 1.0);
          mb.setCollision(true, 'building');
        }
      }
      // Scatter tumbled masonry rubble blocks alongside breached/low sections
      mb.setCollision(false);
      for (let r = 0; r < 5; r++) {
        const ro = (rand() - 0.5) * length * 0.92;
        const side = (rand() < 0.5 ? -1 : 1) * (thickness * 0.85 + rand() * 1.6);
        const rx2 = alongX ? (lx + ro) : (lx + side);
        const rz2 = alongX ? (lz + side) : (lz + ro);
        const pr = ruinToWorld(cx, cy, cz, rotY, rx2, 0.34, rz2);
        mb.addBoxEuler(pr[0], pr[1], pr[2], 0.85 + rand() * 1.1, 0.55 + rand() * 0.55, 0.75 + rand() * 0.9, (rand() - 0.5) * 0.5, rotY + rand() * 2.5, (rand() - 0.5) * 0.5, dustStone, 0.82, 0, 1.0);
      }
      mb.setCollision(true, 'building');
    }

    // Large Ruin #1: 古道断壁驿殿庭院 (Ruined Watch-Gate & Broken Posthouse Courtyard, ~26m x 20m at (-2942, 1058))
    function addRuinedPosthouseCourtyard(rs) {
      const cx = rs.x, cz = rs.z, rotY = rs.rotY;
      const cy = T.getTerrainHeight(cx, cz);

      // 2-tier cracked stone courtyard foundation
      mb.addBox(cx, cy - 0.35, cz, 26.8, 1.5, 20.8, rotY, dustStone, 0.78, 0, 1.0);
      mb.addBox(cx, cy + 0.55, cz, 25.0, 0.55, 19.0, rotY, blueStone, 0.72, 0, 1.0);
      const floorY = cy + 0.82;

      // Fractured front stone staircase descending toward the widened ancient road (+Z local side)
      for (let st = 0; st < 4; st++) {
        const ps = ruinToWorld(cx, floorY - st * 0.24 - 0.14, cz, rotY, 0, 0, 10.2 + st * 0.92);
        mb.addBox(ps[0], ps[1], ps[2], 6.8 - st * 0.15, 0.44, 1.12, rotY, blueStone, 0.74, 0, 1.0);
      }

      // Collapsed Front Archway Gatehouse (front wall at lz = +9.0, with wide walkable central doorway!)
      addBrokenWallSegment(cx, floorY, cz, rotY, -8.2, 9.0, 8.2, 0.95, [2.2, 3.6, 4.4, 2.8], true);
      addBrokenWallSegment(cx, floorY, cz, rotY,  8.2, 9.0, 8.2, 0.95, [1.5, 0.0, 2.4, 3.4], true);
      // Two weathered gate piers flanking the doorway (left intact supporting tilted lintel & roof corner; right snapped!)
      const gpL = ruinToWorld(cx, floorY, cz, rotY, -3.7, 3.4, 9.0);
      const gpR = ruinToWorld(cx, floorY, cz, rotY,  3.7, 1.9, 9.0);
      mb.addBox(gpL[0], gpL[1], gpL[2], 1.55, 6.8, 1.55, rotY, darkSlate, 0.74, 0, 1.0);
      mb.addBox(gpR[0], gpR[1], gpR[2], 1.55, 3.8, 1.55, rotY, darkSlate, 0.76, 0, 1.0);
      // Tilted surviving timber lintel & partial broken tiled gate-eave hanging off the left pier!
      mb.setCollision(false);
      const lint = ruinToWorld(cx, floorY, cz, rotY, -1.6, 6.45, 9.0);
      mb.addBoxEuler(lint[0], lint[1], lint[2], 6.4, 0.52, 0.82, 0.04, rotY, -0.22, agedTimber, 0.80, 0, 1.30);
      const gRoof = ruinToWorld(cx, floorY, cz, rotY, -2.5, 7.25, 9.0);
      mb.addBoxEuler(gRoof[0], gRoof[1], gRoof[2], 5.6, 0.34, 3.2, 0.16, rotY, -0.20, brokenTile, 0.48, 0, 1.15);
      // Fallen broken beam & top gate pier block resting inside the courtyard
      const fBeam = ruinToWorld(cx, floorY, cz, rotY, 2.6, 0.42, 6.2);
      mb.addBoxEuler(fBeam[0], fBeam[1], fBeam[2], 4.8, 0.44, 0.44, 0.08, rotY + 0.45, 0.06, agedTimber, 0.84, 0, 1.30);
      mb.setCollision(true, 'building');

      // Jagged Courtyard Side & Rear Perimeter Walls (残垣断壁 with dramatic breaches!)
      addBrokenWallSegment(cx, floorY, cz, rotY, -12.0, 0.0, 18.2, 0.92, [4.2, 5.2, 3.1, 0.0, 1.6, 3.4, 4.6], false);
      addBrokenWallSegment(cx, floorY, cz, rotY,  12.0, 0.0, 18.2, 0.92, [3.2, 1.4, 0.0, 0.0, 2.4, 3.8, 2.6], false);
      addBrokenWallSegment(cx, floorY, cz, rotY,   0.0, -9.0, 24.4, 1.05, [5.4, 6.2, 6.8, 4.5, 2.1, 0.0, 2.8, 3.6], true);

      // Rear Ruined Posthouse Hall Interior Pillars (2 standing, 1 leaning, 1 snapped!) & Partial Collapsed Roof Corner
      const hallCols = [
        [-8.4, -3.2, 6.4, false],
        [-2.8, -3.2, 6.2, false],
        [ 2.8, -3.2, 3.1, false], // snapped mid-height
        [ 8.4, -3.2, 2.2, true ], // toppled stub
        [-8.4, -8.2, 6.6, false],
        [-2.8, -8.2, 6.4, false],
      ];
      for (const [hx, hz, hh, isToppled] of hallCols) {
        const pc = ruinToWorld(cx, floorY, cz, rotY, hx, 0, hz);
        mb.addBox(pc[0], pc[1] + 0.25, pc[2], 1.35, 0.50, 1.35, rotY, darkSlate, 0.74, 0, 1.0);
        if (!isToppled) {
          mb.addCylinder(pc[0], pc[1] + 0.45, pc[2], 0.42, 0.36, hh, 8, fadedRedCol, 0.72, 0, 1.30);
        } else {
          mb.addBoxEuler(pc[0], pc[1] + 0.65, pc[2] + 2.0, 0.72, 4.8, 0.72, 1.48, rotY + 0.35, 0.12, fadedRedCol, 0.76, 0, 1.30);
        }
      }
      // Surviving Partial Collapsed Roof Corner & Exposed Broken Timber Rafters over the NW wing of the ruin!
      mb.setCollision(false);
      const beam1 = ruinToWorld(cx, floorY, cz, rotY, -5.6, 6.75, -3.2);
      mb.addBox(beam1[0], beam1[1], beam1[2], 7.4, 0.42, 0.46, rotY, agedTimber, 0.78, 0, 1.30);
      const beam2 = ruinToWorld(cx, floorY, cz, rotY, -5.6, 7.65, -6.2);
      mb.addBox(beam2[0], beam2[1], beam2[2], 8.6, 0.48, 0.52, rotY, agedTimber, 0.78, 0, 1.30);
      // Exposed slanting rafters jutting into empty air over the collapsed east half
      for (let rf = 0; rf < 5; rf++) {
        const pr = ruinToWorld(cx, floorY, cz, rotY, -9.2 + rf * 2.4, 7.15, -5.8);
        mb.addBoxEuler(pr[0], pr[1], pr[2], 0.22, 0.26, 7.4, 0.24, rotY, 0.0, agedTimber, 0.80, 0, 1.30);
      }
      // Half-intact dark glazed tile roof slab tilted slightly over the surviving NW corner
      const rSlab1 = ruinToWorld(cx, floorY, cz, rotY, -6.2, 7.35, -4.6);
      mb.addBoxEuler(rSlab1[0], rSlab1[1], rSlab1[2], 9.8, 0.32, 4.8, 0.26, rotY, -0.05, brokenTile, 0.44, 0, 1.15);
      const rSlab2 = ruinToWorld(cx, floorY, cz, rotY, -6.5, 7.55, -7.8);
      mb.addBoxEuler(rSlab2[0], rSlab2[1], rSlab2[2], 9.2, 0.32, 4.2, -0.24, rotY, -0.04, brokenTile, 0.44, 0, 1.15);
      // Corroded bronze-stone incense cauldron / broken array brazier in center of courtyard
      mb.setCollision(true, 'building');
      const brz = ruinToWorld(cx, floorY, cz, rotY, 0.4, 0.0, 2.2);
      mb.addCylinder(brz[0], brz[1], brz[2], 1.45, 1.25, 0.55, 8, darkSlate, 0.74, 0, 1.0);
      mb.addCylinder(brz[0], brz[1] + 0.55, brz[2], 0.92, 1.18, 1.15, 8, rustBronze, 0.56, 0, 3.0);
      mb.setCollision(false);
      mb.addCylinder(brz[0], brz[1] + 1.55, brz[2], 0.75, 0.65, 0.18, 8, darkRust, 0.68, 0.22, 2.0);
      mb.setCollision(true, 'building');
    }

    // Large Ruin #2: 太古残阵废殿 (Grand Breached Xianxia Ruined Array Hall, ~36m x 26m at (-3612, 426))
    function addGrandRuinedArrayHall(rs) {
      const cx = rs.x, cz = rs.z, rotY = rs.rotY;
      const cy = T.getTerrainHeight(cx, cz);

      // Grand 3-tier cracked Xumi stone palace platform
      mb.addBox(cx, cy - 0.55, cz, 37.5, 2.1, 27.5, rotY, dustStone, 0.78, 0, 1.0);
      mb.addBox(cx, cy + 0.75, cz, 34.8, 0.72, 24.8, rotY, blueStone, 0.74, 0, 1.0);
      mb.addBox(cx, cy + 1.32, cz, 31.6, 0.48, 21.8, rotY, darkSlate, 0.70, 0, 1.0);
      const floorY = cy + 1.56;

      // Wide broken stone staircase descending onto the extended ancient road (+Z local flank)
      for (let st = 0; st < 6; st++) {
        const ps = ruinToWorld(cx, floorY - st * 0.26 - 0.14, cz, rotY, 0, 0, 12.6 + st * 0.96);
        mb.addBox(ps[0], ps[1], ps[2], 9.2 - st * 0.18, 0.46, 1.15, rotY, blueStone, 0.74, 0, 1.0);
      }
      // Broken weathered stone terrace balustrade posts (some missing or knocked askew!)
      for (const bx of [-14.5, -10.0, -5.8, 5.8, 10.2, 14.5]) {
        if (Math.abs(bx) === 10.0) continue; // collapsed gap
        const pb = ruinToWorld(cx, floorY, cz, rotY, bx, 0.65, 11.4);
        mb.addBoxEuler(pb[0], pb[1], pb[2], 0.55, 1.35, 0.55, (rand() - 0.5) * 0.25, rotY, (rand() - 0.5) * 0.22, dustStone, 0.78, 0, 1.0);
      }

      // Massive Breached Palace Hall Walls (高大残垣断壁 up to 9.5m tall with monumental open collapses!)
      addBrokenWallSegment(cx, floorY, cz, rotY,   0.0, -9.8, 29.6, 1.35, [8.8, 9.6, 8.2, 5.4, 2.2, 0.0, 2.8, 6.4, 7.6], true);
      addBrokenWallSegment(cx, floorY, cz, rotY, -14.6, -1.2, 17.6, 1.28, [8.6, 9.2, 7.4, 4.2, 1.6, 0.0, 2.6], false);
      addBrokenWallSegment(cx, floorY, cz, rotY,  14.6, -1.2, 17.6, 1.28, [6.4, 3.8, 1.2, 0.0, 0.0, 2.2, 4.4], false);
      // Partial broken front flanking walls leaving a dramatic 14m wide shattered entrance!
      addBrokenWallSegment(cx, floorY, cz, rotY, -10.8, 7.8, 7.8, 1.15, [5.4, 3.2, 1.4], true);
      addBrokenWallSegment(cx, floorY, cz, rotY,  10.8, 7.8, 7.8, 1.15, [1.2, 2.8, 4.2], true);

      // 10 Monumental Ancient Palace Columns (mix of tall surviving roof-bearing columns, snapped shafts & toppled giants!)
      const colLayout = [
        [-11.2,  6.2, 8.8, 'stand'],
        [ -5.6,  6.2, 8.8, 'stand'],
        [  5.6,  6.2, 4.4, 'snap'],
        [ 11.2,  6.2, 2.1, 'fallen'],
        [-11.2, -1.4, 9.0, 'stand'],
        [ -5.6, -1.4, 9.0, 'stand'],
        [  5.6, -1.4, 8.6, 'stand'],
        [ 11.2, -1.4, 5.2, 'snap'],
        [ -5.6, -7.8, 9.2, 'stand'],
        [  5.6, -7.8, 6.1, 'snap'],
      ];
      for (const [lx, lz, h, state] of colLayout) {
        const pc = ruinToWorld(cx, floorY, cz, rotY, lx, 0, lz);
        // Carved weathered stone drum plinth
        mb.addBox(pc[0], pc[1] + 0.35, pc[2], 1.85, 0.70, 1.85, rotY, dustStone, 0.74, 0, 1.0);
        mb.addCylinder(pc[0], pc[1] + 0.70, pc[2], 0.78, 0.64, 0.35, 8, blueStone, 0.70, 0, 1.0);
        if (state === 'stand') {
          mb.addCylinder(pc[0], pc[1] + 1.0, pc[2], 0.56, 0.48, h, 8, fadedRedCol, 0.68, 0, 1.30);
          mb.setCollision(false);
          mb.addBox(pc[0], pc[1] + h + 0.95, pc[2], 1.55, 0.38, 1.55, rotY, agedTimber, 0.76, 0, 1.30);
          mb.setCollision(true, 'building');
        } else if (state === 'snap') {
          mb.addCylinder(pc[0], pc[1] + 1.0, pc[2], 0.56, 0.50, h, 8, fadedRedCol, 0.72, 0, 1.30);
          // Fallen broken upper shaft resting on the hall terrace
          mb.setCollision(false);
          const pf = ruinToWorld(cx, floorY, cz, rotY, lx + 2.2, 0.52, lz + 1.8);
          mb.addBoxEuler(pf[0], pf[1], pf[2], 0.96, 4.4, 0.96, 1.50, rotY + 0.52, 0.10, fadedRedCol, 0.76, 0, 1.30);
          mb.setCollision(true, 'building');
        } else {
          // Completely toppled giant column lying diagonally across the stone floor!
          const pf = ruinToWorld(cx, floorY, cz, rotY, lx - 1.8, 0.56, lz - 2.6);
          mb.addBoxEuler(pf[0], pf[1], pf[2], 1.02, 7.6, 1.02, 1.52, rotY - 0.68, 0.08, fadedRedCol, 0.76, 0, 1.30);
        }
      }

      // Dramatic Surviving Half-Collapsed Double-Eave Flying Roof Wing over the West/NW half of the Grand Hall!
      mb.setCollision(false);
      // Heavy weathered architrave & ridge beams
      const bFront = ruinToWorld(cx, floorY, cz, rotY, -8.4, 9.8, 6.2);
      mb.addBox(bFront[0], bFront[1], bFront[2], 10.4, 0.55, 0.65, rotY, agedTimber, 0.78, 0, 1.30);
      const bMid = ruinToWorld(cx, floorY, cz, rotY, -4.8, 10.6, -1.4);
      mb.addBox(bMid[0], bMid[1], bMid[2], 18.6, 0.62, 0.72, rotY, agedTimber, 0.78, 0, 1.30);
      const bRidge = ruinToWorld(cx, floorY, cz, rotY, -7.2, 13.0, -3.6);
      mb.addBoxEuler(bRidge[0], bRidge[1], bRidge[2], 15.2, 0.60, 0.64, 0.0, rotY, -0.06, agedTimber, 0.80, 0, 1.30);
      // Exposed jagged roof rafters reaching into the collapsed eastern void
      for (let i = 0; i < 7; i++) {
        const pr = ruinToWorld(cx, floorY, cz, rotY, -13.4 + i * 2.5, 11.4, -0.6);
        mb.addBoxEuler(pr[0], pr[1], pr[2], 0.26, 0.30, 12.8 - (i > 4 ? (i - 4) * 2.2 : 0), 0.28, rotY, 0.0, agedTimber, 0.80, 0, 1.30);
      }
      // Surviving lower & upper broken tiled eaves with dramatic upturned corner (残缺飞檐翘角!)
      const rf1 = ruinToWorld(cx, floorY, cz, rotY, -8.6, 10.9, 1.8);
      mb.addBoxEuler(rf1[0], rf1[1], rf1[2], 13.8, 0.38, 7.6, 0.30, rotY, -0.04, brokenTile, 0.42, 0, 1.15);
      const rf2 = ruinToWorld(cx, floorY, cz, rotY, -8.8, 11.5, -6.2);
      mb.addBoxEuler(rf2[0], rf2[1], rf2[2], 13.2, 0.38, 6.8, -0.28, rotY, -0.03, brokenTile, 0.42, 0, 1.15);
      // Upturned broken flying-eave corner horn on the surviving SW roof corner
      const horn = ruinToWorld(cx, floorY, cz, rotY, -15.6, 10.55, 6.2);
      mb.addBoxEuler(horn[0], horn[1], horn[2], 2.8, 0.34, 2.4, 0.16, rotY + 0.28, 0.32, brokenTile, 0.40, 0, 1.15);
      // Fallen roof tile slab & shattered ridge beam lying in the sunlit collapsed SE interior!
      const fallRf = ruinToWorld(cx, floorY, cz, rotY, 7.6, 0.46, 3.2);
      mb.addBoxEuler(fallRf[0], fallRf[1], fallRf[2], 5.6, 0.36, 4.2, 0.14, rotY + 0.42, 0.12, brokenTile, 0.56, 0, 1.15);

      // Interior Ruined Array Dais & Corroded Bronze Astrolabe Ring at the Heart of the Grand Ruined Hall!
      mb.setCollision(true, 'building');
      const altP = ruinToWorld(cx, floorY, cz, rotY, 0.0, 0.0, -1.6);
      mb.addCylinder(altP[0], altP[1], altP[2], 4.8, 4.4, 0.62, 8, blueStone, 0.70, 0, 1.0);
      mb.addCylinder(altP[0], altP[1] + 0.62, altP[2], 2.0, 1.65, 1.18, 6, darkSlate, 0.68, 0, 1.0);
      mb.setCollision(false);
      mb.addCylinder(altP[0], altP[1] + 1.80, altP[2], 1.75, 1.45, 0.28, 6, rustBronze, 0.52, 0, 3.0);
      mb.addCylinder(altP[0], altP[1] + 2.05, altP[2], 0.44, 0.22, 1.38, 6, faintJade, 0.28, 0.72, 2.0);
      for (let k = 0; k < 4; k++) {
        const ka = (k / 4) * Math.PI * 2 + 0.35;
        const ap = ruinToWorld(cx, floorY, cz, rotY, Math.cos(ka) * 3.6, 0.66, -1.6 + Math.sin(ka) * 3.6);
        mb.addBox(ap[0], ap[1], ap[2], 2.2, 0.14, 0.42, rotY - ka, k % 2 === 0 ? rustBronze : darkRust, 0.56, 0, 3.0);
      }
      mb.setCollision(true, 'building');
    }

    if (T.CANZHEN_ROAD.ruinSites) {
      addRuinedPosthouseCourtyard(T.CANZHEN_ROAD.ruinSites[0]);
      addGrandRuinedArrayHall(T.CANZHEN_ROAD.ruinSites[1]);
    }

    // Place Entry Gateway Ruined Steles & Tilted Pillars at 低云平原 West entrance (-2540, 1345)
    addBrokenStele(-2552, 1326, -2.18, 1.24);
    addRuinedRunePillar(-2528, 1368, 1.18, 'standing', 0.45);
    addRuinedRunePillar(-2576, 1312, 1.08, 'fallen', -0.82);

    // Place Flanking Ruined Rune Pillars & Broken Steles organically along the entire widened & extended road!
    const roadSides = [
      [-2642, 1276, 1.05, 'standing', 'pillar'],
      [-2672, 1308, 0.95, 'half_buried', 'pillar'],
      [-2730, 1230, 1.08, 'fallen', 'pillar'],
      [-2766, 1268, 1.02, 'standing', 'stele'],
      [-2806, 1178, 0.92, 'half_buried', 'pillar'],
      [-2890, 1148, 1.06, 'standing', 'pillar'],
      [-2928, 1174, 0.98, 'standing', 'stele'],
      [-2992, 1118, 1.12, 'fallen', 'pillar'],
      [-3014, 1126, 0.96, 'half_buried', 'pillar'],
      [-3044, 1032, 1.04, 'standing', 'stele'],
      [-3078, 1068, 1.10, 'standing', 'pillar'],
      [-3166,  962, 1.08, 'fallen', 'pillar'],
      [-3198,  998, 0.95, 'standing', 'stele'],
      [-3222,  880, 1.16, 'standing', 'pillar'],
      [-3268,  922, 1.02, 'half_buried', 'pillar'],
      [-3296,  818, 1.18, 'standing', 'pillar'],
      [-3332,  858, 1.05, 'standing', 'stele'],
      [-3418,  758, 1.08, 'standing', 'stele'],
      [-3345,  742, 0.96, 'standing', 'stele'],
      [-2825, 1228, 0.92, 'standing', 'stele'],
      [-3145, 1028, 0.94, 'standing', 'stele'],
      // Forward-extended upper road pillars & steles (WP 6 -> WP 9!)
      [-3445,  695, 1.14, 'standing', 'pillar'],
      [-3485,  722, 1.04, 'fallen', 'pillar'],
      [-3525,  595, 1.12, 'half_buried', 'pillar'],
      [-3565,  625, 1.05, 'standing', 'stele'],
      [-3672,  495, 1.16, 'standing', 'pillar'],
      [-3708,  445, 1.06, 'fallen', 'pillar'],
      [-3735,  378, 1.20, 'standing', 'pillar'],
      [-3768,  412, 1.08, 'standing', 'stele'],
      [-3842,  290, 1.10, 'standing', 'stele'],
    ];
    for (const [rx, rz, sc, st, kind] of roadSides) {
      if (kind === 'stele') {
        addBrokenStele(rx, rz, rand() * Math.PI * 2, sc);
      } else {
        addRuinedRunePillar(rx, rz, sc, st, rand() * Math.PI * 2);
      }
    }
  }

  // 11. 通天灵木林 Faint Woodland Trail Stepping Stones & Threshold Spirit Marker (林间若隐若现苔石小径)
  function buildSpiritForestDetails(mb) {
    const rand = N.createRNG(55109);
    const pts = T.SPIRIT_FOREST.trailPoints;
    const mossStone = [0.34, 0.43, 0.35];
    const spiritGlow = [0.36, 0.90, 0.78];

    // Sparse half-buried mossy stepping stones & occasional low lantern markers along the faint woodland path
    mb.setCollision(false);
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], b = pts[s + 1];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      const rotY = Math.atan2(dx, dz);
      const rx = Math.cos(rotY), rz = -Math.sin(rotY);
      const steps = Math.max(4, Math.floor(len / 5.5));
      for (let i = 0; i < steps; i++) {
        if (rand() < 0.42) continue; // faint & intermittent (若隐若现)
        const u = (i + 0.5) / steps;
        const lat = Math.sin(u * Math.PI * 2.5 + s) * 1.4 + (rand() - 0.5) * 1.8;
        const sx = M.lerp(a[0], b[0], u) + rx * lat;
        const sz = M.lerp(a[1], b[1], u) + rz * lat;
        const sy = T.getTerrainHeight(sx, sz);
        const shade = 0.85 + rand() * 0.25;
        mb.addBoxEuler(
          sx, sy - 0.06, sz,
          1.25 + rand() * 0.95, 0.28, 1.05 + rand() * 0.85,
          (rand() - 0.5) * 0.14, rotY + (rand() - 0.5) * 0.65, (rand() - 0.5) * 0.14,
          [mossStone[0] * shade, mossStone[1] * shade, mossStone[2] * shade],
          0.74, 0, 1.0
        );
      }
    }
    mb.setCollision(true, 'building');

    // Moss-draped Ancient Forest Boundary Tablet at the threshold pass (-3878, 192)
    const bx = -3878, bz = 192;
    const by = T.getTerrainHeight(bx, bz);
    mb.addBox(bx, by + 0.28, bz, 2.8, 0.72, 1.8, 0.52, mossStone, 0.76, 0, 1.0);
    mb.addBoxEuler(bx, by + 2.55, bz, 1.85, 4.4, 0.62, 0.05, 0.52, -0.04, [0.28, 0.36, 0.32], 0.72, 0, 1.0);
    mb.setCollision(false);
    mb.addBoxEuler(bx + 0.22, by + 2.85, bz + 0.26, 0.44, 1.75, 0.10, 0.05, 0.52, -0.04, spiritGlow, 0.28, 0.92, 2.0);
    mb.setCollision(true, 'building');

    // Gentle mossy forest guide lanterns tucked sparsely beside inner & outer trail glades
    for (const [lx, lz] of [
      [-3898, 152], [-3976, -24], [-4098, -244], [-4062, -504],
      [-3930, -1225], [-3505, -1705], [-3075, -2245], [-3465, -2800],
    ]) {
      mb.addStoneLantern(lx, T.getTerrainHeight(lx, lz) - 0.15, lz, 0.96, spiritGlow);
    }
  }

  // 12. 云雾山 Summit Colossal Fully-Glowing Spirit Stone (纯天然无石制方块建筑 + 通体发光巨大聚灵灵石!)
  function buildCloudMountainDetails(mb) {
    const rand = N.createRNG(77319);
    const cm = T.CLOUD_MOUNTAIN;
    const spiritCore = [0.42, 0.98, 1.00]; // Radiant incandescent cyan-ice core
    const spiritCyan = [0.20, 0.90, 0.96]; // Pure luminous spirit jade-cyan
    const spiritBlue = [0.24, 0.78, 1.00]; // Ethereal azure crystal facet

    // SUMMIT CENTERPIECE (2660, 4120, y=760m): 通体发光的巨大聚灵灵石 (ZERO grid-striped stone boxes anywhere on the mountain!)
    const sx = cm.cx, sz = cm.cz;
    const sumY = T.getTerrainHeight(sx, sz);
    mb.setCollision(false);

    // Main Colossal Fully-Luminous Raw Spirit Stone Prism (~44m tall, ~13m wide — radiant from base to jagged crystal apex!)
    mb.addCrystalSpire(sx, sumY - 2.0, sz, 6.8, 44.0, 0.06, 0.25, -0.05, spiritCore, 2.15);
    // Secondary fused luminous crystal ribs hugging the giant central crystal for rich crystalline silhouette
    mb.addCrystalSpire(sx + 3.8, sumY - 1.5, sz + 2.2, 4.4, 31.0, 0.14, 1.15, -0.10, spiritCyan, 1.95);
    mb.addCrystalSpire(sx - 4.0, sumY - 1.5, sz - 1.8, 4.2, 29.0, -0.15, 2.65, 0.12, spiritBlue, 1.90);
    mb.addCrystalSpire(sx - 1.6, sumY - 1.5, sz + 4.2, 3.6, 25.0, 0.18, 4.10, 0.08, spiritCyan, 1.85);
    if (mb.colWorld) {
      // Accurate tapered solid collision cylinder covering the colossal glowing Spirit Stone!
      mb.colWorld.addCylinder(sx, sumY - 2.0, sz, 7.6, 42.0, 'crystal', false, 1.2);
    }

    // 7 Slanted Glowing Satellite Spirit Crystal Spires jutting naturally out of the summit earth around the giant crystal!
    for (let k = 0; k < 7; k++) {
      const ka = (k / 7) * Math.PI * 2 + 0.35;
      const kr = 12.5 + (k % 3) * 3.8;
      const kx = sx + Math.cos(ka) * kr;
      const kz = sz + Math.sin(ka) * kr;
      const ky = T.getTerrainHeight(kx, kz);
      const kh = 11.5 + (k % 3) * 4.8 + rand() * 3.5;
      const kw = 2.0 + (k % 2) * 0.85;
      const tiltOut = 0.24 + rand() * 0.18;
      const col = k % 3 === 0 ? spiritCore : (k % 3 === 1 ? spiritCyan : spiritBlue);
      mb.addCrystalSpire(kx, ky - 1.2, kz, kw, kh, Math.sin(ka) * tiltOut, ka, -Math.cos(ka) * tiltOut, col, 1.85);
      if (mb.colWorld) {
        mb.colWorld.addCylinder(kx, ky - 1.0, kz, kw * 0.95, kh * 0.78, 'crystal', false, kw * 0.25);
      }
    }

    // 12 Hovering Raw Glowing Spirit Crystal Shards floating effortlessly in mid-air around the giant Spirit Stone!
    for (let f = 0; f < 12; f++) {
      const fa = (f / 12) * Math.PI * 2 + 0.2;
      const fr = 12.0 + (f % 3) * 4.6;
      const fy = sumY + 12.0 + (f % 4) * 6.5 + Math.sin(f * 1.7) * 3.0;
      const fx = sx + Math.cos(fa) * fr;
      const fz = sz + Math.sin(fa) * fr;
      const fCol = f % 2 === 0 ? spiritCore : spiritCyan;
      mb.addCrystalSpire(fx, fy, fz, 0.85 + (f % 2) * 0.35, 3.6 + (f % 3) * 1.4, 0.26, fa, -0.20, fCol, 2.05);
    }
    mb.setCollision(true, 'building');
  }

  // 13. 流沙荒漠 Restrained Half-Buried Ancient Cultivator Ruins, Bleached Beast Bones & Tattered Banners (荒漠古修残迹)
  function buildDesertRuins(mb) {
    const rand = N.createRNG(88421);
    const sandStone = [0.60, 0.45, 0.29];
    const sandStoneDark = [0.46, 0.33, 0.21];
    const boneIvory = [0.85, 0.79, 0.67];
    const deadWood = [0.36, 0.28, 0.20];
    const bannerCloth = [0.62, 0.22, 0.16];
    const bannerTrim = [0.78, 0.62, 0.32];
    const dimAmberRune = [0.86, 0.66, 0.32];

    // A) Half-buried weathered sandstone ruined wall (低面数风化断壁 — anchored firmly to exact mesh foot height!)
    function addHalfBuriedWall(x, z, len, h, rotY) {
      const segs = 3;
      const segLen = len / segs;
      const cY = Math.cos(rotY), sY = Math.sin(rotY);
      for (let i = 0; i < segs; i++) {
        const off = (i - (segs - 1) * 0.5) * segLen * 0.96;
        const wx = x + off * cY;
        const wz = z - off * sY;
        const wy = T.getMeshFootHeight(wx, wz, segLen * 0.48);
        const segH = h * (i === 1 ? 1.0 : (0.52 + rand() * 0.34));
        const col = i === 1 ? sandStone : sandStoneDark;
        mb.addBoxEuler(wx, wy + segH * 0.24, wz, segLen * 1.02, segH, 1.35 + rand() * 0.4, (rand() - 0.5) * 0.14, rotY, (rand() - 0.5) * 0.12, col, 0.86, 0, 1.0);
      }
    }

    // B) Tilted half-buried ancient cultivator stone pillar (倾斜古修石柱)
    function addTiltedDesertPillar(x, z, h, r, tiltX, tiltZ) {
      const y = T.getMeshFootHeight(x, z, r * 1.2);
      const ry = rand() * Math.PI * 2;
      mb.addBoxEuler(x, y + h * 0.30, z, r * 2.0, h, r * 2.0, tiltX, ry, tiltZ, sandStone, 0.82, 0, 1.0);
      // Faint weathered amber rune band near upper half
      mb.setCollision(false);
      mb.addBoxEuler(x, y + h * 0.48, z, r * 2.08, 0.26, r * 2.08, tiltX, ry, tiltZ, dimAmberRune, 0.48, 0.32, 2.0);
      mb.setCollision(true, 'building');
    }

    // C) Giant sun-bleached ancient beast ribcage half-buried in sand (干涸枯骨)
    function addBleachedBeastBones(x, z, rotY, sc = 1.0) {
      const cY = Math.cos(rotY), sY = Math.sin(rotY);
      const ribPairs = 5;
      mb.setCollision(false);
      for (let i = 0; i < ribPairs; i++) {
        const t = i / (ribPairs - 1);
        const along = (t - 0.5) * 14.5 * sc;
        const archScale = (1.0 - Math.abs(t - 0.42) * 0.65) * sc;
        const bx = x + along * cY;
        const bz = z - along * sY;
        const by = T.getMeshTerrainHeight(bx, bz);
        for (const side of [-1, 1]) {
          // Only emerge asymmetrically so it feels authentically half-buried in shifting sand
          if (side === -1 && i === 4) continue;
          const nx = sY * side, nz = cY * side;
          const pts = [
            [bx + nx * 0.4 * archScale, by - 2.2 * sc, bz + nz * 0.4 * archScale],
            [bx + nx * 3.4 * archScale, by + 1.6 * archScale, bz + nz * 3.4 * archScale],
            [bx + nx * 4.2 * archScale, by + 5.0 * archScale, bz + nz * 4.2 * archScale],
            [bx + nx * 1.9 * archScale, by + 7.2 * archScale, bz + nz * 1.9 * archScale],
          ];
          const rads = [0.44 * archScale, 0.36 * archScale, 0.26 * archScale, 0.11 * archScale];
          mb.addTubeChain(pts, rads, 5, boneIvory, 0.78, 0, 0.0, true);
          if (mb.colWorld) {
            mb.colWorld.addCylinder(bx + nx * 3.0 * archScale, by - 0.5, bz + nz * 3.0 * archScale, 0.65 * archScale, 6.5 * archScale, 'rock', false, 0.25 * archScale);
          }
        }
      }
      // Half-buried spine ridge vertebrae along the sand floor
      const sp0x = x - 8.2 * sc * cY, sp0z = z + 8.2 * sc * sY;
      const sp1x = x + 8.2 * sc * cY, sp1z = z - 8.2 * sc * sY;
      mb.addTubeChain(
        [
          [sp0x, T.getMeshTerrainHeight(sp0x, sp0z) - 1.0, sp0z],
          [x, T.getMeshTerrainHeight(x, z) + 0.3 * sc, z],
          [sp1x, T.getMeshTerrainHeight(sp1x, sp1z) - 1.0, sp1z],
        ],
        [0.55 * sc, 0.72 * sc, 0.42 * sc],
        6, boneIvory, 0.80, 0, 0.0, true
      );
      mb.setCollision(true, 'building');
    }

    // D) Weathered leaning banner flagpole & dry deadwood stumps (残破旗杆与枯木桩)
    function addTatteredBanner(x, z, h, rotY) {
      const y = T.getMeshTerrainHeight(x, z);
      const leanX = 0.16 + rand() * 0.12;
      const leanZ = (rand() - 0.5) * 0.18;
      const topX = x + Math.sin(leanX) * h;
      const topY = y + Math.cos(leanX) * h;
      const topZ = z + Math.sin(leanZ) * h;
      mb.setCollision(false);
      mb.addTubeChain([[x, y - 1.6, z], [topX, topY, topZ]], [0.22, 0.12], 5, deadWood, 0.88, 0, 1.30, true);
      if (mb.colWorld) mb.colWorld.addCylinder(x, y - 0.8, z, 0.35, h * 0.85, 'building', false, 0.2);

      // Crossbar + sun-faded torn desert banner fluttering along prevailing NW->SE wind!
      const wx = 0.76, wz = 0.65;
      const p0 = [topX, topY - 0.35, topZ];
      const p1 = [topX + wx * 3.2, topY - 0.65, topZ + wz * 3.2];
      const p2 = [topX + wx * 2.5, topY - 2.35, topZ + wz * 2.5];
      const p3 = [topX, topY - 2.65, topZ];
      mb.addFlatQuad(p0, p1, p2, p3, bannerCloth, 0.82, 0, 0.0);
      // Tattered lower pennant tail
      const p4 = [topX + wx * 3.9, topY - 1.15, topZ + wz * 3.9];
      mb.addFlatTri(p1, p4, p2, bannerTrim, 0.82, 0, 0.0);
      // 1-2 dry weathered deadwood stumps half-buried beside the flagpole
      for (let s = 0; s < 2; s++) {
        const sa = rotY + 1.4 + s * 2.3;
        const sx = x + Math.cos(sa) * (3.2 + s * 2.4);
        const sz = z + Math.sin(sa) * (3.2 + s * 2.4);
        const sy = T.getMeshTerrainHeight(sx, sz);
        const sh = 1.6 + rand() * 1.9;
        mb.addTubeChain([[sx, sy - 1.2, sz], [sx + Math.cos(sa) * 0.55, sy + sh, sz + Math.sin(sa) * 0.55]], [0.34, 0.16], 5, deadWood, 0.90, 0, 1.30, true);
      }
      mb.setCollision(true, 'building');
    }

    // Place restrained, atmospheric ruins across all 5 curated 流沙荒漠 sites
    for (const site of T.DESERT_DUNES.ruinSites) {
      const x = site.x, z = site.z;
      if (site.kind === 'wall_pillars') {
        addHalfBuriedWall(x, z, 15.5, 5.2, 0.42 + rand() * 0.6);
        addHalfBuriedWall(x + 12.0, z - 9.0, 9.5, 3.8, -0.85 + rand() * 0.4);
        addTiltedDesertPillar(x - 10.5, z + 7.5, 7.6, 0.92, 0.24, -0.18);
        addTiltedDesertPillar(x + 7.5, z + 11.0, 5.8, 0.84, -0.32, 0.22);
        addTatteredBanner(x - 5.5, z - 8.5, 8.2, 0.6);
      } else if (site.kind === 'bones_banner') {
        addBleachedBeastBones(x, z, 0.55, 1.18);
        addTatteredBanner(x + 14.5, z - 8.0, 9.4, 1.2);
        addTiltedDesertPillar(x - 13.0, z + 10.5, 6.4, 0.88, 0.36, 0.15);
      } else if (site.kind === 'pillars_banner') {
        // Northern desert outpost echoing nearby 残阵古道!
        addTiltedDesertPillar(x - 8.0, z - 6.0, 8.4, 0.96, 0.18, -0.22);
        addTiltedDesertPillar(x + 9.0, z - 3.5, 6.8, 0.90, -0.28, 0.20);
        addTiltedDesertPillar(x + 1.5, z + 10.0, 5.2, 0.82, 0.42, 0.32);
        addHalfBuriedWall(x - 2.0, z - 12.0, 11.5, 4.4, 0.25);
        addTatteredBanner(x + 11.0, z + 7.5, 8.6, 2.1);
      } else if (site.kind === 'bones_pillars') {
        addBleachedBeastBones(x - 4.0, z + 3.0, -0.65, 1.05);
        addTiltedDesertPillar(x + 12.0, z - 7.5, 7.2, 0.88, -0.25, -0.30);
        addHalfBuriedWall(x + 6.5, z + 11.0, 10.5, 4.0, 1.15);
        addTatteredBanner(x - 12.0, z - 9.0, 7.8, 0.4);
      }
    }
  }

  // 14. 霜雪原 Ice Crystal Pillars, Snow-Drifted Ancient Steles & Half-Buried Frost Array (冰晶石柱 · 古碑残阵 — 低面数精简!)
  function buildFrostSnowfieldDetails(mb) {
    const rand = N.createRNG(99173);
    const fs = T.FROST_SNOWFIELD;
    const icePale  = [0.68, 0.92, 1.00];
    const iceCyan  = [0.36, 0.82, 0.98];
    const iceDeep  = [0.26, 0.64, 0.92];
    const frostStone = [0.28, 0.35, 0.44];
    const frostSlate = [0.20, 0.27, 0.36];
    const frostRune  = [0.54, 0.92, 1.00];

    // Helper: Low-poly hexagonal Ice Crystal Pillar cluster (冰晶石柱群)
    function addIceCrystalCluster(x, z, scale = 1.0) {
      const y = T.getMeshFootHeight(x, z, 2.2 * scale);
      const count = 3 + ((rand() * 2) | 0);
      mb.setCollision(false);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.45;
        const d = i === 0 ? 0.0 : (1.6 + rand() * 2.4) * scale;
        const cx = x + Math.cos(a) * d;
        const cz = z + Math.sin(a) * d;
        const cy = i === 0 ? y : T.getMeshTerrainHeight(cx, cz);
        const h = (i === 0 ? (9.5 + rand() * 6.5) : (4.2 + rand() * 4.8)) * scale;
        const r = (i === 0 ? (1.45 + rand() * 0.65) : (0.78 + rand() * 0.52)) * scale;
        const tilt = i === 0 ? (0.06 + rand() * 0.08) : (0.20 + rand() * 0.22);
        const col = i === 0 ? icePale : (i % 2 === 0 ? iceCyan : iceDeep);
        mb.addCrystalSpire(cx, cy - 1.4, cz, r, h, Math.sin(a) * tilt, a, -Math.cos(a) * tilt, col, i === 0 ? 1.25 : 0.95);
        if (mb.colWorld) {
          mb.colWorld.addCylinder(cx, cy - 1.0, cz, r * 0.96, h * 0.82, 'crystal', false, r * 0.26);
        }
      }
      mb.setCollision(true, 'building');
    }

    // Helper: Half-buried snow-drifted ancient cultivator stele (半埋风雪中的古碑)
    function addSnowBuriedStele(x, z, rotY, scale = 1.0) {
      const y = T.getMeshFootHeight(x, z, 1.8 * scale);
      const tiltX = 0.08 + (rand() - 0.5) * 0.14;
      const tiltZ = (rand() - 0.5) * 0.16;
      mb.addBoxEuler(x, y + 0.25 * scale, z, 3.2 * scale, 1.1 * scale, 2.0 * scale, 0, rotY, 0, frostSlate, 0.78, 0, 1.0);
      mb.addBoxEuler(x, y + 2.65 * scale, z, 2.05 * scale, 5.2 * scale, 0.68 * scale, tiltX, rotY, tiltZ, frostStone, 0.74, 0, 1.0);
      mb.setCollision(false);
      // Faint frost-carved pale ice-blue inscription strip on the weathered stele face
      const cY = Math.cos(rotY), sY = Math.sin(rotY);
      mb.addBoxEuler(x + sY * 0.36 * scale, y + 3.0 * scale, z + cY * 0.36 * scale, 0.42 * scale, 2.1 * scale, 0.08 * scale, tiltX, rotY, tiltZ, frostRune, 0.28, 0.78, 2.0);
      mb.setCollision(true, 'building');
    }

    // 1. Frame the Frozen Frost Tarn (寒潭冰面, -3460, -5940) with restrained glacial crystal clusters along the snowy banks
    const pondCrystalAngles = [-2.55, -1.85, -0.95, -0.20, 0.65, 1.35, 2.35, 2.95];
    for (let i = 0; i < pondCrystalAngles.length; i++) {
      const a = pondCrystalAngles[i];
      const dist = fs.pondR * (0.98 + (i % 2) * 0.16);
      const px = fs.pondX + Math.cos(a) * (dist / 0.94);
      const pz = fs.pondZ + Math.sin(a) * (dist / 1.08);
      addIceCrystalCluster(px, pz, 0.85 + (i % 3) * 0.32);
    }

    // 2. Curated snowfield relic sites (古碑 / 半埋寒霜残阵 / 冰晶石柱群)
    for (const site of fs.relicSites) {
      const x = site.x, z = site.z;
      if (site.kind === 'stele_crystals') {
        addSnowBuriedStele(x, z, 0.15 + (rand() - 0.5) * 0.5, 1.15);
        addIceCrystalCluster(x - 10.5, z - 6.0, 1.05);
        addIceCrystalCluster(x + 11.5, z - 4.5, 0.90);
      } else if (site.kind === 'buried_array') {
        // Half-buried Ancient Frost Array Altar (半埋寒霜残阵): 5 leaning rune pillars + central snow-drifted fractured dais
        const ay = T.getMeshFootHeight(x, z, 6.0);
        mb.addBox(x, ay + 0.25, z, 11.0, 1.1, 11.0, 0.4, frostSlate, 0.78, 0, 1.0);
        for (let k = 0; k < 5; k++) {
          const ka = (k / 5) * Math.PI * 2 + 0.3;
          const pr = 16.5;
          const px = x + Math.cos(ka) * pr;
          const pz = z + Math.sin(ka) * pr;
          const py = T.getMeshFootHeight(px, pz, 1.2);
          const ph = (k % 2 === 0) ? 7.6 : 4.6;
          const tx = (k % 2 === 0 ? 0.12 : 0.28) * Math.cos(ka);
          const tz = (k % 2 === 0 ? 0.12 : 0.28) * Math.sin(ka);
          mb.addBoxEuler(px, py + ph * 0.34, pz, 1.75, ph, 1.75, tx, ka, tz, frostStone, 0.78, 0, 1.0);
          mb.setCollision(false);
          mb.addBoxEuler(px, py + ph * 0.50, pz, 1.84, 0.24, 1.84, tx, ka, tz, frostRune, 0.26, 0.72, 2.0);
          mb.setCollision(true, 'building');
        }
        addIceCrystalCluster(x + 2.5, z - 1.8, 1.12);
      } else if (site.kind === 'crystal_grove') {
        addIceCrystalCluster(x, z, 1.38);
        addIceCrystalCluster(x - 16.0, z + 11.0, 1.05);
        addIceCrystalCluster(x + 14.5, z - 12.0, 0.96);
        addSnowBuriedStele(x + 8.0, z + 15.0, -0.65, 0.96);
      }
    }

    // 3. ~42 sparse scattered natural Ice Crystal Spires along wind-carved snow ridges across the expanded W/N/NE snowfield
    const fm = T.FROST_MOUNTAIN;
    let placedIce = 0, iceTries = 0;
    while (placedIce < 42 && iceTries < 2200) {
      iceTries++;
      const ix = -8150 + rand() * 11750;
      const iz = -8960 + rand() * 4520;
      if (T.getSnowfieldMask(ix, iz) < 0.34) continue;
      if (T.getFrostMountainMask(ix, iz) > 0.16) continue;
      if (Math.hypot(ix - fs.pondX, iz - fs.pondZ) < fs.pondR + 55) continue;
      if (Math.hypot(ix + 4180, iz + 6080) < 48) continue;
      addIceCrystalCluster(ix, iz, 0.80 + rand() * 0.78);
      placedIce++;
    }

    // 4. 霜雪山 680m Snow Summit Natural Glacial Crystal Crown (-1480, -6880) — pure ice crystal spires, ZERO stone cubes!
    const fmx = fm.cx, fmz = fm.cz;
    const fmy = T.getMeshTerrainHeight(fmx, fmz);
    mb.setCollision(false);
    mb.addCrystalSpire(fmx, fmy - 2.0, fmz, 4.6, 28.0, 0.05, 0.3, -0.05, icePale, 1.55);
    mb.addCrystalSpire(fmx + 3.0, fmy - 1.5, fmz + 1.8, 2.8, 19.0, 0.16, 1.2, -0.10, iceCyan, 1.38);
    mb.addCrystalSpire(fmx - 3.2, fmy - 1.5, fmz - 1.6, 2.6, 17.5, -0.15, 2.8, 0.12, iceDeep, 1.32);
    if (mb.colWorld) {
      mb.colWorld.addCylinder(fmx, fmy - 1.5, fmz, 5.2, 26.0, 'crystal', false, 1.0);
    }
    for (let k = 0; k < 5; k++) {
      const ka = (k / 5) * Math.PI * 2 + 0.4;
      const kr = 9.5 + (k % 2) * 3.0;
      const kx = fmx + Math.cos(ka) * kr, kz = fmz + Math.sin(ka) * kr;
      const ky = T.getMeshTerrainHeight(kx, kz);
      const kh = 8.5 + (k % 3) * 3.2;
      mb.addCrystalSpire(kx, ky - 1.0, kz, 1.65, kh, Math.sin(ka) * 0.24, ka, -Math.cos(ka) * 0.24, k % 2 === 0 ? icePale : iceCyan, 1.35);
      if (mb.colWorld) {
        mb.colWorld.addCylinder(kx, ky - 0.8, kz, 1.6, kh * 0.80, 'crystal', false, 0.35);
      }
    }
    mb.setCollision(true, 'building');
  }

  // =========================================================================
  // BOSS ARENA 1: 灵竹幽谷 (2660, 5820 — South/below 云雾山!)
  // - Outer semi-open ring of towering emerald spirit bamboo with faintly cyan-glowing joints (竹节泛着淡淡青光)
  // - Scattered mossy rocks & fallen bamboo leaf patches along perimeter (r > 43m)
  // - Clean flat circular central Boss clearing (r < 40m) inlaid with flush cracked bluestone slabs — ZERO obstructing big props!
  // - 2 subtle off-center edge landmarks (half-fallen ancient stele + glowing spirit bamboo cluster) that never block Boss sightlines
  // =========================================================================
  const bambooCrownList = [];
  function buildBambooValleyLandmarks(mb) {
    bambooCrownList.length = 0;
    const bv = T.BAMBOO_VALLEY;
    const cx = bv.cx, cz = bv.cz;
    const rand = N.createRNG(20260711);

    const bambooColA = [0.18, 0.54, 0.28];
    const bambooColB = [0.24, 0.62, 0.32];
    const nodeGlowCol = [0.42, 0.96, 0.86];
    const stoneColA = [0.44, 0.48, 0.45];
    const stoneColB = [0.36, 0.42, 0.38];
    const mossRockCol = [0.30, 0.40, 0.31];
    const leafLitterCol = [0.28, 0.50, 0.22];
    const leafDryCol = [0.46, 0.52, 0.26];

    // Helper: Tall Spirit Bamboo Clump with luminous pale-cyan glowing joints (竹节泛着淡淡青光)
    function addSpiritBambooClump(bx, bz, scale, stalkCount, glowStrength = 0.55) {
      const baseY = T.getMeshTerrainHeight(bx, bz);
      mb.setCollision(false);
      for (let s = 0; s < stalkCount; s++) {
        const ang = (s / stalkCount) * Math.PI * 2 + (rand() - 0.5) * 0.65;
        const spread = s === 0 ? 0.0 : (0.55 + rand() * 1.15) * scale;
        const sx = bx + Math.cos(ang) * spread;
        const sz = bz + Math.sin(ang) * spread;
        const sy = T.getMeshTerrainHeight(sx, sz) - 0.35;
        const totalH = (11.5 + rand() * 7.5) * scale;
        const segs = 6 + ((rand() * 3) | 0);
        const segH = totalH / segs;
        const leanA = rand() * Math.PI * 2;
        const leanAmt = (0.04 + rand() * 0.07) * scale;
        const col = (s % 2 === 0) ? bambooColA : bambooColB;

        let px = sx, py = sy, pz = sz;
        let r = (0.20 + rand() * 0.07) * scale;
        for (let k = 0; k < segs; k++) {
          const frac = k / segs;
          const nx = px + Math.cos(leanA) * leanAmt * (0.5 + frac * 1.5);
          const ny = py + segH;
          const nz = pz + Math.sin(leanA) * leanAmt * (0.5 + frac * 1.5);
          const rNext = r * 0.90;
          mb.addTaperedBeam(px, py, pz, nx, ny, nz, r, rNext, 6, col, 0.68, 0.0);
          // Raised luminous cyan bamboo joint ring (泛着淡淡青光的竹节)
          if (k > 0) {
            mb.addCylinder(px, py - 0.06, pz, r * 1.24, r * 1.24, 0.14 * scale, 6, nodeGlowCol, 0.35, glowStrength);
          }
          // Record top-third canopy anchor positions for swaying emerald bamboo foliage in nature.js
          if (k >= segs - 2) {
            bambooCrownList.push({
              x: nx,
              y: ny + 0.25 * scale,
              z: nz,
              scale: (0.85 + rand() * 0.45) * scale,
              glow: glowStrength > 0.75 ? 1 : 0,
            });
          }
          px = nx; py = ny; pz = nz;
          r = rNext;
        }
      }
      // Single slim trunk-cluster collider at base (never cramps sightlines or movement!)
      if (mb.colWorld) {
        mb.colWorld.addCylinder(bx, baseY - 0.5, bz, 0.78 * scale, 12.0 * scale, 'tree', false);
      }
    }

    // 1. Center Boss Clearing (r < 40m): Clean flat compacted ground inlaid with flush cracked bluestone slabs (残破青石板)
    mb.setCollision(false);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + (rand() - 0.5) * 0.28;
      const d = (i < 6) ? (3.5 + rand() * 11.0) : (14.0 + rand() * 21.5);
      const sx = cx + Math.cos(a) * d;
      const sz = cz + Math.sin(a) * d;
      const sy = T.getMeshTerrainHeight(sx, sz);
      const w = 2.4 + rand() * 3.4;
      const l = 2.0 + rand() * 3.0;
      const h = 0.10 + rand() * 0.06;
      mb.addBox(sx, sy + h * 0.35, sz, w, h, l, rand() * Math.PI, i % 2 === 0 ? stoneColA : stoneColB, 0.86, 0.0);
    }

    // Scattered fallen bamboo leaf patches (碎竹叶) hugging the outer fringe of the clearing & grove edge
    for (let i = 0; i < 64; i++) {
      const a = rand() * Math.PI * 2;
      const d = 34.0 + rand() * 48.0;
      const lx = cx + Math.cos(a) * d;
      const lz = cz + Math.sin(a) * d;
      const ly = T.getMeshTerrainHeight(lx, lz);
      const szW = 0.75 + rand() * 1.45;
      const szL = 0.32 + rand() * 0.55;
      mb.addBox(lx, ly + 0.035, lz, szW, 0.03, szL, rand() * Math.PI, i % 3 === 0 ? leafDryCol : leafLitterCol, 0.85, 0.0);
    }

    // 2. Two Subtle Off-Center Edge Landmarks (点缀标志物 — at arena margin r ~ 40m, never blocking Boss sightlines!)
    // (a) Half-Fallen Ancient Bamboo-Valley Stele (半倒的古碑) at East-NE margin
    {
      const sx = cx + 35.5, sz = cz - 18.5;
      const sy = T.getMeshTerrainHeight(sx, sz);
      mb.addBox(sx, sy + 0.32, sz, 2.8, 0.72, 1.5, -0.45, stoneColB, 0.88, 0.0);
      mb.addTaperedBeam(sx - 0.15, sy + 0.52, sz + 0.1, sx + 1.55, sy + 3.45, sz - 0.75, 0.78, 0.62, 6, stoneColA, 0.84, 0.0);
      mb.addTaperedBeam(sx + 0.18, sy + 1.25, sz - 0.12, sx + 1.05, sy + 2.72, sz - 0.50, 0.36, 0.30, 4, nodeGlowCol, 0.35, 0.72);
      mb.addBox(sx + 2.4, sy + 0.28, sz - 1.1, 1.35, 0.52, 0.92, 0.38, stoneColB, 0.88, 0.0);
      if (mb.colWorld) {
        mb.colWorld.addCylinder(sx + 0.5, sy - 0.4, sz - 0.2, 1.6, 3.4, 'rock', false);
      }
    }
    // (b) Hero Glowing Spirit Bamboo Cluster (一丛发光灵竹) at West-SW margin
    {
      const hx = cx - 33.8, hz = cz + 21.2;
      const hy = T.getMeshTerrainHeight(hx, hz);
      addSpiritBambooClump(hx, hz, 1.18, 7, 1.05);
      mb.addBox(hx + 1.35, hy + 0.48, hz - 0.85, 2.2, 1.05, 1.75, 0.55, mossRockCol, 0.88, 0.0);
      mb.addBox(hx - 1.15, hy + 0.32, hz + 1.05, 1.6, 0.75, 1.35, -0.42, stoneColB, 0.88, 0.0);
    }

    // 3. Semi-Open Inner Bamboo Ring around Boss Clearing (r = 49..88m) + Deep Winding Bamboo Forest across the ENTIRE Valley!
    const innerRingCount = 18;
    for (let i = 0; i < innerRingCount; i++) {
      const a = (i / innerRingCount) * Math.PI * 2 + (rand() - 0.5) * 0.18;
      const d = 50.0 + rand() * 34.0;
      const bx = cx + Math.cos(a) * d;
      const bz = cz + Math.sin(a) * d;
      if (bz < cz - 24.0 && Math.abs(bx - cx) < 24.0) continue; // Open North Boss entrance!
      addSpiritBambooClump(bx, bz, 0.95 + rand() * 0.34, 4 + ((rand() * 3) | 0), 0.52);
    }
    // Flanking valley-mouth guardian bamboo clusters (谷口迎客灵竹)
    addSpiritBambooClump(cx - 26.5, cz - 62.0, 1.24, 6, 0.75);
    addSpiritBambooClump(cx + 26.5, cz - 62.0, 1.24, 6, 0.75);

    // Winding weathered bluestone approach trail leading South from 云雾山 foothill (z=5340) into the Boss clearing (z=5960)!
    for (let s = 0; s < 34; s++) {
      const t = s / 33;
      const tz = 5340 + t * 620;
      const tx = cx + Math.sin(t * Math.PI * 2.2) * 34.0 + (rand() - 0.5) * 4.5;
      const ty = T.getMeshTerrainHeight(tx, tz);
      mb.addBox(tx, ty + 0.05, tz, 3.2 + rand() * 2.2, 0.12, 2.6 + rand() * 1.8, rand() * Math.PI, s % 2 === 0 ? stoneColA : stoneColB, 0.86, 0.0);
    }

    // Deep Spirit Bamboo Forest spanning the entire ~1200m x 1200m valley (real exploration depth from 云雾山 foothill!)
    let placedGroves = 0, groveTries = 0;
    while (placedGroves < 98 && groveTries < 900) {
      groveTries++;
      const bx = cx - 540 + rand() * 1080;
      const bz = 5320 + rand() * 1120;
      if (T.getBambooValleyMask(bx, bz) < 0.24) continue;
      if (Math.hypot(bx - cx, bz - cz) < 82.0) continue; // Keep inner Boss clearing & ring clean
      // Keep winding North approach trail clear & inviting
      if (bz < cz && bz > 5320) {
        const trailX = cx + Math.sin(((bz - 5340) / 620) * Math.PI * 2.2) * 34.0;
        if (Math.abs(bx - trailX) < 17.0) continue;
      }
      addSpiritBambooClump(bx, bz, 0.92 + rand() * 0.48, 3 + ((rand() * 3) | 0), 0.45);
      placedGroves++;
    }

    // 4. Scattered Mossy Stones (青苔石) throughout the bamboo valley outside the Boss clearing
    let placedMossRocks = 0, rockTries = 0;
    while (placedMossRocks < 52 && rockTries < 450) {
      rockTries++;
      const rx = cx - 480 + rand() * 960;
      const rz = 5340 + rand() * 1040;
      if (T.getBambooValleyMask(rx, rz) < 0.22) continue;
      if (Math.hypot(rx - cx, rz - cz) < 48.0) continue;
      if (rz < cz && rz > 5320) {
        const trailX = cx + Math.sin(((rz - 5340) / 620) * Math.PI * 2.2) * 34.0;
        if (Math.abs(rx - trailX) < 14.0) continue;
      }
      const ry = T.getMeshTerrainHeight(rx, rz);
      const sx = 1.6 + rand() * 2.4;
      const sy = 0.8 + rand() * 1.3;
      const sz = 1.4 + rand() * 2.2;
      mb.addBox(rx, ry + sy * 0.36, rz, sx, sy, sz, rand() * Math.PI, placedMossRocks % 2 === 0 ? mossRockCol : stoneColB, 0.88, 0.0);
      if (mb.colWorld && sy > 0.95) {
        mb.colWorld.addCylinder(rx, ry - 0.3, rz, Math.max(sx, sz) * 0.46, sy * 0.88, 'rock', true);
      }
      placedMossRocks++;
    }
    mb.setCollision(true, 'building');
  }

  // =========================================================================
  // BOSS ARENA 2: 蚀骨毒潭 (4760, 2160 — East/right of 沉烟迷泽!)
  // - Central raised clean dry stone-bank Boss arena (r = 34.5m, y = 9.45m) with Western stone causeway
  // - Deep glowing purple / dark-emerald toxic pool (r = 35..68m, waterY = 8.4m) cleanly separating Boss arena from outer shore
  // - 4 independent stepping stone platforms & deadwood stumps in the venom pool (walkable visual & positioning cues!)
  // - Dark scorched-rock shore (r = 72..148m) with twisted leaning deadwood, broken stone pillars & glowing purple-green toxic mushrooms!
  // =========================================================================
  function buildVenomMireLandmarks(mb) {
    const vm = T.VENOM_MIRE;
    const cx = vm.cx, cz = vm.cz;
    const arenaY = vm.arenaY;
    const waterY = vm.waterY;
    const rand = N.createRNG(20260722);

    const scorchDark   = [0.14, 0.12, 0.14];
    const scorchBrown  = [0.22, 0.16, 0.14];
    const arenaSlate   = [0.22, 0.21, 0.24];
    const arenaSlab    = [0.28, 0.26, 0.29];
    const deadWoodCol  = [0.17, 0.13, 0.11];
    const deadWoodBark = [0.24, 0.18, 0.15];
    const pillarStone  = [0.24, 0.23, 0.27];
    const toxicPurple  = [0.58, 0.18, 0.88];
    const toxicGreen   = [0.22, 0.92, 0.46];
    const mushroomStem = [0.42, 0.36, 0.46];
    const mushroomCapP = [0.28, 0.12, 0.38];
    const mushroomCapG = [0.14, 0.34, 0.22];

    // 1. Clean Sculpted Circular Boss Stone-Bank Arena (中心凸起石滩空场, r = 38.5m, top = 9.45m, walkable!)
    mb.setCollision(false);
    mb.addCylinder(cx, 4.8, cz, 41.8, 38.8, arenaY - 4.85, 24, scorchDark, 0.90, 0.0);
    mb.addCylinder(cx, arenaY - 0.18, cz, 38.8, 38.4, 0.22, 24, arenaSlate, 0.86, 0.0);
    if (mb.colWorld) {
      mb.colWorld.addCylinder(cx, 4.8, cz, 38.6, arenaY - 4.75, 'building', true);
    }

    // Flush cracked dark stone slabs inside the Boss arena (100% obstacle-free!)
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + (rand() - 0.5) * 0.25;
      const d = 5.5 + rand() * 25.0;
      const sx = cx + Math.cos(a) * d;
      const sz = cz + Math.sin(a) * d;
      mb.addBox(sx, arenaY + 0.03, sz, 2.8 + rand() * 3.0, 0.07, 2.2 + rand() * 2.6, rand() * Math.PI, arenaSlab, 0.88, 0.0);
    }

    // Clear low-profile stone bank rim curbing stones around arena perimeter (leaves West causeway open!)
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      if (Math.cos(a) < -0.82 && Math.abs(Math.sin(a)) < 0.38) continue;
      const rx = cx + Math.cos(a) * 38.0;
      const rz = cz + Math.sin(a) * 38.0;
      mb.addBox(rx, arenaY + 0.10, rz, 3.9, 0.34, 1.45, -a + Math.PI * 0.5, i % 2 === 0 ? scorchBrown : scorchDark, 0.90, 0.0);
    }

    // 2. Western Stone Causeway Entrance (connecting smoothly from 沉烟迷泽 eastern approach onto the Boss arena!)
    {
      const cwLen = 52.0;
      const cwX = cx - 60.0;
      mb.addBox(cwX, (arenaY + 4.8) * 0.5 - 0.05, cz, cwLen, arenaY - 4.85, 17.5, 0, scorchDark, 0.90, 0.0);
      mb.addBox(cwX, arenaY - 0.04, cz, cwLen, 0.14, 16.2, 0, arenaSlate, 0.86, 0.0);
      if (mb.colWorld) {
        mb.colWorld.addBox(cwX, (arenaY + 4.8) * 0.5 - 0.04, cz, cwLen, arenaY - 4.78, 16.8, 0, 'building', true);
      }
      for (const side of [-1, 1]) {
        mb.addBox(cx - 80.0, arenaY + 0.55, cz + side * 10.2, 2.8, 1.5, 2.6, side * 0.3, scorchBrown, 0.90, 0.0);
      }
    }

    // 3. 4 Independent Stepping Stone Platforms & Deadwood Stumps in the Venom Pool (落脚/走位提示, walkable!)
    const poolPads = [
      { ang:  0.85, r: 53.5, kind: 'stone', rad: 4.6 },
      { ang: -0.92, r: 54.5, kind: 'stone', rad: 4.4 },
      { ang:  2.22, r: 52.5, kind: 'stump', rad: 3.5 },
      { ang: -2.18, r: 53.0, kind: 'stump', rad: 3.4 },
    ];
    for (const pad of poolPads) {
      const px = cx + Math.cos(pad.ang) * pad.r;
      const pz = cz + Math.sin(pad.ang) * pad.r;
      const topY = waterY + 0.55;
      if (pad.kind === 'stone') {
        mb.addCylinder(px, 5.0, pz, pad.rad * 1.18, pad.rad, topY - 5.0, 9, scorchDark, 0.90, 0.0);
        mb.addCylinder(px, topY - 0.12, pz, pad.rad * 0.96, pad.rad * 0.92, 0.16, 9, arenaSlab, 0.86, 0.0);
        mb.addCylinder(px, waterY + 0.06, pz, pad.rad * 1.08, pad.rad * 1.04, 0.14, 9, toxicGreen, 0.55, 0.38);
      } else {
        mb.addCylinder(px, 5.0, pz, pad.rad * 1.06, pad.rad * 0.92, topY - 5.0, 10, deadWoodCol, 0.92, 0.0);
        mb.addCylinder(px, topY - 0.08, pz, pad.rad * 0.88, pad.rad * 0.86, 0.10, 10, deadWoodBark, 0.88, 0.0);
        for (let rIdx = 0; rIdx < 4; rIdx++) {
          const ra = (rIdx / 4) * Math.PI * 2 + pad.ang;
          mb.addTaperedBeam(
            px + Math.cos(ra) * (pad.rad * 0.65), topY - 0.45, pz + Math.sin(ra) * (pad.rad * 0.65),
            px + Math.cos(ra) * (pad.rad * 1.55), waterY - 0.85, pz + Math.sin(ra) * (pad.rad * 1.55),
            0.55, 0.24, 5, deadWoodCol, 0.92, 0.0
          );
        }
      }
      if (mb.colWorld) {
        mb.colWorld.addCylinder(px, 5.0, pz, pad.rad * 0.96, topY - 4.95, 'rock', true);
      }
    }

    // Helper: Twisted Gnarled Leaning Deadwood Tree (扭曲枯木)
    function addTwistedDeadwood(tx, tz, scale) {
      const ty = T.getMeshTerrainHeight(tx, tz) - 0.45;
      const leanA = Math.atan2(cz - tz, cx - tx) + (rand() - 0.5) * 0.8;
      const segs = 5;
      let px = tx, py = ty, pz = tz;
      let r = 0.62 * scale;
      for (let k = 0; k < segs; k++) {
        const segH = (1.55 + rand() * 0.65) * scale;
        const twist = leanA + Math.sin(k * 1.4 + tx) * 0.55;
        const nx = px + Math.cos(twist) * (0.55 + k * 0.25) * scale;
        const ny = py + segH;
        const nz = pz + Math.sin(twist) * (0.55 + k * 0.25) * scale;
        const rNext = r * 0.76;
        mb.addTaperedBeam(px, py, pz, nx, ny, nz, r, rNext, 6, k % 2 === 0 ? deadWoodCol : deadWoodBark, 0.92, 0.0);
        if (k >= 2) {
          for (let b = 0; b < 2; b++) {
            const ba = twist + (b === 0 ? 1.05 : -1.05) + (rand() - 0.5) * 0.45;
            const bLen = (1.8 + rand() * 1.8) * scale;
            const bx1 = nx + Math.cos(ba) * bLen * 0.62;
            const by1 = ny + bLen * (0.42 + rand() * 0.25);
            const bz1 = nz + Math.sin(ba) * bLen * 0.62;
            mb.addTaperedBeam(nx, ny, nz, bx1, by1, bz1, rNext * 0.72, rNext * 0.26, 5, deadWoodCol, 0.92, 0.0);
            const bx2 = bx1 + Math.cos(ba + 0.35) * bLen * 0.45;
            const by2 = by1 + bLen * 0.22;
            const bz2 = bz1 + Math.sin(ba + 0.35) * bLen * 0.45;
            mb.addTaperedBeam(bx1, by1, bz1, bx2, by2, bz2, rNext * 0.26, 0.06, 4, deadWoodBark, 0.92, 0.0);
          }
        }
        px = nx; py = ny; pz = nz;
        r = rNext;
      }
      if (mb.colWorld) {
        mb.colWorld.addCylinder(tx, ty, tz, 0.75 * scale, 6.5 * scale, 'tree', false);
      }
    }

    // Helper: Tilted Broken Stone Pillar (断石柱)
    function addBrokenStonePillar(px, pz, scale) {
      const py = T.getMeshTerrainHeight(px, pz) - 0.5;
      const h = (4.2 + rand() * 3.8) * scale;
      const tiltA = rand() * Math.PI * 2;
      const tiltDist = (0.55 + rand() * 1.15) * scale;
      const tx = px + Math.cos(tiltA) * tiltDist;
      const tz = pz + Math.sin(tiltA) * tiltDist;
      mb.addCylinder(px, py, pz, 1.35 * scale, 1.25 * scale, 0.65 * scale, 6, scorchDark, 0.90, 0.0);
      mb.addTaperedBeam(px, py + 0.4, pz, tx, py + h, tz, 0.92 * scale, 0.78 * scale, 6, pillarStone, 0.88, 0.0);
      const mx = (px + tx) * 0.5, mz = (pz + tz) * 0.5;
      mb.addCylinder(mx, py + h * 0.48, mz, 0.89 * scale, 0.89 * scale, 0.18 * scale, 6, toxicPurple, 0.45, 0.55);
      mb.addTaperedBeam(
        px + Math.cos(tiltA) * 2.1 * scale, py + 0.72, pz + Math.sin(tiltA) * 2.1 * scale,
        px + Math.cos(tiltA) * 3.8 * scale, py + 0.62, pz + Math.sin(tiltA) * 3.8 * scale,
        0.70 * scale, 0.64 * scale, 6, scorchBrown, 0.90, 0.0
      );
      if (mb.colWorld) {
        mb.colWorld.addCylinder(px, py, pz, 1.15 * scale, h * 0.88, 'rock', false);
      }
    }

    // Helper: Glowing Purple-Green Toxic Mushroom Cluster (泛着紫绿幽光的毒菇)
    function addToxicMushroomCluster(mx, mz, scale) {
      const my = T.getMeshTerrainHeight(mx, mz) - 0.08;
      const count = 3 + ((rand() * 3) | 0);
      for (let m = 0; m < count; m++) {
        const ma = (m / count) * Math.PI * 2 + rand() * 0.6;
        const md = m === 0 ? 0.0 : (0.45 + rand() * 0.75) * scale;
        const sx = mx + Math.cos(ma) * md;
        const sz = mz + Math.sin(ma) * md;
        const sc = (m === 0 ? 1.0 : (0.55 + rand() * 0.45)) * scale;
        const stemH = (0.72 + rand() * 0.65) * sc;
        const leanX = Math.cos(ma) * 0.16 * sc;
        const leanZ = Math.sin(ma) * 0.16 * sc;
        const topX = sx + leanX, topY = my + stemH, topZ = sz + leanZ;
        const isGreen = (m % 2 === 1);
        const capCol = isGreen ? mushroomCapG : mushroomCapP;
        const glowCol = isGreen ? toxicGreen : toxicPurple;

        mb.addTaperedBeam(sx, my, sz, topX, topY, topZ, 0.16 * sc, 0.11 * sc, 6, mushroomStem, 0.76, 0.0);
        mb.addCylinder(topX, topY - 0.06 * sc, topZ, 0.56 * sc, 0.24 * sc, 0.12 * sc, 8, glowCol, 0.30, 0.92);
        mb.addCylinder(topX, topY + 0.04 * sc, topZ, 0.62 * sc, 0.22 * sc, 0.26 * sc, 8, capCol, 0.55, 0.18);
        mb.addCylinder(topX, topY + 0.27 * sc, topZ, 0.24 * sc, 0.12 * sc, 0.08 * sc, 6, glowCol, 0.28, 1.15);
      }
    }

    // 4. Outer Scorched Shore & Deep Dark Badlands Approach (stretching from 沉烟迷泽 eastern edge all the way around the Venom Pool!)
    // Inner shore ring immediately framing the Venom Pool (r = 78..126m)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + (rand() - 0.5) * 0.22;
      if (Math.cos(a) < -0.84 && Math.abs(Math.sin(a)) < 0.34) continue;
      const d = 80.0 + rand() * 44.0;
      addTwistedDeadwood(cx + Math.cos(a) * d, cz + Math.sin(a) * d, 0.95 + rand() * 0.55);
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.31 + (rand() - 0.5) * 0.18;
      if (Math.cos(a) < -0.82 && Math.abs(Math.sin(a)) < 0.36) continue;
      const d = 82.0 + rand() * 40.0;
      addBrokenStonePillar(cx + Math.cos(a) * d, cz + Math.sin(a) * d, 0.90 + rand() * 0.48);
    }

    // Cracked dark stone approach flagstones leading East from 沉烟迷泽 border (x=4180) to the causeway (x=4870)!
    for (let s = 0; s < 32; s++) {
      const t = s / 31;
      const sx = 4180 + t * 690;
      const sz = cz + Math.sin(t * Math.PI * 2.0) * 32.0 + (rand() - 0.5) * 5.0;
      const sy = T.getMeshTerrainHeight(sx, sz);
      mb.addBox(sx, sy + 0.05, sz, 3.0 + rand() * 2.2, 0.12, 2.6 + rand() * 2.0, rand() * Math.PI, s % 2 === 0 ? arenaSlate : scorchBrown, 0.88, 0.0);
    }

    // Deep Badlands Twisted Deadwood Trees (扭曲枯木), Broken Pillars (断石柱), Glowing Toxic Mushrooms (紫绿毒菇) & Charred Rocks (焦岩)
    let vmDead = 0, vmTries = 0;
    while (vmDead < 36 && vmTries < 450) {
      vmTries++;
      const tx = 4140 + rand() * 1360;
      const tz = 1600 + rand() * 1160;
      if (T.getVenomMireMask(tx, tz) < 0.24) continue;
      if (Math.hypot(tx - cx, tz - cz) < 118.0) continue;
      if (tx < cx && Math.abs(tz - cz) < 24.0) continue;
      addTwistedDeadwood(tx, tz, 0.88 + rand() * 0.62);
      vmDead++;
    }
    let vmPil = 0; vmTries = 0;
    while (vmPil < 14 && vmTries < 260) {
      vmTries++;
      const px = 4180 + rand() * 1260;
      const pz = 1660 + rand() * 1040;
      if (T.getVenomMireMask(px, pz) < 0.26) continue;
      if (Math.hypot(px - cx, pz - cz) < 120.0) continue;
      if (px < cx && Math.abs(pz - cz) < 22.0) continue;
      addBrokenStonePillar(px, pz, 0.85 + rand() * 0.52);
      vmPil++;
    }
    let vmMush = 0; vmTries = 0;
    while (vmMush < 78 && vmTries < 680) {
      vmTries++;
      const mx = 4120 + rand() * 1380;
      const mz = 1580 + rand() * 1180;
      if (T.getVenomMireMask(mx, mz) < 0.22) continue;
      const dC = Math.hypot(mx - cx, mz - cz);
      if (dC < 77.0) continue;
      if (mx < cx && dC < 100.0 && Math.abs(mz - cz) < 16.0) continue;
      addToxicMushroomCluster(mx, mz, 0.85 + rand() * 0.72);
      vmMush++;
    }
    let vmRock = 0; vmTries = 0;
    while (vmRock < 64 && vmTries < 560) {
      vmTries++;
      const rx = 4140 + rand() * 1380;
      const rz = 1580 + rand() * 1180;
      if (T.getVenomMireMask(rx, rz) < 0.22) continue;
      const dC = Math.hypot(rx - cx, rz - cz);
      if (dC < 78.0) continue;
      if (rx < cx && Math.abs(rz - cz) < 22.0) continue;
      const ry = T.getMeshTerrainHeight(rx, rz);
      const sx = 2.0 + rand() * 3.8;
      const sy = 1.2 + rand() * 2.6;
      const sz = 1.8 + rand() * 3.2;
      mb.addBox(rx, ry + sy * 0.35, rz, sx, sy, sz, rand() * Math.PI, vmRock % 2 === 0 ? scorchDark : scorchBrown, 0.92, 0.0);
      if (mb.colWorld && sy > 1.3) {
        mb.colWorld.addCylinder(rx, ry - 0.4, rz, Math.max(sx, sz) * 0.45, sy * 0.85, 'rock', false);
      }
      vmRock++;
    }

    mb.setCollision(true, 'building');
  }

  // =========================================================================
  // NEW EXPANDED REGION LANDMARK: 幽林秘岭 · 废弃洞府 (1220, 178.0, 6640)
  // Deep Natural Rock Immortal Cave-Mansion carved into the mountainside — Protagonist's Spawn Point!
  // Uses natural rock shader (matType 0.75 / 0.84, ZERO brick lines) with spacious empty center hall!
  // =========================================================================
  function buildHiddenMountainCaveMansion(mb) {
    const hm = T.HIDDEN_MOUNTAINS;
    if (!hm) return;
    const cx = hm.caveX, cz = hm.caveZ, baseY = hm.caveY;
    const rand = N.createRNG(20261122);

    const MAT_ROCK  = 0.75; // Rough stratified natural mountain cavern rock (NO bricks!)
    const MAT_SLATE = 0.84; // Smooth-hewn natural cavern floor slate (NO bricks!)

    const rockDark   = [0.18, 0.21, 0.24];
    const rockMid    = [0.25, 0.28, 0.30];
    const rockWarm   = [0.31, 0.32, 0.31];
    const rockLight  = [0.37, 0.39, 0.38];
    const floorDark  = [0.23, 0.26, 0.28];
    const floorMid   = [0.29, 0.32, 0.33];
    const mossRock   = [0.19, 0.31, 0.21];
    const vineDark   = [0.13, 0.29, 0.15];
    const vineLight  = [0.21, 0.42, 0.21];
    const jadeGlow   = [0.30, 0.90, 0.84];
    const amberGlow  = [0.98, 0.74, 0.34];

    mb.setCollision(false);

    // 1. Solid Grounded Natural Bedrock Terrace & Deep Cave Floor (flush at baseY = 178.0m, walkable!)
    //    Spans forecourt (z = cz - 23) all the way to deep inner cavern wall (z = cz + 28) -> ~51m total!
    mb.addBox(cx, baseY - 7.04, cz + 2.5, 30.0, 14.0, 52.0, 0, rockDark, 0.90, 0.0, MAT_ROCK);
    mb.addBox(cx, baseY - 0.12, cz + 2.5, 26.8, 0.24, 49.5, 0, floorDark, 0.78, 0.0, MAT_SLATE);
    if (mb.colWorld) {
      mb.colWorld.addBox(cx, baseY - 7.0, cz + 2.5, 27.6, 14.0, 50.0, 0, 'building', true);
    }

    // Broad organic natural hewn rock floor pads (subtle elevation < 0.03m, completely open & flat in the center!)
    for (let iz = -19; iz <= 23; iz += 4.6) {
      for (let ix = -8.4; ix <= 8.4; ix += 4.6) {
        if (iz > -4.0 && Math.abs(ix) > 8.6) continue;
        if (rand() < 0.25) continue;
        const fx = cx + ix + (rand() - 0.5) * 0.9;
        const fz = cz + iz + (rand() - 0.5) * 0.9;
        const r = 1.65 + rand() * 0.95;
        const col = (iz < -6 && rand() < 0.32) ? mossRock : (rand() < 0.55 ? floorMid : floorDark);
        mb.addCylinder(fx, baseY + 0.005, fz, r, r * 0.94, 0.032, 7, col, 0.80, 0.0, MAT_SLATE);
      }
    }

    // Natural Hewn Mountain Rock Steps descending smoothly North onto the winding trail (z = cz - 22.5 .. cz - 30.5)
    for (let s = 0; s < 8; s++) {
      const sy = baseY - 0.16 - s * 0.18;
      const sz = cz - 22.4 - s * 1.02;
      const sw = 9.4 + s * 0.42;
      mb.addBox(cx, sy - 0.9, sz, sw, 1.8, 1.15, (rand() - 0.5) * 0.02, s % 2 === 0 ? floorMid : rockMid, 0.86, 0.0, MAT_SLATE);
      if (mb.colWorld) {
        mb.colWorld.addBox(cx, sy - 0.9, sz, sw, 1.8, 1.15, 0, 'building', true);
      }
    }

    // 2. Deep Sculpted Natural Cavern Rock Shell (Left, Right, Deep Rear Wall & Organic Vaulted Rock Dome!)
    //    Interior clear hall: X in [cx - 9.8, cx + 9.8] (19.6m wide!), Z in [cz - 5.5, cz + 25.5] (31m deep!),
    //    vaulted rock ceiling peaking at baseY + 10.6m — center is 100% open & unobstructed!
    for (const side of [-1, 1]) {
      // Main deep outer cliff flank rock mass
      const wx = cx + side * 14.8;
      mb.addBox(wx, baseY + 6.0, cz + 10.2, 9.8, 16.5, 34.5, 0, rockDark, 0.92, 0.0, MAT_ROCK);

      // Layered irregular inner & outer natural cavern rock ribs curving organically along both cavern walls
      for (let k = 0; k < 9; k++) {
        const kz = cz - 4.2 + k * 3.55 + (rand() - 0.5) * 0.55;
        const ribH = 8.4 + rand() * 3.2;
        const ribW = 2.4 + rand() * 1.3;
        const ribD = 3.6 + rand() * 1.4;
        // Organic angled cavern rock wall face (never protruding past |x - cx| = 9.3!)
        mb.addBoxEuler(
          cx + side * (10.35 + (k % 2) * 0.45),
          baseY + ribH * 0.46,
          kz,
          ribW, ribH, ribD,
          (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.18, -side * (0.06 + (k % 3) * 0.03),
          k % 2 === 0 ? rockMid : rockDark, 0.92, 0.0, MAT_ROCK
        );
        // Sculpted overhanging outer mountainside cliff buttress blending seamlessly into terrain
        mb.addBoxEuler(
          cx + side * (15.5 + rand() * 4.5),
          baseY + 6.5 + rand() * 5.0,
          kz,
          6.8 + rand() * 4.2, 14.0 + rand() * 8.5, 5.5 + rand() * 3.2,
          (rand() - 0.5) * 0.14, (rand() - 0.5) * 0.35, side * (0.08 + rand() * 0.12),
          k % 3 === 0 ? rockWarm : rockDark, 0.92, 0.0, MAT_ROCK
        );
      }

      // Natural rocky cave portal cheek boulders framing the 9.2m-wide open cavern mouth (X in [cx - 4.6, cx + 4.6] 100% open!)
      mb.addBoxEuler(cx + side * 7.8, baseY + 4.4, cz - 5.2, 6.2, 9.8, 3.8, 0.04, side * 0.14, -side * 0.08, rockMid, 0.92, 0.0, MAT_ROCK);
      mb.addBoxEuler(cx + side * 6.4, baseY + 2.4, cz - 6.4, 3.6, 5.4, 2.8, -0.06, side * 0.28, -side * 0.12, rockDark, 0.92, 0.0, MAT_ROCK);

      // Solid cavern side & portal wall colliders (walkableTop = false)
      if (mb.colWorld) {
        mb.colWorld.addBox(cx + side * 14.5, baseY + 5.5, cz + 10.2, 9.6, 14.0, 34.0, 0, 'rock', false);
        mb.colWorld.addBox(cx + side * 7.8, baseY + 4.4, cz - 5.2, 6.0, 9.6, 3.6, 0, 'rock', false);
      }
    }

    // Deep Rear Natural Cavern Cliff Wall & Mountain Backing (Z = cz + 25.8 .. cz + 38)
    mb.addBox(cx, baseY + 8.5, cz + 31.2, 34.0, 24.0, 10.6, 0, rockDark, 0.92, 0.0, MAT_ROCK);
    // Faceted organic rock outcrops along the deep rear wall
    for (let r = -2; r <= 2; r++) {
      const rx = cx + r * 4.2 + (rand() - 0.5) * 0.6;
      mb.addBoxEuler(rx, baseY + 5.6 + (2 - Math.abs(r)) * 0.9, cz + 26.2 + Math.abs(r) * 0.35, 4.8, 12.2, 2.8, 0.08, (rand() - 0.5) * 0.22, (rand() - 0.5) * 0.08, r % 2 === 0 ? rockMid : rockDark, 0.92, 0.0, MAT_ROCK);
    }
    if (mb.colWorld) {
      mb.colWorld.addBox(cx, baseY + 8.0, cz + 30.8, 32.0, 20.0, 10.2, 0, 'rock', false);
    }

    // Organic Vaulted Natural Rock Cavern Roof & Layered Mountain Brow (all interior ribs >= baseY + 8.2m!)
    mb.addBox(cx, baseY + 11.4, cz + 10.5, 25.0, 3.2, 34.0, 0, rockDark, 0.92, 0.0, MAT_ROCK);
    for (const side of [-1, 1]) {
      // Lower & upper curved cavern arch ribs forming a natural rounded rock vault overhead!
      mb.addBoxEuler(cx + side * 8.2, baseY + 8.5, cz + 10.2, 5.2, 2.2, 32.5, 0, 0, -side * 0.52, rockMid, 0.92, 0.0, MAT_ROCK);
      mb.addBoxEuler(cx + side * 4.4, baseY + 10.2, cz + 10.2, 5.8, 2.0, 32.5, 0, 0, -side * 0.24, rockDark, 0.92, 0.0, MAT_ROCK);
    }
    // Natural hanging rock stalactites tucked high in the vaulted cavern roof (>= baseY + 8.1m, purely atmospheric!)
    for (let st = 0; st < 16; st++) {
      const sx = cx + (rand() - 0.5) * 14.5;
      const sz = cz - 2.0 + rand() * 24.0;
      const sLen = 0.85 + rand() * 1.45;
      const sRad = 0.28 + rand() * 0.34;
      const topY = baseY + 10.2 - Math.abs(sx - cx) * 0.14;
      mb.addCylinder(sx, topY - sLen, sz, sRad * 0.14, sRad, sLen, 6, st % 2 === 0 ? rockMid : rockDark, 0.90, 0.0, MAT_ROCK);
    }

    // Natural Organic Rock Arch Overhang & Moss-Crowned Cliff Crags blending the cave roof into the mountainside
    const cragSpecs = [
      [  0.0,  9.2, -5.6, 12.6,  2.8,  4.4,  0.08,  0.03,  0.02, rockMid ],
      [ -4.8,  8.6, -5.8,  5.6,  2.6,  4.2,  0.05,  0.18,  0.34, rockDark],
      [  4.8,  8.6, -5.8,  5.6,  2.6,  4.2,  0.06, -0.18, -0.34, rockDark],
      [ -8.2, 12.6, -2.2, 10.5,  6.8,  9.0,  0.06,  0.22,  0.12, rockDark],
      [  8.4, 12.8, -2.0, 10.8,  7.0,  9.2,  0.06, -0.22, -0.12, rockDark],
      [  0.0, 14.8,  4.5, 22.5,  8.4, 15.0,  0.10,  0.04,  0.02, rockMid ],
      [ -9.6, 16.5, 11.0, 13.5, 10.2, 16.5,  0.08,  0.24,  0.10, rockDark],
      [  9.8, 16.8, 11.5, 13.8, 10.6, 16.8,  0.08, -0.20, -0.09, rockDark],
      [  0.0, 19.6, 18.5, 28.0, 14.5, 18.5,  0.12, -0.03,  0.03, rockDark],
      [ -5.2, 11.4, -4.8,  7.6,  1.4,  4.6,  0.05,  0.16,  0.09, mossRock],
      [  5.4, 11.6, -4.6,  7.8,  1.4,  4.8,  0.05, -0.18, -0.08, mossRock],
      [  0.0, 18.8,  5.8, 18.5,  1.8, 11.5,  0.08,  0.04,  0.02, mossRock],
    ];
    for (const [ox, oy, oz, sx, sy, sz, rx, ry, rz, col] of cragSpecs) {
      mb.addBoxEuler(cx + ox, baseY + oy, cz + oz, sx, sy, sz, rx, ry, rz, col, 0.92, 0.0, MAT_ROCK);
    }

    // 3. Natural Draping Cliff Vines & Mossy Stone Portal Framing (自然洞口藤蔓与苔石)
    for (let v = 0; v < 18; v++) {
      const vx = cx - 5.4 + (v / 17) * 10.8 + (rand() - 0.5) * 0.45;
      const edgeWeight = M.smoothstep(1.2, 4.8, Math.abs(vx - cx));
      const vLen = (0.85 + rand() * 1.35) + edgeWeight * (2.0 + rand() * 2.4);
      const vyTop = baseY + 7.95 + rand() * 1.6;
      const vzTop = cz - 6.8 + (rand() - 0.5) * 0.8;
      mb.addTaperedBeam(
        vx, vyTop, vzTop,
        vx + (rand() - 0.5) * 0.45, vyTop - vLen, vzTop - 0.15 + (rand() - 0.5) * 0.35,
        0.10 + rand() * 0.06, 0.03, 5, v % 2 === 0 ? vineDark : vineLight, 0.86, 0.0, MAT_ROCK
      );
    }

    // 4. Optimized Spacious Interior Details (中间完全留空，装饰仅贴边沿石壁!)
    //    4A. Warm Amber & Spirit-Jade Mineral Wall Sconces embedded along left/right rock walls (illuminates deep hall!)
    for (let s = 0; s < 4; s++) {
      const sz = cz + 0.5 + s * 6.8;
      for (const side of [-1, 1]) {
        const sx = cx + side * 9.05;
        // Natural protruding rock bracket
        mb.addBoxEuler(sx, baseY + 2.85, sz, 0.95, 0.42, 0.95, 0.08, side * 0.2, 0, rockLight, 0.88, 0.0, MAT_ROCK);
        // Embedded glowing cave spirit crystal sconce (alternating soft warm amber & serene cyan-jade)
        const col = (s % 2 === 0) ? amberGlow : jadeGlow;
        mb.addCrystalSpire(sx - side * 0.15, baseY + 3.02, sz, 0.20, 0.72, 0.06, s + side, -side * 0.15, col, 1.35);
      }
    }

    //    4B. Subtle Natural Hewn Stone Meditation Ledge tucked flush against the far deep rear cavern wall (z = cz + 24.3)
    const rearLedgeZ = cz + 24.3;
    mb.addCylinder(cx, baseY + 0.02, rearLedgeZ, 2.85, 2.65, 0.38, 10, rockMid, 0.84, 0.0, MAT_SLATE);
    mb.addCylinder(cx, baseY + 0.39, rearLedgeZ, 2.52, 2.48, 0.04, 16, jadeGlow, 0.25, 0.42, 2.0);
    // Ancient glowing Daoist spirit-vein glyph carved directly into the rear cliff rock face
    mb.addCrystalSpire(cx, baseY + 2.6, cz + 25.1, 0.32, 2.6, 0.05, 0, 0, jadeGlow, 0.92);
    mb.addCrystalSpire(cx - 1.45, baseY + 2.1, cz + 25.2, 0.22, 1.75, 0.08, 0.3, 0.22, jadeGlow, 0.78);
    mb.addCrystalSpire(cx + 1.45, baseY + 2.1, cz + 25.2, 0.22, 1.75, 0.08, -0.3, -0.22, jadeGlow, 0.78);
    if (mb.colWorld) {
      mb.colWorld.addCylinder(cx, baseY, rearLedgeZ, 2.75, 0.40, 'rock', true);
    }

    //    4C. Flanking Natural Cave-Mouth Rock Boulders & Mossy Guide Lanterns (outside portal, path 100% clear)
    for (const side of [-1, 1]) {
      mb.addBoxEuler(cx + side * 6.4, baseY + 0.65, cz - 9.2, 2.4, 1.5, 2.2, 0.08, side * 0.45, -side * 0.12, mossRock, 0.90, 0.0, MAT_ROCK);
      mb.addCrystalSpire(cx + side * 5.8, baseY + 0.95, cz - 8.6, 0.26, 1.35, 0.10, side * 0.5, -side * 0.15, amberGlow, 1.15);
      if (mb.colWorld) {
        mb.colWorld.addCylinder(cx + side * 6.4, baseY, cz - 9.2, 1.35, 1.8, 'rock', false);
      }
    }

    // 5. Natural Forecourt Cliff Rim Boulders framing the overlook without boxy brick walls
    const rimRocks = [
      [cx - 11.2, cz - 12.5, 2.6, 1.4, 5.2, 0.15, mossRock],
      [cx - 10.6, cz - 18.2, 3.2, 1.8, 3.8, -0.22, rockMid],
      [cx + 11.2, cz - 12.5, 2.6, 1.5, 5.0, -0.18, mossRock],
      [cx + 10.6, cz - 18.2, 3.2, 1.7, 3.8, 0.24, rockMid],
      [cx - 7.6,  cz - 21.4, 3.4, 1.3, 2.2, 0.10, rockDark],
      [cx + 7.6,  cz - 21.4, 3.4, 1.3, 2.2, -0.12, rockDark],
    ];
    for (const [rx, rz, sx, sy, sz, rot, col] of rimRocks) {
      mb.addBoxEuler(rx, baseY + sy * 0.42, rz, sx, sy, sz, (rand() - 0.5) * 0.12, rot, (rand() - 0.5) * 0.10, col, 0.90, 0.0, MAT_ROCK);
      if (mb.colWorld) {
        mb.colWorld.addCylinder(rx, baseY, rz, Math.max(sx, sz) * 0.36, sy * 0.9, 'rock', false);
      }
    }

    // 6. Mossy Natural Mountain-Trail Stepping Stones & Trail Lanterns along the Winding Forest Path
    const buildTrailStones = (pts, countPerSeg) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const steps = Math.max(4, Math.min(countPerSeg, Math.floor(segLen / 18)));
        for (let k = 1; k < steps; k++) {
          const t = k / steps;
          const sx = M.lerp(a[0], b[0], t) + (rand() - 0.5) * 2.8;
          const sz = M.lerp(a[1], b[1], t) + (rand() - 0.5) * 2.8;
          const sy = T.getMeshTerrainHeight(sx, sz);
          mb.addBox(sx, sy + 0.05, sz, 2.4 + rand() * 1.6, 0.14, 1.8 + rand() * 1.4, rand() * Math.PI, k % 2 === 0 ? floorMid : mossRock, 0.88, 0.0, MAT_SLATE);
        }
        if (i >= 1 && i <= pts.length - 2) {
          const ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
          const side = (i % 2 === 0 ? 1 : -1) * 7.2;
          const lx = a[0] + Math.cos(ang) * side;
          const lz = a[1] - Math.sin(ang) * side;
          const ly = T.getMeshTerrainHeight(lx, lz) - 0.35;
          mb.addBox(lx, ly + 0.45, lz, 1.1, 0.9, 1.1, 0.2, rockDark, 0.88, 0.0, MAT_ROCK);
          mb.addCylinder(lx, ly + 0.9, lz, 0.28, 0.22, 1.55, 6, rockLight, 0.86, 0.0, MAT_ROCK);
          mb.addCylinder(lx, ly + 2.45, lz, 0.22, 0.18, 0.36, 6, i % 2 === 0 ? jadeGlow : amberGlow, 0.25, 0.92, 2.0);
          mb.addCylinder(lx, ly + 2.82, lz, 0.68, 0.12, 0.42, 4, mossRock, 0.88, 0.0, MAT_ROCK);
          if (mb.colWorld) {
            mb.colWorld.addCylinder(lx, ly, lz, 0.60, 3.1, 'rock', false);
          }
        }
      }
    };
    buildTrailStones(hm.trailPoints, 12);
    buildTrailStones(hm.eastTrailPoints, 8);

    mb.setCollision(true, 'building');
  }

  // Animated Water Mesh covering the Meandering Plains River, Spirit Spring, 沉烟迷泽 & 蚀骨毒潭!
  function buildWaterMesh() {
    const verts = [];
    const indices = [];
    let vCount = 0;

    function addGridWater(cx, cz, sizeX, sizeZ, segX, segZ, waterY, bioCenter, bioRad, baseBio) {
      const startV = vCount;
      for (let iz = 0; iz <= segZ; iz++) {
        const vz = iz / segZ;
        const z = cz + (vz - 0.5) * sizeZ;
        for (let ix = 0; ix <= segX; ix++) {
          const vx = ix / segX;
          const x = cx + (vx - 0.5) * sizeX;
          const terrH = T.getTerrainHeight(x, z);
          const depth = Math.max(0, waterY - terrH);
          const bio = bioCenter
            ? Math.max(baseBio, 1 - M.smoothstep(bioRad * 0.15, bioRad, Math.hypot(x - bioCenter[0], z - bioCenter[1])))
            : baseBio;
          verts.push(x, waterY, z, vx * (sizeX * 0.06), vz * (sizeZ * 0.06), depth, bio);
          vCount++;
        }
      }
      const stride = segX + 1;
      for (let iz = 0; iz < segZ; iz++) {
        for (let ix = 0; ix < segX; ix++) {
          const a = startV + iz * stride + ix;
          const b = a + 1;
          const c = a + stride;
          const d = c + 1;
          if (verts[a * 7 + 5] > 0.01 || verts[b * 7 + 5] > 0.01 || verts[c * 7 + 5] > 0.01 || verts[d * 7 + 5] > 0.01) {
            indices.push(a, c, b, b, c, d);
          }
        }
      }
    }

    // Vast Chenyan Misty Wetland Interlaced Shallow Pools (沉烟迷泽, expanded SE marshland ~3300m x 2400m!)
    // Optimized mesh subdivision: wave normals, caustics & shoreline foam are evaluated per-pixel in WATER_FS.
    addGridWater(1680, 2480, 3920, 2720, 136, 104, T.SWAMP_WATER_Y, null, 0, -0.88);

    // Glowing Deep-Purple / Dark-Emerald Toxic Pool of 蚀骨毒潭 (4960, 2160, baseBio = -2.2 -> venomMode = 1.0!)
    addGridWater(T.VENOM_MIRE.cx, T.VENOM_MIRE.cz, 208, 208, 40, 40, T.VENOM_WATER_Y, null, 0, -2.2);

    // World-Boundary Deep Sea (无尽深海, y = OCEAN_WATER_Y = 0.0, baseBio = 2.2 -> oceanMode = 1.0!)
    // 1) Inner continental coastline & deep-sea grid across ±HALF_WORLD (only emits quads where terrain dips below sea level!)
    const oceanY = T.OCEAN_WATER_Y !== undefined ? T.OCEAN_WATER_Y : 0.0;
    addGridWater(0, 0, T.WORLD_SIZE, T.WORLD_SIZE, 144, 144, oceanY, null, 0, 2.2);

    // 2) Endless Outer Deep-Sea Horizon Skirt (from ±HALF_WORLD out to ±30000m in all 4 directions!)
    function addOuterSeaStrip(x0, x1, z0, z1, segX, segZ) {
      const startV = vCount;
      for (let iz = 0; iz <= segZ; iz++) {
        const vz = iz / segZ;
        const z = M.lerp(z0, z1, vz);
        for (let ix = 0; ix <= segX; ix++) {
          const vx = ix / segX;
          const x = M.lerp(x0, x1, vx);
          verts.push(x, oceanY, z, x * 0.06, z * 0.06, 48.0, 2.2);
          vCount++;
        }
      }
      const stride = segX + 1;
      for (let iz = 0; iz < segZ; iz++) {
        for (let ix = 0; ix < segX; ix++) {
          const a = startV + iz * stride + ix;
          const b = a + 1;
          const c = a + stride;
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
    }
    const HW = T.HALF_WORLD;
    const FAR = 30000;
    addOuterSeaStrip(-FAR, FAR, -FAR, -HW, 20, 8); // Far North Deep Sea
    addOuterSeaStrip(-FAR, FAR,  HW,  FAR, 20, 8); // Far South Deep Sea
    addOuterSeaStrip(-FAR, -HW, -HW,  HW,  8, 16); // Far West Deep Sea
    addOuterSeaStrip( HW,  FAR, -HW,  HW,  8, 16); // Far East Deep Sea

    return {
      vertices: new Float32Array(verts),
      indices: new Uint32Array(indices),
    };
  }

  // Legacy waterfalls belonged to old Spirit Spring & Floating Islands (removed in 青石城 reconstruction)
  function buildWaterfallsMesh() {
    return {
      vertices: new Float32Array(0),
      indices: new Uint32Array(0),
    };
  }

  // Glowing Spirit Formations at key Xianxia Sanctums
  const SPIRIT_FORMATIONS = [
    // 青石仙城 · 聚灵传送大阵台 central glowing pale-cyan & gold spirit formation (0, 23.58, 0)
    { x: 0,    y: 23.58, z: 0, radius: 7.8, colorA: [0.28, 0.96, 0.94], colorB: [1.0, 0.86, 0.44], speed: 0.24, hasBeam: true, beamHeight: 24 },
    // Soft translucent canopy skylight shafts inside 通天灵木林 (beamOnly = no ground magic circle, ultra-lightweight!)
    { x: -3955, y: 58.0, z:  -12, radius: 13.5, colorA: [0.46, 0.78, 0.64], colorB: [0.85, 0.84, 0.52], speed: 0.06, hasBeam: true,  beamHeight: 58, beamOnly: true },
    { x: -4110, y: 56.5, z: -260, radius: 18.0, colorA: [0.54, 0.84, 0.68], colorB: [0.90, 0.86, 0.54], speed: 0.05, hasBeam: true,  beamHeight: 74, beamOnly: true },
    { x: -4048, y: 57.0, z: -518, radius: 15.0, colorA: [0.78, 0.82, 0.52], colorB: [0.50, 0.82, 0.68], speed: 0.06, hasBeam: true,  beamHeight: 66, beamOnly: true },
    { x: -4212, y: 57.5, z: -762, radius: 16.0, colorA: [0.48, 0.82, 0.66], colorB: [0.88, 0.84, 0.52], speed: 0.05, hasBeam: true,  beamHeight: 68, beamOnly: true },
    { x: -3880, y: 57.0, z: -1315, radius: 18.0, colorA: [0.48, 0.84, 0.68], colorB: [0.88, 0.84, 0.54], speed: 0.05, hasBeam: true, beamHeight: 72, beamOnly: true },
    // Colossal 450m Blue-Aura World Tree Sky-Piercing Ethereal Sapphire Aura Curtain (-3520, -1720)!
    { x: -3520, y: 56.0, z: -1720, radius: 42.0, colorA: [0.22, 0.74, 1.00], colorB: [0.40, 0.90, 1.00], speed: 0.04, hasBeam: true, beamHeight: 410, beamOnly: true },
    { x: -2840, y: 57.0, z: -1585, radius: 18.0, colorA: [0.76, 0.82, 0.54], colorB: [0.48, 0.82, 0.68], speed: 0.06, hasBeam: true, beamHeight: 72, beamOnly: true },
    { x: -3470, y: 57.5, z: -2980, radius: 20.0, colorA: [0.50, 0.84, 0.68], colorB: [0.88, 0.84, 0.54], speed: 0.05, hasBeam: true, beamHeight: 78, beamOnly: true },
    // Pure Rising Ethereal Spirit Qi Curtain wrapping 云雾山 760m Summit Giant Glowing Spirit Stone (beamOnly = NO artificial floor circle!)
    { x: 2660,  y: 756.0, z: 4120, radius: 28.0, colorA: [0.24, 0.96, 0.98], colorB: [0.46, 0.92, 1.00], speed: 0.18, hasBeam: true, beamHeight: 68, beamOnly: true },
    // Subtle Pale-Ice Ancient Frost Array Ring half-buried in 霜雪原 (-4180, -6080)!
    { x: -4180, y: 84.1, z: -6080, radius: 15.5, colorA: [0.44, 0.88, 1.00], colorB: [0.80, 0.95, 1.00], speed: -0.10, hasBeam: false, beamHeight: 0 },
  ];

  function buildAllLandmarks(collisionWorld = null) {
    const mb = new MeshBuilder(collisionWorld);
    // Central Heartland reconstructed into 青石城 (replaces old 凌霄仙殿/断剑/灵泉/云梦大泽/浮岛)
    if (XW.QingshiCity) {
      XW.QingshiCity.buildQingshiCity(mb);
    }
    buildChenyanSwampLandmarks(mb);
    buildCanzhenAncientRoad(mb);
    buildSpiritForestDetails(mb);
    buildCloudMountainDetails(mb);
    buildDesertRuins(mb);
    buildFrostSnowfieldDetails(mb);
    buildBambooValleyLandmarks(mb);
    buildVenomMireLandmarks(mb);
    buildHiddenMountainCaveMansion(mb);

    return {
      staticMesh: mb.build(),
      waterMesh: buildWaterMesh(),
      waterfallMesh: buildWaterfallsMesh(),
      formations: SPIRIT_FORMATIONS,
      bambooCrowns: bambooCrownList,
    };
  }

  XW.Landmarks = {
    buildAllLandmarks,
    SPIRIT_FORMATIONS,
    getBambooCrowns: () => bambooCrownList,
  };
})(window);
