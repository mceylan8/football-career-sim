import {
  formatMoney,
  formatValue,
  marketValue,
  ovrOf,
} from '../engine/marketValue';
import { positionLabel } from '../data/positions';
import { matchdayLabel, playtimeShare, roleLabel, seasonMatchdays, teamName } from '../engine/squad';
import { idleFor } from '../state/avatarIdle';
import { useAvatarReaction } from '../state/useAvatarReaction';
import { useLocalPref } from '../state/useLocalPref';
import { useMedia } from '../state/useMedia';
import type { PlayerState } from '../types/player';
import { PlayerAvatar } from './PlayerAvatar';
import { ClubCrest } from './ClubCrest';
import { Digits } from './Digits';
import './PlayerCard.css';

interface Props {
  player: PlayerState;
}

export function PlayerCard({ player }: Props) {
  const [collapsed, setCollapsed] = useLocalPref('card-collapsed', false);
  const { mood, swap } = useAvatarReaction(player);
  const wide = useMedia('(min-width: 1000px)');
  const size = wide ? 190 : 108;
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
            <b>{player.name || 'Spieler'}</b>
            <span className="mc-sub">
              <Digits>
                {`${teamName(player)} · ${positionLabel(player.position)} · ${player.age} J. · ${formatValue(value)}`}
              </Digits>
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
            <div className="pc-clubname">{player.name || 'Spieler'}</div>
            <div className="pc-club-line">
              <Digits>{teamName(player)}</Digits>
            </div>
            <div className="pc-meta">
              {player.club ? (
                <Digits>{`${player.club.league} · Tier ${player.club.tier}`}</Digits>
              ) : (
                'Auf Angebote warten'
              )}
            </div>
            <div className="pc-meta">
              <Digits>{`Saison ${player.season} · Spieltag ${matchdayLabel(player.week, seasonMatchdays(player.club))}/${seasonMatchdays(player.club)}`}</Digits>
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

        <div className="pc-stage" style={{ height: Math.round(size * 1.3) + 14 }}>
          <div className="pc-stage-in">
            <PlayerAvatar
              talent={player.talent?.id ?? 'solid'}
              club={player.club}
              size={size}
              mood={mood}
              swap={swap}
              idle={idleFor(player.form, player.club ? playtimeShare(player) : 0.5)}
              play={swap ? ['jubel'] : undefined}
              playKey={swap ? 'swap' : 'none'}
            />
            <i
              className="pc-goal"
              aria-hidden
              style={{ width: Math.round(size * 0.3), height: Math.round(size * 0.62) }}
            />
          </div>
        </div>

        <div className="pc-strip">
          <div className="pc-ovrbox">
            <div className="pc-ovr t-num">{ovr}</div>
            <div className="pc-ovrmeta">
              <span className="t-label muted">OVR</span>
              <span className="pc-pos t-label">{positionLabel(player.position)}</span>
            </div>
          </div>
          <div className="pc-tags">
            <span className="tag">
              <span className="t-label">Alter</span> <span className="t-num">{player.age}</span>
            </span>
            <span className="tag y t-num">{formatMoney(player.finances)}</span>
            {player.club ? (
              <span className="tag r t-label">{roleLabel(playtimeShare(player))}</span>
            ) : null}
          </div>
        </div>

        <div className="pc-main">
          <div className="pc-bars">
            {bars.map((b) => (
              <div className="pc-bar" key={b.k}>
                <span className="t-label">{b.k}</span>
                <div className="track">
                  <i style={{ width: `${Math.max(0, Math.min(100, b.v))}%`, background: b.c }} />
                </div>
                <b className="t-num">{b.v}</b>
              </div>
            ))}
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
