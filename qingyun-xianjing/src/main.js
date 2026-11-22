(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;

  // Twelve Shichen (子..亥 十二时辰) Day-Night Alternation Table
  const SHICHEN_CYCLE = [
    {
      name: '子时',
      phase: '夜半星寒 · 子夜',
      sunDir: M.v3Normalize(new Float32Array(3), [-0.24, 0.34, 0.91]),
      sunTint: [0.16, 0.23, 0.42],
      skyTopTint: [0.06, 0.09, 0.22],
      skyHorTint: [0.10, 0.15, 0.30],
      fogTint: [0.11, 0.16, 0.30],
      shadowTint: [0.12, 0.18, 0.36],
    },
    {
      name: '丑时',
      phase: '鸡鸣霜重 · 深夜',
      sunDir: M.v3Normalize(new Float32Array(3), [0.18, 0.28, 0.94]),
      sunTint: [0.19, 0.26, 0.45],
      skyTopTint: [0.08, 0.12, 0.26],
      skyHorTint: [0.13, 0.18, 0.34],
      fogTint: [0.14, 0.20, 0.35],
      shadowTint: [0.15, 0.22, 0.40],
    },
    {
      name: '寅时',
      phase: '平旦微熹 · 破晓',
      sunDir: M.v3Normalize(new Float32Array(3), [0.76, 0.22, -0.61]),
      sunTint: [0.58, 0.44, 0.52],
      skyTopTint: [0.24, 0.26, 0.48],
      skyHorTint: [0.56, 0.42, 0.50],
      fogTint: [0.46, 0.38, 0.48],
      shadowTint: [0.34, 0.32, 0.54],
    },
    {
      name: '卯时',
      phase: '日出东方 · 晨曦',
      sunDir: M.v3Normalize(new Float32Array(3), [0.74, 0.38, -0.55]),
      sunTint: [1.06, 0.78, 0.58],
      skyTopTint: [0.64, 0.68, 0.88],
      skyHorTint: [1.08, 0.80, 0.66],
      fogTint: [0.96, 0.78, 0.68],
      shadowTint: [0.72, 0.68, 0.86],
    },
    {
      name: '辰时',
      phase: '食时晨光 · 白昼',
      sunDir: M.v3Normalize(new Float32Array(3), [0.58, 0.58, -0.57]),
      sunTint: [1.02, 0.98, 0.93],
      skyTopTint: [0.98, 0.99, 1.00],
      skyHorTint: [1.02, 1.00, 0.98],
      fogTint: [1.00, 1.00, 1.00],
      shadowTint: [0.98, 0.99, 1.00],
    },
    {
      name: '巳时',
      phase: '隅中晴朗 · 白昼',
      sunDir: M.v3Normalize(new Float32Array(3), [0.42, 0.74, -0.52]),
      sunTint: [1.05, 1.03, 0.99],
      skyTopTint: [0.96, 1.02, 1.05],
      skyHorTint: [1.00, 1.03, 1.03],
      fogTint: [0.98, 1.02, 1.03],
      shadowTint: [1.00, 1.04, 1.05],
    },
    {
      name: '午时',
      phase: '日中正午 · 白昼',
      sunDir: M.v3Normalize(new Float32Array(3), [0.14, 0.88, -0.45]),
      sunTint: [1.10, 1.07, 1.02],
      skyTopTint: [0.95, 1.05, 1.08],
      skyHorTint: [1.00, 1.05, 1.06],
      fogTint: [0.98, 1.04, 1.05],
      shadowTint: [1.04, 1.07, 1.08],
    },
    {
      name: '未时',
      phase: '日昳暖阳 · 白昼',
      sunDir: M.v3Normalize(new Float32Array(3), [-0.28, 0.78, -0.56]),
      sunTint: [1.06, 1.01, 0.95],
      skyTopTint: [0.96, 1.00, 1.04],
      skyHorTint: [1.02, 1.00, 0.97],
      fogTint: [1.00, 0.99, 0.97],
      shadowTint: [0.98, 1.00, 1.03],
    },
    {
      name: '申时',
      phase: '哺时斜阳 · 午后',
      sunDir: M.v3Normalize(new Float32Array(3), [-0.56, 0.54, -0.63]),
      sunTint: [1.10, 0.92, 0.78],
      skyTopTint: [0.90, 0.88, 0.98],
      skyHorTint: [1.08, 0.92, 0.82],
      fogTint: [1.04, 0.92, 0.84],
      shadowTint: [0.90, 0.88, 0.98],
    },
    {
      name: '酉时',
      phase: '日入暮霞 · 黄昏',
      sunDir: M.v3Normalize(new Float32Array(3), [-0.76, 0.28, -0.59]),
      sunTint: [1.18, 0.72, 0.48],
      skyTopTint: [0.58, 0.48, 0.74],
      skyHorTint: [1.12, 0.72, 0.54],
      fogTint: [0.96, 0.68, 0.56],
      shadowTint: [0.64, 0.58, 0.82],
    },
    {
      name: '戌时',
      phase: '黄昏定昏 · 入夜',
      sunDir: M.v3Normalize(new Float32Array(3), [-0.62, 0.24, 0.75]),
      sunTint: [0.34, 0.34, 0.54],
      skyTopTint: [0.16, 0.18, 0.36],
      skyHorTint: [0.28, 0.26, 0.44],
      fogTint: [0.24, 0.25, 0.42],
      shadowTint: [0.22, 0.26, 0.46],
    },
    {
      name: '亥时',
      phase: '人定月华 · 夜幕',
      sunDir: M.v3Normalize(new Float32Array(3), [-0.42, 0.32, 0.85]),
      sunTint: [0.20, 0.27, 0.46],
      skyTopTint: [0.09, 0.13, 0.28],
      skyHorTint: [0.14, 0.19, 0.35],
      fogTint: [0.15, 0.20, 0.36],
      shadowTint: [0.15, 0.21, 0.38],
    },
  ];

  function createAtmoState() {
    return {
      sunColor: new Float32Array([1.18, 1.07, 0.88]),
      skyTop: new Float32Array([0.09, 0.35, 0.79]),
      skyHorizon: new Float32Array([0.47, 0.76, 0.90]),
      fogColor: new Float32Array([0.48, 0.74, 0.86]),
      shadowTint: new Float32Array([0.22, 0.40, 0.60]),
      fogDensity: 0.00038,
      heightFogDensity: 0.009,
      heightFogBase: 7.0,
      region: T.REGIONS[0],
    };
  }

  function showError(msg) {
    const overlay = document.getElementById('error-overlay');
    const txt = document.getElementById('error-message');
    if (txt) txt.textContent = msg;
    if (overlay) overlay.classList.remove('hidden');
  }

  const SAVE_STORAGE_KEY = 'qingyun_xianjing_saves_v1';

  const STARTER_ELEMENT_GIFTS = {
    metal: { elemName: '金', skillId: 'metal_basic', skillName: '锐金指', outfitId: 'outfit_metal', outfitName: '庚金白金袍', icon: '金' },
    wood:  { elemName: '木', skillId: 'wood_basic',  skillName: '青木弹', outfitId: 'outfit_wood',  outfitName: '青木翠竹衫', icon: '木' },
    water: { elemName: '水', skillId: 'water_basic', skillName: '清泉弹', outfitId: 'outfit_water', outfitName: '玄水沧浪衣', icon: '水' },
    fire:  { elemName: '火', skillId: 'fire_basic',  skillName: '炎阳弹', outfitId: 'outfit_fire',  outfitName: '赤炎烈阳装', icon: '火' },
    earth: { elemName: '土', skillId: 'earth_basic', skillName: '厚土拳', outfitId: 'outfit_earth', outfitName: '厚土玄黄袍', icon: '土' },
  };

  function makeBasicSkillBookItem(elemKey) {
    const g = STARTER_ELEMENT_GIFTS[elemKey] || STARTER_ELEMENT_GIFTS.metal;
    return {
      id: `book_${g.skillId}`,
      name: `《${g.skillName}》技能书`,
      icon: '书',
      slotType: 'skill_book',
      skillId: g.skillId,
      skillName: g.skillName,
      element: elemKey,
      count: 1,
      desc: `${g.elemName}行基础普攻秘籍 · 在背包中点击「研习使用」即可永久习得【${g.skillName}】并自动装配至普攻格。`,
    };
  }

  function loadAllSaves() {
    try {
      const raw = global.localStorage ? global.localStorage.getItem(SAVE_STORAGE_KEY) : null;
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeAllSaves(map) {
    try {
      if (global.localStorage) {
        global.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(map));
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function getLatestSaveEntry() {
    const all = loadAllSaves();
    let best = null;
    for (const k of Object.keys(all)) {
      const s = all[k];
      if (!s || !s.savedAt) continue;
      if (!best || s.savedAt > best.savedAt) best = Object.assign({ slotKey: k }, s);
    }
    return best;
  }

  function formatSaveTime(ts) {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (_) {
      return '';
    }
  }

  function nextUiTick() {
    return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 18)));
  }

  async function startGameWorld(initialLaunch, initialSettings, setLoadProgress, onReturnToTitle) {
    const canvas = document.getElementById('gl-canvas');
    const nametagCanvas = document.getElementById('nametag-canvas');
    const nametagCtx = nametagCanvas ? nametagCanvas.getContext('2d') : null;
    const vitalsBox = document.getElementById('player-vitals');
    const shichenBarEl = document.getElementById('shichen-bar');
    const shichenBadgeEl = document.getElementById('shichen-badge');
    const shichenPhaseEl = document.getElementById('shichen-phase');
    const shichenFillEl = document.getElementById('shichen-fill');
    const hpFillEl = document.getElementById('hp-fill');
    const hpTextEl = document.getElementById('hp-text');
    const mpFillEl = document.getElementById('mp-fill');
    const mpTextEl = document.getElementById('mp-text');
    const stFillEl = document.getElementById('st-fill');
    const stTextEl = document.getElementById('st-text');
    const hudBtnBag = document.getElementById('hud-btn-bag');
    const hudBtnSkill = document.getElementById('hud-btn-skill');
    const minimapBox = document.getElementById('minimap-box');
    const minimapCanvas = document.getElementById('minimap-canvas');
    const worldmapModal = document.getElementById('worldmap-modal');
    const worldmapCanvas = document.getElementById('worldmap-canvas');
    const worldmapClose = document.getElementById('worldmap-close');
    const worldmapInfo = document.getElementById('worldmap-info');

    // ESC Menu DOM elements
    const escMenuModal = document.getElementById('esc-menu-modal');
    const escMenuCard = escMenuModal ? escMenuModal.querySelector('.esc-menu-card') : null;
    const escMainView = document.getElementById('esc-main-view');
    const escSaveView = document.getElementById('esc-save-view');
    const escSaveList = document.getElementById('esc-save-list');
    const escBestiaryView = document.getElementById('esc-bestiary-view');
    const escSettingsView = document.getElementById('esc-settings-view');
    const escQuitView = document.getElementById('esc-quit-view');
    const btnResume = document.getElementById('btn-resume');
    const btnOpenSave = document.getElementById('btn-open-save');
    const btnSaveBack = document.getElementById('btn-save-back');
    const btnOpenBestiary = document.getElementById('btn-open-bestiary');
    const btnBestiaryBack = document.getElementById('btn-bestiary-back');
    const bestiaryFilterBar = document.getElementById('bestiary-filter-bar');
    const bestiaryListEl = document.getElementById('bestiary-list');
    const bestiarySummarySub = document.getElementById('bestiary-summary-sub');
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnCheatAll = document.getElementById('btn-cheat-all');
    const btnReturnTitle = document.getElementById('btn-return-title');
    const btnQuitGame = document.getElementById('btn-quit-game');
    const btnBackMain = document.getElementById('btn-back-main');
    const btnReenter = document.getElementById('btn-reenter');

    const settingSoundInfo = document.getElementById('setting-sound-info');
    const settingResInfo = document.getElementById('setting-res-info');
    const settingViewInfo = document.getElementById('setting-view-info');
    const settingQualInfo = document.getElementById('setting-qual-info');
    const settingShadowInfo = document.getElementById('setting-shadow-info');
    const settingBlobInfo = document.getElementById('setting-blob-info');
    const settingFogInfo = document.getElementById('setting-fog-info');

    let renderer;
    let worldData;
    let collisionWorld;
    let minimap;
    const bgm = XW.Audio ? new XW.Audio.XianxiaAudioEngine() : null;
    try {
      const t0 = performance.now();
      if (setLoadProgress) setLoadProgress(16, '正在塑形山海地形与地脉高度…');
      await nextUiTick();
      collisionWorld = new XW.Collision.SpatialCollisionWorld();
      const terrainMesh = T.buildTerrainMesh(560);
      const terrainDataTex = T.buildTerrainDataTexture(561);
      const distMountainsMesh = T.buildDistantMountainRing(192, 28);

      if (setLoadProgress) setLoadProgress(42, '正在点化仙城殿宇、林木草甸与云海…');
      await nextUiTick();
      const landmarks = XW.Landmarks.buildAllLandmarks(collisionWorld);
      const nature = XW.Nature.buildAllNature(collisionWorld);

      if (setLoadProgress) setLoadProgress(68, '正在唤醒各境妖兽、青石城商铺与藏经阁…');
      await nextUiTick();
      worldData = {
        collisionWorld,
        terrainMesh,
        terrainDataTex,
        distMountainsMesh,
        landmarks,
        nature,
        monsters: XW.Monsters ? XW.Monsters.createMonsterSystem(collisionWorld) : null,
        skills: XW.Skills ? XW.Skills.createSkillSystem() : null,
        treasures: XW.Treasures ? XW.Treasures.createTreasureSystem() : null,
        herbs: XW.Herbs ? XW.Herbs.createHerbSystem() : null,
        ores: XW.Ores ? XW.Ores.createOreSystem() : null,
        drops: XW.Drops ? XW.Drops.createDropSystem() : null,
        city: XW.QingshiCity ? XW.QingshiCity.createCitySystem() : null,
        furnaces: XW.Furnaces ? XW.Furnaces.createFurnaceSystem(collisionWorld) : null,
        npcs: XW.NPCs ? XW.NPCs.createNpcSystem(collisionWorld) : null,
      };
      if (setLoadProgress) setLoadProgress(86, '正在初始化 WebGL2 渲染管线与山海舆图…');
      await nextUiTick();
      renderer = new XW.Renderer(canvas, worldData);
      minimap = new XW.Minimap(minimapCanvas, worldmapCanvas, worldmapModal, worldmapInfo, (viewKey) => {
        if (!camera || !XW.SCENIC_VIEWS[viewKey]) return;
        setMapOpen(false);
        camera.glideTo(XW.SCENIC_VIEWS[viewKey]);
      });
      const cs = collisionWorld.getStats();
      console.info(
        `[青云问道] 18400m山海大地图构建完成 (${Math.round(performance.now() - t0)} ms) | 碰撞体: 共${cs.total}个`
      );
    } catch (err) {
      console.error(err);
      showError(err && err.message ? err.message : String(err));
      return null;
    }

    // 12-Shichen Time System State: starts at 4.0 (辰时 - morning daylight), advances continuously
    let shichenFloat = 4.0;
    const SHICHEN_DURATION_SEC = 18.0; // 18s per Shichen -> 216s full 12-Shichen day-night cycle
    let currentSunDir = new Float32Array(SHICHEN_CYCLE[4].sunDir);
    const interpSunDir = new Float32Array(3);
    let lastRenderedShichenIdx = -1;

    function syncShichenUI() {
      const idx = ((Math.floor(shichenFloat) % 12) + 12) % 12;
      const frac = shichenFloat - Math.floor(shichenFloat);
      const cur = SHICHEN_CYCLE[idx];
      if (idx !== lastRenderedShichenIdx) {
        lastRenderedShichenIdx = idx;
        if (shichenBadgeEl) shichenBadgeEl.textContent = cur.name;
        if (shichenPhaseEl) shichenPhaseEl.textContent = cur.phase;
      }
      if (shichenFillEl) {
        shichenFillEl.style.width = `${(frac * 100).toFixed(1)}%`;
      }
    }
    syncShichenUI();

    if (shichenBarEl) {
      shichenBarEl.addEventListener('click', (e) => {
        e.stopPropagation();
        shichenFloat = (Math.floor(shichenFloat) + 1) % 12;
        syncShichenUI();
      });
    }

    let menuOpen = false;
    let menuSubView = 'main'; // 'main' | 'save' | 'bestiary' | 'settings' | 'quit'
    let titleActive = false;
    let gameExited = false;
    let lastMenuToggleAt = 0;
    const playerProfile = { name: '青云散修', element: 'metal' };
    const playerNameTextEl = document.getElementById('player-name-text');

    // Live user settings state (synced with main menu settings)
    const userSettings = Object.assign({
      sound: 'on',
      resolution: 'high',
      viewDistance: 'medium',
      quality: 'medium',
      shadowQuality: 'medium',
      blobShadow: 'on',
      distanceFog: 'on',
    }, initialSettings || {});

    const camera = new XW.CameraController(canvas, () => {}, collisionWorld);
    camera.monsterSystem = worldData.monsters;
    camera.oreSystem = worldData.ores;
    camera.citySystem = worldData.city;
    camera.npcSystem = worldData.npcs;
    if (worldData.skills) {
      worldData.skills.oreSystem = worldData.ores;
      worldData.skills.npcSystem = worldData.npcs;
    }
    if (worldData.treasures) {
      worldData.treasures.oreSystem = worldData.ores;
      worldData.treasures.npcSystem = worldData.npcs;
    }
    if (worldData.npcs) worldData.npcs.citySystem = worldData.city;
    if (worldData.ores) {
      worldData.ores.monsterSystem = worldData.monsters;
    }
    camera.onSkillAimMouseMove = (mdx, mdy) => {
      if (worldData.skills && worldData.skills.aimPreview) {
        worldData.skills.handleAimMouseMove(mdx, mdy, camera);
      }
    };
    const protagonist = XW.Character ? XW.Character.createProtagonist() : null;

    // Resize 2D Nametag Overlay Canvas to match capped DPR (max 1.5x avoids HiDPI GPU fillrate waste)
    let nametagDpr = 1;
    function resizeNametagCanvas() {
      if (!nametagCanvas) return;
      nametagDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      nametagCanvas.width = Math.max(2, Math.floor(window.innerWidth * nametagDpr));
      nametagCanvas.height = Math.max(2, Math.floor(window.innerHeight * nametagDpr));
    }
    resizeNametagCanvas();

    // =========================================================
    // PROTAGONIST CULTIVATION REALMS (练气1~10层 + 筑基前/中/后期 · 核心数值升级公式)
    // 练气一层核心：HP 100 / MP 100 / ATK 10 / DEF 5
    // 练气每升一层 +10% 练气一层基数（五层、十层突破为 +20% 练气一层基数，四舍五入，不受心法影响）
    // 筑基前期 = 练气十层核心翻倍 (+100%)
    // 筑基中期 = 筑基前期核心 +20% (1.2x)；筑基后期 = 中期基础上再加筑基前期核心 +30% (1.5x)
    // =========================================================
    const L1_CORE = { hp: 100, mp: 100, atk: 10, def: 5 };
    const LIANQI_MULTS = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8, 1.9, 2.1];
    const LIANQI_LABELS = ['练气一层', '练气二层', '练气三层', '练气四层', '练气五层', '练气六层', '练气七层', '练气八层', '练气九层', '练气十层'];
    const LIANQI_EXPS   = [100, 130, 165, 205, 250, 300, 360, 430, 510, 600];

    const CULTIVATION_REALMS = LIANQI_MULTS.map((mul, idx) => ({
      label: LIANQI_LABELS[idx],
      major: 'lianqi',
      coreHp:  Math.round(L1_CORE.hp  * mul),
      coreMp:  Math.round(L1_CORE.mp  * mul),
      coreAtk: Math.round(L1_CORE.atk * mul),
      coreDef: Math.round(L1_CORE.def * mul),
      maxExp: LIANQI_EXPS[idx],
    }));

    const L10_CORE = CULTIVATION_REALMS[9];
    const ZHUJI_EARLY_CORE = {
      hp:  L10_CORE.coreHp  * 2, // 420
      mp:  L10_CORE.coreMp  * 2, // 420
      atk: L10_CORE.coreAtk * 2, // 42
      def: L10_CORE.coreDef * 2, // 22
    };
    CULTIVATION_REALMS.push(
      {
        label: '筑基前期', major: 'zhuji',
        coreHp:  ZHUJI_EARLY_CORE.hp,
        coreMp:  ZHUJI_EARLY_CORE.mp,
        coreAtk: ZHUJI_EARLY_CORE.atk,
        coreDef: ZHUJI_EARLY_CORE.def,
        maxExp: 860,
      },
      {
        label: '筑基中期', major: 'zhuji',
        coreHp:  Math.round(ZHUJI_EARLY_CORE.hp  * 1.2), // 504
        coreMp:  Math.round(ZHUJI_EARLY_CORE.mp  * 1.2), // 504
        coreAtk: Math.round(ZHUJI_EARLY_CORE.atk * 1.2), // 50
        coreDef: Math.round(ZHUJI_EARLY_CORE.def * 1.2), // 26
        maxExp: 1200,
      },
      {
        label: '筑基后期', major: 'zhuji',
        coreHp:  Math.round(ZHUJI_EARLY_CORE.hp  * 1.5), // 630
        coreMp:  Math.round(ZHUJI_EARLY_CORE.mp  * 1.5), // 630
        coreAtk: Math.round(ZHUJI_EARLY_CORE.atk * 1.5), // 63
        coreDef: Math.round(ZHUJI_EARLY_CORE.def * 1.5), // 33
        maxExp: 1600,
      }
    );

    const playerRealmBadgeEl = document.getElementById('player-realm-badge');
    const cultFillEl         = document.getElementById('cult-fill');
    const cultTextEl         = document.getElementById('cult-text');
    const hudBtnCultivate    = document.getElementById('hud-btn-cultivate');
    const playerSpeedTextEl  = document.getElementById('player-speed-text');
    const playerAtkTextEl    = document.getElementById('player-atk-text');
    const playerDefTextEl    = document.getElementById('player-def-text');
    const playerXinfaCountEl = document.getElementById('player-xinfa-count');
    const playerStoneValEl   = document.getElementById('player-stone-val');
    const combatCrosshairEl  = document.getElementById('combat-crosshair');
    const skillAimBannerEl   = document.getElementById('skill-aim-banner');
    const skillAimTitleEl    = document.getElementById('skill-aim-title');

    // Protagonist Vitals (练气一层: HP 100 / MP 100 / ATK 10 / DEF 5 / Stamina 100 / 移速 1)
    const vitals = {
      realmIdx: 0,
      realmLabel: CULTIVATION_REALMS[0].label,
      cultExp: 0,
      maxCultExp: CULTIVATION_REALMS[0].maxExp,
      baseSpeed: 1.0,
      moveSpeedStat: 1.0,
      coreHp: CULTIVATION_REALMS[0].coreHp,
      coreMp: CULTIVATION_REALMS[0].coreMp,
      coreAtk: CULTIVATION_REALMS[0].coreAtk,
      coreDef: CULTIVATION_REALMS[0].coreDef,
      atk: CULTIVATION_REALMS[0].coreAtk,
      def: CULTIVATION_REALMS[0].coreDef,
      hp: CULTIVATION_REALMS[0].coreHp,
      maxHp: CULTIVATION_REALMS[0].coreHp,
      mp: CULTIVATION_REALMS[0].coreMp,
      maxMp: CULTIVATION_REALMS[0].coreMp,
      stamina: 100,
      maxStamina: 100,
      staminaRegenDelay: 0,
      sprintExhausted: false,
      combatTimer: 0,
      slowTimer: 0,
      hitFlash: 0,
      invulnTimer: 0,
      spiritStones: 0,
    };

    function syncPlayerCombatScale() {
      if (worldData.skills) {
        worldData.skills.playerAtk = vitals.atk;
        worldData.skills.playerMaxHp = vitals.maxHp;
      }
    }

    function recalcPlayerStats(refillOnIncrease = false) {
      const baseR = CULTIVATION_REALMS[vitals.realmIdx] || CULTIVATION_REALMS[0];
      if (worldData.skills && worldData.skills.setPlayerRealmMajor) {
        worldData.skills.setPlayerRealmMajor(baseR.major);
      }
      const xb = worldData.skills && worldData.skills.getXinfaBonuses
        ? worldData.skills.getXinfaBonuses()
        : { hpBonus: 0, mpBonus: 0, speedBonus: 0, atkBonus: 0 };

      const prevMaxHp = vitals.maxHp || baseR.coreHp;
      const prevMaxMp = vitals.maxMp || baseR.coreMp;
      vitals.realmLabel    = baseR.label;
      vitals.maxCultExp    = baseR.maxExp;
      vitals.coreHp        = baseR.coreHp;
      vitals.coreMp        = baseR.coreMp;
      vitals.coreAtk       = baseR.coreAtk;
      vitals.coreDef       = baseR.coreDef;
      vitals.maxHp         = Math.round(baseR.coreHp + xb.hpBonus);
      vitals.maxMp         = Math.round(baseR.coreMp + xb.mpBonus);
      vitals.atk           = Math.max(1, Math.round(baseR.coreAtk * (1.0 + xb.atkBonus)));
      vitals.def           = baseR.coreDef;
      vitals.moveSpeedStat = +(vitals.baseSpeed + xb.speedBonus).toFixed(2);

      if (refillOnIncrease) {
        vitals.hp = vitals.maxHp;
        vitals.mp = vitals.maxMp;
      } else {
        if (vitals.maxHp > prevMaxHp) vitals.hp = Math.min(vitals.maxHp, vitals.hp + (vitals.maxHp - prevMaxHp));
        else vitals.hp = Math.min(vitals.maxHp, vitals.hp);
        if (vitals.maxMp > prevMaxMp) vitals.mp = Math.min(vitals.maxMp, vitals.mp + (vitals.maxMp - prevMaxMp));
        else vitals.mp = Math.min(vitals.maxMp, vitals.mp);
      }

      camera.moveSpeedStat = vitals.moveSpeedStat;
      syncPlayerCombatScale();
      syncVitalsUI();
    }
    const bagStoneElCached = document.getElementById('bag-stone-label');
    let lastVitalsSig = '';
    recalcPlayerStats(true);

    // 修炼度严格只能通过在「灵台」打坐修炼提升（fromSpiritPlatform === true）
    function gainCultivationExp(amount, showFloatText = false, fromSpiritPlatform = false) {
      if (!fromSpiritPlatform || amount <= 0) return;
      const maxIdx = CULTIVATION_REALMS.length - 1;
      vitals.cultExp += amount;

      const pPos = camera.playerPos || camera.pos;
      if (showFloatText && worldData.monsters && pPos) {
        worldData.monsters.spawnFloatingText(pPos[0], pPos[1] + 2.55, pPos[2], `+${Math.round(amount)} 修炼度`, '#8efad8');
      }

      // Check for sub-realm breakthrough!
      while (vitals.realmIdx < maxIdx && vitals.cultExp >= vitals.maxCultExp) {
        vitals.cultExp -= vitals.maxCultExp;
        vitals.realmIdx += 1;
        const nextR = CULTIVATION_REALMS[vitals.realmIdx];
        const prevMajor = CULTIVATION_REALMS[vitals.realmIdx - 1].major;
        recalcPlayerStats(true);

        if (prevMajor !== 'zhuji' && nextR.major === 'zhuji' && worldData.skills) {
          worldData.skills.setRealm('zhuji');
          syncSkillHotbarStructure();
        }
        if (worldData.monsters && pPos) {
          worldData.monsters.spawnFloatingText(
            pPos[0], pPos[1] + 2.95, pPos[2],
            nextR.major === 'zhuji' && prevMajor !== 'zhuji' ? `筑基大成 · 晋升${nextR.label}!` : `境界突破 · ${nextR.label}!`,
            '#ffea88'
          );
        }
      }
      if (vitals.realmIdx >= maxIdx && vitals.cultExp > vitals.maxCultExp) {
        vitals.cultExp = vitals.maxCultExp;
      }
      syncVitalsUI();
    }

    if (hudBtnCultivate) {
      hudBtnCultivate.addEventListener('click', (e) => {
        e.stopPropagation();
        const pPos = camera.playerPos || camera.pos;
        if (worldData.monsters && pPos) {
          worldData.monsters.spawnFloatingText(pPos[0], pPos[1] + 2.45, pPos[2], '请前往洞府一阶灵台打坐修炼', '#98f6dc');
        }
      });
    }

    function syncVitalsUI() {
      const hpCur = Math.round(vitals.hp);
      const mpCur = Math.round(vitals.mp);
      const stCur = Math.round(vitals.stamina);
      const expCur = Math.floor(vitals.cultExp);
      const hitOn = vitals.hitFlash > 0.02 ? 1 : 0;
      const eqCnt = (worldData.skills && worldData.skills.equippedXinfa)
        ? worldData.skills.equippedXinfa.filter(Boolean).length : 0;
      const stonesCur = Math.floor(vitals.spiritStones || 0);
      const spdVal = vitals.moveSpeedStat || 1;
      const sig = `${playerProfile.name}|${vitals.realmIdx}|${hpCur}/${vitals.maxHp}|${mpCur}/${vitals.maxMp}|${stCur}/${vitals.maxStamina}|${expCur}/${vitals.maxCultExp}|${vitals.atk}|${vitals.def}|${spdVal}|${eqCnt}|${stonesCur}|${hitOn}`;
      if (sig === lastVitalsSig) return;
      lastVitalsSig = sig;

      const curR = CULTIVATION_REALMS[vitals.realmIdx];
      if (playerNameTextEl) {
        playerNameTextEl.textContent = playerProfile.name || '青云散修';
      }
      if (playerRealmBadgeEl) {
        playerRealmBadgeEl.textContent = vitals.realmLabel;
        playerRealmBadgeEl.classList.toggle('is-zhuji', curR && curR.major === 'zhuji');
      }
      if (cultFillEl) cultFillEl.style.width = `${M.clamp((vitals.cultExp / Math.max(1, vitals.maxCultExp)) * 100, 0, 100).toFixed(1)}%`;
      if (cultTextEl) {
        const isCap = vitals.realmIdx >= CULTIVATION_REALMS.length - 1 && expCur >= vitals.maxCultExp;
        cultTextEl.textContent = isCap ? `${vitals.maxCultExp} / ${vitals.maxCultExp} (圆满)` : `${expCur} / ${vitals.maxCultExp}`;
      }
      if (hpFillEl) hpFillEl.style.width = `${M.clamp((vitals.hp / vitals.maxHp) * 100, 0, 100).toFixed(1)}%`;
      if (mpFillEl) mpFillEl.style.width = `${M.clamp((vitals.mp / vitals.maxMp) * 100, 0, 100).toFixed(1)}%`;
      if (stFillEl) stFillEl.style.width = `${M.clamp((vitals.stamina / vitals.maxStamina) * 100, 0, 100).toFixed(1)}%`;
      if (hpTextEl) hpTextEl.textContent = `${hpCur} / ${vitals.maxHp}`;
      if (mpTextEl) mpTextEl.textContent = `${mpCur} / ${vitals.maxMp}`;
      if (stTextEl) stTextEl.textContent = `${stCur} / ${vitals.maxStamina}`;
      if (playerSpeedTextEl) {
        playerSpeedTextEl.textContent = Number.isInteger(spdVal) ? String(spdVal) : spdVal.toFixed(2);
      }
      if (playerAtkTextEl) {
        playerAtkTextEl.textContent = String(vitals.atk || 10);
      }
      if (playerDefTextEl) {
        playerDefTextEl.textContent = String(vitals.def || 5);
      }
      if (playerXinfaCountEl) {
        playerXinfaCountEl.textContent = `${eqCnt}/2`;
      }
      if (playerStoneValEl) {
        playerStoneValEl.textContent = String(stonesCur);
      }
      if (bagStoneElCached) {
        bagStoneElCached.textContent = `低阶灵石：${stonesCur}`;
      }
      if (vitalsBox) vitalsBox.classList.toggle('hit-flash', !!hitOn);
    }

    // 陡峭地形行走持续消耗体力（返回是否仍有剩余体力）
    camera.tryConsumeSlopeStamina = (dt, steepness) => {
      const drain = (6.5 + 18.5 * steepness) * dt;
      vitals.staminaRegenDelay = 0.65;
      if (vitals.stamina <= 0.1) {
        vitals.stamina = 0;
        return false;
      }
      vitals.stamina = Math.max(0, vitals.stamina - drain);
      return vitals.stamina > 0.1;
    };

    // Ground Jump & Ground Sprint Stamina Hooks (Flight mode does NOT consume stamina!)
    camera.tryConsumeJumpStamina = () => {
      const jumpCost = 15;
      if (vitals.stamina < jumpCost) return false;
      vitals.stamina = Math.max(0, vitals.stamina - jumpCost);
      vitals.staminaRegenDelay = 0.65;
      syncVitalsUI();
      return true;
    };

    camera.tryConsumeSprintStamina = (dt) => {
      if (vitals.sprintExhausted) {
        if (vitals.stamina >= 14) vitals.sprintExhausted = false;
        else return false;
      }
      if (vitals.stamina <= 0) {
        vitals.sprintExhausted = true;
        return false;
      }
      vitals.stamina = Math.max(0, vitals.stamina - 20.0 * dt);
      vitals.staminaRegenDelay = 0.55;
      if (vitals.stamina <= 0) {
        vitals.sprintExhausted = true;
      }
      return true;
    };

    function onPlayerHit(rawAtkDmg, slowSec) {
      if (vitals.invulnTimer > 0) return;
      // 全员暴击机制：妖兽与敌对修仙者攻击主角同样享有默认 5% 暴击率，暴击造成额外 50% 伤害 (1.5×)
      const isCrit = Math.random() < 0.05;
      const effRawDmg = isCrit ? (rawAtkDmg * 1.5) : rawAtkDmg;
      // 伤害公式：实际伤害 = max(1, 攻击方招式原始伤害 - 主角防御)，闪避仍归 0
      let finalDmg = Math.max(1, Math.round(effRawDmg) - (vitals.def || 0));
      if (worldData.skills) {
        finalDmg = worldData.skills.interceptIncomingDamage(finalDmg, camera.playerPos, worldData.monsters);
        if (finalDmg <= 0) {
          vitals.invulnTimer = 0.25;
          syncVitalsUI();
          return;
        }
      }
      if (worldData.treasures) {
        finalDmg = worldData.treasures.interceptIncomingDamage(finalDmg, camera, vitals, worldData.monsters);
        if (finalDmg <= 0) {
          vitals.invulnTimer = 0.25;
          syncVitalsUI();
          return;
        }
      }
      vitals.hp = Math.max(0, vitals.hp - finalDmg);
      vitals.combatTimer = 5.5;
      vitals.hitFlash = 0.28;
      vitals.invulnTimer = 0.35;
      if (worldData.monsters && camera.playerPos) {
        worldData.monsters.spawnFloatingText(
          camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2],
          isCrit ? `暴击 -${finalDmg}` : `-${finalDmg}`,
          isCrit ? '#ff5c3c' : '#ff9c8a'
        );
      }
      if (slowSec > 0) {
        vitals.slowTimer = Math.max(vitals.slowTimer, slowSec);
      }
      if (vitals.hp <= 0) {
        // Gentle Qi-Refining recovery respawn back at 低云平原 spawn
        vitals.hp = vitals.maxHp;
        vitals.mp = vitals.maxMp;
        vitals.stamina = vitals.maxStamina;
        vitals.slowTimer = 0;
        const vHome = XW.SCENIC_VIEWS['1'];
        camera.setViewImmediate(vHome.pos, vHome.yaw, vHome.pitch, false);
      }
      syncVitalsUI();
    }
    syncVitalsUI();

    // =========================================================
    // INVENTORY UI (背包 UI) & CULTIVATION TECHNIQUES UI (功法 UI)
    // =========================================================
    const bagModal = document.getElementById('bag-modal');
    const skillModal = document.getElementById('skill-modal');
    const bagClose = document.getElementById('bag-close');
    const skillClose = document.getElementById('skill-close');
    const tabToBag1 = document.getElementById('tab-to-bag-1');
    const tabToSkill1 = document.getElementById('tab-to-skill-1');
    const tabToBag2 = document.getElementById('tab-to-bag-2');
    const tabToSkill2 = document.getElementById('tab-to-skill-2');
    const bagGridEl = document.getElementById('bag-grid');
    const bagEquipListEl = document.getElementById('bag-equip-list');
    const bagCountLabel = document.getElementById('bag-count-label');
    const bagDetailName = document.getElementById('bag-detail-name');
    const bagDetailDesc = document.getElementById('bag-detail-desc');
    const bagActionBtn = document.getElementById('bag-action-btn');
    const bagActionBtn2 = document.getElementById('bag-action-btn-2');
    const xinfaListEl = document.getElementById('xinfa-list');
    const wujiListEl = document.getElementById('wuji-list');
    const activeXinfaLabel = document.getElementById('active-xinfa-label');
    const activeWujiLabel = document.getElementById('active-wuji-label');
    const skillBodyEl = document.getElementById('skill-body');
    const skillColXinfa = document.getElementById('skill-col-xinfa');
    const skillColWuji = document.getElementById('skill-col-wuji');

    let bagOpen = false;
    let skillOpen = false;
    let alchemyOpen = false;
    let forgingOpen = false;
    let shopOpen = false;
    let libraryOpen = false;
    let activeFurnaceInst = null;
    let activeShopNpc = null;
    let selectedBagTarget = null; // { source: 'grid'|'equip', indexOrSlot }

    const SLOT_LABELS = {
      outfit: '服装',
      flyingSword: '飞剑',
      treasure1: '法宝1',
      treasure2: '法宝2',
      fulu: '福禄',
      pill: '战斗丹药',
    };

    const equipment = {
      outfit: null,
      flyingSword: null,
      treasure1: null,
      treasure2: null,
      fulu: null,
      pill: null,
    };

    camera.canFlyCheck = () => {
      if (!equipment.flyingSword) {
        if (worldData.monsters && camera.playerPos) {
          worldData.monsters.spawnFloatingText(
            camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2],
            '请先在背包(B)装备飞剑', '#96e8ff'
          );
        }
        return false;
      }
      if (vitals.mp < 5.0) {
        if (worldData.monsters && camera.playerPos) {
          worldData.monsters.spawnFloatingText(
            camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2],
            '灵力不足，无法御剑升空', '#7cc8ff'
          );
        }
        return false;
      }
      return true;
    };

    // 浮空/御剑灵力持续消耗：只要浮空（悬停或飞行）都会以相同速率缓慢耗灵，耗尽自动落剑
    camera.tryConsumeFlightMp = (dt) => {
      const sw = equipment.flyingSword;
      const drainRate = (sw && sw.mpDrainPerSec) ? sw.mpDrainPerSec : 3.2;
      if (vitals.mp <= 0.05) {
        vitals.mp = 0;
        if (worldData.monsters && camera.playerPos) {
          worldData.monsters.spawnFloatingText(
            camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2],
            '灵力耗尽 · 落剑归地', '#7cc8ff'
          );
        }
        syncVitalsUI();
        return false;
      }
      vitals.mp = Math.max(0, vitals.mp - drainRate * dt);
      if (vitals.mp <= 0.05) {
        vitals.mp = 0;
        if (worldData.monsters && camera.playerPos) {
          worldData.monsters.spawnFloatingText(
            camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2],
            '灵力耗尽 · 落剑归地', '#7cc8ff'
          );
        }
        syncVitalsUI();
        return false;
      }
      return true;
    };

    // 加速御剑飞行额外体力消耗（与灵力同步消耗；体力耗尽回落至常规飞速）
    camera.tryConsumeFlightBoostStamina = (dt) => {
      if (vitals.sprintExhausted) {
        if (vitals.stamina >= 14) vitals.sprintExhausted = false;
        else return false;
      }
      if (vitals.stamina <= 0) {
        vitals.sprintExhausted = true;
        return false;
      }
      const sw = equipment.flyingSword;
      const stRate = (sw && sw.boostStaminaPerSec) ? sw.boostStaminaPerSec : 16.0;
      vitals.stamina = Math.max(0, vitals.stamina - stRate * dt);
      vitals.staminaRegenDelay = 0.55;
      if (vitals.stamina <= 0) {
        vitals.sprintExhausted = true;
      }
      return true;
    };

    // 限时符箓 Buff 状态 + 暴击率联动（连接至妖兽与 NPC 受击判定）
    const playerCritState = { rate: 0, mul: 1.5 };
    if (worldData.monsters) worldData.monsters.playerCritState = playerCritState;
    if (worldData.npcs) worldData.npcs.playerCritState = playerCritState;
    const consumableBuffs = {
      speedTimer: 0,
      speedMul: 1.0,
      speedName: '',
      critTimer: 0,
      critRate: 0,
      critMul: 1.5,
      critName: '',
    };

    // 新增 8 种标准丹药（即服即加）与符箓（限时增益 Buff）· 默认放入储物背包
    const DEFAULT_PILL_FULU_ITEMS = [
      // 丹药 · 回血
      {
        id: 'pill_yangqi',
        name: '养气丹',
        icon: '养',
        slotType: 'pill',
        realmLabel: '练气期丹药',
        tier: 1,
        healHp: 70,
        healMp: 0,
        count: 5,
        desc: '练气期回血丹药 · 药性温和纯正，服用后立即恢复 70 点气血。',
      },
      {
        id: 'pill_guiyuan',
        name: '归元丹',
        icon: '归',
        slotType: 'pill',
        realmLabel: '筑基期丹药',
        tier: 2,
        healHp: 220,
        healMp: 0,
        count: 5,
        desc: '筑基期回血丹药 · 固本培元、生肌续脉，服用后立即恢复 220 点气血。',
      },
      // 丹药 · 回灵力
      {
        id: 'pill_ningling',
        name: '凝灵丹',
        icon: '凝',
        slotType: 'pill',
        realmLabel: '练气期丹药',
        tier: 1,
        healHp: 0,
        healMp: 70,
        count: 5,
        desc: '练气期回灵丹药 · 入口化作清灵之气汇入丹田，服用后立即恢复 70 点灵力。',
      },
      {
        id: 'pill_jumai',
        name: '聚脉丹',
        icon: '聚',
        slotType: 'pill',
        realmLabel: '筑基期丹药',
        tier: 2,
        healHp: 0,
        healMp: 220,
        count: 5,
        desc: '筑基期回灵丹药 · 灵气醇厚绵长，服用后立即恢复 220 点灵力。',
      },
      // 符箓 · 加移速（限时 Buff）
      {
        id: 'fulu_jixing',
        name: '疾行符',
        icon: '疾',
        slotType: 'fulu',
        realmLabel: '练气期符箓',
        tier: 1,
        buffKind: 'speed',
        speedBonus: 0.22,
        duration: 18,
        count: 5,
        desc: '练气期身法符箓 · 激发后身轻如燕，移动速度提升 +22%，持续 18 秒。',
      },
      {
        id: 'fulu_yufeng',
        name: '御风符',
        icon: '风',
        slotType: 'fulu',
        realmLabel: '筑基期符箓',
        tier: 2,
        buffKind: 'speed',
        speedBonus: 0.35,
        duration: 25,
        count: 5,
        desc: '筑基期身法符箓 · 激发后清风托足，移动速度提升 +35%，持续 25 秒。',
      },
      // 符箓 · 加暴击率（限时 Buff）
      {
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
        count: 5,
        desc: '练气期灵瞳符箓 · 激发后洞悉敌隙，暴击率提升 +18%（暴击造成 1.5× 伤害），持续 18 秒。',
      },
      {
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
        count: 5,
        desc: '筑基期锋锐符箓 · 激发后杀伐凌厉，暴击率提升 +30%（暴击造成 1.65× 伤害），持续 25 秒。',
      },
    ];

    // 开局默认啥东西都没有（背包全空、无装备、无功法、0 灵石）；可通过探索采集/青石城交易或 ESC 菜单「作弊」获取
    const BAG_CAPACITY = 48;
    const bagItems = new Array(BAG_CAPACITY).fill(null);
    const TECH_SLOT_CAPACITY = 8;
    const CN_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八'];

    function equipFlyingSwordFromBag(bagIdx) {
      const item = bagItems[bagIdx];
      if (!item || item.slotType !== 'flyingSword') return;
      const prev = equipment.flyingSword;
      equipment.flyingSword = item;
      bagItems[bagIdx] = prev || null;
      selectedBagTarget = { source: 'equip', slot: 'flyingSword' };
      camera.flyingSpeedMul = item.flightSpeedMul || 1.0;
      camera.flightSpeed = item.flightSpeed || 14.5;
      camera.flightBoostSpeed = item.boostSpeed || 21.5;
      camera.flightMaxAGL = item.maxFlightAGL || 22.0;
      if (worldData.treasures) worldData.treasures.syncEquipped(equipment);
      renderBagUI();
    }

    function equipTreasureFromBag(bagIdx, targetSlot) {
      const item = bagItems[bagIdx];
      if (!item || item.slotType !== 'treasure') return;
      const prev = equipment[targetSlot];
      equipment[targetSlot] = item;
      bagItems[bagIdx] = prev || null;
      selectedBagTarget = { source: 'equip', slot: targetSlot };
      if (worldData.treasures) worldData.treasures.syncEquipped(equipment);
      syncTreasureHotbarStructure();
      renderBagUI();
    }

    function equipOutfitFromBag(bagIdx) {
      const item = bagItems[bagIdx];
      if (!item || item.slotType !== 'outfit') return;
      const prev = equipment.outfit;
      equipment.outfit = item;
      bagItems[bagIdx] = prev || null;
      selectedBagTarget = { source: 'equip', slot: 'outfit' };
      if (XW.Outfits) XW.Outfits.applyOutfitToProtagonist(protagonist, item.id);
      renderBagUI();
    }

    function unequipSlotToBag(slotKey) {
      const eq = equipment[slotKey];
      if (!eq) return;
      const emptyIdx = bagItems.findIndex((x) => x === null);
      if (emptyIdx < 0) return;
      bagItems[emptyIdx] = eq;
      equipment[slotKey] = null;
      selectedBagTarget = { source: 'grid', index: emptyIdx };
      if (slotKey === 'outfit' && XW.Outfits) {
        XW.Outfits.applyOutfitToProtagonist(protagonist, null);
      }
      if (slotKey === 'flyingSword') {
        camera.flyingSpeedMul = 1.0;
        camera.flightSpeed = 14.5;
        camera.flightBoostSpeed = 21.5;
        camera.flightMaxAGL = 22.0;
        if (camera.flying) camera.setFlying(false, true);
      }
      if (worldData.treasures) worldData.treasures.syncEquipped(equipment);
      syncTreasureHotbarStructure();
      renderBagUI();
    }

    function renderBagUI() {
      if (!bagEquipListEl || !bagGridEl) return;
      // 1. Render 6 Left Equipment Slots (including 飞剑!)
      const slotKeys = ['outfit', 'flyingSword', 'treasure1', 'treasure2', 'fulu', 'pill'];
      bagEquipListEl.innerHTML = '';
      for (const sKey of slotKeys) {
        const eq = equipment[sKey];
        const isSel = selectedBagTarget && selectedBagTarget.source === 'equip' && selectedBagTarget.slot === sKey;
        const div = document.createElement('div');
        div.className = 'equip-slot' + (isSel ? ' selected' : '');
        div.setAttribute('data-equip-slot', sKey);
        div.innerHTML = `
          <span class="equip-slot-tag">${SLOT_LABELS[sKey]}</span>
          <div class="equip-slot-box">
            <span class="equip-item-icon">${eq ? eq.icon : '空'}</span>
            <div class="equip-item-meta">
              <span class="equip-item-name">${eq ? eq.name : '未装备'}</span>
              <span class="equip-item-desc">${eq ? (eq.wearDesc || eq.desc) : '当前槽位为空'}</span>
            </div>
          </div>
        `;
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedBagTarget = { source: 'equip', slot: sKey };
          renderBagUI();
        });
        bagEquipListEl.appendChild(div);
      }

      // 2. Render 24 Right Inventory Grid Cells
      let usedCount = 0;
      bagGridEl.innerHTML = '';
      for (let i = 0; i < BAG_CAPACITY; i++) {
        const it = bagItems[i];
        if (it) usedCount++;
        const isSel = selectedBagTarget && selectedBagTarget.source === 'grid' && selectedBagTarget.index === i;
        const cell = document.createElement('div');
        cell.className = 'bag-cell' + (it ? '' : ' empty') + (isSel ? ' selected' : '');
        cell.setAttribute('data-bag-idx', String(i));
        if (it) {
          const tagCls = it.slotType === 'skill_book' ? 'skill_book'
            : (it.slotType === 'building' ? 'building'
            : (it.slotType === 'pill' ? 'pill'
            : (it.slotType === 'fulu' ? 'fulu'
            : (it.slotType === 'flyingSword' ? 'sword'
            : (it.slotType === 'monster_loot' ? 'monster_loot'
            : (it.slotType === 'stone' ? 'stone'
            : (it.slotType === 'ore' ? 'ore'
            : (it.slotType === 'herb' ? 'herb'
            : (it.slotType === 'outfit' ? 'outfit' : (it.category === 'attack' ? 'atk' : 'def'))))))))));
          const tagText = it.slotType === 'skill_book' ? '书'
            : (it.slotType === 'building' ? '建'
            : (it.slotType === 'pill' ? '丹'
            : (it.slotType === 'fulu' ? '符'
            : (it.slotType === 'flyingSword' ? '剑'
            : (it.slotType === 'monster_loot' ? '妖'
            : (it.slotType === 'stone' ? '石'
            : (it.slotType === 'ore' ? '矿'
            : (it.slotType === 'herb' ? '药'
            : (it.slotType === 'outfit' ? '服' : (it.category === 'attack' ? '攻' : '防'))))))))));
          const countBadge = it.count && it.count > 1 ? `<span class="bag-cell-count">×${it.count}</span>` : '';
          cell.innerHTML = `
            <span class="bag-cell-tag ${tagCls}">${tagText}</span>
            <div class="bag-cell-icon">${it.icon}</div>
            <span class="bag-cell-name">${it.name}</span>
            ${countBadge}
          `;
        }
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedBagTarget = { source: 'grid', index: i };
          renderBagUI();
        });
        bagGridEl.appendChild(cell);
      }
      if (bagCountLabel) {
        bagCountLabel.textContent = `已用 ${usedCount} / ${BAG_CAPACITY} 格`;
      }
      const bagStoneEl = document.getElementById('bag-stone-label');
      if (bagStoneEl) {
        bagStoneEl.textContent = `低阶灵石：${Math.floor(vitals.spiritStones || 0)}`;
      }

      // 3. Update Detail Footer & Equip/Unequip Buttons
      if (bagActionBtn) bagActionBtn.classList.add('hidden');
      if (bagActionBtn2) bagActionBtn2.classList.add('hidden');
      if (!selectedBagTarget) {
        bagDetailName.textContent = '点击行囊物品或左侧装备槽查看详情';
        bagDetailDesc.textContent = usedCount === 0
          ? '当前行囊为空，可采集灵药、开采灵矿、斩杀妖兽或前往青石城商铺买卖获取'
          : '点击行囊物品可装备、服用、放置建筑；前往青石城商铺还可出售材料换取低阶灵石';
      } else if (selectedBagTarget.source === 'grid') {
        const it = bagItems[selectedBagTarget.index];
        if (!it) {
          bagDetailName.textContent = `行囊第 ${selectedBagTarget.index + 1} 格 · 空`;
          bagDetailDesc.textContent = '当前行囊格子为空';
        } else if (it.slotType === 'skill_book') {
          bagDetailName.textContent = `${it.name} [武技秘籍]`;
          bagDetailDesc.textContent = it.desc;
          if (bagActionBtn) {
            bagActionBtn.textContent = '研习使用';
            bagActionBtn.classList.remove('hidden');
          }
        } else if (it.slotType === 'building') {
          bagDetailName.textContent = `${it.name} [${it.categoryLabel || '可放置建筑'}]`;
          bagDetailDesc.textContent = it.desc;
          if (bagActionBtn) {
            bagActionBtn.textContent = '放置建筑';
            bagActionBtn.classList.remove('hidden');
          }
        } else if (it.slotType === 'pill') {
          const pTag = it.realmLabel || '灵丹';
          bagDetailName.textContent = `${it.name}${it.count > 1 ? ` ×${it.count}` : ''} [${pTag}]`;
          bagDetailDesc.textContent = it.desc;
          if (bagActionBtn) {
            bagActionBtn.textContent = '服用丹药';
            bagActionBtn.classList.remove('hidden');
          }
          if (bagActionBtn2) {
            bagActionBtn2.textContent = '装备至战斗丹药';
            bagActionBtn2.classList.remove('hidden');
          }
        } else if (it.slotType === 'fulu') {
          const fTag = it.realmLabel || (it.buffKind ? '灵符' : '福禄法器');
          bagDetailName.textContent = `${it.name}${it.count > 1 ? ` ×${it.count}` : ''} [${fTag}]`;
          bagDetailDesc.textContent = it.desc;
          if (it.buffKind) {
            if (bagActionBtn) {
              bagActionBtn.textContent = '激发符箓';
              bagActionBtn.classList.remove('hidden');
            }
            if (bagActionBtn2) {
              bagActionBtn2.textContent = '装备至福禄';
              bagActionBtn2.classList.remove('hidden');
            }
          } else {
            if (bagActionBtn) {
              bagActionBtn.textContent = '装备至福禄';
              bagActionBtn.classList.remove('hidden');
            }
          }
        } else if (it.slotType === 'flyingSword') {
          bagDetailName.textContent = `${it.name} [${it.gradeLabel || '灵剑'}]`;
          bagDetailDesc.textContent = `${it.desc} ｜ 佩戴：${it.wearDesc}`;
          if (bagActionBtn) {
            bagActionBtn.textContent = '装备飞剑';
            bagActionBtn.classList.remove('hidden');
          }
        } else if (it.slotType === 'herb') {
          const tierTxt = it.tier === 2 ? '二阶灵药' : '一阶灵药';
          const kindTxt = it.isGeneric ? '通用灵药' : `特殊灵药 · ${tierTxt}`;
          bagDetailName.textContent = `${it.name}${it.count > 1 ? ` ×${it.count}` : ''} [${kindTxt}]`;
          bagDetailDesc.textContent = it.desc;
        } else if (it.slotType === 'ore') {
          const tierTxt = it.tier === 2 ? '筑基期矿石' : '练气期矿石';
          bagDetailName.textContent = `${it.name}${it.count > 1 ? ` ×${it.count}` : ''} [${tierTxt}]`;
          bagDetailDesc.textContent = it.desc;
        } else if (it.slotType === 'stone') {
          bagDetailName.textContent = `${it.name}${it.count > 1 ? ` ×${it.count}` : ''} [灵石]`;
          bagDetailDesc.textContent = it.desc;
        } else if (it.slotType === 'monster_loot') {
          const tierTxt = it.tier === 2 ? '二阶妖兽材料' : '一阶妖兽材料';
          bagDetailName.textContent = `${it.name}${it.count > 1 ? ` ×${it.count}` : ''} [${tierTxt}]`;
          bagDetailDesc.textContent = it.desc;
        } else if (it.slotType === 'outfit') {
          bagDetailName.textContent = `${it.name} [${it.elementLabel || '服饰'}]`;
          bagDetailDesc.textContent = it.desc;
          if (bagActionBtn) {
            bagActionBtn.textContent = '穿戴服装';
            bagActionBtn.classList.remove('hidden');
          }
        } else {
          bagDetailName.textContent = `${it.name} [${it.categoryLabel || '法宝'}]`;
          bagDetailDesc.textContent = `${it.desc} ｜ 佩戴：${it.wearDesc}`;
          if (it.slotType === 'treasure') {
            if (bagActionBtn) {
              bagActionBtn.textContent = '装备至法宝1';
              bagActionBtn.classList.remove('hidden');
            }
            if (bagActionBtn2) {
              bagActionBtn2.textContent = '装备至法宝2';
              bagActionBtn2.classList.remove('hidden');
            }
          }
        }
      } else if (selectedBagTarget.source === 'equip') {
        const sKey = selectedBagTarget.slot;
        const eq = equipment[sKey];
        if (!eq) {
          bagDetailName.textContent = `${SLOT_LABELS[sKey]} · 未装备`;
          bagDetailDesc.textContent = sKey === 'outfit'
            ? '点击右侧行囊中的五行服饰即可穿戴至主角身上'
            : (sKey === 'flyingSword'
              ? '点击右侧行囊中的灵剑装备至飞剑栏，按 F 或双击空格即可御剑飞行'
              : (sKey === 'treasure1' || sKey === 'treasure2'
                ? '点击右侧行囊中的攻击/防御法宝即可装配至此栏位'
                : `当前${SLOT_LABELS[sKey]}栏位为空`));
        } else {
          bagDetailName.textContent = `${eq.name} [已装备 · ${SLOT_LABELS[sKey]}]`;
          bagDetailDesc.textContent = eq.wearDesc ? `${eq.desc} ｜ 佩戴：${eq.wearDesc}` : eq.desc;
          if (bagActionBtn) {
            bagActionBtn.textContent = sKey === 'outfit' ? '脱下服装' : (sKey === 'flyingSword' ? '卸下飞剑' : '卸下至行囊');
            bagActionBtn.classList.remove('hidden');
          }
          if (bagActionBtn2 && (sKey === 'pill' || (sKey === 'fulu' && eq.buffKind))) {
            bagActionBtn2.textContent = sKey === 'pill' ? '立即服用' : '立即激发';
            bagActionBtn2.classList.remove('hidden');
          }
        }
      }
    }

    function placeBuildingFromBag(bagIdx) {
      const item = bagItems[bagIdx];
      if (!item || item.slotType !== 'building' || !worldData.furnaces) return;
      const pPos = camera.playerPos || camera.pos;
      const fx = -Math.sin(camera.yaw);
      const fz = -Math.cos(camera.yaw);
      const placeDist = item.id === 'forging_furnace' ? 4.2 : 3.6;
      const tx = pPos[0] + fx * placeDist;
      const tz = pPos[2] + fz * placeDist;
      const groundY = collisionWorld
        ? collisionWorld.getSupportHeight(tx, tz, pPos[1] + 0.35, 0.72, 2.2, (x, z, fy) => T.getWalkableHeight(x, z, fy))
        : T.getWalkableHeight(tx, tz, pPos[1] + 0.35);
      // Furnace front (+Z) faces directly back toward the player when ry = camera.yaw
      const inst = worldData.furnaces.placeFurnace(item.id, tx, groundY, tz, camera.yaw);
      if (!inst) return;
      if (item.count && item.count > 1) {
        item.count -= 1;
      } else {
        bagItems[bagIdx] = null;
        selectedBagTarget = null;
      }
      if (worldData.monsters && worldData.monsters.spawnFloatingText) {
        worldData.monsters.spawnFloatingText(
          tx, groundY + item.height + 0.5, tz,
          `已放置 · ${item.name}`,
          item.id === 'alchemy_furnace' ? '#9cffdf' : '#ffcf94'
        );
      }
      renderBagUI();
      setBagOpen(false);
    }

    function applyPillEffect(item) {
      if (!item || item.slotType !== 'pill') return false;
      const flatHp = item.healHp || 0;
      const flatMp = item.healMp || 0;
      const pctHp = Math.round(vitals.maxHp * (item.healHpPct || 0));
      const pctMp = Math.round(vitals.maxMp * (item.healMpPct || 0));
      const hpAdd = flatHp + pctHp;
      const mpAdd = flatMp + pctMp;
      const expAdd = item.expGain || 0;
      const pPos = camera.playerPos || camera.pos;

      // 防止气血/灵力全满时误服纯回复丹药浪费
      const needHp = hpAdd > 0 && vitals.hp < vitals.maxHp - 0.5;
      const needMp = mpAdd > 0 && vitals.mp < vitals.maxMp - 0.5;
      if (expAdd <= 0 && !needHp && !needMp) {
        if (worldData.monsters && worldData.monsters.spawnFloatingText) {
          const msg = hpAdd > 0 && mpAdd <= 0 ? '气血已满，无需服用' : (mpAdd > 0 && hpAdd <= 0 ? '灵力已满，无需服用' : '气血与灵力均已充盈');
          worldData.monsters.spawnFloatingText(pPos[0], pPos[1] + 2.4, pPos[2], msg, '#d0ece4');
        }
        return false;
      }

      const prevHp = vitals.hp;
      const prevMp = vitals.mp;
      if (hpAdd > 0) vitals.hp = Math.min(vitals.maxHp, vitals.hp + hpAdd);
      if (mpAdd > 0) vitals.mp = Math.min(vitals.maxMp, vitals.mp + mpAdd);
      if (expAdd > 0) gainCultivationExp(expAdd, true);
      const realHp = Math.round(vitals.hp - prevHp);
      const realMp = Math.round(vitals.mp - prevMp);

      if (worldData.monsters && worldData.monsters.spawnFloatingText) {
        const parts = [];
        if (hpAdd > 0) parts.push(`+${realHp > 0 ? realHp : hpAdd}气血`);
        if (mpAdd > 0) parts.push(`+${realMp > 0 ? realMp : mpAdd}灵力`);
        if (expAdd > 0) parts.push(`+${expAdd}修为`);
        const txtCol = mpAdd > 0 && hpAdd <= 0 ? '#86dcff' : '#8cffb8';
        worldData.monsters.spawnFloatingText(pPos[0], pPos[1] + 2.42, pPos[2], `${item.name} ${parts.join(' ')}`, txtCol);
      }
      if (worldData.treasures && worldData.treasures._spawnEffect) {
        worldData.treasures._spawnEffect({
          shape: 'ring',
          x: pPos[0], y: pPos[1] + 0.35, z: pPos[2],
          sx0: 0.45, sy0: 1.0, sz0: 0.45,
          sx1: 2.2, sy1: 1.0, sz1: 2.2,
          life: 0.45,
          col: mpAdd > 0 && hpAdd <= 0 ? [0.38, 0.84, 1.0] : [0.42, 0.96, 0.64],
          alpha: 0.62,
        });
      }
      syncVitalsUI();
      return true;
    }

    function applyFuluEffect(item) {
      if (!item || item.slotType !== 'fulu' || !item.buffKind) return false;
      const pPos = camera.playerPos || camera.pos;
      const dur = item.duration || 18;
      if (item.buffKind === 'speed') {
        const bonus = item.speedBonus || 0.22;
        consumableBuffs.speedTimer = dur;
        consumableBuffs.speedMul = 1.0 + bonus;
        consumableBuffs.speedName = item.name;
        if (worldData.monsters && worldData.monsters.spawnFloatingText) {
          worldData.monsters.spawnFloatingText(
            pPos[0], pPos[1] + 2.45, pPos[2],
            `${item.name} · 移速+${Math.round(bonus * 100)}% (${dur}s)`,
            '#94f6ff'
          );
        }
        if (worldData.treasures && worldData.treasures._spawnEffect) {
          worldData.treasures._spawnEffect({
            shape: 'ring',
            x: pPos[0], y: pPos[1] + 0.25, z: pPos[2],
            sx0: 0.5, sy0: 1.0, sz0: 0.5,
            sx1: 2.8, sy1: 1.0, sz1: 2.8,
            life: 0.48,
            col: [0.54, 0.96, 1.0],
            alpha: 0.68,
          });
        }
      } else if (item.buffKind === 'crit') {
        const rate = item.critRate || 0.18;
        const mul = item.critMul || 1.5;
        consumableBuffs.critTimer = dur;
        consumableBuffs.critRate = rate;
        consumableBuffs.critMul = mul;
        consumableBuffs.critName = item.name;
        playerCritState.rate = rate;
        playerCritState.mul = mul;
        if (worldData.monsters && worldData.monsters.spawnFloatingText) {
          worldData.monsters.spawnFloatingText(
            pPos[0], pPos[1] + 2.45, pPos[2],
            `${item.name} · 暴击+${Math.round(rate * 100)}% (${dur}s)`,
            '#ff9e5e'
          );
        }
        if (worldData.treasures && worldData.treasures._spawnEffect) {
          worldData.treasures._spawnEffect({
            shape: 'ring',
            x: pPos[0], y: pPos[1] + 0.95, z: pPos[2],
            sx0: 0.5, sy0: 1.0, sz0: 0.5,
            sx1: 2.9, sy1: 1.0, sz1: 2.9,
            life: 0.48,
            col: [1.0, 0.52, 0.22],
            alpha: 0.70,
          });
        }
      }
      syncSkillHotbarLive();
      return true;
    }

    function consumePillFromBag(bagIdx) {
      const item = bagItems[bagIdx];
      if (!item || item.slotType !== 'pill') return;
      if (!applyPillEffect(item)) return;
      if (item.count && item.count > 1) {
        item.count -= 1;
      } else {
        bagItems[bagIdx] = null;
        selectedBagTarget = null;
      }
      renderBagUI();
    }

    function useFuluFromBag(bagIdx) {
      const item = bagItems[bagIdx];
      if (!item || item.slotType !== 'fulu' || !item.buffKind) return;
      if (!applyFuluEffect(item)) return;
      if (item.count && item.count > 1) {
        item.count -= 1;
      } else {
        bagItems[bagIdx] = null;
        selectedBagTarget = null;
      }
      renderBagUI();
    }

    function useEquippedConsumable(slotKey) {
      const eq = equipment[slotKey];
      if (!eq) return;
      let ok = false;
      if (slotKey === 'pill' && eq.slotType === 'pill') {
        ok = applyPillEffect(eq);
      } else if (slotKey === 'fulu' && eq.slotType === 'fulu' && eq.buffKind) {
        ok = applyFuluEffect(eq);
      }
      if (!ok) return;
      if (eq.count && eq.count > 1) {
        eq.count -= 1;
      } else {
        equipment[slotKey] = null;
      }
      renderBagUI();
    }

    function equipSimpleSlotFromBag(bagIdx, targetSlot) {
      const item = bagItems[bagIdx];
      if (!item) return;
      const prev = equipment[targetSlot];
      if (item.count && item.count > 1) {
        if (prev) {
          if (!addItemToBag(prev)) return;
        }
        item.count -= 1;
        equipment[targetSlot] = Object.assign({}, item, { count: 1 });
      } else {
        equipment[targetSlot] = item;
        bagItems[bagIdx] = prev || null;
      }
      selectedBagTarget = { source: 'equip', slot: targetSlot };
      renderBagUI();
    }

    function useSkillBookFromBag(bagIdx) {
      const it = bagItems[bagIdx];
      if (!it || it.slotType !== 'skill_book' || !worldData.skills) return;
      const skSys = worldData.skills;
      const already = skSys.isSkillLearned(it.skillId);
      skSys.learnSkill(it.skillId);
      if (it.element) {
        const elIdx = skSys.elements.findIndex((e) => e.key === it.element);
        if (elIdx >= 0) skSys.elementIndex = elIdx;
      }
      if (!skSys.equippedSkills[0]) {
        skSys.equipSkillToSlot(0, it.skillId);
      }
      if (it.count && it.count > 1) it.count -= 1;
      else {
        bagItems[bagIdx] = null;
        selectedBagTarget = null;
      }
      syncSkillHotbarStructure();
      renderBagUI();
      if (skillOpen) renderSkillUI();
      const pPos = camera.playerPos || camera.pos;
      if (worldData.monsters && pPos) {
        worldData.monsters.spawnFloatingText(
          pPos[0], pPos[1] + 2.45, pPos[2],
          already ? `温故知新 · 已掌握【${it.skillName}】` : `研习成功 · 习得【${it.skillName}】！`,
          '#98f6ff'
        );
      }
    }

    if (bagActionBtn) {
      bagActionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!selectedBagTarget) return;
        if (selectedBagTarget.source === 'grid') {
          const it = bagItems[selectedBagTarget.index];
          if (!it) return;
          if (it.slotType === 'skill_book') {
            useSkillBookFromBag(selectedBagTarget.index);
          } else if (it.slotType === 'outfit') {
            equipOutfitFromBag(selectedBagTarget.index);
          } else if (it.slotType === 'building') {
            placeBuildingFromBag(selectedBagTarget.index);
          } else if (it.slotType === 'pill') {
            consumePillFromBag(selectedBagTarget.index);
          } else if (it.slotType === 'fulu') {
            if (it.buffKind) {
              useFuluFromBag(selectedBagTarget.index);
            } else {
              equipSimpleSlotFromBag(selectedBagTarget.index, 'fulu');
            }
          } else if (it.slotType === 'flyingSword') {
            equipFlyingSwordFromBag(selectedBagTarget.index);
          } else if (it.slotType === 'treasure') {
            equipTreasureFromBag(selectedBagTarget.index, 'treasure1');
          }
        } else if (selectedBagTarget.source === 'equip') {
          unequipSlotToBag(selectedBagTarget.slot);
        }
      });
    }
    if (bagActionBtn2) {
      bagActionBtn2.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!selectedBagTarget) return;
        if (selectedBagTarget.source === 'grid') {
          const it = bagItems[selectedBagTarget.index];
          if (!it) return;
          if (it.slotType === 'pill') {
            equipSimpleSlotFromBag(selectedBagTarget.index, 'pill');
          } else if (it.slotType === 'fulu') {
            equipSimpleSlotFromBag(selectedBagTarget.index, 'fulu');
          } else if (it.slotType === 'treasure') {
            equipTreasureFromBag(selectedBagTarget.index, 'treasure2');
          }
        } else if (selectedBagTarget.source === 'equip') {
          useEquippedConsumable(selectedBagTarget.slot);
        }
      });
    }

    function renderSkillUI() {
      if (!xinfaListEl || !wujiListEl || !worldData.skills) return;
      const skSys = worldData.skills;
      const curRealm = CULTIVATION_REALMS[vitals.realmIdx] || CULTIVATION_REALMS[0];
      const playerMajor = curRealm.major || 'lianqi';

      // =======================================================
      // 1. LEFT COLUMN: 心法 (2 Equipped Active Slots + 8 Xinfa · 须习得且满足境界)
      // =======================================================
      xinfaListEl.className = 'xinfa-col-wrap';
      xinfaListEl.innerHTML = '';

      const eqXinfa = skSys.equippedXinfa || [null, null];
      const eqCount = eqXinfa.filter(Boolean).length;
      if (activeXinfaLabel) {
        activeXinfaLabel.textContent = `已习得 ${skSys.learnedXinfa.size} / ${skSys.xinfaDefs.length} · 已装配 ${eqCount} / 2`;
      }

      // Top 2 Equipped Xinfa Slots Bar
      const xfSlotBar = document.createElement('div');
      xfSlotBar.className = 'equipped-slots-bar';
      for (let sIdx = 0; sIdx < 2; sIdx++) {
        const xf = eqXinfa[sIdx];
        const card = document.createElement('div');
        card.className = 'loadout-slot-card' + (xf ? ' filled' : '');
        const bonusTxt = xf ? (xf.bonusText || xf.statValueText || '') : '';
        card.innerHTML = `
          <div class="loadout-slot-top">
            <span class="loadout-slot-tag">心法栏${CN_NUMS[sIdx]}</span>
            ${xf ? `<button type="button" class="mini-slot-btn unequip-btn" data-unequip-xinfa="${sIdx}">卸下</button>` : ''}
          </div>
          <span class="loadout-slot-name" style="color:${xf ? xf.colorCss : 'rgba(196,222,216,0.58)'}">${xf ? xf.name : '未装配'}</span>
          <span class="loadout-slot-sub">${xf ? `${xf.realmLabel} · ${bonusTxt}` : '在青石城藏经阁习得后可装配'}</span>
        `;
        const unBtn = card.querySelector('button[data-unequip-xinfa]');
        if (unBtn) {
          unBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            skSys.equipXinfa(sIdx, null);
            recalcPlayerStats(false);
            renderSkillUI();
          });
        }
        xfSlotBar.appendChild(card);
      }
      xinfaListEl.appendChild(xfSlotBar);

      // Group 8 Xinfa by 练气期心法 and 筑基期心法
      const xinfaGroups = [
        { realm: 'lianqi', title: '练气期心法（四门 · 须习得后装配生效）', color: '#9cf6dc' },
        { realm: 'zhuji',  title: '筑基期心法（四门 · 须突破筑基并习得方可使用）', color: '#ffdf92' },
      ];
      for (const g of xinfaGroups) {
        const grp = document.createElement('div');
        grp.className = 'wuji-elem-group';
        grp.innerHTML = `
          <div class="wuji-elem-head">
            <span class="wuji-elem-title" style="color:${g.color}">${g.title}</span>
          </div>
        `;
        const list = (skSys.xinfaDefs || []).filter((x) => x.realm === g.realm);
        for (const xf of list) {
          const learned = skSys.isXinfaLearned(xf.id);
          const realmLocked = xf.realm === 'zhuji' && playerMajor !== 'zhuji';
          const inSlot0 = eqXinfa[0] && eqXinfa[0].id === xf.id;
          const inSlot1 = eqXinfa[1] && eqXinfa[1].id === xf.id;
          const bonusTxt = xf.bonusText || xf.statValueText || '';
          const item = document.createElement('div');
          item.className = 'wuji-skill-item' + (!learned || realmLocked ? ' locked-item' : '');
          let actionHtml = '';
          if (!learned) {
            actionHtml = `<span class="skill-lock-badge">未习得 · 前往青石城藏经阁购买</span>`;
          } else if (realmLocked) {
            actionHtml = `<span class="skill-lock-badge realm-warn">已习得 · 需突破至筑基期方可装配</span>`;
          } else {
            actionHtml = `
              <button type="button" class="mini-slot-btn ${inSlot0 ? 'active-equipped' : ''}" data-xf-slot="0" data-xf-id="${xf.id}">
                ${inSlot0 ? '已装心法栏一(点击卸下)' : '装配至心法栏一'}
              </button>
              <button type="button" class="mini-slot-btn ${inSlot1 ? 'active-equipped' : ''}" data-xf-slot="1" data-xf-id="${xf.id}">
                ${inSlot1 ? '已装心法栏二(点击卸下)' : '装配至心法栏二'}
              </button>
            `;
          }
          item.innerHTML = `
            <div class="wuji-skill-top">
              <span class="wuji-skill-name" style="color:${xf.colorCss}">[${xf.statLabel}] ${xf.name}</span>
              <span class="wuji-skill-stats">${bonusTxt}</span>
            </div>
            <span class="wuji-skill-desc">${xf.desc}</span>
            <div class="wuji-skill-actions">${actionHtml}</div>
          `;
          const btns = item.querySelectorAll('button[data-xf-slot]');
          for (const b of btns) {
            b.addEventListener('click', (e) => {
              e.stopPropagation();
              const targetSlot = Number(b.getAttribute('data-xf-slot'));
              const id = b.getAttribute('data-xf-id');
              const curInSlot = eqXinfa[targetSlot] && eqXinfa[targetSlot].id === id;
              skSys.equipXinfa(targetSlot, curInSlot ? null : id);
              recalcPlayerStats(false);
              renderSkillUI();
            });
          }
          grp.appendChild(item);
        }
        xinfaListEl.appendChild(grp);
      }

      // =======================================================
      // 2. RIGHT COLUMN: 武技 (1普攻格子 + 2技能格子 · 须先习得且满足境界要求)
      // =======================================================
      wujiListEl.className = 'wuji-elem-list';
      wujiListEl.innerHTML = '';

      const eqSkills = skSys.equippedSkills || [null, null, null];
      if (activeWujiLabel) {
        activeWujiLabel.textContent = `已习得 ${skSys.learnedSkills.size} / ${skSys.allSkills.length} · 已装配 ${eqSkills.filter(Boolean).length} / 3`;
      }

      // Top 3 Equipped Wuji Slots Bar: [普攻格子] [技能格子一(Q)] [技能格子二(E)]
      const wjSlotBar = document.createElement('div');
      wjSlotBar.className = 'equipped-slots-bar wuji-three-slots';
      const wjSlotTitles = ['普攻格子 (左键/J)', '技能格一 (Q)', '技能格二 (E)'];
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const sk = skSys.getSkillBySlot(sIdx);
        const card = document.createElement('div');
        card.className = 'loadout-slot-card' + (sk ? ' filled' : '');
        const rTag = sk && sk.realm === 'zhuji' ? '筑基' : '练气';
        const castModeTxt = sk
          ? (sIdx === 0 ? '准星全向攻击' : (skSys.isDashSkill && skSys.isDashSkill(sk) ? '待激发·面朝位移' : '点击直接触发'))
          : '藏经阁习得后装配';
        card.innerHTML = `
          <div class="loadout-slot-top">
            <span class="loadout-slot-tag">${wjSlotTitles[sIdx]}</span>
            ${sk ? `<button type="button" class="mini-slot-btn unequip-btn" data-unequip-wuji="${sIdx}">卸下</button>` : ''}
          </div>
          <span class="loadout-slot-name" style="color:${sk ? (sk.colorCss || '#f4faf8') : 'rgba(196,222,216,0.58)'}">${sk ? sk.name : '未装配'}</span>
          <span class="loadout-slot-sub">${sk ? `[${rTag}·${sk.elementName || ''}] ${castModeTxt}` : castModeTxt}</span>
        `;
        const unBtn = card.querySelector('button[data-unequip-wuji]');
        if (unBtn) {
          unBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            skSys.equipSkillToSlot(sIdx, null);
            syncSkillHotbarStructure();
            renderSkillUI();
          });
        }
        wjSlotBar.appendChild(card);
      }
      wujiListEl.appendChild(wjSlotBar);

      // Render all 5 elements' martial skills with learned + realm gating
      for (const el of skSys.elements) {
        const allSk = el.skills.concat(el.zhujiSkills || []);
        const hasAnyUsable = allSk.some((s) => skSys.canUseSkill(s));
        const grp = document.createElement('div');
        grp.className = 'wuji-elem-group';
        grp.innerHTML = `
          <div class="wuji-elem-head">
            <span class="wuji-elem-title" style="color:${el.colorCss}">${el.name} · 五行武技（须习得后装配）</span>
            ${hasAnyUsable ? `<button type="button" class="mini-slot-btn" data-select-elem="${el.key}">一键套用已学本系</button>` : ''}
          </div>
        `;
        for (const sk of allSk) {
          const isBasic = sk.slot === 'basic' || sk.slot === 0;
          const learned = skSys.isSkillLearned(sk.id);
          const realmLocked = sk.realm === 'zhuji' && playerMajor !== 'zhuji';
          const mpText = sk.mpCost > 0 ? `耗灵 ${sk.mpCost}` : '免耗';
          const dmgText = sk.dmgPct > 0
            ? `${Math.round(sk.dmgPct * 100)}%攻击(≈${Math.round((vitals.atk || 10) * sk.dmgPct)}) · `
            : (sk.shieldPct ? `护盾 ${Math.round(sk.shieldPct * 100)}%气血 · ` : (sk.healInstantPct ? `回血 ${Math.round((sk.healInstantPct + (sk.healOverTimePct || 0)) * 100)}%气血 · ` : ''));
          const realmTag = sk.realm === 'zhuji' ? '[筑基]' : '[练气]';
          const inSlot0 = eqSkills[0] && eqSkills[0].id === sk.id;
          const inSlot1 = eqSkills[1] && eqSkills[1].id === sk.id;
          const inSlot2 = eqSkills[2] && eqSkills[2].id === sk.id;
          const aimTag = isBasic
            ? '准星360°全向'
            : (skSys.isDashSkill && skSys.isDashSkill(sk) ? '待激发·面朝位移' : '点击直接触发');

          let actionHtml = '';
          if (!learned) {
            actionHtml = `<span class="skill-lock-badge">未习得 · 前往青石城藏经阁购买</span>`;
          } else if (realmLocked) {
            actionHtml = `<span class="skill-lock-badge realm-warn">已习得 · 需突破至筑基期方可装配使用</span>`;
          } else if (isBasic) {
            actionHtml = `<button type="button" class="mini-slot-btn ${inSlot0 ? 'active-equipped' : ''}" data-equip-wuji-slot="0" data-skill-id="${sk.id}">
              ${inSlot0 ? '当前普攻格' : '装配至普攻格 (左键/J)'}
            </button>`;
          } else {
            actionHtml = `
              <button type="button" class="mini-slot-btn ${inSlot1 ? 'active-equipped' : ''}" data-equip-wuji-slot="1" data-skill-id="${sk.id}">
                ${inSlot1 ? '当前技能格一 (Q)' : '装配至技能格一 (Q)'}
              </button>
              <button type="button" class="mini-slot-btn ${inSlot2 ? 'active-equipped' : ''}" data-equip-wuji-slot="2" data-skill-id="${sk.id}">
                ${inSlot2 ? '当前技能格二 (E)' : '装配至技能格二 (E)'}
              </button>
            `;
          }

          const item = document.createElement('div');
          item.className = 'wuji-skill-item' + (!learned || realmLocked ? ' locked-item' : '');
          item.innerHTML = `
            <div class="wuji-skill-top">
              <span class="wuji-skill-name" style="color:${el.colorCss}">${realmTag} ${isBasic ? '普攻' : '武技'}：${sk.name}</span>
              <span class="wuji-skill-stats">${dmgText}${mpText} · 冷却 ${sk.cd}s · ${aimTag}</span>
            </div>
            <span class="wuji-skill-desc">${sk.desc}</span>
            <div class="wuji-skill-actions">${actionHtml}</div>
          `;
          const eqBtns = item.querySelectorAll('button[data-equip-wuji-slot]');
          for (const b of eqBtns) {
            b.addEventListener('click', (e) => {
              e.stopPropagation();
              const targetSlot = Number(b.getAttribute('data-equip-wuji-slot'));
              const skillId = b.getAttribute('data-skill-id');
              skSys.equipSkillToSlot(targetSlot, skillId);
              syncSkillHotbarStructure();
              renderSkillUI();
            });
          }
          grp.appendChild(item);
        }
        const selBtn = grp.querySelector('button[data-select-elem]');
        if (selBtn) {
          selBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            skSys.setElementByKey(el.key);
            syncSkillHotbarStructure();
            renderSkillUI();
          });
        }
        wujiListEl.appendChild(grp);
      }
    }

    // =========================================================
    // SPIRIT HERB COLLECTING (灵药采集进入背包)
    // =========================================================
    const herbCollectPrompt = document.getElementById('herb-collect-prompt');
    const herbCollectText = document.getElementById('herb-collect-text');
    const doorInteractPrompt = document.getElementById('door-interact-prompt');
    const doorInteractText = document.getElementById('door-interact-text');

    function tryToggleNearbyDoor() {
      if (!worldData.city || gameExited) return false;
      const paused = menuOpen || bagOpen || skillOpen || alchemyOpen || forgingOpen || shopOpen || libraryOpen || (minimap && minimap.isOpen);
      if (paused) return false;
      return worldData.city.toggleNearestDoor(worldData.monsters);
    }
    if (doorInteractPrompt) {
      doorInteractPrompt.addEventListener('click', (e) => {
        e.stopPropagation();
        tryToggleNearbyDoor();
      });
    }

    // =========================================================
    // ALCHEMY FURNACE (独立炼丹界面) & FORGING FURNACE (独立炼器界面)
    // =========================================================
    const furnaceInteractPrompt = document.getElementById('furnace-interact-prompt');
    const furnaceInteractText = document.getElementById('furnace-interact-text');
    const alchemyModal = document.getElementById('alchemy-modal');
    const forgingModal = document.getElementById('forging-modal');
    const alchemyClose = document.getElementById('alchemy-close');
    const forgingClose = document.getElementById('forging-close');
    const alchemyPickupBtn = document.getElementById('alchemy-pickup-btn');
    const forgingPickupBtn = document.getElementById('forging-pickup-btn');
    const alchemyRecipeList = document.getElementById('alchemy-recipe-list');
    const forgingRecipeList = document.getElementById('forging-recipe-list');
    const alchemySelectedIcon = document.getElementById('alchemy-selected-icon');
    const alchemySelectedName = document.getElementById('alchemy-selected-name');
    const alchemySelectedTier = document.getElementById('alchemy-selected-tier');
    const alchemyRealmText = document.getElementById('alchemy-realm-text');
    const alchemyReqText = document.getElementById('alchemy-req-text');
    const alchemyStoneText = document.getElementById('alchemy-stone-text');
    const alchemyEffectText = document.getElementById('alchemy-effect-text');
    const alchemyMpText = document.getElementById('alchemy-mp-text');
    const alchemyStatusMsg = document.getElementById('alchemy-status-msg');
    const alchemyCraftBtn = document.getElementById('alchemy-craft-btn');
    const forgingSelectedIcon = document.getElementById('forging-selected-icon');
    const forgingSelectedName = document.getElementById('forging-selected-name');
    const forgingSelectedTier = document.getElementById('forging-selected-tier');
    const forgingRealmText = document.getElementById('forging-realm-text');
    const forgingReqText = document.getElementById('forging-req-text');
    const forgingStoneText = document.getElementById('forging-stone-text');
    const forgingEffectText = document.getElementById('forging-effect-text');
    const forgingMpText = document.getElementById('forging-mp-text');
    const forgingStatusMsg = document.getElementById('forging-status-msg');
    const forgingCraftBtn = document.getElementById('forging-craft-btn');

    let selectedAlchemyRecipeIdx = 0;
    let selectedForgingRecipeIdx = 0;

    function countMatchingBagMaterials(req) {
      let total = 0;
      for (let i = 0; i < bagItems.length; i++) {
        const it = bagItems[i];
        if (!it || it.slotType !== req.slotType) continue;
        if (req.minTier && (it.tier || 1) < req.minTier) continue;
        total += (it.count || 1);
      }
      return total;
    }

    function consumeMatchingBagMaterials(reqs) {
      for (const req of reqs) {
        if (countMatchingBagMaterials(req) < req.count) return false;
      }
      for (const req of reqs) {
        let need = req.count;
        for (let i = 0; i < bagItems.length && need > 0; i++) {
          const it = bagItems[i];
          if (!it || it.slotType !== req.slotType) continue;
          if (req.minTier && (it.tier || 1) < req.minTier) continue;
          const have = it.count || 1;
          if (have > need) {
            it.count = have - need;
            need = 0;
          } else {
            need -= have;
            bagItems[i] = null;
          }
        }
      }
      return true;
    }

    function resolveCraftOutput(rec) {
      if (!rec) return null;
      if (rec.outputRef && XW.Treasures) {
        const ref = rec.outputRef;
        const map = ref.kind === 'flyingSword' ? XW.Treasures.FLYING_SWORD_MAP : XW.Treasures.TREASURE_MAP;
        const def = map ? map[ref.id] : null;
        if (def) return Object.assign({}, def);
      }
      if (rec.output) return Object.assign({}, rec.output);
      return null;
    }

    function renderCraftModal(kind, customMsg = null, msgCls = '') {
      const isAlch = kind === 'alchemy';
      const recipes = XW.Furnaces
        ? (isAlch ? XW.Furnaces.ALCHEMY_RECIPES : XW.Furnaces.FORGING_RECIPES)
        : [];
      const listEl = isAlch ? alchemyRecipeList : forgingRecipeList;
      const iconEl = isAlch ? alchemySelectedIcon : forgingSelectedIcon;
      const nameEl = isAlch ? alchemySelectedName : forgingSelectedName;
      const tierEl = isAlch ? alchemySelectedTier : forgingSelectedTier;
      const realmEl = isAlch ? alchemyRealmText : forgingRealmText;
      const reqEl = isAlch ? alchemyReqText : forgingReqText;
      const stoneEl = isAlch ? alchemyStoneText : forgingStoneText;
      const effEl = isAlch ? alchemyEffectText : forgingEffectText;
      const mpEl = isAlch ? alchemyMpText : forgingMpText;
      const msgEl = isAlch ? alchemyStatusMsg : forgingStatusMsg;
      const btnEl = isAlch ? alchemyCraftBtn : forgingCraftBtn;
      if (!listEl || recipes.length === 0) return;

      const curR = CULTIVATION_REALMS[vitals.realmIdx] || CULTIVATION_REALMS[0];
      const playerMajor = curR.major || 'lianqi';
      const selIdx = M.clamp(isAlch ? selectedAlchemyRecipeIdx : selectedForgingRecipeIdx, 0, recipes.length - 1);
      if (isAlch) selectedAlchemyRecipeIdx = selIdx;
      else selectedForgingRecipeIdx = selIdx;

      listEl.innerHTML = '';
      for (let i = 0; i < recipes.length; i++) {
        const r = recipes[i];
        const locked = r.requiredRealm === 'zhuji' && playerMajor !== 'zhuji';
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'craft-recipe-item'
          + (i === selIdx ? ` selected ${kind}` : '')
          + (locked ? ' realm-locked' : '');
        const lockBadge = r.requiredRealm === 'zhuji'
          ? `<span class="craft-realm-tag">${locked ? '需筑基' : '筑基'}</span>`
          : '';
        card.innerHTML = `
          <span class="craft-recipe-icon">${r.icon}</span>
          <div class="craft-recipe-meta">
            <span class="craft-recipe-name">${r.name}${lockBadge}</span>
            <span class="craft-recipe-sub">${r.tierLabel} · ${r.stoneCost || 0}灵石 · ${r.mpCost}灵力</span>
          </div>
        `;
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isAlch) selectedAlchemyRecipeIdx = i;
          else selectedForgingRecipeIdx = i;
          renderCraftModal(kind);
        });
        listEl.appendChild(card);
      }

      const rec = recipes[selIdx];
      const realmLocked = rec.requiredRealm === 'zhuji' && playerMajor !== 'zhuji';
      const stoneNeed = rec.stoneCost || 0;
      const stoneHave = Math.floor(vitals.spiritStones || 0);
      if (iconEl) iconEl.textContent = rec.icon;
      if (nameEl) nameEl.textContent = rec.name;
      if (tierEl) tierEl.textContent = rec.tierLabel;
      if (realmEl) {
        realmEl.textContent = rec.requiredRealm === 'zhuji'
          ? (realmLocked ? '筑基期及以上（当前练气期 · 无法制作）' : '筑基期及以上（已达标）')
          : '练气期及以上（已达标）';
        realmEl.style.color = realmLocked ? '#ffab88' : '#a6f6d4';
      }
      if (stoneEl) {
        stoneEl.textContent = `${stoneHave} / 需 ${stoneNeed} 低阶灵石`;
        stoneEl.style.color = stoneHave >= stoneNeed ? '#9ae6ff' : '#ffab88';
      }
      if (effEl) effEl.textContent = rec.effectText;
      if (mpEl) mpEl.textContent = `${Math.floor(vitals.mp)} / ${Math.ceil(vitals.maxMp)}（需 ${rec.mpCost}）`;

      let hasMaterials = true;
      if (reqEl) {
        if (!rec.reqs || rec.reqs.length === 0) {
          reqEl.textContent = rec.reqText;
        } else {
          const parts = rec.reqs.map((rq) => {
            const have = countMatchingBagMaterials(rq);
            if (have < rq.count) hasMaterials = false;
            return `${rq.label} ${have}/${rq.count}`;
          });
          reqEl.textContent = parts.join(' ＋ ');
        }
      }
      const canCraft = !realmLocked && hasMaterials && stoneHave >= stoneNeed && vitals.mp >= rec.mpCost;
      if (btnEl) {
        btnEl.disabled = !canCraft;
        btnEl.classList.toggle('disabled', !canCraft);
      }
      if (msgEl) {
        msgEl.className = 'craft-status-msg' + (msgCls ? ` ${msgCls}` : '');
        if (customMsg) {
          msgEl.textContent = customMsg;
        } else if (realmLocked) {
          msgEl.textContent = `境界不足：练气期无法${isAlch ? '炼制' : '锻造'}筑基期配方，请先突破至筑基期！`;
        } else if (stoneHave < stoneNeed) {
          msgEl.textContent = `低阶灵石不足（需 ${stoneNeed} 枚，当前 ${stoneHave} 枚），可开采灵矿、斩杀妖兽或前往青石城出售材料获取。`;
        } else if (vitals.mp < rec.mpCost) {
          msgEl.textContent = `灵力不足（需 ${rec.mpCost} 点灵力），稍作调息即可开炉。`;
        } else if (!hasMaterials) {
          msgEl.textContent = isAlch
            ? '背包中所需灵药或妖兽材料不足，可前往野外采集或狩猎获取。'
            : '背包中所需灵矿、灵药或妖兽材料不足，可前往野外采集与狩猎获取。';
        } else {
          msgEl.textContent = isAlch
            ? '丹火充盈、灵石与药材齐备，点击「开炉炼丹」即可成丹入囊。'
            : '地火炽烈、灵石与材胚齐备，点击「引火锻造」即可铸器入囊。';
        }
      }
    }

    function executeCraft(kind) {
      if (!XW.Furnaces) return;
      const isAlch = kind === 'alchemy';
      const recipes = isAlch ? XW.Furnaces.ALCHEMY_RECIPES : XW.Furnaces.FORGING_RECIPES;
      const selIdx = isAlch ? selectedAlchemyRecipeIdx : selectedForgingRecipeIdx;
      const rec = recipes[selIdx];
      if (!rec) return;

      const curR = CULTIVATION_REALMS[vitals.realmIdx] || CULTIVATION_REALMS[0];
      if (rec.requiredRealm === 'zhuji' && curR.major !== 'zhuji') {
        renderCraftModal(kind, `境界不足：练气期无法${isAlch ? '炼制' : '锻造'}筑基期物品！`, 'err');
        return;
      }
      const stoneNeed = rec.stoneCost || 0;
      if ((vitals.spiritStones || 0) < stoneNeed) {
        renderCraftModal(kind, `低阶灵石不足，需要 ${stoneNeed} 枚低阶灵石！`, 'err');
        return;
      }
      if (vitals.mp < rec.mpCost) {
        renderCraftModal(kind, `灵力不足，需要 ${rec.mpCost} 点灵力！`, 'err');
        return;
      }
      if (rec.reqs && rec.reqs.length > 0) {
        for (const rq of rec.reqs) {
          if (countMatchingBagMaterials(rq) < rq.count) {
            renderCraftModal(kind, `材料不足：缺少 ${rq.label}！`, 'err');
            return;
          }
        }
      }
      // Resolve output & check bag capacity before consuming
      const outItem = resolveCraftOutput(rec);
      if (!outItem) return;
      const isStackable = outItem.slotType === 'pill' || outItem.slotType === 'fulu' || outItem.slotType === 'building';
      const canStack = isStackable && bagItems.some((x) => x && x.slotType === outItem.slotType && x.id === outItem.id);
      const hasEmpty = bagItems.some((x) => x === null);
      if (!canStack && !hasEmpty) {
        renderCraftModal(kind, '储物背包已满，请先腾出空位！', 'err');
        return;
      }

      if (rec.reqs && rec.reqs.length > 0) {
        consumeMatchingBagMaterials(rec.reqs);
      }
      vitals.spiritStones = Math.max(0, (vitals.spiritStones || 0) - stoneNeed);
      vitals.mp = Math.max(0, vitals.mp - rec.mpCost);
      addItemToBag(outItem);
      syncVitalsUI();

      const outCnt = outItem.count || 1;
      if (activeFurnaceInst && worldData.monsters && worldData.monsters.spawnFloatingText) {
        worldData.monsters.spawnFloatingText(
          activeFurnaceInst.x,
          activeFurnaceInst.y + activeFurnaceInst.def.height + 0.5,
          activeFurnaceInst.z,
          `${isAlch ? '成丹' : '锻成'} · ${outItem.name} ×${outCnt}`,
          isAlch ? '#9dffdf' : '#ffd28e'
        );
      }
      renderCraftModal(
        kind,
        `${isAlch ? '开炉成丹' : '百炼成器'}！消耗 ${stoneNeed} 灵石，获得【${outItem.name} ×${outCnt}】，已存入储物背包。`,
        'ok'
      );
    }

    function closeFurnaceModals() {
      alchemyOpen = false;
      forgingOpen = false;
      activeFurnaceInst = null;
      if (alchemyModal) alchemyModal.classList.add('hidden');
      if (forgingModal) forgingModal.classList.add('hidden');
      syncPauseState();
    }

    function openFurnaceModal(furnaceInst) {
      if (!furnaceInst || gameExited) return;
      if (camera.attackMode) exitAttackMode(true);
      if (worldData.skills && worldData.skills.aimPreview) {
        worldData.skills.cancelAimPreview(camera);
      }
      if (bagOpen) setBagOpen(false);
      if (skillOpen) setSkillOpen(false);
      if (shopOpen || libraryOpen) closeShopModals();
      if (minimap && minimap.isOpen) minimap.setOpen(false);
      if (menuOpen) { menuOpen = false; escMenuModal.classList.add('hidden'); }

      activeFurnaceInst = furnaceInst;
      const isAlch = furnaceInst.id === 'alchemy_furnace';
      alchemyOpen = isAlch;
      forgingOpen = !isAlch;
      if (alchemyModal) alchemyModal.classList.toggle('hidden', !alchemyOpen);
      if (forgingModal) forgingModal.classList.toggle('hidden', !forgingOpen);
      renderCraftModal(isAlch ? 'alchemy' : 'forging');
      syncPauseState();
    }

    function pickupActiveFurnace() {
      if (!activeFurnaceInst || !worldData.furnaces) return;
      const inst = activeFurnaceInst;
      const itemPayload = Object.assign({ count: 1 }, inst.def);
      const added = addItemToBag(itemPayload);
      if (!added) {
        renderCraftModal(inst.id === 'alchemy_furnace' ? 'alchemy' : 'forging', '储物背包已满，无法收回炉鼎！', 'err');
        return;
      }
      worldData.furnaces.removeFurnace(inst.uid);
      if (worldData.monsters && worldData.monsters.spawnFloatingText) {
        worldData.monsters.spawnFloatingText(inst.x, inst.y + 1.8, inst.z, `已收回 · ${inst.def.name}`, '#d0f4ff');
      }
      closeFurnaceModals();
    }

    let activeSpiritPlatform = null;
    let meditateFloatAcc = 0;

    function stopMeditating() {
      if (camera.meditating) {
        camera.setMeditating(false);
      }
      activeSpiritPlatform = null;
      meditateFloatAcc = 0;
      if (worldData.furnaces) worldData.furnaces.activeMeditatingUid = null;
    }

    camera.onExitMeditate = () => {
      activeSpiritPlatform = null;
      meditateFloatAcc = 0;
      if (worldData.furnaces) worldData.furnaces.activeMeditatingUid = null;
    };

    function toggleMeditateOnPlatform(platInst) {
      if (!platInst || gameExited) return;
      if (camera.meditating && activeSpiritPlatform && activeSpiritPlatform.uid === platInst.uid) {
        stopMeditating();
        if (worldData.monsters) {
          worldData.monsters.spawnFloatingText(platInst.x, platInst.y + 2.1, platInst.z, '结束打坐修炼', '#c8f0e8');
        }
        return;
      }
      if (camera.attackMode) exitAttackMode(true);
      if (worldData.skills && worldData.skills.aimPreview) {
        worldData.skills.cancelAimPreview(camera);
      }
      closeFurnaceModals();
      closeShopModals();
      if (bagOpen) setBagOpen(false);
      if (skillOpen) setSkillOpen(false);
      if (minimap && minimap.isOpen) minimap.setOpen(false);
      if (menuOpen) { menuOpen = false; escMenuModal.classList.add('hidden'); }

      activeSpiritPlatform = platInst;
      meditateFloatAcc = 0;
      if (worldData.furnaces) worldData.furnaces.activeMeditatingUid = platInst.uid;
      const seatY = platInst.y + (platInst.def.seatOffsetY || 0.40);
      camera.setMeditating(true, [platInst.x, seatY, platInst.z], platInst.yaw || 0.0);
      if (worldData.monsters) {
        worldData.monsters.spawnFloatingText(platInst.x, seatY + 2.0, platInst.z, `盘坐${platInst.def.name} · 开始修炼`, '#94ffde');
      }
    }

    function interactWithFurnaceOrPlatform(inst) {
      if (!inst) return;
      if (inst.id === 'spirit_platform_t1') {
        toggleMeditateOnPlatform(inst);
      } else {
        openFurnaceModal(inst);
      }
    }

    if (furnaceInteractPrompt) {
      furnaceInteractPrompt.addEventListener('click', (e) => {
        e.stopPropagation();
        if (camera.meditating && activeSpiritPlatform) {
          toggleMeditateOnPlatform(activeSpiritPlatform);
        } else if (worldData.furnaces && worldData.furnaces.nearestFurnace) {
          interactWithFurnaceOrPlatform(worldData.furnaces.nearestFurnace);
        } else if (worldData.npcs && worldData.npcs.nearestShopNpc) {
          openShopOrLibraryForNpc(worldData.npcs.nearestShopNpc);
        }
      });
    }
    if (alchemyClose) alchemyClose.addEventListener('click', (e) => { e.stopPropagation(); closeFurnaceModals(); });
    if (forgingClose) forgingClose.addEventListener('click', (e) => { e.stopPropagation(); closeFurnaceModals(); });
    if (alchemyModal) alchemyModal.addEventListener('click', (e) => { if (e.target === alchemyModal) closeFurnaceModals(); });
    if (forgingModal) forgingModal.addEventListener('click', (e) => { if (e.target === forgingModal) closeFurnaceModals(); });
    if (alchemyCraftBtn) alchemyCraftBtn.addEventListener('click', (e) => { e.stopPropagation(); executeCraft('alchemy'); });
    if (forgingCraftBtn) forgingCraftBtn.addEventListener('click', (e) => { e.stopPropagation(); executeCraft('forging'); });
    if (alchemyPickupBtn) alchemyPickupBtn.addEventListener('click', (e) => { e.stopPropagation(); pickupActiveFurnace(); });
    if (forgingPickupBtn) forgingPickupBtn.addEventListener('click', (e) => { e.stopPropagation(); pickupActiveFurnace(); });

    // =========================================================
    // QINGSHI CITY MERCHANT SHOP (青石城商人买卖) & LIBRARY PAVILION (藏经阁典籍)
    // =========================================================
    const shopModal = document.getElementById('shop-modal');
    const shopMerchantTitle = document.getElementById('shop-merchant-title');
    const shopMerchantSub = document.getElementById('shop-merchant-sub');
    const shopStoneVal = document.getElementById('shop-stone-val');
    const shopClose = document.getElementById('shop-close');
    const shopTabBuy = document.getElementById('shop-tab-buy');
    const shopTabSell = document.getElementById('shop-tab-sell');
    const shopItemList = document.getElementById('shop-item-list');
    const shopStatusMsg = document.getElementById('shop-status-msg');

    const libraryModal = document.getElementById('library-modal');
    const libraryTitle = document.getElementById('library-title');
    const libraryStoneVal = document.getElementById('library-stone-val');
    const libraryClose = document.getElementById('library-close');
    const libraryFilterTabs = document.getElementById('library-filter-tabs');
    const libraryRealmNote = document.getElementById('library-realm-note');
    const libraryList = document.getElementById('library-list');
    const libraryStatusMsg = document.getElementById('library-status-msg');

    let shopMode = 'buy'; // 'buy' | 'sell'
    let libraryFilter = 'all'; // 'all' | 'xinfa' | 'lianqi_wuji' | 'zhuji_wuji'

    // 商铺商品目录（按品阶与获取难度定价，买价远高于卖价）
    const SHOP_PRICE_BY_ID = {
      alchemy_furnace: 120,
      forging_furnace: 140,
      pill_yangqi: 35,
      pill_ningling: 35,
      pill_linglu: 50,
      pill_guiyuan: 130,
      pill_jumai: 130,
      pill_zhuji_ningyuan: 220,
      fulu_jixing: 40,
      fulu_powang: 48,
      fulu_yufeng: 120,
      fulu_zhane: 140,
      sword_qingfeng: 160,
      sword_liuyun: 420,
      sword_jinghong: 820,
      qingfeng_needle: 220,
      xuangui_shield: 220,
      liehuo_gourd: 460,
      jingang_bell: 460,
      zhenshan_seal: 520,
      liuyun_scarf: 520,
    };

    function buildShopCatalog() {
      const list = [];
      // 1. 可放置建筑：炼丹炉 / 炼器炉
      if (XW.Furnaces && XW.Furnaces.FURNACE_DEFS) {
        for (const f of XW.Furnaces.FURNACE_DEFS) {
          list.push({
            id: f.id,
            category: '丹器炉鼎',
            buyPrice: SHOP_PRICE_BY_ID[f.id] || 130,
            template: Object.assign({ count: 1 }, f),
          });
        }
      }
      // 2. 丹药与符箓
      for (const pf of DEFAULT_PILL_FULU_ITEMS) {
        list.push({
          id: pf.id,
          category: pf.slotType === 'pill' ? '灵丹妙药' : '灵符秘箓',
          buyPrice: SHOP_PRICE_BY_ID[pf.id] || 40,
          template: Object.assign({}, pf, { count: 1 }),
        });
      }
      // 补充炼丹炉特色双回丹药
      if (XW.Furnaces && XW.Furnaces.ALCHEMY_RECIPES) {
        for (const r of XW.Furnaces.ALCHEMY_RECIPES) {
          if (r.id === 'pill_linglu' || r.id === 'pill_zhuji_ningyuan') {
            list.push({
              id: r.output.id,
              category: '灵丹妙药',
              buyPrice: SHOP_PRICE_BY_ID[r.output.id] || 60,
              template: Object.assign({}, r.output, { count: 1 }),
            });
          }
        }
      }
      // 3. 御剑灵剑
      if (XW.Treasures && XW.Treasures.FLYING_SWORD_DEFS) {
        for (const sw of XW.Treasures.FLYING_SWORD_DEFS) {
          list.push({
            id: sw.id,
            category: '御剑飞剑',
            buyPrice: SHOP_PRICE_BY_ID[sw.id] || 200,
            template: Object.assign({}, sw),
          });
        }
      }
      // 4. 攻防法宝
      if (XW.Treasures && XW.Treasures.TREASURE_DEFS) {
        for (const tr of XW.Treasures.TREASURE_DEFS) {
          list.push({
            id: tr.id,
            category: tr.category === 'attack' ? '攻击法宝' : '防御法宝',
            buyPrice: SHOP_PRICE_BY_ID[tr.id] || 300,
            template: Object.assign({}, tr),
          });
        }
      }
      // 5. 五行服饰
      if (XW.Outfits && XW.Outfits.OUTFIT_DEFS) {
        for (const ofd of XW.Outfits.OUTFIT_DEFS) {
          list.push({
            id: ofd.id,
            category: '仙门服饰',
            buyPrice: 180,
            template: Object.assign({}, ofd),
          });
        }
      }
      return list;
    }
    const SHOP_CATALOG = buildShopCatalog();

    function getItemSellPrice(it) {
      if (!it) return 0;
      if (it.slotType === 'herb') return it.tier >= 2 ? 28 : 8;
      if (it.slotType === 'ore') return it.tier >= 2 ? 34 : 10;
      if (it.slotType === 'monster_loot') return it.tier >= 2 ? 48 : 14;
      if (it.slotType === 'outfit') return 45;
      const buyP = SHOP_PRICE_BY_ID[it.id];
      if (buyP) return Math.max(5, Math.floor(buyP * 0.26));
      return it.tier >= 2 ? 24 : 8;
    }

    function getTechniquePrice(kind, def) {
      if (kind === 'xinfa') {
        return def.realm === 'zhuji' ? 480 : 150;
      }
      if (def.realm === 'zhuji') return 360;
      if (def.slot === 'basic' || def.slot === 0) return 60;
      return 100;
    }

    function closeShopModals() {
      shopOpen = false;
      libraryOpen = false;
      activeShopNpc = null;
      if (shopModal) shopModal.classList.add('hidden');
      if (libraryModal) libraryModal.classList.add('hidden');
      syncPauseState();
    }

    function renderShopModal(customMsg = null, msgCls = '') {
      if (!shopItemList) return;
      const stones = Math.floor(vitals.spiritStones || 0);
      if (shopStoneVal) shopStoneVal.textContent = String(stones);
      if (shopTabBuy) shopTabBuy.classList.toggle('active', shopMode === 'buy');
      if (shopTabSell) shopTabSell.classList.toggle('active', shopMode === 'sell');
      if (shopMerchantTitle && activeShopNpc) {
        shopMerchantTitle.textContent = `${activeShopNpc.role} · ${activeShopNpc.name}`;
      }
      if (shopMerchantSub && activeShopNpc) {
        shopMerchantSub.textContent = `青石城正统商铺 · 低阶灵石现款现货，童叟无欺`;
      }

      shopItemList.innerHTML = '';
      if (shopMode === 'buy') {
        for (const entry of SHOP_CATALOG) {
          const tpl = entry.template;
          const canAfford = stones >= entry.buyPrice;
          const isZhuji = (tpl.tier && tpl.tier >= 2) || tpl.grade >= 2 || entry.buyPrice >= 420;
          const row = document.createElement('div');
          row.className = 'shop-row';
          row.innerHTML = `
            <div class="shop-row-left">
              <div class="shop-row-icon">${tpl.icon || '物'}</div>
              <div class="shop-row-info">
                <div class="shop-row-title">
                  <span>${tpl.name}</span>
                  <span class="shop-row-tag ${isZhuji ? 'zhuji-tag' : ''}">${entry.category}</span>
                </div>
                <div class="shop-row-desc">${tpl.desc || ''}</div>
              </div>
            </div>
            <div class="shop-row-right">
              <span class="shop-price-tag">${entry.buyPrice} 灵石</span>
              <button type="button" class="shop-action-btn" ${canAfford ? '' : 'disabled'}>购买</button>
            </div>
          `;
          const btn = row.querySelector('button');
          if (btn) {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              if ((vitals.spiritStones || 0) < entry.buyPrice) {
                renderShopModal(`低阶灵石不足（需 ${entry.buyPrice} 枚）！`, 'err');
                return;
              }
              const itemToAdd = Object.assign({}, tpl);
              const isStack = itemToAdd.slotType === 'pill' || itemToAdd.slotType === 'fulu' || itemToAdd.slotType === 'building';
              const canStack = isStack && bagItems.some((x) => x && x.slotType === itemToAdd.slotType && x.id === itemToAdd.id);
              const hasEmpty = bagItems.some((x) => x === null);
              if (!canStack && !hasEmpty) {
                renderShopModal('储物背包已满，请先出售或腾出空位！', 'err');
                return;
              }
              vitals.spiritStones = Math.max(0, (vitals.spiritStones || 0) - entry.buyPrice);
              addItemToBag(itemToAdd);
              syncVitalsUI();
              renderShopModal(`购入【${itemToAdd.name} ×1】，花费 ${entry.buyPrice} 枚低阶灵石。`, 'ok');
            });
          }
          shopItemList.appendChild(row);
        }
      } else {
        // Sell mode: list all items currently in bagItems
        let sellableCount = 0;
        for (let i = 0; i < bagItems.length; i++) {
          const it = bagItems[i];
          if (!it) continue;
          sellableCount++;
          const unitPrice = getItemSellPrice(it);
          const cnt = it.count || 1;
          const totalPrice = unitPrice * cnt;
          const row = document.createElement('div');
          row.className = 'shop-row';
          row.innerHTML = `
            <div class="shop-row-left">
              <div class="shop-row-icon">${it.icon || '物'}</div>
              <div class="shop-row-info">
                <div class="shop-row-title">
                  <span>${it.name}${cnt > 1 ? ` ×${cnt}` : ''}</span>
                  <span class="shop-row-tag">单价 ${unitPrice} 灵石</span>
                </div>
                <div class="shop-row-desc">${it.desc || ''}</div>
              </div>
            </div>
            <div class="shop-row-right">
              <button type="button" class="shop-action-btn sell-btn" data-sell-one="${i}">卖 1 个 (+${unitPrice})</button>
              ${cnt > 1 ? `<button type="button" class="shop-action-btn sell-btn" data-sell-all="${i}">全卖 (+${totalPrice})</button>` : ''}
            </div>
          `;
          const btnOne = row.querySelector('button[data-sell-one]');
          if (btnOne) {
            btnOne.addEventListener('click', (e) => {
              e.stopPropagation();
              const cur = bagItems[i];
              if (!cur) return;
              const p = getItemSellPrice(cur);
              const nm = cur.name;
              if (cur.count && cur.count > 1) cur.count -= 1;
              else bagItems[i] = null;
              vitals.spiritStones = (vitals.spiritStones || 0) + p;
              syncVitalsUI();
              renderShopModal(`出售【${nm} ×1】，获得 ${p} 枚低阶灵石。`, 'ok');
            });
          }
          const btnAll = row.querySelector('button[data-sell-all]');
          if (btnAll) {
            btnAll.addEventListener('click', (e) => {
              e.stopPropagation();
              const cur = bagItems[i];
              if (!cur) return;
              const q = cur.count || 1;
              const gain = getItemSellPrice(cur) * q;
              const nm = cur.name;
              bagItems[i] = null;
              vitals.spiritStones = (vitals.spiritStones || 0) + gain;
              syncVitalsUI();
              renderShopModal(`出售【${nm} ×${q}】，共获得 ${gain} 枚低阶灵石。`, 'ok');
            });
          }
          shopItemList.appendChild(row);
        }
        if (sellableCount === 0) {
          shopItemList.innerHTML = `<div class="shop-empty-hint">储物背包当前空空如也，可前往野外采集灵药、开采灵矿或斩杀妖兽后再来寄售换取灵石。</div>`;
        }
      }

      if (shopStatusMsg) {
        shopStatusMsg.className = 'craft-status-msg shop-status-bar' + (msgCls ? ` ${msgCls}` : '');
        shopStatusMsg.textContent = customMsg || (shopMode === 'buy'
          ? '选择所需货物点击「购买」，结算后自动存入储物背包。'
          : '选择行囊物品点击「卖 1 个」或「全卖」，即时换取低阶灵石。');
      }
    }

    function renderLibraryModal(customMsg = null, msgCls = '') {
      if (!libraryList || !worldData.skills) return;
      const skSys = worldData.skills;
      const stones = Math.floor(vitals.spiritStones || 0);
      const curR = CULTIVATION_REALMS[vitals.realmIdx] || CULTIVATION_REALMS[0];
      const playerMajor = curR.major || 'lianqi';

      if (libraryStoneVal) libraryStoneVal.textContent = String(stones);
      if (libraryTitle && activeShopNpc) {
        libraryTitle.textContent = `藏经阁 · ${activeShopNpc.name} 掌卷典籍`;
      }
      if (libraryRealmNote) {
        libraryRealmNote.textContent = `当前境界：${curR.label}（已学心法 ${skSys.learnedXinfa.size}/${skSys.xinfaDefs.length} · 武技 ${skSys.learnedSkills.size}/${skSys.allSkills.length}）`;
      }
      if (libraryFilterTabs) {
        const tabs = libraryFilterTabs.querySelectorAll('.shop-tab');
        for (const t of tabs) {
          t.classList.toggle('active', t.getAttribute('data-lib-filter') === libraryFilter);
        }
      }

      const entries = [];
      if (libraryFilter === 'all' || libraryFilter === 'xinfa') {
        for (const xf of skSys.xinfaDefs) {
          entries.push({
            kind: 'xinfa',
            def: xf,
            price: getTechniquePrice('xinfa', xf),
            learned: skSys.isXinfaLearned(xf.id),
            icon: '心',
            title: xf.name,
            realmTag: xf.realm === 'zhuji' ? '筑基心法' : '练气心法',
            isZhuji: xf.realm === 'zhuji',
            meta: `${xf.statLabel} ${xf.bonusText || ''}`,
            desc: xf.desc,
            colorCss: xf.colorCss,
          });
        }
      }
      if (libraryFilter === 'all' || libraryFilter === 'lianqi_wuji' || libraryFilter === 'zhuji_wuji') {
        for (const sk of skSys.allSkills) {
          const isZj = sk.realm === 'zhuji';
          if (libraryFilter === 'lianqi_wuji' && isZj) continue;
          if (libraryFilter === 'zhuji_wuji' && !isZj) continue;
          const isBasic = sk.slot === 'basic' || sk.slot === 0;
          entries.push({
            kind: 'skill',
            def: sk,
            price: getTechniquePrice('skill', sk),
            learned: skSys.isSkillLearned(sk.id),
            icon: isBasic ? '普' : '武',
            title: `${sk.elementName} · ${sk.name}`,
            realmTag: isZj ? '筑基武技' : (isBasic ? '练气普攻' : '练气武技'),
            isZhuji: isZj,
            meta: `${sk.mpCost > 0 ? `耗灵${sk.mpCost}` : '免耗'} · CD ${sk.cd}s`,
            desc: sk.desc,
            colorCss: sk.colorCss,
          });
        }
      }

      libraryList.innerHTML = '';
      for (const en of entries) {
        const canAfford = stones >= en.price;
        const realmWarn = en.isZhuji && playerMajor !== 'zhuji';
        const row = document.createElement('div');
        row.className = 'shop-row' + (en.learned ? ' learned-row' : '');
        row.innerHTML = `
          <div class="shop-row-left">
            <div class="shop-row-icon" style="color:${en.colorCss || '#ffea9c'}">${en.icon}</div>
            <div class="shop-row-info">
              <div class="shop-row-title">
                <span style="color:${en.colorCss || '#f4faf8'}">${en.title}</span>
                <span class="shop-row-tag ${en.isZhuji ? 'zhuji-tag' : ''}">${en.realmTag}</span>
                <span class="shop-row-tag">${en.meta}</span>
                ${en.learned ? `<span class="shop-row-tag learned-tag">已习得</span>` : ''}
                ${realmWarn && !en.learned ? `<span class="shop-row-tag zhuji-tag">购后需筑基方可用</span>` : ''}
              </div>
              <div class="shop-row-desc">${en.desc}</div>
            </div>
          </div>
          <div class="shop-row-right">
            <span class="shop-price-tag">${en.price} 灵石</span>
            <button type="button" class="shop-action-btn" ${en.learned || !canAfford ? 'disabled' : ''}>
              ${en.learned ? '已习得' : '购买习得'}
            </button>
          </div>
        `;
        const btn = row.querySelector('button');
        if (btn && !en.learned) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if ((vitals.spiritStones || 0) < en.price) {
              renderLibraryModal(`低阶灵石不足（需 ${en.price} 枚）！`, 'err');
              return;
            }
            vitals.spiritStones = Math.max(0, (vitals.spiritStones || 0) - en.price);
            let autoEqHint = '';
            if (en.kind === 'xinfa') {
              skSys.learnXinfa(en.def.id);
              if (skSys.canUseXinfa(en.def)) {
                const emptyS = skSys.equippedXinfa.findIndex((x) => !x);
                if (emptyS >= 0) {
                  skSys.equipXinfa(emptyS, en.def.id);
                  recalcPlayerStats(false);
                  autoEqHint = `，并已自动装配至心法栏${CN_NUMS[emptyS]}`;
                }
              }
            } else {
              skSys.learnSkill(en.def.id);
              if (skSys.canUseSkill(en.def)) {
                const isB = en.def.slot === 'basic' || en.def.slot === 0;
                if (isB && !skSys.equippedSkills[0]) {
                  skSys.equipSkillToSlot(0, en.def.id);
                  autoEqHint = '，并已自动装配至普攻格';
                } else if (!isB) {
                  if (!skSys.equippedSkills[1]) {
                    skSys.equipSkillToSlot(1, en.def.id);
                    autoEqHint = '，并已自动装配至技能格一(Q)';
                  } else if (!skSys.equippedSkills[2]) {
                    skSys.equipSkillToSlot(2, en.def.id);
                    autoEqHint = '，并已自动装配至技能格二(E)';
                  }
                }
              }
            }
            syncVitalsUI();
            syncSkillHotbarStructure();
            const zjNote = (en.isZhuji && playerMajor !== 'zhuji') ? '（突破筑基期后即可装配施展）' : '';
            renderLibraryModal(`花费 ${en.price} 灵石，成功习得【${en.title}】${autoEqHint}${zjNote}！`, 'ok');
          });
        }
        libraryList.appendChild(row);
      }

      if (libraryStatusMsg) {
        libraryStatusMsg.className = 'craft-status-msg shop-status-bar' + (msgCls ? ` ${msgCls}` : '');
        libraryStatusMsg.textContent = customMsg || '择定典籍后点击「购买习得」，习得后可按 K 键在功法界面自由装配。';
      }
    }

    function openShopOrLibraryForNpc(npc) {
      if (!npc || gameExited) return;
      if (camera.attackMode) exitAttackMode(true);
      if (worldData.skills && worldData.skills.aimPreview) {
        worldData.skills.cancelAimPreview(camera);
      }
      if (camera.meditating) stopMeditating();
      if (bagOpen) setBagOpen(false);
      if (skillOpen) setSkillOpen(false);
      if (alchemyOpen || forgingOpen) closeFurnaceModals();
      if (minimap && minimap.isOpen) minimap.setOpen(false);
      if (menuOpen) { menuOpen = false; escMenuModal.classList.add('hidden'); }

      activeShopNpc = npc;
      const isLibrary = npc.role === '藏经阁长老';
      libraryOpen = isLibrary;
      shopOpen = !isLibrary;
      if (libraryModal) libraryModal.classList.toggle('hidden', !libraryOpen);
      if (shopModal) shopModal.classList.toggle('hidden', !shopOpen);
      if (isLibrary) {
        renderLibraryModal();
      } else {
        shopMode = 'buy';
        renderShopModal();
      }
      syncPauseState();
    }

    if (shopClose) shopClose.addEventListener('click', (e) => { e.stopPropagation(); closeShopModals(); });
    if (libraryClose) libraryClose.addEventListener('click', (e) => { e.stopPropagation(); closeShopModals(); });
    if (shopModal) shopModal.addEventListener('click', (e) => { if (e.target === shopModal) closeShopModals(); });
    if (libraryModal) libraryModal.addEventListener('click', (e) => { if (e.target === libraryModal) closeShopModals(); });
    if (shopTabBuy) shopTabBuy.addEventListener('click', (e) => { e.stopPropagation(); shopMode = 'buy'; renderShopModal(); });
    if (shopTabSell) shopTabSell.addEventListener('click', (e) => { e.stopPropagation(); shopMode = 'sell'; renderShopModal(); });
    if (libraryFilterTabs) {
      libraryFilterTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.shop-tab');
        if (!btn) return;
        e.stopPropagation();
        libraryFilter = btn.getAttribute('data-lib-filter') || 'all';
        renderLibraryModal();
      });
    }

    function addItemToBag(item) {
      if (!item) return false;
      // 灵石拾取或挖矿直接汇入主角「低阶灵石」货币账户
      if (item.slotType === 'stone') {
        const addAmt = Math.max(1, Math.round(item.count || 1));
        vitals.spiritStones = (vitals.spiritStones || 0) + addAmt;
        syncVitalsUI();
        if (bagOpen) renderBagUI();
        return true;
      }
      if (item.slotType === 'herb' || item.slotType === 'ore' || item.slotType === 'monster_loot' || item.slotType === 'pill' || item.slotType === 'fulu' || item.slotType === 'building') {
        const existing = bagItems.find((x) => x && x.slotType === item.slotType && x.id === item.id);
        if (existing) {
          existing.count = (existing.count || 1) + (item.count || 1);
          if (bagOpen) renderBagUI();
          return true;
        }
      }
      const emptyIdx = bagItems.findIndex((x) => x === null);
      if (emptyIdx < 0) return false;
      bagItems[emptyIdx] = Object.assign({}, item);
      if (bagOpen) renderBagUI();
      return true;
    }
    if (worldData.ores) {
      worldData.ores.onAddBagItem = addItemToBag;
    }
    if (worldData.drops) {
      worldData.drops.onAddBagItem = addItemToBag;
      worldData.drops.monsterSystem = worldData.monsters;
      if (worldData.monsters) {
        worldData.monsters.onMonsterDeath = (m) => {
          worldData.drops.spawnMonsterLoot(m);
          if (m.lastHitByPlayer !== false) {
            gainCultivationExp(m.expReward || (m.spec.realm === '筑基期' ? 110 : 35), true);
          }
        };
      }
    }
    if (worldData.npcs) {
      worldData.npcs.onNpcDeath = (npc) => {
        gainCultivationExp(npc.expReward || (npc.realm === 'zhuji' ? 140 : 48), true);
      };
    }

    function tryCollectNearbyHerb() {
      if (!worldData.herbs || gameExited) return false;
      const paused = menuOpen || bagOpen || skillOpen || alchemyOpen || forgingOpen || shopOpen || libraryOpen || (minimap && minimap.isOpen);
      if (paused) return false;
      const res = worldData.herbs.tryCollectNearest(addItemToBag, worldData.monsters);
      if (res && res.ok) {
        gainCultivationExp(res.def && res.def.tier === 2 ? 22 : 12, false);
        return true;
      }
      return false;
    }

    if (herbCollectPrompt) {
      herbCollectPrompt.addEventListener('click', (e) => {
        e.stopPropagation();
        tryCollectNearbyHerb();
      });
    }

    // =========================================================
    // FIVE-ELEMENT SKILL HOTBAR (底部五行技能栏)
    // =========================================================
    const skillElemRowEl = document.getElementById('skill-elem-row');
    const skillBuffBarEl = document.getElementById('skill-buff-bar');
    const skillCastWrapEl = document.getElementById('skill-cast-wrap');
    const skillCastLabelEl = document.getElementById('skill-cast-label');
    const skillCastFillEl = document.getElementById('skill-cast-fill');
    const hotbarSlots = [
      document.getElementById('hotbar-slot-0'),
      document.getElementById('hotbar-slot-1'),
      document.getElementById('hotbar-slot-2'),
    ];
    const hotbarTreasures = {
      treasure1: document.getElementById('hotbar-treasure-1'),
      treasure2: document.getElementById('hotbar-treasure-2'),
    };

    function syncTreasureHotbarStructure() {
      const slotMap = [
        { key: 'treasure1', hint: 'Z · 法宝1' },
        { key: 'treasure2', hint: 'X · 法宝2' },
      ];
      for (const s of slotMap) {
        const btn = hotbarTreasures[s.key];
        if (!btn) continue;
        const eq = equipment[s.key];
        btn.querySelector('.skill-slot-key').textContent = s.hint;
        if (!eq) {
          btn.classList.add('empty-treasure');
          btn.classList.remove('active-treasure');
          btn.querySelector('.skill-slot-name').textContent = '未装备';
          btn.querySelector('.skill-slot-name').style.color = '';
          btn.querySelector('.skill-slot-meta').textContent = '按 B 装备';
          btn.title = '打开背包 (B) 装配攻击或防御法宝';
        } else {
          btn.classList.remove('empty-treasure');
          btn.querySelector('.skill-slot-name').textContent = eq.name;
          btn.querySelector('.skill-slot-name').style.color = eq.category === 'attack' ? '#ffd09c' : '#a8eeff';
          btn.querySelector('.skill-slot-meta').textContent = `${eq.mpCost}灵 · ${eq.cd}s`;
          btn.title = `${eq.name}：${eq.desc}`;
        }
      }
    }

    function triggerTreasureSlot(slotKey) {
      if (!worldData.treasures || gameExited) return;
      const paused = menuOpen || bagOpen || skillOpen || alchemyOpen || forgingOpen || shopOpen || libraryOpen || (minimap && minimap.isOpen);
      if (paused) return;
      const res = worldData.treasures.tryActivateSlot(slotKey, camera, vitals, worldData.monsters, false);
      if (res && res.ok) {
        syncVitalsUI();
      }
    }

    function syncSkillHotbarStructure() {
      if (!worldData.skills) return;
      const skSys = worldData.skills;
      const curEl = skSys.getCurrentElement();
      if (skillElemRowEl) {
        const pills = skillElemRowEl.querySelectorAll('.elem-pill');
        for (const p of pills) {
          p.classList.toggle('active', p.getAttribute('data-elem') === curEl.key);
        }
        const rPills = skillElemRowEl.querySelectorAll('.realm-pill');
        for (const rp of rPills) {
          rp.classList.toggle('active', rp.getAttribute('data-realm') === skSys.realm);
        }
      }
      const keyHints = ['左键/J', 'Q', 'E'];
      for (let i = 0; i < 3; i++) {
        const btn = hotbarSlots[i];
        if (!btn) continue;
        const sk = skSys.getSkillBySlot(i);
        const keyTxt = keyHints[i];
        if (!sk) {
          btn.style.borderColor = '';
          btn.classList.remove('zhuji-slot', 'no-mp', 'aiming-slot', 'attack-mode-active');
          btn.classList.add('empty-skill');
          btn.querySelector('.skill-slot-key').textContent = keyTxt;
          btn.querySelector('.skill-slot-name').textContent = '未装配';
          btn.querySelector('.skill-slot-name').style.color = 'rgba(206,226,222,0.68)';
          btn.querySelector('.skill-slot-meta').textContent = '藏经阁习得';
          btn.title = '请前往青石城藏经阁购买武技，再按 K 键装配到此格子';
          const mask = btn.querySelector('.skill-cd-mask');
          if (mask) mask.classList.add('hidden');
          continue;
        }
        btn.classList.remove('empty-skill');
        const isSkZhuji = sk.realm === 'zhuji';
        btn.style.borderColor = '';
        btn.classList.toggle('zhuji-slot', isSkZhuji && i > 0);
        btn.querySelector('.skill-slot-key').textContent = (isSkZhuji && i > 0) ? `${keyTxt} · 筑基` : keyTxt;
        btn.querySelector('.skill-slot-name').textContent = sk.name;
        btn.querySelector('.skill-slot-name').style.color = sk.colorCss || curEl.colorCss;
        const isDash = skSys.isDashSkill && skSys.isDashSkill(sk);
        const meta = sk.mpCost > 0
          ? `${sk.mpCost}灵 · ${sk.cd}s${isDash ? ' · 待激发' : ' · 即放'}`
          : `准星360° · ${sk.cd}s`;
        btn.querySelector('.skill-slot-meta').textContent = meta;
        btn.title = i === 0
          ? `${sk.name}：点击进入攻击模式（准星360°全方位瞄准，右键或ESC退出）｜ ${sk.desc}`
          : `${sk.name}（${isDash ? '点击进入待激发模式，再次点击朝人物面对方向移动' : '点击立即触发'}）｜ ${sk.desc}`;
      }
    }

    let lastBuffHash = '';
    function syncSkillHotbarLive() {
      if (!worldData.skills) return;
      const skSys = worldData.skills;
      const isAttackMode = !!camera.attackMode;
      const aim = skSys.aimPreview;

      if (combatCrosshairEl) {
        combatCrosshairEl.classList.toggle('hidden', !isAttackMode);
      }
      if (skillAimBannerEl && skillAimTitleEl) {
        if (aim && aim.skill) {
          skillAimBannerEl.classList.remove('hidden');
          skillAimTitleEl.textContent = `【${aim.skill.name}】待激发模式`;
        } else {
          skillAimBannerEl.classList.add('hidden');
        }
      }

      // Update per-slot cooldown overlay, MP availability, Attack Mode & Aiming highlight
      for (let i = 0; i < 3; i++) {
        const btn = hotbarSlots[i];
        if (!btn) continue;
        const sk = skSys.getSkillBySlot(i);
        const mask = btn.querySelector('.skill-cd-mask');
        const txt = btn.querySelector('.skill-cd-text');
        if (!sk) {
          if (mask) mask.classList.add('hidden');
          btn.classList.remove('no-mp', 'aiming-slot', 'attack-mode-active');
          continue;
        }
        const cd = skSys.cooldowns[sk.id] || 0;
        if (mask && txt) {
          if (cd > 0.04) {
            mask.classList.remove('hidden');
            txt.textContent = cd.toFixed(1);
          } else {
            mask.classList.add('hidden');
          }
        }
        btn.classList.toggle('no-mp', vitals.mp < sk.mpCost);
        btn.classList.toggle('aiming-slot', !!(aim && aim.slotIndex === i));
        if (i === 0) {
          btn.classList.toggle('attack-mode-active', isAttackMode);
        }
      }

      // Update windup / recovery cast bar OR 3-second Basic Attack Charge bar (普攻蓄力条)
      if (skillCastWrapEl && skillCastLabelEl && skillCastFillEl) {
        if (skSys.basicCharge && skSys.basicCharge.active) {
          const bc = skSys.basicCharge;
          const pct = M.clamp((bc.elapsed / Math.max(0.1, bc.maxSec)) * 100, 0, 100);
          const ready = bc.elapsed >= bc.maxSec;
          skillCastWrapEl.classList.remove('hidden');
          skillCastLabelEl.textContent = ready
            ? '蓄力圆满 · 双倍伤害!'
            : `普攻蓄力 ${Math.min(bc.maxSec, bc.elapsed).toFixed(1)}s / ${bc.maxSec.toFixed(0)}s`;
          skillCastFillEl.style.width = `${pct.toFixed(0)}%`;
          skillCastFillEl.classList.toggle('charge-ready', ready);
        } else if (skSys.castState) {
          const cs = skSys.castState;
          const pct = M.clamp((1.0 - cs.timer / Math.max(0.01, cs.duration)) * 100, 0, 100);
          skillCastWrapEl.classList.remove('hidden');
          skillCastLabelEl.textContent = cs.phase === 'windup' ? `${cs.skill.name}·蓄` : `${cs.skill.name}·收`;
          skillCastFillEl.style.width = `${pct.toFixed(0)}%`;
          skillCastFillEl.classList.remove('charge-ready');
        } else {
          skillCastWrapEl.classList.add('hidden');
          skillCastFillEl.classList.remove('charge-ready');
        }
      }

      // Update Treasure hotbar cooldowns & active glow
      if (worldData.treasures) {
        const tSys = worldData.treasures;
        for (const sKey of ['treasure1', 'treasure2']) {
          const btn = hotbarTreasures[sKey];
          const eq = equipment[sKey];
          if (!btn) continue;
          const mask = btn.querySelector('.skill-cd-mask');
          const txt = btn.querySelector('.skill-cd-text');
          if (!eq) {
            if (mask) mask.classList.add('hidden');
            btn.classList.remove('no-mp', 'active-treasure');
            continue;
          }
          const cd = tSys.cooldowns[eq.id] || 0;
          const rt = tSys.runtimes[eq.id];
          const isAct = rt && rt.state !== 'idle';
          btn.classList.toggle('active-treasure', !!isAct);
          btn.classList.toggle('no-mp', vitals.mp < eq.mpCost);
          if (mask && txt) {
            if (cd > 0.04) {
              mask.classList.remove('hidden');
              txt.textContent = cd.toFixed(1);
            } else {
              mask.classList.add('hidden');
            }
          }
        }
      }

      // Update active buffs pills (练气/筑基增益 + 法宝护体状态)
      if (skillBuffBarEl) {
        const b = skSys.buffs;
        const tags = [];
        if (b.shieldTimer > 0 && b.shieldHp > 0) {
          const sName = b.shieldKind === 'zhuji' ? '厚土重盾' : '岩甲盾';
          tags.push(`${sName} ${Math.ceil(b.shieldHp)} (${b.shieldTimer.toFixed(1)}s)`);
        }
        if (b.metalBladeTimer > 0) tags.push(`金罡护体刃 (${b.metalBladeTimer.toFixed(1)}s)`);
        if (b.woodAuraTimer > 0) tags.push(`木灵聚气环 (${b.woodAuraTimer.toFixed(1)}s)`);
        if (b.speedTimer > 0) tags.push(`踏浪加速 (${b.speedTimer.toFixed(1)}s)`);
        if (b.regenTimer > 0) tags.push(`回春调息 (${b.regenTimer.toFixed(1)}s)`);
        if (worldData.treasures) {
          const tb = worldData.treasures.buffs;
          if (tb.shieldTimer > 0 && tb.shieldHp > 0) tags.push(`玄龟盾 ${Math.ceil(tb.shieldHp)} (${tb.shieldTimer.toFixed(1)}s)`);
          if (tb.bellDrTimer > 0) tags.push(`金刚护体 (${tb.bellDrTimer.toFixed(1)}s)`);
          if (tb.scarfTimer > 0) tags.push(`流云护幕 (${tb.scarfTimer.toFixed(1)}s)`);
        }
        if (consumableBuffs.speedTimer > 0) {
          const pct = Math.round((consumableBuffs.speedMul - 1.0) * 100);
          tags.push(`${consumableBuffs.speedName || '移速符'} +${pct}%移速 (${consumableBuffs.speedTimer.toFixed(1)}s)`);
        }
        if (consumableBuffs.critTimer > 0) {
          const pct = Math.round(consumableBuffs.critRate * 100);
          tags.push(`${consumableBuffs.critName || '暴击符'} +${pct}%暴击 (${consumableBuffs.critTimer.toFixed(1)}s)`);
        }
        const hash = tags.join('|');
        if (hash !== lastBuffHash) {
          lastBuffHash = hash;
          skillBuffBarEl.innerHTML = tags.map((t) => `<span class="skill-buff-pill">${t}</span>`).join('');
        }
      }
    }

    function enterAttackMode() {
      if (gameExited) return;
      const paused = menuOpen || bagOpen || skillOpen || alchemyOpen || forgingOpen || shopOpen || libraryOpen || (minimap && minimap.isOpen);
      if (paused) return;
      camera.setAttackMode(true, false);
      if (combatCrosshairEl) combatCrosshairEl.classList.remove('hidden');
    }

    function exitAttackMode(exitLock = false) {
      camera.setAttackMode(false, exitLock);
      if (combatCrosshairEl) combatCrosshairEl.classList.add('hidden');
    }

    function triggerSkillSlot(slotIndex) {
      if (!worldData.skills || gameExited) return;
      const paused = menuOpen || bagOpen || skillOpen || alchemyOpen || forgingOpen || shopOpen || libraryOpen || (minimap && minimap.isOpen);
      if (paused) return;
      const skSys = worldData.skills;
      const slotSk = skSys.getSkillBySlot(slotIndex);
      if (!slotSk) {
        if (worldData.monsters && camera.playerPos) {
          worldData.monsters.spawnFloatingText(
            camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2],
            '未装配武技 · 请前往青石城藏经阁习得后按 K 装配', '#ffd994'
          );
        }
        return;
      }
      if (slotIndex === 0) {
        // Basic Attack: enters Attack Mode (center crosshair + 360° sky-capable aim) and fires
        enterAttackMode();
        const res = skSys.tryCast(0, camera, vitals, worldData.monsters);
        if (res && res.ok) syncVitalsUI();
        return;
      }
      // Active Skill Slot 1 (Q) or Slot 2 (E):
      // - Displacement skills (位移技能): 1st click enters 待激发模式, 2nd click dashes in character's facing direction (人物面对方向)
      // - All other active skills (其他主动技能): trigger immediately on click with NO ground circle!
      if (skSys.aimPreview && skSys.aimPreview.slotIndex === slotIndex) {
        const res = skSys.confirmAimPreview(camera, vitals, worldData.monsters);
        if (res && res.ok) syncVitalsUI();
        syncSkillHotbarLive();
        return;
      }
      const res = skSys.beginSkillAim(slotIndex, camera, vitals, worldData.monsters);
      if (res && res.ok) {
        syncVitalsUI();
      }
      syncSkillHotbarLive();
    }

    if (skillElemRowEl) {
      skillElemRowEl.addEventListener('click', (e) => {
        if (!worldData.skills) return;
        const rPill = e.target.closest('.realm-pill');
        if (rPill) {
          e.stopPropagation();
          const wantRealm = rPill.getAttribute('data-realm');
          if (wantRealm === 'zhuji' && worldData.skills.playerRealmMajor !== 'zhuji') {
            if (worldData.monsters && camera.playerPos) {
              worldData.monsters.spawnFloatingText(
                camera.playerPos[0], camera.playerPos[1] + 2.35, camera.playerPos[2],
                '练气期无法切换筑基武技，需先突破筑基！', '#ffbc82'
              );
            }
            return;
          }
          worldData.skills.setRealm(wantRealm);
          syncSkillHotbarStructure();
          if (skillOpen) renderSkillUI();
          return;
        }
        const pill = e.target.closest('.elem-pill');
        if (!pill) return;
        e.stopPropagation();
        const key = pill.getAttribute('data-elem');
        worldData.skills.setElementByKey(key);
        syncSkillHotbarStructure();
        if (skillOpen) renderSkillUI();
      });
    }

    // Hotbar Slot 0 (普攻): 支持点击直接攻击，或长按 3 秒蓄力释放双倍伤害！
    if (hotbarSlots[0]) {
      hotbarSlots[0].addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (gameExited || titleActive) return;
        const paused = menuOpen || bagOpen || skillOpen || alchemyOpen || forgingOpen || shopOpen || libraryOpen || (minimap && minimap.isOpen);
        if (paused || !worldData.skills) return;
        if (!worldData.skills.getSkillBySlot(0)) {
          triggerSkillSlot(0);
          return;
        }
        enterAttackMode();
        worldData.skills.startBasicCharge(camera, worldData.monsters);
        syncSkillHotbarLive();
      });
      hotbarSlots[0].addEventListener('mouseup', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (worldData.skills && worldData.skills.basicCharge.active) {
          const res = worldData.skills.releaseBasicCharge(camera, vitals, worldData.monsters);
          if (res && res.ok) syncVitalsUI();
          syncSkillHotbarLive();
        }
      });
      hotbarSlots[0].addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Hotbar Slots 1 & 2 (技能1 Q / 技能2 E):
    // - 位移技能: 1st click enters 待激发模式, 2nd click dashes toward character's facing direction
    // - 其他主动技能: click triggers immediately (no ground circle)
    for (let i = 1; i <= 2; i++) {
      const btn = hotbarSlots[i];
      if (!btn) continue;
      btn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerSkillSlot(i);
      });
    }

    for (const sKey of ['treasure1', 'treasure2']) {
      const btn = hotbarTreasures[sKey];
      if (!btn) continue;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!equipment[sKey]) {
          setBagOpen(true);
        } else {
          triggerTreasureSlot(sKey);
        }
      });
    }

    // Canvas mouse controls:
    // - Left-click on a nearby placed 炼丹炉/炼器炉: opens its standalone Alchemy/Forging UI
    // - Left-click otherwise: enters Attack Mode & fires Basic Attack (or fires directly while in Attack Mode)
    // - Right-click: cancels armed displacement skill (待激发模式) or exits Attack Mode while keeping mouse view control active!
    let downX = 0, downY = 0, downTime = 0;
    canvas.addEventListener('mousedown', (e) => {
      if (gameExited || titleActive) return;
      const paused = menuOpen || bagOpen || skillOpen || alchemyOpen || forgingOpen || shopOpen || libraryOpen || (minimap && minimap.isOpen);
      if (paused) return;
      if (e.button === 2) {
        if (worldData.skills && worldData.skills.basicCharge && worldData.skills.basicCharge.active) {
          worldData.skills.cancelBasicCharge();
          syncSkillHotbarLive();
        }
        if (worldData.skills && worldData.skills.aimPreview) {
          e.preventDefault();
          e.stopPropagation();
          worldData.skills.cancelAimPreview(camera);
          syncSkillHotbarLive();
          return;
        }
        if (camera.attackMode) {
          e.preventDefault();
          e.stopPropagation();
          exitAttackMode(false);
          syncSkillHotbarLive();
        }
        return;
      }
      if (e.button !== 0) return;
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
      camera.lastMouseClientX = e.clientX;
      camera.lastMouseClientY = e.clientY;

      if (camera.attackMode) {
        if (worldData.skills && worldData.skills.getSkillBySlot(0)) {
          worldData.skills.startBasicCharge(camera, worldData.monsters);
          syncSkillHotbarLive();
        } else {
          triggerSkillSlot(0);
        }
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      if (worldData.skills && worldData.skills.basicCharge && worldData.skills.basicCharge.active) {
        const res = worldData.skills.releaseBasicCharge(camera, vitals, worldData.monsters);
        if (res && res.ok) syncVitalsUI();
        syncSkillHotbarLive();
      }
    });
    canvas.addEventListener('mouseup', (e) => {
      if (e.button !== 0 || gameExited || titleActive) return;
      if (camera.attackMode) return;
      const paused = menuOpen || bagOpen || skillOpen || alchemyOpen || forgingOpen || shopOpen || libraryOpen || (minimap && minimap.isOpen);
      if (paused) return;
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist < 8 && performance.now() - downTime < 320) {
        const pPos = camera.playerPos || camera.pos;
        if (worldData.npcs && worldData.npcs.pickNearbyShopNpcAtScreenPos) {
          const hitNpc = worldData.npcs.pickNearbyShopNpcAtScreenPos(
            e.clientX, e.clientY,
            window.innerWidth, window.innerHeight,
            renderer.vpMat,
            pPos
          );
          if (hitNpc) {
            openShopOrLibraryForNpc(hitNpc);
            return;
          }
        }
        if (worldData.furnaces) {
          const hitFur = worldData.furnaces.pickNearbyFurnaceAtScreenPos(
            e.clientX, e.clientY,
            window.innerWidth, window.innerHeight,
            renderer.vpMat,
            pPos
          );
          if (hitFur) {
            interactWithFurnaceOrPlatform(hitFur);
            return;
          }
        }
        if (dist < 6 && performance.now() - downTime < 260) {
          triggerSkillSlot(0);
        }
      }
    });
    canvas.addEventListener('contextmenu', (e) => {
      const paused = menuOpen || bagOpen || skillOpen || alchemyOpen || forgingOpen || shopOpen || libraryOpen || (minimap && minimap.isOpen) || gameExited;
      if (!paused) {
        e.preventDefault();
      }
    });

    syncSkillHotbarStructure();
    syncTreasureHotbarStructure();
    renderBagUI();
    renderSkillUI();

    // Enter game immediately in third-person view at spawn!
    camera.active = true;
    const v1 = XW.SCENIC_VIEWS['1'];
    camera.setViewImmediate(v1.pos, v1.yaw, v1.pitch, false);

    // Auto-start BGM on first user gesture if sound is enabled
    const ensureAudioStarted = () => {
      if (bgm && userSettings.sound === 'on' && !gameExited) {
        bgm.setMuted(false);
      }
    };
    window.addEventListener('mousedown', ensureAudioStarted, { passive: true });
    window.addEventListener('keydown', ensureAudioStarted, { passive: true });

    function syncPauseState() {
      const paused = titleActive || (minimap && minimap.isOpen) || menuOpen || bagOpen || skillOpen || alchemyOpen || forgingOpen || shopOpen || libraryOpen || gameExited;
      camera.mapPaused = paused;
      if (paused) {
        if (worldData.skills && worldData.skills.cancelBasicCharge) worldData.skills.cancelBasicCharge();
        camera.keys.clear();
        camera.dragging = false;
        if (document.pointerLockElement && document.exitPointerLock) {
          try { document.exitPointerLock(); } catch (_) {}
        }
      }
    }

    function setBagOpen(open) {
      if (gameExited) return;
      lastMenuToggleAt = performance.now();
      bagOpen = !!open;
      if (bagOpen) {
        skillOpen = false;
        if (skillModal) skillModal.classList.add('hidden');
        if (alchemyOpen || forgingOpen) {
          alchemyOpen = false; forgingOpen = false; activeFurnaceInst = null;
          if (alchemyModal) alchemyModal.classList.add('hidden');
          if (forgingModal) forgingModal.classList.add('hidden');
        }
        if (shopOpen || libraryOpen) {
          shopOpen = false; libraryOpen = false; activeShopNpc = null;
          if (shopModal) shopModal.classList.add('hidden');
          if (libraryModal) libraryModal.classList.add('hidden');
        }
        if (minimap && minimap.isOpen) minimap.setOpen(false);
        if (menuOpen) { menuOpen = false; escMenuModal.classList.add('hidden'); }
        renderBagUI();
      }
      if (bagModal) bagModal.classList.toggle('hidden', !bagOpen);
      syncPauseState();
    }

    function setSkillOpen(open) {
      if (gameExited) return;
      lastMenuToggleAt = performance.now();
      skillOpen = !!open;
      if (skillOpen) {
        bagOpen = false;
        if (bagModal) bagModal.classList.add('hidden');
        if (alchemyOpen || forgingOpen) {
          alchemyOpen = false; forgingOpen = false; activeFurnaceInst = null;
          if (alchemyModal) alchemyModal.classList.add('hidden');
          if (forgingModal) forgingModal.classList.add('hidden');
        }
        if (shopOpen || libraryOpen) {
          shopOpen = false; libraryOpen = false; activeShopNpc = null;
          if (shopModal) shopModal.classList.add('hidden');
          if (libraryModal) libraryModal.classList.add('hidden');
        }
        if (minimap && minimap.isOpen) minimap.setOpen(false);
        if (menuOpen) { menuOpen = false; escMenuModal.classList.add('hidden'); }
        renderSkillUI();
      }
      if (skillModal) skillModal.classList.toggle('hidden', !skillOpen);
      syncPauseState();
    }

    function setMapOpen(open) {
      if (!minimap || gameExited) return;
      if (open) {
        if (menuOpen) setMenuOpen(false, false);
        if (bagOpen) setBagOpen(false);
        if (skillOpen) setSkillOpen(false);
        if (alchemyOpen || forgingOpen) closeFurnaceModals();
        if (shopOpen || libraryOpen) closeShopModals();
      }
      minimap.setOpen(open);
      syncPauseState();
    }

    function switchMenuView(viewName) {
      menuSubView = viewName;
      escMainView.classList.toggle('view-hidden', viewName !== 'main');
      if (escSaveView) escSaveView.classList.toggle('view-hidden', viewName !== 'save');
      if (escBestiaryView) escBestiaryView.classList.toggle('view-hidden', viewName !== 'bestiary');
      escSettingsView.classList.toggle('view-hidden', viewName !== 'settings');
      escQuitView.classList.toggle('view-hidden', viewName !== 'quit');
      if (escMenuCard) escMenuCard.classList.toggle('bestiary-wide', viewName === 'bestiary');
    }

    let activeBestiaryFilter = 'all';
    function renderBestiaryUI(filterKey = activeBestiaryFilter) {
      if (!bestiaryListEl || !XW.Monsters || !XW.Monsters.getBestiaryData) return;
      activeBestiaryFilter = filterKey || 'all';
      const allEntries = XW.Monsters.getBestiaryData();
      const filtered = activeBestiaryFilter === 'all'
        ? allEntries
        : allEntries.filter((e) => e.categoryKey === activeBestiaryFilter);

      if (bestiaryFilterBar) {
        const btns = bestiaryFilterBar.querySelectorAll('.bestiary-filter-btn');
        for (const b of btns) {
          b.classList.toggle('active', b.getAttribute('data-bestiary-filter') === activeBestiaryFilter);
        }
      }
      if (bestiarySummarySub) {
        bestiarySummarySub.textContent = `当前共收录 ${allEntries.length} 种妖兽（筛选显示 ${filtered.length} 种）· 表中为核心四维，实战按核心 80%~110% 四维联动浮动 · 实际伤害 = 攻×倍率 - 目标防御`;
      }

      const cardsHtml = filtered.map((m) => {
        const cardCls = m.isBoss
          ? 'cat-boss'
          : (m.isElite ? (m.realm === '筑基期' ? 'cat-zhuji-elite' : 'cat-elite') : '');
        const badgeCls = m.isBoss
          ? 'badge-boss'
          : (m.isElite ? (m.realm === '筑基期' ? 'badge-zhuji' : 'badge-elite') : (m.realm === '筑基期' ? 'badge-zhuji' : ''));
        const moveChips = m.moves.map((mv) => {
          const extras = [];
          if (mv.count > 1) extras.push(`${mv.count}段`);
          if (mv.radius > 0) extras.push(`半径${mv.radius}m`);
          if (mv.slowSec > 0) extras.push(`缓速${mv.slowSec}s`);
          const extraTxt = extras.length ? ` · ${extras.join('/')}` : '';
          const mpTxt = mv.mpCost > 0 ? `耗灵${mv.mpCost}` : '免耗';
          return `<span class="bestiary-move-chip"><strong>${mv.slotLabel}·${mv.name}</strong> (${mv.kindLabel} · ${Math.round(mv.dmgPct * 100)}%攻 · ${mpTxt} · 射程${mv.range}m · CD ${mv.cd}s · 前摇${mv.windup}s${extraTxt})</span>`;
        }).join('');

        const moveHeaders = m.moves.map((mv) => `<th>${mv.slotLabel}(${Math.round(mv.dmgPct * 100)}%)<br/><span style="font-weight:400;opacity:0.78;">${mv.name}</span></th>`).join('');
        const realmRows = m.realms.map((r) => {
          const dmgCells = r.moveDamages.map((d) => `<td class="col-dmg">${d}</td>`).join('');
          return `<tr>
            <td class="col-realm">${r.label}</td>
            <td class="col-hp">${r.coreHp} <span style="opacity:0.65;font-size:11px;">(${r.hpMin}~${r.hpMax})</span></td>
            <td>${r.coreMp}</td>
            <td class="col-dmg">${r.coreAtk} <span style="opacity:0.65;font-size:11px;">(${r.atkMin}~${r.atkMax})</span></td>
            <td>${r.coreDef} <span style="opacity:0.65;font-size:11px;">(${r.defMin}~${r.defMax})</span></td>
            ${dmgCells}
            <td class="col-exp">+${r.expReward}</td>
          </tr>`;
        }).join('');

        const st = m.coreStep || { hp: 0, mp: 0, atk: 0, def: 0 };
        return `<div class="bestiary-card ${cardCls}">
          <div class="bestiary-card-head">
            <div class="bestiary-title-group">
              <span class="bestiary-name">${m.name}</span>
              <span class="bestiary-badge ${badgeCls}">${m.categoryLabel}</span>
            </div>
            <span class="bestiary-region-tag">出没区域：${m.regionName}</span>
          </div>
          <div class="bestiary-meta-row">
            <span>每级固定增量 <strong>+${st.hp}血 / +${st.mp}灵 / +${st.atk}攻 / +${st.def}防</strong></span>
            <span>移速 <strong>${m.moveSpeed} m/s</strong></span>
            <span>体型 <strong>${m.scale}x</strong></span>
            <span>索敌 <strong>${m.aggroRange}m</strong></span>
            <span>刷新 <strong>${m.respawnSec}s</strong></span>
          </div>
          <div class="bestiary-moves-row">${moveChips}</div>
          <div class="bestiary-table-wrap">
            <table class="bestiary-table">
              <thead>
                <tr>
                  <th>境界</th>
                  <th>核心气血 (80%~110%)</th>
                  <th>核心灵力</th>
                  <th>核心攻击</th>
                  <th>核心防御</th>
                  ${moveHeaders}
                  <th>击杀修为</th>
                </tr>
              </thead>
              <tbody>${realmRows}</tbody>
            </table>
          </div>
        </div>`;
      }).join('');

      bestiaryListEl.innerHTML = cardsHtml;
    }

    function setMenuOpen(open, requestLockOnClose = false) {
      lastMenuToggleAt = performance.now();
      menuOpen = !!open;
      if (menuOpen) {
        if (minimap && minimap.isOpen) minimap.setOpen(false);
        if (bagOpen) setBagOpen(false);
        if (skillOpen) setSkillOpen(false);
        if (alchemyOpen || forgingOpen) closeFurnaceModals();
        if (shopOpen || libraryOpen) closeShopModals();
        if (!gameExited && menuSubView === 'quit') switchMenuView('main');
      }
      escMenuModal.classList.toggle('hidden', !menuOpen);
      syncPauseState();
      if (!menuOpen && requestLockOnClose && !gameExited && canvas.requestPointerLock) {
        try {
          const p = canvas.requestPointerLock();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (_) {}
      }
    }

    function updateSettingsDescriptions(applied) {
      if (settingSoundInfo) {
        settingSoundInfo.textContent = userSettings.sound === 'on'
          ? '开启 · 环境风声与古琴洞箫背景乐实时合成'
          : '关闭 · 音频合成器已静音挂起';
      }
      if (settingResInfo && applied) {
        const label = userSettings.resolution === 'low' ? '低 (0.65x 性能渲染)' : '高 (上限 1.5× DPR 清晰渲染)';
        settingResInfo.textContent = `${label} · 帧缓冲 ${applied.renderWidth}×${applied.renderHeight}`;
      }
      if (settingViewInfo && applied) {
        const map = {
          low:    '低 · 远裁面 4500m / 景物裁剪 1800m / 隐藏外环远山',
          medium: '中 · 远裁面 13500m / 景物裁剪 4800m / 标准视距',
          high:   '高 · 远裁面 24000m / 景物裁剪 9600m / 广域草毯',
          ultra:  '超高 · 远裁面 38000m / 景物裁剪 22000m / 全境通透',
        };
        settingViewInfo.textContent = map[userSettings.viewDistance] || map.medium;
      }
      if (settingQualInfo) {
        const map = {
          low:    '低 · 关闭凹凸法线与高光 / 关闭 HDR 辉光与体积云',
          medium: '中 · 标准凹凸法线与边缘光 / 半分辨率 HDR 辉光 / 体积云',
          high:   '高 · 远距微法线与大气丁达尔散射 / 双级联全屏丝滑 HDR 辉光',
        };
        settingQualInfo.textContent = map[userSettings.quality] || map.medium;
      }
      if (settingShadowInfo && applied) {
        const map = {
          off:    '关闭 · 跳过阴影深度渲染通道 (零阴影开销)',
          low:    `低 · ${applied.shadowSize}×${applied.shadowSize} 深度贴图 / 单点硬阴影 / 不含树冠投影`,
          medium: `中 · ${applied.shadowSize}×${applied.shadowSize} 深度贴图 / 4点旋转泊松软阴影 / 含近处树冠投影`,
          high:   `高 · ${applied.shadowSize}×${applied.shadowSize} 高清贴图 / 8点泊松软阴影 / 含近处树冠与山石投影`,
        };
        settingShadowInfo.textContent = map[userSettings.shadowQuality] || map.medium;
      }
      if (settingBlobInfo) {
        settingBlobInfo.textContent = userSettings.blobShadow === 'off'
          ? '关闭 · 不渲染脚底贴地伪接触阴影'
          : '开启 · 主角/妖兽/近处树干贴地软阴影（关实时阴影不发飘）';
      }
      if (settingFogInfo) {
        settingFogInfo.textContent = userSettings.distanceFog === 'off'
          ? '关闭 · 关闭远景大气透视距离雾（全距原色直出）'
          : '开启 · 远山与林海平滑融入天光淡青雾色，增强空间层次';
      }
    }

    function applyUserSetting(key, val) {
      userSettings[key] = val;
      // Update active button states in UI
      const btns = escSettingsView.querySelectorAll(`.opt-btn[data-setting="${key}"]`);
      for (const b of btns) {
        b.classList.toggle('active', b.getAttribute('data-value') === val);
      }

      if (key === 'sound') {
        if (bgm) bgm.setMuted(val !== 'on');
      }
      const applied = renderer.applySettings({
        resolution: userSettings.resolution,
        viewDistance: userSettings.viewDistance,
        quality: userSettings.quality,
        shadowQuality: userSettings.shadowQuality,
        blobShadow: userSettings.blobShadow,
        distanceFog: userSettings.distanceFog,
      });
      updateSettingsDescriptions(applied);
      return applied;
    }

    // Initialize settings descriptions on startup
    updateSettingsDescriptions(renderer.applySettings(userSettings));

    // Bind ESC Menu Buttons
    btnResume.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(false, true);
    });

    function exportSaveData() {
      const pPos = camera.playerPos || camera.pos;
      const skSys = worldData.skills;
      return {
        version: 1,
        savedAt: Date.now(),
        playerName: playerProfile.name || '青云散修',
        playerElement: playerProfile.element || 'metal',
        realmIdx: vitals.realmIdx,
        realmLabel: vitals.realmLabel,
        cultExp: vitals.cultExp,
        hp: vitals.hp,
        mp: vitals.mp,
        stamina: vitals.stamina,
        spiritStones: Math.floor(vitals.spiritStones || 0),
        shichenFloat,
        pos: [pPos[0], pPos[1], pPos[2]],
        yaw: camera.yaw,
        pitch: camera.pitch,
        learnedSkills: skSys ? Array.from(skSys.learnedSkills) : [],
        learnedXinfa: skSys ? Array.from(skSys.learnedXinfa) : [],
        equippedSkills: skSys ? skSys.equippedSkills.map((s) => (s ? s.id : null)) : [null, null, null],
        equippedXinfa: skSys ? skSys.equippedXinfa.map((x) => (x ? x.id : null)) : [null, null],
        equipment: JSON.parse(JSON.stringify(equipment)),
        bagItems: JSON.parse(JSON.stringify(bagItems)),
      };
    }

    function saveToSlot(slotKey) {
      const all = loadAllSaves();
      all[slotKey] = exportSaveData();
      writeAllSaves(all);
    }

    function renderEscSaveList() {
      if (!escSaveList) return;
      const all = loadAllSaves();
      const slots = [
        { key: 'slot1', label: '存档位一' },
        { key: 'slot2', label: '存档位二' },
        { key: 'slot3', label: '存档位三' },
      ];
      escSaveList.innerHTML = '';
      for (const s of slots) {
        const d = all[s.key];
        const row = document.createElement('div');
        row.className = 'mm-save-row';
        const elemLbl = d && STARTER_ELEMENT_GIFTS[d.playerElement] ? `${STARTER_ELEMENT_GIFTS[d.playerElement].elemName}行` : '';
        row.innerHTML = `
          <div class="mm-save-info">
            <span class="mm-save-title">${s.label}${d ? ` · ${d.playerName} (${elemLbl} · ${d.realmLabel || '练气一层'})` : ' · 空栏位'}</span>
            <span class="mm-save-meta">${d ? `低阶灵石 ${d.spiritStones || 0} · 保存于 ${formatSaveTime(d.savedAt)}` : '点击右侧按钮将当前修行进度存入此栏位'}</span>
          </div>
          <div class="mm-save-actions">
            <button type="button" class="shop-action-btn">${d ? '覆盖保存' : '保存至此'}</button>
          </div>
        `;
        const b = row.querySelector('button');
        if (b) {
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            saveToSlot(s.key);
            saveToSlot('auto');
            renderEscSaveList();
            const pPos = camera.playerPos || camera.pos;
            if (worldData.monsters && pPos) {
              worldData.monsters.spawnFloatingText(pPos[0], pPos[1] + 2.5, pPos[2], `已保存至 ${s.label}`, '#96ffd8');
            }
          });
        }
        escSaveList.appendChild(row);
      }
    }

    function applyLaunchConfig(cfg) {
      if (!cfg) return;
      if (camera.attackMode) exitAttackMode(true);
      if (camera.meditating) stopMeditating();
      if (bagOpen) setBagOpen(false);
      if (skillOpen) setSkillOpen(false);
      if (alchemyOpen || forgingOpen) closeFurnaceModals();
      if (shopOpen || libraryOpen) closeShopModals();
      if (minimap && minimap.isOpen) minimap.setOpen(false);
      if (menuOpen) setMenuOpen(false, false);
      gameExited = false;
      titleActive = false;

      const skSys = worldData.skills;
      if (cfg.mode === 'load' && cfg.saveData) {
        const d = cfg.saveData;
        playerProfile.name = d.playerName || '青云散修';
        playerProfile.element = d.playerElement || 'metal';
        vitals.realmIdx = M.clamp(d.realmIdx || 0, 0, CULTIVATION_REALMS.length - 1);
        vitals.cultExp = d.cultExp || 0;
        vitals.spiritStones = d.spiritStones || 0;
        shichenFloat = typeof d.shichenFloat === 'number' ? d.shichenFloat : 4.0;
        syncShichenUI();

        // Restore skills & xinfa
        if (skSys) {
          skSys.learnedSkills.clear();
          skSys.learnedXinfa.clear();
          for (const sid of (d.learnedSkills || [])) skSys.learnSkill(sid);
          for (const xid of (d.learnedXinfa || [])) skSys.learnXinfa(xid);
          const curR = CULTIVATION_REALMS[vitals.realmIdx] || CULTIVATION_REALMS[0];
          skSys.setPlayerRealmMajor(curR.major);
          skSys.equippedSkills = [null, null, null];
          skSys.equippedXinfa = [null, null];
          const eqSk = d.equippedSkills || [];
          for (let i = 0; i < 3; i++) {
            if (eqSk[i]) skSys.equipSkillToSlot(i, eqSk[i]);
          }
          const eqXf = d.equippedXinfa || [];
          for (let i = 0; i < 2; i++) {
            if (eqXf[i]) skSys.equipXinfa(i, eqXf[i]);
          }
        }

        // Restore bag & equipment
        for (let i = 0; i < BAG_CAPACITY; i++) {
          bagItems[i] = (d.bagItems && d.bagItems[i]) ? Object.assign({}, d.bagItems[i]) : null;
        }
        for (const k of Object.keys(equipment)) {
          equipment[k] = (d.equipment && d.equipment[k]) ? Object.assign({}, d.equipment[k]) : null;
        }
        if (XW.Outfits) {
          XW.Outfits.applyOutfitToProtagonist(protagonist, equipment.outfit ? equipment.outfit.id : null);
        }
        const sw = equipment.flyingSword;
        camera.flyingSpeedMul = (sw && sw.flightSpeedMul) || 1.0;
        camera.flightSpeed = (sw && sw.flightSpeed) || 14.5;
        camera.flightBoostSpeed = (sw && sw.boostSpeed) || 21.5;
        camera.flightMaxAGL = (sw && sw.maxFlightAGL) || 22.0;
        if (worldData.treasures) worldData.treasures.syncEquipped(equipment);

        recalcPlayerStats(false);
        vitals.hp = M.clamp(typeof d.hp === 'number' ? d.hp : vitals.maxHp, 1, vitals.maxHp);
        vitals.mp = M.clamp(typeof d.mp === 'number' ? d.mp : vitals.maxMp, 0, vitals.maxMp);
        vitals.stamina = M.clamp(typeof d.stamina === 'number' ? d.stamina : vitals.maxStamina, 0, vitals.maxStamina);
        const pos = (Array.isArray(d.pos) && d.pos.length === 3) ? d.pos : XW.SCENIC_VIEWS['1'].pos;
        camera.setViewImmediate(pos, typeof d.yaw === 'number' ? d.yaw : XW.SCENIC_VIEWS['1'].yaw, typeof d.pitch === 'number' ? d.pitch : XW.SCENIC_VIEWS['1'].pitch, false);
      } else {
        // New Game: clean slate + starter Element Basic Attack Skill Book + starter Element Outfit!
        const elemKey = STARTER_ELEMENT_GIFTS[cfg.element] ? cfg.element : 'metal';
        const gift = STARTER_ELEMENT_GIFTS[elemKey];
        playerProfile.name = (cfg.name && cfg.name.trim()) ? cfg.name.trim().slice(0, 12) : '青云散修';
        playerProfile.element = elemKey;
        vitals.realmIdx = 0;
        vitals.cultExp = 0;
        vitals.spiritStones = 0;
        shichenFloat = 4.0;
        syncShichenUI();

        if (skSys) {
          skSys.learnedSkills.clear();
          skSys.learnedXinfa.clear();
          skSys.equippedSkills = [null, null, null];
          skSys.equippedXinfa = [null, null];
          skSys.setPlayerRealmMajor('lianqi');
          const elIdx = skSys.elements.findIndex((e) => e.key === elemKey);
          if (elIdx >= 0) skSys.elementIndex = elIdx;
        }
        for (let i = 0; i < BAG_CAPACITY; i++) bagItems[i] = null;
        for (const k of Object.keys(equipment)) equipment[k] = null;
        if (XW.Outfits) XW.Outfits.applyOutfitToProtagonist(protagonist, null);
        if (worldData.treasures) worldData.treasures.syncEquipped(equipment);
        camera.flyingSpeedMul = 1.0;
        camera.flightSpeed = 14.5;
        camera.flightBoostSpeed = 21.5;
        camera.flightMaxAGL = 22.0;

        // Grant starter gifts into bag: 1x Basic Attack Skill Book + 1x Element Outfit!
        addItemToBag(makeBasicSkillBookItem(elemKey));
        if (XW.Outfits && XW.Outfits.OUTFIT_DEFS) {
          const outDef = XW.Outfits.OUTFIT_DEFS.find((o) => o.id === gift.outfitId);
          if (outDef) addItemToBag(Object.assign({}, outDef));
        }

        recalcPlayerStats(true);
        const vHome = XW.SCENIC_VIEWS['1'];
        camera.setViewImmediate(vHome.pos, vHome.yaw, vHome.pitch, false);
        saveToSlot('auto');
      }

      syncVitalsUI();
      syncSkillHotbarStructure();
      syncTreasureHotbarStructure();
      renderBagUI();
      renderSkillUI();
      syncPauseState();
    }

    if (btnOpenSave) {
      btnOpenSave.addEventListener('click', (e) => {
        e.stopPropagation();
        renderEscSaveList();
        switchMenuView('save');
      });
    }
    if (btnSaveBack) {
      btnSaveBack.addEventListener('click', (e) => {
        e.stopPropagation();
        switchMenuView('main');
      });
    }
    if (btnReturnTitle) {
      btnReturnTitle.addEventListener('click', (e) => {
        e.stopPropagation();
        saveToSlot('auto');
        setMenuOpen(false, false);
        titleActive = true;
        syncPauseState();
        if (onReturnToTitle) onReturnToTitle();
      });
    }
    if (btnOpenBestiary) {
      btnOpenBestiary.addEventListener('click', (e) => {
        e.stopPropagation();
        renderBestiaryUI(activeBestiaryFilter);
        switchMenuView('bestiary');
      });
    }
    if (btnBestiaryBack) {
      btnBestiaryBack.addEventListener('click', (e) => {
        e.stopPropagation();
        switchMenuView('main');
      });
    }
    if (bestiaryFilterBar) {
      bestiaryFilterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.bestiary-filter-btn');
        if (!btn) return;
        e.stopPropagation();
        renderBestiaryUI(btn.getAttribute('data-bestiary-filter') || 'all');
      });
    }
    btnOpenSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      switchMenuView('settings');
    });

    // 菜单「作弊」按钮：一键获得全部功法（武技+心法）、炉鼎、丹药、符箓、飞剑、法宝、服饰、基础材料与 9999 低阶灵石
    function grantCheatAll() {
      const hasUniqueItem = (slotType, id) => {
        if (bagItems.some((x) => x && x.slotType === slotType && x.id === id)) return true;
        for (const k of Object.keys(equipment)) {
          if (equipment[k] && equipment[k].slotType === slotType && equipment[k].id === id) return true;
        }
        return false;
      };

      // 1. 习得全部武技与心法
      if (worldData.skills && worldData.skills.learnAll) {
        worldData.skills.learnAll();
        if (!worldData.skills.equippedSkills[0] && !worldData.skills.equippedSkills[1] && !worldData.skills.equippedSkills[2]) {
          worldData.skills._applyElementPresetToSlots();
        }
      }
      // 2. 低阶灵石 +9999
      vitals.spiritStones = (vitals.spiritStones || 0) + 9999;

      // 3. 炼丹炉 + 炼器炉
      if (XW.Furnaces && XW.Furnaces.FURNACE_DEFS) {
        for (const f of XW.Furnaces.FURNACE_DEFS) {
          addItemToBag(Object.assign({ count: 1 }, f));
        }
      }
      // 4. 全部丹药与符箓 (×5)
      for (const pf of DEFAULT_PILL_FULU_ITEMS) {
        addItemToBag(Object.assign({}, pf, { count: 5 }));
      }
      if (XW.Furnaces && XW.Furnaces.ALCHEMY_RECIPES) {
        for (const r of XW.Furnaces.ALCHEMY_RECIPES) {
          if (r.id === 'pill_linglu' || r.id === 'pill_zhuji_ningyuan') {
            addItemToBag(Object.assign({}, r.output, { count: 5 }));
          }
        }
      }
      // 5. 全部飞剑（去重）
      if (XW.Treasures && XW.Treasures.FLYING_SWORD_DEFS) {
        for (const sw of XW.Treasures.FLYING_SWORD_DEFS) {
          if (!hasUniqueItem('flyingSword', sw.id)) addItemToBag(Object.assign({}, sw));
        }
      }
      // 6. 全部攻防法宝（去重）
      if (XW.Treasures && XW.Treasures.TREASURE_DEFS) {
        for (const tr of XW.Treasures.TREASURE_DEFS) {
          if (!hasUniqueItem('treasure', tr.id)) addItemToBag(Object.assign({}, tr));
        }
      }
      // 7. 全部五行服饰（去重）
      if (XW.Outfits && XW.Outfits.OUTFIT_DEFS) {
        for (const ofd of XW.Outfits.OUTFIT_DEFS) {
          if (!hasUniqueItem('outfit', ofd.id)) addItemToBag(Object.assign({}, ofd));
        }
      }
      // 8. 炼丹/炼器常用一二阶材料（各 ×10）
      const cheatMats = [
        { id: 'cheat_herb_t1', name: '一阶灵药', icon: '药', slotType: 'herb', tier: 1, count: 10, isGeneric: true, desc: '一阶灵草，用于炼制练气期丹药与符箓。' },
        { id: 'cheat_herb_t2', name: '二阶灵药', icon: '灵', slotType: 'herb', tier: 2, count: 10, isGeneric: false, desc: '二阶珍稀灵药，用于炼制筑基期丹药与符箓。' },
        { id: 'cheat_ore_t1', name: '一阶灵矿', icon: '矿', slotType: 'ore', tier: 1, count: 10, desc: '练气期灵矿石，用于锻造练气法器与飞剑。' },
        { id: 'cheat_ore_t2', name: '二阶灵矿', icon: '晶', slotType: 'ore', tier: 2, count: 10, desc: '筑基期高阶灵矿，用于锻造筑基法宝与灵剑。' },
        { id: 'cheat_loot_t1', name: '一阶妖兽材料', icon: '妖', slotType: 'monster_loot', tier: 1, count: 10, desc: '练气妖兽精骨妖皮，用于炼器与入药。' },
        { id: 'cheat_loot_t2', name: '二阶妖兽材料', icon: '丹', slotType: 'monster_loot', tier: 2, count: 10, desc: '筑基妖兽精魂妖核，用于炼制筑基玄丹与灵宝。' },
      ];
      for (const mat of cheatMats) addItemToBag(mat);

      recalcPlayerStats(false);
      syncSkillHotbarStructure();
      syncTreasureHotbarStructure();
      renderBagUI();
      renderSkillUI();
      setMenuOpen(false, false);

      const pPos = camera.playerPos || camera.pos;
      if (worldData.monsters && pPos) {
        worldData.monsters.spawnFloatingText(
          pPos[0], pPos[1] + 2.6, pPos[2],
          '作弊已生效 · 获得全部功法、丹药、符箓、法宝、炉鼎与 9999 低阶灵石！',
          '#ffe680'
        );
      }
    }
    if (btnCheatAll) {
      btnCheatAll.addEventListener('click', (e) => {
        e.stopPropagation();
        grantCheatAll();
      });
    }
    btnBackMain.addEventListener('click', (e) => {
      e.stopPropagation();
      switchMenuView('main');
    });
    btnQuitGame.addEventListener('click', (e) => {
      e.stopPropagation();
      gameExited = true;
      if (bgm) bgm.setMuted(true);
      if (document.fullscreenElement && document.exitFullscreen) {
        try { document.exitFullscreen(); } catch (_) {}
      }
      switchMenuView('quit');
      setMenuOpen(true, false);
      try { window.close(); } catch (_) {}
    });
    btnReenter.addEventListener('click', (e) => {
      e.stopPropagation();
      gameExited = false;
      if (bgm && userSettings.sound === 'on') bgm.setMuted(false);
      switchMenuView('main');
      setMenuOpen(false, true);
    });

    // Bind all Settings Option Buttons
    escSettingsView.addEventListener('click', (e) => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      e.stopPropagation();
      const key = btn.getAttribute('data-setting');
      const val = btn.getAttribute('data-value');
      if (key && val) {
        applyUserSetting(key, val);
      }
    });

    escMenuModal.addEventListener('click', (e) => {
      if (e.target === escMenuModal && !gameExited) {
        setMenuOpen(false, false);
      }
    });

    // Minimap & World Map events
    minimapBox.addEventListener('click', (e) => {
      e.stopPropagation();
      setMapOpen(!minimap.isOpen);
    });
    worldmapClose.addEventListener('click', (e) => {
      e.stopPropagation();
      setMapOpen(false);
    });
    worldmapModal.addEventListener('click', (e) => {
      if (e.target === worldmapModal) setMapOpen(false);
    });

    // Bag (背包 UI) & Skill (功法 UI) events
    if (hudBtnBag) hudBtnBag.addEventListener('click', (e) => { e.stopPropagation(); setBagOpen(!bagOpen); });
    if (hudBtnSkill) hudBtnSkill.addEventListener('click', (e) => { e.stopPropagation(); setSkillOpen(!skillOpen); });
    if (bagClose) bagClose.addEventListener('click', (e) => { e.stopPropagation(); setBagOpen(false); });
    if (skillClose) skillClose.addEventListener('click', (e) => { e.stopPropagation(); setSkillOpen(false); });
    if (tabToBag1) tabToBag1.addEventListener('click', (e) => { e.stopPropagation(); setBagOpen(true); });
    if (tabToSkill1) tabToSkill1.addEventListener('click', (e) => { e.stopPropagation(); setSkillOpen(true); });
    if (tabToBag2) tabToBag2.addEventListener('click', (e) => { e.stopPropagation(); setBagOpen(true); });
    if (tabToSkill2) tabToSkill2.addEventListener('click', (e) => { e.stopPropagation(); setSkillOpen(true); });
    if (bagModal) bagModal.addEventListener('click', (e) => { if (e.target === bagModal) setBagOpen(false); });
    if (skillModal) skillModal.addEventListener('click', (e) => { if (e.target === skillModal) setSkillOpen(false); });

    // Skill filter buttons (全部 / 心法 / 武技)
    if (skillModal) {
      const filterBtns = skillModal.querySelectorAll('.skill-filter-btn');
      for (const fb of filterBtns) {
        fb.addEventListener('click', (e) => {
          e.stopPropagation();
          const mode = fb.getAttribute('data-skill-filter') || 'all';
          for (const b of filterBtns) b.classList.toggle('active', b === fb);
          if (skillColXinfa) skillColXinfa.classList.toggle('view-hidden', mode === 'wuji');
          if (skillColWuji) skillColWuji.classList.toggle('view-hidden', mode === 'xinfa');
          if (skillBodyEl) skillBodyEl.classList.toggle('single-col', mode !== 'all');
        });
      }
    }

    // Exiting Attack Mode (Pointer Lock) via ESC ONLY exits Attack Mode — NEVER pops open the ESC pause menu!
    let wasPointerLocked = false;
    let lastPointerLockExitAt = 0;
    document.addEventListener('pointerlockchange', () => {
      const isNowLocked = (document.pointerLockElement === canvas);
      if (wasPointerLocked && !isNowLocked) {
        lastPointerLockExitAt = performance.now();
        if (camera.attackMode) {
          exitAttackMode(false);
        }
        syncSkillHotbarLive();
      }
      wasPointerLocked = isNowLocked;
    });

    // Global keyboard shortcuts (ESC menu, B Bag UI, K Skill UI, M world map, T lighting mood, N sound toggle)
    window.addEventListener('keydown', (e) => {
      if (e.repeat || titleActive) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        if (gameExited) return;
        // If currently in Attack Mode (or Pointer Lock), ESC only exits Attack Mode and keeps mouse camera control active!
        if (camera.attackMode || document.pointerLockElement === canvas) {
          lastPointerLockExitAt = performance.now();
          exitAttackMode(true);
          syncSkillHotbarLive();
          return;
        }
        // Ignore Escape keydown right after browser exited Pointer Lock so Attack Mode exit never opens ESC menu
        if (performance.now() - lastPointerLockExitAt < 280) return;
        if (worldData.skills && worldData.skills.basicCharge && worldData.skills.basicCharge.active) {
          worldData.skills.cancelBasicCharge();
          syncSkillHotbarLive();
          return;
        }
        if (worldData.skills && worldData.skills.aimPreview) {
          worldData.skills.cancelAimPreview(camera);
          lastMenuToggleAt = performance.now();
          syncSkillHotbarLive();
          return;
        }
        if (camera.meditating) {
          stopMeditating();
          return;
        }
        if (alchemyOpen || forgingOpen) {
          closeFurnaceModals();
          return;
        }
        if (shopOpen || libraryOpen) {
          closeShopModals();
          return;
        }
        if (bagOpen) {
          setBagOpen(false);
          return;
        }
        if (skillOpen) {
          setSkillOpen(false);
          return;
        }
        if (minimap && minimap.isOpen) {
          setMapOpen(false);
          return;
        }
        // Debounce against simultaneous pointerlockchange Escape trigger
        if (performance.now() - lastMenuToggleAt < 120) return;
        if (menuOpen) {
          if (menuSubView === 'settings' || menuSubView === 'bestiary' || menuSubView === 'save') {
            switchMenuView('main');
          } else {
            setMenuOpen(false, true);
          }
        } else {
          switchMenuView('main');
          setMenuOpen(true, false);
        }
      } else if ((e.code === 'KeyB' || e.code === 'KeyI') && !menuOpen && !gameExited) {
        e.preventDefault();
        setBagOpen(!bagOpen);
      } else if (e.code === 'KeyK' && !menuOpen && !gameExited) {
        e.preventDefault();
        setSkillOpen(!skillOpen);
      } else if (e.code === 'KeyG' && !menuOpen && !gameExited) {
        if (!bagOpen && !skillOpen && !alchemyOpen && !forgingOpen && !shopOpen && !libraryOpen && (!minimap || !minimap.isOpen) && worldData.city && worldData.city.nearestDoor) {
          e.preventDefault();
          tryToggleNearbyDoor();
        } else {
          e.preventDefault();
          setSkillOpen(!skillOpen);
        }
      } else if (e.code === 'KeyM' && !menuOpen && !gameExited) {
        e.preventDefault();
        setMapOpen(!minimap.isOpen);
      } else if (e.code === 'KeyT' && !menuOpen && !bagOpen && !skillOpen && !alchemyOpen && !forgingOpen && !shopOpen && !libraryOpen && (!minimap || !minimap.isOpen)) {
        shichenFloat = (Math.floor(shichenFloat) + 1) % 12;
        syncShichenUI();
      } else if (e.code === 'KeyJ' && !menuOpen && !bagOpen && !skillOpen && !alchemyOpen && !forgingOpen && !shopOpen && !libraryOpen && (!minimap || !minimap.isOpen) && !gameExited) {
        e.preventDefault();
        if (worldData.skills && worldData.skills.getSkillBySlot(0)) {
          enterAttackMode();
          worldData.skills.startBasicCharge(camera, worldData.monsters);
          syncSkillHotbarLive();
        } else {
          triggerSkillSlot(0);
        }
      } else if (e.code === 'KeyQ' && !menuOpen && !bagOpen && !skillOpen && !alchemyOpen && !forgingOpen && !shopOpen && !libraryOpen && (!minimap || !minimap.isOpen) && !gameExited) {
        e.preventDefault();
        triggerSkillSlot(1);
      } else if (e.code === 'KeyE' && !menuOpen && !bagOpen && !skillOpen && !alchemyOpen && !forgingOpen && !shopOpen && !libraryOpen && (!minimap || !minimap.isOpen) && !gameExited) {
        e.preventDefault();
        triggerSkillSlot(2);
      } else if (e.code === 'KeyR' && !menuOpen && !bagOpen && !skillOpen && !alchemyOpen && !forgingOpen && !shopOpen && !libraryOpen && (!minimap || !minimap.isOpen) && !gameExited) {
        e.preventDefault();
        if (worldData.skills) {
          worldData.skills.cycleElement();
          syncSkillHotbarStructure();
        }
      } else if (e.code === 'KeyV' && !menuOpen && !bagOpen && !skillOpen && !alchemyOpen && !forgingOpen && !shopOpen && !libraryOpen && (!minimap || !minimap.isOpen) && !gameExited) {
        e.preventDefault();
        if (worldData.skills) {
          if (worldData.skills.playerRealmMajor !== 'zhuji') {
            const pPos = camera.playerPos || camera.pos;
            if (worldData.monsters && pPos) {
              worldData.monsters.spawnFloatingText(pPos[0], pPos[1] + 2.35, pPos[2], '练气期无法切换筑基武技，需先突破筑基！', '#ffbc82');
            }
          } else {
            worldData.skills.toggleRealm();
            syncSkillHotbarStructure();
          }
        }
      } else if (e.code === 'KeyZ' && !menuOpen && !bagOpen && !skillOpen && !alchemyOpen && !forgingOpen && !shopOpen && !libraryOpen && (!minimap || !minimap.isOpen) && !gameExited) {
        e.preventDefault();
        triggerTreasureSlot('treasure1');
      } else if (e.code === 'KeyX' && !menuOpen && !bagOpen && !skillOpen && !alchemyOpen && !forgingOpen && !shopOpen && !libraryOpen && (!minimap || !minimap.isOpen) && !gameExited) {
        e.preventDefault();
        triggerTreasureSlot('treasure2');
      } else if ((e.code === 'KeyH' || (e.code === 'KeyC' && !camera.flying)) && !menuOpen && !bagOpen && !skillOpen && !alchemyOpen && !forgingOpen && !shopOpen && !libraryOpen && (!minimap || !minimap.isOpen) && !gameExited) {
        if (worldData.herbs && worldData.herbs.nearestCollectible) {
          e.preventDefault();
          tryCollectNearbyHerb();
        }
      } else if (e.code === 'KeyU' && !menuOpen && !gameExited) {
        if (alchemyOpen || forgingOpen) {
          e.preventDefault();
          closeFurnaceModals();
        } else if (shopOpen || libraryOpen) {
          e.preventDefault();
          closeShopModals();
        } else if (camera.meditating && activeSpiritPlatform) {
          e.preventDefault();
          toggleMeditateOnPlatform(activeSpiritPlatform);
        } else if (!bagOpen && !skillOpen && (!minimap || !minimap.isOpen)) {
          if (worldData.furnaces && worldData.furnaces.nearestFurnace) {
            e.preventDefault();
            interactWithFurnaceOrPlatform(worldData.furnaces.nearestFurnace);
          } else if (worldData.npcs && worldData.npcs.nearestShopNpc) {
            e.preventDefault();
            openShopOrLibraryForNpc(worldData.npcs.nearestShopNpc);
          }
        }
      } else if (e.code === 'KeyN') {
        applyUserSetting('sound', userSettings.sound === 'on' ? 'off' : 'on');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyJ' && worldData.skills && worldData.skills.basicCharge && worldData.skills.basicCharge.active) {
        const res = worldData.skills.releaseBasicCharge(camera, vitals, worldData.monsters);
        if (res && res.ok) syncVitalsUI();
        syncSkillHotbarLive();
      }
    });

    window.addEventListener('resize', () => {
      renderer.resize();
      resizeNametagCanvas();
      updateSettingsDescriptions(renderer.applySettings(userSettings));
    });

    // Smoothly interpolated atmosphere state
    const targetAtmo = createAtmoState();
    const smoothAtmo = createAtmoState();
    const finalAtmo = createAtmoState();

    // Expose programmatic hook for testing & inspection
    global.__XIANXIA = {
      character: protagonist,
      monsters: worldData.monsters,
      skills: worldData.skills,
      treasures: worldData.treasures,
      herbs: worldData.herbs,
      ores: worldData.ores,
      furnaces: worldData.furnaces,
      vitals,
      getSettings() {
        return Object.assign({}, userSettings, {
          renderWidth: renderer.width,
          renderHeight: renderer.height,
          shadowSize: renderer.shadowSize,
          farPlane: renderer.farPlane,
          menuOpen,
          menuSubView,
          gameExited,
        });
      },
      setSetting(key, val) {
        return applyUserSetting(key, val);
      },
      openMenu() {
        switchMenuView('main');
        setMenuOpen(true, false);
      },
      closeMenu() {
        setMenuOpen(false, false);
      },
      setView(keyOrObj) {
        const v = typeof keyOrObj === 'string' ? XW.SCENIC_VIEWS[keyOrObj] : keyOrObj;
        if (v) {
          camera.setViewImmediate(v.pos, v.yaw, v.pitch, v.flying !== false);
          T.sampleAtmosphere(v.pos[0], v.pos[1], v.pos[2], targetAtmo);
          smoothAtmo.sunColor.set(targetAtmo.sunColor);
          smoothAtmo.skyTop.set(targetAtmo.skyTop);
          smoothAtmo.skyHorizon.set(targetAtmo.skyHorizon);
          smoothAtmo.fogColor.set(targetAtmo.fogColor);
          smoothAtmo.shadowTint.set(targetAtmo.shadowTint);
          smoothAtmo.fogDensity = targetAtmo.fogDensity;
          smoothAtmo.heightFogDensity = targetAtmo.heightFogDensity;
          smoothAtmo.heightFogBase = targetAtmo.heightFogBase;
        }
      },
      setLightingPreset(idx) {
        shichenFloat = ((idx % 12) + 12) % 12;
        syncShichenUI();
      },
      getStats() {
        const scIdx = ((Math.floor(shichenFloat) % 12) + 12) % 12;
        return {
          fps: Math.round(smoothedFps),
          pos: Array.from(camera.pos),
          flying: camera.flying,
          shichen: SHICHEN_CYCLE[scIdx].name,
          shichenPhase: SHICHEN_CYCLE[scIdx].phase,
          settings: Object.assign({}, userSettings),
          renderSize: [renderer.width, renderer.height],
          shadowSize: renderer.shadowSize,
          farPlane: renderer.farPlane,
        };
      },
    };

    let lastTime = performance.now();
    let smoothedFps = 60;

    function frame(now) {
      const dt = Math.min((now - lastTime) * 0.001, 0.05);
      lastTime = now;
      if (dt > 0.0001) {
        smoothedFps = M.lerp(smoothedFps, 1 / dt, 0.08);
      }
      const elapsed = now * 0.001;

      if (!gameExited && !titleActive) {
        const paused = menuOpen || bagOpen || skillOpen || alchemyOpen || forgingOpen || shopOpen || libraryOpen || (minimap && minimap.isOpen);

        // Update 12-Shichen clock, protagonist slow debuff, hit flash, stamina regen & out-of-combat gentle vitals recovery
        if (!paused) {
          shichenFloat = (shichenFloat + dt / SHICHEN_DURATION_SEC) % 12;
          syncShichenUI();

          if (vitals.invulnTimer > 0) vitals.invulnTimer = Math.max(0, vitals.invulnTimer - dt);
          if (vitals.hitFlash > 0) vitals.hitFlash = Math.max(0, vitals.hitFlash - dt);
          if (vitals.slowTimer > 0) {
            vitals.slowTimer = Math.max(0, vitals.slowTimer - dt);
            camera.externalSlowFactor = 0.65;
          } else {
            camera.externalSlowFactor = 1.0;
          }
          if (vitals.staminaRegenDelay > 0) {
            vitals.staminaRegenDelay = Math.max(0, vitals.staminaRegenDelay - dt);
          } else if (vitals.stamina < vitals.maxStamina) {
            vitals.stamina = Math.min(vitals.maxStamina, vitals.stamina + 24.0 * dt);
            if (vitals.stamina >= 14) vitals.sprintExhausted = false;
          }
          if (vitals.combatTimer > 0) {
            vitals.combatTimer = Math.max(0, vitals.combatTimer - dt);
          } else {
            if (vitals.hp < vitals.maxHp) vitals.hp = Math.min(vitals.maxHp, vitals.hp + 4.0 * dt);
            // 浮空/御剑时处于持续耗灵状态，停止脱战被动回灵，落地后恢复正常回灵
            if (!camera.flying && vitals.mp < vitals.maxMp) vitals.mp = Math.min(vitals.maxMp, vitals.mp + 5.0 * dt);
          }
          // 限时符箓 Buff 倒计时（疾行符 / 御风符 / 破妄符 / 斩厄符）
          if (consumableBuffs.speedTimer > 0) {
            consumableBuffs.speedTimer = Math.max(0, consumableBuffs.speedTimer - dt);
            if (consumableBuffs.speedTimer <= 0) {
              consumableBuffs.speedMul = 1.0;
              consumableBuffs.speedName = '';
            }
          }
          if (consumableBuffs.critTimer > 0) {
            consumableBuffs.critTimer = Math.max(0, consumableBuffs.critTimer - dt);
            if (consumableBuffs.critTimer <= 0) {
              consumableBuffs.critRate = 0;
              consumableBuffs.critMul = 1.5;
              consumableBuffs.critName = '';
              playerCritState.rate = 0;
              playerCritState.mul = 1.5;
            }
          }
          // 修炼进度严格只有坐在一阶灵台打坐修炼时才会增长！
          if (camera.meditating && activeSpiritPlatform) {
            const expRate = (activeSpiritPlatform.def && activeSpiritPlatform.def.expPerSec) ? activeSpiritPlatform.def.expPerSec : 24.0;
            gainCultivationExp(expRate * dt, false, true);
            if (vitals.hp < vitals.maxHp) vitals.hp = Math.min(vitals.maxHp, vitals.hp + 8.0 * dt);
            if (vitals.mp < vitals.maxMp) vitals.mp = Math.min(vitals.maxMp, vitals.mp + 12.0 * dt);
            meditateFloatAcc += dt;
            if (meditateFloatAcc >= 2.2) {
              meditateFloatAcc = 0;
              if (worldData.monsters) {
                worldData.monsters.spawnFloatingText(
                  activeSpiritPlatform.x, activeSpiritPlatform.y + 2.35, activeSpiritPlatform.z,
                  `打坐吸灵 +${Math.round(expRate * 2.2)} 修炼度`, '#8efad8'
                );
              }
            }
          }
        }

        const skillSpdMul = worldData.skills ? worldData.skills.getSpeedMultiplier() : 1.0;
        const treasureSpdMul = worldData.treasures ? worldData.treasures.getSpeedMultiplier() : 1.0;
        const fuluSpdMul = consumableBuffs.speedTimer > 0 ? consumableBuffs.speedMul : 1.0;
        camera.externalSpeedFactor = skillSpdMul * treasureSpdMul * fuluSpdMul;
        camera.castMoveScale = worldData.skills ? worldData.skills.getCastMoveScale() : 1.0;

        camera.update(dt, elapsed);
        if (protagonist) {
          const charState = camera.getCharacterState();
          if (worldData.skills) {
            charState.castAnim = worldData.skills.getCastAnimState();
          }
          protagonist.update(dt, elapsed, charState);
        }

        const pPos = camera.playerPos || camera.pos;
        if (worldData.skills) {
          worldData.skills.update(dt, elapsed, camera, vitals, worldData.monsters, paused);
        }
        if (worldData.treasures) {
          worldData.treasures.update(dt, elapsed, camera, protagonist, vitals, worldData.monsters, paused);
        }
        if (worldData.herbs) {
          worldData.herbs.update(dt, elapsed, pPos, paused);
          if (herbCollectPrompt && herbCollectText) {
            const nh = !paused ? worldData.herbs.nearestCollectible : null;
            if (nh) {
              herbCollectPrompt.classList.remove('hidden');
              herbCollectText.textContent = `采集 · ${nh.def.name}`;
            } else {
              herbCollectPrompt.classList.add('hidden');
            }
          }
        }
        if (worldData.ores) {
          worldData.ores.update(dt, elapsed, pPos, paused);
        }
        if (worldData.drops) {
          worldData.drops.update(dt, elapsed, pPos, paused);
        }
        if (worldData.city) {
          worldData.city.update(dt, elapsed, pPos, paused);
          if (doorInteractPrompt && doorInteractText) {
            const nd = !paused ? worldData.city.nearestDoor : null;
            if (nd) {
              doorInteractPrompt.classList.remove('hidden');
              doorInteractText.textContent = `${nd.open ? '关门' : '开门'} · ${nd.label}`;
            } else {
              doorInteractPrompt.classList.add('hidden');
            }
          }
        }
        if (worldData.furnaces) {
          worldData.furnaces.update(dt, elapsed, pPos, paused);
        }
        if (worldData.skills) {
          syncSkillHotbarLive();
        }
        if (!paused) syncVitalsUI();
        if (worldData.monsters) {
          worldData.monsters.update(dt, elapsed, pPos, camera.flying, paused, onPlayerHit, worldData.npcs);
        }
        if (worldData.npcs) {
          worldData.npcs.update(dt, elapsed, pPos, camera.flying, worldData.monsters, paused, onPlayerHit);
        }
        if (furnaceInteractPrompt && furnaceInteractText) {
          const nf = !paused && worldData.furnaces ? worldData.furnaces.nearestFurnace : null;
          const ns = !paused && worldData.npcs ? worldData.npcs.nearestShopNpc : null;
          if (camera.meditating && activeSpiritPlatform && !paused) {
            furnaceInteractPrompt.classList.remove('hidden', 'forging-mode', 'shop-mode');
            furnaceInteractText.textContent = `起身停止修炼 · ${activeSpiritPlatform.def.name}`;
          } else if (nf) {
            const isPlat = nf.id === 'spirit_platform_t1';
            const isAlch = nf.id === 'alchemy_furnace';
            furnaceInteractPrompt.classList.remove('hidden', 'shop-mode');
            furnaceInteractPrompt.classList.toggle('forging-mode', !isAlch && !isPlat);
            furnaceInteractText.textContent = isPlat
              ? `坐上打坐修炼 · ${nf.def.name}`
              : (isAlch ? '进入炼丹界面' : '进入炼器界面');
          } else if (ns) {
            furnaceInteractPrompt.classList.remove('hidden', 'forging-mode');
            furnaceInteractPrompt.classList.add('shop-mode');
            furnaceInteractText.textContent = ns.role === '藏经阁长老'
              ? `向 ${ns.role} 研习功法`
              : `与 ${ns.role} 交易`;
          } else {
            furnaceInteractPrompt.classList.add('hidden');
          }
        }
        T.sampleAtmosphere(pPos[0], pPos[1], pPos[2], targetAtmo);
        const blend = 1 - Math.exp(-2.2 * dt);

        M.v3Lerp(smoothAtmo.sunColor, smoothAtmo.sunColor, targetAtmo.sunColor, blend);
        M.v3Lerp(smoothAtmo.skyTop, smoothAtmo.skyTop, targetAtmo.skyTop, blend);
        M.v3Lerp(smoothAtmo.skyHorizon, smoothAtmo.skyHorizon, targetAtmo.skyHorizon, blend);
        M.v3Lerp(smoothAtmo.fogColor, smoothAtmo.fogColor, targetAtmo.fogColor, blend);
        M.v3Lerp(smoothAtmo.shadowTint, smoothAtmo.shadowTint, targetAtmo.shadowTint, blend);
        smoothAtmo.fogDensity = M.lerp(smoothAtmo.fogDensity, targetAtmo.fogDensity, blend);
        smoothAtmo.heightFogDensity = M.lerp(smoothAtmo.heightFogDensity, targetAtmo.heightFogDensity, blend);
        smoothAtmo.heightFogBase = M.lerp(smoothAtmo.heightFogBase, targetAtmo.heightFogBase, blend);

        // Smoothly interpolate between current Shichen and next Shichen for continuous day-night cycle
        const scIdx0 = ((Math.floor(shichenFloat) % 12) + 12) % 12;
        const scIdx1 = (scIdx0 + 1) % 12;
        const scFrac = M.smoothstep(0, 1, shichenFloat - Math.floor(shichenFloat));
        const sc0 = SHICHEN_CYCLE[scIdx0];
        const sc1 = SHICHEN_CYCLE[scIdx1];

        M.v3Lerp(interpSunDir, sc0.sunDir, sc1.sunDir, scFrac);
        M.v3Normalize(interpSunDir, interpSunDir);
        M.v3Lerp(currentSunDir, currentSunDir, interpSunDir, Math.min(1, blend * 2.2));
        M.v3Normalize(currentSunDir, currentSunDir);

        for (let i = 0; i < 3; i++) {
          const sunT    = M.lerp(sc0.sunTint[i],    sc1.sunTint[i],    scFrac);
          const skyTopT = M.lerp(sc0.skyTopTint[i], sc1.skyTopTint[i], scFrac);
          const skyHorT = M.lerp(sc0.skyHorTint[i], sc1.skyHorTint[i], scFrac);
          const fogT    = M.lerp(sc0.fogTint[i],    sc1.fogTint[i],    scFrac);
          const shadT   = M.lerp(sc0.shadowTint[i], sc1.shadowTint[i], scFrac);
          finalAtmo.sunColor[i]   = smoothAtmo.sunColor[i]   * sunT;
          finalAtmo.skyTop[i]     = smoothAtmo.skyTop[i]     * skyTopT;
          finalAtmo.skyHorizon[i] = smoothAtmo.skyHorizon[i] * skyHorT;
          finalAtmo.fogColor[i]   = smoothAtmo.fogColor[i]   * fogT;
          finalAtmo.shadowTint[i] = smoothAtmo.shadowTint[i] * shadT;
        }
        finalAtmo.fogDensity = smoothAtmo.fogDensity;
        finalAtmo.heightFogDensity = smoothAtmo.heightFogDensity;
        finalAtmo.heightFogBase = smoothAtmo.heightFogBase;

        renderer.render(camera, finalAtmo, currentSunDir, elapsed, protagonist, worldData.monsters, worldData.skills, worldData.treasures, worldData.herbs, worldData.ores, worldData.drops, worldData.city, worldData.npcs, worldData.furnaces);
        if (nametagCtx) {
          if (worldData.monsters) {
            worldData.monsters.renderNameTags(
              nametagCtx,
              window.innerWidth,
              window.innerHeight,
              nametagDpr,
              renderer.vpMat,
              camera.pos
            );
          }
          if (worldData.herbs) {
            worldData.herbs.renderLabels(
              nametagCtx,
              window.innerWidth,
              window.innerHeight,
              nametagDpr,
              renderer.vpMat,
              camera.pos
            );
          }
          if (worldData.ores) {
            worldData.ores.renderLabels(
              nametagCtx,
              window.innerWidth,
              window.innerHeight,
              nametagDpr,
              renderer.vpMat,
              camera.pos
            );
          }
          if (worldData.drops) {
            worldData.drops.renderLabels(
              nametagCtx,
              window.innerWidth,
              window.innerHeight,
              nametagDpr,
              renderer.vpMat,
              camera.pos
            );
          }
          if (worldData.city) {
            worldData.city.renderLabels(
              nametagCtx,
              window.innerWidth,
              window.innerHeight,
              nametagDpr,
              renderer.vpMat,
              camera.pos
            );
          }
          if (worldData.furnaces) {
            worldData.furnaces.renderLabels(
              nametagCtx,
              window.innerWidth,
              window.innerHeight,
              nametagDpr,
              renderer.vpMat,
              camera.pos,
              pPos
            );
          }
          if (worldData.npcs) {
            worldData.npcs.renderNameTags(
              nametagCtx,
              window.innerWidth,
              window.innerHeight,
              nametagDpr,
              renderer.vpMat,
              camera.pos,
              pPos
            );
          }
        }
        if (bgm && userSettings.sound === 'on') {
          const spd = Math.hypot(camera.vel[0], camera.vel[1], camera.vel[2]);
          bgm.update(pPos[1], spd, camera.flying);
        }
        if (minimap) {
          minimap.render(pPos, camera.yaw, targetAtmo.region ? targetAtmo.region.name : '低云平原', elapsed);
        }
      }
      requestAnimationFrame(frame);
    }

    // Apply initial launch config (New Game starter gifts or Loaded Save) before entering frame loop!
    applyLaunchConfig(initialLaunch);
    if (setLoadProgress) setLoadProgress(100, '灵气已通，踏入青云山海！');
    await nextUiTick();

    requestAnimationFrame(frame);

    return {
      applyLaunchConfig,
      applySettingsFromMenu(settingsObj) {
        if (!settingsObj) return;
        for (const k of Object.keys(settingsObj)) {
          applyUserSetting(k, settingsObj[k]);
        }
      },
      saveAuto() {
        saveToSlot('auto');
      },
    };
  }

  // =========================================================
  // MAIN TITLE SCREEN, CHARACTER CREATION & SAVE LOADER GATE
  // =========================================================
  function initMainMenuGate() {
    const overlay = document.getElementById('main-menu-overlay');
    const homeView = document.getElementById('mm-home-view');
    const createView = document.getElementById('mm-create-view');
    const loadView = document.getElementById('mm-load-view');
    const settingsView = document.getElementById('mm-settings-view');
    const quitView = document.getElementById('mm-quit-view');

    const btnNew = document.getElementById('mm-btn-new');
    const btnContinue = document.getElementById('mm-btn-continue');
    const btnLoad = document.getElementById('mm-btn-load');
    const btnSettings = document.getElementById('mm-btn-settings');
    const btnQuit = document.getElementById('mm-btn-quit');
    const btnBackHome = document.getElementById('mm-btn-back-home');
    const saveHint = document.getElementById('mm-save-hint');

    const ccNameInput = document.getElementById('cc-name-input');
    const ccElemGrid = document.getElementById('cc-elem-grid');
    const ccGiftPreview = document.getElementById('cc-gift-preview');
    const ccBtnBack = document.getElementById('cc-btn-back');
    const ccBtnEnter = document.getElementById('cc-btn-enter');

    const loadBack = document.getElementById('mm-load-back');
    const saveListEl = document.getElementById('mm-save-list');
    const settingsBack = document.getElementById('mm-settings-back');
    const settingsListEl = document.getElementById('mm-settings-list');

    const loadingOverlay = document.getElementById('world-loading-overlay');
    const loadingStageText = document.getElementById('loading-stage-text');
    const loadingBarFill = document.getElementById('loading-bar-fill');
    const loadingPct = document.getElementById('loading-pct');

    let selectedElem = 'metal';
    let gameRuntime = null;
    let launching = false;

    const pendingSettings = {
      sound: 'on',
      resolution: 'high',
      viewDistance: 'medium',
      quality: 'medium',
      shadowQuality: 'medium',
    };

    function setLoadProgress(pct, text) {
      if (loadingBarFill) loadingBarFill.style.width = `${M.clamp(pct, 0, 100)}%`;
      if (loadingPct) loadingPct.textContent = `${Math.round(M.clamp(pct, 0, 100))}%`;
      if (loadingStageText && text) loadingStageText.textContent = text;
    }

    function showTitleView(viewName) {
      if (homeView) homeView.classList.toggle('view-hidden', viewName !== 'home');
      if (createView) createView.classList.toggle('view-hidden', viewName !== 'create');
      if (loadView) loadView.classList.toggle('view-hidden', viewName !== 'load');
      if (settingsView) settingsView.classList.toggle('view-hidden', viewName !== 'settings');
      if (quitView) quitView.classList.toggle('view-hidden', viewName !== 'quit');
    }

    function refreshHomeSaveStatus() {
      const latest = getLatestSaveEntry();
      if (btnContinue) btnContinue.disabled = !latest;
      if (saveHint) {
        if (latest) {
          const g = STARTER_ELEMENT_GIFTS[latest.playerElement] || STARTER_ELEMENT_GIFTS.metal;
          saveHint.textContent = `最近存档：${latest.playerName || '青云散修'} · ${g.elemName}行 · ${latest.realmLabel || '练气一层'} (${formatSaveTime(latest.savedAt)})`;
        } else {
          saveHint.textContent = '暂无存档，点击「新游戏」创建角色并开启仙途';
        }
      }
    }

    function updateGiftPreview() {
      const g = STARTER_ELEMENT_GIFTS[selectedElem] || STARTER_ELEMENT_GIFTS.metal;
      if (ccGiftPreview) {
        ccGiftPreview.innerHTML = `开局赠礼：<strong>《${g.skillName}》技能书 ×1</strong> ＋ <strong>${g.outfitName} ×1</strong>（存入储物背包，可在背包中研习普攻并穿戴服饰）`;
      }
      if (ccElemGrid) {
        const cards = ccElemGrid.querySelectorAll('.cc-elem-card');
        for (const c of cards) {
          c.classList.toggle('active', c.getAttribute('data-cc-elem') === selectedElem);
        }
      }
    }

    function renderLoadSaveList() {
      if (!saveListEl) return;
      const all = loadAllSaves();
      const slots = [
        { key: 'auto',  label: '自动存档' },
        { key: 'slot1', label: '存档位一' },
        { key: 'slot2', label: '存档位二' },
        { key: 'slot3', label: '存档位三' },
      ];
      saveListEl.innerHTML = '';
      let anySave = false;
      for (const s of slots) {
        const d = all[s.key];
        if (d) anySave = true;
        const g = d ? (STARTER_ELEMENT_GIFTS[d.playerElement] || STARTER_ELEMENT_GIFTS.metal) : null;
        const row = document.createElement('div');
        row.className = 'mm-save-row';
        row.innerHTML = `
          <div class="mm-save-info">
            <span class="mm-save-title">${s.label}${d ? ` · ${d.playerName} (${g.elemName}行 · ${d.realmLabel || '练气一层'})` : ' · 空'}</span>
            <span class="mm-save-meta">${d ? `低阶灵石 ${d.spiritStones || 0} · ${formatSaveTime(d.savedAt)}` : '尚无修行记录'}</span>
          </div>
          <div class="mm-save-actions">
            ${d ? `<button type="button" class="shop-action-btn" data-load-slot="${s.key}">读取</button>
                   <button type="button" class="shop-action-btn sell-btn" data-del-slot="${s.key}">删除</button>` : ''}
          </div>
        `;
        const lb = row.querySelector('button[data-load-slot]');
        if (lb && d) {
          lb.addEventListener('click', (e) => {
            e.stopPropagation();
            launchWorld({ mode: 'load', saveData: d });
          });
        }
        const db = row.querySelector('button[data-del-slot]');
        if (db) {
          db.addEventListener('click', (e) => {
            e.stopPropagation();
            const cur = loadAllSaves();
            delete cur[s.key];
            writeAllSaves(cur);
            renderLoadSaveList();
            refreshHomeSaveStatus();
          });
        }
        saveListEl.appendChild(row);
      }
      if (!anySave) {
        saveListEl.innerHTML = `<div class="shop-empty-hint">暂无可用存档，请返回主界面点击「新游戏」创建角色。</div>`;
      }
    }

    async function launchWorld(launchConfig) {
      if (launching) return;
      launching = true;
      if (loadingOverlay) loadingOverlay.classList.remove('hidden');
      setLoadProgress(6, '正在开启青云仙途…');
      await nextUiTick();

      if (!gameRuntime) {
        gameRuntime = await startGameWorld(launchConfig, pendingSettings, setLoadProgress, () => {
          refreshHomeSaveStatus();
          showTitleView('home');
          if (overlay) overlay.classList.remove('hidden');
        });
      } else {
        setLoadProgress(55, '正在载入角色修为与行囊…');
        await nextUiTick();
        gameRuntime.applySettingsFromMenu(pendingSettings);
        gameRuntime.applyLaunchConfig(launchConfig);
        setLoadProgress(100, '灵气已通，踏入青云山海！');
        await nextUiTick();
      }

      if (loadingOverlay) loadingOverlay.classList.add('hidden');
      if (overlay) overlay.classList.add('hidden');
      launching = false;
    }

    if (btnNew) {
      btnNew.addEventListener('click', (e) => {
        e.stopPropagation();
        updateGiftPreview();
        showTitleView('create');
      });
    }
    if (btnContinue) {
      btnContinue.addEventListener('click', (e) => {
        e.stopPropagation();
        const latest = getLatestSaveEntry();
        if (!latest) return;
        launchWorld({ mode: 'load', saveData: latest });
      });
    }
    if (btnLoad) {
      btnLoad.addEventListener('click', (e) => {
        e.stopPropagation();
        renderLoadSaveList();
        showTitleView('load');
      });
    }
    if (btnSettings) {
      btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        showTitleView('settings');
      });
    }
    if (btnQuit) {
      btnQuit.addEventListener('click', (e) => {
        e.stopPropagation();
        showTitleView('quit');
        try { window.close(); } catch (_) {}
      });
    }
    if (btnBackHome) btnBackHome.addEventListener('click', (e) => { e.stopPropagation(); showTitleView('home'); });
    if (ccBtnBack) ccBtnBack.addEventListener('click', (e) => { e.stopPropagation(); showTitleView('home'); });
    if (loadBack) loadBack.addEventListener('click', (e) => { e.stopPropagation(); showTitleView('home'); });
    if (settingsBack) settingsBack.addEventListener('click', (e) => { e.stopPropagation(); showTitleView('home'); });

    if (ccElemGrid) {
      ccElemGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.cc-elem-card');
        if (!card) return;
        e.stopPropagation();
        selectedElem = card.getAttribute('data-cc-elem') || 'metal';
        updateGiftPreview();
      });
    }
    if (ccBtnEnter) {
      ccBtnEnter.addEventListener('click', (e) => {
        e.stopPropagation();
        const rawName = ccNameInput ? ccNameInput.value.trim() : '';
        const name = rawName || '青云散修';
        launchWorld({ mode: 'new', name, element: selectedElem });
      });
    }
    if (settingsListEl) {
      settingsListEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.opt-btn[data-mm-setting]');
        if (!btn) return;
        e.stopPropagation();
        const k = btn.getAttribute('data-mm-setting');
        const v = btn.getAttribute('data-value');
        if (!k || !v) return;
        pendingSettings[k] = v;
        const peers = settingsListEl.querySelectorAll(`.opt-btn[data-mm-setting="${k}"]`);
        for (const p of peers) p.classList.toggle('active', p.getAttribute('data-value') === v);
        if (gameRuntime) gameRuntime.applySettingsFromMenu({ [k]: v });
      });
    }

    refreshHomeSaveStatus();
    updateGiftPreview();
    showTitleView('home');
  }

  window.addEventListener('DOMContentLoaded', initMainMenuGate);
})(window);
