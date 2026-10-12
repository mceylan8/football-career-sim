import { useState } from 'react';
import { STARTER_CLUBS } from '../state/careerStore';
import { ClubCrest } from './ClubCrest';
import { Digits } from './Digits';
import './ClubPicker.css';

interface Props {
  onPick: (clubId?: string) => void;
  onBack: () => void;
}

const LEAGUES = [...new Set(STARTER_CLUBS.map((c) => c.league))];

export function ClubPicker({ onPick, onBack }: Props) {
  const [league, setLeague] = useState(LEAGUES[0]);
  const [selected, setSelected] = useState<string | null>(null);
  const list = STARTER_CLUBS.filter((c) => c.league === league).sort(
    (a, b) => b.rating - a.rating,
  );
  const chosen = STARTER_CLUBS.find((c) => c.id === selected);

  return (
    <section className="picker">
      <div className="picker-head">
        <h2>WÄHLE DEINEN VEREIN</h2>
        <p>Du bist 16 und startest in der Jugend dieses Klubs.</p>
        <div className="tabs" role="tablist">
          {LEAGUES.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={l === league}
              className={`tab t-label${l === league ? ' on' : ''}`}
              onClick={() => setLeague(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="picker-list">
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`pick${c.id === selected ? ' on' : ''}`}
            onClick={() => setSelected(c.id)}
          >
            <ClubCrest club={c} size={40} />
            <span className="nm">
              <Digits>{c.name}</Digits>
            </span>
            <span className="t-num r">{c.rating}</span>
          </button>
        ))}
      </div>

      <div className="picker-foot">
        <button type="button" className="pbtn" disabled={!chosen} onClick={() => onPick(chosen?.id)}>
          {chosen ? `Zu ${chosen.name}` : 'Verein wählen'}
        </button>
        <div className="row2">
          <button type="button" className="mini dark" onClick={() => onPick()}>
            ZUFÄLLIG
          </button>
          <button type="button" className="mini dark" onClick={onBack}>
            ZURÜCK
          </button>
        </div>
      </div>
    </section>
  );
}
