import { useState } from 'react';
import { POSITION_LIST, RANDOM_NAMES } from '../data/positions';
import type { CareerSetup } from '../state/careerStore';
import type { Position } from '../types/player';
import { ClubPicker } from './ClubPicker';
import './Setup.css';

type Step = 'name' | 'position' | 'club';
const STEPS: Step[] = ['name', 'position', 'club'];
const STEP_LABEL: Record<Step, string> = {
  name: 'Name',
  position: 'Position',
  club: 'Verein',
};
const NAME_KEY = 'fcs-last-name';

function lastName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

interface Props {
  onDone: (setup: CareerSetup) => void;
  onCancel: () => void;
}

/** Career "login": name → position → club. */
export function Setup({ onDone, onCancel }: Props) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState(lastName);
  const [position, setPosition] = useState<Position | null>(null);
  const idx = STEPS.indexOf(step);
  const cleanName = name.trim();

  const back = () => (idx === 0 ? onCancel() : setStep(STEPS[idx - 1]));

  const finish = (clubId?: string) => {
    try {
      localStorage.setItem(NAME_KEY, cleanName);
    } catch {
      /* ignore */
    }
    onDone({ name: cleanName, position: position ?? undefined, clubId });
  };

  return (
    <section className="setup">
      <ol className="stepbar" aria-label="Fortschritt">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`t-label${i === idx ? ' on' : ''}${i < idx ? ' done' : ''}`}
          >
            <span className="t-num">{i + 1}</span> {STEP_LABEL[s]}
          </li>
        ))}
      </ol>

      {step === 'name' ? (
        <div className="step">
          <div className="step-head">
            <h2>WIE HEISST DU?</h2>
            <p>So steht dein Name auf der Spielerkarte.</p>
          </div>
          <div className="step-body">
            <label className="t-label" htmlFor="player-name">
              Spielername
            </label>
            <input
              id="player-name"
              className="name-input"
              value={name}
              maxLength={16}
              autoComplete="off"
              placeholder="Dein Name"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && cleanName.length >= 2) setStep('position');
              }}
            />
            <button
              type="button"
              className="mini dark"
              onClick={() =>
                setName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)])
              }
            >
              ZUFÄLLIGER NAME
            </button>
          </div>
          <div className="step-foot">
            <button
              type="button"
              className="pbtn"
              disabled={cleanName.length < 2}
              onClick={() => setStep('position')}
            >
              Weiter
            </button>
            <button type="button" className="mini dark" onClick={back}>
              ABBRECHEN
            </button>
          </div>
        </div>
      ) : null}

      {step === 'position' ? (
        <div className="step">
          <div className="step-head">
            <h2>DEINE POSITION</h2>
            <p>Sie bestimmt, wo du am Anfang stark bist.</p>
          </div>
          <div className="step-body pos-grid">
            {POSITION_LIST.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`pos${position === p.id ? ' on' : ''}`}
                aria-pressed={position === p.id}
                onClick={() => setPosition(p.id)}
              >
                <span className="pos-code t-label">{p.label}</span>
                <span className="pos-txt">
                  <b>{p.name}</b>
                  <span>{p.desc}</span>
                </span>
                <span className="pos-bias">
                  {Object.entries(p.bias).map(([k, v]) => (
                    <span key={k} className="bias">
                      <span className="t-num">+{v}</span>{' '}
                      <span className="t-label">
                        {k === 'tech' ? 'TEC' : k === 'phys' ? 'PHY' : 'MEN'}
                      </span>
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
          <div className="step-foot">
            <button
              type="button"
              className="pbtn"
              disabled={!position}
              onClick={() => setStep('club')}
            >
              Weiter
            </button>
            <button type="button" className="mini dark" onClick={back}>
              ZURÜCK
            </button>
          </div>
        </div>
      ) : null}

      {step === 'club' ? <ClubPicker onPick={finish} onBack={back} /> : null}
    </section>
  );
}
