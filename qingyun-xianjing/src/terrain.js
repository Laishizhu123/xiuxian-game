(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const N = XW.Noise;

  // Massive 18400m x 18400m Irregular Open-World Xianxia Continent!
  const WORLD_SIZE = 18400;
  const HALF_WORLD = WORLD_SIZE * 0.5;
  const OCEAN_WATER_Y = 0.0;
  const RIVER_WATER_Y = 7.2;
  const SPRING_WATER_Y = 12.2;
  const LAKE_WATER_Y = 9.5;
  const SWAMP_WATER_Y = 6.4;
  const VENOM_WATER_Y = 8.4;

  // Boss Region 1: 灵竹幽谷 (Deep Secluded Spirit Bamboo Valley naturally connected South/below 云雾山!)
  const BAMBOO_VALLEY = {
    cx: 2660,
    cz: 6020,
    rx: 620,
    rz: 620,
    baseY: 20.0,
    arenaR: 44.0,
    viewX: 2660,
    viewZ: 5640,
  };

  // Boss Region 2: 蚀骨毒潭 (Deep Sinister Bone-Corroding Venom Mire naturally connected East/right of 沉烟迷泽!)
  const VENOM_MIRE = {
    cx: 4960,
    cz: 2160,
    rx: 680,
    rz: 580,
    arenaY: 9.4,
    waterY: VENOM_WATER_Y,
    arenaR: 38.0,
    poolOuterR: 74.0,
    viewX: 4580,
    viewZ: 2160,
  };

  // New Hidden Steep Forested Mountain Range expanding outward at the junction below 云雾山 & beside 低云平原: 幽林秘岭 (~3000m x 3400m!)
  // Features steep interlocking craggy peaks, deep winding ravines, dense towering ancient woods, and the central Abandoned Cave-Mansion spawn!
  const HIDDEN_MOUNTAINS = {
    cx: 1220,
    cz: 6640,
    caveX: 1220,
    caveZ: 6640,
    caveY: 178.0,
    spawnX: 1220,
    spawnZ: 6644.0,
    trailPoints: [
      [1220, 6612, 178.0], // 0: Abandoned Cave-Mansion Forecourt Steps
      [1220, 6540, 166.0], // 1: Upper Cliff Ledge
      [1070, 6460, 150.0], // 2: West Switchback Bend
      [1310, 6310, 132.0], // 3: East Crag Overlook Bend
      [1080, 6140, 114.0], // 4: Shadowed Pine Saddle
      [ 860, 6010,  96.0], // 5: Western Gorge Turn
      [1030, 5800,  78.0], // 6: Deep Hidden Forest Ravine
      [ 850, 5580,  60.0], // 7: Misty Ridge Pass
      [ 690, 5360,  44.0], // 8: Lower Foothill Gorge
      [ 540, 5140,  31.0], // 9: Mountain Mouth at 低云平原 / 云雾山 Junction
      [ 380, 4960,  22.0], // 10: Seamless handoff onto 低云平原
    ],
    eastTrailPoints: [
      [1310, 6310, 132.0], // Branches off East Crag Overlook toward 灵竹幽谷
      [1540, 6360, 110.0],
      [1720, 6240,  84.0],
      [1840, 6080,  54.0],
      [2040, 5980,  26.0],
    ],
  };

  // Vast sprawling Southwest & Deep-South Protagonist Birthplace: 低云平原 (~5200m x 5600m irregular pure wilderness!)
  const LOW_CLOUD_PLAINS = {
    cx: -1920,
    cz: 2580,
    rx: 2750,
    rz: 2950,
    spawnX: -1020,
    spawnZ: 1120,
  };

  // Vast Misty Wetland Landmark at the Southeast corner of 低云平原: 沉烟迷泽 (Misty Marshland)
  const CHENYAN_SWAMP = {
    cx: 1560,
    cz: 2560,
    rx: 1920,
    rz: 1220,
    viewX: 225,
    viewZ: 1860,
  };

  // Widened & Forward-Extended Ancient Ruined Array Path Landmark along the West foothills edge of 低云平原: 残阵古道
  const CANZHEN_ROAD = {
    cx: -3180,
    cz: 860,
    rx: 920,
    rz: 840,
    viewX: -2590,
    viewZ: 1320,
    waypoints: [
      [-2540, 1345], // 0: Meadow -> arid slope gateway
      [-2695, 1265], // 1: Gentle barren rise & tilted rune pillars
      [-2845, 1195], // 2: Shallow valley bend + weathered minor array pedestal #1
      [-2980, 1095], // 3: Mid-road beside Large Ruin #1 (残垣断壁古驿殿)
      [-3115, 1005], // 4: Upper valley bend + weathered minor array pedestal #2
      [-3245,  890], // 5: Foothill ascent flanked by leaning rune pillars
      [-3375,  775], // 6: Mid-Upper Ruined Array Altar (古道残阵坛)
      [-3515,  625], // 7: Extended forward winding valley ascent
      [-3655,  465], // 8: Extended upper road beside Large Ruin #2 (太古残阵废殿)
      [-3800,  310], // 9: Extended Terminus: Mountain-Foot Grand Ruined Array Sanctum (太古大残坛)
    ],
    altarNodes: [
      { x: -2845, z: 1195, r: 20.0, y: 29.8, major: false },
      { x: -3115, z: 1005, r: 19.0, y: 38.6, major: false },
      { x: -3375, z:  775, r: 30.0, y: 48.2, major: false },
      { x: -3800, z:  310, r: 36.0, y: 63.5, major: true  },
    ],
    ruinSites: [
      { id: 'posthouse', x: -2942, z: 1058, r: 29.0, y: 34.4, rotY: 0.62 }, // Large Ruin #1: 古道断壁驿殿庭院
      { id: 'grandhall', x: -3612, z:  426, r: 36.0, y: 57.6, rotY: 0.78 }, // Large Ruin #2: 太古残阵废殿
    ],
  };

  // Vast Towering Primeval Spirit Forest expanded one more ring outward beyond 残阵古道: 通天灵木林 (~4000m x 4900m!)
  const SPIRIT_FOREST = {
    cx: -3520,
    cz: -1720,
    rx: 2150,
    rz: 2560,
    viewX: -3858,
    viewZ: 222,
    worldTreeX: -3520,
    worldTreeZ: -1720,
    trailPoints: [
      [-3800,   310], // 0: Connects directly from 残阵古道 terminus
      [-3890,   165], // 1: Forest threshold pass
      [-3985,   -40], // 2: Outer towering spirit grove
      [-4110,  -260], // 3: Inner Mother Spirit Tree sanctuary
      [-4055,  -520], // 4: Skylight shaft glade
      [-4205,  -760], // 5: Mid-North Ancient Spirit Glade
      [-3940, -1240], // 6: Expanded Deep-North Crossing
      [-3610, -1630], // 7: Approach to Colossal 450m Blue-Aura World Tree (-3520, -1720)!
      [-3060, -2260], // 8: Northeastern Primeval Sanctuary Bend
      [-3480, -3080], // 9: Far North Ancient Mother Grove
    ],
  };

  // ONE Unified Colossal Sky-Piercing 7-Tier Sacred Mountain below 沉烟迷泽: 云雾山 (760m Summit Plateau + 6 Wide Terraces!)
  const CLOUD_MOUNTAIN = (function () {
    const cx = 2660, cz = 4120;
    const scaleX = 0.56, scaleZ = 1.18;
    const pt = (ang, r, y) => [
      Math.round(cx + Math.cos(ang) * (r / scaleX)),
      Math.round(cz + Math.sin(ang) * (r / scaleZ)),
      y,
    ];
    // Continuous 2-turn spiral mountain ramp climbing smoothly at ~9-12° through all 7 steep rocky tiers!
    const pathPoints = [
      pt(-2.05, 1140,  22.0), // 0: Foothill entry from 沉烟迷泽 south margin
      pt(-1.75, 1075,  68.0), // 1: Ramp 0->1
      pt(-1.45, 1005, 115.0), // 2: Tier 1 (115m)
      pt(-1.05, 1000, 115.0), // 3: Tier 1 Patrol Flat
      pt(-0.62,  930, 165.0), // 4: Ramp 1->2
      pt(-0.18,  845, 215.0), // 5: Tier 2 (215m)
      pt( 0.25,  840, 215.0), // 6: Tier 2 Patrol Flat
      pt( 0.68,  770, 268.0), // 7: Ramp 2->3
      pt( 1.15,  690, 320.0), // 8: Tier 3 (320m)
      pt( 1.65,  685, 320.0), // 9: Tier 3 Patrol Flat
      pt( 2.12,  620, 375.0), // 10: Ramp 3->4
      pt( 2.58,  545, 430.0), // 11: Tier 4 (430m)
      pt( 3.05,  540, 430.0), // 12: Tier 4 Patrol Flat
      pt( 3.55,  475, 485.0), // 13: Ramp 4->5
      pt( 4.02,  402, 540.0), // 14: Tier 5 (540m)
      pt( 4.52,  398, 540.0), // 15: Tier 5 Patrol Flat
      pt( 5.02,  335, 595.0), // 16: Ramp 5->6
      pt( 5.55,  265, 650.0), // 17: Tier 6 (650m)
      pt( 6.15,  260, 650.0), // 18: Tier 6 Patrol Flat
      pt( 6.72,  218, 705.0), // 19: Ramp 6->Summit
      pt( 7.28,  185, 745.0), // 20: Upper arrival bend
      pt( 7.75,  155, 760.0), // 21: Arrive 760m Grand Summit Plateau!
    ];
    // 6 wide dedicated flat horizontal patrol plazas (one per tier!)
    const terraces = [
      { name: '一重云台', x: pathPoints[3][0],  z: pathPoints[3][1],  r: 135, y: 115.0 },
      { name: '二重云台', x: pathPoints[6][0],  z: pathPoints[6][1],  r: 130, y: 215.0 },
      { name: '三重云台', x: pathPoints[9][0],  z: pathPoints[9][1],  r: 125, y: 320.0 },
      { name: '四重云台', x: pathPoints[12][0], z: pathPoints[12][1], r: 120, y: 430.0 },
      { name: '五重云台', x: pathPoints[15][0], z: pathPoints[15][1], r: 115, y: 540.0 },
      { name: '六重云台', x: pathPoints[18][0], z: pathPoints[18][1], r: 110, y: 650.0 },
    ];
    return {
      cx,
      cz,
      scaleX,
      scaleZ,
      summitY: 760.0,
      summitR: 165.0,
      viewX: 2660,
      viewZ: 4005,
      terraces,
      pathPoints,
    };
  })();

  // Vast Wind-Swept Golden Sand Dunes Landmark expanded several rings SW OUTSIDE 低云平原 & 残阵古道: 流沙荒漠 (~3150m x 5600m!)
  const DESERT_DUNES = {
    cx: -5680,
    cz: 4680,
    rx: 1560,
    rz: 2680,
    viewX: -4640,
    viewZ: 3740,
    ruinSites: [
      { id: 'gate_ruin',     x: -4825, z: 3685, r: 36, kind: 'wall_pillars' },
      { id: 'bone_hollow',   x: -5420, z: 4320, r: 42, kind: 'bones_banner' },
      { id: 'north_outpost', x: -4940, z: 2480, r: 34, kind: 'pillars_banner' },
      { id: 'far_nw_ruin',   x: -6180, z: 2860, r: 36, kind: 'wall_pillars' },
      { id: 'west_sanctum',  x: -6460, z: 4580, r: 40, kind: 'wall_pillars' },
      { id: 'deep_bones',    x: -6280, z: 5820, r: 42, kind: 'bones_banner' },
      { id: 'south_relic',   x: -5120, z: 5960, r: 36, kind: 'bones_pillars' },
      { id: 'far_sw_outpost',x: -5740, z: 6680, r: 34, kind: 'pillars_banner' },
      { id: 'deep_west_wall',x: -7640, z: 3860, r: 38, kind: 'wall_pillars' },
      { id: 'deep_west_bone',x: -7820, z: 5640, r: 40, kind: 'bones_banner' },
    ],
  };

  // Vast Open Northern & Northeastern Frost Snowfield expanded several rings beyond 通天灵木林: 霜雪原 (~9500m x 5000m!)
  const FROST_SNOWFIELD = {
    cx: -1480,
    cz: -6760,
    rx: 4650,
    rz: 2480,
    viewX: -3455,
    viewZ: -5640,
    pondX: -3460,
    pondZ: -5940,
    pondR: 155.0,
    iceY: 74.2,
    relicSites: [
      { id: 'tarn_stele',   x: -3460, z: -5755, kind: 'stele_crystals' }, // South bank of Frozen Frost Tarn
      { id: 'frost_array',  x: -4180, z: -6080, kind: 'buried_array'   }, // Half-buried Ancient Frost Array Altar in snow
      { id: 'east_crystals',x: -2520, z: -5820, kind: 'crystal_grove'  }, // Wind-carved Ice Crystal Pillars on snow ridge
      { id: 'north_stele',  x: -3480, z: -6620, kind: 'stele_crystals' }, // West-North Snow-Drifted Ancient Stele
      { id: 'ne_crystals',  x:   880, z: -6420, kind: 'crystal_grove'  }, // Expanded Northeast Snowfield Crystal Ridge
      { id: 'far_n_stele',  x:  -620, z: -8460, kind: 'stele_crystals' }, // Expanded Far-North Glacial Watch Stele
      { id: 'far_w_crystals',x: -6380, z: -6480, kind: 'crystal_grove' }, // Expanded Far-West Snowfield Glacial Ridge
    ],
  };

  // ONE Unified Sky-Piercing 6-Tier Snow Mountain rising right in the center of expanded 霜雪原: 霜雪山 (similar to 云雾山, more compact footprint!)
  const FROST_MOUNTAIN = (function () {
    const cx = -1480, cz = -6880;
    const scaleX = 0.88, scaleZ = 1.18;
    const pt = (ang, r, y) => [
      Math.round(cx + Math.cos(ang) * (r / scaleX)),
      Math.round(cz + Math.sin(ang) * (r / scaleZ)),
      y,
    ];
    // Continuous 2-turn walkable spiral snow ramp climbing smoothly (~10° grade) through all 6 icy-cliff tiers to the 680m Snow Summit!
    const pathPoints = [
      pt( 1.95, 955,  84.0), // 0: Southern snowfield entry facing 寒潭 & 通天灵木林
      pt( 1.55, 895, 132.0), // 1: Ramp 0->1
      pt( 1.12, 830, 180.0), // 2: Tier 1 (180m)
      pt( 0.65, 825, 180.0), // 3: Tier 1 Snow Patrol Flat
      pt( 0.12, 755, 230.0), // 4: Ramp 1->2
      pt(-0.42, 680, 280.0), // 5: Tier 2 (280m)
      pt(-0.92, 675, 280.0), // 6: Tier 2 Snow Patrol Flat
      pt(-1.45, 608, 330.0), // 7: Ramp 2->3
      pt(-2.00, 535, 380.0), // 8: Tier 3 (380m)
      pt(-2.55, 530, 380.0), // 9: Tier 3 Snow Patrol Flat
      pt(-3.12, 465, 430.0), // 10: Ramp 3->4
      pt(-3.72, 395, 480.0), // 11: Tier 4 (480m)
      pt(-4.28, 390, 480.0), // 12: Tier 4 Snow Patrol Flat
      pt(-4.88, 325, 530.0), // 13: Ramp 4->5
      pt(-5.50, 255, 580.0), // 14: Tier 5 (580m)
      pt(-6.15, 250, 580.0), // 15: Tier 5 Snow Patrol Flat
      pt(-6.80, 205, 632.0), // 16: Ramp 5->Summit
      pt(-7.38, 168, 666.0), // 17: Upper summit arrival bend
      pt(-7.88, 132, 680.0), // 18: Arrive 680m Grand Snow Summit Plateau!
    ];
    const terraces = [
      { name: '一重雪台', x: pathPoints[3][0],  z: pathPoints[3][1],  r: 105, y: 180.0 },
      { name: '二重雪台', x: pathPoints[6][0],  z: pathPoints[6][1],  r: 100, y: 280.0 },
      { name: '三重雪台', x: pathPoints[9][0],  z: pathPoints[9][1],  r:  95, y: 380.0 },
      { name: '四重雪台', x: pathPoints[12][0], z: pathPoints[12][1], r:  92, y: 480.0 },
      { name: '五重雪台', x: pathPoints[15][0], z: pathPoints[15][1], r:  88, y: 580.0 },
    ];
    return {
      cx,
      cz,
      scaleX,
      scaleZ,
      summitY: 680.0,
      summitR: 140.0,
      viewX: cx,
      viewZ: cz + 92,
      terraces,
      pathPoints,
    };
  })();

  // Grand Walled Xianxia Cultivator Metropolis: 青石城 (260m × 240m)
  const QINGSHI_CITY = {
    cx: 0,
    cz: 0,
    halfW: 130,
    northZ: -115,
    southZ: 125,
    baseY: 22.0,
    southGate: { x: 0, z: 125, width: 20.0 },
    northGate: { x: 0, z: -115, width: 15.0 },
    westGate:  { x: -130, z: 0, width: 15.0 },
    eastGate:  { x: 130, z: 0, width: 15.0 },
  };

  // Legacy floating islands cleared as part of central zone reconstruction into 青石城
  const FLOATING_ISLANDS = [];

  // Cohesive BotW x 青绿山水 Regional Atmospheres
  const REGIONS = [
    {
      id: 'lowcloud',
      name: '低云平原',
      poem: '云低芳草阔 · 风暖大原平',
      center: [-1920, 18, 2580],
      radius: 2950,
      sunColor: [1.18, 1.08, 0.90],
      skyTop: [0.09, 0.36, 0.80],
      skyHorizon: [0.50, 0.78, 0.91],
      fogColor: [0.50, 0.76, 0.88],
      shadowTint: [0.22, 0.41, 0.60],
      fogDensity: 0.00028,
      heightFogDensity: 0.008,
      heightFogBase: 7.0,
    },
    {
      id: 'qingshi',
      name: '青石城',
      poem: '青石筑仙城 · 坊市聚灵烟',
      center: [0, 22, 0],
      radius: 560,
      sunColor: [1.19, 1.08, 0.89],
      skyTop: [0.09, 0.36, 0.80],
      skyHorizon: [0.50, 0.77, 0.90],
      fogColor: [0.50, 0.75, 0.87],
      shadowTint: [0.22, 0.40, 0.59],
      fogDensity: 0.00028,
      heightFogDensity: 0.008,
      heightFogBase: 8.0,
    },
    {
      id: 'chenyan',
      name: '沉烟迷泽 · 迷雾湿地',
      poem: '沉烟锁泽畔 · 芦雪映幽潭',
      center: [1560, 10, 2560],
      radius: 1950,
      sunColor: [0.95, 1.03, 0.96],
      skyTop: [0.12, 0.30, 0.54],
      skyHorizon: [0.47, 0.65, 0.66],
      fogColor: [0.45, 0.62, 0.60],
      shadowTint: [0.16, 0.30, 0.36],
      fogDensity: 0.00072,
      heightFogDensity: 0.025,
      heightFogBase: 10.5,
    },
    {
      id: 'canzhen',
      name: '残阵古道',
      poem: '荒坡横古道 · 残阵锁苍烟',
      center: [-3180, 42, 860],
      radius: 860,
      sunColor: [1.20, 1.04, 0.84],
      skyTop: [0.11, 0.34, 0.72],
      skyHorizon: [0.58, 0.72, 0.78],
      fogColor: [0.56, 0.66, 0.68],
      shadowTint: [0.24, 0.34, 0.46],
      fogDensity: 0.00044,
      heightFogDensity: 0.011,
      heightFogBase: 22.0,
    },
    {
      id: 'spiritwood',
      name: '通天灵木林',
      poem: '古木参青冥 · 灵光透碧荫',
      center: [-3520, 62, -1720],
      radius: 2680,
      sunColor: [1.04, 1.12, 0.96],
      skyTop: [0.08, 0.34, 0.72],
      skyHorizon: [0.42, 0.72, 0.74],
      fogColor: [0.36, 0.62, 0.60],
      shadowTint: [0.16, 0.34, 0.42],
      fogDensity: 0.00048,
      heightFogDensity: 0.015,
      heightFogBase: 48.0,
    },
    {
      id: 'cloudmtn',
      name: '云雾山',
      poem: '七重登云海 · 绝顶聚灵辉',
      center: [2660, 520, 4120],
      radius: 2350,
      sunColor: [1.16, 1.13, 1.03],
      skyTop: [0.07, 0.31, 0.78],
      skyHorizon: [0.56, 0.79, 0.89],
      fogColor: [0.58, 0.76, 0.83],
      shadowTint: [0.19, 0.35, 0.54],
      fogDensity: 0.00026,
      heightFogDensity: 0.014,
      heightFogBase: 210.0,
    },
    {
      id: 'desert',
      name: '流沙荒漠',
      poem: '大漠连孤烟 · 残碑卧金沙',
      center: [-5680, 34, 4680],
      radius: 2680,
      sunColor: [1.24, 1.06, 0.80],
      skyTop: [0.14, 0.40, 0.78],
      skyHorizon: [0.76, 0.72, 0.56],
      fogColor: [0.74, 0.66, 0.48],
      shadowTint: [0.36, 0.32, 0.34],
      fogDensity: 0.00036,
      heightFogDensity: 0.009,
      heightFogBase: 14.0,
    },
    {
      id: 'frostfield',
      name: '霜雪原',
      poem: '朔风卷玉屑 · 寒潭映冰心',
      center: [-1480, 84, -6760],
      radius: 4950,
      sunColor: [1.06, 1.12, 1.20],
      skyTop: [0.10, 0.30, 0.68],
      skyHorizon: [0.64, 0.78, 0.88],
      fogColor: [0.66, 0.78, 0.86],
      shadowTint: [0.22, 0.36, 0.56],
      fogDensity: 0.00034,
      heightFogDensity: 0.011,
      heightFogBase: 68.0,
    },
    {
      id: 'frostmtn',
      name: '霜雪山',
      poem: '六重凌雪岭 · 玉峰接玄冥',
      center: [-1480, 440, -6880],
      radius: 1550,
      sunColor: [1.10, 1.15, 1.24],
      skyTop: [0.07, 0.25, 0.72],
      skyHorizon: [0.68, 0.82, 0.94],
      fogColor: [0.70, 0.82, 0.92],
      shadowTint: [0.20, 0.34, 0.58],
      fogDensity: 0.00024,
      heightFogDensity: 0.013,
      heightFogBase: 190.0,
    },
    {
      id: 'bamboovalley',
      name: '灵竹幽谷',
      poem: '翠竹含清辉 · 幽谷藏灵岚',
      center: [2660, 22, 5920],
      radius: 680,
      sunColor: [1.08, 1.14, 0.96],
      skyTop: [0.08, 0.36, 0.74],
      skyHorizon: [0.46, 0.78, 0.76],
      fogColor: [0.40, 0.68, 0.64],
      shadowTint: [0.16, 0.35, 0.42],
      fogDensity: 0.00046,
      heightFogDensity: 0.016,
      heightFogBase: 22.0,
    },
    {
      id: 'venommire',
      name: '蚀骨毒潭',
      poem: '焦岩锁蚀潭 · 幽毒映枯林',
      center: [4840, 12, 2160],
      radius: 720,
      sunColor: [0.74, 0.78, 0.74],
      skyTop: [0.07, 0.13, 0.24],
      skyHorizon: [0.24, 0.30, 0.31],
      fogColor: [0.20, 0.25, 0.25],
      shadowTint: [0.12, 0.14, 0.22],
      fogDensity: 0.00084,
      heightFogDensity: 0.028,
      heightFogBase: 14.0,
    },
    {
      id: 'hiddenmtn',
      name: '幽林秘岭 · 废弃洞府',
      poem: '危峰隐古洞 · 密林锁青烟',
      center: [1220, 165, 6640],
      radius: 1750,
      sunColor: [1.06, 1.11, 0.98],
      skyTop: [0.07, 0.31, 0.68],
      skyHorizon: [0.42, 0.68, 0.72],
      fogColor: [0.38, 0.60, 0.60],
      shadowTint: [0.15, 0.30, 0.40],
      fogDensity: 0.00046,
      heightFogDensity: 0.018,
      heightFogBase: 76.0,
    },
  ];

  function distToSegment(px, pz, ax, az, bx, bz) {
    const vx = bx - ax, vz = bz - az;
    const wx = px - ax, wz = pz - az;
    const c1 = vx * wx + vz * wz;
    if (c1 <= 0) return { dist: Math.hypot(px - ax, pz - az), t: 0 };
    const c2 = vx * vx + vz * vz;
    if (c2 <= c1) return { dist: Math.hypot(px - bx, pz - bz), t: 1 };
    const t = c1 / c2;
    return { dist: Math.hypot(px - (ax + t * vx), pz - (az + t * vz)), t };
  }

  // Vast, Irregular Multi-Lobed Southwest & Deep-South Low-Cloud Plains (低云平原 ~5200m x 5600m!)
  function getLowCloudPlainsMask(x, z) {
    // Domain-warp coordinates so the plain stretches organically with natural bays & promontories!
    const wx = x + N.fbm2D(x * 0.00068 + 2.3, z * 0.00068 - 1.7, 3) * 560.0;
    const wz = z + N.fbm2D(x * 0.00068 - 3.9, z * 0.00068 + 4.1, 3) * 520.0;

    // 7 overlapping organic sub-basins expanding 低云平原 deep West, Southwest & several rings further South (+Z)!
    const dMain      = Math.hypot((wx + 1480) / 1520, (wz - 1560) / 1380);
    const dWest      = Math.hypot((wx + 2780) / 1300, (wz - 1220) / 1180);
    const dSouth     = Math.hypot((wx + 1080) / 1360, (wz - 2840) / 1160);
    const dFarSW     = Math.hypot((wx + 2680) / 1340, (wz - 2680) / 1260);
    const dDeepSouth = Math.hypot((wx + 1240) / 1460, (wz - 3980) / 1260);
    const dDeepSW     = Math.hypot((wx + 2920) / 1600, (wz - 3940) / 1280);
    const dFarSouth   = Math.hypot((wx + 2120) / 1780, (wz - 4520) / 1120);
    const dOuterSouth = Math.hypot((wx + 1980) / 2180, (wz - 6240) / 1420);
    // Seam fills: close the small SW pond gap beside 流沙荒漠 & southern notch beside 幽林秘岭 (ZERO overwrite of existing regions!)
    const dFillSWGap    = Math.hypot((wx + 3720) / 1420, (wz - 5480) / 1220);
    const dFillSouthGap = Math.hypot((wx + 480)  / 1480, (wz - 6950) / 1280);
    const minD = Math.min(dMain, dWest, dSouth, dFarSW, dDeepSouth, dDeepSW, dFarSouth, dOuterSouth, dFillSWGap, dFillSouthGap);
    return 1.0 - M.smoothstep(0.62, 1.18, minD);
  }

  // Vast Misty Wetland Basin expanding deep East, Southeast & South from 低云平原: 沉烟迷泽 (~3300m x 2400m!)
  function getSwampMask(x, z) {
    // Generous bounding reject well outside domain-warp + lobe falloff so mask NEVER hard-clips!
    if (x < -760 || x > 5500 || z < 100 || z > 4450) return 0.0;
    const wx = x + N.fbm2D(x * 0.0010 - 3.1, z * 0.0010 + 2.4, 3) * 360.0;
    const wz = z + N.fbm2D(x * 0.0010 + 4.7, z * 0.0010 - 1.9, 3) * 320.0;

    // 4 overlapping organic marsh basins + gateway valley + NE bay fill connecting smoothly toward 蚀骨毒潭 north margin
    const dMain  = Math.hypot((wx - 820)  / 1020, (wz - 2260) / 860);
    const dEast  = Math.hypot((wx - 2120) / 1220, (wz - 2140) / 920);
    const dSouth = Math.hypot((wx - 1180) / 1180, (wz - 3060) / 820);
    const dFarSE = Math.hypot((wx - 2580) / 1260, (wz - 2960) / 880);
    const dFillNE = Math.hypot((wx - 3480) / 1460, (wz - 1340) / 1060);
    const gateSeg = distToSegment(wx, wz, -180, 1980, 440, 2140);
    const dGate = gateSeg.dist / 360.0;
    const minD = Math.min(dMain, dEast, dSouth, dFarSE, dFillNE, dGate);
    return 1.0 - M.smoothstep(0.58, 1.18, minD);
  }

  // Widened & Forward-Extended Ancient Ruined Array Path (残阵古道) winding along the West foothills edge of 低云平原
  function getAncientRoadPathInfo(x, z) {
    if (x > -2360 || x < -4040 || z < 110 || z > 1540) {
      return { roadMask: 0.0, dist: 999.0, t: 0.0, altarMask: 0.0, siteMask: 0.0, siteY: 0.0 };
    }
    const pts = CANZHEN_ROAD.waypoints;
    const segCount = pts.length - 1;
    let bestDist = 999.0;
    let bestT = 0.0;
    for (let i = 0; i < segCount; i++) {
      const a = pts[i], b = pts[i + 1];
      const seg = distToSegment(x, z, a[0], a[1], b[0], b[1]);
      if (seg.dist < bestDist) {
        bestDist = seg.dist;
        bestT = (i + seg.t) / segCount;
      }
    }
    const wobble = N.fbm2D(x * 0.016 + 2.7, z * 0.016 - 4.1, 2) * 3.2;
    const effDist = Math.max(0.0, bestDist + wobble * 0.45);
    // Widened slightly so the ruined bluestone road feels stately and traversable!
    const roadMask = 1.0 - M.smoothstep(6.6, 13.0, effDist);

    let altarMask = 0.0;
    let siteMask = 0.0;
    let siteY = 0.0;
    for (let i = 0; i < CANZHEN_ROAD.altarNodes.length; i++) {
      const nd = CANZHEN_ROAD.altarNodes[i];
      const d = Math.hypot(x - nd.x, z - nd.z);
      const m = 1.0 - M.smoothstep(nd.r * 0.62, nd.r * 1.08, d);
      if (m > altarMask) {
        altarMask = m;
        if (m > siteMask) { siteMask = m; siteY = nd.y; }
      }
    }
    for (let i = 0; i < CANZHEN_ROAD.ruinSites.length; i++) {
      const rs = CANZHEN_ROAD.ruinSites[i];
      const d = Math.hypot(x - rs.x, z - rs.z);
      const m = 1.0 - M.smoothstep(rs.r * 0.64, rs.r * 1.12, d);
      if (m > siteMask) {
        siteMask = m;
        siteY = rs.y;
      }
    }
    return { roadMask: Math.max(roadMask, altarMask, siteMask), dist: effDist, t: bestT, altarMask: Math.max(altarMask, siteMask), siteMask, siteY };
  }

  // Organic barren slope & gentle valley biome footprint for extended 残阵古道
  function getAncientRoadMask(x, z) {
    if (x > -2040 || x < -4460 || z < -240 || z > 1880) return 0.0;
    const wx = x + N.fbm2D(x * 0.0020 + 5.3, z * 0.0020 - 1.8, 3) * 155.0;
    const wz = z + N.fbm2D(x * 0.0020 - 2.9, z * 0.0020 + 6.1, 3) * 155.0;

    // Spine distance along the extended winding road from (-2540, 1345) all the way to (-3800, 310)
    const s1 = distToSegment(wx, wz, -2540, 1345, -2980, 1095).dist;
    const s2 = distToSegment(wx, wz, -2980, 1095, -3375,  775).dist;
    const s3 = distToSegment(wx, wz, -3375,  775, -3800,  310).dist;
    const spineD = Math.min(s1, s2, s3);
    // Slightly broader barren valley basin around the upper extended mountain-foot sanctuary
    const altarD = Math.hypot((wx + 3760) / 390, (wz - 340) / 360);
    const normD = Math.min(spineD / 320.0, altarD);
    return 1.0 - M.smoothstep(0.54, 1.18, normD);
  }

  // Vast Sheltered Primeval Spirit Forest Basin expanded one more ring West across the NW quadrant: 通天灵木林!
  function getSpiritForestMask(x, z) {
    if (x > 650 || x < -8950 || z > 2450 || z < -6200) return 0.0;
    const wx = x + N.fbm2D(x * 0.0012 - 4.1, z * 0.0012 + 3.2, 3) * 300.0;
    const wz = z + N.fbm2D(x * 0.0012 + 2.7, z * 0.0012 - 5.4, 3) * 300.0;

    // 5 enlarged overlapping organic forest basins + smooth natural fills closing the NW, NE & SW notches!
    const dMain         = Math.hypot((wx + 4080) / 1160, (wz + 460)  / 1100);
    const dNorth        = Math.hypot((wx + 3620) / 1640, (wz + 1880) / 1460);
    const dFarNW        = Math.hypot((wx + 3500) / 1760, (wz + 3520) / 1420);
    const dEastWood     = Math.hypot((wx + 2160) / 1280, (wz + 2120) / 1580);
    const dFarWestWood  = Math.hypot((wx + 6020) / 1860, (wz + 1950) / 2420);
    const dFillNWBridge = Math.hypot((wx + 5880) / 1780, (wz + 4480) / 1380);
    const dFillNEBridge = Math.hypot((wx + 1480) / 1820, (wz + 4120) / 1460);
    const dFillSWWood   = Math.hypot((wx + 5950) / 1960, (wz - 620)  / 1360);
    const passD         = distToSegment(wx, wz, -3800, 310, -4020, -120).dist / 300.0;
    const minD = Math.min(dMain, dNorth, dFarNW, dEastWood, dFarWestWood, dFillNWBridge, dFillNEBridge, dFillSWWood, passD);
    const rawWood = 1.0 - M.smoothstep(0.54, 1.16, minD);
    if (rawWood <= 0.0001) return 0.0;
    // Strictly preserve 残阵古道 roadbed & 青石城 core
    const roadGuard = 1.0 - M.smoothstep(0.28, 0.76, getAncientRoadMask(x, z));
    return rawWood * roadGuard;
  }

  // Faint winding woodland trail threading deep through expanded 通天灵木林 from 残阵古道 terminus (-3800, 310)
  function getSpiritForestTrailInfo(x, z) {
    if (x > -2880 || x < -4420 || z > 370 || z < -3240) {
      return { trailMask: 0.0, dist: 999.0, t: 0.0 };
    }
    const pts = SPIRIT_FOREST.trailPoints;
    const segCount = pts.length - 1;
    let bestDist = 999.0;
    let bestT = 0.0;
    for (let i = 0; i < segCount; i++) {
      const a = pts[i], b = pts[i + 1];
      const seg = distToSegment(x, z, a[0], a[1], b[0], b[1]);
      if (seg.dist < bestDist) {
        bestDist = seg.dist;
        bestT = (i + seg.t) / segCount;
      }
    }
    const wobble = N.fbm2D(x * 0.018 - 1.7, z * 0.018 + 3.9, 2) * 3.8;
    const effDist = Math.max(0.0, bestDist + wobble * 0.55);
    const trailMask = 1.0 - M.smoothstep(2.6, 7.6, effDist);
    return { trailMask, dist: effDist, t: bestT };
  }

  // ONE Single Colossal Sky-Piercing Mountain Massif below 沉烟迷泽: 云雾山 (~4200m x 2100m unified massif!)
  function getCloudMountainMask(x, z) {
    if (x < -120 || x > 5480 || z < 2620 || z > 5580) return 0.0;
    const cm = CLOUD_MOUNTAIN;
    const wx = x + N.fbm2D(x * 0.00075 + 3.1, z * 0.00075 - 2.6, 3) * 240.0;
    const wz = z + N.fbm2D(x * 0.00075 - 2.2, z * 0.00075 + 4.3, 3) * 180.0;
    const dSingle = Math.hypot((wx - cm.cx) * cm.scaleX, (wz - cm.cz) * cm.scaleZ) / 1180.0;
    return 1.0 - M.smoothstep(0.55, 1.16, dSingle);
  }

  // Wide walkable 2-turn spiral mountain road carving smoothly through all 7 steep tiers on 云雾山!
  function getCloudMountainPathInfo(x, z) {
    if (x < 560 || x > 4760 || z < 3040 || z > 5040) {
      return { pathMask: 0.0, dist: 999.0, t: 0.0, targetY: 0.0 };
    }
    const pts = CLOUD_MOUNTAIN.pathPoints;
    const segCount = pts.length - 1;
    let bestDist = 999.0;
    let bestT = 0.0;
    let bestY = 22.0;
    for (let i = 0; i < segCount; i++) {
      const a = pts[i], b = pts[i + 1];
      const seg = distToSegment(x, z, a[0], a[1], b[0], b[1]);
      if (seg.dist < bestDist) {
        bestDist = seg.dist;
        bestT = (i + seg.t) / segCount;
        bestY = M.lerp(a[2], b[2], seg.t);
      }
    }
    const wobble = N.fbm2D(x * 0.012 + 1.4, z * 0.012 - 3.2, 2) * 3.0;
    const effDist = Math.max(0.0, bestDist + wobble * 0.35);
    const pathMask = 1.0 - M.smoothstep(16.0, 38.0, effDist);
    return { pathMask, dist: effDist, t: bestT, targetY: bestY };
  }

  // Vast Wind-Swept Golden Sand Dunes Basin expanded one more ring West strictly OUTSIDE 低云平原 & 残阵古道: 流沙荒漠!
  function getDesertMask(x, z) {
    if (x > -3100 || x < -9950 || z < 200 || z > 8150) return 0.0;
    const wx = x + N.fbm2D(x * 0.00065 + 6.1, z * 0.00065 - 2.3, 3) * 340.0;
    const wz = z + N.fbm2D(x * 0.00065 - 3.4, z * 0.00065 + 5.2, 3) * 320.0;

    // 5 vast overlapping organic desert basins + NW bay fill closing the sea wedge below 通天灵木林!
    const dNorth    = Math.hypot((wx + 5580) / 1420, (wz - 2520) / 1120);
    const dCenter   = Math.hypot((wx + 5760) / 1520, (wz - 4320) / 1460);
    const dFarWest  = Math.hypot((wx + 6520) / 1180, (wz - 5220) / 1620);
    const dDeepSW   = Math.hypot((wx + 5420) / 1680, (wz - 6240) / 1220);
    const dDeepWest = Math.hypot((wx + 7760) / 1420, (wz - 4580) / 2380);
    const dFillNWBay = Math.hypot((wx + 6050) / 2020, (wz - 1780) / 1320);
    // Natural desert entry passes connecting smoothly off 低云平原 far-SW edge & 残阵古道 SW flank
    const dGatePlain = distToSegment(wx, wz, -4120, 3540, -4920, 3860).dist / 420.0;
    const dGateRoad  = distToSegment(wx, wz, -3720, 1480, -4820, 2240).dist / 360.0;
    const minD = Math.min(dNorth, dCenter, dFarWest, dDeepSW, dDeepWest, dFillNWBay, dGatePlain, dGateRoad);
    const rawDesert = 1.0 - M.smoothstep(0.56, 1.18, minD);
    if (rawDesert <= 0.0001) return 0.0;

    // Guarantee 100% of 低云平原, 残阵古道 & 通天灵木林 remain intact — desert only fills its side of the western bay!
    const roadProtect   = 1.0 - M.smoothstep(0.22, 0.72, getAncientRoadMask(x, z));
    const plainProtect  = 1.0 - M.smoothstep(0.28, 0.72, getLowCloudPlainsMask(x, z));
    const forestProtect = 1.0 - M.smoothstep(0.28, 0.74, getSpiritForestMask(x, z));
    return rawDesert * roadProtect * plainProtect * forestProtect;
  }

  // Disordered organic wind-sculpted desert dunes (heavily domain-warped multi-directional ridges & hollows — ZERO parallel stripes!)
  function getDesertDuneWave(x, z) {
    // 2-stage organic domain warp so dune crests bend, branch, merge, and taper irregularly like natural desert ergs
    const w1x = N.fbm2D(x * 0.0011 + 3.7, z * 0.0011 - 2.1, 3) * 290.0;
    const w1z = N.fbm2D(x * 0.0011 - 4.8, z * 0.0011 + 5.3, 3) * 290.0;
    const px = x + w1x;
    const pz = z + w1z;

    // Combine 3 non-commensurate warped organic ridge & swell octaves (asymmetric windward/leeward profile, smooth & walkable!)
    const ridgeA = N.ridged2D(px * 0.0022 + 1.4, pz * 0.0016 - 2.7, 3) * 2.0 - 1.0;
    const ridgeB = N.ridged2D((px * 0.72 - pz * 0.69) * 0.0031 - 5.1, (px * 0.69 + pz * 0.72) * 0.0019 + 3.4, 2) * 2.0 - 1.0;
    const swell  = N.fbm2D(px * 0.0014 - 1.9, pz * 0.0014 + 4.2, 3);
    // Gentle directional asymmetry (slightly steeper leeward drop without creating periodic parallel bands)
    const raw = ridgeA * 0.46 + ridgeB * 0.28 + swell * 0.42;
    return M.clamp(raw + 0.16 * raw * raw - 0.08, -1.0, 1.0);
  }

  // Vast Open Northern, Western & Northeastern Frost Snowfield Basin expanded one more ring West: 霜雪原!
  function getSnowfieldMask(x, z) {
    if (x < -9450 || x > 4650 || z > -3850 || z < -9950) return 0.0;
    const wx = x + N.fbm2D(x * 0.00055 - 4.3, z * 0.00055 + 2.8, 3) * 340.0;
    const wz = z + N.fbm2D(x * 0.00055 + 3.1, z * 0.00055 - 5.2, 3) * 320.0;

    // 6 expansive organic snowfield basins + fills closing the 2 northern notches & 2 southern snow-to-forest bridges!
    const dWest         = Math.hypot((wx + 3720) / 1720, (wz + 6020) / 1280);
    const dFarWest      = Math.hypot((wx + 6260) / 1820, (wz + 6580) / 1720);
    const dCenter       = Math.hypot((wx + 1480) / 2150, (wz + 6880) / 1860);
    const dFarN         = Math.hypot((wx + 2450) / 2250, (wz + 7980) / 1380);
    const dNE           = Math.hypot((wx - 1180) / 2150, (wz + 6680) / 1820);
    const dFarNE        = Math.hypot((wx - 1850) / 1820, (wz + 7720) / 1460);
    const dFillNW       = Math.hypot((wx + 4750) / 1920, (wz + 7680) / 1520);
    const dFillNMid     = Math.hypot((wx + 120)  / 2020, (wz + 7920) / 1480);
    const dFillSWBridge = Math.hypot((wx + 5920) / 1620, (wz + 5280) / 1220);
    const dFillSBridge  = Math.hypot((wx + 1150) / 1740, (wz + 5220) / 1240);
    const dPass         = distToSegment(wx, wz, -3480, -4550, -3440, -5280).dist / 420.0;
    const minD = Math.min(dWest, dFarWest, dCenter, dFarN, dNE, dFarNE, dFillNW, dFillNMid, dFillSWBridge, dFillSBridge, dPass);
    const rawSnow = 1.0 - M.smoothstep(0.56, 1.18, minD);
    if (rawSnow <= 0.0001) return 0.0;

    // Protect 通天灵木林's core woodland while keeping a crisp natural frosted-meadow transition at the northern margin
    const forestGuard = 1.0 - M.smoothstep(0.32, 0.78, getSpiritForestMask(x, z));
    return rawSnow * forestGuard;
  }

  // Organic wind-carved snow ridges & gentle undulating snowdrifts (风吹雪脊 — smooth & walkable!)
  function getSnowDriftWave(x, z) {
    const wx = N.fbm2D(x * 0.0014 + 2.1, z * 0.0014 - 3.6, 3) * 210.0;
    const wz = N.fbm2D(x * 0.0014 - 4.5, z * 0.0014 + 1.8, 3) * 210.0;
    const px = x + wx, pz = z + wz;
    const drift1 = N.ridged2D(px * 0.0020 + 5.2, pz * 0.0015 - 1.4, 3) * 2.0 - 1.0;
    const swell  = N.fbm2D(px * 0.0016 - 2.3, pz * 0.0016 + 4.7, 3);
    return M.clamp(drift1 * 0.45 + swell * 0.55, -1.0, 1.0);
  }

  // ONE Unified 6-Tier Sky-Piercing Snow Mountain in the heart of expanded 霜雪原: 霜雪山 (~2200m x 1650m compact massif!)
  function getFrostMountainMask(x, z) {
    if (x < -2860 || x > -100 || z < -7960 || z > -5800) return 0.0;
    const fm = FROST_MOUNTAIN;
    const wx = x + N.fbm2D(x * 0.00085 - 2.4, z * 0.00085 + 3.7, 3) * 185.0;
    const wz = z + N.fbm2D(x * 0.00085 + 4.1, z * 0.00085 - 1.8, 3) * 155.0;
    const dSingle = Math.hypot((wx - fm.cx) * fm.scaleX, (wz - fm.cz) * fm.scaleZ) / 990.0;
    return 1.0 - M.smoothstep(0.55, 1.16, dSingle);
  }

  // Continuous walkable 2-turn spiral mountain ramp carving smoothly through all 6 snowy cliff tiers on 霜雪山!
  function getFrostMountainPathInfo(x, z) {
    if (x < -2700 || x > -260 || z < -7820 || z > -5940) {
      return { pathMask: 0.0, dist: 999.0, t: 0.0, targetY: 84.0 };
    }
    const pts = FROST_MOUNTAIN.pathPoints;
    const segCount = pts.length - 1;
    let bestDist = 999.0;
    let bestT = 0.0;
    let bestY = 84.0;
    for (let i = 0; i < segCount; i++) {
      const a = pts[i], b = pts[i + 1];
      const seg = distToSegment(x, z, a[0], a[1], b[0], b[1]);
      if (seg.dist < bestDist) {
        bestDist = seg.dist;
        bestT = (i + seg.t) / segCount;
        bestY = M.lerp(a[2], b[2], seg.t);
      }
    }
    const wobble = N.fbm2D(x * 0.013 - 2.1, z * 0.013 + 3.6, 2) * 2.6;
    const effDist = Math.max(0.0, bestDist + wobble * 0.35);
    const pathMask = 1.0 - M.smoothstep(14.0, 34.0, effDist);
    return { pathMask, dist: effDist, t: bestT, targetY: bestY };
  }

  // Boss Region 1 Mask: 灵竹幽谷 (Deep ~1300m x 1350m Spirit Bamboo Valley seamlessly connected South/below 云雾山!)
  function getBambooValleyMask(x, z) {
    if (x < 1680 || x > 4750 || z < 4880 || z > 7650) return 0.0;
    const wx = x + N.fbm2D(x * 0.0018 + 2.1, z * 0.0018 - 1.4, 3) * 110.0;
    const wz = z + N.fbm2D(x * 0.0018 - 3.2, z * 0.0018 + 2.8, 3) * 110.0;
    // 3 overlapping organic valley lobes + SE outer notch fill (strictly preserving 云雾山!)
    const dNorthPass = Math.hypot((wx - 2660) / 560, (wz - 5380) / 420);
    const dMidValley = Math.hypot((wx - 2620) / 620, (wz - 5760) / 440);
    const dBossDeep  = Math.hypot((wx - 2660) / 580, (wz - 6120) / 420);
    const dFillEast  = Math.hypot((wx - 3520) / 1040, (wz - 5920) / 980);
    const dFillSE    = Math.hypot((wx - 3320) / 1020, (wz - 6680) / 920);
    const raw = 1.0 - M.smoothstep(0.56, 1.18, Math.min(dNorthPass, dMidValley, dBossDeep, dFillEast, dFillSE));
    if (raw <= 0.0001) return 0.0;
    // Strictly preserve 云雾山's original mountain slopes — seamless natural foothill handoff with ZERO overwrite!
    const cloudGuard = 1.0 - M.smoothstep(0.14, 0.62, getCloudMountainMask(x, z));
    return raw * cloudGuard;
  }

  // Boss Region 2 Mask: 蚀骨毒潭 (Deep ~1650m x 1350m Sinister Venom Mire seamlessly connected East/right of 沉烟迷泽!)
  function getVenomMireMask(x, z) {
    if (x < 3580 || x > 5900 || z < 550 || z > 3040) return 0.0;
    const wx = x + N.fbm2D(x * 0.0018 - 1.9, z * 0.0018 + 3.7, 3) * 115.0;
    const wz = z + N.fbm2D(x * 0.0018 + 4.1, z * 0.0018 - 2.3, 3) * 110.0;
    // 3 overlapping dark-wetland lobes + north bay fill closing the gap north of 蚀骨毒潭!
    const dWestEntry = Math.hypot((wx - 4180) / 460, (wz - 2220) / 480);
    const dMidMire   = Math.hypot((wx - 4620) / 520, (wz - 2180) / 540);
    const dBossBasin = Math.hypot((wx - 5040) / 520, (wz - 2160) / 520);
    const dFillNorth = Math.hypot((wx - 4620) / 1220, (wz - 1480) / 920);
    const raw = 1.0 - M.smoothstep(0.56, 1.18, Math.min(dWestEntry, dMidMire, dBossBasin, dFillNorth));
    if (raw <= 0.0001) return 0.0;
    // Strictly preserve 沉烟迷泽 & 云雾山 — seamless natural transition with ZERO overwrite!
    const swampGuard = 1.0 - M.smoothstep(0.18, 0.68, getSwampMask(x, z));
    const cloudGuard = 1.0 - M.smoothstep(0.10, 0.52, getCloudMountainMask(x, z));
    return raw * swampGuard * cloudGuard;
  }

  // Hidden Steep Forested Mountain Range Mask: 幽林秘岭 (~3000m x 3400m expanding outward from 云雾山下方 & 低云平原 junction!)
  function getHiddenMountainsMask(x, z) {
    if (x < -1180 || x > 4420 || z < 4580 || z > 8950) return 0.0;
    const wx = x + N.fbm2D(x * 0.0009 + 4.3, z * 0.0009 - 2.7, 3) * 240.0;
    const wz = z + N.fbm2D(x * 0.0009 - 3.1, z * 0.0009 + 5.2, 3) * 240.0;

    // 5 sprawling overlapping mountain-range basins + smooth SW & SE foothill fills closing bottom notches!
    const dNorthGate  = Math.hypot((wx -  760) /  740, (wz - 5420) / 640);
    const dWestRange  = Math.hypot((wx -  620) /  840, (wz - 6480) / 940);
    const dCenterCore = Math.hypot((wx - 1240) /  980, (wz - 6680) / 980);
    const dSouthDeep  = Math.hypot((wx - 1180) / 1320, (wz - 7680) / 860);
    const dEastDeep   = Math.hypot((wx - 2240) / 1040, (wz - 7420) / 840);
    const dFillSWFoot = Math.hypot((wx -   80) / 1220, (wz - 7280) / 1120);
    const dFillSEFoot = Math.hypot((wx - 2850) / 1180, (wz - 7320) / 1020);
    const dPass       = distToSegment(wx, wz, 460, 5020, 860, 5480).dist / 360.0;
    const minD = Math.min(dNorthGate, dWestRange, dCenterCore, dSouthDeep, dEastDeep, dFillSWFoot, dFillSEFoot, dPass);
    const raw = 1.0 - M.smoothstep(0.54, 1.18, minD);
    if (raw <= 0.0001) return 0.0;

    // Strictly ZERO overwrite of existing regions: 低云平原, 云雾山, 灵竹幽谷, 沉烟迷泽 remain 100% intact!
    const plainGuard  = 1.0 - M.smoothstep(0.18, 0.64, getLowCloudPlainsMask(x, z));
    const cloudGuard  = 1.0 - M.smoothstep(0.14, 0.58, getCloudMountainMask(x, z));
    const bambooGuard = 1.0 - M.smoothstep(0.14, 0.58, getBambooValleyMask(x, z));
    const swampGuard  = 1.0 - M.smoothstep(0.10, 0.45, getSwampMask(x, z));
    return raw * plainGuard * cloudGuard * bambooGuard * swampGuard;
  }

  // Winding narrow hidden mountain switchback trails descending from the central Abandoned Cave-Mansion (废弃洞府)!
  function getHiddenMountainPathInfo(x, z) {
    if (x < 240 || x > 2180 || z < 4860 || z > 6720) {
      return { pathMask: 0.0, dist: 999.0, t: 0.0, targetY: 178.0 };
    }
    let bestDist = 999.0;
    let bestT = 0.0;
    let bestY = 178.0;
    const checkChain = (pts) => {
      const segCount = pts.length - 1;
      for (let i = 0; i < segCount; i++) {
        const a = pts[i], b = pts[i + 1];
        const seg = distToSegment(x, z, a[0], a[1], b[0], b[1]);
        if (seg.dist < bestDist) {
          bestDist = seg.dist;
          bestT = (i + seg.t) / segCount;
          bestY = M.lerp(a[2], b[2], seg.t);
        }
      }
    };
    checkChain(HIDDEN_MOUNTAINS.trailPoints);
    checkChain(HIDDEN_MOUNTAINS.eastTrailPoints);
    const wobble = N.fbm2D(x * 0.011 + 1.8, z * 0.011 - 3.4, 2) * 2.4;
    const effDist = Math.max(0.0, bestDist + wobble * 0.32);
    const pathMask = 1.0 - M.smoothstep(16.0, 42.0, effDist);
    return { pathMask, dist: effDist, t: bestT, targetY: bestY };
  }

  // Smooth Continent Perimeter Envelope (wraps a medium-height 青石城-style coastal mountain belt around the ENTIRE world boundary!)
  const CONTINENT_COAST_LOBES = [
    // North (霜雪原 + filled north notches)
    [-6150, -6450, 2450, 2150],
    [-4450, -7250, 2400, 1750],
    [-1750, -7150, 2750, 1880],
    [  650, -7180, 2450, 1850],
    [ 1850, -6850, 2350, 1980],
    // Upper-West & Upper-Center bridges + 通天灵木林
    [-5850, -4300, 2400, 2100],
    [-5850, -1850, 2550, 2600],
    [-3400, -2400, 2650, 2550],
    [-1250, -3950, 2400, 2100],
    // Mid-West bay fill + 流沙荒漠
    [-5900,  1100, 2650, 2200],
    [-6350,  3450, 2650, 2350],
    [-6850,  5150, 2350, 2350],
    [-5100,  6100, 2450, 1950],
    // Central 青石城 + 沉烟迷泽 + 蚀骨毒潭 + NE bay fill
    [  150,  -450, 2300, 2300],
    [ 1950,   850, 2250, 2000],
    [ 3850,  1650, 2300, 1750],
    [ 4850,  2250, 1850, 1580],
    [ 2400,  3450, 2850, 2150],
    // South & SE 低云平原 + 灵竹幽谷 + 幽林秘岭 + filled south/SE notches
    [-2350,  3200, 2950, 2950],
    [-2450,  5850, 2900, 2200],
    [ -350,  6650, 2200, 2000],
    [ 1450,  6950, 2350, 2000],
    [ 3300,  6050, 2050, 2000],
  ];

  function getContinentCoastMask(x, z) {
    const wx = x + N.fbm2D(x * 0.00052 + 3.4, z * 0.00052 - 2.1, 2) * 320.0;
    const wz = z + N.fbm2D(x * 0.00052 - 4.1, z * 0.00052 + 3.7, 2) * 320.0;
    let minD = 99.0;
    for (let i = 0; i < CONTINENT_COAST_LOBES.length; i++) {
      const L = CONTINENT_COAST_LOBES[i];
      const d = Math.hypot((wx - L[0]) / L[2], (wz - L[1]) / L[3]);
      if (d < minD) minD = d;
    }
    // Wide unhurried coastal belt (0.66 -> 1.24) so the medium hills descend gently into the sea!
    let env = 1.0 - M.smoothstep(0.66, 1.24, minD);
    // Keep outer map square edge smoothly descending into endless Deep Sea near ±9200
    const boxEdge = Math.max(Math.abs(x), Math.abs(z));
    const edgeSea = 1.0 - M.smootherstep(8480, 9160, boxEdge);
    return env * edgeSea;
  }

  // Irregular Organic Outer Mountain Rim (kept for callers)
  function getIrregularRimMask(x, z) {
    // Domain-warped organic outer mountain border — completely eliminates any circular ring look!
    const warpX = N.fbm2D(x * 0.00058 + 5.1, z * 0.00058 - 2.4, 3) * 760.0;
    const warpZ = N.fbm2D(x * 0.00058 - 4.2, z * 0.00058 + 3.8, 3) * 760.0;
    const px = x + warpX;
    const pz = z + warpZ;

    // Asymmetric irregular border distances in each direction (pushed way out SW & deep South for huge 低云平原!)
    const ang = Math.atan2(pz, px);
    const lobe = 1.0
      + 0.24 * Math.sin(ang * 2.0 - 0.9)
      + 0.16 * Math.cos(ang * 3.0 + 1.4)
      + 0.11 * Math.sin(ang * 5.0 - 0.5);

    // Extra vast outward breathing space in Southwest & Deep-South where 低云平原 sprawls!
    const swStretch = M.smoothstep(-0.15, 0.85, -px / 2400) * M.smoothstep(-0.15, 0.85, pz / 2400) * 1.45;
    const southStretch = M.smoothstep(0.25, 1.0, pz / 3200) * (1.0 - M.smoothstep(0.15, 0.85, px / 2200)) * 0.62;
    const effRadius = Math.hypot(px, pz) / (lobe + swStretch + southStretch);

    // Smooth mountain boundary rising naturally only well outside the inner continent
    const rim = M.smootherstep(1780, 3120, effRadius);
    // Keep outer square canvas edge smoothly descending into endless Deep Sea near ±9200
    const boxEdge = Math.max(Math.abs(x), Math.abs(z));
    const edgeTie = M.smootherstep(8480, 9160, boxEdge);
    return Math.min(1.0, Math.max(rim, edgeTie));
  }

  // Central river/gorge removed during 青石城 reconstruction (kept as safe zero stub for callers)
  function getRiverInfo(x, z) {
    return { riverMask: 0.0, gorgeMask: 0.0, dist: 9999.0 };
  }

  function getCanyonMask(x, z) {
    return 0.0;
  }

  // Soft mask for 青石城's walled footprint & surrounding green plain
  function getQingshiCityMask(x, z) {
    const dx = Math.max(0, Math.abs(x - QINGSHI_CITY.cx) - QINGSHI_CITY.halfW);
    const dz = Math.max(0, z < QINGSHI_CITY.northZ ? (QINGSHI_CITY.northZ - z) : (z > QINGSHI_CITY.southZ ? (z - QINGSHI_CITY.southZ) : 0));
    const d = Math.hypot(dx, dz);
    return 1.0 - M.smoothstep(0.0, 26.0, d);
  }

  // Grand paved avenues inside 青石城 (260m × 240m) & connecting post-roads toward 低云平原
  function getPathMask(x, z) {
    if (getLowCloudPlainsMask(x, z) > 0.48) return 0.0;

    // Grand Central Immortal Plaza (聚灵大广场)
    const pPlaza = 1 - M.smoothstep(28.0, 38.0, Math.hypot(x, z));
    // Grand N-S Immortal Avenue (South Gate -> Plaza -> 聚宝轩 -> North Gate)
    const pNS = 1 - M.smoothstep(9.5, 14.5, distToSegment(x, z, 0, 128, 0, -118).dist);
    // Grand E-W Avenue (West Gate -> Plaza -> East Gate)
    const pEW = 1 - M.smoothstep(8.5, 13.0, distToSegment(x, z, -132, 0, 132, 0).dist);
    // Inner Market & Residential Ring Boulevards
    const pNorthLane = 1 - M.smoothstep(6.0, 10.2, distToSegment(x, z, -96, -40, 96, -40).dist);
    const pSouthLane = 1 - M.smoothstep(6.0, 10.2, distToSegment(x, z, -96,  48, 96,  48).dist);
    const pFarSouth  = 1 - M.smoothstep(5.5,  9.5, distToSegment(x, z, -96,  86, 96,  86).dist);
    const pWestBlvd  = 1 - M.smoothstep(5.5,  9.5, distToSegment(x, z, -76, -86, -76, 96).dist);
    const pEastBlvd  = 1 - M.smoothstep(5.5,  9.5, distToSegment(x, z,  76, -86,  76, 96).dist);
    // Exterior bluestone approach roads leading out South/West/East/North Gates
    const pExtS1 = 1 - M.smoothstep(6.5, 12.0, distToSegment(x, z, 0, 125, -180, 290).dist);
    const pExtS2 = 1 - M.smoothstep(5.5, 11.0, distToSegment(x, z, -180, 290, -540, 580).dist);
    const pExtW  = 1 - M.smoothstep(5.5, 10.0, distToSegment(x, z, -130, 0, -320, 110).dist);
    const pExtE  = 1 - M.smoothstep(5.2,  9.5, distToSegment(x, z,  130, 0,  300,  32).dist);

    return Math.min(
      1.0,
      Math.max(
        pPlaza, pNS * 0.98, pEW * 0.96,
        pNorthLane * 0.90, pSouthLane * 0.88, pFarSouth * 0.84, pWestBlvd * 0.86, pEastBlvd * 0.86,
        pExtS1 * 0.84, pExtS2 * 0.72, pExtW * 0.78, pExtE * 0.74
      )
    );
  }

  // Analytical Terrain Height across the 5400m x 5400m Irregular Open World
  function getTerrainHeight(x, z) {
    const plainsRoll = N.fbm2D(x * 0.0014 + 2.1, z * 0.0014 - 1.4, 3) * 14.0;
    const hillsFbm   = N.fbm2D(x * 0.0038 - 3.3, z * 0.0038 + 2.7, 4) * 10.5;
    const fine       = N.fbm2D(x * 0.015, z * 0.015, 2) * 2.0;

    // Central Plains (centered around 青石城 at 0,0) + Huge Irregular Southwest Low-Cloud Plains + Open Meadow Corridor!
    const centralPlains = 1 - M.smoothstep(0.55, 1.32, Math.hypot(x / 680, z / 680));
    const lowCloudMask = getLowCloudPlainsMask(x, z);
    const corridorSeg = distToSegment(x, z, -1020, 1120, 0, 62);
    const corridorMask = 1 - M.smoothstep(180, 460, corridorSeg.dist);
    const totalPlainsMask = Math.min(1.0, Math.max(centralPlains, lowCloudMask, corridorMask * 0.92));

    const ridge = N.ridged2D(x * 0.0024 - 1.9, z * 0.0024 + 3.4, 4);
    const karst = Math.pow(ridge, 1.55) * 105.0;

    let h = 17.5 + plainsRoll * (0.50 + 0.50 * (1 - totalPlainsMask)) + hillsFbm * (0.36 + 0.64 * (1 - totalPlainsMask)) + fine;
    h += karst * (1.0 - totalPlainsMask * 0.95);

    // Sweeping organic gentle hills & localized rolling knolls across 低云平原 (interspersed with flat stretches, not everywhere!)
    if (lowCloudMask > 0.001) {
      const broadSwell = N.fbm2D(x * 0.00095 - 4.2, z * 0.00095 + 1.8, 3) * 11.5
                       + N.fbm2D(x * 0.0032 + 1.1, z * 0.0032 - 2.6, 2) * 4.5;
      // Localized knoll envelope: ~45% of plains have gentle 3~6m rolling mounds/dips, ~55% stay open & level
      const knollPatch = M.smoothstep(0.06, 0.56, N.fbm2D(x * 0.0024 + 5.7, z * 0.0024 - 3.9, 2));
      const spawnFlat = M.smoothstep(28.0, 95.0, Math.hypot(x - LOW_CLOUD_PLAINS.spawnX, z - LOW_CLOUD_PLAINS.spawnZ));
      const localUnd = (N.fbm2D(x * 0.0082 - 2.4, z * 0.0082 + 4.1, 3) * 5.8
                      + (N.ridged2D(x * 0.0064 + 1.7, z * 0.0064 - 2.8, 2) - 0.38) * 3.6) * knollPatch * spawnFlat;
      const lowCloudH = 18.0 + broadSwell + localUnd + fine * 0.52;
      h = M.lerp(h, lowCloudH, lowCloudMask);
    }

    // Irregular Non-Circular Outer Mountain Ranges framing the 18400m continent (smoothly suppressed across ALL playable biomes!)
    const swampMask = getSwampMask(x, z);
    const ancientMask = getAncientRoadMask(x, z);
    const spiritWoodMask = getSpiritForestMask(x, z);
    const cloudMtnMask = getCloudMountainMask(x, z);
    const desertMask = getDesertMask(x, z);
    const snowMask = getSnowfieldMask(x, z);
    const frostMtnEarly = getFrostMountainMask(x, z);
    const bambooValEarly = getBambooValleyMask(x, z);
    const venomMireEarly = getVenomMireMask(x, z);
    const hiddenMtnEarly = getHiddenMountainsMask(x, z);
    // Broad seamless handoff suppression so boundary mountains NEVER block the link between 云雾山↔灵竹幽谷, 沉烟迷泽↔蚀骨毒潭, or 低云平原/云雾山↔幽林秘岭!
    const bvSeam = 1.0 - M.smoothstep(480.0, 960.0, Math.hypot((x - 2660) * 0.85, (z - 5750) * 0.82));
    const vmSeam = 1.0 - M.smoothstep(520.0, 1020.0, Math.hypot((x - 4680) * 0.78, (z - 2180) * 0.88));
    const hmSeam = 1.0 - M.smoothstep(560.0, 1120.0, Math.hypot((x - 920) * 0.85, (z - 5380) * 0.82));
    const maxPlayable = Math.max(
      centralPlains, corridorMask,
      lowCloudMask, swampMask, ancientMask, spiritWoodMask,
      cloudMtnMask, desertMask, snowMask, frostMtnEarly,
      bambooValEarly, venomMireEarly, hiddenMtnEarly, bvSeam, vmSeam, hmSeam
    );
    // World Boundary Coastal Transition Belt:
    // Surrounds the ENTIRE continent with 青石城-style medium-height rolling hills (~32..92m) that slope gradually (不要太快) into the Deep Sea!
    // Strictly ZERO modification inside existing playable biomes (outOfPlayable === 0 when maxPlayable >= 0.68)!
    const coastEnv = Math.max(maxPlayable, getContinentCoastMask(x, z));
    const outOfPlayable = 1.0 - M.smootherstep(0.16, 0.68, maxPlayable);
    if (outOfPlayable > 0.001) {
      const shelfRoll = N.fbm2D(x * 0.0012 + 3.1, z * 0.0012 - 2.4, 3) * 6.5;
      const deepRoll = N.fbm2D(x * 0.0028 - 4.7, z * 0.0028 + 1.9, 2) * 3.0;
      const seaBedH = -42.0 + shelfRoll + deepRoll;
      // Medium-height 青石城-style rolling mountain hills (emerald-slate karst ~32..92m, NO snow-peak spikes)
      const coastHillH = 20.0 + plainsRoll * 0.85 + hillsFbm * 0.88 + fine + Math.pow(ridge, 1.55) * 76.0;
      const landWeight = M.smootherstep(0.10, 0.78, coastEnv);
      const coastalH = M.lerp(seaBedH, Math.min(coastHillH, 94.0 + plainsRoll * 0.35), landWeight);
      h = M.lerp(h, coastalH, outOfPlayable);
    }

    // 霜雪原 (Frost Snowfield): open undulating silver-white snow plateau & wind-blown snow ridges north of 通天灵木林!
    if (snowMask > 0.001) {
      const fs = FROST_SNOWFIELD;
      const macroRoll = N.fbm2D(x * 0.00095 + 1.8, z * 0.00095 - 3.2, 3) * 11.5;
      const snowDrift = getSnowDriftWave(x, z) * (10.5 + 4.5 * M.smoothstep(0.25, 0.90, snowMask));
      const snowPatch = M.smoothstep(0.08, 0.58, N.fbm2D(x * 0.0023 - 4.1, z * 0.0023 + 2.9, 2));
      const localSnowMound = N.fbm2D(x * 0.0076 + 3.2, z * 0.0076 - 1.8, 3) * 5.2 * snowPatch;
      const microSnow = N.fbm2D(x * 0.012 - 2.4, z * 0.012 + 4.6, 2) * 1.0;
      let snowH = 82.0 + macroRoll + snowDrift + localSnowMound + microSnow;

      // Gently depress & level the Frozen Frost Tarn (寒潭冰面) at (-3460, -5940, y = 74.2m) so players can walk right onto the glassy ice!
      const dPond = Math.hypot((x - fs.pondX) * 0.94, (z - fs.pondZ) * 1.08);
      const pondFlat = 1.0 - M.smoothstep(fs.pondR * 0.82, fs.pondR * 1.04, dPond);
      const pondBank = 1.0 - M.smoothstep(fs.pondR * 0.95, fs.pondR * 1.55, dPond);
      if (pondBank > 0.001) {
        snowH = M.lerp(snowH, fs.iceY + 3.2 + microSnow * 0.5, pondBank * 0.65);
      }
      if (pondFlat > 0.001) {
        snowH = M.lerp(snowH, fs.iceY, pondFlat * 0.98);
      }
      // Slightly flatten the half-buried Frost Array altar terrace at (-4180, -6080)
      const arrayFlat = 1.0 - M.smoothstep(24.0, 52.0, Math.hypot(x + 4180, z + 6080));
      if (arrayFlat > 0.001) {
        snowH = M.lerp(snowH, 83.5 + microSnow * 0.2, arrayFlat * 0.88);
      }

      const blendSnow = M.smoothstep(0.04, 0.68, snowMask);
      h = M.lerp(h, snowH, blendSnow);
    }

    // 霜雪山 (ONE Unified 6-Tier Sky-Piercing Snow Mountain rising at the center of 霜雪原 — compact 云雾山 architecture up to 680m!):
    const frostMtnMask = getFrostMountainMask(x, z);
    if (frostMtnMask > 0.001) {
      const fm = FROST_MOUNTAIN;
      const sx = (x - fm.cx) * fm.scaleX;
      const sz = (z - fm.cz) * fm.scaleZ;
      const rawR = Math.hypot(sx, sz);
      const ang = Math.atan2(sz, sx);

      const cliffWarp = (N.fbm2D(x * 0.0022 - 2.7, z * 0.0022 + 3.4, 3) * 44.0
                      + Math.sin(ang * 5.0 - 0.5) * 18.0
                      + Math.cos(ang * 3.0 + 0.9) * 14.0) * M.smoothstep(130.0, 260.0, rawR);
      const effR = Math.max(0.0, rawR + cliffWarp);

      const rockDetail = N.ridged2D(x * 0.0038 - 1.9, z * 0.0038 + 2.8, 3);
      const gentleNoise = N.fbm2D(x * 0.0046 + 1.5, z * 0.0046 - 2.4, 2) * 2.4;

      // 6 Steep Stratified Frost-Rock Cliff Risers alternating with 5 Wide Flat Snowy Terraces + 680m Snow Summit!
      const t1 = 1.0 - M.smoothstep(865.0, 955.0, effR); // 84  -> 180m
      const t2 = 1.0 - M.smoothstep(715.0, 785.0, effR); // 180 -> 280m
      const t3 = 1.0 - M.smoothstep(570.0, 635.0, effR); // 280 -> 380m
      const t4 = 1.0 - M.smoothstep(430.0, 490.0, effR); // 380 -> 480m
      const t5 = 1.0 - M.smoothstep(290.0, 350.0, effR); // 480 -> 580m
      const t6 = 1.0 - M.smoothstep(140.0, 200.0, effR); // 580 -> 680m Grand Snow Summit Plateau!

      let fmH = 84.0 + t1 * 96.0 + t2 * 100.0 + t3 * 100.0 + t4 * 100.0 + t5 * 100.0 + t6 * 100.0;

      const onRiser = Math.min(1.0, (
        t1 * (1.0 - t1) + t2 * (1.0 - t2) + t3 * (1.0 - t3) +
        t4 * (1.0 - t4) + t5 * (1.0 - t5) + t6 * (1.0 - t6)
      ) * 4.0);
      fmH += onRiser * (rockDetail - 0.35) * 28.0 + (1.0 - onRiser) * gentleNoise * 0.35;

      // Flatten the 5 dedicated snow patrol terraces cleanly
      for (let i = 0; i < fm.terraces.length; i++) {
        const tc = fm.terraces[i];
        const wT = 1.0 - M.smoothstep(tc.r * 0.55, tc.r * 1.15, Math.hypot(x - tc.x, z - tc.z));
        if (wT > 0.001) {
          fmH = M.lerp(fmH, tc.y + fine * 0.14, wT * 0.94);
        }
      }

      // Carve the continuous walkable 2-turn spiral snow ramp smoothly through all 6 risers!
      const fp = getFrostMountainPathInfo(x, z);
      if (fp.pathMask > 0.005) {
        fmH = M.lerp(fmH, fp.targetY + fine * 0.10, fp.pathMask * 0.96);
      }

      // Lock the 680m Grand Snow Summit Plateau flat & open (~320m x 238m sky-piercing snow arena!)
      const summitFlatW = 1.0 - M.smoothstep(126.0, 150.0, rawR);
      if (summitFlatW > 0.001) {
        fmH = M.lerp(fmH, fm.summitY + fine * 0.14, summitFlatW * 0.98);
      }

      const blendFm = M.smoothstep(0.02, 0.45, frostMtnMask);
      h = M.lerp(h, fmH, blendFm);
    }

    // 流沙荒漠 (Shifting Sands Desert): disordered organic undulating golden dunes strictly outside 低云平原!
    if (desertMask > 0.001) {
      const macroDrift = N.fbm2D(x * 0.00072 - 2.6, z * 0.00072 + 3.8, 3) * 12.0;
      const duneWave = getDesertDuneWave(x, z);
      const sandMicro = N.fbm2D(x * 0.011 + 4.1, z * 0.011 - 1.7, 2) * 1.1;
      // Smoothly rolling organic dunes (y ~ 15..58m, gentle walkable slopes everywhere!)
      const duneAmp = 15.0 + 9.0 * M.smoothstep(0.22, 0.90, desertMask);
      let desertH = 30.0 + macroDrift + duneWave * duneAmp + sandMicro;
      const blendDes = M.smoothstep(0.04, 0.68, desertMask);
      h = M.lerp(h, desertH, blendDes);
    }

    // 通天灵木林 (Primeval Spirit Forest): sheltered undulating mossy forest basin (~55..68m) opening beyond 残阵古道!
    if (spiritWoodMask > 0.001) {
      const forestPatch = M.smoothstep(0.08, 0.56, N.fbm2D(x * 0.0025 - 3.2, z * 0.0025 + 4.4, 2));
      const forestRoll = N.fbm2D(x * 0.0026 + 3.4, z * 0.0026 - 2.1, 3) * 9.5
                       + N.fbm2D(x * 0.010 - 1.5, z * 0.010 + 4.3, 2) * 2.6
                       + N.fbm2D(x * 0.0078 + 2.3, z * 0.0078 - 3.7, 2) * 4.6 * forestPatch;
      let forestH = 59.5 + forestRoll + fine * 0.45;
      const tr = getSpiritForestTrailInfo(x, z);
      if (tr.trailMask > 0.01) {
        const trailElev = M.lerp(63.2, 58.2, M.smoothstep(0.0, 1.0, tr.t)) + Math.sin(tr.t * Math.PI * 2.2) * 1.4;
        forestH = M.lerp(forestH, trailElev, tr.trailMask * 0.68);
      }
      // Gentle sanctuary glades around the inner Mother Tree, colossal 450m World Tree (-3520, -1720) & outer Mother Tree
      const worldTreeGlade = 1.0 - M.smoothstep(78.0, 165.0, Math.hypot(x + 3520, z + 1720));
      const gladeW = Math.max(
        1.0 - M.smoothstep(26.0, 68.0, Math.hypot(x + 4110, z + 260)),
        worldTreeGlade,
        1.0 - M.smoothstep(32.0, 84.0, Math.hypot(x + 3480, z + 3080))
      );
      if (gladeW > 0.001) {
        forestH = M.lerp(forestH, 58.5 + fine * 0.22, gladeW * 0.88);
      }
      const coreF = M.smoothstep(0.05, 0.74, spiritWoodMask);
      h = M.lerp(h, forestH, coreF);
    }

    // 残阵古道 (Ancient Ruined Array Path): slightly elevated barren slope & gentle valley along West foothills of 低云平原!
    if (ancientMask > 0.001) {
      const rp = getAncientRoadPathInfo(x, z);
      const slopeUnd = N.fbm2D(x * 0.0068 - 3.7, z * 0.0068 + 2.2, 3) * 5.2
                     + N.fbm2D(x * 0.022 + 1.4, z * 0.022 - 5.1, 2) * 1.45;
      // Gently rising widened roadbed from ~22.5m (plain edge) to ~63.5m (extended mountain-foot grand ruined altar)
      const roadElev = M.lerp(22.5, 63.5, M.smoothstep(0.0, 1.0, rp.t)) + Math.sin(rp.t * Math.PI * 3.0) * 1.3;
      // Flanking barren slopes & shallow valley walls rising organically on both sides of the widened winding road
      const valleyWall = M.smoothstep(22.0, 185.0, rp.dist) * (12.0 + 18.0 * rp.t);
      const barrenH = roadElev + valleyWall + slopeUnd * (0.22 + 0.78 * M.smoothstep(9.0, 36.0, rp.dist));
      // Blend smoothly from 低云平原 meadow into the elevated barren valley
      const valleyBlend = M.smoothstep(0.04, 0.72, ancientMask);
      h = M.lerp(h, barrenH, valleyBlend);

      // Gently level the widened winding ruined bluestone roadbed & all altar/ruin architectural terraces
      if (rp.roadMask > 0.01) {
        const flatRoadH = roadElev + slopeUnd * 0.07;
        h = M.lerp(h, flatRoadH, rp.roadMask * 0.88);
      }
      if (rp.siteMask > 0.01) {
        h = M.lerp(h, rp.siteY, rp.siteMask * 0.95);
      }
    }

    // 沉烟迷泽 (Misty Wetland): smooth descent from 32m foothills -> interlaced shallow pools, muddy shoals & low earth hummocks!
    if (swampMask > 0.001) {
      const poolField = N.fbm2D(x * 0.0046 + 6.4, z * 0.0046 - 2.8, 3);
      const shoalNoise = N.fbm2D(x * 0.014 - 1.9, z * 0.014 + 5.1, 3);
      const moundNoise = N.ridged2D(x * 0.0062 + 1.3, z * 0.0062 - 4.4, 2);

      // Base marsh elevation hovering around SWAMP_WATER_Y (6.4): pools dip to 3.8..6.1, muddy shoals sit at 6.5..8.4, low hummocks rise to 8.5..14.2
      let swampH = 6.2 + poolField * 4.4 + shoalNoise * 1.65;
      if (poolField > 0.14) {
        swampH += Math.pow(poolField - 0.14, 1.25) * 8.5 + moundNoise * 2.2;
      }

      // Sculpt walkable signature shoal islets across both inner & outer 沉烟迷泽!
      const shoalIslets = [
        [240,  1875, 58, 12.6], // NW Entry Overlook Knoll from 低云平原
        [430,  2060, 56, 8.2],  // West Reed Shoal
        [645,  2225, 68, 8.6],  // Central Ancient Stele Shoal
        [865,  2360, 62, 8.3],  // East Willow Shoal
        [590,  2490, 58, 8.4],  // South Mist-Cove Shoal
        [1420, 2240, 82, 8.6],  // Outer Mid-East Shoal
        [1940, 2560, 88, 8.8],  // Deep Marsh Reed Shoal
        [2560, 2280, 84, 8.5],  // Far East Willow Isle
        [1480, 3040, 86, 8.5],  // Southern Misty Shoal
        [2420, 3040, 92, 8.7],  // Far SE Miasma Isle
      ];
      for (let i = 0; i < shoalIslets.length; i++) {
        const si = shoalIslets[i];
        const wI = 1.0 - M.smoothstep(si[2] * 0.45, si[2] * 1.15, Math.hypot(x - si[0], z - si[1]));
        if (wI > 0.001) {
          swampH = M.lerp(swampH, si[3] + shoalNoise * 0.65, wI * 0.85);
        }
      }

      // Carve distinct winding shallow misty channels between the shoals so boardwalks cross real water!
      const c1 = distToSegment(x, z, 315, 2005, 485, 1960).dist;
      const c2 = distToSegment(x, z, 515, 2145, 585, 2085).dist;
      const c3 = distToSegment(x, z, 725, 2290, 805, 2265).dist;
      const c4 = distToSegment(x, z, 605, 2350, 650, 2385).dist;
      const chanW = Math.max(
        1.0 - M.smoothstep(22, 62, c1),
        1.0 - M.smoothstep(24, 66, c2),
        1.0 - M.smoothstep(24, 66, c3),
        1.0 - M.smoothstep(22, 60, c4)
      );
      swampH = M.lerp(swampH, 4.35 + shoalNoise * 0.4, chanW * 0.82);

      // Smoothly blend down from surrounding ~22..32m low-cloud plains / foothills into the wetland basin
      const coreBlend = M.smoothstep(0.05, 0.78, swampMask);
      h = M.lerp(h, swampH, coreBlend);
    }

    // 云雾山 (ONE Single Colossal Sky-Piercing 7-Tier Sacred Mountain soaring up to 760m!):
    // Steep chiseled rocky cliff risers alternating with 6 wide flat horizontal terraces + spacious 760m Grand Summit Plateau!
    if (cloudMtnMask > 0.001) {
      const cm = CLOUD_MOUNTAIN;
      const sx = (x - cm.cx) * cm.scaleX;
      const sz = (z - cm.cz) * cm.scaleZ;
      const rawR = Math.hypot(sx, sz);
      const ang = Math.atan2(sz, sx);

      // Organic craggy rock-buttress domain warp so tiered cliff faces read like monumental natural Xianxia strata!
      const cliffWarp = (N.fbm2D(x * 0.0020 + 3.1, z * 0.0020 - 1.9, 3) * 52.0
                      + Math.sin(ang * 5.0 + 0.7) * 22.0
                      + Math.cos(ang * 3.0 - 1.1) * 18.0) * M.smoothstep(155.0, 310.0, rawR);
      const effR = Math.max(0.0, rawR + cliffWarp);

      const rockDetail = N.ridged2D(x * 0.0036 + 2.1, z * 0.0036 - 3.4, 3);
      const gentleNoise = N.fbm2D(x * 0.0045 - 2.3, z * 0.0045 + 1.8, 2) * 2.8;

      // 7 Distinct Steep Rocky Cliff Risers alternating with Wide Flat Horizontal Terraces (22 -> 115 -> 215 -> 320 -> 430 -> 540 -> 650 -> 760m!)
      const t1 = 1.0 - M.smoothstep(1055.0, 1145.0, effR); // 22  -> 115m
      const t2 = 1.0 - M.smoothstep( 895.0,  965.0, effR); // 115 -> 215m
      const t3 = 1.0 - M.smoothstep( 740.0,  805.0, effR); // 215 -> 320m
      const t4 = 1.0 - M.smoothstep( 590.0,  650.0, effR); // 320 -> 430m
      const t5 = 1.0 - M.smoothstep( 445.0,  505.0, effR); // 430 -> 540m
      const t6 = 1.0 - M.smoothstep( 305.0,  365.0, effR); // 540 -> 650m
      const t7 = 1.0 - M.smoothstep( 165.0,  225.0, effR); // 650 -> 760m Grand Summit Plateau!

      let mtnH = 22.0 + t1 * 93.0 + t2 * 100.0 + t3 * 105.0 + t4 * 110.0 + t5 * 110.0 + t6 * 110.0 + t7 * 110.0;

      // Bold craggy rock-cliff relief ONLY on the steep vertical risers; flat terraces stay smooth & walkable!
      const onRiser = Math.min(1.0, (
        t1 * (1.0 - t1) + t2 * (1.0 - t2) + t3 * (1.0 - t3) +
        t4 * (1.0 - t4) + t5 * (1.0 - t5) + t6 * (1.0 - t6) + t7 * (1.0 - t7)
      ) * 4.0);
      mtnH += onRiser * (rockDetail - 0.35) * 32.0 + (1.0 - onRiser) * gentleNoise * 0.35;

      // Flatten the 6 dedicated wide mid-mountain patrol terraces cleanly!
      for (let i = 0; i < cm.terraces.length; i++) {
        const tc = cm.terraces[i];
        const wT = 1.0 - M.smoothstep(tc.r * 0.55, tc.r * 1.15, Math.hypot(x - tc.x, z - tc.z));
        if (wT > 0.001) {
          mtnH = M.lerp(mtnH, tc.y + fine * 0.14, wT * 0.94);
        }
      }

      // Carve the continuous wide walkable 2-turn spiral ramp smoothly through all 7 steep risers!
      const mp = getCloudMountainPathInfo(x, z);
      if (mp.pathMask > 0.005) {
        mtnH = M.lerp(mtnH, mp.targetY + fine * 0.10, mp.pathMask * 0.96);
      }

      // Lock the huge 760m Grand Summit Plateau flat & open (~560m x 270m spacious sky-piercing arena!)
      const summitFlatW = 1.0 - M.smoothstep(148.0, 174.0, rawR);
      if (summitFlatW > 0.001) {
        mtnH = M.lerp(mtnH, cm.summitY + fine * 0.14, summitFlatW * 0.98);
      }

      const blendMtn = M.smoothstep(0.02, 0.45, cloudMtnMask);
      h = M.lerp(h, mtnH, blendMtn);
    }

    // =====================================================
    // GRAND IMMORTAL METROPOLIS: 青石城 (0, 22, 0 — 260m × 240m)
    // Smoothly graded town plateau inside walls + gently undulating hills outside walls so towering 青石城墙 hugs terrain!
    // =====================================================
    const qc = QINGSHI_CITY;
    const dxCity = Math.max(0, Math.abs(x - qc.cx) - 118.0);
    const dzCity = Math.max(0, z < -104.0 ? (-104.0 - z) : (z > 114.0 ? (z - 114.0) : 0));
    const dInnerCity = Math.hypot(dxCity, dzCity);
    const cityCoreW = 1.0 - M.smoothstep(0.0, 34.0, dInnerCity);
    const cityApronW = 1.0 - M.smoothstep(14.0, 240.0, dInnerCity);

    const outerRoll = N.fbm2D(x * 0.0075 + 1.4, z * 0.0075 - 2.3, 2) * 4.2 + fine * 0.35;
    if (cityApronW > 0.001) {
      h = M.lerp(h, qc.baseY + outerRoll, cityApronW * 0.86);
    }
    if (cityCoreW > 0.001) {
      h = M.lerp(h, qc.baseY + fine * 0.04, cityCoreW * 0.98);
    }

    // =====================================================
    // BOSS REGION 1: 灵竹幽谷 (2660, 6020 — Deep Bamboo Valley naturally connected South/below 云雾山!)
    // Open gently rolling bamboo woodland (y ~ 19..28m, NO enclosing cliff wall) + flat 88m-dia Boss clearing at (2660, 6020)
    // =====================================================
    const bvMask = bambooValEarly;
    if (bvMask > 0.001) {
      const bv = BAMBOO_VALLEY;
      const dist = Math.hypot(x - bv.cx, z - bv.cz);
      const trailDist = distToSegment(x, z, 2660, 5260, bv.cx, bv.cz).dist;
      const onTrail = 1.0 - M.smoothstep(18.0, 58.0, trailDist);
      const inArena = 1.0 - M.smoothstep(46.0, 88.0, dist);
      const gentleHills = N.fbm2D(x * 0.0042 + 2.3, z * 0.0042 - 1.7, 3) * 6.8
                        + N.fbm2D(x * 0.011 - 1.4, z * 0.011 + 2.9, 2) * 1.8;
      const bvH = bv.baseY + gentleHills * (1.0 - Math.max(inArena * 0.96, onTrail * 0.65)) + fine * 0.14 * (1.0 - inArena);
      h = M.lerp(h, bvH, M.smoothstep(0.04, 0.56, bvMask));
    }

    // =====================================================
    // BOSS REGION 2: 蚀骨毒潭 (4960, 2160 — Deep Sinister Venom Mire naturally connected East/right of 沉烟迷泽!)
    // Open dark badlands & shallow toxic hollows sloping smoothly from 沉烟迷泽 (y ~ 7..13m, NO enclosing cliff wall)
    // + sunken glowing central venom pool (r < 76m, y = 5.4m) cradling the sculpted dry Boss stone island!
    // =====================================================
    const vmMask = venomMireEarly;
    if (vmMask > 0.001) {
      const vm = VENOM_MIRE;
      const dist = Math.hypot(x - vm.cx, z - vm.cz);
      const approachDist = distToSegment(x, z, 4050, 2200, vm.cx - 40, vm.cz).dist;
      const onApproach = 1.0 - M.smoothstep(22.0, 68.0, approachDist);
      const bankRise = M.smoothstep(68.0, 108.0, dist);
      const badlandRoll = N.fbm2D(x * 0.0045 - 1.4, z * 0.0045 + 2.6, 3) * 4.8
                        + (N.ridged2D(x * 0.0075 + 2.1, z * 0.0075 - 3.3, 2) - 0.35) * 4.2;
      const outerH = 10.2 + badlandRoll * (1.0 - onApproach * 0.72) + fine * 0.22;
      const vmH = M.lerp(5.4, outerH, bankRise);
      h = M.lerp(h, vmH, M.smoothstep(0.04, 0.56, vmMask));
    }

    // =====================================================
    // NEW EXPANDED REGION: 幽林秘岭 (1220, 6640 — Smooth Tall Secluded Forested Mountains & Central Abandoned Cave-Mansion!)
    // Rounded, natural rolling mountain swells & deep forested valleys (ZERO sharp jagged ridged spikes!)
    // =====================================================
    const hmMask = hiddenMtnEarly;
    if (hmMask > 0.001) {
      const hm = HIDDEN_MOUNTAINS;
      const wx = x + N.fbm2D(x * 0.00085 - 3.6, z * 0.00085 + 2.2, 2) * 160.0;
      const wz = z + N.fbm2D(x * 0.00085 + 2.9, z * 0.00085 - 4.1, 2) * 160.0;

      // Smooth C2 rounded mountain swells (NO ridged2D / NO Math.abs sharp cusps!)
      const swellA = 0.5 + 0.5 * N.fbm2D(wx * 0.00105 + 1.7, wz * 0.00105 - 3.3, 3);
      const swellB = 0.5 + 0.5 * N.fbm2D((wx * 0.78 - wz * 0.62) * 0.00165 - 2.4, (wx * 0.62 + wz * 0.78) * 0.00165 + 4.8, 3);
      const valleyFlow = 0.5 + 0.5 * N.fbm2D(wx * 0.00135 + 5.2, wz * 0.00135 - 1.9, 2);

      const broadPeak  = M.smoothstep(0.16, 0.88, swellA);
      const crossSwell = M.smoothstep(0.20, 0.86, swellB);
      const valleyMod  = 0.42 + 0.58 * M.smoothstep(0.18, 0.82, valleyFlow);

      const coreLift = M.smoothstep(0.06, 0.74, hmMask);
      let hmH = 34.0 + (broadPeak * 142.0 + crossSwell * 58.0) * valleyMod * (0.54 + 0.46 * coreLift) + fine * 0.25;

      // Sculpt a broad, smoothly rounded Central Sanctuary Massif cradling the Abandoned Cave-Mansion (废弃洞府)
      const dCentralMassif = Math.hypot((x - hm.caveX) / 340.0, (z - (hm.caveZ + 50.0)) / 360.0);
      const massifW = 1.0 - M.smoothstep(0.28, 1.18, dCentralMassif);
      if (massifW > 0.001) {
        const peakTarget = 182.0 + crossSwell * 16.0;
        hmH = M.lerp(hmH, Math.max(hmH, peakTarget), massifW * 0.86);
      }
      // Smoothly rounded mountain dome rising naturally behind the Cave-Mansion (+Z -> ~240m, no sharp spikes!)
      const dBackCliff = Math.hypot((x - hm.caveX) / 210.0, (z - (hm.caveZ + 148.0)) / 185.0);
      const backCliffW = 1.0 - M.smoothstep(0.14, 1.08, dBackCliff);
      if (backCliffW > 0.001) {
        hmH = M.lerp(hmH, 238.0 + broadPeak * 14.0, backCliffW * 0.90);
      }

      // Smoothly grade the winding hidden mountain switchback trails through the rounded ridges
      const hp = getHiddenMountainPathInfo(x, z);
      if (hp.pathMask > 0.005) {
        hmH = M.lerp(hmH, hp.targetY + fine * 0.08, hp.pathMask * 0.95);
      }

      // Lock the deeper Abandoned Cave-Mansion & Forecourt pad smoothly flat at caveY (178.0m) with a wide gentle shoulder!
      const dCavePad = Math.hypot((x - hm.caveX) / 48.0, (z - (hm.caveZ + 4.0)) / 54.0);
      const cavePadW = 1.0 - M.smoothstep(0.55, 1.38, dCavePad);
      if (cavePadW > 0.001) {
        hmH = M.lerp(hmH, hm.caveY, cavePadW * 0.995);
      }

      const blendHm = M.smoothstep(0.03, 0.56, hmMask);
      h = M.lerp(h, hmH, blendHm);
    }

    // Outer world-square border gradual sea-shelf stitch near ±9200m so far-edge biomes smoothly meet the endless Deep Sea
    const worldEdgeDist = Math.max(Math.abs(x), Math.abs(z));
    if (worldEdgeDist > 8680) {
      const edgeDrop = M.smootherstep(8680, 9180, worldEdgeDist);
      h = M.lerp(h, -42.0, edgeDrop);
    }

    return h;
  }

  function getTerrainNormal(x, z, out) {
    const eps = 3.2;
    const hL = getTerrainHeight(x - eps, z);
    const hR = getTerrainHeight(x + eps, z);
    const hD = getTerrainHeight(x, z - eps);
    const hU = getTerrainHeight(x, z + eps);
    const nx = hL - hR;
    const ny = 2.0 * eps;
    const nz = hD - hU;
    const len = Math.hypot(nx, ny, nz) || 1;
    out[0] = nx / len;
    out[1] = ny / len;
    out[2] = nz / len;
    return out;
  }

  function getIslandTopHeight(x, z, island) {
    const dx = (x - island.x) / island.rx;
    const dz = (z - island.z) / island.rz;
    const r = Math.hypot(dx, dz);
    if (r > 1.0) return null;
    const dome = (1 - M.smoothstep(0.55, 1.0, r)) * 2.6;
    const micro = N.fbm2D(x * 0.05, z * 0.05, 2) * 0.9 * (1 - r * 0.5);
    return island.y + dome + micro;
  }

  function getBridgeHeight(x, z) {
    return null;
  }

  // Cached exact terrain mesh height grid so grass, boulders, fallen logs, trees & player feet align 0.000m with rendered triangles!
  let _meshHeights = null;
  let _meshRes = 0;

  // Exact 2-triangle barycentric height matching buildTerrainMesh() (indices: a,c,b when fx+fz<=1; b,c,d when fx+fz>1)!
  function getMeshTerrainHeight(x, z) {
    if (!_meshHeights || _meshRes <= 0) return getTerrainHeight(x, z);
    const fxRaw = ((x + HALF_WORLD) / WORLD_SIZE) * _meshRes;
    const fzRaw = ((z + HALF_WORLD) / WORLD_SIZE) * _meshRes;
    const ix = Math.max(0, Math.min(_meshRes - 1, Math.floor(fxRaw)));
    const iz = Math.max(0, Math.min(_meshRes - 1, Math.floor(fzRaw)));
    const fx = Math.max(0, Math.min(1, fxRaw - ix));
    const fz = Math.max(0, Math.min(1, fzRaw - iz));
    const stride = _meshRes + 1;
    const idx = iz * stride + ix;
    const hA = _meshHeights[idx];
    const hB = _meshHeights[idx + 1];
    const hC = _meshHeights[idx + stride];
    const hD = _meshHeights[idx + stride + 1];
    if (fx + fz <= 1.0) {
      return hA + fx * (hB - hA) + fz * (hC - hA);
    }
    return hD + (1.0 - fx) * (hC - hD) + (1.0 - fz) * (hB - hD);
  }

  // Minimum terrain mesh height across a footprint radius so boulders, logs & trees NEVER float on slopes!
  function getMeshFootHeight(x, z, radius) {
    let h = getMeshTerrainHeight(x, z);
    if (radius > 0.15) {
      const h1 = getMeshTerrainHeight(x + radius, z);
      const h2 = getMeshTerrainHeight(x - radius, z);
      const h3 = getMeshTerrainHeight(x, z + radius);
      const h4 = getMeshTerrainHeight(x, z - radius);
      if (h1 < h) h = h1;
      if (h2 < h) h = h2;
      if (h3 < h) h = h3;
      if (h4 < h) h = h4;
    }
    return h;
  }

  function getWalkableHeight(x, z, currentFootY) {
    let ground = getMeshTerrainHeight(x, z);
    let minWaterFloor = getSwampMask(x, z) > 0.08 ? (SWAMP_WATER_Y - 0.55) : (RIVER_WATER_Y - 0.55);
    if (getVenomMireMask(x, z) > 0.12) {
      minWaterFloor = Math.max(minWaterFloor, VENOM_WATER_Y - 0.45);
    }
    ground = Math.max(ground, minWaterFloor);
    return ground;
  }

  function sampleAtmosphere(x, y, z, outAtmo) {
    let totalW = 0;
    let sunR = 0, sunG = 0, sunB = 0;
    let topR = 0, topG = 0, topB = 0;
    let horR = 0, horG = 0, horB = 0;
    let fogR = 0, fogG = 0, fogB = 0;
    let shdR = 0, shdG = 0, shdB = 0;
    let fogD = 0, hFogD = 0, hFogB = 0;

    let bestRegion = REGIONS[0];
    let bestScore = -1;

    for (let i = 0; i < REGIONS.length; i++) {
      const reg = REGIONS[i];
      const dx = x - reg.center[0];
      const dy = (y - reg.center[1]) * 1.4;
      const dz = z - reg.center[2];
      const norm = Math.hypot(dx, dy, dz) / reg.radius;
      let w = 1.0 / (1.0 + norm * norm * norm);

      if (reg.id === 'qingshi') {
        w += getQingshiCityMask(x, z) * 4.2;
      }
      if (reg.id === 'lowcloud') {
        w += getLowCloudPlainsMask(x, z) * 2.2;
      }
      if (reg.id === 'chenyan') {
        w += getSwampMask(x, z) * 3.4;
      }
      if (reg.id === 'canzhen') {
        w += getAncientRoadMask(x, z) * 3.8;
      }
      if (reg.id === 'spiritwood') {
        w += getSpiritForestMask(x, z) * 4.2;
      }
      if (reg.id === 'cloudmtn') {
        w += getCloudMountainMask(x, z) * 4.4;
      }
      if (reg.id === 'bamboovalley') {
        w += getBambooValleyMask(x, z) * 6.8;
      }
      if (reg.id === 'venommire') {
        w += getVenomMireMask(x, z) * 7.2;
      }
      if (reg.id === 'hiddenmtn') {
        w += getHiddenMountainsMask(x, z) * 6.4;
      }

      if (w > bestScore) {
        bestScore = w;
        bestRegion = reg;
      }

      totalW += w;
      sunR += reg.sunColor[0] * w; sunG += reg.sunColor[1] * w; sunB += reg.sunColor[2] * w;
      topR += reg.skyTop[0] * w;   topG += reg.skyTop[1] * w;   topB += reg.skyTop[2] * w;
      horR += reg.skyHorizon[0] * w; horG += reg.skyHorizon[1] * w; horB += reg.skyHorizon[2] * w;
      fogR += reg.fogColor[0] * w; fogG += reg.fogColor[1] * w; fogB += reg.fogColor[2] * w;
      shdR += reg.shadowTint[0] * w; shdG += reg.shadowTint[1] * w; shdB += reg.shadowTint[2] * w;
      fogD += reg.fogDensity * w;
      hFogD += reg.heightFogDensity * w;
      hFogB += reg.heightFogBase * w;
    }

    const inv = 1 / (totalW || 1);
    outAtmo.sunColor[0] = sunR * inv; outAtmo.sunColor[1] = sunG * inv; outAtmo.sunColor[2] = sunB * inv;
    outAtmo.skyTop[0] = topR * inv;   outAtmo.skyTop[1] = topG * inv;   outAtmo.skyTop[2] = topB * inv;
    outAtmo.skyHorizon[0] = horR * inv; outAtmo.skyHorizon[1] = horG * inv; outAtmo.skyHorizon[2] = horB * inv;
    outAtmo.fogColor[0] = fogR * inv; outAtmo.fogColor[1] = fogG * inv; outAtmo.fogColor[2] = fogB * inv;
    outAtmo.shadowTint[0] = shdR * inv; outAtmo.shadowTint[1] = shdG * inv; outAtmo.shadowTint[2] = shdB * inv;
    outAtmo.fogDensity = fogD * inv;
    outAtmo.heightFogDensity = hFogD * inv;
    outAtmo.heightFogBase = hFogB * inv;
    outAtmo.region = bestRegion;
    return outAtmo;
  }

  // Compute architectural foundation apron (青石仙城分层青石板/玉石大道与园林草坪) & building ground-contact AO
  function getBuildingFoundationInfo(x, z) {
    if (Math.abs(x) > 152 || z < -136 || z > 146) return { apron: 0.0, contactAO: 0.0 };

    const qc = QINGSHI_CITY;
    const dxW = Math.max(0, Math.abs(x) - (qc.halfW - 2.0));
    const dzW = Math.max(0, z < (qc.northZ + 2.0) ? ((qc.northZ + 2.0) - z) : (z > (qc.southZ - 2.0) ? (z - (qc.southZ - 2.0)) : 0));
    const cityInterior = 1.0 - M.smoothstep(0.0, 5.5, Math.hypot(dxW, dzW));

    const dArray   = Math.hypot(x, z);                           // 聚灵传送大阵台
    const dJubao   = Math.hypot(x / 16, (z + 82) / 13);          // 聚宝轩
    const dCang    = Math.hypot((x + 52) / 16, (z + 64) / 13);   // 藏经阁
    const dZhi     = Math.hypot((x - 52) / 18, (z + 64) / 13);   // 执事大殿
    const dHerb    = Math.hypot((x + 54) / 14, (z - 24) / 11);   // 百草阁
    const dForge   = Math.hypot((x - 54) / 14, (z - 24) / 11);   // 天工坊
    const dBeast   = Math.hypot((x + 54) / 14, (z - 68) / 11);   // 万兽斋
    const dTavern  = Math.hypot((x - 54) / 14, (z - 68) / 11);   // 醉仙楼
    const dSGate   = Math.hypot(x / 16, (z - 125) / 8);          // 南天正门

    const apron = Math.max(
      cityInterior * 0.90,
      1.0 - M.smoothstep(0.85, 1.40, dSGate)
    );

    const contactAO = Math.max(
      (1.0 - M.smoothstep(12.0, 19.5, dArray)) * 0.34,
      (1.0 - M.smoothstep(0.65, 1.12, dJubao)) * 0.44,
      (1.0 - M.smoothstep(0.65, 1.12, dCang)) * 0.44,
      (1.0 - M.smoothstep(0.65, 1.12, dZhi)) * 0.44,
      (1.0 - M.smoothstep(0.65, 1.12, dHerb)) * 0.38,
      (1.0 - M.smoothstep(0.65, 1.12, dForge)) * 0.40,
      (1.0 - M.smoothstep(0.65, 1.12, dBeast)) * 0.38,
      (1.0 - M.smoothstep(0.65, 1.12, dTavern)) * 0.38
    );

    return { apron, contactAO };
  }

  // Bake RGBA32F GPU Terrain Data Texture aligned 1:1 with the rendered terrain mesh vertices (ZERO floating grass!)
  // R = exact terrain mesh vertex height, G = grass eligibility [0..1], B = meadow warmth & herb cluster [-1..1], A = normal.y
  function buildTerrainDataTexture(size = 641) {
    const useSize = (_meshRes > 0) ? (_meshRes + 1) : size;
    const data = new Float32Array(useSize * useSize * 4);
    const nrm = new Float32Array(3);
    const step = WORLD_SIZE / (useSize - 1);
    let ptr = 0;

    for (let iz = 0; iz < useSize; iz++) {
      const z = -HALF_WORLD + iz * step;
      for (let ix = 0; ix < useSize; ix++) {
        const x = -HALF_WORLD + ix * step;
        const y = (_meshHeights && useSize === _meshRes + 1) ? _meshHeights[iz * useSize + ix] : getTerrainHeight(x, z);
        getTerrainNormal(x, z, nrm);

        const pathM = getPathMask(x, z);
        const bldg = getBuildingFoundationInfo(x, z);
        const rInfo = getRiverInfo(x, z);
        const swampM = getSwampMask(x, z);
        const ancientM = getAncientRoadMask(x, z);
        const spiritWoodM = getSpiritForestMask(x, z);
        const cloudMtnM = getCloudMountainMask(x, z);
        const desertM = getDesertMask(x, z);
        const snowM = getSnowfieldMask(x, z);
        const frostMtnM = getFrostMountainMask(x, z);
        const bambooValM = getBambooValleyMask(x, z);
        const venomMireM = getVenomMireMask(x, z);
        const hiddenMtnM = getHiddenMountainsMask(x, z);
        const ancientPath = ancientM > 0.02 ? getAncientRoadPathInfo(x, z) : { roadMask: 0, altarMask: 0 };
        const spiritTrail = spiritWoodM > 0.02 ? getSpiritForestTrailInfo(x, z) : { trailMask: 0 };
        const cloudPath = cloudMtnM > 0.02 ? getCloudMountainPathInfo(x, z) : { pathMask: 0 };
        const frostPath = frostMtnM > 0.02 ? getFrostMountainPathInfo(x, z) : { pathMask: 0 };
        const hiddenPath = hiddenMtnM > 0.02 ? getHiddenMountainPathInfo(x, z) : { pathMask: 0 };
        const fsPondD = snowM > 0.05 ? Math.hypot((x - FROST_SNOWFIELD.pondX) * 0.94, (z - FROST_SNOWFIELD.pondZ) * 1.08) : 9999;
        const inQingshi = Math.abs(x) < (QINGSHI_CITY.halfW + 3.0) && z > (QINGSHI_CITY.northZ - 3.0) && z < (QINGSHI_CITY.southZ + 3.0);
        const inBambooArena = bambooValM > 0.15 && Math.hypot(x - BAMBOO_VALLEY.cx, z - BAMBOO_VALLEY.cz) < (BAMBOO_VALLEY.arenaR + 1.5);
        const inVenomBasin = venomMireM > 0.15 && Math.hypot(x - VENOM_MIRE.cx, z - VENOM_MIRE.cz) < (VENOM_MIRE.poolOuterR + 8.0);
        const inCavePad = hiddenMtnM > 0.12 && Math.hypot(x - HIDDEN_MOUNTAINS.caveX, z - (HIDDEN_MOUNTAINS.caveZ - 4.0)) < 28.0;

        let elig = 1.0;
        const maxGrassY = (cloudMtnM > 0.12 || frostMtnM > 0.12) ? 780 : (hiddenMtnM > 0.08 ? 310 : 112);
        if (desertM > 0.34) elig = 0.0;
        else if (inQingshi || inBambooArena || inVenomBasin || inCavePad) elig = 0.0;
        else if (fsPondD < FROST_SNOWFIELD.pondR * 1.04) elig = 0.0;
        else if (frostMtnM > 0.15 && Math.hypot(x - FROST_MOUNTAIN.cx, z - FROST_MOUNTAIN.cz) < 26.0) elig = 0.0;
        else if (swampM > 0.12 && cloudMtnM < 0.25 && y < SWAMP_WATER_Y + 2.2) elig = 0.0;
        else if (swampM <= 0.12 && (y < RIVER_WATER_Y + 0.65 || y > maxGrassY)) elig = 0.0;
        else if (cloudMtnM > 0.15 && Math.hypot(x - CLOUD_MOUNTAIN.cx, z - CLOUD_MOUNTAIN.cz) < 28.0) elig = 0.0;
        else if (pathM > 0.22 || bldg.apron > 0.28) elig = 0.0;
        else if (ancientPath.altarMask > 0.35) elig = 0.0;
        else {
          // 云雾山草木加厚：放宽坡度阈值并取消高海拔稀疏衰减，让各级台地与缓坡绿草丰茂（仅保留盘山路清爽）
          const slopeMin = cloudMtnM > 0.05 ? 0.56 : 0.75;
          const slopeMax = cloudMtnM > 0.05 ? 0.78 : 0.88;
          elig *= M.smoothstep(slopeMin, slopeMax, nrm[1]) * (1.0 - Math.max(pathM, bldg.apron));
          // Natural ecological clumping (自然聚落式草丛分布): lush dense meadow colonies interspersed with natural soil/clover clearings!
          const ecoCluster = N.fbm2D(x * 0.014 + 3.7, z * 0.014 - 2.1, 3) * 0.62
                           + N.fbm2D(x * 0.045 - 1.9, z * 0.045 + 4.3, 2) * 0.38;
          const patchWeight = M.smoothstep(-0.34, 0.24, ecoCluster);
          elig *= (0.18 + 0.82 * patchWeight);
          // Thin out bright green meadow grass smoothly as we descend into the wet mudflats of 沉烟迷泽
          elig *= (1.0 - swampM * 0.78);
          // Thin out bright plain grass inside 通天灵木林 so thick humus, moss, leaf litter & ferns shine!
          if (spiritWoodM > 0.02) {
            elig *= (1.0 - spiritWoodM * 0.72);
            if (spiritTrail.trailMask > 0.15) {
              elig *= (1.0 - spiritTrail.trailMask * 0.75);
            }
          }
          // Lush alpine meadow grass blanketing 云雾山 flat terraces, slopes & summit rim (clearing only the spiral ramp!)
          if (cloudMtnM > 0.05) {
            const cmBoost = M.smoothstep(0.05, 0.28, cloudMtnM);
            const cmSlopeOk = M.smoothstep(0.54, 0.76, nrm[1]);
            elig = Math.min(1.0, Math.max(elig, cmBoost * cmSlopeOk * (0.72 + 0.28 * patchWeight)));
            if (cloudPath.pathMask > 0.12) {
              elig *= (1.0 - cloudPath.pathMask * 0.90);
            }
          }
          // Sparse weathered dry grass across 残阵古道, letting occasional weed patches poke through broken flagstones!
          if (ancientM > 0.02 && spiritWoodM < 0.35) {
            elig *= (1.0 - ancientM * 0.42);
            if (ancientPath.roadMask > 0.15) {
              const crackWeed = M.smoothstep(0.18, 0.56, N.fbm2D(x * 0.12 + 4.1, z * 0.12 - 2.7, 2));
              elig *= M.lerp(1.0, crackWeed * 0.48, ancientPath.roadMask);
            }
          }
          // Fade meadow grass out smoothly at the sandy fringe of 流沙荒漠
          if (desertM > 0.02) {
            elig *= (1.0 - M.smoothstep(0.02, 0.34, desertM));
          }
          // Deep shaded mountain-forest undergrowth in 幽林秘岭 (clearing the narrow switchback trail)
          if (hiddenMtnM > 0.05) {
            elig *= (1.0 - hiddenMtnM * 0.42);
            if (hiddenPath.pathMask > 0.14) {
              elig *= (1.0 - hiddenPath.pathMask * 0.84);
            }
          }
          // Patchy snow-covered winter grass colonies across 霜雪原 & 霜雪山 lower terraces (clearing spiral snow path!)
          if (snowM > 0.02 || frostMtnM > 0.02) {
            const snowCov = Math.max(snowM, frostMtnM);
            const snowGrassPatch = M.smoothstep(-0.18, 0.42, N.fbm2D(x * 0.0085 - 2.3, z * 0.0085 + 4.1, 2));
            elig *= M.lerp(1.0, 0.22 + 0.56 * snowGrassPatch, snowCov);
            if (frostMtnM > 0.05) {
              elig *= (1.0 - M.smoothstep(340.0, 660.0, y) * 0.65);
              if (frostPath.pathMask > 0.12) {
                elig *= (1.0 - frostPath.pathMask * 0.90);
              }
            }
          }
        }

        // Warmth channel B: [-1..1] green meadow; [-2.6..-1.4] arid dry grass; < -3.1 = snow-covered frost grass in 霜雪原/霜雪山!
        let warmth = N.fbm2D(x * 0.0042 - 3.1, z * 0.0042 + 2.7, 2);
        if (venomMireM > 0.04) {
          elig *= (1.0 - venomMireM * 0.72);
        }
        const dryZoneW = Math.max(ancientM * (1.0 - spiritWoodM), desertM, venomMireM);
        if (dryZoneW > 0.02) {
          warmth = M.lerp(warmth, -2.35 + N.fbm2D(x * 0.03, z * 0.03, 2) * 0.25, M.smoothstep(0.06, 0.48, dryZoneW));
        }
        const frostGrassW = Math.max(snowM, frostMtnM);
        if (frostGrassW > 0.08) {
          warmth = M.lerp(warmth, -3.75 + N.fbm2D(x * 0.04, z * 0.04, 2) * 0.25, M.smoothstep(0.10, 0.52, frostGrassW));
        }

        data[ptr++] = y;
        data[ptr++] = elig;
        data[ptr++] = warmth;
        data[ptr++] = nrm[1];
      }
    }
    return { size: useSize, data };
  }

  // Build vast 14800m x 14800m Terrain Mesh (640 x 640 grid!) with cached height grid for 0-float prop placement!
  function buildTerrainMesh(resolution = 640) {
    const vertCount = (resolution + 1) * (resolution + 1);
    const data = new Float32Array(vertCount * 12);
    const indices = new Uint32Array(resolution * resolution * 6);
    const nrm = new Float32Array(3);
    _meshRes = resolution;
    _meshHeights = new Float32Array(vertCount);
    let hPtr = 0;

    const step = WORLD_SIZE / resolution;
    let ptr = 0;

    for (let iz = 0; iz <= resolution; iz++) {
      const z = -HALF_WORLD + iz * step;
      for (let ix = 0; ix <= resolution; ix++) {
        const x = -HALF_WORLD + ix * step;
        const y = getTerrainHeight(x, z);
        _meshHeights[hPtr++] = y;
        getTerrainNormal(x, z, nrm);

        const slope = 1.0 - nrm[1];
        const pathM = getPathMask(x, z);
        const bldg = getBuildingFoundationInfo(x, z);
        const rInfo = getRiverInfo(x, z);
        const lowCloudW = getLowCloudPlainsMask(x, z);
        const swampW = getSwampMask(x, z);
        const ancientW = getAncientRoadMask(x, z);
        const spiritWoodW = getSpiritForestMask(x, z);
        const cloudMtnW = getCloudMountainMask(x, z);
        const desertW = getDesertMask(x, z);
        const snowW = getSnowfieldMask(x, z);
        const frostMtnW = getFrostMountainMask(x, z);
        const bambooValW = getBambooValleyMask(x, z);
        const venomMireW = getVenomMireMask(x, z);
        const hiddenMtnW = getHiddenMountainsMask(x, z);
        const ancientPath = ancientW > 0.01 ? getAncientRoadPathInfo(x, z) : { roadMask: 0, altarMask: 0 };
        const spiritTrail = spiritWoodW > 0.01 ? getSpiritForestTrailInfo(x, z) : { trailMask: 0 };
        const cloudPath = cloudMtnW > 0.01 ? getCloudMountainPathInfo(x, z) : { pathMask: 0 };
        const frostPath = frostMtnW > 0.01 ? getFrostMountainPathInfo(x, z) : { pathMask: 0 };
        const hiddenPath = hiddenMtnW > 0.01 ? getHiddenMountainPathInfo(x, z) : { pathMask: 0 };
        const macroVar = N.fbm2D(x * 0.006 + 4.2, z * 0.006 - 2.9, 3);
        const detailVar = N.fbm2D(x * 0.036, z * 0.036, 2);

        // 1. Flatland Meadow & Natural Clover/Soil Patch Variation (平地草甸)
        let grassR = 0.24 + macroVar * 0.09 + detailVar * 0.035;
        let grassG = 0.50 + macroVar * 0.11 + detailVar * 0.045;
        let grassB = 0.20 + macroVar * 0.04;

        const meadowWarm = M.smoothstep(0.08, 0.52, N.fbm2D(x * 0.0032 - 5.1, z * 0.0032 + 3.2, 2));
        grassR = M.lerp(grassR, 0.39, meadowWarm * (0.45 + lowCloudW * 0.22));
        grassG = M.lerp(grassG, 0.56, meadowWarm * (0.36 + lowCloudW * 0.16));

        // 2. Slope Scree & Mossy Talus Transition Zone (坡地碎石苔藓)
        const screeMask = M.smoothstep(0.05, 0.14, slope) * (1.0 - M.smoothstep(0.18, 0.32, slope));
        const mossTone = M.smoothstep(-0.2, 0.35, detailVar);
        const screeR = M.lerp(0.38, 0.22, mossTone);
        const screeG = M.lerp(0.36, 0.42, mossTone);
        const screeB = M.lerp(0.28, 0.22, mossTone);
        grassR = M.lerp(grassR, screeR, screeMask * 0.65);
        grassG = M.lerp(grassG, screeG, screeMask * 0.65);
        grassB = M.lerp(grassB, screeB, screeMask * 0.65);

        // 3. Stratified Mountain Cliff Rock (山体岩石肌理)
        const strata = 0.5 + 0.5 * Math.sin(y * 0.46 + macroVar * 4.5);
        let rockR = M.lerp(0.28, 0.46, strata) + detailVar * 0.045;
        let rockG = M.lerp(0.34, 0.48, strata) + detailVar * 0.045;
        let rockB = M.lerp(0.38, 0.50, strata) + detailVar * 0.035;

        const highAlt = M.smoothstep(98, 175, y);
        const rockNoise = detailVar * 0.08 + macroVar * 0.05;
        const rockBlend = M.smoothstep(0.13, 0.26, slope + highAlt * 0.14 + rockNoise - pathM * 0.08);
        let r = M.lerp(grassR, rockR, rockBlend);
        let g = M.lerp(grassG, rockG, rockBlend);
        let b = M.lerp(grassB, rockB, rockBlend);

        // 4. Crisp High-Altitude Snow Peaks & Ridges (雪峰山脊分明; suppressed on 云雾山 & 幽林秘岭 so emerald-slate mountains stay lush!)
        if (y > 108.0 && cloudMtnW < 0.20 && hiddenMtnW < 0.20) {
          const snowAlt = M.smoothstep(115.0, 162.0, y + macroVar * 14.0 + detailVar * 6.0);
          const ridgeKeep = M.smoothstep(0.26, 0.64, nrm[1]); // Snow accumulates on ridges & upper slopes; sheer vertical cliffs expose dark rock!
          const snowW = snowAlt * ridgeKeep * (1.0 - cloudMtnW * 5.0) * (1.0 - hiddenMtnW * 5.0);
          r = M.lerp(r, 0.90, snowW);
          g = M.lerp(g, 0.94, snowW);
          b = M.lerp(b, 0.98, snowW);
        }

        // 4B. World-Boundary Coastal Beach & Deep Ocean Seabed Coloring (海岸浅滩 -> 深海海床)
        if (y < OCEAN_WATER_Y + 6.0 && swampW < 0.25 && venomMireW < 0.25) {
          const shoreBand = 1.0 - M.smoothstep(OCEAN_WATER_Y + 0.4, OCEAN_WATER_Y + 5.8, y);
          const subDepth = M.smoothstep(OCEAN_WATER_Y + 0.2, OCEAN_WATER_Y - 14.0, y);
          const wetSandR = 0.50 + detailVar * 0.04;
          const wetSandG = 0.46 + detailVar * 0.04;
          const wetSandB = 0.36 + detailVar * 0.03;
          const bedR = M.lerp(wetSandR, 0.04, subDepth);
          const bedG = M.lerp(wetSandG, 0.10, subDepth);
          const bedB = M.lerp(wetSandB, 0.16, subDepth);
          r = M.lerp(r, bedR, shoreBand);
          g = M.lerp(g, bedG, shoreBand);
          b = M.lerp(b, bedB, shoreBand);
        }

        // 5. Variegated City Paving: Pale Jade Central Plaza, Warm Sandstone Market Streets, Cool Bluestone Residential Quarters
        let matEncoding = 0.0; // [0.0..0.44] within matType < 0.5
        let rough = 0.76;
        const totalPath = Math.max(pathM, bldg.apron);
        if (totalPath > 0.02) {
          const pWeight = totalPath * (1 - M.smoothstep(0.34, 0.54, slope));
          const isCityStone = (Math.abs(x) < 138 && z > -122 && z < 134) ? 1.0 : 0.0;
          const flagstoneW = Math.min(1.0, Math.max(bldg.apron, pathM * isCityStone));
          const tileJitter = 0.93 + 0.09 * detailVar;
          // Distinct material zoning inside 青石城: pale jade plaza -> warm limestone avenues -> cool slate side blocks!
          const plazaZone = 1.0 - M.smoothstep(24.0, 44.0, Math.hypot(x, z));
          const mainAveZone = Math.max(
            1.0 - M.smoothstep(7.5, 13.5, Math.abs(x)),
            1.0 - M.smoothstep(7.0, 12.5, Math.abs(z))
          ) * isCityStone;
          let stR = 0.48, stG = 0.52, stB = 0.55; // Cool bluestone slate quarters
          stR = M.lerp(stR, 0.68, mainAveZone * 0.58); // Warm sandstone-inlaid main avenues
          stG = M.lerp(stG, 0.65, mainAveZone * 0.58);
          stB = M.lerp(stB, 0.57, mainAveZone * 0.58);
          stR = M.lerp(stR, 0.76, plazaZone * 0.72); // Luminous white-jade central plaza!
          stG = M.lerp(stG, 0.79, plazaZone * 0.72);
          stB = M.lerp(stB, 0.78, plazaZone * 0.72);

          const pathR = M.lerp(0.56, stR, flagstoneW) * tileJitter;
          const pathG = M.lerp(0.47, stG, flagstoneW) * tileJitter;
          const pathB = M.lerp(0.34, stB, flagstoneW) * tileJitter;
          r = M.lerp(r, pathR, pWeight);
          g = M.lerp(g, pathG, pWeight);
          b = M.lerp(b, pathB, pWeight);
          rough = M.lerp(rough, M.lerp(0.68, 0.44, flagstoneW), pWeight);
          matEncoding = M.lerp(0.16, 0.36, flagstoneW) * pWeight;
        }

        // 6B. 沉烟迷泽 Misty Wetland Ground Transition: Meadow Grass -> Dark Wet Peat Mud, Mossy Gravel & Silty Shoals!
        if (swampW > 0.01) {
          const dampElev = 1.0 - M.smoothstep(SWAMP_WATER_Y + 0.6, SWAMP_WATER_Y + 12.0, y);
          const mudZone = swampW * dampElev;
          const wetEdge = 1.0 - M.smoothstep(SWAMP_WATER_Y - 0.5, SWAMP_WATER_Y + 1.5, y);
          const mossPatch = M.smoothstep(-0.15, 0.42, detailVar + macroVar * 0.45);
          // Rich dark-brown wet peat mud (湿润深褐泥地) blended with damp moss-olive & silty sand shoals (浅滩泥沙)
          let mudR = M.lerp(0.24, 0.19, mossPatch);
          let mudG = M.lerp(0.21, 0.29, mossPatch);
          let mudB = M.lerp(0.15, 0.17, mossPatch);
          // Silty mudflat shore right along shallow water edge
          mudR = M.lerp(mudR, 0.20, wetEdge * 0.55);
          mudG = M.lerp(mudG, 0.22, wetEdge * 0.45);
          mudB = M.lerp(mudB, 0.16, wetEdge * 0.45);
          // Transition upland marsh edge gently from muted olive-moss to wet dark mud
          const uplandTint = swampW * (1.0 - dampElev);
          r = M.lerp(r, r * 0.78, uplandTint * 0.55);
          g = M.lerp(g, g * 0.84, uplandTint * 0.45);
          b = M.lerp(b, b * 0.88, uplandTint * 0.35);

          r = M.lerp(r, mudR, mudZone * 0.90);
          g = M.lerp(g, mudG, mudZone * 0.90);
          b = M.lerp(b, mudB, mudZone * 0.90);
          rough = M.lerp(rough, M.lerp(0.46, 0.20, wetEdge), mudZone);
        }

        // 6C. 残阵古道 Arid Barren Slope Transition: Weathered Yellow-Brown Soil, Scree Gravel & Withered Grass!
        if (ancientW > 0.01) {
          const dryBlend = M.smoothstep(0.06, 0.68, ancientW) * (1.0 - rockBlend * 0.55);
          const dryPatch = M.smoothstep(-0.22, 0.42, macroVar * 0.6 + detailVar * 0.4);
          // Weathered ochre-brown earth (风化黄褐土) blended with dry khaki-yellow drought grass (枯黄耐旱草甸) & pale gravel scree
          let dryR = M.lerp(0.50, 0.46, dryPatch) + detailVar * 0.04;
          let dryG = M.lerp(0.41, 0.44, dryPatch) + detailVar * 0.035;
          let dryB = M.lerp(0.26, 0.23, dryPatch) + detailVar * 0.02;
          const screeAmt = M.smoothstep(0.05, 0.19, slope + detailVar * 0.05);
          dryR = M.lerp(dryR, 0.46, screeAmt * 0.55);
          dryG = M.lerp(dryG, 0.43, screeAmt * 0.55);
          dryB = M.lerp(dryB, 0.36, screeAmt * 0.55);
          r = M.lerp(r, dryR, dryBlend * 0.92);
          g = M.lerp(g, dryG, dryBlend * 0.92);
          b = M.lerp(b, dryB, dryBlend * 0.92);
          rough = M.lerp(rough, 0.86, dryBlend);

          // Weathered ancient stone-dust & cracked slate roadbed along the ruined path & altar terraces
          if (ancientPath.roadMask > 0.02) {
            const rw = ancientPath.roadMask * (1.0 - M.smoothstep(0.30, 0.50, slope));
            const dustTone = 0.92 + detailVar * 0.12;
            const rdR = M.lerp(0.49, 0.46, ancientPath.altarMask) * dustTone;
            const rdG = M.lerp(0.44, 0.47, ancientPath.altarMask) * dustTone;
            const rdB = M.lerp(0.35, 0.43, ancientPath.altarMask) * dustTone;
            r = M.lerp(r, rdR, rw * 0.78);
            g = M.lerp(g, rdG, rw * 0.78);
            b = M.lerp(b, rdB, rw * 0.78);
            rough = M.lerp(rough, 0.78, rw);
          }
        }

        // 6D. 通天灵木林 Primeval Spirit Forest Floor: Rich Dark Humus, Velvet Forest Moss, Fallen Leaf Litter & Faint Trail!
        if (spiritWoodW > 0.01) {
          const fw = M.smoothstep(0.05, 0.68, spiritWoodW) * (1.0 - rockBlend * 0.60);
          const mossPat = M.smoothstep(-0.18, 0.38, detailVar * 0.6 + macroVar * 0.4);
          const leafPat = M.smoothstep(0.10, 0.56, N.fbm2D(x * 0.024 + 5.2, z * 0.024 - 1.9, 2));
          // Dark rich humus (厚重腐殖土) blended with deep forest moss (青苔) and warm fallen leaf carpet (落叶层)
          let fhR = M.lerp(0.20, 0.14, mossPat);
          let fhG = M.lerp(0.16, 0.30, mossPat);
          let fhB = M.lerp(0.11, 0.15, mossPat);
          fhR = M.lerp(fhR, 0.34, leafPat * 0.44);
          fhG = M.lerp(fhG, 0.24, leafPat * 0.44);
          fhB = M.lerp(fhB, 0.13, leafPat * 0.44);
          // Faint winding forest footpath (若隐若现的林间小径)
          if (spiritTrail.trailMask > 0.05) {
            const tw = spiritTrail.trailMask * 0.62;
            fhR = M.lerp(fhR, 0.32, tw);
            fhG = M.lerp(fhG, 0.27, tw);
            fhB = M.lerp(fhB, 0.19, tw);
          }
          r = M.lerp(r, fhR, fw * 0.92);
          g = M.lerp(g, fhG, fw * 0.92);
          b = M.lerp(b, fhB, fw * 0.92);
          rough = M.lerp(rough, 0.84, fw);
        }

        // 6E. 云雾山 ONE Colossal 7-Tier Sacred Mountain: Natural Alpine Terraces, Steep Stratified Slate Cliffs & Spiraling Mountain Path!
        if (cloudMtnW > 0.01) {
          const mw = M.smoothstep(0.05, 0.52, cloudMtnW);
          const altT = M.smoothstep(100.0, 740.0, y);
          // Flat horizontal terraces: lush cool alpine celadon-jade turf -> crisp frost-kissed highland moss/slate near 760m!
          let cmR = M.lerp(0.22, 0.30, altT) + detailVar * 0.028;
          let cmG = M.lerp(0.45, 0.44, altT) + detailVar * 0.028;
          let cmB = M.lerp(0.26, 0.40, altT) + detailVar * 0.024;
          const cliffRock = M.smoothstep(0.11, 0.24, slope + detailVar * 0.05);
          cmR = M.lerp(cmR, 0.30 + detailVar * 0.05, cliffRock * 0.94);
          cmG = M.lerp(cmG, 0.37 + detailVar * 0.05, cliffRock * 0.94);
          cmB = M.lerp(cmB, 0.44 + detailVar * 0.04, cliffRock * 0.94);
          // Subtle natural cyan-crystal aura tint on bare rock immediately around the giant glowing Spirit Stone at (2660, 4120)
          const crystalGround = 1.0 - M.smoothstep(16.0, 46.0, Math.hypot(x - CLOUD_MOUNTAIN.cx, z - CLOUD_MOUNTAIN.cz));
          if (crystalGround > 0.01 && y > 740.0) {
            cmR = M.lerp(cmR, 0.28, crystalGround * 0.55);
            cmG = M.lerp(cmG, 0.58, crystalGround * 0.55);
            cmB = M.lerp(cmB, 0.64, crystalGround * 0.55);
          }
          // Broad compacted gravelly-slate spiral mountain road
          if (cloudPath.pathMask > 0.04) {
            const pw = cloudPath.pathMask * 0.80;
            cmR = M.lerp(cmR, 0.48, pw);
            cmG = M.lerp(cmG, 0.48, pw);
            cmB = M.lerp(cmB, 0.44, pw);
          }
          r = M.lerp(r, cmR, mw * 0.94);
          g = M.lerp(g, cmG, mw * 0.94);
          b = M.lerp(b, cmB, mw * 0.94);
          rough = M.lerp(rough, M.lerp(0.76, 0.56, cliffRock), mw);
        }

        // 6F. 流沙荒漠 (Shifting Sands Desert): Golden-Ochre Rippled Sand Dunes & Wind-Eroded Sandstone!
        if (desertW > 0.01) {
          const dw = M.smoothstep(0.04, 0.58, desertW);
          const duneCrest = M.smoothstep(-0.7, 0.85, getDesertDuneWave(x, z));
          // Sunlit warm golden sand on dune crests -> deeper ochre-amber sand in sheltered troughs
          let sdR = M.lerp(0.58, 0.78, duneCrest) + detailVar * 0.03;
          let sdG = M.lerp(0.42, 0.61, duneCrest) + detailVar * 0.025;
          let sdB = M.lerp(0.24, 0.36, duneCrest) + detailVar * 0.018;
          // Wind-eroded reddish-ochre sandstone exposure on steeper pockets & rock edges
          const sandstone = M.smoothstep(0.14, 0.28, slope + detailVar * 0.05);
          sdR = M.lerp(sdR, 0.50, sandstone * 0.72);
          sdG = M.lerp(sdG, 0.34, sandstone * 0.72);
          sdB = M.lerp(sdB, 0.21, sandstone * 0.72);
          r = M.lerp(r, sdR, dw * 0.96);
          g = M.lerp(g, sdG, dw * 0.96);
          b = M.lerp(b, sdB, dw * 0.96);
          rough = M.lerp(rough, M.lerp(0.78, 0.86, sandstone), dw);
        }

        // 6G. 霜雪原 (Frost Snowfield): Silver-White Snowdrifts, Frosted Tundra Meadow, Cold Slate Rock & Frozen Frost Tarn Ice!
        if (snowW > 0.01) {
          const sw = M.smoothstep(0.04, 0.56, snowW);
          const driftT = M.smoothstep(-0.65, 0.80, getSnowDriftWave(x, z));
          const tundraPatch = (1.0 - M.smoothstep(0.18, 0.62, snowW)) * M.smoothstep(-0.15, 0.45, macroVar * 0.6 + detailVar * 0.4);
          // Crisp silver-white snow on sunlit ridges -> cool ice-blue shaded snow hollows
          let snR = M.lerp(0.76, 0.94, driftT) + detailVar * 0.02;
          let snG = M.lerp(0.84, 0.97, driftT) + detailVar * 0.02;
          let snB = M.lerp(0.92, 1.00, driftT) + detailVar * 0.015;
          // Frosted alpine tundra meadow at the southern transition fringe from 通天灵木林
          snR = M.lerp(snR, 0.36, tundraPatch * 0.68);
          snG = M.lerp(snG, 0.50, tundraPatch * 0.68);
          snB = M.lerp(snB, 0.48, tundraPatch * 0.68);
          // Frost-etched dark cold slate on steeper rock rims
          const frostRock = M.smoothstep(0.16, 0.29, slope + detailVar * 0.05);
          snR = M.lerp(snR, 0.28, frostRock * 0.85);
          snG = M.lerp(snG, 0.36, frostRock * 0.85);
          snB = M.lerp(snB, 0.46, frostRock * 0.85);
          // Frozen Frost Tarn Ice (寒潭冰面) at (-3460, -5940)
          const fs = FROST_SNOWFIELD;
          const dPond = Math.hypot((x - fs.pondX) * 0.94, (z - fs.pondZ) * 1.08);
          const iceMask = (1.0 - M.smoothstep(fs.pondR * 0.84, fs.pondR * 1.02, dPond)) * (y < fs.iceY + 1.2 ? 1.0 : 0.0);
          if (iceMask > 0.01) {
            snR = M.lerp(snR, 0.44, iceMask * 0.88);
            snG = M.lerp(snG, 0.78, iceMask * 0.88);
            snB = M.lerp(snB, 0.92, iceMask * 0.88);
          }
          r = M.lerp(r, snR, sw * 0.96);
          g = M.lerp(g, snG, sw * 0.96);
          b = M.lerp(b, snB, sw * 0.96);
          rough = M.lerp(rough, M.lerp(M.lerp(0.56, 0.68, frostRock), 0.10, iceMask), sw);
        }

        // 6H. 霜雪山 (ONE Compact 6-Tier Sky-Piercing Snow Mountain): Crisp Silver-White Snow Terraces, Dark Glacial Cliff Risers & Packed-Snow Spiral Road!
        if (frostMtnW > 0.01) {
          const fw = M.smoothstep(0.04, 0.52, frostMtnW);
          const altT = M.smoothstep(100.0, 670.0, y);
          // Flat horizontal terraces: pure silver-white snow with faint pale icy-blue highlights at high altitude
          let fmR = M.lerp(0.86, 0.94, altT) + detailVar * 0.018;
          let fmG = M.lerp(0.91, 0.97, altT) + detailVar * 0.018;
          let fmB = M.lerp(0.96, 1.00, altT) + detailVar * 0.015;
          // Steep vertical risers expose bold dark frost-slate cliffs!
          const cliffRock = M.smoothstep(0.11, 0.24, slope + detailVar * 0.05);
          fmR = M.lerp(fmR, 0.20 + detailVar * 0.04, cliffRock * 0.94);
          fmG = M.lerp(fmG, 0.28 + detailVar * 0.04, cliffRock * 0.94);
          fmB = M.lerp(fmB, 0.38 + detailVar * 0.04, cliffRock * 0.94);
          // Walkable packed-snow & frost-gravel spiral ascending mountain road
          if (frostPath.pathMask > 0.04) {
            const pw = frostPath.pathMask * 0.72;
            fmR = M.lerp(fmR, 0.72, pw);
            fmG = M.lerp(fmG, 0.78, pw);
            fmB = M.lerp(fmB, 0.86, pw);
          }
          r = M.lerp(r, fmR, fw * 0.96);
          g = M.lerp(g, fmG, fw * 0.96);
          b = M.lerp(b, fmB, fw * 0.96);
          rough = M.lerp(rough, M.lerp(0.52, 0.62, cliffRock), fw);
        }

        // 6I. 灵竹幽谷 (Secluded Spirit Bamboo Valley): compacted pale-earth Boss arena + deep mossy bamboo-leaf loam!
        if (bambooValW > 0.01) {
          const bw = M.smoothstep(0.04, 0.52, bambooValW);
          const dArena = Math.hypot(x - BAMBOO_VALLEY.cx, z - BAMBOO_VALLEY.cz);
          const inClearing = 1.0 - M.smoothstep(34.0, 48.0, dArena);
          const leafLitter = M.smoothstep(-0.18, 0.36, detailVar + macroVar * 0.35);
          // Outer bamboo grove floor: deep jade moss & fallen bamboo leaf litter
          let bvR = M.lerp(0.20, 0.34, leafLitter) + detailVar * 0.025;
          let bvG = M.lerp(0.42, 0.48, leafLitter) + detailVar * 0.03;
          let bvB = M.lerp(0.20, 0.23, leafLitter);
          // Central Boss clearing: clean compacted weathered stone-earth
          bvR = M.lerp(bvR, 0.46 + detailVar * 0.04, inClearing * 0.82);
          bvG = M.lerp(bvG, 0.48 + detailVar * 0.04, inClearing * 0.82);
          bvB = M.lerp(bvB, 0.37 + detailVar * 0.03, inClearing * 0.82);
          r = M.lerp(r, bvR, bw * 0.94);
          g = M.lerp(g, bvG, bw * 0.94);
          b = M.lerp(b, bvB, bw * 0.94);
          rough = M.lerp(rough, 0.78, bw);
        }

        // 6J. 蚀骨毒潭 (Sinister Bone-Corroding Venom Mire): blackened scorched rock, cracked dark-brown mud & toxic basin bed!
        if (venomMireW > 0.01) {
          const vw = M.smoothstep(0.04, 0.48, venomMireW);
          const dVenom = Math.hypot(x - VENOM_MIRE.cx, z - VENOM_MIRE.cz);
          const crackNoise = M.smoothstep(-0.15, 0.40, detailVar);
          // Deep brown & blackened scorched rock / cracked dry earth along shore
          let vmR = M.lerp(0.11, 0.22, crackNoise) + detailVar * 0.02;
          let vmG = M.lerp(0.09, 0.16, crackNoise) + detailVar * 0.015;
          let vmB = M.lerp(0.11, 0.15, crackNoise) + detailVar * 0.02;
          // Submerged toxic basin floor takes dark violet-emerald sludge tint
          const inPool = 1.0 - M.smoothstep(58.0, 82.0, dVenom);
          vmR = M.lerp(vmR, 0.12, inPool * 0.75);
          vmG = M.lerp(vmG, 0.17, inPool * 0.75);
          vmB = M.lerp(vmB, 0.19, inPool * 0.75);
          // Faint sinister scorched crags on steeper outer rim
          const scorchSlope = M.smoothstep(0.12, 0.26, slope);
          vmR = M.lerp(vmR, 0.09, scorchSlope * 0.65);
          vmG = M.lerp(vmG, 0.08, scorchSlope * 0.65);
          vmB = M.lerp(vmB, 0.10, scorchSlope * 0.65);
          r = M.lerp(r, vmR, vw * 0.96);
          g = M.lerp(g, vmG, vw * 0.96);
          b = M.lerp(b, vmB, vw * 0.96);
          rough = M.lerp(rough, 0.84, vw);
        }

        // 6K. 幽林秘岭 (Hidden Steep Forested Mountain Range): Deep Primeval Pine-Moss Loam, Craggy Dark Mountain Cliff Rock & Mossy Winding Trail!
        if (hiddenMtnW > 0.01) {
          const hw = M.smoothstep(0.04, 0.52, hiddenMtnW);
          const mossPat = M.smoothstep(-0.20, 0.42, detailVar * 0.55 + macroVar * 0.45);
          const altT = M.smoothstep(65.0, 265.0, y);
          // Deep shaded primeval forest earth & thick emerald-jade moss
          let hmR = M.lerp(0.16, 0.23, mossPat) + detailVar * 0.025;
          let hmG = M.lerp(0.32, 0.41, mossPat) - altT * 0.04 + detailVar * 0.028;
          let hmB = M.lerp(0.17, 0.22, mossPat);
          // Steep craggy granite & moss-streaked mountain cliff faces
          const cliffRock = M.smoothstep(0.11, 0.24, slope + altT * 0.06 + detailVar * 0.05);
          const cragStrata = 0.5 + 0.5 * Math.sin(y * 0.52 + macroVar * 5.0);
          hmR = M.lerp(hmR, M.lerp(0.20, 0.31, cragStrata) + detailVar * 0.04, cliffRock * 0.94);
          hmG = M.lerp(hmG, M.lerp(0.25, 0.34, cragStrata) + detailVar * 0.04, cliffRock * 0.94);
          hmB = M.lerp(hmB, M.lerp(0.26, 0.35, cragStrata) + detailVar * 0.03, cliffRock * 0.94);
          // Winding hidden mountain dirt & worn bluestone trail
          if (hiddenPath.pathMask > 0.04) {
            const pw = hiddenPath.pathMask * 0.78;
            hmR = M.lerp(hmR, 0.38, pw);
            hmG = M.lerp(hmG, 0.36, pw);
            hmB = M.lerp(hmB, 0.29, pw);
          }
          r = M.lerp(r, hmR, hw * 0.94);
          g = M.lerp(g, hmG, hw * 0.94);
          b = M.lerp(b, hmB, hw * 0.94);
          rough = M.lerp(rough, M.lerp(0.84, 0.64, cliffRock), hw);
        }

        // 7. Architectural Foundation Ground-Contact Ambient Occlusion (建筑底部与地面阴影暗部过渡)
        if (bldg.contactAO > 0.01) {
          const aoFactor = 1.0 - bldg.contactAO;
          r *= aoFactor;
          g *= aoFactor;
          b *= aoFactor;
        }

        let emissive = 0.0;

        data[ptr++] = x;
        data[ptr++] = y;
        data[ptr++] = z;
        data[ptr++] = nrm[0];
        data[ptr++] = nrm[1];
        data[ptr++] = nrm[2];
        data[ptr++] = r;
        data[ptr++] = g;
        data[ptr++] = b;
        data[ptr++] = rough;
        data[ptr++] = emissive;
        data[ptr++] = matEncoding;
      }
    }

    let idx = 0;
    const stride = resolution + 1;
    for (let iz = 0; iz < resolution; iz++) {
      for (let ix = 0; ix < resolution; ix++) {
        const a = iz * stride + ix;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        indices[idx++] = a; indices[idx++] = c; indices[idx++] = b;
        indices[idx++] = b; indices[idx++] = c; indices[idx++] = d;
      }
    }

    return { vertices: data, indices };
  }

  // Outer Deep-Sea Seabed Skirt wrapping STRICTLY OUTSIDE the square ±HALF_WORLD terrain border (replaces old boundary horizon mountains!)
  function buildDistantMountainRing(radialSegs = 224, ringSegs = 34) {
    const outerR = 28200;
    const vertCount = (radialSegs + 1) * (ringSegs + 1);
    const data = new Float32Array(vertCount * 12);
    const indices = new Uint32Array(radialSegs * ringSegs * 6);

    function sampleDistHeight(x, z, ringT) {
      const seabedUnd = N.fbm2D(x * 0.00045 + 1.9, z * 0.00045 - 3.2, 2) * 5.0;
      const deepFloor = -48.0 + seabedUnd;
      if (ringT < 0.18) {
        const clampX = M.clamp(x, -HALF_WORLD + 6, HALF_WORLD - 6);
        const clampZ = M.clamp(z, -HALF_WORLD + 6, HALF_WORLD - 6);
        const edgeH = Math.min(getMeshTerrainHeight(clampX, clampZ), -2.0);
        return M.lerp(edgeH, deepFloor, M.smootherstep(0.0, 0.18, ringT));
      }
      return deepFloor;
    }

    const px = new Float32Array(vertCount);
    const py = new Float32Array(vertCount);
    const pz = new Float32Array(vertCount);

    let vi = 0;
    for (let ir = 0; ir <= ringSegs; ir++) {
      const t = ir / ringSegs;
      for (let ia = 0; ia <= radialSegs; ia++) {
        const a = (ia / radialSegs) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        // Exact ray distance to ±HALF_WORLD plus small corner-chord margin on inner ring so NO triangle chord ever cuts inside the map!
        const maxAxis = Math.max(Math.abs(ca), Math.abs(sa));
        const cornerPad = (1.0 - M.smoothstep(0.0, 0.14, t)) * 6.0;
        const sqEdgeR = (HALF_WORLD + cornerPad) / maxAxis;
        const r = sqEdgeR + (outerR - sqEdgeR) * Math.pow(t, 1.62);
        const x = ca * r;
        const z = sa * r;
        px[vi] = x;
        py[vi] = sampleDistHeight(x, z, t);
        pz[vi] = z;
        vi++;
      }
    }

    const stride = radialSegs + 1;
    let ptr = 0;
    for (let ir = 0; ir <= ringSegs; ir++) {
      const t = ir / ringSegs;
      for (let ia = 0; ia <= radialSegs; ia++) {
        const i = ir * stride + ia;
        const iL = ir * stride + ((ia - 1 + radialSegs) % radialSegs);
        const iR = ir * stride + ((ia + 1) % radialSegs);
        const iD = Math.max(0, ir - 1) * stride + ia;
        const iU = Math.min(ringSegs, ir + 1) * stride + ia;

        const tx = px[iR] - px[iL], ty = py[iR] - py[iL], tz = pz[iR] - pz[iL];
        const bx = px[iU] - px[iD], by = py[iU] - py[iD], bz = pz[iU] - pz[iD];
        let nx = by * tz - bz * ty;
        let ny = bz * tx - bx * tz;
        let nz = bx * ty - by * tx;
        if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;

        const colR = 0.03;
        const colG = 0.08;
        const colB = 0.14;

        data[ptr++] = px[i];
        data[ptr++] = py[i];
        data[ptr++] = pz[i];
        data[ptr++] = nx;
        data[ptr++] = ny;
        data[ptr++] = nz;
        data[ptr++] = colR;
        data[ptr++] = colG;
        data[ptr++] = colB;
        data[ptr++] = 0.85;
        data[ptr++] = 0.0;
        data[ptr++] = 0.0;
      }
    }

    let idx = 0;
    for (let ir = 0; ir < ringSegs; ir++) {
      for (let ia = 0; ia < radialSegs; ia++) {
        const a = ir * stride + ia;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        indices[idx++] = a; indices[idx++] = b; indices[idx++] = c;
        indices[idx++] = b; indices[idx++] = d; indices[idx++] = c;
      }
    }

    return { vertices: data, indices };
  }

  XW.Terrain = {
    WORLD_SIZE,
    HALF_WORLD,
    OCEAN_WATER_Y,
    RIVER_WATER_Y,
    SPRING_WATER_Y,
    LAKE_WATER_Y,
    SWAMP_WATER_Y,
    VENOM_WATER_Y,
    BAMBOO_VALLEY,
    VENOM_MIRE,
    HIDDEN_MOUNTAINS,
    LOW_CLOUD_PLAINS,
    CHENYAN_SWAMP,
    CANZHEN_ROAD,
    SPIRIT_FOREST,
    CLOUD_MOUNTAIN,
    DESERT_DUNES,
    FROST_SNOWFIELD,
    FROST_MOUNTAIN,
    QINGSHI_CITY,
    FLOATING_ISLANDS,
    REGIONS,
    getQingshiCityMask,
    getLowCloudPlainsMask,
    getSwampMask,
    getAncientRoadMask,
    getAncientRoadPathInfo,
    getSpiritForestMask,
    getSpiritForestTrailInfo,
    getCloudMountainMask,
    getCloudMountainPathInfo,
    getDesertMask,
    getDesertDuneWave,
    getSnowfieldMask,
    getSnowDriftWave,
    getFrostMountainMask,
    getFrostMountainPathInfo,
    getBambooValleyMask,
    getVenomMireMask,
    getHiddenMountainsMask,
    getHiddenMountainPathInfo,
    getIrregularRimMask,
    getRiverInfo,
    getCanyonMask,
    getPathMask,
    getTerrainHeight,
    getMeshTerrainHeight,
    getMeshFootHeight,
    getTerrainNormal,
    getIslandTopHeight,
    getBridgeHeight,
    getWalkableHeight,
    sampleAtmosphere,
    buildTerrainDataTexture,
    buildTerrainMesh,
    buildDistantMountainRing,
  };
})(window);
