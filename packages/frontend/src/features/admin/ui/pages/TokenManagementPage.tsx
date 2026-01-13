import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '@/features/auth';
import { useSecurityStatus, ADMIN_QUERY_KEYS } from '@/features/admin/api';
import { InsecureModeBanner } from '@/features/admin/ui/atoms';
import { TokenList, MigrationModal } from '@/features/admin/ui/organisms';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Navigate } from '@tanstack/react-router';
import { PiKey } from 'react-icons/pi';

/**
 * TokenManagementPage - Verwaltung von Server-Access-Tokens
 *
 * Zeigt eine vollstaendige Uebersicht aller Access-Tokens mit:
 * - Liste aller Tokens (Name, Prefix, Status, Erstellt, Letzte Nutzung)
 * - Button zum Erstellen neuer Tokens (in TokenList integriert)
 *
 * Pattern konsistent mit AdminInvites.tsx.
 * Delegiert die Datenabfrage an die TokenList-Komponente.
 *
 * @example
 * ```tsx
 * // Route Definition (routes/admin/tokens.tsx)
 * export const Route = createFileRoute('/admin/tokens')({
 *   component: TokenManagementPage,
 * });
 * ```
 */
export function TokenManagementPage() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const { data: securityStatus } = useSecurityStatus();
  const queryClient = useQueryClient();

  // State fuer Migration-Modal
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);

  // Redirect if not admin
  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/admin-login" />;
  }

  // Loading State
  if (isAuthLoading) {
    return (
      <Container maxWidth="6xl" className="py-8">
        <div className="flex h-[50vh] items-center justify-center">
          <Spinner size="xl" />
        </div>
      </Container>
    );
  }

  /**
   * Handler fuer erfolgreiche Migration
   *
   * Invalidiert die Token-Liste um das neu erstellte Token anzuzeigen.
   */
  const handleMigrationComplete = async () => {
    await queryClient.invalidateQueries({
      queryKey: ADMIN_QUERY_KEYS.accessTokens.all(),
    });
  };

  return (
    <Container maxWidth="6xl" className="py-8">
      <div className="flex flex-col gap-6">
        {/* INSECURE Mode Banner - Story 4.6 AC1 */}
        {securityStatus?.data?.insecureMode && <InsecureModeBanner onMigrateClick={() => setMigrationModalOpen(true)} />}

        {/* Page Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <PiKey className="h-6 w-6 text-primary-500" aria-hidden="true" />
            <Heading size="lg" as="h1">
              Access-Token Verwaltung
            </Heading>
          </div>
          <Text size="sm" color="muted">
            Access-Tokens ermoeglichen Anwendungen sicheren Zugriff auf den Server. Erstellen Sie fuer jede Anwendung ein eigenes Token.
          </Text>
        </div>

        {/* Token List - beinhaltet eigene Datenabfrage und Token-Erstellung */}
        <TokenList />
      </div>

      {/* Migration Modal - Story 4.6 AC2 */}
      <MigrationModal isOpen={migrationModalOpen} onClose={() => setMigrationModalOpen(false)} onMigrationComplete={handleMigrationComplete} />
    </Container>
  );
}
