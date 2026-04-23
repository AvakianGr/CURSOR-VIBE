import { EVENTS } from './data.js';
import { emit, SLICES } from './bus.js';
import { buildRng } from './state.js';
import { weightedPick } from './rng.js';

export function tickDailyEvents(state) {
  if (state.events.active) return; // wait until player resolves
  if (state.events.cooldownDays > 0) { state.events.cooldownDays--; return; }
  const rng = buildRng(state);
  if (rng() < 0.08) { // 8% chance per day once off cooldown
    const tpl = weightedPick(rng, EVENTS, (e) => e.weight);
    if (!tpl) return;
    // Apply pre-choice effects
    try { tpl.apply?.(state); } catch (_) {}
    state.events.active = {
      id: tpl.id,
      title: tpl.title,
      desc: tpl.desc,
      choices: tpl.choices.map((c, i) => ({ idx: i, label: c.label })),
    };
    state.events.cooldownDays = 15;
    emit(SLICES.EVENTS);
  }
}

export function resolveActiveEvent(state, choiceIdx) {
  const active = state.events.active;
  if (!active) return;
  const tpl = EVENTS.find(e => e.id === active.id);
  if (!tpl) { state.events.active = null; emit(SLICES.EVENTS); return; }
  const choice = tpl.choices[choiceIdx];
  try { choice?.effect?.(state); } catch (_) {}
  state.events.log.unshift({ day: state.day, text: `${tpl.title}: ${choice.label}` });
  state.events.active = null;
  emit(SLICES.EVENTS);
  emit(SLICES.CASH);
  emit(SLICES.HR);
  emit(SLICES.MATERIALS);
}
