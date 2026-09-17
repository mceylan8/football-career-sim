import { useCareerStore } from '../state/careerStore';
import { NodeCard } from './NodeCard';
import './SeasonMap.css';

export function SeasonMap() {
  const seasonMap = useCareerStore((s) => s.seasonMap);
  const selectNode = useCareerStore((s) => s.selectNode);
  const careerEnded = useCareerStore((s) => s.player.careerEnded);

  if (!seasonMap) {
    return (
      <div className="season-map empty">
        Starte eine Karriere, um die Saison-Map zu sehen.
      </div>
    );
  }

  return (
    <div className="season-map">
      <h2>Saison-Pfad</h2>
      <p className="map-hint">
        Wähle den nächsten Schritt — der Ausgang ist noch unbekannt.
      </p>
      <div className="map-rows">
        {seasonMap.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="map-row">
            {row.map((node) => (
              <NodeCard
                key={node.id}
                type={node.type}
                available={
                  !careerEnded &&
                  seasonMap.availableNodeIds.includes(node.id)
                }
                visited={node.visited}
                current={seasonMap.currentNodeId === node.id}
                onClick={() => selectNode(node.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
