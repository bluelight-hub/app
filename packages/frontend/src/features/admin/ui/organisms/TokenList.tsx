import { useState } from 'react';
import { PiKey, PiPlus, PiArrowClockwise } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';

import { useListAccessTokens } from '@/features/admin/api/use-access-token-management';
import { TokenListItem } from '../molecules/TokenListItem';
import { TokenCreationModal } from './TokenCreationModal';

interface TokenListProps {
  /**
   * Optionaler Callback wenn der "Token erstellen" Button geklickt wird.
   * Falls nicht gesetzt, wird das interne TokenCreationModal verwendet.
   */
  onCreateToken?: () => void;
}

/**
 * TokenList Organism
 *
 * Zeigt eine vollstaendige Liste aller Access-Tokens mit:
 * - Header mit Titel und "Token erstellen" Button
 * - Liste mit TokenListItem Components
 * - Loading State mit Skeleton-Platzhaltern
 * - Empty State (Keine Tokens vorhanden)
 * - Error State mit Retry-Button
 *
 * Verwendet den useListAccessTokens() Hook fuer die Datenbeschaffung.
 * Integriert das TokenCreationModal fuer die Token-Erstellung.
 *
 * @example
 * ```tsx
 * // Mit integriertem Modal
 * <TokenList />
 *
 * // Mit externem Handler
 * <TokenList onCreateToken={() => setModalOpen(true)} />
 * ```
 */
export function TokenList({ onCreateToken }: TokenListProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // Hinweis: Echte Pagination wird in Story 4-5a implementiert.
  // Vorerst laden wir bis zu 100 Tokens (Backend-Maximum).
  const { data, isLoading, isError, error, refetch, isRefetching } = useListAccessTokens({ limit: 100 });

  const tokens = data?.data ?? [];

  const handleCreateClick = () => {
    if (onCreateToken) {
      onCreateToken();
    } else {
      setIsCreateModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
  };

  // Loading State: Skeleton-Platzhalter
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiKey className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Access-Tokens</h2>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Skeleton List */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton items have static order
            <div key={`skeleton-${index}`} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiKey className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Access-Tokens</h2>
          </div>
        </div>

        {/* Error Alert */}
        <Alert status="error" title="Fehler beim Laden">
          <div className="space-y-3">
            <p className="text-sm">Die Access-Tokens konnten nicht geladen werden. {error?.message || 'Bitte versuchen Sie es erneut.'}</p>
            <Button intent="danger" appearance="outline" size="sm" onClick={() => refetch()} loading={isRefetching}>
              <PiArrowClockwise className="mr-2 h-4 w-4" aria-hidden="true" />
              Erneut versuchen
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Empty State
  if (tokens.length === 0) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiKey className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Access-Tokens</h2>
          </div>
          <Button intent="primary" size="sm" onClick={handleCreateClick}>
            <PiPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Token erstellen
          </Button>
        </div>

        {/* Empty State */}
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-gray-300 border-dashed p-8 dark:border-gray-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <PiKey className="h-8 w-8 text-gray-400 dark:text-gray-500" aria-hidden="true" />
          </div>
          <p className="mb-1 font-medium text-gray-900 text-lg dark:text-gray-100">Keine Tokens vorhanden</p>
          <p className="mb-4 text-center text-gray-500 text-sm dark:text-gray-400">
            Es wurden noch keine Access-Tokens erstellt. Tokens werden verwendet, um Anwendungen sicheren Zugriff zu gewaehren.
          </p>
          <Button intent="primary" onClick={handleCreateClick}>
            <PiPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Erstes Token erstellen
          </Button>
        </div>

        {/* TokenCreationModal */}
        {!onCreateToken && <TokenCreationModal isOpen={isCreateModalOpen} onClose={handleCloseModal} />}
      </div>
    );
  }

  // Main List with Data
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiKey className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Access-Tokens</h2>
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 text-xs dark:bg-gray-700 dark:text-gray-400">{tokens.length}</span>
        </div>
        <Button intent="primary" size="sm" onClick={handleCreateClick}>
          <PiPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Token erstellen
        </Button>
      </div>

      {/* Token List */}
      <div className="space-y-3">
        {tokens.map((token) => (
          <TokenListItem key={token.id} token={token} />
        ))}
      </div>

      {/* TokenCreationModal */}
      {!onCreateToken && <TokenCreationModal isOpen={isCreateModalOpen} onClose={handleCloseModal} />}
    </div>
  );
}
