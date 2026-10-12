import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import clubsData from '../data/clubs.json';
import {
  generateOffer,
  getEventById,
  pickEventForNode,
  randomOpponent,
} from '../engine/eventEngine';
import { findNode, generateSeasonMap } from '../engine/mapGenerator';
import { marketValue, ovrOf } from '../engine/marketValue';
import { simulateMatch } from '../engine/matchSim';
import type { Club } from '../types/club';
import type {
  ActiveEvent,
  LogEntry,
  LogTone,
  PendingFollowUp,
} from '../types/event';
import type { SeasonMap } from '../types/node';
import { POSITION_LIST, positionLabel, positionMeta } from '../data/positions';
import {
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

function startingClub(): Club {
  const pool = clubs.filter((c) => c.tier >= 4);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Clubs a 16-year-old can start at (lower two tiers). */
export const STARTER_CLUBS = clubs.filter((c) => c.tier >= 4);

export interface CareerSetup {
  name?: string;
  position?: Position;
  clubId?: string;
  talent?: Talent;
}

export function createInitialPlayer(
  chosen?: Club,
  setup: { name?: string; position?: Position; talent?: Talent } = {},
): PlayerState {
  const club = chosen ?? startingClub();
  const position =
    setup.position ??
    POSITION_LIST[Math.floor(Math.random() * POSITION_LIST.length)].id;
  const bias = positionMeta(position)?.bias ?? {};
  const boost = setup.talent?.boost ?? 0;
  return {
    squad: 'reserve',
    trust: 50,
    talent: setup.talent ?? null,
    name: setup.name?.trim() || 'Spieler',
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
  return {
    ...state,
    ...patch,
    stats: patch.stats ? { ...state.stats, ...patch.stats } : state.stats,
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

interface CareerStore {
  player: PlayerState;
  seasonMap: SeasonMap | null;
  activeEvent: ActiveEvent | null;
  lastMatchSummary: string | null;
  pendingFollowUps: PendingFollowUp[];
  log: LogEntry[];
  hasSave: boolean;

  newCareer: (setup?: CareerSetup) => void;
  selectNode: (nodeId: string) => void;
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
      const yearsLeft = next.contract.yearsLeft - 1;
      if (yearsLeft <= 0) {
        next = { ...next, contract: null, club: null };
      } else {
        next = {
          ...next,
          contract: { ...next.contract, yearsLeft },
        };
      }
    }
  }

  if (!next.contract && !next.club) {
    const offerChance = next.reputation >= 25 ? 0.7 : 0.35;
    if (Math.random() < offerChance) {
      const club = clubs.filter((c) => c.tier >= 3)[
        Math.floor(Math.random() * clubs.filter((c) => c.tier >= 3).length)
      ];
      next = {
        ...next,
        club,
        squad: 'first',
        trust: 50,
        contract: {
          yearsLeft: 2,
          wage: Math.round(2000 + next.reputation * 60),
        },
      };
    } else {
      next = {
        ...next,
        careerEnded: true,
        endReason: 'Vertragsende ohne neues Angebot — Karriere vorbei.',
      };
    }
  }

  return checkCareerEnd(next);
}

/** Plays one key match: stats, trust, money and the log entry. */
function runMatch(
  base: PlayerState,
  opponent: Club,
): { player: PlayerState; summary: string; entries: LogEntry[] } {
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
      base.trust + (result.rating >= 7 ? 6 : result.rating < 5 ? -4 : 1),
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
  return {
    player,
    summary: result.summary,
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

export const useCareerStore = create<CareerStore>()(
  persist(
    (set, get) => ({
      player: createInitialPlayer(),
      seasonMap: null,
      activeEvent: null,
      lastMatchSummary: null,
      pendingFollowUps: [],
      log: [],
      hasSave: false,

      newCareer: (setup: CareerSetup = {}) => {
        const chosen = STARTER_CLUBS.find((c) => c.id === setup.clubId);
        const player = createInitialPlayer(chosen, setup);
        const seasonMap = generateSeasonMap(player.season);
        set({
          player,
          seasonMap,
          activeEvent: null,
          lastMatchSummary: null,
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

      selectNode: (nodeId: string) => {
        const { player, seasonMap, pendingFollowUps } = get();
        if (!seasonMap || player.careerEnded || get().activeEvent) return;
        if (!seasonMap.availableNodeIds.includes(nodeId)) return;

        const node = findNode(seasonMap, nodeId);
        if (!node) return;

        let nextPlayer = { ...player };
        let matchSummary: string | null = null;
        let newEntries: LogEntry[] = [];
        let event = pickEventForNode(nextPlayer, node.type);

        // With a pre-match choice the match is played after it (see resolveChoice).
        let matchOpponent: Club | null = null;
        if (node.type === 'MATCH' && nextPlayer.club) {
          matchOpponent = randomOpponent(nextPlayer);
        }

        const due = pendingFollowUps.find((f) => f.triggerWeek <= nextPlayer.week);
        if (due) {
          const followEvent = getEventById(due.eventId);
          if (followEvent && followEvent.conditions(nextPlayer)) {
            event = followEvent;
          }
        }

        const offer =
          event?.id === 'transfer_offer' ? generateOffer(nextPlayer) : undefined;
        if (matchOpponent && !event) {
          const m = runMatch(nextPlayer, matchOpponent);
          nextPlayer = m.player;
          matchSummary = m.summary;
          newEntries = m.entries;
        }
        const context = offer
          ? `${offer.club.name} (${offer.club.league}) · ${offer.years} J. · ${offer.wage.toLocaleString('de-DE')} €/Woche`
          : matchOpponent && event
            ? `${teamName(nextPlayer)} gegen ${matchOpponent.name}${nextPlayer.squad === 'reserve' ? ' II' : ''}`
            : undefined;

        const markedRows = seasonMap.rows.map((row) =>
          row.map((n) =>
            n.id === nodeId ? { ...n, visited: true } : n,
          ),
        );

        const updatedMap: SeasonMap = {
          rows: markedRows,
          currentNodeId: nodeId,
          availableNodeIds: node.connections.slice(),
        };

        const isSeasonEnd = node.connections.length === 0;

        if (!event) {
          const week = playWeek(nextPlayer, node.type === 'MATCH');
          const advanced = week.player;
          let newMap = updatedMap;
          if (isSeasonEnd && !advanced.careerEnded) {
            newMap = generateSeasonMap(advanced.season);
          }
          set({
            player: advanced,
            seasonMap: newMap,
            activeEvent: null,
            lastMatchSummary: matchSummary,
            log: pushLog(
              get().log,
              ...newEntries,
              ...week.entries,
              ...seasonEntries(player, advanced),
            ),
            pendingFollowUps: pendingFollowUps.filter(
              (f) => !(due && f.eventId === due.eventId && f.triggerWeek === due.triggerWeek),
            ),
          });
          return;
        }

        set({
          player: nextPlayer,
          seasonMap: updatedMap,
          activeEvent: {
            event,
            context,
            offer,
            matchOpponentId: matchOpponent && event ? matchOpponent.id : undefined,
          },
          lastMatchSummary: matchSummary,
          log: pushLog(get().log, ...newEntries),
          pendingFollowUps: pendingFollowUps.filter(
            (f) => !(due && f.eventId === due.eventId && f.triggerWeek === due.triggerWeek),
          ),
        });
      },

      resolveChoice: (choiceIndex: number) => {
        const { player, seasonMap, activeEvent, pendingFollowUps } = get();
        if (!activeEvent || !seasonMap) return;

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

        // Stabilize injury career-end flag
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

        const newFollowUps = [...pendingFollowUps];
        for (const fu of choice.followUps ?? []) {
          newFollowUps.push({
            eventId: fu.eventId,
            triggerWeek: nextPlayer.week + fu.delayWeeks,
          });
        }

        const node = seasonMap.currentNodeId
          ? findNode(seasonMap, seasonMap.currentNodeId)
          : undefined;
        const isSeasonEnd = !!node && node.connections.length === 0;

        const before = nextPlayer;
        const eventEntry = entry(
          player,
          'Event',
          activeEvent.event.title,
          'neutral',
          `Deine Wahl: ${choice.label}${before.club && before.club.id !== player.club?.id ? ` · Neuer Klub: ${teamName(before)}` : ''}${describeChange(player, before)}`,
        );
        let matchEntries: LogEntry[] = [];
        const opp = clubs.find((c) => c.id === activeEvent.matchOpponentId);
        if (opp && nextPlayer.club) {
          const m = runMatch(nextPlayer, opp);
          nextPlayer = m.player;
          matchEntries = m.entries;
          set({ lastMatchSummary: m.summary });
        }
        const week = playWeek(nextPlayer, node?.type === 'MATCH');
        nextPlayer = week.player;

        let newMap = seasonMap;
        if (isSeasonEnd && !nextPlayer.careerEnded) {
          newMap = generateSeasonMap(nextPlayer.season);
        }

        set({
          player: nextPlayer,
          seasonMap: newMap,
          activeEvent: null,
          log: pushLog(
            get().log,
            eventEntry,
            ...matchEntries,
            ...week.entries,
            ...seasonEntries(before, nextPlayer),
          ),
          pendingFollowUps: newFollowUps,
        });
      },

      dismissEvent: () => set({ activeEvent: null }),

      clearSave: () => {
        localStorage.removeItem(SAVE_KEY);
        set({
          player: createInitialPlayer(),
          seasonMap: null,
          activeEvent: null,
          lastMatchSummary: null,
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
        const p = (persisted ?? {}) as Partial<CareerStore>;
        return {
          ...current,
          ...p,
          player: { ...current.player, ...p.player } as PlayerState,
        };
      },
      partialize: (s) => ({
        player: s.player,
        seasonMap: s.seasonMap,
        pendingFollowUps: s.pendingFollowUps,
        log: s.log,
        lastMatchSummary: s.lastMatchSummary,
        hasSave: true,
      }),
    },
  ),
);
