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
        <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">{title}</h1>
        <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">{description}</p>
      </div>
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 py-16 dark:border-gray-600">
        <p className="text-gray-400 text-sm dark:text-gray-500">Dieses Modul wird in einem zukünftigen Update verfügbar sein.</p>
      </div>
    </div>
  );
}
