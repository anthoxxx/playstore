#!/usr/bin/env node
/*
 * Crée (ou remplace) la clé du menu admin, protégée par un mot de passe :
 *   node tools/admin-password.js "mon mot de passe"
 *
 * Écrit app/src/main/assets/www/js/admin-key.js. Le jeu ne contient que la clé
 * publique (pour vérifier les codes cadeaux) et la clé privée chiffrée avec le
 * mot de passe : sans le mot de passe, impossible de fabriquer des codes.
 * Attention : changer le mot de passe invalide les codes cadeaux déjà créés.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;

const ITERATIONS = 250000;
const b64 = (buf) => Buffer.from(buf).toString('base64');

(async () => {
  const password = process.argv[2];
  if (!password || password.length < 8) {
    console.error('Usage : node tools/admin-password.js "mot de passe d\'au moins 8 caractères"');
    process.exit(1);
  }
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = await subtle.exportKey('spki', pair.publicKey);
  const priv = await subtle.exportKey('pkcs8', pair.privateKey);
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const base = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const aes = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const enc = await subtle.encrypt({ name: 'AES-GCM', iv }, aes, priv);
  const out = '/* Généré par tools/admin-password.js — clé du menu admin (privée chiffrée par mot de passe). */\n' +
    'window.NOVA_ADMIN_KEY = ' + JSON.stringify({
      pub: b64(pub), salt: b64(salt), iv: b64(iv), enc: b64(enc), iterations: ITERATIONS
    }, null, 2) + ';\n';
  const file = path.join(__dirname, '../app/src/main/assets/www/js/admin-key.js');
  fs.writeFileSync(file, out);
  console.log('Clé admin écrite dans ' + path.relative(process.cwd(), file));
})();
