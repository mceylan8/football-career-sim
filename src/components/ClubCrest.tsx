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

/** Pixel crest generated from the club id: stable colours + initials. */
export function ClubCrest({ club, size = 72 }: Props) {
  const h = club ? hash(club.id) : 0;
  const hue = h % 360;
  const main = club ? `hsl(${hue} 70% 45%)` : '#bbb';
  const band = club ? `hsl(${(hue + 160) % 360} 85% 60%)` : '#ddd';
  const text = club ? initials(club.name) : '?';
  const fs = text.length >= 3 ? 5.4 : 6.6;

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
      <path d={SHIELD} fill="var(--ink)" />
      <g transform="translate(2 1.8) scale(.75)">
        <path d={SHIELD} fill={main} />
        <rect x="1" y="5" width="14" height="3" fill={band} opacity=".9" />
      </g>
      <text
        x="8"
        y="8.9"
        textAnchor="middle"
        fontFamily="var(--f-u)"
        fontSize={fs}
        fontWeight="700"
        fill="var(--ink)"
      >
        {text}
      </text>
    </svg>
  );
}
