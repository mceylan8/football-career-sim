import { useEffect } from 'react';
import clubsData from '../data/clubs.json';
import { useCareerStore } from '../state/careerStore';
import type { Club } from '../types/club';
import { ClubCrest } from './ClubCrest';
import { Digits } from './Digits';
import { PlayerAvatar, type AvatarAnim } from './PlayerAvatar';
import './MatchBoard.css';

const clubs = clubsData as Club[];
const SHOW_MS = 4200;

const LABEL = { win: 'SIEG', draw: 'REMIS', loss: 'NIEDERLAGE' } as const;

/** What the figure does on the little pitch: shot + cheer for a goal, run + cheer for an assist. */
function scene(m: { outcome: 'win' | 'draw' | 'loss'; playerGoals: number; playerAssists: number }): {
  play?: AvatarAnim[];
  idle?: AvatarAnim[];
} {
  if (m.playerGoals > 0) return { play: ['torschuss', 'jubel'] };
  if (m.playerAssists > 0) return { play: ['laufen', 'jubel'] };
  if (m.outcome === 'win') return { play: ['jubel'] };
  if (m.outcome === 'draw') return { idle: ['bereit', 'jonglieren'] };
  return { idle: ['bereitSchraeg'] };
}

function signed(n: number): string {
  return `${n >= 0 ? '+' : ''}${n}`;
}

/**
 * Scoreboard that drops in after every key match: result word in the outcome
 * colour, score with both crests, your rating and the form/reputation swing.
 * Tap to close, otherwise it leaves on its own.
 */
export function MatchBoard() {
  const last = useCareerStore((s) => s.lastMatch);
  const own = useCareerStore((s) => s.player.club);
  const talent = useCareerStore((s) => s.player.talent?.id ?? 'solid');
  const dismiss = useCareerStore((s) => s.dismissMatch);

  useEffect(() => {
    if (!last) return;
    const t = setTimeout(dismiss, SHOW_MS);
    return () => clearTimeout(t);
  }, [last, dismiss]);

  if (!last) return null;
  const opp = clubs.find((c) => c.id === last.opponentId) ?? null;
  const sc = scene(last);

  return (
    <div className="mb-wrap" role="status" aria-live="assertive">
      <button
        type="button"
        key={last.id}
        className={`mb mb-${last.outcome}`}
        onClick={dismiss}
        aria-label={`${LABEL[last.outcome]} ${last.goalsFor} zu ${last.goalsAgainst} gegen ${last.opponentName}. Schließen`}
      >
        <div className="mb-head t-label">{LABEL[last.outcome]}</div>
        <div className={`mb-pitch${last.playerGoals > 0 ? ' scored' : ''}`} aria-hidden>
          <i className="mb-goal" />
          <PlayerAvatar
            talent={talent}
            club={own}
            size={64}
            idle={sc.idle}
            play={sc.play}
            playKey={last.id}
            mood={last.outcome === 'loss' ? 'sad' : 'idle'}
          />
        </div>
        <div className="mb-score">
          <div className="mb-team">
            <ClubCrest club={own} size={44} />
            <span className="mb-name">{last.ownName}</span>
          </div>
          <div className="mb-num">
            <Digits>{`${last.goalsFor}:${last.goalsAgainst}`}</Digits>
          </div>
          <div className="mb-team">
            <ClubCrest club={opp} size={44} />
            <span className="mb-name">{last.opponentName}</span>
          </div>
        </div>
        <div className="mb-stats">
          <span>
            <span className="t-label">Note</span> <b className="t-num">{last.rating.toFixed(1)}</b>
          </span>
          {last.playerGoals > 0 ? (
            <span>
              <span className="t-label">Tore</span> <b className="t-num">{last.playerGoals}</b>
            </span>
          ) : null}
          {last.playerAssists > 0 ? (
            <span>
              <span className="t-label">Vorlagen</span> <b className="t-num">{last.playerAssists}</b>
            </span>
          ) : null}
          <span>
            <span className="t-label">Form</span> <b className="t-num">{signed(last.formDelta)}</b>
          </span>
          <span>
            <span className="t-label">Ruf</span> <b className="t-num">{signed(last.reputationDelta)}</b>
          </span>
        </div>
        <i className="mb-timer" style={{ animationDuration: `${SHOW_MS}ms` }} />
      </button>
    </div>
  );
}
