import type { Club } from '../types/club';
import type { GameEvent } from '../types/event';
import type { PlayerState } from '../types/player';
import clubsData from '../data/clubs.json';

const clubs = clubsData as Club[];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function addFlag(flags: string[], flag: string): string[] {
  return flags.includes(flag) ? flags : [...flags, flag];
}

function removeFlag(flags: string[], flag: string): string[] {
  return flags.filter((f) => f !== flag);
}

function pickClub(predicate: (c: Club) => boolean): Club {
  const pool = clubs.filter(predicate);
  const list = pool.length ? pool : clubs;
  return list[Math.floor(Math.random() * list.length)];
}

export const GAME_EVENTS: GameEvent[] = [
  {
    id: 'sponsor_local',
    title: 'Lokaler Sponsor',
    description: 'Ein regionaler Ausrüster will dich als Gesicht der Kampagne.',
    nodeTypes: ['SPONSOR'],
    conditions: () => true,
    weight: 10,
    choices: [
      {
        label: 'Annehmen (+Finanzen, leichte Ablenkung)',
        effects: (s) => ({
          finances: s.finances + 8000,
          form: clamp(s.form - 2, 0, 100),
          reputation: clamp(s.reputation + 2, 0, 100),
        }),
      },
      {
        label: 'Ablehnen (Fokus behalten)',
        effects: (s) => ({ form: clamp(s.form + 2, 0, 100) }),
      },
    ],
  },
  {
    id: 'sponsor_big',
    title: 'Großes Markenangebot',
    description: 'Eine internationale Marke klopft an — Prestige und Druck.',
    nodeTypes: ['SPONSOR'],
    conditions: (s) => s.reputation >= 40,
    weight: 6,
    choices: [
      {
        label: 'Deal machen',
        effects: (s) => ({
          finances: s.finances + 25000,
          reputation: clamp(s.reputation + 8, 0, 100),
          flags: addFlag(s.flags, 'big_sponsor'),
        }),
      },
      {
        label: 'Zu viel Ablenkung — nein',
        effects: (s) => ({
          reputation: clamp(s.reputation - 3, 0, 100),
        }),
      },
    ],
  },
  {
    id: 'media_interview',
    title: 'Medien-Interview',
    description: 'Ein Journalist fragt nach deiner Zukunft und dem Trainer.',
    nodeTypes: ['MEDIA_EVENT'],
    conditions: () => true,
    weight: 10,
    choices: [
      {
        label: 'Loyal bleiben',
        effects: (s) => ({
          reputation: clamp(s.reputation + 4, 0, 100),
          form: clamp(s.form + 1, 0, 100),
        }),
      },
      {
        label: 'Ambitionen andeuten',
        effects: (s) => ({
          reputation: clamp(s.reputation + 6, 0, 100),
          flags: addFlag(s.flags, 'transfer_rumor'),
        }),
      },
      {
        label: 'Kontroverse Aussage',
        effects: (s) => ({
          reputation: clamp(s.reputation - 8, 0, 100),
          finances: s.finances + 3000,
          flags: addFlag(s.flags, 'media_scandal'),
        }),
      },
    ],
  },
  {
    id: 'media_scandal_fallout',
    title: 'Skandal-Nachspiel',
    description: 'Die Kontroverse von damals ist noch nicht tot.',
    nodeTypes: ['MEDIA_EVENT'],
    conditions: (s) => s.flags.includes('media_scandal'),
    weight: 8,
    choices: [
      {
        label: 'Öffentliche Entschuldigung',
        effects: (s) => ({
          reputation: clamp(s.reputation + 5, 0, 100),
          finances: s.finances - 2000,
          flags: removeFlag(s.flags, 'media_scandal'),
        }),
      },
      {
        label: 'Ignorieren',
        effects: (s) => ({
          reputation: clamp(s.reputation - 5, 0, 100),
          form: clamp(s.form - 3, 0, 100),
        }),
      },
    ],
  },
  {
    id: 'training_intensity',
    title: 'Trainingslager',
    description: 'Zwei Wochen Intensivarbeit — Risiko und Reward.',
    nodeTypes: ['TRAINING_CAMP'],
    conditions: () => true,
    weight: 10,
    choices: [
      {
        label: 'Vollgas',
        effects: (s) => ({
          stats: {
            tech: clamp(s.stats.tech + 2, 1, 99),
            phys: clamp(s.stats.phys + 3, 1, 99),
            mental: clamp(s.stats.mental + 1, 1, 99),
          },
          form: clamp(s.form + 5, 0, 100),
          flags: addFlag(s.flags, 'fatigue'),
        }),
      },
      {
        label: 'Moderate Belastung',
        effects: (s) => ({
          stats: {
            tech: clamp(s.stats.tech + 1, 1, 99),
            phys: clamp(s.stats.phys + 1, 1, 99),
            mental: s.stats.mental,
          },
          form: clamp(s.form + 2, 0, 100),
        }),
      },
      {
        label: 'Regeneration priorisieren',
        effects: (s) => ({
          form: clamp(s.form + 6, 0, 100),
          flags: removeFlag(s.flags, 'fatigue'),
        }),
      },
    ],
  },
  {
    id: 'injury_risk_tackle',
    title: 'Verletzungsrisiko',
    description: 'Du spürst einen stechenden Schmerz nach dem letzten Sprint.',
    nodeTypes: ['INJURY_RISK'],
    conditions: () => true,
    weight: 10,
    choices: [
      {
        label: 'Weiterspielen (Risiko)',
        effects: (s) => {
          const injured =
            Math.random() < (s.flags.includes('fatigue') ? 0.45 : 0.25);
          if (!injured) {
            return {
              reputation: clamp(s.reputation + 2, 0, 100),
              form: clamp(s.form - 3, 0, 100),
            };
          }
          const careerEnding = s.age >= 34 && Math.random() < 0.15;
          return {
            form: clamp(s.form - 20, 0, 100),
            stats: { ...s.stats, phys: clamp(s.stats.phys - 5, 1, 99) },
            flags: careerEnding
              ? addFlag(addFlag(s.flags, 'injured'), 'career_ending_injury')
              : addFlag(s.flags, 'injured'),
          };
        },
      },
      {
        label: 'Sofort behandeln lassen',
        effects: (s) => ({
          finances: s.finances - 1500,
          form: clamp(s.form + 3, 0, 100),
          flags: removeFlag(removeFlag(s.flags, 'injured'), 'fatigue'),
        }),
      },
    ],
  },
  {
    id: 'agent_meeting',
    title: 'Agenten-Meeting',
    description: 'Dein Agent legt Optionen auf den Tisch.',
    nodeTypes: ['AGENT_MEETING'],
    conditions: () => true,
    weight: 10,
    choices: [
      {
        label: 'Gehaltserhöhung fordern',
        effects: (s) => {
          if (!s.contract) {
            return { reputation: clamp(s.reputation - 2, 0, 100) };
          }
          const ok = s.reputation >= 35 || Math.random() < 0.4;
          return ok
            ? {
                contract: {
                  ...s.contract,
                  wage: Math.round(s.contract.wage * 1.15),
                },
                reputation: clamp(s.reputation + 2, 0, 100),
              }
            : {
                reputation: clamp(s.reputation - 3, 0, 100),
                form: clamp(s.form - 2, 0, 100),
              };
        },
      },
      {
        label: 'Ruhig bleiben, Fokus auf Leistung',
        effects: (s) => ({
          form: clamp(s.form + 3, 0, 100),
          stats: { ...s.stats, mental: clamp(s.stats.mental + 1, 1, 99) },
        }),
      },
    ],
  },
  {
    id: 'transfer_offer',
    title: 'Transferangebot',
    description: 'Ein Klub unterbreitet dir ein Angebot.',
    nodeTypes: ['TRANSFER_OFFER'],
    conditions: () => true,
    weight: 10,
    choices: [
      {
        label: 'Angebot prüfen & annehmen',
        effects: (s, ctx) => {
          const o = ctx?.offer ?? generateOffer(s);
          return {
            club: o.club,
            contract: { yearsLeft: o.years, wage: o.wage },
            reputation: clamp(s.reputation + 5, 0, 100),
            form: clamp(s.form - 4, 0, 100),
            flags: removeFlag(s.flags, 'transfer_rumor'),
          };
        },
      },
      {
                label: 'Ablehnen',
        effects: (s) => ({
          reputation: clamp(s.reputation + 1, 0, 100),
          form: clamp(s.form + 2, 0, 100),
        }),
      },
    ],
  },
  {
    id: 'rival_challenge',
    title: 'Rivalen-Challenge',
    description: 'Ein ehemaliger Mitspieler fordert dich öffentlich heraus.',
    nodeTypes: ['RIVAL_CHALLENGE'],
    conditions: () => true,
    weight: 8,
    choices: [
      {
        label: 'Annehmen — Extra-Training',
        effects: (s) => ({
          stats: {
            tech: clamp(s.stats.tech + 2, 1, 99),
            phys: clamp(s.stats.phys + 1, 1, 99),
            mental: clamp(s.stats.mental + 2, 1, 99),
          },
          form: clamp(s.form + 4, 0, 100),
          flags: addFlag(s.flags, 'rivalry'),
        }),
      },
      {
        label: 'Professionell abwinken',
        effects: (s) => ({
          reputation: clamp(s.reputation + 2, 0, 100),
          stats: { ...s.stats, mental: clamp(s.stats.mental + 1, 1, 99) },
        }),
      },
    ],
  },
  {
    id: 'rest_day',
    title: 'Ruhetag',
    description: 'Zeit zum Durchatmen — oder doch noch etwas Arbeit?',
    nodeTypes: ['REST'],
    conditions: () => true,
    weight: 10,
    choices: [
      {
        label: 'Komplett ausruhen',
        effects: (s) => ({
          form: clamp(s.form + 8, 0, 100),
          flags: removeFlag(s.flags, 'fatigue'),
        }),
      },
      {
        label: 'Leichtes Technik-Training',
        effects: (s) => ({
          stats: { ...s.stats, tech: clamp(s.stats.tech + 1, 1, 99) },
          form: clamp(s.form + 2, 0, 100),
        }),
      },
    ],
  },
  {
    id: 'contract_talk',
    title: 'Vertragsgespräch',
    description: 'Der Verein will die Zukunft klären.',
    nodeTypes: ['AGENT_MEETING', 'TRANSFER_OFFER'],
    conditions: (s) => !!s.contract && s.contract.yearsLeft <= 1,
    weight: 12,
    choices: [
      {
        label: 'Verlängern',
        effects: (s) => ({
          contract: s.contract
            ? {
                yearsLeft: s.contract.yearsLeft + 2,
                wage: Math.round(s.contract.wage * (s.talent?.id === 'solid' ? 1.2 : 1.1)),
              }
            : null,
          reputation: clamp(s.reputation + 3, 0, 100),
        }),
      },
      {
        label: 'Frei werden wollen',
        effects: (s) => ({
          flags: addFlag(s.flags, 'wants_free_agency'),
          form: clamp(s.form - 2, 0, 100),
        }),
      },
    ],
  },
  {
    id: 'match_prep',
    title: 'Spielvorbereitung',
    description: 'Der Gegner steht fest — wie gehst du in die Partie?',
    nodeTypes: ['MATCH'],
    conditions: () => true,
    weight: 5,
    choices: [
      {
        label: 'Aggressiv',
        effects: (s) => ({
          form: clamp(s.form + 3, 0, 100),
          flags: addFlag(s.flags, 'aggressive_match'),
        }),
      },
      {
        label: 'Kontrolliert',
        effects: (s) => ({
          stats: { ...s.stats, mental: clamp(s.stats.mental + 1, 1, 99) },
        }),
      },
    ],
  },
  {
    id: 'young_talent_pressure',
    title: 'Jungtalent-Druck',
    description: 'Ein Youngster schnuppert an deinem Platz.',
    nodeTypes: ['MEDIA_EVENT', 'AGENT_MEETING'],
    conditions: (s) => s.age >= 28,
    weight: 7,
    choices: [
      {
        label: 'Mentorenrolle annehmen',
        effects: (s) => ({
          stats: { ...s.stats, mental: clamp(s.stats.mental + 3, 1, 99) },
          reputation: clamp(s.reputation + 4, 0, 100),
        }),
      },
      {
        label: 'Platz verteidigen — Extra-Schichten',
        effects: (s) => ({
          form: clamp(s.form + 5, 0, 100),
          stats: { ...s.stats, phys: clamp(s.stats.phys - 1, 1, 99) },
          flags: addFlag(s.flags, 'fatigue'),
        }),
      },
    ],
  },
  {
    id: 'fan_day',
    title: 'Fan-Tag',
    description: 'Autogramme, Fotos, Kindertraining.',
    nodeTypes: ['SPONSOR', 'REST', 'MEDIA_EVENT'],
    conditions: () => true,
    weight: 6,
    choices: [
      {
        label: 'Voll dabei',
        effects: (s) => ({
          reputation: clamp(s.reputation + 5, 0, 100),
          finances: s.finances + 1000,
          form: clamp(s.form - 1, 0, 100),
        }),
      },
      {
        label: 'Kurz erscheinen',
        effects: (s) => ({
          reputation: clamp(s.reputation + 1, 0, 100),
        }),
      },
    ],
  },
  {
    id: 'physio_warning',
    title: 'Physio-Warnung',
    description: 'Die medizinische Abteilung sieht Überlastung.',
    nodeTypes: ['INJURY_RISK', 'TRAINING_CAMP'],
    conditions: (s) => s.flags.includes('fatigue') || s.form < 35,
    weight: 9,
    choices: [
      {
        label: 'Pause erzwingen',
        effects: (s) => ({
          form: clamp(s.form + 10, 0, 100),
          flags: removeFlag(s.flags, 'fatigue'),
          reputation: clamp(s.reputation - 2, 0, 100),
        }),
      },
      {
        label: 'Weitermachen',
        effects: (s) => ({
          flags: addFlag(s.flags, 'injury_watch'),
          form: clamp(s.form - 5, 0, 100),
        }),
      },
    ],
  },
];

