/*
 * Candy Nova - by Anthony F (Floris Strange)
 * Rendu, animations, scènes (titre, carte, partie) et interface.
 */
(function () {
  'use strict';
  var E = window.NovaEngine, K = E.K, LV = window.NovaLevels, A = window.NovaArt, SND = window.NovaAudio;
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var ui = document.getElementById('ui');
  var W = 0, H = 0, DPR = 1, T = 0;
  var scene = 'title';

  /* ===================== Sauvegarde ===================== */

  var SAVE_KEY = 'candynova.save.v1';
  function defaultSave() {
    return {
      unlocked: 1, stars: {}, best: {}, coins: 300, lives: 5, livesTs: Date.now(),
      boosters: { hammer: 3, shuffle: 3, moves: 2 }, sfx: true, music: true, vibe: true,
      tips: {}, daily: { day: '', streak: 0 }, played: 0
    };
  }
  function loadSave() {
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s) {
        var d = defaultSave();
        for (var k in s) d[k] = s[k];
        return d;
      }
    } catch (e) { }
    return defaultSave();
  }
  var save = loadSave();
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }

  var MAX_LIVES = 5, LIFE_MS = 20 * 60 * 1000;
  function updateLives() {
    var now = Date.now();
    if (save.lives >= MAX_LIVES) { save.livesTs = now; return; }
    var gained = Math.floor((now - save.livesTs) / LIFE_MS);
    if (gained > 0) {
      save.lives = Math.min(MAX_LIVES, save.lives + gained);
      save.livesTs += gained * LIFE_MS;
      if (save.lives >= MAX_LIVES) save.livesTs = now;
      persist();
    }
  }
  function loseLife() {
    updateLives();
    if (save.lives >= MAX_LIVES) save.livesTs = Date.now();
    save.lives = Math.max(0, save.lives - 1);
    persist();
  }
  function fmtTime(ms) {
    ms = Math.max(0, ms);
    var m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmt(n) { return Math.round(n).toLocaleString('fr-FR'); }

  function vibe(ms) {
    if (!save.vibe) return;
    try {
      if (window.Android && window.Android.vibrate) window.Android.vibrate(ms);
      else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { }
  }

  /* ===================== Utilitaires ===================== */

  function wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function rgbStr(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')'; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* ===================== Fond étoilé ===================== */

  var bgStars = [];
  (function () {
    var rnd = E.mulberry32(4242);
    for (var i = 0; i < 170; i++) bgStars.push({ x: rnd(), y: rnd(), r: rnd() * 1.5 + 0.3, tw: rnd() * 6.28, sp: rnd() * 0.003 + 0.001, dy: rnd() * 0.00001 + 0.000004 });
  })();
  var themeCur = [hexRgb('#1b0f3d'), hexRgb('#c86bff')];
  var themeTgt = [hexRgb('#1b0f3d'), hexRgb('#c86bff')];
  function setTheme(w) {
    var t = LV.worldTheme(w);
    themeTgt = [hexRgb(t[0]), hexRgb(t[1])];
  }

  function drawBackground(now, dt) {
    for (var i = 0; i < 2; i++) for (var j = 0; j < 3; j++) themeCur[i][j] = lerp(themeCur[i][j], themeTgt[i][j], Math.min(1, dt * 0.004));
    var a = themeCur[0], b = themeCur[1];
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgbStr([a[0] * 0.5, a[1] * 0.5, a[2] * 0.5]));
    g.addColorStop(0.6, rgbStr(a));
    g.addColorStop(1, rgbStr([lerp(a[0], b[0], 0.35), lerp(a[1], b[1], 0.35), lerp(a[2], b[2], 0.35)]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // nébuleuses
    for (i = 0; i < 3; i++) {
      var nx = W * (0.5 + 0.4 * Math.sin(now * 0.00005 + i * 2.1));
      var ny = H * (0.3 + 0.35 * Math.cos(now * 0.00004 + i * 1.7));
      var rad = Math.max(W, H) * (0.45 + i * 0.1);
      var ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
      ng.addColorStop(0, rgbStr(b, 0.2 - i * 0.04));
      ng.addColorStop(1, rgbStr(b, 0));
      ctx.fillStyle = ng;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = '#fff';
    for (i = 0; i < bgStars.length; i++) {
      var s = bgStars[i];
      var y = ((s.y + now * s.dy) % 1) * H;
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(s.tw + now * s.sp));
      ctx.beginPath();
      ctx.arc(s.x * W, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ===================== Particules ===================== */

  var particles = [];
  function burst(x, y, color, n, speed, size) {
    n = n || 10;
    for (var i = 0; i < n && particles.length < 700; i++) {
      var a = Math.random() * Math.PI * 2, v = (Math.random() * 0.5 + 0.5) * (speed || 0.25);
      particles.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.08, life: 0,
        max: 450 + Math.random() * 350, size: (size || 4) * (0.5 + Math.random()), color: color, star: Math.random() < 0.35
      });
    }
  }
  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life += dt;
      if (p.life > p.max) { particles.splice(i, 1); continue; }
      p.vy += 0.0006 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var k = 1 - p.life / p.max;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      if (p.star) {
        drawStarShape(ctx, p.x, p.y, p.size * 1.3 * k + 1, p.life * 0.01);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawStarShape(c, x, y, r, rot) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
  }

  /* ===================== Fenêtres (DOM) ===================== */

  var modals = [];
  function modal(html, opts) {
    opts = opts || {};
    var ov = el('div', 'overlay');
    var panel = el('div', 'panel ' + (opts.cls || ''), html);
    ov.appendChild(panel);
    ui.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('show'); });
    var m = {
      el: panel, ov: ov, closable: opts.closable !== false, onBack: opts.onBack,
      close: function () {
        var i = modals.indexOf(m);
        if (i >= 0) modals.splice(i, 1);
        ov.classList.remove('show');
        setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 220);
      }
    };
    if (m.closable) ov.addEventListener('click', function (e) { if (e.target === ov) { SND.click(); m.close(); if (opts.onClose) opts.onClose(); } });
    panel.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { SND.click(); m.close(); if (opts.onClose) opts.onClose(); });
    });
    modals.push(m);
    return m;
  }
  function on(root, sel, fn) {
    var e = root.querySelector(sel);
    if (e) e.addEventListener('click', function (ev) { SND.click(); fn(ev); });
  }
  function toast(text, ms) {
    var t = el('div', 'toast', text);
    ui.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, ms || 2600);
  }
  function bigText(text, cls) {
    var t = el('div', 'bigtext ' + (cls || ''), text);
    ui.appendChild(t);
    setTimeout(function () { t.remove(); }, 1400);
  }

  function starsHTML(n, big) {
    var s = '';
    for (var i = 0; i < 3; i++) s += '<span class="st' + (i < n ? ' on' : '') + (big ? ' big' : '') + '">★</span>';
    return s;
  }

  function goalIcon(g, px) {
    px = px || 34;
    if (g.type === 'score') return '<span class="gi-star" style="font-size:' + (px * 0.8) + 'px">★</span>';
    var url;
    if (g.type === 'jelly') url = A.jellyURL(px * 2);
    else if (g.type === 'frost') url = A.frostURL(px * 2);
    else if (g.type === 'collect') url = A.iconURL(g.color, K.NORMAL, px * 2);
    else if (g.type === 'ingredient') url = A.iconURL(-1, K.ING, px * 2);
    return '<img src="' + url + '" width="' + px + '" height="' + px + '">';
  }

  /* ===================== Barre du haut (carte) ===================== */

  var topbar = null, livesTimer = null;
  function buildTopbar() {
    removeTopbar();
    topbar = el('div', 'topbar',
      '<div class="pill lives"><span class="ico">❤</span><b id="tb-lives"></b><small id="tb-ltime"></small></div>' +
      '<div class="pill coins"><span class="ico">🪙</span><b id="tb-coins"></b></div>' +
      '<button class="round-btn" id="tb-shop" aria-label="Boutique">🛒</button>' +
      '<button class="round-btn" id="tb-set" aria-label="Réglages">⚙</button>');
    ui.appendChild(topbar);
    on(topbar, '#tb-set', showSettings);
    on(topbar, '#tb-shop', showShop);
    on(topbar, '.lives', function () { if (save.lives < MAX_LIVES) showNoLives(true); });
    refreshTopbar();
    livesTimer = setInterval(refreshTopbar, 1000);
  }
  function removeTopbar() {
    if (topbar) topbar.remove();
    topbar = null;
    if (livesTimer) clearInterval(livesTimer);
    livesTimer = null;
  }
  function refreshTopbar() {
    if (!topbar) return;
    updateLives();
    topbar.querySelector('#tb-lives').textContent = save.lives;
    topbar.querySelector('#tb-ltime').textContent = save.lives < MAX_LIVES ? fmtTime(LIFE_MS - (Date.now() - save.livesTs)) : 'MAX';
    topbar.querySelector('#tb-coins').textContent = fmt(save.coins);
  }

  /* ===================== Écran titre ===================== */

  var titleEl = null, floaters = [];
  function showTitle() {
    clearScene();
    scene = 'title';
    setTheme(0);
    titleEl = el('div', 'title-screen',
      '<div class="logo"><span class="l1">Candy</span><span class="l2">Nova</span></div>' +
      '<div class="byline">by Anthony F <em>(Floris Strange)</em></div>' +
      '<button class="btn big play" id="t-play">JOUER</button>' +
      '<div class="title-links"><button class="link" id="t-help">Comment jouer</button><button class="link" id="t-set">Réglages</button></div>' +
      '<div class="version">v1.0 · 2000 niveaux</div>');
    ui.appendChild(titleEl);
    on(titleEl, '#t-play', function () { SND.init(); applyAudioPrefs(); showMap(); });
    on(titleEl, '#t-help', function () { SND.init(); showHelp(); });
    on(titleEl, '#t-set', function () { SND.init(); showSettings(); });
    floaters = [];
    for (var i = 0; i < 16; i++) {
      floaters.push({
        x: Math.random(), y: Math.random(), s: [30, 42, 56][i % 3], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.001,
        vy: 0.00003 + Math.random() * 0.00005, color: Math.floor(Math.random() * 6),
        kind: Math.random() < 0.15 ? K.NOVA : Math.random() < 0.2 ? K.SV : Math.random() < 0.2 ? K.WRAP : K.NORMAL
      });
    }
  }
  function drawTitle(now, dt) {
    for (var i = 0; i < floaters.length; i++) {
      var f = floaters[i];
      f.y -= f.vy * dt;
      f.rot += f.vr * dt;
      if (f.y < -0.1) { f.y = 1.1; f.x = Math.random(); }
      var img = A.sprite(f.color, f.kind, f.s * DPR);
      ctx.save();
      ctx.translate(f.x * W, f.y * H);
      ctx.rotate(f.rot);
      ctx.globalAlpha = 0.85;
      var sz = img.width / DPR;
      ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function clearScene() {
    while (modals.length) modals[0].close();
    if (titleEl) { titleEl.remove(); titleEl = null; }
    if (mapUI) { mapUI.remove(); mapUI = null; }
    if (hud) { hud.remove(); hud = null; }
    if (boosterBar) { boosterBar.remove(); boosterBar = null; }
    removeTopbar();
    G = null;
  }

  function applyAudioPrefs() {
    SND.setSfx(save.sfx);
    SND.setMusic(save.music);
  }

  /* ===================== Carte des niveaux ===================== */

  var MAX = LV.MAX_LEVEL, GAP = 92;
  var map = { scroll: 0, vel: 0, drag: null, total: 0 };
  var mapUI = null;
  function mapTotal() { return MAX * GAP + 320; }
  function nodePos(i) {
    var amp = Math.min(W * 0.3, 150);
    return { x: W / 2 + Math.sin(i * 0.62) * amp + Math.sin(i * 0.17) * amp * 0.2, y: mapTotal() - (i - 0.5) * GAP - 140 };
  }
  function scrollToLevel(n) {
    map.scroll = clamp(nodePos(n).y - H * 0.62, 0, mapTotal() - H);
  }

  function showMap() {
    clearScene();
    scene = 'map';
    buildTopbar();
    mapUI = el('div', 'map-ui',
      '<button class="btn big play" id="m-play"></button>');
    ui.appendChild(mapUI);
    var cur = Math.min(save.unlocked, MAX);
    mapUI.querySelector('#m-play').textContent = 'Niveau ' + cur + ' ▶';
    on(mapUI, '#m-play', function () { showLevelIntro(Math.min(save.unlocked, MAX)); });
    scrollToLevel(cur);
    map.vel = 0;
    checkDaily();
  }

  var planetCache = {};
  function worldPlanets(w) {
    if (planetCache[w]) return planetCache[w];
    var rnd = E.mulberry32(w * 977 + 3);
    var list = [];
    for (var i = 0; i < 3; i++) {
      list.push({ fx: rnd(), lv: w * 20 + 1 + rnd() * 19, r: 18 + rnd() * 46, ring: rnd() < 0.5, hue: Math.floor(rnd() * 360), side: rnd() < 0.5 ? -1 : 1 });
    }
    planetCache[w] = list;
    return list;
  }

  function drawMap(now, dt) {
    if (!map.drag) {
      map.scroll += map.vel * dt;
      map.vel *= Math.pow(0.994, dt);
      if (Math.abs(map.vel) < 0.01) map.vel = 0;
    }
    map.scroll = clamp(map.scroll, 0, mapTotal() - H);
    var sc = map.scroll;
    // niveau au centre de l'écran -> thème
    var centerLv = clamp(Math.round((mapTotal() - 140 - (sc + H / 2)) / GAP + 0.5), 1, MAX);
    setTheme(LV.worldOf(centerLv));
    var first = clamp(Math.floor((mapTotal() - 140 - (sc + H + GAP)) / GAP), 1, MAX);
    var last = clamp(Math.ceil((mapTotal() - 140 - (sc - GAP)) / GAP) + 1, 1, MAX);
    var i, p;
    // planètes décoratives
    var w0 = LV.worldOf(first), w1 = LV.worldOf(last);
    for (var w = w0; w <= w1; w++) {
      worldPlanets(w).forEach(function (pl) {
        var py = mapTotal() - (pl.lv - 0.5) * GAP - 140 - sc;
        var px = pl.side < 0 ? W * 0.08 + pl.fx * W * 0.12 : W * 0.92 - pl.fx * W * 0.12;
        drawPlanet(px, py, pl.r, pl.hue, pl.ring);
      });
    }
    // bannières de monde
    for (i = first; i <= last; i++) {
      if ((i - 1) % LV.LEVELS_PER_WORLD === 0) {
        p = nodePos(i);
        var by = p.y - sc + GAP * 0.5 + 6;
        var wn = LV.worldOf(i);
        var th = LV.worldTheme(wn);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        A.roundRect(ctx, W / 2 - 140, by - 15, 280, 30, 15);
        ctx.fill();
        ctx.strokeStyle = th[1];
        ctx.lineWidth = 2;
        ctx.beginPath();
        A.roundRect(ctx, W / 2 - 140, by - 15, 280, 30, 15);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '700 14px "Baloo 2", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Monde ' + (wn + 1) + ' · ' + LV.worldName(wn), W / 2, by + 1);
        ctx.restore();
      }
    }
    // chemin
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (i = first; i <= last; i++) {
      p = nodePos(i);
      if (i === first) ctx.moveTo(p.x, p.y - sc); else ctx.lineTo(p.x, p.y - sc);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.setLineDash([2, 14]);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
    // noeuds
    var cur = Math.min(save.unlocked, MAX);
    for (i = first; i <= last; i++) {
      p = nodePos(i);
      var y = p.y - sc;
      var tag = LV.levelTag(i);
      var rad = tag === 'boss' ? 30 : 24;
      var unlocked = i <= save.unlocked;
      var th2 = LV.worldTheme(LV.worldOf(i));
      ctx.save();
      if (i === cur) {
        var pulse = 1 + 0.12 * Math.sin(now * 0.006);
        var gg = ctx.createRadialGradient(p.x, y, 0, p.x, y, rad * 2.2 * pulse);
        gg.addColorStop(0, 'rgba(255,255,200,0.7)');
        gg.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(p.x, y, rad * 2.2 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(p.x, y + 4, rad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, y, rad, 0, Math.PI * 2);
      var ng = ctx.createRadialGradient(p.x - rad * 0.3, y - rad * 0.4, 2, p.x, y, rad);
      if (unlocked) {
        ng.addColorStop(0, '#ffffff');
        ng.addColorStop(0.25, tag === 'boss' ? '#ffd23d' : th2[1]);
        ng.addColorStop(1, tag === 'boss' ? '#b33a00' : shade(th2[1], -0.45));
      } else {
        ng.addColorStop(0, '#8a86a3');
        ng.addColorStop(1, '#3a3652');
      }
      ctx.fillStyle = ng;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = unlocked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)';
      ctx.stroke();
      ctx.fillStyle = unlocked ? '#fff' : 'rgba(255,255,255,0.55)';
      ctx.font = '800 ' + (i >= 1000 ? 14 : 17) + 'px "Baloo 2", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 3;
      ctx.fillText(i, p.x, y + 1);
      ctx.shadowBlur = 0;
      if (tag === 'hard' || tag === 'boss') {
        ctx.font = '700 10px system-ui, sans-serif';
        ctx.fillStyle = tag === 'boss' ? '#ffd23d' : '#ff7a9c';
        ctx.fillText(tag === 'boss' ? 'BOSS' : 'DIFFICILE', p.x, y - rad - 9);
      }
      var st = save.stars[i] || 0;
      if (unlocked && i < save.unlocked) {
        for (var k = 0; k < 3; k++) {
          ctx.fillStyle = k < st ? '#ffd23d' : 'rgba(255,255,255,0.25)';
          drawStarShape(ctx, p.x + (k - 1) * 15, y + rad + 8 + (k === 1 ? 3 : 0), 7, 0);
        }
      }
      ctx.restore();
      if (i === cur) {
        // petit vaisseau au-dessus du niveau courant
        var bob = Math.sin(now * 0.005) * 4;
        drawRocket(p.x, y - rad - 26 + bob);
      }
    }
  }

  function shade(hex, k) {
    var c = hexRgb(hex);
    return rgbStr(k < 0 ? [c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k)] : [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k]);
  }
  function drawPlanet(x, y, r, hue, ring) {
    ctx.save();
    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, 'hsla(' + hue + ',90%,80%,0.9)');
    g.addColorStop(0.6, 'hsla(' + hue + ',70%,50%,0.75)');
    g.addColorStop(1, 'hsla(' + hue + ',70%,20%,0.6)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (ring) {
      ctx.strokeStyle = 'hsla(' + ((hue + 40) % 360) + ',90%,75%,0.6)';
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.6, r * 0.38, -0.35, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawRocket(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,170,60,' + (0.6 + Math.random() * 0.4) + ')';
    ctx.beginPath();
    ctx.moveTo(-5, 10); ctx.lineTo(0, 20 + Math.random() * 6); ctx.lineTo(5, 10); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2f2ff';
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.quadraticCurveTo(10, -2, 7, 11); ctx.lineTo(-7, 11); ctx.quadraticCurveTo(-10, -2, 0, -14);
    ctx.fill();
    ctx.fillStyle = '#ff3b6b';
    ctx.beginPath(); ctx.moveTo(-7, 4); ctx.lineTo(-12, 13); ctx.lineTo(-6, 11); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7, 4); ctx.lineTo(12, 13); ctx.lineTo(6, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2f8cff';
    ctx.beginPath(); ctx.arc(0, -2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function mapTap(x, y) {
    var sc = map.scroll;
    var approx = Math.round((mapTotal() - 140 - (y + sc)) / GAP + 0.5);
    for (var i = approx - 2; i <= approx + 2; i++) {
      if (i < 1 || i > MAX) continue;
      var p = nodePos(i);
      if (Math.hypot(p.x - x, p.y - sc - y) < 34) {
        SND.click();
        if (i <= save.unlocked) showLevelIntro(i);
        else toast('🔒 Termine le niveau ' + save.unlocked + ' pour avancer');
        return;
      }
    }
  }

  /* ===================== Récompense quotidienne ===================== */

  function dayStr(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function checkDaily() {
    var today = dayStr(new Date());
    if (save.daily.day === today) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var streak = save.daily.day === dayStr(y) ? save.daily.streak + 1 : 1;
    var coins = 20 + Math.min(streak, 7) * 10;
    var bonusBooster = streak % 7 === 0;
    save.daily = { day: today, streak: streak };
    save.coins += coins;
    if (bonusBooster) { save.boosters.hammer++; save.boosters.shuffle++; save.boosters.moves++; }
    persist();
    var m = modal(
      '<h2>Bonus cosmique</h2><div class="daily-ico">🎁</div>' +
      '<p>Jour <b>' + streak + '</b> d\'affilée !</p>' +
      '<p class="reward">+' + coins + ' 🪙' + (bonusBooster ? '<br>+1 de chaque bonus 🔨🌀➕' : '') + '</p>' +
      '<p class="small">Reviens chaque jour pour un bonus encore plus gros.</p>' +
      '<button class="btn" data-close>Merci !</button>');
    SND.coin();
    refreshTopbar();
    return m;
  }

  /* ===================== Présentation d'un niveau ===================== */

  var OBST_TIPS = {
    jelly: 'Gelée cosmique : fais exploser les bonbons posés dessus pour la dissoudre (les gelées épaisses demandent 2 coups).',
    frost: 'Glace stellaire : fais des combinaisons juste à côté pour la briser. Le chiffre indique sa solidité.',
    lock: 'Cage : un bonbon en cage ne peut pas bouger. Aligne-le pour briser la cage.',
    ingredient: 'Cristal d\'étoile : fais-le descendre jusqu\'en bas du plateau (repère les flèches ▼).'
  };

  function showLevelIntro(n) {
    var lv = LV.generate(n);
    var tag = lv.tag;
    var goals = lv.goals.map(function (g) {
      var label = g.type === 'collect' ? 'Récolte <b>' + g.count + '</b>' :
        g.type === 'score' ? '<b>' + fmt(g.target) + '</b> pts' :
          g.type === 'ingredient' ? 'Descends <b>' + g.count + '</b>' :
            g.type === 'jelly' ? 'Toute la <b>gelée</b>' : 'Toute la <b>glace</b>';
      return '<div class="goal-card">' + goalIcon(g, 42) + '<div>' + label + '</div></div>';
    }).join('');
    var tips = [];
    var kinds = {};
    if (lv.jelly.length) kinds.jelly = 1;
    if (lv.frost.length) kinds.frost = 1;
    if (lv.locks.length) kinds.lock = 1;
    lv.goals.forEach(function (g) { if (g.type === 'ingredient') kinds.ingredient = 1; });
    Object.keys(kinds).forEach(function (k) { if (!save.tips['o_' + k]) tips.push(OBST_TIPS[k]); });
    var st = save.stars[n] || 0;
    var m = modal(
      '<div class="lv-head"><div class="lv-world">Monde ' + (lv.world + 1) + ' · ' + LV.worldName(lv.world) + '</div>' +
      '<h2>Niveau ' + n + '</h2>' +
      (tag === 'boss' ? '<div class="tag boss">BOSS</div>' : tag === 'hard' ? '<div class="tag hard">DIFFICILE</div>' : '') +
      '<div class="stars-row">' + starsHTML(st, true) + '</div></div>' +
      '<div class="goals-intro">' + goals + '</div>' +
      '<p class="moves-line"><b>' + lv.moves + '</b> coups</p>' +
      (save.best[n] ? '<p class="small">Meilleur score : ' + fmt(save.best[n]) + '</p>' : '') +
      tips.map(function (t) { return '<p class="tip">💡 ' + t + '</p>'; }).join('') +
      '<div class="btn-row"><button class="btn ghost" data-close>Fermer</button><button class="btn play" id="li-play">JOUER</button></div>');
    on(m.el, '#li-play', function () {
      updateLives();
      if (save.lives <= 0) { m.close(); showNoLives(); return; }
      Object.keys(kinds).forEach(function (k) { save.tips['o_' + k] = 1; });
      persist();
      m.close();
      startLevel(n);
    });
  }

  function showNoLives(info) {
    updateLives();
    var full = save.lives >= MAX_LIVES;
    var m = modal(
      '<h2>' + (save.lives > 0 ? 'Vies' : 'Plus de vies !') + '</h2>' +
      '<div class="daily-ico">' + (save.lives > 0 ? '❤️' : '💔') + '</div>' +
      '<p>Tu as <b>' + save.lives + '</b> / ' + MAX_LIVES + ' vies.</p>' +
      (full ? '' : '<p class="small">Prochaine vie dans <b id="nl-t">' + fmtTime(LIFE_MS - (Date.now() - save.livesTs)) + '</b></p>') +
      (full ? '' : '<button class="btn gold" id="nl-buy">Recharger toutes les vies · 150 🪙</button>') +
      '<button class="btn ghost" data-close>Fermer</button>');
    var iv = setInterval(function () {
      var t = m.el.querySelector('#nl-t');
      if (!t) { clearInterval(iv); return; }
      updateLives();
      t.textContent = fmtTime(LIFE_MS - (Date.now() - save.livesTs));
    }, 1000);
    on(m.el, '#nl-buy', function () {
      if (save.coins < 150) { toast('Pas assez de pièces 🪙'); return; }
      save.coins -= 150;
      save.lives = MAX_LIVES;
      save.livesTs = Date.now();
      persist();
      SND.coin();
      refreshTopbar();
      m.close();
      toast('❤ Vies rechargées !');
    });
  }

  /* ===================== Partie ===================== */

  var G = null, hud = null, boosterBar = null;
  var sprites = {};
  var effects = [], popups = [], flyers = [];
  var settleWaiters = [];

  function startLevel(n) {
    clearScene();
    scene = 'play';
    var level = LV.generate(n);
    var seed = ((Date.now() & 0xffffff) * 31 + n * 7919) >>> 0;
    var board = new E.Board(level, seed);
    setTheme(level.world);
    G = {
      n: n, level: level, board: board, cellsView: board.snapshotCells(), busy: true, sel: null,
      score: 0, goals: board.goalState(), moves: board.moves, hint: null, lastAction: performance.now(),
      hammer: false, ended: false, cs: 40, bx: 0, by: 0, combo: 0
    };
    sprites = {};
    effects = []; popups = []; flyers = []; particles = [];
    save.played++;
    persist();
    buildHUD();
    layoutBoard();
    board.snapshotCandies().forEach(function (cd) {
      var s = addSprite(cd, cd.r - level.rows - 1 - (level.rows - cd.r) * 0.25, cd.c);
      s.path = [[cd.r, cd.c]];
      s.v = 0.002;
    });
    var g = G;
    waitSettle().then(function () {
      if (G !== g) return;
      G.busy = false;
      G.lastAction = performance.now();
      if (n <= 2) setTimeout(function () { if (G === g && !G.busy) showHint(true); }, 400);
    });
    var gtxt = level.goals.map(LV.goalText).join(' · ');
    toast('<b>Niveau ' + n + '</b><br>' + gtxt, 2400);
  }

  function addSprite(cd, row, col) {
    var s = { id: cd.id, color: cd.color, kind: cd.kind, x: col, y: row, path: [], v: 0, scale: 1, alpha: 1, dying: 0, squash: 0, flash: 0, tween: null };
    sprites[cd.id] = s;
    return s;
  }

  function buildHUD() {
    hud = el('div', 'hud',
      '<div class="hud-row">' +
      '<div class="hud-box moves"><div class="lbl">Coups</div><div class="val" id="h-moves"></div></div>' +
      '<div class="hud-box mid"><div class="lbl" id="h-lvl"></div><div class="score" id="h-score">0</div>' +
      '<div class="sbar"><div class="fill" id="h-fill"></div><i class="mk" id="mk1"></i><i class="mk" id="mk2"></i><i class="mk" id="mk3"></i></div></div>' +
      '<div class="hud-box goals" id="h-goals"></div>' +
      '</div>');
    ui.appendChild(hud);
    hud.querySelector('#h-lvl').textContent = 'Niveau ' + G.n;
    var stars = G.level.stars, top = stars[2];
    ['mk1', 'mk2', 'mk3'].forEach(function (id, i) {
      var mk = hud.querySelector('#' + id);
      mk.style.left = (stars[i] / top * 100) + '%';
      mk.textContent = '★';
    });
    boosterBar = el('div', 'boosters',
      '<button class="boost" id="b-pause" aria-label="Pause"><span class="bi">⏸</span></button>' +
      '<button class="boost" id="b-hammer"><span class="bi">🔨</span><span class="bc" id="bc-hammer"></span></button>' +
      '<button class="boost" id="b-shuffle"><span class="bi">🌀</span><span class="bc" id="bc-shuffle"></span></button>' +
      '<button class="boost" id="b-moves"><span class="bi">➕5</span><span class="bc" id="bc-moves"></span></button>');
    ui.appendChild(boosterBar);
    on(boosterBar, '#b-pause', showPause);
    on(boosterBar, '#b-hammer', function () { useBooster('hammer'); });
    on(boosterBar, '#b-shuffle', function () { useBooster('shuffle'); });
    on(boosterBar, '#b-moves', function () { useBooster('moves'); });
    updateHUD();
  }

  var BOOST_PRICE = { hammer: 60, shuffle: 40, moves: 90 };
  var BOOST_NAME = { hammer: 'Marteau', shuffle: 'Mélange', moves: '+5 coups' };

  function updateHUD() {
    if (!hud || !G) return;
    hud.querySelector('#h-moves').textContent = G.moves;
    hud.querySelector('#h-moves').classList.toggle('low', G.moves <= 5);
    hud.querySelector('#h-score').textContent = fmt(G.score);
    var stars = G.level.stars;
    hud.querySelector('#h-fill').style.width = clamp(G.score / stars[2] * 100, 0, 100) + '%';
    ['mk1', 'mk2', 'mk3'].forEach(function (id, i) { hud.querySelector('#' + id).classList.toggle('on', G.score >= stars[i]); });
    var gh = hud.querySelector('#h-goals');
    var html = G.goals.map(function (g, i) {
      var left = g.need - g.have;
      var txt = g.type === 'score' ? fmt(g.need) : (left <= 0 ? '✔' : left);
      return '<div class="goal' + (left <= 0 ? ' done' : '') + '" data-gi="' + i + '">' + goalIcon(g, 30) + '<span>' + txt + '</span></div>';
    }).join('');
    if (gh.innerHTML !== html) gh.innerHTML = html;
    if (boosterBar) {
      ['hammer', 'shuffle', 'moves'].forEach(function (k) {
        var n = save.boosters[k] || 0;
        boosterBar.querySelector('#bc-' + k).textContent = n > 0 ? n : '+';
        boosterBar.querySelector('#b-' + k).classList.toggle('empty', n <= 0);
      });
      boosterBar.querySelector('#b-hammer').classList.toggle('active', !!G.hammer);
    }
  }

  function layoutBoard() {
    if (!G) return;
    var hudBottom = hud ? hud.getBoundingClientRect().bottom : 110;
    var barTop = boosterBar ? boosterBar.getBoundingClientRect().top : H - 90;
    var R = G.level.rows, C = G.level.cols;
    var availW = W - 16, availH = barTop - hudBottom - 16;
    var cs = Math.floor(Math.min(availW / C, availH / R, 76));
    G.cs = cs;
    G.bx = Math.round((W - cs * C) / 2);
    G.by = Math.round(hudBottom + 8 + (availH - cs * R) / 2);
  }

  function cellCenter(r, c) { return { x: G.bx + (c + 0.5) * G.cs, y: G.by + (r + 0.5) * G.cs }; }

  /* ---------- mise à jour des sprites ---------- */

  function updateSprites(dt) {
    var moving = false, landed = 0;
    for (var id in sprites) {
      var s = sprites[id];
      if (s.dying) {
        s.dying += dt;
        if (s.dying > 220) { delete sprites[id]; continue; }
        moving = true;
      }
      if (s.tween) {
        var tw = s.tween;
        var p = clamp((T - tw.t0) / tw.dur, 0, 1);
        var e = tw.ease ? tw.ease(p) : easeInOut(p);
        s.x = lerp(tw.fx, tw.tx, e);
        s.y = lerp(tw.fy, tw.ty, e);
        if (p >= 1) { s.tween = null; s.x = tw.tx; s.y = tw.ty; if (tw.res) tw.res(); }
        moving = true;
      } else if (s.path.length) {
        moving = true;
        s.v = Math.min(s.v + 0.000075 * dt, 0.028);
        var step = s.v * dt;
        while (step > 0 && s.path.length) {
          var tgt = s.path[0];
          var dx = tgt[1] - s.x, dy = tgt[0] - s.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= step) {
            s.x = tgt[1]; s.y = tgt[0];
            step -= dist;
            s.path.shift();
          } else {
            s.x += dx / dist * step;
            s.y += dy / dist * step;
            step = 0;
          }
        }
        if (!s.path.length) { s.squash = 1; s.v = 0; landed++; }
      }
      if (s.squash > 0) s.squash = Math.max(0, s.squash - dt / 180);
      if (s.flash > 0) s.flash = Math.max(0, s.flash - dt / 500);
    }
    if (landed) SND.land();
    if (!moving && settleWaiters.length) {
      var ws = settleWaiters;
      settleWaiters = [];
      ws.forEach(function (f) { f(); });
    }
    return moving;
  }
  function waitSettle() { return new Promise(function (res) { settleWaiters.push(res); }); }
  function tweenTo(s, r, c, dur, ease) {
    return new Promise(function (res) { s.tween = { fx: s.x, fy: s.y, tx: c, ty: r, t0: T, dur: dur, res: res, ease: ease }; });
  }

  /* ---------- dessin du plateau ---------- */

  function drawPlay(now, dt) {
    var b = G.board, cs = G.cs, bx = G.bx, by = G.by, R = b.R, C = b.C, r, c;
    var cv2 = G.cellsView;
    // fond du plateau
    ctx.save();
    ctx.fillStyle = 'rgba(8,4,28,0.62)';
    for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
      if (!b.cells[r][c].on) continue;
      ctx.beginPath();
      A.roundRect(ctx, bx + c * cs - 3, by + r * cs - 3, cs + 6, cs + 6, cs * 0.18);
      ctx.fill();
    }
    for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
      if (!b.cells[r][c].on) continue;
      ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.13)';
      ctx.beginPath();
      A.roundRect(ctx, bx + c * cs + 1, by + r * cs + 1, cs - 2, cs - 2, cs * 0.14);
      ctx.fill();
    }
    ctx.restore();
    // gelée
    for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
      if (cv2[r][c][0] > 0) A.drawJelly(ctx, bx + c * cs, by + r * cs, cs, cv2[r][c][0]);
    }
    // sorties des cristaux
    if (b.ingNeed > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,215,90,' + (0.75 + 0.25 * Math.sin(now * 0.006)) + ')';
      ctx.shadowColor = '#ffd23d';
      ctx.shadowBlur = 8;
      ctx.font = '900 ' + Math.round(cs * 0.36) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (c = 0; c < C; c++) for (r = R - 1; r >= 0; r--) {
        if (b.cells[r][c].exit) { ctx.fillText('▼', bx + (c + 0.5) * cs, by + (r + 1) * cs + 1); break; }
      }
      ctx.restore();
    }
    // sélection
    if (G.sel) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(now * 0.01)) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      A.roundRect(ctx, bx + G.sel[1] * cs + 2, by + G.sel[0] * cs + 2, cs - 4, cs - 4, cs * 0.18);
      ctx.stroke();
      ctx.restore();
    }
    // bonbons (masqués hors du plateau)
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx - 4, by - cs * (R + 6), C * cs + 8, cs * (R + 6));
    for (r = 0; r < R; r++) for (c = 0; c < C; c++) if (b.cells[r][c].on) ctx.rect(bx + c * cs - 4, by + r * cs - 4, cs + 8, cs + 8);
    ctx.clip();
    var candySize = cs * 0.9;
    for (var id in sprites) {
      var s = sprites[id];
      var x = bx + (s.x + 0.5) * cs, y = by + (s.y + 0.5) * cs;
      if (y < by - cs) continue;
      if (G.hint && (G.hint.ida === s.id || G.hint.idb === s.id)) {
        var hh = G.hint, o = Math.sin((now - hh.t0) * 0.012) * 0.09 * cs;
        var other = hh.ida === s.id ? hh.b : hh.a, mine = hh.ida === s.id ? hh.a : hh.b;
        x += (other[1] - mine[1]) * o;
        y += (other[0] - mine[0]) * o;
      }
      var img = A.sprite(s.color, s.kind, candySize * DPR);
      var sz = img.width / DPR;
      var sc = s.scale, sx = 1, sy = 1;
      if (s.dying) { var dp = s.dying / 220; sc = dp < 0.3 ? 1 + dp : (1 - dp) * 1.6; ctx.globalAlpha = 1 - dp * 0.6; }
      if (s.squash) { sx = 1 + 0.12 * s.squash; sy = 1 - 0.12 * s.squash; }
      ctx.save();
      ctx.translate(x, y + (s.squash ? cs * 0.05 * s.squash : 0));
      if (s.kind === K.NOVA) ctx.rotate(now * 0.0015);
      if (s.kind === K.ING) ctx.translate(0, Math.sin(now * 0.004 + s.id) * cs * 0.03);
      ctx.scale(sc * sx, sc * sy);
      ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      if (s.flash > 0) {
        ctx.globalAlpha = s.flash;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (s.kind === K.WRAP || s.kind === K.SH || s.kind === K.SV) {
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now * 0.008 + s.id);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // glace et cages
    for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
      if (cv2[r][c][1] > 0) A.drawFrost(ctx, bx + c * cs, by + r * cs, cs, cv2[r][c][1]);
      if (cv2[r][c][2] > 0) A.drawLock(ctx, bx + c * cs, by + r * cs, cs);
    }
    drawEffects(now);
    drawPopups(now);
    drawFlyers(now);
    if (G.hammer) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,220,90,' + (0.5 + 0.4 * Math.sin(now * 0.008)) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      A.roundRect(ctx, bx - 6, by - 6, C * cs + 12, R * cs + 12, 14);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------- effets spéciaux ---------- */

  function startEffect(e) {
    e.t0 = T;
    e.dur = e.type === 'zap' ? 520 : e.type === 'supernova' ? 900 : e.type === 'boom' ? 450 : 380;
    effects.push(e);
    if (e.type === 'beamH' || e.type === 'beamV') { SND.beam(); vibe(15); }
    else if (e.type === 'boom') { SND.boom(); vibe(30); }
    else if (e.type === 'zap') { SND.zap(); vibe(40); }
    else if (e.type === 'supernova') { SND.boom(); SND.zap(); vibe(80); }
    else if (e.type === 'hammer') { SND.boom(); vibe(30); }
  }
  function effColor(e) { return e.color >= 0 && e.color != null ? A.PALETTE[e.color].main : '#ffffff'; }

  function drawEffects(now) {
    var cs = G.cs, bx = G.bx, by = G.by, R = G.board.R, C = G.board.C;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = effects.length - 1; i >= 0; i--) {
      var e = effects[i];
      var p = (T - e.t0) / e.dur;
      if (p >= 1) { effects.splice(i, 1); continue; }
      var col = effColor(e);
      var k = 1 - p;
      var ctr = cellCenter(e.r, e.c);
      if (e.type === 'beamH' || e.type === 'beamV') {
        var w = cs * (e.big ? 1.1 : 0.75) * k;
        var g;
        if (e.type === 'beamH') {
          g = ctx.createLinearGradient(0, ctr.y - w / 2, 0, ctr.y + w / 2);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = k;
          ctx.fillStyle = col;
          ctx.fillRect(bx, ctr.y - w * 0.8, C * cs, w * 1.6);
          ctx.fillStyle = g;
          ctx.fillRect(bx - 10, ctr.y - w / 2, C * cs + 20, w);
        } else {
          g = ctx.createLinearGradient(ctr.x - w / 2, 0, ctr.x + w / 2, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = k;
          ctx.fillStyle = col;
          ctx.fillRect(ctr.x - w * 0.8, by, w * 1.6, R * cs);
          ctx.fillStyle = g;
          ctx.fillRect(ctr.x - w / 2, by - 10, w, R * cs + 20);
        }
      } else if (e.type === 'boom' || e.type === 'hammer') {
        var rad = cs * (e.radius || 1) * (0.4 + p * 1.1);
        ctx.globalAlpha = k;
        var rg = ctx.createRadialGradient(ctr.x, ctr.y, 0, ctr.x, ctr.y, rad);
        rg.addColorStop(0, 'rgba(255,255,255,0.9)');
        rg.addColorStop(0.5, col);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(ctr.x, ctr.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4 * k;
        ctx.beginPath();
        ctx.arc(ctr.x, ctr.y, rad * 1.1, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === 'zap') {
        ctx.globalAlpha = k;
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.shadowColor = col;
        (e.targets || []).forEach(function (t, ti) {
          var tp = cellCenter(t[0], t[1]);
          ctx.beginPath();
          ctx.moveTo(ctr.x, ctr.y);
          var segs = 5;
          for (var s = 1; s <= segs; s++) {
            var f = s / segs;
            var jx = s < segs ? (Math.random() - 0.5) * cs * 0.5 : 0, jy = s < segs ? (Math.random() - 0.5) * cs * 0.5 : 0;
            ctx.lineTo(lerp(ctr.x, tp.x, f) + jx, lerp(ctr.y, tp.y, f) + jy);
          }
          ctx.stroke();
        });
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ctr.x, ctr.y, cs * 0.6 * (1 + p), 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'supernova') {
        var rr = Math.max(W, H) * p * 1.2;
        ctx.globalAlpha = k;
        var sg = ctx.createRadialGradient(ctr.x, ctr.y, rr * 0.3, ctr.x, ctr.y, rr);
        sg.addColorStop(0, 'rgba(255,255,255,0.0)');
        sg.addColorStop(0.7, 'rgba(255,200,255,0.9)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.restore();
  }

  function addPopup(r, c, text, color, big) {
    var p = cellCenter(r, c);
    popups.push({ x: p.x, y: p.y, text: text, color: color || '#fff', t0: T, big: big });
  }
  function drawPopups() {
    for (var i = popups.length - 1; i >= 0; i--) {
      var p = popups[i];
      var t = (T - p.t0) / 900;
      if (t >= 1) { popups.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
      var size = (p.big ? 26 : 19) * (t < 0.15 ? easeOutBack(t / 0.15) : 1);
      ctx.font = '900 ' + size + 'px "Baloo 2", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(30,0,40,0.85)';
      ctx.strokeText(p.text, p.x, p.y - t * 40);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y - t * 40);
      ctx.restore();
    }
  }

  function goalTarget(pred) {
    if (!hud) return null;
    var items = hud.querySelectorAll('.goal');
    for (var i = 0; i < G.goals.length; i++) {
      if (pred(G.goals[i]) && items[i]) {
        var rc = items[i].getBoundingClientRect();
        return { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 };
      }
    }
    return null;
  }
  function addFlyer(x, y, tgt, color, kind) {
    flyers.push({ x: x, y: y, tx: tgt.x, ty: tgt.y, t0: T, dur: 520 + Math.random() * 200, color: color, kind: kind });
  }
  function drawFlyers() {
    for (var i = flyers.length - 1; i >= 0; i--) {
      var f = flyers[i];
      var p = (T - f.t0) / f.dur;
      if (p >= 1) { flyers.splice(i, 1); SND.collect(); continue; }
      var e = easeInOut(p);
      var x = lerp(f.x, f.tx, e), y = lerp(f.y, f.ty, e) - Math.sin(p * Math.PI) * 60;
      var img = A.sprite(f.color, f.kind, G.cs * 0.9 * DPR);
      var sz = img.width / DPR * (1 - p * 0.55);
      ctx.drawImage(img, x - sz / 2, y - sz / 2, sz, sz);
    }
  }

  /* ---------- lecture des étapes ---------- */

  var WAVE = 70;
  var COMBO_WORDS = [[10, 'SUPERNOVA !'], [8, 'Galactique !'], [6, 'Stellaire !'], [5, 'Divin !'], [4, 'Délicieux !'], [3, 'Sucré !']];
  var SPECIAL_TIPS = {};
  SPECIAL_TIPS[K.SH] = 'Bonbon rayé ! Aligne-le pour balayer toute une ligne.';
  SPECIAL_TIPS[K.SV] = SPECIAL_TIPS[K.SH];
  SPECIAL_TIPS[K.WRAP] = 'Bonbon emballé ! Il explose autour de lui.';
  SPECIAL_TIPS[K.NOVA] = 'Nova ! Échange-la avec un bonbon pour détruire toute sa couleur.';

  function later(ms, fn) {
    var g = G;
    setTimeout(function () { if (G === g) fn(); }, ms);
  }

  function playSteps(steps) {
    var g = G, i = 0;
    return new Promise(function (resolve) {
      function next() {
        if (G !== g || i >= steps.length) { resolve(); return; }
        var st = steps[i++];
        var p;
        switch (st.t) {
          case 'badswap': p = animBadSwap(st); break;
          case 'swap': p = animSwap(st); break;
          case 'clear': p = animClear(st); break;
          case 'fall': p = animFall(st); break;
          case 'exit': p = animExit(st); break;
          case 'shuffle': p = animShuffle(st); break;
          case 'rush': p = animRush(st); break;
          default: p = Promise.resolve();
        }
        p.then(next);
      }
      next();
    });
  }

  function animBadSwap(st) {
    var a = sprites[st.ida], b = sprites[st.idb];
    if (!a || !b) return Promise.resolve();
    SND.bad();
    vibe(20);
    return Promise.all([tweenTo(a, st.b[0], st.b[1], 120), tweenTo(b, st.a[0], st.a[1], 120)]).then(function () {
      return Promise.all([tweenTo(a, st.a[0], st.a[1], 140), tweenTo(b, st.b[0], st.b[1], 140)]);
    });
  }
  function animSwap(st) {
    var a = sprites[st.ida], b = sprites[st.idb];
    SND.swap();
    G.moves = st.moves;
    updateHUD();
    if (!a || !b) return Promise.resolve();
    return Promise.all([tweenTo(a, st.b[0], st.b[1], 150), tweenTo(b, st.a[0], st.a[1], 150)]);
  }

  function animClear(st) {
    var pre = st.preTransforms && st.preTransforms.length ? st.preTransforms : null;
    var delay0 = 0;
    if (pre) {
      pre.forEach(function (t) {
        var s = sprites[t.id];
        if (s) { s.kind = t.kind; s.flash = 1; }
      });
      SND.create();
      delay0 = 380;
    }
    return wait(delay0).then(function () {
      if (!G) return;
      var maxWave = 0;
      st.effects.forEach(function (e) {
        maxWave = Math.max(maxWave, e.wave);
        later(e.wave * WAVE, function () { startEffect(e); });
      });
      var collectTargets = {};
      var fly = 0;
      st.removed.forEach(function (rm) {
        maxWave = Math.max(maxWave, rm.wave);
        later(rm.wave * WAVE, function () {
          var s = sprites[rm.id];
          if (!s) return;
          s.dying = 0.001;
          var p = cellCenter(rm.r, rm.c);
          var col = rm.color >= 0 ? A.PALETTE[rm.color].main : '#e2b5ff';
          burst(p.x, p.y, col, 7, 0.22, G.cs * 0.09);
          if (rm.color >= 0 && fly < 12) {
            if (collectTargets[rm.color] === undefined) {
              collectTargets[rm.color] = goalTarget(function (g) { return g.type === 'collect' && g.color === rm.color && g.have < g.need + 12; });
            }
            var tg = collectTargets[rm.color];
            if (tg) { fly++; addFlyer(p.x, p.y, tg, rm.color, K.NORMAL); }
          }
        });
      });
      st.cellFx.forEach(function (fx) {
        later((fx.wave || 0) * WAVE, function () {
          var p = cellCenter(fx.r, fx.c);
          if (fx.type === 'frost') { burst(p.x, p.y, '#dff7ff', 12, 0.25, G.cs * 0.08); SND.frost(); G.cellsView[fx.r][fx.c][1] = fx.left; }
          else if (fx.type === 'jelly') { burst(p.x, p.y, '#ff8ae0', 6, 0.18, G.cs * 0.08); SND.jelly(); G.cellsView[fx.r][fx.c][0] = fx.left; }
          else if (fx.type === 'lock') { burst(p.x, p.y, '#d9dde8', 10, 0.25, G.cs * 0.06); SND.unlock(); G.cellsView[fx.r][fx.c][2] = 0; }
        });
      });
      if (st.transforms.length) {
        later(90, function () {
          st.transforms.forEach(function (t) {
            var s = sprites[t.id];
            if (!s) return;
            s.kind = t.kind; s.color = t.color; s.flash = 1; s.dying = 0;
            var p = cellCenter(t.r, t.c);
            burst(p.x, p.y, '#ffffff', 14, 0.3, G.cs * 0.08);
            if (!save.tips['s_' + t.kind] && SPECIAL_TIPS[t.kind]) {
              save.tips['s_' + t.kind] = 1;
              if (t.kind === K.SH) save.tips['s_' + K.SV] = 1;
              if (t.kind === K.SV) save.tips['s_' + K.SH] = 1;
              persist();
              toast(SPECIAL_TIPS[t.kind], 3200);
            }
          });
          SND.create();
        });
      }
      if (st.removed.length) SND.pop(st.cascade);
      st.popups.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 4).forEach(function (pp) {
        addPopup(pp.r, pp.c, '+' + fmt(pp.v), pp.v >= 500 ? '#ffd23d' : '#ffffff', pp.v >= 1000);
      });
      if (st.cascade >= 3 && st.cascade > G.combo) {
        G.combo = st.cascade;
        for (var i = 0; i < COMBO_WORDS.length; i++) {
          if (st.cascade >= COMBO_WORDS[i][0]) { bigText(COMBO_WORDS[i][1], 'combo'); SND.combo(i); break; }
        }
      }
      if (st.effects.length && st.effects.some(function (e) { return e.type === 'supernova'; })) bigText('SUPERNOVA !', 'combo');
      return wait(maxWave * WAVE + 240).then(function () {
        if (!G) return;
        G.score = st.score;
        G.goals = st.goals;
        G.cellsView = st.cells.map(function (row) { return row.map(function (c) { return c.slice(); }); });
        updateHUD();
      });
    });
  }

  function animFall(st) {
    st.moves.forEach(function (m) {
      var s;
      if (m.spawn) s = addSprite({ id: m.id, color: m.color, kind: m.kind }, m.path[0][0], m.path[0][1]);
      else s = sprites[m.id];
      if (!s) return;
      s.tween = null;
      s.dying = 0;
      s.path = m.path.slice(1);
      s.v = 0.004;
    });
    return waitSettle();
  }

  function animExit(st) {
    st.items.forEach(function (it) {
      var s = sprites[it.id];
      if (s) delete sprites[it.id];
      var p = cellCenter(it.r, it.c);
      burst(p.x, p.y, '#ffd23d', 24, 0.35, G.cs * 0.1);
      var tg = goalTarget(function (g) { return g.type === 'ingredient'; });
      if (tg) addFlyer(p.x, p.y, tg, -1, K.ING);
      addPopup(it.r, it.c, '+1 000', '#ffd23d', true);
    });
    SND.ingredient();
    vibe(40);
    G.score = st.score;
    G.goals = st.goals;
    updateHUD();
    return wait(450);
  }

  function animShuffle(st) {
    bigText('Mélange cosmique !', 'combo small');
    var ps = st.moves.map(function (m) {
      var s = sprites[m.id];
      if (!s) return Promise.resolve();
      s.color = m.color; s.kind = m.kind;
      return tweenTo(s, m.r, m.c, 520, easeOutBack);
    });
    return wait(500).then(function () { return Promise.all(ps); });
  }

  function animRush(st) {
    st.transforms.forEach(function (t, i) {
      later(i * 70, function () {
        var s = sprites[t.id];
        if (s) { s.kind = t.kind; s.flash = 1; }
        var p = cellCenter(t.r, t.c);
        burst(p.x, p.y, '#fff6a8', 8, 0.25, G.cs * 0.08);
        SND.pop(3 + i % 8);
        G.moves = Math.max(st.moves, G.moves - 1);
        updateHUD();
      });
    });
    return wait(st.transforms.length * 70 + 250).then(function () {
      if (!G) return;
      G.moves = st.moves;
      G.score = st.score;
      updateHUD();
    });
  }

  /* ---------- actions ---------- */

  function canAct() { return G && !G.busy && !G.ended && !modals.length; }

  function doSwap(r1, c1, r2, c2) {
    if (!canAct()) return;
    var g = G;
    G.busy = true;
    G.sel = null;
    clearHint();
    G.combo = 0;
    var res = G.board.trySwap(r1, c1, r2, c2);
    if (!res.steps.length) { G.busy = false; return; }
    playSteps(res.steps).then(function () {
      if (G !== g) return;
      if (res.valid) return afterMove();
    }).then(function () {
      if (G !== g) return;
      G.busy = false;
      G.lastAction = performance.now();
    });
  }

  function afterMove() {
    var st = G.board.status();
    if (st === 'won') return finishWin();
    if (st === 'lost') return outOfMoves();
    return Promise.resolve();
  }

  function finishWin() {
    var g = G;
    G.ended = true;
    clearHint();
    bigText(G.board.isScoreOnly() ? 'Bravo !' : 'Objectif atteint !', 'win');
    SND.win();
    vibe(60);
    return wait(1300).then(function () {
      if (G !== g) return;
      var hasSpecial = G.board.snapshotCandies().some(function (c) { return c.kind !== K.NORMAL && c.kind !== K.ING; });
      if (G.board.moves > 0 || hasSpecial) {
        bigText('Nova Rush !', 'combo');
        return wait(800).then(function () {
          if (G !== g) return;
          return playSteps(G.board.bonusRush());
        });
      }
    }).then(function () {
      if (G !== g) return;
      return wait(500);
    }).then(function () {
      if (G === g) showWin();
    });
  }

  function outOfMoves() {
    var g = G;
    return wait(400).then(function () {
      if (G !== g) return;
      return new Promise(function (resolve) {
        var left = G.goals.filter(function (x) { return x.have < x.need; }).map(function (x) {
          return '<div class="goal-card">' + goalIcon(x, 36) + '<div>' + (x.type === 'score' ? fmt(x.need - x.have) + ' pts' : 'encore ' + (x.need - x.have)) + '</div></div>';
        }).join('');
        var have = save.boosters.moves || 0;
        var m = modal(
          '<h2>Plus de coups !</h2>' +
          '<p>Il te manque :</p><div class="goals-intro">' + left + '</div>' +
          '<button class="btn gold" id="oom-buy">+5 coups · ' + (have > 0 ? 'bonus (' + have + ')' : BOOST_PRICE.moves + ' 🪙') + '</button>' +
          '<button class="btn ghost" id="oom-quit">Abandonner</button>', { closable: false, onBack: function () { quit(); } });
        function quit() { m.close(); resolve(); showFail(); }
        on(m.el, '#oom-buy', function () {
          if (have > 0) save.boosters.moves--;
          else if (save.coins >= BOOST_PRICE.moves) save.coins -= BOOST_PRICE.moves;
          else { toast('Pas assez de pièces 🪙'); return; }
          persist();
          SND.coin();
          G.board.moves += 5;
          G.moves = G.board.moves;
          updateHUD();
          m.close();
          bigText('+5 coups', 'combo small');
          resolve();
        });
        on(m.el, '#oom-quit', quit);
      });
    });
  }

  function showFail() {
    if (!G) return;
    var n = G.n;
    G.ended = true;
    loseLife();
    SND.lose();
    var m = modal(
      '<h2>Niveau ' + n + ' échoué</h2><div class="daily-ico">💔</div>' +
      '<p>Tu perds une vie. Il te reste <b>' + save.lives + '</b> ❤</p>' +
      '<div class="btn-row"><button class="btn ghost" id="f-map">Carte</button><button class="btn play" id="f-retry">Réessayer</button></div>',
      { closable: false, onBack: function () { m.close(); showMap(); } });
    on(m.el, '#f-map', function () { m.close(); showMap(); });
    on(m.el, '#f-retry', function () {
      m.close();
      updateLives();
      if (save.lives <= 0) { showMap(); showNoLives(); return; }
      startLevel(n);
    });
  }

  function showWin() {
    var n = G.n, score = G.board.score, lv = G.level;
    var stars = score >= lv.stars[2] ? 3 : score >= lv.stars[1] ? 2 : 1;
    var firstTime = n >= save.unlocked;
    var prevStars = save.stars[n] || 0;
    var coins = 5 + stars * 5 + (firstTime ? 10 : 0) + (lv.tag === 'boss' ? 30 : lv.tag === 'hard' ? 10 : 0);
    save.stars[n] = Math.max(prevStars, stars);
    save.best[n] = Math.max(save.best[n] || 0, score);
    if (firstTime) save.unlocked = Math.min(MAX, n + 1);
    save.coins += coins;
    var worldDone = n % LV.LEVELS_PER_WORLD === 0;
    if (worldDone && firstTime) { save.boosters.hammer++; save.boosters.shuffle++; save.boosters.moves++; }
    persist();
    var finished = n === MAX;
    var m = modal(
      '<h2>' + (finished ? 'TU AS TOUT FINI !' : 'Niveau ' + n + ' réussi !') + '</h2>' +
      '<div class="stars-row win" id="w-stars">' + starsHTML(0, true) + '</div>' +
      '<div class="final-score" id="w-score">0</div>' +
      '<p class="reward">+' + coins + ' 🪙</p>' +
      (worldDone && firstTime ? '<p class="tip">🌌 Monde terminé ! +1 de chaque bonus</p>' : '') +
      (finished ? '<p class="tip">Tu as conquis les 2000 niveaux de Candy Nova. Légende cosmique !</p>' : '') +
      '<div class="btn-row"><button class="btn ghost" id="w-map">Carte</button>' +
      (finished ? '' : '<button class="btn play" id="w-next">Suivant ▶</button>') + '</div>',
      { closable: false, onBack: function () { m.close(); showMap(); } });
    var starEls = m.el.querySelectorAll('#w-stars .st');
    for (var i = 0; i < stars; i++) {
      (function (i) {
        setTimeout(function () {
          starEls[i].classList.add('on', 'pop');
          SND.star(i);
          vibe(25);
        }, 400 + i * 380);
      })(i);
    }
    var sEl = m.el.querySelector('#w-score'), t0 = performance.now();
    (function count() {
      var p = Math.min(1, (performance.now() - t0) / 1200);
      sEl.textContent = fmt(score * easeInOut(p));
      if (p < 1 && sEl.isConnected) requestAnimationFrame(count);
    })();
    on(m.el, '#w-map', function () { m.close(); showMap(); });
    on(m.el, '#w-next', function () {
      m.close();
      showMap();
      showLevelIntro(Math.min(MAX, n + 1));
    });
    var p = cellCenter(G.board.R / 2, G.board.C / 2);
    for (var k = 0; k < 6; k++) setTimeout(function () {
      burst(W * Math.random(), H * 0.3 * Math.random() + 50, ['#ffd23d', '#ff3b6b', '#2f8cff', '#2ee06a', '#b44bff'][Math.floor(Math.random() * 5)], 30, 0.4, 5);
    }, k * 200);
  }

  function useBooster(k) {
    if (!G || G.busy || G.ended || modals.length) return;
    if ((save.boosters[k] || 0) <= 0) {
      var m = modal('<h2>' + BOOST_NAME[k] + '</h2><p>Tu n\'en as plus.</p>' +
        '<button class="btn gold" id="bb">Acheter · ' + BOOST_PRICE[k] + ' 🪙</button><button class="btn ghost" data-close>Annuler</button>' +
        '<p class="small">Tu as ' + fmt(save.coins) + ' 🪙</p>');
      on(m.el, '#bb', function () {
        if (save.coins < BOOST_PRICE[k]) { toast('Pas assez de pièces 🪙'); return; }
        save.coins -= BOOST_PRICE[k];
        save.boosters[k] = (save.boosters[k] || 0) + 1;
        persist();
        SND.coin();
        m.close();
        updateHUD();
      });
      return;
    }
    if (k === 'hammer') {
      G.hammer = !G.hammer;
      if (G.hammer) toast('🔨 Touche une case du plateau', 1600);
      updateHUD();
      return;
    }
    if (k === 'moves') {
      save.boosters.moves--;
      persist();
      G.board.moves += 5;
      G.moves = G.board.moves;
      bigText('+5 coups', 'combo small');
      updateHUD();
      return;
    }
    if (k === 'shuffle') {
      save.boosters.shuffle--;
      persist();
      var g = G;
      G.busy = true;
      clearHint();
      updateHUD();
      playSteps(G.board.useShuffle()).then(function () {
        if (G !== g) return;
        return afterMove();
      }).then(function () { if (G === g) { G.busy = false; G.lastAction = performance.now(); } });
    }
  }

  function doHammer(r, c) {
    var steps = G.board.useHammer(r, c);
    if (!steps) { toast('Choisis un bonbon ou un obstacle'); return; }
    save.boosters.hammer--;
    persist();
    G.hammer = false;
    var g = G;
    G.busy = true;
    G.combo = 0;
    clearHint();
    updateHUD();
    playSteps(steps).then(function () {
      if (G !== g) return;
      return afterMove();
    }).then(function () { if (G === g) { G.busy = false; G.lastAction = performance.now(); } });
  }

  /* ---------- indices ---------- */

  function showHint(tutorial) {
    if (!G || G.busy || G.ended || G.hint) return;
    var moves = G.board.listMoves();
    if (!moves.length) return;
    // préfère le coup qui produit le plus d'effet
    var best = moves[0], bestV = -1;
    for (var i = 0; i < moves.length && i < 40; i++) {
      var m = moves[i];
      var cb = G.board.clone();
      var res = cb.trySwap(m[0], m[1], m[2], m[3]);
      var v = cb.score + Math.random() * 10;
      if (v > bestV) { bestV = v; best = m; }
    }
    var a = G.board.candies[best[0]][best[1]], b = G.board.candies[best[2]][best[3]];
    G.hint = { a: [best[0], best[1]], b: [best[2], best[3]], ida: a.id, idb: b.id, t0: T };
    if (tutorial) toast('👆 Fais glisser un bonbon pour aligner 3 bonbons identiques !', 3500);
  }
  function clearHint() { if (G) G.hint = null; }

  function updatePlay(dt, now) {
    updateSprites(dt);
    if (G && !G.busy && !G.ended && !G.hint && !modals.length && now - G.lastAction > 6000) showHint(false);
  }

  /* ---------- pause / réglages / aide ---------- */

  function showPause() {
    if (!G || G.ended) return;
    var m = modal(
      '<h2>Pause</h2>' +
      '<p class="small">Niveau ' + G.n + ' · ' + LV.goalText(G.level.goals[0]) + '</p>' +
      settingsToggles() +
      '<button class="btn play" data-close>Reprendre</button>' +
      '<button class="btn ghost" id="p-retry">Recommencer (−1 ❤)</button>' +
      '<button class="btn ghost" id="p-map">Quitter (−1 ❤)</button>');
    bindToggles(m.el);
    on(m.el, '#p-retry', function () {
      var n = G.n;
      m.close();
      loseLife();
      updateLives();
      if (save.lives <= 0) { showMap(); showNoLives(); return; }
      startLevel(n);
    });
    on(m.el, '#p-map', function () { m.close(); loseLife(); showMap(); });
  }

  function settingsToggles() {
    function row(key, label) {
      return '<label class="toggle"><span>' + label + '</span><input type="checkbox" data-key="' + key + '"' + (save[key] ? ' checked' : '') + '><i></i></label>';
    }
    return '<div class="toggles">' + row('sfx', '🔊 Sons') + row('music', '🎵 Musique') + row('vibe', '📳 Vibrations') + '</div>';
  }
  function bindToggles(root) {
    root.querySelectorAll('input[data-key]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        save[inp.dataset.key] = inp.checked;
        persist();
        SND.init();
        applyAudioPrefs();
        SND.click();
      });
    });
  }

  function showSettings() {
    var m = modal(
      '<h2>Réglages</h2>' + settingsToggles() +
      '<div class="pid-box"><span>Ton code joueur</span><b class="sel" id="s-pid">' + fmtPid(playerId()) + '</b>' +
      '<button class="btn sm ghost" id="s-pid-copy">Copier</button></div>' +
      '<button class="btn gold" id="s-gift">🎁 Entrer un code cadeau</button>' +
      '<button class="btn ghost" id="s-help">Comment jouer</button>' +
      '<button class="btn ghost" id="s-credits">Crédits</button>' +
      '<button class="btn danger" id="s-reset">Réinitialiser la progression</button>' +
      '<button class="btn play" data-close>OK</button>' +
      '<button class="link admin-link" id="s-admin">🔐 Admin</button>');
    bindToggles(m.el);
    on(m.el, '#s-pid-copy', function () { copyText(playerId(), m.el.querySelector('#s-pid')); });
    on(m.el, '#s-gift', showRedeem);
    on(m.el, '#s-admin', showAdminLogin);
    on(m.el, '#s-help', showHelp);
    on(m.el, '#s-credits', showCredits);
    on(m.el, '#s-reset', function () {
      var c = modal('<h2>Tout effacer ?</h2><p>Ta progression, tes étoiles et tes pièces seront perdues.</p>' +
        '<div class="btn-row"><button class="btn ghost" data-close>Non</button><button class="btn danger" id="r-yes">Effacer</button></div>');
      on(c.el, '#r-yes', function () {
        var keep = { sfx: save.sfx, music: save.music, vibe: save.vibe, pid: save.pid, redeemed: save.redeemed };
        save = defaultSave();
        for (var k in keep) save[k] = keep[k];
        persist();
        c.close(); m.close();
        if (scene === 'map') showMap();
        toast('Progression réinitialisée');
      });
    });
  }

  function showCredits() {
    modal('<h2>Crédits</h2>' +
      '<div class="logo small"><span class="l1">Candy</span><span class="l2">Nova</span></div>' +
      '<p>Un jeu créé par<br><b>Anthony F (Floris Strange)</b></p>' +
      '<p class="small">Graphismes, musique et sons générés par le code.<br>2000 niveaux à travers ' + LV.WORLD_COUNT + ' mondes.</p>' +
      '<button class="btn play" data-close>Fermer</button>');
  }

  function showHelp() {
    function ic(c, k) { return '<img src="' + A.iconURL(c, k, 80) + '" width="40" height="40">'; }
    modal('<h2>Comment jouer</h2><div class="help">' +
      '<div class="hrow">' + ic(0, K.NORMAL) + ic(0, K.NORMAL) + ic(0, K.NORMAL) + '<p>Échange deux bonbons voisins pour en aligner <b>3 ou plus</b> de la même couleur.</p></div>' +
      '<div class="hrow">' + ic(4, K.SH) + '<p><b>4 alignés</b> → bonbon rayé : balaie une ligne ou une colonne entière.</p></div>' +
      '<div class="hrow">' + ic(3, K.WRAP) + '<p><b>Forme en L ou en T</b> → bonbon emballé : grosse explosion autour de lui.</p></div>' +
      '<div class="hrow">' + ic(-1, K.NOVA) + '<p><b>5 alignés</b> → Nova : échange-la avec un bonbon pour détruire toute sa couleur !</p></div>' +
      '<div class="hrow"><span class="combo-ico">✨</span><p><b>Combine deux spéciaux</b> en les échangeant : rayé + emballé, Nova + rayé, Nova + Nova = SUPERNOVA !</p></div>' +
      '<div class="hrow"><img src="' + A.jellyURL(80) + '" width="40"><p>Gelée : détruis les bonbons posés dessus.</p></div>' +
      '<div class="hrow"><img src="' + A.frostURL(80) + '" width="40"><p>Glace : fais des combinaisons à côté pour la briser.</p></div>' +
      '<div class="hrow"><img src="' + A.lockURL(80) + '" width="40"><p>Cage : aligne le bonbon enfermé pour le libérer.</p></div>' +
      '<div class="hrow">' + ic(-1, K.ING) + '<p>Cristal d\'étoile : fais-le descendre tout en bas.</p></div>' +
      '<div class="hrow"><span class="combo-ico">🔨🌀➕</span><p>Bonus : marteau, mélange, +5 coups. Gagne des 🪙 en finissant les niveaux.</p></div>' +
      '</div><button class="btn play" data-close>Compris !</button>', { cls: 'wide' });
  }

  function showShop() {
    var m = modal('<h2>Boutique</h2><p class="small">Tu as <b id="sh-c">' + fmt(save.coins) + '</b> 🪙</p><div class="shop">' +
      ['hammer', 'shuffle', 'moves'].map(function (k) {
        var icon = k === 'hammer' ? '🔨' : k === 'shuffle' ? '🌀' : '➕5';
        return '<div class="shop-item"><span class="si">' + icon + '</span><div><b>' + BOOST_NAME[k] + '</b><br><small>possédés : <span id="sh-n-' + k + '">' + (save.boosters[k] || 0) + '</span></small></div>' +
          '<button class="btn gold sm" data-buy="' + k + '">' + BOOST_PRICE[k] + ' 🪙</button></div>';
      }).join('') + '</div><p class="small">Les pièces se gagnent en jouant : aucun achat réel.</p><button class="btn play" data-close>Fermer</button>');
    m.el.querySelectorAll('[data-buy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.buy;
        if (save.coins < BOOST_PRICE[k]) { toast('Pas assez de pièces 🪙'); SND.bad(); return; }
        save.coins -= BOOST_PRICE[k];
        save.boosters[k] = (save.boosters[k] || 0) + 1;
        persist();
        SND.coin();
        m.el.querySelector('#sh-c').textContent = fmt(save.coins);
        m.el.querySelector('#sh-n-' + k).textContent = save.boosters[k];
        refreshTopbar();
      });
    });
  }

  /* ===================== Codes cadeaux et menu admin ===================== */

  // Un code cadeau = données (joueur, jetons, bonus, numéro unique) + signature ECDSA.
  // Le jeu ne contient que la clé publique ; la clé privée est chiffrée par le mot de passe admin.
  var PID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var ALL_PLAYERS = '**********';
  var PAYLOAD_LEN = 23, SIG_LEN = 64;
  var adminKey = null;

  function playerId() {
    if (!save.pid) {
      var s = '';
      var rnd = new Uint32Array(10);
      try { crypto.getRandomValues(rnd); } catch (e) { for (var j = 0; j < 10; j++) rnd[j] = Math.random() * 4294967296; }
      for (var i = 0; i < 10; i++) s += PID_ALPHABET[rnd[i] % PID_ALPHABET.length];
      save.pid = s;
      persist();
    }
    return save.pid;
  }
  function fmtPid(pid) { return pid.slice(0, 5) + '-' + pid.slice(5); }
  function cleanPid(text) { return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  function b64uEncode(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64Decode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    var bin = atob(str), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function cryptoOK() { return !!(window.crypto && crypto.subtle && window.NOVA_ADMIN_KEY); }

  function makePayload(pid, gift) {
    var p = new Uint8Array(PAYLOAD_LEN);
    p[0] = 1;
    for (var i = 0; i < 10; i++) p[1 + i] = pid.charCodeAt(i);
    var coins = clamp(Math.floor(gift.coins || 0), 0, 99999999);
    p[11] = coins >>> 24 & 255; p[12] = coins >>> 16 & 255; p[13] = coins >>> 8 & 255; p[14] = coins & 255;
    p[15] = clamp(gift.hammer || 0, 0, 255); p[16] = clamp(gift.shuffle || 0, 0, 255);
    p[17] = clamp(gift.moves || 0, 0, 255); p[18] = clamp(gift.lives || 0, 0, 255);
    crypto.getRandomValues(p.subarray(19, 23));
    return p;
  }
  function readPayload(p) {
    var pid = '';
    for (var i = 0; i < 10; i++) pid += String.fromCharCode(p[1 + i]);
    return {
      version: p[0], pid: pid,
      coins: ((p[11] << 24) >>> 0) + (p[12] << 16) + (p[13] << 8) + p[14],
      hammer: p[15], shuffle: p[16], moves: p[17], lives: p[18],
      nonce: b64uEncode(p.subarray(19, 23))
    };
  }

  function applyGift(g) {
    save.coins += g.coins;
    save.boosters.hammer = (save.boosters.hammer || 0) + g.hammer;
    save.boosters.shuffle = (save.boosters.shuffle || 0) + g.shuffle;
    save.boosters.moves = (save.boosters.moves || 0) + g.moves;
    if (g.lives) { updateLives(); save.lives = Math.min(MAX_LIVES, save.lives + g.lives); }
    persist();
    refreshTopbar();
    updateHUD();
    SND.coin();
  }
  function giftText(g) {
    var parts = [];
    if (g.coins) parts.push('<b>+' + fmt(g.coins) + '</b> 🪙');
    if (g.hammer) parts.push('+' + g.hammer + ' 🔨');
    if (g.shuffle) parts.push('+' + g.shuffle + ' 🌀');
    if (g.moves) parts.push('+' + g.moves + ' ➕5');
    if (g.lives) parts.push('+' + g.lives + ' ❤');
    return parts.join(' · ');
  }

  function redeemCode(text) {
    var raw = String(text || '').replace(/\s+/g, '').replace(/^NOVA-?/i, '');
    var bytes;
    try { bytes = b64Decode(raw); } catch (e) { bytes = null; }
    if (!bytes || bytes.length !== PAYLOAD_LEN + SIG_LEN) return Promise.reject('Ce code n\'est pas valide. Vérifie qu\'il est complet.');
    if (!cryptoOK()) return Promise.reject('Les codes cadeaux ne sont pas disponibles sur cet appareil.');
    var payload = bytes.slice(0, PAYLOAD_LEN), sig = bytes.slice(PAYLOAD_LEN);
    return crypto.subtle.importKey('spki', b64Decode(window.NOVA_ADMIN_KEY.pub), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
      .then(function (pub) { return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, sig, payload); })
      .then(function (ok) {
        if (!ok) throw 'Ce code n\'est pas valide.';
        var g = readPayload(payload);
        if (g.version !== 1) throw 'Ce code n\'est pas valide.';
        if (g.pid !== ALL_PLAYERS && g.pid !== playerId()) throw 'Ce code est réservé à un autre joueur.';
        save.redeemed = save.redeemed || [];
        if (save.redeemed.indexOf(g.nonce) >= 0) throw 'Tu as déjà utilisé ce code.';
        save.redeemed.push(g.nonce);
        applyGift(g);
        return g;
      });
  }

  function showRedeem() {
    var m = modal('<h2>Code cadeau</h2>' +
      '<p class="small">Colle ici le code que tu as reçu.</p>' +
      '<textarea id="rc-code" class="code-input" rows="4" placeholder="NOVA-…" spellcheck="false" autocomplete="off"></textarea>' +
      '<p class="form-msg" id="rc-msg"></p>' +
      '<button class="btn gold" id="rc-ok">Valider</button><button class="btn ghost" data-close>Fermer</button>');
    var msg = m.el.querySelector('#rc-msg');
    on(m.el, '#rc-ok', function () {
      msg.className = 'form-msg';
      msg.textContent = 'Vérification…';
      redeemCode(m.el.querySelector('#rc-code').value).then(function (g) {
        m.close();
        modal('<h2>Cadeau reçu !</h2><div class="daily-ico">🎁</div><p class="reward">' + giftText(g) + '</p>' +
          '<button class="btn play" data-close>Super !</button>');
        burst(W / 2, H / 2, '#ffd23d', 40, 0.4, 6);
      }, function (err) {
        msg.className = 'form-msg err';
        msg.textContent = typeof err === 'string' ? err : 'Ce code n\'est pas valide.';
        SND.bad();
      });
    });
  }

  function showAdminLogin() {
    if (adminKey) { showAdmin(); return; }
    if (!cryptoOK()) { toast('Le menu admin n\'est pas disponible sur cet appareil.'); return; }
    var m = modal('<h2>🔐 Admin</h2>' +
      '<label class="field"><span>Mot de passe</span><input id="ad-pw" type="password" autocomplete="off"></label>' +
      '<p class="form-msg" id="ad-msg"></p>' +
      '<button class="btn play" id="ad-ok">Entrer</button><button class="btn ghost" data-close>Annuler</button>');
    var msg = m.el.querySelector('#ad-msg');
    function go() {
      var k = window.NOVA_ADMIN_KEY;
      msg.className = 'form-msg';
      msg.textContent = 'Vérification…';
      var pw = m.el.querySelector('#ad-pw').value;
      crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey'])
        .then(function (base) {
          return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64Decode(k.salt), iterations: k.iterations, hash: 'SHA-256' },
            base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        })
        .then(function (aes) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64Decode(k.iv) }, aes, b64Decode(k.enc)); })
        .then(function (pkcs8) { return crypto.subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']); })
        .then(function (key) { adminKey = key; m.close(); showAdmin(); }, function () {
          msg.className = 'form-msg err';
          msg.textContent = 'Mot de passe incorrect.';
          SND.bad();
        });
    }
    on(m.el, '#ad-ok', go);
    m.el.querySelector('#ad-pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  }

  function showAdmin() {
    function num(id, label, val) {
      return '<label class="field num"><span>' + label + '</span><input id="' + id + '" type="number" inputmode="numeric" min="0" value="' + val + '"></label>';
    }
    var m = modal('<h2>Menu admin</h2>' +
      '<label class="field"><span>Code du joueur</span><input id="ad-pid" type="text" autocomplete="off" spellcheck="false" placeholder="ex. ' + fmtPid(playerId()) + '"></label>' +
      '<label class="check"><input id="ad-all" type="checkbox"> Valable pour tous les joueurs</label>' +
      '<div class="admin-grid">' + num('ad-coins', 'Jetons 🪙', 500) + num('ad-hammer', 'Marteaux 🔨', 0) +
      num('ad-shuffle', 'Mélanges 🌀', 0) + num('ad-moves', '+5 coups', 0) + num('ad-lives', 'Vies ❤', 0) + '</div>' +
      '<p class="form-msg" id="ad-msg"></p>' +
      '<button class="btn gold" id="ad-make">Créer le code cadeau</button>' +
      '<div id="ad-out" hidden><textarea id="ad-code" class="code-input" rows="4" readonly></textarea>' +
      '<button class="btn sm ghost" id="ad-copy">Copier le code</button>' +
      '<p class="small">Envoie ce code au joueur : il le colle dans Réglages → Code cadeau. Il ne marche qu\'une fois.</p></div>' +
      '<button class="btn ghost" id="ad-self">Me les donner directement</button>' +
      '<button class="btn ghost" data-close>Fermer</button>', { cls: 'wide' });
    var msg = m.el.querySelector('#ad-msg');
    var all = m.el.querySelector('#ad-all'), pidIn = m.el.querySelector('#ad-pid');
    all.addEventListener('change', function () { pidIn.disabled = all.checked; });
    function readGift() {
      function v(id) { return Math.max(0, Math.floor(+m.el.querySelector('#' + id).value || 0)); }
      return { coins: v('ad-coins'), hammer: v('ad-hammer'), shuffle: v('ad-shuffle'), moves: v('ad-moves'), lives: v('ad-lives') };
    }
    function empty(g) { return !(g.coins || g.hammer || g.shuffle || g.moves || g.lives); }
    on(m.el, '#ad-make', function () {
      msg.className = 'form-msg';
      msg.textContent = '';
      var g = readGift();
      if (empty(g)) { msg.className = 'form-msg err'; msg.textContent = 'Indique au moins un jeton ou un bonus.'; return; }
      var pid = all.checked ? ALL_PLAYERS : cleanPid(pidIn.value);
      if (!all.checked && pid.length !== 10) {
        msg.className = 'form-msg err';
        msg.textContent = 'Le code joueur fait 10 caractères (il est affiché dans Réglages du joueur).';
        return;
      }
      var payload = makePayload(pid, g);
      crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, adminKey, payload).then(function (sig) {
        var full = new Uint8Array(PAYLOAD_LEN + SIG_LEN);
        full.set(payload, 0);
        full.set(new Uint8Array(sig), PAYLOAD_LEN);
        m.el.querySelector('#ad-code').value = 'NOVA-' + b64uEncode(full);
        m.el.querySelector('#ad-out').hidden = false;
        msg.textContent = 'Code créé pour ' + (all.checked ? 'tous les joueurs' : fmtPid(pid)) + ' : ' + giftText(g).replace(/<[^>]+>/g, '');
        SND.coin();
      });
    });
    on(m.el, '#ad-copy', function () { copyText(m.el.querySelector('#ad-code').value, m.el.querySelector('#ad-code')); });
    on(m.el, '#ad-self', function () {
      var g = readGift();
      if (empty(g)) { msg.className = 'form-msg err'; msg.textContent = 'Indique au moins un jeton ou un bonus.'; return; }
      applyGift(g);
      msg.className = 'form-msg';
      msg.textContent = 'Ajouté à ton jeu : ' + giftText(g).replace(/<[^>]+>/g, '');
    });
  }

  function copyText(text, el) {
    function fallback() {
      if (el && el.select) { el.focus(); el.select(); }
      else if (el) { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      toast('Sélectionné : appuie longuement pour copier');
    }
    try {
      navigator.clipboard.writeText(text).then(function () { toast('Copié !'); }, fallback);
    } catch (e) { fallback(); }
  }

  /* ===================== Entrées tactiles ===================== */

  var ptr = null;
  cv.addEventListener('pointerdown', function (e) {
    SND.init();
    var x = e.clientX, y = e.clientY;
    if (scene === 'map') {
      map.drag = { y: y, sy: y, t: performance.now(), moved: 0, lastY: y, lastT: performance.now() };
      map.vel = 0;
      return;
    }
    if (scene !== 'play' || !G) return;
    var c = Math.floor((x - G.bx) / G.cs), r = Math.floor((y - G.by) / G.cs);
    if (!G.board.inB(r, c)) { G.sel = null; return; }
    if (G.hammer) { if (canAct()) doHammer(r, c); return; }
    ptr = { x: x, y: y, r: r, c: c, used: false };
  });
  window.addEventListener('pointermove', function (e) {
    if (scene === 'map' && map.drag) {
      var d = map.drag;
      var dy = e.clientY - d.lastY;
      map.scroll -= dy;
      d.moved += Math.abs(dy);
      var now = performance.now();
      map.vel = -dy / Math.max(1, now - d.lastT);
      d.lastY = e.clientY;
      d.lastT = now;
      return;
    }
    if (!ptr || ptr.used || !G) return;
    var dx = e.clientX - ptr.x, dy2 = e.clientY - ptr.y;
    if (Math.max(Math.abs(dx), Math.abs(dy2)) > G.cs * 0.3) {
      ptr.used = true;
      var r2 = ptr.r, c2 = ptr.c;
      if (Math.abs(dx) > Math.abs(dy2)) c2 += dx > 0 ? 1 : -1; else r2 += dy2 > 0 ? 1 : -1;
      doSwap(ptr.r, ptr.c, r2, c2);
    }
  });
  window.addEventListener('pointerup', function (e) {
    if (scene === 'map' && map.drag) {
      var d = map.drag;
      map.drag = null;
      if (performance.now() - d.lastT > 80) map.vel = 0;
      if (d.moved < 10) { map.vel = 0; mapTap(e.clientX, e.clientY); }
      return;
    }
    if (!ptr || !G) { ptr = null; return; }
    if (!ptr.used && canAct()) {
      var r = ptr.r, c = ptr.c;
      if (G.sel && Math.abs(G.sel[0] - r) + Math.abs(G.sel[1] - c) === 1) {
        var s = G.sel;
        G.sel = null;
        doSwap(s[0], s[1], r, c);
      } else if (G.sel && G.sel[0] === r && G.sel[1] === c) {
        G.sel = null;
      } else if (G.board.movable(r, c)) {
        G.sel = [r, c];
        SND.click();
      }
    }
    ptr = null;
  });
  cv.addEventListener('wheel', function (e) {
    if (scene === 'map') { map.scroll += e.deltaY; map.vel = 0; }
  }, { passive: true });

  /* ===================== Bouton retour Android ===================== */

  window.novaBack = function () {
    if (modals.length) {
      var m = modals[modals.length - 1];
      if (m.onBack) m.onBack();
      else if (m.closable) m.close();
      return 'handled';
    }
    if (scene === 'play') { if (G && G.hammer) { G.hammer = false; updateHUD(); } else showPause(); return 'handled'; }
    if (scene === 'map') { showTitle(); return 'handled'; }
    return 'exit';
  };
  window.novaPause = function () {
    SND.suspend();
    if (scene === 'play' && G && !G.ended && !modals.length && !G.busy) showPause();
  };
  window.novaResume = function () { SND.resume(); };
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) window.novaPause(); else window.novaResume();
  });

  /* ===================== Boucle principale ===================== */

  function resize() {
    DPR = Math.min(2.5, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    layoutBoard();
  }
  window.addEventListener('resize', resize);

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(50, now - last);
    last = now;
    T = now;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawBackground(now, dt);
    if (scene === 'title') drawTitle(now, dt);
    else if (scene === 'map') drawMap(now, dt);
    else if (scene === 'play' && G) { updatePlay(dt, now); if (G) drawPlay(now, dt); }
    updateParticles(dt);
    drawParticles();
    requestAnimationFrame(frame);
  }

  resize();
  updateLives();
  showTitle();
  requestAnimationFrame(frame);

  // accès pour les tests
  window.__nova = {
    startLevel: function (n) { SND.init(); startLevel(n); }, showMap: showMap, save: function () { return save; },
    game: function () { return G; }, sprite: function (id) { return sprites[id]; }, unlock: function (n) { save.unlocked = n; persist(); }
  };
})();
