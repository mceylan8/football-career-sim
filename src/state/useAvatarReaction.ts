import { useEffect, useRef, useState } from 'react';
import type { AvatarMood } from '../components/PlayerAvatar';
import type { PlayerState } from '../types/player';
import { getEventById } from '../engine/eventEngine';
import { useCareerStore } from './careerStore';

const MOOD_MS = 2300;
const SWAP_MS = 800;
/** Weekly events after which the figure goes for a short run. */
const TRAIN_TITLES = new Set(
  ['training_intensity', 'rival_challenge'].map((id) => getEventById(id)?.title).filter(Boolean),
);

/**
 * Watches the career and returns a short-lived reaction for the avatar:
 * cheer after a won key match, sad after a lost one, hurt on a new injury,
 * a short run after a training camp or rival challenge,
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
    else if (fresh.some((e) => e.tag === 'Event' && TRAIN_TITLES.has(e.title))) setMood('train');
  }, [log]);

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
