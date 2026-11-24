import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import clubsData from '../data/clubs.json';
import { getEventById, pickEventForNode } from '../engine/eventEngine';
import { generateWeekPlan, type WeekPlan } from '../engine/weekPlan';
import { openWindow, type TransferWindow } from '../engine/transfers';
import { ovrOf } from '../engine/marketValue';
import { simulateMatch } from '../engine/matchSim';
import {
  advanceWeek,
  checkCareerEnd,
  createInitialPlayer,
  mergePlayer,
  simulateSeason,
} from '../engine/season';
import { pickSeasonEvent, rollOutcome, seasonEventById } from '../engine/seasonEvents';
import { matchdayLabel, seasonMatchdays, simulateAutoWeek, teamName } from '../engine/squad';
import { randomOpponent } from '../engine/eventEngine';
import { clamp } from '../engine/util';
import type { Club } from '../types/club';
import type { ActiveEvent, LogEntry, LogTone } from '../types/event';
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

/** 'full' = weekly mode with key matches, 'fast' = one decision per season. */
export type GameMode = 'full' | 'fast';

export interface CareerSetup {
  name?: string;
  position?: Position;
  clubId?: string;
  nationality?: NationId;
  talent?: Talent;
  mode?: GameMode;
}

/** Fast mode: the open decision of the season (only the id is saved, the event lives in code). */
export interface SeasonCard {
  season: number;
  eventId: string;
}

/** Result of the key match just played, shown once on the scoreboard (not saved). */
export interface LastMatch {
  id: number;
  outcome: 'win' | 'draw' | 'loss';
  goalsFor: number;
  goalsAgainst: number;
  ownName: string;
  opponentName: string;
  opponentId: string;
  rating: number;
  playerGoals: number;
  playerAssists: number;
  formDelta: number;
  reputationDelta: number;
}

interface CareerStore {
  player: PlayerState;
  lastMatch: LastMatch | null;
  dismissMatch: () => void;
  weekPlan: WeekPlan | null;
  /** Season-end transfer window; blocks the week until a card is picked. */
  transferWindow: TransferWindow | null;
  pickTransfer: (index: number) => void;
  activeEvent: ActiveEvent | null;
  mode: GameMode;
  /** Fast mode: this season's decision (null while the transfer window is open). */
  seasonCard: SeasonCard | null;
  /** Fast mode: last season's event, so the next one is different. */
  lastSeasonEventId: string | null;
  log: LogEntry[];
  hasSave: boolean;

  newCareer: (setup?: CareerSetup) => void;
  selectNode: (optionId: string) => void;
  resolveChoice: (choiceIndex: number) => void;
  /** Fast mode: pick a choice, roll its outcome and play the whole season. */
  resolveSeason: (choiceIndex: number) => void;
  clearSave: () => void;
}

/** " · Physis +5, Geld -2.000 €" for the visible stat changes of one event. */
function describeChange(a: PlayerState, b: PlayerState): string {
  const parts: string[] = [];
  const d = (label: string, x: number, y: number, money = false) => {
    const diff = y - x;
    if (diff === 0) return;
    const abs = Math.abs(diff);
    const num = money ? `${abs.toLocaleString('de-DE')} €` : String(abs);
    parts.push(`${label} ${diff > 0 ? '+' : '−'}${num}`);
  };
  d('Technik', a.stats.tech, b.stats.tech);
  d('Physis', a.stats.phys, b.stats.phys);
  d('Mental', a.stats.mental, b.stats.mental);
  d('Form', a.form, b.form);
  d('Ruf', a.reputation, b.reputation);
  d('Geld', a.finances, b.finances, true);
  return parts.length ? ` · ${parts.join(', ')}` : '';
}

/** Season-end log entry when advanceWeek rolled the season over. */
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

