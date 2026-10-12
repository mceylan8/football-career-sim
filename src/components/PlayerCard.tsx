import { formatMoney, formatValue, marketValue, ovrOf } from '../engine/marketValue';
import type { PlayerState } from '../types/player';
import { ClubCrest } from './ClubCrest';
import './PlayerCard.css';

interface Props {
  player: PlayerState;
}

export function PlayerCard({ player }: Props) {
  const ovr = ovrOf(player);
  const value = marketValue(player);
  const last = player.history[player.history.length - 1];
  const diff = last ? value - last.value : null;
  const bars = [
    { k: 'TEC', v: player.stats.tech, c: 'var(--grass)' },
    { k: 'PHY', v: player.stats.phys, c: 'var(--grass)' },
    { k: 'MEN', v: player.stats.mental, c: 'var(--grass)' },
    { k: 'FOR', v: player.form, c: 'var(--yellow)' },
    { k: 'REP', v: player.reputation, c: 'var(--blue)' },
  ];

  return (
    <section className="pcard-wrap" aria-label="Spielerkarte">
      <div className="pcard">
        <div className="pc-club">
          <ClubCrest club={player.club} size={84} />
          <div className="pc-clubtxt">
            <div className="pc-clubname">
              {player.club?.name ?? 'VEREINSLOS'}
            </div>
            <div className="pc-league">
              {player.club
                ? `${player.club.league} · Tier ${player.club.tier}`
                : 'Auf Angebote warten'}
            </div>
            <div className="pc-league">
              Saison {player.season} · Woche {player.week}/12
            </div>
          </div>
        </div>

        <div className="pc-main">
          <div className="pc-left">
            <div className="pc-ovr u">{ovr}</div>
            <div className="pc-lbl u">OVR</div>
            <div className="pc-pos u">{player.position}</div>
          </div>
          <div className="pc-right">
            <div className="pc-tags">
              <span className="tag">Alter {player.age}</span>
              <span className="tag y">{formatMoney(player.finances)}</span>
            </div>
            <div className="pc-bars">
              {bars.map((b) => (
                <div className="pc-bar u" key={b.k}>
                  <span>{b.k}</span>
                  <div className="track">
                    <i
                      style={{
                        width: `${Math.max(0, Math.min(100, b.v))}%`,
                        background: b.c,
                      }}
                    />
                  </div>
                  <b>{b.v}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pc-foot">
          <div className="mv">
            <small className="u">Marktwert</small>
            <strong className="u">{formatValue(value)}</strong>
            {diff !== null ? (
              <span className="trend">
                {diff >= 0 ? '▲' : '▼'} {formatValue(Math.abs(diff))}
              </span>
            ) : null}
          </div>
          <div>
            <small className="u">Gehalt/Wo</small>
            <strong className="u">
              {player.contract ? formatMoney(player.contract.wage) : '—'}
            </strong>
          </div>
          <div>
            <small className="u">Vertrag</small>
            <strong className="u">
              {player.contract ? `${player.contract.yearsLeft} J.` : '—'}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}
