import { SPRITES, SPRITE_H, SPRITE_W } from './avatarSprites';
import { colorsFor } from './crestUtil';
import type { Club } from '../types/club';

export type AvatarTalent = 'wunderkind' | 'top' | 'solid' | 'late' | string;

/**
 * Letters: o outline, s/S skin, e eye, j/J shirt, a stripe, k/K shorts,
 * w/W socks, b/B boots, h/H hair, l laurel, y gold, c cap, q cap band,
 * p pom-pom, z sleep "z", g glowing boots, f/t ball.
 */
const HAIR: Record<string, string> = {
  solid: '#5a3a22',
  top: '#2fd4ff',
  wunderkind: '#e8b84a',
  late: '#3a2a22',
};

function darken(hex: string, amount = 0.22): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * (1 - amount));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function palette(talent: string, primary: string, secondary: string): Record<string, string> {
  const hair = HAIR[talent] ?? HAIR.solid;
  return {
    o: '#1d1b3a',
    s: '#ffc08a',
    S: '#e8895a',
    e: '#1d1b3a',
    j: primary,
    J: darken(primary),
    a: secondary,
    k: secondary,
    K: darken(secondary),
    w: '#fff6dc',
    W: '#b9b6c9',
    b: '#3a4bbf',
    B: '#2a3690',
    h: hair,
    H: darken(hair, 0.3),
    l: '#3fa34d',
    y: '#ffd23f',
    c: '#5b4bd6',
    q: '#9ad0ff',
    p: '#ff7ab6',
    z: '#ffd23f',
    g: '#7dffef',
    f: '#ffffff',
    t: '#1d1b3a',
  };
}

interface Props {
  talent: AvatarTalent;
  club: Club | null;
  size?: number;
}

/** Retro footballer mid-kick; shirt colours come from the club. */
export function PlayerAvatar({ talent, club, size = 72 }: Props) {
  const [primary, secondary] = club ? colorsFor(club) : ['#e63946', '#ffd23f'];
  const pal = palette(talent, primary, secondary);
  const rows = SPRITES[talent] ?? SPRITES.solid;
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={end - x + 0.02}
          height={1.02}
          fill={pal[ch] ?? '#f0f'}
          className={ch === 'g' ? 'av-glow' : undefined}
        />,
      );
      x = end;
    }
  });
  return (
    <svg
      className={`avatar av-${talent}`}
      viewBox={`0 0 ${SPRITE_W} ${SPRITE_H}`}
      width={size * (SPRITE_W / SPRITE_H)}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Spielerfigur ${talent}`}
    >
      {rects}
    </svg>
  );
}
