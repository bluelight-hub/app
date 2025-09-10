import { PiSpinner } from 'react-icons/pi';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Lade Daten...' }: LoadingStateProps) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <PiSpinner className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}