/** Plays one key match: stats, trust, money and the log entry. */
function runMatch(
  base: PlayerState,
  opponent: Club,
): { player: PlayerState; summary: string; entries: LogEntry[]; last: LastMatch } {
  const result = simulateMatch(base, opponent);
  const player: PlayerState = {
    ...base,
    flags: base.flags.filter((f) => f !== 'aggressive_match'),
    seasonGames: base.seasonGames + 1,
    seasonWins: base.seasonWins + (result.outcome === 'win' ? 1 : 0),
    seasonDraws: base.seasonDraws + (result.outcome === 'draw' ? 1 : 0),
    seasonLosses: base.seasonLosses + (result.outcome === 'loss' ? 1 : 0),
    seasonGoals: base.seasonGoals + result.playerGoals,
    seasonAssists: base.seasonAssists + result.playerAssists,
    seasonRatingSum: base.seasonRatingSum + result.rating,
    trust: clamp(
      base.trust + (result.rating >= 7 ? 6 : result.rating < 5 ? (base.talent?.id === 'top' ? -7 : -4) : 1),
      0,
      100,
    ),
    form: clamp(base.form + result.formDelta, 0, 100),
    reputation: clamp(base.reputation + result.reputationDelta, 0, 100),
    finances:
      base.finances +
      (result.outcome === 'win' ? 2000 : result.outcome === 'draw' ? 800 : 200),
  };
  const word =
    result.outcome === 'win' ? 'Sieg' : result.outcome === 'draw' ? 'Remis' : 'Niederlage';
  const last: LastMatch = {
    id: logCounter,
    outcome: result.outcome,
    goalsFor: result.goalsFor,
    goalsAgainst: result.goalsAgainst,
    ownName: teamName(base),
    opponentName: result.opponentName,
    opponentId: opponent.id,
    rating: result.rating,
    playerGoals: result.playerGoals,
    playerAssists: result.playerAssists,
    formDelta: result.formDelta,
    reputationDelta: result.reputationDelta,
  };
  return {
    player,
    summary: result.summary,
    last,
    entries: [
      entry(
        base,
        'Match',
        `${result.goalsFor}:${result.goalsAgainst} gegen ${result.opponentName}`,
        result.outcome,
        `${word} · Form ${result.formDelta >= 0 ? '+' : ''}${result.formDelta}, Ruf ${result.reputationDelta >= 0 ? '+' : ''}${result.reputationDelta}`,
      ),
    ],
  };
}

/** Auto-plays the non-key matchdays, then advances the week. */
function playWeek(
  player: PlayerState,
  keyMatch: boolean,
): { player: PlayerState; entries: LogEntry[] } {
  const auto = simulateAutoWeek(player, keyMatch, randomOpponent);
  const base = auto ? auto.player : player;
  const entries = auto
    ? [entry(player, 'Spieltag', auto.title, auto.tone, auto.text)]
    : [];
  return { player: advanceWeek(base), entries };
}

/** Ends the week: auto matchdays, wage, season rollover, next week's options. */
function finishWeek(
  before: PlayerState,
  p: PlayerState,
  plan: WeekPlan,
  entries: LogEntry[],
) {
  const week = playWeek(p, plan.keyMatch);
  let adv = week.player;
  // New season: transfer window first (offers + stay / extension).
  let transferWindow: TransferWindow | null = null;
  if (adv.season > before.season && !adv.careerEnded) {
    transferWindow = openWindow(adv);
    if (!transferWindow.options.length) {
      adv = { ...adv, careerEnded: true, endReason: 'Vertragsende ohne neues Angebot — Karriere vorbei.' };
      transferWindow = null;
    }
  }
  useCareerStore.setState({
    player: adv,
    weekPlan: adv.careerEnded ? plan : generateWeekPlan(adv),
    transferWindow,
    activeEvent: null,
    log: pushLog(
      useCareerStore.getState().log,
      ...entries,
      ...week.entries,
      ...seasonEntries(before, adv),
    ),
  });
}

/** After the chosen activity: key week -> match prep first, else the week ends. */
function afterActivity(
  before: PlayerState,
  p: PlayerState,
  plan: WeekPlan,
  entries: LogEntry[],
) {
  const prep = getEventById('match_prep');
  if (plan.keyMatch && plan.opponent && prep && !p.careerEnded && p.club) {
    useCareerStore.setState({
      player: p,
      activeEvent: {
        event: prep,
        context: `${teamName(p)} gegen ${plan.opponent.name}${p.squad === 'reserve' ? ' II' : ''} · ${plan.opponent.league}`,
        matchOpponentId: plan.opponent.id,
      },
      log: pushLog(useCareerStore.getState().log, ...entries),
    });
    return;
  }
  finishWeek(before, p, plan, entries);
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
  weekPlan: null,
  transferWindow: null,
  activeEvent: null,
  lastMatch: null,
  seasonCard: null as SeasonCard | null,
  lastSeasonEventId: null as string | null,
  log: [] as LogEntry[],
};

