import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import clubsData from '../data/clubs.json';
import { openWindow, type TransferWindow } from '../engine/transfers';
import { ovrOf } from '../engine/marketValue';
import { checkCareerEnd, createInitialPlayer, simulateSeason } from '../engine/season';
import { pickSeasonEvent, rollOutcome, seasonEventById } from '../engine/seasonEvents';
import { matchdayLabel, seasonMatchdays, teamName } from '../engine/squad';
import type { Club } from '../types/club';
import type { LogEntry, LogTone } from '../types/event';
import type { NationId } from '../data/nations';
import { positionLabel } from '../data/positions';
import type { PlayerState, Position, Talent } from '../types/player';

const clubs = clubsData as Club[];

/** All clubs of the static pool (used by the setup and the club lookups). */
export const CLUBS = clubs;
const SAVE_KEY = 'football-career-sim';

let logCounter = Date.now();

function entry(
  p: { season: number; week: number; club?: Club | null },
  tag: string,
  title: string,
  tone: LogTone = 'neutral',
  text?: string,
): LogEntry {
  const md = matchdayLabel(p.week, seasonMatchdays(p.club ?? null));
  return { id: logCounter++, season: p.season, week: p.week, md, tag, title, text, tone };
}

function pushLog(log: LogEntry[], ...e: LogEntry[]): LogEntry[] {
  return [...log, ...e].slice(-80);
}

export interface CareerSetup {
  name?: string;
  position?: Position;
  clubId?: string;
  nationality?: NationId;
  talent?: Talent;
}

/** The open decision of the season (only the id is saved, the event lives in code). */
export interface SeasonCard {
  season: number;
  eventId: string;
}

interface CareerStore {
  player: PlayerState;
  /** Season-end transfer window; blocks the next season until a card is picked. */
  transferWindow: TransferWindow | null;
  pickTransfer: (index: number) => void;
  /** This season's decision (null while the transfer window is open). */
  seasonCard: SeasonCard | null;
  /** Last season's event, so the next one is different. */
  lastSeasonEventId: string | null;
  log: LogEntry[];
  hasSave: boolean;

  newCareer: (setup?: CareerSetup) => void;
  /** Pick a choice, roll its outcome and play the whole season. */
  resolveSeason: (choiceIndex: number) => void;
  clearSave: () => void;
}

/** Log entries for the season rollover (promotion, new club). */
function seasonEntries(before: PlayerState, after: PlayerState): LogEntry[] {
  if (after.season <= before.season) return [];
  const r = after.history[after.history.length - 1];
  const out = [
    entry(
      before,
      'Saison',
      `Saison ${before.season} beendet`,
      'neutral',
      r
        ? `Marktwert ${Math.round(r.value / 1000)} T€ · jetzt ${after.age} Jahre`
        : undefined,
    ),
  ];
  if (before.squad === 'reserve' && after.squad === 'first' && after.club?.id === before.club?.id) {
    out.push(entry(after, 'Beförderung', `Aufstieg in den Profikader von ${after.club?.name}`, 'win', 'Ab jetzt zählt der Vergleich mit dem echten Kader.'));
  }
  if (!after.careerEnded && after.club && after.club.id !== before.club?.id) {
    out.push(
      entry(after, 'Vertrag', `Neuer Klub: ${after.club.name}`, 'neutral', `${after.contract?.yearsLeft ?? 0} Jahre · ${after.contract?.wage ?? 0} €/Woche`),
    );
  }
  return out;
}

/** Season end: opens the transfer window, or ends the career when nobody wants you. */
function seasonEndWindow(p: PlayerState): { player: PlayerState; window: TransferWindow | null } {
  if (p.careerEnded) return { player: p, window: null };
  const window = openWindow(p);
  if (!window.options.length) {
    return {
      player: { ...p, careerEnded: true, endReason: 'Vertragsende ohne neues Angebot — Karriere vorbei.' },
      window: null,
    };
  }
  return { player: p, window };
}

function newSeasonCard(p: PlayerState, lastId?: string): SeasonCard {
  return { season: p.season, eventId: pickSeasonEvent(p, lastId).id };
}

const EMPTY = {
  transferWindow: null,
  seasonCard: null as SeasonCard | null,
  lastSeasonEventId: null as string | null,
  log: [] as LogEntry[],
};

/** Old saves from the removed weekly mode: keep the player, drop the week plan. */
interface LegacySave {
  weekPlan?: unknown;
  activeEvent?: unknown;
  mode?: string;
}

