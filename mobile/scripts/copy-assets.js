'use strict';
// Копіює колоду (78 jpg) у www/assets/cards — щоб на iOS/Android карти були
// вбудовані в застосунок, а не вантажились із сервера. У git ця копія не йде.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../../frontend/assets/cards');
const dst = path.join(__dirname, '../www/assets/cards');

fs.mkdirSync(dst, { recursive: true });
let n = 0;
for (const f of fs.readdirSync(src)) {
  if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
  n++;
}
console.log(`[assets] скопійовано ${n} карт → mobile/www/assets/cards`);
