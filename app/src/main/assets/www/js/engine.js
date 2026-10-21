/*
 * Candy Nova - moteur de jeu (logique pure, sans rendu).
 * Toutes les cascades sont calculées instantanément et renvoyées sous forme
 * d'une liste d'étapes que le rendu rejoue avec des animations.
 */
(function (global) {
  'use strict';

  var K = { NORMAL: 0, SH: 1, SV: 2, WRAP: 3, NOVA: 4, ING: 5 };

  function mulberry32(seed) {
    var s = seed >>> 0;
    var f = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.getState = function () { return s; };
    f.setState = function (v) { s = v >>> 0; };
    return f;
  }

  function Board(level, seed) {
    this.L = level;
    this.R = level.rows;
    this.C = level.cols;
    this.rng = mulberry32(seed == null ? (Date.now() & 0x7fffffff) : seed);
    this.nextId = 1;
    this.moves = level.moves;
    this.score = 0;
    this.cascade = 0;
    this.collected = {};
    this.ingGot = 0;
    this.cells = [];
    this.candies = [];
    var r, c;
    for (r = 0; r < this.R; r++) {
      var row = [], crow = [];
      for (c = 0; c < this.C; c++) {
        var on = level.mask ? level.mask[r].charAt(c) !== ' ' : true;
        row.push({ on: on, jelly: 0, frost: 0, lock: 0, exit: false });
        crow.push(null);
      }
      this.cells.push(row);
      this.candies.push(crow);
    }
    var self = this;
    (level.jelly || []).forEach(function (j) { if (self.cells[j[0]][j[1]].on) self.cells[j[0]][j[1]].jelly = j[2] || 1; });
    (level.frost || []).forEach(function (j) { if (self.cells[j[0]][j[1]].on) self.cells[j[0]][j[1]].frost = j[2] || 1; });
    (level.locks || []).forEach(function (j) { var cl = self.cells[j[0]][j[1]]; if (cl.on && !cl.frost) cl.lock = 1; });
    for (c = 0; c < this.C; c++) {
      for (r = this.R - 1; r >= 0; r--) {
        if (this.cells[r][c].on) { this.cells[r][c].exit = true; break; }
      }
    }
    this.goals = level.goals;
    this.ingNeed = 0;
    this.goals.forEach(function (g) { if (g.type === 'ingredient') self.ingNeed = g.count; });
    this.jellyTotal = this.countJelly();
    this.frostTotal = this.countFrost();
    this.fillInitial();
  }

  var P = Board.prototype;

  P.inB = function (r, c) { return r >= 0 && c >= 0 && r < this.R && c < this.C; };
  P.canHold = function (r, c) { return this.inB(r, c) && this.cells[r][c].on && this.cells[r][c].frost === 0; };
  P.movable = function (r, c) {
    return this.canHold(r, c) && !!this.candies[r][c] && this.cells[r][c].lock === 0;
  };
  P.matchColor = function (r, c) {
    if (!this.canHold(r, c)) return -1;
    var cd = this.candies[r][c];
    if (!cd || cd.kind === K.NOVA || cd.kind === K.ING) return -1;
    return cd.color;
  };
  P.newCandy = function (color, kind) {
    return { id: this.nextId++, color: color, kind: kind || K.NORMAL };
  };
  P.randColor = function () { return Math.floor(this.rng() * this.L.colors); };

  P.countJelly = function () {
    var n = 0;
    for (var r = 0; r < this.R; r++) for (var c = 0; c < this.C; c++) if (this.cells[r][c].jelly > 0) n++;
    return n;
  };
  P.countFrost = function () {
    var n = 0;
    for (var r = 0; r < this.R; r++) for (var c = 0; c < this.C; c++) if (this.cells[r][c].frost > 0) n++;
    return n;
  };
  P.ingOnBoard = function () {
    var n = 0;
    for (var r = 0; r < this.R; r++) for (var c = 0; c < this.C; c++) {
      var cd = this.candies[r][c];
      if (cd && cd.kind === K.ING) n++;
    }
    return n;
  };

  P.colorAvoiding = function (r, c) {
    var bad = {};
    if (c >= 2 && this.matchColor(r, c - 1) >= 0 && this.matchColor(r, c - 1) === this.matchColor(r, c - 2)) bad[this.matchColor(r, c - 1)] = 1;
    if (r >= 2 && this.matchColor(r - 1, c) >= 0 && this.matchColor(r - 1, c) === this.matchColor(r - 2, c)) bad[this.matchColor(r - 1, c)] = 1;
    var opts = [];
    for (var i = 0; i < this.L.colors; i++) if (!bad[i]) opts.push(i);
    return opts[Math.floor(this.rng() * opts.length)];
  };

  P.fillInitial = function () {
    for (var tries = 0; tries < 60; tries++) {
      var r, c;
      for (r = 0; r < this.R; r++) for (c = 0; c < this.C; c++) {
        this.candies[r][c] = this.canHold(r, c) ? this.newCandy(this.colorAvoiding(r, c)) : null;
      }
      if (this.ingNeed > 0) {
        var placed = 0, want = Math.min(this.ingNeed, this.L.ingMax || 1);
        for (var t = 0; t < 40 && placed < want; t++) {
          c = Math.floor(this.rng() * this.C);
          for (r = 0; r < this.R; r++) {
            if (this.canHold(r, c) && !this.cells[r][c].lock) {
              if (this.candies[r][c].kind !== K.ING && !this.cells[r][c].exit) {
                this.candies[r][c] = this.newCandy(-1, K.ING);
                placed++;
              }
              break;
            }
          }
        }
      }
      if (this.hasPossibleMove()) return;
    }
  };

  /* ---------- Détection ---------- */

  P.hasMatchAt = function (r, c) {
    var col = this.matchColor(r, c);
    if (col < 0) return false;
    var n = 1, k;
    for (k = c - 1; k >= 0 && this.matchColor(r, k) === col; k--) n++;
    for (k = c + 1; k < this.C && this.matchColor(r, k) === col; k++) n++;
    if (n >= 3) return true;
    n = 1;
    for (k = r - 1; k >= 0 && this.matchColor(k, c) === col; k--) n++;
    for (k = r + 1; k < this.R && this.matchColor(k, c) === col; k++) n++;
    return n >= 3;
  };

  function isStriped(k) { return k === K.SH || k === K.SV; }
  function isSpecial(k) { return k === K.SH || k === K.SV || k === K.WRAP; }

  P.comboKind = function (a, b) {
    if (!a || !b) return null;
    if (a.kind === K.ING || b.kind === K.ING) return null;
    if (a.kind === K.NOVA || b.kind === K.NOVA) return 'nova';
    if (isSpecial(a.kind) && isSpecial(b.kind)) return 'special';
    return null;
  };

  P.listMoves = function () {
    var out = [];
    for (var r = 0; r < this.R; r++) for (var c = 0; c < this.C; c++) {
      if (!this.movable(r, c)) continue;
      var dirs = [[0, 1], [1, 0]];
      for (var d = 0; d < 2; d++) {
        var r2 = r + dirs[d][0], c2 = c + dirs[d][1];
        if (!this.movable(r2, c2)) continue;
        var a = this.candies[r][c], b = this.candies[r2][c2];
        if (a.kind === K.ING && b.kind === K.ING) continue;
        if (this.comboKind(a, b)) { out.push([r, c, r2, c2]); continue; }
        this.candies[r][c] = b; this.candies[r2][c2] = a;
        var ok = this.hasMatchAt(r, c) || this.hasMatchAt(r2, c2);
        this.candies[r][c] = a; this.candies[r2][c2] = b;
        if (ok) out.push([r, c, r2, c2]);
      }
    }
    return out;
  };
  P.hasPossibleMove = function () { return this.listMoves().length > 0; };

  P.findGroups = function () {
    var R = this.R, C = this.C, runs = [], r, c, e, col, i;
    for (r = 0; r < R; r++) {
      c = 0;
      while (c < C) {
        col = this.matchColor(r, c);
        if (col < 0) { c++; continue; }
        e = c + 1;
        while (e < C && this.matchColor(r, e) === col) e++;
        if (e - c >= 3) {
          var cells = [];
          for (i = c; i < e; i++) cells.push([r, i]);
          runs.push({ dir: 'h', cells: cells, color: col });
        }
        c = e;
      }
    }
    for (c = 0; c < C; c++) {
      r = 0;
      while (r < R) {
        col = this.matchColor(r, c);
        if (col < 0) { r++; continue; }
        e = r + 1;
        while (e < R && this.matchColor(e, c) === col) e++;
        if (e - r >= 3) {
          var cells2 = [];
          for (i = r; i < e; i++) cells2.push([i, c]);
          runs.push({ dir: 'v', cells: cells2, color: col });
        }
        r = e;
      }
    }
    if (!runs.length) return [];
    // union-find des alignements qui partagent une case
    var parent = runs.map(function (_, idx) { return idx; });
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    var owner = {};
    runs.forEach(function (run, idx) {
      run.cells.forEach(function (p) {
        var key = p[0] * C + p[1];
        if (owner[key] != null) parent[find(idx)] = find(owner[key]);
        else owner[key] = idx;
      });
    });
    var map = {};
    runs.forEach(function (run, idx) {
      var root = find(idx);
      if (!map[root]) map[root] = { runs: [], keys: {}, cells: [], color: run.color };
      var g = map[root];
      g.runs.push(run);
      run.cells.forEach(function (p) {
        var key = p[0] * C + p[1];
        if (!g.keys[key]) { g.keys[key] = 1; g.cells.push(p); } else g.keys[key]++;
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  };

  /* ---------- Destruction ---------- */

  P.goalColorHit = function (color) {
    this.collected[color] = (this.collected[color] || 0) + 1;
  };

  // opts: matchCells [[r,c,originKey]], hits [[r,c]], consume [[r,c]], creates [{r,c,kind,color}], effects []
  P.blast = function (opts) {
    var self = this, C = this.C;
    var step = { t: 'clear', removed: [], transforms: [], effects: opts.effects || [], cellFx: [], popups: [], points: 0 };
    var cleared = {}, frostHit = {}, jellyHit = {}, prot = {};
    var queue = [];
    var mult = 1 + 0.5 * Math.max(0, Math.min(this.cascade, 9) - 1);
    var popupAcc = {};
    (opts.creates || []).forEach(function (cr) { prot[cr.r * C + cr.c] = cr; });

    function addPts(v, origin) {
      v = v * mult;
      step.points += v;
      if (origin) {
        var key = origin[0] * C + origin[1];
        if (!popupAcc[key]) popupAcc[key] = { r: origin[0], c: origin[1], v: 0 };
        popupAcc[key].v += v;
      }
    }
    function hitJelly(r, c, origin) {
      var cl = self.cells[r][c], k = r * C + c;
      if (cl.jelly > 0 && !jellyHit[k]) {
        jellyHit[k] = 1;
        cl.jelly--;
        step.cellFx.push({ r: r, c: c, type: 'jelly', left: cl.jelly });
        addPts(cl.jelly === 0 ? 100 : 50, origin);
      }
    }
    function hitFrost(r, c, wave, origin) {
      var cl = self.cells[r][c], k = r * C + c;
      if (cl.frost > 0 && !frostHit[k]) {
        frostHit[k] = 1;
        cl.frost--;
        step.cellFx.push({ r: r, c: c, type: 'frost', left: cl.frost, wave: wave });
        addPts(cl.frost === 0 ? 120 : 40, origin);
      }
    }
    function triggerEffect(cd, r, c, wave) {
      var i, dr, dc;
      if (cd.kind === K.SH) {
        step.effects.push({ type: 'beamH', r: r, c: c, wave: wave, color: cd.color });
        for (i = 0; i < self.C; i++) if (i !== c) queue.push([r, i, wave, [r, c]]);
      } else if (cd.kind === K.SV) {
        step.effects.push({ type: 'beamV', r: r, c: c, wave: wave, color: cd.color });
        for (i = 0; i < self.R; i++) if (i !== r) queue.push([i, c, wave, [r, c]]);
      } else if (cd.kind === K.WRAP) {
        step.effects.push({ type: 'boom', r: r, c: c, wave: wave, radius: 1.6, color: cd.color });
        for (dr = -2; dr <= 2; dr++) for (dc = -2; dc <= 2; dc++) {
          if (Math.abs(dr) + Math.abs(dc) > 2) continue;
          if (dr || dc) queue.push([r + dr, c + dc, wave, [r, c]]);
        }
      } else if (cd.kind === K.NOVA) {
        var col = self.dominantColor();
        var targets = [];
        if (col >= 0) {
          for (var rr = 0; rr < self.R; rr++) for (var cc = 0; cc < self.C; cc++) {
            if (self.matchColor(rr, cc) === col) { targets.push([rr, cc]); queue.push([rr, cc, wave, [r, c]]); }
          }
        }
        step.effects.push({ type: 'zap', r: r, c: c, wave: wave, targets: targets, color: col });
      }
    }
    function hit(r, c, wave, fromMatch, origin) {
      if (!self.inB(r, c)) return;
      var cl = self.cells[r][c], k = r * C + c;
      if (!cl.on) return;
      if (cl.frost > 0) { hitFrost(r, c, wave, origin); return; }
      var cd = self.candies[r][c];
      if (cd && cl.lock > 0) {
        cl.lock = 0;
        step.cellFx.push({ r: r, c: c, type: 'lock', wave: wave });
        addPts(60, origin);
        return;
      }
      if (cleared[k]) return;
      if (prot[k]) {
        hitJelly(r, c, origin);
        if (fromMatch) damageAround(r, c, wave, origin);
        return;
      }
      if (!cd) { cleared[k] = 1; hitJelly(r, c, origin); return; }
      if (cd.kind === K.ING) return;
      cleared[k] = 1;
      hitJelly(r, c, origin);
      if (cd.color >= 0) self.goalColorHit(cd.color);
      step.removed.push({ id: cd.id, r: r, c: c, wave: wave, color: cd.color, kind: cd.kind });
      self.candies[r][c] = null;
      addPts(fromMatch ? 0 : 60, origin);
      if (fromMatch) damageAround(r, c, wave, origin);
      if (cd.kind !== K.NORMAL && !cd.noFx) triggerEffect(cd, r, c, wave + 1);
    }
    function damageAround(r, c, wave, origin) {
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var rr = r + nb[i][0], cc = c + nb[i][1];
        if (self.inB(rr, cc) && self.cells[rr][cc].on && self.cells[rr][cc].frost > 0) hitFrost(rr, cc, wave, origin);
      }
    }

    (opts.consume || []).forEach(function (p) {
      var cd = self.candies[p[0]][p[1]];
      if (cd) cd.noFx = true;
      hit(p[0], p[1], 0, false, p);
    });
    (opts.groups || []).forEach(function (g) {
      addPts(g.points, g.center);
      g.cells.forEach(function (p) { hit(p[0], p[1], 0, true, g.center); });
    });
    (opts.hits || []).forEach(function (p) { hit(p[0], p[1], p[2] || 0, false, p[3] || p); });
    var guard = 0;
    while (queue.length && guard++ < 5000) {
      var q = queue.shift();
      hit(q[0], q[1], q[2], false, q[3]);
    }
    (opts.creates || []).forEach(function (cr) {
      var cd = self.candies[cr.r][cr.c];
      if (!cd) return;
      if (cd.color >= 0) self.goalColorHit(cd.color);
      cd.kind = cr.kind;
      if (cr.kind === K.NOVA) cd.color = -1;
      step.transforms.push({ id: cd.id, r: cr.r, c: cr.c, kind: cd.kind, color: cd.color });
    });
    Object.keys(popupAcc).forEach(function (k) { if (popupAcc[k].v > 0) step.popups.push(popupAcc[k]); });
    this.score += step.points;
    step.score = this.score;
    step.cells = this.snapshotCells();
    step.goals = this.goalState();
    step.cascade = this.cascade;
    return step;
  };

  P.dominantColor = function () {
    var cnt = {}, best = -1, bn = 0;
    for (var r = 0; r < this.R; r++) for (var c = 0; c < this.C; c++) {
      var col = this.matchColor(r, c);
      if (col < 0) continue;
      cnt[col] = (cnt[col] || 0) + 1;
      if (cnt[col] > bn) { bn = cnt[col]; best = col; }
    }
    return best;
  };

  P.processMatches = function (groups, swapCells) {
    var self = this, C = this.C;
    var creates = [];
    var used = {};
    var outGroups = [];
    groups.forEach(function (g) {
      var maxRun = null;
      var hasH = false, hasV = false;
      g.runs.forEach(function (run) {
        if (!maxRun || run.cells.length > maxRun.cells.length) maxRun = run;
        if (run.dir === 'h') hasH = true; else hasV = true;
      });
      var len = maxRun.cells.length;
      var kind = null, prefer = [];
      if (len >= 5) {
        kind = K.NOVA;
        prefer = [maxRun.cells[Math.floor(len / 2)]];
      } else if (hasH && hasV) {
        kind = K.WRAP;
        g.cells.forEach(function (p) { if (g.keys[p[0] * C + p[1]] > 1) prefer.push(p); });
      } else if (len === 4) {
        kind = maxRun.dir === 'h' ? K.SV : K.SH;
        prefer = [maxRun.cells[1], maxRun.cells[2]];
      }
      var center = g.cells[Math.floor(g.cells.length / 2)];
      if (kind != null) {
        var cand = [];
        if (swapCells) swapCells.forEach(function (s) { if (g.keys[s[0] * C + s[1]]) cand.push(s); });
        cand = cand.concat(prefer, g.cells);
        var pos = null;
        for (var i = 0; i < cand.length; i++) {
          var p = cand[i], k = p[0] * C + p[1];
          var cd = self.candies[p[0]][p[1]];
          if (used[k] || !cd || self.cells[p[0]][p[1]].lock) continue;
          if (cd.kind !== K.NORMAL && i < cand.length - g.cells.length) continue;
          if (cd.kind !== K.NORMAL) continue;
          pos = p; break;
        }
        if (pos) {
          used[pos[0] * C + pos[1]] = 1;
          creates.push({ r: pos[0], c: pos[1], kind: kind });
          center = pos;
        }
      }
      var pts = len >= 5 ? 200 : len === 4 ? 120 : 60;
      if (hasH && hasV) pts = 150;
      if (g.cells.length > 5) pts += (g.cells.length - 5) * 30;
      outGroups.push({ cells: g.cells, center: center, points: pts, color: g.color });
    });
    var step = this.blast({ groups: outGroups, creates: creates });
    step.matchColors = outGroups.map(function (g) { return g.color; });
    return step;
  };

  /* ---------- Gravité ---------- */

  P.spawnCandy = function () {
    if (this.ingNeed > 0) {
      var on = this.ingOnBoard();
      var left = this.ingNeed - this.ingGot - on;
      var max = this.L.ingMax || 1;
      if (left > 0 && on < max && this.rng() < (on === 0 ? 0.35 : 0.06)) return this.newCandy(-1, K.ING);
    }
    return this.newCandy(this.randColor());
  };

  P.scanUp = function (r, c) {
    // renvoie la ligne source (bonbon mobile), -1 si on atteint le haut, null si bloqué
    for (var k = r - 1; k >= 0; k--) {
      var cl = this.cells[k][c];
      if (!cl.on) continue;
      if (cl.frost > 0) return null;
      var cd = this.candies[k][c];
      if (!cd) continue;
      if (cl.lock > 0) return null;
      return k;
    }
    return -1;
  };

  P.applyGravity = function () {
    var R = this.R, C = this.C, self = this;
    var paths = {}, order = [], spawns = {};
    var spawnCount = [];
    for (var i = 0; i < C; i++) spawnCount.push(0);
    function addPath(cd, fr, fc, tr, tc) {
      if (!paths[cd.id]) { paths[cd.id] = [[fr, fc]]; order.push(cd.id); }
      paths[cd.id].push([tr, tc]);
    }
    var guard = 0, any = false;
    while (guard++ < 400) {
      var changed = false, r, c;
      for (c = 0; c < C; c++) {
        for (r = R - 1; r >= 0; r--) {
          if (!this.canHold(r, c) || this.candies[r][c]) continue;
          var src = this.scanUp(r, c);
          if (src === null) continue;
          var cd;
          if (src === -1) {
            spawnCount[c]++;
            cd = this.spawnCandy();
            spawns[cd.id] = { color: cd.color, kind: cd.kind };
            addPath(cd, -spawnCount[c], c, r, c);
          } else {
            cd = this.candies[src][c];
            this.candies[src][c] = null;
            addPath(cd, src, c, r, c);
          }
          this.candies[r][c] = cd;
          changed = true;
        }
      }
      if (changed) { any = true; continue; }
      // glissement en diagonale pour les cases bloquées
      var moved = false;
      for (r = R - 1; r >= 1 && !moved; r--) {
        for (c = 0; c < C && !moved; c++) {
          if (!this.canHold(r, c) || this.candies[r][c]) continue;
          if (this.scanUp(r, c) !== null) continue;
          var dcs = (r + c + guard) % 2 ? [-1, 1] : [1, -1];
          for (var d = 0; d < 2; d++) {
            var cc = c + dcs[d];
            if (!this.movable(r - 1, cc)) continue;
            // si la case juste sous la source est vide, elle tombera d'abord tout droit
            if (this.canHold(r, cc) && !this.candies[r][cc]) continue;
            var cd2 = this.candies[r - 1][cc];
            this.candies[r - 1][cc] = null;
            this.candies[r][c] = cd2;
            addPath(cd2, r - 1, cc, r, c);
            moved = true;
            break;
          }
        }
      }
      if (!moved) break;
      any = true;
    }
    if (!any) return null;
    var moves = order.map(function (id) {
      var sp = spawns[id];
      return { id: id, path: paths[id], spawn: !!sp, color: sp ? sp.color : undefined, kind: sp ? sp.kind : undefined };
    });
    return { t: 'fall', moves: moves };
  };

  P.exitIngredients = function () {
    var out = [];
    for (var r = 0; r < this.R; r++) for (var c = 0; c < this.C; c++) {
      var cd = this.candies[r][c];
      if (cd && cd.kind === K.ING && this.cells[r][c].exit) {
        out.push({ id: cd.id, r: r, c: c });
        this.candies[r][c] = null;
        this.ingGot++;
        this.score += 1000;
      }
    }
    if (!out.length) return null;
    return { t: 'exit', items: out, score: this.score, goals: this.goalState() };
  };

  P.resolve = function (steps, swapCells) {
    var guard = 0;
    while (guard++ < 200) {
      var fall = this.applyGravity();
      if (fall) steps.push(fall);
      var ex = this.exitIngredients();
      if (ex) { steps.push(ex); continue; }
      var groups = this.findGroups();
      if (!groups.length) break;
      this.cascade++;
      steps.push(this.processMatches(groups, this.cascade === 1 ? swapCells : null));
      swapCells = null;
    }
  };

  P.ensureMoves = function (steps) {
    var n = 0;
    while (!this.hasPossibleMove() && n++ < 5) {
      steps.push(this.shuffle());
      this.resolve(steps, null);
    }
  };

  P.shuffle = function () {
    var pos = [], list = [], r, c;
    for (r = 0; r < this.R; r++) for (c = 0; c < this.C; c++) {
      if (this.movable(r, c) && this.candies[r][c].kind !== K.ING) { pos.push([r, c]); list.push(this.candies[r][c]); }
    }
    for (var t = 0; t < 120; t++) {
      for (var i = list.length - 1; i > 0; i--) {
        var j = Math.floor(this.rng() * (i + 1));
        var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
      }
      if (t > 60) list.forEach(function (cd) { if (cd.kind === K.NORMAL) cd.color = this.randColor(); }, this);
      for (var p = 0; p < pos.length; p++) this.candies[pos[p][0]][pos[p][1]] = list[p];
      if (!this.findGroups().length && this.hasPossibleMove()) break;
    }
    var self = this;
    return {
      t: 'shuffle',
      moves: pos.map(function (p) { var cd = self.candies[p[0]][p[1]]; return { id: cd.id, r: p[0], c: p[1], color: cd.color, kind: cd.kind }; })
    };
  };

  /* ---------- Actions du joueur ---------- */

  P.trySwap = function (r1, c1, r2, c2) {
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return { valid: false, steps: [] };
    if (!this.movable(r1, c1) || !this.movable(r2, c2)) return { valid: false, steps: [] };
    var a = this.candies[r1][c1], b = this.candies[r2][c2];
    if (a.kind === K.ING && b.kind === K.ING) return { valid: false, steps: [] };
    var combo = this.comboKind(a, b);
    this.candies[r1][c1] = b; this.candies[r2][c2] = a;
    if (!combo && !this.hasMatchAt(r1, c1) && !this.hasMatchAt(r2, c2)) {
      this.candies[r1][c1] = a; this.candies[r2][c2] = b;
      return { valid: false, steps: [{ t: 'badswap', a: [r1, c1], b: [r2, c2], ida: a.id, idb: b.id }] };
    }
    this.moves--;
    var steps = [{ t: 'swap', a: [r1, c1], b: [r2, c2], ida: a.id, idb: b.id, moves: this.moves }];
    this.cascade = 0;
    if (combo) {
      this.cascade = 1;
      steps.push(this.doCombo(a, [r2, c2], b, [r1, c1]));
    }
    this.resolve(steps, [[r1, c1], [r2, c2]]);
    this.ensureMoves(steps);
    return { valid: true, steps: steps };
  };

  // a a été déplacé en pa, b se trouve en pb
  P.doCombo = function (a, pa, b, pb) {
    var self = this, hits = [], effects = [], consume = [], r, c, i;
    var R = this.R, C = this.C;
    var center = pa;
    if (a.kind === K.NOVA && b.kind === K.NOVA) {
      consume = [pa, pb];
      for (r = 0; r < R; r++) for (c = 0; c < C; c++) hits.push([r, c, 1, center]);
      effects.push({ type: 'supernova', r: pa[0], c: pa[1], wave: 0 });
      return this.blast({ consume: consume, hits: hits, effects: effects });
    }
    if (a.kind === K.NOVA || b.kind === K.NOVA) {
      var nova = a.kind === K.NOVA ? a : b, other = nova === a ? b : a;
      var np = nova === a ? pa : pb;
      var col = other.color;
      var targets = [], transforms = [];
      for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
        if (this.matchColor(r, c) !== col) continue;
        var cd = this.candies[r][c];
        if (other.kind !== K.NORMAL && cd.kind === K.NORMAL && !this.cells[r][c].lock) {
          cd.kind = other.kind === K.WRAP ? K.WRAP : (this.rng() < 0.5 ? K.SH : K.SV);
          transforms.push({ id: cd.id, r: r, c: c, kind: cd.kind, color: cd.color });
        }
        targets.push([r, c]);
      }
      consume = [np];
      effects.push({ type: 'zap', r: np[0], c: np[1], wave: 0, targets: targets, color: col });
      targets.forEach(function (t) { hits.push([t[0], t[1], 1, np]); });
      var st = this.blast({ consume: consume, hits: hits, effects: effects });
      st.preTransforms = transforms;
      return st;
    }
    // deux bonbons spéciaux
    consume = [pa, pb];
    var ka = a.kind, kb = b.kind;
    if (isStriped(ka) && isStriped(kb)) {
      effects.push({ type: 'beamH', r: center[0], c: center[1], wave: 0, color: a.color });
      effects.push({ type: 'beamV', r: center[0], c: center[1], wave: 0, color: b.color });
      for (i = 0; i < C; i++) hits.push([center[0], i, 1, center]);
      for (i = 0; i < R; i++) hits.push([i, center[1], 1, center]);
    } else if (ka === K.WRAP && kb === K.WRAP) {
      effects.push({ type: 'boom', r: center[0], c: center[1], wave: 0, radius: 3, color: a.color });
      for (r = -2; r <= 2; r++) for (c = -2; c <= 2; c++) hits.push([center[0] + r, center[1] + c, 1, center]);
      for (i = -3; i <= 3; i += 6) { hits.push([center[0] + i, center[1], 1, center]); hits.push([center[0], center[1] + i, 1, center]); }
    } else {
      for (i = -1; i <= 1; i++) {
        effects.push({ type: 'beamH', r: center[0] + i, c: center[1], wave: 0, color: a.color, big: true });
        effects.push({ type: 'beamV', r: center[0], c: center[1] + i, wave: 0, color: b.color, big: true });
        for (c = 0; c < C; c++) hits.push([center[0] + i, c, 1, center]);
        for (r = 0; r < R; r++) hits.push([r, center[1] + i, 1, center]);
      }
    }
    return this.blast({ consume: consume, hits: hits, effects: effects });
  };

  P.useHammer = function (r, c) {
    if (!this.inB(r, c) || !this.cells[r][c].on) return null;
    var cd = this.candies[r][c];
    if (!this.cells[r][c].frost && !this.cells[r][c].lock && (!cd || cd.kind === K.ING) && !this.cells[r][c].jelly) return null;
    var steps = [];
    this.cascade = 1;
    steps.push(this.blast({ hits: [[r, c]], effects: [{ type: 'hammer', r: r, c: c, wave: 0 }] }));
    this.resolve(steps, null);
    this.ensureMoves(steps);
    return steps;
  };

  P.useShuffle = function () {
    var steps = [this.shuffle()];
    this.cascade = 0;
    this.resolve(steps, null);
    this.ensureMoves(steps);
    return steps;
  };

  /* ---------- Bonus de fin : Nova Rush ---------- */

  P.bonusRush = function () {
    var steps = [];
    var self = this;
    while (this.moves > 0) {
      var cand = [];
      for (var r = 0; r < this.R; r++) for (var c = 0; c < this.C; c++) {
        var cd = this.candies[r][c];
        if (cd && cd.kind === K.NORMAL && this.movable(r, c)) cand.push([r, c]);
      }
      var n = Math.min(this.moves, cand.length, 12);
      if (!n) break;
      var list = [];
      for (var i = 0; i < n; i++) {
        var j = i + Math.floor(this.rng() * (cand.length - i));
        var tmp = cand[i]; cand[i] = cand[j]; cand[j] = tmp;
        var p = cand[i], cd2 = this.candies[p[0]][p[1]];
        cd2.kind = this.rng() < 0.5 ? K.SH : K.SV;
        list.push({ id: cd2.id, r: p[0], c: p[1], kind: cd2.kind, color: cd2.color });
        this.moves--;
        this.score += 300;
      }
      steps.push({ t: 'rush', transforms: list, moves: this.moves, score: this.score });
      this.fireAllSpecials(steps);
    }
    this.fireAllSpecials(steps);
    return steps;
  };

  P.fireAllSpecials = function (steps) {
    for (var loop = 0; loop < 25; loop++) {
      var hits = [];
      for (var r = 0; r < this.R; r++) for (var c = 0; c < this.C; c++) {
        var cd = this.candies[r][c];
        if (cd && cd.kind !== K.NORMAL && cd.kind !== K.ING) hits.push([r, c]);
      }
      if (!hits.length) return;
      this.cascade = 1;
      steps.push(this.blast({ hits: hits }));
      this.resolve(steps, null);
    }
  };

  /* ---------- État ---------- */

  P.goalState = function () {
    var self = this;
    var jl = this.countJelly(), fr = this.countFrost();
    return this.goals.map(function (g) {
      switch (g.type) {
        case 'score': return { type: 'score', need: g.target, have: Math.min(self.score, g.target) };
        case 'jelly': return { type: 'jelly', need: self.jellyTotal, have: self.jellyTotal - jl };
        case 'frost': return { type: 'frost', need: self.frostTotal, have: self.frostTotal - fr };
        case 'collect': return { type: 'collect', color: g.color, need: g.count, have: Math.min(g.count, self.collected[g.color] || 0) };
        case 'ingredient': return { type: 'ingredient', need: g.count, have: Math.min(g.count, self.ingGot) };
      }
      return null;
    });
  };

  P.goalsDone = function () {
    return this.goalState().every(function (g) { return g.have >= g.need; });
  };
  P.isScoreOnly = function () { return this.goals.length === 1 && this.goals[0].type === 'score'; };

  P.status = function () {
    if (this.isScoreOnly()) {
      if (this.moves <= 0) return this.score >= this.goals[0].target ? 'won' : 'lost';
      return 'playing';
    }
    if (this.goalsDone()) return 'won';
    if (this.moves <= 0) return 'lost';
    return 'playing';
  };

  P.snapshotCells = function () {
    return this.cells.map(function (row) {
      return row.map(function (cl) { return [cl.jelly, cl.frost, cl.lock]; });
    });
  };

  P.snapshotCandies = function () {
    var out = [];
    for (var r = 0; r < this.R; r++) for (var c = 0; c < this.C; c++) {
      var cd = this.candies[r][c];
      if (cd) out.push({ id: cd.id, r: r, c: c, color: cd.color, kind: cd.kind });
    }
    return out;
  };

  P.clone = function () {
    var b = Object.create(Board.prototype);
    for (var k in this) if (Object.prototype.hasOwnProperty.call(this, k)) b[k] = this[k];
    b.cells = this.cells.map(function (row) { return row.map(function (cl) { return { on: cl.on, jelly: cl.jelly, frost: cl.frost, lock: cl.lock, exit: cl.exit }; }); });
    b.candies = this.candies.map(function (row) { return row.map(function (cd) { return cd ? { id: cd.id, color: cd.color, kind: cd.kind } : null; }); });
    b.collected = Object.assign({}, this.collected);
    b.rng = mulberry32(0);
    b.rng.setState(this.rng.getState());
    return b;
  };

  var api = { Board: Board, K: K, mulberry32: mulberry32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.NovaEngine = api;
})(this);
