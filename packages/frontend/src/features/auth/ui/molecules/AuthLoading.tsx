import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Text } from '@/shared/ui/atoms/text.atom';

interface AuthLoadingProps {
  message?: string;
}

export function AuthLoading({ message = 'Authentifizierung wird geladen...' }: AuthLoadingProps) {
  return (
    <output aria-live="polite" className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Spinner size="lg" className="text-action-primary" />
      <Text color="muted">{message}</Text>
    </output>
  );
}
