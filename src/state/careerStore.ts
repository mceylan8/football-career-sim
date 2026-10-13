import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import clubsData from '../data/clubs.json';
import {
  getEventById,
  pickEventForNode,
  randomOpponent,
} from '../engine/eventEngine';
import { generateWeekPlan, type WeekPlan } from '../engine/weekPlan';
import { openWindow, type TransferWindow } from '../engine/transfers';
import { marketValue, ovrOf } from '../engine/marketValue';
import { simulateMatch } from '../engine/matchSim';
import type { Club } from '../types/club';
import type {
  ActiveEvent,
  LogEntry,
  LogTone,
  PendingFollowUp,
} from '../types/event';
import { NATIONS, nationById, type NationId } from '../data/nations';
import { POSITION_LIST, positionLabel, positionMeta } from '../data/positions';
import {
  eventGain,
  rollPotential,
  seasonGrowth,
  shouldPromote,
  simulateAutoWeek,
  squadLevel,
  teamName,
} from '../engine/squad';
import type {
  PartialPlayerUpdate,
  PlayerState,
  Position,
  Talent,
} from '../types/player';

const clubs = clubsData as Club[];

/** All clubs of the static pool (used by the setup and the club lookups). */
export const CLUBS = clubs;
const SAVE_KEY = 'football-career-sim';

let logCounter = Date.now();

function entry(
  p: { season: number; week: number },
  tag: string,
  title: string,
  tone: LogTone = 'neutral',
  text?: string,
): LogEntry {
  return { id: logCounter++, season: p.season, week: p.week, tag, title, text, tone };
}

