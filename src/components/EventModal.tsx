import type { ActiveEvent } from '../types/event';
import './EventModal.css';

interface Props {
  active: ActiveEvent;
  onChoose: (index: number) => void;
}

export function EventModal({ active, onChoose }: Props) {
  const { event, context } = active;

  return (
    <div className="event-modal-backdrop" role="dialog" aria-modal="true">
      <div className="event-modal">
        <h2>{event.title}</h2>
        {context ? <p className="event-context">{context}</p> : null}
        <p className="event-desc">{event.description}</p>
        <div className="event-choices">
          {event.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              className="event-choice"
              onClick={() => onChoose(i)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
