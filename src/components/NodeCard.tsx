import type { NodeType } from '../types/node';
import './NodeCard.css';

const LABELS: Record<NodeType, string> = {
  MATCH: 'Match',
  SPONSOR: 'Sponsor',
  TRANSFER_OFFER: 'Transfer',
  INJURY_RISK: 'Verletzung',
  MEDIA_EVENT: 'Medien',
  TRAINING_CAMP: 'Training',
  AGENT_MEETING: 'Agent',
  RIVAL_CHALLENGE: 'Rivale',
  REST: 'Pause',
};

const ICONS: Record<NodeType, string> = {
  MATCH: '⚽',
  SPONSOR: '💼',
  TRANSFER_OFFER: '📝',
  INJURY_RISK: '🏥',
  MEDIA_EVENT: '📺',
  TRAINING_CAMP: '🏋️',
  AGENT_MEETING: '🤝',
  RIVAL_CHALLENGE: '🔥',
  REST: '😴',
};

interface Props {
  type: NodeType;
  available: boolean;
  visited?: boolean;
  current?: boolean;
  onClick: () => void;
}

export function NodeCard({
  type,
  available,
  visited,
  current,
  onClick,
}: Props) {
  const className = [
    'node-card',
    available ? 'available' : '',
    visited ? 'visited' : '',
    current ? 'current' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      disabled={!available}
      onClick={onClick}
      title={LABELS[type]}
    >
      <span className="node-icon" aria-hidden>
        {ICONS[type]}
      </span>
      <span className="node-label">{LABELS[type]}</span>
    </button>
  );
}
