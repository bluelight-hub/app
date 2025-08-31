import { useEinsaetze, useEinsatz } from '@/hooks/useEinsaetze';
import { useEinsatzStore } from '@/stores/einsatzStore';
import { Button } from '@atoms/button.atom';
import { Card } from '@atoms/card.atom';

export function EinsatzExample() {
  const { einsaetze } = useEinsaetze({
    search: 'wohn',
  });

  const { selectedEinsatzId, setSelectedEinsatzId, clearSelectedEinsatzId } = useEinsatzStore();
  const { einsatz } = useEinsatz(selectedEinsatzId);

  if (!einsaetze) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>{einsaetze.length} Einsätze verfügbar</h2>
      <div>{einsatz && <Card>Einsatz ausgewählt: {einsatz.name}</Card>}</div>
      {selectedEinsatzId && (
        <Button variant="danger" onClick={clearSelectedEinsatzId}>
          Auswahl leeren
        </Button>
      )}
      <div>
        <ul>
          {einsaetze.map((einsatz) => (
            <li key={einsatz.id}>
              <h3>{einsatz.name}</h3>
              <p>{einsatz.alarmstichwort}</p>
              <Button onClick={() => setSelectedEinsatzId(einsatz.id)}>Auswählen</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
