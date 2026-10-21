#!/usr/bin/env node
/*
 * Tests du moteur et des 2000 niveaux :  node tools/test.js
 */
'use strict';
var path = require('path');
var assert = require('assert');
var E = require(path.join(__dirname, '../app/src/main/assets/www/js/engine.js'));
var L = require(path.join(__dirname, '../app/src/main/assets/www/js/levels.js'));
var K = E.K;

var failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok   ' + name); }
  catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + (e.stack || e)); }
}

test('les 2000 niveaux sont valides et déterministes', function () {
  assert.strictEqual(L.MAX_LEVEL, 2000);
  for (var n = 1; n <= L.MAX_LEVEL; n++) {
    var lv = L.generate(n);
    assert.ok(lv.moves >= 10 && lv.moves <= 60, 'coups ' + n + ': ' + lv.moves);
    assert.ok(lv.colors >= 5 && lv.colors <= 6, 'couleurs ' + n);
    assert.ok(lv.goals.length >= 1, 'objectifs ' + n);
    assert.ok(lv.stars[0] < lv.stars[1] && lv.stars[1] < lv.stars[2], 'étoiles ' + n);
    if (lv.mask) {
      assert.strictEqual(lv.mask.length, lv.rows, 'masque lignes ' + n);
      lv.mask.forEach(function (row) { assert.strictEqual(row.length, lv.cols, 'masque colonnes ' + n); });
    }
    [lv.jelly, lv.frost, lv.locks].forEach(function (list) {
      list.forEach(function (p) { assert.ok(p[0] >= 0 && p[0] < lv.rows && p[1] >= 0 && p[1] < lv.cols, 'case hors plateau ' + n); });
    });
    var seen = {};
    lv.goals.forEach(function (g) {
      if (g.type === 'collect') { assert.ok(!seen[g.color], 'couleur en double ' + n); seen[g.color] = 1; }
    });
  }
  var a = JSON.stringify(require(path.join(__dirname, '../app/src/main/assets/www/js/levels.js')).generate(777));
  assert.strictEqual(a, JSON.stringify(L.generate(777)));
});

test('chaque plateau de départ propose un coup et aucun alignement', function () {
  for (var n = 1; n <= L.MAX_LEVEL; n += 13) {
    var b = new E.Board(L.generate(n), n);
    assert.ok(b.hasPossibleMove(), 'aucun coup au niveau ' + n);
    assert.strictEqual(b.findGroups().length, 0, 'alignement initial au niveau ' + n);
    if (b.jellyTotal) assert.ok(b.goalState().length > 0);
  }
});

test('un échange invalide est refusé sans coûter de coup', function () {
  var b = new E.Board(L.generate(1), 3);
  var moves = b.moves;
  for (var r = 0; r < b.R; r++) for (var c = 0; c < b.C - 1; c++) {
    var res = b.clone().trySwap(r, c, r, c + 1);
    if (!res.valid) {
      var real = b.trySwap(r, c, r, c + 1);
      assert.strictEqual(real.valid, false);
      assert.strictEqual(b.moves, moves);
      return;
    }
  }
});

test('alignement de 4 => bonbon rayé, de 5 => Nova', function () {
  var lv = { rows: 6, cols: 6, colors: 5, moves: 10, goals: [{ type: 'score', target: 100 }], jelly: [], frost: [], locks: [] };
  var b = new E.Board(lv, 1);
  // ligne 5 : A A x A A ? avec le bonbon A au-dessus du trou
  var pattern = [
    [1, 2, 3, 4, 1, 2],
    [2, 3, 4, 1, 2, 3],
    [3, 4, 1, 2, 3, 4],
    [4, 1, 2, 3, 4, 1],
    [1, 2, 0, 4, 1, 2],
    [0, 0, 3, 0, 0, 4]
  ];
  for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) b.candies[r][c] = b.newCandy(pattern[r][c]);
  var res = b.trySwap(4, 2, 5, 2);
  assert.ok(res.valid);
  var clear = res.steps.filter(function (s) { return s.t === 'clear'; })[0];
  assert.ok(clear.transforms.some(function (t) { return t.kind === K.NOVA; }), 'pas de Nova');

  var b2 = new E.Board(lv, 1);
  var p2 = [
    [1, 2, 3, 4, 1, 2],
    [2, 3, 4, 1, 2, 3],
    [3, 4, 1, 2, 3, 4],
    [4, 1, 2, 3, 4, 1],
    [1, 2, 0, 4, 1, 2],
    [0, 0, 3, 0, 2, 4]
  ];
  for (r = 0; r < 6; r++) for (c = 0; c < 6; c++) b2.candies[r][c] = b2.newCandy(p2[r][c]);
  var res2 = b2.trySwap(4, 2, 5, 2);
  var clear2 = res2.steps.filter(function (s) { return s.t === 'clear'; })[0];
  assert.ok(clear2.transforms.some(function (t) { return t.kind === K.SH || t.kind === K.SV; }), 'pas de rayé');
});

test('Nova + bonbon détruit toute la couleur', function () {
  var b = new E.Board(L.generate(30), 9);
  var a = b.candies[4][4], o = b.candies[4][5];
  a.kind = K.NOVA; a.color = -1;
  if (o.kind !== K.NORMAL) o.kind = K.NORMAL;
  var col = o.color;
  var res = b.trySwap(4, 4, 4, 5);
  assert.ok(res.valid);
  var clear = res.steps[1];
  assert.ok(clear.removed.filter(function (x) { return x.color === col; }).length >= 5);
});

test('parties aléatoires complètes sans plantage (gravité, cascades, bonus)', function () {
  for (var n = 1; n <= L.MAX_LEVEL; n += 97) {
    var b = new E.Board(L.generate(n), n * 31);
    var guard = 0;
    while (b.status() === 'playing' && guard++ < 80) {
      var mv = b.listMoves();
      assert.ok(mv.length > 0, 'bloqué au niveau ' + n);
      var m = mv[Math.floor(b.rng() * mv.length)];
      var res = b.trySwap(m[0], m[1], m[2], m[3]);
      assert.ok(res.valid);
      // plus rien ne peut tomber après un coup (seules les cases coincées sous un obstacle restent vides)
      assert.strictEqual(b.applyGravity(), null, 'gravité instable au niveau ' + n);
      for (var r = 0; r < b.R; r++) for (var c = 0; c < b.C; c++) {
        if (b.canHold(r, c) && !b.candies[r][c]) assert.strictEqual(b.scanUp(r, c), null, 'case vide ' + n + ' ' + r + ',' + c);
      }
      assert.strictEqual(b.findGroups().length, 0);
    }
    b.useHammer(Math.floor(b.R / 2), Math.floor(b.C / 2));
    b.useShuffle();
    b.moves = 3;
    b.bonusRush();
    assert.strictEqual(b.moves, 0);
  }
});

if (failures) { console.log(failures + ' test(s) en échec'); process.exit(1); }
console.log('Tous les tests passent.');
