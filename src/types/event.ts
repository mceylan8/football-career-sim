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
