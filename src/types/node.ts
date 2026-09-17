export type NodeType =
  | 'MATCH'
  | 'SPONSOR'
  | 'TRANSFER_OFFER'
  | 'INJURY_RISK'
  | 'MEDIA_EVENT'
  | 'TRAINING_CAMP'
  | 'AGENT_MEETING'
  | 'RIVAL_CHALLENGE'
  | 'REST';

export interface SeasonNode {
  id: string;
  type: NodeType;
  row: number;
  connections: string[];
  data?: Record<string, unknown>;
  visited?: boolean;
}

export interface SeasonMap {
  rows: SeasonNode[][];
  currentNodeId: string | null;
  availableNodeIds: string[];
}
