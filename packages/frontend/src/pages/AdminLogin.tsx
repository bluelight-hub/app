import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Container, Field, Heading, Input, Text, VStack } from '@chakra-ui/react';
import { PiWarning } from 'react-icons/pi';

import { ResponseError } from '@bluelight-hub/shared/client/runtime';
import type { UserResponseDto } from '@bluelight-hub/shared/client';
import { api } from '@/api/api';
import { useAuth } from '@/hooks/useAuth';
import { authActions } from '@/stores/auth.store';
import { toaster } from '@/components/ui/toaster.instance';

export function AdminLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

  const [password, setPassword] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  // Clear API error when password changes
  useEffect(() => {
    if (apiError) {
      setApiError(null);
    }
  }, [password, apiError]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: '/auth' });
    }
  }, [user, isLoading, navigate]);

  const loginMutation = useMutation({
    mutationFn: async (adminPassword: string) => {
      return await api.auth().authControllerAdminLogin({
        adminPasswordDto: {
          password: adminPassword,
        },
      });
    },
    onSuccess: async (response) => {
      console.log('Admin-Anmeldung erfolgreich:', response);

      // Speichere den User im Auth Store
      authActions.loginSuccess(response.user as UserResponseDto);

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
      console.error('Admin-Anmeldefehler:', error);

      // Handle ResponseError from API
      if (error instanceof ResponseError) {
        const status = error.response.status;

        // 401 Unauthorized - Falsche Anmeldedaten
        if (status === 401) {
          setApiError('Ungültiges Passwort.');
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
          setApiError('Ein unerwarteter Fehler ist aufgetreten.');
          toaster.create({
            title: 'Fehler',
            description: 'Ein unerwarteter Fehler ist aufgetreten.',
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

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
        <Text textAlign="center">Laden...</Text>
      </Container>
    );
  }

  return (
    <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
      <VStack gap="8">
        <VStack gap="6">
          <Heading size="2xl">Administrator-Anmeldung</Heading>
          <Text fontSize="lg" color="fg.muted">
            Geben Sie Ihr Administrator-Passwort ein
          </Text>
        </VStack>

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
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Geben Sie Ihr Passwort ein"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                />
              </Field.Root>

              <Button type="submit" colorPalette="primary" size="lg" fontSize="md" w="full" disabled={loginMutation.isPending || !password.trim()} loading={loginMutation.isPending}>
                {loginMutation.isPending ? 'Anmeldung...' : 'Als Administrator anmelden'}
              </Button>
            </VStack>
          </form>
        </Box>
      </VStack>
    </Container>
  );
}
