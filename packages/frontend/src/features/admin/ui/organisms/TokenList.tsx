import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { PiArrowClockwise, PiArrowDown, PiArrowUp, PiKey, PiPlus } from 'react-icons/pi';
import { useListAccessTokens, useReactivateAccessToken, useRevokeAccessToken } from '@/features/admin/api/use-access-token-management';
import type { TokenListItemDto } from '@/shared';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Select } from '@/shared/ui/atoms/select.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { TokenListItem } from '../molecules/TokenListItem';
import { TokenCreationModal } from './TokenCreationModal';
import { TokenRevokeConfirmDialog } from './TokenRevokeConfirmDialog';
import { TokenRotationModal } from './TokenRotationModal';

/** Verfügbare Sortierfelder für die Token-Liste */
type SortField = 'createdAt' | 'lastUsedAt' | 'name';

/** Sortierrichtung */
type SortOrder = 'asc' | 'desc';

/** Sortieroptionen für das Dropdown */
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Erstellt am' },
  { value: 'lastUsedAt', label: 'Zuletzt verwendet' },
  { value: 'name', label: 'Name' },
] as const;

interface TokenListProps {
  /** Optionaler Callback wenn der "Token erstellen" Button geklickt wird. */
  onCreateToken?: () => void;
}

/** Sortiert Tokens nach dem angegebenen Feld und Richtung. */
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

/**
 * TokenList Organism
 *
 * Zeigt eine vollständige Liste aller Access-Tokens mit:
 * - Header mit Titel und "Token erstellen" Button
 * - Liste mit TokenListItem Components
 * - Loading State mit Skeleton-Platzhaltern
 * - Empty State (Keine Tokens vorhanden)
 * - Error State mit Retry-Button
 */
export function TokenList({ onCreateToken }: TokenListProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTokenForRevoke, setSelectedTokenForRevoke] = useState<TokenListItemDto | null>(null);
  const [selectedTokenForRotation, setSelectedTokenForRotation] = useState<TokenListItemDto | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Hinweis: Echte Pagination wird in Story 4-5a implementiert.
  const { data, isLoading, isError, error, refetch, isRefetching } = useListAccessTokens({ limit: 100 });
  const revokeMutation = useRevokeAccessToken();
  const reactivateMutation = useReactivateAccessToken();

  const rawTokens = data?.data ?? [];
  const tokens = useMemo(() => sortTokens(rawTokens, sortBy, sortOrder), [rawTokens, sortBy, sortOrder]);

  const handleCreateClick = () => {
    if (onCreateToken) {
      onCreateToken();
      return;
    }

    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleSortByChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(event.target.value as SortField);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleRevokeClick = (token: TokenListItemDto) => {
    setSelectedTokenForRevoke(token);
  };

  const handleCloseRevokeDialog = () => {
    setSelectedTokenForRevoke(null);
  };

  const handleConfirmRevoke = () => {
    if (selectedTokenForRevoke) {
      revokeMutation.mutate(selectedTokenForRevoke.id);
    }
  };

  useEffect(() => {
    if (revokeMutation.isSuccess) {
      setSelectedTokenForRevoke(null);
    }
  }, [revokeMutation.isSuccess]);

  const handleReactivateClick = (token: TokenListItemDto) => {
    reactivateMutation.mutate(token.id);
  };

  const handleRotateClick = (token: TokenListItemDto) => {
    setSelectedTokenForRotation(token);
  };

  const handleCloseRotationModal = () => {
    setSelectedTokenForRotation(null);
  };

  const loadingTokenId = useMemo(() => {
    if (revokeMutation.isPending && revokeMutation.variables) {
      return revokeMutation.variables;
    }

    if (reactivateMutation.isPending && reactivateMutation.variables) {
      return reactivateMutation.variables;
    }

    return null;
  }, [reactivateMutation.isPending, reactivateMutation.variables, revokeMutation.isPending, revokeMutation.variables]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiKey className="h-5 w-5 text-text-secondary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-text-primary">Access-Tokens</h2>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            // eslint-disable-next-line react/no-array-index-key -- Skeleton items have static order
            <div key={`skeleton-${index}`} className="rounded-panel border border-border-subtle bg-surface-panel p-4">
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

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiKey className="h-5 w-5 text-text-secondary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-text-primary">Access-Tokens</h2>
          </div>
        </div>

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

  if (rawTokens.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiKey className="h-5 w-5 text-text-secondary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-text-primary">Access-Tokens</h2>
          </div>
          <Button intent="primary" size="sm" onClick={handleCreateClick}>
            <PiPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Token erstellen
          </Button>
        </div>

        <div className="flex h-64 flex-col items-center justify-center rounded-panel border border-dashed border-border-subtle p-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised">
            <PiKey className="h-8 w-8 text-text-muted" aria-hidden="true" />
          </div>
          <p className="mb-1 text-lg font-medium text-text-primary">Keine Tokens vorhanden</p>
          <p className="mb-4 text-center text-sm text-text-muted">Es wurden noch keine Access-Tokens erstellt. Tokens werden verwendet, um Anwendungen sicheren Zugriff zu gewähren.</p>
          <Button intent="primary" onClick={handleCreateClick}>
            <PiPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Erstes Token erstellen
          </Button>
        </div>

        {!onCreateToken && <TokenCreationModal isOpen={isCreateModalOpen} onClose={handleCloseModal} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <PiKey className="h-5 w-5 text-text-secondary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-text-primary">Access-Tokens</h2>
          <span className="ml-2 rounded-full bg-surface-raised px-2 py-0.5 text-xs text-text-secondary">{tokens.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Select selectSize="sm" options={SORT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))} value={sortBy} onChange={handleSortByChange} aria-label="Sortieren nach" />
            <button
              type="button"
              onClick={toggleSortOrder}
              className="flex h-9 w-9 items-center justify-center rounded-control border-2 border-border-subtle bg-surface-panel text-text-secondary transition-colors hover:border-border-strong hover:bg-action-secondary focus-visible:shadow-focus-ring focus-visible:outline-none"
              aria-label={sortOrder === 'asc' ? 'Aufsteigend sortiert, klicken für absteigend' : 'Absteigend sortiert, klicken für aufsteigend'}
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

      {!onCreateToken && <TokenCreationModal isOpen={isCreateModalOpen} onClose={handleCloseModal} />}

      <TokenRevokeConfirmDialog
        isOpen={!!selectedTokenForRevoke}
        onClose={handleCloseRevokeDialog}
        tokenName={selectedTokenForRevoke?.name ?? ''}
        tokenId={selectedTokenForRevoke?.id ?? ''}
        onConfirm={handleConfirmRevoke}
        isLoading={revokeMutation.isPending}
      />

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
