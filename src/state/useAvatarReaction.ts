import { useEffect, useRef, useState } from 'react';
import type { AvatarMood } from '../components/PlayerAvatar';
import type { PlayerState } from '../types/player';
import { ovrOf } from '../engine/marketValue';

const MOOD_MS = 2300;
const SWAP_MS = 800;

/**
 * Watches the career and returns a short-lived reaction for the avatar:
 * a cheer after a season with a big OVR jump, hurt on a new injury,
 * and a shirt "swap" flicker when the club changes. Nothing plays on load.
 */
export function useAvatarReaction(player: PlayerState): { mood: AvatarMood; swap: boolean } {
  const [mood, setMood] = useState<AvatarMood>('idle');
  const [swap, setSwap] = useState(false);

  const injured = useRef(player.flags.includes('injured'));
  const clubId = useRef(player.club?.id);

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
