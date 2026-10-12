import { useCareerStore } from '../state/careerStore';
import './Feed.css';

/** Scrollable match/event report, newest entry on top. */
export function Feed() {
  const log = useCareerStore((s) => s.log);
  if (log.length === 0) return null;
  const entries = [...log].reverse();

  return (
    <section className="feed" aria-label="Spielbericht">
      <h2 className="t-label">Spielbericht</h2>
      <ol className="feed-list" tabIndex={0}>
        {entries.map((e) => (
          <li key={e.id} className={`fe ${e.tone}`}>
            <div className="fe-head">
              <span className="fe-tag t-label">{e.tag}</span>
              <span className="fe-when t-num">
                S{e.season} · W{e.week}
              </span>
            </div>
            <div className="fe-title">{e.title}</div>
            {e.text ? <div className="fe-text">{e.text}</div> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
