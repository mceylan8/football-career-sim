import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { positionLabel } from '../data/positions';
import { formatValue, marketValue, ovrOf } from '../engine/marketValue';
import { seasonEventById } from '../engine/seasonEvents';
import { TITLE_LABEL, TITLE_ORDER, type TitleId } from '../engine/titles';
import { playtimeShare, roleLabel, teamName } from '../engine/squad';
import { idleFor } from '../state/avatarIdle';
import { useCareerStore } from '../state/careerStore';
import { useAvatarReaction } from '../state/useAvatarReaction';
import { useCountUp } from '../state/useCountUp';
import type { Club } from '../types/club';
import type { LogEntry } from '../types/event';
import type { SeasonRecord } from '../types/player';
import { ClubCrest } from './ClubCrest';
import { PlayerAvatar } from './PlayerAvatar';
import { Trophy } from './Trophy';
import { clubTheme, type ClubTheme } from './clubTheme';
import './FastScreen.css';

/** Log tags that are bookkeeping, not the outcome of last season's decision. */
const NOT_OUTCOME = new Set(['Start', 'Bilanz', 'Saison', 'Transfer', 'Vertrag', 'Beförderung']);

function lastOutcome(log: LogEntry[]): LogEntry | undefined {
  for (let i = log.length - 1; i >= 0; i--) if (!NOT_OUTCOME.has(log[i].tag)) return log[i];
  return undefined;
}

/** Time the chosen tile stays alone on screen before the season is played. */
const LEAVE_MS = 320;
/** The season recap and the "welcome" card close by themselves after this. */
const RECAP_MS = 3200;
const WELCOME_MS = 2000;

function themeVars(t: ClubTheme): CSSProperties {
  return {
    '--c-bg': t.bg,
    '--c-panel': t.panel,
    '--c-accent': t.accent,
    '--c-on': t.onAccent,
  } as CSSProperties;
}

type Overlay =
  | { kind: 'recap'; record: SeasonRecord; ovrBefore: number; ovrAfter: number; outcome?: LogEntry }
  | { kind: 'welcome'; club: Club; role: string };

interface Props {
  onNew: () => void;
  onReset: () => void;
}

