import clubsData from '../data/clubs.json';
import type { NationId } from '../data/nations';
import type { Club } from '../types/club';
import type { PlayerState } from '../types/player';
import { ovrOf } from './marketValue';
import { seasonMatchdays, squadLevel } from './squad';
import { clamp } from './util';

const clubs = clubsData as Club[];

export type TitleId = 'league' | 'cup' | 'europe' | 'scorer' | 'player' | 'world' | 'euro';

export const TITLE_LABEL: Record<TitleId, string> = {
  league: 'Meisterschaft',
  cup: 'Pokalsieg',
  europe: 'Europapokal',
  scorer: 'Torjägerkanone',
  player: 'Spieler des Jahres',
  world: 'Weltmeister',
  euro: 'Europameister',
};

/** Order in the trophy cabinet, biggest first. */
export const TITLE_ORDER: TitleId[] = ['world', 'euro', 'player', 'europe', 'league', 'cup', 'scorer'];

/** Rank of a club in its league by strength: 1 = strongest. */
const RANK = new Map<string, number>();
for (const league of new Set(clubs.map((c) => c.league))) {
  clubs
    .filter((c) => c.league === league)
    .sort((a, b) => b.rating - a.rating)
    .forEach((c, i) => RANK.set(c.id, i + 1));
}
export function leagueRank(club: Club): number {
  return RANK.get(club.id) ?? 10;
}

// Base chance per season by league rank (index 0 = rank 1).
const P_LEAGUE = [0.42, 0.22, 0.12, 0.07, 0.04, 0.03];
const P_CUP = [0.2, 0.14, 0.1, 0.07, 0.05];
const P_EUROPE = [0.14, 0.07, 0.04, 0.03];
/** Chance to win a tournament once called up. */
const P_NATION: Record<NationId, number> = { FR: 0.11, ES: 0.1, DE: 0.09, EN: 0.08, IT: 0.06, TR: 0.02 };
/** The second division takes part in no European cup. */
const EUROPE_TIER_MAX = 6;

/**
 * Titles of the season that just ended.
 *   impact = playtime x (OVR - squad level) / 10, in [-0.5, 1]   (a key player lifts his club)
 *   p(team title) = base(rank) x (1 + impact)
 * Tournaments: even seasons, World Cup every 4th, Euro in between; only when called up
 * (OVR >= 75 or the national-team event went well).
 */
export function seasonTitles(p: PlayerState): TitleId[] {
  const club = p.club;
  if (!club || p.squad === 'reserve') return [];
  const out: TitleId[] = [];
  const share = Math.min(1, p.seasonGames / seasonMatchdays(club));
  const impact = clamp((share * (ovrOf(p) - squadLevel(club, false))) / 10, -0.5, 1);
  const rank = leagueRank(club);
  const roll = (base: number) => Math.random() < base * (1 + impact);

  if (roll(P_LEAGUE[rank - 1] ?? 0.01)) out.push('league');
  if (roll(P_CUP[rank - 1] ?? 0.025)) out.push('cup');
  if (club.tier <= EUROPE_TIER_MAX && roll(P_EUROPE[rank - 1] ?? 0)) out.push('europe');

  const goals = p.seasonGoals;
  if (goals >= 22 && Math.random() < clamp((goals - 18) / 16, 0, 0.9)) out.push('scorer');

  const ovr = ovrOf(p);
  if (ovr >= 84 && share >= 0.6) {
    const big = (out.includes('europe') ? 0.25 : 0) + (out.includes('league') ? 0.1 : 0);
    if (Math.random() < clamp((ovr - 83) * 0.07 + big, 0, 0.75)) out.push('player');
  }

  const called = ovr >= 75 || p.flags.includes('national_team');
  if (called && p.nationality && p.season % 2 === 0) {
    const pNation = P_NATION[p.nationality] * (1 + clamp(impact, 0, 1));
    if (Math.random() < pNation) out.push(p.season % 4 === 0 ? 'world' : 'euro');
  }
  return out;
}
