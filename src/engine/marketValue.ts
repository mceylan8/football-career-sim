import type { PlayerState } from '../types/player';
import { playerRatingFromStats } from './matchSim';

export function ovrOf(state: PlayerState): number {
  return Math.round(playerRatingFromStats(state));
}

/** Young players are worth more, value drops after ~29. */
function ageFactor(age: number): number {
  if (age <= 19) return 1.4;
  if (age <= 23) return 1.2;
  if (age <= 28) return 1.0;
  if (age <= 31) return 0.75;
  return 0.5;
}

/**
 * value = 30.000 * e^((ovr-40)/6) * ageFactor * (1 + rep/100) * (0.9 + form/500)
 * Start (OVR 42, age 17, rep 20, form 55) ≈ 71 T€; OVR 51 at 19 ≈ 318 T€.
 */
export function marketValue(state: PlayerState): number {
  const ovr = ovrOf(state);
  const raw =
    30000 *
    Math.exp((ovr - 40) / 6) *
    ageFactor(state.age) *
    (1 + state.reputation / 100) *
    (0.9 + state.form / 500);
  const step = raw >= 1_000_000 ? 50_000 : 1_000;
  return Math.round(raw / step) * step;
}

export function formatValue(v: number): string {
  if (v >= 1_000_000) {
    return `${(v / 1_000_000).toFixed(1).replace('.', ',')} Mio €`;
  }
  return `${Math.round(v / 1000)} T€`;
}

export function formatMoney(v: number): string {
  return `${v.toLocaleString('de-DE')} €`;
}
