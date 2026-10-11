import { formatValue, marketValue, ovrOf } from '../engine/marketValue';
import type { PlayerState } from '../types/player';
import './CareerTable.css';

interface Props {
  player: PlayerState;
}

export function CareerTable({ player }: Props) {
  const past = player.history.slice(-3);
  const value = marketValue(player);

  return (
    <section className="ctable" aria-label="Karriere">
      <div className="cr h u">
        <span>Alter</span>
        <span>Klub</span>
        <span>OVR</span>
        <span>Spiele</span>
        <span>Wert</span>
      </div>
      {past.map((r) => (
        <div className="cr done" key={r.age}>
          <b>{r.age}</b>
          <span className="club">{r.clubName}</span>
          <span>{r.ovr}</span>
          <span>{r.games}</span>
          <span className="v">{formatValue(r.value)}</span>
        </div>
      ))}
      <div className="cr now">
        <b>{player.age}</b>
        <span className="club">{player.club?.name ?? 'vereinslos'}</span>
        <span>{ovrOf(player)}</span>
        <span>{player.seasonGames}</span>
        <span className="v">{formatValue(value)}</span>
      </div>
      <div className="cr future">
        <b>{player.age + 1}</b>
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
