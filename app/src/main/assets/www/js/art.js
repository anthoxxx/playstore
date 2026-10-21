/*
 * Candy Nova - dessin procédural des bonbons et des obstacles.
 */
(function (global) {
  'use strict';
  var K = global.NovaEngine.K;

  var PALETTE = [
    { name: 'Cœur Fraise', main: '#ff3b6b', light: '#ffa3bd', dark: '#a3002f' },
    { name: 'Caramel Solaire', main: '#ff8c1a', light: '#ffd08a', dark: '#a84a00' },
    { name: 'Étoile Citron', main: '#ffd91a', light: '#fff6a8', dark: '#a88400' },
    { name: 'Gemme Menthe', main: '#2ee06a', light: '#b5ffcb', dark: '#05802f' },
    { name: 'Planète Myrtille', main: '#2f8cff', light: '#a8d4ff', dark: '#0a3fa3' },
    { name: 'Cristal Raisin', main: '#b44bff', light: '#e2b5ff', dark: '#5b0fa3' }
  ];

  function shapePath(ctx, color, s) {
    // s : demi-taille
    ctx.beginPath();
    var i, a;
    switch (color) {
      case 0: // cœur
        ctx.moveTo(0, s * 0.82);
        ctx.bezierCurveTo(-s * 1.15, -s * 0.05, -s * 0.72, -s * 0.98, 0, -s * 0.42);
        ctx.bezierCurveTo(s * 0.72, -s * 0.98, s * 1.15, -s * 0.05, 0, s * 0.82);
        break;
      case 1: // carré arrondi
        roundRect(ctx, -s * 0.78, -s * 0.78, s * 1.56, s * 1.56, s * 0.38);
        break;
      case 2: // étoile
        for (i = 0; i < 10; i++) {
          a = -Math.PI / 2 + i * Math.PI / 5;
          var rr = i % 2 ? s * 0.45 : s * 0.95;
          if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr + s * 0.06);
          else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr + s * 0.06);
        }
        ctx.closePath();
        break;
      case 3: // losange
        ctx.moveTo(0, -s * 0.95);
        ctx.quadraticCurveTo(s * 0.2, -s * 0.2, s * 0.85, 0);
        ctx.quadraticCurveTo(s * 0.2, s * 0.2, 0, s * 0.95);
        ctx.quadraticCurveTo(-s * 0.2, s * 0.2, -s * 0.85, 0);
        ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, -s * 0.95);
        break;
      case 4: // sphère
        ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
        break;
      case 5: // hexagone
        for (i = 0; i < 6; i++) {
          a = Math.PI / 6 + i * Math.PI / 3;
          if (i) ctx.lineTo(Math.cos(a) * s * 0.88, Math.sin(a) * s * 0.88);
          else ctx.moveTo(Math.cos(a) * s * 0.88, Math.sin(a) * s * 0.88);
        }
        ctx.closePath();
        break;
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBase(ctx, color, s) {
    var p = PALETTE[color];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = s * 0.18;
    ctx.shadowOffsetY = s * 0.08;
    shapePath(ctx, color, s);
    var g = ctx.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s * 1.1);
    g.addColorStop(0, p.light);
    g.addColorStop(0.45, p.main);
    g.addColorStop(1, p.dark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    ctx.save();
    shapePath(ctx, color, s);
    ctx.lineWidth = s * 0.07;
    ctx.strokeStyle = p.dark;
    ctx.stroke();
    ctx.clip();
    // reflet brillant
    ctx.beginPath();
    ctx.ellipse(-s * 0.22, -s * 0.38, s * 0.42, s * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.32, s * 0.3, s * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    ctx.restore();
  }

  function drawStripes(ctx, color, s, vertical) {
    ctx.save();
    shapePath(ctx, color, s);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    for (var i = -3; i <= 3; i++) {
      if (vertical) ctx.fillRect(i * s * 0.32 - s * 0.07, -s, s * 0.14, s * 2);
      else ctx.fillRect(-s, i * s * 0.32 - s * 0.07, s * 2, s * 0.14);
    }
    ctx.restore();
    ctx.save();
    shapePath(ctx, color, s);
    ctx.lineWidth = s * 0.07;
    ctx.strokeStyle = PALETTE[color].dark;
    ctx.stroke();
    ctx.restore();
  }

  function drawWrapped(ctx, color, s) {
    var p = PALETTE[color];
    ctx.save();
    // papillotes
    ctx.fillStyle = p.light;
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = s * 0.05;
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.55, 0);
      ctx.lineTo(side * s * 1.0, -s * 0.38);
      ctx.quadraticCurveTo(side * s * 0.88, 0, side * s * 1.0, s * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
    ctx.save();
    ctx.scale(0.84, 0.84);
    drawBase(ctx, color, s);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
    ctx.lineWidth = s * 0.1;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.setLineDash([s * 0.18, s * 0.12]);
    ctx.stroke();
    ctx.restore();
  }

  function drawNova(ctx, s) {
    ctx.save();
    ctx.shadowColor = 'rgba(180,120,255,0.9)';
    ctx.shadowBlur = s * 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.82, 0, Math.PI * 2);
    var g = ctx.createRadialGradient(-s * 0.25, -s * 0.3, s * 0.05, 0, 0, s * 0.9);
    g.addColorStop(0, '#6b4a9e');
    g.addColorStop(0.6, '#24123f');
    g.addColorStop(1, '#0a0418');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.82, 0, Math.PI * 2);
    ctx.clip();
    var cols = ['#ff3b6b', '#ff8c1a', '#ffd91a', '#2ee06a', '#2f8cff', '#b44bff', '#ffffff'];
    var rnd = global.NovaEngine.mulberry32(77);
    for (var i = 0; i < 34; i++) {
      var a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * s * 0.72;
      ctx.save();
      ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
      ctx.rotate(rnd() * Math.PI);
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      roundRect(ctx, -s * 0.11, -s * 0.035, s * 0.22, s * 0.07, s * 0.035);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(-s * 0.25, -s * 0.38, s * 0.32, s * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.82, 0, Math.PI * 2);
    ctx.lineWidth = s * 0.06;
    ctx.strokeStyle = 'rgba(230,200,255,0.9)';
    ctx.stroke();
  }

  function drawIngredient(ctx, s) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,220,90,0.95)';
    ctx.shadowBlur = s * 0.45;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.92);
    ctx.lineTo(s * 0.62, -s * 0.2);
    ctx.lineTo(0, s * 0.92);
    ctx.lineTo(-s * 0.62, -s * 0.2);
    ctx.closePath();
    var g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, '#fff8c4');
    g.addColorStop(0.5, '#ffc93d');
    g.addColorStop(1, '#c46a00');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = '#8a4a00';
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.92); ctx.lineTo(s * 0.62, -s * 0.2); ctx.lineTo(0, s * 0.92); ctx.lineTo(-s * 0.62, -s * 0.2); ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.62, -s * 0.2); ctx.lineTo(0, -s * 0.05); ctx.lineTo(s * 0.62, -s * 0.2);
    ctx.moveTo(0, -s * 0.05); ctx.lineTo(0, s * 0.92);
    ctx.strokeStyle = 'rgba(140,74,0,0.5)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.7); ctx.lineTo(-s * 0.4, -s * 0.22); ctx.lineTo(-s * 0.15, -s * 0.18); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCandy(ctx, color, kind, s) {
    if (kind === K.NOVA) return drawNova(ctx, s);
    if (kind === K.ING) return drawIngredient(ctx, s);
    if (kind === K.WRAP) return drawWrapped(ctx, color, s);
    drawBase(ctx, color, s);
    if (kind === K.SH) drawStripes(ctx, color, s, false);
    if (kind === K.SV) drawStripes(ctx, color, s, true);
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
    drawCandy(ctx, color, kind, px / 2 * 0.8);
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

  /* --- obstacles dessinés directement sur le plateau --- */

  function drawJelly(ctx, x, y, size, level) {
    ctx.save();
    var m = size * 0.06;
    ctx.beginPath();
    roundRect(ctx, x + m, y + m, size - 2 * m, size - 2 * m, size * 0.22);
    var g = ctx.createLinearGradient(x, y, x, y + size);
    if (level >= 2) { g.addColorStop(0, 'rgba(255,90,200,0.85)'); g.addColorStop(1, 'rgba(170,30,150,0.85)'); }
    else { g.addColorStop(0, 'rgba(255,150,225,0.55)'); g.addColorStop(1, 'rgba(220,80,200,0.5)'); }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, size * (level >= 2 ? 0.07 : 0.04));
    ctx.strokeStyle = level >= 2 ? 'rgba(255,220,250,0.95)' : 'rgba(255,210,245,0.7)';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + size * 0.3, y + size * 0.24, size * 0.14, size * 0.06, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.restore();
  }

  function drawFrost(ctx, x, y, size, hp) {
    ctx.save();
    var m = size * 0.04;
    ctx.beginPath();
    roundRect(ctx, x + m, y + m, size - 2 * m, size - 2 * m, size * 0.16);
    var g = ctx.createLinearGradient(x, y, x + size, y + size);
    if (hp >= 3) { g.addColorStop(0, '#9fb6ff'); g.addColorStop(1, '#2c3f9e'); }
    else if (hp === 2) { g.addColorStop(0, '#c9f2ff'); g.addColorStop(1, '#4d9fd6'); }
    else { g.addColorStop(0, '#f2fdff'); g.addColorStop(1, '#9fd9f2'); }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
    ctx.clip();
    // facettes
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.beginPath();
    ctx.moveTo(x + size * 0.15, y + size * 0.85); ctx.lineTo(x + size * 0.5, y + size * 0.45); ctx.lineTo(x + size * 0.85, y + size * 0.62);
    ctx.moveTo(x + size * 0.5, y + size * 0.45); ctx.lineTo(x + size * 0.42, y + size * 0.1);
    ctx.stroke();
    if (hp < 3) {
      ctx.strokeStyle = 'rgba(20,40,90,0.55)';
      ctx.beginPath();
      ctx.moveTo(x + size * 0.7, y + size * 0.1); ctx.lineTo(x + size * 0.6, y + size * 0.32); ctx.lineTo(x + size * 0.75, y + size * 0.45);
      if (hp < 2) { ctx.moveTo(x + size * 0.1, y + size * 0.4); ctx.lineTo(x + size * 0.3, y + size * 0.5); ctx.lineTo(x + size * 0.22, y + size * 0.7); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(x + size * 0.28, y + size * 0.22, size * 0.15, size * 0.06, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (hp >= 2) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = 'bold ' + Math.round(size * 0.26) + 'px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(hp, x + size * 0.88, y + size * 0.94);
      ctx.restore();
    }
  }

  function drawLock(ctx, x, y, size) {
    ctx.save();
    ctx.strokeStyle = '#d9dde8';
    ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.08;
    var m = size * 0.1;
    ctx.beginPath();
    roundRect(ctx, x + m, y + m, size - 2 * m, size - 2 * m, size * 0.14);
    ctx.stroke();
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.beginPath();
    ctx.moveTo(x + size * 0.37, y + m); ctx.lineTo(x + size * 0.37, y + size - m);
    ctx.moveTo(x + size * 0.63, y + m); ctx.lineTo(x + size * 0.63, y + size - m);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffcc33';
    ctx.strokeStyle = '#8a6200';
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.beginPath();
    roundRect(ctx, x + size * 0.38, y + size * 0.58, size * 0.24, size * 0.2, size * 0.04);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size * 0.5, y + size * 0.58, size * 0.08, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
  }

  global.NovaArt = {
    PALETTE: PALETTE, sprite: sprite, iconURL: iconURL, drawCandy: drawCandy, roundRect: roundRect,
    drawJelly: drawJelly, drawFrost: drawFrost, drawLock: drawLock,
    frostURL: frostURL, jellyURL: jellyURL, lockURL: lockURL
  };
})(this);
