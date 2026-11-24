import clubsData from '../data/clubs.json';
import { NATIONS } from '../data/nations';
import { clubTheme, themeVars } from './clubTheme';
import { PlayerAvatar } from './PlayerAvatar';
import './FastScreen.css';
import './Menu.css';

const CLUB_COUNT = clubsData.length;
const LEAGUE_COUNT = new Set(clubsData.map((c) => c.league)).size;

/** Start screen: poster title, the figure juggling, one button. */
export function Menu({ onStart }: { onStart: () => void }) {
  return (
    <div className="fs menu" style={themeVars(clubTheme(null))}>
      <div className="fs-top">
        <span className="fs-label">Football Career Sim</span>
      </div>

      <div className="menu-hero" aria-hidden>
        <PlayerAvatar
          talent="solid"
          club={null}
          size={170}
          idle={['jonglieren', 'bereit', 'jonglieren', 'laufen', 'bereitSchraeg']}
        />
      </div>

      <div className="menu-copy">
        <h1 className="menu-title">Deine Karriere</h1>
        <p className="menu-text">
          Mit 16 in der Zweiten, mit 38 ist Schluss. Dazwischen eine Entscheidung pro Saison und
          ein Transferfenster.
        </p>
        <div className="fs-chips">
          <span>{LEAGUE_COUNT} Ligen</span>
          <span>{CLUB_COUNT} Klubs</span>
          <span>{NATIONS.length} Nationen</span>
        </div>
      </div>

      <div className="menu-foot">
        <button type="button" className="fs-tile main fs-cta" onClick={onStart}>
          <span className="fs-tile-t">Karriere starten</span>
        </button>
        <p className="menu-note">Dein Spielstand bleibt in diesem Browser gespeichert.</p>
      </div>
    </div>
  );
}
