/**
 * Platzhalter-Komponente für noch nicht implementierte Seiten.
 */

interface ComingSoonProps {
  /** Seitentitel */
  title: string;
  /** Kurzbeschreibung der geplanten Funktion */
  description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      <div className="flex items-center justify-center rounded-panel border border-dashed border-border-subtle py-16">
        <p className="text-sm text-text-muted">Dieses Modul wird in einem zukünftigen Update verfügbar sein.</p>
      </div>
    </div>
  );
}
