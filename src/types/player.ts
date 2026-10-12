import type { Club } from './club';

export interface Trait {
  id: string;
  name: string;
  description: string;
}

export interface Contract {
  yearsLeft: number;
  wage: number;
}

export interface PlayerStats {
  tech: number;
  phys: number;
  mental: number;
}

export type Position = 'TW' | 'IV' | 'AV' | 'ZM' | 'OM' | 'FL' | 'ST';

export interface Talent {
  id: string;
  label: string;
  desc: string;
  /** Flat bonus on every stat at career start. */
  boost: number;
  /** Multiplier on yearly growth while young. */
  growth: number;
}

export interface SeasonRecord {
  age: number;
  clubName: string;
  ovr: number;
  games: number;
  goals?: number;
  assists?: number;
  /** Average match rating of the season, 0 if no games. */
  avgRating?: number;
  value: number;
}

export interface PlayerState {
  name: string;
  position: Position;
  /** Start in the second team; promoted to the first team later. */
  squad: 'reserve' | 'first';
  /** Coach trust 0-100 (key matches move it); feeds playtime. */
  trust: number;
  talent: Talent | null;
  /** Matches played in the running season. */
  seasonGames: number;
  seasonGoals: number;
  seasonAssists: number;
  /** Sum of match ratings (avg = sum / seasonGames). */
  seasonRatingSum: number;
  /** One entry per finished season (oldest first). */
  history: SeasonRecord[];
  age: number;
  week: number;
  season: number;
  stats: PlayerStats;
  form: number;
  reputation: number;
  finances: number;
  club: Club | null;
  contract: Contract | null;
  traits: Trait[];
  /** Serialized as string[] for localStorage; treat as Set semantically. */
  flags: string[];
  careerEnded: boolean;
  endReason: string | null;
}

export type PartialPlayerUpdate = Partial<
  Omit<PlayerState, 'stats' | 'contract'>
> & {
  stats?: Partial<PlayerStats>;
  contract?: Contract | null;
};
