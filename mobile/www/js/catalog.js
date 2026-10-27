// ══ Каталог тематичних розкладів (data/spreads.json) ══════════════════════════
// Той самий файл читає сервер (backend/services/readingService.js) — назви й позиції в одному місці.
let data = { categories: [], spreads: [] };
try {
  data = await (await fetch(new URL('../data/spreads.json', import.meta.url))).json();
} catch (_) { /* без каталогу лишаються класичні розклади */ }

export const CATEGORIES = data.categories;
export const CATALOG = data.spreads;

const catById = Object.fromEntries(CATALOG.map(s => [s.id, s.cat]));
// Категорія розкладу; класичні розклади теж розкладені по темах
const CLASSIC_CAT = { yes_no: 'choice', three_card: 'future', love: 'love', month: 'future', year: 'future', celtic: 'choice' };
export const spreadCat = id => catById[id] || CLASSIC_CAT[id] || null;
