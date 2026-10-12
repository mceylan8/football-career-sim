import {
  formatMoney,
  formatValue,
  marketValue,
  ovrOf,
} from '../engine/marketValue';
import { useLocalPref } from '../state/useLocalPref';
import type { PlayerState } from '../types/player';
import { ClubCrest } from './ClubCrest';
import './PlayerCard.css';

interface Props {
  player: PlayerState;
}

export function PlayerCard({ player }: Props) {
  const [collapsed, setCollapsed] = useLocalPref('card-collapsed', false);
  const ovr = ovrOf(player);
  const value = marketValue(player);
  const last = player.history[player.history.length - 1];
  const diff = last ? value - last.value : null;

  if (collapsed) {
    return (
      <section className="pcard-wrap compact" aria-label="Spielerkarte (kompakt)">
        <button
          type="button"
          className="mini-card"
          aria-expanded={false}
          onClick={() => setCollapsed(false)}
        >
          <ClubCrest club={player.club} size={36} />
          <span className="mc-name">
            <b>{player.club?.name ?? 'Vereinslos'}</b>
            <span className="t-num">
              {player.position} · {player.age} J. · {formatValue(value)}
            </span>
          </span>
          <span className="mc-ovr">
            <small className="t-label">OVR</small>
            <span className="t-num">{ovr}</span>
          </span>
          <span className="chev" aria-hidden>
            ▾
          </span>
        </button>
      </section>
    );
  }

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
            <div className="pc-clubname">{player.club?.name ?? 'Vereinslos'}</div>
            <div className="pc-meta">
              {player.club
                ? `${player.club.league} · Tier ${player.club.tier}`
                : 'Auf Angebote warten'}
            </div>
            <div className="pc-meta t-num">
              Saison {player.season} · Woche {player.week}/12
            </div>
          </div>
          <button
            type="button"
            className="chev pc-toggle"
            aria-expanded
            aria-label="Karte einklappen"
            onClick={() => setCollapsed(true)}
          >
            ▴
          </button>
        </div>

        <div className="pc-main">
          <div className="pc-left">
            <div className="pc-ovr t-num">{ovr}</div>
            <div className="t-label muted">OVR</div>
            <div className="pc-pos t-label">{player.position}</div>
          </div>
          <div className="pc-right">
            <div className="pc-tags">
              <span className="tag t-num">Alter {player.age}</span>
              <span className="tag y t-num">{formatMoney(player.finances)}</span>
            </div>
            <div className="pc-bars">
              {bars.map((b) => (
                <div className="pc-bar" key={b.k}>
                  <span className="t-label">{b.k}</span>
                  <div className="track">
                    <i
                      style={{
                        width: `${Math.max(0, Math.min(100, b.v))}%`,
                        background: b.c,
                      }}
                    />
                  </div>
                  <b className="t-num">{b.v}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pc-foot">
          <div className="mv">
            <small className="t-label">Marktwert</small>
            <strong className="t-num">{formatValue(value)}</strong>
            {diff !== null ? (
              <span className="trend t-num">
                {diff >= 0 ? '▲' : '▼'} {formatValue(Math.abs(diff))}
              </span>
            ) : null}
          </div>
          <div>
            <small className="t-label">Gehalt/Wo</small>
            <strong className="t-num">
              {player.contract ? formatMoney(player.contract.wage) : '—'}
            </strong>
          </div>
          <div>
            <small className="t-label">Vertrag</small>
            <strong className="t-num">
              {player.contract ? `${player.contract.yearsLeft} J.` : '—'}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}
