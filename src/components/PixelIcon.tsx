import type { NodeType } from '../types/node';

const BITMAPS: Record<NodeType, string[]> = {
  MATCH: ['..XXX..', '.X...X.', 'X..X..X', 'X.XXX.X', 'X..X..X', '.X...X.', '..XXX..'],
  SPONSOR: ['..XXX..', 'XXXXXXX', 'X.....X', 'XXXXXXX', 'X..X..X', 'X.....X', 'XXXXXXX'],
  TRANSFER_OFFER: ['.XXXXX.', '.X...X.', '.X.X.X.', '.X...X.', '.X.X.X.', '.X...X.', '.XXXXX.'],
  INJURY_RISK: ['..XXX..', '..XXX..', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '..XXX..', '..XXX..'],
  MEDIA_EVENT: ['XXXXXXX', 'X.....X', 'X.....X', 'X.....X', 'XXXXXXX', '..XXX..', '.XXXXX.'],
  TRAINING_CAMP: ['.X...X.', 'XX...XX', 'XXXXXXX', 'XX...XX', '.X...X.'],
  AGENT_MEETING: ['..XXX..', '..XXX..', '...X...', '.XXXXX.', 'X.XXX.X', '..X.X..', '..X.X..'],
  RIVAL_CHALLENGE: ['...X...', '..XX...', '..XXX..', '.XXXXX.', '.XXXXX.', '..XXX..'],
  REST: ['..XXX..', '.XX....', 'XX.....', 'XX.....', '.XX....', '..XXX..'],
};

interface Props {
  type: NodeType;
  color?: string;
}

export function PixelIcon({ type, color = '#fff' }: Props) {
  const rows = BITMAPS[type];
  return (
    <svg
      viewBox={`0 0 7 ${rows.length}`}
      width="20"
      height={(20 * rows.length) / 7}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === 'X' ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} />
          ) : null,
        ),
      )}
    </svg>
  );
}
