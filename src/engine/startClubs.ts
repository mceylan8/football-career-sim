import type { Club } from '../types/club';
import { nationById, type NationId } from '../data/nations';

export type StartSize = 'small' | 'mid' | 'big';

export interface StartOffer {
  size: StartSize;
  club: Club;
}

export const START_SIZE_LABEL: Record<StartSize, string> = {
  small: 'Kleiner Klub',
  mid: 'Mittelklasse',
  big: 'Großklub',
};

export const START_SIZE_HINT: Record<StartSize, string> = {
  small: 'Viel Einsatzzeit, wenig Glanz.',
  mid: 'Ausgewogen: Chancen und Konkurrenz.',
  big: 'Großer Name, aber oft Bank.',
};

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Top-league clubs of a nation, strongest first. */
export function topLeagueClubs(clubs: Club[], nation: NationId): Club[] {
  const league = nationById(nation)?.league;
  return clubs.filter((c) => c.league === league).sort((a, b) => b.rating - a.rating);
}

/**
 * Three starting clubs from the nation's top league: one from the bottom third
 * (small), one from the middle third (mid) and one from the top third (big).
 */
export function startOffers(clubs: Club[], nation: NationId): StartOffer[] {
  const list = topLeagueClubs(clubs, nation);
  if (list.length < 3) return list.map((club) => ({ size: 'mid', club }));
  const third = Math.ceil(list.length / 3);
  const big = list.slice(0, third);
  const mid = list.slice(third, list.length - third);
  const small = list.slice(list.length - third);
  return [
    { size: 'small', club: pick(small) },
    { size: 'mid', club: pick(mid.length ? mid : list) },
    { size: 'big', club: pick(big) },
  ];
}
