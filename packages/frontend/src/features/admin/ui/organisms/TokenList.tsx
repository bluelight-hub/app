import { useState, useEffect, useMemo } from 'react';
import { PiKey, PiPlus, PiArrowClockwise, PiArrowUp, PiArrowDown } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Select } from '@/shared/ui/atoms/select.atom';

import { useListAccessTokens, useRevokeAccessToken, useReactivateAccessToken } from '@/features/admin/api/use-access-token-management';
import { TokenListItem } from '../molecules/TokenListItem';
import { TokenCreationModal } from './TokenCreationModal';
import { TokenRevokeConfirmDialog } from './TokenRevokeConfirmDialog';
import { TokenRotationModal } from './TokenRotationModal';
import type { TokenListItemDto } from '@/shared';

/**
 * Verfuegbare Sortierfelder fuer die Token-Liste
 */
type SortField = 'createdAt' | 'lastUsedAt' | 'name';

/**
 * Sortierrichtung
 */
type SortOrder = 'asc' | 'desc';

/**
 * Sortieroptionen fuer das Dropdown
 */
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Erstellt am' },
  { value: 'lastUsedAt', label: 'Zuletzt verwendet' },
  { value: 'name', label: 'Name' },
] as const;

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
/**
 * Sortiert Tokens nach dem angegebenen Feld und Richtung.
 *
 * Bei lastUsedAt werden null-Werte als "aelteste" Eintraege behandelt,
 * d.h. bei absteigender Sortierung erscheinen sie am Ende.
 */
