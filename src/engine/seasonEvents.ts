import type { PlayerState } from '../types/player';
import { ovrOf } from './marketValue';
import { playtimeShare, potentialOf } from './squad';
import { clamp } from './util';

/**
 * Fast mode ("Schnellkarriere"): one big decision per season, then the whole
 * season is simulated. Every choice shows its possible outcomes as chips
 * ("50 % Stammplatz / 50 % Bank"); one of them is rolled.
 *
 * The levers are the ones that really drive growth:
 *   seasonBoost -> playtime this season (OVR points of edge, see playtimeShare)
 *   trust       -> playtime, also next season (halves back towards 50)
 *   potential   -> career ceiling
 *   stats       -> applied in full (no 15 % damping like in the weekly mode)
 */

export type ChipTone = 'up' | 'down' | 'neutral';

export interface SeasonOutcome {
  /** Probability in percent; outcomes of one choice add up to 100. */
  chance: number;
  /** Short chip text, e.g. "Stammplatz". */
  chip: string;
  tone: ChipTone;
  /** Log text when this outcome happens. */
  text: string;
  apply: (p: PlayerState) => PlayerState;
}

export interface SeasonChoice {
  label: string;
  outcomes: SeasonOutcome[];
}

export interface SeasonEvent {
  id: string;
  title: string;
  text: (p: PlayerState) => string;
  when: (p: PlayerState) => boolean;
  weight: (p: PlayerState) => number;
  choices: SeasonChoice[];
}

interface Bump {
  boost?: number;
  trust?: number;
  rep?: number;
  money?: number;
  tech?: number;
  phys?: number;
  mental?: number;
  potential?: number;
  flag?: string;
  injured?: boolean;
}

/** All changes of one outcome in one place. */
function bump(p: PlayerState, b: Bump): PlayerState {
  const stat = (v: number, d = 0) => clamp(v + d, 1, 99);
  let flags = p.flags;
  if (b.flag && !flags.includes(b.flag)) flags = [...flags, b.flag];
  if (b.injured && !flags.includes('injured')) flags = [...flags, 'injured'];
  return {
    ...p,
    seasonBoost: (p.seasonBoost ?? 0) + (b.boost ?? 0),
    trust: clamp(p.trust + (b.trust ?? 0), 0, 100),
    reputation: clamp(p.reputation + (b.rep ?? 0), 0, 100),
    finances: p.finances + (b.money ?? 0),
    stats: {
      tech: stat(p.stats.tech, b.tech),
      phys: stat(p.stats.phys, b.phys),
      mental: stat(p.stats.mental, b.mental),
    },
    potential: b.potential ? clamp(potentialOf(p) + b.potential, 60, 96) : p.potential,
    flags,
  };
}

const sure = (chip: string, tone: ChipTone, text: string, b: Bump): SeasonOutcome => ({
  chance: 100,
  chip,
  tone,
  text,
  apply: (p) => bump(p, b),
});

const odds = (chance: number, chip: string, tone: ChipTone, text: string, b: Bump): SeasonOutcome => ({
  chance,
  chip,
  tone,
  text,
  apply: (p) => bump(p, b),
});

const role = (p: PlayerState) => playtimeShare(p);

