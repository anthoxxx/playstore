/*
 * Candy Nova - génération déterministe des 2000 niveaux.
 * Chaque niveau est construit à partir de son numéro : même numéro => même niveau.
 */
(function (global) {
  'use strict';

  var MAX_LEVEL = 2000;
  var LEVELS_PER_WORLD = 20;

  var WORLD_NAMES = [
    'Nébuleuse Sucrée', 'Comète Guimauve', 'Ceinture Réglisse', 'Planète Praline', 'Lune Caramel',
    'Galaxie Bonbon', 'Orbite Chewing-gum', 'Étoile Nougat', 'Volcan Cacao', 'Anneaux de Sucre d\'Orge',
    'Mer de Sirop', 'Astéroïdes Acidulés', 'Station Cookie', 'Constellation Myrtille', 'Aurore Framboise',
    'Pôle Menthe Glaciale', 'Trou Noir Chocolat', 'Supernova Citron', 'Désert de Miel', 'Quasar Cerise',
    'Voie Lactée Vanille', 'Pulsar Pistache', 'Jardin d\'Ambroisie', 'Cratère Crème Brûlée', 'Cosmos Arc-en-ciel'
  ];
  var ROMAN = ['', ' II', ' III', ' IV', ' V'];

  // couleurs de fond par monde (dégradé haut / bas)
  var WORLD_THEMES = [
    ['#2b0a4a', '#ff4fa3'], ['#0c1a4d', '#4fd1ff'], ['#2a0b1f', '#ff6b4f'], ['#1b0f3d', '#c86bff'],
    ['#2b1500', '#ffb14f'], ['#08203a', '#59ffb5'], ['#3a0a2c', '#ff7ad9'], ['#14143d', '#ffe66b'],
    ['#2a0d06', '#ff8a3d'], ['#0b2440', '#9be7ff'], ['#0b2a2a', '#4fffd5'], ['#22083d', '#b4ff4f'],
    ['#2b1a0a', '#ffcf8a'], ['#0d0f45', '#7a8cff'], ['#3d0a1a', '#ff5f7e'], ['#062436', '#bff6ff'],
    ['#140806', '#a0522d'], ['#2e2a05', '#fff04f'], ['#2e1c04', '#ffc23d'], ['#33050f', '#ff3d6b'],
    ['#151530', '#fff6d6'], ['#0d2a14', '#a6ff8a'], ['#1d0a33', '#e08aff'], ['#2a1a0d', '#ffd9a0'],
    ['#140a2e', '#ff9df0']
  ];

  function worldOf(n) { return Math.floor((n - 1) / LEVELS_PER_WORLD); }
  function worldName(w) {
    return WORLD_NAMES[w % WORLD_NAMES.length] + ROMAN[Math.floor(w / WORLD_NAMES.length)];
  }
  function worldTheme(w) { return WORLD_THEMES[w % WORLD_THEMES.length]; }

  function rngFor(n) { return NovaEngineRef().mulberry32((n * 2654435761) ^ 0x5bd1e995); }
  function NovaEngineRef() {
    if (typeof module !== 'undefined' && module.exports) return require('./engine.js');
    return global.NovaEngine;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function difficulty(n) {
    var base = 1 - Math.exp(-(n - 1) / 420);
    var inWorld = (n - 1) % LEVELS_PER_WORLD;
    var wave = 0;
    if (inWorld === LEVELS_PER_WORLD - 1) wave = 0.1;      // boss de fin de monde
    else if (inWorld % 5 === 4) wave = 0.06;               // niveau « difficile »
    else if (inWorld % 5 === 0) wave = -0.06;              // niveau de répit
    var early = n < 15 ? -0.08 : 0;
    return clamp(base + wave + early, 0, 1.05);
  }

  function levelTag(n) {
    var inWorld = (n - 1) % LEVELS_PER_WORLD;
    if (n > 20 && inWorld === LEVELS_PER_WORLD - 1) return 'boss';
    if (n > 10 && inWorld % 5 === 4) return 'hard';
    return '';
  }

  /* ---------- formes de plateau ---------- */

  var SHAPES = [
    null,
    ['  ooooo  ', ' ooooooo ', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', ' ooooooo ', '  ooooo  '],
    ['ooo   ooo', 'ooo   ooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooo   ooo', 'ooo   ooo'],
    ['ooooooooo', 'ooooooooo', 'oooo oooo', 'ooo   ooo', 'oo     oo', 'ooo   ooo', 'oooo oooo', 'ooooooooo', 'ooooooooo'],
    ['oo ooo oo', 'ooooooooo', 'ooooooooo', ' ooooooo ', ' ooooooo ', ' ooooooo ', 'ooooooooo', 'ooooooooo', 'oo ooo oo'],
    [' ooo ooo ', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', ' ooooooo ', '  ooooo  ', '   ooo   ', '    o    '],
    ['ooooooooo', 'ooooooooo', 'ooo o ooo', 'ooooooooo', 'oo ooo oo', 'ooooooooo', 'ooo o ooo', 'ooooooooo', 'ooooooooo'],
    ['o ooooo o', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooo   ooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'o ooooo o'],
    ['ooooooooo', 'ooooooooo', ' ooooooo ', '  ooooo  ', '  ooooo  ', '  ooooo  ', ' ooooooo ', 'ooooooooo', 'ooooooooo'],
    ['   ooo   ', '  ooooo  ', ' ooooooo ', 'ooooooooo', 'ooooooooo', 'ooooooooo', ' ooooooo ', '  ooooo  ', '   ooo   '],
    ['ooooooooo', 'o ooooo o', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'o ooooo o', 'ooooooooo']
  ];

  function cropShape(shape, rows, cols) {
    // centre une forme 9x9 dans rows x cols
    var r0 = Math.floor((9 - rows) / 2), c0 = Math.floor((9 - cols) / 2);
    var out = [];
    for (var r = 0; r < rows; r++) out.push(shape[r + r0].substr(c0, cols));
    return out;
  }

  function randomSymmetricMask(rng, rows, cols, holes) {
    var grid = [];
    var r, c;
    for (r = 0; r < rows; r++) { grid.push([]); for (c = 0; c < cols; c++) grid[r].push('o'); }
    var half = Math.ceil(cols / 2);
    for (var i = 0; i < holes; i++) {
      r = Math.floor(rng() * rows);
      c = Math.floor(rng() * half);
      grid[r][c] = ' ';
      grid[r][cols - 1 - c] = ' ';
    }
    return grid.map(function (row) { return row.join(''); });
  }

  function maskValid(mask, rows, cols) {
    var on = 0, r, c;
    for (c = 0; c < cols; c++) {
      var colOn = 0;
      for (r = 0; r < rows; r++) if (mask[r].charAt(c) !== ' ') colOn++;
      if (colOn < 3) return false;
      on += colOn;
    }
    return on >= rows * cols * 0.7;
  }

  /* ---------- sélection des cases ---------- */

  function onCells(mask, rows, cols) {
    var out = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      if (!mask || mask[r].charAt(c) !== ' ') out.push([r, c]);
    }
    return out;
  }

  function pickSymmetric(rng, cells, cols, count, filter) {
    // choisit des cases par paires symétriques (gauche/droite)
    var pool = cells.filter(function (p) { return p[1] <= (cols - 1) / 2 && (!filter || filter(p)); });
    var chosen = {}, out = [];
    var guard = 0;
    while (out.length < count && guard++ < 500 && pool.length) {
      var p = pool[Math.floor(rng() * pool.length)];
      var k = p[0] * 100 + p[1];
      if (chosen[k]) continue;
      chosen[k] = 1;
      out.push(p);
      var m = [p[0], cols - 1 - p[1]];
      var km = m[0] * 100 + m[1];
      if (!chosen[km] && (!filter || filter(m))) { chosen[km] = 1; out.push(m); }
    }
    return out;
  }

  function jellyPattern(rng, cells, rows, cols, count) {
    var mode = Math.floor(rng() * 4);
    var cr = (rows - 1) / 2, cc = (cols - 1) / 2;
    var scored = cells.map(function (p) {
      var v;
      if (mode === 0) v = Math.abs(p[0] - cr) + Math.abs(p[1] - cc);                 // losange central
      else if (mode === 1) v = -(Math.abs(p[0] - cr) + Math.abs(p[1] - cc));          // bords
      else if (mode === 2) v = -p[0];                                                 // bas d'abord
      else v = Math.min(Math.abs(p[0] - p[1]), Math.abs(p[0] + p[1] - (cols - 1)));  // diagonales (X)
      return { p: p, v: v + rng() * 0.8 };
    });
    scored.sort(function (a, b) { return a.v - b.v; });
    return scored.slice(0, count).map(function (s) { return s.p; });
  }

  /* ---------- génération ---------- */

  var SCRIPTED = {
    1: 'score', 2: 'score', 3: 'collect', 4: 'jelly', 5: 'score', 6: 'jelly', 7: 'collect', 8: 'frost',
    9: 'jelly', 10: 'ingredient', 11: 'collect', 12: 'jelly', 13: 'frost', 14: 'ingredient', 15: 'score'
  };

  function chooseType(n, rng) {
    if (SCRIPTED[n]) return SCRIPTED[n];
    var w = [['jelly', 30], ['collect', 25], ['frost', 18], ['ingredient', 15], ['score', 8]];
    var total = 0;
    w.forEach(function (x) { total += x[1]; });
    var v = rng() * total;
    for (var i = 0; i < w.length; i++) { v -= w[i][1]; if (v <= 0) return w[i][0]; }
    return 'jelly';
  }

  var cache = {};

  function generate(n) {
    n = clamp(Math.floor(n), 1, MAX_LEVEL);
    if (cache[n]) return cache[n];
    var rng = rngFor(n);
    var d = difficulty(n);
    var tag = levelTag(n);
    var type = chooseType(n, rng);

    var colors = (n < 40 ? 5 : (rng() < lerp(0.15, 0.75, clamp((n - 40) / 600, 0, 1)) ? 6 : 5));
    if (tag === 'boss' && n > 60) colors = 6;

    // taille et forme
    var rows = 9, cols = 9;
    if (n <= 5) { rows = 8; cols = 8; }
    else if (rng() < 0.25) { rows = 8 + Math.floor(rng() * 2); cols = rng() < 0.5 ? 8 : 9; }
    if (cols === 8 && rows === 9 && rng() < 0.3) cols = 7;
    var mask = null;
    if (n > 12 && rng() < lerp(0.3, 0.7, d)) {
      if (rows === 9 && cols === 9 && rng() < 0.65) {
        mask = SHAPES[1 + Math.floor(rng() * (SHAPES.length - 1))];
      } else {
        for (var t = 0; t < 20; t++) {
          var m = randomSymmetricMask(rng, rows, cols, 2 + Math.floor(rng() * 4));
          if (maskValid(m, rows, cols)) { mask = m; break; }
        }
      }
      if (mask && !maskValid(mask, rows, cols)) mask = null;
    }
    if (mask && mask.length !== rows) mask = cropShape(mask, rows, cols);

    var cells = onCells(mask, rows, cols);
    var area = cells.length;
    var level = {
      n: n, rows: rows, cols: cols, colors: colors, mask: mask, jelly: [], frost: [], locks: [], goals: [],
      world: worldOf(n), tag: tag, difficulty: d, ingMax: 1
    };

    var hard = lerp(0, 1, clamp(d, 0, 1));
    var moves;
    var colorBonus = colors === 6 ? 1.45 : 1;

    // obstacles « décoratifs » (glace / cages) qui gênent sur les niveaux non-glace
    function addFrost(count, filter) {
      var hpMax = n < 40 ? 1 : n < 150 ? 2 : 3;
      var chosen = pickSymmetric(rng, cells, cols, count, filter);
      chosen.forEach(function (p) {
        var hp = 1 + Math.floor(rng() * hpMax * clamp(d + 0.3, 0, 1));
        level.frost.push([p[0], p[1], clamp(hp, 1, 3)]);
      });
    }
    function frostFree(p) {
      for (var i = 0; i < level.frost.length; i++) if (level.frost[i][0] === p[0] && level.frost[i][1] === p[1]) return false;
      return true;
    }
    function notTop(p) { return p[0] >= 2; }

    if (type === 'score') {
      moves = Math.round(lerp(22, 15, hard) + rng() * 4);
      var spm = colors === 5 ? 1400 : 650;
      var target = Math.round(moves * spm * lerp(0.4, 0.78, hard) / 500) * 500;
      level.goals.push({ type: 'score', target: Math.max(1000, target) });
      if (n > 20) addFrost(Math.round(lerp(0, 10, hard) * rng()), notTop);
    } else if (type === 'jelly') {
      var jc = Math.round(clamp(lerp(0.3, 0.85, hard) * area * lerp(0.6, 1, rng()), 8, area));
      if (n === 4) jc = 12;
      var jcells = jellyPattern(rng, cells, rows, cols, jc);
      var dbl = n > 60 ? lerp(0, 0.45, hard) : 0;
      var layers = 0;
      jcells.forEach(function (p) {
        var lv = rng() < dbl ? 2 : 1;
        layers += lv;
        level.jelly.push([p[0], p[1], lv]);
      });
      moves = Math.round(clamp(10 + layers * lerp(0.42, 0.26, hard) * colorBonus, 12, 50));
      level.goals.push({ type: 'jelly' });
      if (n > 22 && rng() < 0.5 + hard * 0.4) addFrost(Math.round(lerp(2, 12, hard)), notTop);
    } else if (type === 'collect') {
      var ncol = n <= 7 ? 1 : 1 + Math.floor(rng() * (n < 40 ? 2 : 3));
      moves = Math.round(lerp(24, 18, hard) + rng() * 4);
      var picks = [];
      while (picks.length < ncol) {
        var col = Math.floor(rng() * colors);
        if (picks.indexOf(col) < 0) picks.push(col);
      }
      var perMove = (colors === 5 ? 1.55 : 1.0) * lerp(0.8, 1.2, hard) * [1, 0.85, 0.75][ncol - 1];
      picks.forEach(function (col) {
        var cnt = Math.round(moves * perMove / 5) * 5;
        level.goals.push({ type: 'collect', color: col, count: Math.max(10, cnt) });
      });
      if (n > 25 && rng() < 0.6) addFrost(Math.round(lerp(2, 10, hard)), notTop);
    } else if (type === 'frost') {
      var fc = Math.round(clamp(lerp(10, 19, hard) + rng() * 5, 8, area * 0.4));
      addFrost(fc, notTop);
      var hpSum = 0;
      level.frost.forEach(function (f) { hpSum += f[2]; });
      moves = Math.round(clamp(10 + hpSum * lerp(0.75, 0.52, hard) * colorBonus, 14, 50));
      level.goals.push({ type: 'frost' });
    } else if (type === 'ingredient') {
      var ic = n < 30 ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * lerp(1, 3, hard));
      level.ingMax = ic >= 2 ? 2 : 1;
      moves = Math.round(clamp(ic * lerp(12, 10.5, hard) * (colors === 6 ? 1.6 : 1) + 6, 14, 55));
      level.goals.push({ type: 'ingredient', count: ic });
      if (n > 30 && rng() < 0.4) addFrost(Math.round(lerp(2, 8, hard)), function (p) { return p[0] >= 2 && p[0] < rows - 1; });
    }

    // second objectif sur les niveaux avancés
    if (n > 80 && type !== 'score' && type !== 'collect' && rng() < lerp(0.1, 0.5, hard)) {
      var col2 = Math.floor(rng() * colors);
      var extra = Math.round(moves * (colors === 6 ? 0.8 : 1.1) * lerp(0.7, 1.0, hard) / 5) * 5;
      level.goals.push({ type: 'collect', color: col2, count: Math.max(10, extra) });
      moves += 3;
    }

    // cages
    var hasIng = level.goals.some(function (g) { return g.type === 'ingredient'; });
    if (n > 40 && !hasIng && rng() < lerp(0.2, 0.7, hard)) {
      var lc = Math.round(lerp(4, 18, hard) * (0.5 + rng() * 0.5));
      pickSymmetric(rng, cells, cols, lc, function (p) { return frostFree(p) && p[0] > 0; }).forEach(function (p) {
        level.locks.push([p[0], p[1]]);
      });
    }

    if (tag === 'hard') moves = Math.max(10, moves - 1);
    if (tag === 'boss') moves = Math.max(10, moves - 2);
    level.moves = moves;

    // seuils d'étoiles
    var spm2 = colors === 5 ? 1400 : 750;
    if (type === 'score') {
      var tg = level.goals[0].target;
      level.stars = [tg, Math.round(tg * 1.35 / 500) * 500, Math.round(tg * 1.75 / 500) * 500];
    } else {
      var base = Math.round(moves * spm2 * 0.6 / 500) * 500 + 1000;
      level.stars = [Math.max(500, Math.round(base * 0.2 / 100) * 100), base, Math.round(base * 1.7 / 500) * 500];
    }
    cache[n] = level;
    return level;
  }

  function goalText(g) {
    switch (g.type) {
      case 'score': return 'Atteins ' + g.target.toLocaleString('fr-FR') + ' points';
      case 'jelly': return 'Dissous toute la gelée cosmique';
      case 'frost': return 'Brise toute la glace stellaire';
      case 'collect': return 'Récolte ' + g.count + ' bonbons';
      case 'ingredient': return 'Fais descendre ' + g.count + ' cristal' + (g.count > 1 ? 'aux' : '') + ' d\'étoile';
    }
    return '';
  }

  var api = {
    MAX_LEVEL: MAX_LEVEL, LEVELS_PER_WORLD: LEVELS_PER_WORLD,
    generate: generate, difficulty: difficulty, worldOf: worldOf, worldName: worldName,
    worldTheme: worldTheme, goalText: goalText, levelTag: levelTag,
    WORLD_COUNT: Math.ceil(MAX_LEVEL / LEVELS_PER_WORLD)
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.NovaLevels = api;
})(this);