function pushLog(log: LogEntry[], ...e: LogEntry[]): LogEntry[] {
  return [...log, ...e].slice(-80);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Fallback start: a random club from the top league of a random nation. */
function startingClub(): Club {
  const leagues = NATIONS.map((n) => n.league);
  const pool = clubs.filter((c) => leagues.includes(c.league));
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface CareerSetup {
  name?: string;
  position?: Position;
  clubId?: string;
  nationality?: NationId;
  talent?: Talent;
}

export function createInitialPlayer(
  chosen?: Club,
  setup: {
    name?: string;
    position?: Position;
    nationality?: NationId;
    talent?: Talent;
  } = {},
): PlayerState {
  const club = chosen ?? startingClub();
  const nationality =
    setup.nationality ?? (nationById(club.country) ? (club.country as NationId) : undefined);
  const position =
    setup.position ??
    POSITION_LIST[Math.floor(Math.random() * POSITION_LIST.length)].id;
  const bias = positionMeta(position)?.bias ?? {};
  const boost = setup.talent?.boost ?? 0;
  return {
    squad: 'reserve',
    trust: 50,
    talent: setup.talent ?? null,
    potential: rollPotential(setup.talent ?? null),
    name: setup.name?.trim() || 'Spieler',
    nationality,
    position,
    seasonGames: 0,
    seasonWins: 0,
    seasonDraws: 0,
    seasonLosses: 0,
    seasonGoals: 0,
    seasonAssists: 0,
    seasonRatingSum: 0,
    history: [],
    age: 16,
    week: 1,
    season: 1,
    stats: {
      tech: 42 + boost + (bias.tech ?? 0),
      phys: 45 + boost + (bias.phys ?? 0),
      mental: 40 + boost + (bias.mental ?? 0),
    },
    form: 55,
    reputation: 20,
    finances: 5000,
    club,
    contract: { yearsLeft: 3, wage: 2500 },
    traits: [],
    flags: [],
    careerEnded: false,
    endReason: null,
  };
}

function mergePlayer(
  state: PlayerState,
  patch: PartialPlayerUpdate,
): PlayerState {
  // Event stat bonuses only partly stick and fade out near the potential.
  let stats = state.stats;
  if (patch.stats) {
    const want = { ...state.stats, ...patch.stats };
    const one = (k: 'tech' | 'phys' | 'mental') =>
      Math.max(1, Math.min(99, state.stats[k] + eventGain(state, state.stats[k], want[k] - state.stats[k])));
    stats = { tech: one('tech'), phys: one('phys'), mental: one('mental') };
  }
  return {
    ...state,
    ...patch,
    stats,
    contract:
      patch.contract === undefined ? state.contract : patch.contract,
  };
}

function checkCareerEnd(player: PlayerState): PlayerState {
  if (player.careerEnded) return player;
  if (player.age >= 38) {
    return {
      ...player,
      careerEnded: true,
      endReason: 'Alter — Zeit für den Rücktritt.',
    };
  }
  if (player.reputation <= 0) {
    return {
      ...player,
      careerEnded: true,
      endReason: 'Reputationskollaps — niemand will dich mehr.',
    };
  }
  if (player.flags.includes('career_ending_injury')) {
    return {
      ...player,
      careerEnded: true,
      endReason: 'Schwere Verletzung beendet die Karriere.',
    };
  }
  return player;
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
  lastMatchSummary: string | null;
  pendingFollowUps: PendingFollowUp[];
  log: LogEntry[];
  hasSave: boolean;

  newCareer: (setup?: CareerSetup) => void;
  selectNode: (optionId: string) => void;
  resolveChoice: (choiceIndex: number) => void;
  dismissEvent: () => void;
  clearSave: () => void;
}

function applyWage(player: PlayerState): PlayerState {
  if (!player.contract) return player;
  return {
    ...player,
    finances: player.finances + player.contract.wage,
  };
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

function advanceWeek(player: PlayerState): PlayerState {
  // Form drifts back towards 55 every week.
  const form = Math.round(player.form - (player.form - 55) * 0.15);
  let next = applyWage({ ...player, form, week: player.week + 1 });

  if (next.week > 12) {
    const record = {
      age: player.age,
      clubName: teamName(player),
      ovr: ovrOf(player),
      games: player.seasonGames,
      wins: player.seasonWins,
      draws: player.seasonDraws,
      losses: player.seasonLosses,
      goals: player.seasonGoals,
      assists: player.seasonAssists,
      avgRating: player.seasonGames ? Math.round((player.seasonRatingSum / player.seasonGames) * 10) / 10 : 0,
      value: marketValue(player),
    };
    const g = seasonGrowth(player);
    const stat = (k: 'tech' | 'phys' | 'mental') =>
      Math.max(1, Math.min(99, next.stats[k] + (g[k] ?? 0)));
    next = {
      ...next,
      stats: { tech: stat('tech'), phys: stat('phys'), mental: stat('mental') },
      squad: shouldPromote(player) ? 'first' : player.squad,
      trust: 50 + Math.round((player.trust - 50) / 2),
      history: [...player.history, record].slice(-25),
      seasonGames: 0,
      seasonWins: 0,
      seasonDraws: 0,
      seasonLosses: 0,
      seasonGoals: 0,
      seasonAssists: 0,
      seasonRatingSum: 0,
      week: 1,
      season: next.season + 1,
      age: next.age + 1,
    };
    if (next.contract) {
      // 0 years left = contract runs out; the transfer window decides what happens.
      next = { ...next, contract: { ...next.contract, yearsLeft: Math.max(0, next.contract.yearsLeft - 1) } };
    }
  }



  return checkCareerEnd(next);
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
  follow: PendingFollowUp[],
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
    pendingFollowUps: follow,
  });
}

/** After the chosen activity: key week -> match prep first, else the week ends. */
function afterActivity(
  before: PlayerState,
  p: PlayerState,
  plan: WeekPlan,
  entries: LogEntry[],
  follow: PendingFollowUp[],
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
      pendingFollowUps: follow,
    });
    return;
  }
  finishWeek(before, p, plan, entries, follow);
}