export const SEASON_EVENTS: SeasonEvent[] = [
  {
    id: 'fight_for_place',
    title: 'Kampf um den Stammplatz',
    text: () => 'Der Trainer sieht dich im Moment hinten an. Wie reagierst du?',
    when: (p) => role(p) < 0.5,
    weight: () => 12,
    choices: [
      {
        label: 'Kämpfen',
        outcomes: [
          odds(50, 'Stammplatz', 'up', 'Du hast dich durchgebissen.', { boost: 10, trust: 10 }),
          odds(50, 'Wenig Einsätze', 'down', 'Es hat nicht gereicht.', { boost: -2, trust: -5 }),
        ],
      },
      {
        label: 'Positionswechsel',
        outcomes: [
          sure('Stammplatz, −2 TEC', 'neutral', 'Neue Position, dafür spielst du.', { boost: 9, tech: -2 }),
        ],
      },
      {
        label: 'Geduldig bleiben',
        outcomes: [sure('Vertrauen +', 'neutral', 'Der Trainer schätzt deine Geduld.', { trust: 8 })],
      },
    ],
  },
  {
    id: 'injury',
    title: 'Verletzung in der Vorbereitung',
    text: (p) =>
      p.age >= 32 ? 'Muskelfaserriss. In deinem Alter heilt das langsamer.' : 'Muskelfaserriss im Training.',
    when: () => true,
    weight: (p) => (p.age >= 30 ? 7 : 3),
    choices: [
      {
        label: 'Schnell zurückkommen',
        outcomes: [
          odds(60, 'Kurze Pause', 'up', 'Nach drei Wochen wieder fit.', { boost: -3 }),
          odds(40, 'Rückfall', 'down', 'Rückfall, halbe Saison weg.', { boost: -18, phys: -2, injured: true }),
        ],
      },
      {
        label: 'Komplett auskurieren',
        outcomes: [sure('Halbe Saison weg', 'down', 'Lange Reha, aber sauber verheilt.', { boost: -10, mental: 1 })],
      },
    ],
  },
  {
    id: 'new_coach',
    title: 'Neuer Trainer',
    text: () => 'Der Klub hat den Trainer gewechselt. Alle fangen bei null an.',
    when: (p) => p.squad === 'first',
    weight: () => 6,
    choices: [
      {
        label: 'Sofort beeindrucken',
        outcomes: [
          odds(60, 'Liebling', 'up', 'Der Neue setzt voll auf dich.', { trust: 20 }),
          odds(40, 'Abgestempelt', 'down', 'Zu viel gewollt, er stellt dich hinten an.', { trust: -12 }),
        ],
      },
      {
        label: 'Abwarten',
        outcomes: [sure('Neutral', 'neutral', 'Du bleibst unauffällig.', { trust: 0 })],
      },
    ],
  },
  {
    id: 'big_interview',
    title: 'Großes Interview',
    text: () => 'Eine große Zeitung will ein Porträt über dich.',
    when: (p) => p.reputation >= 25,
    weight: () => 5,
    choices: [
      {
        label: 'Ambitionen zeigen',
        outcomes: [
          sure('Ruf +, Gerüchte', 'up', 'Plötzlich fragen große Klubs nach dir.', { rep: 8, trust: -5, flag: 'transfer_rumor' }),
        ],
      },
      {
        label: 'Loyal bleiben',
        outcomes: [sure('Vertrauen +', 'up', 'Fans und Trainer mögen das.', { rep: 3, trust: 8 })],
      },
    ],
  },
  {
    id: 'sponsor',
    title: 'Sponsorenangebot',
    text: () => 'Eine Marke will dich für eine große Kampagne.',
    when: (p) => p.reputation >= 20,
    weight: () => 5,
    choices: [
      {
        label: 'Großer Deal',
        outcomes: [
          odds(70, '+40.000 €', 'up', 'Kasse voll, Fokus bleibt.', { money: 40000, rep: 4 }),
          odds(30, 'Abgelenkt', 'down', 'Viele Termine, die Leistung leidet.', { money: 40000, boost: -4 }),
        ],
      },
      {
        label: 'Ablehnen',
        outcomes: [sure('Fokus', 'neutral', 'Du konzentrierst dich auf Fußball.', { trust: 4 })],
      },
    ],
  },
  {
    id: 'squad_rival',
    title: 'Rivale im Kader',
    text: () => 'Der Klub hat einen Konkurrenz-Spieler für deine Position geholt.',
    when: (p) => p.squad === 'first' && role(p) >= 0.4,
    weight: () => 7,
    choices: [
      {
        label: 'Duell annehmen',
        outcomes: [
          odds(50, 'Du gewinnst', 'up', 'Du hast ihn auf die Bank verdrängt.', { boost: 6, mental: 2 }),
          odds(50, 'Er gewinnt', 'down', 'Er spielt, du schaust zu.', { boost: -10 }),
        ],
      },
      {
        label: 'Wechsel forcieren',
        outcomes: [sure('Gerüchte, Vertrauen −', 'neutral', 'Dein Agent streut, dass du weg willst.', { trust: -15, flag: 'transfer_rumor' })],
      },
    ],
  },
  {
    id: 'mentor',
    title: 'Mentor für ein Talent',
    text: () => 'Ein 17-Jähriger aus der Jugend hängt an deinen Lippen.',
    when: (p) => p.age >= 29,
    weight: () => 6,
    choices: [
      {
        label: 'Mentor werden',
        outcomes: [sure('MEN +2, Ruf +', 'up', 'Die Kabine respektiert dich.', { mental: 2, rep: 4, trust: 5 })],
      },
      {
        label: 'Fokus auf dich',
        outcomes: [sure('Mehr Spielzeit', 'up', 'Du kämpfst um jede Minute.', { boost: 4 })],
      },
    ],
  },
  {
    id: 'personal_coach',
    title: 'Privattrainer',
    text: () => 'Ein Athletiktrainer bietet dir ein Sommerprogramm an. Kostet 30.000 €.',
    when: (p) => p.finances >= 30000,
    weight: () => 4,
    choices: [
      {
        label: 'Buchen (−30.000 €)',
        outcomes: [
          sure('Potenzial +2, PHY +2', 'up', 'Du kommst fitter denn je zurück.', { money: -30000, potential: 2, phys: 2 }),
        ],
      },
      {
        label: 'Sparen',
        outcomes: [sure('Nichts', 'neutral', 'Du machst Urlaub wie immer.', {})],
      },
    ],
  },
  {
    id: 'nightlife',
    title: 'Partyleben',
    text: () => 'Die Mannschaft zieht nach dem Saisonstart durch die Clubs.',
    when: (p) => p.age >= 18 && p.age <= 25,
    weight: () => 5,
    choices: [
      {
        label: 'Mitfeiern',
        outcomes: [
          odds(60, 'Teamgeist', 'up', 'Du gehörst jetzt richtig dazu.', { rep: 3, trust: 3 }),
          odds(40, 'Schlagzeile', 'down', 'Fotos in der Zeitung, Trainer sauer.', { rep: -4, trust: -15 }),
        ],
      },
      {
        label: 'Absagen',
        outcomes: [sure('Profi', 'neutral', 'Früh ins Bett.', { trust: 4 })],
      },
    ],
  },
  {
    id: 'captain',
    title: 'Kapitänsbinde',
    text: () => 'Der Trainer bietet dir die Kapitänsbinde an.',
    when: (p) => p.squad === 'first' && p.age >= 24 && p.trust >= 55,
    weight: () => 4,
    choices: [
      {
        label: 'Annehmen',
        outcomes: [
          odds(75, 'Leader', 'up', 'Du führst das Team aufs Feld.', { trust: 15, rep: 6, mental: 2 }),
          odds(25, 'Zu viel Druck', 'down', 'Die Binde lastet schwer.', { trust: 5, boost: -4 }),
        ],
      },
      {
        label: 'Ablehnen',
        outcomes: [sure('Nichts', 'neutral', 'Du willst dich aufs Spielen konzentrieren.', {})],
      },
    ],
  },
  {
    id: 'hype',
    title: 'Der Hype ist da',
    text: () => 'Alle reden über dich. Talentshows, Social Media, Werbung.',
    when: (p) => p.age <= 20 && ovrOf(p) >= 55,
    weight: (p) => (p.talent?.id === 'wunderkind' ? 10 : 4),
    choices: [
      {
        label: 'Genießen',
        outcomes: [
          odds(70, 'Ruf ++', 'up', 'Dein Name ist überall.', { rep: 10, money: 10000 }),
          odds(30, 'Kopf verloren', 'down', 'Du hebst ab. Potenzial −2.', { rep: 10, potential: -2 }),
        ],
      },
      {
        label: 'Bodenständig bleiben',
        outcomes: [sure('MEN +2', 'up', 'Du bleibst auf dem Boden.', { mental: 2, trust: 4 })],
      },
    ],
  },
  {
    id: 'training_focus',
    title: 'Sommervorbereitung',
    text: () => 'Worauf legst du in der Vorbereitung den Schwerpunkt?',
    when: () => true,
    weight: () => 4,
    choices: [
      {
        label: 'Technik',
        outcomes: [sure('TEC +2', 'up', 'Ballarbeit bis zum Umfallen.', { tech: 2 })],
      },
      {
        label: 'Athletik',
        outcomes: [
          odds(80, 'PHY +3', 'up', 'Du bist in Topform.', { phys: 3 }),
          odds(20, 'Überlastet', 'down', 'Zu viel. Leichte Zerrung.', { phys: 1, boost: -4 }),
        ],
      },
      {
        label: 'Kopf',
        outcomes: [sure('MEN +2', 'up', 'Videoanalyse und Mentaltraining.', { mental: 2 })],
      },
    ],
  },
];

export function seasonEventById(id: string): SeasonEvent | undefined {
  return SEASON_EVENTS.find((e) => e.id === id);
}

/** Picks the season's decision; avoids repeating last season's event. */
export function pickSeasonEvent(p: PlayerState, lastId?: string): SeasonEvent {
  const pool = SEASON_EVENTS.filter((e) => e.id !== lastId && e.when(p));
  const list = pool.length ? pool : SEASON_EVENTS.filter((e) => e.id === 'training_focus');
  const total = list.reduce((a, e) => a + e.weight(p), 0);
  let r = Math.random() * total;
  for (const e of list) {
    r -= e.weight(p);
    if (r <= 0) return e;
  }
  return list[list.length - 1];
}

/** Rolls one outcome of a choice by its chances. */
export function rollOutcome(choice: SeasonChoice, r: number = Math.random() * 100): SeasonOutcome {
  let acc = 0;
  for (const o of choice.outcomes) {
    acc += o.chance;
    if (r < acc) return o;
  }
  return choice.outcomes[choice.outcomes.length - 1];
}
