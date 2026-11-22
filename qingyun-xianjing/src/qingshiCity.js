(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;
  const MeshBuilder = XW.MeshBuilder;

  // =========================================================================
  // 1. DIVERSE XIANXIA ARCHITECTURAL PALETTES (杜绝清一色复制粘贴!)
  // =========================================================================
  const PAL = {
    // Stone & Masonry
    blueStone:      [0.46, 0.52, 0.57], // 灰青色城墙巨石
    blueStoneDark:  [0.32, 0.37, 0.42], // 深青灰石基/垛口缝
    blueStoneLite:  [0.65, 0.70, 0.73], // 浅青灰压顶/台阶
    whiteJade:      [0.89, 0.91, 0.89], // 汉白玉/白玉台基
    whiteJadeWarm:  [0.84, 0.83, 0.78], // 暖玉石
    basaltDark:     [0.24, 0.26, 0.30], // 玄黑玄武岩 (天工坊)
    sandstone:      [0.78, 0.69, 0.54], // 暖黄砂岩 (万兽斋/民居)
    ochreWall:      [0.77, 0.62, 0.44], // 赭石暖墙
    creamWall:      [0.91, 0.89, 0.82], // 米白粉墙
    paleSlateWall:  [0.78, 0.81, 0.83], // 淡青灰石墙
    // Glazed & Slate Roofs
    tileCharcoal:   [0.24, 0.27, 0.32], // 深灰青瓦
    tileSlateMid:   [0.35, 0.40, 0.46], // 灰瓦门楼
    tileIndigo:     [0.14, 0.24, 0.50], // 靛蓝琉璃飞檐 (藏经阁)
    tileJade:       [0.14, 0.46, 0.44], // 琉璃碧瓦 (百草阁/仙居)
    tileBronze:     [0.34, 0.31, 0.25], // 青铜灰瓦 (执事大殿)
    tileCrimson:    [0.62, 0.17, 0.16], // 赤红琉璃瓦 (天工坊/醉仙楼)
    tileGoldJade:   [0.18, 0.48, 0.54], // 金碧琉璃 (聚宝轩)
    tileBrown:      [0.38, 0.25, 0.17], // 棕褐陶瓦 (民居)
    // Timbers & Lacquers
    woodDark:       [0.26, 0.15, 0.10], // 深棕重木
    woodMid:        [0.44, 0.27, 0.15], // 暖杉木
    woodRaw:        [0.54, 0.38, 0.22], // 粗原木
    vermilion:      [0.74, 0.19, 0.15], // 朱红漆柱
    cinnabar:       [0.68, 0.22, 0.18], // 丹朱楼阁漆
    // Awnings & Props
    clothGreen:     [0.15, 0.56, 0.34],
    clothGreenLit:  [0.24, 0.70, 0.44],
    clothRed:       [0.76, 0.18, 0.16],
    clothRedDark:   [0.54, 0.13, 0.12],
    hideOchre:      [0.74, 0.55, 0.27],
    hideDark:       [0.54, 0.38, 0.19],
    carpetRed:      [0.64, 0.14, 0.14],
    carpetTeal:     [0.16, 0.42, 0.44],
    terracotta:     [0.70, 0.36, 0.22],
    basketTan:      [0.68, 0.52, 0.29],
    ironBlack:      [0.16, 0.18, 0.22],
    bronze:         [0.50, 0.40, 0.22],
    boneIvory:      [0.92, 0.88, 0.77],
    gold:           [0.92, 0.76, 0.36],
    parchment:      [0.95, 0.90, 0.76],
    // Luminous Xianxia Accents
    lanternWarm:    [1.00, 0.84, 0.38],
    windowWarm:     [1.00, 0.82, 0.46],
    arrayCyan:      [0.30, 0.96, 0.94],
    spiritJade:     [0.34, 0.98, 0.68],
    spiritAzure:    [0.34, 0.80, 1.00],
    spiritCrimson:  [1.00, 0.38, 0.22],
    spiritAmber:    [1.00, 0.78, 0.28],
    lotusPink:      [0.98, 0.70, 0.82],
    lotusLeaf:      [0.18, 0.50, 0.28],
    poolWater:      [0.18, 0.66, 0.72],
  };

  // Shared registries populated during buildQingshiCity(mb) and consumed by CitySystem!
  const REGISTERED_DOORS = [];
  const FLOATING_PROPS = [];

  const CITY_LABELS = [
    { name: '青石仙城 · 南天正门', x:    0.0, z:  125.0, yOff: 19.8, col: '#ffeaa8' },
    { name: '青石仙城 · 北门',     x:    0.0, z: -115.0, yOff: 17.2, col: '#ffeaa8' },
    { name: '青石仙城 · 西门',     x: -130.0, z:    0.0, yOff: 17.2, col: '#ffeaa8' },
    { name: '青石仙城 · 东门',     x:  130.0, z:    0.0, yOff: 17.2, col: '#ffeaa8' },
    { name: '聚灵传送大阵台',       x:    0.0, z:    0.0, yOff:  8.5, col: '#9afcf8' },
    { name: '聚宝轩 · 灵宝阁',     x:    0.0, z:  -82.0, yOff: 19.5, col: '#ffeb99' },
    { name: '藏经阁 · 五行功法',   x:  -52.0, z:  -64.0, yOff: 21.5, col: '#b8dcff' },
    { name: '执事大殿 · 悬赏破境', x:   52.0, z:  -64.0, yOff: 16.5, col: '#ffe4ad' },
    { name: '百草阁 · 丹药仙馆',   x:  -54.0, z:   24.0, yOff: 10.6, col: '#9effc8' },
    { name: '天工坊 · 炼器神殿',   x:   54.0, z:   24.0, yOff: 10.6, col: '#ffb99c' },
    { name: '万兽斋 · 灵兽宝阁',   x:  -54.0, z:   68.0, yOff: 10.6, col: '#ffe0a4' },
    { name: '醉仙楼 · 灵茶酒肆',   x:   54.0, z:   68.0, yOff: 14.5, col: '#ffd2a6' },
  ];

  // =========================================================================
  // 2. LOCAL TRANSFORM & ARCHITECTURAL HELPERS
  // =========================================================================
  function makeLocalHelper(mb, cx, baseY, cz, rotY) {
    const cY = Math.cos(rotY), sY = Math.sin(rotY);
    const pt = (lx, ly, lz) => MeshBuilder.xformY(lx, ly, lz, cx, baseY, cz, cY, sY);
    return {
      pt,
      box(lx, ly, lz, sx, sy, sz, col, rough = 0.62, em = 0.0, mat = 1.0, localRotY = 0) {
        const p = pt(lx, ly, lz);
        mb.addBox(p[0], p[1], p[2], sx, sy, sz, rotY + localRotY, col, rough, em, mat);
      },
      boxEuler(lx, ly, lz, sx, sy, sz, rx, ry, rz, col, rough = 0.62, em = 0.0, mat = 1.0) {
        const p = pt(lx, ly, lz);
        mb.addBoxEuler(p[0], p[1], p[2], sx, sy, sz, rx, rotY + ry, rz, col, rough, em, mat);
      },
      cyl(lx, ly, lz, rB, rT, h, segs, col, rough = 0.60, em = 0.0, mat = 1.0) {
        const p = pt(lx, ly, lz);
        mb.addCylinder(p[0], p[1], p[2], rB, rT, h, segs, col, rough, em, mat);
      },
      tri(a, b, c, col, rough = 0.62, em = 0.0, mat = 1.0) {
        mb.addFlatTri(pt(a[0], a[1], a[2]), pt(b[0], b[1], b[2]), pt(c[0], c[1], c[2]), col, rough, em, mat);
      },
    };
  }

  function registerFloatingCrystal(x, y, z, style = 'crystal_cyan', scale = 1.0, withHalo = false, haloScale = 1.6) {
    FLOATING_PROPS.push({
      kind: style,
      x, y, z,
      scale,
      phase: Math.random() * Math.PI * 2,
      spinSpeed: style === 'crystal_gold' ? 1.15 : 0.95,
      bobAmp: 0.28 * scale,
      modelMat: M.mat4(),
    });
    if (withHalo) {
      FLOATING_PROPS.push({
        kind: style === 'crystal_gold' ? 'halo_gold' : 'halo_cyan',
        x, y, z,
        scale: haloScale,
        phase: Math.random() * Math.PI * 2,
        spinSpeed: -0.75,
        bobAmp: 0.16 * scale,
        tiltX: 0.26,
        modelMat: M.mat4(),
      });
    }
  }

  function registerDoor(opts) {
    REGISTERED_DOORS.push({
      id: 'door_' + REGISTERED_DOORS.length,
      label: opts.label || '仙居大门',
      cx: opts.cx,
      cy: opts.cy,
      cz: opts.cz,
      rotY: opts.rotY,
      width: opts.width,
      height: opts.height,
      isDouble: !!opts.isDouble,
      style: opts.style || 'door_house',
      open: false,
      angle: 0.0,
      targetAngle: 0.0,
      leftMat: M.mat4(),
      rightMat: M.mat4(),
    });
  }

  // Warm-yellow glowing square wooden lantern (暖黄发光方块灯笼)
  function addSquareLantern(mb, x, eaveY, z, scale = 1.0, rotY = 0, glowCol = PAL.lanternWarm) {
    const prev = mb.colEnabled;
    mb.setCollision(false);
    const s = scale;
    mb.addCylinder(x, eaveY - 0.36 * s, z, 0.03 * s, 0.03 * s, 0.40 * s, 5, PAL.ironBlack, 0.45, 0, 3.0);
    mb.addBox(x, eaveY - 0.40 * s, z, 0.58 * s, 0.09 * s, 0.58 * s, rotY, PAL.woodDark, 0.55, 0, 1.30);
    mb.addBox(x, eaveY - 0.72 * s, z, 0.44 * s, 0.56 * s, 0.44 * s, rotY, glowCol, 0.16, 2.35, 2.0);
    const cY = Math.cos(rotY), sY = Math.sin(rotY);
    for (const sx of [-0.22, 0.22]) {
      for (const sz of [-0.22, 0.22]) {
        const p = MeshBuilder.xformY(sx * s, -0.72 * s, sz * s, x, eaveY, z, cY, sY);
        mb.addBox(p[0], p[1], p[2], 0.055 * s, 0.58 * s, 0.055 * s, rotY, PAL.woodDark, 0.55, 0, 1.30);
      }
    }
    mb.addBox(x, eaveY - 1.02 * s, z, 0.52 * s, 0.08 * s, 0.52 * s, rotY, PAL.woodDark, 0.55, 0, 1.30);
    mb.addCylinder(x, eaveY - 1.32 * s, z, 0.04 * s, 0.07 * s, 0.28 * s, 5, PAL.vermilion, 0.48, 0.28, 1.30);
    mb.setCollision(prev);
  }

  // Crisp Gabled Tiled Roof (灰瓦/碧瓦/棕瓦人字顶) with ridge finials & tile ribs
  function addGabledTileRoof(mb, cx, eaveY, cz, widthX, depthZ, ridgeH, rotY, roofCol, gableCol, trimCol = PAL.blueStoneLite) {
    const H = makeLocalHelper(mb, cx, eaveY, cz, rotY);
    const hw = widthX * 0.5, hd = depthZ * 0.5;
    const slopeLen = Math.hypot(hd, ridgeH);
    const pitchAng = Math.atan2(ridgeH, hd);
    const prevCol = mb.colEnabled;
    mb.setCollision(false);

    const gx = hw - 0.55, gz = hd - 0.65;
    if (gableCol) {
      H.tri([ gx, 0, -gz], [ gx, 0,  gz], [ gx, ridgeH - 0.06, 0], gableCol, 0.64, 0, 1.42);
      H.tri([-gx, 0,  gz], [-gx, 0, -gz], [-gx, ridgeH - 0.06, 0], gableCol, 0.64, 0, 1.42);
      for (const sX of [-1, 1]) {
        H.boxEuler(sX * (hw - 0.08), ridgeH * 0.5,  hd * 0.5, 0.18, 0.28, slopeLen + 0.18,  pitchAng, 0, 0, PAL.woodDark, 0.56, 0, 1.30);
        H.boxEuler(sX * (hw - 0.08), ridgeH * 0.5, -hd * 0.5, 0.18, 0.28, slopeLen + 0.18, -pitchAng, 0, 0, PAL.woodDark, 0.56, 0, 1.30);
      }
    }
    H.boxEuler(0, ridgeH * 0.5 + 0.04,  hd * 0.5, widthX, 0.24, slopeLen + 0.24,  pitchAng, 0, 0, roofCol, 0.52, 0, 1.15);
    H.boxEuler(0, ridgeH * 0.5 + 0.04, -hd * 0.5, widthX, 0.24, slopeLen + 0.24, -pitchAng, 0, 0, roofCol, 0.52, 0, 1.15);

    const ribCount = Math.max(5, Math.floor((widthX - 0.6) / 0.95));
    const ribCol = [roofCol[0] * 0.82, roofCol[1] * 0.82, roofCol[2] * 0.85];
    for (let i = 0; i <= ribCount; i++) {
      const rx = -hw + 0.35 + (i / ribCount) * (widthX - 0.70);
      H.boxEuler(rx, ridgeH * 0.5 + 0.17,  hd * 0.5, 0.14, 0.12, slopeLen + 0.14,  pitchAng, 0, 0, ribCol, 0.48, 0, 1.15);
      H.boxEuler(rx, ridgeH * 0.5 + 0.17, -hd * 0.5, 0.14, 0.12, slopeLen + 0.14, -pitchAng, 0, 0, ribCol, 0.48, 0, 1.15);
    }
    const ridgeCol = [roofCol[0] * 0.72, roofCol[1] * 0.74, roofCol[2] * 0.78];
    H.box(0, ridgeH + 0.26, 0, widthX + 0.36, 0.38, 0.42, ridgeCol, 0.48, 0, 1.0);
    for (const sX of [-1, 1]) {
      H.box(sX * (hw + 0.08), ridgeH + 0.60, 0, 0.36, 0.52, 0.38, trimCol, 0.42, 0.08, 3.0);
    }
    H.box(0, -0.06,  hd - 0.24, widthX - 0.2, 0.18, 0.22, PAL.woodDark, 0.58, 0, 1.30);
    H.box(0, -0.06, -hd + 0.24, widthX - 0.2, 0.18, 0.22, PAL.woodDark, 0.58, 0, 1.30);
    mb.setCollision(prevCol);
  }

  // Single-slope Awning Canopy (斜坡布篷 / 顶棚)
  function addSlopedAwning(mb, cx, baseY, cz, widthX, depthZ, backH, frontH, rotY, clothCol, trimCol, ribCount = 9) {
    const H = makeLocalHelper(mb, cx, baseY, cz, rotY);
    const dy = backH - frontH;
    const slopeLen = Math.hypot(depthZ, dy);
    const pitchAng = Math.atan2(dy, depthZ);
    const midY = (backH + frontH) * 0.5;
    const hw = widthX * 0.5;
    const prevCol = mb.colEnabled;
    mb.setCollision(false);

    H.boxEuler(0, midY, 0, widthX, 0.15, slopeLen + 0.34, pitchAng, 0, 0, clothCol, 0.74, 0, 1.42);
    const darkShade = [clothCol[0] * 0.80, clothCol[1] * 0.80, clothCol[2] * 0.80];
    for (let i = 0; i <= ribCount; i++) {
      const rx = -hw + 0.2 + (i / ribCount) * (widthX - 0.4);
      H.boxEuler(rx, midY + 0.09, 0, 0.10, 0.08, slopeLen + 0.26, pitchAng, 0, 0, darkShade, 0.76, 0, 1.30);
    }
    const frontZ = depthZ * 0.5 + 0.12;
    const flapCount = Math.max(6, Math.floor(widthX / 1.25));
    const flapW = (widthX - 0.16) / flapCount;
    for (let i = 0; i < flapCount; i++) {
      const fx = -hw + 0.08 + (i + 0.5) * flapW;
      H.box(fx, frontH - 0.26, frontZ, flapW * 0.90, 0.48, 0.08, i % 2 === 0 ? clothCol : trimCol, 0.74, 0, 1.42);
    }
    H.box(0, frontH - 0.12,  depthZ * 0.42, widthX - 0.3, 0.20, 0.20, PAL.woodDark, 0.60, 0, 1.30);
    H.box(0, backH  - 0.12, -depthZ * 0.42, widthX - 0.3, 0.20, 0.20, PAL.woodDark, 0.60, 0, 1.30);
    mb.setCollision(prevCol);
  }

  // =========================================================================
  // ENTERABLE HOLLOW ROOM SHELL BUILDER (真中空可进入室内 + 实墙碰撞 + 注册可开关大门!)
  // =========================================================================
  function buildHollowRoom(mb, H, opts) {
    const deckY   = opts.deckY;
    const W       = opts.width;
    const D       = opts.depth;
    const wallH   = opts.wallH;
    const t       = opts.wallThick || 0.62;
    const doorW   = opts.doorW;
    const doorH   = opts.doorH;
    const wallCol = opts.wallCol;
    const dadoCol = opts.dadoCol || PAL.blueStone;
    const floorCol= opts.floorCol || PAL.whiteJadeWarm;
    const trimCol = opts.trimCol || PAL.woodDark;
    const centerZ = opts.centerZ || 0.0;

    const hw = W * 0.5;
    const hd = D * 0.5;
    const frontZ = centerZ + hd;
    const backZ  = centerZ - hd;

    // 1) Solid walkable interior floor slab (top flush at deckY)
    mb.setCollision(true, 'building');
    H.box(0, deckY - 0.24, centerZ, W, 0.48, D, floorCol, 0.56, 0, 1.0);

    // 2) Back Wall (-Z), Left Wall (-X), Right Wall (+X) -> SOLID colliders!
    H.box(0, deckY + wallH * 0.5, backZ + t * 0.5, W, wallH, t, wallCol, 0.62, 0, 1.42);
    H.box(-hw + t * 0.5, deckY + wallH * 0.5, centerZ, t, wallH, D - t * 2.0, wallCol, 0.62, 0, 1.42);
    H.box( hw - t * 0.5, deckY + wallH * 0.5, centerZ, t, wallH, D - t * 2.0, wallCol, 0.62, 0, 1.42);

    // 3) Front Wall (+Z) SPLIT around the real walk-through Doorway (width = doorW, height = doorH)!
    const sideW = Math.max(0.6, (W - doorW) * 0.5);
    H.box(-doorW * 0.5 - sideW * 0.5, deckY + wallH * 0.5, frontZ - t * 0.5, sideW, wallH, t, wallCol, 0.62, 0, 1.42);
    H.box( doorW * 0.5 + sideW * 0.5, deckY + wallH * 0.5, frontZ - t * 0.5, sideW, wallH, t, wallCol, 0.62, 0, 1.42);

    // Transom wall & timber door lintel ABOVE doorway (non-blocking overhead so player walks cleanly inside!)
    mb.setCollision(false);
    const transH = Math.max(0.35, wallH - doorH);
    H.box(0, deckY + doorH + transH * 0.5, frontZ - t * 0.5, doorW + 0.1, transH, t, wallCol, 0.62, 0, 1.42);

    // Door jamb posts & lintel frame (门框)
    H.box(-doorW * 0.5 - 0.14, deckY + doorH * 0.5, frontZ - t * 0.42, 0.28, doorH + 0.12, t + 0.16, trimCol, 0.52, 0, 1.30);
    H.box( doorW * 0.5 + 0.14, deckY + doorH * 0.5, frontZ - t * 0.42, 0.28, doorH + 0.12, t + 0.16, trimCol, 0.52, 0, 1.30);
    H.box(0, deckY + doorH + 0.14, frontZ - t * 0.42, doorW + 0.68, 0.28, t + 0.22, trimCol, 0.52, 0, 1.30);
    // Low stone threshold sill (门槛 — low enough to step smoothly right over!)
    H.box(0, deckY + 0.05, frontZ - t * 0.5, doorW, 0.10, t + 0.08, PAL.blueStoneLite, 0.54, 0, 1.0);

    // Exterior stone dado skirting & structural timber corner pilasters
    const dadoH = Math.min(1.05, wallH * 0.20);
    H.box(0, deckY + dadoH * 0.5, backZ - 0.04, W + 0.14, dadoH, 0.14, dadoCol, 0.68, 0, 1.0);
    H.box(-hw - 0.04, deckY + dadoH * 0.5, centerZ, 0.14, dadoH, D + 0.14, dadoCol, 0.68, 0, 1.0);
    H.box( hw + 0.04, deckY + dadoH * 0.5, centerZ, 0.14, dadoH, D + 0.14, dadoCol, 0.68, 0, 1.0);
    H.box(-doorW * 0.5 - sideW * 0.5, deckY + dadoH * 0.5, frontZ + 0.04, sideW + 0.08, dadoH, 0.14, dadoCol, 0.68, 0, 1.0);
    H.box( doorW * 0.5 + sideW * 0.5, deckY + dadoH * 0.5, frontZ + 0.04, sideW + 0.08, dadoH, 0.14, dadoCol, 0.68, 0, 1.0);
    for (const sx of [-hw, hw]) {
      for (const sz of [backZ, frontZ]) {
        H.box(sx, deckY + wallH * 0.5, sz, 0.44, wallH, 0.44, trimCol, 0.56, 0, 1.30);
      }
    }
    // Interior timber ceiling beam & warm hanging interior palace lantern so interiors feel cozy & luminous!
    H.box(0, deckY + wallH - 0.16, centerZ, W - 0.8, 0.28, D - 0.8, PAL.woodDark, 0.66, 0, 1.30);
    const lPos = H.pt(0, deckY + wallH - 0.30, centerZ);
    addSquareLantern(mb, lPos[0], lPos[1], lPos[2], opts.lanternScale || 0.92, opts.rotY || 0);
    mb.setCollision(true, 'building');

    // Register interactive hinged swinging door right in this doorway!
    const dp = H.pt(0, deckY, frontZ - t * 0.5);
    registerDoor({
      label: opts.doorLabel || '建筑大门',
      cx: dp[0],
      cy: dp[1],
      cz: dp[2],
      rotY: opts.rotY || 0,
      width: doorW,
      height: doorH,
      isDouble: opts.isDouble !== undefined ? opts.isDouble : (doorW >= 3.0),
      style: opts.doorStyle || 'door_house',
    });
  }

  // =========================================================================
  // 3. 宏伟修仙城防：9.5m 高青石城墙 + 护城灵阵符柱 + 四角重檐望灵楼 + 四向巍峨门楼
  // =========================================================================
  function buildGrandWallsAndGates(mb) {
    const qc = T.QINGSHI_CITY;
    const halfW = qc.halfW;   // 130
    const northZ = qc.northZ; // -115
    const southZ = qc.southZ; // +125

    // Tall 9.5m terrain-hugging ashlar bluestone rampart with glowing Xianxia spirit array pylons!
    function addGrandWallRun(x0, z0, x1, z1) {
      const dx = x1 - x0, dz = z1 - z0;
      const totalLen = Math.hypot(dx, dz);
      if (totalLen < 2.0) return;
      const rotY = Math.atan2(dx, dz);
      const bays = Math.max(2, Math.round(totalLen / 7.5));
      const bayLen = totalLen / bays;
      const wallThick = 4.4;
      const wallH = 9.4;

      for (let i = 0; i < bays; i++) {
        const t0 = i / bays, t1 = (i + 1) / bays, tm = (t0 + t1) * 0.5;
        const ax = M.lerp(x0, x1, t0), az = M.lerp(z0, z1, t0);
        const bx = M.lerp(x0, x1, t1), bz = M.lerp(z0, z1, t1);
        const mx = M.lerp(x0, x1, tm), mz = M.lerp(z0, z1, tm);

        const y0 = T.getMeshTerrainHeight(ax, az);
        const y1 = T.getMeshTerrainHeight(bx, bz);
        const ym = T.getMeshTerrainHeight(mx, mz);
        const yBot = Math.min(y0, y1, ym) - 3.0;
        const yTop = ym + wallH;
        const totalH = Math.max(8.0, yTop - yBot);

        // Tall solid gray-blue ashlar masonry wall (9.4m high, 4.4m thick!)
        mb.setCollision(true, 'building');
        mb.addBox(mx, yBot + totalH * 0.5, mz, wallThick, totalH, bayLen + 0.16, rotY, PAL.blueStone, 0.70, 0, 1.0);

        mb.setCollision(false);
        // Heavy battered dark-slate base plinth + mid stone belt course + overhanging cornice coping
        mb.addBox(mx, ym + 1.15, mz, wallThick + 0.72, 2.5, bayLen + 0.14, rotY, PAL.blueStoneDark, 0.76, 0, 1.0);
        mb.addBox(mx, ym + 5.20, mz, wallThick + 0.28, 0.42, bayLen + 0.14, rotY, PAL.blueStoneDark, 0.72, 0, 1.0);
        mb.addBox(mx, yTop - 0.18, mz, wallThick + 0.54, 0.44, bayLen + 0.18, rotY, PAL.blueStoneLite, 0.60, 0, 1.0);

        // Tall sculpted outer crenellations (垛口) & inner walkway parapet
        const cY = Math.cos(rotY), sY = Math.sin(rotY);
        for (const sub of [-0.26, 0.26]) {
          const p = MeshBuilder.xformY(0, 0, sub * bayLen, mx, yTop, mz, cY, sY);
          mb.addBox(p[0], p[1] + 0.80, p[2], wallThick * 0.92, 1.48, bayLen * 0.34, rotY, PAL.blueStone, 0.68, 0, 1.0);
          mb.addBox(p[0], p[1] + 1.56, p[2], wallThick * 0.98, 0.18, bayLen * 0.38, rotY, PAL.blueStoneLite, 0.58, 0, 1.0);
        }

        // Every 3rd bay: Grand Buttress Pier + Glowing 护城灵阵符石柱 (City-Wall Spirit Array Monolith!)
        if (i % 3 === 1) {
          mb.addBox(mx, yBot + totalH * 0.5, mz, wallThick + 1.15, totalH - 0.2, 1.85, rotY, PAL.blueStoneDark, 0.72, 0, 1.0);
          // Carved rune pillar rising above parapet with glowing pale-cyan vertical rune strip!
          mb.addBox(mx, yTop + 1.65, mz, 1.35, 3.3, 1.35, rotY, PAL.whiteJadeWarm, 0.54, 0, 1.0);
          mb.addBox(mx, yTop + 1.85, mz, 1.44, 2.0, 0.26, rotY, PAL.arrayCyan, 0.20, 1.65, 2.0);
          mb.addBox(mx, yTop + 1.85, mz, 0.26, 2.0, 1.44, rotY, PAL.arrayCyan, 0.20, 1.65, 2.0);
          if (i % 6 === 1) {
            registerFloatingCrystal(mx, yTop + 4.35, mz, 'crystal_cyan', 0.82, false);
          }
        }
        mb.setCollision(true, 'building');
      }
    }

    // Towering Two-Story Corner Watchtower (四角重檐望灵箭楼) at all 4 city corners!
    function addCornerWatchtower(cx, cz) {
      const y = T.getMeshTerrainHeight(cx, cz);
      const yBot = y - 3.5;
      const deckY = y + 10.6;
      const baseH = deckY - yBot;

      mb.setCollision(true, 'building');
      mb.addBox(cx, yBot + baseH * 0.5, cz, 12.0, baseH, 12.0, 0, PAL.blueStone, 0.70, 0, 1.0);
      mb.setCollision(false);
      mb.addBox(cx, y + 1.3, cz, 12.8, 2.8, 12.8, 0, PAL.blueStoneDark, 0.76, 0, 1.0);
      mb.addBox(cx, deckY + 0.20, cz, 12.6, 0.44, 12.6, 0, PAL.blueStoneLite, 0.58, 0, 1.0);

      // 1st-tier timber watchtower chamber with vermilion columns & warm windows
      const h1 = 4.4;
      mb.addBox(cx, deckY + 0.42 + h1 * 0.5, cz, 8.2, h1, 8.2, 0, PAL.creamWall, 0.60, 0, 1.42);
      for (const sx of [-4.6, 4.6]) {
        for (const sz of [-4.6, 4.6]) {
          mb.addPillarWithBase(cx + sx, deckY + 0.42, cz + sz, 0.34, h1, PAL.vermilion, PAL.whiteJade, PAL.gold);
        }
      }
      mb.addLatticeWindow(cx, deckY + 2.5, cz + 4.18, 3.6, 2.0, 0, PAL.woodDark, PAL.windowWarm, 1.2);
      mb.addLatticeWindow(cx, deckY + 2.5, cz - 4.18, 3.6, 2.0, Math.PI, PAL.woodDark, PAL.windowWarm, 1.2);
      mb.addLatticeWindow(cx + 4.18, deckY + 2.5, cz, 3.6, 2.0, Math.PI * 0.5, PAL.woodDark, PAL.windowWarm, 1.2);
      mb.addLatticeWindow(cx - 4.18, deckY + 2.5, cz, 3.6, 2.0, -Math.PI * 0.5, PAL.woodDark, PAL.windowWarm, 1.2);
      // Lower sweeping indigo-jade flying-eave roof
      mb.addCurvedRoof(cx, deckY + 0.42 + h1, cz, 13.8, 13.8, 3.0, 0, 0.28, 1.8, PAL.tileIndigo, PAL.gold, PAL.whiteJade);

      // 2nd-tier upper watchtower lantern room + spire roof + hovering cyan spirit crystal!
      const uY = deckY + 0.42 + h1 + 2.2;
      mb.addBox(cx, uY + 1.6, cz, 5.4, 3.2, 5.4, 0, PAL.vermilion, 0.52, 0, 1.30);
      mb.addBox(cx, uY + 1.6, cz, 5.56, 1.6, 5.56, 0, PAL.windowWarm, 0.22, 1.35, 2.0);
      mb.addPagodaRoof(cx, uY + 3.2, cz, 7.6, 3.8, 8, 0.28, 1.6, PAL.tileIndigo, PAL.gold);
      registerFloatingCrystal(cx, uY + 8.5, cz, 'crystal_cyan', 1.15, true, 1.85);
      // Warm corner hanging lanterns
      for (const sx of [-5.2, 5.2]) {
        for (const sz of [-5.2, 5.2]) {
          addSquareLantern(mb, cx + sx, deckY + 0.42 + h1 - 0.1, cz + sz, 1.05, 0);
        }
      }
      mb.setCollision(true, 'building');
    }

    // Grand Double-Tier Xianxia Gatehouse (巍峨重檐仙城门楼 + 深棕木柱 + 灰瓦/飞檐顶 + 暖黄方块灯笼)
    function addGrandGatehouse(cx, cz, rotY, openWidth, isMainSouth = false) {
      const y = T.getMeshTerrainHeight(cx, cz);
      const H = makeLocalHelper(mb, cx, y, cz, rotY);
      const halfOpen = openWidth * 0.5;
      const pierW = isMainSouth ? 6.4 : 5.2;
      const pierD = isMainSouth ? 11.4 : 9.4;
      const archH = isMainSouth ? 8.6 : 7.8;
      const deckW = openWidth + pierW * 2.0 + 2.4;
      const deckD = pierD + 1.6;

      // 1) Monumental Flanking Stone Gate Piers (solid collision, center passage 100% clear!)
      mb.setCollision(true, 'building');
      for (const s of [-1, 1]) {
        const px = s * (halfOpen + pierW * 0.5);
        H.box(px, (archH - 3.2) * 0.5, 0, pierW, archH + 3.2, pierD, PAL.blueStone, 0.68, 0, 1.0);
        mb.setCollision(false);
        H.box(px, 1.1, 0, pierW + 0.65, 2.6, pierD + 0.65, PAL.blueStoneDark, 0.74, 0, 1.0);
        H.box(px, archH - 0.22, 0, pierW + 0.58, 0.48, pierD + 0.58, PAL.blueStoneLite, 0.58, 0, 1.0);
        // Giant lacquered city gate doors swung wide open inside the archway
        H.box(s * (halfOpen - 0.34), 3.7, -0.4, 0.46, 7.2, 4.8, PAL.woodDark, 0.56, 0, 1.30);
        H.box(s * (halfOpen - 0.60), 3.7, -0.4, 0.10, 0.36, 4.4, PAL.gold, 0.30, 0.14, 3.0);
        // Flanking tall spirit-rune stone guardian pillars outside main gate!
        if (isMainSouth) {
          H.box(s * (halfOpen + 3.2), 0.7, pierD * 0.68, 2.2, 1.6, 2.2, PAL.whiteJadeWarm, 0.54, 0, 1.0);
          H.cyl(s * (halfOpen + 3.2), 1.4, pierD * 0.68, 0.62, 0.48, 6.2, 8, PAL.whiteJade, 0.50, 0, 1.0);
          const cp = H.pt(s * (halfOpen + 3.2), 8.9, pierD * 0.68);
          registerFloatingCrystal(cp[0], cp[1], cp[2], 'crystal_gold', 1.10, true, 1.6);
        }
        mb.setCollision(true, 'building');
      }

      // 2) Thick Stone Gatehouse Deck spanning cleanly above archH!
      H.box(0, archH + 0.55, 0, deckW, 1.15, deckD, PAL.blueStoneLite, 0.58, 0, 1.0);
      mb.setCollision(false);
      H.box(0, archH - 0.28,  pierD * 0.45, openWidth + 2.0, 0.64, 0.72, PAL.woodDark, 0.54, 0, 1.30);
      H.box(0, archH - 0.28, -pierD * 0.45, openWidth + 2.0, 0.64, 0.72, PAL.woodDark, 0.54, 0, 1.30);

      // Carved white-jade balustrade around gatehouse deck
      const deckY = archH + 1.12;
      mb.addCarvedBalustrade(...H.pt(-deckW * 0.47, deckY,  deckD * 0.45), ...H.pt(deckW * 0.47, deckY,  deckD * 0.45), 1.05, PAL.whiteJade);
      mb.addCarvedBalustrade(...H.pt(-deckW * 0.47, deckY, -deckD * 0.45), ...H.pt(deckW * 0.47, deckY, -deckD * 0.45), 1.05, PAL.whiteJade);

      // 3) Lower Gatehouse Timber Colonnade (深棕木柱 + 雕花门窗)
      const colH1 = isMainSouth ? 5.2 : 4.5;
      const colXs = isMainSouth ? [-11.8, -6.2, -2.4, 2.4, 6.2, 11.8] : [-8.8, -4.4, 4.4, 8.8];
      for (const lx of colXs) {
        for (const lz of [-deckD * 0.34, deckD * 0.34]) {
          const pb = H.pt(lx, deckY, lz);
          mb.addPillarWithBase(pb[0], pb[1], pb[2], 0.36, colH1, PAL.woodDark, PAL.whiteJade, PAL.gold);
        }
      }
      const hallW = isMainSouth ? 20.5 : 15.2;
      H.box(0, deckY + colH1 * 0.48, 0, hallW, colH1 * 0.92, deckD * 0.52, PAL.creamWall, 0.60, 0, 1.42);
      for (const wx of (isMainSouth ? [-6.5, -2.2, 2.2, 6.5] : [-4.2, 0, 4.2])) {
        mb.addLatticeWindow(...H.pt(wx, deckY + colH1 * 0.50,  deckD * 0.27), 2.4, 2.2, rotY, PAL.woodDark, PAL.windowWarm, 1.25);
        mb.addLatticeWindow(...H.pt(wx, deckY + colH1 * 0.50, -deckD * 0.27), 2.4, 2.2, rotY + Math.PI, PAL.woodDark, PAL.windowWarm, 1.15);
      }

      // Luminous Gilded City Name Plaque (青石仙城匾额) on outer facade!
      H.box(0, deckY + colH1 - 0.65, deckD * 0.40, 7.2, 2.1, 0.28, PAL.woodDark, 0.46, 0, 1.30);
      H.box(0, deckY + colH1 - 0.65, deckD * 0.44, 6.6, 1.7, 0.12, PAL.gold, 0.24, 0.22, 3.0);
      H.box(0, deckY + colH1 - 0.65, deckD * 0.47, 6.1, 1.35, 0.10, [0.10, 0.20, 0.26], 0.40, 0, 1.30);
      for (const gx of [-1.95, -0.65, 0.65, 1.95]) {
        H.box(gx, deckY + colH1 - 0.65, deckD * 0.51, 0.62, 0.78, 0.08, PAL.arrayCyan, 0.18, 1.75, 2.0);
      }

      // 4) Lower Sweeping Eave Roof + Upper Second-Story Gabled Gray-Tile Gate Tower (重檐灰瓦人字顶)!
      const r1P = H.pt(0, deckY + colH1 + 0.10, 0);
      mb.addCurvedRoof(r1P[0], r1P[1], r1P[2], deckW + 4.8, deckD + 4.2, 3.2, rotY, 0.24, 2.0, PAL.tileSlateMid, PAL.gold, PAL.whiteJade);

      const u2Y = deckY + colH1 + 2.35;
      const u2H = isMainSouth ? 3.8 : 3.1;
      H.box(0, u2Y + u2H * 0.5, 0, hallW * 0.72, u2H, deckD * 0.46, PAL.vermilion, 0.50, 0, 1.30);
      for (const wx of [-3.4, 0, 3.4]) {
        mb.addLatticeWindow(...H.pt(wx, u2Y + u2H * 0.50,  deckD * 0.24), 2.1, 1.7, rotY, PAL.woodDark, PAL.windowWarm, 1.35);
        mb.addLatticeWindow(...H.pt(wx, u2Y + u2H * 0.50, -deckD * 0.24), 2.1, 1.7, rotY + Math.PI, PAL.woodDark, PAL.windowWarm, 1.25);
      }
      addGabledTileRoof(mb, cx, y + u2Y + u2H + 0.08, cz, hallW * 0.92 + 3.2, deckD * 0.72 + 3.4, isMainSouth ? 4.2 : 3.4, rotY, PAL.tileSlateMid, PAL.creamWall, PAL.gold);

      // 5) Warm-Yellow Glowing Square Lanterns hanging across both tiers & archway flanks!
      const lantXs = isMainSouth ? [-11.5, -5.8, 5.8, 11.5] : [-8.4, 8.4];
      for (const lx of lantXs) {
        for (const sZ of [-1, 1]) {
          const lp = H.pt(lx, deckY + colH1 + 0.05, sZ * (deckD * 0.56));
          addSquareLantern(mb, lp[0], lp[1], lp[2], 1.22, rotY);
        }
      }
      for (const sX of [-1, 1]) {
        const lp = H.pt(sX * (halfOpen + 1.2), archH - 0.35, pierD * 0.52);
        addSquareLantern(mb, lp[0], lp[1], lp[2], 1.15, rotY);
      }
      mb.setCollision(true, 'building');
    }

    // Build all 4 towering terrain-hugging city wall runs!
    addGrandWallRun(-halfW + 5.8, southZ, -13.0, southZ);
    addGrandWallRun( 13.0, southZ,  halfW - 5.8, southZ);
    addGrandWallRun(-halfW + 5.8, northZ, -10.0, northZ);
    addGrandWallRun( 10.0, northZ,  halfW - 5.8, northZ);
    addGrandWallRun(-halfW, southZ - 5.8, -halfW,  10.0);
    addGrandWallRun(-halfW, -10.0,        -halfW, northZ + 5.8);
    addGrandWallRun( halfW, southZ - 5.8,  halfW,  10.0);
    addGrandWallRun( halfW, -10.0,         halfW, northZ + 5.8);

    // 4 Towering Two-Story Corner Watchtowers
    addCornerWatchtower(-halfW, southZ);
    addCornerWatchtower( halfW, southZ);
    addCornerWatchtower(-halfW, northZ);
    addCornerWatchtower( halfW, northZ);

    // 4 Monumental Double-Tier Gatehouses (南天正门 / 北门 / 西门 / 东门)
    addGrandGatehouse(0, southZ, 0.0, 20.0, true);
    addGrandGatehouse(0, northZ, Math.PI, 15.0, false);
    addGrandGatehouse(-halfW, 0, -Math.PI * 0.5, 15.0, false);
    addGrandGatehouse( halfW, 0,  Math.PI * 0.5, 15.0, false);
  }

  // =========================================================================
  // 4. 聚灵传送大阵台 + 五行灵柱 + 双月灵莲池玉桥 + 迎客仙碑 + 青铜大鼎 (浓厚修仙氛围!)
  // =========================================================================
  function buildCentralImmortalPlaza(mb) {
    const baseY = T.getMeshTerrainHeight(0, 0);

    // --- A) Grand 3-Tier Octagonal Teleport Array Platform (聚灵传送大阵台, r = 16.0m) ---
    mb.setCollision(true, 'building');
    mb.addCylinder(0, baseY - 1.6, 0, 16.4, 16.0, 2.08, 8, PAL.blueStoneLite, 0.56, 0, 1.0);
    mb.addCylinder(0, baseY + 0.48, 0, 13.2, 12.9, 0.48, 8, PAL.whiteJadeWarm, 0.52, 0, 1.0);
    mb.addCylinder(0, baseY + 0.96, 0, 10.2, 10.0, 0.48, 8, PAL.whiteJade, 0.48, 0, 1.0);

    const deckY = baseY + 1.44;
    mb.setCollision(false);
    // Crisp dark-jade edging trim on all 3 tiers + 4 grand smooth stepped cardinal stairs!
    mb.addCylinder(0, baseY + 0.42, 0, 16.15, 16.08, 0.09, 8, PAL.blueStoneDark, 0.60, 0, 1.0);
    mb.addCylinder(0, baseY + 0.90, 0, 13.02, 12.96, 0.08, 8, PAL.blueStoneDark, 0.58, 0, 1.0);
    mb.addCylinder(0, deckY - 0.06, 0, 10.12, 10.06, 0.08, 8, PAL.gold, 0.30, 0.12, 3.0);
    for (let s = 0; s < 4; s++) {
      const a = s * Math.PI * 0.5;
      mb.addSteppedStairway(Math.sin(a) * 14.4, baseY - 0.05, Math.cos(a) * 14.4, 5.4, 1.48, 5.6, 5, a, PAL.whiteJade, PAL.blueStone);
    }

    // Center inlaid luminous pale-cyan circular stone array disc (圆形法阵石盘, r = 7.6m)!
    mb.addCylinder(0, deckY, 0, 7.6, 7.45, 0.12, 32, PAL.blueStoneDark, 0.46, 0, 1.0);
    mb.addCylinder(0, deckY + 0.09, 0, 6.9, 6.9, 0.05, 32, [0.22, 0.30, 0.36], 0.42, 0, 1.0);
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      mb.addBox(Math.cos(a) * 6.4, deckY + 0.145, Math.sin(a) * 6.4, 0.22, 0.04, 1.15, -a, PAL.arrayCyan, 0.20, 1.45, 2.0);
      if (i % 2 === 0) {
        mb.addBox(Math.cos(a) * 3.8, deckY + 0.145, Math.sin(a) * 3.8, 0.18, 0.04, 1.25, -a, PAL.gold, 0.22, 1.25, 2.0);
      }
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      mb.addBox(Math.sin(a) * 3.5, deckY + 0.14, Math.cos(a) * 3.5, 0.14, 0.04, 5.6, a, PAL.arrayCyan, 0.20, 1.40, 2.0);
    }
    mb.addCylinder(0, deckY + 0.11, 0, 1.45, 1.32, 0.08, 16, PAL.arrayCyan, 0.18, 1.75, 2.0);

    // Floating giant glowing spirit crystal & dual golden halo rings soaring above array center!
    registerFloatingCrystal(0, deckY + 5.6, 0, 'crystal_cyan', 1.75, true, 3.4);
    FLOATING_PROPS.push({
      kind: 'halo_gold',
      x: 0, y: deckY + 5.6, z: 0,
      scale: 4.5,
      phase: 1.5,
      spinSpeed: 0.55,
      bobAmp: 0.22,
      tiltX: -0.34,
      modelMat: M.mat4(),
    });

    // 8 Tall Octagonal Spirit-Array Monolith Pillars (八方聚灵晶柱) + 4 Corner Warm Lamp Pillars!
    mb.setCollision(true, 'building');
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
      const px = Math.cos(a) * 14.5, pz = Math.sin(a) * 14.5;
      const py = baseY + 0.48;
      const isCornerLamp = i % 2 === 0;
      if (isCornerLamp) {
        // Warm-Yellow Glowing Stone Lamp Pillar (带暖黄光点的石灯柱)
        mb.addBox(px, py + 0.35, pz, 1.45, 0.70, 1.45, -a, PAL.blueStone, 0.60, 0, 1.0);
        mb.addCylinder(px, py + 0.70, pz, 0.44, 0.36, 2.15, 8, PAL.whiteJadeWarm, 0.54, 0, 1.0);
        mb.setCollision(false);
        mb.addBox(px, py + 2.92, pz, 1.05, 0.18, 1.05, -a, PAL.blueStone, 0.56, 0, 1.0);
        mb.addBox(px, py + 3.36, pz, 0.56, 0.64, 0.56, -a, PAL.lanternWarm, 0.16, 2.45, 2.0);
        mb.addCylinder(px, py + 3.72, pz, 0.85, 0.10, 0.62, 4, PAL.tileIndigo, 0.50, 0, 1.0);
        mb.setCollision(true, 'building');
      } else {
        // Tall Spirit Array Monolith Pillar crowned with an animated floating cyan crystal!
        mb.addBox(px, py + 0.42, pz, 1.65, 0.84, 1.65, -a, PAL.whiteJadeWarm, 0.54, 0, 1.0);
        mb.addCylinder(px, py + 0.84, pz, 0.54, 0.40, 4.6, 8, PAL.whiteJade, 0.50, 0, 1.0);
        mb.setCollision(false);
        mb.addBox(px, py + 3.2, pz, 0.92, 2.4, 0.16, -a, PAL.arrayCyan, 0.20, 1.55, 2.0);
        registerFloatingCrystal(px, py + 6.45, pz, 'crystal_cyan', 0.88, false);
        mb.setCollision(true, 'building');
      }
    }

    // --- B) Five-Element Carved Spirit Pillars (五行聚灵碑柱) arcing along north plaza edge ---
    const elemSpecs = [
      { x: -26, z: -26, col: PAL.gold,          kind: 'crystal_gold' }, // 金
      { x: -13, z: -28, col: PAL.spiritJade,    kind: 'crystal_cyan' }, // 木
      { x:   0, z: -29, col: PAL.spiritAzure,   kind: 'crystal_cyan' }, // 水
      { x:  13, z: -28, col: PAL.spiritCrimson, kind: 'crystal_gold' }, // 火
      { x:  26, z: -26, col: PAL.spiritAmber,   kind: 'crystal_gold' }, // 土
    ];
    for (const el of elemSpecs) {
      const ey = T.getMeshTerrainHeight(el.x, el.z);
      mb.setCollision(true, 'building');
      mb.addCylinder(el.x, ey - 0.3, el.z, 1.35, 1.15, 0.72, 6, PAL.blueStoneDark, 0.64, 0, 1.0);
      mb.addCylinder(el.x, ey + 0.42, el.z, 0.62, 0.48, 3.6, 6, PAL.whiteJadeWarm, 0.54, 0, 1.0);
      mb.setCollision(false);
      mb.addBox(el.x, ey + 2.35, el.z, 0.34, 2.1, 0.34, 0, el.col, 0.18, 1.95, 2.0);
      mb.addCrystalSpire(el.x, ey + 4.0, el.z, 0.38, 1.45, 0, 0.4, 0, el.col, 2.15);
      mb.setCollision(true, 'building');
    }

    // --- C) Twin Crescent Jade Spirit-Lotus Pools & White-Jade Arched Bridges (-24,-48) & (+24,-48) ---
    for (const side of [-1, 1]) {
      const px = side * 24.0, pz = -48.0;
      const py = T.getMeshTerrainHeight(px, pz);
      mb.setCollision(true, 'building');
      // Carved white-jade octagonal pool rim wall
      for (let k = 0; k < 12; k++) {
        const a0 = (k / 12) * Math.PI * 2;
        const a1 = ((k + 1) / 12) * Math.PI * 2;
        const rx = px + Math.cos((a0 + a1) * 0.5) * 9.8;
        const rz = pz + Math.sin((a0 + a1) * 0.5) * 7.6;
        const ang = Math.atan2(Math.cos(a1) * 9.8 - Math.cos(a0) * 9.8, Math.sin(a1) * 7.6 - Math.sin(a0) * 7.6);
        mb.addBox(rx, py + 0.36, rz, 0.75, 0.84, 5.2, ang, PAL.whiteJade, 0.54, 0, 1.0);
      }
      mb.setCollision(false);
      // Glowing cyan-jade spirit water disc + floating lotus pads & luminous spirit lotuses!
      mb.addCylinder(px, py + 0.08, pz, 9.4, 9.4, 0.38, 20, PAL.poolWater, 0.16, 0.55, 2.0);
      for (let l = 0; l < 11; l++) {
        const la = l * 1.9 + side;
        const lr = 2.0 + (l % 4) * 1.6;
        const lx = px + Math.cos(la) * lr * 1.1;
        const lz = pz + Math.sin(la) * lr * 0.85;
        mb.addCylinder(lx, py + 0.48, lz, 0.72 + (l % 3) * 0.22, 0.72, 0.06, 8, PAL.lotusLeaf, 0.56, 0, 1.0);
        if (l % 2 === 0) {
          const isJade = l % 4 === 0;
          mb.addCylinder(lx, py + 0.54, lz, 0.34, 0.12, 0.38, 6, isJade ? PAL.spiritJade : PAL.lotusPink, 0.22, 1.65, 2.0);
        }
      }
      // Graceful White-Jade Arched Footbridge spanning across the pool!
      mb.setCollision(true, 'building');
      mb.addArchedBridge(px, py + 0.55, pz, 16.5, 3.4, 1.65, Math.PI * 0.5, 1);
    }

    // --- D) Giant Tripod Bronze Spirit Cauldron (聚灵青铜大鼎) at (0, -40) + Entrance Stele (0, +94) ---
    {
      const cy = T.getMeshTerrainHeight(0, -40);
      mb.setCollision(true, 'building');
      mb.addCylinder(0, cy - 0.3, -40, 3.6, 3.2, 0.85, 8, PAL.whiteJadeWarm, 0.54, 0, 1.0);
      mb.setCollision(false);
      for (let k = 0; k < 3; k++) {
        const ka = (k / 3) * Math.PI * 2;
        mb.addCylinder(Math.cos(ka) * 1.45, cy + 0.5, -40 + Math.sin(ka) * 1.45, 0.36, 0.28, 1.55, 8, PAL.bronze, 0.38, 0, 3.0);
      }
      mb.addCylinder(0, cy + 1.85, -40, 1.85, 2.25, 1.45, 14, PAL.bronze, 0.36, 0.08, 3.0);
      mb.addCylinder(0, cy + 3.20, -40, 2.35, 2.25, 0.28, 14, PAL.gold, 0.26, 0.18, 3.0);
      mb.addCylinder(0, cy + 3.32, -40, 1.55, 0.45, 1.35, 8, PAL.lanternWarm, 0.16, 2.35, 2.0); // Glowing spirit flame!
      mb.setCollision(true, 'building');
    }
    {
      // Carved Jade City Welcome Stele (青石仙城灵碑) at (0, +94)
      const sy = T.getMeshTerrainHeight(0, 94);
      mb.setCollision(true, 'building');
      mb.addBox(0, sy + 0.35, 94, 5.4, 0.90, 3.0, 0, PAL.whiteJade, 0.52, 0, 1.0);
      mb.addBox(0, sy + 3.45, 94, 2.8, 5.4, 0.72, 0, PAL.blueStoneDark, 0.56, 0, 1.0);
      mb.setCollision(false);
      mb.addBox(0, sy + 3.55, 94.39, 1.45, 3.8, 0.08, 0, PAL.arrayCyan, 0.18, 1.85, 2.0);
      mb.addBox(0, sy + 3.55, 93.61, 1.45, 3.8, 0.08, 0, PAL.arrayCyan, 0.18, 1.85, 2.0);
      mb.addCurvedRoof(0, sy + 6.1, 94, 4.4, 2.4, 1.15, 0, 0.24, 0.65, PAL.tileIndigo, PAL.gold, PAL.whiteJade);
      mb.setCollision(true, 'building');
    }
  }

  // =========================================================================
  // 5. 七大豪华可进入仙城殿阁与商馆 (全部中空室内 + 可开关大门 + 独特材质风格!)
  // =========================================================================

  // 1) 聚宝轩 · 灵宝阁 (0, -82): 白玉金碧重檐八角楼阁 + 悬浮金环 + 室内灵宝展台
  function buildJubaoTreasurePavilion(mb, cx, cz, rotY) {
    const y = T.getMeshTerrainHeight(cx, cz);
    const H = makeLocalHelper(mb, cx, y, cz, rotY);

    // 2-tier White-Jade Imperial Podium + Crimson-Carpeted Grand Staircase
    mb.setCollision(true, 'building');
    H.box(0, -0.15, 0, 28.4, 2.1, 22.4, PAL.whiteJadeWarm, 0.54, 0, 1.0);
    H.box(0,  1.15, 0, 26.8, 0.60, 20.8, PAL.whiteJade, 0.48, 0, 1.0);
    mb.addSteppedStairway(...H.pt(0, -0.05, 11.8), 8.2, 1.50, 3.4, 5, rotY, PAL.whiteJade, PAL.gold);
    const deckY = 1.45;
    mb.addCarvedBalustrade(...H.pt(-12.8, deckY, 9.8), ...H.pt(-4.2, deckY, 9.8), 1.05, PAL.whiteJade);
    mb.addCarvedBalustrade(...H.pt(  4.2, deckY, 9.8), ...H.pt(12.8, deckY, 9.8), 1.05, PAL.whiteJade);

    // Enterable Hollow Ground Floor Hall (22m × 16m, 5.8m tall, grand 4.8m double doors!)
    buildHollowRoom(mb, H, {
      deckY, width: 22.0, depth: 16.0, wallH: 5.8, doorW: 4.8, doorH: 4.2,
      wallCol: PAL.whiteJade, dadoCol: PAL.whiteJadeWarm, floorCol: PAL.whiteJade, trimCol: PAL.vermilion,
      doorLabel: '聚宝轩', doorStyle: 'door_grand', isDouble: true, rotY, lanternScale: 1.25,
    });

    // Exterior Vermilion Peristyle Pillars + Glowing Windows + Golden Signboard
    mb.setCollision(true, 'building');
    for (const px of [-11.8, -6.2, -3.2, 3.2, 6.2, 11.8]) {
      mb.addPillarWithBase(...H.pt(px, deckY, 9.2), 0.42, 5.9, PAL.vermilion, PAL.whiteJade, PAL.gold);
    }
    mb.setCollision(false);
    mb.addLatticeWindow(...H.pt(-7.2, deckY + 3.0, 8.08), 4.2, 2.8, rotY, PAL.gold, PAL.windowWarm, 1.35);
    mb.addLatticeWindow(...H.pt( 7.2, deckY + 3.0, 8.08), 4.2, 2.8, rotY, PAL.gold, PAL.windowWarm, 1.35);
    H.box(0, deckY + 5.2, 9.42, 6.0, 1.65, 0.24, PAL.vermilion, 0.44, 0, 1.30);
    H.box(0, deckY + 5.2, 9.52, 5.4, 1.25, 0.10, PAL.gold, 0.22, 0.35, 3.0);

    // --- Rich Furnished Interior of 聚宝轩 (拍卖展台 + 四件发光法宝模型 + 红毯) ---
    H.box(0, deckY + 0.04, 1.8, 4.4, 0.06, 11.6, PAL.carpetRed, 0.80, 0, 1.42); // Crimson runner carpet
    // Raised Jade Auction / Treasure Stage at back of hall
    mb.setCollision(true, 'building');
    H.box(0, deckY + 0.45, -4.8, 11.4, 0.90, 4.4, PAL.whiteJadeWarm, 0.48, 0, 1.0);
    mb.setCollision(false);
    H.box(0, deckY + 1.45, -4.8, 3.6, 1.10, 1.5, PAL.woodDark, 0.50, 0, 1.30); // Auctioneer lectern
    H.box(0, deckY + 2.08, -4.8, 3.8, 0.14, 1.7, PAL.gold, 0.26, 0.20, 3.0);
    // 4 Glowing Treasure Pedestals flanking the interior hall!
    const pedSpecs = [
      [-7.2, -1.8, PAL.arrayCyan], [-7.2, 2.8, PAL.gold],
      [ 7.2, -1.8, PAL.spiritJade], [ 7.2, 2.8, PAL.spiritCrimson],
    ];
    for (const [px, pz, pcol] of pedSpecs) {
      mb.setCollision(true, 'building');
      H.cyl(px, deckY, pz, 0.95, 0.82, 1.35, 8, PAL.whiteJadeWarm, 0.48, 0, 1.0);
      mb.setCollision(false);
      H.cyl(px, deckY + 1.35, pz, 0.98, 0.96, 0.14, 8, PAL.gold, 0.26, 0.20, 3.0);
      mb.addCrystalSpire(...H.pt(px, deckY + 1.65, pz), 0.36, 1.25, 0.1, 0.5, -0.1, pcol, 2.1);
    }

    // Lower Tier Golden-Jade Flying-Eave Roof + Upper Octagonal Crown Pavilion + Floating Golden Halo!
    mb.addCurvedRoof(...H.pt(0, deckY + 5.95, 0.4), 28.6, 22.8, 3.8, rotY, 0.28, 2.4, PAL.tileGoldJade, PAL.gold, PAL.whiteJade);
    const uY = deckY + 8.8;
    mb.addCylinder(...H.pt(0, uY, 0), 7.8, 7.6, 4.6, 8, PAL.vermilion, 0.46, 0, 1.30);
    mb.addCylinder(...H.pt(0, uY + 1.1, 0), 7.85, 7.85, 2.4, 8, PAL.windowWarm, 0.20, 1.45, 2.0);
    mb.addPagodaRoof(...H.pt(0, uY + 4.5, 0), 11.8, 4.8, 8, 0.28, 2.2, PAL.tileGoldJade, PAL.gold);
    registerFloatingCrystal(cx, y + uY + 10.6, cz, 'crystal_gold', 1.45, true, 3.2);
    mb.setCollision(true, 'building');
  }

  // 2) 藏经阁 · 五行功法楼 (-52, -64): 三层飞檐重楼 + 靛蓝瓦顶 + 门前两根朱红圆柱 + 木制书卷招牌 + 可进入室内藏书大厅!
  function buildCangjingPavilion(mb, cx, cz, rotY) {
    const y = T.getMeshTerrainHeight(cx, cz);
    const H = makeLocalHelper(mb, cx, y, cz, rotY);

    mb.setCollision(true, 'building');
    H.box(0, -0.20, 0, 26.8, 2.1, 20.6, PAL.blueStoneDark, 0.66, 0, 1.0);
    H.box(0,  1.10, 0, 25.2, 0.56, 19.2, PAL.whiteJadeWarm, 0.54, 0, 1.0);
    mb.addSteppedStairway(...H.pt(0, -0.05, 11.0), 7.6, 1.44, 3.2, 5, rotY, PAL.whiteJade, PAL.blueStone);
    const deckY = 1.38;
    mb.addCarvedBalustrade(...H.pt(-12.0, deckY, 9.2), ...H.pt(-3.9, deckY, 9.2), 1.0, PAL.whiteJade);
    mb.addCarvedBalustrade(...H.pt(  3.9, deckY, 9.2), ...H.pt(12.0, deckY, 9.2), 1.0, PAL.whiteJade);

    // Enterable Hollow 1st Floor Library (20.4m × 14.8m, 5.6m tall, 4.6m double doors!)
    buildHollowRoom(mb, H, {
      deckY, width: 20.4, depth: 14.8, wallH: 5.6, doorW: 4.6, doorH: 4.1, centerZ: -0.6,
      wallCol: PAL.creamWall, dadoCol: PAL.blueStone, floorCol: PAL.woodMid, trimCol: PAL.woodDark,
      doorLabel: '藏经阁', doorStyle: 'door_grand', isDouble: true, rotY, lanternScale: 1.15,
    });

    // TWO Iconic Vermilion Round Front Porch Pillars (门前立两根朱红圆柱) + Outer Pillars
    mb.setCollision(true, 'building');
    for (const px of [-3.4, 3.4]) {
      mb.addPillarWithBase(...H.pt(px, deckY, 8.4), 0.44, 5.75, PAL.vermilion, PAL.whiteJade, PAL.gold);
    }
    for (const px of [-10.8, 10.8]) {
      mb.addPillarWithBase(...H.pt(px, deckY, 8.4), 0.34, 5.75, PAL.woodDark, PAL.whiteJade, PAL.gold);
    }

    // Large Sculpted Wooden Scroll Signboard (木制书卷招牌) above porch entrance!
    mb.setCollision(false);
    const sbY = deckY + 4.95, sbZ = 8.65;
    H.box(0, sbY, sbZ, 5.8, 1.55, 0.24, PAL.woodDark, 0.50, 0, 1.30);
    H.box(0, sbY, sbZ + 0.12, 5.1, 1.22, 0.14, PAL.parchment, 0.52, 0.16, 1.30);
    for (const sX of [-1, 1]) {
      H.cyl(sX * 2.95, sbY - 0.96, sbZ + 0.08, 0.20, 0.20, 1.92, 10, PAL.woodDark, 0.44, 0, 1.30);
      H.cyl(sX * 2.95, sbY + 0.96, sbZ + 0.08, 0.24, 0.16, 0.22, 10, PAL.gold, 0.24, 0.25, 3.0);
      H.cyl(sX * 2.95, sbY - 1.18, sbZ + 0.08, 0.16, 0.24, 0.22, 10, PAL.gold, 0.24, 0.25, 3.0);
    }
    for (const gx of [-1.45, 0, 1.45]) {
      H.box(gx, sbY, sbZ + 0.22, 0.52, 0.68, 0.06, PAL.tileIndigo, 0.30, 0.40, 1.30);
    }
    mb.addLatticeWindow(...H.pt(-6.6, deckY + 2.9, 6.88), 3.8, 2.5, rotY, PAL.woodDark, PAL.windowWarm, 1.20);
    mb.addLatticeWindow(...H.pt( 6.6, deckY + 2.9, 6.88), 3.8, 2.5, rotY, PAL.woodDark, PAL.windowWarm, 1.20);

    // --- Furnished 1st Floor Library Interior (6 排高大功法书架 + 五行玉简案台!) ---
    H.box(0, deckY + 0.04, 0.6, 4.2, 0.05, 11.4, PAL.carpetTeal, 0.80, 0, 1.42);
    const shelfPos = [[-7.6, -4.5], [-7.6, -0.5], [-7.6, 3.4], [7.6, -4.5], [7.6, -0.5], [7.6, 3.4]];
    for (const [sx, sz] of shelfPos) {
      mb.setCollision(true, 'building');
      H.box(sx, deckY + 1.95, sz, 1.15, 3.9, 3.1, PAL.woodDark, 0.56, 0, 1.30);
      mb.setCollision(false);
      // Colored & softly glowing martial-art manual scrolls stacked along 4 shelves!
      for (let row = 0; row < 4; row++) {
        const ry = deckY + 0.65 + row * 0.85;
        const scCol = [PAL.gold, PAL.spiritJade, PAL.spiritAzure, PAL.parchment][row % 4];
        H.box(sx + (sx < 0 ? 0.45 : -0.45), ry, sz, 0.34, 0.44, 2.6, scCol, 0.52, row % 2 === 0 ? 0.35 : 0.08, 1.30);
      }
    }
    // Central Five-Element Jade-Slip Altar Table (五行功法玉简台) at back center
    mb.setCollision(true, 'building');
    H.box(0, deckY + 0.65, -5.2, 7.6, 1.30, 1.95, PAL.woodDark, 0.52, 0, 1.30);
    mb.setCollision(false);
    H.box(0, deckY + 1.34, -5.2, 7.9, 0.14, 2.15, PAL.gold, 0.28, 0.15, 3.0);
    const slipCols = [PAL.gold, PAL.spiritJade, PAL.spiritAzure, PAL.spiritCrimson, PAL.spiritAmber];
    for (let k = 0; k < 5; k++) {
      const kx = -2.8 + k * 1.4;
      H.boxEuler(kx, deckY + 1.72, -5.2, 0.55, 0.72, 0.12, -0.35, 0, 0, slipCols[k], 0.20, 1.65, 2.0);
    }

    // Towering 3-Tier Indigo-Blue Glazed Flying-Eave Roofs (三层靛蓝色飞檐瓦顶)!
    mb.addCurvedRoof(...H.pt(0, deckY + 5.75, 0.2), 26.6, 20.6, 3.4, rotY, 0.26, 2.1, PAL.tileIndigo, PAL.gold, PAL.whiteJade);
    // 2nd Floor
    const f2Y = deckY + 8.2, f2H = 4.2;
    H.box(0, f2Y + f2H * 0.5, -0.4, 15.6, f2H, 11.4, PAL.creamWall, 0.60, 0, 1.42);
    mb.addCarvedBalustrade(...H.pt(-9.2, f2Y, 6.4), ...H.pt(9.2, f2Y, 6.4), 0.92, PAL.vermilion);
    mb.addLatticeWindow(...H.pt(0, f2Y + 2.1, 5.38), 9.6, 2.2, rotY, PAL.woodDark, PAL.windowWarm, 1.25);
    mb.addCurvedRoof(...H.pt(0, f2Y + f2H + 0.06, -0.4), 21.8, 16.6, 3.2, rotY, 0.28, 2.0, PAL.tileIndigo, PAL.gold, PAL.whiteJade);
    // 3rd Floor
    const f3Y = f2Y + f2H + 2.4, f3H = 3.4;
    H.box(0, f3Y + f3H * 0.5, -0.4, 10.6, f3H, 8.0, PAL.vermilion, 0.50, 0, 1.30);
    mb.addLatticeWindow(...H.pt(0, f3Y + 1.7, 3.68), 6.4, 1.8, rotY, PAL.woodDark, PAL.windowWarm, 1.35);
    mb.addCurvedRoof(...H.pt(0, f3Y + f3H + 0.06, -0.4), 16.2, 12.8, 4.0, rotY, 0.28, 2.2, PAL.tileIndigo, PAL.gold, PAL.whiteJade);
    registerFloatingCrystal(cx, y + f3Y + f3H + 5.2, cz - 0.4, 'crystal_cyan', 1.15, true, 2.1);

    for (const lx of [-9.6, -3.4, 3.4, 9.6]) {
      addSquareLantern(mb, ...H.pt(lx, deckY + 5.55, 9.6), 1.05, rotY);
    }
    mb.setCollision(true, 'building');
  }

  // 3) 执事大殿 · 悬赏破境堂 (+52, -64): 宏伟重檐大堂 + 深木大门 + 左侧显眼悬赏告示牌 + 室内执事高台与破境蒲团!
  function buildZhishiGrandHall(mb, cx, cz, rotY) {
    const y = T.getMeshTerrainHeight(cx, cz);
    const H = makeLocalHelper(mb, cx, y, cz, rotY);

    mb.setCollision(true, 'building');
    H.box(0, -0.20, 0, 32.0, 2.1, 20.6, PAL.blueStoneDark, 0.68, 0, 1.0);
    H.box(0,  1.10, 0, 30.6, 0.56, 19.2, PAL.blueStoneLite, 0.58, 0, 1.0);
    mb.addSteppedStairway(...H.pt(0, -0.05, 11.0), 9.6, 1.44, 3.2, 5, rotY, PAL.whiteJadeWarm, PAL.blueStone);
    const deckY = 1.38;

    // Enterable Hollow Grand Hall (26.4m × 14.8m, 6.2m tall, massive 5.0m dark-wood double doors!)
    buildHollowRoom(mb, H, {
      deckY, width: 26.4, depth: 14.8, wallH: 6.2, doorW: 5.0, doorH: 4.4, centerZ: -0.6,
      wallCol: PAL.sandstone, dadoCol: PAL.blueStoneDark, floorCol: PAL.blueStoneLite, trimCol: PAL.woodDark,
      doorLabel: '执事大殿', doorStyle: 'door_grand', isDouble: true, rotY, lanternScale: 1.25,
    });

    // Grand Front Veranda Colonnade
    mb.setCollision(true, 'building');
    for (const px of [-12.8, -7.8, -3.6, 3.6, 7.8, 12.8]) {
      mb.addPillarWithBase(...H.pt(px, deckY, 8.4), 0.38, 6.25, PAL.woodDark, PAL.blueStoneLite, PAL.bronze);
    }
    mb.setCollision(false);
    mb.addLatticeWindow(...H.pt(-8.4, deckY + 3.2, 6.88), 5.2, 2.8, rotY, PAL.woodDark, PAL.windowWarm, 1.15);
    mb.addLatticeWindow(...H.pt( 8.4, deckY + 3.2, 6.88), 5.2, 2.8, rotY, PAL.woodDark, PAL.windowWarm, 1.15);
    // Overhead Plaque
    H.box(0, deckY + 5.4, 8.65, 5.8, 1.5, 0.22, PAL.woodDark, 0.48, 0, 1.30);
    H.box(0, deckY + 5.4, 8.75, 5.2, 1.12, 0.08, PAL.gold, 0.26, 0.18, 3.0);
    H.box(0, deckY + 5.4, 8.79, 4.8, 0.88, 0.06, [0.16, 0.14, 0.12], 0.44, 0, 1.30);

    // --- Furnished Grand Hall Interior (执事长老台 + 破境聚灵蒲团 + 灵香炉) ---
    // Elevated Elder's Dais at rear center
    mb.setCollision(true, 'building');
    H.box(0, deckY + 0.45, -5.2, 12.8, 0.90, 4.2, PAL.blueStone, 0.56, 0, 1.0);
    H.box(0, deckY + 1.48, -5.0, 5.6, 1.15, 1.5, PAL.woodDark, 0.52, 0, 1.30); // Elder Desk
    mb.setCollision(false);
    H.box(0, deckY + 2.22, -5.0, 0.72, 0.45, 0.72, PAL.spiritJade, 0.22, 1.45, 2.0); // Glowing Official Jade Seal
    // 4 Glowing Breakthrough Meditation Cushions (破境聚灵蒲团) on the main floor!
    for (const [mx, mz] of [[-5.6, 0.5], [-2.0, 0.5], [2.0, 0.5], [5.6, 0.5]]) {
      H.cyl(mx, deckY + 0.02, mz, 1.15, 1.08, 0.18, 12, PAL.carpetRed, 0.76, 0, 1.42);
      H.cyl(mx, deckY + 0.20, mz, 0.82, 0.76, 0.14, 12, PAL.gold, 0.34, 0.55, 2.0);
    }

    // Sweeping Double-Eave Bronze-Slate Roof (重檐宽阔灰瓦大顶)!
    mb.addCurvedRoof(...H.pt(0, deckY + 6.30, 0.2), 33.4, 21.8, 3.8, rotY, 0.24, 2.2, PAL.tileBronze, PAL.gold, PAL.whiteJadeWarm);
    H.box(0, deckY + 10.2, -0.4, 20.4, 2.4, 10.6, PAL.woodDark, 0.56, 0, 1.30);
    addGabledTileRoof(mb, cx, y + deckY + 11.4, cz - 0.4, 24.8, 14.4, 4.4, rotY, PAL.tileBronze, PAL.sandstone, PAL.gold);

    for (const lx of [-7.8, -3.6, 3.6, 7.8]) {
      addSquareLantern(mb, ...H.pt(lx, deckY + 6.1, 9.6), 1.08, rotY);
    }

    // PROMINENT Roof-Sheltered Wooden Bounty Noticeboard on front-left (门口左侧显眼的木制悬赏告示牌)!
    const bp = H.pt(-10.2, 0, 13.0);
    const by = T.getMeshTerrainHeight(bp[0], bp[2]);
    const bRot = rotY + 0.20;
    const BH = makeLocalHelper(mb, bp[0], by, bp[2], bRot);
    mb.setCollision(true, 'building');
    for (const sx of [-2.35, 2.35]) {
      BH.box(sx, 0.30, 0, 0.72, 0.68, 0.72, PAL.blueStoneDark, 0.68, 0, 1.0);
      BH.box(sx, 2.25, 0, 0.32, 4.2, 0.32, PAL.woodDark, 0.56, 0, 1.30);
    }
    BH.box(0, 2.55, 0, 4.6, 2.45, 0.22, PAL.woodMid, 0.60, 0, 1.30);
    mb.setCollision(false);
    BH.box(0, 3.78, 0, 5.0, 0.22, 0.32, PAL.woodDark, 0.54, 0, 1.30);
    BH.box(0, 1.32, 0, 5.0, 0.22, 0.32, PAL.woodDark, 0.54, 0, 1.30);
    const slips = [
      [-1.55, 3.00, 0.84, 0.98,  0.04, true], [-0.48, 2.94, 0.88, 1.02, -0.05, false],
      [ 0.62, 3.04, 0.82, 0.94,  0.03, true], [ 1.62, 2.96, 0.78, 0.90, -0.04, true],
      [-1.25, 1.88, 0.86, 0.88, -0.05, false],[ 0.04, 1.92, 0.92, 0.92,  0.04, true],
      [ 1.30, 1.90, 0.82, 0.86, -0.03, false],
    ];
    for (const [sx, sy, sw, sh, tilt, seal] of slips) {
      BH.boxEuler(sx, sy, 0.14, sw, sh, 0.04, 0, 0, tilt, PAL.parchment, 0.66, 0.12, 1.42);
      if (seal) BH.boxEuler(sx + sw * 0.24, sy - sh * 0.26, 0.17, 0.18, 0.18, 0.03, 0, 0, tilt, PAL.vermilion, 0.42, 0.35, 1.0);
    }
    addGabledTileRoof(mb, bp[0], by + 4.15, bp[2], 5.8, 2.3, 1.05, bRot, PAL.tileBronze, PAL.woodDark, PAL.gold);
    addSquareLantern(mb, ...BH.pt(2.65, 4.12, 0.72), 0.78, bRot);
    mb.setCollision(true, 'building');
  }

  // 4) 百草阁 · 丹药仙馆 (-54, +24): 翠绿琉璃瓦仙馆 + 室外翠绿布篷草药摊 + 可进入室内药柜丹坊!
  function buildBaicaoHallAndMarket(mb, cx, cz, rotY) {
    const y = T.getMeshTerrainHeight(cx, cz);
    const H = makeLocalHelper(mb, cx, y, cz, rotY);

    // Raised Stone Floor Pad + Smooth Entry Step
    mb.setCollision(true, 'building');
    H.box(0, 0.12, 0.6, 22.8, 0.68, 17.6, PAL.blueStoneLite, 0.60, 0, 1.0);
    const deckY = 0.46;

    // Enterable Hollow Apothecary Hall (18.4m × 11.4m, 4.8m tall, 3.8m shop double doors!)
    buildHollowRoom(mb, H, {
      deckY, width: 18.4, depth: 11.4, wallH: 4.8, doorW: 3.8, doorH: 3.5, centerZ: -2.0,
      wallCol: PAL.creamWall, dadoCol: PAL.clothGreen, floorCol: PAL.woodRaw, trimCol: PAL.woodDark,
      doorLabel: '百草阁', doorStyle: 'door_shop', isDouble: true, rotY, lanternScale: 1.0,
    });
    // Emerald-Jade Glazed Flying-Eave Roof over main hall!
    mb.addCurvedRoof(...H.pt(0, deckY + 4.86, -2.0), 22.2, 15.2, 3.6, rotY, 0.25, 1.8, PAL.tileJade, PAL.gold, PAL.creamWall);

    // Attached Outdoor Emerald Cloth-Canopy Herb Market Veranda (翠绿色斜坡布篷摊位) in front (+Z)!
    mb.setCollision(true, 'building');
    for (const lx of [-8.4, -3.2, 3.2, 8.4]) {
      H.cyl(lx, deckY, 7.6, 0.20, 0.18, 3.35, 8, PAL.woodDark, 0.56, 0, 1.30);
    }
    addSlopedAwning(mb, ...H.pt(0, deckY, 5.7), 18.6, 4.6, 4.45, 3.35, rotY, PAL.clothGreen, PAL.clothGreenLit, 12);

    // Outdoor Counter, Terracotta Herb Jars (小陶罐) & Glowing Spirit-Herb Baskets (微光灵草篮) flanking the doorway!
    mb.setCollision(true, 'building');
    H.box(-5.6, deckY + 0.56, 6.2, 5.2, 1.12, 1.25, PAL.woodMid, 0.58, 0, 1.30);
    H.box( 5.6, deckY + 0.56, 6.2, 5.2, 1.12, 1.25, PAL.woodMid, 0.58, 0, 1.30);
    mb.setCollision(false);
    for (const [jx, jz, jr, jh] of [[-7.2, 6.1, 0.28, 0.58], [-6.4, 6.3, 0.22, 0.44], [-4.1, 6.2, 0.26, 0.52], [4.2, 6.1, 0.25, 0.50], [6.8, 6.2, 0.30, 0.62]]) {
      H.cyl(jx, deckY + 1.12, jz, jr * 0.72, jr, jh * 0.58, 10, PAL.terracotta, 0.66, 0, 1.0);
      H.cyl(jx, deckY + 1.12 + jh * 0.58, jz, jr, jr * 0.60, jh * 0.32, 10, PAL.terracotta, 0.64, 0, 1.0);
      H.cyl(jx, deckY + 1.12 + jh * 0.88, jz, jr * 0.66, jr * 0.64, 0.12, 10, PAL.woodDark, 0.56, 0, 1.30);
    }
    for (const [bx, by, bz, br] of [[-5.3, deckY + 1.12, 6.2, 0.52], [5.5, deckY + 1.12, 6.2, 0.52], [-3.2, deckY, 8.3, 0.68], [3.2, deckY, 8.3, 0.68]]) {
      H.cyl(bx, by, bz, br * 0.78, br, br * 0.85, 10, PAL.basketTan, 0.76, 0, 1.30);
      for (let k = 0; k < 5; k++) {
        const ka = (k / 5) * Math.PI * 2;
        H.boxEuler(bx + Math.cos(ka) * br * 0.42, by + br * 0.96, bz + Math.sin(ka) * br * 0.42, br * 0.32, br * 0.58, br * 0.14, 0.32, ka, 0.18, PAL.spiritJade, 0.24, 1.45, 2.0);
      }
    }

    // --- Furnished Interior of 百草阁 (整面百草药柜 + 炼药长案 + 发光玉药瓶!) ---
    mb.setCollision(true, 'building');
    H.box(0, deckY + 1.85, -6.8, 13.8, 3.7, 1.25, PAL.woodDark, 0.56, 0, 1.30); // Massive Back Apothecary Cabinet
    H.box(0, deckY + 0.60, -2.6, 8.4, 1.20, 1.45, PAL.woodMid, 0.58, 0, 1.30);  // Center Alchemy Counter
    mb.setCollision(false);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        H.box(-5.6 + c * 1.6, deckY + 0.62 + r * 0.80, -6.12, 1.32, 0.62, 0.08, PAL.woodMid, 0.56, 0, 1.30);
        H.box(-5.6 + c * 1.6, deckY + 0.62 + r * 0.80, -6.06, 0.18, 0.12, 0.06, PAL.gold, 0.28, 0.16, 3.0);
      }
    }
    for (const gx of [-2.8, -1.2, 0.4, 2.0]) {
      H.cyl(gx, deckY + 1.20, -2.6, 0.22, 0.18, 0.52, 8, PAL.spiritJade, 0.20, 1.55, 2.0);
    }
    for (const lx of [-8.0, 8.0]) addSquareLantern(mb, ...H.pt(lx, deckY + 3.25, 8.1), 0.90, rotY);
    mb.setCollision(true, 'building');
  }

  // 5) 天工坊 · 炼器神殿 (+54, +24): 玄黑玄武岩 + 赤红琉璃顶 + 室外黑铁打铁墩/微光丹炉/蓝绿矿晶 + 室内炼器火炉与灵剑架!
  function buildTiangongHallAndForge(mb, cx, cz, rotY) {
    const y = T.getMeshTerrainHeight(cx, cz);
    const H = makeLocalHelper(mb, cx, y, cz, rotY);

    // Stone Masonry Forge Terrace (石砌矮台)
    mb.setCollision(true, 'building');
    H.box(0, 0.20, 0.6, 23.0, 0.84, 18.0, PAL.basaltDark, 0.72, 0, 1.0);
    const deckY = 0.62;
    mb.addSteppedStairway(...H.pt(0, -0.04, 10.2), 6.2, 0.66, 1.6, 3, rotY, PAL.blueStoneLite, PAL.basaltDark);

    // Enterable Hollow Smithy Hall (18.4m × 11.4m, 4.9m tall, dark basalt walls + crimson-gold roof!)
    buildHollowRoom(mb, H, {
      deckY, width: 18.4, depth: 11.4, wallH: 4.9, doorW: 3.8, doorH: 3.6, centerZ: -2.0,
      wallCol: PAL.paleSlateWall, dadoCol: PAL.basaltDark, floorCol: PAL.blueStoneDark, trimCol: PAL.ironBlack,
      doorLabel: '天工坊', doorStyle: 'door_shop', isDouble: true, rotY, lanternScale: 1.05,
    });
    mb.addCurvedRoof(...H.pt(0, deckY + 4.96, -2.0), 22.4, 15.2, 3.6, rotY, 0.24, 1.8, PAL.tileCrimson, PAL.gold, PAL.basaltDark);

    // Outdoor Crimson-Red Sloped Forge Awning (赤红色斜坡顶棚)
    mb.setCollision(true, 'building');
    for (const lx of [-8.4, -3.2, 3.2, 8.4]) {
      H.cyl(lx, deckY, 7.6, 0.24, 0.21, 3.45, 8, PAL.woodDark, 0.56, 0, 1.30);
    }
    addSlopedAwning(mb, ...H.pt(0, deckY, 5.7), 18.8, 4.8, 4.55, 3.45, rotY, PAL.clothRed, PAL.clothRedDark, 12);

    // Outdoor Stone Display Counter with Blue & Green Glowing Ore Crystal Samples (蓝/绿矿晶样品)
    mb.setCollision(true, 'building');
    H.box(-5.8, deckY + 0.54, 6.2, 5.2, 1.08, 1.35, PAL.blueStoneDark, 0.68, 0, 1.0);
    mb.setCollision(false);
    for (let k = 0; k < 4; k++) {
      const ox = -7.6 + k * 1.2;
      const ocol = k % 2 === 0 ? PAL.spiritJade : PAL.spiritAzure;
      H.box(ox, deckY + 1.22, 6.2, 0.65, 0.30, 0.55, PAL.basaltDark, 0.78, 0, 1.0);
      mb.addCrystalSpire(...H.pt(ox, deckY + 1.34, 6.2), 0.24, 0.78, 0.14, k * 1.4, -0.12, ocol, 1.85);
    }

    // Outdoor Black-Iron Blacksmith Anvil (小型黑铁打铁墩) + Hammer at front-left!
    mb.setCollision(true, 'building');
    H.cyl(-5.8, deckY, 8.3, 0.64, 0.58, 0.85, 10, PAL.woodDark, 0.74, 0, 1.30);
    mb.setCollision(false);
    H.box(-5.8, deckY + 0.98, 8.3, 1.05, 0.24, 0.62, PAL.ironBlack, 0.40, 0, 3.0);
    H.box(-5.8, deckY + 1.20, 8.3, 0.62, 0.30, 0.42, PAL.ironBlack, 0.38, 0, 3.0);
    H.box(-5.8, deckY + 1.44, 8.3, 1.35, 0.26, 0.56, PAL.ironBlack, 0.34, 0, 3.0);
    H.boxEuler(-4.95, deckY + 1.46, 8.3, 0.56, 0.20, 0.30, 0, 0, 0.12, PAL.ironBlack, 0.34, 0, 3.0);

    // Outdoor Glowing Tripod Bronze Pill/Forging Furnace (微光小丹炉) at front-right!
    mb.setCollision(true, 'building');
    H.cyl(6.0, deckY, 7.2, 1.25, 1.18, 0.32, 10, PAL.basaltDark, 0.68, 0, 1.0);
    mb.setCollision(false);
    for (let k = 0; k < 3; k++) {
      const ka = (k / 3) * Math.PI * 2;
      H.cyl(6.0 + Math.cos(ka) * 0.58, deckY + 0.30, 7.2 + Math.sin(ka) * 0.58, 0.15, 0.11, 0.65, 6, PAL.bronze, 0.40, 0, 3.0);
    }
    H.cyl(6.0, deckY + 0.86, 7.2, 0.72, 0.94, 0.62, 12, PAL.bronze, 0.36, 0.08, 3.0);
    H.cyl(6.0, deckY + 1.48, 7.2, 0.94, 0.68, 0.56, 12, PAL.bronze, 0.36, 0.08, 3.0);
    for (let k = 0; k < 4; k++) {
      const ka = k * Math.PI * 0.5;
      H.box(6.0 + Math.cos(ka) * 0.86, deckY + 1.38, 7.2 + Math.sin(ka) * 0.86, 0.34, 0.26, 0.14, PAL.spiritCrimson, 0.18, 2.25, 2.0, -ka);
    }
    H.cyl(6.0, deckY + 2.02, 7.2, 0.70, 0.32, 0.44, 12, PAL.ironBlack, 0.42, 0, 3.0);
    H.cyl(6.0, deckY + 2.46, 7.2, 0.16, 0.08, 0.28, 8, PAL.gold, 0.26, 0.40, 3.0);

    // --- Furnished Interior of 天工坊 (炙热炼器火炉 + 双排灵剑法宝展架!) ---
    mb.setCollision(true, 'building');
    H.box(0, deckY + 1.45, -6.6, 5.2, 2.9, 2.2, PAL.basaltDark, 0.74, 0, 1.0); // Rear Blazing Forge Hearth
    mb.setCollision(false);
    H.box(0, deckY + 1.15, -5.45, 2.8, 1.35, 0.32, PAL.spiritCrimson, 0.16, 2.35, 2.0); // Glowing Lava-Ember Core!
    for (const sx of [-6.4, 6.4]) {
      H.box(sx, deckY + 1.5, -2.5, 0.45, 2.8, 5.4, PAL.woodDark, 0.58, 0, 1.30); // Weapon Racks
      for (const rz of [-4.2, -2.5, -0.8]) {
        H.box(sx + (sx < 0 ? 0.34 : -0.34), deckY + 1.8, rz, 0.12, 2.1, 0.16, PAL.arrayCyan, 0.22, 1.15, 2.0);
      }
    }
    for (const lx of [-8.0, 8.0]) addSquareLantern(mb, ...H.pt(lx, deckY + 3.35, 8.1), 0.94, rotY);
    mb.setCollision(true, 'building');
  }

  // 6) 万兽斋 · 灵兽宝阁 (-54, +68): 砂岩粗木猎殿 + 室外土黄兽皮棚/捆扎木箱/巨型兽角兽骨 + 室内妖丹陈列馆!
  function buildWanshouHallAndLodge(mb, cx, cz, rotY) {
    const y = T.getMeshTerrainHeight(cx, cz);
    const H = makeLocalHelper(mb, cx, y, cz, rotY);

    mb.setCollision(true, 'building');
    H.box(0, 0.12, 0.6, 22.8, 0.68, 17.6, PAL.sandstone, 0.72, 0, 1.0);
    const deckY = 0.46;

    // Enterable Hollow Beast-Materials Lodge (warm sandstone & heavy rough timber!)
    buildHollowRoom(mb, H, {
      deckY, width: 18.4, depth: 11.4, wallH: 4.8, doorW: 3.8, doorH: 3.5, centerZ: -2.0,
      wallCol: PAL.ochreWall, dadoCol: PAL.sandstone, floorCol: PAL.woodRaw, trimCol: PAL.woodDark,
      doorLabel: '万兽斋', doorStyle: 'door_shop', isDouble: true, rotY, lanternScale: 1.0,
    });
    addGabledTileRoof(mb, ...H.pt(0, deckY + 4.84, -2.0), 21.4, 14.4, 3.6, rotY, PAL.tileBrown, PAL.ochreWall, PAL.boneIvory);

    // Rugged Rough-Log Veranda & Ochre Beast-Hide Canopy (粗木架土黄色兽皮感顶棚)
    mb.setCollision(true, 'building');
    for (const lx of [-8.4, -3.2, 3.2, 8.4]) {
      H.cyl(lx, deckY, 7.6, 0.28, 0.24, 3.45, 7, PAL.woodRaw, 0.80, 0, 1.30);
    }
    addSlopedAwning(mb, ...H.pt(0, deckY, 5.7), 18.6, 4.6, 4.45, 3.35, rotY, PAL.hideOchre, PAL.hideDark, 10);

    // Outdoor Stacked Strapped Wooden Crates (捆扎木箱) + Colossal Curved Beast-Horn Trophy Arch (大型兽骨/兽角)!
    const crates = [[5.4, 0, 6.2, 1.45, 0.14], [7.0, 0, 6.5, 1.30, -0.18], [6.2, 1.45, 6.3, 1.10, 0.30], [-6.8, 0, 6.4, 1.42, 0.10]];
    for (const [kx, ky, kz, ks, kyaw] of crates) {
      mb.setCollision(true, 'building');
      H.box(kx, deckY + ky + ks * 0.5, kz, ks, ks, ks, PAL.woodRaw, 0.78, 0, 1.30, kyaw);
      mb.setCollision(false);
      H.box(kx, deckY + ky + ks * 0.5, kz, ks + 0.06, 0.14, ks + 0.06, PAL.woodDark, 0.72, 0, 1.30, kyaw);
      H.box(kx, deckY + ky + ks * 0.5, kz, 0.16, ks + 0.06, ks + 0.06, PAL.ironBlack, 0.50, 0, 3.0, kyaw);
    }
    // Giant Curved Trophy Horns overarching the entrance & mounted on outdoor bone rack!
    mb.setCollision(false);
    for (const s of [-1, 1]) {
      let hx = s * 1.1, hy = deckY + 3.65, hz = 8.0, hr = 0.26;
      for (let seg = 0; seg < 5; seg++) {
        const nx = hx + s * 0.62, ny = hy + 0.28 + seg * 0.10, nz = hz + 0.18;
        mb.addTaperedTube(H.pt(hx, hy, hz), H.pt(nx, ny, nz), hr, hr * 0.72, 7, PAL.boneIvory, 0.50, 0, 1.0);
        hx = nx; hy = ny; hz = nz; hr *= 0.72;
      }
    }
    // Giant Beast Bone Display Rack at front-left (-5.2, 7.6)
    mb.addTaperedTube(H.pt(-6.2, deckY + 0.3, 8.2), H.pt(-4.0, deckY + 1.8, 7.8), 0.20, 0.16, 8, PAL.boneIvory, 0.50, 0, 1.0);
    H.box(-6.2, deckY + 0.32, 8.2, 0.44, 0.38, 0.38, PAL.boneIvory, 0.50, 0, 1.0);
    H.box(-4.0, deckY + 1.82, 7.8, 0.40, 0.36, 0.36, PAL.boneIvory, 0.50, 0, 1.0);

    // --- Furnished Interior of 万兽斋 (发光妖丹陈列台 + 兽皮卷架!) ---
    mb.setCollision(true, 'building');
    H.box(0, deckY + 0.62, -4.6, 9.6, 1.24, 1.65, PAL.woodRaw, 0.72, 0, 1.30);
    mb.setCollision(false);
    for (let k = 0; k < 5; k++) {
      const dx = -3.6 + k * 1.8;
      H.cyl(dx, deckY + 1.24, -4.6, 0.34, 0.30, 0.14, 8, PAL.woodDark, 0.56, 0, 1.30);
      H.cyl(dx, deckY + 1.40, -4.6, 0.24, 0.24, 0.36, 10, k % 2 === 0 ? PAL.spiritJade : PAL.spiritAzure, 0.18, 1.85, 2.0);
    }
    for (const lx of [-8.0, 8.0]) addSquareLantern(mb, ...H.pt(lx, deckY + 3.25, 8.1), 0.92, rotY);
    mb.setCollision(true, 'building');
  }

  // 7) 醉仙楼 · 灵茶酒肆 (+54, +68): 二层丹朱金檐酒茶仙楼 + 可进入室内茶桌灵酒柜台!
  function buildZuixianTavern(mb, cx, cz, rotY) {
    const y = T.getMeshTerrainHeight(cx, cz);
    const H = makeLocalHelper(mb, cx, y, cz, rotY);

    mb.setCollision(true, 'building');
    H.box(0, 0.14, 0, 22.4, 0.76, 16.4, PAL.whiteJadeWarm, 0.58, 0, 1.0);
    const deckY = 0.52;

    buildHollowRoom(mb, H, {
      deckY, width: 18.8, depth: 12.6, wallH: 4.8, doorW: 3.8, doorH: 3.5, centerZ: -0.6,
      wallCol: PAL.creamWall, dadoCol: PAL.cinnabar, floorCol: PAL.woodMid, trimCol: PAL.cinnabar,
      doorLabel: '醉仙楼', doorStyle: 'door_shop', isDouble: true, rotY, lanternScale: 1.05,
    });

    // Ornate Front Veranda Pillars + Glowing Crimson Lanterns
    mb.setCollision(true, 'building');
    for (const px of [-8.8, -3.2, 3.2, 8.8]) {
      mb.addPillarWithBase(...H.pt(px, deckY, 7.2), 0.32, 4.9, PAL.cinnabar, PAL.whiteJade, PAL.gold);
    }
    mb.setCollision(false);
    mb.addLatticeWindow(...H.pt(-6.2, deckY + 2.5, 5.78), 3.6, 2.2, rotY, PAL.cinnabar, PAL.windowWarm, 1.35);
    mb.addLatticeWindow(...H.pt( 6.2, deckY + 2.5, 5.78), 3.6, 2.2, rotY, PAL.cinnabar, PAL.windowWarm, 1.35);

    // --- Furnished Interior of 醉仙楼 (灵酒茶吧台 + 四张仙茶圆桌与木凳!) ---
    mb.setCollision(true, 'building');
    H.box(0, deckY + 0.58, -5.2, 10.6, 1.16, 1.45, PAL.cinnabar, 0.50, 0, 1.30);
    mb.setCollision(false);
    for (const jx of [-3.6, -1.8, 0, 1.8, 3.6]) {
      H.cyl(jx, deckY + 1.16, -5.2, 0.24, 0.16, 0.56, 8, PAL.gold, 0.24, 0.65, 3.0); // Golden spirit-wine flagons
    }
    for (const [tx, tz] of [[-5.6, -0.4], [-5.6, 3.0], [5.6, -0.4], [5.6, 3.0]]) {
      mb.setCollision(true, 'building');
      H.cyl(tx, deckY, tz, 1.05, 1.05, 0.88, 10, PAL.woodDark, 0.52, 0, 1.30);
      mb.setCollision(false);
      H.cyl(tx, deckY + 0.88, tz, 0.22, 0.18, 0.30, 8, PAL.arrayCyan, 0.22, 0.95, 2.0); // Spirit teacup glow
      for (const s of [-1.45, 1.45]) {
        H.cyl(tx + s, deckY, tz, 0.34, 0.34, 0.52, 8, PAL.woodMid, 0.58, 0, 1.30);
      }
    }

    // Double-Story Cinnabar & Crimson-Gold Flying-Eave Roofs
    mb.addCurvedRoof(...H.pt(0, deckY + 4.92, 0.3), 23.6, 17.8, 3.1, rotY, 0.26, 1.8, PAL.tileCrimson, PAL.gold, PAL.creamWall);
    const f2Y = deckY + 7.2, f2H = 3.8;
    H.box(0, f2Y + f2H * 0.5, -0.4, 14.2, f2H, 9.6, PAL.cinnabar, 0.48, 0, 1.30);
    mb.addCarvedBalustrade(...H.pt(-8.2, f2Y, 5.6), ...H.pt(8.2, f2Y, 5.6), 0.88, PAL.gold);
    mb.addLatticeWindow(...H.pt(0, f2Y + 1.9, 4.48), 8.8, 2.0, rotY, PAL.woodDark, PAL.windowWarm, 1.45);
    mb.addCurvedRoof(...H.pt(0, f2Y + f2H + 0.06, -0.4), 19.6, 14.4, 3.6, rotY, 0.28, 2.0, PAL.tileCrimson, PAL.gold, PAL.creamWall);
    for (const lx of [-8.4, -3.2, 3.2, 8.4]) addSquareLantern(mb, ...H.pt(lx, deckY + 4.78, 7.8), 1.0, rotY, PAL.spiritAmber);
    mb.setCollision(true, 'building');
  }

  // =========================================================================
  // 6. 十栋风格各异的可进入散修洞府与仙城民居 (4 套完全不同材质与屋顶风格!)
  // =========================================================================
  const HOUSE_STYLES = [
    // Style 0: 江南青瓦白墙院
    { name: '青瓦雅居', wall: PAL.creamWall,     dado: PAL.blueStone,     roof: PAL.tileCharcoal, trim: PAL.woodDark,  floor: PAL.blueStoneLite, curved: false },
    // Style 1: 朱檐碧瓦仙居
    { name: '碧瓦灵居', wall: PAL.whiteJadeWarm, dado: PAL.whiteJade,     roof: PAL.tileJade,     trim: PAL.vermilion, floor: PAL.woodMid,       curved: true  },
    // Style 2: 赭石重木灵舍
    { name: '赭木洞府', wall: PAL.ochreWall,     dado: PAL.sandstone,     roof: PAL.tileBrown,    trim: PAL.woodDark,  floor: PAL.woodRaw,       curved: false },
    // Style 3: 墨石靛瓦清修轩
    { name: '靛瓦清轩', wall: PAL.paleSlateWall, dado: PAL.basaltDark,    roof: PAL.tileIndigo,   trim: PAL.woodDark,  floor: PAL.whiteJadeWarm, curved: true  },
  ];

  function buildEnterableResidence(mb, cx, cz, widthX, depthZ, wallH, rotY, styleIdx, houseNum) {
    const st = HOUSE_STYLES[styleIdx % HOUSE_STYLES.length];
    const y = T.getMeshTerrainHeight(cx, cz);
    const H = makeLocalHelper(mb, cx, y, cz, rotY);

    // Grounded stone terrace + front step
    mb.setCollision(true, 'building');
    H.box(0, 0.08, 0, widthX + 1.0, 0.72, depthZ + 1.0, st.dado, 0.68, 0, 1.0);
    const deckY = 0.44;
    H.box(0, deckY * 0.5, depthZ * 0.5 + 0.72, 3.0, deckY, 1.15, PAL.whiteJadeWarm, 0.60, 0, 1.0);

    // Enterable Hollow Interior Room (single hinged wooden door, 2.3m wide × 3.2m tall!)
    buildHollowRoom(mb, H, {
      deckY, width: widthX, depth: depthZ, wallH, doorW: 2.3, doorH: 3.2,
      wallCol: st.wall, dadoCol: st.dado, floorCol: st.floor, trimCol: st.trim,
      doorLabel: `${st.name}·${houseNum}号`, doorStyle: 'door_house', isDouble: false, rotY, lanternScale: 0.78,
    });

    // Small warm-glowing square wooden-framed windows (小方窗)
    mb.setCollision(false);
    const hw = widthX * 0.5, hd = depthZ * 0.5;
    const winY = deckY + wallH * 0.56;
    for (const wx of [-hw * 0.56, hw * 0.56]) {
      mb.addLatticeWindow(...H.pt(wx, winY, hd + 0.06), 1.65, 1.55, rotY, st.trim, PAL.windowWarm, 0.95);
    }
    mb.addLatticeWindow(...H.pt(0, winY, -hd - 0.06), 2.2, 1.55, rotY + Math.PI, st.trim, PAL.windowWarm, 0.85);
    mb.addLatticeWindow(...H.pt(-hw - 0.06, winY, 0), 2.2, 1.55, rotY - Math.PI * 0.5, st.trim, PAL.windowWarm, 0.85);
    mb.addLatticeWindow(...H.pt( hw + 0.06, winY, 0), 2.2, 1.55, rotY + Math.PI * 0.5, st.trim, PAL.windowWarm, 0.85);

    // Cozy Furnished Interior (打坐床榻 + 茶桌暖灯 + 储物木箱 + 地毯!)
    H.box(0, deckY + 0.04, 0.2, 3.8, 0.05, 4.4, styleIdx % 2 === 0 ? PAL.carpetTeal : PAL.carpetRed, 0.80, 0, 1.42);
    mb.setCollision(true, 'building');
    H.box(-hw + 2.2, deckY + 0.42, -hd + 2.0, 2.8, 0.84, 2.2, PAL.woodDark, 0.58, 0, 1.30); // Cultivation Couch
    H.box( hw - 2.0, deckY + 0.45, -hd + 1.8, 1.8, 0.90, 1.2, PAL.woodRaw,  0.66, 0, 1.30); // Storage Chest
    H.cyl(0, deckY, -1.0, 0.92, 0.92, 0.78, 10, PAL.woodMid, 0.56, 0, 1.30);                 // Tea Table
    mb.setCollision(false);
    H.box(-hw + 2.2, deckY + 0.90, -hd + 2.0, 2.5, 0.14, 1.9, PAL.parchment, 0.76, 0, 1.42);
    H.cyl(0, deckY + 0.78, -1.0, 0.18, 0.14, 0.32, 8, PAL.lanternWarm, 0.20, 1.45, 2.0);    // Glowing Table Lamp

    // Distinct Roof Architecture: Curved Glazed Flying Eaves (Style 1 & 3) vs Crisp Pitched Gable (Style 0 & 2)!
    if (st.curved) {
      mb.addCurvedRoof(...H.pt(0, deckY + wallH + 0.06, 0), widthX + 3.2, depthZ + 3.2, 3.2, rotY, 0.25, 1.55, st.roof, PAL.gold, st.wall);
    } else {
      addGabledTileRoof(mb, cx, y + deckY + wallH + 0.04, cz, widthX + 2.0, depthZ + 2.2, 2.75, rotY, st.roof, st.wall, PAL.whiteJadeWarm);
    }

    // Warm Entrance Lantern
    addSquareLantern(mb, ...H.pt(1.65, deckY + wallH - 0.10, hd + 0.75), 0.78, rotY);
    mb.setCollision(true, 'building');
  }

  // =========================================================================
  // 7. IMMORTAL AVENUE STREETLIGHTS, BENCHES & TOWN WELL
  // =========================================================================
  function buildCityStreetProps(mb) {
    // Bluestone Spirit Well at (+24, +46)
    const wx = 24.0, wz = 46.0, wy = T.getMeshTerrainHeight(wx, wz);
    mb.setCollision(true, 'building');
    mb.addCylinder(wx, wy - 0.3, wz, 2.1, 2.0, 1.25, 10, PAL.whiteJadeWarm, 0.56, 0, 1.0);
    mb.setCollision(false);
    mb.addCylinder(wx, wy + 0.62, wz, 1.55, 1.55, 0.12, 10, PAL.poolWater, 0.16, 0.65, 2.0);
    for (const sX of [-1.75, 1.75]) mb.addBox(wx + sX, wy + 2.1, wz, 0.26, 2.9, 0.26, 0, PAL.woodDark, 0.58, 0, 1.30);
    addGabledTileRoof(mb, wx, wy + 3.55, wz, 4.6, 2.9, 1.1, 0, PAL.tileJade, PAL.woodDark, PAL.gold);

    // Grand Street Lanterns lining N-S, E-W & Residential Boulevards
    const lamps = [
      [-14, 108], [ 14, 108], [-14, 72], [ 14, 72], [-14, 38], [ 14, 38],
      [-34, -12], [ 34, -12], [-34, 12], [ 34, 12],
      [-92, -12], [-92,  12], [ 92, -12], [ 92,  12],
      [-76,  48], [ 76,  48], [-76, -42], [ 76, -42],
      [-14, 138], [ 14, 138], // Exterior South Gate welcome avenue lamps
    ];
    for (const [lx, lz] of lamps) {
      const ly = T.getMeshTerrainHeight(lx, lz);
      mb.setCollision(true, 'building');
      mb.addBox(lx, ly + 0.30, lz, 0.92, 0.65, 0.92, 0, PAL.blueStoneDark, 0.64, 0, 1.0);
      mb.addBox(lx, ly + 2.45, lz, 0.26, 4.2, 0.26, 0, PAL.woodDark, 0.56, 0, 1.30);
      mb.setCollision(false);
      mb.addBox(lx, ly + 4.55, lz, 1.15, 0.18, 0.22, 0, PAL.woodDark, 0.56, 0, 1.30);
      addSquareLantern(mb, lx + 0.44, ly + 4.50, lz, 0.84, 0);
      mb.setCollision(true, 'building');
    }
  }

  // =========================================================================
  // 8. MASTER STATIC BUILD ENTRYPOINT FOR 青石仙城
  // =========================================================================
  function buildQingshiCity(mb) {
    REGISTERED_DOORS.length = 0;
    FLOATING_PROPS.length = 0;

    // 1. Towering 9.5m Walls, 护城灵阵符柱, 4 Corner Watchtowers & 4 Grand Gatehouses
    buildGrandWallsAndGates(mb);

    // 2. Central Immortal Plaza: 3-Tier Teleport Array, Five-Element Pillars, Twin Lotus Pools & Bridges, Cauldron, Stele
    buildCentralImmortalPlaza(mb);

    // 3. Seven Grand Enterable Halls & Shops (all hollow + interactive swinging double doors + furnished interiors!)
    buildJubaoTreasurePavilion(mb,   0.0, -82.0,  0.0);            // 聚宝轩 (北中轴压阵)
    buildCangjingPavilion(mb,      -52.0, -64.0,  0.0);            // 藏经阁 (三层靛蓝飞檐)
    buildZhishiGrandHall(mb,        52.0, -64.0,  0.0);            // 执事大殿 (宽阔重檐 + 告示牌)
    buildBaicaoHallAndMarket(mb,   -54.0,  24.0,  Math.PI * 0.5);  // 百草阁 (西坊北段)
    buildTiangongHallAndForge(mb,   54.0,  24.0, -Math.PI * 0.5);  // 天工坊 (东坊北段)
    buildWanshouHallAndLodge(mb,   -54.0,  68.0,  Math.PI * 0.5);  // 万兽斋 (西坊南段)
    buildZuixianTavern(mb,          54.0,  68.0, -Math.PI * 0.5);  // 醉仙楼 (东坊南段)

    // 4. Ten Varied Enterable 散修洞府与民居 (4 distinct material palettes & roof styles!)
    const houses = [
      [-96,  82, 14.0, 10.2, 4.6,  Math.PI,       0],
      [-96,  44, 13.6, 10.0, 4.5,  Math.PI * 0.5, 1],
      [-96, -28, 14.4, 10.4, 4.6,  Math.PI * 0.5, 2],
      [-96, -72, 13.8, 10.2, 4.5,  0.0,           3],
      [ 96,  82, 14.2, 10.2, 4.6,  Math.PI,       1],
      [ 96,  44, 13.4,  9.8, 4.4, -Math.PI * 0.5, 2],
      [ 96, -28, 14.6, 10.4, 4.6, -Math.PI * 0.5, 3],
      [ 96, -72, 13.8, 10.0, 4.5,  0.0,           0],
      [-52, 104, 13.6,  9.8, 4.5,  Math.PI,       3],
      [ 52, 104, 13.8, 10.0, 4.5,  Math.PI,       2],
    ];
    for (let i = 0; i < houses.length; i++) {
      const h = houses[i];
      buildEnterableResidence(mb, h[0], h[1], h[2], h[3], h[4], h[5], h[6], i + 1);
    }

    // 5. Street Lanterns & Spirit Well
    buildCityStreetProps(mb);
  }

  // =========================================================================
  // 9. DYNAMIC PURE-CODE MESHES (可开关3D门板 + 悬浮聚灵晶 + 旋转灵环)
  // =========================================================================
  function buildUnitDoorMesh(kind) {
    // Hinge sits cleanly along x = 0; leaf spans x in [0, 1], y in [0, 1], z in [-0.07, 0.07]
    const mb = new MeshBuilder(null);
    const frameCol = kind === 'door_grand' ? PAL.woodDark : (kind === 'door_shop' ? PAL.woodMid : PAL.woodDark);
    const panelCol = kind === 'door_grand' ? PAL.vermilion : (kind === 'door_shop' ? PAL.woodRaw : PAL.woodMid);
    const metalCol = kind === 'door_grand' ? PAL.gold : PAL.bronze;

    // Main door slab
    mb.addBox(0.50, 0.50, 0.0, 0.98, 0.98, 0.11, 0, frameCol, 0.52, 0, 1.30);
    // Recessed carved panel on both front & back faces
    mb.addBox(0.50, 0.52, 0.0, 0.76, 0.78, 0.135, 0, panelCol, 0.48, 0, 1.30);
    // Horizontal structural cross-rails
    mb.addBox(0.50, 0.88, 0.0, 0.96, 0.09, 0.15, 0, frameCol, 0.54, 0, 1.30);
    mb.addBox(0.50, 0.12, 0.0, 0.96, 0.09, 0.15, 0, frameCol, 0.54, 0, 1.30);
    mb.addBox(0.50, 0.46, 0.0, 0.94, 0.08, 0.15, 0, frameCol, 0.54, 0, 1.30);
    if (kind === 'door_shop') {
      // Glowing carved lattice upper window pane in shop doors!
      mb.addBox(0.50, 0.68, 0.0, 0.62, 0.30, 0.155, 0, PAL.windowWarm, 0.22, 0.95, 2.0);
    } else if (kind === 'door_grand') {
      // Golden palace studs & ornate brass ring knocker near latch edge (x = 0.82)
      mb.addBox(0.50, 0.92, 0.0, 0.82, 0.04, 0.16, 0, PAL.gold, 0.26, 0.18, 3.0);
      mb.addBox(0.82, 0.48, 0.0, 0.12, 0.12, 0.19, 0, PAL.gold, 0.24, 0.28, 3.0);
    } else {
      // Residential iron hinge straps + brass latch handle
      mb.addBox(0.18, 0.78, 0.0, 0.32, 0.05, 0.16, 0, PAL.ironBlack, 0.44, 0, 3.0);
      mb.addBox(0.18, 0.22, 0.0, 0.32, 0.05, 0.16, 0, PAL.ironBlack, 0.44, 0, 3.0);
      mb.addBox(0.84, 0.48, 0.0, 0.09, 0.10, 0.18, 0, metalCol, 0.30, 0.14, 3.0);
    }
    return mb.build();
  }

  function buildFloatingCrystalMesh(col) {
    const mb = new MeshBuilder(null);
    mb.addCrystalSpire(0, 0.0, 0, 0.56, 1.35, 0, 0, 0, col, 1.95);
    mb.addCrystalSpire(0, 0.0, 0, 0.56, 0.95, Math.PI, 0, 0, col, 1.75);
    return mb.build();
  }

  function buildFloatingHaloMesh(col) {
    const mb = new MeshBuilder(null);
    const segs = 24;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      mb.addBox(Math.cos(a), 0, Math.sin(a), 0.075, 0.075, 0.28, -a, col, 0.18, 1.85, 2.0);
    }
    return mb.build();
  }

  // =========================================================================
  // 10. LIVE CITY INTERACTIVE SYSTEM (开门/关门动画 + 动态门板碰撞 + 浮空仙晶动画)
  // =========================================================================
  class QingshiCitySystem {
    constructor() {
      this.meshes = {
        door_grand:   buildUnitDoorMesh('door_grand'),
        door_shop:    buildUnitDoorMesh('door_shop'),
        door_house:   buildUnitDoorMesh('door_house'),
        crystal_cyan: buildFloatingCrystalMesh(PAL.arrayCyan),
        crystal_gold: buildFloatingCrystalMesh(PAL.gold),
        halo_cyan:    buildFloatingHaloMesh(PAL.arrayCyan),
        halo_gold:    buildFloatingHaloMesh(PAL.gold),
      };
      this.doors = REGISTERED_DOORS;
      this.floatingProps = FLOATING_PROPS;
      this.drawList = [];
      this.nearestDoor = null;
    }

    toggleNearestDoor(monsterSystem) {
      const d = this.nearestDoor;
      if (!d) return false;
      d.open = !d.open;
      d.targetAngle = d.open ? 1.66 : 0.0;
      if (monsterSystem) {
        monsterSystem.spawnFloatingText(d.cx, d.cy + d.height * 0.72, d.cz, d.open ? `推开 · ${d.label}` : `合上 · ${d.label}`, '#ffe8a4');
      }
      return true;
    }

    // Solid OBB collision ONLY for closed doors (angle < 0.45) — once opened, player strolls freely inside!
    resolvePlayerCollision(playerEyePos, vel, eyeHeight, playerRadius) {
      const px = playerEyePos[0], pz = playerEyePos[2];
      if (Math.abs(px) > 140 || Math.abs(pz) > 140) return false;
      const footY = playerEyePos[1] - eyeHeight;
      const headY = playerEyePos[1] + 0.42;
      let hit = false;

      for (let i = 0; i < this.doors.length; i++) {
        const d = this.doors[i];
        if (d.angle >= 0.45) continue; // Open door -> 100% passable!
        if (headY <= d.cy + 0.05 || footY >= d.cy + d.height) continue;

        const dx = px - d.cx, dz = pz - d.cz;
        const hx = d.width * 0.5, hz = 0.24;
        if (dx * dx + dz * dz > (hx + playerRadius + 0.6) * (hx + playerRadius + 0.6)) continue;

        const cY = Math.cos(d.rotY), sY = Math.sin(d.rotY);
        // Transform into door-local space (inverse of xformY)
        const lx =  dx * cY - dz * sY;
        const lz =  dx * sY + dz * cY;
        const cxCl = M.clamp(lx, -hx, hx);
        const czCl = M.clamp(lz, -hz, hz);
        const dlx = lx - cxCl, dlz = lz - czCl;
        const distSq = dlx * dlx + dlz * dlz;
        if (distSq >= playerRadius * playerRadius) continue;

        let nlx, nlz, pen;
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          nlx = dlx / dist; nlz = dlz / dist;
          pen = playerRadius - dist;
        } else {
          nlx = 0; nlz = lz >= 0 ? 1 : -1;
          pen = playerRadius + hz - Math.abs(lz);
        }
        const wnx = nlx * cY + nlz * sY;
        const wnz = -nlx * sY + nlz * cY;
        playerEyePos[0] += wnx * pen;
        playerEyePos[2] += wnz * pen;
        const vn = vel[0] * wnx + vel[2] * wnz;
        if (vn < 0) {
          vel[0] -= vn * wnx;
          vel[2] -= vn * wnz;
        }
        hit = true;
      }
      return hit;
    }

    update(dt, elapsed, playerPos, paused) {
      const cdt = Math.min(dt, 0.05);
      const px = playerPos[0], py = playerPos[1], pz = playerPos[2];
      this.drawList.length = 0;
      this.nearestDoor = null;

      if (Math.abs(px) > 360 || Math.abs(pz) > 360) return;

      let bestDist = 4.8;
      const whiteTint = [1.0, 1.0, 1.0];

      // 1. Animate & push all 17 interactive building doors (double & single hinged leaves!)
      for (let i = 0; i < this.doors.length; i++) {
        const d = this.doors[i];
        if (!paused) {
          const diff = d.targetAngle - d.angle;
          if (Math.abs(diff) > 0.002) {
            d.angle += diff * Math.min(1, cdt * 7.5);
          } else {
            d.angle = d.targetAngle;
          }
        }
        const dist = Math.hypot(d.cx - px, d.cz - pz);
        if (dist < bestDist && Math.abs(py - d.cy) < 3.2) {
          bestDist = dist;
          this.nearestDoor = d;
        }

        const cY = Math.cos(d.rotY), sY = Math.sin(d.rotY);
        const hw = d.width * 0.5;
        if (d.isDouble) {
          const leafW = hw;
          // Left leaf hinged at local (-hw, 0, 0), swings inward (+angle)
          const lp = MeshBuilder.xformY(-hw, 0, 0, d.cx, d.cy, d.cz, cY, sY);
          M.m4ComposeTRS(d.leftMat, lp[0], lp[1], lp[2], 0, d.rotY + d.angle, 0, leafW, d.height, 1.0);
          this.drawList.push({ id: d.style, modelMat: d.leftMat, tint: whiteTint, glow: 0.04 });

          // Right leaf hinged at local (+hw, 0, 0), rotated PI - angle so it swings symmetrically inward!
          const rp = MeshBuilder.xformY(hw, 0, 0, d.cx, d.cy, d.cz, cY, sY);
          M.m4ComposeTRS(d.rightMat, rp[0], rp[1], rp[2], 0, d.rotY + Math.PI - d.angle, 0, leafW, d.height, 1.0);
          this.drawList.push({ id: d.style, modelMat: d.rightMat, tint: whiteTint, glow: 0.04 });
        } else {
          // Single residential leaf hinged at local (-hw, 0, 0), swings cleanly inward!
          const lp = MeshBuilder.xformY(-hw, 0, 0, d.cx, d.cy, d.cz, cY, sY);
          M.m4ComposeTRS(d.leftMat, lp[0], lp[1], lp[2], 0, d.rotY + d.angle, 0, d.width, d.height, 1.0);
          this.drawList.push({ id: d.style, modelMat: d.leftMat, tint: whiteTint, glow: 0.04 });
        }
      }

      // 2. Animate hovering Xianxia floating spirit crystals & spinning golden/cyan halo rings!
      for (let i = 0; i < this.floatingProps.length; i++) {
        const fp = this.floatingProps[i];
        const bob = Math.sin(elapsed * 2.1 + fp.phase) * fp.bobAmp;
        const rotY = elapsed * fp.spinSpeed + fp.phase;
        const tiltX = fp.tiltX || 0;
        M.m4ComposeTRS(fp.modelMat, fp.x, fp.y + bob, fp.z, tiltX, rotY, 0, fp.scale, fp.scale, fp.scale);
        this.drawList.push({
          id: fp.kind,
          modelMat: fp.modelMat,
          tint: fp.kind.includes('gold') ? PAL.gold : PAL.arrayCyan,
          glow: 0.58 + Math.sin(elapsed * 3.0 + fp.phase) * 0.16,
        });
      }
    }

    renderLabels(ctx, cssW, cssH, dpr, vpMat, camPos) {
      if (!ctx) return;
      const cx = camPos[0], cy = camPos[1], cz = camPos[2];
      if (Math.abs(cx) > 220 || Math.abs(cz) > 220) return;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '600 12.5px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < CITY_LABELS.length; i++) {
        const lb = CITY_LABELS[i];
        const baseY = T.getMeshTerrainHeight(lb.x, lb.z);
        const wy = baseY + lb.yOff;
        const dist = Math.hypot(lb.x - cx, wy - cy, lb.z - cz);
        if (dist > 78.0) continue;

        const clipX = vpMat[0] * lb.x + vpMat[4] * wy + vpMat[8]  * lb.z + vpMat[12];
        const clipY = vpMat[1] * lb.x + vpMat[5] * wy + vpMat[9]  * lb.z + vpMat[13];
        const clipW = vpMat[3] * lb.x + vpMat[7] * wy + vpMat[11] * lb.z + vpMat[15];
        if (clipW <= 0.2) continue;
        const ndcX = clipX / clipW, ndcY = clipY / clipW;
        if (ndcX < -1.04 || ndcX > 1.04 || ndcY < -1.04 || ndcY > 1.04) continue;

        const sx = (ndcX * 0.5 + 0.5) * cssW;
        const sy = (0.5 - ndcY * 0.5) * cssH;
        const alpha = (1.0 - M.smoothstep(48.0, 78.0, dist)) * 0.94;
        if (alpha <= 0.04) continue;

        ctx.globalAlpha = alpha;
        const tw = ctx.measureText(lb.name).width;
        const bw = Math.ceil(tw + 18), bh = 23;
        const bx = Math.round(sx - bw * 0.5), by = Math.round(sy - bh * 0.5);

        ctx.fillStyle = 'rgba(12, 20, 28, 0.78)';
        ctx.strokeStyle = 'rgba(238, 210, 134, 0.68)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 11);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillText(lb.name, sx, sy + 1);
        ctx.fillStyle = lb.col;
        ctx.fillText(lb.name, sx, sy);
      }

      ctx.restore();
    }
  }

  XW.QingshiCity = {
    buildQingshiCity,
    createCitySystem: () => new QingshiCitySystem(),
    CITY_LABELS,
  };
})(window);
