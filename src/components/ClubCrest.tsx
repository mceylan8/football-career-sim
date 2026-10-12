import { useId } from 'react';
import { CREST_COLORS } from '../data/crestColors';
import type { Club } from '../types/club';

interface Props {
  club: Club | null;
  size?: number;
}

const SKIP = new Set(['FC', 'SV', 'VfB', 'VfL', 'SC', 'AC', 'AS', 'RC', 'CF']);

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => !SKIP.has(w));
  const list = words.length ? words : [name];
  if (list.length === 1) return list[0].slice(0, 3).toUpperCase();
  return list
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// Stepped (pixel) shield, 16 x 18 grid.
const SHIELD =
  'M1 0h14v10h-1v2h-1v2h-2v1h-2v1h-2v-1h-2v-1h-2v-2h-1v-2h-1z';

type Pattern = 'band' | 'halves' | 'stripes' | 'top';
const PATTERNS: Pattern[] = ['band', 'halves', 'stripes', 'top'];

/** Real club colours if known, otherwise a stable colour pair from the id. */
function colorsFor(club: Club): [string, string] {
  const known = CREST_COLORS[club.id];
  if (known) return known;
  const h = hash(club.id) % 360;
  return [`hsl(${h} 70% 45%)`, `hsl(${(h + 160) % 360} 85% 60%)`];
}

/** Pixel crest: club colours + pattern (picked per club) + initials. */
export function ClubCrest({ club, size = 72 }: Props) {
  const clipId = useId();
  const [main, band] = club ? colorsFor(club) : ['#bbbbbb', '#dddddd'];
  const pattern = club ? PATTERNS[hash(club.id) % PATTERNS.length] : 'band';
  const text = club ? initials(club.name) : '?';
  const fs = text.length >= 3 ? 4.6 : 6.4;

  return (
    <svg
      viewBox="0 0 16 18"
      width={size}
      height={size * 1.125}
      role="img"
      aria-label={club ? `Wappen ${club.name}` : 'Kein Verein'}
      shapeRendering="crispEdges"
      style={{ flex: 'none' }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={SHIELD} transform="translate(2 1.8) scale(.75)" />
        </clipPath>
      </defs>
      <path d={SHIELD} fill="var(--ink)" />
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="16" height="18" fill={main} />
        {pattern === 'band' ? <rect x="0" y="6.5" width="16" height="4" fill={band} /> : null}
        {pattern === 'top' ? <rect x="0" y="0" width="16" height="6" fill={band} /> : null}
        {pattern === 'halves' ? <rect x="8" y="0" width="8" height="18" fill={band} /> : null}
        {pattern === 'stripes' ? (
          <>
            <rect x="3.5" y="0" width="3" height="18" fill={band} />
            <rect x="9.5" y="0" width="3" height="18" fill={band} />
          </>
        ) : null}
      </g>
      <text
        x="8"
        y="8.9"
        textAnchor="middle"
        fontFamily="var(--f-u)"
        fontSize={fs}
        fontWeight="700"
        fill="#fff6dc"
        stroke="#1d1b3a"
        strokeWidth="0.9"
        paintOrder="stroke"
      >
        {text}
      </text>
    </svg>
  );
}