/**
 * Fast mode in one screen: player head, last seasons, then the decision
 * (season event or transfer window) as tiles side by side. Colours come from the club.
 *
 * One click:  tile picked → others fade (LEAVE_MS) → store plays the season
 *             → recap card counts the season up → next decision slides in.
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
  const [leaving, setLeaving] = useState<number | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!overlay) return;
    const ms =
      overlay.kind === 'recap' ? RECAP_MS + (overlay.record.titles?.length ?? 0) * 700 : WELCOME_MS;
    const id = window.setTimeout(() => setOverlay(null), ms);
    return () => window.clearTimeout(id);
  }, [overlay]);

  const t = clubTheme(player.club);
  const share = player.club ? playtimeShare(player) : 0.5;
  const ended = player.careerEnded;
  const rows = allRows || ended ? player.history : player.history.slice(-3);
  const event = seasonCard ? seasonEventById(seasonCard.eventId) : undefined;
  const outcome = lastOutcome(log);
  const showOutcome = outcome && outcome.season === player.season - 1 && !ended;
  const busy = leaving !== null || overlay !== null;
  const titleCount = player.history.reduce((a, r) => a + (r.titles?.length ?? 0), 0);
  // Re-key the decision so it animates in fresh every time it changes.
  const decisionKey = event
    ? `e-${player.season}-${event.id}`
    : transferWindow
      ? `t-${player.season}`
      : 'end';

  const choose = (i: number) => {
    if (busy) return;
    setLeaving(i);
    const ovrBefore = ovrOf(player);
    const seasons = player.history.length;
    timer.current = window.setTimeout(() => {
      resolveSeason(i);
      const s = useCareerStore.getState();
      const record = s.player.history[s.player.history.length - 1];
      setLeaving(null);
      if (record && s.player.history.length > seasons) {
        setOverlay({
          kind: 'recap',
          record,
          ovrBefore,
          ovrAfter: ovrOf(s.player),
          outcome: lastOutcome(s.log),
        });
      }
    }, LEAVE_MS);
  };

  const transfer = (i: number) => {
    if (busy || !transferWindow) return;
    const o = transferWindow.options[i];
    setLeaving(i);
    timer.current = window.setTimeout(() => {
      pickTransfer(i);
      setLeaving(null);
      if (o.kind === 'move') setOverlay({ kind: 'welcome', club: o.club, role: o.role });
    }, LEAVE_MS);
  };

  const tileClass = (i: number, main: boolean) =>
    `fs-tile${main ? ' main' : ''}${leaving === null ? '' : leaving === i ? ' picked' : ' gone'}`;

  return (
    <div className="fs" style={themeVars(t)}>
      <div className="fs-top">
        <span className="fs-label">
          Saison{' '}
          <b key={player.season} className="fs-tick">
            {player.season}
          </b>
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
        <div className="fs-id" key={player.club?.id ?? 'none'}>
          <span className="fs-name">{player.name}</span>
          <span className="fs-club">{teamName(player)}</span>
          <span className="fs-league">{player.club?.league}</span>
        </div>
        <OvrBox ovr={ovrOf(player)} />
      </header>

      <div className="fs-chips">
        <span>{player.age} J.</span>
        <span>{positionLabel(player.position)}</span>
        <span>{roleLabel(share)}</span>
        <span>{formatValue(marketValue(player))}</span>
        <span>{player.contract ? `${player.contract.yearsLeft} J. Vertrag` : 'Vereinslos'}</span>
        {titleCount ? (
          <span className="fs-gold">
            <Trophy /> {titleCount} Titel
          </span>
        ) : null}
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
          <div className={allRows || ended ? 'fs-rows fs-rows-all' : 'fs-rows'}>
            {rows.map((r, i) => {
              const prev = player.history[player.history.length - rows.length + i - 1];
              return (
                <div className={i === rows.length - 1 ? 'fs-row fresh' : 'fs-row'} key={r.age}>
                  <span>{r.age}</span>
                  <span className="fs-cl">
                    {r.titles?.length ? (
                      <span
                        className="fs-cups"
                        title={r.titles.map((x) => TITLE_LABEL[x as TitleId]).join(', ')}
                      >
                        {r.titles.map((x) => (
                          <Trophy key={x} size={12} />
                        ))}
                      </span>
                    ) : null}
                    {r.clubName}
                  </span>
                  <span className={prev && r.ovr > prev.ovr ? 'up' : undefined}>{r.ovr}</span>
                  <span>{r.games}</span>
                  <span>{r.goals ?? 0}</span>
                  <span>{r.assists ?? 0}</span>
                </div>
              );
            })}
          </div>
          {player.history.length > 3 && !ended ? (
            <button type="button" className="fs-more" onClick={() => setAllRows(!allRows)}>
              {allRows ? 'Weniger' : `Alle ${player.history.length} Saisons`}
            </button>
          ) : null}
        </section>
      ) : (
        <p className="fs-empty">
          Deine erste Saison. Jede Entscheidung schreibt eine Zeile deiner Karriere.
        </p>
      )}

      {showOutcome ? (
        <p className={`fs-outcome ${outcome.tone}`} key={outcome.id}>
          <b>{outcome.title}</b> {outcome.text}
        </p>
      ) : null}

      <section className="fs-decide" aria-live="polite" key={decisionKey}>
        {event ? (
          <>
            <h2 className="fs-title">{event.title}</h2>
            <p className="fs-text">{event.text(player)}</p>
            <div className={`fs-grid n${Math.min(event.choices.length, 3)}`}>
              {event.choices.map((c, i) => (
                <button
                  key={c.label}
                  type="button"
                  className={tileClass(i, i === 0)}
                  style={{ animationDelay: `${60 + i * 50}ms` }}
                  disabled={busy}
                  onClick={() => choose(i)}
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
            <h2 className="fs-title">
              {transferWindow.expired ? 'Dein Vertrag läuft aus' : 'Wechseln oder bleiben?'}
            </h2>
            <p className="fs-text">
              {transferWindow.expired
                ? 'Ohne neuen Klub ist die Karriere vorbei.'
                : 'Das Transferfenster ist offen.'}
            </p>
            <div className="fs-grid n2">
              {transferWindow.options.map((o, i) => {
                const good = o.role === 'Stammspieler' || o.role === 'Rotation';
                return (
                  <button
                    key={`${o.kind}-${o.club.id}`}
                    type="button"
                    className={`${tileClass(i, false)} fs-offer-tile`}
                    style={{
                      animationDelay: `${60 + i * 50}ms`,
                      borderTopColor: clubTheme(o.club).accent,
                    }}
                    disabled={busy}
                    onClick={() => transfer(i)}
                  >
                    <span className="fs-kind">
                      {o.kind === 'move'
                        ? 'Wechsel'
                        : o.kind === 'extend'
                          ? 'Verlängern'
                          : 'Bleiben'}
                    </span>
                    <span className="fs-offer">
                      <ClubCrest club={o.club} size={30} />
                      <span className="fs-tile-t">{o.club.name}</span>
                    </span>
                    <span className="fs-sub">{o.club.league}</span>
                    <span className="fs-odds">
                      <span className={good ? 'up' : 'down'}>
                        {o.squad === 'reserve' ? `${o.role} in der Zweiten` : o.role}
                      </span>
                      <span className="neutral">{o.years} Jahre</span>
                      <span className="neutral">{o.wage.toLocaleString('de-DE')} € pro Woche</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {ended && !overlay ? <CareerEnd onNew={onNew} /> : null}
      </section>

      {overlay?.kind === 'recap' ? <Recap o={overlay} onClose={() => setOverlay(null)} /> : null}
      {overlay?.kind === 'welcome' ? (
        <Welcome club={overlay.club} role={overlay.role} onClose={() => setOverlay(null)} />
      ) : null}
    </div>
  );
}

function sortTitles(ids: string[]): TitleId[] {
  return TITLE_ORDER.filter((t) => ids.includes(t));
}

/** OVR box: counts up to a new value and pops while it changes. */
function OvrBox({ ovr }: { ovr: number }) {
  const [from, setFrom] = useState(ovr);
  const shown = useCountUp(ovr, 700, from);
  useEffect(() => {
    const id = window.setTimeout(() => setFrom(ovr), 750);
    return () => window.clearTimeout(id);
  }, [ovr]);
  return (
    <div className={`fs-ovr${ovr !== from ? ' pop' : ''}`}>
      <b>{shown}</b>
      <span>OVR</span>
    </div>
  );
}

