// ══ Звуки (синтез Web Audio — без файлів) ═══════════════════════════════════
// shuffle — шурхіт колоди, flip — «вжух» перевороту, reveal — м’який дзвін, tap — клік.
import { storage } from './platform.js';

let ctx = null, noiseBuf = null;
export const soundOn = () => storage.get('lunara_sound') !== '0';
export function setSound(on) { storage.set('lunara_sound', on ? '1' : '0'); }

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function noise(a) {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 0.6, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  return src;
}

function whoosh(a, t, dur, from, to, vol) {
  const src = noise(a);
  const f = a.createBiquadFilter();
  f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t); src.stop(t + dur + 0.05);
}

function tone(a, t, freq, dur, vol, type = 'sine') {
  const o = a.createOscillator();
  o.type = type; o.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
}

export function play(kind) {
  if (!soundOn()) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + 0.01;
  try {
    if (kind === 'shuffle') for (let i = 0; i < 5; i++) whoosh(a, t + i * 0.14, 0.12, 2500, 900, 0.08);
    else if (kind === 'flip') whoosh(a, t, 0.32, 600, 3200, 0.16);
    else if (kind === 'reveal') [659.3, 830.6, 987.8, 1318.5].forEach((f, i) => tone(a, t + i * 0.09, f, 1.4, 0.06));
    else if (kind === 'tap') tone(a, t, 1200, 0.06, 0.03, 'triangle');
  } catch (_) {}
}
