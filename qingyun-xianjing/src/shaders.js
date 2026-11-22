(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});

  const COMMON_NOISE = /* glsl */ `
    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
      for (int i = 0; i < 4; i++) {
        v += a * vnoise(p);
        p = rot * p * 2.04 + vec2(17.1, 31.7);
        a *= 0.5;
      }
      return v;
    }
  `;

  const COMMON_ATMO_SHADOW = /* glsl */ `
    uniform vec3 uCameraPos;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uSkyTop;
    uniform vec3 uSkyHorizon;
    uniform vec3 uFogColor;
    uniform vec3 uShadowTint;
    uniform float uFogDensity;
    uniform float uHeightFogDensity;
    uniform float uHeightFogBase;
    uniform mat4 uLightVP;
    uniform sampler2D uShadowMap;
    uniform vec4 uShadowParams;   // x=1/mapSize, y=mode(0:low 1-tap, 1:med 6-tap, 2:high 12-tap), z=enabled(0/1), w=spread
    uniform float uQualityLevel;  // 0.0=低, 1.0=中, 2.0=高
    uniform float uFogDistScale;  // scales fog & far-haze distance with 视野渲染距离
    uniform float uPropCullDist;  // instance culling distance for 视野渲染距离

    vec3 safeNormalize(vec3 v) {
      float len = length(v);
      return len > 1e-5 ? (v / len) : vec3(0.0, 1.0, 0.0);
    }

    const vec2 POISSON_12[12] = vec2[12](
      vec2(-0.326, -0.406), vec2(-0.840, -0.074), vec2(-0.696,  0.457),
      vec2(-0.203,  0.621), vec2( 0.962, -0.195), vec2( 0.473, -0.480),
      vec2( 0.519,  0.767), vec2( 0.185, -0.893), vec2( 0.507,  0.064),
      vec2( 0.896,  0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598)
    );

    float calcSoftShadow(vec3 worldPos, vec3 N) {
      if (uShadowParams.z < 0.5) return 1.0;
      vec3 dCam = worldPos - uCameraPos;
      // Fast distance early-out: skip light-space matrix multiply & texture taps outside shadow box!
      if (dot(dCam, dCam) > 96100.0) return 1.0;

      vec3 biasedPos = worldPos + N * 0.72;
      vec4 lp = uLightVP * vec4(biasedPos, 1.0);
      vec3 proj = lp.xyz / max(lp.w, 1e-5) * 0.5 + 0.5;
      if (proj.x <= 0.01 || proj.x >= 0.99 || proj.y <= 0.01 || proj.y >= 0.99 || proj.z >= 0.998) {
        return 1.0;
      }

      vec2 edgeD = min(proj.xy, 1.0 - proj.xy);
      float edgeFade = smoothstep(0.01, 0.10, min(edgeD.x, edgeD.y));

      float ndl = clamp(dot(N, uSunDir), 0.0, 1.0);
      float bias = max(0.0018, 0.0044 * (1.0 - ndl));

      // Low shadow quality (512x512): fast 1-tap hard shadow lookup
      if (uShadowParams.y < 0.5) {
        float d0 = texture(uShadowMap, proj.xy).r;
        float s0 = (proj.z - bias > d0) ? 0.0 : 1.0;
        return mix(1.0, s0, edgeFade);
      }

      vec2 texel = vec2(uShadowParams.x > 0.0 ? uShadowParams.x : (1.0 / 1024.0));
      float ang = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.283185;
      float ca = cos(ang), sa = sin(ang);
      mat2 rot = mat2(ca, -sa, sa, ca);

      float shadow = 0.0;
      float spread = uShadowParams.w > 0.1 ? uShadowParams.w : 2.15;
      if (uShadowParams.y < 1.5) {
        // Medium shadow quality (1024x1024): 4-tap rotated Poisson PCF (33% fewer taps, silky soft!)
        for (int i = 0; i < 4; i++) {
          vec2 off = (rot * POISSON_12[i * 3]) * texel * spread;
          float depth = texture(uShadowMap, proj.xy + off).r;
          shadow += (proj.z - bias > depth) ? 0.0 : 1.0;
        }
        shadow *= 0.25;
      } else {
        // High shadow quality (2048x2048): 8-tap rotated Poisson PCF
        for (int i = 0; i < 8; i++) {
          vec2 off = (rot * POISSON_12[i]) * texel * spread;
          float depth = texture(uShadowMap, proj.xy + off).r;
          shadow += (proj.z - bias > depth) ? 0.0 : 1.0;
        }
        shadow *= 0.125;
      }
      return mix(1.0, shadow, edgeFade);
    }

    vec3 applyAerialPerspective(vec3 col, vec3 worldPos) {
      if (uFogDistScale < 0.0) return col;
      vec3 toFrag = worldPos - uCameraPos;
      float dist = length(toFrag);
      vec3 viewDir = toFrag / max(dist, 0.0001);

      float fScale = uFogDistScale > 0.05 ? uFogDistScale : 1.0;
      float effFogD = uFogDensity * fScale;

      // Smooth aerial perspective (远景距离雾效): keeps near scenery crisp while distant peaks & forests dissolve into sky-lit pale-cyan haze
      float distStart = max(0.0, dist - 34.0);
      float distFog = 1.0 - exp(-distStart * effFogD * 1.18);

      // Restrained height fog hugging deep canyons & valleys without washing out peaks
      float hFactor = exp(-max(0.0, (worldPos.y - uHeightFogBase) * 0.042));
      float heightMist = (1.0 - exp(-distStart * effFogD * 1.15)) * hFactor * (uHeightFogDensity * 16.0);
      float fogAmount = clamp(max(distFog, heightMist * 0.55), 0.0, 0.92);

      // Directional Sun Mie in-scattering scaled by Graphics Quality (画质: 低/中/高)
      float sunAlign = clamp(dot(viewDir, uSunDir), 0.0, 1.0);
      float mieQual = (uQualityLevel < 0.5) ? 0.25 : ((uQualityLevel > 1.5) ? 1.42 : 1.0);
      float mieGlow = (pow(sunAlign, 6.0) * 0.34 + pow(sunAlign, 2.2) * 0.10) * mieQual;

      float elev = smoothstep(-0.08, 0.38, viewDir.y);
      vec3 cyanMist = mix(uSkyHorizon, uSkyTop, 0.36) * vec3(0.95, 1.02, 1.04);
      vec3 baseFog = mix(uFogColor, cyanMist, elev * 0.52 + 0.18);
      vec3 sunInscatter = uSunColor * vec3(1.02, 0.90, 0.74);
      vec3 finalFogCol = mix(baseFog, sunInscatter, clamp(mieGlow, 0.0, 0.48));

      // Gentle far-mountain atmospheric silhouette layering scaled with view distance
      float farStart = 2200.0 / fScale;
      float farEnd = 13800.0 / fScale;
      float farLift = smoothstep(farStart, farEnd, dist);
      fogAmount = clamp(mix(fogAmount, 0.88, farLift * 0.68), 0.0, 0.94);

      return mix(col, finalFogCol, fogAmount);
    }

    // Breath of the Wild x Stylized Xianxia crisp luminous surface shading (scaled by uQualityLevel!)
    vec3 shadeStylizedSurface(vec3 albedo, vec3 N, vec3 V, float shadow, float rough, float matType) {
      float ndl = dot(N, uSunDir);
      // Soft painterly cel-wrapped sun terminator with vivid sunlit vs cool-shadow contrast
      float celBand = smoothstep(-0.10, 0.24, ndl);
      float lambert = max(ndl, 0.0);
      float directLit = mix(lambert, celBand, 0.40) * shadow;

      // Rich sky-ground hemisphere ambient (cool cerulean/jade shadow fill, never muddy grey!)
      float hemi = N.y * 0.5 + 0.5;
      vec3 groundBounce = mix(uShadowTint * 0.62, vec3(0.24, 0.32, 0.28), 0.30);
      vec3 skyFill = mix(uShadowTint * 1.05, uSkyHorizon * 0.76, 0.36);
      vec3 ambient = mix(groundBounce, skyFill, hemi) * 0.46;

      vec3 direct = uSunColor * directLit * (uQualityLevel > 1.5 ? 1.44 : 1.38);
      vec3 color = albedo * (ambient + direct);

      // Low Graphics Quality (画质=低): skip specular & Fresnel rim calculations for maximum speed!
      if (uQualityLevel < 0.5) {
        return max(color, vec3(0.0));
      }

      float qualBoost = (uQualityLevel > 1.5) ? 1.32 : 1.0;

      // Crisp specular highlight (glazed tile roofs, crystals, metallic gold/sword)
      vec3 H = safeNormalize(uSunDir + V);
      float ndh = clamp(dot(N, H), 0.0, 1.0);
      float shininess = mix(96.0, 12.0, clamp(rough, 0.08, 1.0));
      float specStr = ((matType > 2.5) ? 0.58 : (matType > 1.5 ? 0.65 : mix(0.26, 0.04, rough))) * qualBoost;
      float spec = pow(ndh, shininess) * specStr * shadow * smoothstep(0.0, 0.22, ndl);
      vec3 specTint = (matType > 2.5) ? mix(uSunColor, albedo * 1.35, 0.5) : uSunColor;
      color += specTint * spec;

      // Signature Breath-of-the-Wild sunlit Fresnel rim glow (strictly clamped against NaN!)
      float ndv = clamp(dot(N, V), 0.0, 1.0);
      float fresnel = pow(max(1.0 - ndv, 0.0), 3.6);
      float sunRimMask = smoothstep(-0.18, 0.65, ndl) * (0.28 + 0.72 * shadow);
      color += mix(uSkyHorizon, uSunColor, 0.68) * fresnel * sunRimMask * (matType > 1.5 ? 0.34 : 0.16) * qualBoost;

      return max(color, vec3(0.0));
    }
  `;

  // =========================================================
  // 1. SKY DOME SHADER
  // =========================================================
  const SKY_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    uniform mat4 uProj;
    uniform mat4 uViewNoTrans;
    out vec3 vDir;
    void main() {
      vDir = aPos;
      vec4 clip = uProj * uViewNoTrans * vec4(aPos, 1.0);
      gl_Position = clip.xyww;
    }
  `;

  const SKY_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec3 vDir;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uSkyTop;
    uniform vec3 uSkyHorizon;
    uniform vec3 uFogColor;
    uniform float uTime;
    out vec4 fragColor;
    ${COMMON_NOISE}

    void main() {
      vec3 d = normalize(vDir);
      float y = max(d.y, 0.0);

      // Rich BotW sapphire-azure zenith fading smoothly to luminous celadon-sky horizon
      vec3 zenith = uSkyTop * vec3(0.84, 0.94, 1.08);
      vec3 midSky = mix(uSkyHorizon, uSkyTop, 0.48);
      vec3 sky = mix(uSkyHorizon, midSky, smoothstep(0.0, 0.24, y));
      sky = mix(sky, zenith, smoothstep(0.20, 0.82, y));

      if (d.y < 0.0) {
        sky = mix(uSkyHorizon, uFogColor * 0.90, smoothstep(0.0, -0.25, d.y));
      }

      // Warm sun atmospheric halo & clean solar disc
      float sunCos = clamp(dot(d, uSunDir), 0.0, 1.0);
      float sunHalo = pow(sunCos, 7.0) * 0.28 + pow(sunCos, 48.0) * 0.50;
      float sunDisc = smoothstep(0.9987, 0.9995, sunCos);
      sky += uSunColor * sunHalo * vec3(1.06, 0.92, 0.76);
      sky += uSunColor * sunDisc * 2.1;

      // High-altitude wispy painterly Xianxia clouds
      if (d.y > 0.025) {
        vec2 cuv = d.xz / (d.y + 0.16) * 1.18;
        vec2 drift = vec2(uTime * 0.0085, uTime * 0.004);
        float n1 = fbm(cuv * 1.35 + drift);
        float n2 = fbm(cuv * 2.8 - drift * 0.7 + vec2(n1 * 1.1));
        float cloud = smoothstep(0.49, 0.78, n1 * 0.62 + n2 * 0.46);
        cloud *= smoothstep(0.025, 0.20, d.y) * (1.0 - smoothstep(0.68, 0.96, d.y) * 0.45);
        vec3 cloudLit = mix(vec3(0.92, 0.96, 1.0), uSunColor * vec3(1.08, 1.02, 0.94), 0.45 + 0.45 * pow(sunCos, 3.0));
        vec3 cloudShade = mix(uSkyHorizon * 0.76, uFogColor * 0.84, 0.5);
        vec3 cloudCol = mix(cloudShade, cloudLit, smoothstep(0.35, 0.78, n2));
        sky = mix(sky, cloudCol, cloud * 0.62);
      }

      fragColor = vec4(max(sky, vec3(0.0)), 1.0);
    }
  `;

  // =========================================================
  // 2. MAIN WORLD SURFACE SHADER (Terrain, Mountains, Landmarks, Trunks)
  // =========================================================
  const WORLD_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec3 aNormal;
    layout(location = 2) in vec3 aColor;
    layout(location = 3) in vec3 aMeta;

    uniform mat4 uVP;
    out vec3 vWorldPos;
    out vec3 vNormal;
    out vec3 vColor;
    out vec3 vMeta;

    void main() {
      vWorldPos = aPos;
      vNormal = aNormal;
      vColor = aColor;
      vMeta = aMeta;
      gl_Position = uVP * vec4(aPos, 1.0);
    }
  `;

  const WORLD_FS = /* glsl */ `#version 300 es
    precision highp float;
    precision highp sampler2DArray;
    in vec3 vWorldPos;
    in vec3 vNormal;
    in vec3 vColor;
    in vec3 vMeta;

    uniform float uTime;
    uniform sampler2DArray uMatTexArray;
    out vec4 fragColor;

    ${COMMON_NOISE}
    ${COMMON_ATMO_SHADOW}

    // Derive crisp world-space bump normal from a height channel in uMatTexArray
    vec3 sampleLayerBumpXZ(vec2 uv, float layer, float eps, float amp) {
      float h0 = texture(uMatTexArray, vec3(uv, layer)).b;
      float hx = texture(uMatTexArray, vec3(uv + vec2(eps, 0.0), layer)).b;
      float hz = texture(uMatTexArray, vec3(uv + vec2(0.0, eps), layer)).b;
      return vec3((h0 - hx) * amp, 0.0, (h0 - hz) * amp);
    }

    void main() {
      vec3 N = safeNormalize(vNormal);
      vec3 V = safeNormalize(uCameraPos - vWorldPos);
      vec3 albedo = vColor;
      float rough = vMeta.x;
      float emissive = vMeta.y;
      float matType = vMeta.z;

      if (matType < 0.5) {
        // =========================================================
        // 1. MULTI-LAYERED GROUND & MOUNTAIN ROCK SHADER (告别纯色地面 & 山体岩石肌理)
        // =========================================================
        float slope = 1.0 - clamp(N.y, 0.0, 1.0);
        float camDist = length(uCameraPos - vWorldPos);
        float qualRange = (uQualityLevel < 0.5) ? 0.0 : ((uQualityLevel > 1.5) ? 1.65 : 1.0);
        float closeFade = (1.0 - smoothstep(32.0 * qualRange, 165.0 * qualRange, camDist)) * step(0.5, uQualityLevel);
        float midFade   = 1.0 - smoothstep(180.0, 1400.0 * max(0.6, qualRange), camDist);
        float farMtnFade = (1.0 - smoothstep(1400.0, 6800.0 * max(0.5, qualRange), camDist)) * step(0.5, uQualityLevel);

        // Sample Canvas Layer 3 (R=angular rock strata, G=rounded river cobblestones, B=height, A=roughness)
        vec4 rockCobNear = texture(uMatTexArray, vec3(vWorldPos.xz * 0.48, 3.0));
        vec4 rockTriX    = texture(uMatTexArray, vec3(vWorldPos.zy * 0.16, 3.0));
        vec4 rockTriZ    = texture(uMatTexArray, vec3(vWorldPos.xy * 0.16, 3.0));
        vec3 triW = pow(abs(N), vec3(4.0));
        triW /= max(triW.x + triW.y + triW.z, 1e-4);
        float triRockSignal = rockTriX.r * triW.x + rockCobNear.r * triW.y + rockTriZ.r * triW.z;

        // A) Flatland Meadow Turf, Clover Patches & Exposed Loamy Soil Micro-Detail (平地草甸 — 远景跳过微噪声采样)
        float macro   = fbm(vWorldPos.xz * 0.018);
        float midTurf = midFade > 0.02 ? fbm(vWorldPos.xz * 0.14) : macro;
        float fine1   = closeFade > 0.02 ? vnoise(vWorldPos.xz * 0.92) : 0.5;
        float fine2   = closeFade > 0.02 ? vnoise(vWorldPos.xz * 2.85) : 0.5;
        float streak  = closeFade > 0.02 ? vnoise(vec2(vWorldPos.x * 1.85 + fine1 * 0.6, vWorldPos.z * 0.72)) : 0.5;
        float microMix = ((fine1 * 0.44 + fine2 * 0.32 + streak * 0.24) - 0.5) * closeFade;

        float grassDetail = mix(0.72, 1.24, macro * 0.40 + midTurf * 0.60) + microMix * 0.32;
        vec3 deepClover = albedo * vec3(0.66, 0.85, 0.70);
        vec3 loamySoil  = vec3(0.45, 0.38, 0.26) * (0.85 + 0.30 * fine2);
        float cloverPatch = smoothstep(0.52, 0.80, midTurf) * (0.35 + 0.65 * closeFade);
        float soilPatch   = smoothstep(0.66, 0.86, fine1 * 0.55 + (1.0 - midTurf) * 0.45) * (1.0 - smoothstep(0.08, 0.22, slope)) * (0.30 + 0.70 * closeFade);
        vec3 meadowCol = mix(albedo * grassDetail, deepClover, cloverPatch * 0.38);
        meadowCol = mix(meadowCol, loamySoil, soilPatch * 0.46);

        // B) Slope Scree, Gravel Talus & Dark Moss Transition Zone (坡地碎石苔藓)
        float screeNoise = rockCobNear.g * 0.6 + fine1 * 0.4;
        float screeZone = smoothstep(0.06, 0.14, slope + (midTurf - 0.5) * 0.05) * (1.0 - smoothstep(0.18, 0.29, slope));
        vec3 screePebbleCol = mix(vec3(0.42, 0.39, 0.33), vec3(0.52, 0.49, 0.43), screeNoise);
        vec3 slopeMossCol   = vec3(0.18, 0.38, 0.20) * (0.82 + 0.36 * fine1);
        vec3 talusCol = mix(screePebbleCol, slopeMossCol, smoothstep(0.38, 0.68, midTurf));
        meadowCol = mix(meadowCol, talusCol, screeZone * 0.72);
        rough = mix(rough, 0.82, screeZone * 0.6);

        // C) Stratified Mountain Cliff Rock with Sharp Slope Blending & Angular Fracture Normal Relief (陡坡露岩、缓坡覆草)
        float mtnScale = mix(0.045, 0.012, 1.0 - midFade);
        float strataWave = sin(vWorldPos.y * 0.58 + fbm(vWorldPos.xz * mtnScale) * 5.6);
        float strata = strataWave * 0.5 + 0.5;
        float ridgeFold = 1.0 - abs(vnoise(vWorldPos.xz * 0.085 + vec2(vWorldPos.y * 0.12)) * 2.0 - 1.0);
        float crevice = smoothstep(0.18, 0.62, ridgeFold * 0.60 + triRockSignal * 0.40);

        // Sharp noise-modulated slope transition eliminates blurry color bands on mountain peaks!
        float pathEncoding = clamp(matType / 0.38, 0.0, 1.0);
        float slopeThresholdNoise = (strata - 0.5) * 0.07 + (ridgeFold - 0.5) * 0.08 + (midTurf - 0.5) * 0.05;
        float rockMask = smoothstep(0.14, 0.23, slope + slopeThresholdNoise - pathEncoding * 0.22);

        vec3 darkSlate = albedo * vec3(0.66, 0.70, 0.76);
        vec3 warmLedge = albedo * vec3(1.16, 1.12, 1.04);
        vec3 rockCol = mix(darkSlate, warmLedge, strata * 0.52 + crevice * 0.48);
        // Darken deep rock fracture lines
        float fissureAO = smoothstep(0.08, 0.32, ridgeFold) * (0.76 + 0.24 * triRockSignal);
        rockCol *= (0.64 + 0.36 * fissureAO);

        albedo = mix(meadowCol, rockCol, rockMask);
        rough = mix(rough, mix(0.84, 0.58, crevice), rockMask);

        // D) Crisp High-Altitude Snow Peaks & Ridges (雪峰山脊分明; 云雾山 uses custom alpine cliff/frost shader!)
        if (vWorldPos.y > 102.0 && !(vWorldPos.x > 140.0 && vWorldPos.z > 2860.0)) {
          float snowNoise = (macro - 0.5) * 24.0 + (ridgeFold - 0.5) * 14.0;
          float snowAlt = smoothstep(114.0, 158.0, vWorldPos.y + snowNoise);
          // Snow clings to ridge crests & upper slopes; sheer vertical rock faces expose dark slate ribs!
          float snowSlopeKeep = smoothstep(0.22, 0.52, N.y + (ridgeFold - 0.5) * 0.16 - (1.0 - strata) * 0.10);
          float snowMask = snowAlt * snowSlopeKeep;
          vec3 snowAlbedo = mix(vec3(0.86, 0.91, 0.97), vec3(0.97, 0.98, 1.00), crevice);
          albedo = mix(albedo, snowAlbedo, snowMask);
          rough = mix(rough, 0.36, snowMask);
        }

        // E) Architectural Bluestone Flagstones (青石板) & Compacted Loess Country Trails (黄土小径)
        if (matType > 0.015) {
          float pWeight = smoothstep(0.015, 0.15, matType) * (1.0 - smoothstep(0.32, 0.50, slope));
          float flagstoneW = smoothstep(0.18, 0.30, matType);

          // Sample Canvas Layer 2 (石砖 / 青石板)
          vec4 flagTex = texture(uMatTexArray, vec3(vWorldPos.xz * 0.44, 2.0));
          vec3 flagstoneCol = vColor * mix(0.68, 1.18, flagTex.r);
          // Subtle green moss tucked into flagstone mortar joints
          float jointMoss = smoothstep(0.55, 0.86, flagTex.g) * (0.4 + 0.6 * midTurf);
          flagstoneCol = mix(flagstoneCol, vec3(0.22, 0.44, 0.24), jointMoss * 0.45);
          // Concentric jade inlay ring on Spawn Overlook & Palace Courtyard
          float dOvl = length(vWorldPos.xz - vec2(0.0, 420.0));
          float ringOvl = smoothstep(0.28, 0.06, abs(dOvl - 8.2)) * step(dOvl, 12.0);
          flagstoneCol = mix(flagstoneCol, vec3(0.56, 0.66, 0.62), ringOvl * 0.55);

          // Compacted Loess / Ochre Dirt Trail (黄土小径) with scattered gravel pebbles on shoulders
          float trailGrit = rockCobNear.g * 0.55 + fine2 * 0.45;
          vec3 loessCol = mix(vec3(0.48, 0.39, 0.27), vec3(0.62, 0.52, 0.38), midTurf * 0.55 + trailGrit * 0.45);
          loessCol = mix(loessCol, vec3(0.54, 0.52, 0.46), smoothstep(0.62, 0.85, rockCobNear.g) * 0.45);

          vec3 roadSurface = mix(loessCol, flagstoneCol, flagstoneW);
          albedo = mix(albedo, roadSurface, pWeight);
          rough = mix(rough, mix(0.72, flagTex.a * 0.78, flagstoneW), pWeight);

          if (closeFade > 0.02) {
            vec3 roadBump = mix(
              sampleLayerBumpXZ(vWorldPos.xz * 0.48, 3.0, 0.012, 0.38),
              sampleLayerBumpXZ(vWorldPos.xz * 0.44, 2.0, 0.010, 0.55),
              flagstoneW
            );
            N = safeNormalize(N + roadBump * pWeight * closeFade);
          }
        }

        // F) Shoreline Wet Sand, Damp Silt, River Cobblestones & 沉烟迷泽 Wet Peat Mudflats!
        float springD = length(vWorldPos.xz - vec2(-540.0, 80.0));
        float lakeD   = length(vWorldPos.xz - vec2(520.0, -560.0));
        float swD1    = length((vWorldPos.xz - vec2(820.0, 2260.0)) / vec2(1150.0, 960.0));
        float swD2    = length((vWorldPos.xz - vec2(2180.0, 2600.0)) / vec2(1580.0, 1180.0));
        float swD3    = length((vWorldPos.xz - vec2(1240.0, 3060.0)) / vec2(1280.0, 920.0));
        float swampD  = min(swD1, min(swD2, swD3));
        float inSwamp = (1.0 - smoothstep(0.62, 1.15, swampD)) * (1.0 - smoothstep(10.5, 16.5, vWorldPos.y));

        float localWaterY = (springD < 84.0) ? 12.2 : ((lakeD < 245.0) ? 9.5 : ((inSwamp > 0.05) ? 6.4 : 7.2));
        float shoreBand = (1.0 - smoothstep(localWaterY - 1.2, localWaterY + 2.8, vWorldPos.y))
                        * (1.0 - smoothstep(0.24, 0.42, slope))
                        * (1.0 - smoothstep(0.52, 0.68, vMeta.x));
        if (shoreBand > 0.02 || inSwamp > 0.02) {
          float cobbleDome = rockCobNear.g;
          float wetLine = 1.0 - smoothstep(localWaterY - 0.4, localWaterY + 1.05, vWorldPos.y);
          vec3 dampSand = vec3(0.44, 0.41, 0.34) * (0.85 + 0.30 * fine1);
          vec3 cobbleCol = mix(vec3(0.34, 0.37, 0.39), vec3(0.55, 0.53, 0.48), fine1 * 0.6 + midTurf * 0.4) * (0.72 + 0.45 * cobbleDome);
          float cobbleMask = smoothstep(0.24, 0.48, cobbleDome);
          vec3 shoreCol = mix(dampSand, cobbleCol, cobbleMask * 0.82) * (1.0 - wetLine * 0.32);

          if (inSwamp > 0.02) {
            // 沉烟迷泽: richly layered wet peat mud, glistening puddles, velvet marsh moss, silty ripples, pebbles & fallen damp leaf litter!
            float mudFlow = fbm(vWorldPos.xz * 0.22 + vec2(macro * 1.8, -midTurf * 1.5));
            float puddleField = vnoise(vWorldPos.xz * 0.34 + vec2(3.1, -1.7)) * 0.6 + mudFlow * 0.4;
            float puddleMask = smoothstep(0.60, 0.78, puddleField) * (1.0 - smoothstep(0.06, 0.18, slope));
            float mossMat = smoothstep(0.44, 0.72, midTurf * 0.65 + fine1 * 0.35) * (1.0 - puddleMask * 0.85);
            float leafNoise = vnoise(vWorldPos.xz * 2.45 + vec2(fine2 * 1.4));
            float leafLitter = smoothstep(0.68, 0.88, leafNoise * 0.65 + (1.0 - puddleField) * 0.35) * closeFade * (1.0 - wetLine * 0.7);
            float siltRing = 0.5 + 0.5 * sin(vWorldPos.y * 5.8 + mudFlow * 6.5);

            vec3 peatMud   = mix(vec3(0.16, 0.12, 0.09), vec3(0.28, 0.22, 0.15), fine1 * 0.50 + mudFlow * 0.50);
            vec3 richMoss  = mix(vec3(0.12, 0.26, 0.13), vec3(0.24, 0.38, 0.18), fine2 * 0.6 + streak * 0.4);
            vec3 siltShore = mix(vec3(0.26, 0.25, 0.19), vec3(0.36, 0.33, 0.25), siltRing * 0.55 + cobbleDome * 0.45);
            vec3 leafCol   = mix(vec3(0.34, 0.22, 0.11), vec3(0.44, 0.31, 0.15), fine1);
            vec3 puddleCol = mix(vec3(0.09, 0.13, 0.12), uFogColor * 0.34, 0.35);

            vec3 swampGround = mix(peatMud, richMoss, mossMat * 0.78);
            swampGround = mix(swampGround, siltShore, cobbleMask * 0.56 + wetLine * 0.40);
            swampGround = mix(swampGround, leafCol, leafLitter * 0.52);
            swampGround = mix(swampGround, puddleCol, puddleMask * 0.68);
            swampGround *= (1.0 - wetLine * 0.24);

            float swBlend = max(inSwamp * (1.0 - smoothstep(6.8, 12.8, vWorldPos.y)), shoreBand * inSwamp);
            albedo = mix(albedo, swampGround, clamp(swBlend * 0.94, 0.0, 0.95));
            float mudRough = mix(mix(0.48, 0.16, wetLine), 0.07, puddleMask);
            rough = mix(rough, mudRough, clamp(swBlend, 0.0, 1.0));
            if (closeFade > 0.02) {
              vec3 mudBump = sampleLayerBumpXZ(vWorldPos.xz * 0.56, 3.0, 0.012, 0.76);
              float mRipple = (mudFlow - 0.5) * 0.28;
              mudBump += vec3(mRipple, 0.0, -mRipple * 0.8);
              N = safeNormalize(N + mudBump * (1.0 - puddleMask * 0.88) * swBlend * closeFade);
            }
          } else {
            albedo = mix(albedo, shoreCol, shoreBand * 0.88);
            rough = mix(rough, mix(0.52, 0.18, wetLine), shoreBand);
            if (closeFade > 0.02) {
              vec3 cobBump = sampleLayerBumpXZ(vWorldPos.xz * 0.48, 3.0, 0.012, 0.72);
              N = safeNormalize(N + cobBump * shoreBand * closeFade);
            }
          }
        }

        // F2) 残阵古道 (Ancient Ruined Array Path): Weathered Yellow-Brown Soil, Arid Cracks & Faint Residual Array Runes!
        if (vWorldPos.x < -2040.0 && vWorldPos.x > -4460.0 && vWorldPos.z > -240.0 && vWorldPos.z < 1880.0) {
          float czMacro = fbm(vWorldPos.xz * 0.0085 + vec2(4.2, -3.1));
          float czD1 = length((vWorldPos.xz - vec2(-2960.0, 1085.0)) * vec2(0.84, 1.05));
          float czD2 = length((vWorldPos.xz - vec2(-3580.0,  525.0)) * vec2(0.86, 0.96));
          float czZone = 1.0 - smoothstep(280.0, 680.0, min(czD1, czD2));
          if (czZone > 0.02) {
            // Arid weathered yellow-brown loess, dry gravel grit & subtle ground fissure cracks
            float crackV1 = 1.0 - abs(vnoise(vWorldPos.xz * 0.42 + vec2(czMacro * 1.4)) * 2.0 - 1.0);
            float crackV2 = 1.0 - abs(vnoise(vWorldPos.xz * 1.15 - vec2(fine1 * 0.9)) * 2.0 - 1.0);
            float dryCrack = smoothstep(0.84, 0.97, crackV1 * 0.62 + crackV2 * 0.38) * (0.35 + 0.65 * closeFade);
            vec3 aridSoil = mix(vec3(0.46, 0.37, 0.24), vec3(0.58, 0.48, 0.32), fine1 * 0.5 + czMacro * 0.5);
            vec3 dryScree = vec3(0.50, 0.47, 0.40) * (0.82 + 0.36 * rockCobNear.g);
            vec3 witheredTurf = vec3(0.47, 0.44, 0.23) * (0.85 + 0.30 * fine2);
            vec3 czCol = mix(aridSoil, witheredTurf, smoothstep(0.46, 0.78, midTurf) * 0.62);
            czCol = mix(czCol, dryScree, smoothstep(0.48, 0.80, rockCobNear.g) * 0.50);
            czCol *= (1.0 - dryCrack * 0.36);

            float czSurfaceW = czZone * (1.0 - rockMask * 0.65);
            albedo = mix(albedo, czCol, czSurfaceW * 0.72);
            rough = mix(rough, 0.88, czSurfaceW * 0.75);
            if (closeFade > 0.02) {
              vec3 crackBump = sampleLayerBumpXZ(vWorldPos.xz * 0.62, 3.0, 0.011, 0.55);
              N = safeNormalize(N + crackBump * czSurfaceW * closeFade);
            }

            // Faint / Dim Residual Ancient Array Runes & Radial Cracks around all 4 Ruined Array Nodes + Ruined Hall!
            vec2 a0 = vWorldPos.xz - vec2(-2845.0, 1195.0);
            vec2 a1 = vWorldPos.xz - vec2(-3115.0, 1005.0);
            vec2 a2 = vWorldPos.xz - vec2(-3375.0,  775.0);
            vec2 a3 = vWorldPos.xz - vec2(-3800.0,  310.0);
            vec2 a4 = vWorldPos.xz - vec2(-3612.0,  426.0);
            float d0 = length(a0) / 19.5;
            float d1 = length(a1) / 18.5;
            float d2 = length(a2) / 28.0;
            float d3 = length(a3) / 34.0;
            float d4 = length(a4) / 24.0;

            float bestD = d0;
            vec2 bestP = a0;
            if (d1 < bestD) { bestD = d1; bestP = a1; }
            if (d2 < bestD) { bestD = d2; bestP = a2; }
            if (d3 < bestD) { bestD = d3; bestP = a3; }
            if (d4 < bestD) { bestD = d4; bestP = a4; }

            if (bestD < 1.12) {
              float ang = atan(bestP.y, bestP.x);
              // Concentric broken array rings + weathered octagonal seal spokes
              float ringOuter = smoothstep(0.032, 0.008, abs(bestD - 0.88));
              float ringMid   = smoothstep(0.028, 0.007, abs(bestD - 0.56));
              float ringInner = smoothstep(0.026, 0.007, abs(bestD - 0.28));
              float octShape  = abs(cos(ang * 4.0));
              float octRing   = smoothstep(0.030, 0.008, abs(bestD * (0.90 + 0.10 * octShape) - 0.72));
              float spokes    = smoothstep(0.045, 0.010, abs(sin(ang * 4.0))) * smoothstep(0.28, 0.34, bestD) * (1.0 - smoothstep(0.84, 0.90, bestD));
              float glyphTick = smoothstep(0.58, 0.86, sin(ang * 24.0)) * smoothstep(0.055, 0.012, abs(bestD - 0.64));

              // Heavy age erosion mask: large sections worn away, fractured, or buried under dust!
              float erode = smoothstep(0.36, 0.68, fbm(vWorldPos.xz * 0.16 + vec2(2.1, -4.3)));
              float arrayLine = clamp(ringOuter + ringMid + ringInner + octRing * 0.85 + spokes * 0.72 + glyphTick * 0.75, 0.0, 1.0);
              float carvedGroove = arrayLine * (0.28 + 0.72 * erode);
              float faintGlowMask = arrayLine * smoothstep(0.48, 0.76, erode) * (1.0 - dryCrack * 0.65);

              // Radial weathered fracture cracks radiating out from damaged array core
              float radCrack = smoothstep(0.06, 0.012, abs(sin(ang * 5.0 + bestD * 2.6 + czMacro * 3.0))) * (1.0 - smoothstep(0.15, 1.05, bestD));

              // Darken carved stone grooves & cracks; overlay faint, dim tarnished jade-gold residual qi!
              albedo = mix(albedo, vec3(0.24, 0.23, 0.20), clamp(carvedGroove * 0.62 + radCrack * 0.45, 0.0, 0.75));
              float dormantPulse = 0.72 + 0.28 * sin(uTime * 1.25 + bestD * 4.0);
              vec3 dimRuneCol = mix(vec3(0.32, 0.66, 0.60), vec3(0.72, 0.60, 0.34), smoothstep(0.45, 0.85, bestD));
              albedo = mix(albedo, dimRuneCol, faintGlowMask * 0.58);
              emissive = max(emissive, faintGlowMask * 0.42 * dormantPulse);
            }
          }
        }

        // F3) 通天灵木林 (Primeval Spirit Forest): Rich Dark Humus, Deep Forest Moss, Fallen Leaf Litter & Swaying Dappled Canopy Light!
        if (vWorldPos.x < -420.0 && vWorldPos.x > -8950.0 && vWorldPos.z < 920.0 && vWorldPos.z > -5650.0) {
          float sfD1 = length((vWorldPos.xz - vec2(-4080.0,  -460.0)) / vec2(1220.0, 1160.0));
          float sfD2 = length((vWorldPos.xz - vec2(-3620.0, -1880.0)) / vec2(1700.0, 1520.0));
          float sfD3 = length((vWorldPos.xz - vec2(-3500.0, -3520.0)) / vec2(1820.0, 1480.0));
          float sfD4 = length((vWorldPos.xz - vec2(-2160.0, -2120.0)) / vec2(1340.0, 1640.0));
          float sfD5 = length((vWorldPos.xz - vec2(-6020.0, -1950.0)) / vec2(1920.0, 2480.0));
          float sfZone = (1.0 - smoothstep(0.55, 1.15, min(min(sfD1, sfD2), min(min(sfD3, sfD4), sfD5)))) * (1.0 - rockMask * 0.65);
          if (sfZone > 0.02) {
            float humusTex = fbm(vWorldPos.xz * 0.24 + vec2(3.1, -2.7));
            float leafFleck = vnoise(vWorldPos.xz * 2.2 + vec2(fine1 * 1.5));
            float leafMask = smoothstep(0.56, 0.84, leafFleck * 0.62 + (1.0 - midTurf) * 0.38) * (0.35 + 0.65 * closeFade);
            float mossCarpet = smoothstep(0.42, 0.74, midTurf * 0.65 + humusTex * 0.35);

            vec3 darkHumus = mix(vec3(0.14, 0.11, 0.07), vec3(0.24, 0.18, 0.12), fine1 * 0.5 + humusTex * 0.5);
            vec3 forestMoss = mix(vec3(0.10, 0.27, 0.14), vec3(0.20, 0.39, 0.20), fine2 * 0.6 + streak * 0.4);
            vec3 fallenLeaves = mix(vec3(0.36, 0.23, 0.11), vec3(0.48, 0.34, 0.15), fine1);

            vec3 sfCol = mix(darkHumus, forestMoss, mossCarpet * 0.78);
            sfCol = mix(sfCol, fallenLeaves, leafMask * 0.56);

            // Soft swaying dappled canopy shade & filtered sunlight pools (树影婆娑与林冠透光感!)
            float dapple = fbm(vWorldPos.xz * 0.075 + vec2(sin(uTime * 0.35) * 0.22, cos(uTime * 0.28) * 0.18));
            float canopyShade = mix(0.76, 1.14, smoothstep(0.34, 0.72, dapple));
            sfCol *= canopyShade;

            albedo = mix(albedo, sfCol, sfZone * 0.86);
            rough = mix(rough, 0.84, sfZone * 0.80);
            if (closeFade > 0.02) {
              vec3 sfBump = sampleLayerBumpXZ(vWorldPos.xz * 0.58, 3.0, 0.012, 0.60);
              N = safeNormalize(N + sfBump * sfZone * closeFade);
            }
          }
        }

        // F4) 云雾山 (ONE Single Colossal 7-Tier Sacred Mountain soaring to 760m): Pure Natural Alpine Terraces, Steep Stratified Slate Cliffs & Summit Crystal Bounce Glow!
        if (vWorldPos.x > 300.0 && vWorldPos.z > 2920.0) {
          float cmD = length((vWorldPos.xz - vec2(2660.0, 4120.0)) * vec2(0.56, 1.18)) / 1220.0;
          float cmZone = 1.0 - smoothstep(0.52, 1.16, cmD);
          if (cmZone > 0.02) {
            float altNorm = smoothstep(100.0, 745.0, vWorldPos.y);
            float slabTex = rockCobNear.r * 0.50 + triRockSignal * 0.50;
            float screePeb = smoothstep(0.45, 0.80, rockCobNear.g * 0.65 + fine1 * 0.35);
            vec3 alpineTurf = mix(vec3(0.20, 0.44, 0.25), vec3(0.27, 0.43, 0.38), altNorm) * (0.85 + 0.30 * midTurf);
            vec3 coolSlate  = mix(vec3(0.21, 0.27, 0.35), vec3(0.48, 0.54, 0.61), slabTex * 0.55 + strata * 0.45);
            vec3 screeCol   = vec3(0.43, 0.46, 0.50) * (0.82 + 0.36 * fine2);

            // Bold stratified cliff rock on all 7 steep risers; crisp natural alpine grass/scree on horizontal terraces!
            float rockExposure = smoothstep(0.11, 0.23, slope + (slabTex - 0.5) * 0.07);
            vec3 cmCol = mix(alpineTurf, screeCol, screePeb * (0.30 + 0.28 * altNorm));
            cmCol = mix(cmCol, coolSlate, rockExposure * 0.94);

            // Soft natural spirit-light bounce glow & subtle crystal ground veins directly beneath the 42m Glowing Giant Spirit Stone (2660, 4120, y=760m)
            float dSum = length(vWorldPos.xz - vec2(2660.0, 4120.0));
            if (dSum < 56.0 && vWorldPos.y > 745.0) {
              float bounceGlow = (1.0 - smoothstep(8.0, 52.0, dSum));
              float crackGlow = (1.0 - smoothstep(0.02, 0.14, abs(sin(atan(vWorldPos.z - 4120.0, vWorldPos.x - 2660.0) * 6.0 + dSum * 0.18)))) * (1.0 - smoothstep(10.0, 46.0, dSum));
              vec3 spiritBounce = vec3(0.24, 0.90, 0.96);
              cmCol = mix(cmCol, spiritBounce, bounceGlow * 0.26 + crackGlow * 0.55);
              emissive = max(emissive, bounceGlow * 0.18 + crackGlow * 0.65);
            }

            albedo = mix(albedo, cmCol, cmZone * 0.88);
            rough = mix(rough, mix(0.74, 0.52, rockExposure), cmZone * 0.78);
            if (closeFade > 0.02) {
              vec3 cmBump = sampleLayerBumpXZ(vWorldPos.xz * 0.52, 3.0, 0.011, 0.64);
              N = safeNormalize(N + cmBump * cmZone * closeFade);
            }
          }
        }

        // F5) 流沙荒漠 (Shifting Sands Desert): Disordered Natural Grainy Golden Sand, Irregular Wind Drifts & Wind-Eroded Sandstone!
        if (vWorldPos.x < -3480.0 && vWorldPos.z > 1260.0) {
          float dsD1 = length((vWorldPos.xz - vec2(-5580.0, 2520.0)) / vec2(1480.0, 1180.0));
          float dsD2 = length((vWorldPos.xz - vec2(-5760.0, 4320.0)) / vec2(1580.0, 1520.0));
          float dsD3 = length((vWorldPos.xz - vec2(-6520.0, 5220.0)) / vec2(1260.0, 1680.0));
          float dsD4 = length((vWorldPos.xz - vec2(-5420.0, 6240.0)) / vec2(1740.0, 1280.0));
          float dsD5 = length((vWorldPos.xz - vec2(-7760.0, 4580.0)) / vec2(1480.0, 2440.0));
          float dsRaw = 1.0 - smoothstep(0.56, 1.18, min(min(min(dsD1, dsD2), min(dsD3, dsD4)), dsD5));
          // Keep 低云平原 green meadow edge intact!
          float lcGuard = max(
            1.0 - smoothstep(0.75, 1.16, length((vWorldPos.xz - vec2(-2920.0, 3940.0)) / vec2(1560.0, 1260.0))),
            1.0 - smoothstep(0.75, 1.16, length((vWorldPos.xz - vec2(-1980.0, 6240.0)) / vec2(2160.0, 1400.0)))
          );
          float dsZone = dsRaw * (1.0 - lcGuard * 0.85) * smoothstep(1260.0, 1580.0, vWorldPos.z);
          if (dsZone > 0.02) {
            // Disordered multi-scale organic sand drifts & irregular grit (ZERO regular parallel stripes!)
            vec2 sw1 = vec2(fbm(vWorldPos.xz * 0.024 + vec2(3.1, -2.4)), fbm(vWorldPos.xz * 0.024 - vec2(4.7, 1.9)));
            float driftPatch = fbm(vWorldPos.xz * 0.036 + sw1 * 2.2);
            float midGrain   = fbm(vWorldPos.xz * 0.22 - sw1 * 1.6);
            float gritPatch  = smoothstep(0.54, 0.84, fbm(vWorldPos.xz * 0.085 + vec2(-2.3, 5.1)));
            float fineSandA  = vnoise(vWorldPos.xz * 2.6 + sw1 * 3.0);
            float fineSandB  = vnoise(vWorldPos.xz * 9.8);
            float sparkle    = pow(clamp(vnoise(vWorldPos.xz * 16.5), 0.0, 1.0), 6.0) * closeFade;

            vec3 paleSand   = vec3(0.84, 0.69, 0.44);
            vec3 goldSand   = vec3(0.73, 0.54, 0.31);
            vec3 dustOchre  = vec3(0.54, 0.39, 0.23);
            vec3 pebbleGrit = vec3(0.49, 0.37, 0.25) * (0.82 + 0.36 * rockCobNear.g);
            vec3 sandstone  = mix(vec3(0.45, 0.29, 0.18), vec3(0.62, 0.43, 0.26), strata * 0.55 + rockCobNear.r * 0.45);

            vec3 dsCol = mix(dustOchre, goldSand, smoothstep(0.24, 0.72, driftPatch));
            dsCol = mix(dsCol, paleSand, smoothstep(0.46, 0.82, midGrain * 0.65 + driftPatch * 0.35) * 0.72);
            dsCol = mix(dsCol, pebbleGrit, gritPatch * 0.42);
            dsCol *= (0.91 + 0.14 * fineSandA + 0.06 * (fineSandB - 0.5));
            dsCol += vec3(0.16, 0.13, 0.08) * sparkle;

            float dsRock = smoothstep(0.15, 0.28, slope + (rockCobNear.r - 0.5) * 0.08);
            dsCol = mix(dsCol, sandstone, dsRock * 0.84);

            albedo = mix(albedo, dsCol, dsZone * 0.94);
            rough = mix(rough, mix(0.80, 0.88, dsRock), dsZone * 0.88);
            if (closeFade > 0.02) {
              // Disordered dual-angle organic micro-sand bump (zero grid / stripe artifacts!)
              vec2 rotUV = vec2(vWorldPos.x * 0.83 - vWorldPos.z * 0.56, vWorldPos.x * 0.56 + vWorldPos.z * 0.83);
              vec3 b1 = sampleLayerBumpXZ(vWorldPos.xz * 0.42 + sw1 * 0.4, 3.0, 0.014, 0.34);
              vec3 b2 = sampleLayerBumpXZ(rotUV * 0.96 - sw1 * 0.3, 3.0, 0.012, 0.24);
              N = safeNormalize(N + (b1 + b2) * dsZone * closeFade);
            }
          }
        }

        // F6) 霜雪原 & 霜雪山 (Expanded W/N/NE Frost Snowfield + Compact 6-Tier Snow Mountain): Snowdrifts, Frosted Tundra, Glacial Cliffs & Frozen Tarn Ice!
        if (vWorldPos.x > -9450.0 && vWorldPos.x < 4650.0 && vWorldPos.z < -3850.0) {
          float snD1 = length((vWorldPos.xz - vec2(-3720.0, -6020.0)) / vec2(1780.0, 1340.0));
          float snD2 = length((vWorldPos.xz - vec2(-1480.0, -6880.0)) / vec2(2220.0, 1920.0));
          float snD3 = length((vWorldPos.xz - vec2(-2450.0, -7980.0)) / vec2(2320.0, 1440.0));
          float snD4 = length((vWorldPos.xz - vec2( 1180.0, -6680.0)) / vec2(2220.0, 1880.0));
          float snD5 = length((vWorldPos.xz - vec2( 1850.0, -7720.0)) / vec2(1880.0, 1520.0));
          float snD6 = length((vWorldPos.xz - vec2(-6260.0, -6580.0)) / vec2(1880.0, 1780.0));
          float snZone = (1.0 - smoothstep(0.56, 1.18, min(min(min(snD1, snD2), min(snD3, snD4)), min(snD5, snD6)))) * smoothstep(-4180.0, -4820.0, vWorldPos.z);
          if (snZone > 0.02) {
            vec2 fw1 = vec2(fbm(vWorldPos.xz * 0.022 + vec2(1.7, -3.4)), fbm(vWorldPos.xz * 0.022 - vec2(2.9, 4.1)));
            float snowDrift = fbm(vWorldPos.xz * 0.032 + fw1 * 2.0);
            float snowGlint = pow(clamp(vnoise(vWorldPos.xz * 15.5 + fw1 * 2.0), 0.0, 1.0), 7.0) * closeFade;

            vec3 pureSnow   = vec3(0.92, 0.96, 1.00);
            vec3 shadeSnow  = vec3(0.73, 0.83, 0.94);
            vec3 frostGrass = mix(vec3(0.28, 0.42, 0.40), vec3(0.42, 0.56, 0.54), fine1);
            vec3 coldRock   = mix(vec3(0.18, 0.25, 0.35), vec3(0.38, 0.48, 0.58), strata * 0.55 + rockCobNear.r * 0.45);

            vec3 snCol = mix(shadeSnow, pureSnow, smoothstep(0.26, 0.76, snowDrift));
            // Frosted meadow transition along the southern edge bordering 通天灵木林
            float tundraW = (1.0 - smoothstep(0.22, 0.68, snZone)) * smoothstep(0.36, 0.72, midTurf) * (1.0 - smoothstep(115.0, 165.0, vWorldPos.y));
            snCol = mix(snCol, frostGrass, tundraW * 0.68);
            // Bold dark frost-slate rock exposure on the 6 steep cliff risers of 霜雪山 & outer slopes!
            float fmCliffBoost = smoothstep(110.0, 180.0, vWorldPos.y) * 0.05;
            float snRock = smoothstep(0.14 - fmCliffBoost, 0.25 - fmCliffBoost, slope + (rockCobNear.r - 0.5) * 0.07);
            snCol = mix(snCol, coldRock, snRock * 0.92);
            snCol += vec3(0.26, 0.32, 0.40) * snowGlint * (1.0 - snRock);

            float snRough = mix(0.54, 0.66, snRock);

            // Mirror-like Fractured Frozen Frost Tarn Ice (寒潭冰面) at (-3460, -5940, y ~ 74.2m)
            float dPond = length((vWorldPos.xz - vec2(-3460.0, -5940.0)) * vec2(0.94, 1.08));
            float iceMask = (1.0 - smoothstep(130.0, 156.0, dPond)) * (1.0 - smoothstep(74.8, 76.2, vWorldPos.y));
            if (iceMask > 0.01) {
              float c1 = 1.0 - abs(vnoise(vWorldPos.xz * 0.28 + fw1 * 1.4) * 2.0 - 1.0);
              float c2 = 1.0 - abs(vnoise(vWorldPos.xz * 0.78 - fw1 * 0.8) * 2.0 - 1.0);
              float iceCrack = smoothstep(0.88, 0.98, c1 * 0.58 + c2 * 0.42);
              float centerDepth = 1.0 - smoothstep(15.0, 140.0, dPond);
              vec3 deepIce = mix(vec3(0.48, 0.78, 0.90), vec3(0.22, 0.54, 0.74), centerDepth);
              vec3 crackWhite = vec3(0.88, 0.96, 1.00);
              vec3 iceCol = mix(deepIce, crackWhite, iceCrack * 0.72);
              // Crisp sky mirror Fresnel sheen across the frozen tarn
              float iceFres = pow(1.0 - max(dot(N, V), 0.0), 3.2);
              iceCol = mix(iceCol, mix(uSkyHorizon, vec3(0.90, 0.96, 1.00), 0.45), iceFres * 0.55);
              snCol = mix(snCol, iceCol, iceMask * 0.95);
              snRough = mix(snRough, mix(0.08, 0.28, iceCrack), iceMask);
              emissive = max(emissive, iceMask * (0.08 + iceCrack * 0.14));
            }

            albedo = mix(albedo, snCol, snZone * 0.95);
            rough = mix(rough, snRough, snZone * 0.90);
            if (closeFade > 0.02 && iceMask < 0.45) {
              vec3 snBump = sampleLayerBumpXZ(vWorldPos.xz * 0.36 + fw1 * 0.3, 3.0, 0.012, 0.26);
              N = safeNormalize(N + snBump * snZone * (1.0 - iceMask) * closeFade);
            }
          }
        }

        // G) Multi-Scale Procedural Ground & Mountain Rock Normal Perturbation (Near + Mid + Far Mountain Relief!)
        if (closeFade > 0.02) {
          float eps = 0.20;
          float h0 = vnoise(vWorldPos.xz * 0.95) * 0.55 + rockCobNear.b * 0.45;
          float hx = vnoise((vWorldPos.xz + vec2(eps, 0.0)) * 0.95) * 0.55 + texture(uMatTexArray, vec3((vWorldPos.xz + vec2(eps, 0.0)) * 0.48, 3.0)).b * 0.45;
          float hz = vnoise((vWorldPos.xz + vec2(0.0, eps)) * 0.95) * 0.55 + texture(uMatTexArray, vec3((vWorldPos.xz + vec2(0.0, eps)) * 0.48, 3.0)).b * 0.45;
          float bumpAmp = mix(0.45, 0.78, rockMask) * closeFade;
          N = safeNormalize(N + vec3((h0 - hx) * bumpAmp, 0.0, (h0 - hz) * bumpAmp));
        }
        if (rockMask > 0.05 && farMtnFade > 0.02) {
          // Macro & mid-range mountain rock facet normals so peaks stay chiseled & three-dimensional at all distances!
          float mEps = mix(0.85, 3.2, 1.0 - midFade);
          float freq = mix(0.085, 0.028, 1.0 - midFade);
          float r0 = 1.0 - abs(vnoise(vWorldPos.xz * freq + vec2(vWorldPos.y * 0.08)) * 2.0 - 1.0);
          float rx = 1.0 - abs(vnoise((vWorldPos.xz + vec2(mEps, 0.0)) * freq + vec2(vWorldPos.y * 0.08)) * 2.0 - 1.0);
          float rz = 1.0 - abs(vnoise((vWorldPos.xz + vec2(0.0, mEps)) * freq + vec2(vWorldPos.y * 0.08)) * 2.0 - 1.0);
          float mtnAmp = 0.72 * rockMask * farMtnFade;
          N = safeNormalize(N + vec3((r0 - rx) * mtnAmp, (strata - 0.5) * 0.16 * mtnAmp, (r0 - rz) * mtnAmp));
        }

      } else if (matType >= 0.58 && matType < 0.92) {
        // =========================================================
        // 1B. NATURAL CAVERN & MOUNTAIN CLIFF ROCK (自然岩石洞府肌理 · 无砖块网格!)
        //     0.75 = Rough Stratified Cavern Cliff Rock, 0.84 = Smooth-Hewn Natural Cave Floor Slate
        // =========================================================
        float camDist = length(uCameraPos - vWorldPos);
        float caveFade = 1.0 - smoothstep(42.0, 260.0, camDist);
        float isFloorSlate = smoothstep(0.79, 0.86, matType);

        // Triplanar organic rock fracture sampling (Canvas Layer 3: R=angular rock, G=pebble/vein, B=height, A=roughness)
        vec3 triW = pow(abs(N), vec3(4.0));
        triW /= max(triW.x + triW.y + triW.z, 1e-4);
        float uvScale = mix(0.24, 0.34, isFloorSlate);
        vec4 rx = texture(uMatTexArray, vec3(vWorldPos.zy * uvScale, 3.0));
        vec4 ry = texture(uMatTexArray, vec3(vWorldPos.xz * uvScale, 3.0));
        vec4 rz = texture(uMatTexArray, vec3(vWorldPos.xy * uvScale, 3.0));
        float rockTex = rx.r * triW.x + ry.r * triW.y + rz.r * triW.z;
        float rockH   = rx.b * triW.x + ry.b * triW.y + rz.b * triW.z;

        // Multi-scale organic geological strata & irregular rock fissures (ZERO rectangular brick joints!)
        float macroRock = fbm(vWorldPos.xz * 0.08 + vec2(vWorldPos.y * 0.06));
        float fineRock  = vnoise(vWorldPos.xz * 1.15 + vec2(vWorldPos.y * 0.95));
        float strata    = 0.5 + 0.5 * sin(vWorldPos.y * 1.35 + macroRock * 5.2 + vWorldPos.x * 0.14);
        float fissure   = 1.0 - abs(vnoise(vWorldPos.xz * 0.38 + vec2(vWorldPos.y * 0.42 + macroRock * 1.2)) * 2.0 - 1.0);
        float crackAO   = smoothstep(0.12, 0.45, fissure);

        vec3 deepStone = albedo * vec3(0.68, 0.72, 0.76);
        vec3 litStone  = albedo * vec3(1.18, 1.14, 1.08);
        vec3 cavCol = mix(deepStone, litStone, strata * 0.42 + rockTex * 0.38 + fineRock * 0.20);
        cavCol *= mix(0.70 + 0.30 * crackAO, 0.84 + 0.16 * crackAO, isFloorSlate);

        // Subtle damp mountain moss clinging organically to upward-facing rough rock ledges
        float mossNoise = fbm(vWorldPos.xz * 0.22 - vec2(2.3, 1.7));
        float mossMask = smoothstep(0.42, 0.78, N.y) * smoothstep(0.46, 0.74, mossNoise) * (1.0 - isFloorSlate * 0.78);
        cavCol = mix(cavCol, vec3(0.16, 0.30, 0.18) * (0.82 + 0.36 * fineRock), mossMask * 0.58);

        albedo = cavCol;
        rough = clamp(mix(mix(0.88, 0.66, rockTex), 0.72, isFloorSlate), 0.42, 0.94);

        if (caveFade > 0.02) {
          float eps = 0.015;
          float bAmp = mix(0.68, 0.30, isFloorSlate) * caveFade;
          float h0 = rockH;
          float hx = texture(uMatTexArray, vec3(vWorldPos.xz * uvScale + vec2(eps, 0.0), 3.0)).b;
          float hz = texture(uMatTexArray, vec3(vWorldPos.xz * uvScale + vec2(0.0, eps), 3.0)).b;
          float hy = texture(uMatTexArray, vec3(vWorldPos.xy * uvScale + vec2(0.0, eps), 3.0)).b;
          N = safeNormalize(N + vec3((h0 - hx) * bAmp, (h0 - hy) * bAmp * 0.55, (h0 - hz) * bAmp));
        }

      } else if (matType < 1.5) {
        // =========================================================
        // 2. CANVAS PROCEDURAL ARCHITECTURAL MATERIALS (青瓦 / 木纹 / 石砖 + 粗糙度与凹凸法线)
        // =========================================================
        float camDist = length(uCameraPos - vWorldPos);
        float archDetailFade = 1.0 - smoothstep(45.0, 240.0, camDist);

        if (matType >= 1.08 && matType < 1.22) {
          // A) 青瓦 (Canvas Layer 0: Glazed Chinese Barrel & Pan Roof Tiles)
          vec2 tileUV = vWorldPos.xz * 0.92;
          vec4 tileTex = texture(uMatTexArray, vec3(tileUV, 0.0));
          float glazeShade = mix(0.68, 1.22, tileTex.r);
          float patina = smoothstep(0.55, 0.88, tileTex.g);
          albedo = albedo * glazeShade + vec3(0.04, 0.09, 0.08) * patina;
          rough = clamp(mix(rough, tileTex.a, 0.78), 0.16, 0.85);
          if (archDetailFade > 0.02) {
            vec3 tileBump = sampleLayerBumpXZ(tileUV, 0.0, 0.008, 0.65 * archDetailFade);
            N = safeNormalize(N + tileBump);
          }
        } else if (matType >= 1.22 && matType < 1.36) {
          // B) 木纹 (Canvas Layer 1: Lacquered Wood Columns, Dou-Gong Beams & Ancient Tree Bark)
          vec2 woodUV = (abs(N.y) > 0.75)
            ? (vWorldPos.xz * 0.65)
            : vec2((vWorldPos.x + vWorldPos.z) * 0.85, vWorldPos.y * 0.55);
          vec4 woodTex = texture(uMatTexArray, vec3(woodUV, 1.0));
          float grain = mix(0.74, 1.18, woodTex.r);
          albedo *= mix(vec3(grain), vec3(grain * 1.05, grain * 0.98, grain * 0.90), woodTex.g * 0.5);
          rough = clamp(mix(rough, woodTex.a, 0.70), 0.24, 0.90);
          if (archDetailFade > 0.02) {
            float h0 = woodTex.b;
            float hu = texture(uMatTexArray, vec3(woodUV + vec2(0.012, 0.0), 1.0)).b;
            float hv = texture(uMatTexArray, vec3(woodUV + vec2(0.0, 0.012), 1.0)).b;
            float bAmp = 0.45 * archDetailFade;
            N = safeNormalize(N + vec3((h0 - hu) * bAmp, (h0 - hv) * bAmp * 0.4, (h0 - hu) * bAmp));
          }
        } else {
          // C) 石砖 / 青石台基 / 雕栏玉砌 / 殿墙 (Canvas Layer 2: Carved Ashlar Stone Masonry & Flagstones)
          vec2 stoneUV = (abs(N.y) > 0.78)
            ? (vWorldPos.xz * 0.42)
            : vec2((abs(N.x) > abs(N.z) ? vWorldPos.z : vWorldPos.x) * 0.48, vWorldPos.y * 0.64);
          vec4 stoneTex = texture(uMatTexArray, vec3(stoneUV, 2.0));
          float masonryStrength = (matType > 1.38) ? 0.36 : 0.82; // softer plaster masonry on cream palace walls (1.42)
          float blockShade = mix(1.0, mix(0.68, 1.14, stoneTex.r), masonryStrength);
          float seamWeather = smoothstep(0.52, 0.88, stoneTex.g) * masonryStrength;
          albedo = mix(albedo * blockShade, albedo * vec3(0.62, 0.72, 0.64), seamWeather * 0.35);

          if (N.y > 0.82) {
            float dOvl = length(vWorldPos.xz - vec2(0.0, 420.0));
            float ringOvl = smoothstep(0.28, 0.06, abs(dOvl - 8.2)) * step(dOvl, 12.0);
            albedo = mix(albedo, vec3(0.56, 0.66, 0.62), ringOvl * 0.55);
          }
          rough = clamp(mix(rough, stoneTex.a, 0.72), 0.30, 0.88);
          if (archDetailFade > 0.02) {
            float h0 = stoneTex.b;
            float hu = texture(uMatTexArray, vec3(stoneUV + vec2(0.010, 0.0), 2.0)).b;
            float hv = texture(uMatTexArray, vec3(stoneUV + vec2(0.0, 0.010), 2.0)).b;
            float sAmp = 0.52 * masonryStrength * archDetailFade;
            N = safeNormalize(N + vec3((h0 - hu) * sAmp, (h0 - hv) * sAmp * 0.5, (h0 - hv) * sAmp));
          }
        }
      } else if (matType < 2.5) {
        // Pulsing luminous Spirit Crystal / Rune breathing animation!
        float pulse = 0.86 + 0.22 * sin(uTime * 2.2 + vWorldPos.x * 0.14 + vWorldPos.z * 0.14 + vWorldPos.y * 0.1);
        emissive *= pulse;
      }

      float shadow = calcSoftShadow(vWorldPos, N);
      vec3 col = shadeStylizedSurface(albedo, N, V, shadow, rough, matType);

      if (emissive > 0.01) {
        float ndv = clamp(dot(N, V), 0.0, 1.0);
        float fres = pow(max(1.0 - ndv, 0.0), 2.0);
        col += albedo * emissive * (0.80 + 0.40 * fres);
      }

      col = applyAerialPerspective(col, vWorldPos);
      fragColor = vec4(clamp(col, vec3(0.0), vec3(10.0)), 1.0);
    }
  `;

  // =========================================================
  // 3. GPU-INSTANCED WIND-SWAYING GRASS SHADER (Toroidal Dense Carpet + Island Grass!)
  // =========================================================
  const GRASS_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec2 aUV;
    layout(location = 2) in vec4 iPosScale;
    layout(location = 3) in vec4 iParams;

    uniform mat4 uVP;
    uniform vec3 uCameraPos;
    uniform float uTime;
    uniform float uUseTerrainMap;
    uniform float uCellSpacing;
    uniform float uWorldSize;
    uniform float uTerrainTexSize;
    uniform float uGrassRadiusScale;
    uniform sampler2D uTerrainMap;

    out vec3 vWorldPos;
    out float vTip;
    out float vHue;
    out float vWindWave;

    float gHash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // Exact 2-triangle barycentric height match to buildTerrainMesh() (indices: a,c,b when fx+fz<=1; b,c,d when fx+fz>1) -> ZERO floating grass!
    vec4 sampleTerrainBilinear(vec2 worldXZ) {
      vec2 uv = (worldXZ + vec2(uWorldSize * 0.5)) / uWorldSize;
      if (uv.x < 0.002 || uv.x > 0.998 || uv.y < 0.002 || uv.y > 0.998) {
        return vec4(0.0);
      }
      vec2 fCoord = uv * (uTerrainTexSize - 1.0);
      ivec2 i0 = ivec2(floor(fCoord));
      ivec2 i1 = min(i0 + ivec2(1), ivec2(int(uTerrainTexSize) - 1));
      vec2 f = fract(fCoord);
      vec4 t00 = texelFetch(uTerrainMap, i0, 0);
      vec4 t10 = texelFetch(uTerrainMap, ivec2(i1.x, i0.y), 0);
      vec4 t01 = texelFetch(uTerrainMap, ivec2(i0.x, i1.y), 0);
      vec4 t11 = texelFetch(uTerrainMap, i1, 0);
      vec4 bi = mix(mix(t00, t10, f.x), mix(t01, t11, f.x), f.y);
      float exactH = (f.x + f.y <= 1.0)
        ? (t00.r + f.x * (t10.r - t00.r) + f.y * (t01.r - t00.r))
        : (t11.r + (1.0 - f.x) * (t01.r - t11.r) + (1.0 - f.y) * (t10.r - t11.r));
      return vec4(exactH, bi.gba);
    }

    void main() {
      vec3 basePos;
      float sc;
      float rotY;
      float hueVal;
      float hStretch;
      float wPhase;

      if (uUseTerrainMap > 0.5) {
        // World-snapped toroidal grid cell: NEVER slides with camera!
        vec2 camCell = floor(uCameraPos.xz / uCellSpacing);
        vec2 cellIdx = camCell + iPosScale.xz;

        float h1 = gHash(cellIdx);
        float h2 = gHash(cellIdx + vec2(19.3, 47.7));
        float h3 = gHash(cellIdx + vec2(83.1, 13.9));
        float h4 = gHash(cellIdx + vec2(37.2, 91.5));

        vec2 worldXZ = (cellIdx + vec2(h1 - 0.5, h2 - 0.5) * 0.92) * uCellSpacing;
        vec4 td = sampleTerrainBilinear(worldXZ);

        float dist = length(worldXZ - uCameraPos.xz);
        float rScale = uGrassRadiusScale > 0.1 ? uGrassRadiusScale : 1.0;
        float maxR = 142.0 * rScale;
        float distFade = 1.0 - smoothstep(maxR * 0.64, maxR, dist);
        // Natural ecological clumping (自然聚落式草木分布): 恢复原草丛密度，并在较小面积的局域斑块中重新加入茂密长草！
        float ecoWave = sin(worldXZ.x * 0.038 + 1.4) * cos(worldXZ.y * 0.036 - 0.9)
                      + sin((worldXZ.x + worldXZ.y) * 0.022) * 0.65;
        float elig = smoothstep(0.20, 0.64, td.g + ecoWave * 0.14);
        float clump = smoothstep(-0.32, 0.46, ecoWave + (h3 - 0.5) * 0.72);
        // 缩小长草斑块面积（约占草地 22% 的局域聚落），内部保持原本茂密长草高度与密度
        float tallWave = sin(worldXZ.x * 0.056 - 2.1) * cos(worldXZ.y * 0.052 + 1.7)
                       + sin((worldXZ.x - worldXZ.y) * 0.038 + 0.8) * 0.52;
        float tallPatch = smoothstep(0.52, 0.92, tallWave) * smoothstep(0.45, 0.75, td.g);

        basePos = vec3(worldXZ.x, td.r - 0.12, worldXZ.y);
        float baseSc = 0.64 + h3 * 0.54;
        sc = mix(baseSc, baseSc * 1.24, tallPatch) * distFade * elig * (0.58 + 0.42 * clump);
        rotY = h4 * 6.283185;
        float shortStretch = 0.62 + h1 * 0.36 + clump * 0.16;
        float tallStretch  = 1.28 + h1 * 0.54 + clump * 0.22;
        hStretch = mix(shortStretch, tallStretch, tallPatch);
        wPhase = h2 * 6.283185;

        // Clustered meadow wildflowers (~12%) + glowing cyan-jade Spirit Herbs + snow-covered frost grass (td.b < -3.0) + dry arid grass (td.b < -1.1)!
        float flowerZone = sin(worldXZ.x * 0.032 + 1.1) * cos(worldXZ.y * 0.029 - 0.7);
        if (td.b < -3.0) {
          hueVal = 10.2 + h1 * 0.6; // 霜雪原覆雪寒草 (Partially snow-covered winter grass!)
          hStretch *= 0.88;
        } else if (td.b < -1.1) {
          hueVal = -1.45 - clamp((-1.1 - td.b) * 0.95 + (h1 - 0.5) * 0.25, 0.0, 1.25);
          hStretch *= 0.84;
        } else if (h4 < 0.048 && td.g > 0.62 && clump > 0.55) {
          hueVal = 5.8; // Luminous Xianxia Spirit Herb (灵草)
          hStretch *= 1.18;
        } else if (h4 < 0.14 && flowerZone > -0.05) {
          hueVal = 2.0 + floor(fract(h3 * 7.13) * 4.0);
        } else {
          hueVal = clamp(td.b * 1.4 + (h1 - 0.5) * 0.5, -1.0, 1.0);
        }
      } else {
        // Static Floating Island Grass + Grove Spirit Herbs (灵草) + Waterside Reeds (岸边芦苇)
        basePos = iPosScale.xyz;
        float dist = length(basePos - uCameraPos);
        float rScale = uGrassRadiusScale > 0.1 ? uGrassRadiusScale : 1.0;
        sc = iPosScale.w * (1.0 - smoothstep(145.0 * rScale, 285.0 * rScale, dist));
        rotY = iParams.x;
        hueVal = iParams.y;
        hStretch = iParams.z;
        wPhase = iParams.w;
      }

      if (sc < 0.01) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vWorldPos = basePos;
        vTip = 0.0;
        vHue = 0.0;
        vWindWave = 0.0;
        return;
      }

      // GPU Frustum Early-Out on tuft base: culls ~70% of grass tufts behind or outside camera frustum with ZERO visual loss!
      vec4 clipTest = uVP * vec4(basePos + vec3(0.0, 0.85, 0.0), 1.0);
      if (clipTest.w < -2.5 || abs(clipTest.x) > clipTest.w * 1.24 + 2.5 || abs(clipTest.y) > clipTest.w * 1.28 + 2.5) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vWorldPos = basePos;
        vTip = 0.0;
        vHue = 0.0;
        vWindWave = 0.0;
        return;
      }

      float c = cos(rotY), s = sin(rotY);
      // Tall slender profile for Waterside Reeds (岸边芦苇, 6.5 < hueVal < 9.9), full blades for snow-covered grass (>= 9.9)!
      float wSlim = (hueVal > 6.5 && hueVal < 9.9) ? 0.68 : 1.0;
      vec3 lp = vec3(aPos.x * sc * wSlim, aPos.y * sc * hStretch, aPos.z * sc * wSlim);
      vec3 rp = vec3(lp.x * c - lp.z * s, lp.y, lp.x * s + lp.z * c);

      float waveArg = basePos.x * 0.044 + basePos.z * 0.032 - uTime * 1.95;
      float gust = sin(waveArg) * 0.55 + sin(waveArg * 2.13 + basePos.z * 0.05) * 0.25 + 0.25;
      float flutter = sin(uTime * 3.6 + wPhase + basePos.x * 0.35) * 0.14;
      float bend = (gust * 0.52 + flutter) * (aUV.y * aUV.y) * sc;

      vec3 worldPos = basePos + rp + vec3(bend * 0.85, -abs(bend) * 0.18, bend * 0.55);

      vWorldPos = worldPos;
      vTip = aUV.y;
      vHue = hueVal;
      vWindWave = clamp(gust, 0.0, 1.0);

      gl_Position = uVP * vec4(worldPos, 1.0);
    }
  `;

  const GRASS_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in float vTip;
    in float vHue;
    in float vWindWave;

    uniform float uTime;
    out vec4 fragColor;
    ${COMMON_ATMO_SHADOW}

    void main() {
      vec3 rootCol = vec3(0.11, 0.33, 0.15);
      vec3 tipCol;
      float herbGlow = 0.0;

      if (vHue > 9.9) {
        // 霜雪原覆雪寒草 (Winter grass partially blanketed in crisp silver-white snow at both base drift & frosted upper tips!)
        float snowVar = clamp(vHue - 10.2, 0.0, 0.65);
        vec3 wintrySage = mix(vec3(0.15, 0.28, 0.23), vec3(0.32, 0.39, 0.28), snowVar);
        vec3 snowWhite  = vec3(0.90, 0.95, 1.00);
        // Base snow-burial skirt + irregular snow-crusted upper blades so every tuft looks genuinely half-covered in snow!
        float baseSnow = 1.0 - smoothstep(0.0, 0.26, vTip);
        float tipSnow  = smoothstep(0.36 + (0.3 - snowVar * 0.4), 0.84, vTip);
        rootCol = mix(vec3(0.11, 0.20, 0.18), snowWhite, 0.65);
        tipCol  = mix(wintrySage, snowWhite, clamp(tipSnow * 0.92 + baseSnow * 0.45, 0.0, 0.95));
      } else if (vHue > 8.9) {
        // 水生蒲草 (沉烟迷泽 Aquatic Cattails / Bulrushes with velvety dark brown spikes!)
        rootCol = vec3(0.09, 0.22, 0.12);
        vec3 bladeCol = vec3(0.18, 0.38, 0.18);
        vec3 spikeCol = vec3(0.30, 0.17, 0.10);
        float spikeBand = smoothstep(0.64, 0.76, vTip) * (1.0 - smoothstep(0.90, 0.98, vTip) * 0.45);
        tipCol = mix(bladeCol, spikeCol, spikeBand);
      } else if (vHue > 7.9) {
        // 白芦苇荡 (沉烟迷泽 Silvery-White Feathery Marsh Reeds / 雪白芦花!)
        rootCol = vec3(0.13, 0.24, 0.16);
        vec3 sageStalk = vec3(0.30, 0.42, 0.28);
        vec3 whitePlume = mix(vec3(0.88, 0.91, 0.88), vec3(0.97, 0.98, 0.96), clamp(vHue - 8.2, 0.0, 1.0));
        tipCol = mix(sageStalk, whitePlume, smoothstep(0.50, 0.84, vTip));
      } else if (vHue > 6.5) {
        // 岸边芦苇 (Waterside Reeds & Fluffy Golden-Cream Reed Plumes / 芦花穗)
        rootCol = vec3(0.14, 0.29, 0.16);
        vec3 stalkCol = vec3(0.36, 0.50, 0.26);
        vec3 plumeCol = mix(vec3(0.88, 0.80, 0.58), vec3(0.96, 0.92, 0.78), clamp(vHue - 7.0, 0.0, 1.0));
        tipCol = mix(stalkCol, plumeCol, smoothstep(0.55, 0.86, vTip));
      } else if (vHue > 5.95) {
        // 沉烟迷泽湿地莎草与苔蕨丛 (Low Damp Bog Sedge & Lush Mossy Wetland Tussocks!)
        rootCol = vec3(0.07, 0.18, 0.10);
        vec3 lushSedge = mix(vec3(0.14, 0.34, 0.16), vec3(0.26, 0.45, 0.20), clamp((vHue - 6.0) * 2.2, 0.0, 1.0));
        tipCol = mix(lushSedge, vec3(0.36, 0.50, 0.24), vWindWave * 0.25 * vTip);
      } else if (vHue > 5.2) {
        // 灵草 (Luminous Xianxia Spirit Herbs nestled beside mountain rocks & ancient tree roots!)
        rootCol = vec3(0.08, 0.34, 0.28);
        tipCol = mix(vec3(0.16, 0.74, 0.64), vec3(0.36, 0.98, 0.88), smoothstep(0.45, 0.95, vTip));
        herbGlow = smoothstep(0.42, 0.96, vTip) * (0.55 + 0.25 * sin(uTime * 2.4 + vWorldPos.x * 0.3 + vWorldPos.z * 0.3));
      } else if (vHue > 1.5) {
        // Subtle Breath-of-the-Wild sunlit meadow wildflower tips!
        vec3 flowerCol = (vHue < 2.5) ? vec3(0.96, 0.96, 0.90)
                       : (vHue < 3.5) ? vec3(0.98, 0.86, 0.42)
                       : (vHue < 4.5) ? vec3(0.68, 0.86, 0.98)
                       :                vec3(0.98, 0.76, 0.84);
        vec3 greenMid = vec3(0.28, 0.60, 0.23);
        tipCol = mix(greenMid, flowerCol, smoothstep(0.62, 0.94, vTip));
      } else if (vHue < -1.4) {
        // 残阵古道枯黄/耐旱草甸 (Withered Golden-Khaki & Sun-Bleached Drought Grass!)
        float dryAmt = clamp((-1.4 - vHue) * 0.9, 0.0, 1.0);
        rootCol = mix(vec3(0.16, 0.26, 0.13), vec3(0.24, 0.20, 0.11), dryAmt);
        vec3 dryStraw = mix(vec3(0.48, 0.46, 0.22), vec3(0.66, 0.55, 0.27), dryAmt);
        tipCol = mix(dryStraw, vec3(0.76, 0.65, 0.34), vWindWave * 0.35 * vTip);
      } else {
        tipCol = mix(vec3(0.27, 0.62, 0.22), vec3(0.47, 0.73, 0.25), vHue * 0.5 + 0.5);
        tipCol = mix(tipCol, vec3(0.62, 0.81, 0.30), vWindWave * 0.40 * vTip);
      }

      vec3 albedo = mix(rootCol, tipCol, smoothstep(0.0, 0.90, vTip));
      vec3 N = safeNormalize(vec3(vWindWave * 0.22, 1.0, 0.12));
      vec3 V = safeNormalize(uCameraPos - vWorldPos);

      float shadow = calcSoftShadow(vWorldPos, N);
      float ao = mix(0.54, 1.0, vTip);
      vec3 col = shadeStylizedSurface(albedo, N, V, shadow, 0.80, 0.0) * ao;

      float backLit = pow(clamp(dot(-V, uSunDir), 0.0, 1.0), 3.0) * vTip * shadow;
      vec3 sssTint = (vHue > 9.9) ? vec3(0.84, 0.92, 0.98)
                   : (vHue > 7.9 && vHue <= 8.9) ? vec3(0.88, 0.94, 0.90)
                   : (vHue > 6.5) ? vec3(0.85, 0.76, 0.48)
                   : (vHue < -1.4) ? vec3(0.76, 0.64, 0.30)
                   :                vec3(0.50, 0.72, 0.24);
      col += sssTint * uSunColor * backLit * 0.42;
      col += albedo * herbGlow * 0.85;

      col = applyAerialPerspective(col, vWorldPos);
      fragColor = vec4(clamp(col, vec3(0.0), vec3(8.0)), 1.0);
    }
  `;

  // =========================================================
  // 4. GPU-INSTANCED 3D MULTI-LOBE TREE & BAMBOO CANOPY SHADER
  // =========================================================
  const CANOPY_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec3 aNormal;
    layout(location = 2) in vec2 aUV;
    layout(location = 3) in vec3 iPos;
    layout(location = 4) in vec3 iScale;
    layout(location = 5) in vec4 iColPhase;

    uniform mat4 uVP;
    uniform vec3 uCameraPos;
    uniform float uTime;
    uniform float uPropCullDist;

    out vec3 vWorldPos;
    out vec3 vNormal;
    out vec3 vColor;
    out float vLocalY;
    out vec2 vUV;

    void main() {
      float maxDist = uPropCullDist > 100.0 ? uPropCullDist : 9600.0;
      float cDist = length(iPos - uCameraPos);
      float cullScale = 1.0 - smoothstep(maxDist * 0.84, maxDist, cDist);
      vec4 clipC = uVP * vec4(iPos, 1.0);
      float padR = max(iScale.x, max(iScale.y, iScale.z)) * 2.2 + 4.0;
      if (cullScale <= 0.005 || clipC.w < -padR || abs(clipC.x) > clipC.w * 1.15 + padR || abs(clipC.y) > clipC.w * 1.20 + padR) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vWorldPos = iPos;
        vNormal = vec3(0.0, 1.0, 0.0);
        vColor = iColPhase.rgb;
        vLocalY = 0.0;
        vUV = aUV;
        return;
      }

      float sway = sin(uTime * 1.65 + iColPhase.w + iPos.x * 0.06 + iPos.z * 0.05) * 0.22;
      float sway2 = cos(uTime * 2.3 + iColPhase.w * 1.4) * 0.09;
      vec3 lp = aPos * (iScale * cullScale);
      float upper = smoothstep(-0.4, 0.8, aPos.y);
      lp.x += (sway + sway2) * upper;
      lp.z += (sway * 0.65 - sway2) * upper;

      vec3 worldPos = iPos + lp;
      vWorldPos = worldPos;
      vec3 sn = aNormal / max(iScale, vec3(0.1));
      vNormal = length(sn) > 1e-4 ? normalize(sn) : vec3(0.0, 1.0, 0.0);
      vColor = iColPhase.rgb;
      vLocalY = aPos.y;
      vUV = aUV;

      gl_Position = uVP * vec4(worldPos, 1.0);
    }
  `;

  const CANOPY_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec3 vNormal;
    in vec3 vColor;
    in float vLocalY;
    in vec2 vUV;

    out vec4 fragColor;
    ${COMMON_NOISE}
    ${COMMON_ATMO_SHADOW}

    void main() {
      vec3 N = safeNormalize(vNormal);
      vec3 V = safeNormalize(uCameraPos - vWorldPos);

      // Multi-scale 3D leaf-clump texture & procedural normal relief
      float dapple1 = vnoise(vWorldPos.xz * 1.15 + vec2(vWorldPos.y * 0.95));
      float dapple2 = vnoise(vWorldPos.xy * 2.35 - vec2(vWorldPos.z * 1.85));
      float leafCluster = dapple1 * 0.58 + dapple2 * 0.42;

      float camDist = length(uCameraPos - vWorldPos);
      float leafBumpFade = 1.0 - smoothstep(35.0, 190.0, camDist);
      if (leafBumpFade > 0.02) {
        float lx = vnoise((vWorldPos.xz + vec2(0.18, 0.0)) * 1.65 + vec2(vWorldPos.y));
        float lz = vnoise((vWorldPos.xz + vec2(0.0, 0.18)) * 1.65 + vec2(vWorldPos.y));
        N = safeNormalize(N + vec3(dapple1 - lx, (leafCluster - 0.5) * 0.35, dapple1 - lz) * 0.65 * leafBumpFade);
      }

      // Rich dark-to-light vertex & sub-lobe color gradation (vUV.x = cluster height [0..1], vUV.y = sub-lobe cleft AO [0.25..1.0])
      float hGrad = clamp(vUV.x * 0.65 + (vLocalY + 0.6) * 0.35 + (leafCluster - 0.5) * 0.38, 0.0, 1.0);
      float cleftAO = clamp(vUV.y, 0.32, 1.0);

      vec3 deepShadeCol = vColor * vec3(0.46, 0.58, 0.74);
      vec3 midCrownCol  = vColor * vec3(0.96, 0.98, 0.95);
      vec3 sunTipCol    = min(vec3(1.0), vColor * vec3(1.26, 1.20, 1.04) + vec3(0.04, 0.05, 0.02));

      vec3 albedo = mix(deepShadeCol, midCrownCol, smoothstep(0.08, 0.58, hGrad));
      albedo = mix(albedo, sunTipCol, smoothstep(0.55, 0.95, hGrad * cleftAO));
      albedo *= mix(0.62, 1.06, cleftAO);

      // Authentic partial snow accumulation resting on top of EVERY pine bough & winter shrub across 霜雪原 & 霜雪山!
      if (vWorldPos.z < -4150.0 && vWorldPos.x > -8550.0 && vWorldPos.x < 4000.0) {
        float northSnow = smoothstep(-4250.0, -4950.0, vWorldPos.z);
        float neSnow    = smoothstep(-1350.0, -650.0, vWorldPos.x) * smoothstep(-4150.0, -4550.0, vWorldPos.z);
        float snowZone  = max(northSnow, neSnow);
        float topSnow   = smoothstep(0.18, 0.66, N.y * 0.64 + hGrad * 0.44 + (leafCluster - 0.5) * 0.36);
        vec3 snowBlanket = mix(vec3(0.78, 0.87, 0.96), vec3(0.94, 0.97, 1.00), cleftAO);
        albedo = mix(albedo, snowBlanket, topSnow * snowZone * 0.94);
      }

      float shadow = calcSoftShadow(vWorldPos, N);
      vec3 col = shadeStylizedSurface(albedo, N, V, shadow, 0.74, 0.0);

      // Warm translucent leaf subsurface scattering on sunlit edges
      float sss = pow(clamp(dot(-V, uSunDir), 0.0, 1.0), 2.4) * (0.30 + 0.70 * shadow) * cleftAO;
      col += albedo * uSunColor * sss * 0.36;

      // Subtle, controlled ethereal spirit-foliage glow & canopy translucency inside expanded 通天灵木林!
      if (vWorldPos.x < -860.0 && vWorldPos.z < 500.0) {
        float blueSpirit = smoothstep(0.70, 0.94, vColor.b) * smoothstep(0.42, 0.86, vColor.g);
        float cyanSpirit = smoothstep(0.44, 0.68, vColor.b) * smoothstep(0.55, 0.78, vColor.g) * (1.0 - blueSpirit);
        float goldSpirit = smoothstep(0.68, 0.88, vColor.r) * smoothstep(0.62, 0.82, vColor.g) * (1.0 - smoothstep(0.50, 0.65, vColor.b));
        float spiritLeaf = clamp(cyanSpirit + goldSpirit, 0.0, 1.0);
        float gentleBreath = 0.82 + 0.18 * sin(vWorldPos.x * 0.03 + vWorldPos.z * 0.03 + vWorldPos.y * 0.05);
        if (spiritLeaf > 0.02) {
          col += vColor * spiritLeaf * (0.28 + 0.22 * hGrad) * gentleBreath;
        }
        if (blueSpirit > 0.02) {
          // Unmistakable luminous sapphire-azure spiritual radiance for the 450m Colossal Central World Tree!
          col += vColor * blueSpirit * (0.72 + 0.55 * hGrad) * gentleBreath;
        }
        // Soft sunlit canopy透光感 under high giant tree boughs
        float topFilter = smoothstep(0.45, 0.92, hGrad) * (0.25 + 0.75 * cleftAO);
        col += vec3(0.18, 0.30, 0.20) * uSunColor * topFilter * 0.14;
      }

      col = applyAerialPerspective(col, vWorldPos);
      fragColor = vec4(clamp(col, vec3(0.0), vec3(8.0)), 1.0);
    }
  `;

  // =========================================================
  // 5. GPU-INSTANCED MOSSY BOULDERS SHADER (With Canvas Rock Texture & Ground-Contact AO!)
  // =========================================================
  const BOULDER_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec3 aNormal;
    layout(location = 2) in vec4 iPosRot;
    layout(location = 3) in vec4 iScaleTint;

    uniform mat4 uVP;
    uniform vec3 uCameraPos;
    uniform float uPropCullDist;
    out vec3 vWorldPos;
    out vec3 vNormal;
    out float vTint;
    out float vLocalY;

    void main() {
      float maxDist = uPropCullDist > 100.0 ? uPropCullDist : 9600.0;
      float cDist = length(iPosRot.xyz - uCameraPos);
      float cullScale = 1.0 - smoothstep(maxDist * 0.84, maxDist, cDist);
      vec4 clipB = uVP * vec4(iPosRot.xyz, 1.0);
      float padB = max(iScaleTint.x, max(iScaleTint.y, iScaleTint.z)) * 2.2 + 3.0;
      if (cullScale <= 0.005 || clipB.w < -padB || abs(clipB.x) > clipB.w * 1.15 + padB || abs(clipB.y) > clipB.w * 1.20 + padB) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vWorldPos = iPosRot.xyz;
        vNormal = vec3(0.0, 1.0, 0.0);
        vTint = 0.0;
        vLocalY = 0.0;
        return;
      }
      float c = cos(iPosRot.w), s = sin(iPosRot.w);
      vec3 lp = aPos * (iScaleTint.xyz * cullScale);
      vec3 rp = vec3(lp.x * c - lp.z * s, lp.y, lp.x * s + lp.z * c);
      vec3 rn = vec3(aNormal.x * c - aNormal.z * s, aNormal.y, aNormal.x * s + aNormal.z * c);
      vWorldPos = iPosRot.xyz + rp;
      vNormal = length(rn) > 1e-4 ? normalize(rn) : vec3(0.0, 1.0, 0.0);
      vTint = iScaleTint.w;
      vLocalY = aPos.y;
      gl_Position = uVP * vec4(vWorldPos, 1.0);
    }
  `;

  const BOULDER_FS = /* glsl */ `#version 300 es
    precision highp float;
    precision highp sampler2DArray;
    in vec3 vWorldPos;
    in vec3 vNormal;
    in float vTint;
    in float vLocalY;

    uniform sampler2DArray uMatTexArray;
    out vec4 fragColor;
    ${COMMON_NOISE}
    ${COMMON_ATMO_SHADOW}

    void main() {
      vec3 N = safeNormalize(vNormal);
      vec3 V = safeNormalize(uCameraPos - vWorldPos);

      // Sample Canvas Layer 3 (Mountain Rock Fracture & Strata)
      vec2 rUV = vWorldPos.xz * 0.42 + vec2(vWorldPos.y * 0.35);
      vec4 rockTex = texture(uMatTexArray, vec3(rUV, 3.0));
      float h0 = rockTex.b;
      float hx = texture(uMatTexArray, vec3(rUV + vec2(0.015, 0.0), 3.0)).b;
      float hz = texture(uMatTexArray, vec3(rUV + vec2(0.0, 0.015), 3.0)).b;
      N = safeNormalize(N + vec3((h0 - hx) * 0.65, (rockTex.r - 0.5) * 0.25, (h0 - hz) * 0.65));

      vec3 rockBase = mix(vec3(0.26, 0.31, 0.36), vec3(0.45, 0.46, 0.44), vTint);
      float desertRock = smoothstep(-3950.0, -4780.0, vWorldPos.x) * smoothstep(1380.0, 2280.0, vWorldPos.z);
      float alpineRock = smoothstep(380.0, 950.0, vWorldPos.x) * smoothstep(2950.0, 3350.0, vWorldPos.z) * smoothstep(140.0, 420.0, vWorldPos.y);
      float frostRock  = smoothstep(-4220.0, -4920.0, vWorldPos.z) * smoothstep(-8550.0, -7850.0, vWorldPos.x) * (1.0 - smoothstep(3250.0, 4050.0, vWorldPos.x));
      rockBase = mix(rockBase, mix(vec3(0.48, 0.33, 0.20), vec3(0.64, 0.48, 0.30), vTint), desertRock);
      rockBase = mix(rockBase, mix(vec3(0.24, 0.30, 0.38), vec3(0.50, 0.55, 0.62), vTint), alpineRock);
      rockBase = mix(rockBase, mix(vec3(0.18, 0.25, 0.35), vec3(0.36, 0.45, 0.56), vTint), frostRock);
      vec3 rockCol = rockBase * mix(0.68, 1.24, rockTex.r);

      // Rich emerald moss on lowland boulders; dry sandstone in 流沙荒漠; crisp snow-capped cold rock in 霜雪原!
      vec3 mossCol = mix(vec3(0.16, 0.40, 0.19), vec3(0.28, 0.52, 0.23), rockTex.g);
      mossCol = mix(mossCol, vec3(0.30, 0.43, 0.40), alpineRock * 0.72);
      mossCol = mix(mossCol, vec3(0.88, 0.94, 0.99), frostRock);
      float capMask = smoothstep(0.46, 0.78, N.y + (rockTex.r - 0.5) * 0.26);
      float moss = capMask * (1.0 - desertRock * 0.96) * (1.0 - alpineRock * 0.62 * (1.0 - frostRock));
      vec3 albedo = mix(rockCol, mossCol, moss * mix(0.84, 0.92, frostRock));

      // Ground-contact ambient occlusion at the base of the boulder
      float baseAO = smoothstep(-0.78, -0.05, vLocalY);
      albedo *= (0.58 + 0.42 * baseAO);

      float shadow = calcSoftShadow(vWorldPos, N);
      vec3 col = shadeStylizedSurface(albedo, N, V, shadow, mix(rockTex.a, 0.78, moss), 1.0);
      col = applyAerialPerspective(col, vWorldPos);
      fragColor = vec4(clamp(col, vec3(0.0), vec3(8.0)), 1.0);
    }
  `;

  // =========================================================
  // 6. ANIMATED WATER SHADER (云梦大泽 / 幽篁灵泉 / 溪流 — 浅滩鹅卵石透底、水深渐变、天光云影反射、岸边泡沫过渡)
  // =========================================================
  const WATER_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec2 aUV;
    layout(location = 2) in vec2 aMeta;

    uniform mat4 uVP;
    uniform float uTime;

    out vec3 vWorldPos;
    out vec2 vUV;
    out vec2 vMeta;

    void main() {
      vec3 p = aPos;
      float depth = max(aMeta.x, 0.0);
      float oceanMode = clamp(aMeta.y - 1.2, 0.0, 1.0);
      float waveAmp = smoothstep(0.0, 0.55, depth);
      float localWave = (sin(p.x * 0.24 + uTime * 1.55) * 0.048 + cos(p.z * 0.30 - uTime * 1.30) * 0.044) * waveAmp;
      float oceanSwell = (sin(p.x * 0.032 + p.z * 0.018 + uTime * 0.92) * 0.22 + cos(p.z * 0.041 - p.x * 0.014 - uTime * 0.78) * 0.16) * smoothstep(0.0, 4.0, depth);
      p.y += mix(localWave, oceanSwell, oceanMode);
      vWorldPos = p;
      vUV = aUV;
      vMeta = aMeta;
      gl_Position = uVP * vec4(p, 1.0);
    }
  `;

  const WATER_FS = /* glsl */ `#version 300 es
    precision highp float;
    precision highp sampler2DArray;
    in vec3 vWorldPos;
    in vec2 vUV;
    in vec2 vMeta;

    uniform float uTime;
    uniform sampler2DArray uMatTexArray;
    out vec4 fragColor;

    ${COMMON_NOISE}
    ${COMMON_ATMO_SHADOW}

    void main() {
      float depth = max(vMeta.x, 0.0);
      float oceanMode = clamp(vMeta.y - 1.2, 0.0, 1.0);
      float spiritBio = clamp(vMeta.y, 0.0, 1.0) * (1.0 - oceanMode);
      float swampMode = clamp(-vMeta.y, 0.0, 1.0);
      float venomMode = clamp(-vMeta.y - 1.2, 0.0, 1.0);
      vec3 V = safeNormalize(uCameraPos - vWorldPos);

      // 1. Multi-Directional Dynamic Wave Normals (far water/ocean skips high-freq uv3 octave with zero visible loss!)
      vec2 wp = vWorldPos.xz;
      float camDistW = length(uCameraPos - vWorldPos);
      float nearWater = 1.0 - smoothstep(140.0, 340.0, camDistW);
      float spdScale = mix(1.0, 0.55, swampMode);
      vec2 uv1 = wp * 0.19 + vec2(uTime * 0.24, uTime * 0.15) * spdScale;
      vec2 uv2 = wp * 0.34 - vec2(uTime * 0.18, -uTime * 0.26) * spdScale;

      float w1 = vnoise(uv1);
      float w2 = vnoise(uv2);
      float w1x = vnoise(uv1 + vec2(0.14, 0.0));
      float w1z = vnoise(uv1 + vec2(0.0, 0.14));
      float w2x = vnoise(uv2 + vec2(0.14, 0.0));
      float w2z = vnoise(uv2 + vec2(0.0, 0.14));
      float w3 = 0.5, w3x = 0.5, w3z = 0.5;
      if (nearWater > 0.05) {
        vec2 uv3 = wp * 0.72 + vec2(-uTime * 0.32, uTime * 0.28) * spdScale;
        w3  = vnoise(uv3);
        w3x = vnoise(uv3 + vec2(0.18, 0.0));
        w3z = vnoise(uv3 + vec2(0.0, 0.18));
      }

      float waveCalm = mix(1.0, 0.58, swampMode);
      float dHx = ((w1 - w1x) * 0.42 + (w2 - w2x) * 0.32 + (w3 - w3x) * 0.18 * nearWater) * waveCalm;
      float dHz = ((w1 - w1z) * 0.42 + (w2 - w2z) * 0.32 + (w3 - w3z) * 0.18 * nearWater) * waveCalm;
      // Add gentle concentric shoreline ripple deflection near banks
      float shoreRipple = cos(depth * 14.0 - uTime * 3.2 * spdScale + w1 * 3.5) * (1.0 - smoothstep(0.0, 1.4, depth)) * 0.08 * waveCalm;
      vec3 N = safeNormalize(vec3(dHx + shoreRipple, 1.0, dHz + shoreRipple));

      // 2. Refracted Submerged Cobblestone / Mud Bed in Shallows (skip texture fetch in deep ocean!)
      float shallowVisibility = 1.0 - smoothstep(0.05, 1.45, depth);
      vec3 submergedBedCol = vec3(0.24, 0.30, 0.26);
      if (shallowVisibility > 0.02 && oceanMode < 0.65) {
        vec2 refractUV = wp * 0.52 + N.xz * 0.28;
        float cobbleBed = texture(uMatTexArray, vec3(refractUV, 3.0)).g;
        submergedBedCol = mix(
          mix(vec3(0.32, 0.38, 0.34), vec3(0.52, 0.56, 0.48), cobbleBed),
          mix(vec3(0.17, 0.18, 0.12), vec3(0.28, 0.31, 0.20), cobbleBed),
          swampMode
        );
      }

      // Standard waters: clear jade shallows -> deep sapphire; 沉烟迷泽: misty moss-green shallow marsh -> dark olive-teal pools!
      vec3 shallowTint = mix(mix(vec3(0.20, 0.72, 0.65), vec3(0.22, 0.90, 0.82), spiritBio), vec3(0.24, 0.44, 0.34), swampMode);
      vec3 midWaterCol = mix(mix(vec3(0.08, 0.44, 0.52), vec3(0.10, 0.62, 0.66), spiritBio), vec3(0.11, 0.27, 0.23), swampMode);
      vec3 deepWaterCol = mix(mix(vec3(0.02, 0.15, 0.28), vec3(0.04, 0.28, 0.40), spiritBio), vec3(0.05, 0.14, 0.15), swampMode);

      vec3 shallowCol = mix(shallowTint, submergedBedCol * mix(vec3(0.55, 0.95, 0.88), vec3(0.76, 0.86, 0.72), swampMode), shallowVisibility * 0.58);
      vec3 waterCol = mix(shallowCol, midWaterCol, smoothstep(0.22, 1.65, depth));
      waterCol = mix(waterCol, deepWaterCol, smoothstep(1.35, 4.40, depth));

      // Boundless Deep Sea (无尽深海): turquoise coastal shallows -> rich sapphire -> abyssal indigo-navy!
      if (oceanMode > 0.01) {
        float swellBand = vnoise(wp * 0.022 + vec2(uTime * 0.055, -uTime * 0.042));
        vec3 seaShore = vec3(0.11, 0.48, 0.56);
        vec3 seaMid   = vec3(0.024, 0.145, 0.305);
        vec3 seaAbyss = vec3(0.007, 0.036, 0.105) * (0.86 + 0.28 * swellBand);
        vec3 seaCol = mix(seaShore, seaMid, smoothstep(0.6, 5.8, depth));
        seaCol = mix(seaCol, seaAbyss, smoothstep(4.8, 18.0, depth));
        waterCol = mix(waterCol, seaCol, oceanMode);
      }

      // Subtle floating marsh duckweed & misty water-surface haze veil inside 沉烟迷泽!
      if (swampMode > 0.01 && venomMode < 0.5) {
        float duckweed = smoothstep(0.68, 0.86, vnoise(wp * 0.28 + vec2(w1 * 0.4)) * 0.65 + vnoise(wp * 0.85) * 0.35);
        float nearBank = 1.0 - smoothstep(0.15, 1.45, depth);
        waterCol = mix(waterCol, vec3(0.28, 0.44, 0.22), duckweed * nearBank * 0.45 * swampMode * (1.0 - venomMode));
      }

      // Eerie Deep-Purple & Dark-Jade Glowing Toxic Mire Surface for 蚀骨毒潭 (venomMode)!
      if (venomMode > 0.01) {
        float swirl1 = vnoise(wp * 0.14 + vec2(uTime * 0.18, -uTime * 0.13) + vec2(w2 * 1.1));
        float swirl2 = vnoise(wp * 0.32 - vec2(uTime * 0.22, uTime * 0.17) + vec2(swirl1 * 1.4));
        float vPulse = 0.82 + 0.22 * sin(uTime * 2.1 + swirl1 * 5.0);
        vec3 venomShallow = vec3(0.14, 0.42, 0.24);
        vec3 venomMid     = vec3(0.22, 0.08, 0.34);
        vec3 venomDeep    = vec3(0.08, 0.03, 0.15);
        vec3 vCol = mix(venomShallow, venomMid, smoothstep(0.18, 1.25, depth));
        vCol = mix(vCol, venomDeep, smoothstep(1.15, 2.80, depth));
        // Swirling luminescent violet & toxic-emerald venom veins across the pool
        float veinMask = smoothstep(0.46, 0.84, swirl1 * 0.55 + swirl2 * 0.45);
        vec3 veinGlow = mix(vec3(0.46, 0.14, 0.72), vec3(0.16, 0.78, 0.42), smoothstep(0.25, 0.78, swirl2));
        vCol += veinGlow * veinMask * 0.56 * vPulse;
        waterCol = mix(waterCol, vCol, venomMode);
      }

      // 3. Refracted Sunlight Caustics & Spirit Spring Bioluminescence (deep ocean skips shadow & caustics!)
      float shadow = (oceanMode > 0.5 || camDistW > 240.0) ? 1.0 : calcSoftShadow(vWorldPos, vec3(0.0, 1.0, 0.0));
      float causticMask = smoothstep(0.04, 0.55, depth) * (1.0 - smoothstep(1.6, 4.2, depth)) * (1.0 - oceanMode);
      if (causticMask > 0.01 && nearWater > 0.05) {
        float causticNet = pow(smoothstep(0.42, 0.88, vnoise(uv1 * 1.85 + vec2(w2 * 1.35)) * 0.6 + w3 * 0.4), 2.2);
        waterCol += vec3(0.36, 0.96, 0.88) * causticNet * causticMask * (0.30 + spiritBio * 0.48) * (1.0 - swampMode * 0.65) * (0.35 + 0.65 * shadow);
      }

      float pulse = 0.88 + 0.16 * sin(uTime * 1.8 - length(wp - vec2(-540.0, 80.0)) * 0.12);
      waterCol += vec3(0.16, 0.86, 0.82) * spiritBio * smoothstep(0.5, 3.5, depth) * 0.52 * pulse;

      // 4. Sky Gradient & Drifting High-Cloud Reflections (天光与云影反射高光)
      vec3 R = reflect(-V, N);
      float ry = max(R.y, 0.02);
      vec3 skyRefl = mix(uSkyHorizon, uSkyTop * vec3(0.88, 0.96, 1.06), smoothstep(0.0, 0.68, ry));
      vec2 cloudReflUV = R.xz / (ry + 0.22) * 1.15 + vec2(uTime * 0.0085, uTime * 0.004);
      float cr1 = vnoise(cloudReflUV * 1.4);
      float cr2 = vnoise(cloudReflUV * 2.9 - vec2(uTime * 0.006) + vec2(cr1));
      float cloudReflMask = smoothstep(0.48, 0.78, cr1 * 0.6 + cr2 * 0.4) * smoothstep(0.02, 0.25, ry);
      vec3 cloudReflCol = mix(vec3(0.92, 0.96, 1.0), uSunColor * vec3(1.06, 1.00, 0.92), 0.50);
      skyRefl = mix(skyRefl, cloudReflCol, cloudReflMask * 0.58);

      float ndv = clamp(dot(N, V), 0.0, 1.0);
      float fresnel = 0.05 + 0.95 * pow(max(1.0 - ndv, 0.0), 4.2);
      waterCol = mix(waterCol, skyRefl, clamp(fresnel * mix(0.78, 0.64, swampMode), 0.06, 0.84));

      // Dual-lobe solar reflection: warm sun shimmer path + crisp diamond wave-crest sparkles
      vec3 H = safeNormalize(uSunDir + V);
      float ndh = clamp(dot(N, H), 0.0, 1.0);
      float sunShimmer = (pow(ndh, 42.0) * 0.38 + pow(ndh, 220.0) * 2.15) * mix(1.0, 0.52, swampMode);
      waterCol += uSunColor * sunShimmer * shadow;

      // 5. Delicate Multi-Band Shoreline Foam & Waterline Transition (细腻浅滩泡沫与泥滩水线过渡)
      float shoreZone = 1.0 - smoothstep(0.02, 0.92, depth);
      float lapWave1 = sin(depth * 15.0 - uTime * 3.1 * spdScale + w1 * 4.2 + w2 * 2.4) * 0.5 + 0.5;
      float lapWave2 = sin(depth * 26.0 - uTime * 4.2 * spdScale - w2 * 3.8) * 0.5 + 0.5;
      float foamLace = smoothstep(0.46, 0.80, lapWave1 * 0.65 + lapWave2 * 0.35 + (1.0 - smoothstep(0.0, 0.32, depth)) * 0.55);
      float shoreFoam = shoreZone * foamLace * mix(1.0, 0.55, swampMode);
      vec3 cleanFoamCol = mix(vec3(0.88, 0.97, 0.96), vec3(0.98, 1.0, 1.0), lapWave1) * mix(vec3(0.85, 0.94, 0.98), uSunColor, 0.38);
      vec3 marshFoamCol = mix(vec3(0.68, 0.78, 0.72), vec3(0.38, 0.86, 0.56), venomMode);
      waterCol = mix(waterCol, mix(cleanFoamCol, marshFoamCol, swampMode), clamp(shoreFoam * 0.84, 0.0, 0.90));

      // Drifting ethereal surface mist sheen gliding across 沉烟迷泽 & 蚀骨毒潭!
      if (swampMode > 0.01) {
        float surfMist = fbm(wp * 0.016 + vec2(uTime * 0.035, -uTime * 0.022));
        float mistVeil = smoothstep(0.36, 0.78, surfMist) * 0.34 * swampMode;
        vec3 mistTint = mix(vec3(0.72, 0.84, 0.80), vec3(0.42, 0.24, 0.58), venomMode);
        waterCol = mix(waterCol, mix(uFogColor, mistTint, 0.45), mistVeil);
      }

      waterCol = applyAerialPerspective(waterCol, vWorldPos);
      // Ultra-smooth waterline edge feathering so water blends seamlessly onto wet cobblestones & dark marsh mud!
      float edgeAlpha = smoothstep(0.0, 0.18, depth);
      float baseAlpha = edgeAlpha * (0.58 + 0.34 * smoothstep(0.15, 1.6, depth) + shoreFoam * 0.30 + fresnel * 0.24);
      float oceanAlpha = edgeAlpha * mix(0.76, 0.98, smoothstep(0.4, 3.6, depth));
      float alpha = clamp(mix(baseAlpha, oceanAlpha, oceanMode), 0.0, 0.98);
      if (alpha < 0.01) discard;
      fragColor = vec4(clamp(waterCol, vec3(0.0), vec3(8.0)), alpha);
    }
  `;

  // =========================================================
  // 7. CASCADING WATERFALL SHADER
  // =========================================================
  const WATERFALL_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec2 aUV;
    layout(location = 2) in vec3 aNormal;

    uniform mat4 uVP;
    out vec3 vWorldPos;
    out vec2 vUV;
    out vec3 vNormal;

    void main() {
      vWorldPos = aPos;
      vUV = aUV;
      vNormal = aNormal;
      gl_Position = uVP * vec4(aPos, 1.0);
    }
  `;

  const WATERFALL_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec2 vUV;
    in vec3 vNormal;

    uniform float uTime;
    out vec4 fragColor;

    ${COMMON_NOISE}
    ${COMMON_ATMO_SHADOW}

    void main() {
      vec2 uv1 = vec2(vUV.x * 5.5, vUV.y * 4.0 - uTime * 1.85);
      vec2 uv2 = vec2(vUV.x * 11.0, vUV.y * 7.5 - uTime * 2.75);
      float s1 = vnoise(uv1);
      float s2 = vnoise(uv2);
      float foam = smoothstep(0.28, 0.78, s1 * 0.62 + s2 * 0.48);

      float edgeFade = smoothstep(0.0, 0.16, vUV.x) * smoothstep(1.0, 0.84, vUV.x);
      float topCrest = 1.0 - smoothstep(0.0, 0.12, vUV.y);
      float botSplash = smoothstep(0.76, 1.0, vUV.y);
      float endFade = smoothstep(0.0, 0.03, vUV.y) * (1.0 - smoothstep(0.88, 1.0, vUV.y) * 0.55);

      vec3 waterBase = vec3(0.32, 0.80, 0.86);
      vec3 foamCol = vec3(0.95, 0.99, 1.0) * mix(vec3(0.88, 0.96, 1.0), uSunColor, 0.42);
      vec3 col = mix(waterBase, foamCol, clamp(foam + topCrest * 0.62 + botSplash * 0.52, 0.0, 1.0));

      col = applyAerialPerspective(col, vWorldPos);
      float alpha = edgeFade * endFade * (0.48 + 0.46 * foam + topCrest * 0.28);
      if (alpha < 0.02) discard;
      fragColor = vec4(clamp(col, vec3(0.0), vec3(6.0)), clamp(alpha, 0.0, 0.92));
    }
  `;

  // =========================================================
  // 8. ANALYTICAL SDF GLOWING SPIRIT FORMATION SHADER (发光灵阵)
  // =========================================================
  const FORMATION_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec2 aQuad;
    uniform mat4 uVP;
    uniform vec3 uCenter;
    uniform float uRadius;
    out vec2 vLocal;
    out vec3 vWorldPos;
    void main() {
      vLocal = aQuad;
      vec3 wp = uCenter + vec3(aQuad.x * uRadius, 0.0, aQuad.y * uRadius);
      vWorldPos = wp;
      gl_Position = uVP * vec4(wp, 1.0);
    }
  `;

  const FORMATION_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vLocal;
    in vec3 vWorldPos;

    uniform float uTime;
    uniform float uSpeed;
    uniform vec3 uColorA;
    uniform vec3 uColorB;

    out vec4 fragColor;
    ${COMMON_ATMO_SHADOW}

    mat2 rot2(float a) {
      float c = cos(a), s = sin(a);
      return mat2(c, -s, s, c);
    }

    float ring(float r, float rad, float w) {
      return smoothstep(w, w * 0.25, abs(r - rad));
    }

    float boxOutline(vec2 p, float halfSize, float w) {
      vec2 d = abs(p) - vec2(halfSize);
      float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      return smoothstep(w, w * 0.25, abs(sd));
    }

    void main() {
      float r = length(vLocal);
      if (r > 1.0) discard;

      float t = uTime * uSpeed;
      vec2 p1 = rot2(t) * vLocal;
      vec2 p2 = rot2(-t * 1.35) * vLocal;
      float ang1 = atan(p1.y, p1.x);
      float ang2 = atan(p2.y, p2.x);

      float line = 0.0;
      line += ring(r, 0.94, 0.015);
      line += ring(r, 0.87, 0.009);
      line += ring(r, 0.66, 0.013);
      line += ring(r, 0.36, 0.012);
      line += ring(r, 0.16, 0.010);

      float tickBand = smoothstep(0.875, 0.89, r) * smoothstep(0.935, 0.92, r);
      float runePattern = step(0.35, sin(ang1 * 24.0)) * step(-0.2, cos(ang1 * 8.0 + 0.4));
      line += tickBand * runePattern * 0.85;

      float sector = floor((ang2 + 3.14159265) / (6.2831853 / 8.0));
      float localA = mod(ang2 + 3.14159265, 6.2831853 / 8.0) - (3.14159265 / 8.0);
      float barWidthMask = smoothstep(0.22, 0.18, abs(localA));
      float bar1 = ring(r, 0.72, 0.011);
      float bar2 = ring(r, 0.765, 0.011);
      float bar3 = ring(r, 0.81, 0.011);
      float gap = smoothstep(0.035, 0.055, abs(localA));
      float b1 = bar1 * mix(1.0, gap, mod(sector, 2.0));
      float b2 = bar2 * mix(1.0, gap, mod(floor(sector * 0.5), 2.0));
      float b3 = bar3 * mix(1.0, gap, mod(floor(sector * 0.25), 2.0));
      line += (b1 + b2 + b3) * barWidthMask * 0.95;

      float oct1 = boxOutline(p1, 0.465, 0.011);
      float oct2 = boxOutline(rot2(0.785398) * p1, 0.465, 0.011);
      float starMask = smoothstep(0.34, 0.38, r) * smoothstep(0.68, 0.64, r);
      line += (oct1 + oct2) * starMask * 0.95;

      float spokes = smoothstep(0.024, 0.008, abs(sin(ang2 * 4.0))) * smoothstep(0.16, 0.20, r) * smoothstep(0.36, 0.33, r);
      line += spokes * 0.75;

      float pulseR = fract(uTime * 0.22);
      float wave = smoothstep(0.08, 0.0, abs(r - pulseR)) * (1.0 - pulseR) * 0.38;
      float softDisc = exp(-r * r * 3.8) * 0.20;

      float intensity = clamp(line, 0.0, 1.35) + wave + softDisc;
      if (intensity < 0.015) discard;

      float goldMix = clamp(oct1 + oct2 + (b1 + b2 + b3) * barWidthMask * 0.5, 0.0, 1.0);
      vec3 col = mix(uColorA, uColorB, goldMix * 0.72);
      float breathe = 0.88 + 0.14 * sin(uTime * 2.1);
      col *= (1.25 + line * 1.25) * breathe;

      col = applyAerialPerspective(col, vWorldPos);
      float alpha = clamp(intensity * 0.86, 0.0, 0.94) * (1.0 - smoothstep(0.95, 1.0, r));
      fragColor = vec4(clamp(col, vec3(0.0), vec3(6.0)), alpha);
    }
  `;

  // =========================================================
  // 9. RISING SPIRIT AURA LIGHT CURTAIN
  // =========================================================
  const AURA_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec2 aUV;
    uniform mat4 uVP;
    uniform vec3 uCenter;
    uniform float uRadius;
    uniform float uHeight;
    out vec2 vUV;
    out vec3 vWorldPos;
    void main() {
      vec3 wp = uCenter + vec3(aPos.x * uRadius, aPos.y * uHeight, aPos.z * uRadius);
      vWorldPos = wp;
      vUV = aUV;
      gl_Position = uVP * vec4(wp, 1.0);
    }
  `;

  const AURA_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vUV;
    in vec3 vWorldPos;
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uCenter;
    uniform vec3 uCameraPos;
    out vec4 fragColor;
    ${COMMON_NOISE}

    void main() {
      float n1 = vnoise(vec2(vUV.x * 16.0 + uTime * 0.18, vUV.y * 2.4 - uTime * 0.55));
      float n2 = vnoise(vec2(vUV.x * 32.0 - uTime * 0.12, vUV.y * 4.0 - uTime * 0.85));
      float streaks = smoothstep(0.42, 0.84, n1 * 0.65 + n2 * 0.45);
      float vFade = smoothstep(0.0, 0.16, vUV.y) * pow(max(1.0 - vUV.y, 0.0), 2.2);

      // Soft grazing Fresnel edge fade so cylinder silhouettes dissolve invisibly into air!
      vec3 cylN = normalize(vec3(vWorldPos.x - uCenter.x, 0.0001, vWorldPos.z - uCenter.z));
      vec3 viewV = normalize(uCameraPos - vWorldPos);
      float edgeSoft = pow(clamp(abs(dot(cylN, viewV)), 0.0, 1.0), 1.65);

      float alpha = streaks * vFade * edgeSoft * 0.18;
      if (alpha < 0.005) discard;
      vec3 col = uColorA * (1.15 + streaks * 0.65);
      fragColor = vec4(clamp(col, vec3(0.0), vec3(4.0)), alpha);
    }
  `;

  // =========================================================
  // 10. SEA OF CLOUDS & VOLUMETRIC CLOUD PUFF SHADERS
  // =========================================================
  const CLOUD_SEA_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec2 aUV;
    layout(location = 2) in float aLayer;

    uniform mat4 uVP;
    uniform float uTime;
    out vec3 vWorldPos;
    out float vLayer;

    void main() {
      vec3 p = aPos;
      p.y += sin(p.x * 0.008 + uTime * 0.28 + aLayer * 2.0) * 2.4 + cos(p.z * 0.009 - uTime * 0.22) * 2.0;
      vWorldPos = p;
      vLayer = aLayer;
      gl_Position = uVP * vec4(p, 1.0);
    }
  `;

  const CLOUD_SEA_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in float vLayer;

    uniform float uTime;
    out vec4 fragColor;
    ${COMMON_NOISE}
    ${COMMON_ATMO_SHADOW}

    void main() {
      float boxDist = max(abs(vWorldPos.x), abs(vWorldPos.z));
      float distFromOrigin = length(vWorldPos.xz);
      float radialMask;
      if (vLayer < 0.5) {
        // Keep low cloud sea strictly outside the ±9200m playable continent square (no phantom layer over corners!)
        radialMask = smoothstep(8650.0, 10200.0, boxDist);
        // Dreamy cloud sea drifting behind Northern Sect Peak & Floating Islands!
        float northAbyss = smoothstep(-520.0, -760.0, vWorldPos.z) * (1.0 - smoothstep(220.0, 440.0, abs(vWorldPos.x + 60.0)));
        radialMask = max(radialMask, northAbyss * 0.72);
      } else {
        float islBelt = smoothstep(-320.0, -560.0, vWorldPos.z) * 0.62 + smoothstep(8800.0, 10400.0, boxDist) * 0.78;
        radialMask = clamp(islBelt, 0.0, 0.76);
      }

      float outerFade = 1.0 - smoothstep(16500.0, 22500.0, distFromOrigin);
      // Early discard BEFORE running two 4-octave FBM noise chains (eliminates ~85% wasted cloud-sea fragment shading!)
      if (radialMask * outerFade < 0.02) discard;

      vec2 uv = vWorldPos.xz * (vLayer < 0.5 ? 0.0018 : 0.0026);
      vec2 drift = vec2(uTime * 0.010, uTime * 0.005);
      float f1 = fbm(uv + drift);
      float f2 = fbm(uv * 2.1 - drift * 0.8 + vec2(f1 * 0.9));
      float density = smoothstep(0.38, 0.75, f1 * 0.6 + f2 * 0.5);

      float alpha = density * radialMask * outerFade * (vLayer < 0.5 ? 0.74 : 0.40);
      if (alpha < 0.015) discard;

      vec3 V = safeNormalize(vWorldPos - uCameraPos);
      float sunForward = pow(clamp(dot(V, uSunDir), 0.0, 1.0), 4.0);
      vec3 topCol = mix(vec3(0.95, 0.97, 1.0), uSunColor * vec3(1.06, 1.00, 0.94), 0.48 + 0.36 * sunForward);
      vec3 shadeCol = mix(uFogColor * 0.78, uSkyHorizon * 0.82, 0.45);
      vec3 col = mix(shadeCol, topCol, smoothstep(0.32, 0.76, f2));

      col = applyAerialPerspective(col, vWorldPos);
      fragColor = vec4(clamp(col, vec3(0.0), vec3(6.0)), alpha);
    }
  `;

  const CLOUD_PUFF_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec3 aNormal;
    layout(location = 2) in vec4 iPosSpeed;
    layout(location = 3) in vec4 iScalePhase;

    uniform mat4 uVP;
    uniform vec3 uCameraPos;
    uniform float uTime;
    uniform float uPropCullDist;

    out vec3 vWorldPos;
    out vec3 vNormal;
    out float vLocalY;

    void main() {
      vec3 center = iPosSpeed.xyz;
      float maxDist = uPropCullDist > 100.0 ? (uPropCullDist * 1.15) : 11000.0;
      float cDist = length(center - uCameraPos);
      float cullScale = 1.0 - smoothstep(maxDist * 0.82, maxDist, cDist);
      vec4 clipCP = uVP * vec4(center, 1.0);
      float padCP = max(iScalePhase.x, max(iScalePhase.y, iScalePhase.z)) * 1.8 + 20.0;
      if (cullScale <= 0.005 || clipCP.w < -padCP || abs(clipCP.x) > clipCP.w * 1.18 + padCP || abs(clipCP.y) > clipCP.w * 1.22 + padCP) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vWorldPos = center;
        vNormal = vec3(0.0, 1.0, 0.0);
        vLocalY = 0.0;
        return;
      }
      center.x += sin(uTime * 0.06 * iPosSpeed.w + iScalePhase.w) * 18.0;
      center.y += cos(uTime * 0.14 + iScalePhase.w) * 1.4;
      vec3 worldPos = center + aPos * (iScalePhase.xyz * cullScale);
      vWorldPos = worldPos;
      vec3 sn = aNormal / max(iScalePhase.xyz, vec3(0.1));
      vNormal = length(sn) > 1e-4 ? normalize(sn) : vec3(0.0, 1.0, 0.0);
      vLocalY = aPos.y;
      gl_Position = uVP * vec4(worldPos, 1.0);
    }
  `;

  const CLOUD_PUFF_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec3 vNormal;
    in float vLocalY;

    uniform float uTime;
    out vec4 fragColor;
    ${COMMON_NOISE}
    ${COMMON_ATMO_SHADOW}

    void main() {
      vec3 N = safeNormalize(vNormal);
      vec3 V = safeNormalize(uCameraPos - vWorldPos);
      float ndl = dot(N, uSunDir) * 0.5 + 0.5;
      float up = smoothstep(-0.5, 0.65, vLocalY);

      vec3 shade = mix(uFogColor * 0.78, uShadowTint * 1.25, 0.35);
      vec3 lit = mix(vec3(0.95, 0.97, 1.0), uSunColor * vec3(1.06, 1.02, 0.96), 0.50);
      vec3 col = mix(shade, lit, clamp(up * 0.65 + ndl * 0.45, 0.0, 1.0));

      float ndvAbs = clamp(abs(dot(N, V)), 0.0, 1.0);
      float backLight = pow(clamp(dot(-V, uSunDir), 0.0, 1.0), 4.0) * max(1.0 - ndvAbs, 0.0);
      col += uSunColor * backLight * 0.36;

      // Organic FBM wisp dissolution so cloud puffs feather effortlessly into air with zero elliptical edge!
      float wisp = fbm(vWorldPos.xz * 0.042 + vec2(uTime * 0.014, vWorldPos.y * 0.03));
      float softEdge = smoothstep(0.14, 0.88, ndvAbs * (0.68 + 0.58 * wisp));
      float alpha = softEdge * softEdge * 0.54;
      if (alpha < 0.015) discard;

      col = applyAerialPerspective(col, vWorldPos);
      fragColor = vec4(clamp(col, vec3(0.0), vec3(6.0)), alpha);
    }
  `;

  // =========================================================
  // 11. LIVING PARTICLES SHADER (Spirit Motes, Peach Petals, Waterfall Mist)
  // =========================================================
  const PARTICLE_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec2 aCorner;
    layout(location = 1) in vec4 iPosSize;
    layout(location = 2) in vec4 iColSpeed;
    layout(location = 3) in vec2 iPhaseKind;

    uniform mat4 uVP;
    uniform vec3 uCameraPos;
    uniform vec3 uCamRight;
    uniform vec3 uCamUp;
    uniform float uTime;
    uniform float uPropCullDist;

    out vec2 vCorner;
    out vec3 vColor;
    out float vKind;
    out float vAlpha;
    out vec3 vWorldPos;

    void main() {
      float kind = iPhaseKind.y;
      float phase = iPhaseKind.x;
      float spd = iColSpeed.w;
      vec3 pos = iPosSize.xyz;
      float maxDist = uPropCullDist > 100.0 ? (uPropCullDist * 0.85) : 6500.0;
      float initDist = length(pos - uCameraPos);
      vec4 clipP = uVP * vec4(pos, 1.0);
      float padP = iPosSize.w * 2.5 + 28.0;
      if (initDist > maxDist || clipP.w < -padP || abs(clipP.x) > clipP.w * 1.20 + padP || abs(clipP.y) > clipP.w * 1.25 + padP) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = aCorner;
        vColor = vec3(0.0);
        vKind = kind;
        vAlpha = 0.0;
        vWorldPos = pos;
        return;
      }
      float sz = iPosSize.w;
      float alpha = 1.0;

      if (kind < 0.5) {
        float cycle = fract(uTime * 0.065 * spd + phase / 6.28318);
        pos.y += cycle * 16.0;
        pos.x += sin(uTime * 0.85 * spd + phase) * 1.8;
        pos.z += cos(uTime * 0.78 * spd + phase) * 1.8;
        alpha = sin(cycle * 3.14159) * (0.72 + 0.28 * sin(uTime * 3.2 + phase));
      } else if (kind < 1.5) {
        float cycle = fract(uTime * 0.07 * spd + phase / 6.28318);
        pos.y -= cycle * 14.0;
        pos.x += cycle * 10.0 + sin(uTime * 1.8 + phase) * 1.4;
        pos.z += cycle * 5.0 + cos(uTime * 1.5 + phase) * 1.2;
        alpha = sin(cycle * 3.14159);
      } else if (kind < 2.5) {
        float cycle = fract(uTime * 0.14 * spd + phase / 6.28318);
        pos.y += cycle * 10.5;
        pos.x += sin(uTime * 0.4 + phase) * 2.5 * cycle;
        pos.z += cos(uTime * 0.4 + phase) * 2.5 * cycle;
        sz *= (0.65 + cycle * 0.90);
        alpha = sin(cycle * 3.14159) * 0.28;
      } else if (kind < 3.5) {
        // Lightweight ground-hugging drifting desert sand / dust veil (流沙荒漠贴地扬沙)
        float cycle = fract(uTime * 0.11 * spd + phase / 6.28318);
        pos.x += (cycle - 0.5) * 64.0 * 0.76;
        pos.z += (cycle - 0.5) * 64.0 * 0.65;
        pos.y += sin(cycle * 6.28318 + phase) * 1.15 + cycle * 1.8;
        sz *= (0.80 + cycle * 0.55);
        alpha = sin(cycle * 3.14159) * 0.16;
      } else {
        // Lightweight slowly drifting snowflakes across 霜雪原 (缓慢飘落雪花粒子, kind = 4.0)
        float cycle = fract(uTime * 0.048 * spd + phase / 6.28318);
        pos.y -= cycle * 32.0;
        pos.x += sin(uTime * 0.65 + phase) * 3.8 + cycle * 6.5;
        pos.z += cos(uTime * 0.58 + phase) * 3.2 + cycle * 3.5;
        alpha = sin(cycle * 3.14159) * 0.82;
      }

      // Smoothly fade particles that pass too close to the camera lens (no giant blurry foreground blobs!)
      float camDist = length(pos - uCameraPos);
      float nearFade = (kind < 1.5 || kind >= 3.5) ? smoothstep(2.8, 9.5, camDist) : smoothstep(6.0, 18.0, camDist);
      alpha *= nearFade;

      vec2 cornerScale = (kind >= 2.5 && kind < 3.5) ? vec2(1.85, 0.42) : vec2(1.0, 1.0);
      vec3 wp = pos + (uCamRight * aCorner.x * cornerScale.x + uCamUp * aCorner.y * cornerScale.y) * sz;
      vCorner = aCorner;
      vColor = iColSpeed.rgb;
      vKind = kind;
      vAlpha = alpha;
      vWorldPos = wp;

      gl_Position = uVP * vec4(wp, 1.0);
    }
  `;

  const PARTICLE_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vCorner;
    in vec3 vColor;
    in float vKind;
    in float vAlpha;
    in vec3 vWorldPos;

    out vec4 fragColor;
    ${COMMON_ATMO_SHADOW}

    void main() {
      if (vAlpha < 0.01) discard;
      float r2 = dot(vCorner, vCorner);
      if (r2 > 1.0) discard;

      if (vKind < 0.5) {
        float core = exp(-r2 * 6.5);
        float halo = exp(-r2 * 2.2) * 0.35;
        vec3 col = vColor * (1.45 + core * 2.0);
        fragColor = vec4(clamp(col, vec3(0.0), vec3(6.0)), (core + halo) * vAlpha);
      } else if (vKind < 1.5) {
        vec2 p = vCorner * vec2(1.0, 1.55);
        float mask = smoothstep(0.95, 0.55, dot(p, p));
        if (mask < 0.05) discard;
        vec3 col = applyAerialPerspective(vColor * (uSunColor * 0.72 + vec3(0.28)), vWorldPos);
        fragColor = vec4(clamp(col, vec3(0.0), vec3(4.0)), mask * vAlpha * 0.90);
      } else if (vKind < 3.5) {
        float mist = pow(max(1.0 - r2, 0.0), 2.2);
        vec3 col = applyAerialPerspective(vColor * mix(uFogColor, vec3(1.0), 0.50), vWorldPos);
        fragColor = vec4(clamp(col, vec3(0.0), vec3(4.0)), mist * vAlpha);
      } else {
        // Crisp soft crystalline snowflake (雪花粒子)
        float flake = smoothstep(1.0, 0.18, r2);
        vec3 col = applyAerialPerspective(vColor * mix(vec3(0.92, 0.97, 1.0), uSunColor, 0.28), vWorldPos);
        fragColor = vec4(clamp(col, vec3(0.0), vec3(4.0)), flake * vAlpha);
      }
    }
  `;

  // =========================================================
  // 12. ANIMATED WHITE CRANES SHADER
  // =========================================================
  const CRANE_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec3 aNormal;
    layout(location = 2) in vec3 aColor;
    layout(location = 3) in float aWingWeight;

    uniform mat4 uVP;
    uniform mat4 uModel;
    uniform float uFlapPhase;

    out vec3 vWorldPos;
    out vec3 vNormal;
    out vec3 vColor;

    void main() {
      vec3 p = aPos;
      float beat = sin(uFlapPhase);
      p.y += beat * 0.78 * aWingWeight * aWingWeight;
      p.x *= (1.0 - abs(beat) * 0.08 * aWingWeight);

      vec4 wp = uModel * vec4(p, 1.0);
      vWorldPos = wp.xyz;
      vec3 mn = mat3(uModel) * aNormal;
      vNormal = length(mn) > 1e-4 ? normalize(mn) : vec3(0.0, 1.0, 0.0);
      vColor = aColor;
      gl_Position = uVP * wp;
    }
  `;

  const CRANE_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec3 vNormal;
    in vec3 vColor;
    out vec4 fragColor;
    ${COMMON_ATMO_SHADOW}

    void main() {
      vec3 N = safeNormalize(vNormal);
      vec3 V = safeNormalize(uCameraPos - vWorldPos);
      vec3 col = shadeStylizedSurface(vColor, N, V, 1.0, 0.55, 1.0);
      col = applyAerialPerspective(col, vWorldPos);
      fragColor = vec4(clamp(col, vec3(0.0), vec3(6.0)), 1.0);
    }
  `;

  // =========================================================
  // 13. SHADOW MAP DEPTH PASS SHADERS
  // =========================================================
  const SHADOW_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    uniform mat4 uLightVP;
    void main() {
      gl_Position = uLightVP * vec4(aPos, 1.0);
    }
  `;

  const SHADOW_CANOPY_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 3) in vec3 iPos;
    layout(location = 4) in vec3 iScale;
    uniform mat4 uLightVP;
    uniform vec3 uShadowCenter;
    uniform float uShadowSpan;
    void main() {
      vec2 d = iPos.xz - uShadowCenter.xz;
      float lim = uShadowSpan * 1.12;
      if (abs(d.x) > lim || abs(d.y) > lim) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
      }
      gl_Position = uLightVP * vec4(iPos + aPos * iScale, 1.0);
    }
  `;

  const SHADOW_BOULDER_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 2) in vec4 iPosRot;
    layout(location = 3) in vec4 iScaleTint;
    uniform mat4 uLightVP;
    uniform vec3 uShadowCenter;
    uniform float uShadowSpan;
    void main() {
      vec2 d = iPosRot.xz - uShadowCenter.xz;
      float lim = uShadowSpan * 1.12;
      if (abs(d.x) > lim || abs(d.y) > lim) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
      }
      float c = cos(iPosRot.w), s = sin(iPosRot.w);
      vec3 lp = aPos * iScaleTint.xyz;
      vec3 rp = vec3(lp.x * c - lp.z * s, lp.y, lp.x * s + lp.z * c);
      gl_Position = uLightVP * vec4(iPosRot.xyz + rp, 1.0);
    }
  `;

  const SHADOW_FS = /* glsl */ `#version 300 es
    precision mediump float;
    void main() {}
  `;

  // =========================================================
  // 14. HDR POST-PROCESSING (NaN-Sanitized Restrained Bloom + ACES Filmic!)
  // =========================================================
  const QUAD_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec2 aPos;
    out vec2 vUV;
    void main() {
      vUV = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const BRIGHT_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vUV;
    uniform sampler2D uSceneTex;
    uniform float uThreshold;
    uniform float uKnee;
    out vec4 fragColor;

    void main() {
      vec3 c = texture(uSceneTex, vUV).rgb;
      if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
      c = clamp(c, vec3(0.0), vec3(8.0));

      float br = max(c.r, max(c.g, c.b));
      float rq = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
      rq = (rq * rq) / (4.0 * uKnee + 0.0001);
      float weight = max(rq, br - uThreshold) / max(br, 0.0001);
      fragColor = vec4(c * max(weight, 0.0), 1.0);
    }
  `;

  const BLUR_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vUV;
    uniform sampler2D uTex;
    uniform vec2 uDir;
    out vec4 fragColor;

    vec3 safeTex(vec2 uv) {
      vec3 c = texture(uTex, uv).rgb;
      return (any(isnan(c)) || any(isinf(c))) ? vec3(0.0) : max(c, vec3(0.0));
    }

    void main() {
      vec3 sum = safeTex(vUV) * 0.227027;
      sum += (safeTex(vUV + uDir * 1.384615) + safeTex(vUV - uDir * 1.384615)) * 0.316216;
      sum += (safeTex(vUV + uDir * 3.230769) + safeTex(vUV - uDir * 3.230769)) * 0.070270;
      fragColor = vec4(sum, 1.0);
    }
  `;

  const COMPOSITE_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vUV;
    uniform sampler2D uSceneTex;
    uniform sampler2D uBloomTex1;
    uniform sampler2D uBloomTex2;
    uniform float uExposure;
    uniform float uBloomStrength;
    out vec4 fragColor;

    vec3 acesFilmic(vec3 x) {
      const float a = 2.51;
      const float b = 0.03;
      const float c = 2.43;
      const float d = 0.59;
      const float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    void main() {
      vec3 hdr = texture(uSceneTex, vUV).rgb;
      if (any(isnan(hdr)) || any(isinf(hdr))) hdr = vec3(0.0);
      vec3 b1 = texture(uBloomTex1, vUV).rgb;
      vec3 b2 = texture(uBloomTex2, vUV).rgb;
      if (any(isnan(b1)) || any(isinf(b1))) b1 = vec3(0.0);
      if (any(isnan(b2)) || any(isinf(b2))) b2 = vec3(0.0);

      vec3 bloom = b1 * 0.45 + b2 * 0.55;
      vec3 col = max(hdr, vec3(0.0)) + max(bloom, vec3(0.0)) * uBloomStrength;
      col *= uExposure;

      // ACES Filmic Tone Mapping
      col = acesFilmic(col);

      // Breath-of-the-Wild crispness: subtle S-curve contrast & natural vibrancy
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.14);
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, 1.18);

      // Ultra-subtle cinematic edge vignette
      vec2 vc = vUV - 0.5;
      float vig = 1.0 - dot(vc, vc) * 0.24;
      col *= vig;

      // Linear -> sRGB gamma
      col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
      fragColor = vec4(col, 1.0);
    }
  `;

  // =========================================================
  // 15. PROTAGONIST CHARACTER GPU-SKINNED SHADER (Pure-Code 20-Bone Smooth Clay Mannequin!)
  // =========================================================
  const CHARACTER_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec3 aNormal;
    layout(location = 2) in vec3 aColor;
    layout(location = 3) in vec3 aMat;     // x=rough, y=emissive, z=aoHint
    layout(location = 4) in vec4 aJoints;  // 4 bone indices
    layout(location = 5) in vec4 aWeights; // 4 bone weights

    uniform mat4 uVP;
    uniform mat4 uBones[20];

    out vec3 vWorldPos;
    out vec3 vNormal;
    out vec3 vColor;
    out vec3 vMat;

    void main() {
      int j0 = clamp(int(aJoints.x + 0.5), 0, 19);
      int j1 = clamp(int(aJoints.y + 0.5), 0, 19);
      int j2 = clamp(int(aJoints.z + 0.5), 0, 19);
      int j3 = clamp(int(aJoints.w + 0.5), 0, 19);
      float wSum = aWeights.x + aWeights.y + aWeights.z + aWeights.w;
      vec4 w = wSum > 1e-5 ? (aWeights / wSum) : vec4(1.0, 0.0, 0.0, 0.0);

      mat4 skin =
        uBones[j0] * w.x +
        uBones[j1] * w.y +
        uBones[j2] * w.z +
        uBones[j3] * w.w;

      vec4 wp = skin * vec4(aPos, 1.0);
      vec3 wn = mat3(skin) * aNormal;

      vWorldPos = wp.xyz;
      vNormal = length(wn) > 1e-5 ? normalize(wn) : vec3(0.0, 1.0, 0.0);
      vColor = aColor;
      vMat = aMat;

      gl_Position = uVP * wp;
    }
  `;

  const SHADOW_CHARACTER_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 4) in vec4 aJoints;
    layout(location = 5) in vec4 aWeights;

    uniform mat4 uLightVP;
    uniform mat4 uBones[20];

    void main() {
      int j0 = clamp(int(aJoints.x + 0.5), 0, 19);
      int j1 = clamp(int(aJoints.y + 0.5), 0, 19);
      int j2 = clamp(int(aJoints.z + 0.5), 0, 19);
      int j3 = clamp(int(aJoints.w + 0.5), 0, 19);
      float wSum = aWeights.x + aWeights.y + aWeights.z + aWeights.w;
      vec4 w = wSum > 1e-5 ? (aWeights / wSum) : vec4(1.0, 0.0, 0.0, 0.0);

      mat4 skin =
        uBones[j0] * w.x +
        uBones[j1] * w.y +
        uBones[j2] * w.z +
        uBones[j3] * w.w;
      gl_Position = uLightVP * (skin * vec4(aPos, 1.0));
    }
  `;

  const CHARACTER_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec3 vNormal;
    in vec3 vColor;
    in vec3 vMat;

    out vec4 fragColor;
    ${COMMON_ATMO_SHADOW}

    void main() {
      vec3 N = safeNormalize(vNormal);
      if (!gl_FrontFacing) N = -N;
      vec3 V = safeNormalize(uCameraPos - vWorldPos);
      vec3 H = safeNormalize(uSunDir + V);
      float ndv = clamp(dot(N, V), 0.0, 1.0);
      float ndl = dot(N, uSunDir);

      // Pure solid matte-clay porcelain shading (Human: Fall Flat clean sculptural smoothness!)
      vec3 baseCol = vColor;
      float ao = clamp(vMat.z, 0.72, 1.0);
      float shadow = mix(0.42, 1.0, calcSoftShadow(vWorldPos, N));

      // Silky wrap diffuse so every smooth anatomical contour reads clearly without harsh aliasing
      float wrapDiff = clamp((ndl + 0.34) / 1.34, 0.0, 1.0);
      float softBand = smoothstep(0.0, 1.0, wrapDiff);
      vec3 directLight = uSunColor * (softBand * shadow * 0.88);

      // Smooth dual-hemisphere sky + warm ground bounce ambient
      vec3 skyAmb = mix(uShadowTint * 0.72 + vec3(0.16), uSkyHorizon * 0.58 + vec3(0.32), N.y * 0.5 + 0.5);
      vec3 groundBounce = vec3(0.24, 0.28, 0.25) * clamp(-N.y * 0.5 + 0.5, 0.0, 1.0) * 0.30;
      vec3 col = baseCol * (skyAmb * 0.58 + groundBounce + directLight) * ao;

      // Subtle broad clay-satin specular highlight
      float spec = pow(clamp(dot(N, H), 0.0, 1.0), 22.0) * (1.0 - vMat.x * 0.5) * 0.14 * shadow;
      col += uSunColor * spec;

      // Clean delicate silhouette rim light (separates clay mannequin smoothly from grass, forest & snow!)
      float fres = pow(1.0 - ndv, 2.8);
      vec3 rimCol = mix(uSkyHorizon * 0.75 + vec3(0.18), uSunColor, 0.45);
      col += rimCol * fres * (0.18 + 0.14 * clamp(ndl * 0.5 + 0.5, 0.0, 1.0));

      // Subtle dark contour depth cue right at extreme grazing edges for ultra-crisp silhouette readability even on white snow!
      float outlineHint = smoothstep(0.24, 0.02, ndv) * 0.18;
      col *= (1.0 - outlineHint);

      col += baseCol * vMat.y;
      col = applyAerialPerspective(col, vWorldPos);
      fragColor = vec4(clamp(col, vec3(0.0), vec3(6.0)), 1.0);
    }
  `;

  // =========================================================
  // 16. QI-REFINING MONSTER SHADER (Procedural Articulation + Shadow Pass + Restrained Qi Glow!)
  // =========================================================
  const MONSTER_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec3 aNormal;
    layout(location = 2) in vec3 aColor;
    layout(location = 3) in vec3 aMeta; // x=rough, y=emissive, z=partId (0..6)

    uniform mat4 uVP;
    uniform mat4 uModel;
    uniform vec4 uAnim;   // x=animPhase, y=moveBlend, z=attackProgress, w=chargeGlow
    uniform float uSpecId;

    out vec3 vWorldPos;
    out vec3 vNormal;
    out vec3 vColor;
    out vec3 vMeta;

    void main() {
      vec3 p = aPos;
      vec3 n = aNormal;
      float ph = uAnim.x;
      float mv = uAnim.y;
      float atk = uAnim.z;
      float partId = aMeta.z;

      bool isBird        = (uSpecId > 4.5 && uSpecId < 5.5) || (uSpecId > 15.5 && uSpecId < 16.5);
      bool isScorpion    = (uSpecId > 5.5 && uSpecId < 6.5) || (uSpecId > 16.5 && uSpecId < 17.5);
      bool isMonolith    = (uSpecId > 10.5 && uSpecId < 11.5); // 镇道符傀
      bool isSnowSp      = (uSpecId > 12.5 && uSpecId < 13.5); // 寒魄雪灵
      bool isSwordWraith = (uSpecId > 18.5 && uSpecId < 19.5); // 古剑灵卫
      bool isSwampFrog   = (uSpecId > 14.5 && uSpecId < 15.5); // 沼泽毒蛙精
      bool isRigid       = isMonolith || isSwordWraith || (uSpecId > 3.5 && uSpecId < 4.5) || (uSpecId > 7.5 && uSpecId < 8.5) || (uSpecId > 9.5 && uSpecId < 10.5);

      // Subtle squash/stretch + bouncy hop for organic beasts; smooth levitation for hovering constructs/spirits
      if (isMonolith || isSnowSp || isSwordWraith) {
        p.y += sin(ph * 0.72) * 0.085;
        if (isSnowSp && partId < 0.5) {
          // Gentle swirling snow-mist robe twist
          float tw = sin(ph * 0.9 - p.y * 1.4) * 0.14 * max(0.0, 1.4 - p.y);
          float cT = cos(tw), sT = sin(tw);
          p.xz = mat2(cT, -sT, sT, cT) * p.xz;
          n.xz = mat2(cT, -sT, sT, cT) * n.xz;
        }
        p.z += atk * 0.14;
      } else {
        float breath = sin(ph * 0.85) * (isRigid ? 0.012 : 0.032);
        float hop = abs(sin(ph)) * mv * (isBird ? 0.08 : (isRigid ? 0.07 : 0.15));
        float sqY = 1.0 + breath + hop * 0.28 - atk * (isRigid ? 0.04 : 0.11);
        float sqXZ = 1.0 / sqrt(max(0.78, sqY));
        p.x *= sqXZ;
        p.z *= sqXZ;
        p.y = p.y * sqY + hop * 0.45;
        p.z += atk * 0.18;
      }

      if (partId > 0.5 && partId < 2.5) {
        // Left (1) & Right (2): wings, ears, stone/tree/armored arms, halberd, pincers, floating guardian blocks
        float side = partId < 1.5 ? -1.0 : 1.0;
        if (isBird) {
          float flap = sin(ph * 1.45) * 0.42;
          float span = max(0.0, abs(p.x) - 0.24);
          p.y += flap * span * 1.15;
          p.z -= abs(flap) * span * 0.18;
        } else if (isMonolith) {
          // 镇道符傀: floating detached stone shoulder blocks bob & converge on attack
          p.y += sin(ph * 1.15 + side * 1.57) * 0.14;
          p.z += atk * 0.36;
        } else if ((uSpecId > 9.5 && uSpecId < 10.5) || isSwordWraith) {
          // 残甲阵兵 & 古剑灵卫: armored arms & weapon overhead/forward cleave!
          float sw = sin(ph) * mv * 0.18 * side;
          float cleave = (partId > 1.5) ? (atk * 0.55) : (-atk * 0.18);
          p.y += (sw * 0.30 + cleave * 0.35) * max(0.0, p.y - 0.55);
          p.z += (sw * 0.55 + cleave * 0.75);
        } else if ((uSpecId > 3.5 && uSpecId < 4.5) || (uSpecId > 7.5 && uSpecId < 8.5) || isSwampFrog) {
          // 山岩小石灵, 青藤树妖 & 沼泽毒蛙精: heavy arm swing + slam raise
          float sw = sin(ph) * mv * 0.22 * side + atk * 0.34;
          p.y += sw * 0.38;
          p.z += sw * 0.56;
        } else if (uSpecId > 0.5 && uSpecId < 1.5) {
          // 赤尾野兔妖: expressive ear wiggle & lay-back on windup
          float earBob = sin(ph * 1.3 + side * 0.6) * (0.04 + mv * 0.08);
          p.z -= atk * 0.22 * max(0.0, p.y - 0.95);
          p.x += earBob * side * max(0.0, p.y - 0.95);
        } else if (isScorpion) {
          // 沙蝎幼兽 & 沙地赤蝎: snappy front pincers
          float snap = sin(ph * 1.6) * 0.05 + atk * 0.18;
          p.z += snap;
          p.x -= side * snap * 0.45;
        } else if (uSpecId > 6.5 && uSpecId < 7.5) {
          // 滚沙仙人掌精: cute little waving side cactus arms
          p.y += sin(ph * 1.4 + side) * 0.08 + atk * 0.12;
        }
      } else if (partId > 2.5 && partId < 3.5) {
        // Part 3: Orbiting array ring (镇道符傀), orbiting prisms (寒魄雪灵), floating swords & array halo (古剑灵卫), canopy, tails, leaves
        if (isMonolith) {
          // Continuous rotating dark-gold array ring orbiting the stone monolith!
          float ang = ph * 0.68 + atk * 1.8;
          float cR = cos(ang), sR = sin(ang);
          p.xz = mat2(cR, -sR, sR, cR) * p.xz;
          n.xz = mat2(cR, -sR, sR, cR) * n.xz;
        } else if (isSnowSp || isSwordWraith) {
          // 寒魄雪灵 & 古剑灵卫: orbiting ice prisms / ghostly-blue sword shadows & sword-array halo spinning gracefully!
          float ang = ph * (isSwordWraith ? 0.85 : 0.95) + atk * 2.4;
          float cR = cos(ang), sR = sin(ang);
          p.xz = mat2(cR, -sR, sR, cR) * p.xz;
          n.xz = mat2(cR, -sR, sR, cR) * n.xz;
          p.y += sin(ph * 1.6 + atan(p.z, p.x) * 3.0) * 0.08;
        } else if (isBird) {
          float tailD = max(0.0, -p.z - 0.50);
          p.x += sin(ph * 1.1 - tailD * 3.2) * 0.14 * tailD;
          p.y += cos(ph * 0.9 - tailD * 2.8) * 0.10 * tailD;
        } else if (isScorpion) {
          p.z += atk * 0.36 * max(0.0, p.y - 0.35);
          p.y += sin(ph) * 0.04;
        } else if (uSpecId > 7.5 && uSpecId < 8.5) {
          // 青藤树妖: lush crown gentle wind sway
          float sway = sin(ph * 0.75) * 0.08;
          p.x += sway * max(0.0, p.y - 1.3);
          p.z += cos(ph * 0.65) * 0.05 * max(0.0, p.y - 1.3);
        } else {
          // Leaves / tails / electric mane / antler leaves / fluffy fox tail sway
          float sway = sin(ph * 1.2) * (0.06 + mv * 0.09);
          p.x += sway * max(0.2, p.y);
          p.z += cos(ph * 1.0) * 0.04;
        }
      } else if (partId > 3.5 && partId < 4.5) {
        // Part 4: Pulsing glowing organs/runes/crystals/talismans/ice spikes/poison pustules
        if (isSwampFrog) {
          // 沼泽毒蛙精: throbbing dark-green dorsal poison pustules!
          float throb = sin(ph * 2.6 + p.x * 5.0 + p.z * 4.0) * 0.022 + atk * 0.036;
          p += n * throb;
        } else if (isMonolith || isSnowSp || (uSpecId > 7.5)) {
          // Keep Foundation-Establishment & Elite glowing runes, talismans, soul fire & crystal spikes structurally crisp (tiny shiver on charge)
          p.y += sin(ph * 2.2) * 0.015 * (0.4 + atk);
        } else {
          float pulse = 1.0 + sin(ph * 1.7 + p.x * 4.0) * 0.08 + atk * 0.18;
          p = mix(vec3(0.0, 0.58, 0.25), p, pulse);
        }
      } else if (partId > 4.5) {
        // Part 5 (left legs) & 6 (right legs): alternating stride!
        float side = partId < 5.5 ? -1.0 : 1.0;
        float stride = sin(ph) * mv * 0.22 * side;
        p.z += stride;
        p.y += max(0.0, stride * 0.35);
      }

      vec4 wp = uModel * vec4(p, 1.0);
      vec3 wn = mat3(uModel) * n;

      vWorldPos = wp.xyz;
      vNormal = length(wn) > 1e-5 ? normalize(wn) : vec3(0.0, 1.0, 0.0);
      vColor = aColor;
      vMeta = aMeta;
      gl_Position = uVP * wp;
    }
  `;

  const SHADOW_MONSTER_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    uniform mat4 uLightVP;
    uniform mat4 uModel;
    void main() {
      gl_Position = uLightVP * (uModel * vec4(aPos, 1.0));
    }
  `;

  const MONSTER_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec3 vNormal;
    in vec3 vColor;
    in vec3 vMeta;

    uniform vec4 uAnim;
    uniform vec3 uChargeColor;

    out vec4 fragColor;
    ${COMMON_ATMO_SHADOW}

    void main() {
      vec3 N = safeNormalize(vNormal);
      if (!gl_FrontFacing) N = -N;
      vec3 V = safeNormalize(uCameraPos - vWorldPos);

      float shadow = mix(0.45, 1.0, calcSoftShadow(vWorldPos, N));
      vec3 col = shadeStylizedSurface(vColor, N, V, shadow, clamp(vMeta.x, 0.14, 0.92), 1.0);

      // Subtle intrinsic glow (e.g. 山岩小石灵 chest crystal, 沙蝎尾钩, 毒瘴蟾蜍 cheek sacs)
      float em = vMeta.y;
      if (em > 0.01) {
        float ndv = clamp(dot(N, V), 0.0, 1.0);
        float fres = pow(1.0 - ndv, 2.0);
        col += vColor * em * (0.78 + 0.45 * fres);
      }

      // Restrained Qi-Refining attack telegraph rim glow during skill windup!
      float charge = clamp(uAnim.w, 0.0, 1.0);
      if (charge > 0.02) {
        float ndv = clamp(dot(N, V), 0.0, 1.0);
        float rim = pow(1.0 - ndv, 2.2);
        col += uChargeColor * charge * (0.20 + 0.55 * rim);
      }

      col = applyAerialPerspective(col, vWorldPos);
      fragColor = vec4(clamp(col, vec3(0.0), vec3(6.0)), 1.0);
    }
  `;

  // =========================================================
  // 17. SUBTLE QI-REFINING ATTACK VFX SHADER (Low-Opacity Soft Glow Orbs, Rings & Shards)
  // =========================================================
  const VFX_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec3 aNormal;

    uniform mat4 uVP;
    uniform mat4 uModel;

    out vec3 vWorldPos;
    out vec3 vNormal;

    void main() {
      vec4 wp = uModel * vec4(aPos, 1.0);
      vec3 wn = mat3(uModel) * aNormal;
      vWorldPos = wp.xyz;
      vNormal = length(wn) > 1e-5 ? normalize(wn) : vec3(0.0, 1.0, 0.0);
      gl_Position = uVP * wp;
    }
  `;

  const VFX_FS = /* glsl */ `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec3 vNormal;

    uniform vec3 uCameraPos;
    uniform vec3 uVfxColor;
    uniform float uVfxAlpha;

    out vec4 fragColor;

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(uCameraPos - vWorldPos);
      float ndv = abs(dot(N, V));
      float core = 0.45 + 0.55 * pow(ndv, 1.2);
      float rim = pow(1.0 - clamp(ndv, 0.0, 1.0), 1.8);
      vec3 col = uVfxColor * (0.85 + 0.55 * rim + 0.25 * core);
      float alpha = clamp(uVfxAlpha * (0.52 + 0.48 * (core + rim * 0.6)), 0.0, 0.72);
      fragColor = vec4(clamp(col, vec3(0.0), vec3(2.8)), alpha);
    }
  `;

  // =========================================================
  // 13. ULTRA-LIGHTWEIGHT GROUND BLOB SHADOWS (脚底伪接触阴影)
  // =========================================================
  const BLOB_SHADOW_VS = /* glsl */ `#version 300 es
    layout(location = 0) in vec2 aCorner;
    layout(location = 1) in vec4 iPosRad; // xyz = base center, w = radius
    layout(location = 2) in float iAlpha;

    uniform mat4 uVP;
    uniform vec3 uCameraPos;
    uniform sampler2D uTerrainMap;
    uniform float uWorldSize;
    uniform float uConformTerrain;
    uniform float uMaxDist;
    uniform float uStrengthScale;

    out vec2 vUv;
    out float vAlpha;

    void main() {
      vec3 dc = iPosRad.xyz - uCameraPos;
      float dist2 = dot(dc, dc);
      if (dist2 > uMaxDist * uMaxDist || iAlpha <= 0.005) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vUv = vec2(2.0);
        vAlpha = 0.0;
        return;
      }
      vec4 cc = uVP * vec4(iPosRad.xyz, 1.0);
      float cw = cc.w + iPosRad.w * 1.5;
      if (cc.w < -iPosRad.w * 2.0 || abs(cc.x) > cw * 1.32 || abs(cc.y) > cw * 1.32) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vUv = vec2(2.0);
        vAlpha = 0.0;
        return;
      }

      vec2 wxz = iPosRad.xz + aCorner * iPosRad.w;
      float wy = iPosRad.y + 0.06;
      if (uConformTerrain > 0.5) {
        vec2 tuv = clamp((wxz + vec2(uWorldSize * 0.5)) / uWorldSize, vec2(0.001), vec2(0.999));
        wy = texture(uTerrainMap, tuv).r + 0.11;
      }

      float distFade = smoothstep(uMaxDist, uMaxDist * 0.68, sqrt(dist2));
      vUv = aCorner;
      vAlpha = iAlpha * distFade * uStrengthScale;
      gl_Position = uVP * vec4(wxz.x, wy, wxz.y, 1.0);
    }
  `;

  const BLOB_SHADOW_FS = /* glsl */ `#version 300 es
    precision mediump float;
    in vec2 vUv;
    in float vAlpha;
    out vec4 fragColor;

    void main() {
      float r2 = dot(vUv, vUv);
      if (r2 >= 1.0) discard;
      float falloff = exp(-r2 * 3.1) * (1.0 - r2);
      float a = clamp(falloff * vAlpha, 0.0, 0.72);
      if (a <= 0.004) discard;
      fragColor = vec4(0.05, 0.08, 0.12, a);
    }
  `;

  XW.Shaders = {
    SKY_VS, SKY_FS,
    WORLD_VS, WORLD_FS,
    GRASS_VS, GRASS_FS,
    CANOPY_VS, CANOPY_FS,
    BOULDER_VS, BOULDER_FS,
    WATER_VS, WATER_FS,
    WATERFALL_VS, WATERFALL_FS,
    FORMATION_VS, FORMATION_FS,
    AURA_VS, AURA_FS,
    CHARACTER_VS, CHARACTER_FS, SHADOW_CHARACTER_VS,
    MONSTER_VS, MONSTER_FS, SHADOW_MONSTER_VS,
    VFX_VS, VFX_FS,
    BLOB_SHADOW_VS, BLOB_SHADOW_FS,
    CLOUD_SEA_VS, CLOUD_SEA_FS,
    CLOUD_PUFF_VS, CLOUD_PUFF_FS,
    PARTICLE_VS, PARTICLE_FS,
    CRANE_VS, CRANE_FS,
    SHADOW_VS, SHADOW_CANOPY_VS, SHADOW_BOULDER_VS, SHADOW_FS,
    QUAD_VS, BRIGHT_FS, BLUR_FS, COMPOSITE_FS,
  };
})(window);
