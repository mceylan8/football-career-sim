import { useState } from 'react';
import { useCareerStore } from '../state/careerStore';
import { Digits } from './Digits';
import './Feed.css';

/** Scrollable match/event report, newest entry on top. */
export function Feed({ className = '', limit }: { className?: string; limit?: number }) {
  const log = useCareerStore((s) => s.log);
  const [all, setAll] = useState(false);
  if (log.length === 0) return null;
  const newest = [...log].reverse();
  const capped = limit !== undefined && !all && newest.length > limit;
  const entries = capped ? newest.slice(0, limit) : newest;

  return (
    <section className={`feed ${className}`} aria-label="Spielbericht">
      <h2 className="t-label">Spielbericht</h2>
      <ol className="feed-list">
        {entries.map((e) => (
          <li key={e.id} className={`fe ${e.tone}`}>
            <div className="fe-head">
              <span className="fe-tag t-label">{e.tag}</span>
              <span className="fe-when t-num">
                S{e.season} · {e.md ? `ST ${e.md}` : `W${e.week}`}
              </span>
            </div>
            <div className="fe-title">
              <Digits>{e.title}</Digits>
            </div>
            {e.text ? (
              <div className="fe-text">
                <Digits>{e.text}</Digits>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      {limit !== undefined && newest.length > limit ? (
        <button type="button" className="mini dark feed-more" onClick={() => setAll(!all)}>
          {all ? 'Weniger anzeigen' : `Mehr anzeigen (${newest.length - limit})`}
        </button>
      ) : null}
    </section>
  );
}
