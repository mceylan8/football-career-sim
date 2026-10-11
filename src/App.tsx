import { CareerTable } from './components/CareerTable';
import { ChoicePanel } from './components/ChoicePanel';
import { PlayerCard } from './components/PlayerCard';
import { useCareerStore } from './state/careerStore';
import { formatMoney, formatValue, marketValue } from './engine/marketValue';
import './App.css';

function App() {
  const player = useCareerStore((s) => s.player);
  const seasonMap = useCareerStore((s) => s.seasonMap);
  const hasSave = useCareerStore((s) => s.hasSave);
  const newCareer = useCareerStore((s) => s.newCareer);
  const clearSave = useCareerStore((s) => s.clearSave);

  const showMenu = !seasonMap && !player.careerEnded;

  return (
    <div className="app">
      <header className="topbar">
        <h1>FOOTBALL CAREER SIM</h1>
        <div className="topbar-actions">
          {(hasSave || seasonMap) && !showMenu ? (
            <button type="button" className="mini" onClick={clearSave}>
              RESET
            </button>
          ) : null}
          {!showMenu ? (
            <button type="button" className="mini" onClick={newCareer}>
              NEU
            </button>
          ) : null}
        </div>
      </header>

      {showMenu ? (
        <section className="screen">
          <h2>DEINE KARRIERE BEGINNT</h2>
          <ul>
            <li>94 Klubs · 5 Ligen</li>
            <li>Wähle jede Woche deinen nächsten Schritt</li>
            <li>Speicherstand automatisch im Browser</li>
          </ul>
          <button type="button" className="pbtn" onClick={newCareer}>
            Karriere starten
          </button>
        </section>
      ) : null}

      {player.careerEnded ? (
        <section className="screen">
          <h2>KARRIERE BEENDET</h2>
          <p>{player.endReason}</p>
          <p className="meta">
            ALTER {player.age} · SAISON {player.season} · REP {player.reputation}
            {' · '}
            {formatMoney(player.finances)} · WERT {formatValue(marketValue(player))}
          </p>
          <button type="button" className="pbtn" onClick={newCareer}>
            Nochmal versuchen
          </button>
        </section>
      ) : null}

      {!showMenu && !player.careerEnded ? (
        <>
          <PlayerCard player={player} />
          <CareerTable player={player} />
          <ChoicePanel />
        </>
      ) : null}
    </div>
  );
}

export default App;
