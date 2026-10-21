#!/usr/bin/env node
/*
 * Mesure, pour chacun des 2000 niveaux, le nombre de coups dont le robot a
 * besoin (médiane de plusieurs parties), et l'écrit dans js/levels-calib.js.
 * Le jeu donne ensuite à chaque niveau ce besoin × une marge qui diminue avec
 * le numéro du niveau : la difficulté monte régulièrement du niveau 1 au 2000.
 *   node tools/calibrate.js [parties=5] [processus=4] [passes=4]
 */
'use strict';
process.env.NOVA_NO_CALIB = '1';
var path = require('path');
var fs = require('fs');
var cp = require('child_process');
var CAP = 90;

if (process.argv[2] === '--worker') {
  var L = require(path.join(__dirname, '../app/src/main/assets/www/js/levels.js'));
  var bot = require('./bot.js');
  var from = +process.argv[3], to = +process.argv[4], games = +process.argv[5];
  var wfile = process.argv[6];
  if (wfile) L.setCalib({ w: JSON.parse(fs.readFileSync(wfile, 'utf8')), m: null });
  for (var n = from; n <= to; n++) {
    var lv = L.generate(n), runs = [];
    for (var g = 0; g < games; g++) runs.push(bot.movesNeeded(lv, n * 7919 + g * 104729, CAP));
    runs.sort(function (a, b) { return a - b; });
    process.stdout.write(n + ' ' + runs[Math.floor(runs.length / 2)] + '\n');
  }
  process.exit(0);
}

var games = +process.argv[2] || 5, procs = +process.argv[3] || 4;
var MAX = 2000;
var L = require(path.join(__dirname, '../app/src/main/assets/www/js/levels.js'));

function measure(wfile, done) {
  var result = new Array(MAX).fill(0), count = 0, running = 0;
  var chunk = Math.ceil(MAX / procs);
  for (var p = 0; p < procs; p++) {
    var a = p * chunk + 1, b = Math.min(MAX, (p + 1) * chunk);
    running++;
    var args = [__filename, '--worker', a, b, games];
    if (wfile) args.push(wfile);
    var child = cp.spawn(process.execPath, args, { env: process.env });
    (function (child) {
      var buf = '';
      child.stdout.on('data', function (d) {
        buf += d;
        var lines = buf.split('\n');
        buf = lines.pop();
        lines.forEach(function (l) {
          var parts = l.split(' ');
          result[+parts[0] - 1] = +parts[1];
          if (++count % 250 === 0) console.log('  ' + count + ' / ' + MAX);
        });
      });
      child.stderr.pipe(process.stderr);
      child.on('exit', function () { if (!--running) done(result); });
    })(child);
  }
}

// mesure, puis ajuste plusieurs fois la quantité de travail de chaque niveau vers la cible
var PASSES = +process.argv[4] || 4;
var wfile = path.join(require('os').tmpdir(), 'nova-work-' + process.pid + '.json');
var w = new Array(MAX).fill(1);

function pass(k) {
  fs.writeFileSync(wfile, JSON.stringify(w));
  console.log('Passe ' + k + ' / ' + PASSES);
  measure(wfile, function (need) {
    var off = 0;
    need.forEach(function (m, i) {
      var t = L.targetNeed(i + 1);
      if (Math.abs(m - t) / t > 0.25) off++;
    });
    console.log('  niveaux à plus de 25 % de la cible : ' + off);
    if (k === PASSES) return finish(need);
    w = w.map(function (wi, i) {
      var t = L.targetNeed(i + 1), m = Math.max(2, need[i]);
      var f = Math.pow(t / m, 0.85);
      return Math.round(Math.min(3, Math.max(0.2, wi * f)) * 100) / 100;
    });
    pass(k + 1);
  });
}

function finish(need) {
  fs.unlinkSync(wfile);
  var out = '/* Généré par tools/calibrate.js : quantité de travail (w) et coups nécessaires au robot (m), niveaux 1 à 2000. */\n' +
    '(function (v) { if (typeof module !== \'undefined\' && module.exports) module.exports = v; else window.NOVA_CALIB = v; })({\n' +
    '  w: \'' + w.join(',') + '\',\n  m: \'' + need.join(',') + '\'\n});\n';
  fs.writeFileSync(path.join(__dirname, '../app/src/main/assets/www/js/levels-calib.js'), out);
  console.log('Écrit js/levels-calib.js');
}

pass(1);
