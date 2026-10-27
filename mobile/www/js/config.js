// ══ Конфіг застосунку ═══════════════════════════════════════════════════════
// Усе, що міняється перед релізом, — тут.

export const CONFIG = {
  // Робоча назва. Перед подачею в App Store — перевірити, що назва вільна.
  APP_NAME: 'Lucky Tarot',
  APP_TAGLINE: 'Tarot & Astrology',

  // Сервер (на нативі запити йдуть сюди; у браузері/Telegram — на той самий origin)
  API_ORIGIN: 'https://lunara-tarot.up.railway.app',

  // RevenueCat: публічний iOS-ключ (appl_...) з дашборду RevenueCat → API keys
  REVENUECAT_IOS_KEY: '',
  REVENUECAT_ANDROID_KEY: '',
  ENTITLEMENT: 'pro',

  // Продукти в App Store Connect (ідентифікатори мають збігатися з RevenueCat)
  // fallbackPrice — тільки для перегляду в браузері/Telegram, на iOS ціна береться з App Store
  PLANS: [
    // Перший тиждень за пільговою ціною (Introductory offer «Pay as you go» в App Store Connect)
    { id: 'weekly', productId: 'luckytarot_pro_weekly', period: 'week', fallbackPrice: '$6.99', fallbackIntro: { price: 2.79, priceString: '$2.79', days: 7, cycles: 1 } },
    { id: 'yearly', productId: 'luckytarot_pro_yearly', period: 'year', fallbackPrice: '$39.99', fallbackPerWeek: '$0.77' },
  ],
  DEFAULT_PLAN: 'weekly',

  SUPPORT_EMAIL: 'tarotsupports@gmail.com',
  LEGAL_PATH: '/app/legal',

  // Щоденне нагадування про карту дня (локальне сповіщення на пристрої)
  REMINDER_HOUR: 9,
  REMINDER_MINUTE: 0,
};
