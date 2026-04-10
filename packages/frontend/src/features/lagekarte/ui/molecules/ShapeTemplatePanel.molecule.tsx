/**
 * ShapeTemplatePanel — Vordefinierte Shape-Templates für schnelles Zeichnen
 *
 * Kompaktes schwebendes Panel unterhalb der DrawToolbar. Klick auf ein Template
 * setzt den aktiven Stil und wechselt in den passenden Zeichenmodus.
 */

import { cn } from '@/shared/ui/cn';
import { SHAPE_TEMPLATES, type ShapeTemplate } from '../../drawing/templates/template-registry';
import type { DrawingStyle } from '../../drawing/types';
import type { DrawMode } from '../../drawing/types';

export interface ShapeTemplatePanelProps {
  /** Panel-Sichtbarkeit */
  isVisible: boolean;
  /** Template anwenden: Stil setzen + Modus wechseln */
  onApplyTemplate: (template: ShapeTemplate) => void;
  /** Aktuell aktiver Zeichenmodus (zum Highlighting) */
  activeMode: DrawMode;
}

/** Farb-Punkt als Template-Vorschau */
function TemplateColorDot({ style }: { style: Partial<DrawingStyle> }) {
  return <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-white/50" style={{ backgroundColor: style.color ?? '#3b82f6' }} aria-hidden="true" />;
}

export function ShapeTemplatePanel({ isVisible, onApplyTemplate, activeMode }: ShapeTemplatePanelProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute top-4 left-16 z-10 w-48 rounded-lg border border-border-subtle bg-surface-panel shadow-lg">
      <div className="border-b border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary">Vorlagen</div>
      <div className="max-h-64 overflow-y-auto p-1">
        {SHAPE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onApplyTemplate(template)}
            title={template.description}
            className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors', 'text-text-primary hover:bg-action-secondary')}
          >
            <TemplateColorDot style={template.style} />
            <span className="truncate">{template.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
