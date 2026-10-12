import type { Club } from '../types/club';
import type { NodeType } from '../types/node';
import type { PlayerState } from '../types/player';
import { generateOffer, randomOpponent, type TransferOffer } from './eventEngine';

/** Weeks (1-12) that end with a key match you play yourself: 5 per season. */
export const KEY_WEEKS = [2, 4, 6, 9, 12];

export interface ActivityOption {
  id: string;
  type: NodeType;
  /** Concrete transfer offer, only for TRANSFER_OFFER. */
  offer?: TransferOffer;
}

export interface WeekPlan {
  season: number;
  week: number;
  /** 3 different things to do this week. */
  options: ActivityOption[];
  /** Key match after the chosen activity. */
  keyMatch: boolean;
  opponent: Club | null;
}

interface Slot {
  type: NodeType;
  weight: (p: PlayerState) => number;
}

const POOL: Slot[] = [
  { type: 'TRAINING_CAMP', weight: () => 10 },
  { type: 'REST', weight: (p) => (p.form < 50 ? 10 : 6) },
  { type: 'MEDIA_EVENT', weight: () => 6 },
  { type: 'SPONSOR', weight: (p) => (p.reputation >= 15 ? 6 : 2) },
  { type: 'AGENT_MEETING', weight: () => 5 },
  { type: 'RIVAL_CHALLENGE', weight: () => 5 },
  {
    type: 'TRANSFER_OFFER',
    weight: (p) => (p.flags.includes('transfer_rumor') ? 12 : p.reputation >= 25 ? 3 : 0),
  },
];

function pickDistinct(p: PlayerState, n: number): NodeType[] {
  const left = POOL.filter((s) => s.weight(p) > 0);
  const out: NodeType[] = [];
  while (out.length < n && left.length) {
    const total = left.reduce((a, s) => a + s.weight(p), 0);
    let r = Math.random() * total;
    let i = 0;
    for (; i < left.length - 1; i++) {
      r -= left[i].weight(p);
      if (r <= 0) break;
    }
    out.push(left[i].type);
    left.splice(i, 1);
  }
  // Always something useful for the player's form/stats.
  if (!out.includes('TRAINING_CAMP') && !out.includes('REST')) {
    out[out.length - 1] = 'TRAINING_CAMP';
  }
  return out;
}

export function generateWeekPlan(p: PlayerState): WeekPlan {
  const types = pickDistinct(p, 3);
  const options: ActivityOption[] = types.map((type, i) => ({
    id: `s${p.season}-w${p.week}-${i}`,
    type,
    offer: type === 'TRANSFER_OFFER' ? generateOffer(p) : undefined,
  }));
  const keyMatch = KEY_WEEKS.includes(p.week) && !!p.club;
  return {
    season: p.season,
    week: p.week,
    options,
    keyMatch,
    opponent: keyMatch ? randomOpponent(p) : null,
  };
}
