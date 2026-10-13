import { useState } from 'react';
import { NATIONS, type NationId } from '../data/nations';
import { POSITION_LIST, RANDOM_NAMES } from '../data/positions';
import { rollTalent } from '../engine/squad';
import { startOffers, type StartOffer } from '../engine/startClubs';
import { CLUBS, type CareerSetup } from '../state/careerStore';
import type { Position, Talent } from '../types/player';
import { PlayerAvatar } from './PlayerAvatar';
import { PixelFlag } from './PixelFlag';
import { Digits } from './Digits';
import { ClubPicker } from './ClubPicker';
import './Setup.css';

type Step = 'name' | 'position' | 'nation' | 'club' | 'talent';
const STEPS: Step[] = ['name', 'position', 'nation', 'club', 'talent'];
const STEP_LABEL: Record<Step, string> = {
  name: 'Name',
  position: 'Position',
  nation: 'Nation',
  club: 'Verein',
  talent: 'Talent',
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

/** Career "login": name → position → nationality → club (3 offers) → talent. */
export function Setup({ onDone, onCancel }: Props) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState(lastName);
  const [position, setPosition] = useState<Position | null>(null);
  const idx = STEPS.indexOf(step);
  const cleanName = name.trim();

  const back = () => (idx === 0 ? onCancel() : setStep(STEPS[idx - 1]));

  const [nation, setNation] = useState<NationId | null>(null);
  const [offers, setOffers] = useState<StartOffer[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);
  const [talent, setTalent] = useState<Talent | null>(null);
  const [revealed, setRevealed] = useState(false);
  const club = CLUBS.find((c) => c.id === clubId);

  /** The nation decides the league; a new nation draws three new clubs. */
  const chooseNation = (id: NationId) => {
    if (id !== nation) {
      setNation(id);
      setOffers(startOffers(CLUBS, id));
      setClubId(null);
    }
  };

  const goToClubs = (id: NationId | null = nation) => {
    if (!id) return;
    chooseNation(id);
    setStep('club');
  };

  const pickClub = (id: string) => {
    setClubId(id);
    setTalent(rollTalent());
    setRevealed(false);
    setStep('talent');
  };

  const finish = () => {
    try {
      localStorage.setItem(NAME_KEY, cleanName);
    } catch {
      /* ignore */
    }
    onDone({
      name: cleanName,
      position: position ?? undefined,
      clubId: clubId ?? undefined,
      nationality: nation ?? undefined,
      talent: talent ?? undefined,
    });
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
              onClick={() => setStep('nation')}
            >
              Weiter
            </button>
            <button type="button" className="mini dark" onClick={back}>
              ZURÜCK
            </button>
          </div>
        </div>
      ) : null}

      {step === 'nation' ? (
        <div className="step">
          <div className="step-head">
            <h2>DEINE NATION</h2>
            <p>Sie bestimmt, in welcher Liga du als Talent anfängst.</p>
          </div>
          <div className="step-body nation-grid">
            {NATIONS.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`nation${nation === n.id ? ' on' : ''}`}
                aria-pressed={nation === n.id}
                onClick={() => chooseNation(n.id)}
              >
                <PixelFlag nation={n.id} width={44} />
                <span className="nation-txt">
                  <b>{n.name}</b>
                  <span>
                    <Digits>{n.league}</Digits>
                  </span>
                </span>
                <span className="nation-code t-label">{n.code}</span>
              </button>
            ))}
          </div>
          <div className="step-foot">
            <button
              type="button"
              className="pbtn"
              disabled={!nation}
              onClick={() => goToClubs()}
            >
              Weiter
            </button>
            <div className="row2">
              <button
                type="button"
                className="mini dark"
                onClick={() => goToClubs(NATIONS[Math.floor(Math.random() * NATIONS.length)].id)}
              >
                ZUFÄLLIG
              </button>
              <button type="button" className="mini dark" onClick={back}>
                ZURÜCK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 'club' && nation ? (
        <ClubPicker nation={nation} offers={offers} onPick={pickClub} onBack={back} />
      ) : null}

      {step === 'talent' && talent && club ? (
        <div className="step">
          <div className="step-head">
            <h2>SCOUTING-BERICHT</h2>
            <p>
              <Digits>{`Du startest in der Zweiten von ${club.name} (U19). Dein Talent wird jetzt ausgewürfelt.`}</Digits>
            </p>
          </div>
          <div className="step-body">
            {revealed ? (
              <div className={`reveal reveal-${talent.id}`}>
                <div className="reveal-label">{talent.label.toUpperCase()}</div>
                <p>{talent.desc}</p>
                <PlayerAvatar talent={talent.id} club={club} size={130} reveal />
                <p className="reveal-pro">
                  <b>+</b> {talent.pro}
                </p>
                <p className="reveal-con">
                  <b>−</b> {talent.con}
                </p>
                <div className="reveal-chips">
                  <span className="bias">
                    <span className="t-num">+{talent.boost}</span>{' '}
                    <span className="t-label">alle Werte</span>
                  </span>
                  <span className="bias">
                    <span className="t-num">×{talent.growth.toFixed(2)}</span>{' '}
                    <span className="t-label">Wachstum</span>
                  </span>
                </div>
              </div>
            ) : (
              <button type="button" className="pbtn" onClick={() => setRevealed(true)}>
                Bericht öffnen
              </button>
            )}
          </div>
          <div className="step-foot">
            {revealed ? (
              <button type="button" className="pbtn" onClick={finish}>
                Karriere starten
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
