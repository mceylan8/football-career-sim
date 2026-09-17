import { EventModal } from './components/EventModal';
import { SeasonMap } from './components/SeasonMap';
import { StatsPanel } from './components/StatsPanel';
import { useCareerStore } from './state/careerStore';
import './App.css';

function App() {
  const player = useCareerStore((s) => s.player);
  const seasonMap = useCareerStore((s) => s.seasonMap);
  const activeEvent = useCareerStore((s) => s.activeEvent);
  const lastMatchSummary = useCareerStore((s) => s.lastMatchSummary);
  const hasSave = useCareerStore((s) => s.hasSave);
  const newCareer = useCareerStore((s) => s.newCareer);
  const resolveChoice = useCareerStore((s) => s.resolveChoice);
  const clearSave = useCareerStore((s) => s.clearSave);

  const showMenu = !seasonMap && !player.careerEnded;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Roguelike Career</p>
          <h1>Football Career Sim</h1>
        </div>
        <div className="header-actions">
          {(hasSave || seasonMap) && !showMenu ? (
            <button type="button" className="ghost" onClick={clearSave}>
              Reset
            </button>
          ) : null}
          <button type="button" className="primary" onClick={newCareer}>
            {seasonMap ? 'Neue Karriere' : 'Karriere starten'}
          </button>
        </div>
      </header>

      {showMenu ? (
        <section className="hero-panel">
          <p>
            Sichtbare Saison-Map, stat-gekoppelte Matches und
            datengetriebene Events — wähle deinen Pfad, bevor der Ausgang
            feststeht.
          </p>
          <ul>
            <li>94 Klubs · 5 Ligen · Saison 2026/27</li>
            <li>Node-Typen: Match, Sponsor, Transfer, Risiko & mehr</li>
            <li>Save automatisch in localStorage</li>
          </ul>
        </section>
      ) : null}

      {player.careerEnded ? (
        <section className="end-panel">
          <h2>Karriere beendet</h2>
          <p>{player.endReason}</p>
          <p className="end-meta">
            Alter {player.age} · Saison {player.season} · Reputation{' '}
            {player.reputation} · {player.finances.toLocaleString('de-DE')} €
          </p>
          <button type="button" className="primary" onClick={newCareer}>
            Nochmal versuchen
          </button>
        </section>
      ) : null}

      {!showMenu && !player.careerEnded ? (
        <main className="layout">
          <StatsPanel player={player} />
          <div className="main-col">
            {lastMatchSummary ? (
              <p className="match-banner">{lastMatchSummary}</p>
            ) : null}
            <SeasonMap />
          </div>
        </main>
      ) : null}

      {activeEvent ? (
        <EventModal active={activeEvent} onChoose={resolveChoice} />
      ) : null}
    </div>
  );
}

export default App;
