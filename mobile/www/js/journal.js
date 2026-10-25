// ══ Щоденник розкладів: настрій, нотатка, «чи справдилось» ═══════════════════
// Зберігається на сервері в рядку розкладу (PATCH /readings/:userId/:readingId).
import { t } from './i18n.js';
import { state, track } from './state.js';
import { api } from './api.js';
import { haptic } from './platform.js';
import { esc, toast } from './ui.js';

export const MOODS = [['great', '😍'], ['good', '🙂'], ['calm', '😌'], ['anxious', '😟'], ['sad', '😢']];
export const moodEmoji = m => (MOODS.find(x => x[0] === m) || [])[1] || '';
export const OUTCOMES = ['yes', 'partly', 'no'];

// HTML блоку. withOutcome — показати «чи справдилось» (для старих розкладів)
export function journalHtml(reading, { withOutcome = false } = {}) {
  if (!reading?.id) return '';
  return `<div class="journal" data-id="${esc(reading.id)}">
    <div class="ai-box-head"><span>📓</span><span>${t('journalTitle')}</span></div>
    <p class="jr-q">${t('journalMood')}</p>
    <div class="jr-moods">${MOODS.map(([k, e]) => `<button class="jr-mood${reading.mood === k ? ' on' : ''}" data-m="${k}" aria-label="${t('mood_' + k)}">
      <span>${e}</span><small>${t('mood_' + k)}</small></button>`).join('')}</div>
    <textarea class="field area jr-note" rows="3" maxlength="2000" placeholder="${t('journalPh')}">${esc(reading.note || '')}</textarea>
    ${withOutcome ? `<p class="jr-q">${t('outcomeQ')}</p>
      <div class="seg jr-outcome">${OUTCOMES.map(o => `<button class="${reading.outcome === o ? 'on' : ''}" data-o="${o}">${t('outcome_' + o)}</button>`).join('')}</div>` : ''}
    <button class="btn-ghost jr-save">${t('journalSave')}</button>
  </div>`;
}

export function wireJournal(root, reading, onSaved) {
  const box = root.querySelector('.journal');
  if (!box) return;
  let mood = reading.mood || '', outcome = reading.outcome || '';
  box.querySelectorAll('.jr-mood').forEach(b => b.onclick = () => {
    haptic('select');
    mood = mood === b.dataset.m ? '' : b.dataset.m;
    box.querySelectorAll('.jr-mood').forEach(x => x.classList.toggle('on', x.dataset.m === mood));
  });
  box.querySelectorAll('.jr-outcome button').forEach(b => b.onclick = () => {
    haptic('select');
    outcome = outcome === b.dataset.o ? '' : b.dataset.o;
    box.querySelectorAll('.jr-outcome button').forEach(x => x.classList.toggle('on', x.dataset.o === outcome));
  });
  box.querySelector('.jr-save').onclick = async () => {
    const note = box.querySelector('.jr-note').value.trim();
    const res = await api('PATCH', `/readings/${state.userId}/${reading.id}`, { note, mood, outcome });
    if (!res.ok) { toast(t('errGeneric')); return; }
    Object.assign(reading, { note, mood, outcome });
    haptic('success');
    toast(t('journalSaved'));
    track('journal_save', mood || 'note');
    onSaved?.(reading);
  };
}