export const useCareerStore = create<CareerStore>()(
  persist(
    (set, get) => ({
      player: createInitialPlayer(),
      ...EMPTY,
      mode: 'full' as GameMode,
      hasSave: false,

      pickTransfer: (index: number) => {
        const { player, transferWindow, mode, log } = get();
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
          weekPlan: mode === 'fast' ? null : generateWeekPlan(next),
          seasonCard: mode === 'fast' ? newSeasonCard(next, get().lastSeasonEventId ?? undefined) : null,
          log: pushLog(log, logEntry),
        });
      },

      dismissMatch: () => set({ lastMatch: null }),

      newCareer: (setup: CareerSetup = {}) => {
        const chosen = clubs.find((c) => c.id === setup.clubId);
        const player = createInitialPlayer(chosen, setup);
        const mode: GameMode = setup.mode ?? 'full';
        set({
          ...EMPTY,
          mode,
          player,
          weekPlan: mode === 'fast' ? null : generateWeekPlan(player),
          seasonCard: mode === 'fast' ? newSeasonCard(player) : null,
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

      selectNode: (optionId: string) => {
        const { player, weekPlan } = get();
        if (!weekPlan || player.careerEnded || get().activeEvent || get().transferWindow) return;
        const option = weekPlan.options.find((o) => o.id === optionId);
        if (!option) return;

        const event = pickEventForNode(player, option.type);
        if (!event) {
          afterActivity(player, player, weekPlan, []);
          return;
        }
        set({ activeEvent: { event } });
      },

      resolveChoice: (choiceIndex: number) => {
        const { player, weekPlan, activeEvent } = get();
        if (!activeEvent || !weekPlan) return;

        const choice = activeEvent.event.choices[choiceIndex];
        if (!choice) return;

        let nextPlayer = checkCareerEnd(mergePlayer(player, choice.effects(player)));

        const eventEntry = entry(
          player,
          'Event',
          activeEvent.event.title,
          'neutral',
          `Deine Wahl: ${choice.label}${describeChange(player, nextPlayer)}`,
        );

        // Second stage of a key week: the prep choice is made, now play the match.
        if (activeEvent.matchOpponentId) {
          const opp = clubs.find((c) => c.id === activeEvent.matchOpponentId);
          let entries = [eventEntry];
          if (opp && nextPlayer.club) {
            const m = runMatch(nextPlayer, opp);
            nextPlayer = m.player;
            entries = [eventEntry, ...m.entries];
            set({ lastMatch: m.last });
          }
          finishWeek(player, nextPlayer, weekPlan, entries);
          return;
        }
        afterActivity(player, nextPlayer, weekPlan, [eventEntry]);
      },

      clearSave: () => {
        localStorage.removeItem(SAVE_KEY);
        set({ ...EMPTY, player: createInitialPlayer(), mode: 'full', hasSave: false });
      },
    }),
    {
      name: SAVE_KEY,
      // Old saves lack newer fields: fill from defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CareerStore>;
        const player = { ...current.player, ...p.player } as PlayerState;
        // Club data can change between versions (tiers, new leagues): re-read it by id.
        if (player.club) {
          player.club = clubs.find((c) => c.id === player.club?.id) ?? player.club;
        }
        return { ...current, ...p, player, mode: p.mode ?? 'full' };
      },
      partialize: (s) => ({
        player: s.player,
        mode: s.mode,
        weekPlan: s.weekPlan,
        seasonCard: s.seasonCard,
        lastSeasonEventId: s.lastSeasonEventId,
        transferWindow: s.transferWindow,
        log: s.log,
        hasSave: true,
      }),
    },
  ),
);
