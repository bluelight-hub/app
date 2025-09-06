import { Spinner } from '@atoms/spinner.atom';
import { Text } from '@atoms/text.atom';

interface AuthLoadingProps {
  message?: string;
}

export function AuthLoading({ message = 'Authentifizierung wird geladen...' }: AuthLoadingProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Spinner size="lg" className="text-red-500" />
      <Text color="muted">{message}</Text>
    </div>
  );
}
