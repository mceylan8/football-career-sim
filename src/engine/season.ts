import clubsData from '../data/clubs.json';
import { NATIONS, nationById, type NationId } from '../data/nations';
import { POSITION_LIST, positionMeta } from '../data/positions';
import type { Club } from '../types/club';
import type { PartialPlayerUpdate, PlayerState, Position, Talent } from '../types/player';
import { randomOpponent } from './eventEngine';
import { seasonTitles } from './titles';
import { marketValue, ovrOf } from './marketValue';
import {
  WEEKS,
  eventGain,
  rollPotential,
  seasonGrowth,
  shouldPromote,
  simulateAutoWeek,
  teamName,
} from './squad';

const clubs = clubsData as Club[];

/** Fallback start: a random club from the top league of a random nation. */
function startingClub(): Club {
  const leagues = NATIONS.map((n) => n.league);
  const pool = clubs.filter((c) => leagues.includes(c.league));
  return pool[Math.floor(Math.random() * pool.length)];
}

export function createInitialPlayer(
  chosen?: Club,
  setup: { name?: string; position?: Position; nationality?: NationId; talent?: Talent } = {},
): PlayerState {
  const club = chosen ?? startingClub();
  const nationality =
    setup.nationality ?? (nationById(club.country) ? (club.country as NationId) : undefined);
  const position =
    setup.position ?? POSITION_LIST[Math.floor(Math.random() * POSITION_LIST.length)].id;
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
    flags: [],
    seasonBoost: 0,
    careerEnded: false,
    endReason: null,
  };
}

/** Applies an event patch; stat bonuses only partly stick and fade out near the potential. */
export function mergePlayer(state: PlayerState, patch: PartialPlayerUpdate): PlayerState {
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
    contract: patch.contract === undefined ? state.contract : patch.contract,
  };
}

export function checkCareerEnd(player: PlayerState): PlayerState {
  if (player.careerEnded) return player;
  const end = (endReason: string): PlayerState => ({ ...player, careerEnded: true, endReason });
  if (player.age >= 38) return end('Alter — Zeit für den Rücktritt.');
  if (player.reputation <= 0) return end('Reputationskollaps — niemand will dich mehr.');
  if (player.flags.includes('career_ending_injury')) return end('Schwere Verletzung beendet die Karriere.');
  return player;
}

/** One week passes: form drifts to 55, wage is paid; after week 12 the season rolls over. */
export function advanceWeek(player: PlayerState): PlayerState {
  const form = Math.round(player.form - (player.form - 55) * 0.15);
  let next: PlayerState = {
    ...player,
    form,
    week: player.week + 1,
    finances: player.finances + (player.contract?.wage ?? 0),
  };

  if (next.week > WEEKS) {
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
      avgRating: player.seasonGames
        ? Math.round((player.seasonRatingSum / player.seasonGames) * 10) / 10
        : 0,
      value: marketValue(player),
      titles: seasonTitles(player),
    };
    const g = seasonGrowth(player);
    const stat = (k: 'tech' | 'phys' | 'mental') =>
      Math.max(1, Math.min(99, next.stats[k] + (g[k] ?? 0)));
    next = {
      ...next,
      stats: { tech: stat('tech'), phys: stat('phys'), mental: stat('mental') },
      squad: shouldPromote(player) ? 'first' : player.squad,
      // Every title lifts the reputation.
      reputation: Math.min(100, next.reputation + record.titles.length * 4),
      trust: 50 + Math.round((player.trust - 50) / 2),
      history: [...player.history, record].slice(-25),
      seasonGames: 0,
      seasonWins: 0,
      seasonDraws: 0,
      seasonLosses: 0,
      seasonGoals: 0,
      seasonAssists: 0,
      seasonRatingSum: 0,
      seasonBoost: 0,
      // An injury heals over the summer break.
      flags: next.flags.filter((f) => f !== 'injured'),
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

/** Fast mode: all 12 weeks at once, every matchday simulated (no key matches). */
export function simulateSeason(player: PlayerState): PlayerState {
  let p = player;
  const season = p.season;
  while (p.season === season && !p.careerEnded) {
    const auto = simulateAutoWeek(p, false, randomOpponent);
    p = advanceWeek(auto ? auto.player : p);
  }
  return p;
}
