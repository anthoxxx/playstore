/*
 * Candy Nova - sons et musique entièrement synthétisés (Web Audio).
 */
(function (global) {
  'use strict';
  var ctx = null, master = null, sfxBus = null, musicBus = null;
  var sfxOn = true, musicOn = true;
  var musicTimer = null, musicStep = 0, nextNoteTime = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.16;
    musicBus.connect(master);
    if (musicOn) startMusic();
  }

  function tone(freq, dur, opts) {
    if (!ctx || !sfxOn) return;
    opts = opts || {};
    var t = ctx.currentTime + (opts.delay || 0);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * opts.slide), t + dur);
    var vol = opts.vol == null ? 0.4 : opts.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.015, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(opts.bus || sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, opts) {
    if (!ctx || !sfxOn) return;
    opts = opts || {};
    var t = ctx.currentTime + (opts.delay || 0);
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = opts.filter || 'lowpass';
    f.frequency.setValueAtTime(opts.freq || 1200, t);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
    var g = ctx.createGain();
    g.gain.value = opts.vol == null ? 0.35 : opts.vol;
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t);
  }

  var SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
  function note(semi, base) { return (base || 440) * Math.pow(2, semi / 12); }

  var S = {
    init: init,
    setSfx: function (v) { sfxOn = v; },
    setMusic: function (v) {
      musicOn = v;
      if (!ctx) return;
      if (v) startMusic(); else stopMusic();
    },
    suspend: function () { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume: function () { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    click: function () { tone(880, 0.06, { type: 'triangle', vol: 0.25 }); },
    swap: function () { tone(520, 0.09, { type: 'sine', slide: 1.6, vol: 0.2 }); },
    bad: function () { tone(220, 0.12, { type: 'square', vol: 0.12 }); tone(180, 0.15, { type: 'square', vol: 0.12, delay: 0.1 }); },
    pop: function (cascade) {
      var idx = Math.min(SCALE.length - 1, Math.max(0, cascade - 1));
      tone(note(SCALE[idx], 523.25), 0.16, { type: 'triangle', vol: 0.35 });
      tone(note(SCALE[idx] + 12, 523.25), 0.1, { type: 'sine', vol: 0.15, delay: 0.03 });
    },
    land: function () { tone(160, 0.05, { type: 'sine', vol: 0.08, slide: 0.6 }); },
    create: function () {
      [0, 4, 7, 12].forEach(function (s, i) { tone(note(s, 659.25), 0.12, { type: 'triangle', vol: 0.22, delay: i * 0.05 }); });
    },
    beam: function () { noise(0.35, { filter: 'bandpass', freq: 3000, sweep: 400, vol: 0.4 }); tone(1200, 0.3, { type: 'sawtooth', slide: 0.2, vol: 0.08 }); },
    boom: function () { noise(0.5, { freq: 900, sweep: 60, vol: 0.6 }); tone(110, 0.4, { type: 'sine', slide: 0.4, vol: 0.5 }); },
    zap: function () {
      for (var i = 0; i < 6; i++) tone(note(SCALE[i * 2 % SCALE.length], 880), 0.08, { type: 'square', vol: 0.06, delay: i * 0.04 });
      noise(0.6, { filter: 'highpass', freq: 2000, vol: 0.2 });
    },
    frost: function () { tone(2200, 0.08, { type: 'triangle', vol: 0.15 }); noise(0.15, { filter: 'highpass', freq: 4000, vol: 0.25 }); },
    jelly: function () { tone(300, 0.12, { type: 'sine', slide: 1.8, vol: 0.18 }); },
    unlock: function () { tone(1500, 0.05, { type: 'square', vol: 0.08 }); tone(1100, 0.08, { type: 'square', vol: 0.08, delay: 0.05 }); },
    collect: function () { tone(1318, 0.1, { type: 'sine', vol: 0.15 }); },
    ingredient: function () {
      [0, 4, 7, 11, 14].forEach(function (s, i) { tone(note(s, 523.25), 0.18, { type: 'triangle', vol: 0.25, delay: i * 0.06 }); });
    },
    star: function (i) {
      tone(note([0, 4, 7][i] + 12, 523.25), 0.35, { type: 'triangle', vol: 0.35 });
      tone(note([0, 4, 7][i] + 24, 523.25), 0.25, { type: 'sine', vol: 0.15, delay: 0.05 });
    },
    win: function () {
      [0, 4, 7, 12, 16, 19, 24].forEach(function (s, i) { tone(note(s, 392), 0.3, { type: 'triangle', vol: 0.28, delay: i * 0.09 }); });
    },
    lose: function () {
      [7, 4, 0, -5].forEach(function (s, i) { tone(note(s, 392), 0.35, { type: 'triangle', vol: 0.25, delay: i * 0.16 }); });
    },
    coin: function () { tone(1568, 0.06, { type: 'square', vol: 0.08 }); tone(2093, 0.12, { type: 'square', vol: 0.08, delay: 0.06 }); },
    combo: function (lvl) {
      [0, 7, 12, 19].slice(0, 2 + Math.min(2, lvl)).forEach(function (s, i) { tone(note(s, 587.33), 0.2, { type: 'sawtooth', vol: 0.07, delay: i * 0.07 }); });
    }
  };

  /* ---------- musique générative douce ---------- */
  var CHORDS = [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 5], [-5, -1, 2, 7]];
  var ARP = [0, 1, 2, 3, 2, 1, 2, 3];
  var BPM = 92;

  function startMusic() {
    if (!ctx || musicTimer) return;
    nextNoteTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(schedule, 60);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

  function mtone(freq, t, dur, type, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    var stepDur = 60 / BPM / 2;
    while (nextNoteTime < ctx.currentTime + 0.25) {
      var bar = Math.floor(musicStep / 8) % CHORDS.length;
      var chord = CHORDS[bar];
      var i = musicStep % 8;
      var semi = chord[ARP[i]];
      mtone(note(semi, 440), nextNoteTime, stepDur * 1.6, 'triangle', 0.22);
      if (i === 0) {
        mtone(note(chord[0] - 24, 440), nextNoteTime, stepDur * 7.5, 'sine', 0.35);
        mtone(note(chord[1] - 12, 440), nextNoteTime, stepDur * 7.5, 'sine', 0.1);
      }
      if (i % 4 === 2 && Math.random() < 0.5) mtone(note(semi + 24, 440), nextNoteTime, stepDur, 'sine', 0.07);
      nextNoteTime += stepDur;
      musicStep++;
    }
  }

  global.NovaAudio = S;
})(this);
