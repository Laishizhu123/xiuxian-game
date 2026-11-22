(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});
  const M = XW.Math;

  const CELL_SIZE = 24.0;

  class SpatialCollisionWorld {
    constructor() {
      this.cells = new Map();
      this.colliders = [];
      this.islands = [];
      this.stats = {
        boxes: 0,
        cylinders: 0,
        trees: 0,
        rocks: 0,
        crystals: 0,
        buildings: 0,
        islands: 0,
      };
    }

    _cellKey(cx, cz) {
      return (cx + 10000) * 20001 + (cz + 10000);
    }

    _insertToGrid(col, minX, maxX, minZ, maxZ) {
      const ix0 = Math.floor(minX / CELL_SIZE);
      const ix1 = Math.floor(maxX / CELL_SIZE);
      const iz0 = Math.floor(minZ / CELL_SIZE);
      const iz1 = Math.floor(maxZ / CELL_SIZE);
      for (let iz = iz0; iz <= iz1; iz++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const key = this._cellKey(ix, iz);
          let bucket = this.cells.get(key);
          if (!bucket) {
            bucket = [];
            this.cells.set(key, bucket);
          }
          bucket.push(col);
        }
      }
    }

    // Add an Oriented Bounding Box (rotated around Y axis)
    // walkableTop: player can stand/step onto maxY; solidSide: blocks horizontal movement
    addBox(cx, cy, cz, sx, sy, sz, rotY = 0, tag = 'building', walkableTop = true) {
      const hx = Math.abs(sx) * 0.5;
      const hy = Math.abs(sy) * 0.5;
      const hz = Math.abs(sz) * 0.5;
      if (hx < 0.05 || hy < 0.05 || hz < 0.05) return;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const extX = Math.abs(cosY) * hx + Math.abs(sinY) * hz;
      const extZ = Math.abs(sinY) * hx + Math.abs(cosY) * hz;

      const col = {
        id: this.colliders.length,
        type: 'box',
        tag,
        cx,
        cz,
        minY: cy - hy,
        maxY: cy + hy,
        hx,
        hz,
        cosY,
        sinY,
        walkableTop,
      };
      this.colliders.push(col);
      this._insertToGrid(col, cx - extX, cx + extX, cz - extZ, cz + extZ);
      this.stats.boxes++;
      if (tag === 'building') this.stats.buildings++;
      else if (tag === 'crystal') this.stats.crystals++;
      return col;
    }

    // Add a vertical or tapered Cylinder collider (tree trunks, giant spirit trees, pillars, crystals, boulders)
    addCylinder(cx, baseY, cz, radius, height, tag = 'building', walkableTop = true, rTop = null) {
      if (radius < 0.08 || height < 0.08) return null;
      const topR = (rTop !== null && rTop >= 0.05) ? rTop : radius;
      const maxR = Math.max(radius, topR);
      const col = {
        id: this.colliders.length,
        type: 'cyl',
        tag,
        cx,
        cz,
        r: radius,
        rTop: topR,
        minY: baseY,
        maxY: baseY + height,
        invH: 1.0 / height,
        walkableTop,
      };
      this.colliders.push(col);
      this._insertToGrid(col, cx - maxR, cx + maxR, cz - maxR, cz + maxR);
      this.stats.cylinders++;
      if (tag === 'tree') this.stats.trees++;
      else if (tag === 'rock') this.stats.rocks++;
      else if (tag === 'crystal') this.stats.crystals++;
      else if (tag === 'building') this.stats.buildings++;
      return col;
    }

    _cylRadiusAtY(c, y) {
      if (c.r === c.rTop) return c.r;
      const t = M.clamp((y - c.minY) * c.invH, 0.0, 1.0);
      return c.r + (c.rTop - c.r) * t;
    }

    // Register a Floating Immortal Island (solid inverted-cone underside + walkable top)
    addFloatingIsland(isl) {
      this.islands.push(isl);
      this.stats.islands++;
    }

    // Gather unique nearby colliders within AABB around (x, z)
    _queryNearby(x, z, pad, outList) {
      outList.length = 0;
      const ix0 = Math.floor((x - pad) / CELL_SIZE);
      const ix1 = Math.floor((x + pad) / CELL_SIZE);
      const iz0 = Math.floor((z - pad) / CELL_SIZE);
      const iz1 = Math.floor((z + pad) / CELL_SIZE);
      const seen = this._seenStamp = (this._seenStamp || 0) + 1;

      for (let iz = iz0; iz <= iz1; iz++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const bucket = this.cells.get(this._cellKey(ix, iz));
          if (!bucket) continue;
          for (let i = 0; i < bucket.length; i++) {
            const c = bucket[i];
            if (c.disabled) continue;
            if (c._stamp !== seen) {
              c._stamp = seen;
              outList.push(c);
            }
          }
        }
      }
      return outList;
    }

    // Test if a 2D point (x, z) with radius r overlaps a collider horizontally at height sampleY
    _overlapsXZ(c, x, z, r, sampleY = null) {
      if (c.type === 'cyl') {
        const dx = x - c.cx;
        const dz = z - c.cz;
        const cr = (sampleY !== null) ? this._cylRadiusAtY(c, sampleY) : c.r;
        const sumR = cr + r;
        return dx * dx + dz * dz < sumR * sumR;
      } else {
        // Transform point into OBB local space (matching MeshBuilder.xformY: wx = cx + lx*c + lz*s, wz = cz - lx*s + lz*c)
        const dx = x - c.cx;
        const dz = z - c.cz;
        const lx =  dx * c.cosY - dz * c.sinY;
        const lz =  dx * c.sinY + dz * c.cosY;
        const clx = M.clamp(lx, -c.hx, c.hx);
        const clz = M.clamp(lz, -c.hz, c.hz);
        const ex = lx - clx;
        const ez = lz - clz;
        return ex * ex + ez * ez < r * r;
      }
    }

    // Push capsule (x, z, radius) horizontally out of collider c at height sampleY; returns { hit, nx, nz, pen }
    _pushOutXZ(c, x, z, r, out, sampleY = null) {
      out.hit = false;
      if (c.type === 'cyl') {
        const dx = x - c.cx;
        const dz = z - c.cz;
        const distSq = dx * dx + dz * dz;
        const cr = (sampleY !== null) ? this._cylRadiusAtY(c, sampleY) : c.r;
        const sumR = cr + r;
        if (distSq >= sumR * sumR) return out;
        const dist = Math.sqrt(distSq);
        if (dist > 1e-5) {
          out.nx = dx / dist;
          out.nz = dz / dist;
          out.pen = sumR - dist;
        } else {
          out.nx = 1;
          out.nz = 0;
          out.pen = sumR;
        }
        out.hit = true;
        return out;
      } else {
        const dx = x - c.cx;
        const dz = z - c.cz;
        const lx =  dx * c.cosY - dz * c.sinY;
        const lz =  dx * c.sinY + dz * c.cosY;

        const clx = M.clamp(lx, -c.hx, c.hx);
        const clz = M.clamp(lz, -c.hz, c.hz);
        let ex = lx - clx;
        let ez = lz - clz;
        const distSq = ex * ex + ez * ez;
        if (distSq >= r * r) return out;

        let lnx = 0, lnz = 0, pen = 0;
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          lnx = ex / dist;
          lnz = ez / dist;
          pen = r - dist;
        } else {
          // Center is inside box: push out along nearest face
          const penX = c.hx - Math.abs(lx);
          const penZ = c.hz - Math.abs(lz);
          if (penX < penZ) {
            lnx = lx >= 0 ? 1 : -1;
            lnz = 0;
            pen = penX + r;
          } else {
            lnx = 0;
            lnz = lz >= 0 ? 1 : -1;
            pen = penZ + r;
          }
        }

        // Rotate local normal back to world space
        out.nx = lnx * c.cosY + lnz * c.sinY;
        out.nz = -lnx * c.sinY + lnz * c.cosY;
        out.pen = pen;
        out.hit = true;
        return out;
      }
    }

    // Query highest walkable support surface at (x, z) reachable from footY (within stepHeight)
    getSupportHeight(x, z, footY, radius, stepHeight, terrainFn, preQueriedList = null) {
      let bestY = terrainFn(x, z, footY);
      const list = preQueriedList || this._queryNearby(x, z, radius + 1.5, this._tmpList || (this._tmpList = []));

      // Stand on collider tops that overlap a slightly tighter foot footprint (prevents snagging on vertical wall tops when brushing past)
      const footR = radius * 0.68;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (!c.walkableTop) continue;
        // Can stand on top if it's below our step-up threshold and above bottom
        if (c.maxY <= footY + stepHeight && c.maxY > bestY) {
          if (this._overlapsXZ(c, x, z, footR, c.maxY)) {
            bestY = c.maxY;
          }
        }
      }
      return bestY;
    }

    // Full 3D Capsule Collision Resolution for BOTH Ground Roaming and Immortal Flight!
    // pos is eye position; capsule spans [pos.y - eyeHeight, pos.y + headClearance]
    resolvePlayer(pos, vel, opts) {
      const radius = opts.radius || 0.92;
      const eyeHeight = opts.eyeHeight || 3.2;
      const headClear = opts.headClear || 0.65;
      const stepHeight = opts.flying ? 0.35 : (opts.stepHeight || 1.55);
      const terrainFn = opts.terrainFn;

      const list = this._tmpList || (this._tmpList = []);
      const push = this._tmpPush || (this._tmpPush = { hit: false, nx: 0, nz: 0, pen: 0 });

      let hitWall = false;
      let hitCeiling = false;
      let hitTag = null;

      // Single broad spatial-grid lookup per substep (4x faster in dense giant forests!)
      this._queryNearby(pos[0], pos[2], radius + 5.0, list);

      // 1. Multi-iteration Horizontal Wall / Tree / Root / Pillar / Rock / Crystal Sliding (4 iterations prevents wedge jitter!)
      for (let iter = 0; iter < 4; iter++) {
        const footY = pos[1] - eyeHeight;
        const headY = pos[1] + headClear;
        const midY = (footY + headY) * 0.5;
        const lowY = footY + Math.min(0.45, eyeHeight * 0.25);
        const highY = headY - 0.15;

        let anyPush = false;
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          // Skip colliders completely above head or below feet
          if (headY <= c.minY + 0.05) continue;
          if (footY >= c.maxY - 0.04) continue;

          // If walkable top is within ground step-up height, let vertical support lift player onto it instead of blocking!
          if (!opts.flying && c.walkableTop && c.maxY <= footY + stepHeight) {
            continue;
          }

          // In flight mode, allow gentle vertical bounce off ceilings/tops if mostly above/below
          if (opts.flying) {
            if (headY - c.minY < 0.9 && vel[1] > 0 && this._overlapsXZ(c, pos[0], pos[2], radius * 0.85, c.minY)) {
              pos[1] = c.minY - headClear - 0.02;
              if (vel[1] > 0) vel[1] = 0;
              hitCeiling = true;
              continue;
            }
            if (c.maxY - footY < 1.1 && vel[1] <= 0 && this._overlapsXZ(c, pos[0], pos[2], radius * 0.85, c.maxY)) {
              pos[1] = c.maxY + eyeHeight + 0.02;
              if (vel[1] < 0) vel[1] = 0;
              continue;
            }
          }

          // For tapered cylinders (trees, roots, crystals), sample at the widest overlapping height band (low, mid, high)
          let sampleY = midY;
          if (c.type === 'cyl' && c.r !== c.rTop) {
            const yA = M.clamp(lowY, c.minY, c.maxY);
            const yB = M.clamp(midY, c.minY, c.maxY);
            const yC = M.clamp(highY, c.minY, c.maxY);
            const rA = this._cylRadiusAtY(c, yA);
            const rB = this._cylRadiusAtY(c, yB);
            const rC = this._cylRadiusAtY(c, yC);
            sampleY = (rA >= rB && rA >= rC) ? yA : (rB >= rC ? yB : yC);
          }

          this._pushOutXZ(c, pos[0], pos[2], radius, push, sampleY);
          if (push.hit) {
            pos[0] += push.nx * (push.pen + 0.002);
            pos[2] += push.nz * (push.pen + 0.002);
            // Project out velocity component pushing into wall for silky sliding!
            const vn = vel[0] * push.nx + vel[2] * push.nz;
            if (vn < 0) {
              vel[0] -= vn * push.nx;
              vel[2] -= vn * push.nz;
            }
            hitWall = true;
            hitTag = c.tag;
            anyPush = true;
          }
        }

        // Also check solid 3D Floating Island Rocky Undersides (prevents flying inside inverted rock cones!)
        const curFootY = pos[1] - eyeHeight;
        const curHeadY = pos[1] + headClear;
        for (let i = 0; i < this.islands.length; i++) {
          const isl = this.islands[i];
          const botY = isl.y - isl.depth;
          if (curHeadY <= botY || curFootY >= isl.y - 0.8) continue;

          const midY = M.clamp(pos[1] - eyeHeight * 0.4, botY, isl.y);
          const tBot = M.clamp((isl.y - midY) / isl.depth, 0, 1);
          // Match inverted karst cone profile of addFloatingIsland
          const rScale = Math.pow(1.0 - tBot, 0.78) * 0.96;
          const rx = Math.max(1.2, isl.rx * rScale) + radius;
          const rz = Math.max(1.2, isl.rz * rScale) + radius;
          const dx = pos[0] - isl.x;
          const dz = pos[2] - isl.z;
          const normR = Math.hypot(dx / rx, dz / rz);
          if (normR < 1.0) {
            if (normR > 1e-4) {
              const pushScale = (1.0 / normR) - 1.0;
              pos[0] += dx * pushScale;
              pos[2] += dz * pushScale;
              const nx = (dx / rx) / normR;
              const nz = (dz / rz) / normR;
              const nLen = Math.hypot(nx, nz) || 1;
              const ux = nx / nLen, uz = nz / nLen;
              const vn = vel[0] * ux + vel[2] * uz;
              if (vn < 0) {
                vel[0] -= vn * ux;
                vel[2] -= vn * uz;
              }
            } else {
              pos[1] = botY - headClear - 0.2;
              if (vel[1] > 0) vel[1] = 0;
              hitCeiling = true;
            }
            hitWall = true;
            hitTag = 'island';
            anyPush = true;
          }
        }

        if (!anyPush) break;
      }

      // 2. Ceiling Check in Ground Mode (e.g. jumping under Mountain Gate arch or Pavilion ceiling)
      if (!opts.flying) {
        const footY = pos[1] - eyeHeight;
        const headY = pos[1] + headClear;
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          if (c.minY > footY + stepHeight && headY > c.minY && footY < c.minY) {
            if (this._overlapsXZ(c, pos[0], pos[2], radius * 0.75, c.minY)) {
              pos[1] = c.minY - headClear - 0.02;
              hitCeiling = true;
            }
          }
        }
      }

      // 3. Support Floor Height (terrain + bridges + floating island tops + walkable stairs/terraces/podiums)
      const supportY = this.getSupportHeight(pos[0], pos[2], pos[1] - eyeHeight, radius, stepHeight, terrainFn, list);
      return { supportY, hitWall, hitCeiling, hitTag };
    }

    // Fast horizontal obstacle resolution for AI Entities / Monsters so they never walk through trees, rocks or buildings!
    resolveEntityXZ(entity, radius, height = 2.0) {
      const list = this._tmpEntList || (this._tmpEntList = []);
      const push = this._tmpEntPush || (this._tmpEntPush = { hit: false, nx: 0, nz: 0, pen: 0 });
      this._queryNearby(entity.x, entity.z, radius + 3.5, list);
      const footY = entity.y;
      const headY = entity.y + height;
      const sampleY = footY + height * 0.45;
      for (let iter = 0; iter < 2; iter++) {
        let hitAny = false;
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          if (headY <= c.minY + 0.1 || footY >= c.maxY - 0.15) continue;
          if (c.walkableTop && c.maxY <= footY + 0.85) continue;
          this._pushOutXZ(c, entity.x, entity.z, radius, push, sampleY);
          if (push.hit) {
            entity.x += push.nx * (push.pen + 0.005);
            entity.z += push.nz * (push.pen + 0.005);
            hitAny = true;
          }
        }
        if (!hitAny) break;
      }
    }

    getStats() {
      return Object.assign({ total: this.colliders.length }, this.stats);
    }
  }

  XW.Collision = {
    SpatialCollisionWorld,
  };
})(window);
