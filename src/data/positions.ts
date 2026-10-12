import type { Position, PlayerStats } from '../types/player';

export interface PositionMeta {
  id: Position;
  label: string;
  name: string;
  desc: string;
  /** Added to the base stats at career start (each position nets +3). */
  bias: Partial<PlayerStats>;
}

export const POSITION_LIST: PositionMeta[] = [
  { id: 'ST', label: 'ST', name: 'Stürmer', desc: 'Tore sind dein Geschäft.', bias: { tech: 2, phys: 1 } },
  { id: 'OM', label: 'OM', name: 'Offensives Mittelfeld', desc: 'Spielmacher mit Auge für den Pass.', bias: { tech: 2, mental: 1 } },
  { id: 'FL', label: 'FL', name: 'Flügelspieler', desc: 'Tempo und Dribbling auf außen.', bias: { tech: 1, phys: 2 } },
  { id: 'ZM', label: 'ZM', name: 'Zentrales Mittelfeld', desc: 'Motor und Ordnung im Zentrum.', bias: { mental: 2, tech: 1 } },
  { id: 'AV', label: 'AV', name: 'Außenverteidiger', desc: 'Läufer, der hinten und vorne hilft.', bias: { phys: 2, tech: 1 } },
  { id: 'IV', label: 'IV', name: 'Innenverteidiger', desc: 'Zweikampf, Kopfball, Übersicht.', bias: { phys: 2, mental: 1 } },
  { id: 'TW', label: 'TW', name: 'Torwart', desc: 'Der letzte Mann, starke Nerven.', bias: { mental: 2, phys: 1 } },
];

export function positionMeta(id: string): PositionMeta | undefined {
  return POSITION_LIST.find((p) => p.id === id);
}

/** Label for display; old saves may still hold removed codes (e.g. "LV"). */
export function positionLabel(id: string): string {
  return positionMeta(id)?.label ?? id;
}

export const RANDOM_NAMES = [
  'Emre', 'Luca', 'Nico', 'Mehmet', 'Jonas', 'Tim', 'Arda', 'Leon', 'Marco', 'Yusuf',
  'Felix', 'Lukas', 'Can', 'Noah', 'David', 'Kerem', 'Elias', 'Max', 'Deniz', 'Luis',
];
