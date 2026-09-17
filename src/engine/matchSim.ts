import type { Club } from '../types/club';
import type { PlayerState } from '../types/player';

export interface MatchResult {
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

/** MVP: performance = (playerRating * 0.6 + form * 0.4) - opponentRating + noise(-10, 10) */
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
    playerRating * 0.6 + state.form * 0.4 - opponent.rating / 20 + noise(-10, 10);

  let outcome: MatchResult['outcome'];
  if (performance >= 8) outcome = 'win';
  else if (performance >= -2) outcome = 'draw';
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

  const summary = `${state.club?.name ?? 'Du'} ${goalsFor}:${goalsAgainst} ${opponent.name} — Performance ${performance.toFixed(1)} (${outcome})`;

  return {
    performance: clamp(performance, -30, 40),
    outcome,
    goalsFor,
    goalsAgainst,
    formDelta,
    reputationDelta,
    summary,
  };
}
