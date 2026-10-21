#!/usr/bin/env node
/*
 * Génère les visuels de la fiche Play Store dans store/ (nécessite Playwright) :
 *   npx -y playwright@1.56.1 install chromium   (une seule fois)
 *   node tools/make-store-assets.js
 */
'use strict';
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'store');
const GAME = 'file://' + path.join(ROOT, 'app/src/main/assets/www/index.html');

(async () => {
  const browser = await chromium.launch();
  // icône + bannière
  const art = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
  await art.goto('file://' + path.join(__dirname, 'store-art.html'));
  await art.waitForTimeout(800);
  await (await art.$('#icon')).screenshot({ path: path.join(OUT, 'icon-512.png') });
  await (await art.$('#feature')).screenshot({ path: path.join(OUT, 'feature-graphic-1024x500.png') });

  // captures d'écran 1080x1920
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  await page.goto(GAME);
  await page.evaluate(() => localStorage.setItem('candynova.save.v1', JSON.stringify({
    unlocked: 47, coins: 1250, daily: { day: (d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate())(new Date()), streak: 3 },
    stars: Object.fromEntries(Array.from({ length: 46 }, (_, i) => [i + 1, 1 + (i * 7) % 3])), tips: { s_1: 1, s_2: 1, s_3: 1, s_4: 1, o_jelly: 1, o_frost: 1, o_lock: 1, o_ingredient: 1 }
  })));
  await page.reload();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'screenshot-1-titre.png') });
  await page.click('#t-play', { force: true });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'screenshot-2-carte.png') });
  const shots = [[47, '3-gelee'], [10, '4-cristaux'], [140, '5-obstacles']];
  for (const [n, name] of shots) {
    await page.evaluate((n) => { window.__nova.unlock(200); window.__nova.startLevel(n); }, n);
    await page.waitForTimeout(3200);
    // place quelques bonbons spéciaux pour la vitrine
    await page.evaluate(() => {
      const g = window.__nova.game(), b = g.board, K = window.NovaEngine.K;
      const spots = [[3, 2, K.SH], [5, 5, K.WRAP], [6, 1, K.NOVA]];
      spots.forEach(([r, c, k]) => {
        const cd = b.candies[r] && b.candies[r][c];
        if (!cd || cd.kind === K.ING) return;
        cd.kind = k; if (k === K.NOVA) cd.color = -1;
        const sp = window.__nova.sprite(cd.id); if (sp) { sp.kind = cd.kind; sp.color = cd.color; }
      });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, 'screenshot-' + name + '.png') });
  }
  await browser.close();
  console.log('Visuels générés dans store/');
})();
