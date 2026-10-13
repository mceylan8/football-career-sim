import { colorsFor } from './crestUtil';
import type { Club } from '../types/club';

export type AvatarTalent = 'wunderkind' | 'top' | 'solid' | 'late' | string;

/**
 * 14 x 18 pixel sprite. Letters:
 * s skin, e eyes, j shirt, k shorts, w socks, b boots, h hair, l laurel,
 * c cap, p pom-pom, z sleep "z", g glowing boots, . empty
 */
const BODY = [
  '..............', // 0
  '..............', // 1
  '..............', // 2
  '..............', // 3
  '....ssssss....', // 4
  '....sesses....', // 5
  '....ssssss....', // 6
  '.....ssss.....', // 7
  '...jjjjjjjj...', // 8
  '..sjjjjjjjjs..', // 9
  '..sjjjjjjjjs..', // 10
  '...jjjjjjjj...', // 11
  '....kkkkkk....', // 12
  '....kk..kk....', // 13
  '....ss..ss....', // 14
  '....ww..ww....', // 15
  '...bbb..bbb...', // 16
  '..............', // 17
];

/** Rows overlaid on top of BODY ('.' keeps what is below). */
const OVERLAY: Record<string, Record<number, string>> = {
  solid: {
    2: '....hhhhhh....',
    3: '...hhhhhhhh...',
    4: '...hssssssh...',
  },
  top: {
    0: '...h..hh..h...',
    1: '...hhhhhhhhh..',
    2: '..hhhhhhhhhh..',
    3: '...hhhhhhhh...',
    4: '...hssssssh...',
    16: '...ggg..ggg...',
    17: '...ggg..ggg...',
  },
  wunderkind: {
    1: '...llyllyll...',
    2: '..ll.hhhh.ll..',
    3: '..lhhhhhhhhl..',
    4: '..l.ssssss.l..',
    5: '..l.sesses.l..',
    6: '...lssssssl...',
    7: '....lssssl....',
  },
  late: {
    0: 'pp.........zzz',
    1: '.ccccc......z.',
    2: '...ccccccc.zzz',
    3: '...qqqqqqqq...',
  },
};

const HAIR: Record<string, string> = {
  solid: '#5a3a22',
  top: '#2fd4ff',
  wunderkind: '#5a3a22',
};

function paint(talent: string, ch: string, shirt: string, shorts: string): string | null {
  switch (ch) {
    case 's': return '#f2c28b';
    case 'e': return '#1d1b3a';
    case 'j': return shirt;
    case 'k': return shorts;
    case 'w': return shirt;
    case 'y': return '#ffd23f';
    case 'q': return '#9ad0ff';
    case 'b': return '#1d1b3a';
    case 'h': return HAIR[talent] ?? '#5a3a22';
    case 'l': return '#3fa34d';
    case 'c': return '#5b4bd6';
    case 'p': return '#ff7ab6';
    case 'z': return '#ffd23f';
    case 'g': return '#7dffef';
    default: return null;
  }
}

function sprite(talent: string): string[] {
  const o = OVERLAY[talent] ?? OVERLAY.solid;
  return BODY.map((row, i) => {
    const over = o[i];
    if (!over) return row;
    return row
      .split('')
      .map((c, x) => (over[x] && over[x] !== '.' ? over[x] : c))
      .join('');
  });
}

interface Props {
  talent: AvatarTalent;
  club: Club | null;
  size?: number;
}

/** Tiny retro figure; shirt colours come from the club. */
export function PlayerAvatar({ talent, club, size = 64 }: Props) {
  const [primary, secondary] = club ? colorsFor(club) : ['#e63946', '#ffd23f'];
  const rows = sprite(talent);
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const fill = paint(talent, ch, primary, secondary);
      if (!fill) continue;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1.02}
          height={1.02}
          fill={fill}
          className={ch === 'g' ? 'av-glow' : undefined}
        />,
      );
    }
  });
  return (
    <svg
      className={`avatar av-${talent}`}
      viewBox="0 0 14 18"
      width={size * (14 / 18)}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Spielerfigur ${talent}`}
    >
      {rects}
    </svg>
  );
}
