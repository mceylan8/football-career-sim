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
  MATCH: { label: 'MATCH', desc: 'Schlüsselspiel', chip: 'FORM', color: 'var(--red)' },
  SPONSOR: { label: 'SPONSOR', desc: 'Geld gegen Aufmerksamkeit', chip: '€', color: 'var(--yellow)', dark: true },
  TRANSFER_OFFER: { label: 'TRANSFER', desc: 'Ein Klub meldet sich', chip: 'ANGEBOT', color: 'var(--blue)' },
  INJURY_RISK: { label: 'RISIKO', desc: 'Hartes Spiel, Verletzung droht', chip: 'GEFAHR', color: 'var(--red)' },
  MEDIA_EVENT: { label: 'MEDIEN', desc: 'Interviews, Ruf auf dem Spiel', chip: 'RUF', color: 'var(--blue)' },
  TRAINING_CAMP: { label: 'TRAINING', desc: 'Werte verbessern', chip: 'STATS', color: 'var(--blue)' },
  AGENT_MEETING: { label: 'AGENT', desc: 'Gespräch über deine Zukunft', chip: 'VERTRAG', color: 'var(--yellow)', dark: true },
  RIVAL_CHALLENGE: { label: 'RIVALE', desc: 'Duell um Reputation', chip: 'DUELL', color: 'var(--red)' },
  REST: { label: 'PAUSE', desc: 'Form auffüllen, Kräfte sammeln', chip: 'FORM', color: 'var(--grass)' },
};

interface Props {
  type: NodeType;
  /** Overrides the default description (e.g. the club of a transfer offer). */
  desc?: string;
  disabled?: boolean;
  onClick: () => void;
}

export function NodeCard({ type, desc, disabled, onClick }: Props) {
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
        <span>{desc ?? m.desc}</span>
      </span>
      <span className={`chip t-num${m.dark ? ' dk' : ''}`}>{m.chip}</span>
    </button>
  );
}
