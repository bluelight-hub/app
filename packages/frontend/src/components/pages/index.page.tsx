import { ColorModeButton } from '@molecules/color-mode-button.molecule.tsx';

/**
 * Startseite der Anwendung.
 *
 * Zeigt die Begrüßung und den Color-Mode-Button.
 *
 * @returns Die Index-Page-Komponente
 */
export function IndexPage() {
  return (
    <>
      <div>Hello "/"!</div>
      <ColorModeButton />
    </>
  );
}
