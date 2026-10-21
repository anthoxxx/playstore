#!/usr/bin/env node
/*
 * Simulation : un bot glouton joue des niveaux pour vérifier qu'ils sont
 * jouables et mesurer la courbe de difficulté.
 *   node tools/sim.js [premier] [dernier] [pas] [parties]
 */
'use strict';
var path = require('path');
var E = require(path.join(__dirname, '../app/src/main/assets/www/js/engine.js'));
var L = require(path.join(__dirname, '../app/src/main/assets/www/js/levels.js'));

var bot = require('./bot.js');
var progress = bot.progress;

function playGame(level, seed) {
  var b = new E.Board(level, seed);
  var guard = 0;
  while (b.status() === 'playing' && guard++ < 200) {
    var best = bot.bestMove(b);
    if (!best) break;
    var res = b.trySwap(best[0], best[1], best[2], best[3]);
    if (!res.valid) throw new Error('coup invalide ' + best);
  }
  var st = b.status();
  var pre = b.score, used = level.moves - b.moves;
  if (st === 'won') b.bonusRush();
  return { won: st === 'won', score: b.score, spm: pre / Math.max(1, used), movesLeft: b.moves, progress: Math.min(1, progress(b) / b.goals.length) };
}

var from = +process.argv[2] || 1, to = +process.argv[3] || 60, stepN = +process.argv[4] || 1, games = +process.argv[5] || 4;
var total = 0, wins = 0;
for (var n = from; n <= to; n += stepN) {
  var lv = L.generate(n);
  var w = 0, prog = 0, score = 0, spmS = 0;
  for (var g = 0; g < games; g++) {
    var r = playGame(lv, n * 1000 + g);
    if (r.won) w++;
    prog += r.progress;
    score += r.score; spmS += r.spm;
  }
  total += games; wins += w;
  var goals = lv.goals.map(function (x) { return x.type + (x.count ? ':' + x.count : '') + (x.target ? ':' + x.target : ''); }).join(',');
  console.log(
    ('    ' + n).slice(-4), lv.tag.padEnd(4), ('d=' + lv.difficulty.toFixed(2)), 'c' + lv.colors, lv.rows + 'x' + lv.cols,
    'mv' + lv.moves, goals.padEnd(28), 'win ' + w + '/' + games, 'prog ' + (prog / games).toFixed(2),
    'score ' + Math.round(score / games), 'spm ' + Math.round(spmS / games), 'stars ' + lv.stars.join('/')
  );
}
console.log('TOTAL win rate', (wins / total * 100).toFixed(1) + '%');
