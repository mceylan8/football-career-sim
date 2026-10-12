import type { Club } from '../types/club';
import type { PlayerState, PlayerStats, Talent } from '../types/player';
import { ovrOf } from './marketValue';
import { RESERVE_OFFSET, opponentStrength, simulateMatch } from './matchSim';

export const MATCHDAYS = 30;
export const WEEKS = 12;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Average squad level of the player's current team (0-100 scale). */
export function squadLevel(club: Club | null, reserve: boolean): number {
  if (!club) return 40;
  return opponentStrength(club.rating) - (reserve ? RESERVE_OFFSET : 0);
}

/**
 * edge     = OVR - squadLevel + (trust - 50) / 5
 * playtime = clamp(0.5 + edge / 20, 0.05, 0.95)   (share of matchdays you play)
 */
export function playtimeShare(p: PlayerState): number {
  const level = squadLevel(p.club, p.squad === 'reserve');
  const edge = ovrOf(p) - level + (p.trust - 50) / 5;
  return clamp(0.5 + edge / 20, 0.05, 0.95);
}

export function roleLabel(share: number): string {
  if (share >= 0.75) return 'Stammspieler';
  if (share >= 0.5) return 'Rotation';
  if (share >= 0.25) return 'Joker';
  return 'Bank';
}

export function teamName(p: PlayerState): string {
  if (!p.club) return 'Vereinslos';
  return p.squad === 'reserve' ? `${p.club.name} II` : p.club.name;
}

/** Matchdays that fall into week w (1..12): 2,3,2,3,... sums to 30. */
export function matchdaysInWeek(week: number): number {
  return (
    Math.floor((MATCHDAYS * week) / WEEKS) -
    Math.floor((MATCHDAYS * (week - 1)) / WEEKS)
  );
}

export interface WeekResult {
  player: PlayerState;
  title: string;
  text: string;
  tone: 'win' | 'draw' | 'loss' | 'neutral';
}

/**
 * Plays the non-key matchdays of the week automatically. Each matchday you
 * appear with probability = playtimeShare; if you play, the normal match sim
 * runs with small form/trust effects.
 */
export function simulateAutoWeek(
  p: PlayerState,
  keyMatch: boolean,
  pickOpponent: (p: PlayerState) => Club,
): WeekResult | null {
  const total = matchdaysInWeek(p.week);
  const first = Math.floor((MATCHDAYS * (p.week - 1)) / WEEKS) + 1;
  const count = total - (keyMatch ? 1 : 0);
  if (count <= 0) return null;

  const share = playtimeShare(p);
  let cur = p;
  let w = 0;
  let d = 0;
  let l = 0;
  let ratings = 0;
  let goals = 0;
  let assists = 0;
  for (let i = 0; i < count; i++) {
    if (Math.random() >= share) continue;
    const r = simulateMatch(cur, pickOpponent(cur));
    if (r.outcome === 'win') w++;
    else if (r.outcome === 'draw') d++;
    else l++;
    ratings += r.rating;
    goals += r.playerGoals;
    assists += r.playerAssists;
    cur = {
      ...cur,
      seasonGames: cur.seasonGames + 1,
      seasonGoals: cur.seasonGoals + r.playerGoals,
      seasonAssists: cur.seasonAssists + r.playerAssists,
      seasonRatingSum: cur.seasonRatingSum + r.rating,
      form: clamp(cur.form + (r.outcome === 'win' ? 1 : r.outcome === 'loss' ? -1 : 0), 0, 100),
      trust: clamp(cur.trust + (r.rating >= 7 ? 1 : r.rating < 5 ? -1 : 0), 0, 100),
    };
  }
  const apps = w + d + l;
  const range = count > 1 ? `${first}–${first + count - 1}` : `${first}`;
  const title = `Spieltag ${range}`;
  if (apps === 0) {
    return {
      player: cur,
      title,
      text: `Nicht eingesetzt · ${roleLabel(share)}`,
      tone: 'neutral',
    };
  }
  return {
    player: cur,
    title,
    text: `${apps} ${apps === 1 ? 'Einsatz' : 'Einsätze'}: ${w} S · ${d} U · ${l} N · Note ${(ratings / apps).toFixed(1)}${goals || assists ? ` · ${goals} Tore, ${assists} Assists` : ''}`,
    tone: w > l ? 'win' : l > w ? 'loss' : 'draw',
  };
}

/** Season-end growth, scaled by playtime and talent. */
export function seasonGrowth(p: PlayerState): Partial<PlayerStats> {
  const base =
    p.age <= 18 ? 3 : p.age <= 21 ? 2.2 : p.age <= 25 ? 1 : p.age <= 29 ? 0 : p.age <= 32 ? -1 : -2;
  const factor = 0.5 + Math.min(1, p.seasonGames / MATCHDAYS);
  const grow = base > 0 ? factor * (p.talent?.growth ?? 1) : 1;
  const roll = () => Math.round(base * grow + (Math.random() - 0.5) * 1.4);
  return { tech: roll(), phys: roll(), mental: roll() };
}

/** Reserve player moves up when good enough (or too old for the reserves). */
export function shouldPromote(p: PlayerState): boolean {
  if (p.squad !== 'reserve' || !p.club) return false;
  return ovrOf(p) >= squadLevel(p.club, false) - 8 || p.age >= 19;
}

export const TALENTS: Talent[] = [
  { id: 'wunderkind', label: 'Wunderkind', desc: 'Scouts reden schon über dich.', boost: 7, growth: 1.25 },
  { id: 'top', label: 'Top-Talent', desc: 'Klar über dem Schnitt deines Jahrgangs.', boost: 4, growth: 1.15 },
  { id: 'solid', label: 'Solide Anlagen', desc: 'Ordentliche Basis, Rest ist Arbeit.', boost: 2, growth: 1 },
  { id: 'late', label: 'Spätzünder', desc: 'Start holprig, aber du wächst schneller.', boost: 0, growth: 1.3 },
];

/** 5 % Wunderkind, 20 % Top-Talent, 50 % Solide, 25 % Spätzünder. */
export function rollTalent(r: number = Math.random()): Talent {
  if (r < 0.05) return TALENTS[0];
  if (r < 0.25) return TALENTS[1];
  if (r < 0.75) return TALENTS[2];
  return TALENTS[3];
}
