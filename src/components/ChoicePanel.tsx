import { useCareerStore } from '../state/careerStore';
import { useLocalPref } from '../state/useLocalPref';
import { Digits } from './Digits';
import { NodeCard } from './NodeCard';
import './ChoicePanel.css';

/** Bottom panel: next-step cards, or the active event with its choices. */
export function ChoicePanel() {
  const seasonMap = useCareerStore((s) => s.seasonMap);
  const activeEvent = useCareerStore((s) => s.activeEvent);
  const selectNode = useCareerStore((s) => s.selectNode);
  const resolveChoice = useCareerStore((s) => s.resolveChoice);
  const [collapsedPref, setCollapsed] = useLocalPref('panel-collapsed', false);

  // An open event always shows, even if the panel was collapsed.
  const collapsed = collapsedPref && !activeEvent;

  if (!seasonMap && !activeEvent) return null;

  const nodes = seasonMap
    ? seasonMap.rows.flat().filter((n) => seasonMap.availableNodeIds.includes(n.id))
    : [];

  const title = activeEvent ? 'Ereignis' : 'Nächster Schritt';

  return (
    <section className="panel" aria-live="polite">
      <div className="panel-head">
        <h2 className="t-label">
          {title}
          {!activeEvent ? <span className="t-num"> · {nodes.length}</span> : null}
        </h2>
        {!activeEvent ? (
          <button
            type="button"
            className="chev"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Auswahl ausklappen' : 'Auswahl einklappen'}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? '▴' : '▾'}
          </button>
        ) : null}
      </div>

      {!collapsed && activeEvent ? (
        <>
          <div className="event">
            <b>
              <Digits>{activeEvent.event.title}</Digits>
            </b>
            {activeEvent.context ? (
              <p className="ctx">
                <Digits>{activeEvent.context}</Digits>
              </p>
            ) : null}
            <p>
              <Digits>{activeEvent.event.description}</Digits>
            </p>
          </div>
          {activeEvent.event.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              className="choice plain"
              onClick={() => resolveChoice(i)}
            >
              <span className="t">
                <b>
                  <Digits>{choice.label}</Digits>
                </b>
              </span>
            </button>
          ))}
        </>
      ) : null}

      {!collapsed && !activeEvent
        ? nodes.map((n) => (
            <NodeCard key={n.id} type={n.type} onClick={() => selectNode(n.id)} />
          ))
        : null}
    </section>
  );
}
