import { useState, useEffect } from 'react';
import { Navigate, useSearch } from '@tanstack/react-router';
import { PiPlugsConnected, PiCheckCircle, PiWarningCircle, PiSpinner, PiUsers } from 'react-icons/pi';
import { toast } from 'sonner';
import { useAdminAuth } from '@/features/auth/api';
import { useAdminHiOrgIntegration } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';

/**
 * Admin HiOrg Integration Settings Page.
 *
 * Ermöglicht:
 * - OAuth2 Verbindung mit HiOrg-Server herstellen
 * - Verbindung testen
 * - Personen-Vorschau anzeigen
 *
 * Der OAuth Flow wird über den Backend-Endpunkt initiiert und
 * redirected nach erfolgreicher Authentifizierung zurück mit
 * ?oauth=success oder ?oauth=error&message=...
 */
export function AdminHiOrgIntegration() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const [showPreview, setShowPreview] = useState(false);
  // Search Params für OAuth Callback (oauth=success/error, message=...)
  const search = useSearch({ from: '/admin/integrations/hiorg' });

  const { credentials, isLoadingCredentials, preview, isLoadingPreview, testConnection, isTestingConnection, connectionInfo, initiateOAuth, isInitiatingOAuth, refetchCredentials } =
    useAdminHiOrgIntegration({
      activeOnly: true,
      enablePreview: showPreview, // Nur laden wenn User auf "Vorschau laden" klickt
    });

  // OAuth Callback Handling - Toast anzeigen und URL Parameter entfernen
  useEffect(() => {
    if (search.oauth === 'success') {
      toast.success('Erfolgreich verbunden', {
        description: 'HiOrg-Server wurde erfolgreich verbunden.',
      });
      refetchCredentials();
      // URL Parameter entfernen
      window.history.replaceState({}, '', window.location.pathname);
    } else if (search.oauth === 'error') {
      toast.error('Verbindung fehlgeschlagen', {
        description: search.message || 'Ein unbekannter Fehler ist aufgetreten.',
      });
      // URL Parameter entfernen
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [search.oauth, search.message, refetchCredentials]);

  // Auth Guard
  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/admin-login" />;
  }

  // Loading State
  if (isAuthLoading || isLoadingCredentials) {
    return (
      <Container className="py-8">
        <Skeleton className="mb-8 h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  return (
    <Container className="space-y-6 py-8">
      {/* Header */}
      <div>
        <Heading level={1}>HiOrg-Server Integration</Heading>
        <Text className="text-gray-600 dark:text-gray-400">Verbinde Bluelight Hub mit deinem HiOrg-Server Account um Personen zu importieren.</Text>
      </div>

      {/* Status Card - Zeige wenn Credentials vorhanden sind */}
      {credentials && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Status Icon: Grün wenn OAuth oder getestet, Gelb wenn Token vorhanden aber nicht getestet, Rot wenn nichts konfiguriert */}
              {credentials.hasOAuthTokens || credentials.lastTestedAt ? (
                <PiCheckCircle className="h-8 w-8 text-green-500" />
              ) : credentials.hasToken ? (
                <PiWarningCircle className="h-8 w-8 text-yellow-500" />
              ) : (
                <PiWarningCircle className="h-8 w-8 text-red-500" />
              )}
              <div>
                <Text className="font-medium">
                  {credentials.hasOAuthTokens ? 'OAuth2 verbunden' : credentials.lastTestedAt ? 'Verbunden' : credentials.hasToken ? 'Nicht getestet' : 'Nicht konfiguriert'}
                </Text>
                {credentials.orgKuerzel && <Text className="text-gray-500 text-sm">Organisation: {credentials.orgKuerzel}</Text>}
                {credentials.lastTestedAt && <Text className="text-gray-400 text-xs">Letzter Test: {new Date(credentials.lastTestedAt).toLocaleString('de-DE')}</Text>}
              </div>
            </div>
            <Button variant="outline" onClick={() => testConnection()} disabled={isTestingConnection || (!credentials.hasToken && !credentials.hasOAuthTokens)}>
              {isTestingConnection ? (
                <>
                  <PiSpinner className="mr-2 h-4 w-4 animate-spin" />
                  Teste...
                </>
              ) : (
                <>
                  <PiPlugsConnected className="mr-2 h-4 w-4" />
                  Verbindung testen
                </>
              )}
            </Button>
          </div>

          {/* Connection Info - nur bei erfolgreichem Test */}
          {connectionInfo && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <Text className="font-medium text-green-800 dark:text-green-200">Erfolgreich verbunden mit: {connectionInfo.organisationName}</Text>
            </div>
          )}
        </Card>
      )}

      {/* OAuth Connect Card */}
      <Card className="p-6">
        <Heading level={3} className="mb-4">
          HiOrg-Server verbinden
        </Heading>

        {credentials?.hasOAuthTokens ? (
          <div className="flex items-center gap-4">
            <PiCheckCircle className="h-6 w-6 text-green-500" />
            <Text>OAuth2 Verbindung aktiv</Text>
          </div>
        ) : (
          <div className="space-y-4">
            <Text className="text-gray-600 dark:text-gray-400">Klicke auf den Button um dich mit deinem HiOrg-Server Account zu verbinden. Du wirst zur HiOrg-Server Anmeldeseite weitergeleitet.</Text>

            {/* Warnung wenn OAuth nicht serverseitig konfiguriert */}
            {credentials && !credentials.isOAuthConfigured && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <Text className="font-medium text-amber-800 dark:text-amber-200">OAuth nicht verfügbar</Text>
                <Text className="text-amber-700 text-sm dark:text-amber-300">
                  Die HiOrg-Server OAuth-Integration ist nicht konfiguriert. Bitte wende dich an den HiOrg-Server Support um OAuth Zugangsdaten zu erhalten.
                </Text>
              </div>
            )}

            <Button onClick={() => initiateOAuth()} disabled={isInitiatingOAuth || !credentials?.isOAuthConfigured}>
              {isInitiatingOAuth ? (
                <>
                  <PiSpinner className="mr-2 h-4 w-4 animate-spin" />
                  Verbinde...
                </>
              ) : (
                <>
                  <PiPlugsConnected className="mr-2 h-4 w-4" />
                  Mit HiOrg-Server verbinden
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Preview Section - Zeige wenn Token oder OAuth vorhanden */}
      {(credentials?.hasToken || credentials?.hasOAuthTokens) && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <Heading level={3}>Personen-Vorschau</Heading>
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <PiUsers className="mr-2 h-4 w-4" />
              {showPreview ? 'Ausblenden' : 'Vorschau laden'}
            </Button>
          </div>

          {showPreview &&
            (isLoadingPreview ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : preview ? (
              <div>
                <Text className="mb-4 text-gray-600">{preview.totalCount} Personen gefunden</Text>
                <div className="max-h-96 overflow-y-auto rounded-lg border">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-sm">Name</th>
                        <th className="px-4 py-2 text-left font-medium text-sm">Benutzername</th>
                        <th className="px-4 py-2 text-left font-medium text-sm">Mitgliedsnr.</th>
                        <th className="px-4 py-2 text-left font-medium text-sm">Qualifikationen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.persons.map((person) => (
                        <tr key={person.username} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-2">
                            {person.vorname} {person.nachname}
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-sm">{person.username}</td>
                          <td className="px-4 py-2 text-gray-500 text-sm">{person.mitgliednr ?? '-'}</td>
                          <td className="px-4 py-2 text-gray-500 text-sm">{person.qualifikationenCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <Text className="text-gray-500">Keine Personen gefunden</Text>
            ))}
        </Card>
      )}
    </Container>
  );
}
