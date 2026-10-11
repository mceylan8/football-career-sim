import type { NodeType } from '../types/node';
import { PixelIcon } from './PixelIcon';

interface Meta {
  label: string;
  desc: string;
  chip: string;
  color: string;
  dark?: boolean;
}

const META: Record<NodeType, Meta> = {
  MATCH: { label: 'MATCH', desc: 'Spieltag gegen einen Gegner', chip: '+FORM', color: 'var(--red)' },
  SPONSOR: { label: 'SPONSOR', desc: 'Ein Deal wartet auf dich', chip: '+€', color: 'var(--yellow)', dark: true },
  TRANSFER_OFFER: { label: 'TRANSFER', desc: 'Ein Klub meldet sich', chip: 'ANGEBOT', color: 'var(--blue)' },
  INJURY_RISK: { label: 'RISIKO', desc: 'Hartes Spiel, Verletzung droht', chip: 'GEFAHR', color: 'var(--red)' },
  MEDIA_EVENT: { label: 'MEDIEN', desc: 'Kameras und Mikrofone', chip: 'RUF', color: 'var(--blue)' },
  TRAINING_CAMP: { label: 'TRAINING', desc: 'Stats verbessern', chip: '+STATS', color: 'var(--blue)' },
  AGENT_MEETING: { label: 'AGENT', desc: 'Gespräch über deine Zukunft', chip: 'VERTRAG', color: 'var(--yellow)', dark: true },
  RIVAL_CHALLENGE: { label: 'RIVALE', desc: 'Ein Duell um Reputation', chip: 'DUELL', color: 'var(--red)' },
  REST: { label: 'PAUSE', desc: 'Kräfte sammeln', chip: 'ERHOLUNG', color: 'var(--grass)' },
};

interface Props {
  type: NodeType;
  disabled?: boolean;
  onClick: () => void;
}

export function NodeCard({ type, disabled, onClick }: Props) {
  const m = META[type];
  return (
    <button
      type="button"
      className="choice"
      style={{ ['--k' as string]: m.color }}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="ic">
        <PixelIcon type={type} color={m.dark ? '#1d1b3a' : '#fff'} />
      </span>
      <span className="t">
        <b>{m.label}</b>
        <span>{m.desc}</span>
      </span>
      <span className={`chip u${m.dark ? ' dk' : ''}`}>{m.chip}</span>
    </button>
  );
}
