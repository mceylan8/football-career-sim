import { useState, type CSSProperties } from 'react';
import { positionLabel } from '../data/positions';
import { formatValue, marketValue, ovrOf } from '../engine/marketValue';
import { seasonEventById } from '../engine/seasonEvents';
import { playtimeShare, roleLabel, teamName } from '../engine/squad';
import { idleFor } from '../state/avatarIdle';
import { useCareerStore } from '../state/careerStore';
import { useAvatarReaction } from '../state/useAvatarReaction';
import type { LogEntry } from '../types/event';
import { ClubCrest } from './ClubCrest';
import { PlayerAvatar } from './PlayerAvatar';
import { clubTheme } from './clubTheme';
import './FastScreen.css';

/** Log tags that are bookkeeping, not the outcome of last season's decision. */
const NOT_OUTCOME = new Set(['Start', 'Bilanz', 'Saison', 'Transfer', 'Vertrag', 'Beförderung']);

function lastOutcome(log: LogEntry[]): LogEntry | undefined {
  for (let i = log.length - 1; i >= 0; i--) if (!NOT_OUTCOME.has(log[i].tag)) return log[i];
  return undefined;
}

interface Props {
  onNew: () => void;
  onReset: () => void;
}

/**
 * Fast mode in one screen: player head, last seasons, then the decision
 * (season event or transfer window) as tiles side by side. Colours come from the club.
 */
export function FastScreen({ onNew, onReset }: Props) {
  const player = useCareerStore((s) => s.player);
  const log = useCareerStore((s) => s.log);
  const seasonCard = useCareerStore((s) => s.seasonCard);
  const transferWindow = useCareerStore((s) => s.transferWindow);
  const resolveSeason = useCareerStore((s) => s.resolveSeason);
  const pickTransfer = useCareerStore((s) => s.pickTransfer);
  const { mood, swap } = useAvatarReaction(player);
  const [allRows, setAllRows] = useState(false);

  const t = clubTheme(player.club);
  const vars = {
    '--c-bg': t.bg,
    '--c-panel': t.panel,
    '--c-accent': t.accent,
    '--c-on': t.onAccent,
  } as CSSProperties;

  const share = player.club ? playtimeShare(player) : 0.5;
  const rows = allRows ? player.history : player.history.slice(-3);
  const event = seasonCard ? seasonEventById(seasonCard.eventId) : undefined;
  const outcome = lastOutcome(log);
  const showOutcome = outcome && outcome.season === player.season - 1;

  return (
    <div className="fs" style={vars}>
      <div className="fs-top">
        <span className="fs-label">
          Saison <b>{player.season}</b>
        </span>
        <span className="fs-actions">
          <button type="button" className="fs-mini" onClick={onNew}>
            Neu
          </button>
          <button type="button" className="fs-mini" onClick={onReset}>
            Reset
          </button>
        </span>
      </div>

      <header className="fs-head">
        <div className="fs-hero">
          <PlayerAvatar
            talent={player.talent?.id ?? 'solid'}
            club={player.club}
            size={96}
            mood={mood}
            swap={swap}
            idle={idleFor(player.form, share)}
            play={swap ? ['jubel'] : undefined}
            playKey={swap ? 'swap' : 'none'}
          />
        </div>
        <div className="fs-id">
          <span className="fs-name">{player.name}</span>
          <span className="fs-club">{teamName(player)}</span>
          <span className="fs-league">{player.club?.league}</span>
        </div>
        <div className="fs-ovr pop" key={ovrOf(player)}>
          <b>{ovrOf(player)}</b>
          <span>OVR</span>
        </div>
      </header>

      <div className="fs-chips">
        <span>{player.age} J.</span>
        <span>{positionLabel(player.position)}</span>
        <span>{roleLabel(share)}</span>
        <span>{formatValue(marketValue(player))}</span>
        <span>{player.contract ? `${player.contract.yearsLeft} J. Vertrag` : 'Vereinslos'}</span>
      </div>

      {player.history.length ? (
        <section className="fs-table" aria-label="Karriere">
          <div className="fs-row fs-th">
            <span>Alt</span>
            <span>Klub</span>
            <span>OVR</span>
            <span>Sp</span>
            <span>T</span>
            <span>A</span>
          </div>
          <div className={allRows ? 'fs-rows fs-rows-all' : 'fs-rows'}>
            {rows.map((r, i) => {
              const prev = player.history[player.history.length - rows.length + i - 1];
              return (
                <div
                  className={i === rows.length - 1 ? 'fs-row fresh' : 'fs-row'}
                  key={r.age}
                >
                  <span>{r.age}</span>
                  <span className="fs-cl">{r.clubName}</span>
                  <span className={prev && r.ovr > prev.ovr ? 'up' : undefined}>{r.ovr}</span>
                  <span>{r.games}</span>
                  <span>{r.goals ?? 0}</span>
                  <span>{r.assists ?? 0}</span>
                </div>
              );
            })}
          </div>
          {player.history.length > 3 ? (
            <button type="button" className="fs-more" onClick={() => setAllRows(!allRows)}>
              {allRows ? 'Weniger' : `Alle ${player.history.length} Saisons`}
            </button>
          ) : null}
        </section>
      ) : null}

      {showOutcome ? (
        <p className={`fs-outcome ${outcome.tone}`}>
          <b>{outcome.title}</b> {outcome.text}
        </p>
      ) : null}

      <section className="fs-decide" aria-live="polite">
        {event ? (
          <>
            <span className="fs-kicker">Deine Entscheidung</span>
            <h2 className="fs-title">{event.title}</h2>
            <p className="fs-text">{event.text(player)}</p>
            <div className={`fs-grid n${Math.min(event.choices.length, 3)}`}>
              {event.choices.map((c, i) => (
                <button
                  key={c.label}
                  type="button"
                  className={i === 0 ? 'fs-tile main' : 'fs-tile'}
                  onClick={() => resolveSeason(i)}
                >
                  <span className="fs-tile-t">{c.label}</span>
                  <span className="fs-odds">
                    {c.outcomes.map((o) => (
                      <span key={o.chip} className={o.tone}>
                        {o.chance < 100 ? `${o.chance} % ${o.chip}` : o.chip}
                      </span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {transferWindow ? (
          <>
            <span className="fs-kicker">Transferfenster</span>
            <h2 className="fs-title">
              {transferWindow.expired ? 'Vertrag läuft aus' : 'Wechseln oder bleiben?'}
            </h2>
            <div className="fs-grid n2">
              {transferWindow.options.map((o, i) => {
                const good = o.role === 'Stammspieler' || o.role === 'Rotation';
                return (
                  <button
                    key={`${o.kind}-${o.club.id}`}
                    type="button"
                    className="fs-tile fs-offer-tile"
                    onClick={() => pickTransfer(i)}
                  >
                    <span className="fs-kind">
                      {o.kind === 'move' ? 'Wechsel' : o.kind === 'extend' ? 'Verlängern' : 'Bleiben'}
                    </span>
                    <span className="fs-offer">
                      <ClubCrest club={o.club} size={30} />
                      <span className="fs-tile-t">{o.club.name}</span>
                    </span>
                    <span className="fs-sub">{o.club.league}</span>
                    <span className="fs-odds">
                      <span className={good ? 'up' : 'down'}>
                        {o.squad === 'reserve' ? `${o.role} · Zweite` : o.role}
                      </span>
                      <span className="neutral">
                        {o.years} J. · {o.wage.toLocaleString('de-DE')} €/Wo
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
