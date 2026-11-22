(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;

  // =========================================================================
  // 1. FIVE-ELEMENT Q-VERSION OUTFIT CATALOG (五行五色服饰 · 默认全放背包)
  // =========================================================================
  const OUTFIT_DEFS = [
    {
      id: 'outfit_metal',
      name: '庚金白金袍',
      icon: '金',
      element: 'metal',
      elementLabel: '金行服饰',
      slotType: 'outfit',
      desc: '金行 · 月白主衣身配淡金领袖镶边、亮金方扣与深灰短裤；双前臂淡金护腕环，头戴金边小方冠',
      palette: {
        main:   [0.92, 0.94, 0.96], // 月白
        trim:   [0.92, 0.80, 0.44], // 淡金镶边
        inner:  [0.97, 0.96, 0.92], // 素白内领
        belt:   [0.74, 0.74, 0.72], // 浅银灰宽带
        buckle: [1.00, 0.88, 0.42], // 亮金方扣
        shorts: [0.28, 0.30, 0.34], // 深灰短裤
        hair:   [0.14, 0.15, 0.18],
        accent: [0.96, 0.84, 0.42],
      },
    },
    {
      id: 'outfit_wood',
      name: '青木翠竹衫',
      icon: '木',
      element: 'wood',
      elementLabel: '木行服饰',
      slotType: 'outfit',
      desc: '木行 · 嫩草绿主衣身配乳白内衬领口、墨绿腰带与深青短裤；腰侧垂挂圆润白玉叶坠，发髻插细竹青簪',
      palette: {
        main:   [0.52, 0.78, 0.44], // 嫩草绿
        trim:   [0.94, 0.93, 0.84], // 乳白内衬领口
        inner:  [0.96, 0.95, 0.88],
        belt:   [0.17, 0.36, 0.23], // 墨绿腰带
        buckle: [0.84, 0.90, 0.76], // 青玉方扣
        shorts: [0.18, 0.32, 0.32], // 深青短裤
        hair:   [0.14, 0.16, 0.16],
        accent: [0.93, 0.97, 0.92], // 白玉叶坠
        pin:    [0.34, 0.74, 0.44], // 竹青簪
      },
    },
    {
      id: 'outfit_water',
      name: '玄水沧浪衣',
      icon: '水',
      element: 'water',
      elementLabel: '水行服饰',
      slotType: 'outfit',
      desc: '水行 · 清浅天蓝主衣身配云白交领滚边、藏青宽腰带与深蓝短裤；肩覆云白圆润短披肩领，发冠绑浅蓝短发带',
      palette: {
        main:   [0.52, 0.78, 0.94], // 清浅天蓝
        trim:   [0.95, 0.97, 0.99], // 云白滚边
        inner:  [0.96, 0.98, 1.00],
        belt:   [0.15, 0.24, 0.42], // 藏青腰带
        buckle: [0.84, 0.91, 0.97], // 银白方扣
        shorts: [0.16, 0.26, 0.44], // 深蓝短裤
        hair:   [0.13, 0.16, 0.21],
        accent: [0.58, 0.86, 0.98], // 浅蓝发带
      },
    },
    {
      id: 'outfit_fire',
      name: '赤炎烈阳装',
      icon: '火',
      element: 'fire',
      elementLabel: '火行服饰',
      slotType: 'outfit',
      desc: '火行 · 朱红赤橙主衣身配焦黑领袖边、暗金赤红腰带与炭黑短裤；腰带垂赤红倒三角短前摆，额头系赤红抹额带',
      palette: {
        main:   [0.86, 0.28, 0.16], // 朱红/赤橙
        trim:   [0.16, 0.14, 0.15], // 焦黑领袖边
        inner:  [0.20, 0.17, 0.18],
        belt:   [0.58, 0.14, 0.11], // 赤红腰带
        buckle: [0.88, 0.68, 0.30], // 暗金方扣
        shorts: [0.18, 0.17, 0.19], // 炭黑短裤
        hair:   [0.15, 0.13, 0.14],
        accent: [0.90, 0.24, 0.14], // 赤红前摆/抹额
      },
    },
    {
      id: 'outfit_earth',
      name: '厚土玄黄袍',
      icon: '土',
      element: 'earth',
      elementLabel: '土行服饰',
      slotType: 'outfit',
      desc: '土行 · 暖土黄赭石主衣身配深褐厚实领边、粗麻深褐腰带与暗棕短裤；肩腰加厚深褐滚边更敦实，头戴浅黄小扁斗笠',
      palette: {
        main:   [0.78, 0.60, 0.34], // 暖土黄/赭石
        trim:   [0.34, 0.22, 0.13], // 深褐厚实领边
        inner:  [0.44, 0.32, 0.20],
        belt:   [0.36, 0.24, 0.15], // 粗麻深褐腰带
        buckle: [0.72, 0.58, 0.32], // 古铜方扣
        shorts: [0.30, 0.21, 0.15], // 暗棕短裤
        hair:   [0.16, 0.14, 0.12],
        hat:    [0.88, 0.78, 0.50], // 浅黄小扁斗笠
        hatRim: [0.64, 0.50, 0.28],
      },
    },
  ];

  // =========================================================================
  // 2. SKINNED GEOMETRY HELPERS FOR COLORED Q-VERSION CLOTHING & ACCESSORIES
  // =========================================================================
  function rotVec(x, y, z, rx, ry, rz) {
    let x1 = x, y1 = y, z1 = z;
    if (rx) {
      const c = Math.cos(rx), s = Math.sin(rx);
      const ny = y1 * c - z1 * s, nz = y1 * s + z1 * c;
      y1 = ny; z1 = nz;
    }
    if (rz) {
      const c = Math.cos(rz), s = Math.sin(rz);
      const nx = x1 * c - y1 * s, ny = x1 * s + y1 * c;
      x1 = nx; y1 = ny;
    }
    if (ry) {
      const c = Math.cos(ry), s = Math.sin(ry);
      const nx = x1 * c + z1 * s, nz = -x1 * s + z1 * c;
      x1 = nx; z1 = nz;
    }
    return [x1, y1, z1];
  }

  function addColoredEllipsoid(mb, opts) {
    const cx = opts.cx || 0, cy = opts.cy || 0, cz = opts.cz || 0;
    const rx = opts.rx || 0.1, ry = opts.ry || 0.1, rz = opts.rz || 0.1;
    const rotX = opts.rotX || 0, rotY = opts.rotY || 0, rotZ = opts.rotZ || 0;
    const latSegs = opts.latSegs || 14, lonSegs = opts.lonSegs || 22;
    const col = opts.col || [0.8, 0.8, 0.8];
    const rough = opts.rough !== undefined ? opts.rough : 0.62;
    const emissive = opts.emissive || 0.0;
    const ao = opts.ao !== undefined ? opts.ao : 0.98;
    const b0 = opts.b0 || 0, b1 = opts.b1 !== undefined ? opts.b1 : b0;
    const w0 = opts.w0 !== undefined ? opts.w0 : 1.0, w1 = opts.w1 || 0.0;
    const shapeFn = opts.shapeFn || null;

    const baseV = mb.vCount;
    const stride = lonSegs + 1;
    for (let il = 0; il <= latSegs; il++) {
      const phi = (il / latSegs) * Math.PI;
      const sp = Math.sin(phi), cp = Math.cos(phi);
      for (let io = 0; io <= lonSegs; io++) {
        const theta = (io / lonSegs) * Math.PI * 2;
        const ct = Math.cos(theta), st = Math.sin(theta);
        const p = [sp * ct * rx, cp * ry, sp * st * rz];
        if (shapeFn) shapeFn(phi, theta, p);
        const rp = rotVec(p[0], p[1], p[2], rotX, rotY, rotZ);
        const rn = rotVec(sp * ct / Math.max(rx, 0.01), cp / Math.max(ry, 0.01), sp * st / Math.max(rz, 0.01), rotX, rotY, rotZ);
        mb.pushVertex(cx + rp[0], cy + rp[1], cz + rp[2], rn[0], rn[1], rn[2], col, rough, emissive, ao, b0, b1, w0, w1);
      }
    }
    for (let il = 0; il < latSegs; il++) {
      for (let io = 0; io < lonSegs; io++) {
        const a = baseV + il * stride + io;
        mb.pushTri(a, a + 1, a + stride);
        mb.pushTri(a + 1, a + stride + 1, a + stride);
      }
    }
  }

  function addColoredBox(mb, opts) {
    const cx = opts.cx || 0, cy = opts.cy || 0, cz = opts.cz || 0;
    const hx = opts.hx || 0.05, hy = opts.hy || 0.05, hz = opts.hz || 0.05;
    const rotX = opts.rotX || 0, rotY = opts.rotY || 0, rotZ = opts.rotZ || 0;
    const col = opts.col || [0.8, 0.8, 0.8];
    const rough = opts.rough !== undefined ? opts.rough : 0.45;
    const emissive = opts.emissive || 0.0;
    const ao = opts.ao !== undefined ? opts.ao : 1.0;
    const b0 = opts.b0 || 0, b1 = opts.b1 !== undefined ? opts.b1 : b0;
    const w0 = opts.w0 !== undefined ? opts.w0 : 1.0, w1 = opts.w1 || 0.0;

    const faces = [
      { n: [ 0,  0,  1], v: [[-hx,-hy, hz], [ hx,-hy, hz], [ hx, hy, hz], [-hx, hy, hz]] },
      { n: [ 0,  0, -1], v: [[ hx,-hy,-hz], [-hx,-hy,-hz], [-hx, hy,-hz], [ hx, hy,-hz]] },
      { n: [ 1,  0,  0], v: [[ hx,-hy, hz], [ hx,-hy,-hz], [ hx, hy,-hz], [ hx, hy, hz]] },
      { n: [-1,  0,  0], v: [[-hx,-hy,-hz], [-hx,-hy, hz], [-hx, hy, hz], [-hx, hy,-hz]] },
      { n: [ 0,  1,  0], v: [[-hx, hy, hz], [ hx, hy, hz], [ hx, hy,-hz], [-hx, hy,-hz]] },
      { n: [ 0, -1,  0], v: [[-hx,-hy,-hz], [ hx,-hy,-hz], [ hx,-hy, hz], [-hx,-hy, hz]] },
    ];
    for (const f of faces) {
      const rn = rotVec(f.n[0], f.n[1], f.n[2], rotX, rotY, rotZ);
      const base = mb.vCount;
      for (const pt of f.v) {
        const rp = rotVec(pt[0], pt[1], pt[2], rotX, rotY, rotZ);
        mb.pushVertex(cx + rp[0], cy + rp[1], cz + rp[2], rn[0], rn[1], rn[2], col, rough, emissive, ao, b0, b1, w0, w1);
      }
      mb.pushTri(base, base + 1, base + 2);
      mb.pushTri(base, base + 2, base + 3);
    }
  }

  function addColoredTorus(mb, opts) {
    const cx = opts.cx || 0, cy = opts.cy || 0, cz = opts.cz || 0;
    const majorRx = opts.majorRx !== undefined ? opts.majorRx : (opts.majorR || 0.12);
    const majorRz = opts.majorRz !== undefined ? opts.majorRz : (opts.majorR || 0.12);
    const minorR = opts.minorR || 0.015;
    const rotX = opts.rotX || 0, rotY = opts.rotY || 0, rotZ = opts.rotZ || 0;
    const segs = opts.segs || 24, tubeSegs = opts.tubeSegs || 8;
    const col = opts.col || [0.9, 0.8, 0.4];
    const rough = opts.rough !== undefined ? opts.rough : 0.36;
    const emissive = opts.emissive || 0.0;
    const ao = opts.ao !== undefined ? opts.ao : 1.0;
    const b0 = opts.b0 || 0, b1 = opts.b1 !== undefined ? opts.b1 : b0;
    const w0 = opts.w0 !== undefined ? opts.w0 : 1.0, w1 = opts.w1 || 0.0;

    const base = mb.vCount;
    const stride = tubeSegs + 1;
    for (let i = 0; i <= segs; i++) {
      const u = (i / segs) * Math.PI * 2;
      const cu = Math.cos(u), su = Math.sin(u);
      for (let j = 0; j <= tubeSegs; j++) {
        const v = (j / tubeSegs) * Math.PI * 2;
        const cv = Math.cos(v), sv = Math.sin(v);
        const lx = (majorRx + minorR * cv) * cu;
        const ly = minorR * sv;
        const lz = (majorRz + minorR * cv) * su;
        const rp = rotVec(lx, ly, lz, rotX, rotY, rotZ);
        const rn = rotVec(cv * cu, sv, cv * su, rotX, rotY, rotZ);
        mb.pushVertex(cx + rp[0], cy + rp[1], cz + rp[2], rn[0], rn[1], rn[2], col, rough, emissive, ao, b0, b1, w0, w1);
      }
    }
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < tubeSegs; j++) {
        const a = base + i * stride + j;
        const b = a + stride;
        mb.pushTri(a, b + 1, b);
        mb.pushTri(a, a + 1, b + 1);
      }
    }
  }

  // Thick sculptural open-bottom skirt/tube loft (outer wall + tucked inner rim for watertight backface culling!)
  function addDoubleWalledLoft(mb, rawRings, segs = 32, subSteps = 2, rough = 0.68, capTop = true) {
    mb.addSmoothLoft(rawRings, segs, subSteps, rough, false, capTop);
    // Add thin tucked bottom rim ring so looking up from underneath never shows a paper-thin hollow edge
    const bot = rawRings[0];
    const rimIn = Object.assign({}, bot, {
      rx: Math.max(0.02, bot.rx - 0.020),
      rz: Math.max(0.02, bot.rz - 0.020),
      y: bot.y + 0.014,
      ao: 0.78,
    });
    const rimUp = Object.assign({}, rimIn, {
      y: bot.y + 0.052,
      ao: 0.74,
    });
    // Reverse order (y goes bottom -> rimIn -> rimUp with inverted winding via flipped order)
    mb.addSmoothLoft([rimUp, rimIn, bot], segs, 1, rough, false, false);
  }

  // =========================================================================
  // 3. SHARED Q-VERSION BASE CUT + ELEMENT-SPECIFIC SILHOUETTE & DETAILS
  // =========================================================================
  function buildOutfitMeshes(def) {
    const BONE = XW.Character.BONE;
    const SkinnedMeshBuilder = XW.Character.SkinnedMeshBuilder;
    const p = def.palette;
    const el = def.element;
    const isEarth = el === 'earth';
    const padExtra = isEarth ? 0.010 : 0.0; // Earth outfit looks sturdier & thicker!

    // ---------------------------------------------------------------------
    // A. OUTFIT TOP: 交领齐臀短袍 (Concentric torso shell + cross collar + sleeves + element shoulder/forearm details)
    // ---------------------------------------------------------------------
    const topMB = new SkinnedMeshBuilder();
    const robeRough = isEarth ? 0.78 : 0.64;

    // 1) Main hip-length rounded flared robe body (y = 0.505 .. 1.175)
    addDoubleWalledLoft(topMB, [
      { y: 0.505, cz: 0.004, rx: 0.284 + padExtra, rz: 0.220 + padExtra, col: p.trim, ao: 0.90, b0: BONE.PELVIS,    w0: 1.00 },
      { y: 0.532, cz: 0.005, rx: 0.280 + padExtra, rz: 0.216 + padExtra, col: p.main, ao: 0.94, b0: BONE.PELVIS,    w0: 1.00 },
      { y: 0.635, cz: 0.008, rx: 0.264 + padExtra, rz: 0.204 + padExtra, col: p.main, ao: 0.97, b0: BONE.PELVIS,    w0: 0.90, b1: BONE.SPINE_LOW, w1: 0.10 },
      { y: 0.750, cz: 0.012, rx: 0.256 + padExtra, rz: 0.198 + padExtra, col: p.main, ao: 0.99, b0: BONE.SPINE_LOW, w0: 0.72, b1: BONE.PELVIS,    w1: 0.28 },
      { y: 0.885, cz: 0.010, rx: 0.258 + padExtra, rz: 0.194 + padExtra, col: p.main, ao: 1.00, b0: BONE.SPINE_LOW, w0: 0.45, b1: BONE.SPINE_UP,  w1: 0.55 },
      { y: 1.030, cz: 0.007, rx: 0.266 + padExtra, rz: 0.190 + padExtra, col: p.main, ao: 1.00, b0: BONE.SPINE_UP,  w0: 0.90, b1: BONE.SPINE_LOW, w1: 0.10 },
      { y: 1.132, cz: 0.005, rx: 0.236 + padExtra, rz: 0.168 + padExtra, col: p.main, ao: 0.97, b0: BONE.SPINE_UP,  w0: 1.00 },
      { y: 1.178, cz: 0.005, rx: 0.175 + padExtra, rz: 0.140 + padExtra, col: p.trim, ao: 0.94, b0: BONE.SPINE_UP,  w0: 0.78, b1: BONE.HEAD,      w1: 0.22 },
    ], 34, 2, robeRough, true);

    // 2) Cross-Collar Lapel (交领: left-over-right V-collar on front + wrap-around back collar ridge)
    // Back & neck base collar torus
    addColoredTorus(topMB, {
      cx: 0.0, cy: 1.160, cz: 0.004,
      majorRx: 0.188 + padExtra, majorRz: 0.148 + padExtra,
      minorR: isEarth ? 0.026 : 0.018,
      col: p.trim, rough: 0.58, ao: 0.98,
      b0: BONE.SPINE_UP, b1: BONE.HEAD, w0: 0.85, w1: 0.15,
    });
    // Inner under-collar lining on chest (visible at the V opening)
    addColoredBox(topMB, {
      cx: 0.0, cy: 1.095, cz: 0.174 + padExtra,
      hx: 0.064, hy: 0.056, hz: 0.014,
      rotX: -0.22,
      col: p.inner, rough: 0.66,
      b0: BONE.SPINE_UP, w0: 1.0,
    });
    // Left lapel strip crossing right-downward (from +X shoulder to center-right waist)
    addColoredBox(topMB, {
      cx: 0.042, cy: 1.020, cz: 0.190 + padExtra,
      hx: isEarth ? 0.024 : 0.018, hy: 0.155, hz: 0.015,
      rotX: -0.14, rotY: 0.20, rotZ: -0.44,
      col: p.trim, rough: 0.56,
      b0: BONE.SPINE_UP, b1: BONE.SPINE_LOW, w0: 0.78, w1: 0.22,
    });
    // Right lapel strip crossing left-downward (tucked underneath left lapel)
    addColoredBox(topMB, {
      cx: -0.054, cy: 1.045, cz: 0.184 + padExtra,
      hx: isEarth ? 0.022 : 0.017, hy: 0.120, hz: 0.014,
      rotX: -0.14, rotY: -0.20, rotZ: 0.44,
      col: p.trim, rough: 0.56,
      b0: BONE.SPINE_UP, b1: BONE.SPINE_LOW, w0: 0.82, w1: 0.18,
    });

    // 3) Sleeves + Cuff Trim on both arms (leaving rounded Q-version arm nub cleanly visible!)
    for (const side of [1, -1]) {
      const bSh = side === 1 ? BONE.SHOULDER_L  : BONE.SHOULDER_R;
      const bUp = side === 1 ? BONE.UPPER_ARM_L : BONE.UPPER_ARM_R;
      const bFo = side === 1 ? BONE.FOREARM_L   : BONE.FOREARM_R;

      // Plump concentric shoulder sleeve cap
      addColoredEllipsoid(topMB, {
        cx: side * 0.232, cy: 1.055, cz: -0.004,
        rx: 0.106 + padExtra * 0.7, ry: 0.104 + padExtra * 0.7, rz: 0.100 + padExtra * 0.7,
        latSegs: 14, lonSegs: 20, col: p.main, rough: robeRough,
        b0: bUp, b1: BONE.SPINE_UP, w0: 0.56, w1: 0.44,
      });

      // Sleeve tube from shoulder down to mid-lower forearm (y = 1.072 -> 0.700) with trim band at cuff
      addDoubleWalledLoft(topMB, [
        { cx: side * 0.275, y: 0.698, cz:  0.000, rx: 0.096, rz: 0.094, col: p.trim, ao: 0.96, b0: bFo, w0: 0.94, b1: bUp, w1: 0.06 },
        { cx: side * 0.274, y: 0.734, cz: -0.001, rx: 0.094, rz: 0.092, col: p.main, ao: 0.99, b0: bFo, w0: 0.92, b1: bUp, w1: 0.08 },
        { cx: side * 0.266, y: 0.845, cz: -0.006, rx: 0.093, rz: 0.091, col: p.main, ao: 0.98, b0: bUp, w0: 0.50, b1: bFo, w1: 0.50 },
        { cx: side * 0.250, y: 0.965, cz: -0.005, rx: 0.096, rz: 0.094, col: p.main, ao: 0.99, b0: bUp, w0: 1.00 },
        { cx: side * 0.236, y: 1.072, cz: -0.004, rx: 0.098, rz: 0.096, col: p.main, ao: 0.96, b0: bUp, w0: 0.65, b1: bSh, w1: 0.35 },
      ], 24, 2, robeRough, true);

      // [金行特征] 双前臂套一对淡金薄护腕圆环
      if (el === 'metal') {
        addColoredTorus(topMB, {
          cx: side * 0.276, cy: 0.688, cz: 0.002,
          majorR: 0.072, minorR: 0.011,
          col: p.accent, rough: 0.24, emissive: 0.14,
          b0: bFo, w0: 1.0,
        });
        addColoredTorus(topMB, {
          cx: side * 0.274, cy: 0.728, cz: 0.000,
          majorR: 0.076, minorR: 0.010,
          col: p.accent, rough: 0.24, emissive: 0.12,
          b0: bFo, w0: 1.0,
        });
      }

      // [土行特征] 肩部加厚一圈深褐滚边显得更敦实
      if (el === 'earth') {
        addColoredTorus(topMB, {
          cx: side * 0.214, cy: 1.055, cz: -0.002,
          majorRx: 0.114, majorRz: 0.110, minorR: 0.022,
          rotZ: side * 1.18,
          col: p.trim, rough: 0.80,
          b0: BONE.SPINE_UP, b1: bUp, w0: 0.72, w1: 0.28,
        });
      }
    }

    // [水行特征] 肩头覆一圈圆润云白短披肩领（贴合肩部，不遮手臂摆动）
    if (el === 'water') {
      addDoubleWalledLoft(topMB, [
        { y: 1.010, cz: 0.000, rx: 0.308, rz: 0.220, col: p.accent, ao: 0.95, b0: BONE.SPINE_UP, w0: 1.0 },
        { y: 1.032, cz: 0.002, rx: 0.306, rz: 0.218, col: p.trim,   ao: 0.99, b0: BONE.SPINE_UP, w0: 1.0 },
        { y: 1.118, cz: 0.004, rx: 0.264, rz: 0.194, col: p.trim,   ao: 1.00, b0: BONE.SPINE_UP, w0: 1.0 },
        { y: 1.174, cz: 0.005, rx: 0.192, rz: 0.156, col: p.trim,   ao: 0.96, b0: BONE.SPINE_UP, w0: 0.85, b1: BONE.HEAD, w1: 0.15 },
      ], 34, 2, 0.56, true);
    }

    // ---------------------------------------------------------------------
    // B. OUTFIT BOTTOM: 束脚短裤 (Pelvis seat + tapered cuffed Q-version shorts)
    // ---------------------------------------------------------------------
    const botMB = new SkinnedMeshBuilder();
    const shortsRough = 0.72;
    // Pelvis shorts upper wrap under the robe hem
    botMB.addSmoothLoft([
      { y: 0.515, cz: 0.000, rx: 0.185, rz: 0.150, col: p.shorts, ao: 0.88, b0: BONE.PELVIS, w0: 1.0 },
      { y: 0.595, cz: 0.004, rx: 0.244, rz: 0.188, col: p.shorts, ao: 0.92, b0: BONE.PELVIS, w0: 1.0 },
      { y: 0.650, cz: 0.006, rx: 0.248, rz: 0.190, col: p.shorts, ao: 0.94, b0: BONE.PELVIS, w0: 1.0 },
    ], 28, 2, shortsRough, true, true);

    // Paired cuffed shorts legs (y = 0.595 -> 0.268, cinched cleanly at knee cuff!)
    for (const side of [1, -1]) {
      const bTh = side === 1 ? BONE.THIGH_L : BONE.THIGH_R;
      const bSh = side === 1 ? BONE.SHIN_L  : BONE.SHIN_R;
      const lx = side * 0.120;
      addDoubleWalledLoft(botMB, [
        { cx: lx, y: 0.268, cz: 0.004, rx: 0.095, rz: 0.097, col: p.belt,   ao: 0.94, b0: bTh, w0: 0.55, b1: bSh, w1: 0.45 },
        { cx: lx, y: 0.296, cz: 0.004, rx: 0.106, rz: 0.108, col: p.shorts, ao: 0.98, b0: bTh, w0: 0.72, b1: bSh, w1: 0.28 },
        { cx: lx, y: 0.435, cz: 0.003, rx: 0.114, rz: 0.116, col: p.shorts, ao: 0.99, b0: bTh, w0: 1.00 },
        { cx: lx, y: 0.585, cz: 0.000, rx: 0.116, rz: 0.118, col: p.shorts, ao: 0.95, b0: bTh, w0: 0.68, b1: BONE.PELVIS, w1: 0.32 },
      ], 24, 2, shortsRough, true);
    }

    // ---------------------------------------------------------------------
    // C. BELT: 宽布腰带 + 正面小方扣 + Element waist details (玉叶坠 / 倒三角前摆 / 加厚滚边)
    // ---------------------------------------------------------------------
    const beltMB = new SkinnedMeshBuilder();
    const beltRx = 0.274 + padExtra;
    const beltRz = 0.214 + padExtra;
    beltMB.addSmoothLoft([
      { y: 0.706, cz: 0.011, rx: beltRx - 0.004, rz: beltRz - 0.004, col: p.belt, ao: 0.92, b0: BONE.SPINE_LOW, w0: 0.64, b1: BONE.PELVIS, w1: 0.36 },
      { y: 0.730, cz: 0.012, rx: beltRx,         rz: beltRz,         col: p.belt, ao: 0.98, b0: BONE.SPINE_LOW, w0: 0.68, b1: BONE.PELVIS, w1: 0.32 },
      { y: 0.782, cz: 0.012, rx: beltRx,         rz: beltRz,         col: p.belt, ao: 1.00, b0: BONE.SPINE_LOW, w0: 0.74, b1: BONE.PELVIS, w1: 0.26 },
      { y: 0.806, cz: 0.011, rx: beltRx - 0.004, rz: beltRz - 0.004, col: p.belt, ao: 0.95, b0: BONE.SPINE_LOW, w0: 0.78, b1: BONE.PELVIS, w1: 0.22 },
    ], 34, 2, isEarth ? 0.80 : 0.62, true, true);

    // Front Small Square Buckle (正面小方扣, +Z front waist!)
    addColoredBox(beltMB, {
      cx: 0.0, cy: 0.756, cz: beltRz + 0.016,
      hx: 0.044, hy: 0.040, hz: 0.016,
      col: p.buckle, rough: 0.26, emissive: 0.10,
      b0: BONE.SPINE_LOW, b1: BONE.PELVIS, w0: 0.70, w1: 0.30,
    });
    // Inner buckle recess detail
    addColoredBox(beltMB, {
      cx: 0.0, cy: 0.756, cz: beltRz + 0.028,
      hx: 0.022, hy: 0.020, hz: 0.008,
      col: p.belt, rough: 0.55,
      b0: BONE.SPINE_LOW, b1: BONE.PELVIS, w0: 0.70, w1: 0.30,
    });

    // [木行特征] 腰带侧边垂挂一枚极小的圆润白玉叶坠
    if (el === 'wood') {
      // Tiny dark-green hanging cord
      addColoredBox(beltMB, {
        cx: beltRx + 0.006, cy: 0.692, cz: 0.036,
        hx: 0.006, hy: 0.026, hz: 0.006,
        col: p.belt, rough: 0.70,
        b0: BONE.PELVIS, b1: BONE.SPINE_LOW, w0: 0.80, w1: 0.20,
      });
      // Tiny plump white jade leaf pendant
      addColoredEllipsoid(beltMB, {
        cx: beltRx + 0.010, cy: 0.642, cz: 0.040,
        rx: 0.014, ry: 0.038, rz: 0.028,
        rotZ: 0.16,
        col: p.accent, rough: 0.24, emissive: 0.16,
        b0: BONE.PELVIS, b1: BONE.SPINE_LOW, w0: 0.85, w1: 0.15,
        shapeFn: (phi, theta, pt) => {
          // Taper bottom gently into a cute rounded jade leaf tip
          if (pt[1] < 0) {
            const k = 1.0 - Math.min(0.65, (-pt[1] / 0.038) * 0.55);
            pt[2] *= k;
          }
        },
      });
    }

    // [火行特征] 腰带正面垂下一小片赤红倒三角短前摆 + 暗金腰带边
    if (el === 'fire') {
      addColoredTorus(beltMB, {
        cx: 0.0, cy: 0.804, cz: 0.011, majorRx: beltRx + 0.002, majorRz: beltRz + 0.002, minorR: 0.009,
        col: p.buckle, rough: 0.30, emissive: 0.08, b0: BONE.SPINE_LOW, b1: BONE.PELVIS, w0: 0.75, w1: 0.25,
      });
      addColoredTorus(beltMB, {
        cx: 0.0, cy: 0.708, cz: 0.011, majorRx: beltRx + 0.002, majorRz: beltRz + 0.002, minorR: 0.009,
        col: p.buckle, rough: 0.30, emissive: 0.08, b0: BONE.SPINE_LOW, b1: BONE.PELVIS, w0: 0.65, w1: 0.35,
      });
      // Inverted-triangle short crimson front apron flap (y = 0.71 -> 0.45)
      beltMB.addSmoothLoft([
        { y: 0.455, cz: beltRz + 0.016, rx: 0.010, rz: 0.010, col: p.buckle, ao: 0.96, b0: BONE.PELVIS, w0: 1.0 },
        { y: 0.515, cz: beltRz + 0.014, rx: 0.056, rz: 0.012, col: p.accent, ao: 0.98, b0: BONE.PELVIS, w0: 1.0 },
        { y: 0.610, cz: beltRz + 0.012, rx: 0.098, rz: 0.013, col: p.accent, ao: 0.99, b0: BONE.PELVIS, w0: 0.92, b1: BONE.SPINE_LOW, w1: 0.08 },
        { y: 0.712, cz: beltRz + 0.010, rx: 0.122, rz: 0.014, col: p.accent, ao: 0.98, b0: BONE.PELVIS, w0: 0.70, b1: BONE.SPINE_LOW, w1: 0.30 },
      ], 16, 2, 0.62, true, true);
    }

    // [土行特征] 腰带加厚一圈深褐滚边显得更敦实
    if (el === 'earth') {
      addColoredTorus(beltMB, {
        cx: 0.0, cy: 0.808, cz: 0.011, majorRx: beltRx + 0.006, majorRz: beltRz + 0.006, minorR: 0.018,
        col: p.trim, rough: 0.82, b0: BONE.SPINE_LOW, b1: BONE.PELVIS, w0: 0.75, w1: 0.25,
      });
      addColoredTorus(beltMB, {
        cx: 0.0, cy: 0.704, cz: 0.011, majorRx: beltRx + 0.006, majorRz: beltRz + 0.006, minorR: 0.018,
        col: p.trim, rough: 0.82, b0: BONE.SPINE_LOW, b1: BONE.PELVIS, w0: 0.65, w1: 0.35,
      });
    }

    // ---------------------------------------------------------------------
    // D. HAIR: 乖巧 Q 版发套 + 头顶丸子发髻
    // ---------------------------------------------------------------------
    const hairMB = new SkinnedMeshBuilder();
    // Smooth dark hair cap hugging crown & back of the Q-version round head (clean open face on +Z!)
    addColoredEllipsoid(hairMB, {
      cx: 0.0, cy: 1.402, cz: -0.008,
      rx: 0.236, ry: 0.242, rz: 0.226,
      latSegs: 20, lonSegs: 28,
      col: p.hair, rough: 0.56, ao: 0.96,
      b0: BONE.HEAD, b1: BONE.SPINE_UP, w0: 0.96, w1: 0.04,
      shapeFn: (phi, theta, pt) => {
        // Carve clean face opening on front (+Z, where sin(theta) > 0) below the forehead hairline!
        const zDir = Math.sin(theta) * Math.sin(phi);
        const yDir = Math.cos(phi);
        if (zDir > 0.12 && yDir < 0.42) {
          const pull = M.smoothstep(0.12, 0.58, zDir) * M.smoothstep(0.42, -0.15, yDir);
          pt[2] *= (1.0 - pull * 0.42);
          pt[0] *= (1.0 - pull * 0.14);
        }
        // Tuck underside cleanly above shoulders
        if (yDir < -0.45) {
          const bot = M.smoothstep(-0.45, -0.95, yDir);
          pt[1] += bot * 0.06;
          pt[0] *= (1.0 - bot * 0.18);
          pt[2] *= (1.0 - bot * 0.18);
        }
      },
    });

    // Plump topknot bun (丸子发髻) on crown (for 金/木/水/火; 土 wears flat bamboo hat instead!)
    if (!isEarth) {
      addColoredEllipsoid(hairMB, {
        cx: 0.0, cy: 1.668, cz: -0.012,
        rx: 0.088, ry: 0.082, rz: 0.088,
        latSegs: 14, lonSegs: 20,
        col: p.hair, rough: 0.52,
        b0: BONE.HEAD, w0: 1.0,
      });
    }

    // ---------------------------------------------------------------------
    // E. HEAD ACCESSORY: 五行特色发冠 / 簪 / 发带 / 抹额 / 扁斗笠
    // ---------------------------------------------------------------------
    const headMB = new SkinnedMeshBuilder();

    if (el === 'metal') {
      // [金行特征] 利落的金边小方冠
      const cy = 1.655, cz = -0.012;
      addColoredBox(headMB, {
        cx: 0.0, cy: cy, cz: cz,
        hx: 0.072, hy: 0.054, hz: 0.072,
        col: p.main, rough: 0.34,
        b0: BONE.HEAD, w0: 1.0,
      });
      // Crisp bright-gold top & bottom square crown rims
      addColoredBox(headMB, {
        cx: 0.0, cy: cy + 0.048, cz: cz,
        hx: 0.079, hy: 0.012, hz: 0.079,
        col: p.accent, rough: 0.22, emissive: 0.18,
        b0: BONE.HEAD, w0: 1.0,
      });
      addColoredBox(headMB, {
        cx: 0.0, cy: cy - 0.046, cz: cz,
        hx: 0.078, hy: 0.011, hz: 0.078,
        col: p.accent, rough: 0.22, emissive: 0.14,
        b0: BONE.HEAD, w0: 1.0,
      });
      // Tiny front gold crest bar
      addColoredBox(headMB, {
        cx: 0.0, cy: cy + 0.008, cz: cz + 0.074,
        hx: 0.014, hy: 0.036, hz: 0.008,
        col: p.accent, rough: 0.20, emissive: 0.22,
        b0: BONE.HEAD, w0: 1.0,
      });
    } else if (el === 'wood') {
      // [木行特征] 发髻插一根细竹青簪 + 素雅小玉环冠
      addColoredTorus(headMB, {
        cx: 0.0, cy: 1.630, cz: -0.012, majorR: 0.078, minorR: 0.012,
        col: p.trim, rough: 0.36, b0: BONE.HEAD, w0: 1.0,
      });
      // Slender bamboo-green hairpin piercing diagonally through the bun
      addColoredBox(headMB, {
        cx: 0.0, cy: 1.674, cz: -0.012,
        hx: 0.165, hy: 0.010, hz: 0.010,
        rotZ: 0.22, rotY: 0.14,
        col: p.pin, rough: 0.34, emissive: 0.10,
        b0: BONE.HEAD, w0: 1.0,
      });
      // Tiny white jade bead at right end of hairpin
      addColoredEllipsoid(headMB, {
        cx: 0.158, cy: 1.710, cz: -0.034,
        rx: 0.022, ry: 0.022, rz: 0.022,
        col: p.accent, rough: 0.24, emissive: 0.18,
        b0: BONE.HEAD, w0: 1.0,
      });
    } else if (el === 'water') {
      // [水行特征] 小发冠绑浅蓝短发带
      addColoredTorus(headMB, {
        cx: 0.0, cy: 1.634, cz: -0.012, majorR: 0.080, minorR: 0.015,
        col: p.trim, rough: 0.32, emissive: 0.08, b0: BONE.HEAD, w0: 1.0,
      });
      // Pair of short sky-blue trailing hair ribbons draped behind the bun (-Z)
      for (const side of [1, -1]) {
        headMB.addSmoothLoft([
          { cx: side * 0.064, y: 1.440, cz: -0.258, rx: 0.018, rz: 0.008, col: p.accent, ao: 0.96, b0: BONE.HEAD, w0: 1.0 },
          { cx: side * 0.048, y: 1.545, cz: -0.228, rx: 0.022, rz: 0.008, col: p.accent, ao: 0.99, b0: BONE.HEAD, w0: 1.0 },
          { cx: side * 0.024, y: 1.630, cz: -0.095, rx: 0.018, rz: 0.009, col: p.accent, ao: 1.00, b0: BONE.HEAD, w0: 1.0 },
        ], 10, 2, 0.56, true, true);
      }
    } else if (el === 'fire') {
      // [火行特征] 额头赤红抹额带 + 暗金发冠环
      addColoredTorus(headMB, {
        cx: 0.0, cy: 1.632, cz: -0.012, majorR: 0.078, minorR: 0.014,
        col: p.buckle, rough: 0.28, emissive: 0.12, b0: BONE.HEAD, w0: 1.0,
      });
      // Crimson forehead headband encircling the head right across the brow
      headMB.addSmoothLoft([
        { y: 1.448, cz: 0.005, rx: 0.236, rz: 0.224, col: p.accent, ao: 0.98, b0: BONE.HEAD, w0: 1.0 },
        { y: 1.486, cz: 0.005, rx: 0.232, rz: 0.220, col: p.accent, ao: 1.00, b0: BONE.HEAD, w0: 1.0 },
      ], 34, 1, 0.58, false, false);
      // Tiny dark-gold emblem centered on the forehead headband (+Z)
      addColoredBox(headMB, {
        cx: 0.0, cy: 1.468, cz: 0.228,
        hx: 0.022, hy: 0.022, hz: 0.009,
        rotZ: Math.PI * 0.25,
        col: p.buckle, rough: 0.24, emissive: 0.18,
        b0: BONE.HEAD, w0: 1.0,
      });
      // Short red headband tie tails at back of head (-Z)
      for (const side of [1, -1]) {
        headMB.addSmoothLoft([
          { cx: side * 0.044, y: 1.335, cz: -0.256, rx: 0.014, rz: 0.007, col: p.accent, ao: 0.95, b0: BONE.HEAD, w0: 1.0 },
          { cx: side * 0.018, y: 1.458, cz: -0.224, rx: 0.016, rz: 0.008, col: p.accent, ao: 0.99, b0: BONE.HEAD, w0: 1.0 },
        ], 10, 1, 0.60, true, true);
      }
    } else if (el === 'earth') {
      // [土行特征] 头顶低矮圆润的浅黄小扁斗笠（替代发冠）
      // Closed solid low rounded flat bamboo hat (outer dome + closed bottom cap!)
      headMB.addSmoothLoft([
        { y: 1.545, cz: 0.002, rx: 0.355, rz: 0.345, col: p.hatRim, ao: 0.92, b0: BONE.HEAD, w0: 1.0 },
        { y: 1.568, cz: 0.002, rx: 0.348, rz: 0.338, col: p.hat,    ao: 0.97, b0: BONE.HEAD, w0: 1.0 },
        { y: 1.622, cz: 0.002, rx: 0.242, rz: 0.236, col: p.hat,    ao: 1.00, b0: BONE.HEAD, w0: 1.0 },
        { y: 1.668, cz: 0.002, rx: 0.118, rz: 0.114, col: p.hat,    ao: 1.00, b0: BONE.HEAD, w0: 1.0 },
        { y: 1.686, cz: 0.002, rx: 0.036, rz: 0.036, col: p.trim,   ao: 0.98, b0: BONE.HEAD, w0: 1.0 },
      ], 34, 2, 0.74, true, true);
      // Woven rim band & cute top knot button
      addColoredTorus(headMB, {
        cx: 0.0, cy: 1.545, cz: 0.002, majorRx: 0.354, majorRz: 0.344, minorR: 0.013,
        col: p.trim, rough: 0.78, b0: BONE.HEAD, w0: 1.0,
      });
      addColoredEllipsoid(headMB, {
        cx: 0.0, cy: 1.694, cz: 0.002, rx: 0.034, ry: 0.022, rz: 0.034,
        col: p.trim, rough: 0.74, b0: BONE.HEAD, w0: 1.0,
      });
    }

    return {
      outfitTop: topMB.build(),
      outfitBottom: botMB.build(),
      belt: beltMB.build(),
      hair: hairMB.build(),
      headAccessory: headMB.build(),
    };
  }

  // Cache built outfit meshes lazily per outfitId for instant zero-lag swapping
  const _meshCache = {};
  const OUTFIT_MAP = {};
  for (const def of OUTFIT_DEFS) OUTFIT_MAP[def.id] = def;

  function getOutfitMeshes(outfitId) {
    if (!outfitId || !OUTFIT_MAP[outfitId]) return null;
    if (!_meshCache[outfitId]) {
      _meshCache[outfitId] = buildOutfitMeshes(OUTFIT_MAP[outfitId]);
    }
    return _meshCache[outfitId];
  }

  function applyOutfitToProtagonist(protagonist, outfitId) {
    if (!protagonist) return false;
    const slotNames = ['outfitTop', 'outfitBottom', 'belt', 'hair', 'headAccessory'];
    if (!outfitId || !OUTFIT_MAP[outfitId]) {
      for (const s of slotNames) protagonist.equip(s, null);
      return true;
    }
    const bundle = getOutfitMeshes(outfitId);
    for (const s of slotNames) {
      protagonist.equip(s, () => bundle[s]);
    }
    return true;
  }

  XW.Outfits = {
    OUTFIT_DEFS,
    OUTFIT_MAP,
    getOutfitMeshes,
    applyOutfitToProtagonist,
  };
})(window);
