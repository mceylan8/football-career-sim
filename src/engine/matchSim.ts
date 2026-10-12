import type { Club } from '../types/club';
import type { PlayerState } from '../types/player';

/** Reserve teams are this much weaker than the first team (player scale). */
export const RESERVE_OFFSET = 8;

export interface MatchResult {
  opponentName: string;
  /** Match rating 1.0–10.0, derived from performance. */
  rating: number;
  performance: number;
  outcome: 'win' | 'draw' | 'loss';
  goalsFor: number;
  /** Your own contribution. */
  playerGoals: number;
  playerAssists: number;
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

const GOAL_SHARE: Record<string, number> = { ST: 0.4, OM: 0.28, FL: 0.28, ZM: 0.1, AV: 0.04, IV: 0.05, TW: 0 };
const ASSIST_SHARE: Record<string, number> = { ST: 0.15, OM: 0.32, FL: 0.32, ZM: 0.2, AV: 0.15, IV: 0.03, TW: 0.01 };

/** Each team goal is yours with position share x rating factor (rating 6 = 1.0). */
function contribution(goals: number, share: Record<string, number>, pos: string, rating: number): number {
  const factor = clamp(rating / 6, 0.4, 1.4);
  const p = Math.min(0.7, (share[pos] ?? 0.1) * factor * factor);
  let n = 0;
  for (let i = 0; i < goals; i++) if (Math.random() < p) n++;
  return n;
}

export function simulateMatch(
  state: PlayerState,
  opponent: Club,
): MatchResult {
  const playerRating = playerRatingFromStats(state);
  const performance =
    playerRating * 0.6 +
    state.form * 0.4 -
    (opponentStrength(opponent.rating) - (state.squad === 'reserve' ? RESERVE_OFFSET : 0)) +
    (state.flags.includes('aggressive_match') ? 2 : 0) +
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
  const oppName = state.squad === 'reserve' ? `${opponent.name} II` : opponent.name;
  const ownName = state.club ? (state.squad === 'reserve' ? `${state.club.name} II` : state.club.name) : 'Du';
  const summary = `${ownName} ${goalsFor}:${goalsAgainst} ${oppName} — ${label}`;

  const playerGoals = contribution(goalsFor, GOAL_SHARE, state.position, rating);
  const playerAssists = contribution(goalsFor - playerGoals, ASSIST_SHARE, state.position, rating);

  return {
    playerGoals,
    playerAssists,
    opponentName: oppName,
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
