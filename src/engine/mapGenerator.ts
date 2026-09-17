import type { NodeType, SeasonMap, SeasonNode } from '../types/node';

const NODE_POOL: NodeType[] = [
  'MATCH',
  'MATCH',
  'MATCH',
  'SPONSOR',
  'TRANSFER_OFFER',
  'INJURY_RISK',
  'MEDIA_EVENT',
  'TRAINING_CAMP',
  'AGENT_MEETING',
  'RIVAL_CHALLENGE',
  'REST',
];

function pickType(preferMatch: boolean): NodeType {
  if (preferMatch && Math.random() < 0.55) return 'MATCH';
  return NODE_POOL[Math.floor(Math.random() * NODE_POOL.length)];
}

/**
 * Generates a simple season map: 4 rows, 2–3 nodes per middle row.
 * Row 0 = start (REST), last row = season finale MATCH.
 */
export function generateSeasonMap(season: number): SeasonMap {
  const rowCount = 4;
  const rows: SeasonNode[][] = [];

  for (let r = 0; r < rowCount; r++) {
    const count =
      r === 0 || r === rowCount - 1 ? 1 : 2 + Math.floor(Math.random() * 2);
    const row: SeasonNode[] = [];
    for (let i = 0; i < count; i++) {
      const type: NodeType =
        r === 0
          ? 'REST'
          : r === rowCount - 1
            ? 'MATCH'
            : pickType(true);
      row.push({
        id: `s${season}-r${r}-n${i}`,
        type,
        row: r,
        connections: [],
      });
    }
    rows.push(row);
  }

  for (let r = 0; r < rowCount - 1; r++) {
    const current = rows[r];
    const next = rows[r + 1];
    for (const node of current) {
      const targets =
        next.length <= 2
          ? next.map((n) => n.id)
          : next
              .slice()
              .sort(() => Math.random() - 0.5)
              .slice(0, 2)
              .map((n) => n.id);
      node.connections = targets;
    }
  }

  const start = rows[0][0];
  return {
    rows,
    currentNodeId: start.id,
    availableNodeIds: start.connections.slice(),
  };
}

export function findNode(
  map: SeasonMap,
  id: string,
): SeasonNode | undefined {
  for (const row of map.rows) {
    const found = row.find((n) => n.id === id);
    if (found) return found;
  }
  return undefined;
}
