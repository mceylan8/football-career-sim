import { useState, useSyncExternalStore } from 'react';
import { useCareerStore } from '../state/careerStore';
import { matchdayLabel, seasonMatchdays } from '../engine/squad';
import { Digits } from './Digits';
import { NodeCard } from './NodeCard';
import { ClubCrest } from './ClubCrest';
import './ChoicePanel.css';

const WIDE = '(min-width: 1000px)';
function useWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(WIDE);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(WIDE).matches,
  );
}

/** Bottom panel (right column on desktop): next-step cards, or the active event with its choices. */
export function ChoicePanel() {
  const weekPlan = useCareerStore((s) => s.weekPlan);
  const player = useCareerStore((s) => s.player);
  const activeEvent = useCareerStore((s) => s.activeEvent);
  const selectNode = useCareerStore((s) => s.selectNode);
  const resolveChoice = useCareerStore((s) => s.resolveChoice);
  const transferWindow = useCareerStore((s) => s.transferWindow);
  const pickTransfer = useCareerStore((s) => s.pickTransfer);
  // Collapsed only for the current week: every new week starts open.
  const weekKey = `${player.season}-${player.week}`;
  const [collapsedKey, setCollapsedKey] = useState<string | null>(null);
  const collapsedPref = collapsedKey === weekKey;
  const setCollapsed = (v: boolean) => setCollapsedKey(v ? weekKey : null);

  // An open event always shows, even if the panel was collapsed; on desktop it never collapses.
  const wide = useWide();
  const collapsed = collapsedPref && !activeEvent && !wide;

  if (!weekPlan && !activeEvent) return null;

  if (transferWindow) {
    const goodRole = (r: string) => r === 'Stammspieler' || r === 'Rotation';
    return (
      <section className="panel" aria-live="polite">
        <div className="panel-head">
          <h2 className="t-label">Transferfenster</h2>
        </div>
        <div className="event">
          <b>{transferWindow.expired ? 'Dein Vertrag läuft aus' : 'Angebote für dich'}</b>
          <p>
            <Digits>
              {transferWindow.expired
                ? 'Wähle deinen nächsten Klub, sonst ist die Karriere vorbei.'
                : `Vor Saison ${player.season}: wechseln oder bleiben?`}
            </Digits>
          </p>
        </div>
        {transferWindow.options.map((o, i) => (
          <button key={i} type="button" className="choice tw" onClick={() => pickTransfer(i)}>
            <span className="tw-crest">
              <ClubCrest club={o.club} size={40} />
            </span>
            <span className="t">
              <span className="tw-kind t-label">
                {o.kind === 'move' ? 'Wechsel zu' : o.kind === 'extend' ? 'Verlängern bei' : 'Bleiben bei'}
              </span>
              <b>{o.club.name}</b>
              <span>{o.club.league}</span>
              <span className="tw-chips">
                <span className={`tw-chip ${goodRole(o.role) ? 'up' : 'down'}`}>
                  {o.squad === 'reserve' ? `${o.role} · Zweite` : o.role}
                </span>
                <span className="tw-chip">
                  <Digits>{`${o.years} J. · ${o.wage.toLocaleString('de-DE')} €/Wo`}</Digits>
                </span>
              </span>
            </span>
          </button>
        ))}
      </section>
    );
  }

  const seasonLen = seasonMatchdays(player.club);
  const mdText = `${matchdayLabel(player.week, seasonLen)}/${seasonLen}`;
  const nodes = weekPlan?.options ?? [];
  const title = activeEvent
    ? activeEvent.matchOpponentId
      ? 'Spieltag'
      : 'Ereignis'
    : 'Nächste Spieltage';

  return (
    <section className={`panel${collapsed ? ' is-collapsed' : ''}`} aria-live="polite">
      {activeEvent || wide ? (
        <div className="panel-head">
          <h2 className="t-label">
            {title}
            {!activeEvent ? <span className="t-num"> · {mdText}</span> : null}
          </h2>
        </div>
      ) : (
        <button
          type="button"
          className="panel-head panel-toggle"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          <h2 className="t-label">
            {title}
            <span className="t-num"> · {mdText}</span>
          </h2>
          <span className="chev" aria-hidden>
            {collapsed ? '▴ AUF' : '▾ ZU'}
          </span>
        </button>
      )}

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

      {!collapsed && !activeEvent && weekPlan?.keyMatch && weekPlan.opponent ? (
        <p className="keymatch">
          <span className="t-label">Spieltag</span>{' '}
          <Digits>{`Danach wartet ein Schlüsselspiel gegen ${weekPlan.opponent.name}${player.squad === 'reserve' ? ' II' : ''}.`}</Digits>
        </p>
      ) : null}

      {!collapsed && !activeEvent
        ? nodes.map((n) => (
            <NodeCard
              key={n.id}
              type={n.type}
              desc={
                n.offer
                  ? `${n.offer.club.name} · ${n.offer.wage.toLocaleString('de-DE')} €/Wo`
                  : undefined
              }
              onClick={() => selectNode(n.id)}
            />
          ))
        : null}
    </section>
  );
}
