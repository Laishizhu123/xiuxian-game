(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;

  // Curated scenic vantage points (position + yaw/pitch + recommended mode)
  // Yaw = 0 looks along -Z; positive yaw turns left (+X is right when yaw=0, let's be exact!)
  // Forward vector convention: fx = -sin(yaw)*cos(pitch), fy = sin(pitch), fz = -cos(yaw)*cos(pitch)
  // Protagonist Birthplace: Abandoned Immortal Cave-Mansion (废弃洞府) at the center of 幽林秘岭!
  const caveSpawnX = T.HIDDEN_MOUNTAINS ? T.HIDDEN_MOUNTAINS.spawnX : T.LOW_CLOUD_PLAINS.spawnX;
  const caveSpawnZ = T.HIDDEN_MOUNTAINS ? T.HIDDEN_MOUNTAINS.spawnZ : T.LOW_CLOUD_PLAINS.spawnZ;
  const caveSpawnY = (T.HIDDEN_MOUNTAINS ? T.HIDDEN_MOUNTAINS.caveY : T.getTerrainHeight(caveSpawnX, caveSpawnZ)) + 3.0;

  const lowCloudX = T.LOW_CLOUD_PLAINS.spawnX;
  const lowCloudZ = T.LOW_CLOUD_PLAINS.spawnZ;
  const lowCloudY = T.getTerrainHeight(lowCloudX, lowCloudZ) + 3.2;

  const swampX = T.CHENYAN_SWAMP.viewX;
  const swampZ = T.CHENYAN_SWAMP.viewZ;
  const swampY = T.getTerrainHeight(swampX, swampZ) + 3.2;

  const canzhenX = T.CANZHEN_ROAD.viewX;
  const canzhenZ = T.CANZHEN_ROAD.viewZ;
  const canzhenY = T.getTerrainHeight(canzhenX, canzhenZ) + 3.2;

  const spiritX = T.SPIRIT_FOREST.viewX;
  const spiritZ = T.SPIRIT_FOREST.viewZ;
  const spiritY = T.getTerrainHeight(spiritX, spiritZ) + 3.2;

  const cloudMtnX = T.CLOUD_MOUNTAIN.viewX;
  const cloudMtnZ = T.CLOUD_MOUNTAIN.viewZ;
  const cloudMtnY = T.getTerrainHeight(cloudMtnX, cloudMtnZ) + 3.2;

  const desertX = T.DESERT_DUNES.viewX;
  const desertZ = T.DESERT_DUNES.viewZ;
  const desertY = T.getTerrainHeight(desertX, desertZ) + 3.2;

  const frostX = T.FROST_SNOWFIELD.viewX;
  const frostZ = T.FROST_SNOWFIELD.viewZ;
  const frostY = T.getTerrainHeight(frostX, frostZ) + 3.2;

  const frostMtnX = T.FROST_MOUNTAIN.viewX;
  const frostMtnZ = T.FROST_MOUNTAIN.viewZ;
  const frostMtnY = T.getTerrainHeight(frostMtnX, frostMtnZ) + 3.2;

  const qingshiGateY = T.getTerrainHeight(0, 152) + 3.0;
  const qingshiPlazaY = T.getTerrainHeight(0, 36) + 3.0;
  const bambooValX = T.BAMBOO_VALLEY.viewX;
  const bambooValZ = T.BAMBOO_VALLEY.viewZ;
  const bambooValY = T.getTerrainHeight(bambooValX, bambooValZ) + 3.0;
  const venomMireX = T.VENOM_MIRE.viewX;
  const venomMireZ = T.VENOM_MIRE.viewZ;
  const venomMireY = T.VENOM_MIRE.arenaY + 3.0;

  const SCENIC_VIEWS = {
    '1': { name: '幽林秘岭 · 废弃洞府', poem: '危峰隐古洞 · 密林锁青烟', pos: [caveSpawnX, caveSpawnY, caveSpawnZ], yaw: 0.0, pitch: 0.08, flying: false },
    '2': { name: '青石仙城 · 南天正门', poem: '巍峨青石阙 · 仙阵镇四方', pos: [0, qingshiGateY, 152], yaw: 0.0, pitch: 0.02, flying: false },
    '3': { name: '青石仙城 · 聚灵广场', poem: '八方聚灵柱 · 百阁隐仙烟', pos: [0, qingshiPlazaY, 36], yaw: 0.0, pitch: 0.02, flying: false },
    '4': { name: '青石仙城 · 俯瞰全景', poem: '重檐飞碧瓦 · 仙城映苍穹', pos: [106, 116.0, 138], yaw: 0.64, pitch: -0.44, flying: true },
    '5': { name: '灵竹幽谷', poem: '翠竹含清辉 · 幽谷藏灵岚', pos: [bambooValX, bambooValY, bambooValZ], yaw: Math.PI, pitch: -0.06, flying: false },
    '6': { name: '蚀骨毒潭', poem: '焦岩锁蚀潭 · 幽毒映枯林', pos: [venomMireX, venomMireY, venomMireZ], yaw: -Math.PI * 0.5, pitch: -0.08, flying: false },
    '7': { name: '低云平原', poem: '云低芳草阔 · 风暖大原平', pos: [lowCloudX, lowCloudY, lowCloudZ], yaw: -0.66, pitch: 0.01, flying: false },
    '9': { name: '沉烟迷泽 · 迷雾湿地', poem: '沉烟锁泽畔 · 芦雪映幽潭', pos: [swampX, swampY, swampZ], yaw: -2.32, pitch: -0.09, flying: false },
    '0': { name: '残阵古道', poem: '荒坡横古道 · 残阵锁苍烟', pos: [canzhenX, canzhenY, canzhenZ], yaw: 1.03, pitch: 0.03, flying: false },
    '=': { name: '通天灵木林', poem: '古木参青冥 · 灵光透碧荫', pos: [spiritX, spiritY, spiritZ], yaw: 0.36, pitch: 0.14, flying: false },
    '[': { name: '云雾山', poem: '七重登云海 · 绝顶聚灵辉', pos: [cloudMtnX, cloudMtnY, cloudMtnZ], yaw: 3.14, pitch: 0.08, flying: false },
    ']': { name: '流沙荒漠', poem: '大漠连孤烟 · 残碑卧金沙', pos: [desertX, desertY, desertZ], yaw: 2.02, pitch: -0.05, flying: false },
    '\\': { name: '霜雪原', poem: '朔风卷玉屑 · 寒潭映冰心', pos: [frostX, frostY, frostZ], yaw: 0.02, pitch: -0.04, flying: false },
    ';': { name: '霜雪山', poem: '六重凌雪岭 · 玉峰接玄冥', pos: [frostMtnX, frostMtnY, frostMtnZ], yaw: 0.0, pitch: 0.06, flying: false },
    '-': { name: '青云大界 · 山海全景', poem: '低云连万里 · 仙岫入青冥', pos: [-840, 590.0, 1880], yaw: -0.36, pitch: -0.32, flying: true },
  };

  class CameraController {
    constructor(canvas, onStateChange, collisionWorld = null) {
      this.canvas = canvas;
      this.onStateChange = onStateChange || (() => {});
      this.collisionWorld = collisionWorld;
      this.lastCollision = { hitWall: false, hitCeiling: false, hitTag: null };

      const v1 = SCENIC_VIEWS['1'];
      this.eyeHeight = 1.98;
      const initFootY = T.getWalkableHeight(v1.pos[0], v1.pos[2], v1.pos[1]);
      this.playerPos = new Float32Array([v1.pos[0], initFootY, v1.pos[2]]);
      this.playerEyePos = new Float32Array([v1.pos[0], initFootY + this.eyeHeight, v1.pos[2]]);
      this.pos = new Float32Array(this.playerEyePos); // Computed third-person camera eye pos
      this.vel = new Float32Array([0, 0, 0]);
      this.yaw = v1.yaw;
      this.pitch = -0.14;
      this.targetYaw = v1.yaw;
      this.targetPitch = -0.14;
      this.charYaw = v1.yaw;
      this.thirdPerson = true;
      this.camDist = 6.2;
      this.targetCamDist = 6.2;
      this.isSprinting = false;

      this.flying = false;
      this.grounded = true;
      this.meditating = false;
      this.meditateSeatPos = null;
      this.meditateSeatYaw = 0;
      this.onExitMeditate = null;
      this.verticalVel = 0;
      this.bobPhase = 0;
      this.speedScale = 1.0;
      this.moveSpeedStat = 1.0; // 主角基础移速数值，初始为 1
      this.flyingSpeedMul = 1.0; // 飞剑品阶御剑遁速倍率
      this.flightSpeed = 14.5;      // 常规御剑飞行速度（由飞剑品级决定）
      this.flightBoostSpeed = 21.5; // 加速御剑飞行速度（按住Shift消耗体力+灵力）
      this.flightMaxAGL = 22.0;     // 相对地面的最大御剑高度（由飞剑品级决定）
      this.canFlyCheck = null;      // 御剑飞行前置检查（需装备飞剑且灵力充足）
      this.tryConsumeFlightMp = null;           // 浮空/飞行持续灵力消耗钩子
      this.tryConsumeFlightBoostStamina = null; // 加速飞行额外体力消耗钩子
      this.externalSlowFactor = 1.0;
      this.externalSpeedFactor = 1.0;
      this.castMoveScale = 1.0;
      this.lastMouseClientX = window.innerWidth * 0.5;
      this.lastMouseClientY = window.innerHeight * 0.5;
      this.dashState = null;
      this.monsterSystem = null;
      this.oreSystem = null;
      this.citySystem = null;
      this.npcSystem = null;
      this.tryConsumeJumpStamina = null;
      this.tryConsumeSprintStamina = null;

      this.active = false;
      this.mapPaused = false;
      this.pointerLocked = false;
      this.attackMode = false;
      this.attackZoomBlend = 0.0;
      this.skillAimLocked = false;
      this.onSkillAimMouseMove = null;
      this.dragging = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.lastSpaceTime = 0;

      this.keys = new Set();
      this.glide = null; // smooth cinematic camera transition

      this.forward = new Float32Array(3);
      this.right = new Float32Array(3);
      this.up = new Float32Array(3);
      this.viewMat = M.mat4();
      this.viewNoTrans = M.mat4();

      this._bindEvents();
      this.updateVectors();
    }

    _bindEvents() {
      window.addEventListener('keydown', (e) => {
        if (!this.active || this.mapPaused) return;
        const code = e.code;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
          e.preventDefault();
        }
        // Cancel glide immediately if user moves manually
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
          this.glide = null;
        }

        if (!e.repeat) {
          if (code === 'KeyF') {
            this.setFlying(!this.flying);
          } else if (code === 'Space') {
            const now = performance.now();
            if (now - this.lastSpaceTime < 280) {
              this.setFlying(!this.flying);
              this.lastSpaceTime = 0;
            } else {
              this.lastSpaceTime = now;
              if (!this.flying && this.grounded) {
                const canJump = !this.tryConsumeJumpStamina || this.tryConsumeJumpStamina();
                if (canJump) {
                  this.verticalVel = 12.2;
                  this.grounded = false;
                }
              }
            }
          } else if (code.startsWith('Digit') && SCENIC_VIEWS[code.slice(5)]) {
            this.glideTo(SCENIC_VIEWS[code.slice(5)]);
          } else if (code === 'Minus' && SCENIC_VIEWS['-']) {
            this.glideTo(SCENIC_VIEWS['-']);
          } else if (code === 'Equal' && SCENIC_VIEWS['=']) {
            this.glideTo(SCENIC_VIEWS['=']);
          } else if (code === 'BracketLeft' && SCENIC_VIEWS['[']) {
            this.glideTo(SCENIC_VIEWS['[']);
          } else if (code === 'BracketRight' && SCENIC_VIEWS[']']) {
            this.glideTo(SCENIC_VIEWS[']']);
          } else if (code === 'Backslash' && SCENIC_VIEWS['\\']) {
            this.glideTo(SCENIC_VIEWS['\\']);
          } else if (code === 'Semicolon' && SCENIC_VIEWS[';']) {
            this.glideTo(SCENIC_VIEWS[';']);
          }
        }
        this.keys.add(code);
      });

      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
      });

      window.addEventListener('blur', () => {
        this.keys.clear();
        this.dragging = false;
      });

      // Mouse drag & free mouse look (works seamlessly both in Attack Mode and after canceling Attack Mode!)
      this._dragStartX = 0;
      this._dragStartY = 0;
      this._dragMoved = false;
      this._hasMouseSample = false;
      this.canvas.addEventListener('mousedown', (e) => {
        if (!this.active || this.mapPaused) return;
        this.skillAimLocked = false;
        // 点击游戏画面直接锁定鼠标（无需先切攻击模式）
        if (!this.pointerLocked && this.canvas && this.canvas.requestPointerLock) {
          try {
            const p = this.canvas.requestPointerLock();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch (_) {}
        }
        if (e.button === 0 || e.button === 2) {
          this.dragging = true;
          this._dragStartX = e.clientX;
          this._dragStartY = e.clientY;
          this._dragMoved = false;
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
          this._hasMouseSample = true;
          this.glide = null;
        }
      });

      window.addEventListener('mouseup', () => {
        this.dragging = false;
      });

      window.addEventListener('mousemove', (e) => {
        this.lastMouseClientX = e.clientX;
        this.lastMouseClientY = e.clientY;
        if (!this.active || this.mapPaused) {
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
          this._hasMouseSample = true;
          return;
        }

        const sens = 0.0022;
        if (this.pointerLocked) {
          this.glide = null;
          this.targetYaw -= (e.movementX || 0) * sens;
          this.targetPitch = M.clamp(this.targetPitch - (e.movementY || 0) * sens, -1.42, 1.42);
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
          this._hasMouseSample = true;
        } else {
          if (!this._hasMouseSample) {
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this._hasMouseSample = true;
            return;
          }
          const dx = e.clientX - this.lastMouseX;
          const dy = e.clientY - this.lastMouseY;
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;

          if (this.dragging) {
            if (Math.hypot(e.clientX - this._dragStartX, e.clientY - this._dragStartY) > 5) {
              this._dragMoved = true;
            }
          }
          // Rotate camera view smoothly when dragging OR when moving mouse over the game canvas (even after ESC exits Attack Mode!)
          if (this.dragging || e.target === this.canvas) {
            if (Math.abs(dx) < 140 && Math.abs(dy) < 140) {
              this.glide = null;
              const mul = this.dragging ? 1.45 : 1.15;
              this.targetYaw -= dx * sens * mul;
              this.targetPitch = M.clamp(this.targetPitch - dy * sens * mul, -1.42, 1.42);
            }
          }
        }
      });

      document.addEventListener('pointerlockchange', () => {
        this.pointerLocked = (document.pointerLockElement === this.canvas);
        this.skillAimLocked = false;
        this._hasMouseSample = false;
        if (!this.pointerLocked) {
          this.attackMode = false;
        }
        this.onStateChange({ pointerLocked: this.pointerLocked, attackMode: this.attackMode });
      });

      this.canvas.addEventListener('wheel', (e) => {
        if (!this.active) return;
        e.preventDefault();
        if (this.thirdPerson) {
          const zFactor = e.deltaY > 0 ? 1.10 : 0.91;
          this.targetCamDist = M.clamp(this.targetCamDist * zFactor, 2.3, 12.0);
        } else {
          const factor = e.deltaY < 0 ? 1.12 : 0.89;
          this.speedScale = M.clamp(this.speedScale * factor, 0.35, 3.2);
        }
      }, { passive: false });
    }

    setAttackMode(enabled, exitLock = false) {
      const next = !!enabled;
      this.attackMode = next;
      this.skillAimLocked = false;
      this._hasMouseSample = false;
      if (next) {
        if (!this.pointerLocked && this.canvas && this.canvas.requestPointerLock) {
          try {
            const p = this.canvas.requestPointerLock();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch (_) {}
        }
      } else if (exitLock && this.pointerLocked && document.exitPointerLock) {
        try { document.exitPointerLock(); } catch (_) {}
      }
      this.onStateChange({ attackMode: this.attackMode, pointerLocked: this.pointerLocked });
    }

    setFlying(isFlying, bypassCheck = false) {
      if (this.flying === isFlying) return;
      if (isFlying && !bypassCheck && this.canFlyCheck && !this.canFlyCheck()) {
        return;
      }
      this.flying = isFlying;
      this.verticalVel = 0;
      if (isFlying) {
        // Gentle graceful lift-off when taking flight from ground
        this.vel[1] = Math.max(this.vel[1], 6.5);
      }
      this.onStateChange({ flying: this.flying });
    }

    glideTo(view) {
      this.setFlying(view.flying, true);
      if (view.name) {
        this.onStateChange({ presetBanner: { id: 'preset_' + view.name, name: view.name, poem: view.poem || '' } });
      }
      // Shortest angular path for yaw
      let dyaw = ((view.yaw - this.targetYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (dyaw < -Math.PI) dyaw += Math.PI * 2;
      const endGroundY = T.getWalkableHeight(view.pos[0], view.pos[2], view.pos[1]);
      const endFootY = view.flying ? Math.max(view.pos[1] - this.eyeHeight, endGroundY + 1.5) : endGroundY;
      this.glide = {
        startPos: new Float32Array(this.playerEyePos),
        endPos: new Float32Array([view.pos[0], endFootY + this.eyeHeight, view.pos[2]]),
        startYaw: this.targetYaw,
        endYaw: this.targetYaw + dyaw,
        startPitch: this.targetPitch,
        endPitch: view.flying ? view.pitch : Math.min(view.pitch, -0.10),
        elapsed: 0,
        duration: 1.75,
      };
    }

    // Immediate jump for programmatic inspection / testing without glide wait
    setViewImmediate(pos, yaw, pitch, flying = true) {
      this.glide = null;
      const gY = T.getWalkableHeight(pos[0], pos[2], pos[1]);
      const footY = flying ? Math.max(pos[1] - this.eyeHeight, gY + 1.0) : gY;
      this.playerPos[0] = pos[0]; this.playerPos[1] = footY; this.playerPos[2] = pos[2];
      this.playerEyePos[0] = pos[0]; this.playerEyePos[1] = footY + this.eyeHeight; this.playerEyePos[2] = pos[2];
      this.yaw = this.targetYaw = yaw;
      this.charYaw = yaw;
      this.pitch = this.targetPitch = flying ? pitch : M.clamp(pitch - 0.12, -0.75, 0.35);
      this.flying = flying;
      this.grounded = !flying;
      this.verticalVel = 0;
      this.vel.fill(0);
      this.updateVectors();
      this.onStateChange({ flying: this.flying });
    }

    triggerDash(dirX, dirZ, dist, dur, mode = 'metal') {
      const len = Math.hypot(dirX, dirZ) || 1.0;
      const d = Math.max(0.12, dur || 0.24);
      const speed = (dist || 7.5) / d;
      this.dashState = {
        vx: (dirX / len) * speed,
        vz: (dirZ / len) * speed,
        timer: d,
        duration: d,
        mode,
      };
    }

    setMeditating(active, seatPos = null, seatYaw = 0) {
      if (active && seatPos) {
        if (this.flying) this.setFlying(false, true);
        this.meditating = true;
        this.meditateSeatPos = [seatPos[0], seatPos[1], seatPos[2]];
        this.meditateSeatYaw = seatYaw || 0;
        this.playerPos[0] = seatPos[0];
        this.playerPos[1] = seatPos[1];
        this.playerPos[2] = seatPos[2];
        this.playerEyePos[0] = seatPos[0];
        this.playerEyePos[1] = seatPos[1] + this.eyeHeight;
        this.playerEyePos[2] = seatPos[2];
        this.charYaw = this.meditateSeatYaw;
        this.vel.fill(0);
        this.verticalVel = 0;
        this.grounded = true;
        this.isSprinting = false;
      } else if (this.meditating) {
        this.meditating = false;
        this.meditateSeatPos = null;
        if (this.onExitMeditate) this.onExitMeditate();
      }
    }

    getCharacterState() {
      return {
        x: this.playerPos[0],
        y: this.playerPos[1],
        z: this.playerPos[2],
        yaw: this.charYaw,
        horizontalSpeed: Math.hypot(this.vel[0], this.vel[2]),
        flying: this.flying,
        grounded: this.grounded,
        sprinting: this.isSprinting,
        meditating: this.meditating,
      };
    }

    updateVectors() {
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);

      this.forward[0] = -sy * cp;
      this.forward[1] = sp;
      this.forward[2] = -cy * cp;
      M.v3Normalize(this.forward, this.forward);

      this.right[0] = cy;
      this.right[1] = 0;
      this.right[2] = -sy;

      M.v3Cross(this.up, this.right, this.forward);
      M.v3Normalize(this.up, this.up);

      if (this.thirdPerson) {
        // Orbit third-person camera behind & slightly above protagonist;
        // In Attack Mode (pointerLocked & not skillAimLocked), smoothly advance camera forward (6.2m -> 3.85m)
        // with a right-shoulder offset (+0.85m) so the protagonist stays fully visible on the left while
        // the center crosshair never overlaps the character body and has a clear unobstructed view downward!
        const az = this.attackZoomBlend || 0.0;
        const pivotX = this.playerPos[0] + this.right[0] * (0.85 * az);
        const pivotY = this.playerPos[1] + M.lerp(2.02, 2.08, az);
        const pivotZ = this.playerPos[2] + this.right[2] * (0.85 * az);
        const upPull = this.forward[1] > 0 ? (1.0 - 0.36 * this.forward[1]) : 1.0;
        const baseDist = M.lerp(this.camDist, Math.min(3.85, this.camDist * 0.65), az);
        const dist = Math.max(2.35, baseDist * upPull);

        let camX = pivotX - this.forward[0] * dist;
        let camY = pivotY - this.forward[1] * dist + 0.18 * (1.0 - 0.35 * az);
        let camZ = pivotZ - this.forward[2] * dist;

        // Smooth terrain-surface clearance along camera arm so camera never clips underground!
        const gMid = T.getWalkableHeight(M.lerp(pivotX, camX, 0.55), M.lerp(pivotZ, camZ, 0.55), camY);
        const gEnd = T.getWalkableHeight(camX, camZ, camY);
        const minCamY = Math.max(gMid, gEnd) + 0.48;
        if (camY < minCamY) {
          camY = minCamY;
        }

        this.pos[0] = camX;
        this.pos[1] = camY;
        this.pos[2] = camZ;

        // Look along full 3D forward vector (including upward sky pitch!) so aiming into the sky tilts cleanly!
        const lookDist = 3.2;
        const lookX = pivotX + this.forward[0] * lookDist;
        const lookY = pivotY + this.forward[1] * lookDist + 0.08;
        const lookZ = pivotZ + this.forward[2] * lookDist;
        M.m4LookAt(this.viewMat, this.pos, [lookX, lookY, lookZ], [0, 1, 0]);
      } else {
        this.pos.set(this.playerEyePos);
        const target = [
          this.pos[0] + this.forward[0],
          this.pos[1] + this.forward[1],
          this.pos[2] + this.forward[2],
        ];
        M.m4LookAt(this.viewMat, this.pos, target, [0, 1, 0]);
      }

      // Copy rotation-only view matrix for sky dome
      this.viewNoTrans.set(this.viewMat);
      this.viewNoTrans[12] = 0;
      this.viewNoTrans[13] = 0;
      this.viewNoTrans[14] = 0;
    }

    // Exact 3D ray through the center screen crosshair (supports 360° horizontal & full vertical sky/ground pitch!)
    getCrosshairRay() {
      const vm = this.viewMat;
      let fx = -vm[2], fy = -vm[6], fz = -vm[10];
      const len = Math.hypot(fx, fy, fz) || 1.0;
      fx /= len; fy /= len; fz /= len;
      return {
        ox: this.pos[0], oy: this.pos[1], oz: this.pos[2],
        dx: fx, dy: fy, dz: fz,
      };
    }

    // Project a 2D mouse cursor (clientX, clientY) onto the horizontal ground plane y = playerPos[1]
    screenToGroundPoint(clientX, clientY, maxRange = 30.0) {
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      const ndcX = (clientX / w) * 2.0 - 1.0;
      const ndcY = 1.0 - (clientY / h) * 2.0;
      const tanHalf = Math.tan((28.0 * Math.PI) / 180.0);
      const aspect = w / h;

      const vm = this.viewMat;
      const rx = vm[0], ry = vm[4], rz = vm[8];
      const ux = vm[1], uy = vm[5], uz = vm[9];
      const fx = -vm[2], fy = -vm[6], fz = -vm[10];

      const sx = ndcX * aspect * tanHalf;
      const sy = ndcY * tanHalf;
      let dx = fx + rx * sx + ux * sy;
      let dy = fy + ry * sx + uy * sy;
      let dz = fz + rz * sx + uz * sy;
      const len = Math.hypot(dx, dy, dz) || 1.0;
      dx /= len; dy /= len; dz /= len;

      const px = this.playerPos[0], py = this.playerPos[1], pz = this.playerPos[2];
      let wx, wz;
      if (dy < -0.03) {
        const t = M.clamp((py - this.pos[1]) / dy, 1.0, 120.0);
        wx = this.pos[0] + dx * t;
        wz = this.pos[2] + dz * t;
      } else {
        const hLen = Math.hypot(dx, dz) || 1.0;
        wx = px + (dx / hLen) * maxRange;
        wz = pz + (dz / hLen) * maxRange;
      }
      const offX = wx - px, offZ = wz - pz;
      const dist = Math.hypot(offX, offZ);
      const yaw = dist > 0.05 ? Math.atan2(-offX, -offZ) : this.yaw;
      const clampedDist = Math.min(maxRange, Math.max(0.8, dist));
      const dirX = dist > 0.05 ? (offX / dist) : -Math.sin(this.yaw);
      const dirZ = dist > 0.05 ? (offZ / dist) : -Math.cos(this.yaw);
      return {
        x: px + dirX * clampedDist,
        z: pz + dirZ * clampedDist,
        dirX,
        dirZ,
        yaw,
        dist: clampedDist,
      };
    }

    update(dt, time) {
      const clampedDt = Math.min(dt, 0.05);
      this.camDist = M.lerp(this.camDist, this.targetCamDist, 1 - Math.exp(-12 * clampedDt));
      const wantAttackCam = this.attackMode ? 1.0 : 0.0;
      this.attackZoomBlend = M.lerp(this.attackZoomBlend || 0.0, wantAttackCam, 1 - Math.exp(-12 * clampedDt));

      // Gentle scenic third-person panorama framing the protagonist before user clicks "踏云入境"
      if (!this.active) {
        const base = SCENIC_VIEWS['1'];
        const gY = T.getWalkableHeight(base.pos[0], base.pos[2], base.pos[1]);
        this.playerPos[0] = base.pos[0];
        this.playerPos[1] = gY;
        this.playerPos[2] = base.pos[2];
        this.playerEyePos[0] = base.pos[0];
        this.playerEyePos[1] = gY + this.eyeHeight;
        this.playerEyePos[2] = base.pos[2];
        this.charYaw = base.yaw;
        this.yaw = base.yaw + Math.sin(time * 0.16) * 0.24;
        this.pitch = -0.14 + Math.sin(time * 0.20) * 0.02;
        this.targetYaw = this.yaw;
        this.targetPitch = this.pitch;
        this.isSprinting = false;
        this.updateVectors();
        return;
      }

      // Smooth scenic landmark glide
      if (this.glide) {
        const g = this.glide;
        g.elapsed += clampedDt;
        const u = M.smootherstep(0, 1, Math.min(1, g.elapsed / g.duration));
        const arcY = Math.sin(u * Math.PI) * 10.0;
        this.playerEyePos[0] = M.lerp(g.startPos[0], g.endPos[0], u);
        this.playerEyePos[1] = M.lerp(g.startPos[1], g.endPos[1], u) + arcY;
        this.playerEyePos[2] = M.lerp(g.startPos[2], g.endPos[2], u);
        this.playerPos[0] = this.playerEyePos[0];
        this.playerPos[1] = this.playerEyePos[1] - this.eyeHeight;
        this.playerPos[2] = this.playerEyePos[2];
        this.yaw = this.targetYaw = M.lerp(g.startYaw, g.endYaw, u);
        this.charYaw = this.yaw;
        this.pitch = this.targetPitch = M.lerp(g.startPitch, g.endPitch, u);
        this.vel.fill(0);
        this.isSprinting = false;
        if (g.elapsed >= g.duration) {
          this.glide = null;
        }
        this.updateVectors();
        return;
      }

      // Smooth damped look interpolation
      const lookAlpha = 1 - Math.exp(-24 * clampedDt);
      this.yaw = M.lerp(this.yaw, this.targetYaw, lookAlpha);
      this.pitch = M.lerp(this.pitch, M.clamp(this.targetPitch, -0.95, 1.15), lookAlpha);

      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      const flatFwdX = -sy, flatFwdZ = -cy;
      const rightX = cy, rightZ = -sy;

      let moveF = 0, moveR = 0, moveU = 0;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp'))    moveF += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown'))  moveF -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveR += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))  moveR -= 1;
      if (this.keys.has('Space'))                          moveU += 1;
      if (this.keys.has('KeyC') || this.keys.has('ControlLeft')) moveU -= 1;

      const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      this.isSprinting = sprinting;

      // Standing up cleanly from Spirit Platform meditation if player presses movement/jump/fly keys
      if (this.meditating) {
        if (moveF !== 0 || moveR !== 0 || moveU > 0 || this.flying) {
          this.setMeditating(false);
        } else if (this.meditateSeatPos) {
          this.playerPos[0] = this.meditateSeatPos[0];
          this.playerPos[1] = this.meditateSeatPos[1];
          this.playerPos[2] = this.meditateSeatPos[2];
          this.playerEyePos[0] = this.meditateSeatPos[0];
          this.playerEyePos[1] = this.meditateSeatPos[1] + this.eyeHeight;
          this.playerEyePos[2] = this.meditateSeatPos[2];
          this.charYaw = this.meditateSeatYaw;
          this.vel.fill(0);
          this.isSprinting = false;
          this.grounded = true;
          this.updateVectors();
          return;
        }
      }

      // Active skill dash impulse (疾金步 / 踏浪滑 / 焰遁步)
      let dashVx = 0, dashVz = 0, isDashing = false;
      if (this.dashState) {
        this.dashState.timer -= clampedDt;
        const u = M.clamp(this.dashState.timer / Math.max(0.05, this.dashState.duration), 0, 1);
        const curve = 0.45 + 0.85 * Math.sin(u * Math.PI * 0.5);
        dashVx = this.dashState.vx * curve;
        dashVz = this.dashState.vz * curve;
        isDashing = true;
        if (this.dashState.timer <= 0) {
          this.dashState = null;
        }
      }

      if (this.flying) {
        // 只要处于浮空/御剑状态，无论静止悬停还是飞行都会持续消耗灵力；灵力耗尽自动落剑！
        if (this.tryConsumeFlightMp && !this.tryConsumeFlightMp(clampedDt)) {
          this.setFlying(false, true);
          this.isSprinting = false;
        }
      }

      if (this.flying) {
        // Sword Flight (御剑飞行) — 速度与飞行高度严格由装备的灵剑品阶（一品/二品/三品）决定！
        const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
        let dx = (-sy * cp) * moveF + rightX * moveR;
        let dy = sp * moveF + moveU * 0.72;
        let dz = (-cy * cp) * moveF + rightZ * moveR;
        const len = Math.hypot(dx, dy, dz);
        // 加速飞行（按住Shift且有移动）：消耗灵力的同时消耗体力！
        const wantsBoost = sprinting && len > 0.001 && !isDashing;
        const canBoost = wantsBoost && (!this.tryConsumeFlightBoostStamina || this.tryConsumeFlightBoostStamina(clampedDt));
        this.isSprinting = canBoost;
        const baseSpeed = (canBoost ? (this.flightBoostSpeed || 21.5) : (this.flightSpeed || 14.5)) * this.speedScale;
        if (len > 0.001) {
          dx = (dx / len) * baseSpeed;
          dy = (dy / len) * baseSpeed * 0.78;
          dz = (dz / len) * baseSpeed;
        }
        if (isDashing) {
          dx += dashVx;
          dz += dashVz;
        }
        const damp = 1 - Math.exp(-6.2 * clampedDt);
        this.vel[0] = M.lerp(this.vel[0], dx, damp);
        this.vel[1] = M.lerp(this.vel[1], dy, damp);
        this.vel[2] = M.lerp(this.vel[2], dz, damp);

        const moveLen = Math.hypot(this.vel[0], this.vel[1], this.vel[2]) * clampedDt;
        const subSteps = Math.max(1, Math.min(8, Math.ceil(moveLen / 0.65)));
        const subDt = clampedDt / subSteps;

        for (let s = 0; s < subSteps; s++) {
          this.playerEyePos[0] += this.vel[0] * subDt;
          this.playerEyePos[1] += this.vel[1] * subDt;
          this.playerEyePos[2] += this.vel[2] * subDt;

          if (this.collisionWorld) {
            this.lastCollision = this.collisionWorld.resolvePlayer(this.playerEyePos, this.vel, {
              radius: 0.72,
              eyeHeight: this.eyeHeight,
              headClear: 0.45,
              flying: true,
              terrainFn: T.getWalkableHeight,
            });
          }
          if (this.monsterSystem) {
            this.monsterSystem.resolvePlayerCollision(this.playerEyePos, this.vel, this.eyeHeight, 0.72);
          }
          const seaFloor = (T.OCEAN_WATER_Y !== undefined ? T.OCEAN_WATER_Y : 0.0);
          const localGroundY = Math.max(
            seaFloor,
            T.getWalkableHeight(this.playerEyePos[0], this.playerEyePos[2], this.playerEyePos[1] - this.eyeHeight)
          );
          const minH = localGroundY + this.eyeHeight + 0.65;
          if (this.playerEyePos[1] < minH) {
            this.playerEyePos[1] = M.lerp(this.playerEyePos[1], minH, 0.55);
            if (this.vel[1] < 0) this.vel[1] = 0;
          }
          // 品阶飞行高度限制（相对当前脚下地面/海面高度 maxFlightAGL）：禁止爬升超限，飞离悬崖时平缓滑降回限高内！
          const maxEyeY = localGroundY + this.eyeHeight + (this.flightMaxAGL || 22.0);
          if (this.playerEyePos[1] > maxEyeY) {
            if (this.vel[1] > 0) this.vel[1] = 0;
            const excess = this.playerEyePos[1] - maxEyeY;
            if (excess < 1.2) {
              this.playerEyePos[1] = maxEyeY;
            } else {
              this.playerEyePos[1] = Math.max(maxEyeY, this.playerEyePos[1] - Math.min(excess, 8.5 * subDt));
            }
          }
        }
        this.playerEyePos[1] = M.clamp(this.playerEyePos[1], 2.5, 1150.0);
        this.grounded = false;
      } else {
        // Ground Roaming (踏云漫步) — lowered natural base speed (6.5) & stamina-consuming sprint (11.8)!
        let dx = flatFwdX * moveF + rightX * moveR;
        let dz = flatFwdZ * moveF + rightZ * moveR;
        const len = Math.hypot(dx, dz);

        // 陡峭山坡检测：坡度越陡移速越慢且持续消耗体力（平地/建筑平层不受影响）
        let slopeSpeedMul = 1.0;
        if (len > 0.001 && this.grounded && !isDashing) {
          if (!this._tmpSlopeNrm) this._tmpSlopeNrm = new Float32Array(3);
          const curGroundY = T.getMeshTerrainHeight(this.playerEyePos[0], this.playerEyePos[2]);
          const onTerrain = Math.abs((this.playerEyePos[1] - this.eyeHeight) - curGroundY) < 1.25;
          if (onTerrain) {
            T.getTerrainNormal(this.playerEyePos[0], this.playerEyePos[2], this._tmpSlopeNrm);
            const ny = this._tmpSlopeNrm[1];
            if (ny < 0.84) {
              const steepT = M.clamp((0.84 - ny) / 0.34, 0.0, 1.0);
              const dirX = dx / len, dirZ = dz / len;
              // 法线水平分量指向下坡，与移动方向点积 < 0 表示正在爬陡坡
              const uphillDot = -(dirX * this._tmpSlopeNrm[0] + dirZ * this._tmpSlopeNrm[2]);
              const dirWeight = uphillDot > 0.05 ? 1.0 : 0.45;
              const effSteep = steepT * dirWeight;
              const hasStamina = !this.tryConsumeSlopeStamina || this.tryConsumeSlopeStamina(clampedDt, effSteep);
              slopeSpeedMul = hasStamina
                ? M.lerp(1.0, 0.30, effSteep)
                : M.lerp(0.55, 0.16, effSteep);
            }
          }
        }

        const wantsSprint = sprinting && len > 0.001 && !isDashing && slopeSpeedMul > 0.62;
        const canSprint = wantsSprint && (!this.tryConsumeSprintStamina || this.tryConsumeSprintStamina(clampedDt));
        this.isSprinting = canSprint;
        const baseSpeed = (canSprint ? 11.8 : 6.5) * slopeSpeedMul * this.speedScale * (this.moveSpeedStat || 1.0) * (this.externalSlowFactor || 1.0) * (this.externalSpeedFactor || 1.0) * (this.castMoveScale || 1.0);
        if (len > 0.001) {
          dx = (dx / len) * baseSpeed;
          dz = (dz / len) * baseSpeed;
        }
        if (isDashing) {
          this.vel[0] = dashVx;
          this.vel[2] = dashVz;
        } else {
          const damp = 1 - Math.exp(-10.5 * clampedDt);
          this.vel[0] = M.lerp(this.vel[0], dx, damp);
          this.vel[2] = M.lerp(this.vel[2], dz, damp);
        }

        const moveLen = Math.hypot(this.vel[0], this.vel[2]) * clampedDt;
        const subSteps = Math.max(1, Math.min(6, Math.ceil(moveLen / 0.45)));
        const subDt = clampedDt / subSteps;

        let groundY = T.getWalkableHeight(this.playerEyePos[0], this.playerEyePos[2], this.playerEyePos[1] - this.eyeHeight);
        for (let s = 0; s < subSteps; s++) {
          this.playerEyePos[0] += this.vel[0] * subDt;
          this.playerEyePos[2] += this.vel[2] * subDt;

          if (this.collisionWorld) {
            const res = this.collisionWorld.resolvePlayer(this.playerEyePos, this.vel, {
              radius: 0.62,
              eyeHeight: this.eyeHeight,
              headClear: 0.45,
              stepHeight: 1.55,
              flying: false,
              terrainFn: T.getWalkableHeight,
            });
            this.lastCollision = res;
            groundY = res.supportY;
            if (res.hitCeiling && this.verticalVel > 0) {
              this.verticalVel = 0;
            }
          } else {
            groundY = T.getWalkableHeight(this.playerEyePos[0], this.playerEyePos[2], this.playerEyePos[1] - this.eyeHeight);
          }
          if (this.monsterSystem) {
            this.monsterSystem.resolvePlayerCollision(this.playerEyePos, this.vel, this.eyeHeight, 0.62);
          }
          if (this.oreSystem) {
            this.oreSystem.resolvePlayerCollision(this.playerEyePos, this.vel, this.eyeHeight, 0.62);
          }
          if (this.citySystem) {
            this.citySystem.resolvePlayerCollision(this.playerEyePos, this.vel, this.eyeHeight, 0.62);
          }
          if (this.npcSystem) {
            this.npcSystem.resolvePlayerCollision(this.playerEyePos, this.vel, this.eyeHeight, 0.62);
          }
        }

        const targetY = groundY + this.eyeHeight;

        if (!this.grounded || this.playerEyePos[1] > targetY + 0.72) {
          this.verticalVel -= 32.0 * clampedDt;
          this.playerEyePos[1] += this.verticalVel * clampedDt;
          if (this.playerEyePos[1] <= targetY) {
            this.playerEyePos[1] = targetY;
            this.verticalVel = 0;
            this.grounded = true;
          }
        } else {
          this.playerEyePos[1] = M.lerp(this.playerEyePos[1], targetY, 1 - Math.exp(-22.0 * clampedDt));
          this.grounded = true;
        }
      }

      // Generous non-circular continent bounds (18400m x 18400m irregular open world!)
      this.playerEyePos[0] = M.clamp(this.playerEyePos[0], -9000, 9000);
      this.playerEyePos[2] = M.clamp(this.playerEyePos[2], -9000, 9000);

      this.playerPos[0] = this.playerEyePos[0];
      this.playerPos[1] = this.playerEyePos[1] - this.eyeHeight;
      this.playerPos[2] = this.playerEyePos[2];

      // In Attack Mode (attackMode), protagonist directly turns with the camera view (人物本身跟着视角转)!
      const hSpd = Math.hypot(this.vel[0], this.vel[2]);
      if (this.attackMode) {
        let dcy = ((this.yaw - this.charYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (dcy < -Math.PI) dcy += Math.PI * 2;
        this.charYaw += dcy * (1 - Math.exp(-32.0 * clampedDt));
      } else if (hSpd > 0.65) {
        const desiredYaw = Math.atan2(-this.vel[0], -this.vel[2]);
        let dcy = ((desiredYaw - this.charYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (dcy < -Math.PI) dcy += Math.PI * 2;
        this.charYaw += dcy * (1 - Math.exp(-12.0 * clampedDt));
      } else if (this.flying && Math.abs(moveU) > 0.1) {
        let dcy = ((this.yaw - this.charYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (dcy < -Math.PI) dcy += Math.PI * 2;
        this.charYaw += dcy * (1 - Math.exp(-6.0 * clampedDt));
      }

      this.updateVectors();
    }
  }

  XW.CameraController = CameraController;
  XW.SCENIC_VIEWS = SCENIC_VIEWS;
})(window);
