import { SPRITES, SPRITE_H, SPRITE_W } from './avatarSprites';
import { colorsFor } from './crestUtil';
import type { Club } from '../types/club';

export type AvatarTalent = 'wunderkind' | 'top' | 'solid' | 'late' | string;

/**
 * Letters: o outline, s/S skin, e eye, R mouth, j/J shirt, a/A stripes, k/K shorts,
 * w/W socks, b/B boots, u laces, h/H/i hair, l/L laurel, y gold, c/C cap,
 * q cap band, p pom-pom, z sleep "z", g glowing boots, f/t ball.
 */
/** Boot colours per talent: [upper, sole/trim]. */
const BOOTS: Record<string, [string, string]> = {
  solid: ['#34344a', '#1d1d30'],
  late: ['#5f8f8a', '#b0714f'],
};

const HAIR: Record<string, string> = {
  solid: '#5a3a22',
  top: '#1d3f9e',
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
  const [boot, sole] = BOOTS[talent] ?? ['#ffd23f', '#d19a00'];
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
    b: boot,
    B: sole,
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
    g: '#ffd23f',
    f: '#ffffff',
    t: '#1d1b3a',
  };
}

interface Props {
  talent: AvatarTalent;
  club: Club | null;
  size?: number;
}

/** Retro footballer with a pose per talent; striped shirt in the club colours. */
export function PlayerAvatar({ talent, club, size = 72 }: Props) {
  const [primary, secondary] = club ? colorsFor(club) : ['#e63946', '#ffd23f'];
  const pal = palette(talent, primary, secondary);
  const rows = SPRITES[talent] ?? SPRITES.solid;
  const rects: React.ReactNode[] = [];
  const glow: React.ReactNode[] = [];
  const gold: React.ReactNode[] = [];
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
      (ch === 'g' ? glow : ch === 'l' || ch === 'L' || ch === 'y' ? gold : rects).push(
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
      {talent === 'wunderkind' && (
        <g className="av-aura" aria-hidden="true">
          <defs>
            <radialGradient id="aura-g" cx="50%" cy="55%" r="55%">
              <stop offset="0%" stopColor="#ffd23f" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#ffd23f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="19" cy="27" rx="17" ry="24" fill="url(#aura-g)" />
          <path
            d="M19 0 L22 9 L27 3 L27 13 L34 8 L31 20 L38 18 L32 30 L36 40 L28 38 L24 48 L19 41 L14 48 L10 38 L2 40 L6 30 L0 18 L7 20 L4 8 L11 13 L11 3 L16 9 Z"
            fill="#ffd23f"
            opacity="0.22"
          />
        </g>
      )}
      <g className="av-all">
        {rects}
        <g className="av-glow">{glow}</g>
        <g className="av-laurel">{gold}</g>
      </g>
    </svg>
  );
}
