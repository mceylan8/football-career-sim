import { useCareerStore } from '../state/careerStore';
import { NodeCard } from './NodeCard';
import './ChoicePanel.css';

/** Bottom panel: next-step cards, or the active event with its choices. */
export function ChoicePanel() {
  const seasonMap = useCareerStore((s) => s.seasonMap);
  const activeEvent = useCareerStore((s) => s.activeEvent);
  const lastMatchSummary = useCareerStore((s) => s.lastMatchSummary);
  const selectNode = useCareerStore((s) => s.selectNode);
  const resolveChoice = useCareerStore((s) => s.resolveChoice);

  if (activeEvent) {
    const { event, context } = activeEvent;
    return (
      <section className="panel" aria-live="polite">
        <h2 className="u">Ereignis</h2>
        <div className="event">
          <b>{event.title}</b>
          {context ? <p className="ctx">{context}</p> : null}
          <p>{event.description}</p>
        </div>
        {event.choices.map((choice, i) => (
          <button
            key={i}
            type="button"
            className="choice plain"
            onClick={() => resolveChoice(i)}
          >
            <span className="t">
              <b>{choice.label}</b>
            </span>
          </button>
        ))}
      </section>
    );
  }

  if (!seasonMap) return null;

  const nodes = seasonMap.rows
    .flat()
    .filter((n) => seasonMap.availableNodeIds.includes(n.id));

  return (
    <section className="panel">
      <h2 className="u">Nächster Schritt</h2>
      {lastMatchSummary ? (
        <p className="last u">Letztes Spiel: {lastMatchSummary}</p>
      ) : null}
      {nodes.map((n) => (
        <NodeCard key={n.id} type={n.type} onClick={() => selectNode(n.id)} />
      ))}
    </section>
  );
}