/** Season recap: games, goals, assists count up, OVR old to new, what the decision did. */
function Recap({ o, onClose }: { o: Extract<Overlay, { kind: 'recap' }>; onClose: () => void }) {
  const games = useCountUp(o.record.games, 900, 0, 250);
  const goals = useCountUp(o.record.goals ?? 0, 900, 0, 400);
  const assists = useCountUp(o.record.assists ?? 0, 900, 0, 550);
  const delta = o.ovrAfter - o.ovrBefore;
  return (
    <button type="button" className="fs-overlay" onClick={onClose} aria-label="Weiter">
      <span className={o.record.titles?.length ? 'fs-card gold' : 'fs-card'}>
        <span className="fs-card-head">
          <span className="fs-card-club">{o.record.clubName}</span>
          <span className="fs-card-age">Saison mit {o.record.age}</span>
        </span>
        {o.outcome ? (
          <span className={`fs-card-out ${o.outcome.tone}`}>
            <b>{o.outcome.title}</b>
            <span>{o.outcome.text}</span>
          </span>
        ) : null}
        <span className="fs-stats">
          <span>
            <b>{games}</b>
            <small>Spiele</small>
          </span>
          <span>
            <b>{goals}</b>
            <small>Tore</small>
          </span>
          <span>
            <b>{assists}</b>
            <small>Vorlagen</small>
          </span>
        </span>
        {o.record.titles?.length ? (
          <span className="fs-won">
            {sortTitles(o.record.titles).map((x, i) => (
              <span key={x} className="fs-trophy" style={{ animationDelay: `${1100 + i * 220}ms` }}>
                <Trophy size={18} /> {TITLE_LABEL[x]}
              </span>
            ))}
          </span>
        ) : null}
        <span className="fs-ovrjump">
          <span>{o.ovrBefore}</span>
          <svg className="arrow" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 12h13m-5-5 5 5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <b>{o.ovrAfter}</b>
          <em className={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}>
            {delta > 0 ? `+${delta}` : delta}
          </em>
        </span>
        <span className="fs-tap">Tippen zum Weiterspielen</span>
        <span
          className="fs-timer"
          style={{ animationDuration: `${RECAP_MS + (o.record.titles?.length ?? 0) * 700}ms` }}
          aria-hidden
        />
      </span>
    </button>
  );
}

