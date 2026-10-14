import { useEffect, useRef, useState } from 'react';
import type { AvatarMood } from '../components/PlayerAvatar';
import type { PlayerState } from '../types/player';
import { getEventById } from '../engine/eventEngine';
import { ovrOf } from '../engine/marketValue';
import { useCareerStore } from './careerStore';

const MOOD_MS = 2300;
const SWAP_MS = 800;
/** Weekly events after which the figure reacts: training = sprint + ball work, fan day = tricks, deal = cheer. */
const MOOD_BY_EVENT: Record<string, AvatarMood> = {
  training_intensity: 'train',
  rival_challenge: 'train',
  fan_day: 'juggle',
  rest_day: 'juggle',
  sponsor_local: 'celebrate',
  sponsor_big: 'celebrate',
};
const MOOD_BY_TITLE = new Map<string, AvatarMood>(
  Object.entries(MOOD_BY_EVENT)
    .map(([id, mood]) => [getEventById(id)?.title ?? '', mood] as const)
    .filter(([title]) => title),
);

/**
 * Watches the career and returns a short-lived reaction for the avatar:
 * cheer after a won key match, sad after a lost one, hurt on a new injury,
 * sprint plus ball work after training, tricks on fan day and rest day,
 * a cheer after a sponsor deal or a season with a big OVR jump,
 * and a shirt "swap" flicker when the club changes. Nothing plays on load.
 */
export function useAvatarReaction(player: PlayerState): { mood: AvatarMood; swap: boolean } {
  const log = useCareerStore((s) => s.log);
  const [mood, setMood] = useState<AvatarMood>('idle');
  const [swap, setSwap] = useState(false);

  const lastLogId = useRef<number>(log.length ? log[log.length - 1].id : 0);
  const injured = useRef(player.flags.includes('injured'));
  const clubId = useRef(player.club?.id);

  // key match results
  useEffect(() => {
    const fresh = log.filter((e) => e.id > lastLogId.current);
    if (!fresh.length) return;
    lastLogId.current = fresh[fresh.length - 1].id;
    const match = [...fresh].reverse().find((e) => e.tag === 'Match');
    if (match?.tone === 'win') setMood('cheer');
    else if (match?.tone === 'loss') setMood('sad');
    else {
      const ev = [...fresh].reverse().find((e) => e.tag === 'Event' && MOOD_BY_TITLE.has(e.title));
      if (ev) setMood(MOOD_BY_TITLE.get(ev.title)!);
    }
  }, [log]);

  // new season with a clear OVR jump: celebrate
  const season = player.season;
  const ovr = ovrOf(player);
  const seen = useRef({ season, ovr });
  useEffect(() => {
    if (season > seen.current.season && ovr - seen.current.ovr >= 3) setMood('celebrate');
    seen.current = { season, ovr };
  }, [season, ovr]);

  // new injury
  const isInjured = player.flags.includes('injured');
  useEffect(() => {
    if (isInjured && !injured.current) setMood('hurt');
    injured.current = isInjured;
  }, [isInjured]);

  // transfer: new shirt
  const currentClub = player.club?.id;
  useEffect(() => {
    if (currentClub && clubId.current && currentClub !== clubId.current) setSwap(true);
    clubId.current = currentClub;
  }, [currentClub]);

  useEffect(() => {
    if (mood === 'idle') return;
    const t = setTimeout(() => setMood('idle'), MOOD_MS);
    return () => clearTimeout(t);
  }, [mood]);

  useEffect(() => {
    if (!swap) return;
    const t = setTimeout(() => setSwap(false), SWAP_MS);
    return () => clearTimeout(t);
  }, [swap]);

  return { mood, swap };
}
