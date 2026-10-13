import { SPRITES, SPRITE_H, SPRITE_W } from './avatarSprites';
import { colorsFor } from './crestUtil';
import type { Club } from '../types/club';

export type AvatarTalent = 'wunderkind' | 'top' | 'solid' | 'late' | string;

/**
 * Letters: o outline, s/S skin, e eye, R mouth, j/J shirt, a/A stripes, k/K shorts,
 * w/W socks, b/B boots, u laces, h/H/i hair, l/L laurel, y gold, c/C cap,
 * q cap band, p pom-pom, z sleep "z", g glowing boots, f/t ball.
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

function lighten(hex: string, amount = 0.3): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v + (255 - v) * amount);
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
    A: darken(secondary),
    k: '#ffffff',
    K: '#c9c9d6',
    R: '#b0453a',
    w: '#fff6dc',
    W: '#b9b6c9',
    b: '#34344a',
    B: '#1d1d30',
    h: hair,
    H: darken(hair, 0.3),
    i: lighten(hair),
    l: '#3fa34d',
    L: '#7bd36b',
    u: '#ffffff',
    y: '#ffd23f',
    c: '#5b4bd6',
    C: '#4637ab',
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

/** Retro footballer, front view with ball; striped shirt in the club colours. */
export function PlayerAvatar({ talent, club, size = 72 }: Props) {
  const [primary, secondary] = club ? colorsFor(club) : ['#e63946', '#ffd23f'];
  const pal = palette(talent, primary, secondary);
  const rows = SPRITES[talent] ?? SPRITES.solid;
  const rects: React.ReactNode[] = [];
  const glow: React.ReactNode[] = [];
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
      (ch === 'g' ? glow : rects).push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={end - x + 0.02}
          height={1.02}
          fill={pal[ch] ?? '#f0f'}
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
      <g className="av-glow">{glow}</g>
    </svg>
  );
}
