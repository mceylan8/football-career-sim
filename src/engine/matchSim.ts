import type { Club } from '../types/club';
import type { PlayerState } from '../types/player';

export interface MatchResult {
  opponentName: string;
  /** Match rating 1.0–10.0, derived from performance. */
  rating: number;
  performance: number;
  outcome: 'win' | 'draw' | 'loss';
  goalsFor: number;
  goalsAgainst: number;
  formDelta: number;
  reputationDelta: number;
  summary: string;
}

function noise(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Club Elo (1485–1984 in clubs.json) mapped onto the 0–100 player scale. */
export function opponentStrength(elo: number): number {
  return 35 + (elo - 1485) / 8.3;
}

const NOISE = 12;
const WIN_AT = 4;
const DRAW_AT = -5;

/**
 * playerPower = 0.6 * avg(tech, phys, mental) + 0.4 * form
 * performance = playerPower - opponentStrength(elo) + noise(-12, 12)
 * win >= 4, draw >= -5, else loss
 */
export function playerRatingFromStats(state: PlayerState): number {
  const { tech, phys, mental } = state.stats;
  return (tech + phys + mental) / 3;
}

export function simulateMatch(
  state: PlayerState,
  opponent: Club,
): MatchResult {
  const playerRating = playerRatingFromStats(state);
  const performance =
    playerRating * 0.6 +
    state.form * 0.4 -
    opponentStrength(opponent.rating) +
    noise(-NOISE, NOISE);

  let outcome: MatchResult['outcome'];
  if (performance >= WIN_AT) outcome = 'win';
  else if (performance >= DRAW_AT) outcome = 'draw';
  else outcome = 'loss';

  const goalsFor =
    outcome === 'win'
      ? 1 + Math.floor(Math.random() * 3)
      : outcome === 'draw'
        ? Math.floor(Math.random() * 3)
        : Math.floor(Math.random() * 2);
  const goalsAgainst =
    outcome === 'win'
      ? Math.floor(Math.random() * goalsFor)
      : outcome === 'draw'
        ? goalsFor
        : goalsFor + 1 + Math.floor(Math.random() * 2);

  const formDelta =
    outcome === 'win' ? 4 : outcome === 'draw' ? 0 : -4;
  const reputationDelta =
    outcome === 'win' ? 3 : outcome === 'draw' ? 0 : -2;

  const rating = Math.round(clamp(6 + performance / 6, 1, 10) * 10) / 10;
  const label = outcome === 'win' ? 'Sieg' : outcome === 'draw' ? 'Remis' : 'Niederlage';
  const summary = `${state.club?.name ?? 'Du'} ${goalsFor}:${goalsAgainst} ${opponent.name} — ${label}`;

  return {
    opponentName: opponent.name,
    rating,
    performance: clamp(performance, -30, 40),
    outcome,
    goalsFor,
    goalsAgainst,
    formDelta,
    reputationDelta,
    summary,
  };
}
