/** Nationality picked in the setup. It decides the league you start in. */
export type NationId = 'EN' | 'DE' | 'ES' | 'IT' | 'FR' | 'TR';

export interface Nation {
  id: NationId;
  /** German display name. */
  name: string;
  /** Three-letter code for compact labels. */
  code: string;
  /** Top league of the country (matches `league` in clubs.json). */
  league: string;
}

export const NATIONS: Nation[] = [
  { id: 'EN', name: 'England', code: 'ENG', league: 'Premier League' },
  { id: 'DE', name: 'Deutschland', code: 'GER', league: 'Bundesliga' },
  { id: 'ES', name: 'Spanien', code: 'ESP', league: 'La Liga' },
  { id: 'IT', name: 'Italien', code: 'ITA', league: 'Serie A' },
  { id: 'FR', name: 'Frankreich', code: 'FRA', league: 'Ligue 1' },
  { id: 'TR', name: 'Türkei', code: 'TUR', league: 'Süper Lig' },
];

export function nationById(id: string | undefined | null): Nation | undefined {
  return NATIONS.find((n) => n.id === id);
}
