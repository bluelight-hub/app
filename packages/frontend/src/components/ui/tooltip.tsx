import { Tooltip as ChakraTooltip, Portal } from '@chakra-ui/react';
import * as React from 'react';

/**
 * Props für die Tooltip-Komponente.
 *
 * @interface TooltipProps
 * @extends ChakraTooltip.RootProps
 */
export interface TooltipProps extends ChakraTooltip.RootProps {
  /** Zeigt einen Pfeil vom Tooltip zum Trigger-Element an */
  showArrow?: boolean;
  /** Rendert den Tooltip in einem Portal (außerhalb der DOM-Hierarchie) */
  portalled?: boolean;
  /** Referenz zum Portal-Container-Element */
  portalRef?: React.RefObject<HTMLElement>;
  /** Der Inhalt, der im Tooltip angezeigt werden soll */
  content: React.ReactNode;
  /** Zusätzliche Props für das Tooltip-Content-Element */
  contentProps?: ChakraTooltip.ContentProps;
  /** Deaktiviert den Tooltip vollständig */
  disabled?: boolean;
}

/**
 * Tooltip-Komponente für kontextuelle Informationen.
 *
 * Zeigt beim Hover oder Focus zusätzliche Informationen zu einem Element an.
 * Der Tooltip wird standardmäßig in einem Portal gerendert, um Probleme mit
 * z-index und Overflow zu vermeiden.
 *
 * @param props - Die Props für die Tooltip-Komponente
 * @param props.showArrow - Zeigt einen Pfeil vom Tooltip zum Trigger-Element
 * @param props.children - Das Element, das den Tooltip auslöst
 * @param props.disabled - Deaktiviert den Tooltip
 * @param props.portalled - Rendert den Tooltip in einem Portal (default: true)
 * @param props.content - Der Inhalt des Tooltips
 * @param props.contentProps - Zusätzliche Props für das Content-Element
 * @param props.portalRef - Referenz zum Portal-Container
 * @param ref - Forwarded ref zum Tooltip-Content-Element
 * @returns Die Tooltip-Komponente oder nur die children wenn disabled
 *
 * @example
 * <Tooltip content="Hilfreicher Hinweis" showArrow>
 *   <Button>Hover mich</Button>
 * </Tooltip>
 */
export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(props, ref) {
  const { showArrow, children, disabled, portalled = true, content, contentProps, portalRef, ...rest } = props;

  if (disabled) return children;

  return (
    <ChakraTooltip.Root {...rest}>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal disabled={!portalled} container={portalRef}>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content ref={ref} {...contentProps}>
            {showArrow && (
              <ChakraTooltip.Arrow>
                <ChakraTooltip.ArrowTip />
              </ChakraTooltip.Arrow>
            )}
            {content}
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  );
});
