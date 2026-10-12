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

export interface SeasonRecord {
  age: number;
  clubName: string;
  ovr: number;
  games: number;
  value: number;
}

export interface PlayerState {
  name: string;
  position: Position;
  /** Matches played in the running season. */
  seasonGames: number;
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
