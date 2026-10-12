import type { PartialPlayerUpdate, PlayerState } from './player';

export interface EventChoice {
  label: string;
  effects: (state: PlayerState) => PartialPlayerUpdate;
  followUps?: { eventId: string; delayWeeks: number }[];
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

export interface PendingFollowUp {
  eventId: string;
  triggerWeek: number;
}

export interface ActiveEvent {
  event: GameEvent;
  /** Extra context shown in the modal (e.g. match result text). */
  context?: string;
}

export type LogTone = 'win' | 'draw' | 'loss' | 'neutral';

export interface LogEntry {
  id: number;
  season: number;
  week: number;
  /** Short heading, e.g. "Match" or "Event". */
  tag: string;
  title: string;
  text?: string;
  tone: LogTone;
}
