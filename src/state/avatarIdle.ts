import type { AvatarAnim } from '../components/PlayerAvatar';

/**
 * Idle rotation that shows how the player is doing: in form he plays with
 * the ball and runs more, out of form he mostly stands, and on the bench he
 * trains alone. `undefined` keeps the default rotation of the avatar.
 */
export function idleFor(form: number, playtime: number): AvatarAnim[] | undefined {
  if (form < 40) return ['bereitSchraeg', 'bereit', 'bereitSchraeg', 'bereit'];
  if (playtime < 0.25) return ['bereitSchraeg', 'bereit', 'bereitSchraeg', 'jonglieren'];
  if (form >= 70) return ['bereit', 'jonglieren', 'laufen', 'jonglieren', 'bereit', 'bereitSchraeg'];
  return undefined;
}
