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

export interface PlayerState {
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
