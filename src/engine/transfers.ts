import clubsData from '../data/clubs.json';
import type { Club } from '../types/club';
import type { PlayerState } from '../types/player';
import { ovrOf } from './marketValue';
import { playtimeShare, roleLabel, squadLevel } from './squad';

const clubs = clubsData as Club[];

/** One card in the season-end transfer window. */
export interface WindowOption {
  kind: 'move' | 'stay' | 'extend';
  club: Club;
  years: number;
  wage: number;
  squad: 'first' | 'reserve';
  /** Expected role at that club ("Stammspieler", "Rotation", …). */
  role: string;
}

export interface TransferWindow {
  season: number;
  /** Contract ran out: no plain "stay", only an extension if the club still wants you. */
  expired: boolean;
  options: WindowOption[];
}

function wageFor(club: Club, rep: number): number {
  return Math.round((4000 + (8 - club.tier) * 2500 + rep * 80) / 100) * 100;
}

/** Where the player would land at a club: first team if close enough to the squad level. */
function fitAt(p: PlayerState, club: Club, keepSquad = false): { squad: 'first' | 'reserve'; role: string } {
  const squad: 'first' | 'reserve' = keepSquad
    ? p.squad
    : ovrOf(p) >= squadLevel(club, false) - 3
      ? 'first'
      : 'reserve';
  const share = playtimeShare({ ...p, club, squad, trust: keepSquad ? p.trust : 50 });
  return { squad, role: roleLabel(share) };
}

function weightedPick<T>(items: T[], weight: (t: T) => number): T | null {
  const total = items.reduce((a, t) => a + weight(t), 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const t of items) {
    r -= weight(t);
    if (r <= 0) return t;
  }
  return items[items.length - 1];
}

/**
 * Offers fit your level: clubs whose first team sits around your OVR
 * (target = OVR - 2, + reputation and rumours), so you climb step by step.
 * Two offers (one with low reputation, three when the contract ran out),
 * preferably from different leagues.
 */
export function openWindow(p: PlayerState): TransferWindow {
  const expired = !p.contract || p.contract.yearsLeft <= 0;
  const ovr = ovrOf(p);
  const rumor = p.flags.includes('transfer_rumor') ? 3 : 0;
  const top = p.talent?.id === 'top' ? 2 : 0;
  const target = ovr - 2 + rumor + top + (p.reputation - 30) / 15;
  const count = expired ? (p.reputation >= 20 ? 3 : 2) : p.reputation >= 15 ? 2 : 1;

  // Only clubs whose first team you would join (a move into someone's reserves makes no sense).
  const fits = clubs.filter((c) => c.id !== p.club?.id && squadLevel(c, false) <= ovr + 3);
  let pool = fits.length >= count ? fits : clubs.filter((c) => c.id !== p.club?.id);
  const picks: Club[] = [];
  for (let i = 0; i < count; i++) {
    const usedLeagues = new Set(picks.map((c) => c.league));
    const w = (c: Club) => {
      const d = squadLevel(c, false) - target;
      return Math.exp(-(d * d) / (2 * 6 * 6)) * (usedLeagues.has(c.league) ? 0.35 : 1);
    };
    const c = weightedPick(pool, w);
    if (!c) break;
    picks.push(c);
    pool = pool.filter((x) => x.id !== c.id);
  }

  const options: WindowOption[] = picks.map((club) => ({
    kind: 'move',
    club,
    years: 2 + Math.floor(Math.random() * 3),
    wage: wageFor(club, p.reputation),
    ...fitAt(p, club),
  }));

  if (p.club) {
    if (!expired && p.contract) {
      options.push({
        kind: 'stay',
        club: p.club,
        years: p.contract.yearsLeft,
        wage: p.contract.wage,
        ...fitAt(p, p.club, true),
      });
    } else if (ovr >= squadLevel(p.club, p.squad === 'reserve') - 8) {
      // The own club still wants you: extension at a better wage.
      const raise = p.talent?.id === 'solid' ? 1.2 : 1.1;
      const base = p.contract?.wage ?? 2500;
      options.push({
        kind: 'extend',
        club: p.club,
        years: 2,
        wage: Math.round((base * raise) / 100) * 100,
        ...fitAt(p, p.club, true),
      });
    }
  }
  return { season: p.season, expired, options };
}
