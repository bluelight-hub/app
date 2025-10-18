import { Button } from '@/components/atoms/button.atom';
import type React from 'react';
import { PiPentagon, PiPath, PiRectangle, PiPencilSimple, PiTrash } from 'react-icons/pi';

/**
 * Drawing-Tool-Typen für Lagekarte
 */
export type DrawingTool = 'polygon' | 'polyline' | 'rectangle' | 'edit' | 'delete' | null;

interface DrawingToolbarProps {
  /**
   * Callback wenn ein Drawing-Tool ausgewählt wird
   */
  onToolSelect: (tool: DrawingTool) => void;
  /**
   * Aktuell ausgewähltes Drawing-Tool (für Active State)
   */
  selectedTool: DrawingTool;
}

/**
 * Drawing-Toolbar-Komponente für Lagekarte
 *
 * Zeigt Drawing-Tools (Polygon, Linie, Rechteck, Bearbeiten, Löschen) an,
 * mit denen der User Gefahrenbereiche, Rettungswege und Sperrbereiche zeichnen kann.
 *
 * @param onToolSelect - Callback wenn Tool ausgewählt wird
 * @param selectedTool - Aktuell ausgewähltes Tool (für Active State)
 *
 * @remarks
 * - Position: Unterhalb POI-Toolbar (left-4 top-40)
 * - Active State: primary intent für ausgewähltes Tool
 * - Desktop: Vertical sidebar (left side)
 * - Mobile: Horizontal toolbar (bottom) - neben POI-Toolbar
 *
 * @example
 * ```tsx
 * <DrawingToolbar
 *   onToolSelect={(tool) => setSelectedTool(tool)}
 *   selectedTool={selectedTool}
 * />
 * ```
 */
export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({ onToolSelect, selectedTool }) => {
  /**
   * Tool-Konfiguration mit Icons und Labels
   */
  const tools: Array<{
    type: DrawingTool;
    icon: React.ElementType;
    label: string;
    color: string;
  }> = [
    {
      type: 'polygon',
      icon: PiPentagon,
      label: 'Polygon',
      color: '#ef4444', // Tailwind red-500
    },
    {
      type: 'polyline',
      icon: PiPath,
      label: 'Linie',
      color: '#10b981', // Tailwind green-500
    },
    {
      type: 'rectangle',
      icon: PiRectangle,
      label: 'Rechteck',
      color: '#3b82f6', // Tailwind blue-500
    },
    {
      type: 'edit',
      icon: PiPencilSimple,
      label: 'Bearbeiten',
      color: '#6b7280', // Tailwind gray-500
    },
    {
      type: 'delete',
      icon: PiTrash,
      label: 'Löschen',
      color: '#dc2626', // Tailwind red-600
    },
  ];

  /**
   * Rendert einen Drawing-Tool-Button
   */
  const renderToolButton = (tool: (typeof tools)[0]) => {
    const isActive = selectedTool === tool.type;
    const Icon = tool.icon;

    return (
      <Button
        type="button"
        key={tool.type}
        onClick={() => onToolSelect(tool.type)}
        intent={isActive ? 'primary' : 'secondary'}
        appearance="outline"
        size="md"
        className="w-full justify-start gap-2"
        aria-label={`Drawing-Tool: ${tool.label}`}
        aria-pressed={isActive}
      >
        {/* Icon */}
        <Icon size={20} color={isActive ? undefined : tool.color} aria-hidden="true" />

        {/* Label */}
        <span className="font-medium text-sm">{tool.label}</span>
      </Button>
    );
  };

  return (
    <>
      {/* Desktop: Vertical Sidebar (left side, below POI-Toolbar) */}
      <div className="absolute top-40 left-4 z-50 hidden flex-col gap-2 md:flex">
        <div className="rounded-lg border border-gray-300 bg-white p-2 shadow-md dark:border-gray-600 dark:bg-gray-800">
          {/* Header */}
          <div className="mb-2 px-2 py-1">
            <h3 className="font-semibold text-gray-900 text-sm dark:text-gray-100">Zeichnen</h3>
          </div>

          {/* Drawing Tools */}
          <div className="flex flex-col gap-1">{tools.map(renderToolButton)}</div>
        </div>
      </div>

      {/* Mobile: Horizontal Bottom Bar (neben POI-Toolbar) */}
      <div className="absolute right-4 bottom-20 left-4 z-50 flex gap-2 overflow-x-auto md:hidden">
        {tools.map((tool) => {
          const isActive = selectedTool === tool.type;
          const Icon = tool.icon;

          return (
            <Button
              type="button"
              key={tool.type}
              onClick={() => onToolSelect(tool.type)}
              intent={isActive ? 'primary' : 'secondary'}
              appearance="outline"
              size="lg"
              className="min-w-12 h-12 shrink-0 justify-center"
              aria-label={`Drawing-Tool: ${tool.label}`}
              aria-pressed={isActive}
            >
              <Icon size={24} color={isActive ? undefined : tool.color} aria-hidden="true" />
            </Button>
          );
        })}
      </div>
    </>
  );
};
