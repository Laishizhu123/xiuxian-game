(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;
  const S = XW.Shaders;

  const DEFAULT_SHADOW_SIZE = 1024;

  class XianxiaRenderer {
    constructor(canvas, worldData) {
      this.canvas = canvas;
      this.world = worldData;

      const gl = canvas.getContext('webgl2', {
        antialias: false,
        alpha: false,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      });
      if (!gl) {
        throw new Error('浏览器未启用 WebGL2，请开启硬件加速或更换 Chrome / Edge / Firefox。');
      }
      this.gl = gl;
      this.maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

      // Enable float HDR color targets & linear filtering for silky bloom
      this.hasFloatHDR = !!gl.getExtension('EXT_color_buffer_float');
      gl.getExtension('OES_texture_float_linear');

      this.projMat = M.mat4();
      this.vpMat = M.mat4();
      this.lightViewMat = M.mat4();
      this.lightProjMat = M.mat4();
      this.lightVPMat = M.mat4();
      this.craneModelMat = M.mat4();
      this._shadowEye = new Float32Array(3);
      this._shadowTarget = new Float32Array(3);
      this._shadowCenter = new Float32Array(3);
      this._upVec = new Float32Array([0, 1, 0]);
      this.charSlotVAOs = {};

      // Live Substantive Graphics Settings State
      this.settings = {
        resolution: 'high',       // 'low' | 'high'
        viewDistance: 'medium',   // 'low' | 'medium' (default) | 'high' | 'ultra'
        quality: 'medium',        // 'low' | 'medium' (default) | 'high'
        shadowQuality: 'medium',  // 'off' | 'low' | 'medium' (default) | 'high'
        blobShadow: 'on',         // 'on' (default) | 'off'
        distanceFog: 'on',        // 'on' (default) | 'off'
      };
      this.blobShadowEnabled = true;

      this.width = 1;
      this.height = 1;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.shadowSize = DEFAULT_SHADOW_SIZE;
      this.shadowSpan = 195.0;
      this.shadowParams = new Float32Array([1.0 / DEFAULT_SHADOW_SIZE, 1.0, 1.0, 2.15]);
      this.qualityLevel = 1.0;
      this.bloomPasses = 1;
      this.bloomStrength = 0.22;
      this.bloomThreshold = 1.24;
      this.exposure = 1.04;
      this.drawCloudPuffs = true;
      this.particleRatio = 0.78;
      this.farPlane = 13500.0;
      this.propCullDist = 4800.0;
      this.fogDistScale = 1.12;
      this.grassRadiusScale = 1.00;
      this.drawDistMountains = true;

      this._compilePrograms();
      this._createShadowResources(this.shadowSize);
      this._createProceduralMaterials();
      this._uploadGeometry();
      this.applySettings(this.settings);

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
    }

    _compileShader(type, src, label) {
      const gl = this.gl;
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        console.error(`Shader compile error [${label}]:`, log);
        throw new Error(`Shader [${label}] 编译失败: ${log}`);
      }
      return sh;
    }

    _createProgram(vsSrc, fsSrc, label) {
      const gl = this.gl;
      const vs = this._compileShader(gl.VERTEX_SHADER, vsSrc, label + '_VS');
      const fs = this._compileShader(gl.FRAGMENT_SHADER, fsSrc, label + '_FS');
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(prog);
        console.error(`Program link error [${label}]:`, log);
        throw new Error(`Program [${label}] 链接失败: ${log}`);
      }
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      // Cache active uniform locations automatically!
      const uniforms = {};
      const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(prog, i);
        if (info) {
          uniforms[info.name] = gl.getUniformLocation(prog, info.name);
        }
      }
      return { prog, u: uniforms };
    }

    _compilePrograms() {
      this.prog = {
        sky:          this._createProgram(S.SKY_VS, S.SKY_FS, 'sky'),
        world:        this._createProgram(S.WORLD_VS, S.WORLD_FS, 'world'),
        grass:        this._createProgram(S.GRASS_VS, S.GRASS_FS, 'grass'),
        canopy:       this._createProgram(S.CANOPY_VS, S.CANOPY_FS, 'canopy'),
        boulder:      this._createProgram(S.BOULDER_VS, S.BOULDER_FS, 'boulder'),
        water:        this._createProgram(S.WATER_VS, S.WATER_FS, 'water'),
        waterfall:    this._createProgram(S.WATERFALL_VS, S.WATERFALL_FS, 'waterfall'),
        formation:    this._createProgram(S.FORMATION_VS, S.FORMATION_FS, 'formation'),
        aura:         this._createProgram(S.AURA_VS, S.AURA_FS, 'aura'),
        cloudSea:     this._createProgram(S.CLOUD_SEA_VS, S.CLOUD_SEA_FS, 'cloudSea'),
        cloudPuff:    this._createProgram(S.CLOUD_PUFF_VS, S.CLOUD_PUFF_FS, 'cloudPuff'),
        particle:     this._createProgram(S.PARTICLE_VS, S.PARTICLE_FS, 'particle'),
        crane:         this._createProgram(S.CRANE_VS, S.CRANE_FS, 'crane'),
        character:     this._createProgram(S.CHARACTER_VS, S.CHARACTER_FS, 'character'),
        monster:       this._createProgram(S.MONSTER_VS, S.MONSTER_FS, 'monster'),
        vfx:           this._createProgram(S.VFX_VS, S.VFX_FS, 'vfx'),
        blobShadow:    this._createProgram(S.BLOB_SHADOW_VS, S.BLOB_SHADOW_FS, 'blobShadow'),
        shadow:        this._createProgram(S.SHADOW_VS, S.SHADOW_FS, 'shadow'),
        shadowCanopy:  this._createProgram(S.SHADOW_CANOPY_VS, S.SHADOW_FS, 'shadowCanopy'),
        shadowBoulder: this._createProgram(S.SHADOW_BOULDER_VS, S.SHADOW_FS, 'shadowBoulder'),
        shadowChar:    this._createProgram(S.SHADOW_CHARACTER_VS, S.SHADOW_FS, 'shadowChar'),
        shadowMonster: this._createProgram(S.SHADOW_MONSTER_VS, S.SHADOW_FS, 'shadowMonster'),
        bright:        this._createProgram(S.QUAD_VS, S.BRIGHT_FS, 'bright'),
        blur:          this._createProgram(S.QUAD_VS, S.BLUR_FS, 'blur'),
        composite:     this._createProgram(S.QUAD_VS, S.COMPOSITE_FS, 'composite'),
      };
    }

    _createShadowResources(size = DEFAULT_SHADOW_SIZE) {
      const gl = this.gl;
      const clampedSize = Math.min(this.maxTexSize || 4096, Math.max(256, size));
      this.shadowSize = clampedSize;
      if (!this.shadowTex) {
        this.shadowTex = gl.createTexture();
      }
      gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, clampedSize, clampedSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      if (!this.shadowFbo) {
        this.shadowFbo = gl.createFramebuffer();
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
      gl.drawBuffers([gl.NONE]);
      gl.readBuffer(gl.NONE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Apply real-time substantive graphics settings (FBO resize, shadow map reallocation, shader lighting/culling uniforms)
    applySettings(next = {}) {
      Object.assign(this.settings, next);
      const s = this.settings;

      // 1. Resolution (低: 0.65x internal render scale; 高: capped at 1.5x to prevent HiDPI GPU saturation!)
      const nativeDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const targetDpr = s.resolution === 'low' ? 0.65 : nativeDpr;
      if (Math.abs(this.dpr - targetDpr) > 0.001 || this.width <= 2) {
        this.dpr = targetDpr;
        this._createPostFBOs(window.innerWidth, window.innerHeight);
      }

      // 2. View / Render Distance (低 / 中[默认] / 高 / 超高)
      if (s.viewDistance === 'low') {
        this.farPlane = 4500.0;
        this.propCullDist = 1800.0;
        this.fogDistScale = 2.15;
        this.grassRadiusScale = 0.58;
        this.drawDistMountains = false;
      } else if (s.viewDistance === 'high') {
        this.farPlane = 24000.0;
        this.propCullDist = 9600.0;
        this.fogDistScale = 0.78;
        this.grassRadiusScale = 1.35;
        this.drawDistMountains = true;
      } else if (s.viewDistance === 'ultra') {
        this.farPlane = 38000.0;
        this.propCullDist = 22000.0;
        this.fogDistScale = 0.48;
        this.grassRadiusScale = 1.72;
        this.drawDistMountains = true;
      } else {
        // 'medium' (Default)
        this.farPlane = 13500.0;
        this.propCullDist = 4800.0;
        this.fogDistScale = 1.12;
        this.grassRadiusScale = 1.00;
        this.drawDistMountains = true;
      }

      // 3. Graphics & Lighting Quality (画质: 低 / 中[默认] / 高 — normal bump, specular/rim, Mie glow, HDR bloom cascades)
      if (s.quality === 'low') {
        this.qualityLevel = 0.0;
        this.bloomPasses = 0;
        this.bloomStrength = 0.0;
        this.bloomThreshold = 1.40;
        this.exposure = 1.00;
        this.drawCloudPuffs = false;
        this.particleRatio = 0.35;
      } else if (s.quality === 'high') {
        this.qualityLevel = 2.0;
        this.bloomPasses = 2;
        this.bloomStrength = 0.34;
        this.bloomThreshold = 1.10;
        this.exposure = 1.07;
        this.drawCloudPuffs = true;
        this.particleRatio = 1.00;
      } else {
        // 'medium' (Default)
        this.qualityLevel = 1.0;
        this.bloomPasses = 1;
        this.bloomStrength = 0.22;
        this.bloomThreshold = 1.24;
        this.exposure = 1.04;
        this.drawCloudPuffs = true;
        this.particleRatio = 0.75;
      }

      // 4. Shadow Quality (阴影质量: 关闭 / 低=512 / 中=1024[默认] / 高=2048 — 严控实时阴影贴图开销!)
      let targetShadowSize = this.shadowSize;
      if (s.shadowQuality === 'off') {
        this.shadowSpan = 165.0;
        this.shadowParams.set([1.0 / this.shadowSize, 0.0, 0.0, 1.0]);
      } else if (s.shadowQuality === 'low') {
        targetShadowSize = 512;
        this.shadowSpan = 155.0;
        this.shadowParams.set([1.0 / targetShadowSize, 0.0, 1.0, 1.2]);
      } else if (s.shadowQuality === 'high') {
        targetShadowSize = Math.min(2048, this.maxTexSize || 2048);
        this.shadowSpan = 240.0;
        this.shadowParams.set([1.0 / targetShadowSize, 2.0, 1.0, 2.35]);
      } else {
        // 'medium' (Default: 1024x1024 with 4-tap rotated Poisson PCF!)
        targetShadowSize = 1024;
        this.shadowSpan = 195.0;
        this.shadowParams.set([1.0 / targetShadowSize, 1.0, 1.0, 2.15]);
      }

      if (s.shadowQuality !== 'off' && targetShadowSize !== this.shadowSize) {
        this._createShadowResources(targetShadowSize);
        this.shadowParams[0] = 1.0 / this.shadowSize;
      }

      // 5. Blob Shadow & Distance Fog independent toggles (脚底接触阴影 / 远景距离雾效)
      this.blobShadowEnabled = s.blobShadow !== 'off';
      if (s.distanceFog === 'off') {
        this.fogDistScale = -1.0;
      }

      return {
        renderWidth: this.width,
        renderHeight: this.height,
        shadowSize: s.shadowQuality === 'off' ? 0 : this.shadowSize,
        farPlane: this.farPlane,
        blobShadow: this.blobShadowEnabled ? 'on' : 'off',
        distanceFog: s.distanceFog !== 'off' ? 'on' : 'off',
        settings: Object.assign({}, this.settings),
      };
    }

    // Generate 4-Layer Canvas2D Procedural PBR Material Atlas (青瓦 / 木纹 / 石砖青石板 / 山岩与鹅卵石 + 凹凸高度与粗糙度贴图)
    _createProceduralMaterials() {
      const gl = this.gl;
      const S = 256;
      const cvs = document.createElement('canvas');
      cvs.width = S;
      cvs.height = S;
      const ctx = cvs.getContext('2d', { willReadFrequently: true });

      const hash = (x, y, s) => {
        const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
        return n - Math.floor(n);
      };

      // Seamless periodic value noise on [0..S)
      const pNoise = (x, y, period, seed) => {
        const gx = (x / S) * period;
        const gy = (y / S) * period;
        const ix = Math.floor(gx), iy = Math.floor(gy);
        const fx = gx - ix, fy = gy - iy;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        const i0 = ((ix % period) + period) % period;
        const i1 = (i0 + 1) % period;
        const j0 = ((iy % period) + period) % period;
        const j1 = (j0 + 1) % period;
        const a = hash(i0, j0, seed);
        const b = hash(i1, j0, seed);
        const c = hash(i0, j1, seed);
        const d = hash(i1, j1, seed);
        return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
      };

      this.matTexArray = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.matTexArray);
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 8, gl.RGBA8, S, S, 4);

      // =========================================================
      // LAYER 0: 青瓦 (Glazed Chinese Barrel & Pan Roof Tiles + Roughness)
      // =========================================================
      ctx.clearRect(0, 0, S, S);
      const cols = 8, rows = 8;
      const cw = S / cols, rh = S / rows;
      for (let r = -1; r <= rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x0 = c * cw, y0 = r * rh;
          // Concave pan tile (板瓦)
          const panGrad = ctx.createLinearGradient(x0, y0, x0 + cw, y0);
          panGrad.addColorStop(0.0, 'rgb(142, 165, 138)');
          panGrad.addColorStop(0.35, 'rgb(118, 135, 128)');
          panGrad.addColorStop(0.65, 'rgb(122, 140, 132)');
          panGrad.addColorStop(1.0, 'rgb(148, 170, 142)');
          ctx.fillStyle = panGrad;
          ctx.fillRect(x0, y0, cw, rh);

          // Horizontal overlapping tile drip shadow (瓦叠阴影)
          const dripGrad = ctx.createLinearGradient(0, y0, 0, y0 + rh);
          dripGrad.addColorStop(0.0, 'rgba(18, 26, 32, 0.55)');
          dripGrad.addColorStop(0.18, 'rgba(30, 42, 48, 0.12)');
          dripGrad.addColorStop(0.84, 'rgba(220, 245, 240, 0.18)');
          dripGrad.addColorStop(1.0, 'rgba(12, 18, 22, 0.65)');
          ctx.fillStyle = dripGrad;
          ctx.fillRect(x0, y0, cw, rh);
        }
      }
      // Raised cylindrical barrel tiles (筒瓦) along column seams
      for (let c = 0; c <= cols; c++) {
        const cx = c * cw;
        const bw = cw * 0.44;
        const bGrad = ctx.createLinearGradient(cx - bw * 0.5, 0, cx + bw * 0.5, 0);
        bGrad.addColorStop(0.0, 'rgb(90, 110, 108)');
        bGrad.addColorStop(0.28, 'rgb(212, 232, 225)');
        bGrad.addColorStop(0.52, 'rgb(242, 252, 248)');
        bGrad.addColorStop(0.78, 'rgb(185, 205, 198)');
        bGrad.addColorStop(1.0, 'rgb(82, 102, 100)');
        ctx.fillStyle = bGrad;
        ctx.fillRect(cx - bw * 0.5, 0, bw, S);
      }
      let img = ctx.getImageData(0, 0, S, S);
      let d = img.data;
      for (let y = 0; y < S; y++) {
        const fy = (y % rh) / rh;
        for (let x = 0; x < S; x++) {
          const fx = (x % cw) / cw;
          const idx = (y * S + x) * 4;
          const n1 = pNoise(x, y, 16, 1.1);
          const n2 = pNoise(x, y, 48, 2.3);
          const tileId = Math.floor(x / cw) + Math.floor(y / rh) * 8;
          const tileTint = (hash(tileId, tileId * 3, 5.1) - 0.5) * 24;
          // 3D height profile: raised barrel rib at seam + overlapping step
          const ribDist = Math.min(fx, 1.0 - fx) * 2.0; // 0 at barrel seam, 1 at pan center
          const barrelH = ribDist < 0.44 ? Math.sqrt(Math.max(0, 1.0 - Math.pow(ribDist / 0.44, 2))) : 0.25 + 0.22 * Math.pow((ribDist - 0.44) / 0.56, 2);
          const stepH = 0.18 * (1.0 - fy);
          const hVal = Math.max(0, Math.min(255, Math.round((barrelH * 0.78 + stepH + (n2 - 0.5) * 0.06) * 255)));
          const dripAO = fy < 0.12 ? (0.62 + 0.38 * (fy / 0.12)) : 1.0;
          d[idx]     = Math.max(0, Math.min(255, Math.round((d[idx] + tileTint + (n1 - 0.5) * 16) * dripAO)));
          d[idx + 1] = Math.max(0, Math.min(255, Math.round(135 + (n1 - 0.5) * 55 + barrelH * 45))); // Glaze & moss patina
          d[idx + 2] = hVal; // B = Heightfield for bump normals
          // A = Roughness: smooth glazed ceramic (55..95) on barrel crown, rougher (165) in tile seams
          const rough = Math.round((0.24 + (1.0 - barrelH) * 0.26 + (fy < 0.14 ? 0.28 : 0.0) + (n2 - 0.5) * 0.08) * 255);
          d[idx + 3] = Math.max(25, Math.min(245, rough));
        }
      }
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, S, S, 1, gl.RGBA, gl.UNSIGNED_BYTE, d);

      // =========================================================
      // LAYER 1: 木纹 (Lacquered Wood Beams, Pillars & Ancient Tree Bark Grain)
      // =========================================================
      ctx.fillStyle = 'rgb(176, 176, 176)';
      ctx.fillRect(0, 0, S, S);
      img = ctx.getImageData(0, 0, S, S);
      d = img.data;
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const idx = (y * S + x) * 4;
          const warp = pNoise(x, y, 6, 3.7) * 2.4 + pNoise(x, y, 14, 7.1) * 0.8;
          const ringCoord = (x / S) * 18.0 + Math.sin((y / S) * Math.PI * 4.0) * 1.3 + warp;
          const ring = 0.5 + 0.5 * Math.sin(ringCoord * Math.PI * 2.0);
          const fineFiber = pNoise(x * 3, y, 24, 9.2);
          const barkGroove = pNoise(x * 2, y, 12, 4.4);
          const plankSeam = Math.min(x % 64, 64 - (x % 64)) < 2 ? 0.72 : 1.0;

          const grain = (ring * 0.52 + fineFiber * 0.30 + barkGroove * 0.18) * plankSeam;
          const lum = Math.max(0, Math.min(255, Math.round((0.52 + grain * 0.44) * 255)));
          const warmth = Math.max(0, Math.min(255, Math.round((0.40 + ring * 0.45 + fineFiber * 0.15) * 255)));
          const hVal = Math.max(0, Math.min(255, Math.round((grain * 0.82 + fineFiber * 0.18) * 255)));
          const rough = Math.max(40, Math.min(240, Math.round((0.36 + (1.0 - grain) * 0.34) * 255)));

          d[idx]     = lum;
          d[idx + 1] = warmth;
          d[idx + 2] = hVal;
          d[idx + 3] = rough;
        }
      }
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 1, S, S, 1, gl.RGBA, gl.UNSIGNED_BYTE, d);

      // =========================================================
      // LAYER 2: 石砖 / 青石板 (Carved Bluestone Flagstones & Ashlar Masonry)
      // =========================================================
      ctx.fillStyle = 'rgb(76, 82, 80)';
      ctx.fillRect(0, 0, S, S);
      const bRows = 8, bCols = 4;
      const bH = S / bRows, bW = S / bCols;
      for (let r = 0; r < bRows; r++) {
        const shift = (r % 2) * (bW * 0.5);
        for (let c = -1; c <= bCols; c++) {
          const bx = c * bW + shift;
          const by = r * bH;
          const bid = r * 17 + ((c + bCols) % bCols) * 31;
          const baseV = 158 + Math.round((hash(bid, r, 8.2) - 0.5) * 38);
          const gGrad = ctx.createLinearGradient(bx, by, bx + bW, by + bH);
          gGrad.addColorStop(0.0, `rgb(${baseV + 14}, ${baseV + 12}, ${baseV + 10})`);
          gGrad.addColorStop(0.5, `rgb(${baseV}, ${baseV}, ${baseV})`);
          gGrad.addColorStop(1.0, `rgb(${baseV - 14}, ${baseV - 12}, ${baseV - 10})`);
          ctx.fillStyle = gGrad;
          ctx.fillRect(bx + 2.5, by + 2.5, bW - 5.0, bH - 5.0);

          // Beveled chiseled stone highlight & shadow border
          ctx.strokeStyle = 'rgba(235, 240, 236, 0.38)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bx + 3.5, by + 3.5, bW - 7.0, bH - 7.0);
        }
      }
      img = ctx.getImageData(0, 0, S, S);
      d = img.data;
      for (let y = 0; y < S; y++) {
        const r = Math.floor(y / bH);
        const shift = (r % 2) * (bW * 0.5);
        const ly = (y % bH) / bH;
        for (let x = 0; x < S; x++) {
          const idx = (y * S + x) * 4;
          const lx = (((x - shift) % bW) + bW) % bW / bW;
          const edgeX = Math.min(lx, 1.0 - lx) * bW;
          const edgeY = Math.min(ly, 1.0 - ly) * bH;
          const edgeD = Math.min(edgeX, edgeY);
          const bezel = Math.min(1.0, edgeD / 5.5);

          const g1 = pNoise(x, y, 12, 6.1);
          const g2 = pNoise(x, y, 36, 11.4);
          const chisel = (g1 * 0.55 + g2 * 0.45 - 0.5) * 28;
          const mossChance = Math.max(0, Math.min(1, (1.0 - bezel) * 0.75 + (g1 - 0.45) * 0.6));

          d[idx]     = Math.max(35, Math.min(250, Math.round(d[idx] * (0.56 + 0.44 * bezel) + chisel)));
          d[idx + 1] = Math.max(0, Math.min(255, Math.round(mossChance * 255))); // G = moss/weathered patina mask in mortar joints
          d[idx + 2] = Math.max(0, Math.min(255, Math.round((bezel * 0.78 + g1 * 0.14 + g2 * 0.08) * 255))); // B = stone bevel height
          d[idx + 3] = Math.max(60, Math.min(245, Math.round((0.44 + (1.0 - bezel) * 0.38 + (1.0 - g2) * 0.14) * 255))); // A = stone roughness
        }
      }
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 2, S, S, 1, gl.RGBA, gl.UNSIGNED_BYTE, d);

      // =========================================================
      // LAYER 3: 山岩凹凸肌理与水岸鹅卵石 (Mountain Rock Strata & River Cobblestones)
      // =========================================================
      img = ctx.createImageData(S, S);
      d = img.data;
      // Precompute 36 tileable Voronoi cobblestone seeds on [0..6)x[0..6)
      const cobN = 6;
      const seeds = [];
      for (let cy = 0; cy < cobN; cy++) {
        for (let cx = 0; cx < cobN; cx++) {
          seeds.push({
            jx: 0.2 + 0.6 * hash(cx, cy, 19.1),
            jy: 0.2 + 0.6 * hash(cx, cy, 29.7),
            tone: 0.65 + 0.35 * hash(cx, cy, 41.3),
          });
        }
      }
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const idx = (y * S + x) * 4;
          // 1. Angular mountain rock fracture & folded strata
          const n1 = pNoise(x, y, 8, 13.3);
          const n2 = pNoise(x, y, 20, 17.9);
          const n3 = pNoise(x, y, 48, 23.5);
          const ridge1 = 1.0 - Math.abs(n1 * 2.0 - 1.0);
          const ridge2 = 1.0 - Math.abs(n2 * 2.0 - 1.0);
          const strata = 0.5 + 0.5 * Math.sin((y / S) * Math.PI * 12.0 + n1 * 4.2);
          const rockH = ridge1 * 0.48 + ridge2 * 0.30 + strata * 0.14 + n3 * 0.08;

          // 2. Rounded river cobblestones (Voronoi cellular distance) for shorelines & stream beds!
          const gx = (x / S) * cobN + (n2 - 0.5) * 0.22;
          const gy = (y / S) * cobN + (n1 - 0.5) * 0.22;
          const ix = Math.floor(gx), iy = Math.floor(gy);
          let d1 = 99.0, d2 = 99.0, cobTone = 0.8;
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              const cx = (((ix + ox) % cobN) + cobN) % cobN;
              const cy = (((iy + oy) % cobN) + cobN) % cobN;
              const s = seeds[cy * cobN + cx];
              const dx = (ix + ox + s.jx) - gx;
              const dy = (iy + oy + s.jy) - gy;
              const dist = Math.hypot(dx * 1.15, dy * 0.92);
              if (dist < d1) {
                d2 = d1;
                d1 = dist;
                cobTone = s.tone;
              } else if (dist < d2) {
                d2 = dist;
              }
            }
          }
          const edgeGap = Math.max(0, Math.min(1, (d2 - d1) * 3.4));
          const cobbleDome = Math.sqrt(Math.max(0, 1.0 - Math.min(1.0, d1 * 1.65) ** 2)) * edgeGap;
          const cobbleVal = cobbleDome * (0.72 + 0.28 * cobTone);

          d[idx]     = Math.max(0, Math.min(255, Math.round(rockH * 255)));      // R = Angular Rock Fracture Albedo/Relief
          d[idx + 1] = Math.max(0, Math.min(255, Math.round(cobbleVal * 255)));  // G = Rounded River Cobblestone Dome
          d[idx + 2] = Math.max(0, Math.min(255, Math.round((rockH * 0.65 + cobbleDome * 0.35) * 255))); // B = Combined Micro-Bump Height
          d[idx + 3] = Math.max(40, Math.min(245, Math.round((0.45 + (1.0 - rockH) * 0.42) * 255)));     // A = Roughness
        }
      }
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 3, S, S, 1, gl.RGBA, gl.UNSIGNED_BYTE, d);

      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    }

    _makeColorFBO(w, h, withDepth) {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      if (this.hasFloatHDR) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

      let depthRb = null;
      if (withDepth) {
        depthRb = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { fbo, tex, depthRb, w, h };
    }

    _destroyFBO(obj) {
      if (!obj) return;
      const gl = this.gl;
      gl.deleteFramebuffer(obj.fbo);
      gl.deleteTexture(obj.tex);
      if (obj.depthRb) gl.deleteRenderbuffer(obj.depthRb);
    }

    _createPostFBOs(cssW, cssH) {
      this._destroyFBO(this.hdrFbo);
      this._destroyFBO(this.bloomHalfA);
      this._destroyFBO(this.bloomHalfB);
      this._destroyFBO(this.bloomQuarterA);
      this._destroyFBO(this.bloomQuarterB);

      const w = Math.max(2, Math.floor(cssW * this.dpr));
      const h = Math.max(2, Math.floor(cssH * this.dpr));
      this.width = w;
      this.height = h;
      this.canvas.width = w;
      this.canvas.height = h;

      const hw = Math.max(2, w >> 1);
      const hh = Math.max(2, h >> 1);
      const qw = Math.max(2, w >> 2);
      const qh = Math.max(2, h >> 2);

      this.hdrFbo        = this._makeColorFBO(w, h, true);
      this.bloomHalfA    = this._makeColorFBO(hw, hh, false);
      this.bloomHalfB    = this._makeColorFBO(hw, hh, false);
      this.bloomQuarterA = this._makeColorFBO(qw, qh, false);
      this.bloomQuarterB = this._makeColorFBO(qw, qh, false);
    }

    resize() {
      this._createPostFBOs(window.innerWidth, window.innerHeight);
    }

    _uploadWorldVAO(mesh) {
      const gl = this.gl;
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);

      const stride = 12 * 4;
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 24);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, stride, 36);

      const ebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

      gl.bindVertexArray(null);
      return { vao, vbo, count: mesh.indices.length, type: mesh.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
    }

    _uploadGeometry() {
      const gl = this.gl;
      const W = this.world;

      // 1. Static World Meshes (Terrain, Distant Mountains, Landmarks, Tree Trunks)
      this.vaoTerrain   = this._uploadWorldVAO(W.terrainMesh);
      this.vaoDistMtns  = this._uploadWorldVAO(W.distMountainsMesh);
      this.vaoLandmarks = this._uploadWorldVAO(W.landmarks.staticMesh);
      this.vaoTrunks    = this._uploadWorldVAO(W.nature.trunkMesh);

      // 2. Sky Box Cube (inverted inward-facing unit cube)
      const skyVerts = new Float32Array([
        -1,-1,-1,  1,-1,-1,  1, 1,-1, -1, 1,-1,
        -1,-1, 1,  1,-1, 1,  1, 1, 1, -1, 1, 1,
      ]);
      const skyIdx = new Uint16Array([
        0,1,2, 0,2,3,  5,4,7, 5,7,6,
        4,0,3, 4,3,7,  1,5,6, 1,6,2,
        3,2,6, 3,6,7,  4,5,1, 4,1,0,
      ]);
      this.vaoSky = gl.createVertexArray();
      gl.bindVertexArray(this.vaoSky);
      const svbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, svbo);
      gl.bufferData(gl.ARRAY_BUFFER, skyVerts, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
      const sebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, skyIdx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);

      // 3. Upload 512x512 RGBA32F Terrain Height+Eligibility Data Texture for Ultra-Dense Toroidal Grass Carpet!
      const td = W.terrainDataTex;
      this.terrainDataTexSize = td.size;
      this.terrainDataTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.terrainDataTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, td.size, td.size, 0, gl.RGBA, gl.FLOAT, td.data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // 3A. Instanced Toroidal Dense Grass Carpet VAO (57,600 tufts!)
      const gvbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, gvbo);
      gl.bufferData(gl.ARRAY_BUFFER, W.nature.grassMesh.vertices, gl.STATIC_DRAW);
      const gebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, W.nature.grassMesh.indices, gl.STATIC_DRAW);
      this.grassIndexCount = W.nature.grassMesh.indices.length;

      const makeGrassVAO = (instData) => {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, gvbo);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gebo);
        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ARRAY_BUFFER, instData, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0);  gl.vertexAttribDivisor(2, 1);
        gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(3, 1);
        return vao;
      };

      this.vaoToroidalGrass = makeGrassVAO(W.nature.toroidalGrass.data);
      this.toroidalGrassCount = W.nature.toroidalGrass.count;
      this.toroidalCellSpacing = W.nature.toroidalGrass.cellSpacing;

      this.vaoIslandGrass = makeGrassVAO(W.nature.islandGrass.data);
      this.islandGrassCount = W.nature.islandGrass.count;

      // 4. Instanced Tree & Bamboo Canopy VAO
      this.vaoCanopy = gl.createVertexArray();
      gl.bindVertexArray(this.vaoCanopy);
      const cvbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, cvbo);
      gl.bufferData(gl.ARRAY_BUFFER, W.nature.canopyMesh.vertices, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
      const cebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, W.nature.canopyMesh.indices, gl.STATIC_DRAW);
      const cibo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, cibo);
      gl.bufferData(gl.ARRAY_BUFFER, W.nature.canopyInstances.data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 40, 0);  gl.vertexAttribDivisor(3, 1);
      gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 40, 12); gl.vertexAttribDivisor(4, 1);
      gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 40, 24); gl.vertexAttribDivisor(5, 1);
      this.canopyIndexCount = W.nature.canopyMesh.indices.length;
      this.canopyInstCount = W.nature.canopyInstances.count;

      // 5. Instanced Mossy Boulders VAO
      this.vaoBoulder = gl.createVertexArray();
      gl.bindVertexArray(this.vaoBoulder);
      const bvbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bvbo);
      gl.bufferData(gl.ARRAY_BUFFER, W.nature.boulderMesh.vertices, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      const bebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, W.nature.boulderMesh.indices, gl.STATIC_DRAW);
      const bibo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bibo);
      gl.bufferData(gl.ARRAY_BUFFER, W.nature.boulderInstances.data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0);  gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(3, 1);
      this.boulderIndexCount = W.nature.boulderMesh.indices.length;
      this.boulderInstCount = W.nature.boulderInstances.count;

      // 6. Animated Water VAO
      this.vaoWater = gl.createVertexArray();
      gl.bindVertexArray(this.vaoWater);
      const wvbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, wvbo);
      gl.bufferData(gl.ARRAY_BUFFER, W.landmarks.waterMesh.vertices, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 28, 20);
      const webo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, webo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, W.landmarks.waterMesh.indices, gl.STATIC_DRAW);
      this.waterIndexCount = W.landmarks.waterMesh.indices.length;

      // 7. Cascading Waterfalls VAO
      this.vaoWaterfall = gl.createVertexArray();
      gl.bindVertexArray(this.vaoWaterfall);
      const wfvbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, wfvbo);
      gl.bufferData(gl.ARRAY_BUFFER, W.landmarks.waterfallMesh.vertices, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 32, 20);
      const wfebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wfebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, W.landmarks.waterfallMesh.indices, gl.STATIC_DRAW);
      this.waterfallIndexCount = W.landmarks.waterfallMesh.indices.length;

      // 8. Sea of Clouds Sheet VAO
      this.vaoCloudSea = gl.createVertexArray();
      gl.bindVertexArray(this.vaoCloudSea);
      const csvbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, csvbo);
      gl.bufferData(gl.ARRAY_BUFFER, W.nature.cloudSeaMesh.vertices, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 24, 20);
      const csebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, csebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, W.nature.cloudSeaMesh.indices, gl.STATIC_DRAW);
      this.cloudSeaIndexCount = W.nature.cloudSeaMesh.indices.length;

      // 9. Instanced Volumetric Cloud Puffs VAO (reuses smooth pillow canopyMesh!)
      this.vaoCloudPuff = gl.createVertexArray();
      gl.bindVertexArray(this.vaoCloudPuff);
      gl.bindBuffer(gl.ARRAY_BUFFER, cvbo);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cebo);
      const cpibo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, cpibo);
      gl.bufferData(gl.ARRAY_BUFFER, W.nature.cloudPuffs.data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0);  gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(3, 1);
      this.cloudPuffInstCount = W.nature.cloudPuffs.count;

      // 10. Spirit Formation Unit Quad VAO + Rising Aura Cylinder VAO
      const qVerts = new Float32Array([-1, -1,  1, -1,  1, 1,  -1, -1,  1, 1,  -1, 1]);
      this.vaoQuad = gl.createVertexArray();
      gl.bindVertexArray(this.vaoQuad);
      const qvbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, qvbo);
      gl.bufferData(gl.ARRAY_BUFFER, qVerts, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

      // Rising Aura Cylinder (32 segments, open top/bottom)
      const auraSegs = 32;
      const auraVerts = [];
      const auraIdx = [];
      for (let i = 0; i <= auraSegs; i++) {
        const u = i / auraSegs;
        const a = u * Math.PI * 2;
        auraVerts.push(Math.cos(a), 0, Math.sin(a), u, 0);
        auraVerts.push(Math.cos(a), 1, Math.sin(a), u, 1);
      }
      for (let i = 0; i < auraSegs; i++) {
        const a = i * 2;
        auraIdx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
      this.vaoAura = gl.createVertexArray();
      gl.bindVertexArray(this.vaoAura);
      const avbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, avbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(auraVerts), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
      const aebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, aebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(auraIdx), gl.STATIC_DRAW);
      this.auraIndexCount = auraIdx.length;

      // 11. Living Particles Instanced Billboard VAO
      this.vaoParticles = gl.createVertexArray();
      gl.bindVertexArray(this.vaoParticles);
      gl.bindBuffer(gl.ARRAY_BUFFER, qvbo);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
      const pibo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pibo);
      gl.bufferData(gl.ARRAY_BUFFER, W.nature.particles.data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 40, 0);  gl.vertexAttribDivisor(1, 1);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 40, 16); gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 40, 32); gl.vertexAttribDivisor(3, 1);
      this.particleCount = W.nature.particles.count;

      // 12. Animated White Cranes VAO
      this.vaoCrane = gl.createVertexArray();
      gl.bindVertexArray(this.vaoCrane);
      const crvbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, crvbo);
      gl.bufferData(gl.ARRAY_BUFFER, W.nature.craneMesh.vertices, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 40, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 40, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 40, 24);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 40, 36);
      const crebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, crebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, W.nature.craneMesh.indices, gl.STATIC_DRAW);
      this.craneIndexCount = W.nature.craneMesh.indices.length;

      // 13. Qi-Refining Monster Species VAOs (8 species) & Shared Unit VFX VAOs (orb, ring, shard)
      this.monsterSpeciesVAOs = [];
      this.vfxVAOs = {};
      if (W.monsters) {
        for (let i = 0; i < W.monsters.speciesMeshes.length; i++) {
          this.monsterSpeciesVAOs.push(this._uploadWorldVAO(W.monsters.speciesMeshes[i]));
        }
        for (const shapeKey of Object.keys(W.monsters.vfxMeshes)) {
          const vm = W.monsters.vfxMeshes[shapeKey];
          const vao = gl.createVertexArray();
          gl.bindVertexArray(vao);
          const vbo = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
          gl.bufferData(gl.ARRAY_BUFFER, vm.vertices, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
          gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
          const ebo = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vm.indices, gl.STATIC_DRAW);
          this.vfxVAOs[shapeKey] = { vao, count: vm.indices.length, type: gl.UNSIGNED_SHORT };
        }
      }
      if (W.skills && W.skills.vfxMeshes) {
        for (const shapeKey of Object.keys(W.skills.vfxMeshes)) {
          const vm = W.skills.vfxMeshes[shapeKey];
          const vao = gl.createVertexArray();
          gl.bindVertexArray(vao);
          const vbo = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
          gl.bufferData(gl.ARRAY_BUFFER, vm.vertices, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
          gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
          const ebo = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vm.indices, gl.STATIC_DRAW);
          this.vfxVAOs[shapeKey] = { vao, count: vm.indices.length, type: gl.UNSIGNED_SHORT };
        }
      }

      // 14. Pure-Code Magical Treasures VAOs (Opaque 3D Models + Translucent VFX Meshes)
      this.treasureVAOs = {};
      if (W.treasures) {
        if (W.treasures.opaqueMeshes) {
          for (const tId of Object.keys(W.treasures.opaqueMeshes)) {
            this.treasureVAOs[tId] = this._uploadWorldVAO(W.treasures.opaqueMeshes[tId]);
          }
        }
        if (W.treasures.vfxMeshes) {
          for (const shapeKey of Object.keys(W.treasures.vfxMeshes)) {
            const vm = W.treasures.vfxMeshes[shapeKey];
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            const vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferData(gl.ARRAY_BUFFER, vm.vertices, gl.STATIC_DRAW);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
            const ebo = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vm.indices, gl.STATIC_DRAW);
            this.vfxVAOs[shapeKey] = { vao, count: vm.indices.length, type: gl.UNSIGNED_SHORT };
          }
        }
      }

      // 15. Pure-Code Spirit Herbs VAOs (Generic Tier 1/2 + 14 Regional Special Herbs)
      this.herbVAOs = {};
      if (W.herbs && W.herbs.meshes) {
        for (const hId of Object.keys(W.herbs.meshes)) {
          this.herbVAOs[hId] = this._uploadWorldVAO(W.herbs.meshes[hId]);
        }
      }

      // 16. Pure-Code Mineable Ore Veins VAOs (练气绿纹矿 + 筑基蓝纹矿)
      this.oreVAOs = {};
      if (W.ores && W.ores.meshes) {
        for (const oId of Object.keys(W.ores.meshes)) {
          this.oreVAOs[oId] = this._uploadWorldVAO(W.ores.meshes[oId]);
        }
      }

      // 17. Pure-Code Monster Ground Drops VAOs (一阶/二阶 妖丹、妖骨、妖皮)
      this.dropVAOs = {};
      if (W.drops && W.drops.meshes) {
        for (const dId of Object.keys(W.drops.meshes)) {
          this.dropVAOs[dId] = this._uploadWorldVAO(W.drops.meshes[dId]);
        }
      }

      // 18. Pure-Code Interactive City Doors & Hovering Xianxia Crystals/Halos VAOs
      this.cityVAOs = {};
      if (W.city && W.city.meshes) {
        for (const cId of Object.keys(W.city.meshes)) {
          this.cityVAOs[cId] = this._uploadWorldVAO(W.city.meshes[cId]);
        }
      }

      // 18B. Pure-Code Placeable Furnaces VAOs (炼丹炉 + 炼器炉与打铁砧)
      this.furnaceVAOs = {};
      if (W.furnaces && W.furnaces.meshes) {
        for (const fId of Object.keys(W.furnaces.meshes)) {
          this.furnaceVAOs[fId] = this._uploadWorldVAO(W.furnaces.meshes[fId]);
        }
      }

      // 19. Shared GPU Skinned VAOs for All NPCs (Exact Same Protagonist Body + 5 Outfits!)
      this.npcBaseVAO = null;
      this.npcOutfitVAOs = {};
      if (XW.Character && XW.Character.getSharedBaseMesh) {
        this.npcBaseVAO = this._uploadSkinnedVAO(XW.Character.getSharedBaseMesh());
      }
      if (XW.Outfits && XW.Outfits.OUTFIT_DEFS && XW.Outfits.getOutfitMeshes) {
        const slotKeys = ['outfitTop', 'outfitBottom', 'belt', 'hair', 'headAccessory'];
        for (const def of XW.Outfits.OUTFIT_DEFS) {
          const bundle = XW.Outfits.getOutfitMeshes(def.id);
          if (!bundle) continue;
          const vaos = [];
          for (const sk of slotKeys) {
            if (bundle[sk] && bundle[sk].indices && bundle[sk].indices.length > 0) {
              vaos.push(this._uploadSkinnedVAO(bundle[sk]));
            }
          }
          this.npcOutfitVAOs[def.id] = vaos;
        }
      }

      // 20. Ultra-Lightweight Ground Blob Shadows (脚底伪接触阴影: 近处树干静态批次 + 主角/妖兽/NPC动态批次)
      const blobQuadVerts = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
      const blobQuadIdx = new Uint16Array([0, 1, 2, 0, 2, 3]);
      this.blobQuadVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.blobQuadVBO);
      gl.bufferData(gl.ARRAY_BUFFER, blobQuadVerts, gl.STATIC_DRAW);
      this.blobQuadEBO = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.blobQuadEBO);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, blobQuadIdx, gl.STATIC_DRAW);

      const setupBlobVAO = (instBuf) => {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.blobQuadVBO);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 20, 0);
        gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16);
        gl.vertexAttribDivisor(2, 1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.blobQuadEBO);
        return vao;
      };

      // 20A. Static Tree Trunk Blob Shadows (extracted directly from registered 'tree' base cylinders!)
      const treeBlobs = [];
      if (W.collisionWorld && W.collisionWorld.colliders && XW.Terrain) {
        const T = XW.Terrain;
        const cols = W.collisionWorld.colliders;
        for (let i = 0; i < cols.length; i++) {
          const c = cols[i];
          if (c.type !== 'cyl' || c.tag !== 'tree' || c.r < 0.42 || c.r > 6.5) continue;
          const gy = T.getMeshTerrainHeight(c.cx, c.cz);
          if (c.minY > gy + 2.5) continue; // skip upper trunk segments of giant spirit trees
          const rad = Math.min(c.r * 2.65 + 0.72, 7.2);
          treeBlobs.push(c.cx, gy, c.cz, rad, 0.46);
        }
      }
      this.treeBlobCount = treeBlobs.length / 5;
      this.treeBlobBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.treeBlobBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(treeBlobs), gl.STATIC_DRAW);
      this.vaoTreeBlob = setupBlobVAO(this.treeBlobBuf);

      // 20B. Dynamic Actor Blob Shadows (Protagonist + nearby visible Monsters & NPCs, max 256)
      this._maxDynBlobs = 256;
      this._dynBlobData = new Float32Array(this._maxDynBlobs * 5);
      this.dynBlobBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dynBlobBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this._dynBlobData.byteLength, gl.DYNAMIC_DRAW);
      this.vaoDynBlob = setupBlobVAO(this.dynBlobBuf);

      gl.bindVertexArray(null);
    }

    _uploadSkinnedVAO(mesh) {
      const gl = this.gl;
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
      const stride = 80; // 20 floats: pos3, nrm3, col3, mat3, joints4, weights4
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 24);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, stride, 36);
      gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, 48);
      gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, stride, 64);
      const ebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      return { vao, vbo, ebo, count: mesh.indices.length };
    }

    _updateShadowMatrix(camPos, sunDir) {
      // Center shadow frustum around camera with texel-grid snapping (zero per-frame array allocations!)
      const span = this.shadowSpan || 195.0;
      const texelWorld = (span * 2.0) / (this.shadowSize || 1024);
      const cx = Math.floor(camPos[0] / texelWorld) * texelWorld;
      const cy = Math.floor(Math.max(camPos[1] - 18.0, camPos[1] * 0.5 + 22.0) / texelWorld) * texelWorld;
      const cz = Math.floor(camPos[2] / texelWorld) * texelWorld;

      const lightDist = 340.0;
      this._shadowEye[0] = cx + sunDir[0] * lightDist;
      this._shadowEye[1] = cy + sunDir[1] * lightDist;
      this._shadowEye[2] = cz + sunDir[2] * lightDist;
      this._shadowTarget[0] = cx;
      this._shadowTarget[1] = cy;
      this._shadowTarget[2] = cz;
      this._shadowCenter[0] = cx;
      this._shadowCenter[1] = cy;
      this._shadowCenter[2] = cz;
      M.m4LookAt(this.lightViewMat, this._shadowEye, this._shadowTarget, this._upVec);
      M.m4Ortho(this.lightProjMat, -span, span, -span, span, 20.0, 740.0);
      M.m4Multiply(this.lightVPMat, this.lightProjMat, this.lightViewMat);
    }

    _setAtmoUniforms(u, cam, atmo, sunDir, time) {
      const gl = this.gl;
      if (u.uVP)               gl.uniformMatrix4fv(u.uVP, false, this.vpMat);
      if (u.uLightVP)          gl.uniformMatrix4fv(u.uLightVP, false, this.lightVPMat);
      if (u.uCameraPos)        gl.uniform3fv(u.uCameraPos, cam.pos);
      if (u.uSunDir)           gl.uniform3fv(u.uSunDir, sunDir);
      if (u.uSunColor)         gl.uniform3fv(u.uSunColor, atmo.sunColor);
      if (u.uSkyTop)           gl.uniform3fv(u.uSkyTop, atmo.skyTop);
      if (u.uSkyHorizon)       gl.uniform3fv(u.uSkyHorizon, atmo.skyHorizon);
      if (u.uFogColor)         gl.uniform3fv(u.uFogColor, atmo.fogColor);
      if (u.uShadowTint)       gl.uniform3fv(u.uShadowTint, atmo.shadowTint);
      if (u.uFogDensity)       gl.uniform1f(u.uFogDensity, atmo.fogDensity);
      if (u.uHeightFogDensity) gl.uniform1f(u.uHeightFogDensity, atmo.heightFogDensity);
      if (u.uHeightFogBase)    gl.uniform1f(u.uHeightFogBase, atmo.heightFogBase);
      if (u.uTime)             gl.uniform1f(u.uTime, time);
      if (u.uShadowMap)        gl.uniform1i(u.uShadowMap, 0);
      if (u.uMatTexArray)      gl.uniform1i(u.uMatTexArray, 2);
      if (u.uShadowParams)     gl.uniform4fv(u.uShadowParams, this.shadowParams);
      if (u.uQualityLevel)     gl.uniform1f(u.uQualityLevel, this.qualityLevel);
      if (u.uFogDistScale)     gl.uniform1f(u.uFogDistScale, this.fogDistScale);
      if (u.uPropCullDist)     gl.uniform1f(u.uPropCullDist, this.propCullDist);
    }

    _syncCharacterSlots(character) {
      if (!character || !character.slots) return;
      const gl = this.gl;
      for (const slotName of Object.keys(character.slots)) {
        const slot = character.slots[slotName];
        if (!slot.dirty) continue;
        // Dispose previous GPU buffers for this wardrobe slot cleanly on hot-swap
        const prev = this.charSlotVAOs[slotName];
        if (prev) {
          gl.deleteVertexArray(prev.vao);
          gl.deleteBuffer(prev.vbo);
          gl.deleteBuffer(prev.ebo);
          delete this.charSlotVAOs[slotName];
        }
        if (slot.mesh && slot.mesh.indices && slot.mesh.indices.length > 0) {
          const vao = gl.createVertexArray();
          gl.bindVertexArray(vao);
          const vbo = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
          gl.bufferData(gl.ARRAY_BUFFER, slot.mesh.vertices, gl.STATIC_DRAW);
          const stride = 80; // 20 floats: pos3, nrm3, col3, mat3, joints4, weights4
          gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
          gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
          gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 24);
          gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, stride, 36);
          gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, 48);
          gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, stride, 64);
          const ebo = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, slot.mesh.indices, gl.STATIC_DRAW);
          gl.bindVertexArray(null);
          this.charSlotVAOs[slotName] = { vao, vbo, ebo, count: slot.mesh.indices.length };
        }
        slot.dirty = false;
      }
    }

    render(cam, atmo, sunDir, time, character = null, monsterSystem = null, skillSystem = null, treasureSystem = null, herbSystem = null, oreSystem = null, dropSystem = null, citySystem = null, npcSystem = null, furnaceSystem = null) {
      const gl = this.gl;
      if (character) {
        this._syncCharacterSlots(character);
      }

      // Update camera projection & VP using active View Distance setting (this.farPlane)!
      M.m4Perspective(this.projMat, (56 * Math.PI) / 180, this.width / this.height, 0.8, this.farPlane);
      M.m4Multiply(this.vpMat, this.projMat, cam.viewMat);

      // =====================================================
      // PASS 1: DYNAMIC SHADOW MAP DEPTH PASS (512 / 2048 / 4096 or Off)
      // =====================================================
      if (this.settings.shadowQuality !== 'off') {
        this._updateShadowMatrix(cam.pos, sunDir);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
        gl.viewport(0, 0, this.shadowSize, this.shadowSize);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(2.5, 4.0);

        gl.useProgram(this.prog.shadow.prog);
        gl.uniformMatrix4fv(this.prog.shadow.u.uLightVP, false, this.lightVPMat);

        // 仅建筑与树干投射阴影（跳过 60+万面的地形网格与远山/海面，大幅削减阴影深度通道 GPU 开销！）
        gl.bindVertexArray(this.vaoLandmarks.vao);
        gl.drawElements(gl.TRIANGLES, this.vaoLandmarks.count, this.vaoLandmarks.type, 0);
        gl.bindVertexArray(this.vaoTrunks.vao);
        gl.drawElements(gl.TRIANGLES, this.vaoTrunks.count, this.vaoTrunks.type, 0);

        // 仅阴影盒范围内的近处树冠投射斑驳树影（GPU 顶点级距离早退剔除 98% 远景树冠）
        if (this.settings.shadowQuality === 'medium' || this.settings.shadowQuality === 'high') {
          gl.useProgram(this.prog.shadowCanopy.prog);
          const scpu = this.prog.shadowCanopy.u;
          gl.uniformMatrix4fv(scpu.uLightVP, false, this.lightVPMat);
          if (scpu.uShadowCenter) gl.uniform3fv(scpu.uShadowCenter, this._shadowCenter);
          if (scpu.uShadowSpan) gl.uniform1f(scpu.uShadowSpan, this.shadowSpan);
          gl.bindVertexArray(this.vaoCanopy);
          gl.drawElementsInstanced(gl.TRIANGLES, this.canopyIndexCount, gl.UNSIGNED_SHORT, 0, this.canopyInstCount);
        }

        // 高阴影档位下，仅阴影盒范围内的近处巨石投射阴影
        if (this.settings.shadowQuality === 'high') {
          gl.useProgram(this.prog.shadowBoulder.prog);
          const sbu = this.prog.shadowBoulder.u;
          gl.uniformMatrix4fv(sbu.uLightVP, false, this.lightVPMat);
          if (sbu.uShadowCenter) gl.uniform3fv(sbu.uShadowCenter, this._shadowCenter);
          if (sbu.uShadowSpan) gl.uniform1f(sbu.uShadowSpan, this.shadowSpan);
          gl.bindVertexArray(this.vaoBoulder);
          gl.drawElementsInstanced(gl.TRIANGLES, this.boulderIndexCount, gl.UNSIGNED_SHORT, 0, this.boulderInstCount);
        }

        // Protagonist & Nearby NPCs cast live articulated shadows
        if (character || (npcSystem && this.npcBaseVAO)) {
          gl.useProgram(this.prog.shadowChar.prog);
          const scu = this.prog.shadowChar.u;
          gl.uniformMatrix4fv(scu.uLightVP, false, this.lightVPMat);
          const sbLoc = scu['uBones[0]'] || scu.uBones;
          if (character) {
            if (sbLoc) gl.uniformMatrix4fv(sbLoc, false, character.skinMatrices);
            for (const k of Object.keys(this.charSlotVAOs)) {
              const item = this.charSlotVAOs[k];
              gl.bindVertexArray(item.vao);
              gl.drawElements(gl.TRIANGLES, item.count, gl.UNSIGNED_INT, 0);
            }
          }
          if (npcSystem && this.npcBaseVAO && sbLoc) {
            const nList = npcSystem.npcs;
            const shSpan2 = this.shadowSpan * this.shadowSpan;
            for (let i = 0; i < nList.length; i++) {
              const n = nList[i];
              if (!n.alive || !n.visible || !n.char) continue;
              const dx = n.x - cam.pos[0], dz = n.z - cam.pos[2];
              if (dx * dx + dz * dz > shSpan2) continue;
              gl.uniformMatrix4fv(sbLoc, false, n.char.skinMatrices);
              gl.bindVertexArray(this.npcBaseVAO.vao);
              gl.drawElements(gl.TRIANGLES, this.npcBaseVAO.count, gl.UNSIGNED_INT, 0);
              const oVAOs = this.npcOutfitVAOs[n.outfitId];
              if (oVAOs) {
                for (let oi = 0; oi < oVAOs.length; oi++) {
                  gl.bindVertexArray(oVAOs[oi].vao);
                  gl.drawElements(gl.TRIANGLES, oVAOs[oi].count, gl.UNSIGNED_INT, 0);
                }
              }
            }
          }
        }

        // Nearby Qi-Refining Monsters cast live shadows
        if (monsterSystem && this.monsterSpeciesVAOs.length > 0) {
          gl.useProgram(this.prog.shadowMonster.prog);
          const smu = this.prog.shadowMonster.u;
          gl.uniformMatrix4fv(smu.uLightVP, false, this.lightVPMat);
          const list = monsterSystem.monsters;
          let boundSpec = -1;
          for (let i = 0; i < list.length; i++) {
            const m = list[i];
            if (!m.visible) continue;
            const dx = m.x - cam.pos[0], dz = m.z - cam.pos[2];
            if (dx * dx + dz * dz > this.shadowSpan * this.shadowSpan) continue;
            const vaoInfo = this.monsterSpeciesVAOs[m.specId];
            if (!vaoInfo) continue;
            if (boundSpec !== m.specId) {
              gl.bindVertexArray(vaoInfo.vao);
              boundSpec = m.specId;
            }
            gl.uniformMatrix4fv(smu.uModel, false, m.modelMat);
            gl.drawElements(gl.TRIANGLES, vaoInfo.count, vaoInfo.type, 0);
          }
        }

        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.cullFace(gl.BACK);
      }

      // =====================================================
      // PASS 2: MAIN HDR 3D WORLD RENDER PASS
      // =====================================================
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.hdrFbo.fbo);
      gl.viewport(0, 0, this.width, this.height);
      gl.clearColor(atmo.skyHorizon[0], atmo.skyHorizon[1], atmo.skyHorizon[2], 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.matTexArray);
      gl.activeTexture(gl.TEXTURE0);

      // 2A. Opaque World Geometry (Terrain, Distant Mountains, Landmarks, Tree Trunks)
      gl.useProgram(this.prog.world.prog);
      this._setAtmoUniforms(this.prog.world.u, cam, atmo, sunDir, time);

      gl.bindVertexArray(this.vaoTerrain.vao);
      gl.drawElements(gl.TRIANGLES, this.vaoTerrain.count, this.vaoTerrain.type, 0);

      if (this.drawDistMountains) {
        gl.bindVertexArray(this.vaoDistMtns.vao);
        gl.drawElements(gl.TRIANGLES, this.vaoDistMtns.count, this.vaoDistMtns.type, 0);
      }

      gl.disable(gl.CULL_FACE); // Double-sided architecture roof undersides & crystal facets stay clean
      gl.bindVertexArray(this.vaoLandmarks.vao);
      gl.drawElements(gl.TRIANGLES, this.vaoLandmarks.count, this.vaoLandmarks.type, 0);
      gl.enable(gl.CULL_FACE);

      gl.bindVertexArray(this.vaoTrunks.vao);
      gl.drawElements(gl.TRIANGLES, this.vaoTrunks.count, this.vaoTrunks.type, 0);

      // 2A-2. Pure-Code Smooth Solid-Color Humanoid Protagonist & NPCs (GPU 20-Bone Skinned)
      if (character || (npcSystem && this.npcBaseVAO)) {
        gl.useProgram(this.prog.character.prog);
        const cu = this.prog.character.u;
        this._setAtmoUniforms(cu, cam, atmo, sunDir, time);
        const bLoc = cu['uBones[0]'] || cu.uBones;
        gl.enable(gl.CULL_FACE);
        if (character) {
          if (bLoc) gl.uniformMatrix4fv(bLoc, false, character.skinMatrices);
          for (const k of Object.keys(this.charSlotVAOs)) {
            const item = this.charSlotVAOs[k];
            gl.bindVertexArray(item.vao);
            gl.drawElements(gl.TRIANGLES, item.count, gl.UNSIGNED_INT, 0);
          }
        }
        if (npcSystem && this.npcBaseVAO && bLoc) {
          const nList = npcSystem.npcs;
          const cullD2 = Math.min(this.propCullDist, 420.0) * Math.min(this.propCullDist, 420.0);
          for (let i = 0; i < nList.length; i++) {
            const n = nList[i];
            if (!n.alive || !n.visible || !n.char) continue;
            const dx = n.x - cam.pos[0], dz = n.z - cam.pos[2];
            if (dx * dx + dz * dz > cullD2) continue;
            gl.uniformMatrix4fv(bLoc, false, n.char.skinMatrices);
            gl.bindVertexArray(this.npcBaseVAO.vao);
            gl.drawElements(gl.TRIANGLES, this.npcBaseVAO.count, gl.UNSIGNED_INT, 0);
            const oVAOs = this.npcOutfitVAOs[n.outfitId];
            if (oVAOs) {
              for (let oi = 0; oi < oVAOs.length; oi++) {
                gl.bindVertexArray(oVAOs[oi].vao);
                gl.drawElements(gl.TRIANGLES, oVAOs[oi].count, gl.UNSIGNED_INT, 0);
              }
            }
          }
        }
      }

      // 2A-3..2A-9. 合并状态切换：妖兽 / 法宝 / 灵药 / 矿脉 / 掉落物 / 城门水晶 / 炉鼎共用一次 prog.monster 绑定与大气 Uniform 上传！
      const hasMonstersDraw = monsterSystem && this.monsterSpeciesVAOs.length > 0;
      const hasPlayerTreasures = treasureSystem && treasureSystem.opaqueDrawList.length > 0;
      const hasNpcTreasures = npcSystem && npcSystem.opaqueDrawList.length > 0;
      const hasHerbsDraw = herbSystem && herbSystem.drawList.length > 0 && this.herbVAOs;
      const hasOresDraw = oreSystem && oreSystem.drawList.length > 0 && this.oreVAOs;
      const hasDropsDraw = dropSystem && dropSystem.drawList.length > 0 && this.dropVAOs;
      const hasCityDraw = citySystem && citySystem.drawList.length > 0 && this.cityVAOs;
      const hasFurnaceDraw = furnaceSystem && furnaceSystem.drawList.length > 0 && this.furnaceVAOs;

      if (hasMonstersDraw || hasPlayerTreasures || hasNpcTreasures || hasHerbsDraw || hasOresDraw || hasDropsDraw || hasCityDraw || hasFurnaceDraw) {
        gl.useProgram(this.prog.monster.prog);
        const mu = this.prog.monster.u;
        this._setAtmoUniforms(mu, cam, atmo, sunDir, time);
        gl.disable(gl.CULL_FACE);

        if (hasMonstersDraw) {
          const list = monsterSystem.monsters;
          let boundSpec = -1;
          const cullD = Math.min(this.propCullDist, 560.0);
          const cullD2 = cullD * cullD;
          for (let i = 0; i < list.length; i++) {
            const m = list[i];
            if (!m.visible) continue;
            const dx = m.x - cam.pos[0], dz = m.z - cam.pos[2];
            if (dx * dx + dz * dz > cullD2) continue;
            const vaoInfo = this.monsterSpeciesVAOs[m.specId];
            if (!vaoInfo) continue;
            if (boundSpec !== m.specId) {
              gl.bindVertexArray(vaoInfo.vao);
              boundSpec = m.specId;
            }
            gl.uniformMatrix4fv(mu.uModel, false, m.modelMat);
            gl.uniform4f(mu.uAnim, m.animPhase, m.moveBlend, m.attackProgress, m.chargeGlow);
            gl.uniform1f(mu.uSpecId, m.specId);
            gl.uniform3fv(mu.uChargeColor, m.spec.tint);
            gl.drawElements(gl.TRIANGLES, vaoInfo.count, vaoInfo.type, 0);
          }
        }

        const drawStaticPropBatch = (dList, vaoMap, defaultGlow) => {
          let boundId = null;
          gl.uniform1f(mu.uSpecId, -1.0);
          for (let i = 0; i < dList.length; i++) {
            const item = dList[i];
            const vaoInfo = vaoMap[item.id];
            if (!vaoInfo) continue;
            if (boundId !== item.id) {
              gl.bindVertexArray(vaoInfo.vao);
              boundId = item.id;
            }
            gl.uniformMatrix4fv(mu.uModel, false, item.modelMat);
            gl.uniform4f(mu.uAnim, 0.0, 0.0, 0.0, item.glow !== undefined ? item.glow : defaultGlow);
            gl.uniform3fv(mu.uChargeColor, item.tint);
            gl.drawElements(gl.TRIANGLES, vaoInfo.count, vaoInfo.type, 0);
          }
        };

        if (hasPlayerTreasures && this.treasureVAOs) drawStaticPropBatch(treasureSystem.opaqueDrawList, this.treasureVAOs, 0.0);
        if (hasNpcTreasures && this.treasureVAOs) drawStaticPropBatch(npcSystem.opaqueDrawList, this.treasureVAOs, 0.0);
        if (hasHerbsDraw) drawStaticPropBatch(herbSystem.drawList, this.herbVAOs, 0.15);
        if (hasOresDraw) drawStaticPropBatch(oreSystem.drawList, this.oreVAOs, 0.16);
        if (hasDropsDraw) drawStaticPropBatch(dropSystem.drawList, this.dropVAOs, 0.25);
        if (hasCityDraw) drawStaticPropBatch(citySystem.drawList, this.cityVAOs, 0.05);
        if (hasFurnaceDraw) drawStaticPropBatch(furnaceSystem.drawList, this.furnaceVAOs, 0.14);

        gl.enable(gl.CULL_FACE);
      }

      // 2B. Instanced Mossy Boulders
      gl.useProgram(this.prog.boulder.prog);
      this._setAtmoUniforms(this.prog.boulder.u, cam, atmo, sunDir, time);
      gl.bindVertexArray(this.vaoBoulder);
      gl.drawElementsInstanced(gl.TRIANGLES, this.boulderIndexCount, gl.UNSIGNED_SHORT, 0, this.boulderInstCount);

      // 2B-2. Ultra-Lightweight Ground Blob Shadows (脚底伪接触阴影: 主角、妖兽、NPC 与近处树干)
      if (this.blobShadowEnabled && this.prog.blobShadow) {
        const bu = this.prog.blobShadow.u;
        const T = XW.Terrain;
        const strength = this.settings.shadowQuality === 'off' ? 1.0 : 0.56;
        gl.useProgram(this.prog.blobShadow.prog);
        gl.uniformMatrix4fv(bu.uVP, false, this.vpMat);
        gl.uniform3fv(bu.uCameraPos, cam.pos);
        if (bu.uWorldSize) gl.uniform1f(bu.uWorldSize, T.WORLD_SIZE);
        if (bu.uStrengthScale) gl.uniform1f(bu.uStrengthScale, strength);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.terrainDataTex);
        if (bu.uTerrainMap) gl.uniform1i(bu.uTerrainMap, 1);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1.5, -2.0);

        // (a) Static Nearby Tree Trunk Blobs (GPU distance + frustum culled within 148m)
        if (this.treeBlobCount > 0) {
          if (bu.uConformTerrain) gl.uniform1f(bu.uConformTerrain, 1.0);
          if (bu.uMaxDist) gl.uniform1f(bu.uMaxDist, 148.0);
          gl.bindVertexArray(this.vaoTreeBlob);
          gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, this.treeBlobCount);
        }

        // (b) Dynamic Protagonist, Monster & NPC Blobs
        let dynN = 0;
        const arr = this._dynBlobData;
        const maxD = this._maxDynBlobs;
        const pushBlob = (x, gy, z, rad, alpha) => {
          if (dynN >= maxD || alpha <= 0.01) return;
          const o = dynN * 5;
          arr[o] = x; arr[o + 1] = gy; arr[o + 2] = z; arr[o + 3] = rad; arr[o + 4] = alpha;
          dynN++;
        };

        if (character && cam.playerPos) {
          const px = cam.playerPos[0], py = cam.playerPos[1], pz = cam.playerPos[2];
          const gy = cam.grounded ? py : Math.min(py, T.getMeshTerrainHeight(px, pz));
          const alt = Math.max(0.0, py - gy);
          const altFade = Math.max(0.0, 1.0 - alt / 15.0);
          pushBlob(px, gy, pz, 0.96 + alt * 0.045, 0.58 * altFade);
        }

        const cpx = cam.pos[0], cpz = cam.pos[2];
        if (monsterSystem && monsterSystem.monsters) {
          const mList = monsterSystem.monsters;
          for (let i = 0; i < mList.length && dynN < maxD; i++) {
            const m = mList[i];
            if (!m.alive || !m.visible) continue;
            const dx = m.x - cpx, dz = m.z - cpz;
            if (dx * dx + dz * dz > 165.0 * 165.0) continue;
            const gy = T.getMeshTerrainHeight(m.x, m.z);
            const alt = Math.max(0.0, m.y - gy);
            const altFade = Math.max(0.0, 1.0 - alt / 15.0);
            const rad = Math.max(0.85, (m.spec.radius || 1.2) * 1.22) + alt * 0.04;
            pushBlob(m.x, gy, m.z, rad, 0.54 * altFade);
          }
        }
        if (npcSystem && npcSystem.npcs) {
          const nList = npcSystem.npcs;
          for (let i = 0; i < nList.length && dynN < maxD; i++) {
            const n = nList[i];
            if (!n.alive || !n.visible) continue;
            const dx = n.x - cpx, dz = n.z - cpz;
            if (dx * dx + dz * dz > 145.0 * 145.0) continue;
            pushBlob(n.x, n.y, n.z, 0.92, 0.50);
          }
        }

        if (dynN > 0) {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.dynBlobBuf);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr.subarray(0, dynN * 5));
          if (bu.uConformTerrain) gl.uniform1f(bu.uConformTerrain, 0.0);
          if (bu.uMaxDist) gl.uniform1f(bu.uMaxDist, 175.0);
          gl.bindVertexArray(this.vaoDynBlob);
          gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, dynN);
        }

        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.enable(gl.CULL_FACE);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.activeTexture(gl.TEXTURE0);
      }

      // 2C. Instanced Wind-Swaying Grass (57,600-tuft Ultra-Dense Toroidal Carpet + Floating Island Grass!)
      gl.disable(gl.CULL_FACE);
      gl.useProgram(this.prog.grass.prog);
      const gu = this.prog.grass.u;
      this._setAtmoUniforms(gu, cam, atmo, sunDir, time);

      // Toroidal world-snapped grass carpet following player seamlessly everywhere on the continent!
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.terrainDataTex);
      if (gu.uTerrainMap)       gl.uniform1i(gu.uTerrainMap, 1);
      if (gu.uUseTerrainMap)    gl.uniform1f(gu.uUseTerrainMap, 1.0);
      if (gu.uCellSpacing)      gl.uniform1f(gu.uCellSpacing, this.toroidalCellSpacing);
      if (gu.uWorldSize)        gl.uniform1f(gu.uWorldSize, XW.Terrain.WORLD_SIZE);
      if (gu.uTerrainTexSize)   gl.uniform1f(gu.uTerrainTexSize, this.terrainDataTexSize);
      if (gu.uGrassRadiusScale) gl.uniform1f(gu.uGrassRadiusScale, this.grassRadiusScale);
      gl.bindVertexArray(this.vaoToroidalGrass);
      gl.drawElementsInstanced(gl.TRIANGLES, this.grassIndexCount, gl.UNSIGNED_SHORT, 0, this.toroidalGrassCount);

      // Static lush grass crowning the 7 Floating Immortal Islands & reed banks
      if (gu.uUseTerrainMap) gl.uniform1f(gu.uUseTerrainMap, 0.0);
      gl.bindVertexArray(this.vaoIslandGrass);
      gl.drawElementsInstanced(gl.TRIANGLES, this.grassIndexCount, gl.UNSIGNED_SHORT, 0, this.islandGrassCount);

      gl.activeTexture(gl.TEXTURE0);
      gl.enable(gl.CULL_FACE);

      // 2D. Instanced Tree & Bamboo Foliage Canopies
      gl.useProgram(this.prog.canopy.prog);
      this._setAtmoUniforms(this.prog.canopy.u, cam, atmo, sunDir, time);
      gl.bindVertexArray(this.vaoCanopy);
      gl.drawElementsInstanced(gl.TRIANGLES, this.canopyIndexCount, gl.UNSIGNED_SHORT, 0, this.canopyInstCount);

      // 2E. Circling Flapping White Cranes (御空仙鹤 — 超距剔除避免无意义绘制)
      gl.useProgram(this.prog.crane.prog);
      this._setAtmoUniforms(this.prog.crane.u, cam, atmo, sunDir, time);
      gl.bindVertexArray(this.vaoCrane);
      const cranes = this.world.nature.cranes;
      const craneMaxD = Math.min(this.propCullDist, 2200.0);
      const craneMaxD2 = craneMaxD * craneMaxD;
      for (let i = 0; i < cranes.length; i++) {
        const c = cranes[i];
        const cdx = c.cx - cam.pos[0], cdz = c.cz - cam.pos[2];
        if (cdx * cdx + cdz * cdz > craneMaxD2) continue;
        const ang = time * c.speed + c.phase;
        const x = c.cx + Math.cos(ang) * c.radius;
        const z = c.cz + Math.sin(ang) * c.radius;
        const y = c.cy + Math.sin(ang * 2.0 + c.phase) * 3.8;
        // Tangent heading direction
        const vx = -Math.sin(ang) * c.speed;
        const vz =  Math.cos(ang) * c.speed;
        const yaw = Math.atan2(vx, vz);
        const bank = (c.speed > 0 ? -0.22 : 0.22);
        M.m4ComposeTRS(this.craneModelMat, x, y, z, 0, yaw, bank, c.scale, c.scale, c.scale);
        gl.uniformMatrix4fv(this.prog.crane.u.uModel, false, this.craneModelMat);
        gl.uniform1f(this.prog.crane.u.uFlapPhase, time * c.flapSpeed + c.phase);
        gl.drawElements(gl.TRIANGLES, this.craneIndexCount, gl.UNSIGNED_SHORT, 0);
      }

      // 2F. Sky Dome at Depth = 1.0 (only shades sky pixels!)
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      gl.useProgram(this.prog.sky.prog);
      gl.uniformMatrix4fv(this.prog.sky.u.uProj, false, this.projMat);
      gl.uniformMatrix4fv(this.prog.sky.u.uViewNoTrans, false, cam.viewNoTrans);
      gl.uniform3fv(this.prog.sky.u.uSunDir, sunDir);
      gl.uniform3fv(this.prog.sky.u.uSunColor, atmo.sunColor);
      gl.uniform3fv(this.prog.sky.u.uSkyTop, atmo.skyTop);
      gl.uniform3fv(this.prog.sky.u.uSkyHorizon, atmo.skyHorizon);
      gl.uniform3fv(this.prog.sky.u.uFogColor, atmo.fogColor);
      gl.uniform1f(this.prog.sky.u.uTime, time);
      gl.bindVertexArray(this.vaoSky);
      gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
      gl.depthFunc(gl.LESS);

      // =====================================================
      // PASS 2G: TRANSPARENT & LUMINOUS LAYERS
      // =====================================================
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);

      // Sea of Clouds Sheet
      gl.useProgram(this.prog.cloudSea.prog);
      this._setAtmoUniforms(this.prog.cloudSea.u, cam, atmo, sunDir, time);
      gl.bindVertexArray(this.vaoCloudSea);
      gl.drawElements(gl.TRIANGLES, this.cloudSeaIndexCount, gl.UNSIGNED_INT, 0);

      // Volumetric Cloud Puffs around Floating Islands & Mountain Passes (enabled on Medium/High Quality)
      if (this.drawCloudPuffs) {
        gl.enable(gl.CULL_FACE);
        gl.useProgram(this.prog.cloudPuff.prog);
        this._setAtmoUniforms(this.prog.cloudPuff.u, cam, atmo, sunDir, time);
        gl.bindVertexArray(this.vaoCloudPuff);
        gl.drawElementsInstanced(gl.TRIANGLES, this.canopyIndexCount, gl.UNSIGNED_SHORT, 0, this.cloudPuffInstCount);
        gl.disable(gl.CULL_FACE);
      }

      // Animated Spirit Spring Pool & Canyon River Water
      gl.useProgram(this.prog.water.prog);
      this._setAtmoUniforms(this.prog.water.u, cam, atmo, sunDir, time);
      gl.bindVertexArray(this.vaoWater);
      gl.drawElements(gl.TRIANGLES, this.waterIndexCount, gl.UNSIGNED_INT, 0);

      // Cascading Waterfalls
      if (this.waterfallIndexCount > 0) {
        gl.useProgram(this.prog.waterfall.prog);
        this._setAtmoUniforms(this.prog.waterfall.u, cam, atmo, sunDir, time);
        gl.bindVertexArray(this.vaoWaterfall);
        gl.drawElements(gl.TRIANGLES, this.waterfallIndexCount, gl.UNSIGNED_INT, 0);
      }

      // Glowing Spirit Formations (发光灵阵 — 超距剔除!)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(this.prog.formation.prog);
      this._setAtmoUniforms(this.prog.formation.u, cam, atmo, sunDir, time);
      gl.bindVertexArray(this.vaoQuad);
      const formations = this.world.landmarks.formations;
      const formCullD2 = this.propCullDist * this.propCullDist;
      for (let i = 0; i < formations.length; i++) {
        const f = formations[i];
        if (f.beamOnly) continue;
        const fdx = f.x - cam.pos[0], fdz = f.z - cam.pos[2];
        if (fdx * fdx + fdz * fdz > formCullD2) continue;
        gl.uniform3f(this.prog.formation.u.uCenter, f.x, f.y, f.z);
        gl.uniform1f(this.prog.formation.u.uRadius, f.radius);
        gl.uniform1f(this.prog.formation.u.uSpeed, f.speed);
        gl.uniform3fv(this.prog.formation.u.uColorA, f.colorA);
        gl.uniform3fv(this.prog.formation.u.uColorB, f.colorB);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Rising Spirit Aura Light Curtains over hero formations (超距剔除!)
      gl.useProgram(this.prog.aura.prog);
      gl.uniformMatrix4fv(this.prog.aura.u.uVP, false, this.vpMat);
      gl.uniform3fv(this.prog.aura.u.uCameraPos, cam.pos);
      gl.uniform1f(this.prog.aura.u.uTime, time);
      gl.bindVertexArray(this.vaoAura);
      for (let i = 0; i < formations.length; i++) {
        const f = formations[i];
        if (!f.hasBeam) continue;
        const fdx = f.x - cam.pos[0], fdz = f.z - cam.pos[2];
        if (fdx * fdx + fdz * fdz > formCullD2) continue;
        gl.uniform3f(this.prog.aura.u.uCenter, f.x, f.y, f.z);
        gl.uniform1f(this.prog.aura.u.uRadius, f.radius * 0.92);
        gl.uniform1f(this.prog.aura.u.uHeight, f.beamHeight);
        gl.uniform3fv(this.prog.aura.u.uColorA, f.colorA);
        gl.drawElements(gl.TRIANGLES, this.auraIndexCount, gl.UNSIGNED_SHORT, 0);
      }

      // Subtle Weak Qi-Refining Monster, Five-Element Skill & Magical Treasure VFX
      const hasMonsterVfx = monsterSystem && (monsterSystem.projectiles.length > 0 || monsterSystem.effects.length > 0);
      const hasSkillVfx = skillSystem && (
        skillSystem.projectiles.length > 0 ||
        skillSystem.effects.length > 0 ||
        (skillSystem.shieldNodes && skillSystem.shieldNodes.length > 0)
      );
      const hasTreasureVfx = treasureSystem && (
        treasureSystem.vfxDrawList.length > 0 ||
        treasureSystem.effects.length > 0
      );
      const hasOreVfx = oreSystem && oreSystem.effects.length > 0;
      const hasDropVfx = dropSystem && (dropSystem.drops.length > 0 || dropSystem.effects.length > 0);
      const hasNpcVfx = npcSystem && (
        npcSystem.projectiles.length > 0 ||
        npcSystem.effects.length > 0 ||
        npcSystem.vfxDrawList.length > 0
      );
      const hasFurnaceVfx = furnaceSystem && furnaceSystem.effects.length > 0;
      if (hasMonsterVfx || hasSkillVfx || hasTreasureVfx || hasOreVfx || hasDropVfx || hasNpcVfx || hasFurnaceVfx) {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.CULL_FACE);
        gl.useProgram(this.prog.vfx.prog);
        const vu = this.prog.vfx.u;
        gl.uniformMatrix4fv(vu.uVP, false, this.vpMat);
        gl.uniform3fv(vu.uCameraPos, cam.pos);

        let boundShape = null;
        const bindVfx = (shape, fallback) => {
          const key = this.vfxVAOs[shape] ? shape : fallback;
          const vObj = this.vfxVAOs[key];
          if (!vObj) return null;
          if (boundShape !== key) {
            gl.bindVertexArray(vObj.vao);
            boundShape = key;
          }
          return vObj;
        };

        if (hasMonsterVfx) {
          for (let i = 0; i < monsterSystem.projectiles.length; i++) {
            const p = monsterSystem.projectiles[i];
            const vObj = bindVfx(p.shape, 'orb');
            if (!vObj) continue;
            gl.uniformMatrix4fv(vu.uModel, false, p.modelMat);
            gl.uniform3fv(vu.uVfxColor, p.col);
            gl.uniform1f(vu.uVfxAlpha, p.alpha);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }

          for (let i = 0; i < monsterSystem.effects.length; i++) {
            const ef = monsterSystem.effects[i];
            const vObj = bindVfx(ef.shape, 'ring');
            if (!vObj) continue;
            const fade = Math.max(0.0, 1.0 - ef.age / Math.max(0.05, ef.life));
            gl.uniformMatrix4fv(vu.uModel, false, ef.modelMat);
            gl.uniform3fv(vu.uVfxColor, ef.col);
            gl.uniform1f(vu.uVfxAlpha, ef.alpha * fade);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }
        }

        if (hasSkillVfx) {
          for (let i = 0; i < skillSystem.projectiles.length; i++) {
            const p = skillSystem.projectiles[i];
            const vObj = bindVfx(p.shape, 'orb');
            if (!vObj) continue;
            gl.uniformMatrix4fv(vu.uModel, false, p.modelMat);
            gl.uniform3fv(vu.uVfxColor, p.col);
            gl.uniform1f(vu.uVfxAlpha, p.alpha);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }

          for (let i = 0; i < skillSystem.effects.length; i++) {
            const ef = skillSystem.effects[i];
            const vObj = bindVfx(ef.shape, 'orb');
            if (!vObj) continue;
            const u = ef.age / Math.max(0.05, ef.life);
            const fade = ef.growPop
              ? (u < 0.72 ? 1.0 : Math.max(0.0, 1.0 - (u - 0.72) / 0.28))
              : Math.max(0.0, 1.0 - u);
            gl.uniformMatrix4fv(vu.uModel, false, ef.modelMat);
            gl.uniform3fv(vu.uVfxColor, ef.col);
            gl.uniform1f(vu.uVfxAlpha, ef.alpha * fade);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }

          if (skillSystem.shieldNodes) {
            for (let i = 0; i < skillSystem.shieldNodes.length; i++) {
              const sn = skillSystem.shieldNodes[i];
              if (!sn.active) continue;
              const vObj = bindVfx(sn.shape, 'orb');
              if (!vObj) continue;
              gl.uniformMatrix4fv(vu.uModel, false, sn.modelMat);
              gl.uniform3fv(vu.uVfxColor, sn.col);
              gl.uniform1f(vu.uVfxAlpha, sn.alpha);
              gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
            }
          }
        }

        if (hasTreasureVfx) {
          for (let i = 0; i < treasureSystem.vfxDrawList.length; i++) {
            const tv = treasureSystem.vfxDrawList[i];
            const vObj = bindVfx(tv.shape, 'orb');
            if (!vObj) continue;
            gl.uniformMatrix4fv(vu.uModel, false, tv.modelMat);
            gl.uniform3fv(vu.uVfxColor, tv.col);
            gl.uniform1f(vu.uVfxAlpha, tv.alpha);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }

          for (let i = 0; i < treasureSystem.effects.length; i++) {
            const ef = treasureSystem.effects[i];
            const vObj = bindVfx(ef.shape, 'orb');
            if (!vObj) continue;
            const fade = Math.max(0.0, 1.0 - ef.age / Math.max(0.05, ef.life));
            gl.uniformMatrix4fv(vu.uModel, false, ef.modelMat);
            gl.uniform3fv(vu.uVfxColor, ef.col);
            gl.uniform1f(vu.uVfxAlpha, ef.alpha * fade);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }
        }

        if (hasOreVfx) {
          for (let i = 0; i < oreSystem.effects.length; i++) {
            const ef = oreSystem.effects[i];
            const vObj = bindVfx(ef.shape, 'rock');
            if (!vObj) continue;
            const u = ef.age / Math.max(0.05, ef.life);
            const fade = u < 0.65 ? 1.0 : Math.max(0.0, 1.0 - (u - 0.65) / 0.35);
            gl.uniformMatrix4fv(vu.uModel, false, ef.modelMat);
            gl.uniform3fv(vu.uVfxColor, ef.col);
            gl.uniform1f(vu.uVfxAlpha, ef.alpha * fade);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }
        }

        if (hasFurnaceVfx) {
          for (let i = 0; i < furnaceSystem.effects.length; i++) {
            const ef = furnaceSystem.effects[i];
            const vObj = bindVfx(ef.shape, 'orb');
            if (!vObj) continue;
            const u = ef.age / Math.max(0.05, ef.life);
            const fade = Math.max(0.0, 1.0 - u * u);
            gl.uniformMatrix4fv(vu.uModel, false, ef.modelMat);
            gl.uniform3fv(vu.uVfxColor, ef.col);
            gl.uniform1f(vu.uVfxAlpha, ef.alpha * fade);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }
        }

        if (hasDropVfx) {
          for (let i = 0; i < dropSystem.drops.length; i++) {
            const d = dropSystem.drops[i];
            if (!d.showRing) continue;
            const vObj = bindVfx('ring', 'ring');
            if (!vObj) continue;
            gl.uniformMatrix4fv(vu.uModel, false, d.ringMat);
            gl.uniform3fv(vu.uVfxColor, d.def.tint);
            gl.uniform1f(vu.uVfxAlpha, d.def.tier === 2 ? 0.44 : 0.30);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }
          for (let i = 0; i < dropSystem.effects.length; i++) {
            const ef = dropSystem.effects[i];
            const vObj = bindVfx(ef.shape, 'ring');
            if (!vObj) continue;
            const fade = Math.max(0.0, 1.0 - ef.age / Math.max(0.05, ef.life));
            gl.uniformMatrix4fv(vu.uModel, false, ef.modelMat);
            gl.uniform3fv(vu.uVfxColor, ef.col);
            gl.uniform1f(vu.uVfxAlpha, ef.alpha * fade);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }
        }

        if (hasNpcVfx) {
          for (let i = 0; i < npcSystem.projectiles.length; i++) {
            const p = npcSystem.projectiles[i];
            const vObj = bindVfx(p.shape, 'orb');
            if (!vObj) continue;
            gl.uniformMatrix4fv(vu.uModel, false, p.modelMat);
            gl.uniform3fv(vu.uVfxColor, p.col);
            gl.uniform1f(vu.uVfxAlpha, p.alpha);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }
          for (let i = 0; i < npcSystem.vfxDrawList.length; i++) {
            const nv = npcSystem.vfxDrawList[i];
            const vObj = bindVfx(nv.shape, 'orb');
            if (!vObj) continue;
            gl.uniformMatrix4fv(vu.uModel, false, nv.modelMat);
            gl.uniform3fv(vu.uVfxColor, nv.col);
            gl.uniform1f(vu.uVfxAlpha, nv.alpha);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }
          for (let i = 0; i < npcSystem.effects.length; i++) {
            const ef = npcSystem.effects[i];
            const vObj = bindVfx(ef.shape, 'orb');
            if (!vObj) continue;
            const u = ef.age / Math.max(0.05, ef.life);
            const fade = ef.growPop
              ? (u < 0.72 ? 1.0 : Math.max(0.0, 1.0 - (u - 0.72) / 0.28))
              : Math.max(0.0, 1.0 - u);
            gl.uniformMatrix4fv(vu.uModel, false, ef.modelMat);
            gl.uniform3fv(vu.uVfxColor, ef.col);
            gl.uniform1f(vu.uVfxAlpha, ef.alpha * fade);
            gl.drawElements(gl.TRIANGLES, vObj.count, vObj.type, 0);
          }
        }
      }

      // Living Particles (Spirit Motes, Peach Petals, Waterfall Mist, Snowflakes) scaled by Graphics Quality!
      const activeParticles = Math.max(1, Math.floor(this.particleCount * this.particleRatio));
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.prog.particle.prog);
      this._setAtmoUniforms(this.prog.particle.u, cam, atmo, sunDir, time);
      gl.uniform3fv(this.prog.particle.u.uCamRight, cam.right);
      gl.uniform3fv(this.prog.particle.u.uCamUp, cam.up);
      gl.bindVertexArray(this.vaoParticles);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, activeParticles);

      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);

      // =====================================================
      // PASS 3: SELECTIVE HDR BLOOM (Scaled by 画质: 低=0, 中=HalfRes, 高=Half+Quarter Dual-Cascade) & ACES FILMIC COMPOSITE
      // =====================================================
      gl.disable(gl.DEPTH_TEST);
      gl.bindVertexArray(this.vaoQuad);

      if (this.bloomPasses >= 1) {
        // 3A. Soft-Knee Bright-Pass Extraction -> bloomHalfA
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomHalfA.fbo);
        gl.viewport(0, 0, this.bloomHalfA.w, this.bloomHalfA.h);
        gl.useProgram(this.prog.bright.prog);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.hdrFbo.tex);
        gl.uniform1i(this.prog.bright.u.uSceneTex, 0);
        gl.uniform1f(this.prog.bright.u.uThreshold, this.bloomThreshold);
        gl.uniform1f(this.prog.bright.u.uKnee, 0.42);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 3B. Separable Gaussian Blur on Half-Res
        gl.useProgram(this.prog.blur.prog);
        gl.uniform1i(this.prog.blur.u.uTex, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomHalfB.fbo);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomHalfA.tex);
        gl.uniform2f(this.prog.blur.u.uDir, 1.35 / this.bloomHalfA.w, 0.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomHalfA.fbo);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomHalfB.tex);
        gl.uniform2f(this.prog.blur.u.uDir, 0.0, 1.35 / this.bloomHalfA.h);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (this.bloomPasses >= 2) {
          // 3C. Downsample + Wide Soft Blur on Quarter-Res for High Quality Silky Halo
          gl.viewport(0, 0, this.bloomQuarterA.w, this.bloomQuarterA.h);
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomQuarterB.fbo);
          gl.bindTexture(gl.TEXTURE_2D, this.bloomHalfA.tex);
          gl.uniform2f(this.prog.blur.u.uDir, 1.6 / this.bloomQuarterA.w, 0.0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);

          gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomQuarterA.fbo);
          gl.bindTexture(gl.TEXTURE_2D, this.bloomQuarterB.tex);
          gl.uniform2f(this.prog.blur.u.uDir, 0.0, 1.6 / this.bloomQuarterA.h);
          gl.drawArrays(gl.TRIANGLES, 0, 6);

          // Second wide quarter pass
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomQuarterB.fbo);
          gl.bindTexture(gl.TEXTURE_2D, this.bloomQuarterA.tex);
          gl.uniform2f(this.prog.blur.u.uDir, 2.2 / this.bloomQuarterA.w, 0.0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);

          gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomQuarterA.fbo);
          gl.bindTexture(gl.TEXTURE_2D, this.bloomQuarterB.tex);
          gl.uniform2f(this.prog.blur.u.uDir, 0.0, 2.2 / this.bloomQuarterA.h);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }

      // 3D. Final ACES Filmic Composite -> Screen Backbuffer!
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.width, this.height);
      gl.useProgram(this.prog.composite.prog);

      const quarterTex = (this.bloomPasses >= 2) ? this.bloomQuarterA.tex : this.bloomHalfA.tex;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.hdrFbo.tex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.bloomHalfA.tex);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, quarterTex);
      gl.uniform1i(this.prog.composite.u.uSceneTex, 0);
      gl.uniform1i(this.prog.composite.u.uBloomTex1, 1);
      gl.uniform1i(this.prog.composite.u.uBloomTex2, 2);
      gl.uniform1f(this.prog.composite.u.uExposure, this.exposure);
      gl.uniform1f(this.prog.composite.u.uBloomStrength, this.bloomStrength);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.enable(gl.DEPTH_TEST);
    }
  }

  XW.Renderer = XianxiaRenderer;
})(window);
