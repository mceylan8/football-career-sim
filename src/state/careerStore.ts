import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import clubsData from '../data/clubs.json';
import {
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
import type {
  PartialPlayerUpdate,
  PlayerState,
  Position,
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

const POSITIONS: Position[] = ['ST', 'OM', 'ZM', 'LV', 'IV'];

function startingClub(): Club {
  const pool = clubs.filter((c) => c.tier >= 4);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Clubs a 16-year-old can start at (lower two tiers). */
export const STARTER_CLUBS = clubs.filter((c) => c.tier >= 4);

export function createInitialPlayer(chosen?: Club): PlayerState {
  const club = chosen ?? startingClub();
  return {
    position: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
    seasonGames: 0,
    history: [],
    age: 16,
    week: 1,
    season: 1,
    stats: { tech: 42, phys: 45, mental: 40 },
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

  newCareer: (clubId?: string) => void;
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
        ? `${r.games} Spiele · OVR ${r.ovr} · Marktwert ${Math.round(r.value / 1000)} T€ · jetzt ${after.age} Jahre`
        : undefined,
    ),
  ];
  if (!after.careerEnded && after.club && after.club.id !== before.club?.id) {
    out.push(
      entry(after, 'Vertrag', `Neuer Klub: ${after.club.name}`, 'neutral', `${after.contract?.yearsLeft ?? 0} Jahre · ${after.contract?.wage ?? 0} €/Woche`),
    );
  }
  return out;
}

function advanceWeek(player: PlayerState): PlayerState {
  let next = applyWage({ ...player, week: player.week + 1 });

  if (next.week > 12) {
    const record = {
      age: player.age,
      clubName: player.club?.name ?? 'ohne Verein',
      ovr: ovrOf(player),
      games: player.seasonGames,
      value: marketValue(player),
    };
    next = {
      ...next,
      history: [...player.history, record].slice(-25),
      seasonGames: 0,
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

      newCareer: (clubId?: string) => {
        const chosen = STARTER_CLUBS.find((c) => c.id === clubId);
        const player = createInitialPlayer(chosen);
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
              `Karriere beginnt bei ${player.club?.name ?? 'einem Klub'}`,
              'neutral',
              `Alter ${player.age} · OVR ${ovrOf(player)} · Position ${player.position}`,
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

        if (node.type === 'MATCH' && nextPlayer.club) {
          const opponent = randomOpponent(nextPlayer);
          const result = simulateMatch(nextPlayer, opponent);
          nextPlayer = {
            ...nextPlayer,
            seasonGames: nextPlayer.seasonGames + 1,
            form: clamp(nextPlayer.form + result.formDelta, 0, 100),
            reputation: clamp(
              nextPlayer.reputation + result.reputationDelta,
              0,
              100,
            ),
            finances:
              nextPlayer.finances +
              (result.outcome === 'win'
                ? 2000
                : result.outcome === 'draw'
                  ? 800
                  : 200),
          };
          matchSummary = result.summary;
          newEntries = [
            entry(
              player,
              'Match',
              `${result.goalsFor}:${result.goalsAgainst} gegen ${result.opponentName}`,
              result.outcome,
              `${result.outcome === 'win' ? 'Sieg' : result.outcome === 'draw' ? 'Remis' : 'Niederlage'} · Note ${result.rating.toFixed(1)} · Form ${result.formDelta >= 0 ? '+' : ''}${result.formDelta}, Ruf ${result.reputationDelta >= 0 ? '+' : ''}${result.reputationDelta}`,
            ),
          ];
        }

        const due = pendingFollowUps.find((f) => f.triggerWeek <= nextPlayer.week);
        if (due) {
          const followEvent = getEventById(due.eventId);
          if (followEvent && followEvent.conditions(nextPlayer)) {
            event = followEvent;
          }
        }

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
          let advanced = advanceWeek(nextPlayer);
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
            context: matchSummary ?? undefined,
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

        let nextPlayer = mergePlayer(player, choice.effects(player));

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
          `Deine Wahl: ${choice.label}${describeChange(player, before)}`,
        );
        nextPlayer = advanceWeek(nextPlayer);

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
