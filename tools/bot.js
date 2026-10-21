/*
 * Robot joueur glouton partagé par tools/sim.js et tools/calibrate.js.
 */
'use strict';
var path = require('path');
var E = require(path.join(__dirname, '../app/src/main/assets/www/js/engine.js'));

function progress(b) {
  var s = 0;
  b.goalState().forEach(function (g) { s += Math.min(1, g.have / g.need); });
  if (b.ingNeed > 0) {
    // bonus pour les cristaux qui descendent
    for (var r = 0; r < b.R; r++) for (var c = 0; c < b.C; c++) {
      var cd = b.candies[r][c];
      if (cd && cd.kind === E.K.ING) s += 0.5 * (r + 1) / b.R / b.ingNeed;
    }
  }
  return s;
}

function bestMove(b) {
  var moves = b.listMoves();
  if (!moves.length) return null;
  var best = null, bestV = -1;
  for (var i = 0; i < moves.length; i++) {
    var m = moves[i];
    var cb = b.clone();
    cb.trySwap(m[0], m[1], m[2], m[3]);
    var v = progress(cb) * 1000 + cb.score / 100 + Math.random();
    if (cb.goalsDone()) v += 1e6;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}

// joue jusqu'à remplir les objectifs ; renvoie le nombre de coups utilisés (cap si échec)
function movesNeeded(level, seed, cap) {
  var lv = Object.assign({}, level, { moves: cap });
  var b = new E.Board(lv, seed);
  while (!b.goalsDone() && b.moves > 0) {
    var m = bestMove(b);
    if (!m) break;
    b.trySwap(m[0], m[1], m[2], m[3]);
  }
  return b.goalsDone() ? cap - b.moves : cap;
}

module.exports = { progress: progress, bestMove: bestMove, movesNeeded: movesNeeded, E: E };
