import { useId } from 'react';
import { SPRITES, SPRITE_H, SPRITE_W } from './avatarSprites';
import { colorsFor } from './crestUtil';
import type { Club } from '../types/club';

export type AvatarTalent = 'wunderkind' | 'top' | 'solid' | 'late' | string;

/** Short reaction played once on top of the idle loop. */
export type AvatarMood = 'idle' | 'cheer' | 'sad' | 'hurt';

/** Burst colours for the reveal, per talent. */
const BURST: Record<string, string[]> = {
  wunderkind: ['#ffd23f', '#ffffff', '#ffe27a'],
  top: ['#6aa7ff', '#ffd23f', '#ffffff'],
  solid: ['#fff6dc', '#ffc08a'],
  late: ['#9ad0ff', '#5f8f8a', '#fff6dc'],
};
const BURST_COUNT: Record<string, number> = { wunderkind: 16, top: 12, solid: 8, late: 8 };

/** Spots for the twinkling crosses of the top talent (empty sprite pixels). */
const TWINKLES: [number, number][] = [
  [3, 12],
  [37, 18],
  [36, 31],
];

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
  /** One-off reaction (cheer after a win, sad after a loss, hurt on injury). */
  mood?: AvatarMood;
  /** Pop-in with a particle burst, used by the talent reveal. */
  reveal?: boolean;
  /** Short flicker, used when the shirt changes (transfer). */
  swap?: boolean;
}

/** Retro footballer with a pose per talent; striped shirt in the club colours. */
export function PlayerAvatar({
  talent,
  club,
  size = 72,
  mood = 'idle',
  reveal = false,
  swap = false,
}: Props) {
  const gid = `aura-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [primary, secondary] = club ? colorsFor(club) : ['#e63946', '#ffd23f'];
  const pal = palette(talent, primary, secondary);
  const rows = SPRITES[talent] ?? SPRITES.solid;
  const rects: React.ReactNode[] = [];
  const glow: React.ReactNode[] = [];
  const gold: React.ReactNode[] = [];
  const zzz: React.ReactNode[] = [];
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
      (ch === 'g'
        ? glow
        : ch === 'z'
          ? zzz
          : ch === 'l' || ch === 'L' || ch === 'y'
            ? gold
            : rects
      ).push(
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
      className={`avatar av-${talent}${mood !== 'idle' ? ` mood-${mood}` : ''}${reveal ? ' av-reveal' : ''}${swap ? ' av-swap' : ''}`}
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
            <radialGradient id={gid} cx="50%" cy="55%" r="55%">
              <stop offset="0%" stopColor="#ffd23f" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#ffd23f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="19" cy="27" rx="17" ry="24" fill={`url(#${gid})`} />
          <path
            className="av-rays"
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
        {zzz.length ? <g className="av-zzz">{zzz}</g> : null}
      </g>
      {talent === 'top' && (
        <g className="av-twinkles" aria-hidden="true">
          {TWINKLES.map(([cx, cy], i) => (
            <g key={i} className="av-twinkle" style={{ animationDelay: `${i * 0.6}s` }}>
              <rect x={cx} y={cy - 1} width="1" height="3" fill="#fff6dc" />
              <rect x={cx - 1} y={cy} width="3" height="1" fill="#fff6dc" />
            </g>
          ))}
        </g>
      )}
      {reveal && <Burst talent={talent} />}
    </svg>
  );
}

/** Ring of little squares that fly outwards once (reveal). */
function Burst({ talent }: { talent: AvatarTalent }) {
  const colors = BURST[talent] ?? BURST.solid;
  const n = BURST_COUNT[talent] ?? 8;
  const radius = talent === 'wunderkind' ? 30 : 24;
  return (
    <g className="av-burst" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const r = radius * (i % 2 ? 0.7 : 1);
        return (
          <rect
            key={i}
            x="20"
            y="25"
            width="2"
            height="2"
            fill={colors[i % colors.length]}
            style={
              {
                '--dx': Math.round(Math.cos(a) * r),
                '--dy': Math.round(Math.sin(a) * r),
              } as React.CSSProperties
            }
          />
        );
      })}
    </g>
  );
}