export const useCareerStore = create<CareerStore>()(
  persist(
    (set, get) => ({
      player: createInitialPlayer(),
      ...EMPTY,
      hasSave: false,

      pickTransfer: (index: number) => {
        const { player, transferWindow, log } = get();
        const o = transferWindow?.options[index];
        if (!o) return;
        let next: PlayerState = player;
        let logEntry: LogEntry;
        if (o.kind === 'move') {
          next = {
            ...player,
            club: o.club,
            squad: o.squad,
            trust: 50,
            contract: { yearsLeft: o.years, wage: o.wage },
            reputation: Math.min(100, player.reputation + 3),
            flags: player.flags.filter((f) => f !== 'transfer_rumor'),
          };
          logEntry = entry(next, 'Transfer', `Wechsel zu ${teamName(next)}`, 'win', `${o.club.league} · ${o.years} J. · ${o.wage.toLocaleString('de-DE')} €/Woche · ${o.role}`);
        } else if (o.kind === 'extend') {
          next = { ...player, contract: { yearsLeft: o.years, wage: o.wage } };
          logEntry = entry(next, 'Vertrag', `Verlängert bei ${teamName(next)}`, 'neutral', `${o.years} J. · ${o.wage.toLocaleString('de-DE')} €/Woche · ${o.role}`);
        } else {
          logEntry = entry(next, 'Transfer', `Bleibt bei ${teamName(next)}`, 'neutral', `Noch ${o.years} J. Vertrag · ${o.role}`);
        }
        set({
          player: next,
          transferWindow: null,
          seasonCard: newSeasonCard(next, get().lastSeasonEventId ?? undefined),
          log: pushLog(log, logEntry),
        });
      },

      newCareer: (setup: CareerSetup = {}) => {
        const chosen = clubs.find((c) => c.id === setup.clubId);
        const player = createInitialPlayer(chosen, setup);
        set({
          ...EMPTY,
          player,
          seasonCard: newSeasonCard(player),
          log: [
            entry(
              player,
              'Start',
              `${player.name} beginnt bei ${teamName(player)}`,
              'neutral',
              `Alter ${player.age} · OVR ${ovrOf(player)} · ${positionLabel(player.position)}${player.talent ? ` · ${player.talent.label}` : ''}`,
            ),
          ],
          hasSave: true,
        });
      },

      resolveSeason: (choiceIndex: number) => {
        const { player, seasonCard, log } = get();
        const event = seasonCard ? seasonEventById(seasonCard.eventId) : undefined;
        const choice = event?.choices[choiceIndex];
        if (!event || !choice || player.careerEnded) return;

        const outcome = rollOutcome(choice);
        let p = outcome.apply(player);
        if (p.flags.includes('injured') && p.age >= 33 && Math.random() < 0.25) {
          p = { ...p, flags: [...p.flags, 'career_ending_injury'] };
        }
        p = checkCareerEnd(p);
        const tone: LogTone = outcome.tone === 'up' ? 'win' : outcome.tone === 'down' ? 'loss' : 'neutral';
        const eventEntry = entry(player, event.title, `${choice.label}: ${outcome.chip}`, tone, outcome.text);

        const after = p.careerEnded ? p : simulateSeason(p);
        const r = after.history[after.history.length - 1];
        const summary =
          after.season > player.season && r
            ? [
                entry(
                  player,
                  'Bilanz',
                  `${r.games} Spiele · ${r.goals ?? 0} Tore · ${r.assists ?? 0} Vorl.`,
                  r.games >= 20 ? 'win' : r.games >= 8 ? 'draw' : 'loss',
                  `Ø-Note ${r.avgRating ?? 0} · OVR ${r.ovr} → ${ovrOf(after)}`,
                ),
              ]
            : [];
        const end = seasonEndWindow(after);
        set({
          player: end.player,
          transferWindow: end.window,
          seasonCard: null,
          lastSeasonEventId: event.id,
          log: pushLog(log, eventEntry, ...summary, ...seasonEntries(player, end.player)),
        });
      },

      clearSave: () => {
        localStorage.removeItem(SAVE_KEY);
        set({ ...EMPTY, player: createInitialPlayer(), hasSave: false });
      },
    }),
    {
      name: SAVE_KEY,
      // Old saves lack newer fields: fill from defaults.
      merge: (persisted, current) => {
        const p = { ...(persisted as object) } as Partial<CareerStore> & LegacySave;
        delete p.weekPlan;
        delete p.activeEvent;
        delete p.mode;
        const player = { ...current.player, ...p.player } as PlayerState;
        // Club data can change between versions (tiers, new leagues): re-read it by id.
        if (player.club) {
          player.club = clubs.find((c) => c.id === player.club?.id) ?? player.club;
        }
        // A career from the weekly mode continues with this season's decision.
        const running = p.hasSave && !player.careerEnded && !p.transferWindow;
        const seasonCard =
          p.seasonCard ?? (running ? newSeasonCard(player, p.lastSeasonEventId ?? undefined) : null);
        return { ...current, ...p, player, seasonCard };
      },
      partialize: (s) => ({
        player: s.player,
        seasonCard: s.seasonCard,
        lastSeasonEventId: s.lastSeasonEventId,
        transferWindow: s.transferWindow,
        log: s.log,
        hasSave: s.hasSave,
      }),
    },
  ),
);
