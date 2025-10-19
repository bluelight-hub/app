import { Button } from '@/components/atoms/button.atom';
import { cn } from '@/utils/cn';
import type React from 'react';
import { useState, useMemo } from 'react';
import { PiPentagon, PiPath, PiRectangle, PiPencilSimple, PiTrash, PiTextAa, PiX } from 'react-icons/pi';

/**
 * Drawing-Tool-Typen für Lagekarte
 */
export type DrawingTool = 'polygon' | 'polyline' | 'rectangle' | 'text' | 'edit' | 'delete' | null;

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
  // UI-State: Ob Zeichnen-Tools ausgeklappt sind
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Tool-Konfiguration mit Icons und Labels
   * PERFORMANCE: useMemo verhindert Array-Neuerstellen bei jedem Render
   */
  const tools = useMemo(
    () => [
      {
        type: 'polygon' as const,
        icon: PiPentagon,
        label: 'Polygon',
        color: '#ef4444', // Tailwind red-500
      },
      {
        type: 'polyline' as const,
        icon: PiPath,
        label: 'Linie',
        color: '#10b981', // Tailwind green-500
      },
      {
        type: 'rectangle' as const,
        icon: PiRectangle,
        label: 'Rechteck',
        color: '#3b82f6', // Tailwind blue-500
      },
      {
        type: 'text' as const,
        icon: PiTextAa,
        label: 'Text',
        color: '#8b5cf6', // Tailwind violet-500
      },
      {
        type: 'edit' as const,
        icon: PiPencilSimple,
        label: 'Bearbeiten',
        color: '#6b7280', // Tailwind gray-500
      },
      {
        type: 'delete' as const,
        icon: PiTrash,
        label: 'Löschen',
        color: '#dc2626', // Tailwind red-600
      },
    ],
    [],
  );

  /**
   * Handler: User klickt auf "Zeichnen" Button
   */
  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  /**
   * Handler: User wählt Drawing-Tool aus
   */
  const handleToolSelect = (tool: DrawingTool) => {
    onToolSelect(tool);
    setIsExpanded(false); // Tools ausblenden nach Auswahl
  };

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
        onClick={() => handleToolSelect(tool.type)}
        intent={isActive ? 'info' : 'secondary'}
        appearance={isActive ? 'filled' : 'ghost'}
        size="sm"
        fullWidth
        className={cn(
          'justify-start gap-2 text-left',
          // Active state enhancements (blue glow)
          isActive && 'shadow-blue-500/50 shadow-lg ring-2 ring-blue-400 dark:ring-blue-500',
          // Hover scale animation
          'hover:scale-[1.02]',
        )}
        aria-label={`Drawing-Tool: ${tool.label}`}
        aria-pressed={isActive}
      >
        {/* Icon */}
        <Icon size={20} color={isActive ? '#ffffff' : tool.color} aria-hidden="true" />

        {/* Label */}
        <span>{tool.label}</span>
      </Button>
    );
  };

  return (
    <>
      {/* Desktop: Im Flex-Container (keine absolute Positionierung) */}
      {/* Glassmorphism Container */}
      <div
        className={cn(
          // Glassmorphism
          'rounded-xl border border-gray-200/50 bg-white/90 shadow-xl backdrop-blur-lg',
          'dark:border-gray-700/50 dark:bg-gray-900/90',
          // Width
          'min-w-[200px]',
          // Transition
          'transition-all duration-300 ease-in-out',
        )}
      >
        {/* Collapsed State: Nur "Zeichnen" Button */}
        {!isExpanded ? (
          <Button onClick={handleToggleExpand} intent="secondary" size="md" fullWidth aria-label="Zeichnen" aria-expanded={isExpanded}>
            <PiPencilSimple size={20} aria-hidden="true" />
            <span>Zeichnen</span>
          </Button>
        ) : (
          /* Expanded State: Drawing-Tools */
          <div className="p-2">
            {/* Header mit Schließen-Button */}
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="font-semibold text-gray-900 text-sm dark:text-gray-100">Zeichnen-Tool wählen</span>
              <Button onClick={handleToggleExpand} intent="secondary" appearance="ghost" size="icon" className="p-1" aria-label="Tools schließen">
                <PiX size={18} aria-hidden="true" />
              </Button>
            </div>

            {/* Drawing Tools */}
            <div className="flex flex-col gap-1">{tools.map(renderToolButton)}</div>
          </div>
        )}
      </div>

      {/* Mobile: Bottom Bar */}
      <div className="absolute right-4 bottom-20 left-4 z-[1000] md:hidden">
        {/* Glassmorphism Container */}
        <div
          className={cn(
            // Glassmorphism
            'rounded-xl border border-gray-200/50 bg-white/90 shadow-xl backdrop-blur-lg',
            'dark:border-gray-700/50 dark:bg-gray-900/90',
            // Padding
            'p-3',
          )}
        >
          {/* Compact Button für Zeichnen auf Mobile */}
          <Button
            onClick={handleToggleExpand}
            intent={isExpanded ? 'primary' : 'secondary'}
            appearance={isExpanded ? 'filled' : 'outline'}
            size="lg"
            fullWidth
            aria-label="Zeichnen"
            aria-expanded={isExpanded}
          >
            <PiPencilSimple size={22} aria-hidden="true" />
            <span className="text-base">Zeichnen</span>
          </Button>

          {/* Expanded: Zeige alle Tools */}
          {isExpanded && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {tools.map((tool) => {
                const isActive = selectedTool === tool.type;
                const Icon = tool.icon;

                return (
                  <Button
                    type="button"
                    key={tool.type}
                    onClick={() => handleToolSelect(tool.type)}
                    intent={isActive ? 'info' : 'secondary'}
                    appearance={isActive ? 'filled' : 'outline'}
                    size="md"
                    className="flex-col gap-1 p-3"
                    aria-label={`Drawing-Tool: ${tool.label}`}
                    aria-pressed={isActive}
                  >
                    <Icon size={24} color={isActive ? '#ffffff' : tool.color} aria-hidden="true" />
                    <span className="text-xs">{tool.label}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
