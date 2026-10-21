/*
 * Candy Nova - dessin procédural réaliste des bonbons et des obstacles.
 * Chaque bonbon est construit en couches : ombre portée, matière, détails,
 * transparence interne, assombrissement des bords, texture, reflets.
 */
(function (global) {
  'use strict';
  var K = global.NovaEngine.K;

  var PALETTE = [
    { name: 'Dragée Cerise', main: '#e3122f', light: '#ff8a96', dark: '#5e000c' },
    { name: 'Pastille Orange', main: '#ff7a00', light: '#ffc978', dark: '#7a2a00' },
    { name: 'Bonbon Citron', main: '#ffcf00', light: '#fff4a6', dark: '#8f5a00' },
    { name: 'Gomme Menthe', main: '#22b83a', light: '#a6ff94', dark: '#064d14' },
    { name: 'Boule Myrtille', main: '#1663f0', light: '#93d2ff', dark: '#041c6b' },
    { name: 'Gemme Raisin', main: '#8e2cf0', light: '#dcaaff', dark: '#320866' }
  ];

  function hexA(hex, a) {
    return 'rgba(' + parseInt(hex.substr(1, 2), 16) + ',' + parseInt(hex.substr(3, 2), 16) + ',' + parseInt(hex.substr(5, 2), 16) + ',' + a + ')';
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- formes ---------- */

  function shapePath(ctx, color, s) {
    ctx.beginPath();
    var i, a;
    switch (color) {
      case 0: // dragée (haricot)
        ctx.moveTo(-0.88 * s, 0.02 * s);
        ctx.bezierCurveTo(-0.92 * s, -0.62 * s, -0.2 * s, -0.78 * s, 0.08 * s, -0.5 * s);
        ctx.bezierCurveTo(0.3 * s, -0.32 * s, 0.5 * s, -0.68 * s, 0.78 * s, -0.46 * s);
        ctx.bezierCurveTo(1.08 * s, -0.2 * s, 0.96 * s, 0.62 * s, 0.28 * s, 0.66 * s);
        ctx.bezierCurveTo(-0.24 * s, 0.7 * s, -0.84 * s, 0.62 * s, -0.88 * s, 0.02 * s);
        ctx.closePath();
        break;
      case 1: // pastille carrée arrondie
        roundRect(ctx, -0.8 * s, -0.8 * s, 1.6 * s, 1.6 * s, 0.42 * s);
        break;
      case 2: // bonbon citron (ovale pointu)
        ctx.moveTo(-0.95 * s, 0.1 * s);
        ctx.bezierCurveTo(-0.7 * s, -0.75 * s, 0.55 * s, -0.85 * s, 0.95 * s, -0.1 * s);
        ctx.bezierCurveTo(0.7 * s, 0.75 * s, -0.55 * s, 0.85 * s, -0.95 * s, 0.1 * s);
        ctx.closePath();
        break;
      case 3: // gomme en dôme
        ctx.moveTo(-0.84 * s, 0.68 * s);
        ctx.bezierCurveTo(-0.94 * s, -0.22 * s, -0.52 * s, -0.86 * s, 0, -0.86 * s);
        ctx.bezierCurveTo(0.52 * s, -0.86 * s, 0.94 * s, -0.22 * s, 0.84 * s, 0.68 * s);
        ctx.quadraticCurveTo(0, 0.9 * s, -0.84 * s, 0.68 * s);
        ctx.closePath();
        break;
      case 4: // boule
        ctx.arc(0, 0, 0.82 * s, 0, Math.PI * 2);
        break;
      case 5: // gemme hexagonale
        for (i = 0; i < 6; i++) {
          a = Math.PI / 6 + i * Math.PI / 3;
          if (i) ctx.lineTo(Math.cos(a) * s * 0.88, Math.sin(a) * s * 0.88);
          else ctx.moveTo(Math.cos(a) * s * 0.88, Math.sin(a) * s * 0.88);
        }
        ctx.closePath();
        break;
    }
  }

  // matière de chaque bonbon : brillance, texture sucrée, transparence
  var MATERIAL = [
    { gloss: 1.0, sugar: 0, glow: 0.45 },   // dragée vernie
    { gloss: 0.8, sugar: 0, glow: 0.35 },   // pastille
    { gloss: 1.0, sugar: 0, glow: 0.6 },    // bonbon acidulé translucide
    { gloss: 0.4, sugar: 0.6, glow: 0.3 },  // gomme sucrée mate
    { gloss: 1.1, sugar: 0, glow: 0.4 },    // boule laquée
    { gloss: 0.9, sugar: 0, glow: 0.55 }    // gemme
  ];

  function sugarTexture(ctx, s, seed, amount) {
    var rnd = global.NovaEngine.mulberry32(seed);
    var n = Math.round(260 * amount);
    for (var i = 0; i < n; i++) {
      var x = (rnd() * 2 - 1) * s, y = (rnd() * 2 - 1) * s;
      var r = s * (0.012 + rnd() * 0.028);
      ctx.fillStyle = rnd() < 0.6 ? 'rgba(255,255,255,' + (0.25 + rnd() * 0.45) + ')' : 'rgba(0,0,0,' + (0.08 + rnd() * 0.12) + ')';
      ctx.fillRect(x, y, r * 2, r * 2);
    }
  }

  function candyBody(ctx, color, s, detail) {
    var p = PALETTE[color], m = MATERIAL[color];
    // ombre portée
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = s * 0.22;
    ctx.shadowOffsetY = s * 0.12;
    shapePath(ctx, color, s);
    ctx.fillStyle = p.dark;
    ctx.fill();
    ctx.restore();

    ctx.save();
    shapePath(ctx, color, s);
    ctx.clip();
    // matière de base, éclairée d'en haut à gauche
    var g = ctx.createLinearGradient(-0.5 * s, -s, 0.5 * s, s);
    g.addColorStop(0, p.light);
    g.addColorStop(0.42, p.main);
    g.addColorStop(1, p.dark);
    ctx.fillStyle = g;
    ctx.fillRect(-1.2 * s, -1.2 * s, 2.4 * s, 2.4 * s);
    if (detail) detail(ctx, s, p);
    // lumière qui traverse le bonbon (bas droite)
    var sg = ctx.createRadialGradient(0.25 * s, 0.42 * s, 0, 0.25 * s, 0.42 * s, 0.8 * s);
    sg.addColorStop(0, hexA(p.light, m.glow));
    sg.addColorStop(1, hexA(p.light, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(-1.2 * s, -1.2 * s, 2.4 * s, 2.4 * s);
    // bords plus sombres (volume)
    var eg = ctx.createRadialGradient(-0.12 * s, -0.18 * s, s * 0.35, 0, 0, s * 1.05);
    eg.addColorStop(0, 'rgba(0,0,0,0)');
    eg.addColorStop(0.75, hexA(p.dark, 0.35));
    eg.addColorStop(1, hexA(p.dark, 0.9));
    ctx.fillStyle = eg;
    ctx.fillRect(-1.2 * s, -1.2 * s, 2.4 * s, 2.4 * s);
    if (m.sugar) sugarTexture(ctx, s, 31 + color, m.sugar);
    // grand reflet doux
    ctx.save();
    ctx.translate(-0.28 * s, -0.44 * s);
    ctx.rotate(-0.45);
    ctx.scale(1, 0.45);
    var hg = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.48 * s);
    hg.addColorStop(0, 'rgba(255,255,255,' + (0.85 * m.gloss) + ')');
    hg.addColorStop(0.55, 'rgba(255,255,255,' + (0.35 * m.gloss) + ')');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(0, 0, 0.48 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // point de lumière net
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, 0.95 * m.gloss) + ')';
    ctx.beginPath();
    ctx.ellipse(-0.4 * s, -0.48 * s, 0.09 * s, 0.05 * s, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // reflet secondaire en bas à droite
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 * m.gloss) + ')';
    ctx.lineWidth = s * 0.06;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 0.62 * s, 0.25, 1.15);
    ctx.stroke();
    ctx.restore();
    // contour fin
    ctx.save();
    shapePath(ctx, color, s);
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.strokeStyle = hexA(p.dark, 0.7);
    ctx.stroke();
    ctx.restore();
  }

  // détails propres à chaque forme
  function shapeDetail(color) {
    if (color === 1) {
      return function (ctx, s, p) { // rainure de la pastille
        ctx.beginPath();
        roundRect(ctx, -0.5 * s, -0.5 * s, s, s, 0.24 * s);
        ctx.lineWidth = s * 0.07;
        ctx.strokeStyle = hexA(p.dark, 0.35);
        ctx.stroke();
        ctx.beginPath();
        roundRect(ctx, -0.46 * s, -0.46 * s, 0.92 * s, 0.92 * s, 0.22 * s);
        ctx.lineWidth = s * 0.03;
        ctx.strokeStyle = hexA(p.light, 0.45);
        ctx.stroke();
      };
    }
    if (color === 5) {
      return function (ctx, s, p) { // facettes de la gemme
        var i, a, pts = [], inner = [];
        for (i = 0; i < 6; i++) {
          a = Math.PI / 6 + i * Math.PI / 3;
          pts.push([Math.cos(a) * s * 0.88, Math.sin(a) * s * 0.88]);
          inner.push([Math.cos(a) * s * 0.48, Math.sin(a) * s * 0.48 - 0.04 * s]);
        }
        var shades = [0.18, -0.05, -0.32, -0.4, -0.2, 0.3];
        for (i = 0; i < 6; i++) {
          var j = (i + 1) % 6, v = shades[i];
          ctx.beginPath();
          ctx.moveTo(pts[i][0], pts[i][1]);
          ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.lineTo(inner[j][0], inner[j][1]);
          ctx.lineTo(inner[i][0], inner[i][1]);
          ctx.closePath();
          ctx.fillStyle = v > 0 ? 'rgba(255,255,255,' + v + ')' : 'rgba(0,0,0,' + (-v) + ')';
          ctx.fill();
        }
        ctx.beginPath();
        inner.forEach(function (q, k) { if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
        ctx.closePath();
        var tg = ctx.createLinearGradient(-0.4 * s, -0.4 * s, 0.4 * s, 0.4 * s);
        tg.addColorStop(0, hexA(p.light, 0.55));
        tg.addColorStop(1, hexA(p.main, 0.1));
        ctx.fillStyle = tg;
        ctx.fill();
      };
    }
    if (color === 0) {
      return function (ctx, s) { // marbrure légère de la dragée
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.ellipse(0.1 * s, 0.1 * s, 0.6 * s, 0.22 * s, -0.1, 0, Math.PI * 2);
        ctx.fill();
      };
    }
    if (color === 2) {
      return function (ctx, s, p) { // stries de l'agrume
        ctx.strokeStyle = hexA(p.light, 0.35);
        ctx.lineWidth = s * 0.03;
        for (var i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(-0.7 * s, i * 0.12 * s);
          ctx.quadraticCurveTo(0, i * 0.2 * s - 0.05 * s, 0.7 * s, i * 0.12 * s);
          ctx.stroke();
        }
      };
    }
    return null;
  }

  function drawBase(ctx, color, s) { candyBody(ctx, color, s, shapeDetail(color)); }

  function drawStriped(ctx, color, s, vertical) {
    var base = shapeDetail(color);
    candyBody(ctx, color, s, function (c, ss, p) {
      if (base) base(c, ss, p);
      c.save();
      if (vertical) c.rotate(Math.PI / 2);
      for (var i = -4; i <= 4; i++) {
        var y = i * ss * 0.28;
        var sg = c.createLinearGradient(0, y - ss * 0.08, 0, y + ss * 0.08);
        sg.addColorStop(0, 'rgba(255,255,255,0.55)');
        sg.addColorStop(0.5, 'rgba(255,255,255,0.95)');
        sg.addColorStop(1, 'rgba(255,255,255,0.55)');
        c.fillStyle = sg;
        c.beginPath();
        c.moveTo(-1.2 * ss, y - ss * 0.07);
        c.quadraticCurveTo(0, y - ss * 0.13, 1.2 * ss, y - ss * 0.07);
        c.lineTo(1.2 * ss, y + ss * 0.07);
        c.quadraticCurveTo(0, y + ss * 0.01, -1.2 * ss, y + ss * 0.07);
        c.closePath();
        c.fill();
      }
      c.restore();
    });
  }

  function drawWrapped(ctx, color, s) {
    var p = PALETTE[color];
    // papillotes en cellophane plissée
    [-1, 1].forEach(function (side) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = s * 0.12;
      ctx.beginPath();
      ctx.moveTo(0.48 * s, -0.12 * s);
      ctx.lineTo(1.0 * s, -0.5 * s);
      ctx.quadraticCurveTo(0.88 * s, 0, 1.0 * s, 0.5 * s);
      ctx.lineTo(0.48 * s, 0.12 * s);
      ctx.closePath();
      var wg = ctx.createLinearGradient(0.5 * s, -0.5 * s, 0.9 * s, 0.5 * s);
      wg.addColorStop(0, hexA(p.light, 0.95));
      wg.addColorStop(0.5, hexA(p.main, 0.85));
      wg.addColorStop(1, hexA(p.dark, 0.9));
      ctx.fillStyle = wg;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = s * 0.025;
      for (var k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(0.52 * s, k * 0.03 * s);
        ctx.lineTo(0.96 * s, k * 0.2 * s);
        ctx.stroke();
      }
      ctx.restore();
    });
    ctx.save();
    ctx.scale(0.8, 0.8);
    drawBase(ctx, color, s);
    ctx.restore();
    // film transparent brillant
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.74 * s, 0.7 * s, 0, 0, Math.PI * 2);
    var fg = ctx.createLinearGradient(-0.7 * s, -0.7 * s, 0.7 * s, 0.7 * s);
    fg.addColorStop(0, 'rgba(255,255,255,0.35)');
    fg.addColorStop(0.45, 'rgba(255,255,255,0.05)');
    fg.addColorStop(1, 'rgba(255,255,255,0.18)');
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.lineWidth = s * 0.03;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = s * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 0.6 * s, -2.6, -1.9);
    ctx.stroke();
    ctx.restore();
  }

  function drawNova(ctx, s) {
    // truffe en chocolat couverte de vermicelles colorés
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = s * 0.25;
    ctx.shadowOffsetY = s * 0.12;
    ctx.beginPath();
    ctx.arc(0, 0, 0.84 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#2a1208';
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 0.84 * s, 0, Math.PI * 2);
    ctx.clip();
    var g = ctx.createRadialGradient(-0.3 * s, -0.35 * s, 0.05 * s, 0, 0, 0.95 * s);
    g.addColorStop(0, '#8a5236');
    g.addColorStop(0.45, '#4a2312');
    g.addColorStop(1, '#170702');
    ctx.fillStyle = g;
    ctx.fillRect(-s, -s, 2 * s, 2 * s);
    var cols = ['#ff2a4a', '#ff8c1a', '#ffe020', '#2ed15a', '#2f8cff', '#b44bff', '#ffffff', '#ff6ec7'];
    var rnd = global.NovaEngine.mulberry32(77);
    for (var i = 0; i < 90; i++) {
      var a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.8 * s;
      var x = Math.cos(a) * d, y = Math.sin(a) * d;
      var edge = d / (0.84 * s);
      var len = s * 0.13 * (1 - edge * 0.55), wid = s * 0.045 * (1 - edge * 0.4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rnd() * Math.PI);
      var c = cols[i % cols.length];
      var sg = ctx.createLinearGradient(0, -wid, 0, wid);
      sg.addColorStop(0, '#ffffff');
      sg.addColorStop(0.35, c);
      sg.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = sg;
      ctx.globalAlpha = 1 - edge * 0.35;
      ctx.beginPath();
      roundRect(ctx, -len / 2, -wid / 2, len, wid, wid / 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    var eg = ctx.createRadialGradient(-0.1 * s, -0.15 * s, 0.4 * s, 0, 0, 0.9 * s);
    eg.addColorStop(0, 'rgba(0,0,0,0)');
    eg.addColorStop(1, 'rgba(10,2,0,0.75)');
    ctx.fillStyle = eg;
    ctx.fillRect(-s, -s, 2 * s, 2 * s);
    ctx.save();
    ctx.translate(-0.3 * s, -0.42 * s);
    ctx.rotate(-0.5);
    ctx.scale(1, 0.5);
    var hg = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.42 * s);
    hg.addColorStop(0, 'rgba(255,240,220,0.7)');
    hg.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(0, 0, 0.42 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    // halo d'énergie
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 0.86 * s, 0, Math.PI * 2);
    ctx.lineWidth = s * 0.04;
    ctx.strokeStyle = 'rgba(255,220,255,0.55)';
    ctx.shadowColor = 'rgba(200,120,255,0.9)';
    ctx.shadowBlur = s * 0.3;
    ctx.stroke();
    ctx.restore();
  }

  function drawIngredient(ctx, s) {
    // cristal doré à facettes
    var top = [0, -0.95 * s], bot = [0, 0.95 * s];
    var ring = [[-0.62 * s, -0.18 * s], [-0.22 * s, -0.06 * s], [0.22 * s, -0.06 * s], [0.62 * s, -0.18 * s]];
    ctx.save();
    ctx.shadowColor = 'rgba(255,200,60,0.9)';
    ctx.shadowBlur = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.lineTo(ring[3][0], ring[3][1]);
    ctx.lineTo(bot[0], bot[1]);
    ctx.lineTo(ring[0][0], ring[0][1]);
    ctx.closePath();
    ctx.fillStyle = '#c47a00';
    ctx.fill();
    ctx.restore();
    var faces = [
      [top, ring[0], ring[1], '#fff3b0'], [top, ring[1], ring[2], '#ffe066'], [top, ring[2], ring[3], '#ffbf2e'],
      [bot, ring[0], ring[1], '#d68a00'], [bot, ring[1], ring[2], '#b36800'], [bot, ring[2], ring[3], '#8a4a00']
    ];
    faces.forEach(function (f) {
      ctx.beginPath();
      ctx.moveTo(f[0][0], f[0][1]);
      ctx.lineTo(f[1][0], f[1][1]);
      ctx.lineTo(f[2][0], f[2][1]);
      ctx.closePath();
      var g = ctx.createLinearGradient(f[1][0], f[1][1], f[2][0], f[2][1]);
      g.addColorStop(0, f[3]);
      g.addColorStop(1, hexA(f[3], 0.85));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,250,220,0.55)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.stroke();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(-0.08 * s, -0.72 * s); ctx.lineTo(-0.38 * s, -0.24 * s); ctx.lineTo(-0.2 * s, -0.2 * s); ctx.closePath();
    ctx.fill();
    // étincelle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    var cx = 0.32 * s, cy = -0.52 * s, r = 0.2 * s;
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.2, cy - r * 0.2); ctx.lineTo(cx + r, cy); ctx.lineTo(cx + r * 0.2, cy + r * 0.2);
    ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.2, cy + r * 0.2); ctx.lineTo(cx - r, cy); ctx.lineTo(cx - r * 0.2, cy - r * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  function drawCandy(ctx, color, kind, s) {
    if (kind === K.NOVA) return drawNova(ctx, s);
    if (kind === K.ING) return drawIngredient(ctx, s);
    if (kind === K.WRAP) return drawWrapped(ctx, color, s);
    if (kind === K.SH) return drawStriped(ctx, color, s, false);
    if (kind === K.SV) return drawStriped(ctx, color, s, true);
    drawBase(ctx, color, s);
  }

  var cache = {}, cacheSizes = [];
  function sprite(color, kind, px) {
    px = Math.max(8, Math.round(px));
    if (cacheSizes.indexOf(px) < 0) {
      cacheSizes.push(px);
      if (cacheSizes.length > 8) {
        var old = cacheSizes.shift();
        Object.keys(cache).forEach(function (k) { if (k.split('_')[0] == old) delete cache[k]; });
      }
    }
    var key = px + '_' + color + '_' + kind;
    if (cache[key]) return cache[key];
    var cv = document.createElement('canvas');
    var pad = Math.ceil(px * 0.25);
    cv.width = cv.height = px + pad * 2;
    var ctx = cv.getContext('2d');
    ctx.translate(cv.width / 2, cv.height / 2);
    drawCandy(ctx, color, kind, px / 2 * 0.92);
    cv.pad = pad;
    cache[key] = cv;
    return cv;
  }

  var iconCache = {};
  function iconURL(color, kind, px) {
    var key = color + '_' + kind + '_' + px;
    if (iconCache[key]) return iconCache[key];
    var cv = document.createElement('canvas');
    cv.width = cv.height = px;
    var ctx = cv.getContext('2d');
    ctx.translate(px / 2, px / 2);
    drawCandy(ctx, color, kind, px / 2 * 0.78);
    iconCache[key] = cv.toDataURL();
    return iconCache[key];
  }

  function frostURL(px) { return special('frost', px, function (ctx) { drawFrost(ctx, 0, 0, px * 0.92, 2); }); }
  function jellyURL(px) { return special('jelly', px, function (ctx) { drawJelly(ctx, 0, 0, px * 0.92, 2); }); }
  function lockURL(px) { return special('lock', px, function (ctx) { drawLock(ctx, 0, 0, px * 0.9); }); }
  function special(name, px, fn) {
    var key = name + px;
    if (iconCache[key]) return iconCache[key];
    var cv = document.createElement('canvas');
    cv.width = cv.height = px;
    var ctx = cv.getContext('2d');
    ctx.translate(px * 0.04, px * 0.04);
    fn(ctx);
    iconCache[key] = cv.toDataURL();
    return iconCache[key];
  }

  /* ---------- obstacles (mis en cache par taille) ---------- */

  var obCache = {};
  function cached(key, size, fn) {
    var px = Math.round(size * (global.devicePixelRatio || 1));
    var k = key + '_' + px;
    var cv = obCache[k];
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = cv.height = px;
      var c = cv.getContext('2d');
      c.scale(px / size, px / size);
      fn(c, size);
      obCache[k] = cv;
    }
    return cv;
  }

  function drawJelly(ctx, x, y, size, level) {
    var img = cached('jelly' + level, size, function (c, sz) { paintJelly(c, sz, level); });
    ctx.drawImage(img, x, y, size, size);
  }
  function paintJelly(ctx, size, level) {
    var m = size * 0.05;
    ctx.beginPath();
    roundRect(ctx, m, m, size - 2 * m, size - 2 * m, size * 0.2);
    var g = ctx.createLinearGradient(0, 0, size * 0.3, size);
    if (level >= 2) { g.addColorStop(0, 'rgba(255,120,210,0.82)'); g.addColorStop(1, 'rgba(150,20,120,0.82)'); }
    else { g.addColorStop(0, 'rgba(255,170,225,0.5)'); g.addColorStop(1, 'rgba(210,70,180,0.45)'); }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // épaisseur du gel : bord intérieur plus sombre
    ctx.lineWidth = size * (level >= 2 ? 0.16 : 0.1);
    ctx.strokeStyle = level >= 2 ? 'rgba(110,0,80,0.45)' : 'rgba(150,30,120,0.3)';
    ctx.beginPath();
    roundRect(ctx, m, m, size - 2 * m, size - 2 * m, size * 0.2);
    ctx.stroke();
    // bulles
    var rnd = global.NovaEngine.mulberry32(level * 13 + 5);
    for (var i = 0; i < (level >= 2 ? 7 : 4); i++) {
      var bx = size * (0.2 + rnd() * 0.6), by = size * (0.2 + rnd() * 0.6), br = size * (0.02 + rnd() * 0.035);
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
    }
    // reflet de surface
    var hg = ctx.createLinearGradient(0, m, 0, size * 0.45);
    hg.addColorStop(0, 'rgba(255,255,255,0.5)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    roundRect(ctx, m * 2, m * 1.6, size - 4 * m, size * 0.32, size * 0.15);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.strokeStyle = 'rgba(255,220,245,0.85)';
    ctx.beginPath();
    roundRect(ctx, m, m, size - 2 * m, size - 2 * m, size * 0.2);
    ctx.stroke();
  }

  function drawFrost(ctx, x, y, size, hp) {
    var img = cached('frost' + hp, size, function (c, sz) { paintFrost(c, sz, hp); });
    ctx.drawImage(img, x, y, size, size);
  }
  function paintFrost(ctx, size, hp) {
    var m = size * 0.03, r = size * 0.12;
    ctx.save();
    ctx.shadowColor = 'rgba(0,10,40,0.5)';
    ctx.shadowBlur = size * 0.1;
    ctx.shadowOffsetY = size * 0.05;
    ctx.beginPath();
    roundRect(ctx, m, m, size - 2 * m, size - 2 * m, r);
    var g = ctx.createLinearGradient(0, 0, size, size);
    if (hp >= 3) { g.addColorStop(0, 'rgba(160,190,255,0.97)'); g.addColorStop(1, 'rgba(30,60,160,0.97)'); }
    else if (hp === 2) { g.addColorStop(0, 'rgba(205,240,255,0.95)'); g.addColorStop(1, 'rgba(70,150,215,0.95)'); }
    else { g.addColorStop(0, 'rgba(240,252,255,0.92)'); g.addColorStop(1, 'rgba(150,210,240,0.9)'); }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, m, m, size - 2 * m, size - 2 * m, r);
    ctx.clip();
    // biseau : faces claires en haut/gauche, sombres en bas/droite
    var b = size * 0.13;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(m, m); ctx.lineTo(size - m, m); ctx.lineTo(size - m - b, m + b); ctx.lineTo(m + b, m + b); ctx.lineTo(m + b, size - m - b); ctx.lineTo(m, size - m);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,30,90,0.25)';
    ctx.beginPath();
    ctx.moveTo(size - m, size - m); ctx.lineTo(m, size - m); ctx.lineTo(m + b, size - m - b); ctx.lineTo(size - m - b, size - m - b); ctx.lineTo(size - m - b, m + b); ctx.lineTo(size - m, m);
    ctx.closePath();
    ctx.fill();
    // givre
    var rnd = global.NovaEngine.mulberry32(hp * 101);
    for (var i = 0; i < 70; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + rnd() * 0.4) + ')';
      var fx = rnd() * size, fy = rnd() * size, fr = size * (0.006 + rnd() * 0.012);
      ctx.fillRect(fx, fy, fr, fr);
    }
    // fissures internes
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = Math.max(1, size * 0.018);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.82); ctx.lineTo(size * 0.48, size * 0.5); ctx.lineTo(size * 0.82, size * 0.6);
    ctx.moveTo(size * 0.48, size * 0.5); ctx.lineTo(size * 0.42, size * 0.18);
    ctx.stroke();
    if (hp < 3) {
      ctx.strokeStyle = 'rgba(10,40,100,0.45)';
      ctx.beginPath();
      ctx.moveTo(size * 0.7, size * 0.1); ctx.lineTo(size * 0.62, size * 0.32); ctx.lineTo(size * 0.76, size * 0.46);
      if (hp < 2) { ctx.moveTo(size * 0.1, size * 0.38); ctx.lineTo(size * 0.32, size * 0.5); ctx.lineTo(size * 0.22, size * 0.72); }
      ctx.stroke();
    }
    var hg = ctx.createRadialGradient(size * 0.3, size * 0.25, 0, size * 0.3, size * 0.25, size * 0.35);
    hg.addColorStop(0, 'rgba(255,255,255,0.7)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    roundRect(ctx, m, m, size - 2 * m, size - 2 * m, r);
    ctx.stroke();
    if (hp >= 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = 'bold ' + Math.round(size * 0.24) + 'px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0,20,60,0.8)';
      ctx.shadowBlur = size * 0.05;
      ctx.fillText(hp, size * 0.88, size * 0.94);
    }
  }

  function drawLock(ctx, x, y, size) {
    var img = cached('lock', size, function (c, sz) { paintLock(c, sz); });
    ctx.drawImage(img, x, y, size, size);
  }
  function metal(ctx, x0, y0, x1, y1) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#f4f6fb');
    g.addColorStop(0.35, '#9aa2b5');
    g.addColorStop(0.55, '#e3e7f0');
    g.addColorStop(1, '#4a5163');
    return g;
  }
  function paintLock(ctx, size) {
    // deux chaînes en croix
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.06;
    ctx.shadowOffsetY = size * 0.03;
    [1, -1].forEach(function (dir) {
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(dir * Math.PI / 4);
      var link = size * 0.17;
      for (var i = -3; i <= 3; i++) {
        var lx = i * link * 0.82;
        ctx.save();
        ctx.translate(lx, 0);
        var vertical = i % 2 === 0;
        var w = vertical ? link * 0.42 : link, h = vertical ? link * 0.62 : link * 0.48;
        ctx.beginPath();
        roundRect(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) / 2);
        ctx.lineWidth = size * 0.045;
        ctx.strokeStyle = metal(ctx, -w / 2, -h / 2, w / 2, h / 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    });
    ctx.restore();
    // cadenas
    var bw = size * 0.3, bh = size * 0.24, bx = size / 2 - bw / 2, by = size * 0.5;
    ctx.save();
    ctx.lineWidth = size * 0.05;
    ctx.strokeStyle = metal(ctx, bx, by - bh, bx + bw, by);
    ctx.beginPath();
    ctx.arc(size / 2, by, bw * 0.32, Math.PI, 0);
    ctx.stroke();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.06;
    ctx.beginPath();
    roundRect(ctx, bx, by, bw, bh, size * 0.04);
    var gg = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    gg.addColorStop(0, '#ffe58a');
    gg.addColorStop(0.5, '#d49b16');
    gg.addColorStop(1, '#7a5200');
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#3a2600';
    ctx.beginPath();
    ctx.arc(size / 2, by + bh * 0.42, size * 0.025, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(size / 2 - size * 0.01, by + bh * 0.42, size * 0.02, bh * 0.35);
    ctx.restore();
  }

  /* ---------- planètes réalistes (carte et décor) ---------- */

  var planetCache = {};
  function planetSprite(r, hue, ring, seed) {
    var key = Math.round(r) + '_' + hue + '_' + ring + '_' + seed;
    if (planetCache[key]) return planetCache[key];
    var dpr = global.devicePixelRatio || 1;
    var S = Math.ceil(r * (ring ? 3.6 : 2.6));
    var cv = document.createElement('canvas');
    cv.width = cv.height = Math.round(S * dpr);
    var c = cv.getContext('2d');
    c.scale(dpr, dpr);
    c.translate(S / 2, S / 2);
    var rnd = global.NovaEngine.mulberry32(seed);
    function ringPath(front) {
      c.save();
      c.rotate(-0.35);
      c.beginPath();
      c.ellipse(0, 0, r * 1.65, r * 0.42, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      c.lineWidth = r * 0.16;
      c.strokeStyle = 'hsla(' + ((hue + 30) % 360) + ',55%,72%,0.75)';
      c.stroke();
      c.lineWidth = r * 0.05;
      c.strokeStyle = 'hsla(' + ((hue + 30) % 360) + ',40%,90%,0.5)';
      c.stroke();
      c.restore();
    }
    if (ring) ringPath(false);
    // atmosphère
    var ag = c.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.25);
    ag.addColorStop(0, 'hsla(' + hue + ',90%,70%,0.45)');
    ag.addColorStop(1, 'hsla(' + hue + ',90%,70%,0)');
    c.fillStyle = ag;
    c.beginPath();
    c.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = 'hsl(' + hue + ',55%,45%)';
    c.fillRect(-r, -r, 2 * r, 2 * r);
    // bandes nuageuses
    for (var i = 0; i < 14; i++) {
      var yy = -r + rnd() * 2 * r, hh = r * (0.05 + rnd() * 0.18);
      c.fillStyle = 'hsla(' + (hue + (rnd() - 0.5) * 40) + ',' + (40 + rnd() * 40) + '%,' + (30 + rnd() * 45) + '%,0.55)';
      c.beginPath();
      c.ellipse(0, yy, r * 1.3, hh, (rnd() - 0.5) * 0.15, 0, Math.PI * 2);
      c.fill();
    }
    // cratères / taches
    for (i = 0; i < 6; i++) {
      c.fillStyle = 'rgba(0,0,0,' + (0.08 + rnd() * 0.12) + ')';
      c.beginPath();
      c.arc((rnd() - 0.5) * 1.6 * r, (rnd() - 0.5) * 1.6 * r, r * (0.05 + rnd() * 0.12), 0, Math.PI * 2);
      c.fill();
    }
    // ombre (terminateur)
    var sg = c.createRadialGradient(-r * 0.45, -r * 0.45, r * 0.2, -r * 0.2, -r * 0.2, r * 1.5);
    sg.addColorStop(0, 'rgba(255,255,255,0.18)');
    sg.addColorStop(0.45, 'rgba(0,0,0,0)');
    sg.addColorStop(0.8, 'rgba(0,0,10,0.7)');
    sg.addColorStop(1, 'rgba(0,0,10,0.95)');
    c.fillStyle = sg;
    c.fillRect(-r, -r, 2 * r, 2 * r);
    c.restore();
    if (ring) ringPath(true);
    cv.size = S;
    planetCache[key] = cv;
    return cv;
  }

  global.NovaArt = {
    PALETTE: PALETTE, sprite: sprite, iconURL: iconURL, drawCandy: drawCandy, roundRect: roundRect,
    drawJelly: drawJelly, drawFrost: drawFrost, drawLock: drawLock, planetSprite: planetSprite,
    frostURL: frostURL, jellyURL: jellyURL, lockURL: lockURL
  };
})(this);