/** Talent side effects: some events show up more often. */
const TALENT_WEIGHT: Record<string, Record<string, number>> = {
  wunderkind: { media_interview: 2, media_scandal_fallout: 2, injury_risk_tackle: 1.6, physio_warning: 1.5 },
  solid: { training_intensity: 1.5 },
};

export function pickEventForNode(
  state: PlayerState,
  nodeType: string,
): GameEvent | null {
  const eligible = GAME_EVENTS.filter(
    (e) =>
      e.conditions(state) &&
      (!e.nodeTypes || e.nodeTypes.includes(nodeType)),
  );
  if (!eligible.length) return null;

  const w = (e: GameEvent) =>
    e.weight * (TALENT_WEIGHT[state.talent?.id ?? '']?.[e.id] ?? 1);
  const total = eligible.reduce((sum, e) => sum + w(e), 0);
  let roll = Math.random() * total;
  for (const event of eligible) {
    roll -= w(event);
    if (roll <= 0) return event;
  }
  return eligible[eligible.length - 1];
}

export function getEventById(id: string): GameEvent | undefined {
  return GAME_EVENTS.find((e) => e.id === id);
}

/** Opponent from the player's own league (never the own club). */
export function randomOpponent(state: PlayerState): Club {
  const league = state.club?.league;
  return pickClub((c) => c.id !== state.club?.id && c.league === league);
}

export interface TransferOffer {
  club: Club;
  years: number;
  wage: number;
}

/** Offer from a club in the same league or one tier away. */
export function generateOffer(s: PlayerState): TransferOffer {
  const tier = s.club?.tier ?? 7;
  const club = pickClub(
    (c) => c.id !== s.club?.id && Math.abs(c.tier - tier) <= 1,
  );
  return {
    club,
    years: 2 + Math.floor(Math.random() * 3),
    wage: Math.round(4000 + (8 - club.tier) * 2500 + s.reputation * 80),
  };
}
