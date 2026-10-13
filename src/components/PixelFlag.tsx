import type { NationId } from '../data/nations';

/** Flags as tiny pixel grids (24 x 16), drawn with plain rects. */
const W = 24;
const H = 16;

interface R {
  x: number;
  y: number;
  w: number;
  h: number;
  c: string;
}

const hStripes = (cols: string[], weights = cols.map(() => 1)): R[] => {
  const total = weights.reduce((a, b) => a + b, 0);
  let y = 0;
  return cols.map((c, i) => {
    const h = (H * weights[i]) / total;
    const r = { x: 0, y, w: W, h, c };
    y += h;
    return r;
  });
};

const vStripes = (cols: string[]): R[] =>
  cols.map((c, i) => ({ x: (W / cols.length) * i, y: 0, w: W / cols.length, h: H, c }));

const FLAGS: Record<NationId, R[]> = {
  DE: hStripes(['#1d1b3a', '#d93a2b', '#ffd23f']),
  FR: vStripes(['#2a4fb5', '#ffffff', '#d93a2b']),
  IT: vStripes(['#2f9a4a', '#ffffff', '#d93a2b']),
  ES: hStripes(['#c8372d', '#ffd23f', '#c8372d'], [1, 2, 1]),
  EN: [
    { x: 0, y: 0, w: W, h: H, c: '#ffffff' },
    { x: 10, y: 0, w: 4, h: H, c: '#d93a2b' },
    { x: 0, y: 6, w: W, h: 4, c: '#d93a2b' },
  ],
  TR: [
    { x: 0, y: 0, w: W, h: H, c: '#d93a2b' },
    // crescent
    { x: 7, y: 4, w: 6, h: 8, c: '#ffffff' },
    { x: 9, y: 5, w: 5, h: 6, c: '#d93a2b' },
    // star
    { x: 14, y: 7, w: 2, h: 2, c: '#ffffff' },
  ],
};

interface Props {
  nation: NationId;
  width?: number;
}

export function PixelFlag({ nation, width = 36 }: Props) {
  return (
    <svg
      className="pixel-flag"
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={(width * H) / W}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {FLAGS[nation].map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.c} />
      ))}
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} fill="none" stroke="#1d1b3a" strokeWidth="1" />
    </svg>
  );
}
