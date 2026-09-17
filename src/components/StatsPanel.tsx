import type { PlayerState } from '../types/player';
import './StatsPanel.css';

interface Props {
  player: PlayerState;
}

export function StatsPanel({ player }: Props) {
  return (
    <aside className="stats-panel">
      <h2>Karriere</h2>
      <dl>
        <div>
          <dt>Alter</dt>
          <dd>{player.age}</dd>
        </div>
        <div>
          <dt>Saison</dt>
          <dd>
            {player.season} · W{player.week}
          </dd>
        </div>
        <div>
          <dt>Klub</dt>
          <dd>{player.club?.name ?? 'ohne Verein'}</dd>
        </div>
        <div>
          <dt>Liga</dt>
          <dd>
            {player.club
              ? `${player.club.league} (T${player.club.tier})`
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Vertrag</dt>
          <dd>
            {player.contract
              ? `${player.contract.yearsLeft}J · ${player.contract.wage}€/Wo`
              : 'kein Vertrag'}
          </dd>
        </div>
        <div>
          <dt>Tech / Phys / Mental</dt>
          <dd>
            {player.stats.tech} / {player.stats.phys} / {player.stats.mental}
          </dd>
        </div>
        <div>
          <dt>Form</dt>
          <dd>{player.form}</dd>
        </div>
        <div>
          <dt>Reputation</dt>
          <dd>{player.reputation}</dd>
        </div>
        <div>
          <dt>Finanzen</dt>
          <dd>{player.finances.toLocaleString('de-DE')} €</dd>
        </div>
      </dl>
      {player.flags.length > 0 ? (
        <div className="flags">
          {player.flags.map((f) => (
            <span key={f} className="flag">
              {f}
            </span>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
