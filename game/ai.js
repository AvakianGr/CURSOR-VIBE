// AI firm world-state tick. Firm reputation drifts toward wins count.
import { emit, SLICES } from './bus.js';

export function tickDailyAi(state) {
  for (const f of state.ai) {
    // Slowly adjust aggressiveness based on cash
    if (f.cash < 3_000_000) f.aggressiveness = Math.min(0.85, f.aggressiveness + 0.001);
    if (f.cash > 30_000_000) f.aggressiveness = Math.max(0.30, f.aggressiveness - 0.001);
    // Reputation decays toward win rate equilibrium
    const targetRep = 45 + Math.min(30, (f.wins || 0) * 0.5);
    f.reputation += (targetRep - f.reputation) * 0.002;
    f.reputation = Math.max(10, Math.min(95, f.reputation));
  }
  emit(SLICES.MAP);
}
