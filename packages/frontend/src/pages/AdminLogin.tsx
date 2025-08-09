import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Field, Group, IconButton, Input, Text, VStack } from '@chakra-ui/react';
import { PiEye, PiEyeClosed, PiWarning } from 'react-icons/pi';

import { ResponseError } from '@bluelight-hub/shared/client/runtime';
import { instanceOfUserResponseDto } from '@bluelight-hub/shared/client/models/UserResponseDto';
import { api } from '@/api/api';
import { useAuth } from '@/hooks/useAuth';
import { authActions } from '@/stores/auth.store';
import { toaster } from '@/components/ui/toaster.instance';
import { logger } from '@/utils/logger';

export function AdminLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading, isAdminAuthenticated } = useAuth();

  const [password, setPassword] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Clear API error when password changes
  useEffect(() => {
    if (apiError) {
      setApiError(null);
    }
  }, [password, apiError]);

  // Track when auth check is complete
  useEffect(() => {
    if (!isLoading && !hasCheckedAuth) {
      setHasCheckedAuth(true);
    }
  }, [isLoading, hasCheckedAuth]);

  // Redirect logic based on authentication state
  useEffect(() => {
    // Only redirect after we've completed the initial auth check
    if (hasCheckedAuth) {
      // If user has an active admin session, redirect to dashboard
      if (user && isAdminAuthenticated) {
        navigate({ to: '/admin/dashboard' });
      }
      // If user is not logged in at all, redirect to auth
      else if (!user) {
        navigate({ to: '/auth' });
      }
      // User is logged in but not admin authenticated - stay on this page
    }
  }, [user, hasCheckedAuth, isAdminAuthenticated, navigate]);

  const loginMutation = useMutation({
    mutationFn: async (adminPassword: string) => {
      return await api.auth().authControllerAdminLogin({
        adminPasswordDto: {
          password: adminPassword,
        },
      });
    },
    onSuccess: async (response) => {
      logger.log('Admin-Anmeldung erfolgreich:', response);

      // Validiere Struktur, bevor der User in den Auth Store gesetzt wird
      const maybeUser = response.user as unknown;
      if (maybeUser && typeof maybeUser === 'object' && instanceOfUserResponseDto(maybeUser)) {
        authActions.loginSuccess(maybeUser);
      } else {
        logger.warn('Unerwartete User-Payload beim Admin-Login – überspringe loginSuccess()', response.user);
      }

      // Setze Admin-Authentifizierungsstatus
      authActions.setAdminAuth(true);

      // Invalidiere relevante Queries
      await queryClient.invalidateQueries({ queryKey: ['auth-check'] });

      // Zeige Erfolgs-Toast
      toaster.create({
        title: 'Anmeldung erfolgreich',
        description: 'Sie wurden erfolgreich als Administrator angemeldet.',
        type: 'success',
      });

      // Navigiere zum Admin-Dashboard
      await navigate({ to: '/admin/dashboard' });
    },
    onError: (error: Error) => {
      logger.error('Admin-Anmeldefehler:', error);

      // Handle ResponseError from API
      if (error instanceof ResponseError) {
        const status = error.response.status;

        // 401 Unauthorized - Falsche Anmeldedaten
        // 400 Bad Request - Validierungsfehler (z.B. zu kurzes Passwort)
        // Beide Fälle werden als "falsches Passwort" behandelt für bessere Security
        if (status === 401 || status === 400) {
          setApiError('Ungültiges Passwort.');
          setShouldShake(true);
          setTimeout(() => setShouldShake(false), 500);
          toaster.create({
            title: 'Login fehlgeschlagen',
            description: 'Ungültiges Passwort.',
            type: 'error',
          });
        }
        // 403 Forbidden - Kein Admin
        else if (status === 403) {
          setApiError('Sie haben keine Administratorrechte.');
          toaster.create({
            title: 'Zugriff verweigert',
            description: 'Sie haben keine Administratorrechte.',
            type: 'error',
          });
        }
        // Andere HTTP-Fehler
        else {
          // Bei allen anderen Fehlern auch Shake-Animation und "falsches Passwort"
          // für bessere Security (keine Informationen preisgeben)
          setApiError('Ungültiges Passwort.');
          setShouldShake(true);
          setTimeout(() => setShouldShake(false), 500);
          toaster.create({
            title: 'Login fehlgeschlagen',
            description: 'Ungültiges Passwort.',
            type: 'error',
          });
        }
      }
      // Andere Fehler (Netzwerk, etc.)
      else {
        setApiError('Ein unerwarteter Fehler ist aufgetreten.');
        toaster.create({
          title: 'Fehler',
          description: error.message || 'Ein unerwarteter Fehler ist aufgetreten.',
          type: 'error',
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      loginMutation.mutate(password);
    }
  };

  // Don't render the form until we've checked authentication
  // This prevents flashing of the form before redirect
  if (!hasCheckedAuth) {
    return null; // The loading state is handled by AdminLayout
  }

  // If user has admin session, don't show form (will redirect)
  if (user && isAdminAuthenticated) {
    return null;
  }

  // If user is not logged in at all, don't show the admin login form
  // (useEffect will redirect to /auth)
  if (!user) {
    return null;
  }

  return (
    <VStack gap="8" align="stretch">
      <Text fontSize="lg" color="fg.muted" textAlign="center">
        Geben Sie Ihr Administrator-Passwort ein
      </Text>

      <Box
        py={{ base: '0', sm: '8' }}
        px={{ base: '4', sm: '10' }}
        bg={{ base: 'transparent', sm: 'bg.surface' }}
        boxShadow={{ base: 'none', sm: 'md' }}
        borderRadius={{ base: 'none', sm: 'xl' }}
        w="full"
        maxW="md"
      >
        {/* API-Fehlermeldung anzeigen */}
        {apiError && (
          <Alert.Root status="error" mb="6" borderRadius="md">
            <Alert.Indicator>
              <PiWarning />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>Anmeldung fehlgeschlagen!</Alert.Title>
              <Alert.Description>{apiError}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <form onSubmit={handleSubmit}>
          <VStack gap="6">
            <Field.Root w="full">
              <Field.Label fontWeight="medium">Administrator-Passwort</Field.Label>
              <Box animation={shouldShake ? 'shake' : undefined} w="full">
                <Group attached w="full">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Geben Sie Ihr Passwort ein"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loginMutation.isPending}
                    flex="1"
                  />
                  <IconButton
                    aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    onClick={() => setShowPassword(!showPassword)}
                    variant="outline"
                    disabled={loginMutation.isPending}
                  >
                    {showPassword ? <PiEyeClosed /> : <PiEye />}
                  </IconButton>
                </Group>
              </Box>
            </Field.Root>

            <Button type="submit" colorPalette="primary" size="lg" fontSize="md" w="full" disabled={loginMutation.isPending || !password.trim()} loading={loginMutation.isPending}>
              {loginMutation.isPending ? 'Anmeldung...' : 'Als Administrator anmelden'}
            </Button>
          </VStack>
        </form>
      </Box>
    </VStack>
  );
}
