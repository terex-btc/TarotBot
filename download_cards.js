#!/usr/bin/env node
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://upload.wikimedia.org/wikipedia/commons';
const OUT_DIR = path.join(__dirname, 'frontend/assets/cards');

const CARDS = [
  [0,  '9/90/RWS_Tarot_00_Fool.jpg'],
  [1,  'd/de/RWS_Tarot_01_Magician.jpg'],
  [2,  '8/88/RWS_Tarot_02_High_Priestess.jpg'],
  [3,  'd/d2/RWS_Tarot_03_Empress.jpg'],
  [4,  'c/c3/RWS_Tarot_04_Emperor.jpg'],
  [5,  '8/8d/RWS_Tarot_05_Hierophant.jpg'],
  [6,  'd/db/RWS_Tarot_06_Lovers.jpg'],
  [7,  '9/9b/RWS_Tarot_07_Chariot.jpg'],
  [8,  'f/f5/RWS_Tarot_08_Strength.jpg'],
  [9,  '4/4d/RWS_Tarot_09_Hermit.jpg'],
  [10, '3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg'],
  [11, 'e/e0/RWS_Tarot_11_Justice.jpg'],
  [12, '2/2b/RWS_Tarot_12_Hanged_Man.jpg'],
  [13, 'd/d7/RWS_Tarot_13_Death.jpg'],
  [14, 'f/f8/RWS_Tarot_14_Temperance.jpg'],
  [15, '5/55/RWS_Tarot_15_Devil.jpg'],
  [16, '5/53/RWS_Tarot_16_Tower.jpg'],
  [17, 'd/db/RWS_Tarot_17_Star.jpg'],
  [18, '7/7f/RWS_Tarot_18_Moon.jpg'],
  [19, '1/17/RWS_Tarot_19_Sun.jpg'],
  [20, 'd/dd/RWS_Tarot_20_Judgement.jpg'],
  [21, 'f/ff/RWS_Tarot_21_World.jpg'],
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: { 'User-Agent': 'Mozilla/5.0 TarotBot/1.0' }
    };
    const req = https.get(url, options, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = fs.statSync(dest).size;
        console.log(`✅ card_${String(res.req.path.split('/').pop().match(/\d+/)?.[0] || '?').padStart(2,'0')}.jpg — ${(size/1024).toFixed(0)} KB`);
        resolve(size);
      });
    });
    req.on('error', e => { fs.unlink(dest, () => {}); reject(e); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function downloadWithRetry(url, dest, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await download(url, dest);
      return;
    } catch (e) {
      if (attempt < retries && e.message.includes('429')) {
        const wait = attempt * 8000;
        console.log(`  ⏳ Rate limited, waiting ${wait/1000}s...`);
        await sleep(wait);
      } else {
        throw e;
      }
    }
  }
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const [id, filePath] of CARDS) {
    const num = String(id).padStart(2, '0');
    const dest = path.join(OUT_DIR, `card_${num}.jpg`);
    const url = `${BASE}/${filePath}`;

    if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) {
      console.log(`⏩ card_${num}.jpg already exists`);
      continue;
    }

    try {
      await downloadWithRetry(url, dest);
    } catch (e) {
      console.error(`❌ card_${num}.jpg: ${e.message}`);
    }
    await sleep(3000);
  }
  console.log('\nDone!');
}

main();
