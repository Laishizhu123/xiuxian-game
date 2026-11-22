(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const T = XW.Terrain;

  // Map region labels placed at clean cartographic coordinates (zero label overlap on 7800m world map!)
  const MAP_LABELS = [
    { name: '幽林秘岭',     x: 1220,  z: 6640, major: true,  isWild: false, viewKey: '1' },
    { name: '低云平原',     x: -1920, z: 2680, major: true,  isWild: true,  viewKey: '7' },
    { name: '残阵古道',     x: -3220, z: 820,  major: true,  isWild: false, viewKey: '0' },
    { name: '通天灵木林',   x: -3520, z: -1720, major: true, isWild: false, viewKey: '=' },
    { name: '沉烟迷泽',     x: 1520,  z: 2540, major: true,  isWild: false, viewKey: '9' },
    { name: '云雾山',       x: 2660,  z: 4120, major: true,  isWild: false, viewKey: '[' },
    { name: '灵竹幽谷',     x: 2660,  z: 5940, major: true,  isWild: false, viewKey: '5' },
    { name: '蚀骨毒潭',     x: 4860,  z: 2160, major: true,  isWild: false, viewKey: '6' },
    { name: '流沙荒漠',     x: -5680, z: 4680, major: true,  isWild: false, viewKey: ']' },
    { name: '霜雪原',       x: -3620, z: -6180, major: true, isWild: false, viewKey: '\\' },
    { name: '霜雪山',       x: -1480, z: -6880, major: true, isWild: false, viewKey: ';' },
    { name: '青石城',       x: 0,     z: 0,     major: true, isWild: false, viewKey: '2' },
  ];

  class CartographicMap {
    constructor(miniCanvas, fullCanvas, modalEl, infoEl, onTeleport = null) {
      this.miniCanvas = miniCanvas;
      this.fullCanvas = fullCanvas;
      this.modalEl = modalEl;
      this.infoEl = infoEl;
      this.onTeleport = onTeleport;
      this.isOpen = false;

      if (this.fullCanvas) {
        this.fullCanvas.style.cursor = 'pointer';
        this.fullCanvas.addEventListener('click', (e) => {
          if (!this.isOpen || !this.onTeleport) return;
          const rect = this.fullCanvas.getBoundingClientRect();
          const cx = ((e.clientX - rect.left) / rect.width) * T.WORLD_SIZE - T.HALF_WORLD;
          const cz = ((e.clientY - rect.top) / rect.height) * T.WORLD_SIZE - T.HALF_WORLD;
          let best = null;
          let bestD = 720;
          for (const lb of MAP_LABELS) {
            if (!lb.viewKey) continue;
            const d = Math.hypot(cx - lb.x, cz - lb.z);
            if (d < bestD) {
              bestD = d;
              best = lb;
            }
          }
          if (best) {
            this.onTeleport(best.viewKey);
          }
        });
      }

      this.texSize = 640;
      this.baseCanvas = document.createElement('canvas');
      this.baseCanvas.width = this.texSize;
      this.baseCanvas.height = this.texSize;

      // Setup HiDPI mini & full canvases (capped at 1.5x DPR to avoid GPU 2D-canvas oversampling)
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.dpr = dpr;
      this.miniCss = 176;
      this.miniCanvas.width = Math.round(this.miniCss * dpr);
      this.miniCanvas.height = Math.round(this.miniCss * dpr);
      this.miniCtx = this.miniCanvas.getContext('2d');

      // Pre-build reusable radial vignette gradient for minimap (avoids per-frame allocation)
      const mHalf = this.miniCanvas.width * 0.5;
      const mRad = mHalf - 3 * dpr;
      this._miniVig = this.miniCtx.createRadialGradient(mHalf, mHalf, mRad * 0.68, mHalf, mHalf, mRad);
      this._miniVig.addColorStop(0, 'rgba(0,0,0,0)');
      this._miniVig.addColorStop(1, 'rgba(8, 22, 28, 0.42)');
      this._lastMiniRenderAt = -1;
      this._lastMiniX = NaN;
      this._lastMiniZ = NaN;
      this._lastMiniYaw = NaN;

      this.fullCss = 620;
      this.fullCanvas.width = Math.round(this.fullCss * dpr);
      this.fullCanvas.height = Math.round(this.fullCss * dpr);
      this.fullCtx = this.fullCanvas.getContext('2d');

      this._bakeBaseMap();
    }

    worldToTex(x, z) {
      const u = (x + T.HALF_WORLD) / T.WORLD_SIZE;
      const v = (z + T.HALF_WORLD) / T.WORLD_SIZE;
      return [u * this.texSize, v * this.texSize];
    }

    // Bake crisp 青绿山水 topographic map directly from analytical Terrain height, water, roads & hillshade!
    _bakeBaseMap() {
      const size = this.texSize;
      const ctx = this.baseCanvas.getContext('2d');
      const img = ctx.createImageData(size, size);
      const px = img.data;

      // First compute height grid for fast accurate hillshading & contour isolines!
      const hGrid = new Float32Array(size * size);
      const step = T.WORLD_SIZE / size;
      for (let iy = 0; iy < size; iy++) {
        const z = -T.HALF_WORLD + (iy + 0.5) * step;
        for (let ix = 0; ix < size; ix++) {
          const x = -T.HALF_WORLD + (ix + 0.5) * step;
          hGrid[iy * size + ix] = T.getTerrainHeight(x, z);
        }
      }

      for (let iy = 0; iy < size; iy++) {
        const z = -T.HALF_WORLD + (iy + 0.5) * step;
        const iyU = Math.max(0, iy - 1);
        const iyD = Math.min(size - 1, iy + 1);
        for (let ix = 0; ix < size; ix++) {
          const x = -T.HALF_WORLD + (ix + 0.5) * step;
          const ixL = Math.max(0, ix - 1);
          const ixR = Math.min(size - 1, ix + 1);

          const h = hGrid[iy * size + ix];
          const dhdx = (hGrid[iy * size + ixR] - hGrid[iy * size + ixL]) / (2 * step);
          const dhdz = (hGrid[iyD * size + ix] - hGrid[iyU * size + ix]) / (2 * step);
          // Directional NW sunlight hillshade
          const len = Math.hypot(-dhdx, 1.0, -dhdz) || 1;
          const nx = -dhdx / len, ny = 1.0 / len, nz = -dhdz / len;
          const hill = M.clamp(nx * 0.55 + ny * 0.72 + nz * -0.42, 0.35, 1.18);

          // Detect water bodies (interlaced shallow misty pools of 沉烟迷泽 + outer boundary Deep Sea!)
          const swampM = T.getSwampMask(x, z);
          const isSwampPool = swampM > 0.14 && h < T.SWAMP_WATER_Y;
          const oceanY = T.OCEAN_WATER_Y !== undefined ? T.OCEAN_WATER_Y : 0.0;
          const isOcean = h < oceanY;

          let r, g, b;
          if (isOcean) {
            const depth = M.clamp((oceanY - h) / 36.0, 0, 1);
            r = M.lerp(46, 12, depth);
            g = M.lerp(124, 38, depth);
            b = M.lerp(156, 78, depth);
          } else if (isSwampPool) {
            const depth = M.clamp((T.SWAMP_WATER_Y - h) / 3.2, 0, 1);
            r = M.lerp(72, 42, depth);
            g = M.lerp(132, 98, depth);
            b = M.lerp(116, 94, depth);
          } else {
            const lcMask = T.getLowCloudPlainsMask(x, z);
            const pathM = T.getPathMask(x, z);

            // Refined 青绿山水 elevation color ramp (lush plains -> rolling hills -> jade mountain peaks)
            const tLow = M.smoothstep(12, 42, h);
            const tHigh = M.smoothstep(42, 135, h);
            const tPeak = M.smoothstep(135, 250, h);

            r = M.lerp(94, 72, tLow);
            g = M.lerp(156, 132, tLow);
            b = M.lerp(100, 96, tLow);

            // Soft sunlit golden-emerald highlight inside vast 低云平原
            if (lcMask > 0.05) {
              r = M.lerp(r, 118, lcMask * 0.42);
              g = M.lerp(g, 168, lcMask * 0.36);
              b = M.lerp(b, 102, lcMask * 0.32);
            }

            // Damp olive-brown shoals & mossy marshland tone inside 沉烟迷泽
            if (swampM > 0.06 && h < 18) {
              const swW = swampM * (1.0 - M.smoothstep(8.5, 17.5, h));
              r = M.lerp(r, 82, swW * 0.72);
              g = M.lerp(g, 104, swW * 0.68);
              b = M.lerp(b, 76, swW * 0.68);
            }

            // Weathered ochre-brown barren slope & winding ruined bluestone road inside 残阵古道
            const czMask = T.getAncientRoadMask(x, z);
            if (czMask > 0.06) {
              const czW = M.smoothstep(0.06, 0.65, czMask);
              r = M.lerp(r, 150, czW * 0.68);
              g = M.lerp(g, 134, czW * 0.62);
              b = M.lerp(b, 92,  czW * 0.64);
              const czPath = T.getAncientRoadPathInfo(x, z);
              if (czPath.roadMask > 0.22) {
                const rw = M.smoothstep(0.22, 0.75, czPath.roadMask) * 0.78;
                r = M.lerp(r, 184, rw);
                g = M.lerp(g, 180, rw);
                b = M.lerp(b, 162, rw);
              }
            }

            // Deep ancient emerald-jade canopy & faint forest path for 通天灵木林
            const sfMask = T.getSpiritForestMask(x, z);
            if (sfMask > 0.06) {
              const sfW = M.smoothstep(0.06, 0.65, sfMask);
              r = M.lerp(r, 42,  sfW * 0.76);
              g = M.lerp(g, 114, sfW * 0.74);
              b = M.lerp(b, 86,  sfW * 0.74);
              const sfTr = T.getSpiritForestTrailInfo(x, z);
              if (sfTr.trailMask > 0.28) {
                const tw = M.smoothstep(0.28, 0.78, sfTr.trailMask) * 0.56;
                r = M.lerp(r, 138, tw);
                g = M.lerp(g, 148, tw);
                b = M.lerp(b, 114, tw);
              }
            }

            // Crisp high-altitude 7-tier slate terraces & spiral ascending road for 云雾山
            const cmMask = T.getCloudMountainMask(x, z);
            if (cmMask > 0.06) {
              const cmW = M.smoothstep(0.06, 0.58, cmMask);
              const cmAlt = M.smoothstep(80, 760, h);
              r = M.lerp(r, M.lerp(82, 186, cmAlt), cmW * 0.74);
              g = M.lerp(g, M.lerp(116, 202, cmAlt), cmW * 0.74);
              b = M.lerp(b, M.lerp(112, 214, cmAlt), cmW * 0.74);
              const cmPath = T.getCloudMountainPathInfo(x, z);
              if (cmPath.pathMask > 0.25) {
                const pw = M.smoothstep(0.25, 0.75, cmPath.pathMask) * 0.68;
                r = M.lerp(r, 216, pw);
                g = M.lerp(g, 212, pw);
                b = M.lerp(b, 192, pw);
              }
            }

            r = M.lerp(r, 76, tHigh);
            g = M.lerp(g, 110, tHigh);
            b = M.lerp(b, 106, tHigh);

            r = M.lerp(r, 128, tPeak);
            g = M.lerp(g, 146, tPeak);
            b = M.lerp(b, 148, tPeak);

            // Warm golden-ochre sand dunes for 流沙荒漠 (applied after tHigh/tPeak so golden dunes read crisply!)
            const dsMask = T.getDesertMask(x, z);
            if (dsMask > 0.06) {
              const dsW = M.smoothstep(0.06, 0.56, dsMask);
              const dCrest = M.smoothstep(-0.7, 0.85, T.getDesertDuneWave(x, z));
              r = M.lerp(r, M.lerp(178, 228, dCrest), dsW * 0.90);
              g = M.lerp(g, M.lerp(136, 186, dCrest), dsW * 0.90);
              b = M.lerp(b, M.lerp(78,  114, dCrest), dsW * 0.90);
            }

            // Crisp silver-white snowfield & glacial ice pond for 霜雪原
            const snMask = T.getSnowfieldMask(x, z);
            if (snMask > 0.06) {
              const snW = M.smoothstep(0.06, 0.56, snMask);
              const snDrift = M.smoothstep(-0.65, 0.80, T.getSnowDriftWave(x, z));
              r = M.lerp(r, M.lerp(196, 240, snDrift), snW * 0.92);
              g = M.lerp(g, M.lerp(214, 246, snDrift), snW * 0.92);
              b = M.lerp(b, M.lerp(232, 254, snDrift), snW * 0.92);
              const fsM = T.FROST_SNOWFIELD;
              const dPond = Math.hypot((x - fsM.pondX) * 0.94, (z - fsM.pondZ) * 1.08);
              if (dPond < fsM.pondR) {
                const iw = 1.0 - M.smoothstep(fsM.pondR * 0.78, fsM.pondR, dPond);
                r = M.lerp(r, 118, iw * 0.88);
                g = M.lerp(g, 198, iw * 0.88);
                b = M.lerp(b, 234, iw * 0.88);
              }
            }

            // Crisp 6-tier stepped glacial mountain & spiral ascending snow road for 霜雪山
            const fmMask = T.getFrostMountainMask(x, z);
            if (fmMask > 0.06) {
              const fmW = M.smoothstep(0.06, 0.54, fmMask);
              const fmAlt = M.smoothstep(90, 680, h);
              r = M.lerp(r, M.lerp(136, 246, fmAlt), fmW * 0.88);
              g = M.lerp(g, M.lerp(168, 250, fmAlt), fmW * 0.88);
              b = M.lerp(b, M.lerp(196, 255, fmAlt), fmW * 0.88);
              const fmPath = T.getFrostMountainPathInfo(x, z);
              if (fmPath.pathMask > 0.25) {
                const pw = M.smoothstep(0.25, 0.75, fmPath.pathMask) * 0.72;
                r = M.lerp(r, 178, pw);
                g = M.lerp(g, 206, pw);
                b = M.lerp(b, 228, pw);
              }
            }

            // Boss Arena 1: 灵竹幽谷 (lush jade bamboo ravine + pale center Boss clearing!)
            const bvMask = T.getBambooValleyMask(x, z);
            if (bvMask > 0.06) {
              const bvW = M.smoothstep(0.06, 0.52, bvMask);
              const dBv = Math.hypot(x - T.BAMBOO_VALLEY.cx, z - T.BAMBOO_VALLEY.cz);
              const inClearing = 1.0 - M.smoothstep(34, 48, dBv);
              r = M.lerp(r, M.lerp(56, 152, inClearing), bvW * 0.88);
              g = M.lerp(g, M.lerp(154, 162, inClearing), bvW * 0.88);
              b = M.lerp(b, M.lerp(106, 128, inClearing), bvW * 0.88);
            }

            // Boss Arena 2: 蚀骨毒潭 (blackened scorched shore + glowing violet-emerald venom moat + center Boss stone bank!)
            const vmMask = T.getVenomMireMask(x, z);
            if (vmMask > 0.06) {
              const vmW = M.smoothstep(0.06, 0.48, vmMask);
              const dVm = Math.hypot(x - T.VENOM_MIRE.cx, z - T.VENOM_MIRE.cz);
              if (dVm < 35) {
                r = M.lerp(r, 82, vmW * 0.92);
                g = M.lerp(g, 78, vmW * 0.92);
                b = M.lerp(b, 90, vmW * 0.92);
              } else if (dVm < 70) {
                r = M.lerp(r, 94, vmW * 0.92);
                g = M.lerp(g, 48, vmW * 0.92);
                b = M.lerp(b, 134, vmW * 0.92);
              } else {
                r = M.lerp(r, 56, vmW * 0.88);
                g = M.lerp(g, 46, vmW * 0.88);
                b = M.lerp(b, 52, vmW * 0.88);
              }
            }

            // New Expanded Region: 幽林秘岭 (deep dense emerald-pine mountain ridges, dark crags & winding hidden trail!)
            const hmMask = T.getHiddenMountainsMask ? T.getHiddenMountainsMask(x, z) : 0.0;
            if (hmMask > 0.06) {
              const hmW = M.smoothstep(0.06, 0.52, hmMask);
              const hmAlt = M.smoothstep(45, 265, h);
              r = M.lerp(r, M.lerp(36, 74, hmAlt), hmW * 0.88);
              g = M.lerp(g, M.lerp(88, 108, hmAlt), hmW * 0.88);
              b = M.lerp(b, M.lerp(56, 86, hmAlt), hmW * 0.88);
              const hmPath = T.getHiddenMountainPathInfo ? T.getHiddenMountainPathInfo(x, z) : { pathMask: 0 };
              if (hmPath.pathMask > 0.24) {
                const pw = M.smoothstep(0.24, 0.76, hmPath.pathMask) * 0.65;
                r = M.lerp(r, 152, pw);
                g = M.lerp(g, 148, pw);
                b = M.lerp(b, 122, pw);
              }
            }

            // Subtle warm ivory post-roads
            if (pathM > 0.25) {
              const pw = M.smoothstep(0.25, 0.75, pathM) * 0.72;
              r = M.lerp(r, 206, pw);
              g = M.lerp(g, 196, pw);
              b = M.lerp(b, 162, pw);
            }

            // Apply directional hillshade
            r *= hill;
            g *= hill;
            b *= hill;

            // Delicate topographic contour lines every 18m (excluding flat plain noise)
            const cStep = 18.0;
            const cFrac = Math.abs(((h % cStep) + cStep) % cStep);
            if (h > 26 && (cFrac < 0.72 || cFrac > cStep - 0.72)) {
              r *= 0.88;
              g *= 0.90;
              b *= 0.90;
            }
          }

          const o = (iy * size + ix) * 4;
          px[o]     = M.clamp(r, 0, 255);
          px[o + 1] = M.clamp(g, 0, 255);
          px[o + 2] = M.clamp(b, 0, 255);
          px[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);

      // Subtle translucent halos for the 7 Floating Immortal Islands
      ctx.save();
      for (const isl of T.FLOATING_ISLANDS) {
        const [tx, ty] = this.worldToTex(isl.x, isl.z);
        const rx = (isl.rx / T.WORLD_SIZE) * size;
        const rz = (isl.rz / T.WORLD_SIZE) * size;
        ctx.beginPath();
        ctx.ellipse(tx, ty, Math.max(3, rx), Math.max(3, rz), 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(176, 242, 246, 0.34)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(195, 250, 252, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Crisp walled city square emblem for 青石城 (0, 0)
      if (T.QINGSHI_CITY) {
        const [qcx, qcy] = this.worldToTex(T.QINGSHI_CITY.cx, T.QINGSHI_CITY.cz);
        const rw = Math.max(5.5, ((T.QINGSHI_CITY.halfW * 2) / T.WORLD_SIZE) * size);
        const rh = Math.max(5.0, (((T.QINGSHI_CITY.southZ - T.QINGSHI_CITY.northZ)) / T.WORLD_SIZE) * size);
        ctx.fillStyle = 'rgba(182, 194, 198, 0.72)';
        ctx.strokeStyle = 'rgba(42, 54, 62, 0.92)';
        ctx.lineWidth = 1.6;
        ctx.fillRect(qcx - rw * 0.5, qcy - rh * 0.5, rw, rh);
        ctx.strokeRect(qcx - rw * 0.5, qcy - rh * 0.5, rw, rh);
      }

      // Jade cave-mansion emblem marking the Abandoned Cave-Mansion spawn (废弃洞府) at the heart of 幽林秘岭!
      if (T.HIDDEN_MOUNTAINS) {
        const [hcx, hcy] = this.worldToTex(T.HIDDEN_MOUNTAINS.caveX, T.HIDDEN_MOUNTAINS.caveZ);
        ctx.beginPath();
        ctx.arc(hcx, hcy, 3.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(84, 228, 206, 0.78)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(20, 56, 52, 0.92)';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }

      // Luminous azure halo marking the Colossal 450m World Tree Landmark at the heart of 通天灵木林!
      if (T.SPIRIT_FOREST && T.SPIRIT_FOREST.worldTreeX !== undefined) {
        const [wtx, wty] = this.worldToTex(T.SPIRIT_FOREST.worldTreeX, T.SPIRIT_FOREST.worldTreeZ);
        ctx.beginPath();
        ctx.arc(wtx, wty, 9.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(64, 196, 255, 0.42)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 232, 255, 0.92)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      // Subtle cyan-gold halo marking the 420m Summit Spirit-Gathering Stone atop 云雾山!
      if (T.CLOUD_MOUNTAIN) {
        const [cmx, cmy] = this.worldToTex(T.CLOUD_MOUNTAIN.cx, T.CLOUD_MOUNTAIN.cz);
        ctx.beginPath();
        ctx.arc(cmx, cmy, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(72, 240, 236, 0.36)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(246, 224, 146, 0.88)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // Subtle golden landmark diamond markers (none in pure-wilderness 低云平原!)
      for (const lb of MAP_LABELS) {
        if (lb.isWild || !lb.major) continue;
        const [tx, ty] = this.worldToTex(lb.x, lb.z);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = 'rgba(246, 218, 134, 0.92)';
        ctx.strokeStyle = 'rgba(24, 44, 52, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.fillRect(-3.2, -3.2, 6.4, 6.4);
        ctx.strokeRect(-3.2, -3.2, 6.4, 6.4);
        ctx.restore();
      }

      ctx.restore();
    }

    _drawPlayerMarker(ctx, px, py, yaw, scale, time) {
      // Camera forward convention: fx = -sin(yaw), fz = -cos(yaw)
      // On 2D map (+X right, +Z down): heading angle in canvas space = atan2(fx, -fz) -> -yaw!
      const heading = -yaw;

      ctx.save();
      ctx.translate(px, py);

      // Soft pulsing jade-gold locator ring
      const pulse = 0.5 + 0.5 * Math.sin(time * 3.4);
      ctx.beginPath();
      ctx.arc(0, 0, (10 + pulse * 6) * scale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(252, 226, 138, ${0.42 - pulse * 0.28})`;
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      // Rotate to facing direction (0 = North / up on map)
      ctx.rotate(heading);

      // Translucent view-direction cone
      const grad = ctx.createRadialGradient(0, 0, 2 * scale, 0, 0, 26 * scale);
      grad.addColorStop(0, 'rgba(255, 242, 186, 0.42)');
      grad.addColorStop(1, 'rgba(130, 236, 228, 0.0)');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 26 * scale, -Math.PI * 0.5 - 0.46, -Math.PI * 0.5 + 0.46);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Crisp golden-white directional pointer arrow
      ctx.beginPath();
      ctx.moveTo(0, -8.5 * scale);
      ctx.lineTo(5.8 * scale, 6.2 * scale);
      ctx.lineTo(0, 3.0 * scale);
      ctx.lineTo(-5.8 * scale, 6.2 * scale);
      ctx.closePath();
      ctx.fillStyle = '#fff5d0';
      ctx.strokeStyle = '#18323c';
      ctx.lineWidth = 1.6 * scale;
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    setOpen(open) {
      this.isOpen = !!open;
      this.modalEl.classList.toggle('hidden', !this.isOpen);
    }

    toggle() {
      this.setOpen(!this.isOpen);
      return this.isOpen;
    }

    render(camPos, yaw, regionName, time) {
      // =====================================================
      // 1. TOP-RIGHT LIVE MINIMAP (centered around player!)
      //    Throttled to ~18Hz when closed & player is mostly steady to avoid redundant 2D GPU uploads
      // =====================================================
      const nowMs = performance.now();
      const movedEnough =
        isNaN(this._lastMiniX) ||
        Math.abs(camPos[0] - this._lastMiniX) > 1.2 ||
        Math.abs(camPos[2] - this._lastMiniZ) > 1.2 ||
        Math.abs(yaw - this._lastMiniYaw) > 0.035;
      const shouldRedrawMini = this.isOpen || (nowMs - this._lastMiniRenderAt >= 55) || (movedEnough && nowMs - this._lastMiniRenderAt >= 32);

      if (shouldRedrawMini) {
        this._lastMiniRenderAt = nowMs;
        this._lastMiniX = camPos[0];
        this._lastMiniZ = camPos[2];
        this._lastMiniYaw = yaw;

        const mCtx = this.miniCtx;
        const mSize = this.miniCanvas.width;
        const half = mSize * 0.5;
        const radius = half - 3 * this.dpr;

        mCtx.clearRect(0, 0, mSize, mSize);
        mCtx.save();

        // Circular jade-rimmed clip
        mCtx.beginPath();
        mCtx.arc(half, half, radius, 0, Math.PI * 2);
        mCtx.clip();

        // Background fill for areas near outer world border
        mCtx.fillStyle = '#25424e';
        mCtx.fillRect(0, 0, mSize, mSize);

        // Show a ~1350m diameter local neighborhood on the minimap
        const viewWorldSpan = 1350;
        const srcSpan = (viewWorldSpan / T.WORLD_SIZE) * this.texSize;
        const [tx, ty] = this.worldToTex(camPos[0], camPos[2]);

        mCtx.drawImage(
          this.baseCanvas,
          tx - srcSpan * 0.5, ty - srcSpan * 0.5, srcSpan, srcSpan,
          0, 0, mSize, mSize
        );

        // Subtle nearby region labels inside the minimap!
        mCtx.font = `${Math.round(10.5 * this.dpr)}px "STKaiti", "KaiTi", "Microsoft YaHei", serif`;
        mCtx.textAlign = 'center';
        mCtx.textBaseline = 'middle';
        for (const lb of MAP_LABELS) {
          const dx = lb.x - camPos[0];
          const dz = lb.z - camPos[2];
          const mx = half + (dx / viewWorldSpan) * mSize;
          const my = half + (dz / viewWorldSpan) * mSize;
          if (Math.hypot(mx - half, my - half) > radius - 14 * this.dpr) continue;
          mCtx.fillStyle = 'rgba(10, 24, 30, 0.72)';
          mCtx.fillText(lb.name, mx + 1, my + 1);
          mCtx.fillStyle = lb.isWild ? '#e8fadc' : '#f7f2dc';
          mCtx.fillText(lb.name, mx, my);
        }

        // Real-time player arrow centered on minimap
        this._drawPlayerMarker(mCtx, half, half, yaw, 0.92 * this.dpr, time);

        // Soft inner edge vignette (cached gradient)
        mCtx.fillStyle = this._miniVig;
        mCtx.fillRect(0, 0, mSize, mSize);
        mCtx.restore();

        // Refined jade-gold outer bezel ring
        mCtx.beginPath();
        mCtx.arc(half, half, radius, 0, Math.PI * 2);
        mCtx.strokeStyle = 'rgba(232, 214, 162, 0.55)';
        mCtx.lineWidth = 1.6 * this.dpr;
        mCtx.stroke();
      }

      // =====================================================
      // 2. ENLARGED FULL WORLD MAP (when M is toggled open!)
      // =====================================================
      if (!this.isOpen) return;

      const fCtx = this.fullCtx;
      const fSize = this.fullCanvas.width;
      fCtx.clearRect(0, 0, fSize, fSize);

      // Draw full 3800m x 3800m baked topographic continent map!
      fCtx.drawImage(this.baseCanvas, 0, 0, fSize, fSize);

      // Delicate cartographic coordinate grid
      fCtx.strokeStyle = 'rgba(230, 244, 238, 0.09)';
      fCtx.lineWidth = 1;
      const gridN = 6;
      for (let i = 1; i < gridN; i++) {
        const p = (i / gridN) * fSize;
        fCtx.beginPath(); fCtx.moveTo(p, 0); fCtx.lineTo(p, fSize); fCtx.stroke();
        fCtx.beginPath(); fCtx.moveTo(0, p); fCtx.lineTo(fSize, p); fCtx.stroke();
      }

      // Crisp poetic Chinese region names across the enlarged map
      fCtx.textAlign = 'center';
      fCtx.textBaseline = 'middle';
      for (const lb of MAP_LABELS) {
        const ux = (lb.x + T.HALF_WORLD) / T.WORLD_SIZE;
        const uz = (lb.z + T.HALF_WORLD) / T.WORLD_SIZE;
        const mx = ux * fSize;
        const my = uz * fSize - (lb.isWild ? 0 : 12 * this.dpr);

        const fontPx = Math.round((lb.isWild ? 18 : lb.major ? 14.5 : 12) * this.dpr);
        fCtx.font = `${fontPx}px "STKaiti", "Kaiti SC", "KaiTi", "Microsoft YaHei", serif`;
        fCtx.fillStyle = 'rgba(8, 20, 26, 0.82)';
        fCtx.fillText(lb.name, mx + 1.5, my + 1.5);
        fCtx.fillStyle = lb.isWild ? '#f2ffe4' : (lb.major ? '#fdf5d6' : 'rgba(232, 246, 242, 0.86)');
        fCtx.fillText(lb.name, mx, my);
      }

      // Real-time player marker on the full 3800m map!
      const pfx = ((camPos[0] + T.HALF_WORLD) / T.WORLD_SIZE) * fSize;
      const pfz = ((camPos[2] + T.HALF_WORLD) / T.WORLD_SIZE) * fSize;
      this._drawPlayerMarker(fCtx, pfx, pfz, yaw, 1.18 * this.dpr, time);

      // Crisp jade-gold compass emblem (北) in top-right & distance scale bar in bottom-left
      const pad = 28 * this.dpr;
      fCtx.save();
      fCtx.beginPath();
      fCtx.arc(fSize - pad, pad, 15 * this.dpr, 0, Math.PI * 2);
      fCtx.fillStyle = 'rgba(12, 26, 34, 0.72)';
      fCtx.fill();
      fCtx.strokeStyle = 'rgba(236, 218, 166, 0.65)';
      fCtx.lineWidth = 1.4 * this.dpr;
      fCtx.stroke();
      fCtx.font = `${Math.round(14 * this.dpr)}px "STKaiti", "KaiTi", serif`;
      fCtx.fillStyle = '#faebc2';
      fCtx.fillText('北', fSize - pad, pad + 1 * this.dpr);
      fCtx.restore();

      // Scale bar (2000m)
      const barW = (2000 / T.WORLD_SIZE) * fSize;
      const bx = pad, by = fSize - pad + 4 * this.dpr;
      fCtx.strokeStyle = 'rgba(242, 234, 200, 0.78)';
      fCtx.lineWidth = 2 * this.dpr;
      fCtx.beginPath();
      fCtx.moveTo(bx, by - 4 * this.dpr); fCtx.lineTo(bx, by);
      fCtx.lineTo(bx + barW, by); fCtx.lineTo(bx + barW, by - 4 * this.dpr);
      fCtx.stroke();
      fCtx.font = `${Math.round(11 * this.dpr)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      fCtx.textAlign = 'left';
      fCtx.fillStyle = 'rgba(238, 246, 242, 0.82)';
      fCtx.fillText('2000 丈', bx, by - 10 * this.dpr);

      // Update live readout footer
      if (this.infoEl) {
        const ew = camPos[0] >= 0 ? `东 ${Math.round(camPos[0])}` : `西 ${Math.round(-camPos[0])}`;
        const ns = camPos[2] >= 0 ? `南 ${Math.round(camPos[2])}` : `北 ${Math.round(-camPos[2])}`;
        this.infoEl.textContent = `${regionName || '低云平原'} · 坐标 (${ew}, ${ns}) · 海拔 ${Math.max(1, Math.round(camPos[1]))}丈`;
      }
    }
  }

  XW.Minimap = CartographicMap;
})(window);