/** Transfer: the screen wipes into the new club's colours. */
function Welcome({ club, role, onClose }: { club: Club; role: string; onClose: () => void }) {
  return (
    <button
      type="button"
      className="fs-overlay welcome"
      style={themeVars(clubTheme(club))}
      onClick={onClose}
      aria-label="Weiter"
    >
      <span className="fs-wipe" aria-hidden />
      <span className="fs-welcome">
        <span className="fs-crest-big">
          <ClubCrest club={club} size={96} />
        </span>
        <span className="fs-welcome-hi">Willkommen bei</span>
        <span className="fs-welcome-name">{club.name}</span>
        <span className="fs-welcome-meta">
          <span>{club.league}</span>
          <span>{role}</span>
        </span>
      </span>
    </button>
  );
}

/** End of the career in club colours: totals count up, best year. */
function CareerEnd({ onNew }: { onNew: () => void }) {
  const player = useCareerStore((s) => s.player);
  const h = player.history;
  const games = useCountUp(
    h.reduce((a, r) => a + r.games, 0),
    1200,
    0,
    200,
  );
  const goals = useCountUp(
    h.reduce((a, r) => a + (r.goals ?? 0), 0),
    1200,
    0,
    350,
  );
  const peak = h.reduce((a, r) => Math.max(a, r.ovr), 0);
  const best = h.reduce<SeasonRecord | null>(
    (a, r) => (!a || (r.goals ?? 0) > (a.goals ?? 0) ? r : a),
    null,
  );
  return (
    <div className="fs-end">
      <h2 className="fs-title">Karriere beendet</h2>
      <p className="fs-text">{player.endReason}</p>
      <span className="fs-stats">
        <span>
          <b>{games}</b>
          <small>Spiele</small>
        </span>
        <span>
          <b>{goals}</b>
          <small>Tore</small>
        </span>
        <span>
          <b>{peak}</b>
          <small>Bestes OVR</small>
        </span>
      </span>
      <Cabinet />
      {best ? (
        <p className="fs-text">
          Bestes Jahr: mit {best.age} bei {best.clubName}, {best.goals ?? 0} Tore in {best.games}{' '}
          Spielen.
        </p>
      ) : null}
      <button type="button" className="fs-tile main fs-again" onClick={onNew}>
        <span className="fs-tile-t">Neue Karriere</span>
      </button>
    </div>
  );
}

/** Trophy cabinet: every title type once, with how often it was won. */
function Cabinet() {
  const history = useCareerStore((s) => s.player.history);
  const count = new Map<TitleId, number>();
  for (const r of history)
    for (const x of r.titles ?? []) count.set(x as TitleId, (count.get(x as TitleId) ?? 0) + 1);
  const won = TITLE_ORDER.filter((t) => count.has(t));
  if (!won.length) return <p className="fs-text">Keine Titel. Nächstes Mal.</p>;
  return (
    <div className="fs-cabinet">
      {won.map((t, i) => (
        <span key={t} className="fs-trophy" style={{ animationDelay: `${300 + i * 150}ms` }}>
          <Trophy size={18} /> {count.get(t)}× {TITLE_LABEL[t]}
        </span>
      ))}
    </div>
  );
}
