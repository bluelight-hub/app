import { ColorModeButton } from '@molecules/color-mode-button.molecule.tsx';
import { useRouter } from '@tanstack/react-router';
import { useAuth } from '@/provider/auth.hooks';

/**
 * Startseite der Anwendung.
 *
 * Zeigt die Begrüßung und den Color-Mode-Button.
 *
 * @returns Die Index-Page-Komponente
 */
export function IndexPage() {
  const authContext = useAuth();
  const { navigate } = useRouter();

  if (authContext.isLoading) {
    return <div>Loading...</div>;
  }

  if (!authContext.user) {
    navigate({
      to: '/register',
    });
  }

  return (
    <>
      <div>Hello "/"!</div>
      <ColorModeButton />
    </>
  );
}
