import { CREST_COLORS } from '../data/crestColors';
import type { Club } from '../types/club';

export function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** Real club colours if known, otherwise a stable colour pair from the id. */
export function colorsFor(club: Club): [string, string] {
  const known = CREST_COLORS[club.id];
  if (known) return known;
  const h = hash(club.id) % 360;
  return [`hsl(${h} 70% 45%)`, `hsl(${(h + 160) % 360} 85% 60%)`];
}
