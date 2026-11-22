(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;

  // =========================================================================
  // 1. SIX MAGICAL TREASURES CATALOG (3 攻击法宝 + 3 防御法宝 · 默认全在背包)
  // =========================================================================
  const TREASURE_DEFS = [
    {
      id: 'qingfeng_needle',
      name: '青锋飞针',
      icon: '针',
      category: 'attack',
      categoryLabel: '攻击法宝',
      slotType: 'treasure',
      mpCost: 12,
      cd: 4.5,
      dmgPct: 2.65,
      range: 28.0,
      autoRange: 20.0,
      tint: [0.64, 0.94, 0.96],
      desc: '攻击法宝（偏强势）· 自动或主动直线穿刺单体，造成 265% 攻击力伤害（耗灵12 · 冷却4.5s）',
      wearDesc: '悬浮于右肩斜上方，随移动轻柔上下浮动，尖端朝前微倾',
    },
    {
      id: 'liehuo_gourd',
      name: '烈火葫芦',
      icon: '葫',
      category: 'attack',
      categoryLabel: '攻击法宝',
      slotType: 'treasure',
      mpCost: 22,
      cd: 8.0,
      dmgPct: 1.25, // 5 ticks × 125% ATK
      range: 8.8,
      duration: 2.0,
      tint: [1.0, 0.44, 0.16],
      desc: '攻击法宝（均衡高爆发）· 悬于身前喷吐扇形火苗，2秒内 5 段每段 125% 攻击力范围灼烧（耗灵22 · 冷却8.0s）',
      wearDesc: '挂载于右侧腰间，随跑动做小幅钟摆晃动',
    },
    {
      id: 'zhenshan_seal',
      name: '镇山小印',
      icon: '印',
      category: 'attack',
      categoryLabel: '攻击法宝',
      slotType: 'treasure',
      mpCost: 24,
      cd: 9.5,
      dmgPct: 3.10,
      range: 22.0,
      aoeRadius: 4.8,
      staggerSec: 0.85,
      tint: [0.88, 0.72, 0.36],
      desc: '攻击法宝（偏控场·DPS略缓）· 升空放大下砸，造成 310% 攻击力范围伤害与 0.85s 硬直（耗灵24 · 冷却9.5s）',
      wearDesc: '悬浮于左肩后侧，缓慢自转',
    },
    {
      id: 'xuangui_shield',
      name: '玄龟小盾',
      icon: '盾',
      category: 'defense',
      categoryLabel: '防御法宝',
      slotType: 'treasure',
      mpCost: 20,
      cd: 11.5,
      shieldPct: 0.34,
      duration: 6.5,
      damageReduce: 0.30,
      tint: [0.86, 0.74, 0.42],
      desc: '防御法宝（偏强势）· 放大绕身公转，提供 34% 最大气血护盾 + 30% 减伤并拦截弹道（持续6.5s · 耗灵20 · 冷却11.5s）',
      wearDesc: '贴背微斜悬浮于背部中央，随移动轻微起伏',
    },
    {
      id: 'jingang_bell',
      name: '金刚铃',
      icon: '铃',
      category: 'defense',
      categoryLabel: '防御法宝',
      slotType: 'treasure',
      mpCost: 16,
      cd: 9.5,
      dmgPct: 2.05,
      aoeRadius: 6.2,
      knockback: 5.5,
      duration: 4.0,
      damageReduce: 0.28,
      tint: [1.0, 0.88, 0.46],
      desc: '防御法宝（均衡护主）· 受击自动或主动触发，造成 205% 攻击力音波震退并获 4 秒 28% 减伤（耗灵16 · 冷却9.5s）',
      wearDesc: '挂在左侧腰间，跑动时随身体晃动微颤',
    },
    {
      id: 'liuyun_scarf',
      name: '流云帕',
      icon: '帕',
      category: 'defense',
      categoryLabel: '防御法宝',
      slotType: 'treasure',
      mpCost: 18,
      cd: 10.5,
      duration: 5.0,
      speedRatio: 1.28,
      dodgeChance: 0.25,
      damageReduce: 0.22,
      tint: [0.76, 0.96, 0.98],
      desc: '防御法宝（偏轻灵·硬抗略弱）· 展开云幕 5 秒，提升 28% 移速、25% 闪避率与 22% 减伤（耗灵18 · 冷却10.5s）',
      wearDesc: '叠成窄条披挂于左臂/左肩侧，随风轻摆',
    },
  ];

  const TREASURE_MAP = {};
  for (const def of TREASURE_DEFS) TREASURE_MAP[def.id] = def;

  // =========================================================================
  // 1B. THREE SPIRIT FLYING SWORDS CATALOG (一品青锋剑 / 二品流云剑 / 三品惊鸿剑 · 默认全在背包)
  // =========================================================================
  const FLYING_SWORD_DEFS = [
    {
      id: 'sword_qingfeng',
      name: '青锋剑',
      icon: '青',
      gradeLabel: '一品灵剑',
      grade: 1,
      slotType: 'flyingSword',
      flightSpeed: 14.5,
      boostSpeed: 21.5,
      maxFlightAGL: 22.0,
      mpDrainPerSec: 3.2,
      boostStaminaPerSec: 16.0,
      flyScale: 1.62,
      backScale: 0.86,
      flightSpeedMul: 1.00,
      tint: [0.58, 0.78, 0.82],
      trailCol: [0.56, 0.90, 0.86],
      accentCol: [0.76, 0.98, 0.92],
      desc: '一品灵剑 · 窄长青灰铁剑，剑身光素、平直护手、深灰布缠柄、剑尾挂小青玉环。御剑速度 14.5m/s（加速 21.5m/s），限高 22m，浮空/飞行耗灵 3.2/s（加速另耗体力）',
      wearDesc: '陆行悬佩背后，御剑时横悬脚下低空掠行',
    },
    {
      id: 'sword_liuyun',
      name: '流云剑',
      icon: '云',
      gradeLabel: '二品灵剑',
      grade: 2,
      slotType: 'flyingSword',
      flightSpeed: 19.5,
      boostSpeed: 29.0,
      maxFlightAGL: 42.0,
      mpDrainPerSec: 3.6,
      boostStaminaPerSec: 16.0,
      flyScale: 1.70,
      backScale: 0.90,
      flightSpeedMul: 1.34,
      tint: [0.78, 0.96, 1.00],
      trailCol: [0.68, 0.96, 1.00],
      accentCol: [0.90, 0.99, 1.00],
      desc: '二品灵剑 · 银白泛淡青剑身带双浅槽与微光，张开云纹护手，深青带裹柄嵌灵石。御剑速度 19.5m/s（加速 29.0m/s），限高 42m，浮空/飞行耗灵 3.6/s（加速另耗体力）',
      wearDesc: '陆行悬佩背后流光轻漾，御剑时踏剑乘云穿林',
    },
    {
      id: 'sword_jinghong',
      name: '惊鸿剑',
      icon: '鸿',
      gradeLabel: '三品灵剑',
      grade: 3,
      slotType: 'flyingSword',
      flightSpeed: 25.0,
      boostSpeed: 37.0,
      maxFlightAGL: 68.0,
      mpDrainPerSec: 4.0,
      boostStaminaPerSec: 16.0,
      flyScale: 1.78,
      backScale: 0.94,
      flightSpeedMul: 1.72,
      tint: [0.38, 0.88, 1.00],
      trailCol: [0.36, 0.88, 1.00],
      accentCol: [0.80, 0.96, 1.00],
      desc: '三品灵剑 · 冰蓝玄青剑身泛冷光且镌清晰灵纹，展翼护手、暗金玉石柄与锋利流线剑尾。御剑速度 25.0m/s（加速 37.0m/s），限高 68m，浮空/飞行耗灵 4.0/s（加速另耗体力）',
      wearDesc: '陆行玄青剑气环背，御剑时寒芒破空凌霄高飞',
    },
  ];
  const FLYING_SWORD_MAP = {};
  for (const def of FLYING_SWORD_DEFS) FLYING_SWORD_MAP[def.id] = def;

  // =========================================================================
  // 2. PURE-CODE 3D TREASURE MESH BUILDER (12 floats/vert: pos3, nrm3, col3, meta3)
  //    Compatible with renderer._uploadWorldVAO() & this.prog.monster!
  // =========================================================================
  class TreasureMeshBuilder {
    constructor() {
      this.verts = [];
      this.indices = [];
      this.vCount = 0;
    }

    pushVert(x, y, z, nx, ny, nz, col, rough = 0.42, emissive = 0.0) {
      const len = Math.hypot(nx, ny, nz) || 1.0;
      this.verts.push(x, y, z, nx / len, ny / len, nz / len, col[0], col[1], col[2], rough, emissive, 0.0);
      return this.vCount++;
    }

    addTri(a, b, c) { this.indices.push(a, b, c); }
    addQuad(a, b, c, d) { this.indices.push(a, b, c, a, c, d); }

    _rotVec(x, y, z, rx, ry, rz) {
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

    addEllipsoid(cx, cy, cz, rx, ry, rz, col, rough = 0.42, emissive = 0.0, uSegs = 16, vSegs = 10, topCol = null, botCol = null) {
      const base = this.vCount;
      const stride = uSegs + 1;
      const tc = topCol || col;
      const bc = botCol || col;
      for (let iv = 0; iv <= vSegs; iv++) {
        const phi = (iv / vSegs) * Math.PI;
        const sp = Math.sin(phi), cp = Math.cos(phi);
        const hMix = cp * 0.5 + 0.5;
        const cRow = hMix >= 0.5
          ? [M.lerp(col[0], tc[0], (hMix - 0.5) * 2), M.lerp(col[1], tc[1], (hMix - 0.5) * 2), M.lerp(col[2], tc[2], (hMix - 0.5) * 2)]
          : [M.lerp(bc[0], col[0], hMix * 2), M.lerp(bc[1], col[1], hMix * 2), M.lerp(bc[2], col[2], hMix * 2)];
        for (let iu = 0; iu <= uSegs; iu++) {
          const th = (iu / uSegs) * Math.PI * 2;
          const ct = Math.cos(th), st = Math.sin(th);
          this.pushVert(
            cx + rx * sp * ct, cy + ry * cp, cz + rz * sp * st,
            sp * ct / Math.max(rx, 0.01), cp / Math.max(ry, 0.01), sp * st / Math.max(rz, 0.01),
            cRow, rough, emissive
          );
        }
      }
      for (let iv = 0; iv < vSegs; iv++) {
        for (let iu = 0; iu < uSegs; iu++) {
          const a = base + iv * stride + iu;
          const b = a + 1, c = a + stride, d = c + 1;
          this.addTri(a, c, b);
          this.addTri(b, c, d);
        }
      }
    }

    addBox(cx, cy, cz, hx, hy, hz, col, rough = 0.45, emissive = 0.0, rx = 0, ry = 0, rz = 0, topCol = null) {
      const tc = topCol || col;
      const faces = [
        { n: [ 0,  0,  1], v: [[-hx,-hy, hz], [ hx,-hy, hz], [ hx, hy, hz], [-hx, hy, hz]] },
        { n: [ 0,  0, -1], v: [[ hx,-hy,-hz], [-hx,-hy,-hz], [-hx, hy,-hz], [ hx, hy,-hz]] },
        { n: [ 1,  0,  0], v: [[ hx,-hy, hz], [ hx,-hy,-hz], [ hx, hy,-hz], [ hx, hy, hz]] },
        { n: [-1,  0,  0], v: [[-hx,-hy,-hz], [-hx,-hy, hz], [-hx, hy, hz], [-hx, hy,-hz]] },
        { n: [ 0,  1,  0], v: [[-hx, hy, hz], [ hx, hy, hz], [ hx, hy,-hz], [-hx, hy,-hz]] },
        { n: [ 0, -1,  0], v: [[-hx,-hy,-hz], [ hx,-hy,-hz], [ hx,-hy, hz], [-hx,-hy, hz]] },
      ];
      for (const f of faces) {
        const rn = this._rotVec(f.n[0], f.n[1], f.n[2], rx, ry, rz);
        const base = this.vCount;
        for (const pt of f.v) {
          const rp = this._rotVec(pt[0], pt[1], pt[2], rx, ry, rz);
          this.pushVert(cx + rp[0], cy + rp[1], cz + rp[2], rn[0], rn[1], rn[2], pt[1] > 0 ? tc : col, rough, emissive);
        }
        this.addQuad(base, base + 1, base + 2, base + 3);
      }
    }

    addLatheY(profile, segs, col, rough = 0.40, emissive = 0.0, capTop = true, capBot = true) {
      // profile: [{ y, r, col? }]
      const base = this.vCount;
      const stride = segs + 1;
      for (let ip = 0; ip < profile.length; ip++) {
        const cur = profile[ip];
        const prev = profile[Math.max(0, ip - 1)];
        const next = profile[Math.min(profile.length - 1, ip + 1)];
        const dy = next.y - prev.y;
        const dr = next.r - prev.r;
        const ny = -dr;
        const nr = dy >= 0 ? Math.max(0.01, dy) : Math.min(-0.01, dy);
        const cRow = cur.col || col;
        for (let is = 0; is <= segs; is++) {
          const a = (is / segs) * Math.PI * 2;
          const ca = Math.cos(a), sa = Math.sin(a);
          this.pushVert(ca * cur.r, cur.y, sa * cur.r, ca * Math.abs(nr), ny, sa * Math.abs(nr), cRow, rough, emissive);
        }
      }
      for (let ip = 0; ip < profile.length - 1; ip++) {
        for (let is = 0; is < segs; is++) {
          const a = base + ip * stride + is;
          const b = a + 1, c = a + stride, d = c + 1;
          this.addTri(a, b, c);
          this.addTri(b, d, c);
        }
      }
      if (capBot && profile[0].r > 0.002) {
        const p0 = profile[0];
        const cIdx = this.pushVert(0, p0.y, 0, 0, -1, 0, p0.col || col, rough, emissive);
        for (let is = 0; is < segs; is++) this.addTri(cIdx, base + is + 1, base + is);
      }
      if (capTop && profile[profile.length - 1].r > 0.002) {
        const pn = profile[profile.length - 1];
        const topBase = base + (profile.length - 1) * stride;
        const cIdx = this.pushVert(0, pn.y, 0, 0, 1, 0, pn.col || col, rough, emissive);
        for (let is = 0; is < segs; is++) this.addTri(cIdx, topBase + is, topBase + is + 1);
      }
    }

    addTorus(cx, cy, cz, majorR, minorR, col, rough = 0.28, emissive = 0.0, rx = 0, ry = 0, rz = 0, segs = 20, tubeSegs = 8) {
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

    build() {
      return {
        vertices: new Float32Array(this.verts),
        indices: this.vCount > 65000 ? new Uint32Array(this.indices) : new Uint16Array(this.indices),
      };
    }
  }

  // --- 1) 青锋飞针: 精雕八棱银青双锥菱形飞针 + 镂空双道金环与四颗微光灵珠 (pointing along +Z) ---
  function buildQingfengNeedleMesh() {
    const b = new TreasureMeshBuilder();
    const silverCyan = [0.74, 0.92, 0.95];
    const deepCyan   = [0.46, 0.72, 0.80];
    const tipBright  = [0.92, 0.99, 1.00];
    const tailCyan   = [0.54, 0.78, 0.84];
    const goldRing   = [0.98, 0.84, 0.36];
    const goldDark   = [0.78, 0.62, 0.22];

    // 8-faceted precision diamond double-cone along Z with stepped fuller groove:
    // Front tip z=+0.66 -> front shoulder z=+0.22 -> waist z=+0.05 -> rear shoulder z=-0.16 -> tail tip z=-0.52
    const segs = 8;
    const zZones = [
      { z: -0.52, rx: 0.000, ry: 0.000, col: tailCyan,   em: 0.16 },
      { z: -0.22, rx: 0.044, ry: 0.034, col: deepCyan,   em: 0.14 },
      { z:  0.00, rx: 0.072, ry: 0.054, col: silverCyan, em: 0.20 },
      { z:  0.12, rx: 0.072, ry: 0.054, col: silverCyan, em: 0.22 },
      { z:  0.34, rx: 0.042, ry: 0.032, col: silverCyan, em: 0.28 },
      { z:  0.66, rx: 0.000, ry: 0.000, col: tipBright,  em: 0.45 },
    ];
    for (let iz = 0; iz < zZones.length - 1; iz++) {
      const z0 = zZones[iz], z1 = zZones[iz + 1];
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        const am = (a0 + a1) * 0.5;
        // Alternate major diamond ridge & minor bevel facet for crisp sword-needle geometry
        const rMod0 = (i % 2 === 0) ? 1.08 : 0.86;
        const rMod1 = ((i + 1) % 2 === 0) ? 1.08 : 0.86;
        const x00 = Math.cos(a0) * z0.rx * rMod0, y00 = Math.sin(a0) * z0.ry * rMod0;
        const x01 = Math.cos(a1) * z0.rx * rMod1, y01 = Math.sin(a1) * z0.ry * rMod1;
        const x10 = Math.cos(a0) * z1.rx * rMod0, y10 = Math.sin(a0) * z1.ry * rMod0;
        const x11 = Math.cos(a1) * z1.rx * rMod1, y11 = Math.sin(a1) * z1.ry * rMod1;
        const nx = Math.cos(am), ny = Math.sin(am), nz = (z0.rx - z1.rx) / Math.max(0.05, z1.z - z0.z);
        const facetCol0 = (i % 2 === 0) ? z0.col : [z0.col[0] * 0.88, z0.col[1] * 0.92, z0.col[2] * 0.95];
        const facetCol1 = (i % 2 === 0) ? z1.col : [z1.col[0] * 0.88, z1.col[1] * 0.92, z1.col[2] * 0.95];
        const v0 = b.pushVert(x00, y00, z0.z, nx, ny, nz, facetCol0, 0.18, z0.em);
        const v1 = b.pushVert(x01, y01, z0.z, nx, ny, nz, facetCol0, 0.18, z0.em);
        const v2 = b.pushVert(x11, y11, z1.z, nx, ny, nz, facetCol1, 0.18, z1.em);
        const v3 = b.pushVert(x10, y10, z1.z, nx, ny, nz, facetCol1, 0.18, z1.em);
        b.addQuad(v0, v1, v2, v3);
      }
    }

    // 4 sharp glowing cyan blood-groove / spirit-vein ridges along the needle body
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      b.addBox(ca * 0.048, sa * 0.038, 0.08, 0.008, 0.008, 0.24, tipBright, 0.16, 0.52, 0, 0, a);
    }

    // Intricate central golden collar: main gold ring + twin filigree sub-rings + 4 embedded cyan spirit gems
    b.addTorus(0, 0, 0.06, 0.076, 0.015, goldRing, 0.18, 0.45, Math.PI * 0.5, 0, 0, 24, 10);
    b.addTorus(0, 0, 0.02, 0.071, 0.009, goldDark, 0.22, 0.28, Math.PI * 0.5, 0, 0, 20, 8);
    b.addTorus(0, 0, 0.10, 0.071, 0.009, goldDark, 0.22, 0.28, Math.PI * 0.5, 0, 0, 20, 8);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI * 0.25;
      b.addEllipsoid(Math.cos(a) * 0.078, Math.sin(a) * 0.078, 0.06, 0.014, 0.014, 0.018, tipBright, 0.14, 0.65, 8, 6);
    }
    return b.build();
  }

  // --- 2) 烈火葫芦: 精雕一体双球流线暗红葫芦身 + 赤金底座 + 腰系双股金绳流苏玉佩 + 雕花木塞火纹口 ---
  function buildLiehuoGourdMesh() {
    const b = new TreasureMeshBuilder();
    const darkRed   = [0.64, 0.11, 0.08];
    const midRed    = [0.76, 0.17, 0.11];
    const brightRed = [0.88, 0.24, 0.14];
    const deepRed   = [0.38, 0.06, 0.05];
    const goldCord  = [0.94, 0.76, 0.34];
    const bronzeRim = [0.62, 0.46, 0.22];
    const brownWood = [0.36, 0.21, 0.12];
    const corkTop   = [0.48, 0.30, 0.17];
    const emberGlow = [1.00, 0.52, 0.16];

    // Smooth continuous 18-ring gourd lathe profile (bottom foot -> plump lower belly -> pinched waist -> upper bulb -> flared mouth)
    b.addLatheY([
      { y: -0.35, r: 0.082, col: bronzeRim },
      { y: -0.33, r: 0.125, col: deepRed },
      { y: -0.28, r: 0.188, col: darkRed },
      { y: -0.20, r: 0.224, col: midRed },
      { y: -0.11, r: 0.216, col: brightRed },
      { y: -0.03, r: 0.162, col: darkRed },
      { y:  0.01, r: 0.106, col: deepRed },   // Pinched gourd waist
      { y:  0.05, r: 0.138, col: darkRed },
      { y:  0.12, r: 0.162, col: brightRed },
      { y:  0.19, r: 0.146, col: midRed },
      { y:  0.24, r: 0.096, col: darkRed },
      { y:  0.27, r: 0.062, col: bronzeRim }, // Gold-rimmed gourd mouth collar
      { y:  0.32, r: 0.058, col: darkRed },
      { y:  0.33, r: 0.068, col: brownWood }, // Carved wooden stopper plug
      { y:  0.39, r: 0.058, col: corkTop },
      { y:  0.42, r: 0.042, col: goldCord },
    ], 26, darkRed, 0.28, 0.10, true, true);

    // Engraved bronze-gold base ring & mouth collar ring
    b.addTorus(0, -0.335, 0, 0.108, 0.014, bronzeRim, 0.28, 0.16, 0, 0, 0, 22, 8);
    b.addTorus(0,  0.272, 0, 0.064, 0.010, goldCord,  0.24, 0.30, 0, 0, 0, 20, 8);
    // Glowing fire-rune gem embedded on top of the cork stopper
    b.addEllipsoid(0, 0.425, 0, 0.028, 0.016, 0.028, emberGlow, 0.18, 0.65, 10, 6);

    // 6 subtle flame-gold relief medallions around the lower belly
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      b.addBox(ca * 0.222, -0.15, sa * 0.222, 0.024, 0.048, 0.010, goldCord, 0.26, 0.28, 0, -a + Math.PI * 0.5, 0);
    }

    // Double braided gold waist cord + side knot + hanging crimson-gold tassel pendant
    b.addTorus(0, 0.018, 0, 0.114, 0.014, goldCord, 0.24, 0.26, 0.04, 0, 0, 22, 8);
    b.addTorus(0, 0.002, 0, 0.116, 0.012, bronzeRim, 0.28, 0.18, -0.04, 0, 0, 22, 8);
    b.addEllipsoid(0.125, 0.010, 0.0, 0.026, 0.024, 0.026, goldCord, 0.24, 0.32, 10, 8);
    b.addBox(0.145, -0.055, 0.0, 0.012, 0.058, 0.012, brightRed, 0.35, 0.30, 0, 0, -0.18);
    b.addEllipsoid(0.152, -0.032, 0.0, 0.018, 0.018, 0.018, emberGlow, 0.18, 0.55, 8, 6);
    return b.build();
  }

  // --- 3) 镇山小印: 三层阶梯黑铁青铜方印台 + 四角蟠龙铜柱与回纹金边 + 印底发光篆印符纹 + 拱桥山峰金印纽 ---
  function buildZhenshanSealMesh() {
    const b = new TreasureMeshBuilder();
    const darkIron   = [0.20, 0.22, 0.22];
    const ironMid    = [0.28, 0.30, 0.28];
    const bronzeEdge = [0.54, 0.46, 0.28];
    const knobGold   = [0.86, 0.72, 0.36];
    const runeGlow   = [0.98, 0.82, 0.38];

    // Tier 1: Wide lower bronze-rimmed seal base + glowing golden seal-script reliefs underneath!
    b.addBox(0, -0.095, 0, 0.262, 0.022, 0.262, bronzeEdge, 0.32, 0.14, 0, 0, 0, bronzeEdge);
    // Main heavy dark-iron square seal block
    b.addBox(0, -0.005, 0, 0.242, 0.088, 0.242, darkIron, 0.40, 0.05, 0, 0, 0, ironMid);
    // 4 Corner antique-bronze reinforced pilasters + 4 side golden fretwork plaques
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        b.addBox(sx * 0.236, -0.005, sz * 0.236, 0.026, 0.094, 0.026, bronzeEdge, 0.30, 0.14);
      }
    }
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI * 0.5;
      const ca = Math.cos(a), sa = Math.sin(a);
      b.addBox(ca * 0.246, -0.005, sa * 0.246, 0.14, 0.036, 0.012, knobGold, 0.26, 0.24, 0, -a + Math.PI * 0.5, 0);
    }
    // Glowing golden seal-character relief grid on underside (y = -0.118)
    for (const u of [-0.13, 0, 0.13]) {
      b.addBox(u, -0.116, 0, 0.018, 0.006, 0.19, runeGlow, 0.20, 0.65);
      b.addBox(0, -0.116, u, 0.19, 0.006, 0.018, runeGlow, 0.20, 0.65);
    }

    // Tier 2 & 3: Stepped upper bronze plinths
    b.addBox(0, 0.098, 0, 0.196, 0.026, 0.196, bronzeEdge, 0.32, 0.12, 0, 0, 0, bronzeEdge);
    b.addBox(0, 0.136, 0, 0.148, 0.020, 0.148, darkIron,   0.36, 0.08, 0, 0, 0, ironMid);

    // Sculpted arched bridge handle (印纽) + central round mountain-crest golden orb & twin side peaks
    b.addBox(-0.068, 0.182, 0, 0.024, 0.042, 0.036, bronzeEdge, 0.30, 0.14, 0, 0, -0.28);
    b.addBox( 0.068, 0.182, 0, 0.024, 0.042, 0.036, bronzeEdge, 0.30, 0.14, 0, 0,  0.28);
    b.addTorus(0, 0.196, 0, 0.056, 0.016, bronzeEdge, 0.28, 0.16, 0, 0, 0, 18, 8);
    b.addEllipsoid(0, 0.252, 0, 0.094, 0.090, 0.094, knobGold, 0.24, 0.26, 16, 12, runeGlow, bronzeEdge);
    b.addTorus(0, 0.212, 0, 0.068, 0.012, runeGlow, 0.22, 0.36, 0, 0, 0, 18, 8);
    return b.build();
  }

  // --- 4) 玄龟小盾: 精雕双层边框八边形青铜圆盾 + 立体内外圈浅金龟甲六边形凸纹与八角金铆钉 (faces +Z) ---
  function buildXuanguiShieldMesh() {
    const b = new TreasureMeshBuilder();
    const bronze     = [0.46, 0.42, 0.28];
    const bronzeLit  = [0.58, 0.52, 0.34];
    const bronzeDark = [0.26, 0.24, 0.18];
    const paleGold   = [0.92, 0.80, 0.44];
    const amberGlow  = [1.00, 0.88, 0.48];

    // Domed octagonal bronze shield body (center crown z=+0.082 -> inner ring z=+0.062 -> outer rim z=+0.044, back z=-0.040)
    const segs = 8;
    const rOut = 0.41, rMid = 0.35;
    const zF = 0.046, zM = 0.064, zB = -0.040;
    const cFront = b.pushVert(0, 0, 0.084, 0, 0, 1, bronzeLit, 0.32, 0.08);
    const cBack  = b.pushVert(0, 0, zB - 0.012, 0, 0, -1, bronzeDark, 0.48, 0.0);

    const fPts = [], mPts = [], bPts = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2 + Math.PI / 8;
      const ca = Math.cos(a), sa = Math.sin(a);
      fPts.push([ca * rOut, sa * rOut, zF]);
      mPts.push([ca * rMid, sa * rMid, zM]);
      bPts.push([ca * rOut, sa * rOut, zB]);
    }
    for (let i = 0; i < segs; i++) {
      const p0 = fPts[i], p1 = fPts[(i + 1) % segs];
      const m0 = mPts[i], m1 = mPts[(i + 1) % segs];
      const q0 = bPts[i], q1 = bPts[(i + 1) % segs];
      // Inner domed octant (center -> m0 -> m1)
      const vm0 = b.pushVert(m0[0], m0[1], m0[2], m0[0] * 0.25, m0[1] * 0.25, 0.96, bronze, 0.34, 0.06);
      const vm1 = b.pushVert(m1[0], m1[1], m1[2], m1[0] * 0.25, m1[1] * 0.25, 0.96, bronze, 0.34, 0.06);
      b.addTri(cFront, vm0, vm1);
      // Outer stepped bronze frame ring (m0 -> p0 -> p1 -> m1)
      const vp0 = b.pushVert(p0[0], p0[1], p0[2], p0[0] * 0.3, p0[1] * 0.3, 0.92, bronzeDark, 0.36, 0.05);
      const vp1 = b.pushVert(p1[0], p1[1], p1[2], p1[0] * 0.3, p1[1] * 0.3, 0.92, bronzeDark, 0.36, 0.05);
      b.addQuad(vm0, vp0, vp1, vm1);
      // Back octant
      const u0 = b.pushVert(q0[0], q0[1], q0[2], 0, 0, -1, bronzeDark, 0.48, 0.0);
      const u1 = b.pushVert(q1[0], q1[1], q1[2], 0, 0, -1, bronzeDark, 0.48, 0.0);
      b.addTri(cBack, u1, u0);
      // Raised golden outer bevel rim bar & corner rivet stud
      const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5;
      const edgeAng = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      const sideLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      b.addBox(mx, my, zF + 0.008, sideLen * 0.50, 0.022, 0.024, paleGold, 0.24, 0.22, 0, 0, edgeAng);
      b.addEllipsoid(p0[0] * 0.92, p0[1] * 0.92, zF + 0.022, 0.020, 0.020, 0.016, amberGlow, 0.20, 0.36, 8, 6);
      // Side rim wall
      const e0 = b.pushVert(p0[0], p0[1], p0[2], mx, my, 0.15, paleGold, 0.26, 0.18);
      const e1 = b.pushVert(p1[0], p1[1], p1[2], mx, my, 0.15, paleGold, 0.26, 0.18);
      const e2 = b.pushVert(q1[0], q1[1], q1[2], mx, my, -0.15, bronze, 0.34, 0.10);
      const e3 = b.pushVert(q0[0], q0[1], q0[2], mx, my, -0.15, bronze, 0.34, 0.10);
      b.addQuad(e0, e3, e2, e1);
    }

    // Multi-cell pale-gold hexagonal tortoise-shell pattern ridges (中心龟甲六角盘 + 6条放射肋纹 + 6道外环龟甲边)
    const hexR = 0.148;
    const outerHexR = 0.295;
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2;
      const a1 = ((i + 1) / 6) * Math.PI * 2;
      const x0 = Math.cos(a0) * hexR, y0 = Math.sin(a0) * hexR;
      const x1 = Math.cos(a1) * hexR, y1 = Math.sin(a1) * hexR;
      const edgeAngle = Math.atan2(y1 - y0, x1 - x0);
      // Inner hexagon ridge bar
      b.addBox((x0 + x1) * 0.5, (y0 + y1) * 0.5, zM + 0.022, hexR * 0.52, 0.017, 0.016, paleGold, 0.24, 0.26, 0, 0, edgeAngle);
      // Outer hexagonal scute ridge bar
      const ox0 = Math.cos(a0) * outerHexR, oy0 = Math.sin(a0) * outerHexR;
      const ox1 = Math.cos(a1) * outerHexR, oy1 = Math.sin(a1) * outerHexR;
      b.addBox((ox0 + ox1) * 0.5, (oy0 + oy1) * 0.5, zM + 0.010, outerHexR * 0.50, 0.015, 0.014, paleGold, 0.26, 0.22, 0, 0, edgeAngle);
      // Radial tortoise-shell spoke connecting inner & outer hexagons
      const sx = Math.cos(a0) * ((hexR + outerHexR) * 0.5);
      const sy = Math.sin(a0) * ((hexR + outerHexR) * 0.5);
      b.addBox(sx, sy, zM + 0.016, (outerHexR - hexR) * 0.52, 0.016, 0.015, paleGold, 0.24, 0.24, 0, 0, a0);
      // Raised scute plate center boss inside each of the 6 outer cells
      const am = (a0 + a1) * 0.5;
      b.addBox(Math.cos(am) * 0.22, Math.sin(am) * 0.22, zM + 0.008, 0.042, 0.026, 0.010, bronzeLit, 0.30, 0.14, 0, 0, am);
    }
    // Center tortoise-shell golden boss & rear grip handle
    b.addEllipsoid(0, 0, 0.088, 0.072, 0.072, 0.028, paleGold, 0.22, 0.32, 14, 10);
    b.addTorus(0, 0, 0.082, 0.078, 0.010, amberGlow, 0.20, 0.42, 0, 0, 0, 18, 6);
    b.addBox(0, 0, zB - 0.022, 0.028, 0.14, 0.018, bronzeDark, 0.45, 0.0);
    return b.build();
  }

  // --- 5) 金刚铃: 精雕莲瓣喇叭淡金铃身 + 三道梵纹金箍与八棱竖脊 + 金刚杵柄吊环 + 悬垂金铃舌 ---
  function buildJingangBellMesh() {
    const b = new TreasureMeshBuilder();
    const paleGold   = [0.94, 0.84, 0.46];
    const brightGold = [1.00, 0.93, 0.60];
    const deepGold   = [0.74, 0.58, 0.24];
    const innerDark  = [0.32, 0.24, 0.12];
    const gemGlow    = [1.00, 0.96, 0.72];

    // Sculpted flared bell body + dark hollow interior cavity + Vajra crown handle
    b.addLatheY([
      { y: -0.12, r: 0.020, col: innerDark },  // Hollow interior ceiling
      { y: -0.18, r: 0.132, col: innerDark },
      { y: -0.225, r: 0.172, col: brightGold }, // Inner lip -> outer mouth flare
      { y: -0.22, r: 0.186, col: brightGold },
      { y: -0.18, r: 0.156, col: paleGold },
      { y: -0.11, r: 0.132, col: paleGold },
      { y: -0.02, r: 0.112, col: paleGold },
      { y:  0.07, r: 0.088, col: paleGold },
      { y:  0.13, r: 0.056, col: deepGold },   // Shoulder dome
      { y:  0.15, r: 0.068, col: brightGold }, // Lotus crown base
      { y:  0.18, r: 0.036, col: deepGold },   // Vajra handle waist
      { y:  0.22, r: 0.048, col: brightGold }, // Vajra handle bulb
      { y:  0.26, r: 0.022, col: deepGold },
    ], 24, paleGold, 0.22, 0.22, true, false);

    // 3 Horizontal engraved golden relief bands around bell mouth, mid-waist & shoulder
    b.addTorus(0, -0.220, 0, 0.184, 0.016, brightGold, 0.18, 0.38, 0, 0, 0, 24, 8);
    b.addTorus(0, -0.095, 0, 0.130, 0.011, brightGold, 0.20, 0.30, 0, 0, 0, 22, 8);
    b.addTorus(0,  0.055, 0, 0.094, 0.010, deepGold,   0.22, 0.24, 0, 0, 0, 20, 8);

    // 8 Vertical sculpted golden ribs along the bell exterior + 4 Vajra handle prongs
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      b.addBox(ca * 0.122, -0.07, sa * 0.122, 0.010, 0.115, 0.012, brightGold, 0.20, 0.28, -0.24, -a, 0);
    }
    // Top hanging suspension ring
    b.addTorus(0, 0.285, 0, 0.038, 0.012, brightGold, 0.20, 0.28, Math.PI * 0.5, 0, 0, 16, 6);
    // Internal clapper rod & glowing golden spherical clapper (小圆铃舌)
    b.addBox(0, -0.175, 0, 0.012, 0.065, 0.012, deepGold, 0.26, 0.20);
    b.addEllipsoid(0, -0.248, 0, 0.046, 0.046, 0.046, gemGlow, 0.18, 0.48, 14, 10, brightGold, deepGold);
    b.addTorus(0, -0.248, 0, 0.048, 0.008, brightGold, 0.18, 0.38, 0, 0, 0, 14, 6);
    return b.build();
  }

  // --- 6) 流云帕 (精细丝绸褶皱叠帕 + 亮白流光云纹滚边 + 激活展开的多层流云光幕) ---
  function buildLiuyunFoldedMesh() {
    const uS = 8, vS = 16;
    const verts = [];
    const indices = [];
    const stride = uS + 1;
    for (let iv = 0; iv <= vS; iv++) {
      const v = iv / vS;
      const y = -v * 0.66;
      const waveZ = Math.sin(v * Math.PI * 2.1) * 0.048 * v;
      const swayX = Math.sin(v * Math.PI * 1.4) * 0.018 * v;
      const width = 0.22 * (1.0 + v * 0.14);
      for (let iu = 0; iu <= uS; iu++) {
        const u = iu / uS;
        const x = swayX + (u - 0.5) * width;
        const pleatZ = Math.cos((u - 0.5) * Math.PI) * 0.026 + Math.sin(u * Math.PI * 3.0) * 0.007;
        verts.push(x, y, waveZ + pleatZ, (u - 0.5) * 0.35, 0.14, 0.94);
      }
    }
    for (let iv = 0; iv < vS; iv++) {
      for (let iu = 0; iu < uS; iu++) {
        const a = iv * stride + iu;
        const b = a + 1, c = a + stride, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildLiuyunBorderMesh() {
    const verts = [];
    const indices = [];
    const addQuad = (x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3) => {
      const base = verts.length / 6;
      verts.push(x0, y0, z0, 0, 0, 1,  x1, y1, z1, 0, 0, 1,  x2, y2, z2, 0, 0, 1,  x3, y3, z3, 0, 0, 1);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const t = 0.018, h = 0.66;
    const segs = 16;
    for (let i = 0; i < segs; i++) {
      const v0 = i / segs, v1 = (i + 1) / segs;
      const y0 = -v0 * h, y1 = -v1 * h;
      const z0 = Math.sin(v0 * Math.PI * 2.1) * 0.048 * v0 + 0.006;
      const z1 = Math.sin(v1 * Math.PI * 2.1) * 0.048 * v1 + 0.006;
      const sx0 = Math.sin(v0 * Math.PI * 1.4) * 0.018 * v0;
      const sx1 = Math.sin(v1 * Math.PI * 1.4) * 0.018 * v1;
      const w0 = 0.112 * (1.0 + v0 * 0.14);
      const w1 = 0.112 * (1.0 + v1 * 0.14);
      addQuad(sx0 - w0, y0, z0, sx0 - w0 + t, y0, z0, sx1 - w1 + t, y1, z1, sx1 - w1, y1, z1);
      addQuad(sx0 + w0 - t, y0, z0, sx0 + w0, y0, z0, sx1 + w1, y1, z1, sx1 + w1 - t, y1, z1);
    }
    addQuad(-0.112, 0.0, 0.018, 0.112, 0.0, 0.018, 0.112, -t, 0.018, -0.112, -t, 0.018);
    const zEnd = Math.sin(Math.PI * 2.1) * 0.048 + 0.012;
    const sxEnd = Math.sin(Math.PI * 1.4) * 0.018;
    const wEnd = 0.112 * 1.14;
    addQuad(sxEnd - wEnd, -h + t, zEnd, sxEnd + wEnd, -h + t, zEnd, sxEnd + wEnd, -h, zEnd, sxEnd - wEnd, -h, zEnd);
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildLiuyunVeilMesh() {
    const segs = 32, rings = 10;
    const verts = [];
    const indices = [];
    const stride = segs + 1;
    for (let ir = 0; ir <= rings; ir++) {
      const v = ir / rings;
      const y = (v - 0.5) * 1.72;
      const flare = 0.96 + Math.sin(v * Math.PI) * 0.22;
      for (let is = 0; is <= segs; is++) {
        const a = (is / segs) * Math.PI * 2;
        const ripple = 1.0 + Math.sin(a * 4.0 + v * 5.0) * 0.075 + Math.cos(a * 2.0 - v * 3.0) * 0.035;
        const r = flare * ripple;
        const ca = Math.cos(a), sa = Math.sin(a);
        verts.push(ca * r, y, sa * r, ca, 0.14, sa);
      }
    }
    for (let ir = 0; ir < rings; ir++) {
      for (let is = 0; is < segs; is++) {
        const a = ir * stride + is;
        const b = a + 1, c = a + stride, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  // Helper: 4-faceted diamond sword blade tapering cleanly from zStart (+Z guard) to sharp point zTip (-Z forward!)
  function addDiamondSwordBlade(b, zStart, zTip, halfWBase, halfWTipNeck, halfHBase, spineCol, edgeCol, rough = 0.24, spineEm = 0.0, edgeEm = 0.0) {
    const zNeck = zTip + (zStart - zTip) * 0.16;
    const rings = [
      { z: zStart, w: halfWBase,     h: halfHBase },
      { z: M.lerp(zStart, zNeck, 0.55), w: halfWBase * 0.90, h: halfHBase * 0.88 },
      { z: zNeck,  w: halfWTipNeck,  h: halfHBase * 0.68 },
      { z: zTip,   w: 0.002,         h: 0.002 },
    ];
    for (let i = 0; i < rings.length - 1; i++) {
      const r0 = rings[i], r1 = rings[i + 1];
      // 4 facets: Top-Right, Top-Left, Bot-Left, Bot-Right
      const facets = [
        { p0: [0, r0.h, r0.z],  p1: [r0.w, 0, r0.z],  p2: [r1.w, 0, r1.z],  p3: [0, r1.h, r1.z],  n: [ 0.35,  1.0, 0], c0: spineCol, c1: edgeCol, e0: spineEm, e1: edgeEm },
        { p0: [-r0.w, 0, r0.z], p1: [0, r0.h, r0.z],  p2: [0, r1.h, r1.z],  p3: [-r1.w, 0, r1.z], n: [-0.35,  1.0, 0], c0: edgeCol,  c1: spineCol, e0: edgeEm, e1: spineEm },
        { p0: [0, -r0.h, r0.z], p1: [-r0.w, 0, r0.z], p2: [-r1.w, 0, r1.z], p3: [0, -r1.h, r1.z], n: [-0.35, -1.0, 0], c0: spineCol, c1: edgeCol, e0: spineEm, e1: edgeEm },
        { p0: [r0.w, 0, r0.z],  p1: [0, -r0.h, r0.z], p2: [0, -r1.h, r1.z], p3: [r1.w, 0, r1.z],  n: [ 0.35, -1.0, 0], c0: edgeCol,  c1: spineCol, e0: edgeEm, e1: spineEm },
      ];
      for (const f of facets) {
        const v0 = b.pushVert(f.p0[0], f.p0[1], f.p0[2], f.n[0], f.n[1], f.n[2], f.c0, rough, f.e0);
        const v1 = b.pushVert(f.p1[0], f.p1[1], f.p1[2], f.n[0], f.n[1], f.n[2], f.c1, rough, f.e1);
        const v2 = b.pushVert(f.p2[0], f.p2[1], f.p2[2], f.n[0], f.n[1], f.n[2], f.c1, rough, f.e1);
        const v3 = b.pushVert(f.p3[0], f.p3[1], f.p3[2], f.n[0], f.n[1], f.n[2], f.c0, rough, f.e0);
        b.addQuad(v0, v1, v2, v3);
      }
    }
  }

  // --- 一品灵剑：青锋剑 (精修版 · 窄长青灰铁剑，剑身光素带脊线寒锋，平直铁格护手与剑吞口，深灰布斜缠柄，剑尾挂小青玉环) ---
  function buildQingfengSwordMesh() {
    const b = new TreasureMeshBuilder();
    const ironSpine  = [0.42, 0.54, 0.59];
    const ironEdge   = [0.76, 0.86, 0.89];
    const ridgeShine = [0.62, 0.78, 0.82];
    const guardIron  = [0.24, 0.30, 0.34];
    const guardTrim  = [0.44, 0.50, 0.52];
    const clothDark  = [0.18, 0.20, 0.22];
    const clothRib   = [0.30, 0.33, 0.36];
    const jadeRing   = [0.40, 0.92, 0.76];

    // Refined broader/longer cyan-gray iron blade with crisp central spine highlight (tip along -Z)
    addDiamondSwordBlade(b, 0.42, -1.42, 0.108, 0.080, 0.032, ironSpine, ironEdge, 0.24, 0.08, 0.20);
    for (const sy of [-1, 1]) {
      b.addBox(0, sy * 0.030, -0.40, 0.014, 0.005, 0.76, ridgeShine, 0.20, 0.16);
    }
    // Forged blade collar bolster (剑吞口) hugging blade root
    b.addBox(0, 0, 0.36, 0.122, 0.038, 0.055, guardTrim, 0.32, 0.04);
    b.addBox(0, 0, 0.31, 0.106, 0.032, 0.025, guardIron, 0.36, 0.0);
    // Clean straight flat iron crossbar guard with beveled end-caps (护手简单平直)
    b.addBox(0, 0, 0.43, 0.27, 0.036, 0.044, guardIron, 0.34, 0.02);
    b.addBox(0, 0, 0.43, 0.24, 0.042, 0.020, guardTrim, 0.28, 0.05);
    for (const s of [-1, 1]) {
      b.addBox(s * 0.285, 0, 0.43, 0.024, 0.040, 0.048, guardTrim, 0.30, 0.04);
    }
    // Hilt wrapped in criss-cross dark-gray cloth bands (剑柄缠深灰布)
    b.addBox(0, 0, 0.68, 0.042, 0.031, 0.21, clothDark, 0.76, 0.0);
    for (let i = 0; i < 8; i++) {
      b.addBox(0, 0, 0.50 + i * 0.048, 0.048, 0.035, 0.015, clothRib, 0.70, 0.0, 0, 0, (i % 2 === 0 ? 0.18 : -0.18));
    }
    // Beveled iron pommel cap + small glowing pale-jade hanging ring & knot (剑尾挂个小青玉环)
    b.addBox(0, 0, 0.90, 0.056, 0.040, 0.036, guardIron, 0.34, 0.0);
    b.addEllipsoid(0, 0, 0.94, 0.044, 0.034, 0.036, guardTrim, 0.30, 0.04, 12, 8);
    b.addTorus(0, 0, 1.05, 0.068, 0.017, jadeRing, 0.18, 0.52, 0, 0, 0, 20, 8);
    b.addEllipsoid(0, 0, 0.985, 0.018, 0.018, 0.022, guardTrim, 0.34, 0.04, 8, 6);
    return b.build();
  }

  // --- 二品灵剑：流云剑 (精修版 · 银白泛淡青剑身、双浅槽流光、立体卷云纹护手、深青带裹柄嵌灵石) ---
  function buildLiuyunSwordMesh() {
    const b = new TreasureMeshBuilder();
    const silverCyan = [0.78, 0.95, 0.98];
    const edgeBright = [0.95, 1.00, 1.00];
    const grooveGlow = [0.46, 0.96, 1.00];
    const cloudMetal = [0.76, 0.91, 0.96];
    const cloudGold  = [0.88, 0.80, 0.52];
    const deepRibbon = [0.10, 0.32, 0.42];
    const spiritGem  = [0.40, 0.98, 1.00];

    // Sleek wider lustrous silver-white pale-cyan blade
    addDiamondSwordBlade(b, 0.44, -1.50, 0.126, 0.094, 0.034, silverCyan, edgeBright, 0.15, 0.22, 0.40);
    // Two crisp parallel shallow fuller grooves with flowing cyan luminescence (两条浅槽和微光)
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        b.addBox(sx * 0.038, sy * 0.024, -0.38, 0.013, 0.006, 0.72, grooveGlow, 0.12, 0.76);
      }
    }
    // Sculpted silver-gold cloud bolster collar
    b.addBox(0, 0, 0.38, 0.145, 0.042, 0.056, cloudMetal, 0.20, 0.18);
    b.addBox(0, 0, 0.33, 0.122, 0.034, 0.024, cloudGold, 0.22, 0.24);
    // Sculpted multi-scroll splayed cloud guard (护手是微微张开的云纹)
    b.addBox(0, 0, 0.45, 0.16, 0.042, 0.050, cloudMetal, 0.20, 0.20);
    for (const s of [-1, 1]) {
      b.addBox(s * 0.20, 0, 0.41, 0.13, 0.034, 0.042, cloudMetal, 0.20, 0.22, 0, s * 0.34, 0);
      b.addTorus(s * 0.32, 0, 0.37, 0.054, 0.016, cloudMetal, 0.18, 0.32, 0, 0, 0, 16, 8);
      b.addTorus(s * 0.24, 0, 0.49, 0.036, 0.012, cloudGold, 0.20, 0.28, 0, 0, 0, 14, 6);
      b.addEllipsoid(s * 0.23, 0, 0.45, 0.034, 0.026, 0.028, grooveGlow, 0.16, 0.62, 10, 6);
    }
    // Deep-cyan ribbon-wrapped hilt with silver-cloud binding & bezel-framed spirit stone (深青带裹柄并嵌一小块灵石)
    b.addBox(0, 0, 0.70, 0.046, 0.034, 0.22, deepRibbon, 0.54, 0.06);
    for (let i = 0; i < 7; i++) {
      b.addBox(0, 0, 0.51 + i * 0.056, 0.052, 0.038, 0.015, cloudMetal, 0.26, 0.16, 0, 0, (i % 2 === 0 ? 0.18 : -0.18));
    }
    // Framed glowing spirit stone inlaid on both sides of the hilt
    for (const sy of [-1, 1]) {
      b.addBox(0, sy * 0.036, 0.70, 0.038, 0.010, 0.052, cloudGold, 0.22, 0.22);
      b.addEllipsoid(0, sy * 0.042, 0.70, 0.028, 0.016, 0.040, spiritGem, 0.10, 1.15, 12, 8);
    }
    // Cloud-crest pommel + glowing pearl finial
    b.addEllipsoid(0, 0, 0.95, 0.068, 0.044, 0.058, cloudMetal, 0.20, 0.24, 14, 8);
    b.addTorus(0, 0, 0.97, 0.056, 0.012, cloudGold, 0.22, 0.28, Math.PI * 0.5, 0, 0, 16, 6);
    b.addEllipsoid(0, 0, 1.03, 0.034, 0.028, 0.042, spiritGem, 0.12, 1.05, 12, 8);
    return b.build();
  }

  // --- 三品灵剑：惊鸿剑 (精修版 · 冰蓝玄青晶刃、冷光刃口、清晰灵纹阵刻、重羽展翼护手、暗金玉石剑柄、锋利双翼流线剑尾) ---
  function buildJinghongSwordMesh() {
    const b = new TreasureMeshBuilder();
    const iceBlue    = [0.20, 0.58, 0.88];
    const frostEdge  = [0.84, 0.98, 1.00];
    const runeGlow   = [0.46, 0.97, 1.00];
    const darkGold   = [0.90, 0.70, 0.28];
    const darkGoldB  = [0.56, 0.42, 0.16];
    const jadeInlay  = [0.26, 0.95, 0.82];
    const hiltDeep   = [0.09, 0.20, 0.32];

    // Majestic wider ice-blue / profound-cyan blade with cold luminous frost edges
    addDiamondSwordBlade(b, 0.46, -1.60, 0.142, 0.102, 0.038, iceBlue, frostEdge, 0.12, 0.30, 0.72);
    // Crisp glowing spirit runes & dark-gold array bars inlaid sequentially along both faces (清晰灵纹)
    for (let i = 0; i < 7; i++) {
      const rz = 0.20 - i * 0.21;
      for (const sy of [-1, 1]) {
        b.addBox(0, sy * 0.035, rz, 0.026 - i * 0.0020, 0.006, 0.076, runeGlow, 0.08, 1.35);
        b.addBox(0, sy * 0.036, rz - 0.095, 0.042 - i * 0.0030, 0.005, 0.013, darkGold, 0.16, 0.65);
      }
    }
    // Sweeping multi-tiered spread-wing guard in antique dark gold & luminous ice-jade heart (展翼护手)
    b.addBox(0, 0, 0.45, 0.16, 0.048, 0.064, darkGold, 0.20, 0.30);
    b.addEllipsoid(0, 0, 0.44, 0.056, 0.056, 0.052, jadeInlay, 0.10, 1.25, 14, 10);
    for (const s of [-1, 1]) {
      // Primary sweeping golden wing-frame
      b.addBox(s * 0.26, 0.005, 0.38, 0.19, 0.030, 0.054, darkGold, 0.20, 0.28, 0, s * 0.40, 0);
      // Secondary outer frost-crystal feather blade sweeping forward along blade flanks
      b.addBox(s * 0.42, 0.002, 0.24, 0.15, 0.020, 0.038, frostEdge, 0.14, 0.76, 0, s * 0.66, 0);
      // Tertiary inner golden pinions
      b.addBox(s * 0.32, 0.002, 0.44, 0.12, 0.022, 0.030, darkGoldB, 0.24, 0.24, 0, s * 0.22, 0);
      b.addBox(s * 0.20, 0.002, 0.54, 0.10, 0.022, 0.026, darkGoldB, 0.24, 0.22, 0, -s * 0.36, 0);
    }
    // Ornate hilt with antique dark-gold rings & glowing jade inlay studs (剑柄带暗金和玉石点缀)
    b.addBox(0, 0, 0.72, 0.050, 0.036, 0.22, hiltDeep, 0.42, 0.10);
    for (let i = 0; i < 4; i++) {
      const hz = 0.55 + i * 0.102;
      b.addBox(0, 0, hz, 0.058, 0.042, 0.018, darkGold, 0.20, 0.32);
      if (i < 3) {
        b.addEllipsoid(0,  0.040, hz + 0.051, 0.022, 0.014, 0.026, jadeInlay, 0.12, 1.08, 10, 6);
        b.addEllipsoid(0, -0.040, hz + 0.051, 0.022, 0.014, 0.026, jadeInlay, 0.12, 1.08, 10, 6);
      }
    }
    // Sharp twin-fin streamlined crystal-gold pommel ornament (剑尾有锋利流线饰片)
    b.addBox(0, 0, 0.97, 0.066, 0.038, 0.054, darkGold, 0.20, 0.32);
    addDiamondSwordBlade(b, 1.00, 1.32, 0.058, 0.028, 0.024, darkGold, frostEdge, 0.16, 0.40, 0.88);
    for (const s of [-1, 1]) {
      b.addBox(s * 0.096, 0, 1.08, 0.024, 0.014, 0.125, frostEdge, 0.14, 0.78, 0, -s * 0.36, 0);
      b.addBox(s * 0.056, 0, 1.15, 0.016, 0.012, 0.085, darkGold, 0.20, 0.38, 0, -s * 0.22, 0);
    }
    return b.build();
  }

  // =========================================================================
  // 3. TREASURE SYSTEM (Wearing, Following, Auto/Manual Effects, VFX + Sword Flight)
  // =========================================================================
  class TreasureSystem {
    constructor() {
      this.defs = TREASURE_DEFS;
      this.defMap = TREASURE_MAP;
      this.flyingSwordDefs = FLYING_SWORD_DEFS;
      this.flyingSwordMap = FLYING_SWORD_MAP;

      // Opaque 3D Treasure & Flying Sword meshes rendered via renderer.prog.monster
      this.opaqueMeshes = {
        qingfeng_needle: buildQingfengNeedleMesh(),
        liehuo_gourd:    buildLiehuoGourdMesh(),
        zhenshan_seal:   buildZhenshanSealMesh(),
        xuangui_shield:  buildXuanguiShieldMesh(),
        jingang_bell:    buildJingangBellMesh(),
        sword_qingfeng:  buildQingfengSwordMesh(),
        sword_liuyun:    buildLiuyunSwordMesh(),
        sword_jinghong:  buildJinghongSwordMesh(),
      };

      // Translucent VFX unit meshes for 流云帕 (uploaded into renderer.vfxVAOs)
      this.vfxMeshes = {
        liuyun_folded: buildLiuyunFoldedMesh(),
        liuyun_border: buildLiuyunBorderMesh(),
        liuyun_veil:   buildLiuyunVeilMesh(),
      };

      // Equipped treasure IDs in 法宝1, 法宝2 & 飞剑 (synced from main.js equipment object!)
      this.equipped = { treasure1: null, treasure2: null, flyingSword: null };
      this._flyingSwordMat = M.mat4();
      this._flyingSwordAuraMat = M.mat4();
      this._flyingSwordAuraMat2 = M.mat4();
      this._swordTrailAcc = 0;
      this._swordBoostRingAcc = 0;

      // Cooldowns & per-treasure runtime state
      this.cooldowns = {};
      this.runtimes = {};
      for (const def of TREASURE_DEFS) {
        this.cooldowns[def.id] = 0;
        this.runtimes[def.id] = {
          id: def.id,
          state: 'idle',
          timer: 0,
          x: 0, y: 0, z: 0,
          rotX: 0, rotY: 0, rotZ: 0,
          scale: 1.0,
          glow: 0.0,
          initialized: false,
          modelMat: M.mat4(),
          // Active attack/defense fields
          target: null,
          tx: 0, ty: 0, tz: 0,
          hitDone: false,
          tickAcc: 0,
          trailAcc: 0,
          orbitAngle: 0,
        };
      }

      // Active Treasure Defense Buffs
      this.buffs = {
        shieldHp: 0,
        shieldMax: 0,
        shieldTimer: 0,
        shieldDr: 0.35,
        bellDrTimer: 0,
        bellDr: 0.35,
        scarfTimer: 0,
        scarfSpeed: 1.30,
        scarfDodge: 0.30,
        scarfDr: 0.30,
      };

      // Render lists consumed by renderer.js
      this.opaqueDrawList = []; // [{ id, modelMat, tint, glow }]
      this.vfxDrawList = [];    // [{ shape, modelMat, col, alpha }]
      this.effects = [];
      this.maxEffects = 128;

      this._scarfFoldedMat = M.mat4();
      this._scarfVeilMat = M.mat4();
      this._scarfRingMatA = M.mat4();
      this._scarfRingMatB = M.mat4();
      this._shieldRingMat = M.mat4();
      this._autoNeedleTimer = 0.6;
      this.oreSystem = null;
      this.npcSystem = null;
    }

    syncEquipped(equipment) {
      const next1 = equipment && equipment.treasure1 ? equipment.treasure1.id : null;
      const next2 = equipment && equipment.treasure2 ? equipment.treasure2.id : null;
      const nextSword = equipment && equipment.flyingSword ? equipment.flyingSword.id : null;
      const changed1 = next1 !== this.equipped.treasure1;
      const changed2 = next2 !== this.equipped.treasure2;
      this.equipped.treasure1 = next1;
      this.equipped.treasure2 = next2;
      this.equipped.flyingSword = nextSword;

      // Reset unequipped treasures cleanly
      for (const def of TREASURE_DEFS) {
        if (def.id !== next1 && def.id !== next2) {
          const rt = this.runtimes[def.id];
          rt.state = 'idle';
          rt.timer = 0;
          rt.initialized = false;
          if (def.id === 'xuangui_shield') { this.buffs.shieldHp = 0; this.buffs.shieldTimer = 0; }
          if (def.id === 'liuyun_scarf') { this.buffs.scarfTimer = 0; }
        }
      }
      if (changed1 && next1) this.runtimes[next1].initialized = false;
      if (changed2 && next2) this.runtimes[next2].initialized = false;
    }

    isEquipped(id) {
      return this.equipped.treasure1 === id || this.equipped.treasure2 === id;
    }

    getSpeedMultiplier() {
      return this.buffs.scarfTimer > 0 ? this.buffs.scarfSpeed : 1.0;
    }

    _spawnEffect(opts) {
      if (this.effects.length >= this.maxEffects) this.effects.shift();
      this.effects.push({
        shape: opts.shape || 'orb',
        x: opts.x, y: opts.y, z: opts.z,
        vx: opts.vx || 0, vy: opts.vy || 0, vz: opts.vz || 0,
        gravity: opts.gravity || 0,
        rotX: opts.rotX || 0, rotY: opts.rotY || 0, rotZ: opts.rotZ || 0,
        spinY: opts.spinY || 0,
        sx0: opts.sx0 !== undefined ? opts.sx0 : (opts.s0 || 0.25),
        sy0: opts.sy0 !== undefined ? opts.sy0 : (opts.s0 || 0.25),
        sz0: opts.sz0 !== undefined ? opts.sz0 : (opts.s0 || 0.25),
        sx1: opts.sx1 !== undefined ? opts.sx1 : (opts.s1 || 0.85),
        sy1: opts.sy1 !== undefined ? opts.sy1 : (opts.s1 || 0.85),
        sz1: opts.sz1 !== undefined ? opts.sz1 : (opts.s1 || 0.85),
        age: 0,
        life: opts.life || 0.45,
        col: opts.col || [0.9, 0.9, 0.7],
        alpha: opts.alpha !== undefined ? opts.alpha : 0.56,
        modelMat: M.mat4(),
      });
    }

    _findNearestMonster(px, pz, maxRange, preferYaw = null) {
      if (!this._lastMonsterSystem) return null;
      const list = this._lastMonsterSystem.monsters;
      const fwdX = preferYaw !== null ? -Math.sin(preferYaw) : 0;
      const fwdZ = preferYaw !== null ? -Math.cos(preferYaw) : 0;
      let best = null;
      let bestScore = Infinity;
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (!m.alive || !m.visible) continue;
        const dx = m.x - px, dz = m.z - pz;
        const d = Math.hypot(dx, dz);
        if (d > maxRange || d < 0.2) continue;
        let score = d;
        if (preferYaw !== null) {
          const dot = (dx * fwdX + dz * fwdZ) / d;
          if (dot < 0.25 && d > 7.0) continue;
          score = d * (1.25 - Math.max(0, dot) * 0.40);
        }
        if (score < bestScore) {
          bestScore = score;
          best = m;
        }
      }
      return best;
    }

    // Activate treasure equipped in 'treasure1' or 'treasure2' (Manual Z/X or Auto trigger)
    tryActivateSlot(slotKey, camera, vitals, monsterSystem, isAuto = false) {
      const id = this.equipped[slotKey];
      if (!id) return { ok: false, reason: 'empty' };
      return this.tryActivateById(id, camera, vitals, monsterSystem, isAuto);
    }

    tryActivateById(id, camera, vitals, monsterSystem, isAuto = false) {
      this._lastMonsterSystem = monsterSystem;
      const def = this.defMap[id];
      const rt = this.runtimes[id];
      if (!def || !rt) return { ok: false, reason: 'invalid' };
      if (!this.isEquipped(id)) return { ok: false, reason: 'unequipped' };
      if (rt.state !== 'idle' && id !== 'jingang_bell') return { ok: false, reason: 'active' };
      if ((this.cooldowns[id] || 0) > 0.04) return { ok: false, reason: 'cooldown' };
      if (vitals.mp < def.mpCost) {
        if (!isAuto && monsterSystem && camera && camera.playerPos) {
          monsterSystem.spawnFloatingText(camera.playerPos[0], camera.playerPos[1] + 2.4, camera.playerPos[2], '灵力不足', '#7cc8ff');
        }
        return { ok: false, reason: 'mp' };
      }

      const p = camera.playerPos;
      const aimYaw = camera.yaw;
      const fwdX = -Math.sin(aimYaw), fwdZ = -Math.cos(aimYaw);

      if (id === 'qingfeng_needle') {
        const target = this._findNearestMonster(p[0], p[2], isAuto ? def.autoRange : def.range, isAuto ? null : aimYaw);
        const targetNpc = (!target && this.npcSystem)
          ? this.npcSystem.findTargetInRange(p, isAuto ? null : fwdX, isAuto ? null : fwdZ, isAuto ? def.autoRange : def.range, isAuto)
          : null;
        if (isAuto && !target && !targetNpc) return { ok: false, reason: 'notarget' };
        vitals.mp = Math.max(0, vitals.mp - def.mpCost);
        this.cooldowns[id] = def.cd;
        rt.state = 'out';
        rt.timer = 0.0;
        rt.target = target;
        rt.targetNpc = targetNpc;
        rt.hitDone = false;
        rt.trailAcc = 0;
        if (target) {
          rt.tx = target.x;
          rt.ty = target.y + Math.max(1.0, (target.spec.colHeight || 2.0) * 0.52);
          rt.tz = target.z;
        } else if (targetNpc) {
          rt.tx = targetNpc.x;
          rt.ty = targetNpc.y + 1.15;
          rt.tz = targetNpc.z;
        } else {
          const aimOre = !isAuto && this.oreSystem ? this.oreSystem.findAimOre(p, aimYaw, def.range, 0.80) : null;
          if (aimOre) {
            rt.tx = aimOre.x;
            rt.ty = aimOre.y + aimOre.colHeight * 0.55;
            rt.tz = aimOre.z;
          } else {
            rt.tx = p[0] + fwdX * 15.0;
            rt.ty = p[1] + 1.45;
            rt.tz = p[2] + fwdZ * 15.0;
          }
        }
        return { ok: true, def };
      }

      if (id === 'liehuo_gourd') {
        vitals.mp = Math.max(0, vitals.mp - def.mpCost);
        this.cooldowns[id] = def.cd;
        rt.state = 'active';
        rt.timer = def.duration;
        rt.tickAcc = 0.25; // trigger first flame burst rapidly
        rt.trailAcc = 0;
        camera.charYaw = aimYaw;
        return { ok: true, def };
      }

      if (id === 'zhenshan_seal') {
        const target = this._findNearestMonster(p[0], p[2], def.range, aimYaw);
        vitals.mp = Math.max(0, vitals.mp - def.mpCost);
        this.cooldowns[id] = def.cd;
        rt.state = 'rise';
        rt.timer = 0.42;
        rt.target = target;
        rt.hitDone = false;
        const aimOre = !target && this.oreSystem ? this.oreSystem.findAimOre(p, aimYaw, def.range, 0.78) : null;
        rt.tx = target ? target.x : (aimOre ? aimOre.x : (p[0] + fwdX * 9.0));
        rt.tz = target ? target.z : (aimOre ? aimOre.z : (p[2] + fwdZ * 9.0));
        rt.ty = T.getMeshTerrainHeight(rt.tx, rt.tz);
        return { ok: true, def };
      }

      if (id === 'xuangui_shield') {
        vitals.mp = Math.max(0, vitals.mp - def.mpCost);
        this.cooldowns[id] = def.cd;
        rt.state = 'active';
        rt.timer = def.duration;
        rt.orbitAngle = 0;
        const shAmt = Math.max(10, Math.round((vitals.maxHp || 100) * (def.shieldPct || 0.34)));
        this.buffs.shieldHp = shAmt;
        this.buffs.shieldMax = shAmt;
        this.buffs.shieldTimer = def.duration;
        this.buffs.shieldDr = def.damageReduce;
        if (monsterSystem) {
          monsterSystem.spawnFloatingText(p[0], p[1] + 2.4, p[2], `玄龟护盾 ${shAmt}`, '#f0d888');
        }
        return { ok: true, def };
      }

      if (id === 'jingang_bell') {
        vitals.mp = Math.max(0, vitals.mp - def.mpCost);
        this.cooldowns[id] = def.cd;
        rt.state = 'active';
        rt.timer = 0.65;
        this.buffs.bellDrTimer = def.duration;
        this.buffs.bellDr = def.damageReduce;
        const bellDmg = Math.max(1, Math.round((vitals.atk || 10) * (def.dmgPct || 1.15)));

        const gY = T.getWalkableHeight(p[0], p[2], p[1]);
        // Pale-gold expanding sonic ripple ring around protagonist
        this._spawnEffect({
          shape: 'ring',
          x: p[0], y: gY + 0.18, z: p[2],
          sx0: 0.7, sy0: 1.0, sz0: 0.7,
          sx1: def.aoeRadius, sy1: 1.0, sz1: def.aoeRadius,
          spinY: 2.2,
          life: 0.56,
          col: [1.0, 0.90, 0.48],
          alpha: 0.64,
        });
        this._spawnEffect({
          shape: 'ring',
          x: p[0], y: gY + 1.05, z: p[2],
          sx0: 0.5, sy0: 1.0, sz0: 0.5,
          sx1: def.aoeRadius * 0.78, sy1: 1.0, sz1: def.aoeRadius * 0.78,
          life: 0.44,
          col: [1.0, 0.94, 0.66],
          alpha: 0.48,
        });
        if (monsterSystem) {
          monsterSystem.spawnFloatingText(p[0], p[1] + 2.4, p[2], isAuto ? '金刚铃护主!' : '金刚震荡', '#ffe994');
          for (const m of monsterSystem.monsters) {
            if (!m.alive || !m.visible) continue;
            const dx = m.x - p[0], dz = m.z - p[2];
            const d = Math.hypot(dx, dz);
            if (d <= def.aoeRadius + (m.spec.colRadius || 1.1)) {
              const ux = d > 0.01 ? dx / d : fwdX;
              const uz = d > 0.01 ? dz / d : fwdZ;
              monsterSystem.applyDamageToMonster(m, bellDmg, {
                knockX: ux * def.knockback,
                knockZ: uz * def.knockback,
                label: '震退',
                color: '#ffe688',
              });
            }
          }
        }
        if (this.oreSystem) this.oreSystem.applyAreaDamage(p[0], p[2], def.aoeRadius, bellDmg);
        if (this.npcSystem) this.npcSystem.applyAreaDamage(p[0], p[2], def.aoeRadius, bellDmg, { onlyHostile: isAuto, knockback: def.knockback, label: '震退', color: '#ffe688' }, monsterSystem);
        return { ok: true, def };
      }

      if (id === 'liuyun_scarf') {
        vitals.mp = Math.max(0, vitals.mp - def.mpCost);
        this.cooldowns[id] = def.cd;
        rt.state = 'active';
        rt.timer = def.duration;
        this.buffs.scarfTimer = def.duration;
        this.buffs.scarfSpeed = def.speedRatio;
        this.buffs.scarfDodge = def.dodgeChance;
        this.buffs.scarfDr = def.damageReduce;
        if (monsterSystem) {
          monsterSystem.spawnFloatingText(p[0], p[1] + 2.4, p[2], '流云护幕', '#b6f6ff');
        }
        return { ok: true, def };
      }

      return { ok: false, reason: 'unknown' };
    }

    // Intercept incoming player damage (流云帕 dodge/DR, 金刚铃 auto-trigger & DR, 玄龟小盾 absorb & DR)
    interceptIncomingDamage(rawDmg, camera, vitals, monsterSystem) {
      let dmg = rawDmg;
      const pPos = camera ? camera.playerPos : null;

      // 1) 金刚铃 auto-trigger on hit if equipped & off cooldown
      if (this.isEquipped('jingang_bell') && (this.cooldowns.jingang_bell || 0) <= 0.04) {
        this.tryActivateById('jingang_bell', camera, vitals, monsterSystem, true);
      }

      // 2) 流云帕 dodge roll & damage reduction
      if (this.buffs.scarfTimer > 0) {
        if (Math.random() < this.buffs.scarfDodge) {
          if (monsterSystem && pPos) {
            monsterSystem.spawnFloatingText(pPos[0], pPos[1] + 2.4, pPos[2], '流云闪避', '#c4f8ff');
          }
          return 0;
        }
        dmg = Math.max(1, Math.round(dmg * (1.0 - this.buffs.scarfDr)));
      }

      // 3) 金刚铃 short damage reduction
      if (this.buffs.bellDrTimer > 0) {
        dmg = Math.max(1, Math.round(dmg * (1.0 - this.buffs.bellDr)));
      }

      // 4) 玄龟小盾 absorption + damage reduction
      if (this.buffs.shieldTimer > 0 && this.buffs.shieldHp > 0) {
        const reduced = Math.max(1, Math.round(dmg * (1.0 - this.buffs.shieldDr)));
        const absorbed = Math.min(this.buffs.shieldHp, reduced);
        this.buffs.shieldHp -= absorbed;
        dmg = Math.max(0, reduced - absorbed);
        if (monsterSystem && pPos) {
          monsterSystem.spawnFloatingText(
            pPos[0], pPos[1] + 2.4, pPos[2],
            this.buffs.shieldHp <= 0 ? '玄龟盾破' : `玄龟挡 -${absorbed}`,
            '#f2da88'
          );
        }
        if (this.buffs.shieldHp <= 0) {
          this.buffs.shieldHp = 0;
          this.buffs.shieldTimer = 0;
          this.runtimes.xuangui_shield.state = 'idle';
        }
      }

      return dmg;
    }

    _computeWearPose(id, pPos, charYaw, elapsed, walkPhase, moveBlend) {
      const cy = Math.cos(charYaw), sy = Math.sin(charYaw);
      const fwdX = -sy, fwdZ = -cy;
      const rightX = cy, rightZ = -sy;
      const faceYaw = Math.atan2(fwdX, fwdZ);
      const bob = Math.sin(walkPhase * 2.0) * 0.045 * moveBlend;
      const px = pPos[0], py = pPos[1], pz = pPos[2];

      if (id === 'qingfeng_needle') {
        // 悬浮在主角右肩斜上方，随移动轻柔上下浮动，尖端朝前微倾
        return {
          x: px + rightX * 0.68 + fwdX * 0.06,
          y: py + 1.88 + Math.sin(elapsed * 2.8) * 0.08 + bob,
          z: pz + rightZ * 0.68 + fwdZ * 0.06,
          rotX: 0.14, rotY: faceYaw, rotZ: 0.0, scale: 1.05,
        };
      }
      if (id === 'liehuo_gourd') {
        // 挂载在主角右侧腰间，随跑动做小幅钟摆晃动
        const swing = Math.sin(walkPhase) * 0.24 * moveBlend + Math.sin(elapsed * 1.8) * 0.04;
        return {
          x: px + rightX * 0.44 - fwdX * 0.04,
          y: py + 0.96 + bob,
          z: pz + rightZ * 0.44 - fwdZ * 0.04,
          rotX: swing, rotY: faceYaw, rotZ: -0.16 - Math.abs(swing) * 0.2, scale: 0.96,
        };
      }
      if (id === 'zhenshan_seal') {
        // 悬浮在主角左肩后侧，缓慢自转
        return {
          x: px - rightX * 0.66 - fwdX * 0.34,
          y: py + 1.80 + Math.sin(elapsed * 2.1 + 1.2) * 0.07 + bob,
          z: pz - rightZ * 0.66 - fwdZ * 0.34,
          rotX: 0.08, rotY: elapsed * 1.05, rotZ: 0.0, scale: 1.02,
        };
      }
      if (id === 'xuangui_shield') {
        // 平时贴背微斜悬浮在主角背部中央，随移动轻微起伏 (face pointing backward so player sees turtle pattern!)
        return {
          x: px - fwdX * 0.44,
          y: py + 1.26 + Math.sin(elapsed * 2.4) * 0.05 + bob,
          z: pz - fwdZ * 0.44,
          rotX: -0.10, rotY: faceYaw + Math.PI, rotZ: 0.24, scale: 1.06,
        };
      }
      if (id === 'jingang_bell') {
        // 挂在主角左侧腰间，跑动时随身体晃动微颤
        const swing = -Math.sin(walkPhase) * 0.22 * moveBlend;
        const tremor = Math.sin(elapsed * 16.0) * 0.08 * moveBlend;
        return {
          x: px - rightX * 0.44 + fwdX * 0.02,
          y: py + 0.94 + bob,
          z: pz - rightZ * 0.44 + fwdZ * 0.02,
          rotX: swing + tremor, rotY: faceYaw, rotZ: 0.14 + tremor * 0.8, scale: 0.95,
        };
      }
      // 流云帕: 叠成窄条状披挂在主角左臂/左肩侧，随风轻摆
      const flutter = Math.sin(elapsed * 3.1) * 0.14 + Math.sin(walkPhase) * 0.18 * moveBlend;
      return {
        x: px - rightX * 0.50 - fwdX * 0.02,
        y: py + 1.44 + bob * 0.5,
        z: pz - rightZ * 0.50 - fwdZ * 0.02,
        rotX: 0.12 + flutter * 0.7, rotY: faceYaw - Math.PI * 0.5, rotZ: 0.18 + flutter, scale: 1.0,
      };
    }

    update(dt, elapsed, camera, protagonist, vitals, monsterSystem, paused) {
      this._lastMonsterSystem = monsterSystem;
      const cdt = Math.min(dt, 0.05);
      const pPos = camera.playerPos;
      const charYaw = camera.charYaw;
      const walkPhase = protagonist ? protagonist.walkPhase : 0;
      const moveBlend = protagonist ? protagonist.blendMove : 0;
      const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
      const aimFwdX = -sy, aimFwdZ = -cy;

      this.opaqueDrawList.length = 0;
      this.vfxDrawList.length = 0;

      if (!paused) {
        // 1. Tick cooldowns & buffs
        for (const id of Object.keys(this.cooldowns)) {
          if (this.cooldowns[id] > 0) this.cooldowns[id] = Math.max(0, this.cooldowns[id] - cdt);
        }
        if (this.buffs.shieldTimer > 0) {
          this.buffs.shieldTimer = Math.max(0, this.buffs.shieldTimer - cdt);
          if (this.buffs.shieldTimer <= 0) {
            this.buffs.shieldHp = 0;
            this.runtimes.xuangui_shield.state = 'idle';
          }
        }
        if (this.buffs.bellDrTimer > 0) this.buffs.bellDrTimer = Math.max(0, this.buffs.bellDrTimer - cdt);
        if (this.buffs.scarfTimer > 0) {
          this.buffs.scarfTimer = Math.max(0, this.buffs.scarfTimer - cdt);
          if (this.buffs.scarfTimer <= 0) this.runtimes.liuyun_scarf.state = 'idle';
        }

        // 2. Auto-trigger 青锋飞针 when equipped, idle, off cooldown, and an enemy is within 20m!
        if (this.isEquipped('qingfeng_needle') && this.runtimes.qingfeng_needle.state === 'idle' && this.cooldowns.qingfeng_needle <= 0) {
          this._autoNeedleTimer -= cdt;
          if (this._autoNeedleTimer <= 0) {
            this._autoNeedleTimer = 0.45;
            this.tryActivateById('qingfeng_needle', camera, vitals, monsterSystem, true);
          }
        }
      }

      // 3. Update every equipped treasure (both 法宝1 and 法宝2!)
      const activeIds = [];
      if (this.equipped.treasure1) activeIds.push(this.equipped.treasure1);
      if (this.equipped.treasure2 && this.equipped.treasure2 !== this.equipped.treasure1) {
        activeIds.push(this.equipped.treasure2);
      }

      for (const id of activeIds) {
        const def = this.defMap[id];
        const rt = this.runtimes[id];
        const wear = this._computeWearPose(id, pPos, charYaw, elapsed, walkPhase, moveBlend);

        if (!rt.initialized) {
          rt.x = wear.x; rt.y = wear.y; rt.z = wear.z;
          rt.rotX = wear.rotX; rt.rotY = wear.rotY; rt.rotZ = wear.rotZ;
          rt.scale = wear.scale;
          rt.initialized = true;
        }

        const kFollow = 1 - Math.exp(-15.0 * cdt);

        if (id === 'qingfeng_needle') {
          if (rt.state === 'idle') {
            rt.x = M.lerp(rt.x, wear.x, kFollow);
            rt.y = M.lerp(rt.y, wear.y, kFollow);
            rt.z = M.lerp(rt.z, wear.z, kFollow);
            rt.rotX = wear.rotX; rt.rotY = wear.rotY; rt.rotZ = wear.rotZ;
            rt.scale = wear.scale;
            rt.glow = 0.08;
          } else if (!paused && rt.state === 'out') {
            if (rt.target && rt.target.alive) {
              rt.tx = rt.target.x;
              rt.ty = rt.target.y + Math.max(1.0, (rt.target.spec.colHeight || 2.0) * 0.52);
              rt.tz = rt.target.z;
            } else if (rt.targetNpc && rt.targetNpc.alive) {
              rt.tx = rt.targetNpc.x;
              rt.ty = rt.targetNpc.y + 1.15;
              rt.tz = rt.targetNpc.z;
            }
            const dx = rt.tx - rt.x, dy = rt.ty - rt.y, dz = rt.tz - rt.z;
            const d = Math.hypot(dx, dy, dz) || 0.001;
            const step = 40.0 * cdt;
            rt.x += (dx / d) * Math.min(step, d);
            rt.y += (dy / d) * Math.min(step, d);
            rt.z += (dz / d) * Math.min(step, d);
            rt.rotY = Math.atan2(dx, dz);
            rt.rotX = -Math.asin(M.clamp(dy / d, -0.8, 0.8));
            rt.rotZ += 16.0 * cdt;
            rt.scale = 1.24;
            rt.glow = 0.72;

            // Translucent pale-cyan streaming trail!
            rt.trailAcc += cdt;
            if (rt.trailAcc >= 0.025) {
              rt.trailAcc = 0;
              this._spawnEffect({
                shape: 'shard',
                x: rt.x, y: rt.y, z: rt.z,
                rotX: rt.rotX, rotY: rt.rotY,
                sx0: 0.14, sy0: 0.14, sz0: 0.95,
                sx1: 0.02, sy1: 0.02, sz1: 0.40,
                life: 0.24,
                col: [0.64, 0.95, 0.98],
                alpha: 0.56,
              });
            }

            if (d <= 1.25 || rt.timer > 1.1) {
              if (!rt.hitDone) {
                rt.hitDone = true;
                const needleDmg = Math.max(1, Math.round((vitals.atk || 10) * (def.dmgPct || 1.55)));
                if (rt.target && rt.target.alive && monsterSystem) {
                  monsterSystem.applyDamageToMonster(rt.target, needleDmg, { color: '#9cf6ff' });
                } else if (rt.targetNpc && rt.targetNpc.alive && this.npcSystem) {
                  this.npcSystem.applyDamageToNpc(rt.targetNpc, needleDmg, { fromPlayer: true, color: '#9cf6ff' }, monsterSystem);
                } else if (this.oreSystem) {
                  this.oreSystem.applyAreaDamage(rt.x, rt.z, 2.2, needleDmg);
                }
                // Small pale-cyan pierce sparks
                for (let k = 0; k < 5; k++) {
                  const a = Math.random() * Math.PI * 2;
                  this._spawnEffect({
                    shape: 'shard', x: rt.x, y: rt.y, z: rt.z,
                    vx: Math.cos(a) * 3.5, vy: 1.5 + Math.random() * 1.5, vz: Math.sin(a) * 3.5,
                    rotY: a, sx0: 0.07, sy0: 0.07, sz0: 0.34, sx1: 0.02, sy1: 0.02, sz1: 0.08,
                    life: 0.26, col: [0.76, 0.98, 1.0], alpha: 0.72,
                  });
                }
              }
              rt.state = 'return';
              rt.timer = 0;
            }
            rt.timer += cdt;
          } else if (!paused && rt.state === 'return') {
            const dx = wear.x - rt.x, dy = wear.y - rt.y, dz = wear.z - rt.z;
            const d = Math.hypot(dx, dy, dz) || 0.001;
            const step = 36.0 * cdt;
            rt.x += (dx / d) * Math.min(step, d);
            rt.y += (dy / d) * Math.min(step, d);
            rt.z += (dz / d) * Math.min(step, d);
            rt.rotY = Math.atan2(dx, dz);
            rt.rotX = -Math.asin(M.clamp(dy / d, -0.8, 0.8));
            rt.scale = 1.10;
            rt.glow = 0.45;
            rt.trailAcc += cdt;
            if (rt.trailAcc >= 0.035) {
              rt.trailAcc = 0;
              this._spawnEffect({
                shape: 'shard', x: rt.x, y: rt.y, z: rt.z,
                rotX: rt.rotX, rotY: rt.rotY,
                sx0: 0.10, sy0: 0.10, sz0: 0.65, sx1: 0.02, sy1: 0.02, sz1: 0.20,
                life: 0.18, col: [0.64, 0.94, 0.98], alpha: 0.44,
              });
            }
            if (d <= 0.65 || rt.timer > 1.2) {
              rt.state = 'idle';
              rt.target = null;
            }
            rt.timer += cdt;
          }
          M.m4ComposeTRS(rt.modelMat, rt.x, rt.y, rt.z, rt.rotX, rt.rotY, rt.rotZ, rt.scale, rt.scale, rt.scale);
          this.opaqueDrawList.push({ id, modelMat: rt.modelMat, tint: def.tint, glow: rt.glow });
        } else if (id === 'liehuo_gourd') {
          if (rt.state === 'idle') {
            rt.x = M.lerp(rt.x, wear.x, kFollow);
            rt.y = M.lerp(rt.y, wear.y, kFollow);
            rt.z = M.lerp(rt.z, wear.z, kFollow);
            rt.rotX = wear.rotX; rt.rotY = wear.rotY; rt.rotZ = wear.rotZ;
            rt.scale = wear.scale;
            rt.glow = 0.05;
          } else if (!paused && rt.state === 'active') {
            // Hovers in front of protagonist, tilted mouth forward spraying orange-red flame fan!
            rt.timer -= cdt;
            const hoverX = pPos[0] + aimFwdX * 1.15;
            const hoverY = pPos[1] + 1.42 + Math.sin(elapsed * 8.0) * 0.05;
            const hoverZ = pPos[2] + aimFwdZ * 1.15;
            rt.x = M.lerp(rt.x, hoverX, kFollow);
            rt.y = M.lerp(rt.y, hoverY, kFollow);
            rt.z = M.lerp(rt.z, hoverZ, kFollow);
            const aimFaceYaw = Math.atan2(aimFwdX, aimFwdZ);
            rt.rotY = aimFaceYaw;
            rt.rotX = 1.22; // Tilt gourd mouth forward toward target!
            rt.rotZ = Math.sin(elapsed * 12.0) * 0.12;
            rt.scale = 1.18;
            rt.glow = 0.65;

            // Continuous fan of orange-red flame particles spraying from gourd mouth
            rt.trailAcc += cdt;
            if (rt.trailAcc >= 0.045) {
              rt.trailAcc = 0;
              const mouthX = rt.x + aimFwdX * 0.42;
              const mouthY = rt.y + 0.06;
              const mouthZ = rt.z + aimFwdZ * 0.42;
              for (let k = 0; k < 3; k++) {
                const spread = (Math.random() - 0.5) * 1.05;
                const a = aimFaceYaw + spread;
                const spd = 7.5 + Math.random() * 5.0;
                this._spawnEffect({
                  shape: k === 0 ? 'spike' : 'orb',
                  x: mouthX, y: mouthY + (Math.random() - 0.5) * 0.18, z: mouthZ,
                  vx: Math.sin(a) * spd, vy: (Math.random() - 0.35) * 1.6, vz: Math.cos(a) * spd,
                  rotY: a,
                  s0: k === 0 ? 0.22 : 0.16, s1: k === 0 ? 0.52 : 0.38,
                  life: 0.44 + Math.random() * 0.18,
                  col: k === 1 ? [1.0, 0.78, 0.28] : [1.0, 0.40, 0.12],
                  alpha: 0.68,
                });
              }
            }

            // Continuous burn damage ticks inside front cone
            rt.tickAcc += cdt;
            if (rt.tickAcc >= 0.38) {
              rt.tickAcc = 0;
              const gourdDmg = Math.max(1, Math.round((vitals.atk || 10) * (def.dmgPct || 0.85)));
              if (monsterSystem) {
                for (const m of monsterSystem.monsters) {
                  if (!m.alive || !m.visible) continue;
                  const dx = m.x - pPos[0], dz = m.z - pPos[2];
                  const d = Math.hypot(dx, dz);
                  if (d > def.range + (m.spec.colRadius || 1.1) || d < 0.01) continue;
                  const dot = (dx * aimFwdX + dz * aimFwdZ) / d;
                  if (dot < 0.52 && d > 2.2) continue;
                  monsterSystem.applyDamageToMonster(m, gourdDmg, { label: '灼烧', color: '#ff8844' });
                }
              }
              if (this.oreSystem) this.oreSystem.applyAreaDamage(pPos[0], pPos[2], def.range, gourdDmg, aimFwdX, aimFwdZ, 0.52);
              if (this.npcSystem) this.npcSystem.applyAreaDamage(pPos[0], pPos[2], def.range, gourdDmg, { label: '灼烧', color: '#ff8844' }, monsterSystem, aimFwdX, aimFwdZ, 0.52);
            }

            if (rt.timer <= 0) {
              rt.state = 'idle';
            }
          }
          M.m4ComposeTRS(rt.modelMat, rt.x, rt.y, rt.z, rt.rotX, rt.rotY, rt.rotZ, rt.scale, rt.scale, rt.scale);
          this.opaqueDrawList.push({ id, modelMat: rt.modelMat, tint: def.tint, glow: rt.glow });
        } else if (id === 'zhenshan_seal') {
          if (rt.state === 'idle') {
            rt.x = M.lerp(rt.x, wear.x, kFollow);
            rt.y = M.lerp(rt.y, wear.y, kFollow);
            rt.z = M.lerp(rt.z, wear.z, kFollow);
            rt.rotX = wear.rotX; rt.rotY = wear.rotY; rt.rotZ = wear.rotZ;
            rt.scale = wear.scale;
            rt.glow = 0.06;
          } else if (!paused && rt.state === 'rise') {
            // Fly above target & scale up slightly
            rt.timer -= cdt;
            if (rt.target && rt.target.alive) {
              rt.tx = rt.target.x; rt.tz = rt.target.z;
              rt.ty = T.getMeshTerrainHeight(rt.tx, rt.tz);
            }
            const apexY = rt.ty + 5.4;
            const kMove = 1 - Math.exp(-9.5 * cdt);
            rt.x = M.lerp(rt.x, rt.tx, kMove);
            rt.y = M.lerp(rt.y, apexY, kMove);
            rt.z = M.lerp(rt.z, rt.tz, kMove);
            rt.rotX = 0; rt.rotY += 3.5 * cdt; rt.rotZ = 0;
            rt.scale = M.lerp(rt.scale, 1.90, kMove);
            rt.glow = 0.58;
            if (rt.timer <= 0) {
              rt.state = 'slam';
              rt.timer = 0.20;
            }
          } else if (!paused && rt.state === 'slam') {
            // Slam straight down onto target ground!
            rt.timer -= cdt;
            const u = 1.0 - M.clamp(rt.timer / 0.20, 0, 1);
            rt.x = rt.tx; rt.z = rt.tz;
            rt.y = M.lerp(rt.ty + 5.4, rt.ty + 0.24, u * u);
            rt.scale = 1.95;
            rt.glow = 0.78;
            if (rt.timer <= 0) {
              if (!rt.hitDone) {
                rt.hitDone = true;
                // Expanding ochre-gold ground shockwave ring from seal base!
                this._spawnEffect({
                  shape: 'ring',
                  x: rt.tx, y: rt.ty + 0.14, z: rt.tz,
                  sx0: 0.75, sy0: 1.0, sz0: 0.75,
                  sx1: def.aoeRadius, sy1: 1.0, sz1: def.aoeRadius,
                  life: 0.56,
                  col: [0.88, 0.72, 0.36],
                  alpha: 0.66,
                });
                for (let k = 0; k < 6; k++) {
                  const a = (k / 6) * Math.PI * 2;
                  this._spawnEffect({
                    shape: 'orb',
                    x: rt.tx + Math.cos(a) * 1.0, y: rt.ty + 0.30, z: rt.tz + Math.sin(a) * 1.0,
                    vx: Math.cos(a) * 3.0, vy: 1.4, vz: Math.sin(a) * 3.0,
                    s0: 0.24, s1: 0.50, life: 0.45,
                    col: [0.82, 0.68, 0.42], alpha: 0.36,
                  });
                }
                const sealDmg = Math.max(1, Math.round((vitals.atk || 10) * (def.dmgPct || 1.80)));
                if (monsterSystem) {
                  for (const m of monsterSystem.monsters) {
                    if (!m.alive || !m.visible) continue;
                    const d = Math.hypot(m.x - rt.tx, m.z - rt.tz);
                    if (d <= def.aoeRadius + (m.spec.colRadius || 1.1)) {
                      monsterSystem.applyDamageToMonster(m, sealDmg, {
                        staggerSec: def.staggerSec,
                        label: '镇压·硬直',
                        color: '#f0cf7a',
                      });
                    }
                  }
                }
                if (this.oreSystem) this.oreSystem.applyAreaDamage(rt.tx, rt.tz, def.aoeRadius, sealDmg);
                if (this.npcSystem) this.npcSystem.applyAreaDamage(rt.tx, rt.tz, def.aoeRadius, sealDmg, { staggerSec: def.staggerSec, label: '镇压·硬直', color: '#f0cf7a' }, monsterSystem);
              }
              rt.state = 'hold';
              rt.timer = 0.32;
            }
          } else if (!paused && rt.state === 'hold') {
            rt.timer -= cdt;
            rt.glow = 0.32;
            if (rt.timer <= 0) {
              rt.state = 'idle';
              rt.target = null;
            }
          }
          M.m4ComposeTRS(rt.modelMat, rt.x, rt.y, rt.z, rt.rotX, rt.rotY, rt.rotZ, rt.scale, rt.scale, rt.scale);
          this.opaqueDrawList.push({ id, modelMat: rt.modelMat, tint: def.tint, glow: rt.glow });
        } else if (id === 'xuangui_shield') {
          if (rt.state === 'idle' || this.buffs.shieldTimer <= 0) {
            rt.state = 'idle';
            rt.x = M.lerp(rt.x, wear.x, kFollow);
            rt.y = M.lerp(rt.y, wear.y, kFollow);
            rt.z = M.lerp(rt.z, wear.z, kFollow);
            rt.rotX = wear.rotX; rt.rotY = wear.rotY; rt.rotZ = wear.rotZ;
            rt.scale = M.lerp(rt.scale, wear.scale, kFollow);
            rt.glow = 0.06;
          } else {
            // Enlarged & orbiting steadily around protagonist waist + glowing ochre rim + projectile interception!
            if (!paused) {
              rt.orbitAngle += cdt * 3.1;
              // Actively intercept incoming monster projectiles!
              if (monsterSystem && monsterSystem.projectiles.length > 0) {
                for (let pi = monsterSystem.projectiles.length - 1; pi >= 0; pi--) {
                  const mp = monsterSystem.projectiles[pi];
                  const d = Math.hypot(mp.x - pPos[0], mp.z - pPos[2]);
                  if (d <= 3.2 && Math.abs(mp.y - (pPos[1] + 1.15)) < 2.2) {
                    monsterSystem.projectiles.splice(pi, 1);
                    this._spawnEffect({
                      shape: 'ring', x: mp.x, y: mp.y, z: mp.z,
                      s0: 0.25, s1: 1.4, life: 0.32,
                      col: [0.96, 0.84, 0.44], alpha: 0.68,
                    });
                    monsterSystem.spawnFloatingText(pPos[0], pPos[1] + 2.35, pPos[2], '玄龟拦截!', '#f5df8c');
                  }
                }
              }
              if (this.npcSystem && this.npcSystem.projectiles.length > 0) {
                for (let pi = this.npcSystem.projectiles.length - 1; pi >= 0; pi--) {
                  const np = this.npcSystem.projectiles[pi];
                  if (!this.npcSystem.isHostileToPlayer(np.owner)) continue;
                  const d = Math.hypot(np.x - pPos[0], np.z - pPos[2]);
                  if (d <= 3.2 && Math.abs(np.y - (pPos[1] + 1.15)) < 2.2) {
                    this.npcSystem.projectiles.splice(pi, 1);
                    this._spawnEffect({
                      shape: 'ring', x: np.x, y: np.y, z: np.z,
                      s0: 0.25, s1: 1.4, life: 0.32,
                      col: [0.96, 0.84, 0.44], alpha: 0.68,
                    });
                    if (monsterSystem) monsterSystem.spawnFloatingText(pPos[0], pPos[1] + 2.35, pPos[2], '玄龟拦截!', '#f5df8c');
                  }
                }
              }
            }
            const orbR = 1.18;
            rt.x = pPos[0] + Math.sin(rt.orbitAngle) * orbR;
            rt.y = pPos[1] + 1.08 + Math.sin(elapsed * 3.4) * 0.08;
            rt.z = pPos[2] + Math.cos(rt.orbitAngle) * orbR;
            rt.rotX = 0.0;
            rt.rotY = rt.orbitAngle;
            rt.rotZ = 0.0;
            rt.scale = M.lerp(rt.scale, 1.52, kFollow);
            rt.glow = 0.48;

            // Translucent ochre-gold outer rim glow orbiting with the shield
            M.m4ComposeTRS(this._shieldRingMat, rt.x, rt.y, rt.z, Math.PI * 0.5, rt.rotY, 0, 0.72, 1.0, 0.72);
            this.vfxDrawList.push({
              shape: 'ring',
              modelMat: this._shieldRingMat,
              col: [0.92, 0.78, 0.40],
              alpha: 0.48,
            });
          }
          M.m4ComposeTRS(rt.modelMat, rt.x, rt.y, rt.z, rt.rotX, rt.rotY, rt.rotZ, rt.scale, rt.scale, rt.scale);
          this.opaqueDrawList.push({ id, modelMat: rt.modelMat, tint: def.tint, glow: rt.glow });
        } else if (id === 'jingang_bell') {
          if (rt.state === 'active' && !paused) {
            rt.timer -= cdt;
            if (rt.timer <= 0) rt.state = 'idle';
          }
          const ringing = rt.state === 'active';
          rt.x = M.lerp(rt.x, wear.x, kFollow);
          rt.y = M.lerp(rt.y, wear.y + (ringing ? 0.18 : 0), kFollow);
          rt.z = M.lerp(rt.z, wear.z, kFollow);
          rt.rotX = wear.rotX + (ringing ? Math.sin(elapsed * 34.0) * 0.35 : 0);
          rt.rotY = wear.rotY;
          rt.rotZ = wear.rotZ + (ringing ? Math.cos(elapsed * 34.0) * 0.35 : 0);
          rt.scale = ringing ? 1.18 : wear.scale;
          rt.glow = ringing ? 0.75 : (this.buffs.bellDrTimer > 0 ? 0.32 : 0.08);
          M.m4ComposeTRS(rt.modelMat, rt.x, rt.y, rt.z, rt.rotX, rt.rotY, rt.rotZ, rt.scale, rt.scale, rt.scale);
          this.opaqueDrawList.push({ id, modelMat: rt.modelMat, tint: def.tint, glow: rt.glow });
        } else if (id === 'liuyun_scarf') {
          if (this.buffs.scarfTimer > 0) {
            // Unfolded translucent pale white-cyan flowing cloud shroud wrapping protagonist!
            M.m4ComposeTRS(this._scarfVeilMat, pPos[0], pPos[1] + 1.05, pPos[2], 0, elapsed * 1.15, 0, 1.02, 1.05, 1.02);
            this.vfxDrawList.push({
              shape: 'liuyun_veil',
              modelMat: this._scarfVeilMat,
              col: [0.76, 0.96, 0.98],
              alpha: 0.34,
            });
            M.m4ComposeTRS(this._scarfRingMatA, pPos[0], pPos[1] + 1.72, pPos[2], 0.14, -elapsed * 1.6, 0, 1.06, 1.0, 1.06);
            this.vfxDrawList.push({
              shape: 'ring',
              modelMat: this._scarfRingMatA,
              col: [0.95, 1.0, 1.0],
              alpha: 0.48,
            });
            M.m4ComposeTRS(this._scarfRingMatB, pPos[0], pPos[1] + 0.38, pPos[2], -0.14, elapsed * 1.4, 0, 1.08, 1.0, 1.08);
            this.vfxDrawList.push({
              shape: 'ring',
              modelMat: this._scarfRingMatB,
              col: [0.84, 0.98, 1.0],
              alpha: 0.42,
            });
          } else {
            // Folded narrow translucent pale-cyan cloth strip draped over left arm/shoulder + bright white edge trim!
            rt.x = M.lerp(rt.x, wear.x, kFollow);
            rt.y = M.lerp(rt.y, wear.y, kFollow);
            rt.z = M.lerp(rt.z, wear.z, kFollow);
            M.m4ComposeTRS(this._scarfFoldedMat, rt.x, rt.y, rt.z, wear.rotX, wear.rotY, wear.rotZ, 1.05, 1.05, 1.05);
            this.vfxDrawList.push({
              shape: 'liuyun_folded',
              modelMat: this._scarfFoldedMat,
              col: [0.68, 0.94, 0.96],
              alpha: 0.56,
            });
            this.vfxDrawList.push({
              shape: 'liuyun_border',
              modelMat: this._scarfFoldedMat,
              col: [0.98, 1.0, 1.0],
              alpha: 0.85,
            });
          }
        }
      }

      // 3B. Equipped Flying Sword Visuals (佩剑悬背 on ground; 御剑踏空 horizontally under feet while flying!)
      if (this.equipped.flyingSword && FLYING_SWORD_MAP[this.equipped.flyingSword]) {
        const swDef = FLYING_SWORD_MAP[this.equipped.flyingSword];
        const yaw = camera.charYaw;
        const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
        const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
        const hSpd = Math.hypot(camera.vel[0], camera.vel[2]);

        if (camera.flying) {
          // 御剑飞行: enlarged refined immortal sword hovers horizontally beneath protagonist's feet with layered sword-qi VFX!
          const grade = swDef.grade || 1;
          const isBoost = !!camera.isSprinting && hSpd > 6.0;
          const hoverBob = Math.sin(elapsed * 4.2) * 0.032;
          const swX = pPos[0] + fwdX * 0.16;
          const swY = pPos[1] - 0.06 + hoverBob;
          const swZ = pPos[2] + fwdZ * 0.16;
          const pitchTilt = M.clamp(-camera.vel[1] * 0.012, -0.26, 0.26);
          const sc = swDef.flyScale || 1.66;
          M.m4ComposeTRS(this._flyingSwordMat, swX, swY, swZ, pitchTilt, yaw, 0, sc, sc * 1.12, sc);
          this.opaqueDrawList.push({
            id: swDef.id,
            modelMat: this._flyingSwordMat,
            tint: swDef.tint,
            glow: (isBoost ? 0.72 : 0.46) + grade * 0.08 + 0.12 * Math.sin(elapsed * 5.2),
          });
          // Primary & Secondary counter-rotating luminous sword-qi rings beneath the sword!
          const ringScale = 1.05 + grade * 0.12 + (isBoost ? 0.18 : 0.0) + Math.sin(elapsed * 4.5) * 0.05;
          M.m4ComposeTRS(this._flyingSwordAuraMat, pPos[0], swY - 0.05, pPos[2], 0, elapsed * (2.2 + grade * 0.4), 0, ringScale, 1.0, ringScale * 1.48);
          this.vfxDrawList.push({
            shape: 'ring',
            modelMat: this._flyingSwordAuraMat,
            col: swDef.trailCol,
            alpha: isBoost ? 0.56 : 0.36,
          });
          if (grade >= 2 || isBoost) {
            const innerSc = 0.68 + grade * 0.08;
            M.m4ComposeTRS(this._flyingSwordAuraMat2, swX, swY - 0.02, swZ, pitchTilt, -elapsed * 3.4, 0, innerSc, 1.0, innerSc * 1.85);
            this.vfxDrawList.push({
              shape: 'ring',
              modelMat: this._flyingSwordAuraMat2,
              col: swDef.accentCol || swDef.trailCol,
              alpha: isBoost ? 0.48 : 0.28,
            });
          }
          // Streaming sword-light ribbons, floating spirit motes & boost shock-rings!
          if (!paused) {
            this._swordTrailAcc += cdt;
            const interval = isBoost ? 0.032 : (hSpd > 6.0 ? 0.052 : 0.11);
            if (this._swordTrailAcc >= interval) {
              this._swordTrailAcc = 0;
              // 1) Central tail sword-qi ribbon streak
              const tailX = swX - fwdX * (1.42 * (sc / 1.65)) + (Math.random() - 0.5) * 0.24;
              const tailY = swY + (Math.random() - 0.5) * 0.10;
              const tailZ = swZ - fwdZ * (1.42 * (sc / 1.65)) + (Math.random() - 0.5) * 0.24;
              this._spawnEffect({
                shape: 'shard',
                x: tailX, y: tailY, z: tailZ,
                vx: -fwdX * (2.8 + hSpd * 0.18), vy: (Math.random() - 0.5) * 0.45, vz: -fwdZ * (2.8 + hSpd * 0.18),
                rotY: Math.atan2(fwdX, fwdZ),
                sx0: isBoost ? 0.12 : 0.09, sy0: 0.045, sz0: isBoost ? 1.85 : (hSpd > 6 ? 1.25 : 0.52),
                sx1: 0.012, sy1: 0.012, sz1: 0.14,
                life: isBoost ? 0.42 : 0.36,
                col: swDef.trailCol,
                alpha: isBoost ? 0.68 : 0.50,
              });
              // 2) Twin flank sword-aura sparkles & gentle hovering qi motes
              const side = Math.random() < 0.5 ? -1 : 1;
              const flankDist = (0.34 + Math.random() * 0.24) * side;
              this._spawnEffect({
                shape: 'orb',
                x: swX + rightX * flankDist - fwdX * (Math.random() * 0.9),
                y: swY - 0.04 + (Math.random() - 0.5) * 0.18,
                z: swZ + rightZ * flankDist - fwdZ * (Math.random() * 0.9),
                vx: -fwdX * (1.4 + hSpd * 0.08) + rightX * side * 0.45,
                vy: hSpd < 3.0 ? (0.35 + Math.random() * 0.35) : ((Math.random() - 0.5) * 0.3),
                vz: -fwdZ * (1.4 + hSpd * 0.08) + rightZ * side * 0.45,
                s0: isBoost ? 0.11 : 0.08, s1: 0.015,
                life: 0.45 + Math.random() * 0.20,
                col: swDef.accentCol || swDef.trailCol,
                alpha: isBoost ? 0.72 : 0.48,
              });
            }
            // 3) Wind-breaking shock rings behind the sword when Boost-Flying (加速飞行破空灵环)!
            if (isBoost) {
              this._swordBoostRingAcc += cdt;
              if (this._swordBoostRingAcc >= 0.26) {
                this._swordBoostRingAcc = 0;
                this._spawnEffect({
                  shape: 'ring',
                  x: swX - fwdX * 0.9, y: swY, z: swZ - fwdZ * 0.9,
                  vx: -fwdX * 3.2, vy: 0, vz: -fwdZ * 3.2,
                  rotX: Math.PI * 0.5,
                  rotY: yaw,
                  sx0: 0.45, sy0: 0.45, sz0: 0.45,
                  sx1: 1.65 + grade * 0.20, sy1: 1.65 + grade * 0.20, sz1: 1.65 + grade * 0.20,
                  life: 0.36,
                  col: swDef.accentCol || swDef.trailCol,
                  alpha: 0.48,
                });
              }
            }
          }
        } else {
          // 陆行佩剑悬背: refined larger sword hovers diagonally behind protagonist's back with gentle idle float
          const bob = Math.sin(elapsed * 2.4) * 0.05;
          const bx = pPos[0] - fwdX * 0.44 - rightX * 0.14;
          const by = pPos[1] + 1.28 + bob;
          const bz = pPos[2] - fwdZ * 0.44 - rightZ * 0.14;
          const sc = swDef.backScale || 0.88;
          // Local -Z is blade tip -> rotate X by +PI/2 so blade points downward-diagonally across back
          M.m4ComposeTRS(this._flyingSwordMat, bx, by, bz, Math.PI * 0.48, yaw, -0.46, sc, sc, sc);
          this.opaqueDrawList.push({
            id: swDef.id,
            modelMat: this._flyingSwordMat,
            tint: swDef.tint,
            glow: 0.22 + (swDef.grade || 1) * 0.05,
          });
        }
      }

      // 4. Update transient treasure VFX particles/rings
      if (!paused) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
          const ef = this.effects[i];
          ef.age += cdt;
          if (ef.age >= ef.life) {
            this.effects.splice(i, 1);
            continue;
          }
          ef.vy -= ef.gravity * cdt;
          ef.x += ef.vx * cdt;
          ef.y += ef.vy * cdt;
          ef.z += ef.vz * cdt;
          ef.rotY += ef.spinY * cdt;
          const u = ef.age / ef.life;
          const ease = 1.0 - (1.0 - u) * (1.0 - u);
          const sx = M.lerp(ef.sx0, ef.sx1, ease);
          const sy = M.lerp(ef.sy0, ef.sy1, ease);
          const sz = M.lerp(ef.sz0, ef.sz1, ease);
          M.m4ComposeTRS(ef.modelMat, ef.x, ef.y, ef.z, ef.rotX, ef.rotY, ef.rotZ, sx, sy, sz);
        }
      }
    }
  }

  XW.Treasures = {
    TREASURE_DEFS,
    TREASURE_MAP,
    FLYING_SWORD_DEFS,
    FLYING_SWORD_MAP,
    createTreasureSystem: () => new TreasureSystem(),
  };
})(window);
