(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;

  // =========================================================================
  // 1. ORE ITEM CATALOG (练气期 8 种 + 筑基期 8 种 + 下品灵石 · 等概率产出)
  // =========================================================================
  const LIANQI_ORES = [
    { id: 'ore_qingtongsha', name: '青铜砂', icon: '砂', tier: 1, slotType: 'ore', desc: '练气期灵矿 · 蕴含微弱金石灵气的细密青铜矿砂' },
    { id: 'ore_chitiekuang', name: '赤铁矿', icon: '铁', tier: 1, slotType: 'ore', desc: '练气期灵矿 · 质地坚实的暗赤铁矿，常用于炼制入门法器' },
    { id: 'ore_qinggangshi', name: '青罡石', icon: '罡', tier: 1, slotType: 'ore', desc: '练气期灵矿 · 泛青色罡纹的硬质灵石，锋锐耐锻' },
    { id: 'ore_liushajin',   name: '流沙金', icon: '金', tier: 1, slotType: 'ore', desc: '练气期灵矿 · 细碎璀璨的灵金砂粒，导灵顺畅' },
    { id: 'ore_houtuyan',    name: '厚土岩', icon: '岩', tier: 1, slotType: 'ore', desc: '练气期灵矿 · 沉重厚实的土系灵岩，防御炼材' },
    { id: 'ore_hanshuiyu',   name: '寒水玉', icon: '玉', tier: 1, slotType: 'ore', desc: '练气期灵矿 · 触手微凉的清润水系灵玉' },
    { id: 'ore_chiyantong',  name: '赤炎铜', icon: '铜', tier: 1, slotType: 'ore', desc: '练气期灵矿 · 隐带温热赤芒的火性灵铜' },
    { id: 'ore_cuilingsui',  name: '翠灵髓', icon: '髓', tier: 1, slotType: 'ore', desc: '练气期灵矿 · 矿脉深处凝结的生机翠绿石髓' },
  ];

  const ZHUJI_ORES = [
    { id: 'ore_xuantiejing',    name: '玄铁精',   icon: '玄', tier: 2, slotType: 'ore', desc: '筑基期灵矿 · 百炼凝缩的深黑玄铁精华，沉重非凡' },
    { id: 'ore_hanwengang',     name: '寒纹钢',   icon: '钢', tier: 2, slotType: 'ore', desc: '筑基期灵矿 · 表面浮现冰蓝寒纹的筑基灵钢' },
    { id: 'ore_xingyinsha',     name: '星银砂',   icon: '银', tier: 2, slotType: 'ore', desc: '筑基期灵矿 · 闪耀微弱星辉的珍稀银白矿砂' },
    { id: 'ore_zijinkuang',     name: '紫金矿',   icon: '紫', tier: 2, slotType: 'ore', desc: '筑基期灵矿 · 紫芒与金纹交织的高阶灵矿' },
    { id: 'ore_lihuojing',      name: '离火晶',   icon: '火', tier: 2, slotType: 'ore', desc: '筑基期灵矿 · 蕴藏炽烈离火之力的赤红灵晶' },
    { id: 'ore_wutujingjin',    name: '戊土精金', icon: '戊', tier: 2, slotType: 'ore', desc: '筑基期灵矿 · 厚重如山的土系精金灵材' },
    { id: 'ore_gengjinjiantie', name: '庚金剑铁', icon: '剑', tier: 2, slotType: 'ore', desc: '筑基期灵矿 · 自带锋锐剑意的上等庚金奇铁' },
    { id: 'ore_shenhaixuanjing',name: '深海玄晶', icon: '晶', tier: 2, slotType: 'ore', desc: '筑基期灵矿 · 幽蓝澄澈的水系玄冰晶核' },
  ];

  const XIAPIN_LINGSHI = {
    id: 'item_xiapin_lingshi',
    name: '下品灵石',
    icon: '灵',
    tier: 1,
    slotType: 'stone',
    desc: '修真界通用货币与灵气结晶 · 蕴含精纯天地灵气，开采灵矿时有概率伴生开出',
  };

  // =========================================================================
  // 2. PURE-CODE 3D ORE VEIN MESH BUILDER (12 floats/vert: pos3, nrm3, col3, meta3)
  //    练气期: 绿色光纹; 筑基期: 蓝色光纹
  // =========================================================================
  class OreMeshBuilder {
    constructor() {
      this.verts = [];
      this.indices = [];
      this.vCount = 0;
    }

    pushVert(x, y, z, nx, ny, nz, col, rough = 0.72, emissive = 0.0) {
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

    // Faceted rock boulder with glowing vein streaks embedded across surface!
    addOreRock(cx, cy, cz, rx, ry, rz, seed, rockCol, veinCol, isTier2) {
      const uS = 10, vS = 7;
      const base = this.vCount;
      const stride = uS + 1;
      for (let iv = 0; iv <= vS; iv++) {
        const phi = (iv / vS) * Math.PI;
        const sp = Math.sin(phi), cp = Math.cos(phi);
        for (let iu = 0; iu <= uS; iu++) {
          const th = (iu / uS) * Math.PI * 2;
          const ct = Math.cos(th), st = Math.sin(th);
          // Angular mineral facets
          const n1 = Math.sin(th * 3.0 + seed) * Math.cos(phi * 2.0 - seed * 0.7);
          const n2 = Math.cos(th * 5.0 - seed * 1.4) * Math.sin(phi * 3.0 + seed * 0.5);
          const rad = 0.88 + n1 * 0.14 + n2 * 0.08;
          let lx = rx * sp * ct * rad;
          let ly = ry * cp * rad;
          let lz = rz * sp * st * rad;
          if (ly < -ry * 0.35) ly = -ry * 0.35 + (ly + ry * 0.35) * 0.3;

          // Diagonal glowing mineral vein bands across the rock!
          const veinWave1 = Math.abs(Math.sin(th * 2.0 + phi * 2.8 + seed));
          const veinWave2 = Math.abs(Math.cos(th * 3.0 - phi * 2.2 - seed * 0.6));
          const veinMask = (veinWave1 < (isTier2 ? 0.22 : 0.18) || veinWave2 < (isTier2 ? 0.16 : 0.12)) && phi > 0.35 && phi < 2.45;

          const col = veinMask
            ? veinCol
            : [
                rockCol[0] * (0.88 + 0.22 * (cp * 0.5 + 0.5)),
                rockCol[1] * (0.88 + 0.22 * (cp * 0.5 + 0.5)),
                rockCol[2] * (0.88 + 0.22 * (cp * 0.5 + 0.5)),
              ];
          const rough = veinMask ? 0.22 : 0.78;
          const em = veinMask ? (isTier2 ? 0.88 : 0.74) : 0.0;
          this.pushVert(cx + lx, cy + ly, cz + lz, sp * ct / Math.max(rx, 0.05), cp / Math.max(ry, 0.05), sp * st / Math.max(rz, 0.05), col, rough, em);
        }
      }
      for (let iv = 0; iv < vS; iv++) {
        for (let iu = 0; iu < uS; iu++) {
          const a = base + iv * stride + iu;
          this.addTri(a, a + stride, a + 1);
          this.addTri(a + 1, a + stride, a + stride + 1);
        }
      }
    }

    // Protruding glowing crystal prism jutting out of the ore vein!
    addCrystalProng(cx, cy, cz, r, h, rx, ry, rz, baseCol, tipCol, em = 0.88) {
      const segs = 5;
      const tipP = this._rotVec(0, h, 0, rx, ry, rz);
      const tipN = this._rotVec(0, 1, 0, rx, ry, rz);
      const tipIdx = this.pushVert(cx + tipP[0], cy + tipP[1], cz + tipP[2], tipN[0], tipN[1], tipN[2], tipCol, 0.16, em);
      const base = this.vCount;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const pMid = this._rotVec(ca * r, h * 0.45, sa * r, rx, ry, rz);
        const pBot = this._rotVec(ca * r * 1.12, 0, sa * r * 1.12, rx, ry, rz);
        const n = this._rotVec(ca, 0.25, sa, rx, ry, rz);
        this.pushVert(cx + pBot[0], cy + pBot[1], cz + pBot[2], n[0], n[1], n[2], baseCol, 0.22, em * 0.65);
        this.pushVert(cx + pMid[0], cy + pMid[1], cz + pMid[2], n[0], n[1], n[2], tipCol, 0.18, em * 0.90);
      }
      for (let i = 0; i < segs; i++) {
        const a = base + i * 2, b = a + 2;
        this.addQuad(a, b, b + 1, a + 1);
        this.addTri(tipIdx, a + 1, b + 1);
      }
    }

    build() {
      return {
        vertices: new Float32Array(this.verts),
        indices: this.vCount > 65000 ? new Uint32Array(this.indices) : new Uint16Array(this.indices),
      };
    }
  }

  function buildOreVeinMesh(tier) {
    const b = new OreMeshBuilder();
    const isT2 = tier === 2;
    const rockCol = isT2 ? [0.22, 0.25, 0.32] : [0.36, 0.37, 0.34];
    const veinCol = isT2 ? [0.34, 0.80, 1.00] : [0.32, 0.96, 0.56];
    const tipCol  = isT2 ? [0.76, 0.96, 1.00] : [0.76, 1.00, 0.84];

    // Main central jagged ore boulder + 2 flanking mineral outcrops
    b.addOreRock(0.0,   0.62,  0.0,   0.78, 0.88, 0.72, 1.3, rockCol, veinCol, isT2);
    b.addOreRock(0.56,  0.38,  0.24,  0.52, 0.54, 0.48, 3.7, rockCol, veinCol, isT2);
    b.addOreRock(-0.54, 0.42, -0.22,  0.50, 0.58, 0.52, 6.1, rockCol, veinCol, isT2);

    // Protruding glowing vein crystals (green for 练气, blue for 筑基)
    const prongs = [
      [ 0.08, 1.15,  0.06, 0.14, isT2 ? 0.72 : 0.54,  0.18, 0.2, -0.14],
      [-0.36, 0.86,  0.22, 0.11, isT2 ? 0.58 : 0.44,  0.42, 0.0,  0.46],
      [ 0.44, 0.74, -0.16, 0.12, isT2 ? 0.62 : 0.46, -0.35, 0.0, -0.48],
      [-0.18, 0.68, -0.46, 0.10, isT2 ? 0.52 : 0.38, -0.52, 0.0,  0.22],
      [ 0.26, 0.54,  0.48, 0.10, isT2 ? 0.50 : 0.38,  0.55, 0.0, -0.26],
    ];
    for (const p of prongs) {
      b.addCrystalProng(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], veinCol, tipCol, isT2 ? 0.94 : 0.80);
    }
    return b.build();
  }

  function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // =========================================================================
  // 3. REGIONAL ORE VEIN SPAWNER (4 练气地区绿纹矿 + 3 筑基地区蓝纹矿)
  // =========================================================================
  function generateOreSpawns() {
    const ores = [];
    const rand = makeRng(20261124);
    const nrm = new Float32Array(3);

    const tooClose = (x, z, minDist) => {
      const m2 = minDist * minDist;
      for (let i = 0; i < ores.length; i++) {
        const dx = ores[i].x - x, dz = ores[i].z - z;
        if (dx * dx + dz * dz < m2) return true;
      }
      return false;
    };

    const addOre = (tier, x, z) => {
      const y = T.getMeshTerrainHeight(x, z);
      const maxHp = tier === 2 ? 140 : 60;
      ores.push({
        uid: ores.length,
        tier,
        meshKey: tier === 2 ? 'ore_zhuji' : 'ore_lianqi',
        name: tier === 2 ? '筑基灵矿' : '练气灵矿',
        tint: tier === 2 ? [0.38, 0.82, 1.00] : [0.34, 0.96, 0.58],
        x, y, z,
        yaw: rand() * Math.PI * 2,
        scale: tier === 2 ? 1.38 : 1.18,
        colRadius: tier === 2 ? 1.55 : 1.32,
        colHeight: tier === 2 ? 2.55 : 2.15,
        nameHeight: tier === 2 ? 2.85 : 2.35,
        maxHp,
        hp: maxHp,
        alive: true,
        respawnTimer: 0,
        hitFlash: 0,
        shakeTimer: 0,
        visible: true,
        modelMat: M.mat4(),
      });
    };

    const scatter = (tier, targetCount, minX, maxX, minZ, maxZ, minSpacing, validator) => {
      let added = 0;
      for (let tries = 0; tries < 2200 && added < targetCount; tries++) {
        const x = minX + rand() * (maxX - minX);
        const z = minZ + rand() * (maxZ - minZ);
        if (tooClose(x, z, minSpacing)) continue;
        T.getTerrainNormal(x, z, nrm);
        const y = T.getMeshTerrainHeight(x, z);
        if (!validator(x, y, z, nrm)) continue;
        addOre(tier, x, z);
        added++;
      }
    };

    // --- 练气期 4 大地区 (绿色光纹矿脉) ---
    // 1) 低云平原
    const spX = T.LOW_CLOUD_PLAINS.spawnX, spZ = T.LOW_CLOUD_PLAINS.spawnZ;
    addOre(1, spX + 22, spZ - 18); // Visible near spawn for immediate mining!
    addOre(1, spX - 28, spZ - 12);
    scatter(1, 13, -4200, -180, 440, 6800, 190, (x, y, z, n) => {
      if (Math.hypot(x - spX, z - spZ) < 60) return false;
      if (T.getLowCloudPlainsMask(x, z) < 0.42) return false;
      if (T.getSwampMask(x, z) > 0.08 || T.getAncientRoadMask(x, z) > 0.08 || T.getDesertMask(x, z) > 0.05) return false;
      if (T.getRiverInfo(x, z).riverMask > 0.15) return false;
      return y > 10.0 && y < 48.0 && n[1] > 0.85;
    });

    // 2) 迷雾湿地
    addOre(1, T.CHENYAN_SWAMP.viewX + 26, T.CHENYAN_SWAMP.viewZ - 12);
    scatter(1, 13, 220, 3260, 1520, 3340, 145, (x, y, z, n) => {
      if (T.getSwampMask(x, z) < 0.34) return false;
      if (T.getCloudMountainMask(x, z) > 0.10) return false;
      return y >= T.SWAMP_WATER_Y - 0.1 && y <= 14.5 && n[1] > 0.83;
    });

    // 3) 云雾山
    const cm = T.CLOUD_MOUNTAIN;
    for (let i = 0; i < cm.terraces.length; i++) {
      const tc = cm.terraces[i];
      addOre(1, tc.x - 18, tc.z - 22);
      addOre(1, tc.x + 26, tc.z + 12);
    }
    addOre(1, cm.viewX - 20, cm.viewZ - 18);

    // 4) 流沙荒漠
    const dVx = T.DESERT_DUNES.viewX, dVz = T.DESERT_DUNES.viewZ;
    addOre(1, dVx + 26, dVz + 28);
    scatter(1, 13, -8600, -4240, 1740, 6800, 200, (x, y, z, n) => {
      if (T.getDesertMask(x, z) < 0.36) return false;
      if (T.getLowCloudPlainsMask(x, z) > 0.12) return false;
      return y > 12.0 && y < 78.0 && n[1] > 0.82;
    });

    // --- 筑基期 3 大地区 (蓝色光纹矿脉) ---
    // 5) 通天木林
    const sf = T.SPIRIT_FOREST;
    addOre(2, sf.viewX + 24, sf.viewZ - 18);
    addOre(2, sf.viewX - 26, sf.viewZ - 32);
    scatter(2, 13, -6050, -1480, -4000, 240, 190, (x, y, z, n) => {
      if (T.getSpiritForestMask(x, z) < 0.35) return false;
      if (T.getSnowfieldMask(x, z) > 0.12 || T.getAncientRoadMask(x, z) > 0.18) return false;
      if (Math.hypot(x - sf.worldTreeX, z - sf.worldTreeZ) < 62) return false;
      return y > 38.0 && y < 95.0 && n[1] > 0.78;
    });

    // 6) 残阵古道
    const cr = T.CANZHEN_ROAD;
    addOre(2, cr.viewX - 24, cr.viewZ - 22);
    addOre(2, cr.viewX + 18, cr.viewZ - 34);
    scatter(2, 12, -4020, -2460, 190, 1500, 130, (x, y, z, n) => {
      if (T.getAncientRoadMask(x, z) < 0.28) return false;
      if (T.getSpiritForestMask(x, z) > 0.22) return false;
      return y > 18.0 && y < 88.0 && n[1] > 0.78;
    });

    // 7) 霜雪原
    const fs = T.FROST_SNOWFIELD;
    addOre(2, fs.viewX + 26, fs.viewZ - 18);
    addOre(2, fs.viewX - 24, fs.viewZ - 28);
    scatter(2, 13, -8000, 3300, -8850, -4620, 220, (x, y, z, n) => {
      if (T.getSnowfieldMask(x, z) < 0.34) return false;
      if (T.getFrostMountainMask(x, z) > 0.16) return false;
      return y > 62.0 && y < 145.0 && n[1] > 0.82;
    });

    return ores;
  }

  // =========================================================================
  // 4. ORE MINING SYSTEM (HP, Attack-to-Break, Shatter Rock VFX, Equal Drops + 下品灵石)
  // =========================================================================
  class OreSystem {
    constructor() {
      this.meshes = {
        ore_lianqi: buildOreVeinMesh(1),
        ore_zhuji:  buildOreVeinMesh(2),
      };
      this.ores = generateOreSpawns();
      this.drawList = [];   // [{ id, modelMat, tint, glow }]
      this.effects = [];    // Shatter rock chunks, crystal shards & dust rings rendered via renderer VFX pass!
      this.maxEffects = 128;
      this.onAddBagItem = null;
      this.monsterSystem = null;
    }

    _spawnEffect(opts) {
      if (this.effects.length >= this.maxEffects) this.effects.shift();
      this.effects.push({
        shape: opts.shape || 'rock',
        x: opts.x, y: opts.y, z: opts.z,
        vx: opts.vx || 0, vy: opts.vy || 0, vz: opts.vz || 0,
        gravity: opts.gravity !== undefined ? opts.gravity : 15.0,
        rotX: opts.rotX || 0, rotY: opts.rotY || 0, rotZ: opts.rotZ || 0,
        spinX: opts.spinX || 0, spinY: opts.spinY || 0, spinZ: opts.spinZ || 0,
        sx0: opts.sx0 !== undefined ? opts.sx0 : (opts.s0 || 0.25),
        sy0: opts.sy0 !== undefined ? opts.sy0 : (opts.s0 || 0.25),
        sz0: opts.sz0 !== undefined ? opts.sz0 : (opts.s0 || 0.25),
        sx1: opts.sx1 !== undefined ? opts.sx1 : (opts.s1 || 0.10),
        sy1: opts.sy1 !== undefined ? opts.sy1 : (opts.s1 || 0.10),
        sz1: opts.sz1 !== undefined ? opts.sz1 : (opts.s1 || 0.10),
        age: 0,
        life: opts.life || 0.72,
        col: opts.col || [0.42, 0.44, 0.42],
        alpha: opts.alpha !== undefined ? opts.alpha : 0.90,
        modelMat: M.mat4(),
      });
    }

    // Physical collision so protagonist cannot pass through unbroken mineral veins
    resolvePlayerCollision(playerEyePos, vel, eyeHeight, playerRadius) {
      const footY = playerEyePos[1] - eyeHeight;
      const headY = playerEyePos[1] + 0.45;
      const px = playerEyePos[0], pz = playerEyePos[2];
      let hit = false;
      for (let i = 0; i < this.ores.length; i++) {
        const o = this.ores[i];
        if (!o.alive || !o.visible) continue;
        if (headY <= o.y + 0.05 || footY >= o.y + o.colHeight) continue;
        const sumR = playerRadius + o.colRadius;
        const dx = px - o.x, dz = pz - o.z;
        const dSq = dx * dx + dz * dz;
        if (dSq >= sumR * sumR) continue;
        const dist = Math.sqrt(dSq) || 0.001;
        const nx = dx / dist, nz = dz / dist;
        const pen = sumR - dist;
        playerEyePos[0] += nx * pen;
        playerEyePos[2] += nz * pen;
        const vn = vel[0] * nx + vel[2] * nz;
        if (vn < 0) {
          vel[0] -= vn * nx;
          vel[2] -= vn * nz;
        }
        hit = true;
      }
      return hit;
    }

    findAimOre(pPos, aimYaw, maxRange, maxConeCos = 0.86) {
      const fwdX = -Math.sin(aimYaw), fwdZ = -Math.cos(aimYaw);
      let best = null, bestScore = Infinity;
      for (let i = 0; i < this.ores.length; i++) {
        const o = this.ores[i];
        if (!o.alive || !o.visible) continue;
        const dx = o.x - pPos[0], dz = o.z - pPos[2];
        const d = Math.hypot(dx, dz);
        if (d < 0.4 || d > maxRange) continue;
        const dot = (dx * fwdX + dz * fwdZ) / d;
        if (dot < maxConeCos) continue;
        const score = d * (1.28 - dot * 0.45);
        if (score < bestScore) { bestScore = score; best = o; }
      }
      return best;
    }

    applyDamageToOre(o, dmg) {
      if (!o || !o.alive) return false;
      const amount = Math.max(1, Math.round(dmg));
      o.hp = Math.max(0, o.hp - amount);
      o.hitFlash = 0.24;
      o.shakeTimer = 0.24;

      const isT2 = o.tier === 2;
      const rockCol = isT2 ? [0.28, 0.31, 0.38] : [0.44, 0.45, 0.40];
      const veinCol = o.tint;

      // Hit stone chip sparks!
      for (let k = 0; k < 5; k++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 2.4 + Math.random() * 3.6;
        this._spawnEffect({
          shape: k < 3 ? 'rock' : 'shard',
          x: o.x + Math.cos(a) * 0.65,
          y: o.y + 0.7 + Math.random() * 0.7,
          z: o.z + Math.sin(a) * 0.65,
          vx: Math.cos(a) * spd, vy: 2.5 + Math.random() * 2.8, vz: Math.sin(a) * spd,
          gravity: 14.5,
          spinX: 7.0, spinY: 8.0,
          s0: k < 3 ? 0.18 : 0.14, s1: 0.05,
          life: 0.48 + Math.random() * 0.18,
          col: k < 3 ? rockCol : veinCol,
          alpha: 0.88,
        });
      }

      if (this.monsterSystem) {
        this.monsterSystem.spawnFloatingText(o.x, o.y + o.nameHeight + 0.25, o.z, `-${amount}`, isT2 ? '#8ee0ff' : '#96ffbe');
      }

      if (o.hp <= 0) {
        this._shatterOre(o);
      }
      return true;
    }

    _shatterOre(o) {
      o.alive = false;
      o.visible = false;
      o.respawnTimer = 75.0;

      const isT2 = o.tier === 2;
      const rockColA = isT2 ? [0.24, 0.28, 0.36] : [0.40, 0.42, 0.38];
      const rockColB = isT2 ? [0.34, 0.38, 0.46] : [0.54, 0.52, 0.44];
      const veinCol = o.tint;

      // Dramatic Rock Shatter Burst: 16 tumbling angular stone chunks + 6 glowing crystal shards + shockwave dust ring!
      this._spawnEffect({
        shape: 'ring',
        x: o.x, y: o.y + 0.16, z: o.z,
        gravity: 0,
        sx0: 0.65, sy0: 1.0, sz0: 0.65,
        sx1: isT2 ? 3.8 : 3.1, sy1: 1.0, sz1: isT2 ? 3.8 : 3.1,
        life: 0.50,
        col: veinCol,
        alpha: 0.58,
      });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.35;
        const spd = 2.6 + Math.random() * 5.2;
        const big = i < 6;
        this._spawnEffect({
          shape: 'rock',
          x: o.x + Math.cos(a) * (0.3 + Math.random() * 0.55),
          y: o.y + 0.45 + Math.random() * 1.15,
          z: o.z + Math.sin(a) * (0.3 + Math.random() * 0.55),
          vx: Math.cos(a) * spd,
          vy: 3.4 + Math.random() * 4.4,
          vz: Math.sin(a) * spd,
          gravity: 16.0,
          spinX: (Math.random() - 0.5) * 14.0,
          spinY: (Math.random() - 0.5) * 14.0,
          spinZ: (Math.random() - 0.5) * 10.0,
          s0: big ? (0.34 + Math.random() * 0.14) : (0.18 + Math.random() * 0.10),
          s1: big ? 0.16 : 0.06,
          life: 0.72 + Math.random() * 0.34,
          col: i % 2 === 0 ? rockColA : rockColB,
          alpha: 0.94,
        });
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
        const spd = 3.2 + Math.random() * 3.8;
        this._spawnEffect({
          shape: 'shard',
          x: o.x + Math.cos(a) * 0.4,
          y: o.y + 0.8 + Math.random() * 0.6,
          z: o.z + Math.sin(a) * 0.4,
          vx: Math.cos(a) * spd,
          vy: 3.8 + Math.random() * 3.2,
          vz: Math.sin(a) * spd,
          gravity: 13.0,
          rotY: a,
          spinX: 8.0, spinY: 6.0,
          sx0: 0.14, sy0: 0.14, sz0: 0.46,
          sx1: 0.04, sy1: 0.04, sz1: 0.14,
          life: 0.65 + Math.random() * 0.25,
          col: veinCol,
          alpha: 0.88,
        });
      }

      // Roll uniform equal-probability ore from tier pool (1/8 each!) + chance for 下品灵石!
      const pool = isT2 ? ZHUJI_ORES : LIANQI_ORES;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      let lootText = `开采 +1 ${chosen.name}`;
      if (this.onAddBagItem) {
        const okOre = this.onAddBagItem(Object.assign({ count: 1 }, chosen));
        if (!okOre) lootText = '背包已满!';
      }

      const stoneChance = isT2 ? 0.50 : 0.35;
      if (Math.random() < stoneChance) {
        const stoneCount = (isT2 && Math.random() < 0.40) ? 2 : 1;
        if (this.onAddBagItem) {
          this.onAddBagItem(Object.assign({ count: stoneCount }, XIAPIN_LINGSHI));
        }
        lootText += ` +${stoneCount}下品灵石`;
      }

      if (this.monsterSystem) {
        this.monsterSystem.spawnFloatingText(o.x, o.y + o.nameHeight + 0.35, o.z, lootText, '#ffe994');
      }
    }

    // Check player projectile against alive visible ore veins
    hitTestProjectile(pr) {
      for (let i = 0; i < this.ores.length; i++) {
        const o = this.ores[i];
        if (!o.alive || !o.visible) continue;
        if (pr.hitIds && pr.hitIds.has('ore_' + o.uid)) continue;
        const rad = o.colRadius + (pr.hitRadius || 0.95);
        const dx = pr.x - o.x, dz = pr.z - o.z;
        if (dx * dx + dz * dz > rad * rad) continue;
        const midY = o.y + o.colHeight * 0.5;
        if (Math.abs(pr.y - midY) > o.colHeight * 0.72 + 0.6) continue;
        if (pr.hitIds) pr.hitIds.add('ore_' + o.uid);
        this.applyDamageToOre(o, pr.dmg || 15);
        return o;
      }
      return null;
    }

    // Apply circular or forward-cone AoE skill/treasure damage to ore veins
    applyAreaDamage(cx, cz, radius, dmg, coneFwdX = null, coneFwdZ = null, minDot = 0.35) {
      let hitAny = false;
      for (let i = 0; i < this.ores.length; i++) {
        const o = this.ores[i];
        if (!o.alive || !o.visible) continue;
        const dx = o.x - cx, dz = o.z - cz;
        const d = Math.hypot(dx, dz);
        if (d > radius + o.colRadius) continue;
        if (coneFwdX !== null && coneFwdZ !== null && d > 2.2) {
          const dot = (dx * coneFwdX + dz * coneFwdZ) / (d || 1);
          if (dot < minDot) continue;
        }
        this.applyDamageToOre(o, dmg);
        hitAny = true;
      }
      return hitAny;
    }

    update(dt, elapsed, playerPos, paused) {
      const cdt = Math.min(dt, 0.05);
      const px = playerPos[0], pz = playerPos[2];
      this.drawList.length = 0;

      for (let i = 0; i < this.ores.length; i++) {
        const o = this.ores[i];
        if (!o.alive) {
          o.visible = false;
          if (!paused) {
            o.respawnTimer -= cdt;
            if (o.respawnTimer <= 0) {
              o.alive = true;
              o.hp = o.maxHp;
              o.hitFlash = 0;
              o.shakeTimer = 0;
            }
          }
          continue;
        }

        const dx = o.x - px, dz = o.z - pz;
        o.visible = (dx * dx + dz * dz) < 420.0 * 420.0;
        if (!o.visible) continue;

        if (!paused) {
          if (o.hitFlash > 0) o.hitFlash = Math.max(0, o.hitFlash - cdt);
          if (o.shakeTimer > 0) o.shakeTimer = Math.max(0, o.shakeTimer - cdt);
        }

        const shakeX = o.shakeTimer > 0 ? Math.sin(elapsed * 55.0) * 0.09 * (o.shakeTimer / 0.24) : 0;
        const shakeZ = o.shakeTimer > 0 ? Math.cos(elapsed * 49.0) * 0.09 * (o.shakeTimer / 0.24) : 0;
        const glow = o.hitFlash > 0 ? 0.85 : (0.18 + Math.sin(elapsed * 2.2 + o.uid) * 0.08);
        M.m4ComposeTRS(o.modelMat, o.x + shakeX, o.y - 0.06, o.z + shakeZ, 0, o.yaw, 0, o.scale, o.scale, o.scale);
        this.drawList.push({
          id: o.meshKey,
          modelMat: o.modelMat,
          tint: o.tint,
          glow,
        });
      }

      // Tick shatter rock fragments & rings
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
          // Gentle ground bounce for tumbling shattered stones!
          if (ef.shape === 'rock') {
            const gY = T.getMeshTerrainHeight(ef.x, ef.z) + 0.08;
            if (ef.y < gY) {
              ef.y = gY;
              ef.vy = Math.abs(ef.vy) * 0.28;
              ef.vx *= 0.65;
              ef.vz *= 0.65;
            }
          }
          ef.rotX += ef.spinX * cdt;
          ef.rotY += ef.spinY * cdt;
          ef.rotZ += ef.spinZ * cdt;
          const u = ef.age / ef.life;
          const ease = 1.0 - (1.0 - u) * (1.0 - u);
          const sx = M.lerp(ef.sx0, ef.sx1, ease);
          const sy = M.lerp(ef.sy0, ef.sy1, ease);
          const sz = M.lerp(ef.sz0, ef.sz1, ease);
          M.m4ComposeTRS(ef.modelMat, ef.x, ef.y, ef.z, ef.rotX, ef.rotY, ef.rotZ, sx, sy, sz);
        }
      }
    }

    // Render nearby ore vein label + HP bar onto existing #nametag-canvas
    renderLabels(ctx, cssW, cssH, dpr, vpMat, camPos) {
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '600 11.5px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cx = camPos[0], cy = camPos[1], cz = camPos[2];
      for (let i = 0; i < this.ores.length; i++) {
        const o = this.ores[i];
        if (!o.alive || !o.visible) continue;
        const dx = o.x - cx, dy = o.y - cy, dz = o.z - cz;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > 44.0) continue;

        const wx = o.x, wy = o.y + o.nameHeight, wz = o.z;
        const clipX = vpMat[0] * wx + vpMat[4] * wy + vpMat[8]  * wz + vpMat[12];
        const clipY = vpMat[1] * wx + vpMat[5] * wy + vpMat[9]  * wz + vpMat[13];
        const clipW = vpMat[3] * wx + vpMat[7] * wy + vpMat[11] * wz + vpMat[15];
        if (clipW <= 0.2) continue;
        const ndcX = clipX / clipW, ndcY = clipY / clipW;
        if (ndcX < -1.05 || ndcX > 1.05 || ndcY < -1.05 || ndcY > 1.05) continue;

        const sx = (ndcX * 0.5 + 0.5) * cssW;
        const sy = (0.5 - ndcY * 0.5) * cssH;
        const alpha = 1.0 - M.smoothstep(28.0, 44.0, dist);
        if (alpha <= 0.03) continue;

        const isT2 = o.tier === 2;
        const label = `${o.name} (${o.hp}/${o.maxHp})`;

        ctx.globalAlpha = alpha;
        const tw = ctx.measureText(label).width;
        const bw = Math.ceil(tw + 16), bh = 20;
        const bx = Math.round(sx - bw * 0.5), by = Math.round(sy - bh * 0.5);

        ctx.fillStyle = isT2 ? 'rgba(12, 24, 38, 0.78)' : 'rgba(12, 28, 22, 0.76)';
        ctx.strokeStyle = isT2 ? 'rgba(104, 198, 255, 0.80)' : 'rgba(106, 236, 152, 0.76)';
        ctx.lineWidth = 1.1;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 10);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillText(label, sx, sy + 1);
        ctx.fillStyle = isT2 ? '#bdeaff' : '#c6ffda';
        ctx.fillText(label, sx, sy);

        // Always show crisp mineral HP bar when damaged or close (< 20m)
        if (o.hp < o.maxHp || dist < 20.0) {
          const barW = Math.max(60, Math.min(98, bw - 10));
          const barH = 4;
          const barX = Math.round(sx - barW * 0.5);
          const barY = by + bh + 3;
          const ratio = M.clamp(o.hp / Math.max(1, o.maxHp), 0, 1);
          ctx.fillStyle = 'rgba(8, 14, 18, 0.78)';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          ctx.fillStyle = isT2 ? '#58c4ff' : '#4ee686';
          ctx.fillRect(barX, barY, Math.round(barW * ratio), barH);
        }
      }

      ctx.restore();
    }
  }

  XW.Ores = {
    LIANQI_ORES,
    ZHUJI_ORES,
    XIAPIN_LINGSHI,
    createOreSystem: () => new OreSystem(),
  };
})(window);
