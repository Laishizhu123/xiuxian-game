(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;

  // =========================================================================
  // 1. FIVE-ELEMENT QI-REFINING SKILL CATALOG (五行练气期技能 · 开局默认全部学会)
  //    Each element has: 普攻 (basic) + 技能1 (skill1) + 技能2 (skill2)
  //    Balanced for Qi-Refining realm: restrained VFX, crisp windup/recovery, fair MP & CD
  // =========================================================================
  const ELEMENTS = [
    {
      key: 'metal',
      name: '金系',
      short: '金',
      colorCss: '#f2d06b',
      col: [0.98, 0.85, 0.42],
      accentCol: [1.0, 0.94, 0.68],
      skills: [
        {
          id: 'metal_basic',
          slot: 'basic',
          slotLabel: '普攻',
          keyHint: '左键 / J',
          name: '锐金指',
          element: 'metal',
          mpCost: 0,
          cd: 0.85,
          windup: 0.08,
          recovery: 0.14,
          dmgPct: 1.00,
          range: 28.0,
          speed: 44.0,
          castAnim: 'cast_push',
          desc: '射出高速淡金锋芒造成 100% 攻击力伤害，弹道最迅疾、攻速略占优势',
          vfxDesc: '细长亮金光锥弹道，命中溅少量金星',
        },
        {
          id: 'metal_skill1',
          slot: 'skill1',
          slotLabel: '技能1',
          keyHint: 'Q',
          name: '疾金步',
          element: 'metal',
          mpCost: 14,
          cd: 5.5,
          windup: 0.06,
          recovery: 0.12,
          dmgPct: 0,
          dashDist: 8.5,
          dashDur: 0.24,
          dodgeSec: 0.40,
          castAnim: 'dash',
          desc: '短距向前疾冲 8.5m 并获 0.40s 闪避，极轻灵的脱身步法',
          vfxDesc: '身侧掠过两道淡金残影与短促气流线',
        },
        {
          id: 'metal_skill2',
          slot: 'skill2',
          slotLabel: '技能2',
          keyHint: 'E',
          name: '裂金锥',
          element: 'metal',
          mpCost: 22,
          cd: 6.5,
          windup: 0.18,
          recovery: 0.22,
          dmgPct: 2.95,
          range: 30.0,
          speed: 34.0,
          pierce: 3,
          staggerSec: 0.50,
          castAnim: 'cast_push',
          desc: '打出重金锥造成 295% 攻击力穿刺伤害（最多穿透3个目标），附带 0.5s 硬直',
          vfxDesc: '旋转的淡金尖锥弹体，命中炸开一圈金芒',
        },
      ],
      zhujiSkills: [
        {
          id: 'metal_zhuji1',
          realm: 'zhuji',
          slot: 'skill1',
          slotLabel: '筑基1',
          keyHint: 'Q',
          name: '御剑穿心',
          element: 'metal',
          mpCost: 36,
          cd: 8.5,
          windup: 0.18,
          recovery: 0.20,
          dmgPct: 1.55, // 3 flying swords × 155% = 465% ATK total
          range: 34.0,
          speed: 48.0,
          pierce: 2,
          castAnim: 'cast_push',
          desc: '凝出 3 柄亮金飞剑依次刺出，每剑造成 155% 攻击力穿刺伤害（共 3×155%）',
          vfxDesc: '身侧浮现 3 柄亮金细长几何剑影，依次疾射并带短促金光拖尾，命中闪出锐利十字火花',
        },
        {
          id: 'metal_zhuji2',
          realm: 'zhuji',
          slot: 'skill2',
          slotLabel: '筑基2',
          keyHint: 'E',
          name: '金罡护体刃',
          element: 'metal',
          mpCost: 38,
          cd: 12.5,
          windup: 0.14,
          recovery: 0.16,
          dmgPct: 1.95, // reflect 195% ATK
          duration: 7.0,
          damageReduce: 0.30,
          reflectRadius: 5.4,
          castAnim: 'cast_meditate',
          desc: '4 道金刃绕身持续 7 秒，期间减伤 30%，受击外弹金芒造成 195% 攻击力反伤',
          vfxDesc: '4 片淡金菱形剑气围绕主角慢速旋转，受击时外弹一圈细碎金芒',
        },
      ],
    },
    {
      key: 'wood',
      name: '木系',
      short: '木',
      colorCss: '#6ee08e',
      col: [0.42, 0.88, 0.50],
      accentCol: [0.68, 0.96, 0.62],
      skills: [
        {
          id: 'wood_basic',
          slot: 'basic',
          slotLabel: '普攻',
          keyHint: '左键 / J',
          name: '青木弹',
          element: 'wood',
          mpCost: 0,
          cd: 0.95,
          windup: 0.10,
          recovery: 0.15,
          dmgPct: 1.00,
          range: 26.0,
          speed: 32.0,
          slowSec: 2.0,
          slowRatio: 0.75,
          castAnim: 'cast_push',
          desc: '发射翠绿灵弹造成 100% 攻击力伤害，命中附带 2.0 秒 25% 减速',
          vfxDesc: '圆润草绿灵光球，拖着几片小绿叶尾迹',
        },
        {
          id: 'wood_skill1',
          slot: 'skill1',
          slotLabel: '技能1',
          keyHint: 'Q',
          name: '缠根缚',
          element: 'wood',
          mpCost: 18,
          cd: 7.5,
          windup: 0.16,
          recovery: 0.20,
          dmgPct: 2.10,
          range: 18.0,
          aoeRadius: 3.8,
          rootSec: 1.5,
          slowSec: 2.5,
          slowRatio: 0.60,
          castAnim: 'cast_stomp',
          desc: '前方地面窜出藤蔓造成 210% 攻击力范围伤害，定身 1.5 秒并后续减速',
          vfxDesc: '地面窜出 3~4 根青绿根须与小草叶',
        },
        {
          id: 'wood_skill2',
          slot: 'skill2',
          slotLabel: '技能2',
          keyHint: 'E',
          name: '回春诀',
          element: 'wood',
          mpCost: 24,
          cd: 10.5,
          windup: 0.22,
          recovery: 0.24,
          dmgPct: 0,
          healInstantPct: 0.14,
          healOverTimePct: 0.14,
          healDur: 3.0,
          castAnim: 'cast_meditate',
          desc: '短调息立即恢复 14% 最大气血，随后 3.0 秒持续缓回 14% 最大气血',
          vfxDesc: '周身升起柔和淡绿光点与小草叶上浮',
        },
      ],
      zhujiSkills: [
        {
          id: 'wood_zhuji1',
          realm: 'zhuji',
          slot: 'skill1',
          slotLabel: '筑基1',
          keyHint: 'Q',
          name: '青藤绞杀',
          element: 'wood',
          mpCost: 38,
          cd: 10.0,
          windup: 0.20,
          recovery: 0.22,
          dmgPct: 2.00,     // initial 200% ATK
          dotDmgPct: 1.05,  // 4 ticks × 105% ATK
          range: 20.0,
          aoeRadius: 4.6,
          duration: 3.0,
          rootSec: 2.0,
          castAnim: 'cast_stomp',
          desc: '前方窜出带刺青藤定身 2.0 秒，初始 200% 攻击力伤害并 3 秒内 4 段每段 105% 绞杀',
          vfxDesc: '地面亮起翠绿圆环，4 根带小刺的深绿/嫩绿藤蔓交错隆起，伴随绿叶飘落',
        },
        {
          id: 'wood_zhuji2',
          realm: 'zhuji',
          slot: 'skill2',
          slotLabel: '筑基2',
          keyHint: 'E',
          name: '木灵聚气环',
          element: 'wood',
          mpCost: 42,
          cd: 14.0,
          windup: 0.18,
          recovery: 0.18,
          dmgPct: 0,
          healInstantPct: 0.18,
          healOverTimePct: 0.22,
          duration: 5.0,
          speedRatio: 1.20,
          castAnim: 'cast_meditate',
          desc: '生成 5 秒灵木光环，立即回复 18% 最大气血、缓回 22% 最大气血，且移速 +20%',
          vfxDesc: '地面柔和翠绿光环与旋转绿叶，周身升起细密淡绿光点',
        },
      ],
    },
    {
      key: 'water',
      name: '水系',
      short: '水',
      colorCss: '#64c8f6',
      col: [0.42, 0.80, 0.98],
      accentCol: [0.74, 0.93, 1.0],
      skills: [
        {
          id: 'water_basic',
          slot: 'basic',
          slotLabel: '普攻',
          keyHint: '左键 / J',
          name: '清泉弹',
          element: 'water',
          mpCost: 0,
          cd: 0.90,
          windup: 0.09,
          recovery: 0.14,
          dmgPct: 1.00,
          range: 27.0,
          speed: 36.0,
          castAnim: 'cast_push',
          desc: '射出圆润水弹造成 100% 攻击力伤害，出招流畅稳定',
          vfxDesc: '半透明浅蓝水球，命中炸开小水花',
        },
        {
          id: 'water_skill1',
          slot: 'skill1',
          slotLabel: '技能1',
          keyHint: 'Q',
          name: '踏浪滑',
          element: 'water',
          mpCost: 15,
          cd: 6.5,
          windup: 0.06,
          recovery: 0.10,
          dmgPct: 0,
          dashDist: 7.5,
          dashDur: 0.30,
          speedBuffSec: 3.2,
          speedBuffRatio: 1.32,
          castAnim: 'dash',
          desc: '脚底滑行 7.5m 并提升 32% 移速持续 3.2 秒，适合持续拉扯',
          vfxDesc: '脚下铺一抹浅蓝水波纹与小水沫',
        },
        {
          id: 'water_skill2',
          slot: 'skill2',
          slotLabel: '技能2',
          keyHint: 'E',
          name: '涌泉击',
          element: 'water',
          mpCost: 19,
          cd: 6.5,
          windup: 0.14,
          recovery: 0.20,
          dmgPct: 2.55,
          range: 7.0,
          knockback: 4.5,
          castAnim: 'cast_push',
          desc: '身前扇形激起水浪造成 255% 攻击力伤害并将近身敌人震退',
          vfxDesc: '向前扩散一圈半透明水波弧光与水珠',
        },
      ],
      zhujiSkills: [
        {
          id: 'water_zhuji1',
          realm: 'zhuji',
          slot: 'skill1',
          slotLabel: '筑基1',
          keyHint: 'Q',
          name: '惊涛拍岸',
          element: 'water',
          mpCost: 36,
          cd: 9.0,
          windup: 0.18,
          recovery: 0.22,
          dmgPct: 3.45,
          range: 12.0,
          waveWidth: 5.2,
          knockback: 6.2,
          castAnim: 'cast_push',
          desc: '向前推出弧形水墙造成 345% 攻击力水伤并强力击退前方敌人',
          vfxDesc: '半透明浅蓝弧形水墙向前推去，浪尖带小水珠与白色浪花',
        },
        {
          id: 'water_zhuji2',
          realm: 'zhuji',
          slot: 'skill2',
          slotLabel: '筑基2',
          keyHint: 'E',
          name: '寒霜凝滞',
          element: 'water',
          mpCost: 40,
          cd: 11.0,
          windup: 0.20,
          recovery: 0.20,
          dmgPct: 2.15,     // initial 215% ATK
          dotDmgPct: 1.15,  // 3 ticks × 115% ATK
          range: 20.0,
          aoeRadius: 4.8,
          duration: 4.0,
          slowSec: 3.0,
          slowRatio: 0.45,
          castAnim: 'cast_stomp',
          desc: '前方凝出 4 秒冰阵，初始 215% 攻击力伤害、重减速 55% 并持续 3 段每段 115% 寒伤',
          vfxDesc: '地面半透明冰蓝六角冰面，冒出矮小冰棱与淡白寒雾',
        },
      ],
    },
    {
      key: 'fire',
      name: '火系',
      short: '火',
      colorCss: '#ff8a4c',
      col: [1.0, 0.46, 0.18],
      accentCol: [1.0, 0.78, 0.32],
      skills: [
        {
          id: 'fire_basic',
          slot: 'basic',
          slotLabel: '普攻',
          keyHint: '左键 / J',
          name: '炎阳弹',
          element: 'fire',
          mpCost: 0,
          cd: 0.88,
          windup: 0.10,
          recovery: 0.14,
          dmgPct: 1.00,
          range: 27.0,
          speed: 35.0,
          castAnim: 'cast_push',
          desc: '射出亮橙红火球造成 100% 攻击力伤害，节奏紧凑凌厉',
          vfxDesc: '亮橙红小火球，身后带一串小火星',
        },
        {
          id: 'fire_skill1',
          slot: 'skill1',
          slotLabel: '技能1',
          keyHint: 'Q',
          name: '焰遁步',
          element: 'fire',
          mpCost: 15,
          cd: 6.0,
          windup: 0.06,
          recovery: 0.12,
          dmgPct: 0,
          dashDist: 7.5,
          dashDur: 0.22,
          dodgeSec: 0.26,
          castAnim: 'dash',
          desc: '朝面对方向短距突进 7.5m 并获 0.26s 闪避，进退灵活',
          vfxDesc: '位移起点与终点各留一簇小火苗与火星',
        },
        {
          id: 'fire_skill2',
          slot: 'skill2',
          slotLabel: '技能2',
          keyHint: 'E',
          name: '爆炎诀',
          element: 'fire',
          mpCost: 25,
          cd: 7.5,
          windup: 0.20,
          recovery: 0.22,
          dmgPct: 3.15,
          range: 19.0,
          aoeRadius: 4.3,
          castAnim: 'cast_push',
          desc: '在前方范围引爆烈焰，造成 315% 攻击力群体伤害（练气高爆发）',
          vfxDesc: '地上一团亮橙红爆炎球与向外飞散的火星',
        },
      ],
      zhujiSkills: [
        {
          id: 'fire_zhuji1',
          realm: 'zhuji',
          slot: 'skill1',
          slotLabel: '筑基1',
          keyHint: 'Q',
          name: '烈焰爆弹',
          element: 'fire',
          mpCost: 40,
          cd: 8.5,
          windup: 0.22,
          recovery: 0.22,
          dmgPct: 3.95,
          splashDmgPct: 3.10,
          range: 30.0,
          speed: 28.0,
          aoeRadius: 5.2,
          castAnim: 'cast_push',
          desc: '掷出高爆烈焰火球，直击 395% 攻击力伤害并引发 5.2m 范围 310% 爆燃（筑基爆发标杆）',
          vfxDesc: '更大一圈的亮橙红火球拖着明显火尾，炸开扩出橙黄火环与火星',
        },
        {
          id: 'fire_zhuji2',
          realm: 'zhuji',
          slot: 'skill2',
          slotLabel: '筑基2',
          keyHint: 'E',
          name: '炎息燎原',
          element: 'fire',
          mpCost: 44,
          cd: 10.5,
          windup: 0.18,
          recovery: 0.24,
          dmgPct: 1.35, // 4 ticks × 135% ATK
          range: 9.6,
          duration: 2.4,
          castAnim: 'cast_push',
          desc: '身前张开扇形烈焰持续 2.4 秒，造成 4 段每段 135% 攻击力扇面灼烧',
          vfxDesc: '半透明赤红与亮橙扇形火幕，边缘跳动小火苗',
        },
      ],
    },
    {
      key: 'earth',
      name: '土系',
      short: '土',
      colorCss: '#d9b066',
      col: [0.82, 0.65, 0.36],
      accentCol: [0.92, 0.80, 0.54],
      skills: [
        {
          id: 'earth_basic',
          slot: 'basic',
          slotLabel: '普攻',
          keyHint: '左键 / J',
          name: '厚土拳',
          element: 'earth',
          mpCost: 0,
          cd: 1.02,
          windup: 0.14,
          recovery: 0.18,
          dmgPct: 1.00,
          range: 23.0,
          speed: 26.0,
          knockback: 1.6,
          castAnim: 'cast_push',
          desc: '砸出重土灵弹造成 100% 攻击力伤害，攻速略缓但附带微击退',
          vfxDesc: '土黄色圆石/重拳灵力团，带轻微尘土',
        },
        {
          id: 'earth_skill1',
          slot: 'skill1',
          slotLabel: '技能1',
          keyHint: 'Q',
          name: '岩甲诀',
          element: 'earth',
          mpCost: 20,
          cd: 10.5,
          windup: 0.15,
          recovery: 0.16,
          dmgPct: 0,
          shieldPct: 0.26,
          shieldDur: 6.0,
          damageReduce: 0.30,
          castAnim: 'cast_meditate',
          desc: '凝聚 26% 最大气血的土盾持续 6 秒，期间减伤 30%，护盾耗尽碎裂',
          vfxDesc: '体表环绕一层半透明土黄岩块/护盾层',
        },
        {
          id: 'earth_skill2',
          slot: 'skill2',
          slotLabel: '技能2',
          keyHint: 'E',
          name: '地刺震',
          element: 'earth',
          mpCost: 22,
          cd: 8.5,
          windup: 0.20,
          recovery: 0.24,
          dmgPct: 2.50,
          aoeRadius: 5.4,
          knockback: 3.6,
          stunSec: 1.20,
          castAnim: 'cast_stomp',
          desc: '震起周围矮土刺造成 250% 攻击力范围伤害，击退并震晕 1.2 秒',
          vfxDesc: '脚边冒出一圈短小土锥与土黄震波环',
        },
      ],
      zhujiSkills: [
        {
          id: 'earth_zhuji1',
          realm: 'zhuji',
          slot: 'skill1',
          slotLabel: '筑基1',
          keyHint: 'Q',
          name: '厚土重盾',
          element: 'earth',
          mpCost: 40,
          cd: 13.5,
          windup: 0.18,
          recovery: 0.18,
          dmgPct: 0,
          shieldPct: 0.36,
          shieldDur: 7.5,
          damageReduce: 0.40,
          castAnim: 'cast_meditate',
          desc: '升起 4 块灵纹厚岩板护身持续 7.5 秒，提供 36% 最大气血重盾与 40% 减伤',
          vfxDesc: '4 块灰黄/土黄圆角岩板悬浮环绕，表面带微弱暖黄灵纹',
        },
        {
          id: 'earth_zhuji2',
          realm: 'zhuji',
          slot: 'skill2',
          slotLabel: '筑基2',
          keyHint: 'E',
          name: '震地碎岩',
          element: 'earth',
          mpCost: 42,
          cd: 10.5,
          windup: 0.24,
          recovery: 0.26,
          dmgPct: 3.55,
          aoeRadius: 6.6,
          knockback: 5.2,
          stunSec: 1.5,
          castAnim: 'cast_stomp',
          desc: '重击地面震起土石块与震波，造成 355% 攻击力群伤、击退并震晕 1.5 秒',
          vfxDesc: '脚下扩散土黄震波环，周围地面拱起带棱角的土石块',
        },
      ],
    },
  ];

  // =========================================================================
  // 2. PURE-CODE LIGHTWEIGHT UNIT VFX MESHES (6 floats/vert: pos3, nrm3)
  // =========================================================================
  function buildUnitConeZMesh() {
    // Tapered sleek cone pointing along +Z (tip at z=+1, base at z=-0.65)
    const segs = 10;
    const verts = [];
    const indices = [];
    // Tip vertex 0
    verts.push(0, 0, 1.0, 0, 0, 1);
    // Base center vertex 1
    verts.push(0, 0, -0.65, 0, 0, -1);
    // Ring vertices 2..segs+2
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const len = Math.hypot(c, s, 0.35);
      verts.push(c * 0.42, s * 0.42, -0.58, c / len, s / len, 0.35 / len);
    }
    for (let i = 0; i < segs; i++) {
      const a = 2 + i;
      const b = 2 + i + 1;
      indices.push(0, a, b);
      indices.push(1, b, a);
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitSpikeYMesh() {
    // Upward earth spike / flame tongue (base y=0, tip y=1.0)
    const segs = 7;
    const verts = [];
    const indices = [];
    verts.push(0, 1.0, 0, 0, 1, 0);
    verts.push(0, 0.0, 0, 0, -1, 0);
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const r = 0.42 + (i % 2 === 0 ? 0.06 : -0.04);
      verts.push(c * r, 0.0, s * r, c * 0.9, 0.42, s * 0.9);
    }
    for (let i = 0; i < segs; i++) {
      const a = 2 + i;
      const b = 2 + i + 1;
      indices.push(0, b, a);
      indices.push(1, a, b);
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitLeafMesh() {
    // Tiny diamond-curved leaf blade
    const verts = new Float32Array([
      0.0,  0.0,  0.65,   0.0,  0.96,  0.26,
      0.34, 0.06, 0.05,   0.25, 0.96,  0.0,
      0.0,  0.0, -0.58,   0.0,  0.96, -0.26,
     -0.34, 0.06, 0.05,  -0.25, 0.96,  0.0,
      0.0,  0.10, 0.05,   0.0,  1.0,   0.0,
    ]);
    const indices = new Uint16Array([
      0, 4, 1,  1, 4, 2,  2, 4, 3,  3, 4, 0,
    ]);
    return { vertices: verts, indices };
  }

  function buildUnitVineMesh() {
    // Organic curved root/vine shoot emerging upward from ground (y=0..1)
    const rings = 6;
    const segs = 6;
    const verts = [];
    const indices = [];
    const stride = segs + 1;
    for (let ir = 0; ir <= rings; ir++) {
      const t = ir / rings;
      const cx = Math.sin(t * Math.PI * 1.4) * 0.18 * t;
      const cz = Math.cos(t * Math.PI * 1.1) * 0.14 * t;
      const cy = t;
      const rad = M.lerp(0.18, 0.03, t);
      for (let is = 0; is <= segs; is++) {
        const a = (is / segs) * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        verts.push(cx + c * rad, cy, cz + s * rad, c, 0.25, s);
      }
    }
    for (let ir = 0; ir < rings; ir++) {
      for (let is = 0; is < segs; is++) {
        const a = ir * stride + is;
        const b = a + stride;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitArcMesh() {
    // Forward-facing crescent water-wave arc (~115 deg around +Z)
    const segs = 16;
    const verts = [];
    const indices = [];
    const halfSpan = 1.02;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = (u - 0.5) * 2.0 * halfSpan;
      const sa = Math.sin(a), ca = Math.cos(a);
      const pinch = Math.sin(u * Math.PI);
      const rIn = 0.66 + (1.0 - pinch) * 0.24;
      const rOut = 1.0;
      const h = 0.18 + pinch * 0.34;
      // Inner lower edge
      verts.push(sa * rIn, 0.04, ca * rIn, sa * 0.4, 0.85, ca * 0.4);
      // Outer upper crest
      verts.push(sa * rOut, h, ca * rOut, sa * 0.7, 0.65, ca * 0.7);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2;
      indices.push(a, a + 2, a + 3, a, a + 3, a + 1);
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitRockMesh() {
    // Faceted low-poly boulder/earth fist chunk
    const verts = [];
    const indices = [];
    const uSegs = 8, vSegs = 6;
    const stride = uSegs + 1;
    for (let iv = 0; iv <= vSegs; iv++) {
      const phi = (iv / vSegs) * Math.PI;
      const sp = Math.sin(phi), cp = Math.cos(phi);
      for (let iu = 0; iu <= uSegs; iu++) {
        const th = (iu / uSegs) * Math.PI * 2;
        const jitter = 0.86 + 0.16 * Math.sin(th * 3.0 + phi * 2.0) + 0.10 * Math.cos(th * 5.0 - phi * 3.0);
        const nx = sp * Math.cos(th), ny = cp, nz = sp * Math.sin(th);
        verts.push(nx * jitter, ny * jitter, nz * jitter, nx, ny, nz);
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

  function buildUnitSilhouetteMesh() {
    // Minimalist Q-style humanoid afterimage (head + torso pill) for 疾金步
    const verts = [];
    const indices = [];
    const addSphere = (cy, rx, ry, rz) => {
      const base = verts.length / 6;
      const uS = 10, vS = 6, st = uS + 1;
      for (let iv = 0; iv <= vS; iv++) {
        const phi = (iv / vS) * Math.PI;
        const sp = Math.sin(phi), cp = Math.cos(phi);
        for (let iu = 0; iu <= uS; iu++) {
          const th = (iu / uS) * Math.PI * 2;
          const nx = sp * Math.cos(th), ny = cp, nz = sp * Math.sin(th);
          verts.push(nx * rx, cy + ny * ry, nz * rz, nx, ny, nz);
        }
      }
      for (let iv = 0; iv < vS; iv++) {
        for (let iu = 0; iu < uS; iu++) {
          const a = base + iv * st + iu;
          indices.push(a, a + st, a + 1, a + 1, a + st, a + st + 1);
        }
      }
    };
    addSphere(0.85, 0.34, 0.62, 0.28); // torso & legs pill
    addSphere(1.68, 0.34, 0.34, 0.34); // Q-style head
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  // --- 筑基期专属轻量纯代码 VFX 网格 (8种) ---
  function buildUnitSwordMesh() {
    // Sleek geometric flying sword along +Z (tip z=+1.0, guard z=-0.42, pommel z=-0.78)
    const verts = [];
    const indices = [];
    const addTri = (a, b, c, nx, ny, nz) => {
      const base = verts.length / 6;
      verts.push(a[0], a[1], a[2], nx, ny, nz,  b[0], b[1], b[2], nx, ny, nz,  c[0], c[1], c[2], nx, ny, nz);
      indices.push(base, base + 1, base + 2);
    };
    const tip = [0, 0, 1.0], rR = [0.11, 0, -0.42], rL = [-0.11, 0, -0.42], rT = [0, 0.045, -0.42], rB = [0, -0.045, -0.42];
    const pom = [0, 0, -0.78];
    // Diamond blade faces
    addTri(tip, rT, rR, 0.4, 0.9, 0.1);
    addTri(tip, rL, rT, -0.4, 0.9, 0.1);
    addTri(tip, rR, rB, 0.4, -0.9, 0.1);
    addTri(tip, rB, rL, -0.4, -0.9, 0.1);
    // Narrow hilt taper
    addTri(pom, rR, rT, 0.4, 0.9, -0.2);
    addTri(pom, rT, rL, -0.4, 0.9, -0.2);
    addTri(pom, rB, rR, 0.4, -0.9, -0.2);
    addTri(pom, rL, rB, -0.4, -0.9, -0.2);
    // Crisp crossguard wing bar
    const gR = [0.24, 0, -0.40], gL = [-0.24, 0, -0.40], gF = [0, 0.035, -0.34], gBk = [0, -0.035, -0.46];
    addTri(gR, gF, gL, 0, 1, 0);
    addTri(gL, gBk, gR, 0, -1, 0);
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitBladeMesh() {
    // Vertical diamond sword-qi blade for 金罡护体刃
    const verts = new Float32Array([
      0.0,  0.65,  0.0,   0.0,  0.2,  0.98,
      0.18, 0.0,   0.04,  0.8,  0.0,  0.6,
      0.0, -0.65,  0.0,   0.0, -0.2,  0.98,
     -0.18, 0.0,   0.04, -0.8,  0.0,  0.6,
      0.0,  0.0,  -0.06,  0.0,  0.0, -1.0,
    ]);
    const indices = new Uint16Array([
      0, 3, 1,  2, 1, 3,
      0, 1, 4,  1, 2, 4,  2, 3, 4,  3, 0, 4,
    ]);
    return { vertices: verts, indices };
  }

  function buildUnitThornyVineMesh() {
    // Twisting vine with sharp small protruding thorns (y=0..1) for 青藤绞杀
    const rings = 7, segs = 6;
    const verts = [], indices = [];
    const stride = segs + 1;
    for (let ir = 0; ir <= rings; ir++) {
      const t = ir / rings;
      const cx = Math.sin(t * Math.PI * 1.9) * 0.24 * t;
      const cz = Math.cos(t * Math.PI * 1.6) * 0.20 * t;
      const rad = M.lerp(0.22, 0.04, t);
      for (let is = 0; is <= segs; is++) {
        const a = (is / segs) * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        verts.push(cx + c * rad, t, cz + s * rad, c, 0.2, s);
      }
    }
    for (let ir = 0; ir < rings; ir++) {
      for (let is = 0; is < segs; is++) {
        const a = ir * stride + is, b = a + stride;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    // 5 crisp small thorns jutting out along the vine
    for (let k = 1; k <= 5; k++) {
      const t = k / 6;
      const cx = Math.sin(t * Math.PI * 1.9) * 0.24 * t;
      const cz = Math.cos(t * Math.PI * 1.6) * 0.20 * t;
      const ang = k * 2.1;
      const dx = Math.cos(ang), dz = Math.sin(ang);
      const base = verts.length / 6;
      verts.push(
        cx + dx * 0.10, t - 0.04, cz + dz * 0.10, dx, 0.2, dz,
        cx + dx * 0.10, t + 0.04, cz + dz * 0.10, dx, 0.4, dz,
        cx + dx * 0.34, t + 0.06, cz + dz * 0.34, dx, 0.5, dz
      );
      indices.push(base, base + 1, base + 2);
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitWaveWallMesh() {
    // Medium curved 3D translucent water wave wall facing +Z with curled crest for 惊涛拍岸
    const uS = 16, vS = 6;
    const verts = [], indices = [];
    const stride = uS + 1;
    for (let iv = 0; iv <= vS; iv++) {
      const v = iv / vS; // 0 = ground base, 1 = curled wave top
      const y = Math.sin(v * Math.PI * 0.56) * 1.0;
      const curlZ = Math.sin(v * Math.PI) * 0.28 + (v > 0.7 ? (v - 0.7) * 0.55 : 0);
      for (let iu = 0; iu <= uS; iu++) {
        const u = iu / uS;
        const a = (u - 0.5) * 1.35; // gentle arc span
        const x = Math.sin(a) * 1.0;
        const z = (Math.cos(a) - 0.72) * 0.9 + curlZ;
        const arch = Math.sin(u * Math.PI);
        verts.push(x, y * (0.45 + 0.55 * arch), z, Math.sin(a) * 0.4, 0.35 + v * 0.4, Math.cos(a) * 0.85);
      }
    }
    for (let iv = 0; iv < vS; iv++) {
      for (let iu = 0; iu < uS; iu++) {
        const a = iv * stride + iu, b = a + stride;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitHexIceMesh() {
    // Flat hexagonal translucent ice plate (radius 1.0, y=0.04) for 寒霜凝滞
    const verts = [0, 0.05, 0, 0, 1, 0];
    const indices = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      verts.push(Math.cos(a), 0.04, Math.sin(a), Math.cos(a) * 0.15, 0.98, Math.sin(a) * 0.15);
    }
    for (let i = 0; i < 6; i++) {
      indices.push(0, 1 + i, 1 + ((i + 1) % 6));
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitFlameFanMesh() {
    // Forward 110-deg translucent flame curtain sheet (radius 0.15..1.0) for 炎息燎原
    const segs = 16;
    const verts = [], indices = [];
    const halfA = 0.96;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = (u - 0.5) * 2.0 * halfA;
      const sa = Math.sin(a), ca = Math.cos(a);
      const wave = 0.08 * Math.sin(u * Math.PI * 4.0);
      verts.push(sa * 0.14, 0.12, ca * 0.14, 0, 0.95, 0.3);
      verts.push(sa * 1.0, 0.24 + wave, ca * 1.0, sa * 0.3, 0.9, ca * 0.3);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2;
      indices.push(a, a + 2, a + 3, a, a + 3, a + 1);
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitSlabMesh() {
    // Rounded-corner thick stone shield slab (facing +Z) for 厚土重盾
    const segs = 8;
    const verts = [0, 0, 0.18, 0, 0, 1,  0, 0, -0.18, 0, 0, -1];
    const indices = [];
    const rx = 0.42, ry = 0.54;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2 + Math.PI / 8;
      const ca = Math.cos(a), sa = Math.sin(a);
      verts.push(ca * rx, sa * ry, 0.14, ca * 0.25, sa * 0.25, 0.94);
      verts.push(ca * rx, sa * ry, -0.14, ca * 0.25, sa * 0.25, -0.94);
    }
    for (let i = 0; i < segs; i++) {
      const f0 = 2 + i * 2, f1 = 2 + ((i + 1) % segs) * 2;
      const b0 = f0 + 1, b1 = f1 + 1;
      indices.push(0, f0, f1,  1, b1, b0,  f0, b0, b1,  f0, b1, f1);
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitSlabRuneMesh() {
    // Subtle warm-yellow spirit-rune cross/diamond lines on front of slab (+Z = 0.20)
    const verts = [];
    const indices = [];
    const addBar = (cx, cy, hx, hy) => {
      const b = verts.length / 6;
      const z = 0.21;
      verts.push(cx - hx, cy - hy, z, 0, 0, 1,  cx + hx, cy - hy, z, 0, 0, 1,  cx + hx, cy + hy, z, 0, 0, 1,  cx - hx, cy + hy, z, 0, 0, 1);
      indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    addBar(0, 0, 0.045, 0.32);
    addBar(0, 0.08, 0.20, 0.042);
    addBar(0, -0.12, 0.14, 0.038);
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  function buildUnitAimArrowMesh() {
    // LoL-style ground directional arrow along +Z from z=0.0 to z=1.0 (width 1.0, y=0.06)
    const y = 0.06;
    const verts = new Float32Array([
      // Shaft (z: 0.0 -> 0.72, x: -0.22 .. +0.22)
      -0.22, y, 0.00,  0, 1, 0,
       0.22, y, 0.00,  0, 1, 0,
       0.22, y, 0.72,  0, 1, 0,
      -0.22, y, 0.72,  0, 1, 0,
      // Arrowhead (z: 0.68 -> 1.00, wings at x = -0.52 .. +0.52)
      -0.52, y, 0.68,  0, 1, 0,
       0.52, y, 0.68,  0, 1, 0,
       0.00, y, 1.00,  0, 1, 0,
    ]);
    const indices = new Uint16Array([
      0, 1, 2,  0, 2, 3,
      4, 5, 6,
    ]);
    return { vertices: verts, indices };
  }

  function buildUnitAimDiscMesh() {
    // Filled translucent ground circle disc (radius 1.0, y=0.04) for AoE target range preview
    const segs = 28;
    const y = 0.04;
    const verts = [0, y, 0, 0, 1, 0];
    const indices = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      verts.push(Math.cos(a), y, Math.sin(a), 0, 1, 0);
    }
    for (let i = 0; i < segs; i++) {
      indices.push(0, 1 + i, 1 + i + 1);
    }
    return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
  }

  // =========================================================================
  // 2B. MENTAL CULTIVATION METHODS CATALOG (心法: 4本练气期 + 4本筑基期 · 装配生效)
  // =========================================================================
  const XINFA_DEFS = [
    // 练气期心法
    {
      id: 'xinfa_qingmu',
      name: '《青木诀》',
      realm: 'lianqi',
      realmLabel: '练气期心法',
      statType: 'hp',
      statLabel: '气血',
      bonusText: '气血上限 +35',
      hpBonus: 35, mpBonus: 0, speedBonus: 0, atkBonus: 0,
      colorCss: '#6ee08e',
      desc: '练气期木系养生心法，引草木生机滋养经脉，装配后提升 35 点气血上限（不影响突破核心基数）。',
    },
    {
      id: 'xinfa_yinqi',
      name: '《引气诀》',
      realm: 'lianqi',
      realmLabel: '练气期心法',
      statType: 'mp',
      statLabel: '灵力',
      bonusText: '灵力上限 +35',
      hpBonus: 0, mpBonus: 35, speedBonus: 0, atkBonus: 0,
      colorCss: '#64c8f6',
      desc: '练气期吐纳导引心法，拓宽丹田气海，装配后提升 35 点灵力上限（不影响突破核心基数）。',
    },
    {
      id: 'xinfa_jifeng',
      name: '《疾风诀》',
      realm: 'lianqi',
      realmLabel: '练气期心法',
      statType: 'speed',
      statLabel: '移速',
      bonusText: '移速 +0.22',
      hpBonus: 0, mpBonus: 0, speedBonus: 0.22, atkBonus: 0,
      colorCss: '#8efad8',
      desc: '练气期轻身御气心法，灵力萦绕足底，装配后主角移速数值 +0.22。',
    },
    {
      id: 'xinfa_ruijin',
      name: '《锐金诀》',
      realm: 'lianqi',
      realmLabel: '练气期心法',
      statType: 'atk',
      statLabel: '攻击',
      bonusText: '攻击力 +15%',
      hpBonus: 0, mpBonus: 0, speedBonus: 0, atkBonus: 0.15,
      colorCss: '#f2d06b',
      desc: '练气期庚金锋芒心法，凝练灵力杀伐之气，装配后当前攻击力 +15%（不影响突破核心基数）。',
    },
    // 筑基期心法
    {
      id: 'xinfa_xuanyuan',
      name: '《玄元诀》',
      realm: 'zhuji',
      realmLabel: '筑基期心法',
      statType: 'hp',
      statLabel: '气血',
      bonusText: '气血上限 +110',
      hpBonus: 110, mpBonus: 0, speedBonus: 0, atkBonus: 0,
      colorCss: '#58f09a',
      desc: '筑基期固本培元上乘心法，真元洗练肉身，装配后提升 110 点气血上限（不影响突破核心基数）。',
    },
    {
      id: 'xinfa_linghai',
      name: '《灵海诀》',
      realm: 'zhuji',
      realmLabel: '筑基期心法',
      statType: 'mp',
      statLabel: '灵力',
      bonusText: '灵力上限 +110',
      hpBonus: 0, mpBonus: 110, speedBonus: 0, atkBonus: 0,
      colorCss: '#52b8ff',
      desc: '筑基期化气为海心法，丹田灵液如海渊浩瀚，装配后提升 110 点灵力上限（不影响突破核心基数）。',
    },
    {
      id: 'xinfa_yufeng',
      name: '《御风诀》',
      realm: 'zhuji',
      realmLabel: '筑基期心法',
      statType: 'speed',
      statLabel: '移速',
      bonusText: '移速 +0.40',
      hpBonus: 0, mpBonus: 0, speedBonus: 0.40, atkBonus: 0,
      colorCss: '#74ffe0',
      desc: '筑基期乘风踏虚心法，身法如清风掠影，装配后主角移速数值 +0.40。',
    },
    {
      id: 'xinfa_taixu',
      name: '《太虚诀》',
      realm: 'zhuji',
      realmLabel: '筑基期心法',
      statType: 'atk',
      statLabel: '攻击',
      bonusText: '攻击力 +28%',
      hpBonus: 0, mpBonus: 0, speedBonus: 0, atkBonus: 0.28,
      colorCss: '#ffcf56',
      desc: '筑基期太虚攻伐总纲，真元凌厉霸道，装配后当前攻击力 +28%（不影响突破核心基数）。',
    },
  ];

  // =========================================================================
  // 3. PLAYER SKILL SYSTEM (Casting, Cooldowns, Projectiles, Buffs, VFX)
  // =========================================================================
  class SkillSystem {
    constructor() {
      this.elements = ELEMENTS;
      this.elementMap = {};
      this.skillMap = {};
      this.allSkills = [];
      for (const el of ELEMENTS) {
        this.elementMap[el.key] = el;
        for (const sk of el.skills) {
          sk.realm = sk.realm || 'lianqi';
          sk.colorCss = el.colorCss;
          sk.elementName = el.name;
          sk.col = el.col;
          sk.accentCol = el.accentCol;
          this.skillMap[sk.id] = sk;
          this.allSkills.push(sk);
        }
        if (el.zhujiSkills) {
          for (const sk of el.zhujiSkills) {
            sk.realm = 'zhuji';
            sk.colorCss = el.colorCss;
            sk.elementName = el.name;
            sk.col = el.col;
            sk.accentCol = el.accentCol;
            this.skillMap[sk.id] = sk;
            this.allSkills.push(sk);
          }
        }
      }

      this.elementIndex = 0; // Default quick-preset: 金系
      this.realm = 'lianqi'; // 'lianqi' (练气期) | 'zhuji' (筑基期)
      this.playerRealmMajor = 'lianqi'; // 主角实际大境界（练气期无法使用筑基期武技与心法）
      this.playerAtk = 10;
      this.playerMaxHp = 100;

      // 必须先习得才能装配与使用（开局默认一无所有，需前往青石城藏经阁研习或使用作弊）
      this.learnedSkills = new Set();
      this.learnedXinfa = new Set();

      // Free-mixing武技 slots: [0: 普攻格子, 1: 技能格子1 (Q), 2: 技能格子2 (E)] — 开局默认全空
      this.equippedSkills = [null, null, null];

      // 2 Equipped 心法 slots (装配才生效，且需已习得并满足境界要求)
      this.xinfaDefs = XINFA_DEFS;
      this.xinfaMap = {};
      for (const xf of XINFA_DEFS) this.xinfaMap[xf.id] = xf;
      this.equippedXinfa = [null, null];

      // LoL-style Skill Range & Direction Aiming Preview State
      this.aimPreview = null;

      this.cooldowns = {};
      for (const sk of this.allSkills) {
        this.cooldowns[sk.id] = 0;
      }

      this.vfxMeshes = {
        cone: buildUnitConeZMesh(),
        spike: buildUnitSpikeYMesh(),
        leaf: buildUnitLeafMesh(),
        vine: buildUnitVineMesh(),
        arc: buildUnitArcMesh(),
        rock: buildUnitRockMesh(),
        silhouette: buildUnitSilhouetteMesh(),
        sword: buildUnitSwordMesh(),
        blade: buildUnitBladeMesh(),
        thorny_vine: buildUnitThornyVineMesh(),
        wave_wall: buildUnitWaveWallMesh(),
        hex_ice: buildUnitHexIceMesh(),
        flame_fan: buildUnitFlameFanMesh(),
        slab: buildUnitSlabMesh(),
        slab_rune: buildUnitSlabRuneMesh(),
        aim_arrow: buildUnitAimArrowMesh(),
        aim_disc: buildUnitAimDiscMesh(),
      };

      this.projectiles = [];
      this.effects = [];
      this.stagedSwords = []; // 御剑穿心 3 sequential flying swords
      this.waveWalls = [];    // 惊涛拍岸 advancing water walls
      this.zones = [];        // 青藤绞杀 & 寒霜凝滞 persistent ground formations
      this.flameFans = [];    // 炎息燎原 active fan fire curtains
      this.maxProjectiles = 84;
      this.maxEffects = 360;
      this.basicCharge = { active: false, elapsed: 0, maxSec: 2.0, ready: false, vfxAcc: 0 };

      // Cast state machine (前摇 windup -> 施放 execute -> 后摇 recovery)
      this.castState = null;
      this.bufferedSlot = null;
      this.bufferTimer = 0;

      // Active self buffs (练气 + 筑基)
      this.buffs = {
        dodgeTimer: 0,
        speedTimer: 0,
        speedRatio: 1.0,
        regenTimer: 0,
        regenRate: 0,
        regenVfxAcc: 0,
        shieldHp: 0,
        shieldMax: 0,
        shieldTimer: 0,
        shieldDamageReduce: 0.45,
        shieldKind: 'lianqi', // 'lianqi' (岩甲诀) | 'zhuji' (厚土重盾)
        shieldVfxAngle: 0,
        // 筑基期专属自增益: 金罡护体刃 & 木灵聚气环
        metalBladeTimer: 0,
        metalBladeDr: 0.35,
        metalBladeReflectDmg: 18,
        metalBladeReflectR: 5.4,
        metalBladeAngle: 0,
        woodAuraTimer: 0,
        woodAuraRate: 0,
        woodAuraSpeed: 1.20,
        woodAuraVfxAcc: 0,
      };

      // Dynamic persistent VFX draw list consumed directly by renderer.js!
      this.shieldNodes = [];

      this.dashTrailAcc = 0;
      this.activeDashSkill = null;
      this.oreSystem = null;
      this.npcSystem = null;
      this.onNotify = null;
    }

    isSkillLearned(skillId) {
      return this.learnedSkills.has(skillId);
    }

    isXinfaLearned(xinfaId) {
      return this.learnedXinfa.has(xinfaId);
    }

    learnSkill(skillId) {
      if (!this.skillMap[skillId]) return false;
      this.learnedSkills.add(skillId);
      return true;
    }

    learnXinfa(xinfaId) {
      if (!this.xinfaMap[xinfaId]) return false;
      this.learnedXinfa.add(xinfaId);
      return true;
    }

    learnAll() {
      for (const sk of this.allSkills) this.learnedSkills.add(sk.id);
      for (const xf of this.xinfaDefs) this.learnedXinfa.add(xf.id);
    }

    canUseSkill(sk) {
      if (!sk || !this.learnedSkills.has(sk.id)) return false;
      if (sk.realm === 'zhuji' && this.playerRealmMajor !== 'zhuji') return false;
      return true;
    }

    canUseXinfa(xf) {
      if (!xf || !this.learnedXinfa.has(xf.id)) return false;
      if (xf.realm === 'zhuji' && this.playerRealmMajor !== 'zhuji') return false;
      return true;
    }

    setPlayerRealmMajor(major) {
      this.playerRealmMajor = major === 'zhuji' ? 'zhuji' : 'lianqi';
      if (this.playerRealmMajor !== 'zhuji') {
        if (this.realm === 'zhuji') this.realm = 'lianqi';
        for (let i = 0; i < 3; i++) {
          if (this.equippedSkills[i] && this.equippedSkills[i].realm === 'zhuji') {
            this.equippedSkills[i] = null;
          }
        }
        for (let i = 0; i < 2; i++) {
          if (this.equippedXinfa[i] && this.equippedXinfa[i].realm === 'zhuji') {
            this.equippedXinfa[i] = null;
          }
        }
      }
    }

    getCurrentElement() {
      return this.elements[this.elementIndex];
    }

    _applyElementPresetToSlots() {
      const el = this.getCurrentElement();
      if (!el) return;
      const tryPick = (sk) => (sk && this.canUseSkill(sk)) ? sk : null;
      this.equippedSkills[0] = tryPick(el.skills[0]);
      if (this.realm === 'zhuji' && this.playerRealmMajor === 'zhuji' && el.zhujiSkills && el.zhujiSkills.length >= 2) {
        this.equippedSkills[1] = tryPick(el.zhujiSkills[0]);
        this.equippedSkills[2] = tryPick(el.zhujiSkills[1]);
      } else {
        this.equippedSkills[1] = tryPick(el.skills[1]);
        this.equippedSkills[2] = tryPick(el.skills[2]);
      }
      this.cancelAimPreview();
    }

    setRealm(realm) {
      if (realm === 'zhuji' && this.playerRealmMajor !== 'zhuji') {
        this.realm = 'lianqi';
        return this.realm;
      }
      this.realm = realm === 'zhuji' ? 'zhuji' : 'lianqi';
      this._applyElementPresetToSlots();
      return this.realm;
    }

    toggleRealm() {
      if (this.playerRealmMajor !== 'zhuji') {
        this.realm = 'lianqi';
        return this.realm;
      }
      this.realm = this.realm === 'zhuji' ? 'lianqi' : 'zhuji';
      this._applyElementPresetToSlots();
      return this.realm;
    }

    setElementByKey(key) {
      const idx = this.elements.findIndex((e) => e.key === key);
      if (idx >= 0) {
        this.elementIndex = idx;
        this._applyElementPresetToSlots();
        return this.elements[idx];
      }
      return this.getCurrentElement();
    }

    cycleElement() {
      this.elementIndex = (this.elementIndex + 1) % this.elements.length;
      this._applyElementPresetToSlots();
      return this.getCurrentElement();
    }

    getSkillBySlot(slotIndex) {
      return this.equippedSkills[slotIndex] || null;
    }

    // Equip any learned Basic Attack into slot 0, or any learned Active Skill into slot 1 or 2!
    equipSkillToSlot(slotIndex, skillId) {
      if (!skillId) {
        if (slotIndex >= 0 && slotIndex <= 2) this.equippedSkills[slotIndex] = null;
        this.cancelAimPreview();
        return true;
      }
      const sk = this.skillMap[skillId];
      if (!sk) return false;
      if (!this.learnedSkills.has(sk.id)) return false;
      if (sk.realm === 'zhuji' && this.playerRealmMajor !== 'zhuji') return false;
      if (slotIndex === 0) {
        if (sk.slot !== 'basic') return false;
        this.equippedSkills[0] = sk;
      } else if (slotIndex === 1 || slotIndex === 2) {
        if (sk.slot === 'basic') return false;
        const otherSlot = slotIndex === 1 ? 2 : 1;
        if (this.equippedSkills[otherSlot] && this.equippedSkills[otherSlot].id === sk.id) {
          this.equippedSkills[otherSlot] = this.equippedSkills[slotIndex];
        }
        this.equippedSkills[slotIndex] = sk;
      }
      this.cancelAimPreview();
      return true;
    }

    // Equip / Unequip 心法 (2 slots, only active when learned, realm-eligible & equipped!)
    equipXinfa(slotIndex, xinfaId) {
      if (slotIndex !== 0 && slotIndex !== 1) return false;
      if (!xinfaId) {
        this.equippedXinfa[slotIndex] = null;
        return true;
      }
      const xf = this.xinfaMap[xinfaId];
      if (!xf) return false;
      if (!this.learnedXinfa.has(xf.id)) return false;
      if (xf.realm === 'zhuji' && this.playerRealmMajor !== 'zhuji') return false;
      const other = slotIndex === 0 ? 1 : 0;
      if (this.equippedXinfa[other] && this.equippedXinfa[other].id === xf.id) {
        this.equippedXinfa[other] = this.equippedXinfa[slotIndex];
      }
      this.equippedXinfa[slotIndex] = xf;
      return true;
    }

    getXinfaBonuses() {
      let hpBonus = 0, mpBonus = 0, speedBonus = 0, atkBonus = 0;
      for (let i = 0; i < 2; i++) {
        const xf = this.equippedXinfa[i];
        if (!xf || !this.canUseXinfa(xf)) continue;
        hpBonus += xf.hpBonus || 0;
        mpBonus += xf.mpBonus || 0;
        speedBonus += xf.speedBonus || 0;
        atkBonus += xf.atkBonus || 0;
      }
      return { hpBonus, mpBonus, speedBonus, atkBonus };
    }

    // Check if a skill is a displacement / movement skill (位移技能: 疾金步 / 踏浪滑 / 焰遁步)
    isDashSkill(skill) {
      if (!skill) return false;
      return !!(skill.dashDist || skill.castAnim === 'dash' || skill.id === 'metal_skill1' || skill.id === 'water_skill1' || skill.id === 'fire_skill1');
    }

    // Displacement skills enter "待激发模式" on first click and dash in character's facing direction on second click;
    // All other active skills trigger immediately on click with NO ground circle!
    requiresAimIndicator(skill) {
      return this.isDashSkill(skill);
    }

    getSkillIndicatorSpec(skill) {
      return { kind: 'dash_armed', maxRange: (skill && skill.dashDist) || 8.0 };
    }

    beginSkillAim(slotIndex, camera, vitals, monsterSystem) {
      const skill = this.getSkillBySlot(slotIndex);
      if (!skill) {
        if (monsterSystem && camera && camera.playerPos) {
          monsterSystem.spawnFloatingText(camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2], '未装配武技 · 请前往藏经阁研习', '#ffe29c');
        }
        return { ok: false, reason: 'none' };
      }
      if (!this.learnedSkills.has(skill.id)) {
        if (monsterSystem && camera && camera.playerPos) {
          monsterSystem.spawnFloatingText(camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2], '尚未习得该武技', '#ff9d88');
        }
        return { ok: false, reason: 'unlearned' };
      }
      if (skill.realm === 'zhuji' && this.playerRealmMajor !== 'zhuji') {
        if (monsterSystem && camera && camera.playerPos) {
          monsterSystem.spawnFloatingText(camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2], '需突破至筑基期方可施展', '#ffb088');
        }
        return { ok: false, reason: 'realm' };
      }
      // Non-displacement active skills trigger immediately on click (不要圆圈了，点击直接触发!)
      if (!this.isDashSkill(skill)) {
        this.cancelAimPreview(camera);
        return this.tryCast(slotIndex, camera, vitals, monsterSystem);
      }
      const cdLeft = this.cooldowns[skill.id] || 0;
      if (cdLeft > 0.02) return { ok: false, reason: 'cooldown', cdLeft };
      if (vitals.mp < skill.mpCost) {
        if (monsterSystem && camera && camera.playerPos) {
          monsterSystem.spawnFloatingText(camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2], '灵力不足', '#7cc8ff');
        }
        return { ok: false, reason: 'mp' };
      }
      // First click on a displacement skill: enter "待激发模式" (never locks camera view, no ground circle!)
      if (camera) camera.skillAimLocked = false;
      this._lastAimCamera = camera;
      const faceYaw = (camera && camera.charYaw !== undefined) ? camera.charYaw : (camera ? camera.yaw : 0);
      this.aimPreview = {
        slotIndex,
        skill,
        kind: 'dash_armed',
        maxRange: skill.dashDist || 8.0,
        aimYaw: faceYaw,
        dirX: -Math.sin(faceYaw),
        dirZ: -Math.cos(faceYaw),
      };
      return { ok: true, preview: true, armed: true, skill };
    }

    handleAimMouseMove() {
      // Camera and character remain freely controllable while displacement skill is in 待激发模式
    }

    updateAimPreview(camera) {
      if (!this.aimPreview || !camera) return;
      camera.skillAimLocked = false;
      const faceYaw = camera.charYaw !== undefined ? camera.charYaw : camera.yaw;
      this.aimPreview.aimYaw = faceYaw;
      this.aimPreview.dirX = -Math.sin(faceYaw);
      this.aimPreview.dirZ = -Math.cos(faceYaw);
    }

    confirmAimPreview(camera, vitals, monsterSystem) {
      if (!this.aimPreview) return { ok: false, reason: 'no_preview' };
      const ap = this.aimPreview;
      this.aimPreview = null;
      if (camera) camera.skillAimLocked = false;
      if (this._lastAimCamera) this._lastAimCamera.skillAimLocked = false;
      // Second click on displacement skill: dash immediately in the direction the character is facing (朝着人物面对方向移动)!
      const faceYaw = (camera && camera.charYaw !== undefined) ? camera.charYaw : (camera ? camera.yaw : 0);
      const dirX = -Math.sin(faceYaw);
      const dirZ = -Math.cos(faceYaw);
      return this.tryCast(ap.slotIndex, camera, vitals, monsterSystem, {
        kind: 'dash_armed',
        aimYaw: faceYaw,
        dirX,
        dirZ,
      });
    }

    cancelAimPreview(camera = null) {
      this.aimPreview = null;
      if (camera) camera.skillAimLocked = false;
      if (this._lastAimCamera) this._lastAimCamera.skillAimLocked = false;
    }

    getCastAnimState() {
      if (!this.castState) {
        return { active: false, kind: null, phase: null, progress: 0 };
      }
      const cs = this.castState;
      const denom = Math.max(0.01, cs.duration);
      const progress = M.clamp(1.0 - cs.timer / denom, 0, 1);
      return {
        active: true,
        kind: cs.skill.castAnim || 'cast_push',
        phase: cs.phase,
        progress,
      };
    }

    getCastMoveScale() {
      if (!this.castState) return 1.0;
      if (this.castState.skill.castAnim === 'dash') return 1.0;
      return this.castState.phase === 'windup' ? 0.52 : 0.74;
    }

    getSpeedMultiplier() {
      let mul = 1.0;
      if (this.buffs.speedTimer > 0) mul *= this.buffs.speedRatio;
      if (this.buffs.woodAuraTimer > 0) mul *= this.buffs.woodAuraSpeed;
      return mul;
    }

    _spawnEffect(opts) {
      if (this.effects.length >= this.maxEffects) {
        this.effects.shift();
      }
      this.effects.push({
        shape: opts.shape || 'orb',
        x: opts.x, y: opts.y, z: opts.z,
        vx: opts.vx || 0, vy: opts.vy || 0, vz: opts.vz || 0,
        gravity: opts.gravity || 0,
        rotX: opts.rotX || 0,
        rotY: opts.rotY || 0,
        rotZ: opts.rotZ || 0,
        spinX: opts.spinX || 0,
        spinY: opts.spinY || 0,
        spinZ: opts.spinZ || 0,
        sx0: opts.sx0 !== undefined ? opts.sx0 : (opts.s0 || 0.35),
        sy0: opts.sy0 !== undefined ? opts.sy0 : (opts.s0 || 0.35),
        sz0: opts.sz0 !== undefined ? opts.sz0 : (opts.s0 || 0.35),
        sx1: opts.sx1 !== undefined ? opts.sx1 : (opts.s1 || 0.9),
        sy1: opts.sy1 !== undefined ? opts.sy1 : (opts.s1 || 0.9),
        sz1: opts.sz1 !== undefined ? opts.sz1 : (opts.s1 || 0.9),
        growPop: !!opts.growPop, // pop up quickly then hold/retract (vines, earth spikes)
        age: 0,
        life: opts.life || 0.45,
        col: opts.col || [0.95, 0.85, 0.45],
        alpha: opts.alpha !== undefined ? opts.alpha : 0.56,
        modelMat: M.mat4(),
      });
    }

    _spawnProjectile(opts) {
      if (this.projectiles.length >= this.maxProjectiles) {
        this.projectiles.shift();
      }
      this.projectiles.push({
        skill: opts.skill,
        shape: opts.shape || 'orb',
        x: opts.x, y: opts.y, z: opts.z,
        vx: opts.vx, vy: opts.vy, vz: opts.vz,
        rotX: opts.rotX || 0,
        rotY: opts.rotY || Math.atan2(opts.vx, opts.vz),
        rotZ: opts.rotZ || 0,
        spinX: opts.spinX || 0,
        spinY: opts.spinY || 0,
        spinZ: opts.spinZ || 0,
        scale: opts.scale || [0.25, 0.25, 0.25],
        col: opts.col || [0.98, 0.86, 0.45],
        alpha: opts.alpha !== undefined ? opts.alpha : 0.72,
        dmg: opts.dmg || 15,
        hitRadius: opts.hitRadius || 0.95,
        pierceLeft: opts.pierce || 1,
        hitIds: new Set(),
        trailTimer: 0,
        trailKind: opts.trailKind || null,
        age: 0,
        life: opts.life || 0.9,
        modelMat: M.mat4(),
      });
    }

    _calcAtkDmg(pct, vitals = null) {
      const atk = (vitals && vitals.atk) || this.playerAtk || 10;
      return Math.max(1, Math.round(atk * (pct || 1.0)));
    }

    _calcHpAmt(pct, vitals = null) {
      const mhp = (vitals && vitals.maxHp) || this.playerMaxHp || 100;
      return Math.max(1, Math.round(mhp * (pct || 0)));
    }

    // Intercept incoming monster damage (闪避 + 金罡护体刃格挡反伤 + 岩甲诀/厚土重盾护盾减伤)
    interceptIncomingDamage(rawDmg, playerPos, monsterSystem) {
      if (this.buffs.dodgeTimer > 0) {
        if (monsterSystem && playerPos) {
          monsterSystem.spawnFloatingText(playerPos[0], playerPos[1] + 2.35, playerPos[2], '闪避', '#ffe694');
        }
        return 0;
      }

      let curDmg = rawDmg;

      // 金罡护体刃: 格挡减伤 + 受击外弹一圈细碎金芒造成反伤!
      if (this.buffs.metalBladeTimer > 0) {
        curDmg = Math.max(1, Math.round(curDmg * (1.0 - this.buffs.metalBladeDr)));
        if (playerPos) {
          this._spawnEffect({
            shape: 'ring',
            x: playerPos[0], y: playerPos[1] + 1.15, z: playerPos[2],
            sx0: 0.6, sy0: 1.0, sz0: 0.6,
            sx1: 3.6, sy1: 1.0, sz1: 3.6,
            life: 0.34,
            col: [1.0, 0.90, 0.46],
            alpha: 0.64,
          });
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + Math.random() * 0.25;
            const spd = 7.5 + Math.random() * 3.5;
            this._spawnEffect({
              shape: 'shard',
              x: playerPos[0] + Math.cos(a) * 0.65,
              y: playerPos[1] + 1.15,
              z: playerPos[2] + Math.sin(a) * 0.65,
              vx: Math.cos(a) * spd, vy: 0.6 + Math.random() * 1.4, vz: Math.sin(a) * spd,
              rotY: Math.atan2(Math.cos(a), Math.sin(a)),
              sx0: 0.08, sy0: 0.08, sz0: 0.44,
              sx1: 0.02, sy1: 0.02, sz1: 0.14,
              life: 0.34,
              col: [1.0, 0.93, 0.56],
              alpha: 0.78,
            });
          }
          const reflectDmg = this.buffs.metalBladeReflectDmg || this._calcAtkDmg(1.25);
          if (monsterSystem) {
            monsterSystem.spawnFloatingText(playerPos[0], playerPos[1] + 2.38, playerPos[2], '金罡反伤!', '#ffe688');
            for (const m of monsterSystem.monsters) {
              if (!m.alive || !m.visible) continue;
              const d = Math.hypot(m.x - playerPos[0], m.z - playerPos[2]);
              if (d <= this.buffs.metalBladeReflectR + (m.spec.colRadius || 1.1)) {
                monsterSystem.applyDamageToMonster(m, reflectDmg, {
                  label: '反伤',
                  color: '#ffe588',
                });
              }
            }
          }
          if (this.npcSystem) {
            this.npcSystem.applyAreaDamage(playerPos[0], playerPos[2], this.buffs.metalBladeReflectR, reflectDmg, { onlyHostile: true, label: '反伤', color: '#ffe588' }, monsterSystem);
          }
        }
      }

      if (this.buffs.shieldTimer > 0 && this.buffs.shieldHp > 0) {
        const reduced = Math.max(1, Math.round(curDmg * (1.0 - this.buffs.shieldDamageReduce)));
        const absorbed = Math.min(this.buffs.shieldHp, reduced);
        this.buffs.shieldHp -= absorbed;
        const leftover = Math.max(0, reduced - absorbed);

        if (playerPos) {
          const isHeavy = this.buffs.shieldKind === 'zhuji';
          this._spawnRockBurst(playerPos[0], playerPos[1] + 1.15, playerPos[2], this.buffs.shieldHp <= 0 ? (isHeavy ? 14 : 10) : 5);
          if (monsterSystem) {
            const name = isHeavy ? '重盾' : '岩盾';
            const txt = this.buffs.shieldHp <= 0 ? `${name}碎裂!` : `${name} -${absorbed}`;
            monsterSystem.spawnFloatingText(playerPos[0], playerPos[1] + 2.35, playerPos[2], txt, '#ebd08a');
          }
        }
        if (this.buffs.shieldHp <= 0) {
          this.buffs.shieldHp = 0;
          this.buffs.shieldTimer = 0;
        }
        return leftover;
      }

      return curDmg;
    }

    _spawnRockBurst(x, y, z, count) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const spd = 2.6 + Math.random() * 3.8;
        this._spawnEffect({
          shape: 'rock',
          x: x + Math.cos(a) * 0.55,
          y: y + (Math.random() - 0.3) * 0.6,
          z: z + Math.sin(a) * 0.55,
          vx: Math.cos(a) * spd,
          vy: 2.2 + Math.random() * 2.8,
          vz: Math.sin(a) * spd,
          gravity: 13.5,
          spinX: 6.5, spinY: 7.5,
          s0: 0.22, s1: 0.08,
          life: 0.48 + Math.random() * 0.2,
          col: [0.84, 0.68, 0.38],
          alpha: 0.72,
        });
      }
    }

    _spawnFlameCluster(x, groundY, z) {
      // 3 dancing flame cones + 6 rising embers (for 焰遁步 start & end!)
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.random() * 0.6;
        const r = 0.22 + Math.random() * 0.22;
        this._spawnEffect({
          shape: 'spike',
          x: x + Math.cos(a) * r,
          y: groundY + 0.04,
          z: z + Math.sin(a) * r,
          vy: 0.4,
          rotY: a,
          sx0: 0.26, sy0: 0.55 + i * 0.15, sz0: 0.26,
          sx1: 0.08, sy1: 0.95 + i * 0.16, sz1: 0.08,
          life: 0.46 + i * 0.06,
          col: i === 0 ? [1.0, 0.74, 0.28] : [1.0, 0.42, 0.14],
          alpha: 0.66,
        });
      }
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 1.0 + Math.random() * 2.1;
        this._spawnEffect({
          shape: 'orb',
          x: x + Math.cos(a) * 0.28,
          y: groundY + 0.25 + Math.random() * 0.45,
          z: z + Math.sin(a) * 0.28,
          vx: Math.cos(a) * spd,
          vy: 2.0 + Math.random() * 2.2,
          vz: Math.sin(a) * spd,
          s0: 0.09, s1: 0.02,
          life: 0.42 + Math.random() * 0.24,
          col: i % 2 === 0 ? [1.0, 0.78, 0.30] : [1.0, 0.44, 0.16],
          alpha: 0.74,
        });
      }
    }

    // 强化技能施法通用爆发特效（练气/筑基全面升级：双层灵纹冲击环 + 飞散灵刃/灵珠 + 璀璨光核）
    _spawnCastBurst(x, y, z, col, accentCol, isZhuji = false) {
      const c1 = [Math.min(1.45, (col[0] || 0.8) * 1.25), Math.min(1.45, (col[1] || 0.9) * 1.25), Math.min(1.45, (col[2] || 0.8) * 1.25)];
      const c2 = [Math.min(1.5, (accentCol[0] || 1.0) * 1.25), Math.min(1.5, (accentCol[1] || 1.0) * 1.25), Math.min(1.5, (accentCol[2] || 0.8) * 1.25)];
      const rOuter = isZhuji ? 4.8 : 2.9;
      const rInner = isZhuji ? 3.1 : 1.85;
      this._spawnEffect({
        shape: 'ring', x, y: y + 0.14, z,
        sx0: 0.45, sy0: 1.0, sz0: 0.45,
        sx1: rOuter, sy1: 1.0, sz1: rOuter,
        spinY: isZhuji ? 5.2 : 3.2,
        life: isZhuji ? 0.64 : 0.46,
        col: c1, alpha: isZhuji ? 0.86 : 0.72,
      });
      this._spawnEffect({
        shape: 'ring', x, y: y + 0.55, z,
        sx0: 0.30, sy0: 1.0, sz0: 0.30,
        sx1: rInner, sy1: 1.0, sz1: rInner,
        spinY: isZhuji ? -6.8 : -4.2,
        life: isZhuji ? 0.52 : 0.36,
        col: c2, alpha: isZhuji ? 0.82 : 0.68,
      });
      this._spawnEffect({
        shape: 'orb', x, y: y + 1.15, z,
        s0: isZhuji ? 0.42 : 0.28, s1: isZhuji ? 1.45 : 0.92,
        life: isZhuji ? 0.36 : 0.26,
        col: c2, alpha: 0.72,
      });
      const count = isZhuji ? 12 : 7;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.35;
        const spd = (isZhuji ? 4.6 : 3.1) + Math.random() * 2.6;
        this._spawnEffect({
          shape: i % 2 === 0 ? 'shard' : 'orb',
          x: x + Math.cos(a) * 0.55,
          y: y + 0.45 + Math.random() * 0.85,
          z: z + Math.sin(a) * 0.55,
          vx: Math.cos(a) * spd,
          vy: (isZhuji ? 3.2 : 2.1) + Math.random() * 2.4,
          vz: Math.sin(a) * spd,
          rotY: a,
          sx0: isZhuji ? 0.12 : 0.08, sy0: isZhuji ? 0.12 : 0.08, sz0: isZhuji ? 0.58 : 0.38,
          sx1: 0.02, sy1: 0.02, sz1: 0.12,
          life: (isZhuji ? 0.56 : 0.40) + Math.random() * 0.16,
          col: i % 2 === 0 ? c2 : c1,
          alpha: 0.85,
        });
      }
    }

    // 普攻长按蓄力（3 秒蓄力完成，释放造成双倍伤害 + 强化流光弹道）
    startBasicCharge(camera, monsterSystem) {
      const sk = this.getSkillBySlot(0);
      if (!sk || !this.canUseSkill(sk)) return false;
      if (this.basicCharge.active) return true;
      this.basicCharge.active = true;
      this.basicCharge.elapsed = 0;
      this.basicCharge.ready = false;
      this.basicCharge.vfxAcc = 0;
      return true;
    }

    cancelBasicCharge() {
      this.basicCharge.active = false;
      this.basicCharge.elapsed = 0;
      this.basicCharge.ready = false;
      this.basicCharge.vfxAcc = 0;
    }

    releaseBasicCharge(camera, vitals, monsterSystem) {
      if (!this.basicCharge.active) return { ok: false, reason: 'not_charging' };
      const isCharged = this.basicCharge.elapsed >= this.basicCharge.maxSec;
      this.cancelBasicCharge();
      return this.tryCast(0, camera, vitals, monsterSystem, null, isCharged ? 2.0 : 1.0);
    }

    // Attempt to cast skill in slot 0 (普攻), 1 (技能1), or 2 (技能2)
    tryCast(slotIndex, camera, vitals, monsterSystem, confirmedAim = null, chargeMul = 1.0) {
      const skill = this.getSkillBySlot(slotIndex);
      if (!skill) {
        if (monsterSystem && camera && camera.playerPos) {
          monsterSystem.spawnFloatingText(camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2], '未装配武技 · 请前往藏经阁研习', '#ffe29c');
        }
        return { ok: false, reason: 'none' };
      }
      if (!this.learnedSkills.has(skill.id)) {
        if (monsterSystem && camera && camera.playerPos) {
          monsterSystem.spawnFloatingText(camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2], '尚未习得该武技', '#ff9d88');
        }
        return { ok: false, reason: 'unlearned' };
      }
      if (skill.realm === 'zhuji' && this.playerRealmMajor !== 'zhuji') {
        if (monsterSystem && camera && camera.playerPos) {
          monsterSystem.spawnFloatingText(camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2], '需突破至筑基期方可施展', '#ffb088');
        }
        return { ok: false, reason: 'realm' };
      }

      // If currently in windup/recovery, queue a short input buffer (0.18s)
      if (this.castState) {
        this.bufferedSlot = slotIndex;
        this.bufferTimer = 0.20;
        return { ok: false, reason: 'busy' };
      }

      const cdLeft = this.cooldowns[skill.id] || 0;
      if (cdLeft > 0.02) {
        return { ok: false, reason: 'cooldown', cdLeft };
      }

      if (vitals.mp < skill.mpCost) {
        if (monsterSystem && camera && camera.playerPos) {
          monsterSystem.spawnFloatingText(
            camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2],
            '灵力不足', '#7cc8ff'
          );
        }
        return { ok: false, reason: 'mp' };
      }

      // Commit MP & Cooldown and enter windup phase (前摇)
      vitals.mp = Math.max(0, vitals.mp - skill.mpCost);
      this.cooldowns[skill.id] = skill.cd;
      vitals.combatTimer = Math.max(vitals.combatTimer, 3.2);

      // Snap protagonist facing toward confirmed indicator direction or camera aim direction
      const aimYaw = confirmedAim && confirmedAim.aimYaw !== undefined ? confirmedAim.aimYaw : camera.yaw;
      camera.charYaw = aimYaw;

      this.castState = {
        skill,
        phase: 'windup',
        timer: skill.windup,
        duration: skill.windup,
        fired: false,
        aimYaw,
        aimPitch: camera.pitch,
        confirmedAim: confirmedAim || null,
        chargeMul: chargeMul || 1.0,
      };

      // Reinforced luminous windup gather cue (手心聚光核 + 脚下灵纹聚气环)
      const p = camera.playerPos;
      const isZhuji = skill.realm === 'zhuji';
      const isCharged = (chargeMul || 1.0) >= 1.9;
      const accentCol = skill.accentCol || this.getCurrentElement().accentCol;
      const mainCol = skill.col || this.getCurrentElement().col;
      this._spawnEffect({
        shape: 'orb',
        x: p[0] - Math.sin(aimYaw) * 0.65,
        y: p[1] + 1.25,
        z: p[2] - Math.cos(aimYaw) * 0.65,
        s0: isCharged ? 0.36 : (isZhuji ? 0.28 : 0.20),
        s1: isCharged ? 0.85 : (isZhuji ? 0.62 : 0.42),
        life: Math.max(0.10, skill.windup + 0.06),
        col: [Math.min(1.4, accentCol[0] * 1.2), Math.min(1.4, accentCol[1] * 1.2), Math.min(1.4, accentCol[2] * 1.2)],
        alpha: 0.78,
      });
      if (skill.slot !== 'basic' || isCharged) {
        this._spawnEffect({
          shape: 'ring',
          x: p[0], y: p[1] + 0.16, z: p[2],
          sx0: 0.35, sy0: 1.0, sz0: 0.35,
          sx1: isZhuji ? 2.4 : 1.55, sy1: 1.0, sz1: isZhuji ? 2.4 : 1.55,
          spinY: isZhuji ? 6.0 : 3.8,
          life: Math.max(0.18, skill.windup + 0.12),
          col: mainCol,
          alpha: isZhuji ? 0.78 : 0.62,
        });
      }

      return { ok: true, skill };
    }

    // Find best soft-locked alive monster in front of player
    _findAimTarget(pPos, aimYaw, maxRange, maxConeCos = 0.86) {
      if (!this._lastMonsterSystem) return null;
      const list = this._lastMonsterSystem.monsters;
      const fwdX = -Math.sin(aimYaw);
      const fwdZ = -Math.cos(aimYaw);
      let best = null;
      let bestScore = Infinity;

      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (!m.alive || !m.visible) continue;
        const dx = m.x - pPos[0];
        const dz = m.z - pPos[2];
        const dist = Math.hypot(dx, dz);
        if (dist < 0.4 || dist > maxRange) continue;
        const dot = (dx * fwdX + dz * fwdZ) / dist;
        if (dot < maxConeCos) continue;
        const score = dist * (1.28 - dot * 0.45);
        if (score < bestScore) {
          bestScore = score;
          best = m;
        }
      }
      return best;
    }

    // 360° + Full Vertical Pitch 3D Projectile Velocity (NO forced auto-lock, can shoot straight into the sky!)
    _computeProjectileVelocity(pPos, startY, aimYaw, speed, range, camera = null, confirmedAim = null) {
      const handX = pPos[0] - Math.sin(aimYaw) * 0.85;
      const handZ = pPos[2] - Math.cos(aimYaw) * 0.85;

      // 1) If cast from a ground AoE indicator (e.g. 烈焰爆弹), lob straight to the confirmed ground target circle!
      if (confirmedAim && confirmedAim.kind === 'ground_aoe') {
        const tx = confirmedAim.targetX;
        const tz = confirmedAim.targetZ;
        const ty = T.getMeshTerrainHeight(tx, tz) + 0.55;
        const dx = tx - handX, dy = ty - startY, dz = tz - handZ;
        const d = Math.hypot(dx, dy, dz) || 1.0;
        const vx = (dx / d) * speed, vy = (dy / d) * speed, vz = (dz / d) * speed;
        return {
          vx, vy, vz,
          yaw: Math.atan2(vx, vz),
          pitch: -Math.asin(M.clamp(vy / speed, -0.98, 0.98)),
        };
      }

      // 2) If cast from a directional skill indicator (e.g. 裂金锥 / 灵风穿云 / 玄冰刺 / 离火玄虹 aimed via locked-view mouse slide)
      if (confirmedAim && confirmedAim.dirX !== undefined) {
        const dirX = confirmedAim.dirX, dirZ = confirmedAim.dirZ;
        return {
          vx: dirX * speed,
          vy: 0.0,
          vz: dirZ * speed,
          yaw: Math.atan2(dirX, dirZ),
          pitch: 0.0,
        };
      }

      // 3) True 3D Omni-Directional Center Crosshair Aiming (shoots straight toward screen center crosshair, including into the sky!)
      if (camera && camera.getCrosshairRay) {
        const ray = camera.getCrosshairRay();
        const aimDist = Math.max(14.0, range);
        const tx = ray.ox + ray.dx * aimDist;
        const ty = ray.oy + ray.dy * aimDist;
        const tz = ray.oz + ray.dz * aimDist;
        const dx = tx - handX, dy = ty - startY, dz = tz - handZ;
        const d = Math.hypot(dx, dy, dz) || 1.0;
        const vx = (dx / d) * speed;
        const vy = (dy / d) * speed;
        const vz = (dz / d) * speed;
        return {
          vx, vy, vz,
          yaw: Math.atan2(vx, vz),
          pitch: -Math.asin(M.clamp(vy / speed, -0.98, 0.98)),
        };
      }

      const dirX = -Math.sin(aimYaw);
      const dirZ = -Math.cos(aimYaw);
      return {
        vx: dirX * speed,
        vy: 0.0,
        vz: dirZ * speed,
        yaw: Math.atan2(dirX, dirZ),
        pitch: 0.0,
      };
    }

    _executeSkill(skill, aimYaw, camera, vitals, monsterSystem, confirmedAim = null, chargeMul = 1.0) {
      const p = camera.playerPos;
      const fwdX = confirmedAim && confirmedAim.dirX !== undefined ? confirmedAim.dirX : -Math.sin(aimYaw);
      const fwdZ = confirmedAim && confirmedAim.dirZ !== undefined ? confirmedAim.dirZ : -Math.cos(aimYaw);
      const rightX = Math.cos(aimYaw);
      const rightZ = -Math.sin(aimYaw);
      const handX = p[0] + fwdX * 0.85;
      const handY = p[1] + 1.28;
      const handZ = p[2] + fwdZ * 0.85;
      const groundY = T.getWalkableHeight(p[0], p[2], p[1]);
      if (vitals && vitals.atk) this.playerAtk = vitals.atk;
      if (vitals && vitals.maxHp) this.playerMaxHp = vitals.maxHp;
      const isCharged = (chargeMul || 1.0) >= 1.9;
      const rawSkillDmg = skill.dmgPct > 0 ? Math.max(1, Math.round(this._calcAtkDmg(skill.dmgPct, vitals) * (chargeMul || 1.0))) : 0;

      // 全面强化练气与筑基主动技能施法特效；普攻满蓄力亦激发强效聚灵冲击环！
      const skCol = skill.col || this.getCurrentElement().col;
      const skAcc = skill.accentCol || this.getCurrentElement().accentCol;
      if (skill.slot !== 'basic') {
        this._spawnCastBurst(p[0], groundY, p[2], skCol, skAcc, skill.realm === 'zhuji');
      } else if (isCharged) {
        this._spawnCastBurst(p[0], groundY, p[2], skCol, [1.25, 1.15, 0.72], true);
        if (monsterSystem) {
          monsterSystem.spawnFloatingText(p[0], p[1] + 2.45, p[2], `满蓄力 · ${skill.name} (200%)`, '#ffe678');
        }
      } else {
        // 常规普攻也附带一圈利落的小型出手灵光环
        this._spawnEffect({
          shape: 'ring', x: handX, y: handY, z: handZ,
          rotX: Math.PI * 0.5, rotY: aimYaw,
          s0: 0.16, s1: 0.72, life: 0.20,
          col: skAcc, alpha: 0.62,
        });
      }

      // -------------------- 金系 (METAL) --------------------
      if (skill.id === 'metal_basic') {
        // 锐金指: 细长亮金光锥弹道，全方位自由瞄准（满蓄力双倍伤害+巨幅光矛）
        const v = this._computeProjectileVelocity(p, handY, aimYaw, skill.speed * (isCharged ? 1.18 : 1.0), skill.range, camera, confirmedAim);
        const scM = isCharged ? 1.72 : 1.18;
        this._spawnProjectile({
          skill,
          isCharged,
          shape: 'cone',
          x: handX, y: handY, z: handZ,
          vx: v.vx, vy: v.vy, vz: v.vz,
          rotX: v.pitch || 0,
          rotY: v.yaw,
          spinZ: isCharged ? 18.0 : 10.0,
          scale: [0.16 * scM, 0.16 * scM, 0.96 * scM],
          col: isCharged ? [1.35, 1.18, 0.62] : [1.15, 0.98, 0.50],
          alpha: 0.92,
          dmg: rawSkillDmg,
          hitRadius: isCharged ? 1.45 : 0.98,
          pierce: isCharged ? 2 : 1,
          trailKind: isCharged ? 'metal_heavy' : 'metal_spark',
          life: skill.range / skill.speed,
        });
      } else if (skill.id === 'metal_skill1') {
        // 疾金步: 短距向前疾冲并闪避残影，身侧掠过两道淡金残影与短促气流线
        this.buffs.dodgeTimer = Math.max(this.buffs.dodgeTimer, skill.dodgeSec);
        camera.triggerDash(fwdX, fwdZ, skill.dashDist, skill.dashDur, 'metal');
        this.activeDashSkill = 'metal_skill1';
        this.dashTrailAcc = 0;

        // Immediate side afterimages & crisp airflow streaks at launch
        for (const side of [-1, 1]) {
          this._spawnEffect({
            shape: 'silhouette',
            x: p[0] + rightX * side * 0.55 - fwdX * 0.2,
            y: p[1],
            z: p[2] + rightZ * side * 0.55 - fwdZ * 0.2,
            rotY: Math.atan2(fwdX, fwdZ),
            s0: 0.95, s1: 0.92,
            life: 0.36,
            col: [1.0, 0.88, 0.46],
            alpha: 0.36,
          });
          this._spawnEffect({
            shape: 'shard',
            x: p[0] + rightX * side * 0.75,
            y: p[1] + 1.05,
            z: p[2] + rightZ * side * 0.75,
            vx: -fwdX * 5.0, vz: -fwdZ * 5.0,
            rotY: Math.atan2(fwdX, fwdZ),
            sx0: 0.08, sy0: 0.08, sz0: 1.55,
            sx1: 0.02, sy1: 0.02, sz1: 2.2,
            life: 0.26,
            col: [1.0, 0.95, 0.72],
            alpha: 0.62,
          });
        }
      } else if (skill.id === 'metal_skill2') {
        // 裂金锥: 旋转的淡金尖锥弹体，穿透+微硬直，命中炸开一圈金芒
        const v = this._computeProjectileVelocity(p, handY, aimYaw, skill.speed, skill.range, camera, confirmedAim);
        this._spawnProjectile({
          skill,
          shape: 'cone',
          x: handX, y: handY, z: handZ,
          vx: v.vx, vy: v.vy, vz: v.vz,
          rotX: v.pitch || 0,
          rotY: v.yaw,
          spinZ: 22.0,
          scale: [0.26, 0.26, 1.15],
          col: [1.0, 0.86, 0.40],
          alpha: 0.82,
          dmg: rawSkillDmg,
          hitRadius: 1.15,
          pierce: skill.pierce || 3,
          trailKind: 'metal_heavy',
          life: skill.range / skill.speed,
        });
        this._spawnEffect({
          shape: 'ring',
          x: handX, y: handY, z: handZ,
          rotX: Math.PI * 0.5, rotY: v.yaw,
          s0: 0.25, s1: 0.95,
          life: 0.26,
          col: [1.0, 0.92, 0.55],
          alpha: 0.50,
        });

      // -------------------- 木系 (WOOD) --------------------
      } else if (skill.id === 'wood_basic') {
        // 青木弹: 圆润草绿灵光球，满蓄力化作翠绿巨灵球
        const v = this._computeProjectileVelocity(p, handY, aimYaw, skill.speed * (isCharged ? 1.15 : 1.0), skill.range, camera, confirmedAim);
        const scM = isCharged ? 1.72 : 1.18;
        this._spawnProjectile({
          skill,
          isCharged,
          shape: 'orb',
          x: handX, y: handY, z: handZ,
          vx: v.vx, vy: v.vy, vz: v.vz,
          rotX: v.pitch || 0,
          rotY: v.yaw,
          scale: [0.25 * scM, 0.25 * scM, 0.25 * scM],
          col: isCharged ? [0.68, 1.32, 0.62] : [0.52, 1.08, 0.48],
          alpha: 0.88,
          dmg: rawSkillDmg,
          hitRadius: isCharged ? 1.45 : 1.02,
          pierce: isCharged ? 2 : 1,
          trailKind: 'wood_leaf',
          life: skill.range / skill.speed,
        });
      } else if (skill.id === 'wood_skill1') {
        // 缠根缚: 直接在前方目标或身前地面窜出 3~4 根青绿根须与小草叶，短暂定身/减速敌人
        const autoTgt = !confirmedAim ? this._findAimTarget(p, aimYaw, skill.range || 18.0, 0.62) : null;
        const cx = confirmedAim && confirmedAim.targetX !== undefined ? confirmedAim.targetX : (autoTgt ? autoTgt.x : (p[0] + fwdX * 8.0));
        const cz = confirmedAim && confirmedAim.targetZ !== undefined ? confirmedAim.targetZ : (autoTgt ? autoTgt.z : (p[2] + fwdZ * 8.0));
        const cy = T.getMeshTerrainHeight(cx, cz);

        // Soft emerald root circle
        this._spawnEffect({
          shape: 'ring',
          x: cx, y: cy + 0.10, z: cz,
          sx0: 0.6, sy0: 1.0, sz0: 0.6,
          sx1: skill.aoeRadius, sy1: 1.0, sz1: skill.aoeRadius,
          spinY: 1.8,
          life: 0.95,
          col: [0.36, 0.86, 0.42],
          alpha: 0.46,
        });
        // 4 curved emerald roots erupting upward from ground
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.35;
          const dist = 0.75 + (i % 2) * 0.45;
          this._spawnEffect({
            shape: 'vine',
            x: cx + Math.cos(a) * dist,
            y: cy - 0.05,
            z: cz + Math.sin(a) * dist,
            rotY: a + Math.PI,
            rotX: 0.22,
            sx0: 0.75, sy0: 0.15, sz0: 0.75,
            sx1: 0.95, sy1: 1.95 + (i % 2) * 0.35, sz1: 0.95,
            growPop: true,
            life: 1.35,
            col: i % 2 === 0 ? [0.28, 0.76, 0.34] : [0.44, 0.88, 0.46],
            alpha: 0.78,
          });
        }
        // 6 floating grass leaves
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this._spawnEffect({
            shape: 'leaf',
            x: cx + Math.cos(a) * 1.1,
            y: cy + 0.35,
            z: cz + Math.sin(a) * 1.1,
            vx: Math.cos(a) * 1.4, vy: 1.5 + Math.random() * 0.9, vz: Math.sin(a) * 1.4,
            spinY: 5.5, spinX: 2.5,
            s0: 0.28, s1: 0.20,
            life: 0.85,
            col: [0.58, 0.94, 0.48],
            alpha: 0.74,
          });
        }
        // Apply AoE damage + root + slow
        if (monsterSystem) {
          for (const m of monsterSystem.monsters) {
            if (!m.alive || !m.visible) continue;
            const d = Math.hypot(m.x - cx, m.z - cz);
            if (d <= skill.aoeRadius + (m.spec.colRadius || 1.1)) {
              monsterSystem.applyDamageToMonster(m, rawSkillDmg, {
                rootSec: skill.rootSec,
                slowSec: skill.slowSec,
                slowRatio: skill.slowRatio,
                label: '定身',
                color: '#7ef296',
              });
            }
          }
        }
        if (this.oreSystem) this.oreSystem.applyAreaDamage(cx, cz, skill.aoeRadius, rawSkillDmg);
        if (this.npcSystem) this.npcSystem.applyAreaDamage(cx, cz, skill.aoeRadius, rawSkillDmg, { rootSec: skill.rootSec, slowSec: skill.slowSec, slowRatio: skill.slowRatio, label: '缠根定身', color: '#78f294' }, monsterSystem);
      } else if (skill.id === 'wood_skill2') {
        // 回春诀: 短调息按气血百分比恢复气血，周身升起柔和淡绿光点与小草叶上浮
        const healNow = this._calcHpAmt(skill.healInstantPct, vitals);
        const healHot = this._calcHpAmt(skill.healOverTimePct, vitals);
        const before = vitals.hp;
        vitals.hp = Math.min(vitals.maxHp, vitals.hp + healNow);
        const gained = Math.round(vitals.hp - before);
        this.buffs.regenTimer = skill.healDur;
        this.buffs.regenRate = healHot / skill.healDur;
        this.buffs.regenVfxAcc = 0;

        if (monsterSystem) {
          monsterSystem.spawnFloatingText(p[0], p[1] + 2.35, p[2], `+${Math.max(gained, healNow)} 气血`, '#7ff5a2');
        }
        this._spawnEffect({
          shape: 'ring',
          x: p[0], y: groundY + 0.10, z: p[2],
          sx0: 0.65, sy0: 1.0, sz0: 0.65,
          sx1: 2.0, sy1: 1.0, sz1: 2.0,
          spinY: 2.2,
          life: 0.72,
          col: [0.52, 0.94, 0.62],
          alpha: 0.42,
        });
        this._spawnRejuvenateMotes(p[0], p[1], p[2], 7);

      // -------------------- 水系 (WATER) --------------------
      } else if (skill.id === 'water_basic') {
        // 清泉弹: 璀璨浅蓝水灵球，满蓄力化作激流重水弹
        const v = this._computeProjectileVelocity(p, handY, aimYaw, skill.speed * (isCharged ? 1.15 : 1.0), skill.range, camera, confirmedAim);
        const scM = isCharged ? 1.72 : 1.18;
        this._spawnProjectile({
          skill,
          isCharged,
          shape: 'orb',
          x: handX, y: handY, z: handZ,
          vx: v.vx, vy: v.vy, vz: v.vz,
          rotX: v.pitch || 0,
          rotY: v.yaw,
          scale: [0.26 * scM, 0.24 * scM, 0.26 * scM],
          col: isCharged ? [0.64, 1.12, 1.38] : [0.52, 0.94, 1.18],
          alpha: 0.84,
          dmg: rawSkillDmg,
          hitRadius: isCharged ? 1.45 : 1.02,
          pierce: isCharged ? 2 : 1,
          trailKind: 'water_drop',
          life: skill.range / skill.speed,
        });
      } else if (skill.id === 'water_skill1') {
        // 踏浪滑: 脚底滑行一段距离并提升短时移速，脚下铺浅蓝水波纹与小水沫
        camera.triggerDash(fwdX, fwdZ, skill.dashDist, skill.dashDur, 'water');
        this.activeDashSkill = 'water_skill1';
        this.dashTrailAcc = 0;
        this.buffs.speedTimer = skill.speedBuffSec;
        this.buffs.speedRatio = skill.speedBuffRatio;
        if (monsterSystem) {
          monsterSystem.spawnFloatingText(p[0], p[1] + 2.35, p[2], '踏浪加速', '#82dcff');
        }
        this._spawnWaterSlideRipple(p[0], groundY, p[2]);
      } else if (skill.id === 'water_skill2') {
        // 涌泉击: 身前激起水浪将近身敌人轻微震退，向前扩散半透明水波弧光与水珠
        const waveYaw = Math.atan2(fwdX, fwdZ);
        this._spawnEffect({
          shape: 'arc',
          x: p[0] + fwdX * 1.1,
          y: groundY + 0.16,
          z: p[2] + fwdZ * 1.1,
          vx: fwdX * 11.0, vz: fwdZ * 11.0,
          rotY: waveYaw,
          sx0: 1.1, sy0: 0.95, sz0: 0.95,
          sx1: 3.4, sy1: 1.55, sz1: 2.3,
          life: 0.48,
          col: [0.44, 0.84, 1.0],
          alpha: 0.56,
        });
        // 9 splashing water droplets forward
        for (let i = 0; i < 9; i++) {
          const spread = ((i / 8) - 0.5) * 1.45;
          const a = waveYaw + spread;
          const spd = 7.5 + Math.random() * 4.5;
          this._spawnEffect({
            shape: 'orb',
            x: p[0] + Math.sin(a) * 1.2,
            y: groundY + 0.55 + Math.random() * 0.45,
            z: p[2] + Math.cos(a) * 1.2,
            vx: Math.sin(a) * spd,
            vy: 2.4 + Math.random() * 2.2,
            vz: Math.cos(a) * spd,
            gravity: 11.0,
            s0: 0.13, s1: 0.05,
            life: 0.48 + Math.random() * 0.16,
            col: [0.68, 0.92, 1.0],
            alpha: 0.62,
          });
        }
        if (monsterSystem) {
          for (const m of monsterSystem.monsters) {
            if (!m.alive || !m.visible) continue;
            const dx = m.x - p[0];
            const dz = m.z - p[2];
            const d = Math.hypot(dx, dz);
            if (d > skill.range + (m.spec.colRadius || 1.0) || d < 0.01) continue;
            const dot = (dx * fwdX + dz * fwdZ) / d;
            if (dot < 0.35 && d > 2.4) continue; // ~135° generous front wave cone
            monsterSystem.applyDamageToMonster(m, rawSkillDmg, {
              knockX: (dx / d) * skill.knockback,
              knockZ: (dz / d) * skill.knockback,
              label: '震退',
              color: '#7cd8ff',
            });
          }
        }
        if (this.oreSystem) this.oreSystem.applyAreaDamage(p[0], p[2], skill.range, rawSkillDmg, fwdX, fwdZ, 0.35);
        if (this.npcSystem) this.npcSystem.applyAreaDamage(p[0], p[2], skill.range, rawSkillDmg, { knockback: skill.knockback, label: '涌泉击退', color: '#7ad8ff' }, monsterSystem, fwdX, fwdZ, 0.35);

      // -------------------- 火系 (FIRE) --------------------
      } else if (skill.id === 'fire_basic') {
        // 炎阳弹: 烈焰火球，满蓄力化作灼目阳炎巨球
        const v = this._computeProjectileVelocity(p, handY, aimYaw, skill.speed * (isCharged ? 1.15 : 1.0), skill.range, camera, confirmedAim);
        const scM = isCharged ? 1.72 : 1.18;
        this._spawnProjectile({
          skill,
          isCharged,
          shape: 'orb',
          x: handX, y: handY, z: handZ,
          vx: v.vx, vy: v.vy, vz: v.vz,
          rotX: v.pitch || 0,
          rotY: v.yaw,
          scale: [0.26 * scM, 0.26 * scM, 0.26 * scM],
          col: isCharged ? [1.40, 0.72, 0.24] : [1.18, 0.52, 0.16],
          alpha: 0.90,
          dmg: rawSkillDmg,
          hitRadius: isCharged ? 1.48 : 1.02,
          pierce: isCharged ? 2 : 1,
          trailKind: 'fire_spark',
          life: skill.range / skill.speed,
        });
      } else if (skill.id === 'fire_skill1') {
        // 焰遁步: 朝着人物面对方向短距突进位移，起点与终点各留一簇小火苗与火星
        this.buffs.dodgeTimer = Math.max(this.buffs.dodgeTimer, skill.dodgeSec);
        this._spawnFlameCluster(p[0], groundY, p[2]); // Start flame cluster
        camera.triggerDash(fwdX, fwdZ, skill.dashDist, skill.dashDur, 'fire');
        this.activeDashSkill = 'fire_skill1';
        this.dashTrailAcc = 0;
      } else if (skill.id === 'fire_skill2') {
        // 爆炎诀: 直接在前方目标或身前引爆烈焰造成群伤
        const autoTgt = !confirmedAim ? this._findAimTarget(p, aimYaw, skill.range || 19.0, 0.62) : null;
        const cx = confirmedAim && confirmedAim.targetX !== undefined ? confirmedAim.targetX : (autoTgt ? autoTgt.x : (p[0] + fwdX * 8.5));
        const cz = confirmedAim && confirmedAim.targetZ !== undefined ? confirmedAim.targetZ : (autoTgt ? autoTgt.z : (p[2] + fwdZ * 8.5));
        const cy = T.getMeshTerrainHeight(cx, cz);

        // Expanding flame blast sphere
        this._spawnEffect({
          shape: 'orb',
          x: cx, y: cy + 0.95, z: cz,
          s0: 0.45, s1: skill.aoeRadius * 0.56,
          life: 0.42,
          col: [1.0, 0.42, 0.12],
          alpha: 0.66,
        });
        this._spawnEffect({
          shape: 'orb',
          x: cx, y: cy + 0.85, z: cz,
          s0: 0.30, s1: skill.aoeRadius * 0.34,
          life: 0.30,
          col: [1.0, 0.82, 0.34],
          alpha: 0.62,
        });
        this._spawnEffect({
          shape: 'ring',
          x: cx, y: cy + 0.14, z: cz,
          sx0: 0.55, sy0: 1.0, sz0: 0.55,
          sx1: skill.aoeRadius, sy1: 1.0, sz1: skill.aoeRadius,
          life: 0.46,
          col: [1.0, 0.54, 0.18],
          alpha: 0.52,
        });
        // 12 outward flying sparks
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + Math.random() * 0.35;
          const spd = 4.2 + Math.random() * 4.2;
          this._spawnEffect({
            shape: 'orb',
            x: cx + Math.cos(a) * 0.45,
            y: cy + 0.55,
            z: cz + Math.sin(a) * 0.45,
            vx: Math.cos(a) * spd,
            vy: 3.2 + Math.random() * 3.0,
            vz: Math.sin(a) * spd,
            gravity: 11.0,
            s0: 0.11, s1: 0.03,
            life: 0.46 + Math.random() * 0.22,
            col: i % 2 === 0 ? [1.0, 0.78, 0.28] : [1.0, 0.38, 0.12],
            alpha: 0.78,
          });
        }
        if (monsterSystem) {
          for (const m of monsterSystem.monsters) {
            if (!m.alive || !m.visible) continue;
            const d = Math.hypot(m.x - cx, m.z - cz);
            if (d <= skill.aoeRadius + (m.spec.colRadius || 1.1)) {
              monsterSystem.applyDamageToMonster(m, rawSkillDmg, {
                color: '#ff9052',
              });
            }
          }
        }
        if (this.oreSystem) this.oreSystem.applyAreaDamage(cx, cz, skill.aoeRadius, rawSkillDmg);
        if (this.npcSystem) this.npcSystem.applyAreaDamage(cx, cz, skill.aoeRadius, rawSkillDmg, { label: '爆炎', color: '#ff8a44' }, monsterSystem);

      // -------------------- 土系 (EARTH) --------------------
      } else if (skill.id === 'earth_basic') {
        // 厚土拳: 沉稳重岩灵弹，满蓄力化作金纹陨石巨拳
        const v = this._computeProjectileVelocity(p, handY, aimYaw, skill.speed * (isCharged ? 1.15 : 1.0), skill.range, camera, confirmedAim);
        const scM = isCharged ? 1.72 : 1.18;
        this._spawnProjectile({
          skill,
          isCharged,
          shape: 'rock',
          x: handX, y: handY, z: handZ,
          vx: v.vx, vy: v.vy, vz: v.vz,
          rotX: v.pitch || 0,
          rotY: v.yaw,
          spinX: isCharged ? 10.0 : 6.0, spinY: isCharged ? 7.5 : 4.5,
          scale: [0.34 * scM, 0.31 * scM, 0.34 * scM],
          col: isCharged ? [1.22, 0.96, 0.48] : [0.94, 0.74, 0.40],
          alpha: 0.90,
          dmg: rawSkillDmg,
          hitRadius: isCharged ? 1.55 : 1.12,
          pierce: isCharged ? 2 : 1,
          trailKind: 'earth_dust',
          life: skill.range / skill.speed,
        });
      } else if (skill.id === 'earth_skill1') {
        // 岩甲诀: 获得按气血比例凝聚的短时土盾减伤，受击碎盾
        const shAmt = this._calcHpAmt(skill.shieldPct, vitals);
        this.buffs.shieldHp = shAmt;
        this.buffs.shieldMax = shAmt;
        this.buffs.shieldTimer = skill.shieldDur;
        this.buffs.shieldDamageReduce = skill.damageReduce;
        this.buffs.shieldKind = 'lianqi';
        if (monsterSystem) {
          monsterSystem.spawnFloatingText(p[0], p[1] + 2.35, p[2], `岩甲护盾 ${shAmt}`, '#ecd28a');
        }
        this._spawnEffect({
          shape: 'ring',
          x: p[0], y: groundY + 0.12, z: p[2],
          sx0: 0.55, sy0: 1.0, sz0: 0.55,
          sx1: 2.1, sy1: 1.0, sz1: 2.1,
          life: 0.50,
          col: [0.84, 0.68, 0.38],
          alpha: 0.48,
        });
      } else if (skill.id === 'earth_skill2') {
        // 地刺震: 脚边冒出一圈短小土锥与土黄震波环，击退/震晕近身目标
        this._spawnEffect({
          shape: 'ring',
          x: p[0], y: groundY + 0.12, z: p[2],
          sx0: 0.8, sy0: 1.0, sz0: 0.8,
          sx1: skill.aoeRadius, sy1: 1.0, sz1: skill.aoeRadius,
          life: 0.54,
          col: [0.86, 0.70, 0.38],
          alpha: 0.56,
        });
        // 8 short earthen spikes erupting in a circle around feet
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.2;
          const r = 2.0 + (i % 2) * 1.05;
          const sx = p[0] + Math.cos(a) * r;
          const sz = p[2] + Math.sin(a) * r;
          const sy = T.getMeshTerrainHeight(sx, sz);
          this._spawnEffect({
            shape: 'spike',
            x: sx, y: sy - 0.06, z: sz,
            rotY: a,
            rotZ: (i % 2 === 0 ? 0.14 : -0.14),
            sx0: 0.58, sy0: 0.15, sz0: 0.58,
            sx1: 0.72, sy1: 1.35 + (i % 2) * 0.35, sz1: 0.72,
            growPop: true,
            life: 0.82,
            col: i % 2 === 0 ? [0.76, 0.60, 0.34] : [0.86, 0.72, 0.44],
            alpha: 0.80,
          });
        }
        // Subtle dust puffs
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this._spawnEffect({
            shape: 'orb',
            x: p[0] + Math.cos(a) * 1.8,
            y: groundY + 0.28,
            z: p[2] + Math.sin(a) * 1.8,
            vx: Math.cos(a) * 2.4, vy: 1.2, vz: Math.sin(a) * 2.4,
            s0: 0.22, s1: 0.45,
            life: 0.45,
            col: [0.80, 0.68, 0.46],
            alpha: 0.34,
          });
        }
        if (monsterSystem) {
          for (const m of monsterSystem.monsters) {
            if (!m.alive || !m.visible) continue;
            const dx = m.x - p[0];
            const dz = m.z - p[2];
            const d = Math.hypot(dx, dz);
            if (d <= skill.aoeRadius + (m.spec.colRadius || 1.1)) {
              const ux = d > 0.01 ? dx / d : fwdX;
              const uz = d > 0.01 ? dz / d : fwdZ;
              monsterSystem.applyDamageToMonster(m, rawSkillDmg, {
                knockX: ux * skill.knockback,
                knockZ: uz * skill.knockback,
                stunSec: skill.stunSec,
                label: '震晕',
                color: '#f0cf7e',
              });
            }
          }
        }
        if (this.oreSystem) this.oreSystem.applyAreaDamage(p[0], p[2], skill.aoeRadius, rawSkillDmg);
        if (this.npcSystem) this.npcSystem.applyAreaDamage(p[0], p[2], skill.aoeRadius, rawSkillDmg, { knockback: skill.knockback, stunSec: skill.stunSec, label: '地刺·震晕', color: '#f0cf7a' }, monsterSystem);

      // =====================================================================
      // 筑基期技能 (FOUNDATION-ESTABLISHMENT SKILLS — 5 Elements × 2 = 10)
      // =====================================================================
      } else if (skill.id === 'metal_zhuji1') {
        // 御剑穿心: 身侧浮现 3 柄亮金细长几何剑影，朝所指方向依次疾射
        const offsets = [
          { rx: -0.92, ry: 1.85, rz: -0.25, delay: 0.08 },
          { rx:  0.00, ry: 2.28, rz: -0.35, delay: 0.24 },
          { rx:  0.92, ry: 1.85, rz: -0.25, delay: 0.40 },
        ];
        const vAim = this._computeProjectileVelocity(p, handY + 0.5, aimYaw, skill.speed, skill.range, camera, confirmedAim);
        for (const off of offsets) {
          this.stagedSwords.push({
            skill,
            rx: off.rx, ry: off.ry, rz: off.rz,
            delay: off.delay,
            aimYaw,
            vAim,
          });
        }
      } else if (skill.id === 'metal_zhuji2') {
        // 金罡护体刃: 4 片淡金菱形剑气围绕主角慢速旋转，短时格挡减伤 + 受击外弹金芒反伤
        this.buffs.metalBladeTimer = skill.duration;
        this.buffs.metalBladeDr = skill.damageReduce;
        this.buffs.metalBladeReflectDmg = rawSkillDmg;
        this.buffs.metalBladeReflectR = skill.reflectRadius;
        if (monsterSystem) {
          monsterSystem.spawnFloatingText(p[0], p[1] + 2.38, p[2], '金罡护体刃', '#ffea92');
        }
        this._spawnEffect({
          shape: 'ring',
          x: p[0], y: groundY + 0.16, z: p[2],
          sx0: 0.7, sy0: 1.0, sz0: 0.7,
          sx1: 2.6, sy1: 1.0, sz1: 2.6,
          spinY: 3.0,
          life: 0.52,
          col: [1.0, 0.88, 0.44],
          alpha: 0.58,
        });
      } else if (skill.id === 'wood_zhuji1') {
        // 青藤绞杀: 直接在前方目标或身前升起翠绿圆环 + 4 根带小刺的深绿/嫩绿藤蔓交错隆起
        const autoTgt = !confirmedAim ? this._findAimTarget(p, aimYaw, skill.range || 20.0, 0.62) : null;
        const cx = confirmedAim && confirmedAim.targetX !== undefined ? confirmedAim.targetX : (autoTgt ? autoTgt.x : (p[0] + fwdX * 9.5));
        const cz = confirmedAim && confirmedAim.targetZ !== undefined ? confirmedAim.targetZ : (autoTgt ? autoTgt.z : (p[2] + fwdZ * 9.5));
        const cy = T.getMeshTerrainHeight(cx, cz);

        // Double emerald ring
        this._spawnEffect({
          shape: 'ring', x: cx, y: cy + 0.12, z: cz,
          sx0: 0.8, sy0: 1.0, sz0: 0.8, sx1: skill.aoeRadius, sy1: 1.0, sz1: skill.aoeRadius,
          spinY: 1.6, life: 1.2, col: [0.30, 0.88, 0.40], alpha: 0.58,
        });
        // 4 intertwined thorny dark-green & light-green vines rising into a snare cage
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.4;
          const r = 1.35 + (i % 2) * 0.45;
          this._spawnEffect({
            shape: 'thorny_vine',
            x: cx + Math.cos(a) * r, y: cy - 0.06, z: cz + Math.sin(a) * r,
            rotY: a + Math.PI,
            rotX: 0.42, // Arch inward to crisscross!
            sx0: 0.9, sy0: 0.2, sz0: 0.9,
            sx1: 1.15, sy1: 2.85 + (i % 2) * 0.4, sz1: 1.15,
            growPop: true,
            life: skill.duration,
            col: i % 2 === 0 ? [0.18, 0.62, 0.26] : [0.48, 0.92, 0.44],
            alpha: 0.84,
          });
        }
        // Floating green leaves
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          this._spawnEffect({
            shape: 'leaf',
            x: cx + Math.cos(a) * (1.2 + Math.random() * 1.4),
            y: cy + 1.8 + Math.random() * 1.2,
            z: cz + Math.sin(a) * (1.2 + Math.random() * 1.4),
            vx: Math.cos(a) * 0.9, vy: -0.75 - Math.random() * 0.4, vz: Math.sin(a) * 0.9,
            spinY: 5.0, spinX: 2.8,
            s0: 0.30, s1: 0.18,
            life: 1.4 + Math.random() * 0.5,
            col: [0.54, 0.95, 0.48], alpha: 0.78,
          });
        }
        // Register persistent DoT snare zone & deal immediate hit + root
        this.zones.push({
          kind: 'wood_vine',
          skill,
          x: cx, y: cy, z: cz,
          radius: skill.aoeRadius,
          timer: skill.duration,
          tickAcc: 0,
          vfxAcc: 0,
        });
        if (monsterSystem) {
          for (const m of monsterSystem.monsters) {
            if (!m.alive || !m.visible) continue;
            if (Math.hypot(m.x - cx, m.z - cz) <= skill.aoeRadius + (m.spec.colRadius || 1.1)) {
              monsterSystem.applyDamageToMonster(m, rawSkillDmg, {
                rootSec: skill.rootSec,
                label: '绞杀·定身',
                color: '#76f592',
              });
            }
          }
        }
        if (this.oreSystem) this.oreSystem.applyAreaDamage(cx, cz, skill.aoeRadius, rawSkillDmg);
        if (this.npcSystem) this.npcSystem.applyAreaDamage(cx, cz, skill.aoeRadius, rawSkillDmg, { rootSec: skill.rootSec, label: '青藤绞杀', color: '#78f294' }, monsterSystem);
      } else if (skill.id === 'wood_zhuji2') {
        // 木灵聚气环: 脚下生出灵木光环与旋转绿叶，按气血比例持续回血并略微提速
        const healNow = this._calcHpAmt(skill.healInstantPct, vitals);
        const healHot = this._calcHpAmt(skill.healOverTimePct, vitals);
        const before = vitals.hp;
        vitals.hp = Math.min(vitals.maxHp, vitals.hp + healNow);
        const gained = Math.round(vitals.hp - before);
        this.buffs.woodAuraTimer = skill.duration;
        this.buffs.woodAuraRate = healHot / skill.duration;
        this.buffs.woodAuraSpeed = skill.speedRatio;
        this.buffs.woodAuraVfxAcc = 0;
        if (monsterSystem) {
          monsterSystem.spawnFloatingText(p[0], p[1] + 2.38, p[2], `木灵聚气 +${Math.max(gained, healNow)}`, '#7cf8a4');
        }
        this._spawnRejuvenateMotes(p[0], p[1], p[2], 10);
      } else if (skill.id === 'water_zhuji1') {
        // 惊涛拍岸: 向前推出一道半透明浅蓝弧形水墙，浪尖带小水珠与白色浪花，击退前方敌人并造成水伤
        const wYaw = Math.atan2(fwdX, fwdZ);
        this.waveWalls.push({
          skill,
          x: p[0] + fwdX * 1.4,
          z: p[2] + fwdZ * 1.4,
          dirX: fwdX,
          dirZ: fwdZ,
          yaw: wYaw,
          speed: 17.5,
          traveled: 0,
          maxDist: skill.range,
          width: skill.waveWidth,
          hitIds: new Set(),
          foamAcc: 0,
          modelMat: M.mat4(),
        });
      } else if (skill.id === 'water_zhuji2') {
        // 寒霜凝滞: 直接在前方目标或身前凝出半透明冰蓝六角冰面 + 3 根矮小冰棱与淡白寒雾
        const autoTgt = !confirmedAim ? this._findAimTarget(p, aimYaw, skill.range || 20.0, 0.62) : null;
        const cx = confirmedAim && confirmedAim.targetX !== undefined ? confirmedAim.targetX : (autoTgt ? autoTgt.x : (p[0] + fwdX * 9.5));
        const cz = confirmedAim && confirmedAim.targetZ !== undefined ? confirmedAim.targetZ : (autoTgt ? autoTgt.z : (p[2] + fwdZ * 9.5));
        const cy = T.getMeshTerrainHeight(cx, cz);

        // 3 short translucent ice prisms erupting from the hex ice slab
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + 0.5;
          const r = 1.4 + i * 0.45;
          this._spawnEffect({
            shape: 'spike',
            x: cx + Math.cos(a) * r, y: cy - 0.04, z: cz + Math.sin(a) * r,
            rotY: a, rotZ: (i - 1) * 0.14,
            sx0: 0.42, sy0: 0.15, sz0: 0.42,
            sx1: 0.56, sy1: 1.45 + (i % 2) * 0.35, sz1: 0.56,
            growPop: true,
            life: skill.duration,
            col: [0.64, 0.90, 1.0],
            alpha: 0.72,
          });
        }
        this.zones.push({
          kind: 'water_frost',
          skill,
          x: cx, y: cy, z: cz,
          radius: skill.aoeRadius,
          timer: skill.duration,
          tickAcc: 0,
          vfxAcc: 0,
          modelMat: M.mat4(),
        });
        if (monsterSystem) {
          for (const m of monsterSystem.monsters) {
            if (!m.alive || !m.visible) continue;
            if (Math.hypot(m.x - cx, m.z - cz) <= skill.aoeRadius + (m.spec.colRadius || 1.1)) {
              monsterSystem.applyDamageToMonster(m, rawSkillDmg, {
                slowSec: skill.slowSec,
                slowRatio: skill.slowRatio,
                label: '寒霜·重缓',
                color: '#8ee6ff',
              });
            }
          }
        }
        if (this.oreSystem) this.oreSystem.applyAreaDamage(cx, cz, skill.aoeRadius, rawSkillDmg);
        if (this.npcSystem) this.npcSystem.applyAreaDamage(cx, cz, skill.aoeRadius, rawSkillDmg, { slowSec: skill.slowSec, slowRatio: skill.slowRatio, label: '寒霜凝滞', color: '#8ee6ff' }, monsterSystem);
      } else if (skill.id === 'fire_zhuji1') {
        // 烈焰爆弹: 比练气期大一圈的亮橙红火球，朝目标范围飞射并爆炸
        const v = this._computeProjectileVelocity(p, handY + 0.1, aimYaw, skill.speed, skill.range, camera, confirmedAim);
        this._spawnProjectile({
          skill,
          shape: 'orb',
          x: handX, y: handY + 0.1, z: handZ,
          vx: v.vx, vy: v.vy, vz: v.vz,
          rotX: v.pitch || 0,
          rotY: v.yaw,
          scale: [0.42, 0.42, 0.42],
          col: [1.0, 0.38, 0.10],
          alpha: 0.86,
          dmg: rawSkillDmg,
          hitRadius: 1.25,
          pierce: 1,
          trailKind: 'fire_zhuji_tail',
          life: skill.range / skill.speed,
        });
      } else if (skill.id === 'fire_zhuji2') {
        // 炎息燎原: 身前张开半透明赤红与亮橙扇形火幕，边缘跳动小火苗，持续扇形灼烧
        this.flameFans.push({
          skill,
          yaw: Math.atan2(fwdX, fwdZ),
          fwdX, fwdZ,
          timer: skill.duration,
          tickAcc: 0.32,
          vfxAcc: 0,
          outerMat: M.mat4(),
          innerMat: M.mat4(),
        });
      } else if (skill.id === 'earth_zhuji1') {
        // 厚土重盾: 4 块灰黄/土黄圆角岩板悬浮环绕，按气血比例提供重盾+减伤
        const shAmt = this._calcHpAmt(skill.shieldPct, vitals);
        this.buffs.shieldHp = shAmt;
        this.buffs.shieldMax = shAmt;
        this.buffs.shieldTimer = skill.shieldDur;
        this.buffs.shieldDamageReduce = skill.damageReduce;
        this.buffs.shieldKind = 'zhuji';
        if (monsterSystem) {
          monsterSystem.spawnFloatingText(p[0], p[1] + 2.38, p[2], `厚土重盾 ${shAmt}`, '#f2d98c');
        }
        this._spawnEffect({
          shape: 'ring',
          x: p[0], y: groundY + 0.14, z: p[2],
          sx0: 0.7, sy0: 1.0, sz0: 0.7,
          sx1: 2.8, sy1: 1.0, sz1: 2.8,
          life: 0.54,
          col: [0.88, 0.74, 0.42],
          alpha: 0.56,
        });
      } else if (skill.id === 'earth_zhuji2') {
        // 震地碎岩: 脚下扩散土黄震波环，周围地面拱起几块带棱角的土石块，击退震晕近身敌人
        this._spawnEffect({
          shape: 'ring',
          x: p[0], y: groundY + 0.14, z: p[2],
          sx0: 0.9, sy0: 1.0, sz0: 0.9,
          sx1: skill.aoeRadius, sy1: 1.0, sz1: skill.aoeRadius,
          life: 0.62,
          col: [0.88, 0.72, 0.38],
          alpha: 0.64,
        });
        this._spawnEffect({
          shape: 'ring',
          x: p[0], y: groundY + 0.24, z: p[2],
          sx0: 0.5, sy0: 1.0, sz0: 0.5,
          sx1: skill.aoeRadius * 0.68, sy1: 1.0, sz1: skill.aoeRadius * 0.68,
          life: 0.48,
          col: [0.96, 0.84, 0.52],
          alpha: 0.50,
        });
        // 7 jagged angular earth boulders erupting around the protagonist
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + 0.25;
          const r = 2.4 + (i % 2) * 1.45;
          const bx = p[0] + Math.cos(a) * r;
          const bz = p[2] + Math.sin(a) * r;
          const by = T.getMeshTerrainHeight(bx, bz);
          this._spawnEffect({
            shape: 'rock',
            x: bx, y: by + 0.38, z: bz,
            rotY: a, rotX: 0.3 * (i % 2 ? 1 : -1),
            sx0: 0.45, sy0: 0.18, sz0: 0.45,
            sx1: 0.86 + (i % 2) * 0.22, sy1: 1.05 + (i % 2) * 0.30, sz1: 0.78,
            growPop: true,
            life: 1.05,
            col: i % 2 === 0 ? [0.72, 0.58, 0.34] : [0.82, 0.68, 0.42],
            alpha: 0.84,
          });
        }
        this._spawnRockBurst(p[0], groundY + 0.6, p[2], 10);
        if (monsterSystem) {
          for (const m of monsterSystem.monsters) {
            if (!m.alive || !m.visible) continue;
            const dx = m.x - p[0], dz = m.z - p[2];
            const d = Math.hypot(dx, dz);
            if (d <= skill.aoeRadius + (m.spec.colRadius || 1.1)) {
              const ux = d > 0.01 ? dx / d : fwdX;
              const uz = d > 0.01 ? dz / d : fwdZ;
              monsterSystem.applyDamageToMonster(m, rawSkillDmg, {
                knockX: ux * skill.knockback,
                knockZ: uz * skill.knockback,
                stunSec: skill.stunSec,
                label: '碎岩·震晕',
                color: '#f5d27a',
              });
            }
          }
        }
        if (this.oreSystem) this.oreSystem.applyAreaDamage(p[0], p[2], skill.aoeRadius, rawSkillDmg);
        if (this.npcSystem) this.npcSystem.applyAreaDamage(p[0], p[2], skill.aoeRadius, rawSkillDmg, { knockback: skill.knockback, stunSec: skill.stunSec, label: '碎岩·震晕', color: '#f5d27a' }, monsterSystem);
      }
    }

    _spawnRejuvenateMotes(px, py, pz, count) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.45 + Math.random() * 0.75;
        const isLeaf = i % 2 === 0;
        this._spawnEffect({
          shape: isLeaf ? 'leaf' : 'orb',
          x: px + Math.cos(a) * r,
          y: py + 0.35 + Math.random() * 0.65,
          z: pz + Math.sin(a) * r,
          vx: Math.cos(a) * 0.25,
          vy: 1.35 + Math.random() * 0.85,
          vz: Math.sin(a) * 0.25,
          spinY: isLeaf ? 4.5 : 0,
          s0: isLeaf ? 0.22 : 0.09,
          s1: isLeaf ? 0.14 : 0.04,
          life: 0.85 + Math.random() * 0.35,
          col: isLeaf ? [0.58, 0.95, 0.56] : [0.74, 1.0, 0.78],
          alpha: 0.62,
        });
      }
    }

    _spawnWaterSlideRipple(px, groundY, pz) {
      this._spawnEffect({
        shape: 'ring',
        x: px, y: groundY + 0.08, z: pz,
        sx0: 0.45, sy0: 1.0, sz0: 0.45,
        sx1: 1.85, sy1: 1.0, sz1: 1.85,
        life: 0.48,
        col: [0.52, 0.86, 1.0],
        alpha: 0.48,
      });
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        this._spawnEffect({
          shape: 'orb',
          x: px + Math.cos(a) * 0.35,
          y: groundY + 0.16,
          z: pz + Math.sin(a) * 0.35,
          vx: Math.cos(a) * 1.6, vy: 1.2 + Math.random() * 0.9, vz: Math.sin(a) * 1.6,
          gravity: 8.5,
          s0: 0.10, s1: 0.04,
          life: 0.38,
          col: [0.76, 0.95, 1.0],
          alpha: 0.58,
        });
      }
    }

    _onProjectileHit(p, monster, monsterSystem) {
      const sk = p.skill;
      if (monster && monsterSystem) {
        const opts = {};
        if (sk.staggerSec) {
          opts.staggerSec = sk.staggerSec;
          opts.label = '硬直';
          opts.color = '#ffe588';
        } else if (sk.slowSec) {
          opts.slowSec = sk.slowSec;
          opts.slowRatio = sk.slowRatio || 0.70;
          opts.label = '缓速';
          opts.color = '#80f09a';
        } else if (sk.knockback) {
          const spd = Math.hypot(p.vx, p.vz) || 1.0;
          opts.knockX = (p.vx / spd) * sk.knockback;
          opts.knockZ = (p.vz / spd) * sk.knockback;
          opts.color = '#e8c87a';
        } else if (sk.element === 'fire') {
          opts.color = '#ff9454';
        } else if (sk.element === 'water') {
          opts.color = '#7fd8ff';
        } else if (sk.element === 'metal') {
          opts.color = '#ffe27a';
        }
        monsterSystem.applyDamageToMonster(monster, p.dmg, opts);
      }

      // Per-skill restrained Qi-Refining impact VFX
      if (sk.id === 'metal_basic') {
        // 命中溅少量金星
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 2.5 + Math.random() * 3.5;
          this._spawnEffect({
            shape: 'shard',
            x: p.x, y: p.y, z: p.z,
            vx: Math.cos(a) * spd, vy: 1.0 + Math.random() * 2.2, vz: Math.sin(a) * spd,
            rotY: a,
            sx0: 0.06, sy0: 0.06, sz0: 0.28,
            sx1: 0.02, sy1: 0.02, sz1: 0.08,
            life: 0.28,
            col: [1.0, 0.92, 0.54],
            alpha: 0.74,
          });
        }
      } else if (sk.id === 'metal_skill2') {
        // 命中炸开一圈金芒
        this._spawnEffect({
          shape: 'ring',
          x: p.x, y: p.y, z: p.z,
          rotX: Math.PI * 0.5, rotY: p.rotY,
          s0: 0.30, s1: 1.95,
          life: 0.34,
          col: [1.0, 0.88, 0.44],
          alpha: 0.64,
        });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const spd = 3.8 + Math.random() * 2.5;
          this._spawnEffect({
            shape: 'shard',
            x: p.x, y: p.y, z: p.z,
            vx: Math.cos(a) * spd, vy: (Math.random() - 0.3) * 3.2, vz: Math.sin(a) * spd,
            rotY: a,
            sx0: 0.08, sy0: 0.08, sz0: 0.42,
            sx1: 0.02, sy1: 0.02, sz1: 0.12,
            life: 0.34,
            col: [1.0, 0.94, 0.62],
            alpha: 0.76,
          });
        }
      } else if (sk.id === 'wood_basic') {
        // 碎叶散开
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.random() * 0.6;
          this._spawnEffect({
            shape: 'leaf',
            x: p.x, y: p.y, z: p.z,
            vx: Math.cos(a) * 2.2, vy: 1.2 + Math.random() * 1.2, vz: Math.sin(a) * 2.2,
            spinY: 6.0,
            s0: 0.22, s1: 0.12,
            life: 0.42,
            col: [0.54, 0.94, 0.48],
            alpha: 0.68,
          });
        }
      } else if (sk.id === 'water_basic') {
        // 命中炸开小水花
        this._spawnEffect({
          shape: 'ring',
          x: p.x, y: p.y, z: p.z,
          s0: 0.25, s1: 1.35,
          life: 0.30,
          col: [0.58, 0.88, 1.0],
          alpha: 0.48,
        });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
          const spd = 2.0 + Math.random() * 2.4;
          this._spawnEffect({
            shape: 'orb',
            x: p.x, y: p.y, z: p.z,
            vx: Math.cos(a) * spd, vy: 1.8 + Math.random() * 2.0, vz: Math.sin(a) * spd,
            gravity: 11.0,
            s0: 0.11, s1: 0.04,
            life: 0.36,
            col: [0.72, 0.93, 1.0],
            alpha: 0.62,
          });
        }
      } else if (sk.id === 'fire_basic') {
        // 火球小爆裂火星
        this._spawnEffect({
          shape: 'orb',
          x: p.x, y: p.y, z: p.z,
          s0: 0.24, s1: 0.72,
          life: 0.22,
          col: [1.0, 0.50, 0.16],
          alpha: 0.58,
        });
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 2.4 + Math.random() * 2.8;
          this._spawnEffect({
            shape: 'orb',
            x: p.x, y: p.y, z: p.z,
            vx: Math.cos(a) * spd, vy: 1.5 + Math.random() * 2.0, vz: Math.sin(a) * spd,
            gravity: 9.0,
            s0: 0.09, s1: 0.02,
            life: 0.34,
            col: [1.0, 0.76, 0.28],
            alpha: 0.76,
          });
        }
      } else if (sk.id === 'earth_basic') {
        // 沉稳尘土与碎石溅射
        this._spawnEffect({
          shape: 'ring',
          x: p.x, y: p.y - 0.15, z: p.z,
          s0: 0.32, s1: 1.55,
          life: 0.32,
          col: [0.82, 0.66, 0.38],
          alpha: 0.46,
        });
        this._spawnRockBurst(p.x, p.y, p.z, 4);
      } else if (sk.id === 'metal_zhuji1') {
        // 御剑穿心命中: 闪出锐利十字火花!
        for (const ang of [0, Math.PI * 0.5]) {
          this._spawnEffect({
            shape: 'shard',
            x: p.x, y: p.y, z: p.z,
            rotY: p.rotY + Math.PI * 0.5, rotX: ang,
            sx0: 0.10, sy0: 0.10, sz0: 1.35,
            sx1: 0.02, sy1: 0.02, sz1: 1.75,
            life: 0.24,
            col: [1.0, 0.96, 0.66],
            alpha: 0.84,
          });
        }
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 3.5 + Math.random() * 3.5;
          this._spawnEffect({
            shape: 'shard', x: p.x, y: p.y, z: p.z,
            vx: Math.cos(a) * spd, vy: 1.0 + Math.random() * 2.5, vz: Math.sin(a) * spd,
            rotY: a, sx0: 0.06, sy0: 0.06, sz0: 0.34, sx1: 0.02, sy1: 0.02, sz1: 0.08,
            life: 0.28, col: [1.0, 0.90, 0.48], alpha: 0.78,
          });
        }
      } else if (sk.id === 'fire_zhuji1') {
        // 烈焰爆弹命中: 中等范围爆炸伤害 + 橙黄火环与四散火星!
        const rBlast = sk.aoeRadius || 5.2;
        const gy = T.getMeshTerrainHeight(p.x, p.z);
        this._spawnEffect({
          shape: 'ring', x: p.x, y: Math.max(gy + 0.14, p.y - 0.5), z: p.z,
          sx0: 0.7, sy0: 1.0, sz0: 0.7, sx1: rBlast, sy1: 1.0, sz1: rBlast,
          life: 0.52, col: [1.0, 0.74, 0.24], alpha: 0.66,
        });
        this._spawnEffect({
          shape: 'orb', x: p.x, y: p.y, z: p.z,
          s0: 0.55, s1: rBlast * 0.52, life: 0.40,
          col: [1.0, 0.42, 0.12], alpha: 0.68,
        });
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
          const spd = 4.8 + Math.random() * 4.8;
          this._spawnEffect({
            shape: 'orb', x: p.x, y: p.y, z: p.z,
            vx: Math.cos(a) * spd, vy: 3.0 + Math.random() * 3.4, vz: Math.sin(a) * spd,
            gravity: 11.5, s0: 0.13, s1: 0.03, life: 0.52 + Math.random() * 0.2,
            col: i % 2 === 0 ? [1.0, 0.80, 0.30] : [1.0, 0.36, 0.10], alpha: 0.80,
          });
        }
        // Apply AoE explosion damage to all other monsters inside blast radius (direct target already took hit)
        const splashDmg = this._calcAtkDmg(sk.splashDmgPct || (sk.dmgPct * 0.80));
        if (monsterSystem) {
          for (const m of monsterSystem.monsters) {
            if (!m.alive || !m.visible || (monster && m.id === monster.id)) continue;
            if (Math.hypot(m.x - p.x, m.z - p.z) <= rBlast + (m.spec.colRadius || 1.1)) {
              monsterSystem.applyDamageToMonster(m, splashDmg, {
                label: '烈焰爆',
                color: '#ff9648',
              });
            }
          }
        }
        if (this.npcSystem) {
          this.npcSystem.applyAreaDamage(p.x, p.z, rBlast, splashDmg, { label: '烈焰爆', color: '#ff9648' }, monsterSystem);
        }
        if (this.oreSystem) {
          this.oreSystem.applyAreaDamage(p.x, p.z, rBlast, splashDmg);
        }
      }
      // 强化命中通用震波：满蓄力普攻与所有练气/筑基弹道命中均附带耀眼光爆环与飞溅灵芒
      const impCol = p.col || [1.0, 0.92, 0.54];
      const impBoost = p.isCharged ? 1.85 : (sk.realm === 'zhuji' ? 1.55 : 1.15);
      this._spawnEffect({
        shape: 'ring',
        x: p.x, y: p.y, z: p.z,
        s0: 0.25 * impBoost, s1: 1.75 * impBoost,
        spinY: p.isCharged ? 6.0 : 3.2,
        life: p.isCharged ? 0.44 : 0.30,
        col: [Math.min(1.45, impCol[0] * 1.25), Math.min(1.45, impCol[1] * 1.25), Math.min(1.45, impCol[2] * 1.25)],
        alpha: p.isCharged ? 0.88 : 0.70,
      });
      if (p.isCharged || sk.realm === 'zhuji') {
        this._spawnEffect({
          shape: 'orb',
          x: p.x, y: p.y, z: p.z,
          s0: 0.36 * impBoost, s1: 1.15 * impBoost,
          life: 0.30,
          col: [Math.min(1.5, impCol[0] * 1.35), Math.min(1.5, impCol[1] * 1.35), Math.min(1.5, impCol[2] * 1.35)],
          alpha: 0.80,
        });
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + Math.random() * 0.3;
          const spd = 4.5 + Math.random() * 4.2;
          this._spawnEffect({
            shape: 'shard', x: p.x, y: p.y, z: p.z,
            vx: Math.cos(a) * spd, vy: 1.4 + Math.random() * 2.8, vz: Math.sin(a) * spd,
            rotY: a, sx0: 0.09, sy0: 0.09, sz0: 0.48, sx1: 0.02, sy1: 0.02, sz1: 0.12,
            life: 0.36, col: impCol, alpha: 0.86,
          });
        }
      }
    }

    update(dt, elapsed, camera, vitals, monsterSystem, paused) {
      this._lastMonsterSystem = monsterSystem;
      if (vitals && vitals.atk) this.playerAtk = vitals.atk;
      if (vitals && vitals.maxHp) this.playerMaxHp = vitals.maxHp;
      const cdt = Math.min(dt, 0.05);
      if (paused) return;

      const pPos = camera.playerPos;

      // 0. 普攻长按蓄力计时与聚灵特效（满 3.0s 蓄力圆满，释放造成双倍伤害）
      if (this.basicCharge.active) {
        const sk0 = this.getSkillBySlot(0);
        if (!sk0 || !this.canUseSkill(sk0)) {
          this.cancelBasicCharge();
        } else {
          this.basicCharge.elapsed = Math.min(this.basicCharge.maxSec + 10, this.basicCharge.elapsed + cdt);
          const pct = M.clamp(this.basicCharge.elapsed / this.basicCharge.maxSec, 0, 1);
          const chCol = sk0.col || this.getCurrentElement().col;
          const chAcc = sk0.accentCol || this.getCurrentElement().accentCol;
          this.basicCharge.vfxAcc += cdt;
          const interval = pct >= 1.0 ? 0.14 : M.lerp(0.24, 0.12, pct);
          if (this.basicCharge.vfxAcc >= interval) {
            this.basicCharge.vfxAcc = 0;
            const gY = T.getWalkableHeight(pPos[0], pPos[2], pPos[1]);
            this._spawnEffect({
              shape: 'ring',
              x: pPos[0], y: gY + 0.16, z: pPos[2],
              sx0: M.lerp(2.2, 1.8, pct), sy0: 1.0, sz0: M.lerp(2.2, 1.8, pct),
              sx1: 0.35, sy1: 1.0, sz1: 0.35,
              spinY: 4.5 + pct * 4.0,
              life: 0.34,
              col: pct >= 1.0 ? [1.35, 1.18, 0.56] : chCol,
              alpha: 0.55 + pct * 0.32,
            });
            for (let k = 0; k < (pct >= 1.0 ? 3 : 2); k++) {
              const a = Math.random() * Math.PI * 2;
              const rad = 1.2 + Math.random() * 0.9;
              this._spawnEffect({
                shape: 'orb',
                x: pPos[0] + Math.cos(a) * rad,
                y: pPos[1] + 0.5 + Math.random() * 1.1,
                z: pPos[2] + Math.sin(a) * rad,
                vx: -Math.cos(a) * rad * 2.4,
                vy: (1.25 - (0.5 + Math.random() * 0.5)) * 1.8,
                vz: -Math.sin(a) * rad * 2.4,
                s0: 0.10 + pct * 0.08, s1: 0.03,
                life: 0.30,
                col: pct >= 1.0 ? [1.4, 1.25, 0.65] : chAcc,
                alpha: 0.82,
              });
            }
          }
          if (!this.basicCharge.ready && this.basicCharge.elapsed >= this.basicCharge.maxSec) {
            this.basicCharge.ready = true;
            const gY = T.getWalkableHeight(pPos[0], pPos[2], pPos[1]);
            this._spawnCastBurst(pPos[0], gY, pPos[2], chCol, [1.4, 1.25, 0.62], false);
            if (monsterSystem) {
              monsterSystem.spawnFloatingText(pPos[0], pPos[1] + 2.55, pPos[2], '蓄力圆满 · 双倍伤害!', '#ffe678');
            }
          }
        }
      }

      // 1. Tick all skill cooldowns
      for (const k of Object.keys(this.cooldowns)) {
        if (this.cooldowns[k] > 0) {
          this.cooldowns[k] = Math.max(0, this.cooldowns[k] - cdt);
        }
      }

      // 2. Tick active cast state machine (windup 前摇 -> execute -> recovery 后摇)
      if (this.bufferTimer > 0) {
        this.bufferTimer = Math.max(0, this.bufferTimer - cdt);
        if (this.bufferTimer <= 0) this.bufferedSlot = null;
      }

      if (this.castState) {
        const cs = this.castState;
        cs.timer -= cdt;
        if (cs.phase === 'windup' && cs.timer <= 0) {
          if (!cs.fired) {
            cs.fired = true;
            this._executeSkill(cs.skill, cs.aimYaw, camera, vitals, monsterSystem, cs.confirmedAim, cs.chargeMul || 1.0);
          }
          cs.phase = 'recovery';
          cs.duration = cs.skill.recovery;
          cs.timer = cs.skill.recovery;
        } else if (cs.phase === 'recovery' && cs.timer <= 0) {
          this.castState = null;
          if (this.bufferedSlot !== null) {
            const nextSlot = this.bufferedSlot;
            this.bufferedSlot = null;
            this.bufferTimer = 0;
            this.tryCast(nextSlot, camera, vitals, monsterSystem);
          }
        }
      }

      // 3. Dash trail VFX while player is dashing (疾金步 / 踏浪滑 / 焰遁步)
      if (camera.dashState && this.activeDashSkill) {
        this.dashTrailAcc += cdt;
        const gY = T.getWalkableHeight(pPos[0], pPos[2], pPos[1]);
        if (this.activeDashSkill === 'metal_skill1' && this.dashTrailAcc >= 0.075) {
          this.dashTrailAcc = 0;
          this._spawnEffect({
            shape: 'silhouette',
            x: pPos[0], y: pPos[1], z: pPos[2],
            rotY: Math.atan2(-Math.sin(camera.charYaw), -Math.cos(camera.charYaw)),
            s0: 0.92, s1: 0.88,
            life: 0.28,
            col: [1.0, 0.90, 0.50],
            alpha: 0.30,
          });
        } else if (this.activeDashSkill === 'water_skill1' && this.dashTrailAcc >= 0.065) {
          this.dashTrailAcc = 0;
          this._spawnWaterSlideRipple(pPos[0], gY, pPos[2]);
        } else if (this.activeDashSkill === 'fire_skill1' && this.dashTrailAcc >= 0.045) {
          this.dashTrailAcc = 0;
          this._spawnEffect({
            shape: 'orb',
            x: pPos[0] + (Math.random() - 0.5) * 0.4,
            y: pPos[1] + 0.45 + Math.random() * 0.4,
            z: pPos[2] + (Math.random() - 0.5) * 0.4,
            vy: 1.5,
            s0: 0.11, s1: 0.03,
            life: 0.28,
            col: [1.0, 0.56, 0.18],
            alpha: 0.72,
          });
        }
      } else if (!camera.dashState && this.activeDashSkill) {
        if (this.activeDashSkill === 'fire_skill1') {
          // 焰遁步 endpoint flame cluster & sparks!
          const gY = T.getWalkableHeight(pPos[0], pPos[2], pPos[1]);
          this._spawnFlameCluster(pPos[0], gY, pPos[2]);
        }
        this.activeDashSkill = null;
      }

      // 4. Tick active buffs & rebuild persistent shieldNodes (岩甲诀 / 厚土重盾 / 金罡护体刃 / 木灵聚气环 / 御剑穿心悬剑 / 惊涛水墙 / 寒霜冰阵 / 炎息火幕)
      if (this.buffs.dodgeTimer > 0) this.buffs.dodgeTimer = Math.max(0, this.buffs.dodgeTimer - cdt);
      if (this.buffs.speedTimer > 0) {
        this.buffs.speedTimer = Math.max(0, this.buffs.speedTimer - cdt);
        if (this.buffs.speedTimer <= 0) this.buffs.speedRatio = 1.0;
      }
      if (this.buffs.regenTimer > 0) {
        this.buffs.regenTimer = Math.max(0, this.buffs.regenTimer - cdt);
        vitals.hp = Math.min(vitals.maxHp, vitals.hp + this.buffs.regenRate * cdt);
        this.buffs.regenVfxAcc += cdt;
        if (this.buffs.regenVfxAcc >= 0.28) {
          this.buffs.regenVfxAcc = 0;
          this._spawnRejuvenateMotes(pPos[0], pPos[1], pPos[2], 2);
        }
      }
      if (this.buffs.metalBladeTimer > 0) {
        this.buffs.metalBladeTimer = Math.max(0, this.buffs.metalBladeTimer - cdt);
        this.buffs.metalBladeAngle += cdt * 2.1;
      }
      if (this.buffs.woodAuraTimer > 0) {
        this.buffs.woodAuraTimer = Math.max(0, this.buffs.woodAuraTimer - cdt);
        vitals.hp = Math.min(vitals.maxHp, vitals.hp + this.buffs.woodAuraRate * cdt);
        this.buffs.woodAuraVfxAcc += cdt;
        if (this.buffs.woodAuraVfxAcc >= 0.16) {
          this.buffs.woodAuraVfxAcc = 0;
          const a = Math.random() * Math.PI * 2;
          const r = 0.5 + Math.random() * 1.45;
          this._spawnEffect({
            shape: 'orb',
            x: pPos[0] + Math.cos(a) * r,
            y: pPos[1] + 0.15 + Math.random() * 0.55,
            z: pPos[2] + Math.sin(a) * r,
            vy: 1.55 + Math.random() * 0.85,
            s0: 0.085, s1: 0.03,
            life: 0.78,
            col: [0.68, 1.0, 0.74],
            alpha: 0.66,
          });
        }
      }
      if (this.buffs.shieldTimer > 0) {
        this.buffs.shieldTimer = Math.max(0, this.buffs.shieldTimer - cdt);
        this.buffs.shieldVfxAngle += cdt * (this.buffs.shieldKind === 'zhuji' ? 1.25 : 1.6);
        if (this.buffs.shieldTimer <= 0) {
          this.buffs.shieldHp = 0;
        }
      }

      // Rebuild live persistent VFX draw list (this.shieldNodes) cleanly each frame
      this.shieldNodes.length = 0;
      const pushNode = (shape, mat, col, alpha) => {
        this.shieldNodes.push({ shape, modelMat: mat, col, alpha, active: true });
      };
      const pGroundY = T.getWalkableHeight(pPos[0], pPos[2], pPos[1]);

      // 4A. 岩甲诀 (练气) or 厚土重盾 (筑基: 4 块圆角岩板 + 表面微弱暖黄灵纹)
      if (this.buffs.shieldTimer > 0 && this.buffs.shieldHp > 0) {
        if (this.buffs.shieldKind === 'zhuji') {
          for (let i = 0; i < 4; i++) {
            const ang = this.buffs.shieldVfxAngle + (i / 4) * Math.PI * 2;
            const rx = pPos[0] + Math.sin(ang) * 1.28;
            const ry = pPos[1] + 1.12 + Math.sin(elapsed * 2.6 + i * 1.57) * 0.10;
            const rz = pPos[2] + Math.cos(ang) * 1.28;
            const mat = M.mat4();
            M.m4ComposeTRS(mat, rx, ry, rz, 0, ang, 0, 1.05, 1.05, 1.05);
            pushNode('slab', mat, [0.76, 0.64, 0.38], 0.78);
            pushNode('slab_rune', mat, [1.0, 0.88, 0.46], 0.74);
          }
        } else {
          const pulse = 1.0 + Math.sin(elapsed * 4.2) * 0.03;
          const mShell = M.mat4();
          M.m4ComposeTRS(mShell, pPos[0], pPos[1] + 1.02, pPos[2], 0, elapsed * 0.5, 0, 1.02 * pulse, 1.15 * pulse, 1.02 * pulse);
          pushNode('orb', mShell, [0.88, 0.72, 0.42], 0.24);
          for (let i = 0; i < 4; i++) {
            const ang = this.buffs.shieldVfxAngle + (i / 4) * Math.PI * 2;
            const rx = pPos[0] + Math.cos(ang) * 1.08;
            const ry = pPos[1] + 1.02 + Math.sin(elapsed * 3.0 + i * 1.7) * 0.22;
            const rz = pPos[2] + Math.sin(ang) * 1.08;
            const mRock = M.mat4();
            M.m4ComposeTRS(mRock, rx, ry, rz, elapsed * 1.4 + i, ang, elapsed * 0.9, 0.22, 0.17, 0.18);
            pushNode('rock', mRock, [0.76, 0.58, 0.32], 0.62);
          }
        }
      }

      // 4B. 金罡护体刃 (4 片淡金菱形剑气围绕主角慢速旋转)
      if (this.buffs.metalBladeTimer > 0) {
        for (let i = 0; i < 4; i++) {
          const ang = this.buffs.metalBladeAngle + (i / 4) * Math.PI * 2;
          const bx = pPos[0] + Math.sin(ang) * 1.32;
          const by = pPos[1] + 1.18 + Math.sin(elapsed * 3.2 + i * 1.57) * 0.16;
          const bz = pPos[2] + Math.cos(ang) * 1.32;
          const mBl = M.mat4();
          M.m4ComposeTRS(mBl, bx, by, bz, 0.18, ang + Math.PI * 0.5, 0.25, 0.82, 0.82, 0.82);
          pushNode('blade', mBl, [1.0, 0.90, 0.48], 0.76);
        }
      }

      // 4C. 木灵聚气环 (地面柔和翠绿光环与几片旋转绿叶)
      if (this.buffs.woodAuraTimer > 0) {
        const mRing = M.mat4();
        M.m4ComposeTRS(mRing, pPos[0], pGroundY + 0.10, pPos[2], 0, elapsed * 1.1, 0, 2.15, 1.0, 2.15);
        pushNode('ring', mRing, [0.42, 0.94, 0.54], 0.56);
        for (let i = 0; i < 5; i++) {
          const a = elapsed * 1.85 + (i / 5) * Math.PI * 2;
          const mLeaf = M.mat4();
          M.m4ComposeTRS(mLeaf, pPos[0] + Math.cos(a) * 1.78, pGroundY + 0.38 + Math.sin(elapsed * 3.0 + i) * 0.16, pPos[2] + Math.sin(a) * 1.78, 0.25, -a, 0.2, 0.34, 0.34, 0.34);
          pushNode('leaf', mLeaf, [0.56, 0.96, 0.50], 0.78);
        }
      }

      // 4C-2. Keep displacement skill armed direction synced to character's current facing (NO ground circle!)
      if (this.aimPreview) {
        this.updateAimPreview(camera);
      }

      // 4D. 御剑穿心 staged hovering swords -> sequential launch along aimed 3D trajectory!
      const cyP = Math.cos(camera.yaw), syP = Math.sin(camera.yaw);
      const rX = cyP, rZ = -syP, fX = -syP, fZ = -cyP;
      for (let i = this.stagedSwords.length - 1; i >= 0; i--) {
        const sw = this.stagedSwords[i];
        sw.delay -= cdt;
        const sx = pPos[0] + rX * sw.rx + fX * sw.rz;
        const sy = pPos[1] + sw.ry;
        const sz = pPos[2] + rZ * sw.rx + fZ * sw.rz;
        const v = sw.vAim || { vx: fX * sw.skill.speed, vy: 0, vz: fZ * sw.skill.speed, yaw: Math.atan2(fX, fZ), pitch: 0 };
        if (sw.delay <= 0) {
          this._spawnProjectile({
            skill: sw.skill,
            shape: 'sword',
            x: sx, y: sy, z: sz,
            vx: v.vx, vy: v.vy, vz: v.vz,
            rotX: v.pitch || 0,
            rotY: v.yaw,
            scale: [0.58, 0.58, 0.95],
            col: [1.0, 0.92, 0.50],
            alpha: 0.84,
            dmg: this._calcAtkDmg(sw.skill.dmgPct, vitals),
            hitRadius: 1.05,
            pierce: sw.skill.pierce || 2,
            trailKind: 'metal_sword_trail',
            life: sw.skill.range / sw.skill.speed,
          });
          this.stagedSwords.splice(i, 1);
        } else {
          const mSw = M.mat4();
          M.m4ComposeTRS(mSw, sx, sy, sz, v.pitch || 0, v.yaw, 0, 0.56, 0.56, 0.92);
          pushNode('sword', mSw, [1.0, 0.92, 0.50], 0.78);
        }
      }

      // 4E. 惊涛拍岸 advancing curved water walls
      const monsters = monsterSystem ? monsterSystem.monsters : [];
      for (let i = this.waveWalls.length - 1; i >= 0; i--) {
        const ww = this.waveWalls[i];
        const step = ww.speed * cdt;
        ww.x += ww.dirX * step;
        ww.z += ww.dirZ * step;
        ww.traveled += step;
        const wy = T.getMeshTerrainHeight(ww.x, ww.z);

        // Crest foam & water droplets along wave top
        ww.foamAcc += cdt;
        if (ww.foamAcc >= 0.045) {
          ww.foamAcc = 0;
          const perpX = -ww.dirZ, perpZ = ww.dirX;
          for (let k = -1; k <= 1; k++) {
            const off = (k + (Math.random() - 0.5) * 0.5) * (ww.width * 0.34);
            this._spawnEffect({
              shape: 'orb',
              x: ww.x + perpX * off, y: wy + 1.55 + Math.random() * 0.35, z: ww.z + perpZ * off,
              vx: ww.dirX * 3.0 + (Math.random() - 0.5) * 2.0,
              vy: 1.8 + Math.random() * 1.6,
              vz: ww.dirZ * 3.0 + (Math.random() - 0.5) * 2.0,
              gravity: 11.0,
              s0: 0.16, s1: 0.06,
              life: 0.36,
              col: k === 0 ? [0.95, 0.99, 1.0] : [0.64, 0.90, 1.0],
              alpha: 0.72,
            });
          }
        }

        // Hit & push back monsters along the wave front
        const waveDmg = this._calcAtkDmg(ww.skill.dmgPct, vitals);
        for (let mIdx = 0; mIdx < monsters.length; mIdx++) {
          const m = monsters[mIdx];
          if (!m.alive || !m.visible || ww.hitIds.has(m.id)) continue;
          const dx = m.x - ww.x, dz = m.z - ww.z;
          const along = dx * ww.dirX + dz * ww.dirZ;
          const across = Math.abs(-dx * ww.dirZ + dz * ww.dirX);
          if (Math.abs(along) <= 1.8 + (m.spec.colRadius || 1.1) && across <= ww.width * 0.55 + (m.spec.colRadius || 1.1)) {
            ww.hitIds.add(m.id);
            monsterSystem.applyDamageToMonster(m, waveDmg, {
              knockX: ww.dirX * ww.skill.knockback,
              knockZ: ww.dirZ * ww.skill.knockback,
              label: '惊涛击退',
              color: '#7cdfff',
            });
          }
        }
        if (this.npcSystem) {
          for (const n of this.npcSystem.npcs) {
            if (!n.alive || !n.visible || n.kind === 'shopkeeper' || ww.hitIds.has('npc_' + n.id)) continue;
            const dx = n.x - ww.x, dz = n.z - ww.z;
            if (Math.abs(dx * ww.dirX + dz * ww.dirZ) <= 1.8 + n.colRadius && Math.abs(-dx * ww.dirZ + dz * ww.dirX) <= ww.width * 0.55 + n.colRadius) {
              ww.hitIds.add('npc_' + n.id);
              this.npcSystem.applyDamageToNpc(n, waveDmg, {
                fromPlayer: true, knockX: ww.dirX * ww.skill.knockback, knockZ: ww.dirZ * ww.skill.knockback,
                label: '惊涛击退', color: '#7cdfff',
              }, monsterSystem);
            }
          }
        }
        if (this.oreSystem) {
          for (const o of this.oreSystem.ores) {
            if (!o.alive || !o.visible || ww.hitIds.has('ore_' + o.uid)) continue;
            const dx = o.x - ww.x, dz = o.z - ww.z;
            if (Math.abs(dx * ww.dirX + dz * ww.dirZ) <= 1.8 + o.colRadius && Math.abs(-dx * ww.dirZ + dz * ww.dirX) <= ww.width * 0.55 + o.colRadius) {
              ww.hitIds.add('ore_' + o.uid);
              this.oreSystem.applyDamageToOre(o, waveDmg);
            }
          }
        }

        if (ww.traveled >= ww.maxDist) {
          this.waveWalls.splice(i, 1);
          continue;
        }
        const fade = Math.max(0.15, 1.0 - Math.max(0, (ww.traveled / ww.maxDist - 0.7) / 0.3));
        M.m4ComposeTRS(ww.modelMat, ww.x, wy + 0.05, ww.z, 0, ww.yaw, 0, ww.width * 0.52, 1.95, 1.55);
        pushNode('wave_wall', ww.modelMat, [0.42, 0.82, 1.0], 0.58 * fade);
      }

      // 4F. Persistent Ground Zones (青藤绞杀 DoT & 寒霜凝滞 Hex Ice Formation)
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        z.timer -= cdt;
        z.tickAcc += cdt;
        z.vfxAcc += cdt;

        if (z.kind === 'wood_vine') {
          if (z.tickAcc >= 0.72) {
            z.tickAcc = 0;
            const vineDot = this._calcAtkDmg(z.skill.dotDmgPct, vitals);
            if (monsterSystem) {
              for (const m of monsters) {
                if (!m.alive || !m.visible) continue;
                if (Math.hypot(m.x - z.x, m.z - z.z) <= z.radius + (m.spec.colRadius || 1.1)) {
                  monsterSystem.applyDamageToMonster(m, vineDot, { color: '#78f294' });
                }
              }
            }
            if (this.npcSystem) this.npcSystem.applyAreaDamage(z.x, z.z, z.radius, vineDot, { color: '#78f294' }, monsterSystem);
          }
        } else if (z.kind === 'water_frost') {
          // Render persistent translucent ice-blue hex slab
          const fade = Math.min(1.0, z.timer / 0.5);
          M.m4ComposeTRS(z.modelMat, z.x, z.y + 0.08, z.z, 0, 0.25, 0, z.radius * 0.92, 1.0, z.radius * 0.92);
          pushNode('hex_ice', z.modelMat, [0.58, 0.88, 1.0], 0.44 * fade);
          if (z.vfxAcc >= 0.22) {
            z.vfxAcc = 0;
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * (z.radius * 0.78);
            this._spawnEffect({
              shape: 'orb',
              x: z.x + Math.cos(a) * r, y: z.y + 0.25, z: z.z + Math.sin(a) * r,
              vy: 0.75 + Math.random() * 0.5,
              s0: 0.35, s1: 0.65,
              life: 0.85,
              col: [0.88, 0.96, 1.0],
              alpha: 0.26,
            });
          }
          if (z.tickAcc >= 1.0) {
            z.tickAcc = 0;
            const frostDot = this._calcAtkDmg(z.skill.dotDmgPct, vitals);
            if (monsterSystem) {
              for (const m of monsters) {
                if (!m.alive || !m.visible) continue;
                if (Math.hypot(m.x - z.x, m.z - z.z) <= z.radius + (m.spec.colRadius || 1.1)) {
                  monsterSystem.applyDamageToMonster(m, frostDot, {
                    slowSec: 1.6,
                    slowRatio: z.skill.slowRatio,
                    label: '寒伤',
                    color: '#96e8ff',
                  });
                }
              }
            }
            if (this.npcSystem) this.npcSystem.applyAreaDamage(z.x, z.z, z.radius, frostDot, { slowSec: 1.6, slowRatio: z.skill.slowRatio, label: '寒伤', color: '#96e8ff' }, monsterSystem);
          }
        }
        if (z.timer <= 0) this.zones.splice(i, 1);
      }

      // 4G. 炎息燎原 (身前张开半透明赤红与亮橙扇形火幕，边缘跳动小火苗，持续扇形灼烧)
      for (let i = this.flameFans.length - 1; i >= 0; i--) {
        const ff = this.flameFans[i];
        ff.timer -= cdt;
        ff.tickAcc += cdt;
        ff.vfxAcc += cdt;
        const fade = Math.min(1.0, ff.timer / 0.35);
        const fYaw = Math.atan2(fX, fZ);
        ff.yaw = fYaw; ff.fwdX = fX; ff.fwdZ = fZ;

        // Dual-layer translucent crimson & bright-orange fan fire curtain in front of protagonist
        const pulse = 1.0 + Math.sin(elapsed * 14.0) * 0.04;
        M.m4ComposeTRS(ff.outerMat, pPos[0], pGroundY + 0.16, pPos[2], 0, fYaw, 0, ff.skill.range * 0.86 * pulse, 1.25, ff.skill.range * 0.86 * pulse);
        pushNode('flame_fan', ff.outerMat, [1.0, 0.28, 0.10], 0.44 * fade);
        M.m4ComposeTRS(ff.innerMat, pPos[0], pGroundY + 0.24, pPos[2], 0, fYaw, 0, ff.skill.range * 0.62 * pulse, 1.4, ff.skill.range * 0.62 * pulse);
        pushNode('flame_fan', ff.innerMat, [1.0, 0.64, 0.18], 0.48 * fade);

        // Dancing small flames along the outer rim of the fan!
        if (ff.vfxAcc >= 0.08) {
          ff.vfxAcc = 0;
          for (let k = 0; k < 3; k++) {
            const ang = fYaw + (Math.random() - 0.5) * 1.85;
            const dist = ff.skill.range * (0.55 + Math.random() * 0.35);
            const fx = pPos[0] + Math.sin(ang) * dist;
            const fz = pPos[2] + Math.cos(ang) * dist;
            const fy = T.getMeshTerrainHeight(fx, fz);
            this._spawnEffect({
              shape: 'spike',
              x: fx, y: fy + 0.06, z: fz,
              vy: 0.7, rotY: ang,
              sx0: 0.32, sy0: 0.65, sz0: 0.32,
              sx1: 0.10, sy1: 1.35, sz1: 0.10,
              life: 0.32,
              col: k === 0 ? [1.0, 0.78, 0.26] : [1.0, 0.38, 0.12],
              alpha: 0.70,
            });
          }
        }

        if (ff.tickAcc >= 0.56) {
          ff.tickAcc = 0;
          const fanDmg = this._calcAtkDmg(ff.skill.dmgPct, vitals);
          if (monsterSystem) {
            for (const m of monsters) {
              if (!m.alive || !m.visible) continue;
              const dx = m.x - pPos[0], dz = m.z - pPos[2];
              const d = Math.hypot(dx, dz);
              if (d > ff.skill.range + (m.spec.colRadius || 1.1) || d < 0.01) continue;
              const dot = (dx * fX + dz * fZ) / d;
              if (dot < 0.48 && d > 2.2) continue;
              monsterSystem.applyDamageToMonster(m, fanDmg, { label: '燎原灼烧', color: '#ff8a44' });
            }
          }
          if (this.oreSystem) this.oreSystem.applyAreaDamage(pPos[0], pPos[2], ff.skill.range, fanDmg, fX, fZ, 0.48);
          if (this.npcSystem) this.npcSystem.applyAreaDamage(pPos[0], pPos[2], ff.skill.range, fanDmg, { label: '燎原灼烧', color: '#ff8a44' }, monsterSystem, fX, fZ, 0.48);
        }
        if (ff.timer <= 0) this.flameFans.splice(i, 1);
      }

      // 5. Update active player projectiles & check monster / terrain collisions
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.age += cdt;
        pr.x += pr.vx * cdt;
        pr.y += pr.vy * cdt;
        pr.z += pr.vz * cdt;
        pr.rotX += pr.spinX * cdt;
        pr.rotY += pr.spinY * cdt;
        pr.rotZ += pr.spinZ * cdt;

        // Restrained flight trails matching exact descriptions!
        pr.trailTimer += cdt;
        if (pr.trailKind === 'wood_leaf' && pr.trailTimer >= 0.055) {
          pr.trailTimer = 0;
          this._spawnEffect({
            shape: 'leaf',
            x: pr.x + (Math.random() - 0.5) * 0.25,
            y: pr.y + (Math.random() - 0.5) * 0.20,
            z: pr.z + (Math.random() - 0.5) * 0.25,
            vy: -0.35,
            spinY: 6.0, spinX: 3.0,
            s0: 0.20, s1: 0.08,
            life: 0.34,
            col: [0.56, 0.95, 0.48],
            alpha: 0.66,
          });
        } else if (pr.trailKind === 'fire_spark' && pr.trailTimer >= 0.032) {
          pr.trailTimer = 0;
          this._spawnEffect({
            shape: 'orb',
            x: pr.x + (Math.random() - 0.5) * 0.18,
            y: pr.y + (Math.random() - 0.5) * 0.18,
            z: pr.z + (Math.random() - 0.5) * 0.18,
            vy: 0.9 + Math.random() * 0.8,
            s0: 0.09, s1: 0.02,
            life: 0.24,
            col: Math.random() < 0.5 ? [1.0, 0.80, 0.32] : [1.0, 0.46, 0.14],
            alpha: 0.74,
          });
        } else if (pr.trailKind === 'fire_zhuji_tail' && pr.trailTimer >= 0.026) {
          pr.trailTimer = 0;
          this._spawnEffect({
            shape: 'orb',
            x: pr.x + (Math.random() - 0.5) * 0.24,
            y: pr.y + (Math.random() - 0.5) * 0.24,
            z: pr.z + (Math.random() - 0.5) * 0.24,
            vy: 1.1 + Math.random() * 1.1,
            s0: 0.26, s1: 0.05,
            life: 0.34,
            col: Math.random() < 0.5 ? [1.0, 0.76, 0.26] : [1.0, 0.36, 0.10],
            alpha: 0.74,
          });
        } else if (pr.trailKind === 'metal_sword_trail' && pr.trailTimer >= 0.026) {
          pr.trailTimer = 0;
          this._spawnEffect({
            shape: 'shard',
            x: pr.x, y: pr.y, z: pr.z,
            rotY: pr.rotY,
            sx0: 0.11, sy0: 0.11, sz0: 0.85,
            sx1: 0.02, sy1: 0.02, sz1: 0.28,
            life: 0.20,
            col: [1.0, 0.93, 0.54],
            alpha: 0.66,
          });
        } else if (pr.trailKind === 'earth_dust' && pr.trailTimer >= 0.05) {
          pr.trailTimer = 0;
          this._spawnEffect({
            shape: 'orb',
            x: pr.x + (Math.random() - 0.5) * 0.25,
            y: pr.y + (Math.random() - 0.5) * 0.20,
            z: pr.z + (Math.random() - 0.5) * 0.25,
            vy: 0.35,
            s0: 0.14, s1: 0.28,
            life: 0.28,
            col: [0.80, 0.68, 0.46],
            alpha: 0.32,
          });
        } else if (pr.trailKind === 'water_drop' && pr.trailTimer >= 0.055) {
          pr.trailTimer = 0;
          this._spawnEffect({
            shape: 'orb',
            x: pr.x + (Math.random() - 0.5) * 0.18,
            y: pr.y,
            z: pr.z + (Math.random() - 0.5) * 0.18,
            vy: -0.6,
            s0: 0.08, s1: 0.03,
            life: 0.24,
            col: [0.68, 0.92, 1.0],
            alpha: 0.50,
          });
        } else if ((pr.trailKind === 'metal_spark' || pr.trailKind === 'metal_heavy') && pr.trailTimer >= 0.045) {
          pr.trailTimer = 0;
          this._spawnEffect({
            shape: 'orb',
            x: pr.x, y: pr.y, z: pr.z,
            s0: pr.trailKind === 'metal_heavy' ? 0.12 : 0.07,
            s1: 0.02,
            life: 0.18,
            col: [1.0, 0.92, 0.56],
            alpha: 0.64,
          });
        }

        // Hit detection against alive visible monsters
        let destroyed = false;
        for (let mIdx = 0; mIdx < monsters.length; mIdx++) {
          const m = monsters[mIdx];
          if (!m.alive || !m.visible || pr.hitIds.has(m.id)) continue;
          const mRad = (m.spec.colRadius || m.spec.radius || 1.2) + pr.hitRadius;
          const dx = pr.x - m.x;
          const dz = pr.z - m.z;
          if (dx * dx + dz * dz > mRad * mRad) continue;
          const mMidY = m.y + Math.max(1.0, (m.spec.colHeight || 2.2) * 0.5);
          if (Math.abs(pr.y - mMidY) > Math.max(1.8, (m.spec.colHeight || 2.2) * 0.65)) continue;

          pr.hitIds.add(m.id);
          pr.pierceLeft -= 1;
          this._onProjectileHit(pr, m, monsterSystem);
          if (pr.pierceLeft <= 0) {
            destroyed = true;
            break;
          }
        }

        // Hit detection against wild/guard NPCs!
        if (!destroyed && this.npcSystem) {
          const hitNpc = this.npcSystem.hitTestProjectile(pr, monsterSystem);
          if (hitNpc) {
            pr.pierceLeft -= 1;
            this._onProjectileHit(pr, null, monsterSystem);
            if (pr.pierceLeft <= 0) destroyed = true;
          }
        }

        // Hit detection against mineable Ore Veins!
        if (!destroyed && this.oreSystem) {
          const hitOre = this.oreSystem.hitTestProjectile(pr);
          if (hitOre) {
            pr.pierceLeft -= 1;
            this._onProjectileHit(pr, null, monsterSystem);
            if (pr.pierceLeft <= 0) destroyed = true;
          }
        }

        const gY = T.getMeshTerrainHeight(pr.x, pr.z);
        if (destroyed || pr.age >= pr.life || pr.y <= gY + 0.08) {
          if (!destroyed && pr.y <= gY + 0.08) {
            this._onProjectileHit(pr, null, monsterSystem);
          }
          this.projectiles.splice(i, 1);
          continue;
        }

        M.m4ComposeTRS(
          pr.modelMat,
          pr.x, pr.y, pr.z,
          pr.rotX, pr.rotY, pr.rotZ,
          pr.scale[0], pr.scale[1], pr.scale[2]
        );
      }

      // 6. Update transient VFX effects
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
          // Rapidly erupt up in first 20%, hold steady, retract slightly in last 25%
          if (u < 0.22) ease = u / 0.22;
          else if (u < 0.75) ease = 1.0;
          else ease = 1.0 - ((u - 0.75) / 0.25) * 0.55;
        }
        const sx = M.lerp(ef.sx0, ef.sx1, ease);
        const sy = M.lerp(ef.sy0, ef.sy1, ease);
        const sz = M.lerp(ef.sz0, ef.sz1, ease);
        M.m4ComposeTRS(ef.modelMat, ef.x, ef.y, ef.z, ef.rotX, ef.rotY, ef.rotZ, sx, sy, sz);
      }
    }
  }

  XW.Skills = {
    ELEMENTS,
    XINFA_DEFS,
    createSkillSystem: () => new SkillSystem(),
  };
})(window);
