import { useEffect, useRef, useState } from 'react';
import { NATIONS, nationById, type NationId } from '../data/nations';
import { POSITION_LIST, RANDOM_NAMES } from '../data/positions';
import { rollTalent } from '../engine/squad';
import { START_SIZE_HINT, START_SIZE_LABEL, startOffers, type StartOffer } from '../engine/startClubs';
import { CLUBS, type CareerSetup } from '../state/careerStore';
import type { Position, Talent } from '../types/player';
import { ClubCrest } from './ClubCrest';
import { PixelFlag } from './PixelFlag';
import { PlayerAvatar } from './PlayerAvatar';
import { clubTheme, themeVars } from './clubTheme';
import './FastScreen.css';
import './Setup.css';

type Step = 'name' | 'position' | 'nation' | 'club' | 'talent';
const STEPS: Step[] = ['name', 'position', 'nation', 'club', 'talent'];
const NAME_KEY = 'fcs-last-name';
/** A tapped tile shows its picked state this long before the next step slides in. */
const ADVANCE_MS = 240;

const STAT_LABEL = { tech: 'TEC', phys: 'PHY', mental: 'MEN' } as const;

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

/**
 * New career in five steps: name → position → nation → club (3 offers) → talent roll.
 * Position and nation advance on tap; a club tile tints the whole screen in its colours.
 */
