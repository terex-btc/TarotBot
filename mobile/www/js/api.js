// ══ API + сесія ═════════════════════════════════════════════════════════════
import { CONFIG } from './config.js';
import { isNative, isTelegram, storage, telegramUser, telegramInitData } from './platform.js';

const BASE = isNative ? CONFIG.API_ORIGIN : '';
let appToken = null;

export async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (appToken) headers['X-App-Auth'] = appToken;
  else if (telegramInitData) headers['X-Tg-Auth'] = telegramInitData;
  try {
    const r = await fetch(`${BASE}/api${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    });
    try { return Object.assign(await r.json(), { _status: r.status }); }
    catch (_) { return { ok: false, error: `http_${r.status}`, _status: r.status }; }
  } catch (_) {
    return { ok: false, error: 'offline', _status: 0 };
  }
}

function newDeviceId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

// Повертає userId. У Telegram — id з підписаного initData (той самий акаунт, що й у боті).
// На iOS/Android/вебі — анонімний акаунт на пристрій: deviceId → токен від сервера.
export async function ensureSession() {
  if (isTelegram && telegramUser?.id) return String(telegramUser.id);

  let deviceId = await storage.getDurable('lunara_device');
  if (!deviceId) {
    deviceId = newDeviceId();
    await storage.setDurable('lunara_device', deviceId);
  }
  const cached = await storage.getDurable('lunara_token');
  if (cached && cached.split('.')[0]) {
    appToken = cached;
    return cached.split('.')[0];
  }
  const res = await api('POST', '/app/session', { deviceId });
  if (!res.ok) throw new Error(res.error || 'session_failed');
  appToken = res.token;
  await storage.setDurable('lunara_token', res.token);
  return res.userId;
}

export async function resetSession() {
  appToken = null;
  await storage.clearAll();
}
