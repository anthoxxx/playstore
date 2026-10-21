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
    musicBus.gain.value = 0.22;
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

  /* ---------- musique : deux morceaux composés (menu / partie) ---------- */
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var R_ = -1; // silence
  var TRACKS = {
    menu: {
      bpm: 84,
      chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
      bass: [36, 33, 29, 31],
      melody: [
        [76, R_, R_, 79, R_, R_, 84, R_], [81, R_, R_, 76, R_, R_, 72, R_],
        [77, R_, R_, 81, R_, R_, 84, R_], [83, R_, 79, R_, 74, R_, R_, R_],
        [76, R_, 79, R_, 84, R_, 83, 81], [81, R_, 76, R_, 72, R_, R_, R_],
        [77, R_, 81, R_, 84, R_, 86, R_], [83, R_, R_, R_, 79, R_, R_, R_]
      ],
      lead: 'bell', drums: false, pad: true
    },
    game: {
      bpm: 112,
      chords: [[65, 69, 72], [67, 71, 74], [64, 67, 71], [69, 72, 76], [65, 69, 72], [67, 71, 74], [60, 64, 67], [67, 71, 74]],
      bass: [41, 43, 40, 45, 41, 43, 36, 43],
      melody: [
        [72, R_, 74, 76, 77, R_, 76, 74], [74, R_, 71, R_, 67, 71, 74, R_],
        [76, R_, 79, R_, 76, 74, 71, R_], [72, R_, 69, 72, 76, R_, R_, R_],
        [77, 76, 77, 79, 81, R_, 77, R_], [79, R_, 74, R_, 71, 74, 79, R_],
        [76, R_, 72, R_, 79, R_, 84, R_], [83, R_, 79, R_, 74, R_, R_, R_]
      ],
      lead: 'pluck', drums: true, pad: false
    }
  };
  var track = 'menu', nextTrack = 'menu';
  var noiseBuf = null;

  function startMusic() {
    if (!ctx || musicTimer) return;
    nextNoteTime = ctx.currentTime + 0.1;
    musicStep = 0;
    musicTimer = setInterval(schedule, 50);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function osc(type, f, t, dur, peak, attack, filter) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    env(g, t, attack || 0.01, peak, dur);
    if (filter) {
      var fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = filter;
      o.connect(fl); fl.connect(g);
    } else o.connect(g);
    g.connect(musicBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function getNoise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function drum(kind, t) {
    if (kind === 'kick') {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      env(g, t, 0.004, 0.9, 0.22);
      o.connect(g); g.connect(musicBus);
      o.start(t); o.stop(t + 0.25);
      return;
    }
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g2 = ctx.createGain();
    src.buffer = getNoise();
    f.type = kind === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'hat' ? 7500 : 1600;
    env(g2, t, 0.002, kind === 'hat' ? 0.18 : 0.45, kind === 'hat' ? 0.05 : 0.14);
    src.connect(f); f.connect(g2); g2.connect(musicBus);
    src.start(t, Math.random() * 0.3); src.stop(t + 0.2);
  }
  function leadNote(kind, f, t, dur) {
    if (kind === 'bell') {
      osc('sine', f, t, dur * 2.2, 0.32, 0.005);
      osc('sine', f * 2.76, t, dur * 0.8, 0.06, 0.005);
      osc('triangle', f * 2, t, dur * 1.2, 0.05, 0.005);
    } else {
      osc('triangle', f, t, dur * 1.1, 0.34, 0.005, 3200);
      osc('square', f, t, dur * 0.6, 0.05, 0.005, 1800);
    }
  }

  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    while (nextNoteTime < ctx.currentTime + 0.3) {
      var T = TRACKS[track];
      var stepDur = 60 / T.bpm / 2;
      var barCount = T.melody.length;
      var bar = Math.floor(musicStep / 8) % barCount, i = musicStep % 8;
      var t = nextNoteTime;
      var ch = T.chords[bar % T.chords.length], root = T.bass[bar % T.bass.length];
      // basse
      if (T.drums) {
        var bassPat = [0, R_, 12, R_, 0, 0, 12, R_];
        if (bassPat[i] !== R_) osc('triangle', midi(root + bassPat[i]), t, stepDur * 0.9, 0.42, 0.005, 900);
      } else if (i === 0 || i === 4) osc('sine', midi(root), t, stepDur * 3.8, 0.38, 0.02);
      // accords
      if (T.pad && i === 0) ch.forEach(function (m) { osc('sawtooth', midi(m), t, stepDur * 7.8, 0.035, 0.35, 900); });
      if (!T.pad && (i === 1 || i === 3 || i === 5 || i === 7)) ch.forEach(function (m) { osc('triangle', midi(m), t, stepDur * 0.5, 0.06, 0.004, 2400); });
      // mélodie
      var note = T.melody[bar][i];
      if (note !== R_) leadNote(T.lead, midi(note), t, stepDur);
      // percussions
      if (T.drums) {
        if (i === 0 || i === 4) drum('kick', t);
        if (i === 2 || i === 6) drum('clap', t);
        drum('hat', t + (i % 2 ? 0.01 : 0));
      }
      nextNoteTime += stepDur;
      musicStep++;
      // changement de morceau au début d'une mesure
      if (musicStep % 8 === 0 && nextTrack !== track) { track = nextTrack; musicStep = 0; }
    }
  }

  S.setTrack = function (name) { if (TRACKS[name]) nextTrack = name; };

  /* ---------- voix : le jeu félicite à voix haute ---------- */
  var voiceOn = true, lastSay = 0, frVoice = null;
  function pickVoice() {
    if (frVoice || !global.speechSynthesis) return frVoice;
    var list = global.speechSynthesis.getVoices() || [];
    for (var i = 0; i < list.length; i++) if (/^fr/i.test(list[i].lang)) { frVoice = list[i]; break; }
    return frVoice;
  }
  S.setVoice = function (v) { voiceOn = v; };
  S.say = function (text, force) {
    if (!voiceOn) return;
    var now = Date.now();
    if (!force && now - lastSay < 900) return;
    lastSay = now;
    try {
      if (global.Android && global.Android.speak) { global.Android.speak(text); return; }
      var ss = global.speechSynthesis;
      if (!ss) return;
      ss.cancel();
      var u = new global.SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.pitch = 1.5;
      u.rate = 1.05;
      var v = pickVoice();
      if (v) u.voice = v;
      ss.speak(u);
    } catch (e) { }
  };

  global.NovaAudio = S;
})(this);
