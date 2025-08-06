import { useState } from 'react';
import { Box, Container, Heading, Tabs, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResponseError } from '@bluelight-hub/shared/client/runtime';
import { LoginTab } from './LoginTab';
import { RegisterTab } from './RegisterTab';
import type { LoginUserDto, RegisterUserDto } from '@bluelight-hub/shared/client';
import { authActions } from '@/stores/auth.store';
import { api } from '@/api/api';
import { useAuth } from '@/hooks/useAuth';
import { toaster } from '@/components/ui/toaster.instance';

/**
 * Zweistufiges Login/Register-Fenster mit Tabs
 *
 * Bietet eine kombinierte Oberfläche für Anmeldung bestehender
 * und Registrierung neuer Benutzer ohne Passwort.
 */
export function LoginWindow() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState(0);

  const loginMutation = useMutation({
    mutationFn: async (loginData: LoginUserDto) => {
      return await api.auth().authControllerLogin({
        loginUserDto: loginData,
      });
    },
    onSuccess: async (response) => {
      authActions.loginSuccess(response.user);
      await queryClient.invalidateQueries({ queryKey: ['auth-check'] });

      toaster.create({
        title: 'Anmeldung erfolgreich',
        description: 'Sie wurden erfolgreich angemeldet.',
        type: 'success',
      });

      await navigate({ to: '/' });
    },
    onError: (error: Error) => {
      if (error instanceof ResponseError) {
        const status = error.response.status;
        if (status === 404) {
          toaster.create({
            title: 'Login fehlgeschlagen',
            description: 'Benutzer nicht gefunden. Bitte überprüfen Sie den Benutzernamen.',
            type: 'error',
          });
        } else {
          toaster.create({
            title: 'Fehler',
            description: 'Ein unerwarteter Fehler ist aufgetreten.',
            type: 'error',
          });
        }
      } else {
        toaster.create({
          title: 'Fehler',
          description: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
          type: 'error',
        });
      }
    },
  });

  // Register Mutation
  const registerMutation = useMutation({
    mutationFn: async (registerData: RegisterUserDto) => {
      return await api.auth().authControllerRegister({
        registerUserDto: registerData,
      });
    },
    onSuccess: async (response) => {
      authActions.loginSuccess(response.user);
      await queryClient.invalidateQueries({ queryKey: ['auth-check'] });

      toaster.create({
        title: 'Registrierung erfolgreich',
        description: 'Ihr Account wurde erfolgreich erstellt.',
        type: 'success',
      });

      await navigate({ to: '/' });
    },
    onError: (error: Error) => {
      if (error instanceof ResponseError) {
        const status = error.response.status;
        if (status === 409) {
          toaster.create({
            title: 'Registrierung fehlgeschlagen',
            description: 'Dieser Benutzername ist bereits vergeben.',
            type: 'error',
          });
        } else {
          toaster.create({
            title: 'Fehler',
            description: 'Ein unerwarteter Fehler ist aufgetreten.',
            type: 'error',
          });
        }
      } else {
        toaster.create({
          title: 'Fehler',
          description: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
          type: 'error',
        });
      }
    },
  });

  if (!isLoading && user) {
    void navigate({ to: '/' });
    return null;
  }

  return (
    <Container maxW={{ base: '400px', md: '600px' }} py={{ base: '12', md: '24' }} px={{ base: '4', sm: '8' }}>
      <VStack gap="8">
        <VStack gap="6">
          <Heading size="2xl">BlueLight Hub</Heading>
          <Text fontSize="lg" color="fg.muted">
            Willkommen beim Einsatz-Management-System
          </Text>
        </VStack>

        <Box py={{ base: '6', sm: '8' }} px={{ base: '4', sm: '10' }} bg="bg.surface" boxShadow="md" borderRadius="xl" w="full">
          <Tabs.Root value={selectedTab.toString()} onValueChange={(details) => setSelectedTab(parseInt(details.value))} variant="enclosed" fitted>
            <Tabs.List>
              <Tabs.Trigger value="0">Anmelden</Tabs.Trigger>
              <Tabs.Trigger value="1">Registrieren</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="0">
              <LoginTab onSubmit={(username) => loginMutation.mutate({ username })} isLoading={loginMutation.isPending} error={loginMutation.error} />
            </Tabs.Content>

            <Tabs.Content value="1">
              <RegisterTab onSubmit={(username) => registerMutation.mutate({ username })} isLoading={registerMutation.isPending} error={registerMutation.error} />
            </Tabs.Content>
          </Tabs.Root>
        </Box>
      </VStack>
    </Container>
  );
}