export function Setup({ onDone, onCancel }: Props) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState(lastName);
  const [position, setPosition] = useState<Position | null>(null);
  const [nation, setNation] = useState<NationId | null>(null);
  const [offers, setOffers] = useState<StartOffer[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);
  const [talent, setTalent] = useState<Talent | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [touched, setTouched] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const idx = STEPS.indexOf(step);
  const cleanName = name.trim();
  const nameOk = cleanName.length >= 2;
  const club = CLUBS.find((c) => c.id === clubId) ?? null;
  // Club colours as soon as a club is in play; the default red before that.
  const theme = clubTheme(step === 'club' || step === 'talent' ? club : null);

  const later = (fn: () => void) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, ADVANCE_MS);
  };

  const back = () => {
    window.clearTimeout(timer.current);
    if (idx === 0) onCancel();
    else setStep(STEPS[idx - 1]);
  };

  const submitName = () => {
    setTouched(true);
    if (nameOk) setStep('position');
  };

  const pickPosition = (id: Position) => {
    setPosition(id);
    later(() => setStep('nation'));
  };

  /** The nation decides the league; a new nation draws three new clubs. */
  const pickNation = (id: NationId) => {
    if (id !== nation) {
      setNation(id);
      setOffers(startOffers(CLUBS, id));
      setClubId(null);
    }
    later(() => setStep('club'));
  };

  const sign = () => {
    if (!club) return;
    setTalent(rollTalent());
    setRevealed(false);
    setStep('talent');
  };

  const finish = () => {
    try {
      localStorage.setItem(NAME_KEY, cleanName);
    } catch {
      /* private mode: the name is just not remembered */
    }
    onDone({
      name: cleanName,
      position: position ?? undefined,
      clubId: clubId ?? undefined,
      nationality: nation ?? undefined,
      talent: talent ?? undefined,
    });
  };

  const info = nation ? nationById(nation) : undefined;
  // After the reveal there is no way back: going back would re-roll the talent.
  const canGoBack = !(step === 'talent' && revealed);

  return (
    <div className="fs setup" style={themeVars(theme)}>
      <div className="fs-top">
        {canGoBack ? (
          <button type="button" className="fs-mini" onClick={back}>
            {idx === 0 ? 'Abbrechen' : 'Zurück'}
          </button>
        ) : (
          <span />
        )}
        <span className="fs-label">
          Schritt <b key={idx}>{idx + 1}</b> von {STEPS.length}
        </span>
      </div>
      <div
        className="su-progress"
        role="progressbar"
        aria-label="Fortschritt"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={idx + 1}
      >
        <span style={{ transform: `scaleX(${(idx + 1) / STEPS.length})` }} />
      </div>

      {step === 'name' ? (
        <section className="su-step" key="name">
          <h2 className="fs-title su-title">Wie heißt du?</h2>
          <p className="fs-text">So steht dein Name über deiner Karriere.</p>
          <form
            className="su-name"
            onSubmit={(e) => {
              e.preventDefault();
              submitName();
            }}
          >
            <label className="su-label" htmlFor="player-name">
              Spielername
            </label>
            <input
              id="player-name"
              className="su-input"
              value={name}
              maxLength={16}
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              placeholder="z. B. Jonas"
              aria-invalid={touched && !nameOk}
              aria-describedby="name-hint"
              onChange={(e) => setName(e.target.value)}
            />
            <span id="name-hint" className={`su-hint${touched && !nameOk ? ' bad' : ''}`}>
              {touched && !nameOk ? 'Der Name braucht mindestens 2 Zeichen.' : '2 bis 16 Zeichen'}
            </span>
            <button
              type="button"
              className="fs-mini su-random"
              onClick={() => setName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)])}
            >
              Zufälligen Namen nehmen
            </button>
          </form>
          <div className="su-foot">
            <button type="button" className="fs-tile main fs-cta" onClick={submitName}>
              <span className="fs-tile-t">Weiter</span>
            </button>
          </div>
        </section>
      ) : null}

      {step === 'position' ? (
        <section className="su-step" key="position">
          <h2 className="fs-title su-title">Deine Position</h2>
          <p className="fs-text">Sie entscheidet, wo du am Anfang stark bist.</p>
          <div className="su-grid">
            {POSITION_LIST.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={`fs-tile su-tile${position === p.id ? ' main' : ''}`}
                style={{ animationDelay: `${40 + i * 30}ms` }}
                aria-pressed={position === p.id}
                onClick={() => pickPosition(p.id)}
              >
                <span className="su-code">{p.label}</span>
                <span className="su-name-t">{p.name}</span>
                <span className="su-desc">{p.desc}</span>
                <span className="fs-odds su-bias">
                  {Object.entries(p.bias).map(([k, v]) => (
                    <span key={k}>
                      +{v} {STAT_LABEL[k as keyof typeof STAT_LABEL]}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 'nation' ? (
        <section className="su-step" key="nation">
          <h2 className="fs-title su-title">Deine Nation</h2>
          <p className="fs-text">Sie entscheidet, in welcher Liga du als Talent anfängst.</p>
          <div className="su-grid">
            {NATIONS.map((n, i) => (
              <button
                key={n.id}
                type="button"
                className={`fs-tile su-tile su-nation${nation === n.id ? ' main' : ''}`}
                style={{ animationDelay: `${40 + i * 30}ms` }}
                aria-pressed={nation === n.id}
                onClick={() => pickNation(n.id)}
              >
                <PixelFlag nation={n.id} width={40} />
                <span className="su-name-t">{n.name}</span>
                <span className="su-desc">{n.league}</span>
              </button>
            ))}
          </div>
          <div className="su-foot">
            <button
              type="button"
              className="fs-mini"
              onClick={() => pickNation(NATIONS[Math.floor(Math.random() * NATIONS.length)].id)}
            >
              Zufällige Nation
            </button>
          </div>
        </section>
      ) : null}

      {step === 'club' && nation ? (
        <section className="su-step" key="club">
          <h2 className="fs-title su-title">Wähle deinen Verein</h2>
          <p className="fs-text su-where">
            <PixelFlag nation={nation} width={24} />
            <span>
              {info?.league}. Du startest mit 16 in der Zweiten des Klubs.
            </span>
          </p>
          <div className="su-clubs">
            {offers.map(({ size, club: c }, i) => (
              <button
                key={c.id}
                type="button"
                className={`fs-tile su-club${c.id === clubId ? ' picked-club' : ''}`}
                style={{ animationDelay: `${40 + i * 50}ms` }}
                aria-pressed={c.id === clubId}
                onClick={() => setClubId(c.id)}
              >
                <ClubCrest club={c} size={44} />
                <span className="su-club-txt">
                  <span className="fs-tile-t">{c.name}</span>
                  <span className="su-desc">
                    <b>{START_SIZE_LABEL[size]}.</b> {START_SIZE_HINT[size]}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="su-foot">
            <button type="button" className="fs-tile main fs-cta" disabled={!club} onClick={sign}>
              <span className="fs-tile-t">{club ? `Bei ${club.name} unterschreiben` : 'Verein wählen'}</span>
            </button>
          </div>
        </section>
      ) : null}

      {step === 'talent' && talent && club ? (
        <section className="su-step" key="talent">
          <h2 className="fs-title su-title">Scouting-Bericht</h2>
          <p className="fs-text">
            {club.name} hat dich unter Vertrag genommen. Jetzt zeigt sich, was in dir steckt.
          </p>
          {revealed ? (
            <div className={`su-reveal t-${talent.id}`}>
              <span className="su-reveal-label">{talent.label}</span>
              <span className="su-reveal-desc">{talent.desc}</span>
              <span className="su-reveal-fig">
                <PlayerAvatar talent={talent.id} club={club} size={120} reveal />
              </span>
              <span className="su-line up">
                <b>Stärke</b> {talent.pro}
              </span>
              <span className="su-line down">
                <b>Schwäche</b> {talent.con}
              </span>
              <span className="fs-odds su-bias">
                <span>+{talent.boost} auf alle Werte</span>
                <span>×{talent.growth.toLocaleString('de-DE', { minimumFractionDigits: 2 })} Wachstum</span>
              </span>
            </div>
          ) : (
            <button type="button" className="fs-tile su-sealed" onClick={() => setRevealed(true)}>
              <ClubCrest club={club} size={56} />
              <span className="fs-tile-t">Bericht öffnen</span>
              <span className="su-desc">Vertraulich: nur für {club.name}</span>
            </button>
          )}
          {revealed ? (
            <div className="su-foot">
              <button type="button" className="fs-tile main fs-cta" onClick={finish}>
                <span className="fs-tile-t">Karriere starten</span>
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
