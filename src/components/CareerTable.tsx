import { ovrOf } from '../engine/marketValue';
import { teamName } from '../engine/squad';
import type { PlayerState } from '../types/player';
import { Digits } from './Digits';
import './CareerTable.css';

interface Props {
  player: PlayerState;
}

export function CareerTable({ player }: Props) {
  const past = player.history.slice(-3);

  return (
    <section className="ctable" aria-label="Karriere">
      <div className="cr h t-label">
        <span>Alter</span>
        <span>Klub</span>
        <span>OVR</span>
        <span>Sp</span>
        <span>T</span>
        <span>A</span>
        <span>Ø</span>
      </div>
      {past.map((r) => (
        <div className="cr done" key={r.age}>
          <b className="t-num">{r.age}</b>
          <span className="club">
            <Digits>{r.clubName}</Digits>
          </span>
          <span className="t-num">{r.ovr}</span>
          <span className="t-num">{r.games}</span>
          <span className="t-num">{r.goals ?? '–'}</span>
          <span className="t-num">{r.assists ?? '–'}</span>
          <span className="t-num">{r.avgRating ? r.avgRating.toFixed(1) : '–'}</span>
        </div>
      ))}
      <div className="cr now">
        <b className="t-num">{player.age}</b>
        <span className="club">
          <Digits>{teamName(player)}</Digits>
        </span>
        <span className="t-num">{ovrOf(player)}</span>
        <span className="t-num">{player.seasonGames}</span>
        <span className="t-num">{player.seasonGoals}</span>
        <span className="t-num">{player.seasonAssists}</span>
        <span className="t-num">
          {player.seasonGames ? (player.seasonRatingSum / player.seasonGames).toFixed(1) : '–'}
        </span>
      </div>
      <div className="bilanz" aria-label="Saisonbilanz">
        <span className="t-label">Bilanz</span>
        <span className="b w">
          <span className="t-num">{player.seasonWins}</span> <span className="t-label">S</span>
        </span>
        <span className="b d">
          <span className="t-num">{player.seasonDraws}</span> <span className="t-label">U</span>
        </span>
        <span className="b l">
          <span className="t-num">{player.seasonLosses}</span> <span className="t-label">N</span>
        </span>
      </div>
      <div className="cr future">
        <b className="t-num">{player.age + 1}</b>
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
