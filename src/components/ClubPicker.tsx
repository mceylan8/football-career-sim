import { useState } from 'react';
import { nationById, type NationId } from '../data/nations';
import {
  START_SIZE_HINT,
  START_SIZE_LABEL,
  type StartOffer,
} from '../engine/startClubs';
import { ClubCrest } from './ClubCrest';
import { Digits } from './Digits';
import { PixelFlag } from './PixelFlag';
import './ClubPicker.css';

interface Props {
  nation: NationId;
  /** The three offers, drawn once in Setup so they survive going back and forth. */
  offers: StartOffer[];
  onPick: (clubId: string) => void;
  onBack: () => void;
}

/** Three clubs from the top league of your nationality: small, mid-table, big. */
export function ClubPicker({ nation, offers, onPick, onBack }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const info = nationById(nation);
  const chosen = offers.find((o) => o.club.id === selected)?.club;

  return (
    <section className="picker">
      <div className="picker-head">
        <h2>WÄHLE DEINEN VEREIN</h2>
        <p className="picker-nation">
          <PixelFlag nation={nation} width={28} />
          <span>
            <Digits>{`${info?.name ?? ''} · ${info?.league ?? ''}`}</Digits>
          </span>
        </p>
        <p>Du bist 16 und startest in der Zweiten des Klubs. Drei Angebote, ein Klub.</p>
      </div>

      <div className="picker-list">
        {offers.map(({ size, club }) => (
          <button
            key={club.id}
            type="button"
            className={`pick${club.id === selected ? ' on' : ''}`}
            aria-pressed={club.id === selected}
            onClick={() => setSelected(club.id)}
          >
            <ClubCrest club={club} size={48} />
            <span className="nm">
              <b>
                <Digits>{club.name}</Digits>
              </b>
              <span className="size t-label">{START_SIZE_LABEL[size]}</span>
              <span className="hint">{START_SIZE_HINT[size]}</span>
            </span>
            <span className="t-num r">{club.rating}</span>
          </button>
        ))}
      </div>

      <div className="picker-foot">
        <button
          type="button"
          className="pbtn"
          disabled={!chosen}
          onClick={() => chosen && onPick(chosen.id)}
        >
          {chosen ? `Zu ${chosen.name}` : 'Verein wählen'}
        </button>
        <div className="row2">
          <button
            type="button"
            className="mini dark"
            onClick={() => onPick(offers[Math.floor(Math.random() * offers.length)].club.id)}
          >
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
