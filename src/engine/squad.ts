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
  for (let i = 0; i < count; i++) {
    if (Math.random() >= share) continue;
    const r = simulateMatch(cur, pickOpponent(cur));
    if (r.outcome === 'win') w++;
    else if (r.outcome === 'draw') d++;
    else l++;
    cur = {
      ...cur,
      seasonGames: cur.seasonGames + 1,
      seasonWins: cur.seasonWins + (r.outcome === 'win' ? 1 : 0),
      seasonDraws: cur.seasonDraws + (r.outcome === 'draw' ? 1 : 0),
      seasonLosses: cur.seasonLosses + (r.outcome === 'loss' ? 1 : 0),
      seasonGoals: cur.seasonGoals + r.playerGoals,
      seasonAssists: cur.seasonAssists + r.playerAssists,
      seasonRatingSum: cur.seasonRatingSum + r.rating,
      form: clamp(cur.form + (r.outcome === 'win' ? 1 : r.outcome === 'loss' ? -1 : 0), 0, 100),
      trust: clamp(cur.trust + (r.rating >= 7 ? 1 : r.rating < 5 ? (p.talent?.id === 'top' ? -3 : -1) : 0), 0, 100),
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
    text: `${apps} ${apps === 1 ? 'Einsatz' : 'Einsätze'} · ${roleLabel(share)}`,
    tone: w > l ? 'win' : l > w ? 'loss' : 'draw',
  };
}

/** Career ceiling: rolled potential, or the middle of the talent range for old saves. */
export function potentialOf(p: PlayerState): number {
  if (p.potential) return p.potential;
  const [lo, hi] = TALENTS.find((t) => t.id === p.talent?.id)?.potential ?? [75, 82];
  return Math.round((lo + hi) / 2);
}

export function rollPotential(t: Talent | null): number {
  const [lo, hi] = t?.potential ?? [75, 82];
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/**
 * Season-end growth per stat:
 *   young:  delta = k(age) x (potential - stat) x playtime x talent
 *   old:    flat decline (physis drops first)
 * k = 0.22 (<=18), 0.20 (<=21), 0.16 (<=24), 0.10 (<=28), 0 (29-30).
 * Example (potential 85, start 47, regular games): 55 at 17, 67 at 19, 76 at 22, 80 at 25.
 */
export function seasonGrowth(p: PlayerState): Partial<PlayerStats> {
  // The late bloomer's curve runs 3 years behind.
  const age = p.talent?.id === 'late' ? p.age - 3 : p.age;
  const pot = potentialOf(p);
  const k = age < 16 ? 0.08 : age <= 18 ? 0.12 : age <= 21 ? 0.14 : age <= 24 ? 0.12 : age <= 28 ? 0.08 : 0;
  const play = 0.6 + 0.7 * Math.min(1, p.seasonGames / MATCHDAYS);
  const talent = 1 + ((p.talent?.growth ?? 1) - 1) * 0.5;
  const decline = age >= 33 ? 2 : age >= 31 ? 1 : 0;
  const one = (k_: 'tech' | 'phys' | 'mental') => {
    const cur = p.stats[k_];
    const up = k * Math.max(0, pot - cur) * play * talent;
    const down = decline * (k_ === 'phys' ? 1.5 : k_ === 'tech' ? 0.8 : 0.5);
    return Math.round(up - down + (Math.random() - 0.5) * 1.2);
  };
  return { tech: one('tech'), phys: one('phys'), mental: one('mental') };
}

/** Share of an event's stat bonus that sticks: shrinks towards the potential (0 at the ceiling). */
export const EVENT_GAIN = 0.15;
export function eventGain(p: PlayerState, stat: number, delta: number): number {
  if (delta <= 0) return delta;
  const headroom = Math.max(0, Math.min(1, (potentialOf(p) - stat) / 25));
  const raw = delta * EVENT_GAIN * headroom;
  const whole = Math.floor(raw);
  return whole + (Math.random() < raw - whole ? 1 : 0);
}

/** Reserve player moves up when good enough (or too old for the reserves). */
export function shouldPromote(p: PlayerState): boolean {
  if (p.squad !== 'reserve' || !p.club) return false;
  return ovrOf(p) >= squadLevel(p.club, false) - 3 || p.age >= 19;
}

export const TALENTS: Talent[] = [
  {
    id: 'wunderkind', label: 'Wunderkind', desc: 'Scouts reden schon über dich.', boost: 7, growth: 1.25, potential: [88, 94],
    pro: 'Starke Werte, schnellstes Wachstum, Potenzial bis 94.',
    con: 'Hohe Erwartungen: mehr Medien-Druck und mehr Verletzungs-Events.',
  },
  {
    id: 'top', label: 'Top-Talent', desc: 'Klar über dem Schnitt deines Jahrgangs.', boost: 4, growth: 1.15, potential: [82, 88],
    pro: 'Gute Werte, bessere Transferangebote, Potenzial bis 88.',
    con: 'Trainer verliert bei schwachen Spielen schneller die Geduld.',
  },
  {
    id: 'solid', label: 'Solide Anlagen', desc: 'Ordentliche Basis, Rest ist Arbeit.', boost: 2, growth: 1, potential: [75, 82],
    pro: 'Mehr Trainings-Events, 20 % mehr Gehalt bei Verlängerungen.',
    con: 'Kein Ausreißer nach oben.',
  },
  {
    id: 'late', label: 'Spätzünder', desc: 'Start holprig, aber du wächst länger.', boost: 0, growth: 1.3, potential: [80, 90],
    pro: 'Wächst drei Jahre länger, Potenzial bis 90.',
    con: 'Schwacher Start, anfangs oft auf der Bank.',
  },
];

/** 5 % Wunderkind, 20 % Top-Talent, 50 % Solide, 25 % Spätzünder. */
export function rollTalent(r: number = Math.random()): Talent {
  if (r < 0.05) return TALENTS[0];
  if (r < 0.25) return TALENTS[1];
  if (r < 0.75) return TALENTS[2];
  return TALENTS[3];
}
