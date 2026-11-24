import type { PartialPlayerUpdate, PlayerState } from './player';

export interface EventChoice {
  label: string;
  effects: (state: PlayerState) => PartialPlayerUpdate;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  nodeTypes?: string[];
  conditions: (state: PlayerState) => boolean;
  weight: number;
  choices: EventChoice[];
}

export interface ActiveEvent {
  event: GameEvent;
  /** Extra context shown in the modal (e.g. match result text). */
  context?: string;
  /** MATCH node: opponent is known, the match is played after the choice. */
  matchOpponentId?: string;
}

export type LogTone = 'win' | 'draw' | 'loss' | 'neutral';

export interface LogEntry {
  id: number;
  season: number;
  week: number;
  /** Matchday span of that week, e.g. "4–6" (missing in old saves). */
  md?: string;
  /** Short heading, e.g. "Match" or "Event". */
  tag: string;
  title: string;
  text?: string;
  tone: LogTone;
}
