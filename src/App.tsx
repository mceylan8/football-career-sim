import { useState } from 'react';
import clubsData from './data/clubs.json';
import { Digits } from './components/Digits';
import { CareerTable } from './components/CareerTable';
import { ChoicePanel } from './components/ChoicePanel';
import { Feed } from './components/Feed';
import { FastScreen } from './components/FastScreen';
import { MatchBoard } from './components/MatchBoard';
import { PlayerCard } from './components/PlayerCard';
import { Setup } from './components/Setup';
import { useCareerStore, type CareerSetup, type GameMode } from './state/careerStore';
import { formatMoney, formatValue, marketValue } from './engine/marketValue';
import './App.css';

const CLUB_COUNT = clubsData.length;
const LEAGUE_COUNT = new Set(clubsData.map((c) => c.league)).size;

function App() {
  const player = useCareerStore((s) => s.player);
  const weekPlan = useCareerStore((s) => s.weekPlan);
  const seasonCard = useCareerStore((s) => s.seasonCard);
  const transferWindow = useCareerStore((s) => s.transferWindow);
  const mode = useCareerStore((s) => s.mode);
  const hasSave = useCareerStore((s) => s.hasSave);
  const newCareer = useCareerStore((s) => s.newCareer);
  const clearSave = useCareerStore((s) => s.clearSave);

  const [picking, setPicking] = useState(false);
  const [nextMode, setNextMode] = useState<GameMode>('fast');
  const started = !!(weekPlan || seasonCard || transferWindow);
  const showMenu = !started && !player.careerEnded && !picking;
  const startCareer = (setup: CareerSetup) => {
    setPicking(false);
    newCareer({ ...setup, mode: nextMode });
  };
  const pick = (m: GameMode) => {
    setNextMode(m);
    setPicking(true);
  };

  // Fast mode has its own full screen (club colours, no top bar).
  if (mode === 'fast' && started && !picking && !player.careerEnded) {
    return (
      <div className="app app-fast">
        <FastScreen onNew={() => pick('fast')} onReset={clearSave} />
      </div>
    );
  }

  return (
    <div className={`app${!showMenu && !picking && !player.careerEnded ? ' app-game' : ''}`}>
      <header className="topbar">
        <h1 className="t-label">Football Career Sim</h1>
        <div className="topbar-actions">
          {(hasSave || started) && !showMenu ? (
            <button type="button" className="mini" onClick={clearSave}>
              RESET
            </button>
          ) : null}
          {!showMenu && !picking ? (
            <button type="button" className="mini" onClick={() => pick(mode)}>
              NEU
            </button>
          ) : null}
        </div>
      </header>

      {showMenu ? (
        <section className="screen">
          <h2>DEINE KARRIERE BEGINNT</h2>
          <ul>
            <li>
              <Digits>{`${CLUB_COUNT} Klubs · ${LEAGUE_COUNT} Ligen`}</Digits>
            </li>
            <li>Schnell: eine Entscheidung pro Saison, Karriere in Minuten</li>
            <li>Voll: jede Woche wählen, Schlüsselspiele selbst spielen</li>
            <li>Speicherstand automatisch im Browser</li>
          </ul>
          <button type="button" className="pbtn" onClick={() => pick('fast')}>
            Schnellkarriere
          </button>
          <button type="button" className="pbtn alt" onClick={() => pick('full')}>
            Volle Karriere
          </button>
        </section>
      ) : null}

      {picking ? (
        <Setup onDone={startCareer} onCancel={() => setPicking(false)} />
      ) : null}

      {player.careerEnded && !picking ? (
        <section className="screen">
          <h2>KARRIERE BEENDET</h2>
          <p>{player.endReason}</p>
          <p className="meta t-num">
            ALTER {player.age} · SAISON {player.season} · REP {player.reputation}
            {' · '}
            {formatMoney(player.finances)} · WERT {formatValue(marketValue(player))}
          </p>
          <button type="button" className="pbtn" onClick={() => pick(mode)}>
            Nochmal versuchen
          </button>
        </section>
      ) : null}

      {player.careerEnded && !picking && player.history.length ? (
        <div className="end-table">
          <CareerTable player={player} rows={25} finished />
        </div>
      ) : null}

      {!showMenu && !picking && !player.careerEnded ? (
        <div className="game">
          <div className="game-main">
            <PlayerCard player={player} />
            {mode === 'fast' ? (
              <CareerTable player={player} rows={8} finished />
            ) : (
              <CareerTable player={player} />
            )}
            <Feed className="feed-main" limit={4} />
          </div>
          <aside className="game-side" aria-label="Entscheidungen">
            <ChoicePanel />
            <Feed className="feed-side" />
          </aside>
          <MatchBoard />
        </div>
      ) : null}
    </div>
  );
}

export default App;
