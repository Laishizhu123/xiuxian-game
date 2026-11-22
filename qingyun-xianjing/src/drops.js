(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;

  // =========================================================================
  // 1. MONSTER LOOT CATALOG (统一：妖丹、妖骨、妖皮 · 分一阶/二阶)
  // =========================================================================
  const MONSTER_LOOT_DEFS = {
    1: {
      dan: {
        id: 'loot_yaodan_1',
        name: '一阶妖丹',
        icon: '丹',
        tier: 1,
        lootKind: 'dan',
        slotType: 'monster_loot',
        meshKey: 'dan_1',
        tint: [0.34, 0.96, 0.68],
        labelColor: '#9cffce',
        desc: '练气期妖兽凝结的一阶妖丹，通体莹润微光，蕴含精纯妖灵之气',
      },
      gu: {
        id: 'loot_yaogu_1',
        name: '一阶妖骨',
        icon: '骨',
        tier: 1,
        lootKind: 'gu',
        slotType: 'monster_loot',
        meshKey: 'gu_1',
        tint: [0.95, 0.90, 0.78],
        labelColor: '#fff2d2',
        desc: '练气期妖兽遗留的一阶妖骨，骨质坚实，常作炼器与制符辅材',
      },
      pi: {
        id: 'loot_yaopi_1',
        name: '一阶妖皮',
        icon: '皮',
        tier: 1,
        lootKind: 'pi',
        slotType: 'monster_loot',
        meshKey: 'pi_1',
        tint: [0.84, 0.64, 0.38],
        labelColor: '#f5d2a4',
        desc: '练气期妖兽剥落的一阶妖皮，柔韧耐磨，可用于缝制护身法衣',
      },
    },
    2: {
      dan: {
        id: 'loot_yaodan_2',
        name: '二阶妖丹',
        icon: '丹',
        tier: 2,
        lootKind: 'dan',
        slotType: 'monster_loot',
        meshKey: 'dan_2',
        tint: [0.42, 0.86, 1.0],
        labelColor: '#9ee8ff',
        desc: '筑基期妖兽凝炼而成的二阶灵丹，宝光流转，灵气浑厚非凡',
      },
      gu: {
        id: 'loot_yaogu_2',
        name: '二阶妖骨',
        icon: '骨',
        tier: 2,
        lootKind: 'gu',
        slotType: 'monster_loot',
        meshKey: 'gu_2',
        tint: [0.76, 0.92, 1.0],
        labelColor: '#d4f2ff',
        desc: '筑基期妖兽留下的二阶灵骨，隐现冰蓝灵纹，质地如玉似铁',
      },
      pi: {
        id: 'loot_yaopi_2',
        name: '二阶妖皮',
        icon: '皮',
        tier: 2,
        lootKind: 'pi',
        slotType: 'monster_loot',
        meshKey: 'pi_2',
        tint: [0.62, 0.76, 1.0],
        labelColor: '#c4d8ff',
        desc: '筑基期妖兽剥落的二阶灵皮，毛皮润泽泛光，颇具御法护体之效',
      },
    },
  };

  // =========================================================================
  // 2. PURE-CODE 3D DROP MESH BUILDER (12 floats/vert: pos3, nrm3, col3, meta3)
  // =========================================================================
  class DropMeshBuilder {
    constructor() {
      this.verts = [];
      this.indices = [];
      this.vCount = 0;
    }

    pushVert(x, y, z, nx, ny, nz, col, rough = 0.55, emissive = 0.0) {
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

    addEllipsoid(cx, cy, cz, rx, ry, rz, col, rough = 0.5, emissive = 0.0, uS = 14, vS = 10, rxA = 0, ryA = 0, rzA = 0, topCol = null, botCol = null) {
      const base = this.vCount;
      const stride = uS + 1;
      const tc = topCol || col;
      const bc = botCol || col;
      for (let iv = 0; iv <= vS; iv++) {
        const phi = (iv / vS) * Math.PI;
        const sp = Math.sin(phi), cp = Math.cos(phi);
        const hm = cp * 0.5 + 0.5;
        const cMix = [M.lerp(bc[0], tc[0], hm), M.lerp(bc[1], tc[1], hm), M.lerp(bc[2], tc[2], hm)];
        for (let iu = 0; iu <= uS; iu++) {
          const th = (iu / uS) * Math.PI * 2;
          const ct = Math.cos(th), st = Math.sin(th);
          const p = this._rotVec(rx * sp * ct, ry * cp, rz * sp * st, rxA, ryA, rzA);
          const n = this._rotVec(sp * ct / Math.max(rx, 0.02), cp / Math.max(ry, 0.02), sp * st / Math.max(rz, 0.02), rxA, ryA, rzA);
          this.pushVert(cx + p[0], cy + p[1], cz + p[2], n[0], n[1], n[2], cMix, rough, emissive);
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

    addTorus(cx, cy, cz, majorR, minorR, col, rough = 0.25, emissive = 0.7, rxA = 0, ryA = 0, rzA = 0, segs = 22, tubeSegs = 8) {
      const base = this.vCount;
      const stride = tubeSegs + 1;
      for (let i = 0; i <= segs; i++) {
        const u = (i / segs) * Math.PI * 2;
        const cu = Math.cos(u), su = Math.sin(u);
        for (let j = 0; j <= tubeSegs; j++) {
          const v = (j / tubeSegs) * Math.PI * 2;
          const cv = Math.cos(v), sv = Math.sin(v);
          const rr = majorR + minorR * cv;
          const lx = rr * cu, ly = minorR * sv, lz = rr * su;
          const nx = cv * cu, ny = sv, nz = cv * su;
          const p = this._rotVec(lx, ly, lz, rxA, ryA, rzA);
          const n = this._rotVec(nx, ny, nz, rxA, ryA, rzA);
          this.pushVert(cx + p[0], cy + p[1], cz + p[2], n[0], n[1], n[2], col, rough, emissive);
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

    addCylinderX(cx, cy, cz, halfLen, rStart, rMid, rEnd, col, rough = 0.65, emissive = 0.0, rxA = 0, ryA = 0, rzA = 0, segs = 12, endCol = null) {
      const rings = [
        { x: -halfLen, r: rStart, c: endCol || col },
        { x: -halfLen * 0.55, r: M.lerp(rStart, rMid, 0.7), c: col },
        { x: 0.0, r: rMid, c: col },
        { x:  halfLen * 0.55, r: M.lerp(rEnd, rMid, 0.7), c: col },
        { x:  halfLen, r: rEnd, c: endCol || col },
      ];
      const base = this.vCount;
      const stride = segs + 1;
      for (let ir = 0; ir < rings.length; ir++) {
        const rg = rings[ir];
        for (let is = 0; is <= segs; is++) {
          const a = (is / segs) * Math.PI * 2;
          const ca = Math.cos(a), sa = Math.sin(a);
          const p = this._rotVec(rg.x, ca * rg.r, sa * rg.r, rxA, ryA, rzA);
          const n = this._rotVec(0, ca, sa, rxA, ryA, rzA);
          this.pushVert(cx + p[0], cy + p[1], cz + p[2], n[0], n[1], n[2], rg.c, rough, emissive);
        }
      }
      for (let ir = 0; ir < rings.length - 1; ir++) {
        for (let is = 0; is < segs; is++) {
          const a = base + ir * stride + is;
          const b = a + stride;
          this.addQuad(a, b, b + 1, a + 1);
        }
      }
      // End caps
      for (const side of [-1, 1]) {
        const rg = side < 0 ? rings[0] : rings[rings.length - 1];
        const cp = this._rotVec(rg.x, 0, 0, rxA, ryA, rzA);
        const cn = this._rotVec(side, 0, 0, rxA, ryA, rzA);
        const cIdx = this.pushVert(cx + cp[0], cy + cp[1], cz + cp[2], cn[0], cn[1], cn[2], rg.c, rough, emissive);
        const ringBase = this.vCount;
        for (let is = 0; is <= segs; is++) {
          const a = (is / segs) * Math.PI * 2;
          const p = this._rotVec(rg.x, Math.cos(a) * rg.r, Math.sin(a) * rg.r, rxA, ryA, rzA);
          this.pushVert(cx + p[0], cy + p[1], cz + p[2], cn[0], cn[1], cn[2], rg.c, rough, emissive);
        }
        for (let is = 0; is < segs; is++) {
          if (side < 0) this.addTri(cIdx, ringBase + is + 1, ringBase + is);
          else this.addTri(cIdx, ringBase + is, ringBase + is + 1);
        }
      }
    }

    build() {
      return {
        vertices: new Float32Array(this.verts),
        indices: this.vCount > 65535 ? new Uint32Array(this.indices) : new Uint16Array(this.indices),
      };
    }
  }

  // --- 1) 妖丹 Mesh (一阶青翠灵丹 / 二阶流光灵丹) ---
  function buildYaodanMesh(isTier2) {
    const b = new DropMeshBuilder();
    const coreTop = isTier2 ? [0.68, 0.96, 1.0] : [0.52, 1.0, 0.78];
    const coreMid = isTier2 ? [0.24, 0.68, 0.98] : [0.20, 0.82, 0.56];
    const coreBot = isTier2 ? [0.16, 0.34, 0.78] : [0.10, 0.48, 0.34];
    const ringCol = isTier2 ? [1.0, 0.88, 0.46] : [0.84, 0.98, 0.72];

    const r = isTier2 ? 0.27 : 0.23;
    b.addEllipsoid(0, 0, 0, r, r, r, coreMid, 0.16, isTier2 ? 0.82 : 0.68, 18, 12, 0, 0, 0, coreTop, coreBot);
    b.addTorus(0, 0, 0, r + 0.08, 0.022, ringCol, 0.18, 0.92, 0.48, 0.0, 0.25, 24, 8);
    if (isTier2) {
      b.addTorus(0, 0, 0, r + 0.11, 0.018, [0.54, 0.90, 1.0], 0.18, 0.90, -0.52, 0.65, -0.35, 24, 8);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        b.addEllipsoid(Math.cos(a) * (r + 0.13), Math.sin(a * 2) * 0.08, Math.sin(a) * (r + 0.13), 0.042, 0.042, 0.042, [1.0, 0.95, 0.68], 0.15, 0.96, 8, 6);
      }
    }
    return b.build();
  }

  // --- 2) 妖骨 Mesh (一阶兽骨 / 二阶灵纹妖骨) ---
  function buildYaoguMesh(isTier2) {
    const b = new DropMeshBuilder();
    const boneMain = isTier2 ? [0.88, 0.95, 0.98] : [0.92, 0.87, 0.75];
    const boneEnd  = isTier2 ? [0.78, 0.88, 0.96] : [0.84, 0.76, 0.62];
    const halfLen = isTier2 ? 0.34 : 0.30;
    const tiltZ = 0.36;

    // Tapered central bone shaft
    b.addCylinderX(0, 0, 0, halfLen, 0.095, 0.068, 0.095, boneMain, 0.48, isTier2 ? 0.16 : 0.04, 0, 0, tiltZ, 12, boneEnd);
    // Classic dual rounded condyle knobs at both ends!
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const p = b._rotVec(sx * (halfLen + 0.03), sy * 0.072, (sx * sy) * 0.018, 0, 0, tiltZ);
        b.addEllipsoid(p[0], p[1], p[2], 0.092, 0.088, 0.086, boneEnd, 0.48, isTier2 ? 0.18 : 0.04, 10, 8, 0, 0, 0, boneMain, boneEnd);
      }
    }
    // Tier 2 spiritual ice-blue rune bands around the shaft
    if (isTier2) {
      const runeCol = [0.46, 0.88, 1.0];
      for (const ox of [-0.11, 0.11]) {
        const p = b._rotVec(ox, 0, 0, 0, 0, tiltZ);
        b.addTorus(p[0], p[1], p[2], 0.084, 0.018, runeCol, 0.22, 0.90, 0, 0, Math.PI * 0.5 + tiltZ, 16, 6);
      }
    }
    return b.build();
  }

  // --- 3) 妖皮 Mesh (一阶兽皮卷 / 二阶灵纹妖皮卷) ---
  function buildYaopiMesh(isTier2) {
    const b = new DropMeshBuilder();
    const furOut   = isTier2 ? [0.34, 0.46, 0.68] : [0.64, 0.44, 0.24];
    const furInner = isTier2 ? [0.74, 0.86, 0.98] : [0.84, 0.72, 0.52];
    const tieCol   = isTier2 ? [0.48, 0.90, 1.0]  : [0.34, 0.22, 0.12];
    const claspCol = isTier2 ? [1.0, 0.90, 0.50]  : [0.86, 0.72, 0.38];

    const halfLen = isTier2 ? 0.33 : 0.29;
    const rad = isTier2 ? 0.155 : 0.14;
    const tiltZ = -0.24;

    // Rolled hide cylinder
    b.addCylinderX(0, 0, 0, halfLen, rad, rad * 0.94, rad, furOut, 0.72, isTier2 ? 0.14 : 0.02, 0, 0, tiltZ, 14, furInner);
    // Flared fur flap edge tucked along bottom side of roll
    const flapP = b._rotVec(0, -rad * 0.75, rad * 0.55, 0, 0, tiltZ);
    b.addEllipsoid(flapP[0], flapP[1], flapP[2], halfLen * 0.92, 0.045, 0.095, furInner, 0.74, isTier2 ? 0.12 : 0.0, 10, 6, 0.35, 0, tiltZ);
    // Center leather/spirit binding cord + clasp stud
    const cordP = b._rotVec(0, 0, 0, 0, 0, tiltZ);
    b.addTorus(cordP[0], cordP[1], cordP[2], rad * 1.02, 0.024, tieCol, 0.30, isTier2 ? 0.85 : 0.08, 0, 0, Math.PI * 0.5 + tiltZ, 18, 8);
    const knotP = b._rotVec(0, rad * 1.05, 0.04, 0, 0, tiltZ);
    b.addEllipsoid(knotP[0], knotP[1], knotP[2], 0.055, 0.046, 0.046, claspCol, 0.24, isTier2 ? 0.88 : 0.24, 10, 8);
    if (isTier2) {
      // Subtle glowing trim cords near both ends of tier 2 pelt roll
      for (const ox of [-halfLen * 0.62, halfLen * 0.62]) {
        const tp = b._rotVec(ox, 0, 0, 0, 0, tiltZ);
        b.addTorus(tp[0], tp[1], tp[2], rad * 1.01, 0.014, [0.58, 0.92, 1.0], 0.24, 0.76, 0, 0, Math.PI * 0.5 + tiltZ, 16, 6);
      }
    }
    return b.build();
  }

  // =========================================================================
  // 3. MINECRAFT-STYLE GROUND DROP SYSTEM (原地掉落 + 弹跳旋转悬浮 + 靠近自动拾取)
  // =========================================================================
  class DropSystem {
    constructor() {
      this.meshes = {
        dan_1: buildYaodanMesh(false),
        dan_2: buildYaodanMesh(true),
        gu_1:  buildYaoguMesh(false),
        gu_2:  buildYaoguMesh(true),
        pi_1:  buildYaopiMesh(false),
        pi_2:  buildYaopiMesh(true),
      };
      this.drops = [];
      this.drawList = [];
      this.effects = [];
      this.maxDrops = 160;
      this.maxEffects = 72;
      this.onAddBagItem = null;
      this.monsterSystem = null;
      this._fullWarnCd = 0;
      this._pickupStackOffset = 0;
      this._pickupStackTimer = 0;
      this._uidSeq = 1;
    }

    _spawnEffect(opts) {
      if (this.effects.length >= this.maxEffects) this.effects.shift();
      this.effects.push({
        shape: opts.shape || 'ring',
        x: opts.x, y: opts.y, z: opts.z,
        vx: opts.vx || 0, vy: opts.vy || 0, vz: opts.vz || 0,
        sx0: opts.sx0 || 0.35, sy0: opts.sy0 || 1.0, sz0: opts.sz0 || 0.35,
        sx1: opts.sx1 || 1.25, sy1: opts.sy1 || 1.0, sz1: opts.sz1 || 1.25,
        age: 0,
        life: opts.life || 0.42,
        col: opts.col || [0.7, 1.0, 0.85],
        alpha: opts.alpha !== undefined ? opts.alpha : 0.60,
        modelMat: M.mat4(),
      });
    }

    _spawnSingleDrop(def, x, groundY, z, spreadAngle, spreadSpeed) {
      if (this.drops.length >= this.maxDrops) {
        this.drops.shift();
      }
      const startY = groundY + 0.95;
      this.drops.push({
        uid: this._uidSeq++,
        def,
        x,
        y: startY,
        z,
        vx: Math.cos(spreadAngle) * spreadSpeed,
        vy: 4.1 + Math.random() * 2.2,
        vz: Math.sin(spreadAngle) * spreadSpeed,
        groundY,
        grounded: false,
        rotY: Math.random() * Math.PI * 2,
        bobPhase: Math.random() * Math.PI * 2,
        age: 0,
        life: 180.0, // 3 minutes despawn timeout
        pickupDelay: 0.55, // Brief delay so player clearly sees items pop out like Minecraft
        magnetized: false,
        scale: def.tier === 2 ? 1.15 : 1.0,
        modelMat: M.mat4(),
        ringMat: M.mat4(),
      });
    }

    // Called immediately when any monster dies:
    // 妖丹固定 1 个；妖骨 0~4 个；妖皮 0~4 个；按妖兽境界分一阶/二阶
    spawnMonsterLoot(monster) {
      if (!monster || !monster.spec) return;
      const tier = monster.spec.realm === '筑基期' ? 2 : 1;
      const tierDefs = MONSTER_LOOT_DEFS[tier];
      const groundY = T.getMeshTerrainHeight(monster.x, monster.z);

      const danCount = 1; // 妖丹固定 1 个
      const guCount = Math.floor(Math.random() * 5); // 妖骨 0..4 个
      const piCount = Math.floor(Math.random() * 5); // 妖皮 0..4 个

      const itemsToDrop = [];
      for (let i = 0; i < danCount; i++) itemsToDrop.push(tierDefs.dan);
      for (let i = 0; i < guCount; i++)  itemsToDrop.push(tierDefs.gu);
      for (let i = 0; i < piCount; i++)  itemsToDrop.push(tierDefs.pi);

      const total = itemsToDrop.length;
      const baseAngle = Math.random() * Math.PI * 2;
      for (let i = 0; i < total; i++) {
        const ang = baseAngle + (i / Math.max(1, total)) * Math.PI * 2 + (Math.random() - 0.5) * 0.42;
        const spd = 1.65 + Math.random() * 2.1;
        this._spawnSingleDrop(itemsToDrop[i], monster.x, groundY, monster.z, ang, spd);
      }
    }

    update(dt, elapsed, playerPos, paused) {
      const cdt = Math.min(dt, 0.05);
      const px = playerPos[0], py = playerPos[1], pz = playerPos[2];
      this.drawList.length = 0;

      if (!paused) {
        if (this._fullWarnCd > 0) this._fullWarnCd = Math.max(0, this._fullWarnCd - cdt);
        if (this._pickupStackTimer > 0) {
          this._pickupStackTimer = Math.max(0, this._pickupStackTimer - cdt);
          if (this._pickupStackTimer <= 0) this._pickupStackOffset = 0;
        }
      }

      const magnetRange = 4.2;
      const collectRange = 1.08;

      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        if (!paused) {
          d.age += cdt;
          if (d.age >= d.life) {
            this.drops.splice(i, 1);
            continue;
          }
          d.rotY += 2.15 * cdt;

          const dxP = px - d.x;
          const dyP = (py + 1.05) - d.y;
          const dzP = pz - d.z;
          const horizDist = Math.hypot(dxP, dzP);
          const canPickup = d.age >= d.pickupDelay && Math.abs(py - d.y) < 4.5;

          if (canPickup && horizDist <= magnetRange) {
            d.magnetized = true;
            d.grounded = false;
            const dist3 = Math.hypot(dxP, dyP, dzP) || 0.001;
            const pullSpeed = M.lerp(13.5, 6.8, M.clamp(horizDist / magnetRange, 0, 1));
            d.x += (dxP / dist3) * Math.min(pullSpeed * cdt, dist3);
            d.y += (dyP / dist3) * Math.min(pullSpeed * cdt, dist3);
            d.z += (dzP / dist3) * Math.min(pullSpeed * cdt, dist3);

            if (dist3 <= collectRange) {
              const itemPayload = {
                id: d.def.id,
                name: d.def.name,
                icon: d.def.icon,
                tier: d.def.tier,
                lootKind: d.def.lootKind,
                slotType: d.def.slotType,
                desc: d.def.desc,
                count: 1,
              };
              const added = this.onAddBagItem ? this.onAddBagItem(itemPayload) : true;
              if (added) {
                this._spawnEffect({
                  shape: 'ring',
                  x: d.x, y: d.y, z: d.z,
                  sx0: 0.25, sy0: 1.0, sz0: 0.25,
                  sx1: 1.15, sy1: 1.0, sz1: 1.15,
                  life: 0.34,
                  col: d.def.tint,
                  alpha: 0.62,
                });
                if (this.monsterSystem) {
                  const yOff = 2.15 + (this._pickupStackOffset % 5) * 0.34;
                  this._pickupStackOffset++;
                  this._pickupStackTimer = 0.75;
                  this.monsterSystem.spawnFloatingText(px, py + yOff, pz, `拾取 +1 ${d.def.name}`, d.def.labelColor || '#ffeaa0');
                }
                this.drops.splice(i, 1);
                continue;
              } else {
                // Bag is full: gently release back to ground without losing the item!
                d.magnetized = false;
                d.vx = -dxP * 0.8;
                d.vz = -dzP * 0.8;
                d.vy = 2.6;
                if (this._fullWarnCd <= 0 && this.monsterSystem) {
                  this._fullWarnCd = 2.0;
                  this.monsterSystem.spawnFloatingText(px, py + 2.4, pz, '背包已满，无法拾取!', '#ff9888');
                }
              }
            }
          } else {
            d.magnetized = false;
            if (!d.grounded) {
              d.vy -= 14.5 * cdt;
              d.x += d.vx * cdt;
              d.y += d.vy * cdt;
              d.z += d.vz * cdt;
              const gY = T.getMeshTerrainHeight(d.x, d.z);
              d.groundY = gY;
              const restY = gY + 0.50;
              if (d.y <= restY) {
                d.y = restY;
                if (Math.abs(d.vy) > 1.8) {
                  d.vy = Math.abs(d.vy) * 0.34;
                  d.vx *= 0.52;
                  d.vz *= 0.52;
                } else {
                  d.vy = 0;
                  d.vx = 0;
                  d.vz = 0;
                  d.grounded = true;
                }
              }
            }
          }
        }

        // Visibility cull & Minecraft-style bobbing + spinning transform
        d.showRing = false;
        const dxCam = d.x - px, dzCam = d.z - pz;
        if (dxCam * dxCam + dzCam * dzCam > 240.0 * 240.0) continue;

        // Blink gently during final 10s before despawn
        const remain = d.life - d.age;
        if (remain < 10.0 && Math.floor(elapsed * 8.0) % 2 === 0) continue;

        const bob = d.grounded ? Math.sin(elapsed * 3.1 + d.bobPhase) * 0.13 : 0.0;
        const drawY = d.grounded ? (d.groundY + 0.54 + bob) : d.y;
        const glow = d.def.tier === 2
          ? (0.42 + Math.sin(elapsed * 3.8 + d.bobPhase) * 0.14)
          : (0.24 + Math.sin(elapsed * 3.0 + d.bobPhase) * 0.08);
        M.m4ComposeTRS(d.modelMat, d.x, drawY, d.z, 0, d.rotY, 0, d.scale, d.scale, d.scale);
        this.drawList.push({
          id: d.def.meshKey,
          modelMat: d.modelMat,
          tint: d.def.tint,
          glow,
        });

        // Subtle luminous ground marker ring when resting on terrain
        if (d.grounded) {
          const rScale = (d.def.tier === 2 ? 0.66 : 0.52) + Math.sin(elapsed * 3.2 + d.bobPhase) * 0.06;
          M.m4ComposeTRS(d.ringMat, d.x, d.groundY + 0.09, d.z, 0, elapsed * 1.4 + d.bobPhase, 0, rScale, 1.0, rScale);
          d.showRing = true;
        } else {
          d.showRing = false;
        }
      }

      // Tick pickup sparkle effects
      if (!paused) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
          const ef = this.effects[i];
          ef.age += cdt;
          if (ef.age >= ef.life) {
            this.effects.splice(i, 1);
            continue;
          }
          const u = ef.age / ef.life;
          const ease = 1.0 - (1.0 - u) * (1.0 - u);
          const sx = M.lerp(ef.sx0, ef.sx1, ease);
          const sy = M.lerp(ef.sy0, ef.sy1, ease);
          const sz = M.lerp(ef.sz0, ef.sz1, ease);
          M.m4ComposeTRS(ef.modelMat, ef.x, ef.y, ef.z, 0, u * 3.0, 0, sx, sy, sz);
        }
      }
    }

    // Crisp lightweight labels over nearby ground drops (< 20m) so players can spot them clearly
    renderLabels(ctx, cssW, cssH, dpr, vpMat, camPos) {
      if (!ctx || this.drops.length === 0) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '600 11px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cx = camPos[0], cy = camPos[1], cz = camPos[2];
      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        if (d.magnetized) continue;
        const dist = Math.hypot(d.x - cx, d.y - cy, d.z - cz);
        if (dist > 22.0) continue;

        const wx = d.x, wy = (d.grounded ? d.groundY + 1.15 : d.y + 0.65), wz = d.z;
        const clipX = vpMat[0] * wx + vpMat[4] * wy + vpMat[8]  * wz + vpMat[12];
        const clipY = vpMat[1] * wx + vpMat[5] * wy + vpMat[9]  * wz + vpMat[13];
        const clipW = vpMat[3] * wx + vpMat[7] * wy + vpMat[11] * wz + vpMat[15];
        if (clipW <= 0.2) continue;
        const ndcX = clipX / clipW, ndcY = clipY / clipW;
        if (ndcX < -1.04 || ndcX > 1.04 || ndcY < -1.04 || ndcY > 1.04) continue;

        const sx = (ndcX * 0.5 + 0.5) * cssW;
        const sy = (0.5 - ndcY * 0.5) * cssH;
        const alpha = 1.0 - M.smoothstep(14.0, 22.0, dist);
        if (alpha <= 0.04) continue;

        ctx.globalAlpha = alpha;
        const label = d.def.name;
        const tw = ctx.measureText(label).width;
        const bw = Math.ceil(tw + 12), bh = 18;
        const bx = Math.round(sx - bw * 0.5), by = Math.round(sy - bh * 0.5);

        ctx.fillStyle = d.def.tier === 2 ? 'rgba(14, 24, 42, 0.76)' : 'rgba(14, 26, 22, 0.74)';
        ctx.strokeStyle = d.def.tier === 2 ? 'rgba(116, 206, 255, 0.78)' : 'rgba(130, 232, 174, 0.68)';
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 9);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillText(label, sx, sy + 1);
        ctx.fillStyle = d.def.labelColor || '#ecfff4';
        ctx.fillText(label, sx, sy);
      }

      ctx.restore();
    }
  }

  XW.Drops = {
    MONSTER_LOOT_DEFS,
    createDropSystem: () => new DropSystem(),
  };
})(window);
