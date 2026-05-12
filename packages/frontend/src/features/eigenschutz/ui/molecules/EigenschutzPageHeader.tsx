import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import type { ReactNode } from 'react';

export interface EigenschutzPageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/**
 * Einheitlicher Page-Header für alle Eigenschutz-Unterseiten.
 *
 * Kapselt Titel (`<h1>` via `Heading size="2xl"`), optionale Beschreibung
 * und einen rechtsbündigen Actions-Slot. String-Beschreibungen werden in
 * `Text color="muted" size="sm"` gewrappt; ReactNode-Beschreibungen werden
 * unverändert gerendert (für Sonderfälle wie Warning-Hinweise). Vertikales
 * Mehrzeilen-Layout der Actions bleibt Sache des Callers.
 */
export function EigenschutzPageHeader({ title, description, actions }: EigenschutzPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <Heading as="h1" size="2xl">
          {title}
        </Heading>
        {description != null && description !== false ? (
          typeof description === 'string' ? (
            <Text color="muted" size="sm">
              {description}
            </Text>
          ) : (
            description
          )
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
    </header>
  );
}
