import { useState } from 'react';
import { Digits } from './components/Digits';
import { CareerTable } from './components/CareerTable';
import { ChoicePanel } from './components/ChoicePanel';
import { Feed } from './components/Feed';
import { PlayerCard } from './components/PlayerCard';
import { Setup } from './components/Setup';
import { useCareerStore, type CareerSetup } from './state/careerStore';
import { formatMoney, formatValue, marketValue } from './engine/marketValue';
import './App.css';

function App() {
  const player = useCareerStore((s) => s.player);
  const seasonMap = useCareerStore((s) => s.seasonMap);
  const hasSave = useCareerStore((s) => s.hasSave);
  const newCareer = useCareerStore((s) => s.newCareer);
  const clearSave = useCareerStore((s) => s.clearSave);

  const [picking, setPicking] = useState(false);
  const showMenu = !seasonMap && !player.careerEnded && !picking;
  const startCareer = (setup: CareerSetup) => {
    setPicking(false);
    newCareer(setup);
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="t-label">Football Career Sim</h1>
        <div className="topbar-actions">
          {(hasSave || seasonMap) && !showMenu ? (
            <button type="button" className="mini" onClick={clearSave}>
              RESET
            </button>
          ) : null}
          {!showMenu && !picking ? (
            <button type="button" className="mini" onClick={() => setPicking(true)}>
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
              <Digits>94 Klubs · 5 Ligen</Digits>
            </li>
            <li>Wähle jede Woche deinen nächsten Schritt</li>
            <li>Speicherstand automatisch im Browser</li>
          </ul>
          <button type="button" className="pbtn" onClick={() => setPicking(true)}>
            Karriere starten
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
          <button type="button" className="pbtn" onClick={() => setPicking(true)}>
            Nochmal versuchen
          </button>
        </section>
      ) : null}

      {!showMenu && !picking && !player.careerEnded ? (
        <>
          <PlayerCard player={player} />
          <CareerTable player={player} />
          <Feed />
          <ChoicePanel />
        </>
      ) : null}
    </div>
  );
}

export default App;
