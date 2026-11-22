(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;

  // =========================================================================
  // 1. PLACEABLE BUILDING CATALOG (炼丹炉 + 炼器炉 · 默认放入背包)
  // =========================================================================
  const FURNACE_DEFS = [
    {
      id: 'alchemy_furnace',
      name: '炼丹炉',
      icon: '丹',
      slotType: 'building',
      buildingKind: 'alchemy',
      categoryLabel: '可放置建筑',
      colRadius: 1.08,
      height: 2.42,
      tint: [1.0, 0.72, 0.36],
      desc: '可放置建筑 · 三足圆腹古朴青铜鼎，炉身带两道金环与微亮青玉牌、两侧半圆双耳与葫芦提钮炉盖，炉底燃暖橙丹火，炉盖缝隙飘青白药烟。放置后靠近点击进入炼丹界面。',
    },
    {
      id: 'forging_furnace',
      name: '炼器炉',
      icon: '锻',
      slotType: 'building',
      buildingKind: 'forging',
      categoryLabel: '可放置建筑',
      colRadius: 1.55,
      height: 2.75,
      tint: [1.0, 0.42, 0.14],
      desc: '可放置建筑 · 四足厚重深黑玄铁方炉，棱角分明带铆钉与双大铁环，正面敞开炉膛燃暗金地火，炉顶收口带短烟囱并旁置矮墩玄铁打铁砧。放置后靠近点击进入炼器界面。',
    },
  ];

  const SPIRIT_PLATFORM_DEF = {
    id: 'spirit_platform_t1',
    name: '一阶灵台',
    icon: '台',
    slotType: 'spirit_platform',
    buildingKind: 'spirit_platform',
    categoryLabel: '修炼灵台',
    colRadius: 1.32,
    height: 0.44,
    seatOffsetY: 0.40,
    expPerSec: 24.0,
    tint: [0.76, 0.96, 0.90],
    desc: '一阶灵台 · 朴素青石矮座配草编蒲团，刻有微光聚灵浅纹。点击或按 U 键坐上打坐吐纳，是提升修炼度的唯一途径。',
  };

  const FURNACE_MAP = {};
  for (const d of FURNACE_DEFS) FURNACE_MAP[d.id] = d;
  FURNACE_MAP[SPIRIT_PLATFORM_DEF.id] = SPIRIT_PLATFORM_DEF;

  // =========================================================================
  // 2. ALCHEMY & FORGING RECIPES (炼丹配方 & 炼器配方 · 合理材料 + 低阶灵石消耗 + 境界限制)
  // =========================================================================
  const ALCHEMY_RECIPES = [
    // --- 练气期丹药 (requiredRealm: 'lianqi') ---
    {
      id: 'pill_yangqi',
      name: '养气丹',
      tierLabel: '练气 · 一品回血丹',
      requiredRealm: 'lianqi',
      icon: '养',
      mpCost: 20,
      stoneCost: 10,
      reqs: [{ slotType: 'herb', minTier: 1, count: 2, label: '一阶灵药' }],
      reqText: '一阶灵药 ×2 ＋ 10 低阶灵石 ＋ 20 灵力',
      effectText: '服用后立即恢复 70 点气血',
      output: {
        id: 'pill_yangqi',
        name: '养气丹',
        icon: '养',
        slotType: 'pill',
        realmLabel: '练气期丹药',
        tier: 1,
        healHp: 70,
        healMp: 0,
        count: 1,
        desc: '练气期回血丹药 · 药性温和纯正，服用后立即恢复 70 点气血。',
      },
    },
    {
      id: 'pill_ningling',
      name: '凝灵丹',
      tierLabel: '练气 · 一品回灵丹',
      requiredRealm: 'lianqi',
      icon: '凝',
      mpCost: 20,
      stoneCost: 10,
      reqs: [{ slotType: 'herb', minTier: 1, count: 2, label: '一阶灵药' }],
      reqText: '一阶灵药 ×2 ＋ 10 低阶灵石 ＋ 20 灵力',
      effectText: '服用后立即恢复 70 点灵力',
      output: {
        id: 'pill_ningling',
        name: '凝灵丹',
        icon: '凝',
        slotType: 'pill',
        realmLabel: '练气期丹药',
        tier: 1,
        healHp: 0,
        healMp: 70,
        count: 1,
        desc: '练气期回灵丹药 · 入口化作清灵之气汇入丹田，服用后立即恢复 70 点灵力。',
      },
    },
    {
      id: 'pill_linglu',
      name: '清心灵露丹',
      tierLabel: '练气 · 一品双回丹',
      requiredRealm: 'lianqi',
      icon: '露',
      mpCost: 25,
      stoneCost: 16,
      reqs: [{ slotType: 'herb', minTier: 1, count: 3, label: '一阶灵药' }],
      reqText: '一阶灵药 ×3 ＋ 16 低阶灵石 ＋ 25 灵力',
      effectText: '服用后恢复 35% 最大气血与 25% 最大灵力',
      output: {
        id: 'pill_linglu',
        name: '清心灵露丹',
        icon: '露',
        slotType: 'pill',
        realmLabel: '练气期丹药',
        tier: 1,
        healHpPct: 0.35,
        healMpPct: 0.25,
        count: 1,
        desc: '练气期双回灵丹 · 丹香清冽，服用后恢复 35% 最大气血与 25% 最大灵力。',
      },
    },
    // --- 筑基期丹药 (requiredRealm: 'zhuji' — 练气期无法炼制!) ---
    {
      id: 'pill_guiyuan',
      name: '归元丹',
      tierLabel: '筑基 · 二品回血丹',
      requiredRealm: 'zhuji',
      icon: '归',
      mpCost: 35,
      stoneCost: 45,
      reqs: [
        { slotType: 'herb', minTier: 2, count: 2, label: '二阶灵药' },
        { slotType: 'monster_loot', minTier: 1, count: 1, label: '妖兽材料' },
      ],
      reqText: '二阶灵药 ×2 ＋ 妖兽材料 ×1 ＋ 45 低阶灵石 ＋ 35 灵力',
      effectText: '服用后立即恢复 220 点气血',
      output: {
        id: 'pill_guiyuan',
        name: '归元丹',
        icon: '归',
        slotType: 'pill',
        realmLabel: '筑基期丹药',
        tier: 2,
        healHp: 220,
        healMp: 0,
        count: 1,
        desc: '筑基期回血丹药 · 固本培元、生肌续脉，服用后立即恢复 220 点气血。',
      },
    },
    {
      id: 'pill_jumai',
      name: '聚脉丹',
      tierLabel: '筑基 · 二品回灵丹',
      requiredRealm: 'zhuji',
      icon: '聚',
      mpCost: 35,
      stoneCost: 45,
      reqs: [
        { slotType: 'herb', minTier: 2, count: 2, label: '二阶灵药' },
        { slotType: 'monster_loot', minTier: 1, count: 1, label: '妖兽材料' },
      ],
      reqText: '二阶灵药 ×2 ＋ 妖兽材料 ×1 ＋ 45 低阶灵石 ＋ 35 灵力',
      effectText: '服用后立即恢复 220 点灵力',
      output: {
        id: 'pill_jumai',
        name: '聚脉丹',
        icon: '聚',
        slotType: 'pill',
        realmLabel: '筑基期丹药',
        tier: 2,
        healHp: 0,
        healMp: 220,
        count: 1,
        desc: '筑基期回灵丹药 · 灵气醇厚绵长，服用后立即恢复 220 点灵力。',
      },
    },
    {
      id: 'pill_zhuji_ningyuan',
      name: '筑基凝元丹',
      tierLabel: '筑基 · 二品玄丹',
      requiredRealm: 'zhuji',
      icon: '玄',
      mpCost: 45,
      stoneCost: 80,
      reqs: [
        { slotType: 'herb', minTier: 2, count: 3, label: '二阶灵药' },
        { slotType: 'monster_loot', minTier: 2, count: 1, label: '二阶妖兽材料' },
      ],
      reqText: '二阶灵药 ×3 ＋ 二阶妖兽材料 ×1 ＋ 80 低阶灵石 ＋ 45 灵力',
      effectText: '服用后恢复 85% 最大气血与 85% 最大灵力',
      output: {
        id: 'pill_zhuji_ningyuan',
        name: '筑基凝元丹',
        icon: '玄',
        slotType: 'pill',
        realmLabel: '筑基期丹药',
        tier: 2,
        healHpPct: 0.85,
        healMpPct: 0.85,
        count: 1,
        desc: '筑基期上乘玄丹 · 丹纹微亮，服用后立即恢复 85% 气血与灵力。',
      },
    },
  ];

  const FORGING_RECIPES = [
    // --- 练气期炼器 (requiredRealm: 'lianqi') ---
    {
      id: 'forge_fulu_jixing',
      name: '疾行符 ×2',
      tierLabel: '练气 · 移速灵符',
      requiredRealm: 'lianqi',
      icon: '疾',
      mpCost: 20,
      stoneCost: 12,
      reqs: [
        { slotType: 'herb', minTier: 1, count: 1, label: '一阶灵药' },
        { slotType: 'ore', minTier: 1, count: 1, label: '一阶灵矿' },
      ],
      reqText: '一阶灵药 ×1 ＋ 一阶灵矿 ×1 ＋ 12 低阶灵石 ＋ 20 灵力',
      effectText: '激发后移动速度 +22%，持续 18 秒（一次成符 2 张）',
      output: {
        id: 'fulu_jixing',
        name: '疾行符',
        icon: '疾',
        slotType: 'fulu',
        realmLabel: '练气期符箓',
        tier: 1,
        buffKind: 'speed',
        speedBonus: 0.22,
        duration: 18,
        count: 2,
        desc: '练气期身法符箓 · 激发后身轻如燕，移动速度提升 +22%，持续 18 秒。',
      },
    },
    {
      id: 'forge_fulu_powang',
      name: '破妄符 ×2',
      tierLabel: '练气 · 暴击灵符',
      requiredRealm: 'lianqi',
      icon: '破',
      mpCost: 22,
      stoneCost: 15,
      reqs: [
        { slotType: 'ore', minTier: 1, count: 1, label: '一阶灵矿' },
        { slotType: 'monster_loot', minTier: 1, count: 1, label: '一阶妖兽材料' },
      ],
      reqText: '一阶灵矿 ×1 ＋ 一阶妖兽材料 ×1 ＋ 15 低阶灵石 ＋ 22 灵力',
      effectText: '激发后暴击率 +18%（1.5×暴伤），持续 18 秒（一次成符 2 张）',
      output: {
        id: 'fulu_powang',
        name: '破妄符',
        icon: '破',
        slotType: 'fulu',
        realmLabel: '练气期符箓',
        tier: 1,
        buffKind: 'crit',
        critRate: 0.18,
        critMul: 1.50,
        duration: 18,
        count: 2,
        desc: '练气期灵瞳符箓 · 激发后洞悉敌隙，暴击率提升 +18%（暴击造成 1.5× 伤害），持续 18 秒。',
      },
    },
    {
      id: 'forge_sword_qingfeng',
      name: '青锋剑',
      tierLabel: '练气 · 一品灵剑',
      requiredRealm: 'lianqi',
      icon: '青',
      mpCost: 30,
      stoneCost: 35,
      reqs: [
        { slotType: 'ore', minTier: 1, count: 4, label: '一阶灵矿' },
        { slotType: 'monster_loot', minTier: 1, count: 2, label: '一阶妖兽材料' },
      ],
      reqText: '一阶灵矿 ×4 ＋ 一阶妖兽材料 ×2 ＋ 35 低阶灵石 ＋ 30 灵力',
      effectText: '锻成一品飞剑「青锋剑」，装备后可低空御剑飞行',
      outputRef: { kind: 'flyingSword', id: 'sword_qingfeng' },
    },
    {
      id: 'forge_qingfeng_needle',
      name: '青锋针',
      tierLabel: '练气 · 攻击法宝',
      requiredRealm: 'lianqi',
      icon: '针',
      mpCost: 30,
      stoneCost: 40,
      reqs: [
        { slotType: 'ore', minTier: 1, count: 3, label: '一阶灵矿' },
        { slotType: 'monster_loot', minTier: 1, count: 2, label: '一阶妖兽材料' },
      ],
      reqText: '一阶灵矿 ×3 ＋ 一阶妖兽材料 ×2 ＋ 40 低阶灵石 ＋ 30 灵力',
      effectText: '锻成练气攻击法宝「青锋针」，疾刺穿敌',
      outputRef: { kind: 'treasure', id: 'qingfeng_needle' },
    },
    {
      id: 'forge_xuangui_shield',
      name: '玄龟小盾',
      tierLabel: '练气 · 防御法宝',
      requiredRealm: 'lianqi',
      icon: '盾',
      mpCost: 30,
      stoneCost: 40,
      reqs: [
        { slotType: 'ore', minTier: 1, count: 4, label: '一阶灵矿' },
        { slotType: 'monster_loot', minTier: 1, count: 2, label: '一阶妖兽材料' },
      ],
      reqText: '一阶灵矿 ×4 ＋ 一阶妖兽材料 ×2 ＋ 40 低阶灵石 ＋ 30 灵力',
      effectText: '锻成练气防御法宝「玄龟小盾」，生成护体龟甲盾',
      outputRef: { kind: 'treasure', id: 'xuangui_shield' },
    },
    // --- 筑基期炼器 (requiredRealm: 'zhuji' — 练气期无法锻造!) ---
    {
      id: 'forge_fulu_yufeng',
      name: '御风符 ×2',
      tierLabel: '筑基 · 移速灵符',
      requiredRealm: 'zhuji',
      icon: '风',
      mpCost: 35,
      stoneCost: 35,
      reqs: [
        { slotType: 'herb', minTier: 2, count: 1, label: '二阶灵药' },
        { slotType: 'ore', minTier: 2, count: 1, label: '筑基灵矿' },
      ],
      reqText: '二阶灵药 ×1 ＋ 筑基灵矿 ×1 ＋ 35 低阶灵石 ＋ 35 灵力',
      effectText: '激发后移动速度 +35%，持续 25 秒（一次成符 2 张）',
      output: {
        id: 'fulu_yufeng',
        name: '御风符',
        icon: '风',
        slotType: 'fulu',
        realmLabel: '筑基期符箓',
        tier: 2,
        buffKind: 'speed',
        speedBonus: 0.35,
        duration: 25,
        count: 2,
        desc: '筑基期身法符箓 · 激发后清风托足，移动速度提升 +35%，持续 25 秒。',
      },
    },
    {
      id: 'forge_fulu_zhane',
      name: '斩厄符 ×2',
      tierLabel: '筑基 · 暴击灵符',
      requiredRealm: 'zhuji',
      icon: '斩',
      mpCost: 38,
      stoneCost: 40,
      reqs: [
        { slotType: 'ore', minTier: 2, count: 1, label: '筑基灵矿' },
        { slotType: 'monster_loot', minTier: 2, count: 1, label: '二阶妖兽材料' },
      ],
      reqText: '筑基灵矿 ×1 ＋ 二阶妖兽材料 ×1 ＋ 40 低阶灵石 ＋ 38 灵力',
      effectText: '激发后暴击率 +30%（1.65×暴伤），持续 25 秒（一次成符 2 张）',
      output: {
        id: 'fulu_zhane',
        name: '斩厄符',
        icon: '斩',
        slotType: 'fulu',
        realmLabel: '筑基期符箓',
        tier: 2,
        buffKind: 'crit',
        critRate: 0.30,
        critMul: 1.65,
        duration: 25,
        count: 2,
        desc: '筑基期锋锐符箓 · 激发后杀伐凌厉，暴击率提升 +30%（暴击造成 1.65× 伤害），持续 25 秒。',
      },
    },
    {
      id: 'forge_sword_liuyun',
      name: '流云剑',
      tierLabel: '筑基 · 二品灵剑',
      requiredRealm: 'zhuji',
      icon: '云',
      mpCost: 40,
      stoneCost: 90,
      reqs: [
        { slotType: 'ore', minTier: 2, count: 3, label: '筑基灵矿' },
        { slotType: 'monster_loot', minTier: 1, count: 3, label: '妖兽材料' },
      ],
      reqText: '筑基灵矿 ×3 ＋ 妖兽材料 ×3 ＋ 90 低阶灵石 ＋ 40 灵力',
      effectText: '锻成二品飞剑「流云剑」，御剑速度与限高显著提升',
      outputRef: { kind: 'flyingSword', id: 'sword_liuyun' },
    },
    {
      id: 'forge_sword_jinghong',
      name: '惊鸿剑',
      tierLabel: '筑基 · 三品灵剑',
      requiredRealm: 'zhuji',
      icon: '鸿',
      mpCost: 55,
      stoneCost: 180,
      reqs: [
        { slotType: 'ore', minTier: 2, count: 5, label: '筑基灵矿' },
        { slotType: 'monster_loot', minTier: 2, count: 3, label: '二阶妖兽材料' },
      ],
      reqText: '筑基灵矿 ×5 ＋ 二阶妖兽材料 ×3 ＋ 180 低阶灵石 ＋ 55 灵力',
      effectText: '锻成三品极品飞剑「惊鸿剑」，凌霄高飞、遁速极快',
      outputRef: { kind: 'flyingSword', id: 'sword_jinghong' },
    },
    {
      id: 'forge_liehuo_gourd',
      name: '烈火葫芦',
      tierLabel: '筑基 · 攻击法宝',
      requiredRealm: 'zhuji',
      icon: '葫',
      mpCost: 45,
      stoneCost: 110,
      reqs: [
        { slotType: 'ore', minTier: 2, count: 3, label: '筑基灵矿' },
        { slotType: 'monster_loot', minTier: 2, count: 2, label: '二阶妖兽材料' },
      ],
      reqText: '筑基灵矿 ×3 ＋ 二阶妖兽材料 ×2 ＋ 110 低阶灵石 ＋ 45 灵力',
      effectText: '锻成筑基攻击法宝「烈火葫芦」，喷涌范围炎火',
      outputRef: { kind: 'treasure', id: 'liehuo_gourd' },
    },
    {
      id: 'forge_zhenshan_seal',
      name: '镇山印',
      tierLabel: '筑基 · 攻击法宝',
      requiredRealm: 'zhuji',
      icon: '印',
      mpCost: 50,
      stoneCost: 130,
      reqs: [
        { slotType: 'ore', minTier: 2, count: 4, label: '筑基灵矿' },
        { slotType: 'monster_loot', minTier: 2, count: 2, label: '二阶妖兽材料' },
      ],
      reqText: '筑基灵矿 ×4 ＋ 二阶妖兽材料 ×2 ＋ 130 低阶灵石 ＋ 50 灵力',
      effectText: '锻成筑基重宝「镇山印」，巨印镇压并震晕群敌',
      outputRef: { kind: 'treasure', id: 'zhenshan_seal' },
    },
    {
      id: 'forge_jingang_bell',
      name: '金刚铃',
      tierLabel: '筑基 · 防御法宝',
      requiredRealm: 'zhuji',
      icon: '铃',
      mpCost: 45,
      stoneCost: 110,
      reqs: [
        { slotType: 'ore', minTier: 2, count: 3, label: '筑基灵矿' },
        { slotType: 'monster_loot', minTier: 2, count: 2, label: '二阶妖兽材料' },
      ],
      reqText: '筑基灵矿 ×3 ＋ 二阶妖兽材料 ×2 ＋ 110 低阶灵石 ＋ 45 灵力',
      effectText: '锻成筑基防御法宝「金刚铃」，音波震退并高额减伤',
      outputRef: { kind: 'treasure', id: 'jingang_bell' },
    },
    {
      id: 'forge_liuyun_scarf',
      name: '流云帕',
      tierLabel: '筑基 · 防御法宝',
      requiredRealm: 'zhuji',
      icon: '帕',
      mpCost: 45,
      stoneCost: 115,
      reqs: [
        { slotType: 'ore', minTier: 2, count: 3, label: '筑基灵矿' },
        { slotType: 'monster_loot', minTier: 2, count: 2, label: '二阶妖兽材料' },
      ],
      reqText: '筑基灵矿 ×3 ＋ 二阶妖兽材料 ×2 ＋ 115 低阶灵石 ＋ 45 灵力',
      effectText: '锻成筑基身法防宝「流云帕」，流云护幕闪避增速',
      outputRef: { kind: 'treasure', id: 'liuyun_scarf' },
    },
  ];

  // =========================================================================
  // 3. PURE-CODE 3D MESH BUILDER (12 floats/vert: pos3, nrm3, col3, rough, emissive, partId)
  // =========================================================================
  class FurnaceMeshBuilder {
    constructor() {
      this.verts = [];
      this.indices = [];
      this.vCount = 0;
    }

    pushV(x, y, z, nx, ny, nz, col, rough, emissive, partId) {
      const len = Math.hypot(nx, ny, nz) || 1;
      this.verts.push(
        x, y, z,
        nx / len, ny / len, nz / len,
        col[0], col[1], col[2],
        rough, emissive, partId
      );
      return this.vCount++;
    }

    addTri(a, b, c) {
      this.indices.push(a, b, c);
    }

    addQuad(a, b, c, d) {
      this.indices.push(a, b, c, a, c, d);
    }

    addBox(cx, cy, cz, hx, hy, hz, col, rough = 0.45, emissive = 0.0, rotX = 0, rotY = 0, rotZ = 0, topCol = null, botCol = null) {
      const sx = Math.sin(rotX), cxR = Math.cos(rotX);
      const sy = Math.sin(rotY), cyR = Math.cos(rotY);
      const sz = Math.sin(rotZ), czR = Math.cos(rotZ);
      const xform = (lx, ly, lz, isN) => {
        let x1 = lx * czR - ly * sz, y1 = lx * sz + ly * czR, z1 = lz;
        let x2 = x1, y2 = y1 * cxR - z1 * sx, z2 = y1 * sx + z1 * cxR;
        let x3 = x2 * cyR + z2 * sy, y3 = y2, z3 = -x2 * sy + z2 * cyR;
        return isN ? [x3, y3, z3] : [cx + x3, cy + y3, cz + z3];
      };
      const cTop = topCol || col;
      const cBot = botCol || [col[0] * 0.78, col[1] * 0.78, col[2] * 0.78];
      const faces = [
        { n: [ 0,  0,  1], pts: [[-hx, -hy,  hz], [ hx, -hy,  hz], [ hx,  hy,  hz], [-hx,  hy,  hz]] },
        { n: [ 0,  0, -1], pts: [[ hx, -hy, -hz], [-hx, -hy, -hz], [-hx,  hy, -hz], [ hx,  hy, -hz]] },
        { n: [ 1,  0,  0], pts: [[ hx, -hy,  hz], [ hx, -hy, -hz], [ hx,  hy, -hz], [ hx,  hy,  hz]] },
        { n: [-1,  0,  0], pts: [[-hx, -hy, -hz], [-hx, -hy,  hz], [-hx,  hy,  hz], [-hx,  hy, -hz]] },
        { n: [ 0,  1,  0], pts: [[-hx,  hy,  hz], [ hx,  hy,  hz], [ hx,  hy, -hz], [-hx,  hy, -hz]] },
        { n: [ 0, -1,  0], pts: [[-hx, -hy, -hz], [ hx, -hy, -hz], [ hx, -hy,  hz], [-hx, -hy,  hz]] },
      ];
      for (const f of faces) {
        const wn = xform(f.n[0], f.n[1], f.n[2], true);
        const ids = [];
        for (const p of f.pts) {
          const wp = xform(p[0], p[1], p[2], false);
          const cc = p[1] > 0 ? cTop : cBot;
          ids.push(this.pushV(wp[0], wp[1], wp[2], wn[0], wn[1], wn[2], cc, rough, emissive, 0.0));
        }
        this.addQuad(ids[0], ids[1], ids[2], ids[3]);
      }
    }

    // Lathe surface around Y-axis: rings = [{ y, r, col, rough, emissive }]
    addLathe(cx, cz, rings, segs = 20, capBot = true, capTop = true) {
      const nR = rings.length;
      if (nR < 2) return;
      const startV = this.vCount;
      const stride = segs + 1;
      for (let ir = 0; ir < nR; ir++) {
        const cur = rings[ir];
        const prev = rings[Math.max(0, ir - 1)];
        const next = rings[Math.min(nR - 1, ir + 1)];
        const dy = next.y - prev.y;
        const dr = next.r - prev.r;
        const ny = -dr;
        const nr = dy >= 0 ? Math.max(0.001, dy) : Math.min(-0.001, dy);
        for (let is = 0; is <= segs; is++) {
          const a = (is / segs) * Math.PI * 2;
          const ca = Math.cos(a), sa = Math.sin(a);
          this.pushV(
            cx + ca * cur.r, cur.y, cz + sa * cur.r,
            ca * nr, ny, sa * nr,
            cur.col, cur.rough !== undefined ? cur.rough : 0.40, cur.emissive || 0.0, 0.0
          );
        }
      }
      for (let ir = 0; ir < nR - 1; ir++) {
        for (let is = 0; is < segs; is++) {
          const a = startV + ir * stride + is;
          const b = a + 1;
          const c = a + stride + 1;
          const d = a + stride;
          this.addQuad(a, b, c, d);
        }
      }
      if (capBot && rings[0].r > 0.005) {
        const r0 = rings[0];
        const cIdx = this.pushV(cx, r0.y, cz, 0, -1, 0, r0.col, r0.rough || 0.45, r0.emissive || 0, 0);
        const rStart = this.vCount;
        for (let is = 0; is <= segs; is++) {
          const a = (is / segs) * Math.PI * 2;
          this.pushV(cx + Math.cos(a) * r0.r, r0.y, cz + Math.sin(a) * r0.r, 0, -1, 0, r0.col, r0.rough || 0.45, r0.emissive || 0, 0);
        }
        for (let is = 0; is < segs; is++) this.addTri(cIdx, rStart + is, rStart + is + 1);
      }
      if (capTop && rings[nR - 1].r > 0.005) {
        const r1 = rings[nR - 1];
        const cIdx = this.pushV(cx, r1.y, cz, 0, 1, 0, r1.col, r1.rough || 0.45, r1.emissive || 0, 0);
        const rStart = this.vCount;
        for (let is = 0; is <= segs; is++) {
          const a = (is / segs) * Math.PI * 2;
          this.pushV(cx + Math.cos(a) * r1.r, r1.y, cz + Math.sin(a) * r1.r, 0, 1, 0, r1.col, r1.rough || 0.45, r1.emissive || 0, 0);
        }
        for (let is = 0; is < segs; is++) this.addTri(cIdx, rStart + is + 1, rStart + is);
      }
    }

    // Horizontal Torus Ring around Y-axis
    addTorusY(cx, cy, cz, majorR, minorR, segs = 24, tubeSegs = 10, col = [0.9, 0.75, 0.3], rough = 0.26, emissive = 0.0) {
      const startV = this.vCount;
      const stride = tubeSegs + 1;
      for (let i = 0; i <= segs; i++) {
        const u = (i / segs) * Math.PI * 2;
        const cu = Math.cos(u), su = Math.sin(u);
        for (let j = 0; j <= tubeSegs; j++) {
          const v = (j / tubeSegs) * Math.PI * 2;
          const cv = Math.cos(v), sv = Math.sin(v);
          const rr = majorR + cv * minorR;
          this.pushV(
            cx + cu * rr, cy + sv * minorR, cz + su * rr,
            cu * cv, sv, su * cv,
            col, rough, emissive, 0.0
          );
        }
      }
      for (let i = 0; i < segs; i++) {
        for (let j = 0; j < tubeSegs; j++) {
          const a = startV + i * stride + j;
          const b = a + stride;
          this.addQuad(a, b, b + 1, a + 1);
        }
      }
    }

    // Arbitrary curved tube along 3D polyline: pts = [{ p:[x,y,z], r, col }]
    addTube(pts, segs = 10, rough = 0.42, emissive = 0.0) {
      if (pts.length < 2) return;
      const startV = this.vCount;
      const stride = segs + 1;
      for (let i = 0; i < pts.length; i++) {
        const cur = pts[i];
        const prev = pts[Math.max(0, i - 1)].p;
        const next = pts[Math.min(pts.length - 1, i + 1)].p;
        let tx = next[0] - prev[0], ty = next[1] - prev[1], tz = next[2] - prev[2];
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl; ty /= tl; tz /= tl;
        let rx = 0, ry = 1, rz = 0;
        if (Math.abs(ty) > 0.90) { rx = 1; ry = 0; rz = 0; }
        let ux = ry * tz - rz * ty, uy = rz * tx - rx * tz, uz = rx * ty - ry * tx;
        const ul = Math.hypot(ux, uy, uz) || 1;
        ux /= ul; uy /= ul; uz /= ul;
        const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
        for (let j = 0; j <= segs; j++) {
          const a = (j / segs) * Math.PI * 2;
          const ca = Math.cos(a), sa = Math.sin(a);
          const nx = ux * ca + vx * sa;
          const ny = uy * ca + vy * sa;
          const nz = uz * ca + vz * sa;
          this.pushV(
            cur.p[0] + nx * cur.r, cur.p[1] + ny * cur.r, cur.p[2] + nz * cur.r,
            nx, ny, nz,
            cur.col, rough, emissive, 0.0
          );
        }
      }
      for (let i = 0; i < pts.length - 1; i++) {
        for (let j = 0; j < segs; j++) {
          const a = startV + i * stride + j;
          const b = a + stride;
          this.addQuad(a, a + 1, b + 1, b);
        }
      }
    }

    addEllipsoid(cx, cy, cz, rx, ry, rz, uSegs, vSegs, col, rough = 0.42, emissive = 0.0) {
      const startV = this.vCount;
      const stride = uSegs + 1;
      for (let iv = 0; iv <= vSegs; iv++) {
        const phi = (iv / vSegs) * Math.PI;
        const sp = Math.sin(phi), cp = Math.cos(phi);
        for (let iu = 0; iu <= uSegs; iu++) {
          const th = (iu / uSegs) * Math.PI * 2;
          const nx = sp * Math.cos(th), ny = cp, nz = sp * Math.sin(th);
          this.pushV(cx + nx * rx, cy + ny * ry, cz + nz * rz, nx / (rx || 1), ny / (ry || 1), nz / (rz || 1), col, rough, emissive, 0.0);
        }
      }
      for (let iv = 0; iv < vSegs; iv++) {
        for (let iu = 0; iu < uSegs; iu++) {
          const a = startV + iv * stride + iu;
          const b = a + stride;
          this.addQuad(a, b, b + 1, a + 1);
        }
      }
    }

    // Tapered flame cone / horn along arbitrary vector
    addCone(p0, p1, r0, r1, segs, col0, col1, rough = 0.35, emissive = 0.0) {
      let dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
      const len = Math.hypot(dx, dy, dz) || 1;
      dx /= len; dy /= len; dz /= len;
      let rx = 0, ry = 1, rz = 0;
      if (Math.abs(dy) > 0.90) { rx = 1; ry = 0; rz = 0; }
      let ux = ry * dz - rz * dy, uy = rz * dx - rx * dz, uz = rx * dy - ry * dx;
      const ul = Math.hypot(ux, uy, uz) || 1;
      ux /= ul; uy /= ul; uz /= ul;
      const vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
      const startV = this.vCount;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const nx = ux * ca + vx * sa, ny = uy * ca + vy * sa, nz = uz * ca + vz * sa;
        this.pushV(p0[0] + nx * r0, p0[1] + ny * r0, p0[2] + nz * r0, nx, ny, nz, col0, rough, emissive, 0);
        this.pushV(p1[0] + nx * r1, p1[1] + ny * r1, p1[2] + nz * r1, nx, ny, nz, col1, rough, emissive, 0);
      }
      for (let i = 0; i < segs; i++) {
        const a = startV + i * 2;
        this.addQuad(a, a + 1, a + 3, a + 2);
      }
    }

    build() {
      return {
        vertices: new Float32Array(this.verts),
        indices: this.vCount > 65535 ? new Uint32Array(this.indices) : new Uint16Array(this.indices),
      };
    }
  }

  // =========================================================================
  // 4A. 炼丹炉 3D MODEL
  //     三足圆腹古朴青铜鼎 + 两道金色圆环 + 微亮青玉牌 + 两侧半圆双耳
  //     + 半球形炉盖与葫芦提钮 + 炉底暖橙丹火基座
  // =========================================================================
  function buildAlchemyFurnaceMesh() {
    const b = new FurnaceMeshBuilder();
    const bronzeDark  = [0.16, 0.25, 0.22];
    const bronzeBody  = [0.24, 0.37, 0.32];
    const bronzeLight = [0.33, 0.46, 0.39];
    const goldBright  = [0.95, 0.78, 0.30];
    const goldDeep    = [0.76, 0.58, 0.22];
    const jadeGlow    = [0.34, 0.96, 0.84];
    const fireCore    = [1.00, 0.84, 0.32];
    const fireOrange  = [1.00, 0.48, 0.12];
    const emberDark   = [0.22, 0.14, 0.10];

    // 1. 三足 (3 curved sturdy cast-bronze tripod legs at 30°, 150°, 270° so front +Z stays cleanly framed!)
    const legAngles = [Math.PI * 0.18, Math.PI * 0.82, Math.PI * 1.50];
    for (const a of legAngles) {
      const ca = Math.cos(a), sa = Math.sin(a);
      b.addTube([
        { p: [ca * 0.66, 0.04, sa * 0.66], r: 0.165, col: bronzeDark },
        { p: [ca * 0.62, 0.22, sa * 0.62], r: 0.125, col: bronzeBody },
        { p: [ca * 0.58, 0.52, sa * 0.58], r: 0.145, col: bronzeBody },
        { p: [ca * 0.50, 0.82, sa * 0.50], r: 0.160, col: bronzeLight },
      ], 10, 0.40, 0.0);
      // Decorative gold leg collar cuff
      b.addEllipsoid(ca * 0.60, 0.44, sa * 0.60, 0.155, 0.055, 0.155, 10, 6, goldDeep, 0.28, 0.04);
      // Grounded cast-bronze foot pad
      b.addEllipsoid(ca * 0.67, 0.05, sa * 0.67, 0.18, 0.06, 0.18, 10, 6, bronzeDark, 0.45, 0.0);
    }

    // 2. 炉底暖橙色丹火火盆与核心火簇 (Warm orange pill-fire burning beneath cauldron belly!)
    b.addLathe(0, 0, [
      { y: 0.00, r: 0.42, col: emberDark, rough: 0.85 },
      { y: 0.09, r: 0.46, col: bronzeDark, rough: 0.55 },
      { y: 0.12, r: 0.36, col: fireOrange, rough: 0.20, emissive: 1.05 },
    ], 16, true, true);
    // Central glowing warm-orange flame cluster + 5 dancing perimeter flame tongues
    b.addCone([0, 0.10, 0], [0, 0.56, 0], 0.24, 0.03, 10, fireOrange, fireCore, 0.18, 1.45);
    for (let k = 0; k < 5; k++) {
      const ka = (k / 5) * Math.PI * 2 + 0.3;
      const r0 = 0.18;
      b.addCone(
        [Math.cos(ka) * r0, 0.10, Math.sin(ka) * r0],
        [Math.cos(ka) * 0.24, 0.38 + (k % 2) * 0.10, Math.sin(ka) * 0.24],
        0.11, 0.02, 7, fireOrange, fireCore, 0.20, 1.30
      );
    }

    // 3. 圆腹古朴青铜鼎身 (Smooth rounded bulbous antique bronze cauldron belly y = 0.54..1.65)
    b.addLathe(0, 0, [
      { y: 0.54, r: 0.34, col: bronzeDark,  rough: 0.44 },
      { y: 0.64, r: 0.60, col: bronzeDark,  rough: 0.42 },
      { y: 0.80, r: 0.76, col: bronzeBody,  rough: 0.38 },
      { y: 1.02, r: 0.84, col: bronzeBody,  rough: 0.36 },
      { y: 1.24, r: 0.83, col: bronzeLight, rough: 0.35 },
      { y: 1.44, r: 0.73, col: bronzeBody,  rough: 0.36 },
      { y: 1.56, r: 0.62, col: bronzeDark,  rough: 0.38 },
      { y: 1.63, r: 0.67, col: bronzeLight, rough: 0.34 },
      { y: 1.66, r: 0.64, col: goldDeep,    rough: 0.28 },
    ], 24, true, true);

    // 4. 炉身两道金色圆环 (Two bright raised gold circular rings wrapping the rounded belly!)
    b.addTorusY(0, 0.88, 0, 0.805, 0.036, 26, 10, goldBright, 0.22, 0.08);
    b.addTorusY(0, 1.42, 0, 0.748, 0.036, 26, 10, goldBright, 0.22, 0.08);

    // 5. 正面一块微亮青玉牌 (Slightly glowing pale cyan-jade tablet set in gold bezel on front +Z!)
    b.addBox(0, 1.15, 0.83, 0.21, 0.25, 0.045, goldBright, 0.24, 0.08, 0, 0, 0, goldBright, goldDeep);
    b.addBox(0, 1.15, 0.86, 0.16, 0.20, 0.032, jadeGlow, 0.18, 0.72, 0, 0, 0, jadeGlow, [0.22, 0.78, 0.68]);
    // Fine vertical gold rune accent on the jade plaque
    b.addBox(0, 1.15, 0.892, 0.018, 0.13, 0.008, goldBright, 0.20, 0.25);

    // 6. 两侧半圆双耳 (Semicircular twin bronze ear handles curving cleanly from left -X & right +X!)
    for (const side of [-1, 1]) {
      const earPts = [];
      const earSegs = 10;
      for (let i = 0; i <= earSegs; i++) {
        const t = i / earSegs;
        const ang = -Math.PI * 0.48 + t * Math.PI * 0.96; // bottom -> outward -> top semicircle
        const ex = side * (0.76 + Math.cos(ang) * 0.28);
        const ey = 1.38 + Math.sin(ang) * 0.24;
        earPts.push({ p: [ex, ey, 0], r: 0.056, col: i === 0 || i === earSegs ? goldDeep : bronzeLight });
      }
      b.addTube(earPts, 10, 0.34, 0.0);
    }

    // 7. 半球形炉盖 + 葫芦提钮 (Domed hemispherical bronze lid with slight smoke seam + twin-bulb gourd knob!)
    // Slight 0.025m venting gap above rim (y = 1.685) so pale cyan-white medicinal smoke curls out visibly
    b.addLathe(0, 0, [
      { y: 1.685, r: 0.65, col: goldDeep,    rough: 0.28 },
      { y: 1.72,  r: 0.64, col: bronzeBody,  rough: 0.36 },
      { y: 1.82,  r: 0.57, col: bronzeBody,  rough: 0.36 },
      { y: 1.93,  r: 0.44, col: bronzeLight, rough: 0.34 },
      { y: 2.02,  r: 0.26, col: bronzeLight, rough: 0.34 },
      { y: 2.07,  r: 0.09, col: goldBright,  rough: 0.24 },
    ], 22, true, false);
    // Subtle gold ring accent on lid shoulder
    b.addTorusY(0, 1.72, 0, 0.642, 0.024, 24, 8, goldBright, 0.24, 0.06);

    // 葫芦提钮 (Classic twin-bulb gourd knob crowning the hemispherical lid, y = 2.07..2.44!)
    b.addLathe(0, 0, [
      { y: 2.06, r: 0.08, col: goldDeep,   rough: 0.26 },
      { y: 2.13, r: 0.14, col: goldBright, rough: 0.22, emissive: 0.08 }, // Lower gourd bulb
      { y: 2.21, r: 0.065, col: goldDeep,  rough: 0.26 },                 // Pinched gourd waist
      { y: 2.29, r: 0.105, col: goldBright, rough: 0.22, emissive: 0.10 }, // Upper gourd bulb
      { y: 2.36, r: 0.045, col: goldBright, rough: 0.22, emissive: 0.10 },
      { y: 2.43, r: 0.014, col: jadeGlow,  rough: 0.20, emissive: 0.42 }, // Tiny spirit-jade tip
    ], 16, false, true);

    return b.build();
  }

  // =========================================================================
  // 4B. 炼器炉 3D MODEL
  //     四足厚重深黑玄铁方炉 + 棱角分明 + 表面铆钉 + 两个大铁环
  //     + 正面敞开炉膛燃通红暗金地火 + 炉顶收口短烟囱 + 旁置矮墩玄铁打铁砧
  // =========================================================================
  function buildForgingFurnaceMesh() {
    const b = new FurnaceMeshBuilder();
    const ironBlack  = [0.09, 0.10, 0.12]; // 深黑玄铁
    const ironDark   = [0.14, 0.16, 0.19]; // 玄铁厚板
    const ironTrim   = [0.22, 0.24, 0.28]; // 锻铁棱边与铆钉
    const ironSteel  = [0.34, 0.37, 0.42]; // 打铁砧亮钢面
    const woodBase   = [0.22, 0.15, 0.10]; // 砧座厚木墩
    const hearthRed  = [1.00, 0.22, 0.05]; // 通红炉火
    const earthGold  = [1.00, 0.64, 0.14]; // 暗金地火

    // 1. 四足厚重玄铁方足 (4 heavy square angular legs at corners, y = 0..0.44)
    for (const sx of [-0.58, 0.58]) {
      for (const sz of [-0.52, 0.52]) {
        b.addBox(sx, 0.22, sz, 0.18, 0.22, 0.18, ironBlack, 0.52, 0.0, 0, 0, 0, ironDark, ironBlack);
        b.addBox(sx, 0.05, sz, 0.21, 0.05, 0.21, ironTrim, 0.45, 0.0);
      }
    }

    // 2. 厚重深黑玄铁方炉主体（正面敞开炉膛 — 真正凹陷的内膛结构!）
    //    Overall body: X in [-0.78, +0.78], Z in [-0.70, +0.70], Y in [0.44, 1.92]
    //    Open Front Hearth Cavity: X in [-0.46, +0.46], Y in [0.58, 1.48], Z in [-0.36, +0.70]
    // Bottom thick hearth floor slab + protruding front lip sill
    b.addBox(0, 0.51, 0.0, 0.78, 0.08, 0.70, ironDark, 0.50, 0.0, 0, 0, 0, ironTrim, ironBlack);
    b.addBox(0, 0.55, 0.76, 0.56, 0.06, 0.12, ironTrim, 0.44, 0.0); // Protruding front hearth sill
    // Back heavy wall (Z in [-0.70, -0.34])
    b.addBox(0, 1.24, -0.52, 0.78, 0.68, 0.18, ironBlack, 0.52, 0.0, 0, 0, 0, ironDark, ironBlack);
    // Left & Right thick angular side walls (X in [-0.78..-0.46] and [+0.46..+0.78])
    for (const side of [-1, 1]) {
      b.addBox(side * 0.62, 1.24, 0.18, 0.16, 0.68, 0.52, ironBlack, 0.52, 0.0, 0, 0, 0, ironDark, ironBlack);
      // Angular vertical corner reinforcement armor strips
      b.addBox(side * 0.76, 1.18,  0.68, 0.05, 0.74, 0.05, ironTrim, 0.40, 0.0);
      b.addBox(side * 0.76, 1.18, -0.68, 0.05, 0.74, 0.05, ironTrim, 0.40, 0.0);
    }
    // Heavy top lintel forehead above the open hearth (Y in [1.48, 1.92])
    b.addBox(0, 1.70, 0.18, 0.78, 0.22, 0.52, ironDark, 0.48, 0.0, 0, 0, 0, ironTrim, ironBlack);
    // Horizontal heavy iron reinforcement bands around top & bottom perimeter
    b.addBox(0, 1.88, 0.0, 0.82, 0.06, 0.74, ironTrim, 0.40, 0.0);
    b.addBox(0, 0.48, 0.0, 0.82, 0.05, 0.74, ironTrim, 0.42, 0.0);

    // 3. 表面铆钉 (Crisp metallic iron rivets arrayed on front pillars, lintel & side plates!)
    // Front pillar vertical rivets
    for (const side of [-1, 1]) {
      for (let r = 0; r < 4; r++) {
        b.addEllipsoid(side * 0.63, 0.68 + r * 0.24, 0.71, 0.036, 0.036, 0.028, 8, 6, ironSteel, 0.30, 0.0);
      }
      // Side face top & bottom rivet rows
      for (let r = 0; r < 4; r++) {
        const rz = -0.45 + r * 0.30;
        b.addEllipsoid(side * 0.79, 1.78, rz, 0.026, 0.036, 0.036, 8, 6, ironSteel, 0.30, 0.0);
        b.addEllipsoid(side * 0.79, 0.58, rz, 0.026, 0.036, 0.036, 8, 6, ironSteel, 0.30, 0.0);
      }
    }
    // Front upper lintel horizontal rivets
    for (let i = -2; i <= 2; i++) {
      b.addEllipsoid(i * 0.26, 1.72, 0.71, 0.038, 0.038, 0.028, 8, 6, ironSteel, 0.30, 0.0);
    }

    // 4. 两个大铁环 (Two heavy forged dark-iron ring handles mounted on left & right flanks!)
    for (const side of [-1, 1]) {
      // Heavy iron wall boss & clasp
      b.addBox(side * 0.82, 1.24, 0.0, 0.06, 0.14, 0.14, ironTrim, 0.38, 0.0);
      // Heavy hanging iron ring (built in YZ plane hanging down from boss, tilted slightly outward!)
      const ringPts = [];
      const segs = 16;
      const majorR = 0.20;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const ry = 1.04 + Math.cos(a) * majorR;
        const rz = Math.sin(a) * majorR;
        const rx = side * (0.87 + (1.0 - Math.cos(a)) * 0.035);
        ringPts.push({ p: [rx, ry, rz], r: 0.038, col: i % 2 === 0 ? ironTrim : ironDark });
      }
      b.addTube(ringPts, 8, 0.36, 0.0);
    }

    // 5. 敞开炉膛内的通红暗金地火 (Glowing deep crimson & dark-gold earthfire burning inside open hearth!)
    // Glowing coal bed & inner heated backplate
    b.addBox(0, 0.64, 0.14, 0.42, 0.07, 0.42, hearthRed, 0.22, 1.35, 0, 0, 0, earthGold, hearthRed);
    b.addBox(0, 1.02, -0.32, 0.42, 0.36, 0.04, hearthRed, 0.26, 0.95, 0, 0, 0, earthGold, hearthRed);
    // Roaring crimson-gold earthfire flame cones inside hearth
    b.addCone([0, 0.66, 0.16], [0, 1.34, 0.12], 0.26, 0.04, 10, hearthRed, earthGold, 0.18, 1.55);
    b.addCone([-0.20, 0.66, 0.22], [-0.14, 1.18, 0.16], 0.15, 0.03, 8, hearthRed, earthGold, 0.18, 1.40);
    b.addCone([ 0.20, 0.66, 0.20], [ 0.14, 1.22, 0.14], 0.16, 0.03, 8, hearthRed, earthGold, 0.18, 1.42);
    b.addCone([ 0.00, 0.66, 0.34], [ 0.03, 1.06, 0.30], 0.14, 0.02, 7, earthGold, hearthRed, 0.18, 1.35);

    // 6. 炉顶收口带短烟囱 (Tapered angular iron hood + stout square short chimney, y = 1.92..2.74)
    b.addBox(0, 2.04, 0.0, 0.62, 0.12, 0.56, ironDark, 0.48, 0.0, 0, 0, 0, ironTrim, ironBlack);
    b.addBox(0, 2.22, 0.0, 0.44, 0.10, 0.40, ironBlack, 0.50, 0.0, 0, 0, 0, ironDark, ironBlack);
    // Stout square chimney shaft & thick top flange collar
    b.addBox(0, 2.50, 0.0, 0.28, 0.22, 0.28, ironBlack, 0.52, 0.0, 0, 0, 0, ironDark, ironBlack);
    b.addBox(0, 2.71, 0.0, 0.34, 0.05, 0.34, ironTrim, 0.42, 0.0);
    // Subtle glowing ember interior inside chimney mouth
    b.addBox(0, 2.72, 0.0, 0.18, 0.02, 0.18, hearthRed, 0.30, 0.72);

    // 7. 旁边紧挨着的矮墩玄铁打铁砧 (Squat heavy black-iron anvil right beside the furnace at x = +1.36!)
    const ax = 1.36, az = 0.08;
    // Heavy low timber-and-iron anvil block base (y = 0..0.38)
    b.addBox(ax, 0.19, az, 0.36, 0.19, 0.34, woodBase, 0.82, 0.0);
    b.addBox(ax, 0.34, az, 0.38, 0.04, 0.36, ironTrim, 0.44, 0.0);
    b.addBox(ax, 0.08, az, 0.38, 0.04, 0.36, ironTrim, 0.44, 0.0);
    // Squat broad black-iron anvil foot + pinched waist + heavy anvil crown (y = 0.38..0.90)
    b.addBox(ax, 0.44, az, 0.34, 0.07, 0.28, ironBlack, 0.46, 0.0);
    b.addBox(ax, 0.60, az, 0.22, 0.11, 0.19, ironDark, 0.44, 0.0);
    b.addBox(ax, 0.79, az, 0.26, 0.10, 0.36, ironDark, 0.38, 0.0, 0, 0, 0, ironSteel, ironBlack);
    // Polished flat steel striking face on top of the anvil
    b.addBox(ax, 0.90, az, 0.26, 0.025, 0.36, ironSteel, 0.24, 0.0);
    // Tapered forged anvil horn jutting forward (+Z) & heavy square heel (-Z)
    b.addCone([ax, 0.80, az + 0.34], [ax, 0.83, az + 0.72], 0.15, 0.032, 10, ironDark, ironSteel, 0.32, 0.0);
    b.addBox(ax, 0.81, az - 0.42, 0.22, 0.07, 0.12, ironDark, 0.38, 0.0, 0, 0, 0, ironSteel, ironBlack);

    return b.build();
  }

  // =========================================================================
  // 4C. 一阶灵台 (朴素青石矮台 + 草编蒲团 + 淡青聚灵浅纹，默认置放于洞府中央)
  // =========================================================================
  function buildSpiritPlatformT1Mesh() {
    const b = new FurnaceMeshBuilder();
    const stoneDark  = [0.28, 0.32, 0.34];
    const stoneMid   = [0.38, 0.43, 0.44];
    const stoneTop   = [0.46, 0.51, 0.52];
    const runeGlow   = [0.46, 0.94, 0.88];
    const strawBase  = [0.66, 0.56, 0.36];
    const strawWarm  = [0.76, 0.66, 0.44];
    const strawDark  = [0.50, 0.41, 0.25];
    const linenTrim  = [0.24, 0.46, 0.44];

    // 1. 朴素双层青石矮座 (Two-tier rustic unpolished octagonal-round bluestone dais, y = 0..0.25)
    b.addLathe(0, 0, [
      { y: 0.00, r: 1.46, col: stoneDark, rough: 0.88, emissive: 0.0 },
      { y: 0.09, r: 1.46, col: stoneMid,  rough: 0.86, emissive: 0.0 },
      { y: 0.13, r: 1.34, col: stoneTop,  rough: 0.84, emissive: 0.0 },
      { y: 0.14, r: 1.26, col: stoneDark, rough: 0.86, emissive: 0.0 },
      { y: 0.23, r: 1.24, col: stoneMid,  rough: 0.84, emissive: 0.0 },
      { y: 0.25, r: 1.18, col: stoneTop,  rough: 0.82, emissive: 0.0 },
    ], 16, true, true);

    // 2. 底座边缘朴素聚灵浅纹 (Subtle pale-cyan inlaid spirit-gathering ring & 8 cardinal glyph notches)
    b.addTorusY(0, 0.252, 0, 1.04, 0.014, 28, 6, runeGlow, 0.28, 0.72);
    b.addTorusY(0, 0.135, 0, 1.32, 0.011, 24, 6, runeGlow, 0.34, 0.48);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rx = Math.cos(a) * 0.92;
      const rz = Math.sin(a) * 0.92;
      b.addBox(rx, 0.255, rz, 0.045, 0.008, 0.11, runeGlow, 0.26, 0.68, 0, -a, 0);
    }

    // 3. 中央草编蒲团 (Classic round woven-straw Daoist meditation cushion, y = 0.24..0.42)
    // Lower cloth piping trim around cushion base
    b.addTorusY(0, 0.275, 0, 0.70, 0.036, 22, 8, linenTrim, 0.84, 0.0);
    // Plump woven straw cushion body
    b.addLathe(0, 0, [
      { y: 0.25,  r: 0.68, col: strawDark, rough: 0.88, emissive: 0.0 },
      { y: 0.29,  r: 0.74, col: strawBase, rough: 0.88, emissive: 0.0 },
      { y: 0.35,  r: 0.74, col: strawWarm, rough: 0.86, emissive: 0.0 },
      { y: 0.39,  r: 0.68, col: strawWarm, rough: 0.86, emissive: 0.0 },
      { y: 0.415, r: 0.52, col: strawWarm, rough: 0.86, emissive: 0.0 },
      { y: 0.420, r: 0.24, col: strawBase, rough: 0.88, emissive: 0.0 },
    ], 22, true, true);
    // Concentric braided straw weave rings on the cushion top
    b.addTorusY(0, 0.412, 0, 0.50, 0.014, 20, 6, strawBase, 0.88, 0.0);
    b.addTorusY(0, 0.416, 0, 0.30, 0.013, 16, 6, strawDark, 0.88, 0.0);
    b.addEllipsoid(0, 0.410, 0, 0.10, 0.016, 0.10, 12, 6, linenTrim, 0.82, 0.08);

    return b.build();
  }

  // =========================================================================
  // 5. PLACEABLE FURNACE MANAGER (Placement, Solid Collision, Live Flame/Smoke VFX, Picking & Labels)
  // =========================================================================
  class FurnaceSystem {
    constructor(collisionWorld = null) {
      this.collisionWorld = collisionWorld;
      this.defs = FURNACE_DEFS;
      this.defMap = FURNACE_MAP;
      this.meshes = {
        alchemy_furnace: buildAlchemyFurnaceMesh(),
        forging_furnace: buildForgingFurnaceMesh(),
        spirit_platform_t1: buildSpiritPlatformT1Mesh(),
      };
      this.placed = []; // { uid, id, def, x, y, z, yaw, modelMat, colliders, vfxAcc }
      this.nextUid = 1;
      this.drawList = [];
      this.effects = [];
      this.maxEffects = 112;
      this.nearestFurnace = null;
      this.activeMeditatingUid = null;
      this._platformRingMat = M.mat4();
      this._platformRingMat2 = M.mat4();

      // 默认在洞府中央放置「一阶灵台」（点击或按 U 坐上打坐修炼）
      if (T.HIDDEN_MOUNTAINS) {
        const hm = T.HIDDEN_MOUNTAINS;
        this.placeFurnace('spirit_platform_t1', hm.caveX, hm.caveY, hm.caveZ + 8.5, 0.0);
      }
    }

    placeFurnace(id, x, y, z, yaw) {
      const def = this.defMap[id];
      if (!def) return null;
      const colliders = [];
      if (this.collisionWorld) {
        if (id === 'alchemy_furnace') {
          const c = this.collisionWorld.addCylinder(x, y, z, 1.05, 2.38, 'building', false);
          if (c) colliders.push(c);
        } else if (id === 'forging_furnace') {
          // Main heavy iron furnace OBB
          const c1 = this.collisionWorld.addBox(x, y + 1.32, z, 1.72, 2.68, 1.56, yaw, 'building', false);
          if (c1) colliders.push(c1);
          // Squat black-iron anvil OBB right beside the furnace at local (+1.36, +0.08)!
          // Local (+x, +z) transformed by Y-rotation matrix m4ComposeTRS(yaw):
          // wx = x + lx*cos(yaw) + lz*sin(yaw), wz = z - lx*sin(yaw) + lz*cos(yaw)
          const cY = Math.cos(yaw), sY = Math.sin(yaw);
          const ax = x + 1.36 * cY + 0.08 * sY;
          const az = z - 1.36 * sY + 0.08 * cY;
          const c2 = this.collisionWorld.addBox(ax, y + 0.50, az, 0.88, 1.02, 1.15, yaw, 'building', false);
          if (c2) colliders.push(c2);
        } else if (id === 'spirit_platform_t1') {
          // Low walkable bluestone dais step (smoothly walkable, zero snagging!)
          const c = this.collisionWorld.addCylinder(x, y, z, 1.36, 0.25, 'building', true);
          if (c) colliders.push(c);
        }
      }

      const inst = {
        uid: this.nextUid++,
        id,
        def,
        x, y, z, yaw,
        modelMat: M.mat4(),
        colliders,
        vfxAcc: Math.random() * 0.2,
      };
      M.m4ComposeTRS(inst.modelMat, x, y, z, 0, yaw, 0, 1, 1, 1);
      this.placed.push(inst);
      return inst;
    }

    removeFurnace(uid) {
      const idx = this.placed.findIndex((f) => f.uid === uid);
      if (idx < 0) return null;
      const inst = this.placed[idx];
      if (inst.colliders) {
        for (const c of inst.colliders) {
          c.disabled = true;
        }
      }
      this.placed.splice(idx, 1);
      if (this.nearestFurnace && this.nearestFurnace.uid === uid) {
        this.nearestFurnace = null;
      }
      return inst;
    }

    _spawnEffect(opts) {
      if (this.effects.length >= this.maxEffects) this.effects.shift();
      this.effects.push({
        shape: opts.shape || 'orb',
        x: opts.x, y: opts.y, z: opts.z,
        vx: opts.vx || 0, vy: opts.vy || 0, vz: opts.vz || 0,
        rotY: opts.rotY || 0,
        spinY: opts.spinY || 0,
        s0: opts.s0 || 0.14,
        s1: opts.s1 || 0.34,
        age: 0,
        life: opts.life || 1.0,
        col: opts.col || [1.0, 0.6, 0.2],
        alpha: opts.alpha !== undefined ? opts.alpha : 0.55,
        modelMat: M.mat4(),
      });
    }

    update(dt, elapsed, playerPos, paused) {
      const cdt = Math.min(dt, 0.05);
      const px = playerPos[0], py = playerPos[1], pz = playerPos[2];
      this.drawList.length = 0;

      let best = null;
      let bestDist = 7.5;

      for (let i = 0; i < this.placed.length; i++) {
        const f = this.placed[i];
        const dist = Math.hypot(f.x - px, f.z - pz);
        const dy = Math.abs(f.y - py);
        if (dist < bestDist && dy < 4.5) {
          bestDist = dist;
          best = f;
        }
        if (dist < 420.0) {
          const glowPulse = f.id === 'alchemy_furnace'
            ? (0.14 + Math.sin(elapsed * 4.2 + f.uid) * 0.05)
            : (0.20 + Math.sin(elapsed * 5.8 + f.uid) * 0.07);
          this.drawList.push({
            id: f.id,
            modelMat: f.modelMat,
            tint: f.def.tint,
            glow: f.id === 'spirit_platform_t1'
              ? (f.uid === this.activeMeditatingUid ? 0.36 + Math.sin(elapsed * 3.0) * 0.08 : 0.14 + Math.sin(elapsed * 2.2) * 0.04)
              : glowPulse,
          });
        }

        if (!paused && dist < 85.0) {
          f.vfxAcc += cdt;
          const cY = Math.cos(f.yaw), sY = Math.sin(f.yaw);
          const toWorld = (lx, ly, lz) => [
            f.x + lx * cY + lz * sY,
            f.y + ly,
            f.z - lx * sY + lz * cY,
          ];

          if (f.id === 'alchemy_furnace' && f.vfxAcc >= 0.16) {
            f.vfxAcc = 0;
            // Warm orange dancing pill-fire under cauldron belly
            const fa = Math.random() * Math.PI * 2;
            const fr = Math.random() * 0.24;
            const fp = toWorld(Math.cos(fa) * fr, 0.16, Math.sin(fa) * fr);
            this._spawnEffect({
              shape: Math.random() < 0.6 ? 'spike' : 'orb',
              x: fp[0], y: fp[1], z: fp[2],
              vx: (Math.random() - 0.5) * 0.18,
              vy: 0.65 + Math.random() * 0.35,
              vz: (Math.random() - 0.5) * 0.18,
              rotY: Math.random() * Math.PI * 2,
              s0: 0.14, s1: 0.05,
              life: 0.42 + Math.random() * 0.16,
              col: Math.random() < 0.45 ? [1.0, 0.80, 0.30] : [1.0, 0.48, 0.12],
              alpha: 0.72,
            });
            // Faint cyan-white medicinal smoke drifting gently from the lid seam!
            const sa = Math.random() * Math.PI * 2;
            const sp = toWorld(Math.cos(sa) * 0.60, 1.68, Math.sin(sa) * 0.60);
            this._spawnEffect({
              shape: 'orb',
              x: sp[0], y: sp[1], z: sp[2],
              vx: Math.cos(sa) * 0.12 + (Math.random() - 0.5) * 0.14,
              vy: 0.55 + Math.random() * 0.28,
              vz: Math.sin(sa) * 0.12 + (Math.random() - 0.5) * 0.14,
              s0: 0.11, s1: 0.36,
              life: 1.45 + Math.random() * 0.45,
              col: [0.76, 0.96, 0.93],
              alpha: 0.30,
            });
          } else if (f.id === 'forging_furnace' && f.vfxAcc >= 0.14) {
            f.vfxAcc = 0;
            // Deep crimson & dark-gold earthfire roaring inside the open front hearth!
            const hp = toWorld((Math.random() - 0.5) * 0.58, 0.70, 0.22 + Math.random() * 0.24);
            this._spawnEffect({
              shape: Math.random() < 0.65 ? 'spike' : 'orb',
              x: hp[0], y: hp[1], z: hp[2],
              vx: (Math.random() - 0.5) * 0.24,
              vy: 0.95 + Math.random() * 0.55,
              vz: (Math.random() - 0.5) * 0.24,
              rotY: Math.random() * Math.PI * 2,
              s0: 0.17, s1: 0.06,
              life: 0.44 + Math.random() * 0.18,
              col: Math.random() < 0.5 ? [1.0, 0.26, 0.06] : [1.0, 0.66, 0.16],
              alpha: 0.78,
            });
            // Warm cinder & heat smoke curling from the short top chimney!
            if (Math.random() < 0.75) {
              const cp = toWorld((Math.random() - 0.5) * 0.22, 2.74, (Math.random() - 0.5) * 0.22);
              const isSpark = Math.random() < 0.35;
              this._spawnEffect({
                shape: 'orb',
                x: cp[0], y: cp[1], z: cp[2],
                vx: (Math.random() - 0.5) * 0.32,
                vy: isSpark ? (1.35 + Math.random() * 0.55) : (0.72 + Math.random() * 0.32),
                vz: (Math.random() - 0.5) * 0.32,
                s0: isSpark ? 0.055 : 0.15,
                s1: isSpark ? 0.015 : 0.46,
                life: isSpark ? 0.75 : 1.55,
                col: isSpark ? [1.0, 0.64, 0.16] : [0.36, 0.30, 0.28],
                alpha: isSpark ? 0.85 : 0.32,
              });
            }
          } else if (f.id === 'spirit_platform_t1' && f.vfxAcc >= (f.uid === this.activeMeditatingUid ? 0.14 : 0.34)) {
            f.vfxAcc = 0;
            const isMed = f.uid === this.activeMeditatingUid;
            const a = Math.random() * Math.PI * 2;
            const rad = isMed ? (1.15 + Math.random() * 0.45) : (0.85 + Math.random() * 0.55);
            const sx = f.x + Math.cos(a) * rad;
            const sz = f.z + Math.sin(a) * rad;
            // Subtle rising pale-cyan Qi motes around 一阶灵台; gently spiral inward when meditating!
            this._spawnEffect({
              shape: 'orb',
              x: sx, y: f.y + 0.26 + Math.random() * 0.18, z: sz,
              vx: isMed ? (-Math.cos(a) * 0.45 - Math.sin(a) * 0.35) : ((Math.random() - 0.5) * 0.10),
              vy: isMed ? (0.72 + Math.random() * 0.32) : (0.42 + Math.random() * 0.24),
              vz: isMed ? (-Math.sin(a) * 0.45 + Math.cos(a) * 0.35) : ((Math.random() - 0.5) * 0.10),
              s0: isMed ? 0.085 : 0.065,
              s1: 0.012,
              life: isMed ? 1.25 : 1.55,
              col: Math.random() < 0.35 ? [0.84, 0.98, 0.94] : [0.46, 0.94, 0.88],
              alpha: isMed ? 0.62 : 0.36,
            });
            // Subtle pulsing spirit-gathering ground aura ring around the stone dais!
            if (Math.random() < (isMed ? 0.42 : 0.22)) {
              this._spawnEffect({
                shape: 'ring',
                x: f.x, y: f.y + 0.27, z: f.z,
                vx: 0, vy: isMed ? 0.22 : 0.08, vz: 0,
                rotY: elapsed * 1.4,
                spinY: isMed ? 1.8 : 0.8,
                s0: isMed ? 1.15 : 1.26,
                s1: isMed ? 1.72 : 1.48,
                life: isMed ? 1.05 : 1.35,
                col: [0.48, 0.94, 0.88],
                alpha: isMed ? 0.44 : 0.24,
              });
            }
          }
        }
      }
      this.nearestFurnace = best;

      // Tick live flame, smoke & spirit-platform Qi particles
      if (!paused) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
          const ef = this.effects[i];
          ef.age += cdt;
          if (ef.age >= ef.life) {
            this.effects.splice(i, 1);
            continue;
          }
          ef.x += ef.vx * cdt;
          ef.y += ef.vy * cdt;
          ef.z += ef.vz * cdt;
          ef.rotY += ef.spinY * cdt;
          const u = ef.age / ef.life;
          const sc = M.lerp(ef.s0, ef.s1, u);
          M.m4ComposeTRS(ef.modelMat, ef.x, ef.y, ef.z, 0, ef.rotY, 0, sc, sc * (ef.shape === 'spike' ? 1.55 : 1.0), sc);
        }
      }
    }

    // Screen-space direct 3D click picking on nearby placed furnaces!
    pickNearbyFurnaceAtScreenPos(clientX, clientY, cssW, cssH, vpMat, playerPos) {
      if (!vpMat || !playerPos || this.placed.length === 0) return null;
      let best = null;
      let bestScore = 9999;

      for (let i = 0; i < this.placed.length; i++) {
        const f = this.placed[i];
        const distP = Math.hypot(f.x - playerPos[0], f.z - playerPos[2]);
        if (distP > 8.5 || Math.abs(f.y - playerPos[1]) > 4.0) continue;

        const wy = f.y + f.def.height * 0.48;
        const clipX = vpMat[0] * f.x + vpMat[4] * wy + vpMat[8]  * f.z + vpMat[12];
        const clipY = vpMat[1] * f.x + vpMat[5] * wy + vpMat[9]  * f.z + vpMat[13];
        const clipW = vpMat[3] * f.x + vpMat[7] * wy + vpMat[11] * f.z + vpMat[15];
        if (clipW <= 0.2) continue;

        const sx = ((clipX / clipW) * 0.5 + 0.5) * cssW;
        const sy = (0.5 - (clipY / clipW) * 0.5) * cssH;
        const screenDist = Math.hypot(clientX - sx, clientY - sy);
        const hitPx = M.clamp((f.def.colRadius * 680) / Math.max(2.0, clipW), 58, 165);
        if (screenDist <= hitPx && screenDist < bestScore) {
          bestScore = screenDist;
          best = f;
        }
      }
      return best;
    }

    renderLabels(ctx, cssW, cssH, dpr, vpMat, camPos, playerPos) {
      if (!ctx || this.placed.length === 0) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '600 12.5px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < this.placed.length; i++) {
        const f = this.placed[i];
        const distCam = Math.hypot(f.x - camPos[0], f.y - camPos[1], f.z - camPos[2]);
        if (distCam > 48.0) continue;
        const distP = playerPos ? Math.hypot(f.x - playerPos[0], f.z - playerPos[2]) : 99;
        const isNear = distP <= 7.5;

        const wy = f.y + f.def.height + 0.48;
        const clipX = vpMat[0] * f.x + vpMat[4] * wy + vpMat[8]  * f.z + vpMat[12];
        const clipY = vpMat[1] * f.x + vpMat[5] * wy + vpMat[9]  * f.z + vpMat[13];
        const clipW = vpMat[3] * f.x + vpMat[7] * wy + vpMat[11] * f.z + vpMat[15];
        if (clipW <= 0.2) continue;
        const ndcX = clipX / clipW, ndcY = clipY / clipW;
        if (ndcX < -1.05 || ndcX > 1.05 || ndcY < -1.05 || ndcY > 1.05) continue;

        const sx = (ndcX * 0.5 + 0.5) * cssW;
        const sy = (0.5 - ndcY * 0.5) * cssH;
        const alpha = 1.0 - M.smoothstep(32.0, 48.0, distCam);
        if (alpha <= 0.03) continue;

        const isPlat = f.id === 'spirit_platform_t1';
        const isAlch = f.id === 'alchemy_furnace';
        const isMed = isPlat && f.uid === this.activeMeditatingUid;
        const label = isPlat
          ? (isMed ? `${f.def.name} · 打坐修炼中（移动或按 U 起身）` : (isNear ? `${f.def.name} · 点击或按 U 键打坐修炼` : f.def.name))
          : (isNear ? `${f.def.name} · 按 U 键进入${isAlch ? '炼丹' : '炼器'}` : f.def.name);

        ctx.globalAlpha = alpha;
        const tw = ctx.measureText(label).width;
        const bw = Math.ceil(tw + 20), bh = 23;
        const bx = Math.round(sx - bw * 0.5), by = Math.round(sy - bh * 0.5);

        ctx.fillStyle = isNear ? 'rgba(22, 32, 36, 0.88)' : 'rgba(14, 22, 28, 0.74)';
        ctx.strokeStyle = (isAlch || isPlat)
          ? (isNear ? 'rgba(116, 245, 214, 0.92)' : 'rgba(116, 245, 214, 0.55)')
          : (isNear ? 'rgba(255, 168, 92, 0.94)' : 'rgba(255, 168, 92, 0.55)');
        ctx.lineWidth = isNear ? 1.4 : 1.0;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 11);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
        ctx.fillText(label, sx, sy + 1);
        ctx.fillStyle = (isAlch || isPlat) ? '#b8fff0' : '#ffd8a8';
        ctx.fillText(label, sx, sy);
      }
      ctx.restore();
    }
  }

  XW.Furnaces = {
    FURNACE_DEFS,
    FURNACE_MAP,
    ALCHEMY_RECIPES,
    FORGING_RECIPES,
    createFurnaceSystem: (collisionWorld) => new FurnaceSystem(collisionWorld),
  };
})(window);
