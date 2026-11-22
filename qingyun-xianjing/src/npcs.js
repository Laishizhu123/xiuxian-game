(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;

  // =========================================================================
  // 1. PURE-CODE RANDOM XIANXIA NAME GENERATOR (每个NPC均有随机修仙姓名)
  // =========================================================================
  const SURNAMES = [
    '林', '苏', '沈', '顾', '陆', '叶', '萧', '秦', '楚', '韩',
    '陈', '白', '谢', '温', '傅', '姜', '赵', '魏', '许', '周',
    '宋', '唐', '季', '颜', '洛', '宁', '柳', '方', '江', '程',
    '孟', '殷', '燕', '墨', '冷', '风', '岳', '霍', '裴', '齐',
    '慕容', '上官', '南宫', '欧阳',
  ];

  const GIVEN_COMPOUND = [
    '清玄', '墨尘', '青云', '子虚', '凌霄', '若霜', '明月', '流云',
    '长风', '惊鸿', '紫嫣', '慕白', '无痕', '景行', '玄机', '苍冥',
    '玉衡', '星河', '婉清', '秋水', '扶摇', '听雨', '问心', '惊蛰',
    '玄夜', '赤炎', '碧落', '沧溟', '竹青', '寒衣', '玄音', '道远',
    '归尘', '剑心', '青锋', '雪霁', '霜华', '灵韵', '子昂', '云舒',
    '知秋', '破军', '天枢', '摇光', '清微', '景明', '如晦', '初雪',
    '忘忧', '孤鸿', '承影', '含光', '太初', '无涯', '青莲', '紫薇',
    '暮雪', '朝露', '云起', '鹤归', '松寒', '竹影', '清漪', '明轩',
  ];

  const GIVEN_CHAR_A = [
    '清', '玄', '青', '云', '墨', '寒', '星', '月', '风', '霜',
    '玉', '灵', '沧', '赤', '碧', '景', '知', '归', '凌', '若',
    '子', '明', '长', '紫', '白', '孤', '听', '问', '初', '暮',
  ];

  const GIVEN_CHAR_B = [
    '尘', '风', '霜', '月', '河', '渊', '舟', '羽', '心', '音',
    '华', '影', '鸿', '衣', '遥', '微', '岚', '歌', '澜', '冥',
    '轩', '远', '阳', '露', '宁', '辞', '舒', '衡', '霁', '锋',
  ];

  function generateUniqueName(usedSet) {
    for (let tries = 0; tries < 60; tries++) {
      const sur = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
      let given;
      if (Math.random() < 0.58) {
        given = GIVEN_COMPOUND[Math.floor(Math.random() * GIVEN_COMPOUND.length)];
      } else if (Math.random() < 0.78) {
        const a = GIVEN_CHAR_A[Math.floor(Math.random() * GIVEN_CHAR_A.length)];
        const b = GIVEN_CHAR_B[Math.floor(Math.random() * GIVEN_CHAR_B.length)];
        given = a === b ? GIVEN_COMPOUND[Math.floor(Math.random() * GIVEN_COMPOUND.length)] : (a + b);
      } else {
        given = GIVEN_CHAR_B[Math.floor(Math.random() * GIVEN_CHAR_B.length)];
      }
      const full = sur + given;
      if (!usedSet || !usedSet.has(full)) {
        if (usedSet) usedSet.add(full);
        return full;
      }
    }
    return '林清风';
  }

  // =========================================================================
  // 2. REALM TERRITORY VALIDATORS (练气期区域 vs 筑基期区域 · 严格不越界)
  // =========================================================================
  const _tmpNrm = new Float32Array(3);

  function isInsideQingshiCity(x, z, margin = 22) {
    return Math.abs(x) < (130 + margin) && z > (-115 - margin) && z < (125 + margin);
  }

  function isValidPointForRealm(realm, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    if (Math.abs(x) > 8750 || Math.abs(z) > 8750) return false;
    if (isInsideQingshiCity(x, z, 22)) return false;

    T.getTerrainNormal(x, z, _tmpNrm);
    const ny = _tmpNrm[1];
    const y = T.getMeshTerrainHeight(x, z);

    if (realm === 'lianqi') {
      // Must NOT enter any 筑基期 region
      if (T.getSpiritForestMask(x, z) > 0.14) return false;
      if (T.getAncientRoadMask(x, z) > 0.14) return false;
      if (T.getSnowfieldMask(x, z) > 0.10) return false;
      if (T.getFrostMountainMask && T.getFrostMountainMask(x, z) > 0.10) return false;

      // 1) 低云平原
      if (T.getLowCloudPlainsMask(x, z) >= 0.34 && T.getSwampMask(x, z) < 0.14 && T.getDesertMask(x, z) < 0.12) {
        if (T.getRiverInfo(x, z).riverMask > 0.16) return false;
        return y > 10.0 && y < 54.0 && ny > 0.84;
      }
      // 2) 沉烟迷泽 (迷雾湿地)
      if (T.getSwampMask(x, z) >= 0.30 && T.getCloudMountainMask(x, z) < 0.14) {
        return y >= T.SWAMP_WATER_Y - 0.15 && y <= 16.5 && ny > 0.80;
      }
      // 3) 流沙荒漠
      if (T.getDesertMask(x, z) >= 0.32 && T.getLowCloudPlainsMask(x, z) < 0.18) {
        return y > 12.0 && y < 82.0 && ny > 0.80;
      }
      // 4) 云雾山 (6个宽阔云台 + 山顶)
      const cm = T.CLOUD_MOUNTAIN;
      if (cm && T.getCloudMountainMask(x, z) >= 0.25) {
        for (let i = 0; i < cm.terraces.length; i++) {
          const tc = cm.terraces[i];
          if (Math.hypot(x - tc.x, z - tc.z) <= tc.r * 0.82 && ny > 0.82) return true;
        }
        if (Math.hypot(x - cm.cx, z - cm.cz) <= cm.summitR * 0.78 && ny > 0.82) return true;
      }
      return false;
    }

    if (realm === 'zhuji') {
      // Must be in one of the 3 筑基期 regions
      // 1) 通天木林
      const sf = T.SPIRIT_FOREST;
      if (T.getSpiritForestMask(x, z) >= 0.30 && T.getSnowfieldMask(x, z) < 0.14 && T.getAncientRoadMask(x, z) < 0.20) {
        if (Math.hypot(x - sf.worldTreeX, z - sf.worldTreeZ) < 66) return false;
        return y > 36.0 && y < 98.0 && ny > 0.78;
      }
      // 2) 残阵古道
      if (T.getAncientRoadMask(x, z) >= 0.25 && T.getSpiritForestMask(x, z) < 0.22) {
        return y > 18.0 && y < 92.0 && ny > 0.78;
      }
      // 3) 冰霜雪原 (霜雪原)
      if (T.getSnowfieldMask(x, z) >= 0.30 && (!T.getFrostMountainMask || T.getFrostMountainMask(x, z) < 0.18)) {
        return y > 60.0 && y < 148.0 && ny > 0.82;
      }
      return false;
    }

    return false;
  }

  function sampleRandomPointInSubregion(subregion, minDistFromPos = null, minDist = 0) {
    const boxes = {
      lowcloud:  [-4100, -240,  480, 6400, 'lianqi'],
      swamp:     [  260, 3100, 1560, 3300, 'lianqi'],
      desert:    [-8400, -4300, 1800, 6600, 'lianqi'],
      cloudmtn:  null,
      forest:    [-5900, -1550, -3900,  220, 'zhuji'],
      ancient:   [-3980, -2520,  220, 1460, 'zhuji'],
      snowfield: [-7800,  3100, -8700, -4700, 'zhuji'],
    };

    if (subregion === 'cloudmtn') {
      const cm = T.CLOUD_MOUNTAIN;
      for (let t = 0; t < 80; t++) {
        const tc = cm.terraces[Math.floor(Math.random() * cm.terraces.length)];
        const a = Math.random() * Math.PI * 2;
        const r = 12 + Math.random() * (tc.r * 0.65);
        const x = tc.x + Math.cos(a) * r;
        const z = tc.z + Math.sin(a) * r;
        if (minDistFromPos && Math.hypot(x - minDistFromPos[0], z - minDistFromPos[2]) < minDist) continue;
        if (isValidPointForRealm('lianqi', x, z)) return [x, z];
      }
      const tc0 = cm.terraces[0];
      return [tc0.x + 20, tc0.z - 15];
    }

    const b = boxes[subregion];
    if (!b) return [T.LOW_CLOUD_PLAINS.spawnX + 120, T.LOW_CLOUD_PLAINS.spawnZ - 90];
    const [minX, maxX, minZ, maxZ, realm] = b;
    for (let t = 0; t < 450; t++) {
      const x = minX + Math.random() * (maxX - minX);
      const z = minZ + Math.random() * (maxZ - minZ);
      if (minDistFromPos && Math.hypot(x - minDistFromPos[0], z - minDistFromPos[2]) < minDist) continue;
      if (isValidPointForRealm(realm, x, z)) return [x, z];
    }
    // Curated fallbacks guaranteed inside each region
    if (subregion === 'lowcloud')  return [T.LOW_CLOUD_PLAINS.spawnX + 110, T.LOW_CLOUD_PLAINS.spawnZ - 85];
    if (subregion === 'swamp')     return [640, 2240];
    if (subregion === 'desert')    return [T.DESERT_DUNES.viewX - 80, T.DESERT_DUNES.viewZ + 90];
    if (subregion === 'forest')    return [T.SPIRIT_FOREST.viewX - 60, T.SPIRIT_FOREST.viewZ - 110];
    if (subregion === 'ancient')   return [-3040, 1040];
    return [T.FROST_SNOWFIELD.viewX - 70, T.FROST_SNOWFIELD.viewZ - 120];
  }

  function pickRandomPointForRealm(realm, minDistFromPos = null, minDist = 75) {
    const subs = realm === 'lianqi'
      ? ['lowcloud', 'lowcloud', 'swamp', 'cloudmtn', 'desert']
      : ['forest', 'forest', 'ancient', 'snowfield'];
    const sub = subs[Math.floor(Math.random() * subs.length)];
    return sampleRandomPointInSubregion(sub, minDistFromPos, minDist);
  }

  function pickFreeRoamTarget(npc) {
    // Free-roaming anywhere in valid territory for this NPC's realm (no fixed path!)
    for (let t = 0; t < 36; t++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 42 + Math.random() * 125;
      const nx = npc.x + Math.cos(ang) * dist;
      const nz = npc.z + Math.sin(ang) * dist;
      if (isValidPointForRealm(npc.realm, nx, nz)) {
        // Also sample midpoint to avoid walking across cliffs/water
        const mx = (npc.x + nx) * 0.5;
        const mz = (npc.z + nz) * 0.5;
        if (isValidPointForRealm(npc.realm, mx, mz)) {
          return [nx, nz];
        }
      }
    }
    // Shorter fallback step if near a region border
    for (let t = 0; t < 24; t++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 16 + Math.random() * 34;
      const nx = npc.x + Math.cos(ang) * dist;
      const nz = npc.z + Math.sin(ang) * dist;
      if (isValidPointForRealm(npc.realm, nx, nz)) return [nx, nz];
    }
    return [npc.x, npc.z];
  }

  // =========================================================================
  // 3. CITY NPC BLUEPRINTS (7 建筑掌柜/执事/长老 + 6 城周/主干道巡逻守卫)
  // =========================================================================
  const CITY_BUILDING_NPCS = [
    { role: '聚宝轩掌柜', realm: 'zhuji',  x:   0.0, z: -88.0, yaw:  Math.PI,       bCx:   0.0, bCz: -82.0, floorOff: 2.35 },
    { role: '藏经阁长老', realm: 'zhuji',  x: -52.0, z: -67.2, yaw:  Math.PI,       bCx: -52.0, bCz: -64.0, floorOff: 1.38 },
    { role: '执事堂执事', realm: 'zhuji',  x:  52.0, z: -70.5, yaw:  Math.PI,       bCx:  52.0, bCz: -64.0, floorOff: 2.28 },
    { role: '百草阁掌柜', realm: 'lianqi', x: -58.6, z:  24.0, yaw: -Math.PI * 0.5, bCx: -54.0, bCz:  24.0, floorOff: 0.46 },
    { role: '天工坊铁匠', realm: 'zhuji',  x:  57.8, z:  24.0, yaw:  Math.PI * 0.5, bCx:  54.0, bCz:  24.0, floorOff: 0.62 },
    { role: '万兽斋掌柜', realm: 'lianqi', x: -60.3, z:  68.0, yaw: -Math.PI * 0.5, bCx: -54.0, bCz:  68.0, floorOff: 0.46 },
    { role: '醉仙楼掌柜', realm: 'lianqi', x:  57.2, z:  68.0, yaw:  Math.PI * 0.5, bCx:  54.0, bCz:  68.0, floorOff: 0.52 },
  ];

  // 4 outer wall perimeter guards + 2 inner grand avenue guards patrolling around 青石仙城
  const OUTER_WALL_LOOP = [
    [-144,  139],
    [   0,  141],
    [ 144,  139],
    [ 145,    0],
    [ 144, -129],
    [   0, -131],
    [-144, -129],
    [-145,    0],
  ];

  const CITY_GUARD_PATROLS = [
    { role: '青石城守卫', realm: 'zhuji',  loop: OUTER_WALL_LOOP, startIdx: 1, dir:  1 }, // South Gate perimeter
    { role: '青石城守卫', realm: 'zhuji',  loop: OUTER_WALL_LOOP, startIdx: 3, dir:  1 }, // East Gate perimeter
    { role: '青石城守卫', realm: 'zhuji',  loop: OUTER_WALL_LOOP, startIdx: 5, dir:  1 }, // North Gate perimeter
    { role: '青石城守卫', realm: 'zhuji',  loop: OUTER_WALL_LOOP, startIdx: 7, dir:  1 }, // West Gate perimeter
    { role: '青石城巡卫', realm: 'lianqi', loop: [[-10, 118], [-10, 26], [10, 26], [10, 118]], startIdx: 0, dir: 1 }, // South Avenue
    { role: '青石城巡卫', realm: 'lianqi', loop: [[-108, 16], [-26, 16], [-26, -16], [26, -16], [108, -16], [108, 16], [26, 16]], startIdx: 0, dir: 1 }, // E-W Avenue
  ];

  // =========================================================================
  // 4. RANDOM LOADOUT BUILDER (同主角的服饰/功法武技普攻/法宝随机组合)
  // =========================================================================
  function pickRandomOutfitId() {
    const defs = XW.Outfits ? XW.Outfits.OUTFIT_DEFS : null;
    if (!defs || defs.length === 0) return 'outfit_metal';
    return defs[Math.floor(Math.random() * defs.length)].id;
  }

  function pickRandomElementSkills(realm) {
    const elems = XW.Skills ? XW.Skills.ELEMENTS : null;
    if (!elems || elems.length === 0) return { element: 'metal', elementObj: null, skills: [] };
    const el = elems[Math.floor(Math.random() * elems.length)];
    const basic = el.skills[0];
    if (realm === 'zhuji' && el.zhujiSkills && el.zhujiSkills.length >= 2) {
      return {
        element: el.key,
        elementObj: el,
        skills: [basic, el.zhujiSkills[0], el.zhujiSkills[1]],
      };
    }
    return {
      element: el.key,
      elementObj: el,
      skills: [basic, el.skills[1], el.skills[2]],
    };
  }

  function pickRandomTreasures(forceAtLeastOne = false) {
    const defs = XW.Treasures ? XW.Treasures.TREASURE_DEFS : null;
    if (!defs || defs.length === 0) return [];
    const r = Math.random();
    let count;
    if (forceAtLeastOne) {
      count = r < 0.55 ? 1 : 2;
    } else {
      // 0, 1, or 2 treasures (法宝不一定有，可能一个，可能两个)
      count = r < 0.34 ? 0 : (r < 0.74 ? 1 : 2);
    }
    if (count === 0) return [];
    const pool = defs.slice();
    const out = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(idx, 1)[0].id);
    }
    return out;
  }

  function createTreasureRuntime(id) {
    return {
      id,
      state: 'idle', // 'idle' | 'out' | 'return' | 'active' | 'rise' | 'slam' | 'hold'
      timer: 0,
      trailAcc: 0,
      tickAcc: 0,
      orbitAngle: Math.random() * Math.PI * 2,
      x: 0, y: 0, z: 0,
      tx: 0, ty: 0, tz: 0,
      rotX: 0, rotY: 0, rotZ: 0,
      scale: 1.0,
      glow: 0.08,
      hitDone: false,
      target: null,
      initialized: false,
      modelMat: M.mat4(),
      ringMat: M.mat4(),
      veilMat: M.mat4(),
      ringMatA: M.mat4(),
      ringMatB: M.mat4(),
    };
  }

  // Exact same worn-treasure body anchors as Protagonist (treasures.js _computeWearPose)
  function computeWearPose(id, x, y, z, charYaw, elapsed, walkPhase, moveBlend) {
    const cy = Math.cos(charYaw), sy = Math.sin(charYaw);
    const fwdX = -sy, fwdZ = -cy;
    const rightX = cy, rightZ = -sy;
    const faceYaw = Math.atan2(fwdX, fwdZ);
    const bob = Math.sin(walkPhase * 2.0) * 0.045 * moveBlend;

    if (id === 'qingfeng_needle') {
      return {
        x: x + rightX * 0.68 + fwdX * 0.06,
        y: y + 1.88 + Math.sin(elapsed * 2.8) * 0.08 + bob,
        z: z + rightZ * 0.68 + fwdZ * 0.06,
        rotX: 0.14, rotY: faceYaw, rotZ: 0.0, scale: 1.05,
      };
    }
    if (id === 'liehuo_gourd') {
      const swing = Math.sin(walkPhase) * 0.24 * moveBlend + Math.sin(elapsed * 1.8) * 0.04;
      return {
        x: x + rightX * 0.44 - fwdX * 0.04,
        y: y + 0.96 + bob,
        z: z + rightZ * 0.44 - fwdZ * 0.04,
        rotX: swing, rotY: faceYaw, rotZ: -0.16 - Math.abs(swing) * 0.2, scale: 0.96,
      };
    }
    if (id === 'zhenshan_seal') {
      return {
        x: x - rightX * 0.66 - fwdX * 0.34,
        y: y + 1.80 + Math.sin(elapsed * 2.1 + 1.2) * 0.07 + bob,
        z: z - rightZ * 0.66 - fwdZ * 0.34,
        rotX: 0.08, rotY: elapsed * 1.05, rotZ: 0.0, scale: 1.02,
      };
    }
    if (id === 'xuangui_shield') {
      return {
        x: x - fwdX * 0.44,
        y: y + 1.26 + Math.sin(elapsed * 2.4) * 0.05 + bob,
        z: z - fwdZ * 0.44,
        rotX: -0.10, rotY: faceYaw + Math.PI, rotZ: 0.24, scale: 1.06,
      };
    }
    if (id === 'jingang_bell') {
      const swing = -Math.sin(walkPhase) * 0.22 * moveBlend;
      const tremor = Math.sin(elapsed * 16.0) * 0.08 * moveBlend;
      return {
        x: x - rightX * 0.44 + fwdX * 0.02,
        y: y + 0.94 + bob,
        z: z - rightZ * 0.44 + fwdZ * 0.02,
        rotX: swing + tremor, rotY: faceYaw, rotZ: 0.14 + tremor * 0.8, scale: 0.95,
      };
    }
    // 流云帕
    const flutter = Math.sin(elapsed * 3.1) * 0.14 + Math.sin(walkPhase) * 0.18 * moveBlend;
    return {
      x: x - rightX * 0.50 - fwdX * 0.02,
      y: y + 1.44 + bob * 0.5,
      z: z - rightZ * 0.50 - fwdZ * 0.02,
      rotX: 0.12 + flutter * 0.7, rotY: faceYaw - Math.PI * 0.5, rotZ: 0.18 + flutter, scale: 1.0,
    };
  }

  // =========================================================================
  // 5. MASTER NPC SYSTEM (城内建筑NPC + 巡逻守卫 + 10练气野外 + 10筑基野外)
  // =========================================================================
  // NPC Cultivator Core Progression (与主角同一核心境界曲线，出场时四维联动 80%~110% 随机浮动!)
  const LIANQI_SUBREALMS = [
    { label: '练气一层', hp: 100, mp: 100, atk: 10, def:  5, expReward: 32 },
    { label: '练气二层', hp: 110, mp: 110, atk: 11, def:  6, expReward: 38 },
    { label: '练气三层', hp: 120, mp: 120, atk: 12, def:  6, expReward: 44 },
    { label: '练气四层', hp: 130, mp: 130, atk: 13, def:  7, expReward: 50 },
    { label: '练气五层', hp: 150, mp: 150, atk: 15, def:  8, expReward: 56 },
    { label: '练气六层', hp: 160, mp: 160, atk: 16, def:  8, expReward: 64 },
    { label: '练气七层', hp: 170, mp: 170, atk: 17, def:  9, expReward: 72 },
    { label: '练气八层', hp: 180, mp: 180, atk: 18, def:  9, expReward: 80 },
    { label: '练气九层', hp: 190, mp: 190, atk: 19, def: 10, expReward: 90 },
    { label: '练气十层', hp: 210, mp: 210, atk: 21, def: 11, expReward: 105 },
  ];

  const ZHUJI_SUBREALMS = [
    { label: '筑基前期', hp: 420, mp: 420, atk: 42, def: 22, expReward: 130 },
    { label: '筑基中期', hp: 504, mp: 504, atk: 50, def: 26, expReward: 170 },
    { label: '筑基后期', hp: 630, mp: 630, atk: 63, def: 33, expReward: 220 },
  ];

  function rollNpcSubRealm(realm, kind) {
    let base;
    if (realm === 'zhuji') {
      const idx = kind === 'guard' ? 1 : Math.floor(Math.random() * ZHUJI_SUBREALMS.length);
      base = ZHUJI_SUBREALMS[idx];
    } else {
      // Wild Qi-Refining cultivators span layers 1..10 (weighted slightly toward 1..7)
      const idx = kind === 'guard'
        ? (6 + Math.floor(Math.random() * 4))
        : Math.floor(Math.pow(Math.random(), 1.15) * LIANQI_SUBREALMS.length);
      base = LIANQI_SUBREALMS[Math.min(LIANQI_SUBREALMS.length - 1, idx)];
    }
    const varRoll = kind === 'guard' ? (0.95 + Math.random() * 0.15) : (0.80 + Math.random() * 0.30);
    return {
      label: base.label,
      varRoll,
      hp:  Math.max(20, Math.round(base.hp  * varRoll)),
      mp:  Math.max(20, Math.round(base.mp  * varRoll)),
      atk: Math.max(4,  Math.round(base.atk * varRoll)),
      def: Math.max(2,  Math.round(base.def * varRoll)),
      expReward: base.expReward,
    };
  }

  class NpcSystem {
    constructor(collisionWorld = null) {
      this.collisionWorld = collisionWorld;
      this.citySystem = null;
      this.onNpcDeath = null;
      this.playerDmgMul = 1.0;
      this.usedNames = new Set();
      this.npcs = [];
      this.nextId = 1;

      // Live combat & visual pools rendered via existing renderer VAOs!
      this.opaqueDrawList = []; // NPC worn/active opaque treasures (this.treasureVAOs)
      this.vfxDrawList = [];    // Persistent NPC shields, blades, auras, flame fans, wave walls, scarves (this.vfxVAOs)
      this.projectiles = [];    // Active NPC skill projectiles (this.vfxVAOs)
      this.effects = [];        // Transient NPC skill/treasure bursts & trails (this.vfxVAOs)
      this.zones = [];          // Persistent NPC ground zones (青藤绞杀 / 寒霜凝滞)
      this.waveWalls = [];      // Advancing NPC 惊涛拍岸 water walls
      this.flameFans = [];      // Active NPC 炎息燎原 flame curtains
      this.stagedSwords = [];   // Staged NPC 御剑穿心 hovering swords
      this.maxProjectiles = 56;
      this.maxEffects = 120;

      this._initAllNpcs();
    }

    _makeNpcBase(opts) {
      const realm = opts.realm || 'lianqi';
      const isZhuji = realm === 'zhuji';
      const loadout = pickRandomElementSkills(realm);
      const treasures = opts.treasures !== undefined ? opts.treasures : pickRandomTreasures(opts.kind === 'guard');
      const runtimes = {};
      for (const tid of treasures) runtimes[tid] = createTreasureRuntime(tid);

      const charInst = XW.Character ? XW.Character.createProtagonist() : null;
      const gY = opts.fixedY !== undefined
        ? opts.fixedY
        : T.getMeshTerrainHeight(opts.x, opts.z);

      const subR = rollNpcSubRealm(realm, opts.kind);
      const maxHp = opts.kind === 'shopkeeper' ? 320 : subR.hp;
      const maxMp = opts.kind === 'shopkeeper' ? 200 : subR.mp;

      const npc = {
        id: this.nextId++,
        kind: opts.kind,          // 'shopkeeper' | 'guard' | 'wild'
        role: opts.role || '',    // City NPC role title, empty for wild NPCs
        name: generateUniqueName(this.usedNames),
        realm,                    // 'lianqi' | 'zhuji'
        realmLabel: subR.label,   // '练气一层'..'练气十层' or '筑基前期'..'筑基后期'
        varRoll: subR.varRoll,
        expReward: subR.expReward,
        isDemonic: opts.kind === 'wild' ? (Math.random() < 0.5) : false, // 50% 魔道 / 50% 正道 (NEVER labeled!)
        provokedByPlayer: false,
        outfitId: pickRandomOutfitId(),
        element: loadout.element,
        elementObj: loadout.elementObj,
        skills: loadout.skills,   // [basic, skill1, skill2]
        treasures,                // 0, 1, or 2 treasure IDs
        treasureRuntimes: runtimes,
        char: charInst,

        // Spatial & movement state
        x: opts.x,
        y: gY,
        z: opts.z,
        fixedY: opts.fixedY !== undefined ? opts.fixedY : null,
        homeX: opts.x,
        homeZ: opts.z,
        homeYaw: opts.yaw !== undefined ? opts.yaw : (Math.random() * Math.PI * 2),
        yaw: opts.yaw !== undefined ? opts.yaw : (Math.random() * Math.PI * 2),
        vx: 0,
        vz: 0,
        hSpeed: 0,
        moveSpeed: isZhuji ? 8.3 : 7.3,
        colRadius: 0.72,
        colHeight: 2.25,
        visible: false,
        alive: true,
        respawnTimer: 0,

        // Patrol / Free-roam AI
        patrolLoop: opts.loop || null,
        patrolIdx: opts.startIdx || 0,
        patrolDir: opts.dir || 1,
        roamX: opts.x,
        roamZ: opts.z,
        idleTimer: 0.8 + Math.random() * 2.4,

        // Combat vitals & cooldowns (四维与主角一致的攻防体系!)
        hp: maxHp,
        maxHp,
        mp: maxMp,
        maxMp,
        atk: subR.atk,
        def: subR.def,
        cooldowns: {},
        globalCd: 0.4 + Math.random() * 0.8,
        castState: null, // { skill, phase, timer, duration, fired, target }
        dashState: null, // { dirX, dirZ, speed, timer, skillId, trailAcc }
        target: null,    // { type: 'player' | 'monster' | 'npc', ref }
        combatTimer: 0,
        strafeSign: Math.random() < 0.5 ? 1 : -1,
        strafeTimer: 2.0 + Math.random() * 2.5,

        // Status debuffs & buffs (identical to protagonist!)
        hitFlash: 0,
        staggerTimer: 0,
        stunTimer: 0,
        rootTimer: 0,
        slowTimer: 0,
        slowFactor: 1.0,
        knockVx: 0,
        knockVz: 0,
        buffs: {
          dodgeTimer: 0,
          speedTimer: 0,
          speedRatio: 1.0,
          regenTimer: 0,
          regenRate: 0,
          shieldHp: 0,
          shieldTimer: 0,
          shieldDr: 0.45,
          shieldKind: 'lianqi',
          shieldVfxAngle: 0,
          metalBladeTimer: 0,
          metalBladeAngle: 0,
          metalBladeDr: 0.35,
          metalBladeReflectDmg: 16,
          woodAuraTimer: 0,
          woodAuraRate: 0,
          woodAuraVfxAcc: 0,
          // Treasure buffs
          tShieldHp: 0,
          tShieldTimer: 0,
          tShieldDr: 0.35,
          bellDrTimer: 0,
          bellDr: 0.35,
          scarfTimer: 0,
          scarfSpeed: 1.30,
          scarfDodge: 0.30,
          scarfDr: 0.30,
        },
      };

      if (npc.char) {
        npc.char.update(0.016, 0, {
          x: npc.x, y: npc.y, z: npc.z, yaw: npc.yaw,
          horizontalSpeed: 0, flying: false, grounded: true, sprinting: false,
        });
      }
      return npc;
    }

    _initAllNpcs() {
      // 1. 7 City Building NPCs (掌柜/长老/执事/铁匠)
      for (const b of CITY_BUILDING_NPCS) {
        const bBaseY = T.getMeshTerrainHeight(b.bCx, b.bCz);
        this.npcs.push(this._makeNpcBase({
          kind: 'shopkeeper',
          role: b.role,
          realm: b.realm,
          x: b.x,
          z: b.z,
          yaw: b.yaw,
          fixedY: bBaseY + b.floorOff,
        }));
      }

      // 2. 6 City Patrolling Guard NPCs (城周巡逻 + 城内大道巡逻)
      for (const g of CITY_GUARD_PATROLS) {
        const pt = g.loop[g.startIdx];
        this.npcs.push(this._makeNpcBase({
          kind: 'guard',
          role: g.role,
          realm: g.realm,
          x: pt[0],
          z: pt[1],
          loop: g.loop,
          startIdx: (g.startIdx + 1) % g.loop.length,
          dir: g.dir,
        }));
      }

      // 3. 10 Qi-Refining Wild Cultivator NPCs (练气期野外10名: 低云平原4 + 沉烟迷泽2 + 云雾山2 + 流沙荒漠2)
      const spX = T.LOW_CLOUD_PLAINS.spawnX;
      const spZ = T.LOW_CLOUD_PLAINS.spawnZ;
      const lianqiPlans = [
        // 2 roaming within natural exploration range of Low Cloud Plains spawn (not right on top of spawn!)
        { fixed: [spX + 78, spZ - 62] },
        { fixed: [spX - 96, spZ - 74] },
        { sub: 'lowcloud' },
        { sub: 'lowcloud' },
        { sub: 'swamp' },
        { sub: 'swamp' },
        { sub: 'cloudmtn' },
        { sub: 'cloudmtn' },
        { sub: 'desert' },
        { sub: 'desert' },
      ];
      for (const p of lianqiPlans) {
        let x, z;
        if (p.fixed && isValidPointForRealm('lianqi', p.fixed[0], p.fixed[1])) {
          x = p.fixed[0]; z = p.fixed[1];
        } else {
          const pt = sampleRandomPointInSubregion(p.sub || 'lowcloud');
          x = pt[0]; z = pt[1];
        }
        const npc = this._makeNpcBase({ kind: 'wild', realm: 'lianqi', x, z });
        const rt = pickFreeRoamTarget(npc);
        npc.roamX = rt[0]; npc.roamZ = rt[1];
        this.npcs.push(npc);
      }

      // 4. 10 Foundation-Establishment Wild Cultivator NPCs (筑基期野外10名: 通天木林4 + 残阵古道3 + 冰霜雪原3)
      const zhujiPlans = [
        { fixed: [T.SPIRIT_FOREST.viewX - 52, T.SPIRIT_FOREST.viewZ - 95] },
        { sub: 'forest' },
        { sub: 'forest' },
        { sub: 'forest' },
        { fixed: [-2905, 1130] },
        { sub: 'ancient' },
        { sub: 'ancient' },
        { fixed: [T.FROST_SNOWFIELD.viewX + 64, T.FROST_SNOWFIELD.viewZ - 110] },
        { sub: 'snowfield' },
        { sub: 'snowfield' },
      ];
      for (const p of zhujiPlans) {
        let x, z;
        if (p.fixed && isValidPointForRealm('zhuji', p.fixed[0], p.fixed[1])) {
          x = p.fixed[0]; z = p.fixed[1];
        } else {
          const pt = sampleRandomPointInSubregion(p.sub || 'forest');
          x = pt[0]; z = pt[1];
        }
        const npc = this._makeNpcBase({ kind: 'wild', realm: 'zhuji', x, z });
        const rt = pickFreeRoamTarget(npc);
        npc.roamX = rt[0]; npc.roamZ = rt[1];
        this.npcs.push(npc);
      }
    }

    // Re-roll a brand-new randomly generated NPC upon death (死了就刷新一名新的随机生成的!)
    _respawnNpc(npc, playerPos) {
      this.usedNames.delete(npc.name);
      npc.name = generateUniqueName(this.usedNames);

      if (npc.kind === 'wild') {
        const pt = pickRandomPointForRealm(npc.realm, playerPos, 85);
        npc.x = pt[0];
        npc.z = pt[1];
        npc.y = T.getMeshTerrainHeight(npc.x, npc.z);
        npc.homeX = npc.x;
        npc.homeZ = npc.z;
        npc.isDemonic = Math.random() < 0.5;
        npc.outfitId = pickRandomOutfitId();
        const subR = rollNpcSubRealm(npc.realm, 'wild');
        npc.realmLabel = subR.label;
        npc.varRoll = subR.varRoll;
        npc.maxHp = subR.hp;
        npc.maxMp = subR.mp;
        npc.atk = subR.atk;
        npc.def = subR.def;
        npc.expReward = subR.expReward;
        const loadout = pickRandomElementSkills(npc.realm);
        npc.element = loadout.element;
        npc.elementObj = loadout.elementObj;
        npc.skills = loadout.skills;
        npc.treasures = pickRandomTreasures(false);
        npc.treasureRuntimes = {};
        for (const tid of npc.treasures) npc.treasureRuntimes[tid] = createTreasureRuntime(tid);
        const rt = pickFreeRoamTarget(npc);
        npc.roamX = rt[0]; npc.roamZ = rt[1];
      } else {
        npc.x = npc.homeX;
        npc.z = npc.homeZ;
        npc.y = npc.fixedY !== null ? npc.fixedY : T.getMeshTerrainHeight(npc.x, npc.z);
        npc.yaw = npc.homeYaw;
      }

      npc.alive = true;
      npc.hp = npc.maxHp;
      npc.mp = npc.maxMp;
      npc.provokedByPlayer = false;
      npc.target = null;
      npc.castState = null;
      npc.dashState = null;
      npc.cooldowns = {};
      npc.globalCd = 0.8;
      npc.hitFlash = 0;
      npc.staggerTimer = 0;
      npc.stunTimer = 0;
      npc.rootTimer = 0;
      npc.slowTimer = 0;
      npc.slowFactor = 1.0;
      npc.knockVx = 0;
      npc.knockVz = 0;
      const b = npc.buffs;
      b.dodgeTimer = 0; b.speedTimer = 0; b.speedRatio = 1.0;
      b.regenTimer = 0; b.shieldHp = 0; b.shieldTimer = 0;
      b.metalBladeTimer = 0; b.woodAuraTimer = 0;
      b.tShieldHp = 0; b.tShieldTimer = 0; b.bellDrTimer = 0; b.scarfTimer = 0;
    }

    // =========================================================================
    // 6. VFX & PROJECTILE HELPERS (复用现有 skills / treasures 的 VFX 网格)
    // =========================================================================
    _spawnEffect(opts) {
      if (this.effects.length >= this.maxEffects) this.effects.shift();
      this.effects.push({
        shape: opts.shape || 'orb',
        x: opts.x, y: opts.y, z: opts.z,
        vx: opts.vx || 0, vy: opts.vy || 0, vz: opts.vz || 0,
        gravity: opts.gravity || 0,
        rotX: opts.rotX || 0, rotY: opts.rotY || 0, rotZ: opts.rotZ || 0,
        spinX: opts.spinX || 0, spinY: opts.spinY || 0, spinZ: opts.spinZ || 0,
        sx0: opts.sx0 !== undefined ? opts.sx0 : (opts.s0 || 0.25),
        sy0: opts.sy0 !== undefined ? opts.sy0 : (opts.s0 || 0.25),
        sz0: opts.sz0 !== undefined ? opts.sz0 : (opts.s0 || 0.25),
        sx1: opts.sx1 !== undefined ? opts.sx1 : (opts.s1 || 0.8),
        sy1: opts.sy1 !== undefined ? opts.sy1 : (opts.s1 || 0.8),
        sz1: opts.sz1 !== undefined ? opts.sz1 : (opts.s1 || 0.8),
        growPop: !!opts.growPop,
        age: 0,
        life: opts.life || 0.45,
        col: opts.col || [1.0, 0.9, 0.5],
        alpha: opts.alpha !== undefined ? opts.alpha : 0.65,
        modelMat: M.mat4(),
      });
    }

    _spawnProjectile(opts) {
      if (this.projectiles.length >= this.maxProjectiles) this.projectiles.shift();
      this.projectiles.push({
        owner: opts.owner,
        targetType: opts.targetType || 'monster', // 'player' | 'monster' | 'npc'
        skill: opts.skill,
        shape: opts.shape || 'orb',
        x: opts.x, y: opts.y, z: opts.z,
        vx: opts.vx, vy: opts.vy, vz: opts.vz,
        rotX: opts.rotX || 0, rotY: opts.rotY || 0, rotZ: opts.rotZ || 0,
        spinX: opts.spinX || 0, spinY: opts.spinY || 0, spinZ: opts.spinZ || 0,
        scale: opts.scale || [0.3, 0.3, 0.3],
        col: opts.col || [1.0, 0.9, 0.5],
        alpha: opts.alpha !== undefined ? opts.alpha : 0.78,
        dmg: opts.dmg || 12,
        hitRadius: opts.hitRadius || 0.95,
        pierceLeft: opts.pierce || 1,
        hitIds: new Set(),
        trailKind: opts.trailKind || null,
        trailTimer: 0,
        age: 0,
        life: opts.life || 1.1,
        modelMat: M.mat4(),
      });
    }

    // =========================================================================
    // 7. DAMAGE, DEFENSE BUFFS, TREASURE TRIGGERS & TARGET QUERIES
    // =========================================================================
    isHostileToPlayer(npc) {
      if (!npc || !npc.alive || npc.kind === 'shopkeeper') return false;
      return npc.isDemonic || npc.provokedByPlayer;
    }

    // Find best wild NPC target for player auto-aim / treasures (prioritizes hostile/attacking NPCs)
    findTargetInRange(originPos, aimFwdX, aimFwdZ, maxRange, preferHostileOnly = false) {
      let best = null;
      let bestScore = Infinity;
      const px = originPos[0], pz = originPos[2];
      for (let i = 0; i < this.npcs.length; i++) {
        const n = this.npcs[i];
        if (!n.alive || !n.visible || n.kind === 'shopkeeper') continue;
        if (preferHostileOnly && !this.isHostileToPlayer(n)) continue;
        const dx = n.x - px, dz = n.z - pz;
        const d = Math.hypot(dx, dz);
        if (d > maxRange || d < 0.1) continue;
        if (aimFwdX !== null && aimFwdZ !== null) {
          const dot = (dx * aimFwdX + dz * aimFwdZ) / d;
          if (dot < 0.25 && d > 4.2) continue;
          const hostileBonus = this.isHostileToPlayer(n) ? 0.62 : 1.15;
          const score = d * (1.35 - dot * 0.55) * hostileBonus;
          if (score < bestScore) { bestScore = score; best = n; }
        } else {
          if (d < bestScore) { bestScore = d; best = n; }
        }
      }
      return best;
    }

    hitTestProjectile(pr, monsterSystem) {
      for (let i = 0; i < this.npcs.length; i++) {
        const n = this.npcs[i];
        if (!n.alive || !n.visible || n.kind === 'shopkeeper') continue;
        const key = 'npc_' + n.id;
        if (pr.hitIds && pr.hitIds.has(key)) continue;
        const rad = n.colRadius + (pr.hitRadius || 0.9);
        const dx = pr.x - n.x, dz = pr.z - n.z;
        if (dx * dx + dz * dz > rad * rad) continue;
        if (Math.abs(pr.y - (n.y + 1.15)) > 1.75) continue;
        if (pr.hitIds) pr.hitIds.add(key);
        const sk = pr.skill || {};
        const opts = { fromPlayer: true };
        if (sk.staggerSec) { opts.staggerSec = sk.staggerSec; opts.label = '硬直'; opts.color = '#ffe588'; }
        else if (sk.slowSec) { opts.slowSec = sk.slowSec; opts.slowRatio = sk.slowRatio || 0.70; opts.label = '缓速'; opts.color = '#80f09a'; }
        else if (sk.knockback) {
          const spd = Math.hypot(pr.vx || 0, pr.vz || 0) || 1.0;
          opts.knockX = ((pr.vx || 0) / spd) * sk.knockback;
          opts.knockZ = ((pr.vz || 0) / spd) * sk.knockback;
        }
        this.applyDamageToNpc(n, pr.dmg || 14, opts, monsterSystem);
        return n;
      }
      return null;
    }

    applyAreaDamage(cx, cz, radius, dmg, opts = {}, monsterSystem = null, coneFwdX = null, coneFwdZ = null, coneMinDot = 0.45) {
      let hits = 0;
      for (let i = 0; i < this.npcs.length; i++) {
        const n = this.npcs[i];
        if (!n.alive || !n.visible || n.kind === 'shopkeeper') continue;
        if (opts.onlyHostile && !this.isHostileToPlayer(n)) continue;
        const dx = n.x - cx, dz = n.z - cz;
        const d = Math.hypot(dx, dz);
        if (d > radius + n.colRadius) continue;
        if (coneFwdX !== null && coneFwdZ !== null && d > 2.0) {
          const dot = (dx * coneFwdX + dz * coneFwdZ) / (d || 1);
          if (dot < coneMinDot) continue;
        }
        const finalOpts = Object.assign({ fromPlayer: true }, opts);
        if (opts.knockback && d > 0.01) {
          finalOpts.knockX = (dx / d) * opts.knockback;
          finalOpts.knockZ = (dz / d) * opts.knockback;
        }
        this.applyDamageToNpc(n, dmg, finalOpts, monsterSystem);
        hits++;
      }
      return hits;
    }

    applyDamageToNpc(npc, rawDmg, opts = {}, monsterSystem = null) {
      if (!npc || !npc.alive) return false;
      if (npc.kind === 'shopkeeper') return false; // City shopkeepers are protected safe NPCs

      const b = npc.buffs;
      npc.combatTimer = 7.0;

      // Auto-trigger 金刚铃 on hit if equipped & off cooldown!
      if (npc.treasures.includes('jingang_bell') && (npc.cooldowns.t_jingang_bell || 0) <= 0.04) {
        this._triggerNpcTreasure(npc, 'jingang_bell', null, monsterSystem, null);
      }

      // Dodge check (疾金步 / 焰遁步 / 流云帕)
      if (b.dodgeTimer > 0 || (b.scarfTimer > 0 && Math.random() < b.scarfDodge)) {
        if (monsterSystem && npc.visible) {
          monsterSystem.spawnFloatingText(npc.x, npc.y + 2.55, npc.z, '闪避', '#c4f8ff');
        }
        return false;
      }

      // 全员暴击机制：默认 5% 暴击率，暴击造成额外 50% 伤害 (1.5×)；主角叠加符箓暴击率
      let effRawDmg = rawDmg;
      let isCrit = false;
      const baseCritRate = 0.05;
      const bonusRate = (opts.fromPlayer && !opts.attackerMonster && this.playerCritState)
        ? (this.playerCritState.rate || 0)
        : 0;
      const critMul = (opts.fromPlayer && !opts.attackerMonster && this.playerCritState)
        ? Math.max(1.5, this.playerCritState.mul || 1.5)
        : 1.5;
      if (Math.random() < (baseCritRate + bonusRate)) {
        isCrit = true;
        effRawDmg = rawDmg * critMul;
      }
      // 伤害公式：实际伤害 = max(1, 攻击原始伤害 - 目标防御)，再经过减伤与护盾吸收
      let dmg = Math.max(1, Math.round(effRawDmg) - (npc.def || 0));
      if (b.scarfTimer > 0) dmg = Math.max(1, Math.round(dmg * (1.0 - b.scarfDr)));
      if (b.bellDrTimer > 0) dmg = Math.max(1, Math.round(dmg * (1.0 - b.bellDr)));
      if (b.metalBladeTimer > 0) {
        dmg = Math.max(1, Math.round(dmg * (1.0 - b.metalBladeDr)));
        // Reflect golden sparks around NPC!
        this._spawnEffect({
          shape: 'ring', x: npc.x, y: npc.y + 1.15, z: npc.z,
          s0: 0.6, s1: 4.2, life: 0.36, col: [1.0, 0.90, 0.44], alpha: 0.66,
        });
        if (opts.attackerMonster && opts.attackerMonster.alive && monsterSystem) {
          monsterSystem.applyDamageToMonster(opts.attackerMonster, b.metalBladeReflectDmg, {
            attackerNpc: npc, label: '金罡反伤', color: '#ffe888',
          });
        }
      }

      // 玄龟小盾 absorption
      if (b.tShieldTimer > 0 && b.tShieldHp > 0) {
        const red = Math.max(1, Math.round(dmg * (1.0 - b.tShieldDr)));
        const abs = Math.min(b.tShieldHp, red);
        b.tShieldHp -= abs;
        dmg = Math.max(0, red - abs);
        if (b.tShieldHp <= 0) {
          b.tShieldHp = 0; b.tShieldTimer = 0;
          if (npc.treasureRuntimes.xuangui_shield) npc.treasureRuntimes.xuangui_shield.state = 'idle';
        }
      }

      // 岩甲诀 / 厚土重盾 absorption
      if (dmg > 0 && b.shieldTimer > 0 && b.shieldHp > 0) {
        const red = Math.max(1, Math.round(dmg * (1.0 - b.shieldDr)));
        const abs = Math.min(b.shieldHp, red);
        b.shieldHp -= abs;
        dmg = Math.max(0, red - abs);
        if (b.shieldHp <= 0) {
          b.shieldHp = 0; b.shieldTimer = 0;
        }
      }

      if (dmg <= 0) return false;

      npc.hp = Math.max(0, npc.hp - dmg);
      npc.hitFlash = 0.22;

      if (opts.fromPlayer && npc.kind !== 'shopkeeper') {
        npc.provokedByPlayer = true;
        npc.target = { type: 'player', ref: null };
        if (npc.kind === 'guard') {
          for (let gi = 0; gi < this.npcs.length; gi++) {
            const g2 = this.npcs[gi];
            if (g2.alive && g2.kind === 'guard' && Math.hypot(g2.x - npc.x, g2.z - npc.z) < 26.0) {
              g2.provokedByPlayer = true;
              g2.target = { type: 'player', ref: null };
            }
          }
        }
      } else if (opts.attackerMonster && opts.attackerMonster.alive) {
        if (!npc.target || npc.target.type !== 'player') {
          npc.target = { type: 'monster', ref: opts.attackerMonster };
        }
      }

      if (opts.staggerSec && opts.staggerSec > npc.staggerTimer) npc.staggerTimer = opts.staggerSec;
      if (opts.stunSec && opts.stunSec > npc.stunTimer) {
        npc.stunTimer = opts.stunSec;
        npc.castState = null;
      }
      if (opts.rootSec && opts.rootSec > npc.rootTimer) npc.rootTimer = opts.rootSec;
      if (opts.slowSec) {
        npc.slowTimer = Math.max(npc.slowTimer, opts.slowSec);
        npc.slowFactor = Math.min(npc.slowFactor, opts.slowRatio || 0.70);
      }
      if (opts.knockX || opts.knockZ) {
        const res = npc.realm === 'zhuji' ? 0.65 : 1.0;
        npc.knockVx += (opts.knockX || 0) * 2.4 * res;
        npc.knockVz += (opts.knockZ || 0) * 2.4 * res;
      }

      if (monsterSystem && npc.visible) {
        const baseLbl = opts.label ? `-${dmg} ${opts.label}` : `-${dmg}`;
        const lbl = isCrit ? `暴击 ${baseLbl}` : baseLbl;
        monsterSystem.spawnFloatingText(npc.x, npc.y + 2.65, npc.z, lbl, isCrit ? '#ff7c44' : (opts.color || '#ffe498'));
      }

      if (npc.hp <= 0) {
        npc.alive = false;
        npc.visible = false;
        npc.respawnTimer = npc.kind === 'wild' ? 5.0 : 12.0;
        npc.target = null;
        npc.castState = null;
        npc.dashState = null;
        this._spawnEffect({
          shape: 'ring', x: npc.x, y: npc.y + 0.35, z: npc.z,
          s0: 0.5, s1: 3.4, life: 0.62,
          col: npc.elementObj ? npc.elementObj.col : [0.85, 0.92, 1.0],
          alpha: 0.62,
        });
        if (monsterSystem) {
          monsterSystem.spawnFloatingText(npc.x, npc.y + 2.9, npc.z, `击败 ${npc.name}`, '#fff0b2');
        }
        if (opts.fromPlayer && this.onNpcDeath) {
          this.onNpcDeath(npc);
        }
      }
      return true;
    }

    // =========================================================================
    // 8. NPC SKILL & TREASURE EXECUTION (与主角同款全部技能与法宝!)
    // =========================================================================
    _getTargetPos(npc, playerPos) {
      if (!npc.target) return null;
      if (npc.target.type === 'player') {
        return [playerPos[0], playerPos[1], playerPos[2]];
      }
      if (npc.target.type === 'monster') {
        const m = npc.target.ref;
        if (!m || !m.alive) return null;
        return [m.x, m.y, m.z];
      }
      return null;
    }

    _calcNpcAtkDmg(npc, pct) {
      return Math.max(1, Math.round(((npc && npc.atk) || 10) * (pct || 1.0)));
    }

    _calcNpcHpAmt(npc, pct) {
      return Math.max(1, Math.round(((npc && npc.maxHp) || 100) * (pct || 0)));
    }

    _damageCurrentTargetsInRadius(npc, cx, cz, radius, rawAtkDmg, opts, playerPos, monsterSystem, onPlayerHit, coneFwdX = null, coneFwdZ = null, coneMinDot = 0.45) {
      const scaledDmg = Math.max(1, Math.round(rawAtkDmg));
      // Hit hostile player target if this NPC is hostile to player!
      if (this.isHostileToPlayer(npc) && playerPos && onPlayerHit) {
        const dx = playerPos[0] - cx, dz = playerPos[2] - cz;
        const d = Math.hypot(dx, dz);
        let inCone = true;
        if (coneFwdX !== null && coneFwdZ !== null && d > 2.0) {
          inCone = ((dx * coneFwdX + dz * coneFwdZ) / (d || 1)) >= coneMinDot;
        }
        if (d <= radius + 0.85 && Math.abs(playerPos[1] - npc.y) < 3.4 && inCone) {
          onPlayerHit(scaledDmg, opts.slowSec || 0, npc.name, opts.label || '法术');
        }
      }
      // Hit nearby monsters!
      if (monsterSystem) {
        const monsters = monsterSystem.monsters;
        for (let i = 0; i < monsters.length; i++) {
          const m = monsters[i];
          if (!m.alive) continue;
          const dx = m.x - cx, dz = m.z - cz;
          const d = Math.hypot(dx, dz);
          if (d > radius + (m.spec.colRadius || 1.1)) continue;
          if (coneFwdX !== null && coneFwdZ !== null && d > 2.0) {
            if (((dx * coneFwdX + dz * coneFwdZ) / (d || 1)) < coneMinDot) continue;
          }
          const mOpts = Object.assign({ attackerNpc: npc }, opts);
          if (opts.knockback && d > 0.01) {
            mOpts.knockX = (dx / d) * opts.knockback;
            mOpts.knockZ = (dz / d) * opts.knockback;
          }
          monsterSystem.applyDamageToMonster(m, scaledDmg, mOpts);
        }
      }
    }

    _executeNpcSkill(npc, skill, playerPos, monsterSystem, onPlayerHit) {
      const tPos = this._getTargetPos(npc, playerPos);
      const fwdX = -Math.sin(npc.yaw), fwdZ = -Math.cos(npc.yaw);
      let dirX = fwdX, dirZ = fwdZ;
      let tDist = 10.0;
      let tMidY = npc.y + 1.25;
      if (tPos) {
        const dx = tPos[0] - npc.x, dz = tPos[2] - npc.z;
        tDist = Math.hypot(dx, dz) || 1.0;
        dirX = dx / tDist; dirZ = dz / tDist;
        tMidY = tPos[1] + 1.15;
      }
      const faceYaw = Math.atan2(dirX, dirZ);
      const handX = npc.x + dirX * 0.72;
      const handY = npc.y + 1.28;
      const handZ = npc.z + dirZ * 0.72;
      const aimDy = tMidY - handY;
      const dist3 = Math.hypot(dirX * tDist, aimDy, dirZ * tDist) || 1.0;
      const tgtType = (npc.target && npc.target.type) ? npc.target.type : 'monster';
      const scaledDmg = skill.dmgPct > 0 ? this._calcNpcAtkDmg(npc, skill.dmgPct) : 0;

      const launchProj = (shape, scale, col, alpha, trailKind, extra = {}) => {
        const spd = skill.speed || 32.0;
        const vx = (dirX * tDist / dist3) * spd;
        const vy = M.clamp((aimDy / dist3) * spd, -11, 11);
        const vz = (dirZ * tDist / dist3) * spd;
        this._spawnProjectile(Object.assign({
          owner: npc,
          targetType: tgtType,
          skill,
          shape,
          x: handX, y: handY, z: handZ,
          vx, vy, vz,
          rotY: faceYaw,
          scale,
          col,
          alpha,
          dmg: scaledDmg,
          hitRadius: extra.hitRadius || 0.95,
          pierce: skill.pierce || 1,
          trailKind,
          life: (skill.range || 26) / spd,
        }, extra));
      };

      const id = skill.id;
      // --- 5 Basic Attacks ---
      if (id === 'metal_basic') {
        launchProj('cone', [0.22, 0.22, 0.74], [1.0, 0.90, 0.48], 0.82, 'metal_spark', { spinZ: 8.0 });
      } else if (id === 'metal_skill2') {
        launchProj('cone', [0.36, 0.36, 1.05], [1.0, 0.86, 0.38], 0.86, 'metal_heavy', { spinZ: 14.0, hitRadius: 1.15 });
      } else if (id === 'wood_basic') {
        launchProj('orb', [0.28, 0.28, 0.28], [0.46, 0.92, 0.52], 0.78, 'wood_leaf');
      } else if (id === 'water_basic') {
        launchProj('orb', [0.30, 0.28, 0.34], [0.46, 0.84, 1.0], 0.76, 'water_drop');
      } else if (id === 'fire_basic') {
        launchProj('orb', [0.32, 0.32, 0.32], [1.0, 0.48, 0.16], 0.84, 'fire_spark');
      } else if (id === 'earth_basic') {
        launchProj('rock', [0.42, 0.38, 0.42], [0.84, 0.66, 0.36], 0.82, 'earth_dust', { spinX: 6.5, spinY: 5.0 });
      } else if (id === 'fire_zhuji1') {
        // 烈焰爆弹 (High-explosive fireball!)
        launchProj('orb', [0.58, 0.58, 0.58], [1.0, 0.42, 0.12], 0.88, 'fire_zhuji_tail', { hitRadius: 1.25 });
      } else if (id === 'metal_zhuji1') {
        // 御剑穿心 (3 sequential golden flying swords!)
        const offsets = [[-0.85, 1.95, 0.15, 0.04], [0.0, 2.28, 0.0, 0.18], [0.85, 1.95, 0.15, 0.32]];
        for (const [rx, ry, rz, delay] of offsets) {
          this.stagedSwords.push({
            owner: npc, skill, targetType: tgtType,
            rx, ry, rz, delay,
            targetRef: npc.target ? npc.target.ref : null,
          });
        }
      } else if (id === 'metal_skill1' || id === 'water_skill1' || id === 'fire_skill1') {
        // Dash skills (疾金步 / 踏浪滑 / 焰遁步)
        const dashDir = tDist < 5.0 ? -1 : 1; // Retreat if too close, close in otherwise!
        const dx = (dirX * dashDir) + (Math.random() - 0.5) * 0.6;
        const dz = (dirZ * dashDir) + (Math.random() - 0.5) * 0.6;
        const dl = Math.hypot(dx, dz) || 1;
        npc.dashState = {
          dirX: dx / dl, dirZ: dz / dl,
          speed: (skill.dashDist || 7.5) / Math.max(0.15, skill.dashDur || 0.24),
          timer: skill.dashDur || 0.24,
          skillId: id,
          trailAcc: 0,
        };
        if (skill.dodgeSec) npc.buffs.dodgeTimer = Math.max(npc.buffs.dodgeTimer, skill.dodgeSec);
        if (skill.speedBuffSec) {
          npc.buffs.speedTimer = Math.max(npc.buffs.speedTimer, skill.speedBuffSec);
          npc.buffs.speedRatio = Math.max(npc.buffs.speedRatio, skill.speedBuffRatio || 1.32);
        }
      } else if (id === 'wood_skill1' || id === 'wood_zhuji1') {
        // 缠根缚 / 青藤绞杀
        const gx = tPos ? tPos[0] : (npc.x + dirX * 9.0);
        const gz = tPos ? tPos[2] : (npc.z + dirZ * 9.0);
        const gy = T.getMeshTerrainHeight(gx, gz);
        const r = skill.aoeRadius || 4.0;
        this._spawnEffect({
          shape: 'ring', x: gx, y: gy + 0.12, z: gz,
          sx0: 0.5, sy0: 1.0, sz0: 0.5, sx1: r, sy1: 1.0, sz1: r,
          life: id === 'wood_zhuji1' ? 1.1 : 0.65, col: [0.38, 0.90, 0.48], alpha: 0.62,
        });
        const vineCount = id === 'wood_zhuji1' ? 5 : 4;
        for (let k = 0; k < vineCount; k++) {
          const a = (k / vineCount) * Math.PI * 2 + Math.random() * 0.5;
          this._spawnEffect({
            shape: 'vine', x: gx + Math.cos(a) * (r * 0.42), y: gy, z: gz + Math.sin(a) * (r * 0.42),
            rotY: a, sx0: 0.4, sy0: 0.2, sz0: 0.4, sx1: 0.85, sy1: id === 'wood_zhuji1' ? 2.4 : 1.8, sz1: 0.85,
            growPop: true, life: id === 'wood_zhuji1' ? 2.6 : 1.4,
            col: k % 2 === 0 ? [0.24, 0.72, 0.34] : [0.46, 0.92, 0.48], alpha: 0.80,
          });
        }
        this._damageCurrentTargetsInRadius(npc, gx, gz, r, scaledDmg, {
          rootSec: skill.rootSec, slowSec: skill.slowSec || 2.0, slowRatio: skill.slowRatio || 0.60,
          label: id === 'wood_zhuji1' ? '青藤绞杀' : '缠根定身', color: '#78f294',
        }, playerPos, monsterSystem, onPlayerHit);
        if (id === 'wood_zhuji1') {
          this.zones.push({
            owner: npc, kind: 'wood_vine', skill, x: gx, y: gy, z: gz, radius: r,
            timer: skill.duration || 3.0, tickAcc: 0, vfxAcc: 0, modelMat: M.mat4(),
          });
        }
      } else if (id === 'wood_skill2' || id === 'wood_zhuji2') {
        // 回春诀 / 木灵聚气环 (与主角完全一致的气血百分比回血!)
        const healNow = this._calcNpcHpAmt(npc, skill.healInstantPct || (id === 'wood_zhuji2' ? 0.18 : 0.14));
        const healHot = this._calcNpcHpAmt(npc, skill.healOverTimePct || (id === 'wood_zhuji2' ? 0.22 : 0.14));
        npc.hp = Math.min(npc.maxHp, npc.hp + healNow);
        if (id === 'wood_zhuji2') {
          npc.buffs.woodAuraTimer = skill.duration || 5.0;
          npc.buffs.woodAuraRate = healHot / (skill.duration || 5.0);
          npc.buffs.speedTimer = Math.max(npc.buffs.speedTimer, skill.duration || 5.0);
          npc.buffs.speedRatio = Math.max(npc.buffs.speedRatio, skill.speedRatio || 1.20);
        } else {
          npc.buffs.regenTimer = skill.healDur || 3.0;
          npc.buffs.regenRate = healHot / (skill.healDur || 3.0);
        }
        if (monsterSystem && npc.visible) {
          monsterSystem.spawnFloatingText(npc.x, npc.y + 2.6, npc.z, `+${healNow}`, '#7cff9a');
        }
      } else if (id === 'metal_zhuji2') {
        // 金罡护体刃
        npc.buffs.metalBladeTimer = skill.duration || 7.0;
        npc.buffs.metalBladeDr = skill.damageReduce || 0.30;
        npc.buffs.metalBladeReflectDmg = this._calcNpcAtkDmg(npc, skill.dmgPct || 1.25);
      } else if (id === 'water_skill2') {
        // 涌泉击
        const gy = T.getMeshTerrainHeight(npc.x, npc.z);
        this._spawnEffect({
          shape: 'arc', x: npc.x + dirX * 1.4, y: gy + 0.45, z: npc.z + dirZ * 1.4,
          rotY: faceYaw, sx0: 1.2, sy0: 0.7, sz0: 1.0, sx1: 4.8, sy1: 1.2, sz1: 4.2,
          life: 0.42, col: [0.46, 0.84, 1.0], alpha: 0.64,
        });
        this._damageCurrentTargetsInRadius(npc, npc.x, npc.z, skill.range || 7.0, scaledDmg, {
          knockback: skill.knockback || 4.5, label: '涌泉击退', color: '#7ad8ff',
        }, playerPos, monsterSystem, onPlayerHit, dirX, dirZ, 0.45);
      } else if (id === 'water_zhuji1') {
        // 惊涛拍岸 (Advancing curved water wall!)
        this.waveWalls.push({
          owner: npc, skill,
          x: npc.x + dirX * 1.6, z: npc.z + dirZ * 1.6,
          dirX, dirZ, yaw: faceYaw,
          width: skill.waveWidth || 5.0,
          speed: 14.5, traveled: 0, maxDist: skill.range || 12.0,
          foamAcc: 0, hitIds: new Set(), modelMat: M.mat4(),
        });
      } else if (id === 'water_zhuji2') {
        // 寒霜凝滞 (Hex ice zone + spikes!)
        const gx = tPos ? tPos[0] : (npc.x + dirX * 9.0);
        const gz = tPos ? tPos[2] : (npc.z + dirZ * 9.0);
        const gy = T.getMeshTerrainHeight(gx, gz);
        const r = skill.aoeRadius || 4.8;
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + Math.random() * 0.6;
          this._spawnEffect({
            shape: 'spike', x: gx + Math.cos(a) * 1.6, y: gy, z: gz + Math.sin(a) * 1.6,
            rotY: a, sx0: 0.35, sy0: 0.15, sz0: 0.35, sx1: 0.62, sy1: 1.65, sz1: 0.62,
            growPop: true, life: skill.duration || 4.0, col: [0.72, 0.94, 1.0], alpha: 0.72,
          });
        }
        this._damageCurrentTargetsInRadius(npc, gx, gz, r, scaledDmg, {
          slowSec: skill.slowSec || 3.0, slowRatio: skill.slowRatio || 0.45,
          label: '寒霜凝滞', color: '#8ee6ff',
        }, playerPos, monsterSystem, onPlayerHit);
        this.zones.push({
          owner: npc, kind: 'water_frost', skill, x: gx, y: gy, z: gz, radius: r,
          timer: skill.duration || 4.0, tickAcc: 0, vfxAcc: 0, modelMat: M.mat4(),
        });
      } else if (id === 'fire_skill2') {
        // 爆炎诀
        const gx = tPos ? tPos[0] : (npc.x + dirX * 9.0);
        const gz = tPos ? tPos[2] : (npc.z + dirZ * 9.0);
        const gy = T.getMeshTerrainHeight(gx, gz);
        const r = skill.aoeRadius || 4.3;
        this._spawnEffect({
          shape: 'ring', x: gx, y: gy + 0.14, z: gz,
          sx0: 0.6, sy0: 1.0, sz0: 0.6, sx1: r, sy1: 1.0, sz1: r,
          life: 0.48, col: [1.0, 0.56, 0.16], alpha: 0.66,
        });
        this._spawnEffect({
          shape: 'orb', x: gx, y: gy + 0.85, z: gz,
          s0: 0.45, s1: r * 0.48, life: 0.38, col: [1.0, 0.42, 0.12], alpha: 0.66,
        });
        this._damageCurrentTargetsInRadius(npc, gx, gz, r, scaledDmg, {
          label: '爆炎', color: '#ff8a44',
        }, playerPos, monsterSystem, onPlayerHit);
      } else if (id === 'fire_zhuji2') {
        // 炎息燎原 (Persistent front flame fan!)
        this.flameFans.push({
          owner: npc, skill,
          timer: skill.duration || 2.4, tickAcc: 0.15, vfxAcc: 0,
          outerMat: M.mat4(), innerMat: M.mat4(),
        });
      } else if (id === 'earth_skill1' || id === 'earth_zhuji1') {
        // 岩甲诀 / 厚土重盾 (与主角完全一致的气血比例护盾!)
        npc.buffs.shieldHp = this._calcNpcHpAmt(npc, skill.shieldPct || (id === 'earth_zhuji1' ? 0.36 : 0.26));
        npc.buffs.shieldTimer = skill.shieldDur || 6.0;
        npc.buffs.shieldDr = skill.damageReduce || 0.30;
        npc.buffs.shieldKind = id === 'earth_zhuji1' ? 'zhuji' : 'lianqi';
      } else if (id === 'earth_skill2' || id === 'earth_zhuji2') {
        // 地刺震 / 震地碎岩
        const gy = T.getMeshTerrainHeight(npc.x, npc.z);
        const r = skill.aoeRadius || 5.4;
        const isZ = id === 'earth_zhuji2';
        this._spawnEffect({
          shape: 'ring', x: npc.x, y: gy + 0.14, z: npc.z,
          sx0: 0.7, sy0: 1.0, sz0: 0.7, sx1: r, sy1: 1.0, sz1: r,
          life: 0.56, col: [0.88, 0.72, 0.38], alpha: 0.68,
        });
        for (let k = 0; k < (isZ ? 8 : 6); k++) {
          const a = (k / (isZ ? 8 : 6)) * Math.PI * 2;
          const dr = r * 0.52;
          this._spawnEffect({
            shape: isZ ? 'rock' : 'spike',
            x: npc.x + Math.cos(a) * dr, y: gy, z: npc.z + Math.sin(a) * dr,
            rotY: a, sx0: 0.32, sy0: 0.15, sz0: 0.32,
            sx1: isZ ? 0.85 : 0.58, sy1: isZ ? 1.55 : 1.45, sz1: isZ ? 0.85 : 0.58,
            growPop: true, life: 0.72, col: [0.76, 0.62, 0.36], alpha: 0.82,
          });
        }
        this._damageCurrentTargetsInRadius(npc, npc.x, npc.z, r, scaledDmg, {
          knockback: skill.knockback || 3.8, stunSec: skill.stunSec || 1.2,
          label: isZ ? '碎岩·震晕' : '地刺·震晕', color: '#f0cf7a',
        }, playerPos, monsterSystem, onPlayerHit);
      }
    }

    _triggerNpcTreasure(npc, tid, playerPos, monsterSystem, onPlayerHit) {
      const def = XW.Treasures && XW.Treasures.TREASURE_MAP ? XW.Treasures.TREASURE_MAP[tid] : null;
      const rt = npc.treasureRuntimes[tid];
      if (!def || !rt || rt.state !== 'idle') return false;
      const cdKey = 't_' + tid;
      if ((npc.cooldowns[cdKey] || 0) > 0.04) return false;
      if (npc.mp < def.mpCost) return false;

      const tPos = this._getTargetPos(npc, playerPos);
      npc.mp = Math.max(0, npc.mp - def.mpCost);
      npc.cooldowns[cdKey] = def.cd;

      if (tid === 'qingfeng_needle') {
        if (!tPos) return false;
        rt.state = 'out';
        rt.timer = 0;
        rt.hitDone = false;
        rt.target = npc.target ? Object.assign({}, npc.target) : null;
        rt.tx = tPos[0]; rt.ty = tPos[1] + 1.15; rt.tz = tPos[2];
        return true;
      }
      if (tid === 'liehuo_gourd') {
        rt.state = 'active';
        rt.timer = def.duration || 2.0;
        rt.tickAcc = 0.18;
        rt.trailAcc = 0;
        return true;
      }
      if (tid === 'zhenshan_seal') {
        if (!tPos) return false;
        rt.state = 'rise';
        rt.timer = 0.38;
        rt.hitDone = false;
        rt.target = npc.target ? Object.assign({}, npc.target) : null;
        rt.tx = tPos[0]; rt.tz = tPos[2];
        rt.ty = T.getMeshTerrainHeight(rt.tx, rt.tz);
        return true;
      }
      if (tid === 'xuangui_shield') {
        rt.state = 'active';
        rt.timer = def.duration || 6.5;
        npc.buffs.tShieldHp = this._calcNpcHpAmt(npc, def.shieldPct || 0.34);
        npc.buffs.tShieldTimer = def.duration || 6.5;
        npc.buffs.tShieldDr = def.damageReduce || 0.30;
        return true;
      }
      if (tid === 'jingang_bell') {
        rt.state = 'active';
        rt.timer = 0.65;
        npc.buffs.bellDrTimer = def.duration || 4.0;
        npc.buffs.bellDr = def.damageReduce || 0.28;
        this._spawnEffect({
          shape: 'ring', x: npc.x, y: npc.y + 0.22, z: npc.z,
          sx0: 0.7, sy0: 1.0, sz0: 0.7, sx1: def.aoeRadius || 6.0, sy1: 1.0, sz1: def.aoeRadius || 6.0,
          spinY: 2.2, life: 0.56, col: [1.0, 0.90, 0.48], alpha: 0.64,
        });
        this._damageCurrentTargetsInRadius(npc, npc.x, npc.z, def.aoeRadius || 6.0, this._calcNpcAtkDmg(npc, def.dmgPct || 1.15), {
          knockback: def.knockback || 5.5, label: '金刚震退', color: '#ffe688',
        }, playerPos, monsterSystem, onPlayerHit);
        return true;
      }
      if (tid === 'liuyun_scarf') {
        rt.state = 'active';
        rt.timer = def.duration || 5.0;
        npc.buffs.scarfTimer = def.duration || 5.0;
        npc.buffs.scarfSpeed = def.speedRatio || 1.28;
        npc.buffs.scarfDodge = def.dodgeChance || 0.25;
        npc.buffs.scarfDr = def.damageReduce || 0.22;
        return true;
      }
      return false;
    }

    // =========================================================================
    // 9. PLAYER-VS-NPC PHYSICAL COLLISION
    // =========================================================================
    resolvePlayerCollision(playerEyePos, vel, eyeHeight, playerRadius) {
      const footY = playerEyePos[1] - eyeHeight;
      const headY = playerEyePos[1] + 0.45;
      const px = playerEyePos[0], pz = playerEyePos[2];
      let hit = false;

      for (let i = 0; i < this.npcs.length; i++) {
        const n = this.npcs[i];
        if (!n.alive || !n.visible) continue;
        if (headY <= n.y + 0.08 || footY >= n.y + n.colHeight - 0.08) continue;
        const sumR = playerRadius + n.colRadius;
        const dx = px - n.x, dz = pz - n.z;
        const dSq = dx * dx + dz * dz;
        if (dSq >= sumR * sumR) continue;

        const dist = Math.sqrt(dSq) || 0.001;
        const nx = dx / dist, nz = dz / dist;
        const pen = sumR - dist;
        if (n.kind === 'shopkeeper') {
          playerEyePos[0] += nx * pen;
          playerEyePos[2] += nz * pen;
        } else {
          playerEyePos[0] += nx * pen * 0.78;
          playerEyePos[2] += nz * pen * 0.78;
          n.x -= nx * pen * 0.22;
          n.z -= nz * pen * 0.22;
        }
        const vn = vel[0] * nx + vel[2] * nz;
        if (vn < 0) {
          vel[0] -= vn * nx;
          vel[2] -= vn * nz;
        }
        hit = true;
      }
      return hit;
    }

    // =========================================================================
    // 10. MAIN FRAME UPDATE (AI、自由游荡、NPC打妖兽、魔道袭杀主角、技能法宝动画)
    // =========================================================================
    update(dt, elapsed, playerPos, playerFlying, monsterSystem, paused, onPlayerHit) {
      const cdt = Math.min(dt, 0.05);
      const px = playerPos[0], py = playerPos[1], pz = playerPos[2];
      const hitPlayerCb = onPlayerHit || (() => {});
      const monsters = monsterSystem ? monsterSystem.monsters : [];

      this.opaqueDrawList.length = 0;
      this.vfxDrawList.length = 0;
      let nearestShop = null;
      let nearestShopDist = 7.8;

      // 1. Update all NPCs (city shopkeepers, city guards, 10 练气 wild, 10 筑基 wild)
      for (let i = 0; i < this.npcs.length; i++) {
        const n = this.npcs[i];
        if (n.alive && n.kind === 'shopkeeper') {
          const sd = Math.hypot(n.x - px, n.z - pz);
          if (sd < nearestShopDist && Math.abs(n.y - py) < 4.5) {
            nearestShopDist = sd;
            nearestShop = n;
          }
        }

        if (!n.alive) {
          n.visible = false;
          if (!paused) {
            n.respawnTimer -= cdt;
            if (n.respawnTimer <= 0) {
              this._respawnNpc(n, playerPos);
            }
          }
          continue;
        }

        const dxP = px - n.x, dzP = pz - n.z;
        const distP = Math.hypot(dxP, dzP);
        n.visible = distP < 420.0;

        // Active simulation window: pause far-away wild NPCs beyond 520m so out-of-range AI/VFX stay dormant
        const activeSim = !paused && (distP < (n.kind === 'wild' ? 520.0 : 360.0));
        if (activeSim) {
          // Tick cooldowns, statuses & buffs
          for (const k of Object.keys(n.cooldowns)) {
            if (n.cooldowns[k] > 0) n.cooldowns[k] = Math.max(0, n.cooldowns[k] - cdt);
          }
          if (n.globalCd > 0) n.globalCd = Math.max(0, n.globalCd - cdt);
          if (n.hitFlash > 0) n.hitFlash = Math.max(0, n.hitFlash - cdt);
          if (n.staggerTimer > 0) n.staggerTimer = Math.max(0, n.staggerTimer - cdt);
          if (n.stunTimer > 0) n.stunTimer = Math.max(0, n.stunTimer - cdt);
          if (n.rootTimer > 0) n.rootTimer = Math.max(0, n.rootTimer - cdt);
          if (n.slowTimer > 0) {
            n.slowTimer = Math.max(0, n.slowTimer - cdt);
            if (n.slowTimer <= 0) n.slowFactor = 1.0;
          }
          if (n.combatTimer > 0) {
            n.combatTimer = Math.max(0, n.combatTimer - cdt);
          } else {
            if (n.hp < n.maxHp) n.hp = Math.min(n.maxHp, n.hp + 5.0 * cdt);
            if (n.mp < n.maxMp) n.mp = Math.min(n.maxMp, n.mp + 7.5 * cdt);
          }
          if (n.mp < n.maxMp) n.mp = Math.min(n.maxMp, n.mp + 3.0 * cdt);

          const b = n.buffs;
          if (b.dodgeTimer > 0) b.dodgeTimer = Math.max(0, b.dodgeTimer - cdt);
          if (b.speedTimer > 0) {
            b.speedTimer = Math.max(0, b.speedTimer - cdt);
            if (b.speedTimer <= 0) b.speedRatio = 1.0;
          }
          if (b.regenTimer > 0) {
            b.regenTimer = Math.max(0, b.regenTimer - cdt);
            n.hp = Math.min(n.maxHp, n.hp + b.regenRate * cdt);
          }
          if (b.woodAuraTimer > 0) {
            b.woodAuraTimer = Math.max(0, b.woodAuraTimer - cdt);
            n.hp = Math.min(n.maxHp, n.hp + b.woodAuraRate * cdt);
          }
          if (b.shieldTimer > 0) {
            b.shieldTimer = Math.max(0, b.shieldTimer - cdt);
            b.shieldVfxAngle += cdt * (b.shieldKind === 'zhuji' ? 1.25 : 1.6);
            if (b.shieldTimer <= 0) b.shieldHp = 0;
          }
          if (b.metalBladeTimer > 0) {
            b.metalBladeTimer = Math.max(0, b.metalBladeTimer - cdt);
            b.metalBladeAngle += cdt * 2.1;
          }
          if (b.tShieldTimer > 0) {
            b.tShieldTimer = Math.max(0, b.tShieldTimer - cdt);
            if (b.tShieldTimer <= 0) {
              b.tShieldHp = 0;
              if (n.treasureRuntimes.xuangui_shield) n.treasureRuntimes.xuangui_shield.state = 'idle';
            }
          }
          if (b.bellDrTimer > 0) b.bellDrTimer = Math.max(0, b.bellDrTimer - cdt);
          if (b.scarfTimer > 0) {
            b.scarfTimer = Math.max(0, b.scarfTimer - cdt);
            if (b.scarfTimer <= 0 && n.treasureRuntimes.liuyun_scarf) n.treasureRuntimes.liuyun_scarf.state = 'idle';
          }

          // Smooth knockback decay
          if (Math.abs(n.knockVx) > 0.05 || Math.abs(n.knockVz) > 0.05) {
            const nx = n.x + n.knockVx * cdt;
            const nz = n.z + n.knockVz * cdt;
            if (n.kind !== 'wild' || isValidPointForRealm(n.realm, nx, nz)) {
              n.x = nx; n.z = nz;
            }
            const kd = Math.exp(-7.5 * cdt);
            n.knockVx *= kd; n.knockVz *= kd;
          }

          const prevX = n.x, prevZ = n.z;
          const isStunned = n.stunTimer > 0 || n.staggerTimer > 0;
          const isRooted = n.rootTimer > 0;
          const speedMul = isRooted ? 0 : (n.slowTimer > 0 ? n.slowFactor : 1.0) * b.speedRatio * (b.scarfTimer > 0 ? b.scarfSpeed : 1.0);

          // ---- A. CITY SHOPKEEPERS (Stand warmly in their shops, gently turn toward nearby visitors) ----
          if (n.kind === 'shopkeeper') {
            let wantYaw = n.homeYaw;
            if (distP < 9.5 && Math.abs(py - n.y) < 3.0) {
              wantYaw = Math.atan2(-dxP, -dzP);
            }
            let dy = ((wantYaw - n.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
            if (dy < -Math.PI) dy += Math.PI * 2;
            n.yaw += dy * (1 - Math.exp(-5.0 * cdt));
          } else {
            // ---- B. TARGET ACQUISITION (Demonic NPC ambushes Player + NPC vs Monster Combat!) ----
            const aggroPlayerR = n.realm === 'zhuji' ? 26.0 : 22.0;
            const leashPlayerR = aggroPlayerR * 2.15;
            const playerReachable = !playerFlying || (py - n.y) < 14.0;

            // Validate existing target
            if (n.target) {
              if (n.target.type === 'player') {
                if (distP > leashPlayerR || !playerReachable || !this.isHostileToPlayer(n)) {
                  n.target = null;
                  if (n.kind === 'guard') n.provokedByPlayer = false;
                }
              } else if (n.target.type === 'monster') {
                const tm = n.target.ref;
                if (!tm || !tm.alive || Math.hypot(tm.x - n.x, tm.z - n.z) > 46.0) {
                  n.target = null;
                }
              }
            }

            // Demonic wild NPCs OR provoked guards/cultivators engage player!
            if (n.kind !== 'shopkeeper' && this.isHostileToPlayer(n) && distP < (n.provokedByPlayer ? leashPlayerR : aggroPlayerR) && playerReachable) {
              n.target = { type: 'player', ref: null };
            }

            // Look for nearby monsters to battle (wild NPCs & city guards)!
            if (!n.target && distP < 260.0) {
              let bestM = null, bestMD = n.kind === 'guard' ? 32.0 : 30.0;
              for (let mIdx = 0; mIdx < monsters.length; mIdx++) {
                const m = monsters[mIdx];
                if (!m.alive) continue;
                const d = Math.hypot(m.x - n.x, m.z - n.z);
                if (d < bestMD) {
                  bestMD = d;
                  bestM = m;
                }
              }
              if (bestM) {
                n.target = { type: 'monster', ref: bestM };
              }
            }

            // ---- C. EXECUTE ACTIVE DASH OR CAST STATE ----
            if (n.dashState) {
              const ds = n.dashState;
              ds.timer -= cdt;
              if (!isRooted) {
                const nx = n.x + ds.dirX * ds.speed * cdt;
                const nz = n.z + ds.dirZ * ds.speed * cdt;
                if (n.kind !== 'wild' || isValidPointForRealm(n.realm, nx, nz)) {
                  n.x = nx; n.z = nz;
                }
              }
              ds.trailAcc += cdt;
              if (ds.trailAcc >= 0.06 && n.visible) {
                ds.trailAcc = 0;
                const tCol = ds.skillId === 'fire_skill1' ? [1.0, 0.56, 0.18]
                  : (ds.skillId === 'water_skill1' ? [0.56, 0.88, 1.0] : [1.0, 0.90, 0.50]);
                this._spawnEffect({
                  shape: ds.skillId === 'water_skill1' ? 'ring' : 'orb',
                  x: n.x, y: n.y + (ds.skillId === 'water_skill1' ? 0.12 : 0.75), z: n.z,
                  s0: 0.20, s1: ds.skillId === 'water_skill1' ? 1.4 : 0.05,
                  life: 0.30, col: tCol, alpha: 0.58,
                });
              }
              if (ds.timer <= 0) n.dashState = null;
            }

            if (n.castState) {
              const cs = n.castState;
              cs.timer -= cdt;
              if (cs.phase === 'windup' && cs.timer <= 0) {
                if (!cs.fired) {
                  cs.fired = true;
                  this._executeNpcSkill(n, cs.skill, playerPos, monsterSystem, hitPlayerCb);
                }
                cs.phase = 'recovery';
                cs.duration = cs.skill.recovery || 0.16;
                cs.timer = cs.duration;
              } else if (cs.phase === 'recovery' && cs.timer <= 0) {
                n.castState = null;
              }
            }

            // ---- D. COMBAT AI vs PATROL / FREE-ROAM MOVEMENT ----
            const tPos = this._getTargetPos(n, playerPos);
            if (!isStunned && tPos) {
              n.combatTimer = 6.0;
              const dx = tPos[0] - n.x, dz = tPos[2] - n.z;
              const distT = Math.hypot(dx, dz) || 0.001;
              const wantYaw = Math.atan2(-dx, -dz);
              let dy = ((wantYaw - n.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
              if (dy < -Math.PI) dy += Math.PI * 2;
              n.yaw += dy * (1 - Math.exp(-10.0 * cdt));

              // Combat kiting / closing movement (stays inside realm boundaries!)
              n.strafeTimer -= cdt;
              if (n.strafeTimer <= 0) {
                n.strafeSign *= -1;
                n.strafeTimer = 1.8 + Math.random() * 2.4;
              }
              if (!n.dashState && speedMul > 0.01) {
                const castSlow = n.castState ? 0.40 : 1.0;
                const spd = n.moveSpeed * speedMul * castSlow;
                let mx = 0, mz = 0;
                const ux = dx / distT, uz = dz / distT;
                const pxPerp = -uz * n.strafeSign, pzPerp = ux * n.strafeSign;
                if (distT > 15.0) {
                  mx = ux; mz = uz;
                } else if (distT < 5.5) {
                  mx = -ux * 0.65 + pxPerp * 0.75;
                  mz = -uz * 0.65 + pzPerp * 0.75;
                } else {
                  mx = pxPerp * 0.85 + ux * 0.20;
                  mz = pzPerp * 0.85 + uz * 0.20;
                }
                const ml = Math.hypot(mx, mz) || 1;
                const candX = n.x + (mx / ml) * spd * cdt;
                const candZ = n.z + (mz / ml) * spd * cdt;
                if (n.kind !== 'wild' || isValidPointForRealm(n.realm, candX, candZ)) {
                  n.x = candX; n.z = candZ;
                }
              }

              // Decide skills & treasures when ready!
              if (!n.castState && n.globalCd <= 0) {
                // 1) Consider triggering one of the NPC's 0..2 treasures!
                let acted = false;
                if (n.treasures.length > 0 && Math.random() < 0.34) {
                  const tid = n.treasures[Math.floor(Math.random() * n.treasures.length)];
                  const tDef = XW.Treasures && XW.Treasures.TREASURE_MAP[tid];
                  if (tDef) {
                    const inRange = tDef.category === 'defense'
                      ? (n.hp < n.maxHp * 0.88 || distT < 14.0)
                      : (distT <= (tDef.range || 20.0));
                    if (inRange && this._triggerNpcTreasure(n, tid, playerPos, monsterSystem, hitPlayerCb)) {
                      n.globalCd = 0.75;
                      acted = true;
                    }
                  }
                }

                // 2) Otherwise cast one of the NPC's element skills (skill2 / skill1 / basic)!
                if (!acted && n.skills.length >= 3) {
                  const skBasic = n.skills[0];
                  const sk1 = n.skills[1];
                  const sk2 = n.skills[2];
                  let chosen = null;

                  const canUse = (sk) => sk && (n.cooldowns[sk.id] || 0) <= 0.04 && n.mp >= (sk.mpCost || 0);
                  const needHeal = n.hp < n.maxHp * 0.68;

                  // Prefer heal/shield when wounded
                  if (needHeal && (sk2.healInstantPct || sk2.shieldPct) && canUse(sk2)) {
                    chosen = sk2;
                  } else if (needHeal && (sk1.healInstantPct || sk1.shieldPct) && canUse(sk1)) {
                    chosen = sk1;
                  } else if (canUse(sk2) && distT <= (sk2.range || sk2.aoeRadius || 16.0) + 1.5 && Math.random() < 0.55) {
                    chosen = sk2;
                  } else if (canUse(sk1) && distT <= (sk1.range || sk1.aoeRadius || 18.0) + 1.5 && Math.random() < 0.50) {
                    chosen = sk1;
                  } else if (canUse(skBasic) && distT <= (skBasic.range || 25.0)) {
                    chosen = skBasic;
                  }

                  if (chosen) {
                    n.mp = Math.max(0, n.mp - (chosen.mpCost || 0));
                    n.cooldowns[chosen.id] = chosen.cd;
                    n.globalCd = chosen.slot === 'basic' ? (0.85 + Math.random() * 0.45) : 0.75;
                    n.castState = {
                      skill: chosen,
                      phase: 'windup',
                      duration: chosen.windup || 0.12,
                      timer: chosen.windup || 0.12,
                      fired: false,
                    };
                  }
                }
              }
            } else if (!isStunned && !n.dashState && speedMul > 0.01) {
              // ---- E. PEACEFUL PATROL (Guards) OR FREE ROAMING (Wild NPCs) ----
              if (n.kind === 'guard' && n.patrolLoop) {
                const wp = n.patrolLoop[n.patrolIdx];
                const pdx = wp[0] - n.x, pdz = wp[1] - n.z;
                const pd = Math.hypot(pdx, pdz);
                if (pd < 2.4) {
                  n.patrolIdx = (n.patrolIdx + n.patrolDir + n.patrolLoop.length) % n.patrolLoop.length;
                } else {
                  const spd = n.moveSpeed * 0.52 * speedMul;
                  n.x += (pdx / pd) * spd * cdt;
                  n.z += (pdz / pd) * spd * cdt;
                  const wantYaw = Math.atan2(-pdx, -pdz);
                  let dy = ((wantYaw - n.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
                  if (dy < -Math.PI) dy += Math.PI * 2;
                  n.yaw += dy * (1 - Math.exp(-6.0 * cdt));
                }
              } else if (n.kind === 'wild') {
                // Free-roaming anywhere inside realm's map regions (no fixed path!)
                if (n.idleTimer > 0) {
                  n.idleTimer -= cdt;
                } else {
                  const rdx = n.roamX - n.x, rdz = n.roamZ - n.z;
                  const rd = Math.hypot(rdx, rdz);
                  if (rd < 3.2) {
                    const nextPt = pickFreeRoamTarget(n);
                    n.roamX = nextPt[0]; n.roamZ = nextPt[1];
                    n.idleTimer = 1.6 + Math.random() * 3.4;
                  } else {
                    const spd = n.moveSpeed * 0.58 * speedMul;
                    const nx = n.x + (rdx / rd) * spd * cdt;
                    const nz = n.z + (rdz / rd) * spd * cdt;
                    if (isValidPointForRealm(n.realm, nx, nz)) {
                      n.x = nx; n.z = nz;
                      const wantYaw = Math.atan2(-rdx, -rdz);
                      let dy = ((wantYaw - n.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
                      if (dy < -Math.PI) dy += Math.PI * 2;
                      n.yaw += dy * (1 - Math.exp(-5.5 * cdt));
                    } else {
                      // Hit a realm border or steep slope -> smoothly pick a fresh valid free-roam destination!
                      const nextPt = pickFreeRoamTarget(n);
                      n.roamX = nextPt[0]; n.roamZ = nextPt[1];
                    }
                  }
                }
              }
            }

            // World entity collision & terrain snap
            if (this.collisionWorld && n.visible) {
              this.collisionWorld.resolveEntityXZ(n, n.colRadius, n.colHeight);
            }
          }

          // Snap Y cleanly onto walkable floor / terrain
          if (n.fixedY !== null) {
            n.y = n.fixedY;
          } else {
            n.y = T.getMeshTerrainHeight(n.x, n.z);
          }

          n.hSpeed = cdt > 0.0001 ? Math.hypot(n.x - prevX, n.z - prevZ) / cdt : 0;
        }

        // Update 20-bone skinned protagonist animation + worn/active treasures + persistent buffs ONLY when visible!
        if (n.visible && n.char) {
          let castAnim = null;
          if (n.castState) {
            const cs = n.castState;
            castAnim = {
              active: true,
              kind: cs.skill.castAnim || 'cast_push',
              phase: cs.phase,
              progress: 1.0 - M.clamp(cs.timer / Math.max(0.01, cs.duration), 0, 1),
            };
          }
          n.char.update(paused ? 0.001 : cdt, elapsed, {
            x: n.x, y: n.y, z: n.z,
            yaw: n.yaw,
            horizontalSpeed: paused ? 0 : n.hSpeed,
            flying: false,
            grounded: true,
            sprinting: n.hSpeed > 8.0,
            castAnim,
          });

          // Update worn & active treasures for this NPC!
          this._updateNpcTreasures(n, cdt, elapsed, playerPos, monsterSystem, paused, hitPlayerCb);

          // Push persistent skill buff visuals (岩甲/厚土重盾, 金罡护体刃, 木灵聚气环)
          this._pushNpcBuffVfx(n, elapsed);
        }
      }
      this.nearestShopNpc = nearestShop;

      if (paused) return;

      // 2. Update NPC staged 御剑穿心 flying swords
      for (let i = this.stagedSwords.length - 1; i >= 0; i--) {
        const sw = this.stagedSwords[i];
        const o = sw.owner;
        if (!o || !o.alive) { this.stagedSwords.splice(i, 1); continue; }
        sw.delay -= cdt;
        const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw);
        const rX = cy, rZ = -sy, fX = -sy, fZ = -cy;
        const sx = o.x + rX * sw.rx + fX * sw.rz;
        const syPos = o.y + sw.ry;
        const sz = o.z + rZ * sw.rx + fZ * sw.rz;
        const faceYaw = Math.atan2(fX, fZ);
        if (sw.delay <= 0) {
          const tPos = this._getTargetPos(o, playerPos);
          let vx = fX * sw.skill.speed, vy = 0, vz = fZ * sw.skill.speed, yaw = faceYaw;
          if (tPos) {
            const dx = tPos[0] - sx, dy = (tPos[1] + 1.15) - syPos, dz = tPos[2] - sz;
            const d = Math.hypot(dx, dy, dz) || 1;
            vx = (dx / d) * sw.skill.speed;
            vy = M.clamp((dy / d) * sw.skill.speed, -12, 12);
            vz = (dz / d) * sw.skill.speed;
            yaw = Math.atan2(dx, dz);
          }
          this._spawnProjectile({
            owner: o, targetType: sw.targetType, skill: sw.skill,
            shape: 'sword', x: sx, y: syPos, z: sz,
            vx, vy, vz, rotY: yaw,
            scale: [0.56, 0.56, 0.92], col: [1.0, 0.92, 0.50], alpha: 0.84,
            dmg: this._calcNpcAtkDmg(o, sw.skill.dmgPct || 1.05),
            hitRadius: 1.0, pierce: sw.skill.pierce || 2,
            trailKind: 'metal_sword_trail', life: sw.skill.range / sw.skill.speed,
          });
          this.stagedSwords.splice(i, 1);
        } else if (o.visible) {
          const mSw = M.mat4();
          M.m4ComposeTRS(mSw, sx, syPos, sz, 0, faceYaw, 0, 0.54, 0.54, 0.88);
          this.vfxDrawList.push({ shape: 'sword', modelMat: mSw, col: [1.0, 0.92, 0.50], alpha: 0.78 });
        }
      }

      // 3. Update NPC advancing 惊涛拍岸 water walls
      for (let i = this.waveWalls.length - 1; i >= 0; i--) {
        const ww = this.waveWalls[i];
        const step = ww.speed * cdt;
        ww.x += ww.dirX * step;
        ww.z += ww.dirZ * step;
        ww.traveled += step;
        const wy = T.getMeshTerrainHeight(ww.x, ww.z);
        const waveDmg = this._calcNpcAtkDmg(ww.owner, ww.skill.dmgPct || 2.15);

        // Hit player or monsters along wave front
        if (this.isHostileToPlayer(ww.owner) && !ww.hitIds.has('player')) {
          const dx = px - ww.x, dz = pz - ww.z;
          if (Math.abs(dx * ww.dirX + dz * ww.dirZ) <= 2.2 && Math.abs(-dx * ww.dirZ + dz * ww.dirX) <= ww.width * 0.55 + 0.8) {
            ww.hitIds.add('player');
            hitPlayerCb(waveDmg, 0, ww.owner.name, '惊涛拍岸');
          }
        }
        for (let mIdx = 0; mIdx < monsters.length; mIdx++) {
          const m = monsters[mIdx];
          if (!m.alive || ww.hitIds.has(m.id)) continue;
          const dx = m.x - ww.x, dz = m.z - ww.z;
          if (Math.abs(dx * ww.dirX + dz * ww.dirZ) <= 1.8 + (m.spec.colRadius || 1.1) && Math.abs(-dx * ww.dirZ + dz * ww.dirX) <= ww.width * 0.55 + (m.spec.colRadius || 1.1)) {
            ww.hitIds.add(m.id);
            monsterSystem.applyDamageToMonster(m, waveDmg, {
              attackerNpc: ww.owner,
              knockX: ww.dirX * (ww.skill.knockback || 5.5),
              knockZ: ww.dirZ * (ww.skill.knockback || 5.5),
              label: '惊涛击退', color: '#7cdfff',
            });
          }
        }
        if (ww.traveled >= ww.maxDist) {
          this.waveWalls.splice(i, 1);
          continue;
        }
        const fade = Math.max(0.15, 1.0 - Math.max(0, (ww.traveled / ww.maxDist - 0.7) / 0.3));
        M.m4ComposeTRS(ww.modelMat, ww.x, wy + 0.05, ww.z, 0, ww.yaw, 0, ww.width * 0.52, 1.9, 1.5);
        this.vfxDrawList.push({ shape: 'wave_wall', modelMat: ww.modelMat, col: [0.42, 0.82, 1.0], alpha: 0.58 * fade });
      }

      // 4. Update NPC persistent zones (青藤绞杀 / 寒霜凝滞)
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        z.timer -= cdt;
        z.tickAcc += cdt;
        if (z.kind === 'water_frost') {
          const fade = Math.min(1.0, z.timer / 0.5);
          M.m4ComposeTRS(z.modelMat, z.x, z.y + 0.08, z.z, 0, 0.25, 0, z.radius * 0.92, 1.0, z.radius * 0.92);
          this.vfxDrawList.push({ shape: 'hex_ice', modelMat: z.modelMat, col: [0.58, 0.88, 1.0], alpha: 0.44 * fade });
          if (z.tickAcc >= 1.0) {
            z.tickAcc = 0;
            this._damageCurrentTargetsInRadius(z.owner, z.x, z.z, z.radius, this._calcNpcAtkDmg(z.owner, z.skill.dotDmgPct || 0.80), {
              slowSec: 1.6, slowRatio: z.skill.slowRatio || 0.45, label: '寒伤', color: '#96e8ff',
            }, playerPos, monsterSystem, hitPlayerCb);
          }
        } else if (z.kind === 'wood_vine') {
          if (z.tickAcc >= 0.75) {
            z.tickAcc = 0;
            this._damageCurrentTargetsInRadius(z.owner, z.x, z.z, z.radius, this._calcNpcAtkDmg(z.owner, z.skill.dotDmgPct || 0.75), {
              color: '#78f294',
            }, playerPos, monsterSystem, hitPlayerCb);
          }
        }
        if (z.timer <= 0) this.zones.splice(i, 1);
      }

      // 5. Update NPC 炎息燎原 flame fans
      for (let i = this.flameFans.length - 1; i >= 0; i--) {
        const ff = this.flameFans[i];
        const o = ff.owner;
        if (!o || !o.alive) { this.flameFans.splice(i, 1); continue; }
        ff.timer -= cdt;
        ff.tickAcc += cdt;
        const fX = -Math.sin(o.yaw), fZ = -Math.cos(o.yaw);
        const fYaw = Math.atan2(fX, fZ);
        const fade = Math.min(1.0, ff.timer / 0.35);
        const pulse = 1.0 + Math.sin(elapsed * 14.0) * 0.04;
        if (o.visible) {
          M.m4ComposeTRS(ff.outerMat, o.x, o.y + 0.16, o.z, 0, fYaw, 0, ff.skill.range * 0.84 * pulse, 1.25, ff.skill.range * 0.84 * pulse);
          this.vfxDrawList.push({ shape: 'flame_fan', modelMat: ff.outerMat, col: [1.0, 0.28, 0.10], alpha: 0.44 * fade });
          M.m4ComposeTRS(ff.innerMat, o.x, o.y + 0.24, o.z, 0, fYaw, 0, ff.skill.range * 0.60 * pulse, 1.4, ff.skill.range * 0.60 * pulse);
          this.vfxDrawList.push({ shape: 'flame_fan', modelMat: ff.innerMat, col: [1.0, 0.64, 0.18], alpha: 0.48 * fade });
        }
        if (ff.tickAcc >= 0.56) {
          ff.tickAcc = 0;
          this._damageCurrentTargetsInRadius(o, o.x, o.z, ff.skill.range, this._calcNpcAtkDmg(o, ff.skill.dmgPct || 0.90), {
            label: '燎原灼烧', color: '#ff8a44',
          }, playerPos, monsterSystem, hitPlayerCb, fX, fZ, 0.48);
        }
        if (ff.timer <= 0) this.flameFans.splice(i, 1);
      }

      // 6. Update NPC skill projectiles (hits monsters & hostile player!)
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.age += cdt;
        pr.x += pr.vx * cdt;
        pr.y += pr.vy * cdt;
        pr.z += pr.vz * cdt;
        pr.rotX += pr.spinX * cdt;
        pr.rotY += pr.spinY * cdt;
        pr.rotZ += pr.spinZ * cdt;

        pr.trailTimer += cdt;
        if (pr.trailKind && pr.trailTimer >= 0.045) {
          pr.trailTimer = 0;
          const isFire = pr.trailKind.startsWith('fire');
          const isMetal = pr.trailKind.startsWith('metal');
          this._spawnEffect({
            shape: pr.trailKind === 'wood_leaf' ? 'leaf' : (pr.trailKind === 'metal_sword_trail' ? 'shard' : 'orb'),
            x: pr.x, y: pr.y, z: pr.z, rotY: pr.rotY,
            s0: isFire ? 0.18 : 0.11, s1: 0.03,
            life: 0.22,
            col: isFire ? [1.0, 0.56, 0.16] : (isMetal ? [1.0, 0.92, 0.52] : pr.col),
            alpha: 0.60,
          });
        }

        let destroyed = false;
        // Hit player if projectile belongs to a hostile NPC!
        if (this.isHostileToPlayer(pr.owner) && !pr.hitIds.has('player')) {
          if (Math.hypot(pr.x - px, pr.z - pz) < pr.hitRadius + 0.65 && Math.abs(pr.y - (py + 1.15)) < 1.55) {
            pr.hitIds.add('player');
            pr.pierceLeft -= 1;
            hitPlayerCb(pr.dmg, pr.skill.slowSec || 0, pr.owner.name, pr.skill.name);
            this._onNpcProjectileExplode(pr, playerPos, monsterSystem, hitPlayerCb);
            if (pr.pierceLeft <= 0) destroyed = true;
          }
        }
        // Hit monsters!
        if (!destroyed && monsterSystem) {
          for (let mIdx = 0; mIdx < monsters.length; mIdx++) {
            const m = monsters[mIdx];
            if (!m.alive || pr.hitIds.has(m.id)) continue;
            const mRad = (m.spec.colRadius || m.spec.radius || 1.2) + pr.hitRadius;
            const dx = pr.x - m.x, dz = pr.z - m.z;
            if (dx * dx + dz * dz > mRad * mRad) continue;
            const mMidY = m.y + Math.max(1.0, (m.spec.colHeight || 2.2) * 0.5);
            if (Math.abs(pr.y - mMidY) > Math.max(1.8, (m.spec.colHeight || 2.2) * 0.65)) continue;
            pr.hitIds.add(m.id);
            pr.pierceLeft -= 1;
            const sk = pr.skill;
            const opts = { attackerNpc: pr.owner };
            if (sk.staggerSec) { opts.staggerSec = sk.staggerSec; opts.label = '硬直'; }
            if (sk.slowSec) { opts.slowSec = sk.slowSec; opts.slowRatio = sk.slowRatio || 0.70; }
            if (sk.knockback) {
              const spd = Math.hypot(pr.vx, pr.vz) || 1;
              opts.knockX = (pr.vx / spd) * sk.knockback;
              opts.knockZ = (pr.vz / spd) * sk.knockback;
            }
            monsterSystem.applyDamageToMonster(m, pr.dmg, opts);
            this._onNpcProjectileExplode(pr, playerPos, monsterSystem, hitPlayerCb);
            if (pr.pierceLeft <= 0) { destroyed = true; break; }
          }
        }

        const gY = T.getMeshTerrainHeight(pr.x, pr.z);
        if (destroyed || pr.age >= pr.life || pr.y <= gY + 0.08) {
          if (!destroyed && pr.y <= gY + 0.08) {
            this._onNpcProjectileExplode(pr, playerPos, monsterSystem, hitPlayerCb);
          }
          this.projectiles.splice(i, 1);
          continue;
        }
        M.m4ComposeTRS(pr.modelMat, pr.x, pr.y, pr.z, pr.rotX, pr.rotY, pr.rotZ, pr.scale[0], pr.scale[1], pr.scale[2]);
      }

      // 7. Update transient NPC VFX effects
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
        ef.rotX += ef.spinX * cdt;
        ef.rotY += ef.spinY * cdt;
        ef.rotZ += ef.spinZ * cdt;
        const u = ef.age / ef.life;
        let ease = 1.0 - (1.0 - u) * (1.0 - u);
        if (ef.growPop) {
          if (u < 0.22) ease = u / 0.22;
          else if (u < 0.75) ease = 1.0;
          else ease = 1.0 - ((u - 0.75) / 0.25) * 0.55;
        }
        M.m4ComposeTRS(
          ef.modelMat, ef.x, ef.y, ef.z, ef.rotX, ef.rotY, ef.rotZ,
          M.lerp(ef.sx0, ef.sx1, ease), M.lerp(ef.sy0, ef.sy1, ease), M.lerp(ef.sz0, ef.sz1, ease)
        );
      }
    }

    _onNpcProjectileExplode(pr, playerPos, monsterSystem, hitPlayerCb) {
      const sk = pr.skill;
      if (sk && sk.id === 'fire_zhuji1') {
        const r = sk.aoeRadius || 5.0;
        const gy = T.getMeshTerrainHeight(pr.x, pr.z);
        this._spawnEffect({
          shape: 'ring', x: pr.x, y: Math.max(gy + 0.14, pr.y - 0.4), z: pr.z,
          sx0: 0.7, sy0: 1.0, sz0: 0.7, sx1: r, sy1: 1.0, sz1: r,
          life: 0.50, col: [1.0, 0.72, 0.24], alpha: 0.66,
        });
        this._spawnEffect({
          shape: 'orb', x: pr.x, y: pr.y, z: pr.z,
          s0: 0.5, s1: r * 0.48, life: 0.38, col: [1.0, 0.42, 0.12], alpha: 0.66,
        });
        this._damageCurrentTargetsInRadius(pr.owner, pr.x, pr.z, r, this._calcNpcAtkDmg(pr.owner, sk.splashDmgPct || 2.05), {
          label: '烈焰爆', color: '#ff9448',
        }, playerPos, monsterSystem, hitPlayerCb);
      } else {
        this._spawnEffect({
          shape: 'ring', x: pr.x, y: pr.y, z: pr.z,
          s0: 0.25, s1: 1.35, life: 0.28, col: pr.col, alpha: 0.52,
        });
      }
    }

    _updateNpcTreasures(npc, cdt, elapsed, playerPos, monsterSystem, paused, hitPlayerCb) {
      if (!npc.treasures || npc.treasures.length === 0) return;
      const tMap = XW.Treasures ? XW.Treasures.TREASURE_MAP : null;
      if (!tMap) return;
      const walkPhase = npc.char ? npc.char.walkPhase : 0;
      const moveBlend = npc.char ? npc.char.blendMove : 0;
      const kFollow = 1 - Math.exp(-15.0 * cdt);
      const fwdX = -Math.sin(npc.yaw), fwdZ = -Math.cos(npc.yaw);
      const faceYaw = Math.atan2(fwdX, fwdZ);

      for (let ti = 0; ti < npc.treasures.length; ti++) {
        const id = npc.treasures[ti];
        const def = tMap[id];
        const rt = npc.treasureRuntimes[id];
        if (!def || !rt) continue;
        const wear = computeWearPose(id, npc.x, npc.y, npc.z, npc.yaw, elapsed, walkPhase, moveBlend);
        if (!rt.initialized) {
          rt.x = wear.x; rt.y = wear.y; rt.z = wear.z;
          rt.rotX = wear.rotX; rt.rotY = wear.rotY; rt.rotZ = wear.rotZ;
          rt.scale = wear.scale;
          rt.initialized = true;
        }

        if (id === 'qingfeng_needle') {
          if (rt.state === 'idle') {
            rt.x = M.lerp(rt.x, wear.x, kFollow); rt.y = M.lerp(rt.y, wear.y, kFollow); rt.z = M.lerp(rt.z, wear.z, kFollow);
            rt.rotX = wear.rotX; rt.rotY = wear.rotY; rt.rotZ = wear.rotZ; rt.scale = wear.scale; rt.glow = 0.08;
          } else if (!paused && rt.state === 'out') {
            if (rt.target && rt.target.type === 'monster' && rt.target.ref && rt.target.ref.alive) {
              rt.tx = rt.target.ref.x; rt.ty = rt.target.ref.y + 1.1; rt.tz = rt.target.ref.z;
            } else if (rt.target && rt.target.type === 'player') {
              rt.tx = playerPos[0]; rt.ty = playerPos[1] + 1.15; rt.tz = playerPos[2];
            }
            const dx = rt.tx - rt.x, dy = rt.ty - rt.y, dz = rt.tz - rt.z;
            const d = Math.hypot(dx, dy, dz) || 0.001;
            const step = 38.0 * cdt;
            rt.x += (dx / d) * Math.min(step, d);
            rt.y += (dy / d) * Math.min(step, d);
            rt.z += (dz / d) * Math.min(step, d);
            rt.rotY = Math.atan2(dx, dz);
            rt.rotX = -Math.asin(M.clamp(dy / d, -0.8, 0.8));
            rt.rotZ += 15.0 * cdt;
            rt.scale = 1.22; rt.glow = 0.70;
            rt.trailAcc += cdt;
            if (rt.trailAcc >= 0.032) {
              rt.trailAcc = 0;
              this._spawnEffect({
                shape: 'shard', x: rt.x, y: rt.y, z: rt.z, rotX: rt.rotX, rotY: rt.rotY,
                sx0: 0.13, sy0: 0.13, sz0: 0.85, sx1: 0.02, sy1: 0.02, sz1: 0.30,
                life: 0.22, col: [0.64, 0.95, 0.98], alpha: 0.54,
              });
            }
            if (d <= 1.25 || rt.timer > 1.1) {
              if (!rt.hitDone) {
                rt.hitDone = true;
                const dmg = this._calcNpcAtkDmg(npc, def.dmgPct || 1.55);
                if (rt.target && rt.target.type === 'monster' && rt.target.ref && rt.target.ref.alive && monsterSystem) {
                  monsterSystem.applyDamageToMonster(rt.target.ref, dmg, { attackerNpc: npc, color: '#9cf6ff' });
                } else if (rt.target && rt.target.type === 'player' && this.isHostileToPlayer(npc)) {
                  if (Math.hypot(rt.x - playerPos[0], rt.z - playerPos[2]) < 2.4) {
                    hitPlayerCb(dmg, 0, npc.name, '青锋飞针');
                  }
                }
              }
              rt.state = 'return'; rt.timer = 0;
            }
            rt.timer += cdt;
          } else if (!paused && rt.state === 'return') {
            const dx = wear.x - rt.x, dy = wear.y - rt.y, dz = wear.z - rt.z;
            const d = Math.hypot(dx, dy, dz) || 0.001;
            const step = 35.0 * cdt;
            rt.x += (dx / d) * Math.min(step, d);
            rt.y += (dy / d) * Math.min(step, d);
            rt.z += (dz / d) * Math.min(step, d);
            rt.rotY = Math.atan2(dx, dz); rt.scale = 1.08; rt.glow = 0.42;
            if (d <= 0.65 || rt.timer > 1.1) { rt.state = 'idle'; rt.target = null; }
            rt.timer += cdt;
          }
          M.m4ComposeTRS(rt.modelMat, rt.x, rt.y, rt.z, rt.rotX, rt.rotY, rt.rotZ, rt.scale, rt.scale, rt.scale);
          this.opaqueDrawList.push({ id, modelMat: rt.modelMat, tint: def.tint, glow: rt.glow });
        } else if (id === 'liehuo_gourd') {
          if (rt.state === 'idle') {
            rt.x = M.lerp(rt.x, wear.x, kFollow); rt.y = M.lerp(rt.y, wear.y, kFollow); rt.z = M.lerp(rt.z, wear.z, kFollow);
            rt.rotX = wear.rotX; rt.rotY = wear.rotY; rt.rotZ = wear.rotZ; rt.scale = wear.scale; rt.glow = 0.05;
          } else if (!paused && rt.state === 'active') {
            rt.timer -= cdt;
            rt.x = M.lerp(rt.x, npc.x + fwdX * 1.15, kFollow);
            rt.y = M.lerp(rt.y, npc.y + 1.42 + Math.sin(elapsed * 8.0) * 0.05, kFollow);
            rt.z = M.lerp(rt.z, npc.z + fwdZ * 1.15, kFollow);
            rt.rotY = faceYaw; rt.rotX = 1.22; rt.rotZ = Math.sin(elapsed * 12.0) * 0.12;
            rt.scale = 1.18; rt.glow = 0.65;
            rt.trailAcc += cdt;
            if (rt.trailAcc >= 0.055) {
              rt.trailAcc = 0;
              for (let k = 0; k < 2; k++) {
                const a = faceYaw + (Math.random() - 0.5) * 1.0;
                const spd = 7.5 + Math.random() * 4.5;
                this._spawnEffect({
                  shape: k === 0 ? 'spike' : 'orb',
                  x: rt.x + fwdX * 0.4, y: rt.y + 0.05, z: rt.z + fwdZ * 0.4,
                  vx: Math.sin(a) * spd, vy: (Math.random() - 0.3) * 1.4, vz: Math.cos(a) * spd,
                  rotY: a, s0: 0.20, s1: 0.48, life: 0.42,
                  col: k === 1 ? [1.0, 0.78, 0.28] : [1.0, 0.40, 0.12], alpha: 0.66,
                });
              }
            }
            rt.tickAcc += cdt;
            if (rt.tickAcc >= 0.40) {
              rt.tickAcc = 0;
              this._damageCurrentTargetsInRadius(npc, npc.x, npc.z, def.range || 8.8, this._calcNpcAtkDmg(npc, def.dmgPct || 0.85), {
                label: '烈火灼烧', color: '#ff8844',
              }, playerPos, monsterSystem, hitPlayerCb, fwdX, fwdZ, 0.52);
            }
            if (rt.timer <= 0) rt.state = 'idle';
          }
          M.m4ComposeTRS(rt.modelMat, rt.x, rt.y, rt.z, rt.rotX, rt.rotY, rt.rotZ, rt.scale, rt.scale, rt.scale);
          this.opaqueDrawList.push({ id, modelMat: rt.modelMat, tint: def.tint, glow: rt.glow });
        } else if (id === 'zhenshan_seal') {
          if (rt.state === 'idle') {
            rt.x = M.lerp(rt.x, wear.x, kFollow); rt.y = M.lerp(rt.y, wear.y, kFollow); rt.z = M.lerp(rt.z, wear.z, kFollow);
            rt.rotX = wear.rotX; rt.rotY = wear.rotY; rt.rotZ = wear.rotZ; rt.scale = wear.scale; rt.glow = 0.06;
          } else if (!paused && rt.state === 'rise') {
            rt.timer -= cdt;
            if (rt.target && rt.target.type === 'monster' && rt.target.ref && rt.target.ref.alive) {
              rt.tx = rt.target.ref.x; rt.tz = rt.target.ref.z; rt.ty = T.getMeshTerrainHeight(rt.tx, rt.tz);
            } else if (rt.target && rt.target.type === 'player') {
              rt.tx = playerPos[0]; rt.tz = playerPos[2]; rt.ty = T.getMeshTerrainHeight(rt.tx, rt.tz);
            }
            const kM = 1 - Math.exp(-9.5 * cdt);
            rt.x = M.lerp(rt.x, rt.tx, kM); rt.y = M.lerp(rt.y, rt.ty + 5.2, kM); rt.z = M.lerp(rt.z, rt.tz, kM);
            rt.rotX = 0; rt.rotY += 3.5 * cdt; rt.rotZ = 0;
            rt.scale = M.lerp(rt.scale, 1.85, kM); rt.glow = 0.58;
            if (rt.timer <= 0) { rt.state = 'slam'; rt.timer = 0.20; }
          } else if (!paused && rt.state === 'slam') {
            rt.timer -= cdt;
            const u = 1.0 - M.clamp(rt.timer / 0.20, 0, 1);
            rt.x = rt.tx; rt.z = rt.tz; rt.y = M.lerp(rt.ty + 5.2, rt.ty + 0.24, u * u);
            rt.scale = 1.90; rt.glow = 0.78;
            if (rt.timer <= 0) {
              if (!rt.hitDone) {
                rt.hitDone = true;
                this._spawnEffect({
                  shape: 'ring', x: rt.tx, y: rt.ty + 0.14, z: rt.tz,
                  sx0: 0.75, sy0: 1.0, sz0: 0.75, sx1: def.aoeRadius || 4.8, sy1: 1.0, sz1: def.aoeRadius || 4.8,
                  life: 0.56, col: [0.88, 0.72, 0.36], alpha: 0.66,
                });
                this._damageCurrentTargetsInRadius(npc, rt.tx, rt.tz, def.aoeRadius || 4.8, this._calcNpcAtkDmg(npc, def.dmgPct || 1.80), {
                  staggerSec: def.staggerSec || 0.85, label: '镇压·硬直', color: '#f0cf7a',
                }, playerPos, monsterSystem, hitPlayerCb);
              }
              rt.state = 'hold'; rt.timer = 0.30;
            }
          } else if (!paused && rt.state === 'hold') {
            rt.timer -= cdt; rt.glow = 0.30;
            if (rt.timer <= 0) { rt.state = 'idle'; rt.target = null; }
          }
          M.m4ComposeTRS(rt.modelMat, rt.x, rt.y, rt.z, rt.rotX, rt.rotY, rt.rotZ, rt.scale, rt.scale, rt.scale);
          this.opaqueDrawList.push({ id, modelMat: rt.modelMat, tint: def.tint, glow: rt.glow });
        } else if (id === 'xuangui_shield') {
          if (rt.state === 'idle' || npc.buffs.tShieldTimer <= 0) {
            rt.state = 'idle';
            rt.x = M.lerp(rt.x, wear.x, kFollow); rt.y = M.lerp(rt.y, wear.y, kFollow); rt.z = M.lerp(rt.z, wear.z, kFollow);
            rt.rotX = wear.rotX; rt.rotY = wear.rotY; rt.rotZ = wear.rotZ;
            rt.scale = M.lerp(rt.scale, wear.scale, kFollow); rt.glow = 0.06;
          } else {
            if (!paused) rt.orbitAngle += cdt * 3.1;
            rt.x = npc.x + Math.sin(rt.orbitAngle) * 1.18;
            rt.y = npc.y + 1.08 + Math.sin(elapsed * 3.4) * 0.08;
            rt.z = npc.z + Math.cos(rt.orbitAngle) * 1.18;
            rt.rotX = 0; rt.rotY = rt.orbitAngle; rt.rotZ = 0;
            rt.scale = M.lerp(rt.scale, 1.50, kFollow); rt.glow = 0.48;
            M.m4ComposeTRS(rt.ringMat, rt.x, rt.y, rt.z, Math.PI * 0.5, rt.rotY, 0, 0.72, 1.0, 0.72);
            this.vfxDrawList.push({ shape: 'ring', modelMat: rt.ringMat, col: [0.92, 0.78, 0.40], alpha: 0.46 });
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
          rt.y = M.lerp(rt.y, wear.y + (ringing ? 0.16 : 0), kFollow);
          rt.z = M.lerp(rt.z, wear.z, kFollow);
          rt.rotX = wear.rotX + (ringing ? Math.sin(elapsed * 34.0) * 0.32 : 0);
          rt.rotY = wear.rotY;
          rt.rotZ = wear.rotZ + (ringing ? Math.cos(elapsed * 34.0) * 0.32 : 0);
          rt.scale = ringing ? 1.16 : wear.scale;
          rt.glow = ringing ? 0.72 : (npc.buffs.bellDrTimer > 0 ? 0.30 : 0.08);
          M.m4ComposeTRS(rt.modelMat, rt.x, rt.y, rt.z, rt.rotX, rt.rotY, rt.rotZ, rt.scale, rt.scale, rt.scale);
          this.opaqueDrawList.push({ id, modelMat: rt.modelMat, tint: def.tint, glow: rt.glow });
        } else if (id === 'liuyun_scarf') {
          if (npc.buffs.scarfTimer > 0) {
            M.m4ComposeTRS(rt.veilMat, npc.x, npc.y + 1.05, npc.z, 0, elapsed * 1.15, 0, 1.02, 1.05, 1.02);
            this.vfxDrawList.push({ shape: 'liuyun_veil', modelMat: rt.veilMat, col: [0.76, 0.96, 0.98], alpha: 0.34 });
            M.m4ComposeTRS(rt.ringMatA, npc.x, npc.y + 1.72, npc.z, 0.14, -elapsed * 1.6, 0, 1.06, 1.0, 1.06);
            this.vfxDrawList.push({ shape: 'ring', modelMat: rt.ringMatA, col: [0.95, 1.0, 1.0], alpha: 0.46 });
          } else {
            rt.x = M.lerp(rt.x, wear.x, kFollow); rt.y = M.lerp(rt.y, wear.y, kFollow); rt.z = M.lerp(rt.z, wear.z, kFollow);
            M.m4ComposeTRS(rt.modelMat, rt.x, rt.y, rt.z, wear.rotX, wear.rotY, wear.rotZ, 1.04, 1.04, 1.04);
            this.vfxDrawList.push({ shape: 'liuyun_folded', modelMat: rt.modelMat, col: [0.68, 0.94, 0.96], alpha: 0.56 });
            this.vfxDrawList.push({ shape: 'liuyun_border', modelMat: rt.modelMat, col: [0.98, 1.0, 1.0], alpha: 0.84 });
          }
        }
      }
    }

    _pushNpcBuffVfx(npc, elapsed) {
      const b = npc.buffs;
      if (b.shieldTimer > 0 && b.shieldHp > 0) {
        if (b.shieldKind === 'zhuji') {
          for (let i = 0; i < 4; i++) {
            const ang = b.shieldVfxAngle + (i / 4) * Math.PI * 2;
            const mat = M.mat4();
            M.m4ComposeTRS(mat, npc.x + Math.sin(ang) * 1.28, npc.y + 1.12 + Math.sin(elapsed * 2.6 + i * 1.57) * 0.10, npc.z + Math.cos(ang) * 1.28, 0, ang, 0, 1.02, 1.02, 1.02);
            this.vfxDrawList.push({ shape: 'slab', modelMat: mat, col: [0.76, 0.64, 0.38], alpha: 0.76 });
            this.vfxDrawList.push({ shape: 'slab_rune', modelMat: mat, col: [1.0, 0.88, 0.46], alpha: 0.72 });
          }
        } else {
          const mat = M.mat4();
          M.m4ComposeTRS(mat, npc.x, npc.y + 1.02, npc.z, 0, elapsed * 0.5, 0, 1.02, 1.14, 1.02);
          this.vfxDrawList.push({ shape: 'orb', modelMat: mat, col: [0.88, 0.72, 0.42], alpha: 0.24 });
        }
      }
      if (b.metalBladeTimer > 0) {
        for (let i = 0; i < 4; i++) {
          const ang = b.metalBladeAngle + (i / 4) * Math.PI * 2;
          const mat = M.mat4();
          M.m4ComposeTRS(mat, npc.x + Math.sin(ang) * 1.30, npc.y + 1.18 + Math.sin(elapsed * 3.2 + i * 1.57) * 0.16, npc.z + Math.cos(ang) * 1.30, 0.18, ang + Math.PI * 0.5, 0.25, 0.80, 0.80, 0.80);
          this.vfxDrawList.push({ shape: 'blade', modelMat: mat, col: [1.0, 0.90, 0.48], alpha: 0.76 });
        }
      }
      if (b.woodAuraTimer > 0) {
        const mat = M.mat4();
        M.m4ComposeTRS(mat, npc.x, npc.y + 0.10, npc.z, 0, elapsed * 1.1, 0, 2.05, 1.0, 2.05);
        this.vfxDrawList.push({ shape: 'ring', modelMat: mat, col: [0.42, 0.94, 0.54], alpha: 0.54 });
      }
    }

    // Screen-space direct 3D click picking on nearby 青石城 merchants & 藏经阁长老!
    pickNearbyShopNpcAtScreenPos(clientX, clientY, cssW, cssH, vpMat, playerPos) {
      if (!vpMat || !playerPos) return null;
      let best = null;
      let bestScore = 9999;
      for (let i = 0; i < this.npcs.length; i++) {
        const n = this.npcs[i];
        if (!n.alive || !n.visible || n.kind !== 'shopkeeper') continue;
        const distP = Math.hypot(n.x - playerPos[0], n.z - playerPos[2]);
        if (distP > 9.5 || Math.abs(n.y - playerPos[1]) > 4.5) continue;

        const wy = n.y + 1.15;
        const clipX = vpMat[0] * n.x + vpMat[4] * wy + vpMat[8]  * n.z + vpMat[12];
        const clipY = vpMat[1] * n.x + vpMat[5] * wy + vpMat[9]  * n.z + vpMat[13];
        const clipW = vpMat[3] * n.x + vpMat[7] * wy + vpMat[11] * n.z + vpMat[15];
        if (clipW <= 0.2) continue;

        const sx = ((clipX / clipW) * 0.5 + 0.5) * cssW;
        const sy = (0.5 - (clipY / clipW) * 0.5) * cssH;
        const screenDist = Math.hypot(clientX - sx, clientY - sy);
        const hitPx = M.clamp(780 / Math.max(2.0, clipW), 62, 160);
        if (screenDist <= hitPx && screenDist < bestScore) {
          bestScore = screenDist;
          best = n;
        }
      }
      return best;
    }

    // =========================================================================
    // 11. OVERHEAD NPC NAMETAGS (不标注正道/魔道! 仅显示身份/境界与姓名)
    // =========================================================================
    renderNameTags(ctx, cssW, cssH, dpr, vpMat, camPos, playerPos = null) {
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '600 12.5px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cx = camPos[0], cy = camPos[1], cz = camPos[2];
      const tags = [];

      for (let i = 0; i < this.npcs.length; i++) {
        const n = this.npcs[i];
        if (!n.alive || !n.visible) continue;
        const dist = Math.hypot(n.x - cx, n.y - cy, n.z - cz);
        const maxD = n.kind === 'shopkeeper' ? 56.0 : 120.0;
        if (dist > maxD) continue;

        const wy = n.y + 2.55;
        const clipX = vpMat[0] * n.x + vpMat[4] * wy + vpMat[8]  * n.z + vpMat[12];
        const clipY = vpMat[1] * n.x + vpMat[5] * wy + vpMat[9]  * n.z + vpMat[13];
        const clipW = vpMat[3] * n.x + vpMat[7] * wy + vpMat[11] * n.z + vpMat[15];
        if (clipW <= 0.2) continue;
        const ndcX = clipX / clipW, ndcY = clipY / clipW;
        if (ndcX < -1.06 || ndcX > 1.06 || ndcY < -1.06 || ndcY > 1.06) continue;

        const sx = (ndcX * 0.5 + 0.5) * cssW;
        const sy = (0.5 - ndcY * 0.5) * cssH;
        const alpha = 1.0 - M.smoothstep(maxD * 0.70, maxD, dist);
        if (alpha <= 0.03) continue;
        tags.push({ n, sx, sy, dist, alpha });
      }

      tags.sort((a, b) => b.dist - a.dist);

      for (let i = 0; i < tags.length; i++) {
        const t = tags[i];
        const n = t.n;
        const isZhuji = n.realm === 'zhuji';
        const isCity = n.kind !== 'wild';

        const statuses = [];
        if (n.stunTimer > 0) statuses.push('震晕');
        if (n.rootTimer > 0) statuses.push('定身');
        if (n.staggerTimer > 0) statuses.push('硬直');
        if (n.slowTimer > 0) statuses.push('缓速');
        const suf = statuses.length > 0 ? ` [${statuses.join('·')}]` : '';

        // STRICTLY NO 正道/魔道 label!
        const isShopNpc = n.kind === 'shopkeeper';
        const distToPlayer = playerPos ? Math.hypot(n.x - playerPos[0], n.z - playerPos[2]) : 999;
        const isNearShop = isShopNpc && distToPlayer <= 7.8;
        const shopHint = isNearShop
          ? (n.role === '藏经阁长老' ? ' · 点击或按 U 研习功法' : ' · 点击或按 U 交易')
          : '';
        const label = isCity
          ? `${n.role} · ${n.name}${shopHint}${suf}`
          : `${n.realmLabel} · ${n.name}${suf}`;

        ctx.globalAlpha = t.alpha;
        const tw = ctx.measureText(label).width;
        const bw = Math.ceil(tw + 20), bh = 22;
        const bx = Math.round(t.sx - bw * 0.5), by = Math.round(t.sy - bh * 0.5);

        // Identical calm styling for both righteous & demonic wild cultivators so alignment stays hidden!
        const inCombatWithPlayer = n.target && n.target.type === 'player';
        ctx.fillStyle = isCity
          ? 'rgba(18, 26, 36, 0.80)'
          : (inCombatWithPlayer ? 'rgba(40, 14, 16, 0.80)' : 'rgba(14, 24, 34, 0.78)');
        ctx.strokeStyle = isCity
          ? 'rgba(244, 212, 126, 0.78)'
          : (inCombatWithPlayer ? 'rgba(248, 114, 102, 0.86)' : (isZhuji ? 'rgba(154, 206, 255, 0.78)' : 'rgba(148, 232, 198, 0.70)'));
        ctx.lineWidth = isCity || isZhuji || inCombatWithPlayer ? 1.25 : 1.0;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 11);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillText(label, t.sx, t.sy + 1);
        ctx.fillStyle = isCity
          ? '#ffebad'
          : (inCombatWithPlayer ? '#ffd4cc' : (isZhuji ? '#d4ecff' : '#e4fff4'));
        ctx.fillText(label, t.sx, t.sy);

        // Slim HP bar when damaged or actively fighting
        if (n.hp < n.maxHp || n.target) {
          const barW = Math.max(66, Math.min(110, bw - 12));
          const barH = 5;
          const barX = Math.round(t.sx - barW * 0.5);
          const barY = by + bh + 4;
          const ratio = M.clamp(n.hp / Math.max(1, n.maxHp), 0, 1);
          ctx.fillStyle = 'rgba(10, 14, 18, 0.80)';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          ctx.fillStyle = inCombatWithPlayer ? '#e85b4f' : '#58c98e';
          ctx.fillRect(barX, barY, Math.round(barW * ratio), barH);
        }
      }
      ctx.restore();
    }
  }

  XW.NPCs = {
    createNpcSystem: (collisionWorld) => new NpcSystem(collisionWorld),
  };
})(window);