function sortTokens(tokens: TokenListItemDto[], sortBy: SortField, sortOrder: SortOrder): TokenListItemDto[] {
  return [...tokens].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'createdAt': {
        const dateA = new Date(String(a.createdAt)).getTime();
        const dateB = new Date(String(b.createdAt)).getTime();
        comparison = dateA - dateB;
        break;
      }
      case 'lastUsedAt': {
        // null-Werte werden als aelteste behandelt (Unix epoch = 0)
        const dateA = a.lastUsedAt ? new Date(String(a.lastUsedAt)).getTime() : 0;
        const dateB = b.lastUsedAt ? new Date(String(b.lastUsedAt)).getTime() : 0;
        comparison = dateA - dateB;
        break;
      }
      case 'name': {
        comparison = a.name.localeCompare(b.name, 'de');
        break;
      }
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

export function TokenList({ onCreateToken }: TokenListProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTokenForRevoke, setSelectedTokenForRevoke] = useState<TokenListItemDto | null>(null);
  const [selectedTokenForRotation, setSelectedTokenForRotation] = useState<TokenListItemDto | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Hinweis: Echte Pagination wird in Story 4-5a implementiert.
  // Vorerst laden wir bis zu 100 Tokens (Backend-Maximum).
  const { data, isLoading, isError, error, refetch, isRefetching } = useListAccessTokens({ limit: 100 });

  // Mutations fuer Revoke/Reactivate
  const revokeMutation = useRevokeAccessToken();
  const reactivateMutation = useReactivateAccessToken();

  const rawTokens = data?.data ?? [];

  // Client-seitige Sortierung (bis Backend-Support verfuegbar)
  const tokens = useMemo(() => sortTokens(rawTokens, sortBy, sortOrder), [rawTokens, sortBy, sortOrder]);

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

  /**
   * Handler fuer Aenderungen am Sortierfeld
   */
  const handleSortByChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(event.target.value as SortField);
  };

  /**
   * Wechselt die Sortierrichtung (asc <-> desc)
   */
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  /**
   * Oeffnet den Revoke-Dialog fuer ein Token
   */
  const handleRevokeClick = (token: TokenListItemDto) => {
    setSelectedTokenForRevoke(token);
  };

  /**
   * Schliesst den Revoke-Dialog
   */
  const handleCloseRevokeDialog = () => {
    setSelectedTokenForRevoke(null);
  };

  /**
   * Fuehrt das Widerrufen des Tokens aus
   */
  const handleConfirmRevoke = () => {
    if (selectedTokenForRevoke) {
      revokeMutation.mutate(selectedTokenForRevoke.id);
    }
  };

  /**
   * Schliesst den Revoke-Dialog nach erfolgreichem Widerrufen.
   * Der onSuccess callback in handleConfirmRevoke uebernimmt das Schliessen,
   * aber dieser useEffect dient als Fallback fuer Race Conditions.
   */
  useEffect(() => {
    if (revokeMutation.isSuccess) {
      setSelectedTokenForRevoke(null);
    }
  }, [revokeMutation.isSuccess]);

  /**
   * Reaktiviert ein widerrufenes Token direkt (ohne Dialog)
   */
  const handleReactivateClick = (token: TokenListItemDto) => {
    reactivateMutation.mutate(token.id);
  };

  /**
   * Oeffnet das Rotation-Modal fuer ein Token
   */
  const handleRotateClick = (token: TokenListItemDto) => {
    setSelectedTokenForRotation(token);
  };

  /**
   * Schliesst das Rotation-Modal
   */
  const handleCloseRotationModal = () => {
    setSelectedTokenForRotation(null);
  };

  /**
   * Gibt die ID des Tokens zurueck, fuer das gerade eine Aktion ausgefuehrt wird
   */
  const getLoadingTokenId = (): string | null => {
    if (revokeMutation.isPending && revokeMutation.variables) {
      return revokeMutation.variables;
    }
    if (reactivateMutation.isPending && reactivateMutation.variables) {
      return reactivateMutation.variables;
    }
    return null;
  };

  const loadingTokenId = getLoadingTokenId();

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

  // Empty State (pruefe rawTokens, nicht sortierte tokens)
  if (rawTokens.length === 0) {
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <PiKey className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Access-Tokens</h2>
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 text-xs dark:bg-gray-700 dark:text-gray-400">{tokens.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Sortier-Controls */}
          <div className="flex items-center gap-1">
            <Select selectSize="sm" options={SORT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))} value={sortBy} onChange={handleSortByChange} aria-label="Sortieren nach" />
            <button
              type="button"
              onClick={toggleSortOrder}
              className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-300 bg-white text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
              aria-label={sortOrder === 'asc' ? 'Aufsteigend sortiert, klicken fuer absteigend' : 'Absteigend sortiert, klicken fuer aufsteigend'}
              title={sortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
            >
              {sortOrder === 'asc' ? <PiArrowUp className="h-4 w-4" aria-hidden="true" /> : <PiArrowDown className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <Button intent="primary" size="sm" onClick={handleCreateClick}>
            <PiPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Token erstellen
          </Button>
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-3">
        {tokens.map((token) => (
          <TokenListItem
            key={token.id}
            token={token}
            onRevokeClick={() => handleRevokeClick(token)}
            onReactivateClick={() => handleReactivateClick(token)}
            onRotateClick={() => handleRotateClick(token)}
            isActionLoading={loadingTokenId === token.id}
            allTokens={rawTokens}
          />
        ))}
      </div>

      {/* TokenCreationModal */}
      {!onCreateToken && <TokenCreationModal isOpen={isCreateModalOpen} onClose={handleCloseModal} />}

      {/* TokenRevokeConfirmDialog */}
      <TokenRevokeConfirmDialog
        isOpen={!!selectedTokenForRevoke}
        onClose={handleCloseRevokeDialog}
        tokenName={selectedTokenForRevoke?.name ?? ''}
        tokenId={selectedTokenForRevoke?.id ?? ''}
        onConfirm={handleConfirmRevoke}
        isLoading={revokeMutation.isPending}
      />

      {/* TokenRotationModal */}
      <TokenRotationModal
        isOpen={selectedTokenForRotation !== null}
        onClose={handleCloseRotationModal}
        tokenToRotate={
          selectedTokenForRotation
            ? {
                id: selectedTokenForRotation.id,
                name: selectedTokenForRotation.name,
                prefix: selectedTokenForRotation.prefix,
              }
            : null
        }
      />
    </div>
  );
}