export const useCareerStore = create<CareerStore>()(
  persist(
    (set, get) => ({
      player: createInitialPlayer(),
      weekPlan: null,
      transferWindow: null,
      activeEvent: null,
      lastMatchSummary: null,
      lastMatch: null,
      pendingFollowUps: [],
      log: [],
      hasSave: false,

      pickTransfer: (index: number) => {
        const { player, transferWindow } = get();
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
          weekPlan: generateWeekPlan(next),
          log: pushLog(get().log, logEntry),
        });
      },

      dismissMatch: () => set({ lastMatch: null }),

      newCareer: (setup: CareerSetup = {}) => {
        const chosen = clubs.find((c) => c.id === setup.clubId);
        const player = createInitialPlayer(chosen, setup);
        const weekPlan = generateWeekPlan(player);
        set({
          player,
          weekPlan,
          transferWindow: null,
          activeEvent: null,
          lastMatchSummary: null,
          lastMatch: null,
          pendingFollowUps: [],
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

      selectNode: (optionId: string) => {
        const { player, weekPlan, pendingFollowUps } = get();
        if (!weekPlan || player.careerEnded || get().activeEvent || get().transferWindow) return;
        const option = weekPlan.options.find((o) => o.id === optionId);
        if (!option) return;

        let event = pickEventForNode(player, option.type);
        const due = pendingFollowUps.find((f) => f.triggerWeek <= player.week);
        if (due) {
          const followEvent = getEventById(due.eventId);
          if (followEvent && followEvent.conditions(player)) event = followEvent;
        }
        const follow = pendingFollowUps.filter(
          (f) => !(due && f.eventId === due.eventId && f.triggerWeek === due.triggerWeek),
        );
        const offer = event?.id === 'transfer_offer' ? option.offer : undefined;

        if (!event) {
          afterActivity(player, player, weekPlan, [], follow);
          return;
        }
        set({
          activeEvent: {
            event,
            offer,
            context: offer
              ? `${offer.club.name} (${offer.club.league}) · ${offer.years} J. · ${offer.wage.toLocaleString('de-DE')} €/Woche`
              : undefined,
          },
          pendingFollowUps: follow,
        });
      },

      resolveChoice: (choiceIndex: number) => {
        const { player, weekPlan, activeEvent, pendingFollowUps } = get();
        if (!activeEvent || !weekPlan) return;

        const choice = activeEvent.event.choices[choiceIndex];
        if (!choice) return;

        let nextPlayer = mergePlayer(
          player,
          choice.effects(player, { offer: activeEvent.offer }),
        );
        if (nextPlayer.club && nextPlayer.club.id !== player.club?.id) {
          const level = squadLevel(nextPlayer.club, false);
          nextPlayer = {
            ...nextPlayer,
            squad: ovrOf(nextPlayer) >= level - 3 ? 'first' : 'reserve',
            trust: 50,
          };
        }

        if (
          nextPlayer.flags.includes('injured') &&
          nextPlayer.age >= 34 &&
          Math.random() < 0.12
        ) {
          nextPlayer = {
            ...nextPlayer,
            flags: [...nextPlayer.flags, 'career_ending_injury'],
          };
        }
        nextPlayer = checkCareerEnd(nextPlayer);

        const follow = [...pendingFollowUps];
        for (const fu of choice.followUps ?? []) {
          follow.push({
            eventId: fu.eventId,
            triggerWeek: nextPlayer.week + fu.delayWeeks,
          });
        }

        const eventEntry = entry(
          player,
          'Event',
          activeEvent.event.title,
          'neutral',
          `Deine Wahl: ${choice.label}${nextPlayer.club && nextPlayer.club.id !== player.club?.id ? ` · Neuer Klub: ${teamName(nextPlayer)}` : ''}${describeChange(player, nextPlayer)}`,
        );

        // Second stage of a key week: the prep choice is made, now play the match.
        if (activeEvent.matchOpponentId) {
          const opp = clubs.find((c) => c.id === activeEvent.matchOpponentId);
          let entries = [eventEntry];
          if (opp && nextPlayer.club) {
            const m = runMatch(nextPlayer, opp);
            nextPlayer = m.player;
            entries = [eventEntry, ...m.entries];
            set({ lastMatchSummary: m.summary, lastMatch: m.last });
          }
          finishWeek(player, nextPlayer, weekPlan, entries, follow);
          return;
        }
        afterActivity(player, nextPlayer, weekPlan, [eventEntry], follow);
      },

      dismissEvent: () => set({ activeEvent: null }),

      clearSave: () => {
        localStorage.removeItem(SAVE_KEY);
        set({
          player: createInitialPlayer(),
          weekPlan: null,
          transferWindow: null,
          activeEvent: null,
          lastMatchSummary: null,
          lastMatch: null,
          pendingFollowUps: [],
          log: [],
          hasSave: false,
        });
      },
    }),
    {
      name: SAVE_KEY,
      // Old saves lack position/history/seasonGames: fill from defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CareerStore> & { seasonMap?: unknown };
        const player = { ...current.player, ...p.player } as PlayerState;
        // Club data can change between versions (tiers, new leagues): re-read it by id.
        if (player.club) {
          player.club = clubs.find((c) => c.id === player.club?.id) ?? player.club;
        }
        // Saves from before the weekly plan: build the first plan from the player.
        const weekPlan =
          p.weekPlan ??
          (p.seasonMap && !player.careerEnded ? generateWeekPlan(player) : null);
        return { ...current, ...p, player, weekPlan };
      },
      partialize: (s) => ({
        player: s.player,
        weekPlan: s.weekPlan,
        transferWindow: s.transferWindow,
        pendingFollowUps: s.pendingFollowUps,
        log: s.log,
        lastMatchSummary: s.lastMatchSummary,
        hasSave: true,
      }),
    },
  ),
);
