import { formatValue, marketValue, ovrOf } from '../engine/marketValue';
import type { PlayerState } from '../types/player';
import { Digits } from './Digits';
import './CareerTable.css';

interface Props {
  player: PlayerState;
}

export function CareerTable({ player }: Props) {
  const past = player.history.slice(-3);
  const value = marketValue(player);

  return (
    <section className="ctable" aria-label="Karriere">
      <div className="cr h t-label">
        <span>Alter</span>
        <span>Klub</span>
        <span>OVR</span>
        <span>Spiele</span>
        <span>Wert</span>
      </div>
      {past.map((r) => (
        <div className="cr done" key={r.age}>
          <b className="t-num">{r.age}</b>
          <span className="club">
            <Digits>{r.clubName}</Digits>
          </span>
          <span className="t-num">{r.ovr}</span>
          <span className="t-num">{r.games}</span>
          <span className="v t-num">{formatValue(r.value)}</span>
        </div>
      ))}
      <div className="cr now">
        <b className="t-num">{player.age}</b>
        <span className="club">
          <Digits>{player.club?.name ?? 'vereinslos'}</Digits>
        </span>
        <span className="t-num">{ovrOf(player)}</span>
        <span className="t-num">{player.seasonGames}</span>
        <span className="v t-num">{formatValue(value)}</span>
      </div>
      <div className="cr future">
        <b className="t-num">{player.age + 1}</b>
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
