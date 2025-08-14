import { useCallback, useEffect, useState } from 'react';
import { Box, Heading, Image, Tabs, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from '@tanstack/react-router';
import { LoginTab } from './LoginTab';
import { RegisterTab } from './RegisterTab';
import type { RegisterUserDto } from '@bluelight-hub/shared/client';
import { useAuth } from '@/hooks/useAuth';
import { toaster } from '@/components/ui/toaster.instance';
import { getApiErrorMessage } from '@/utils/apiErrorHandler';
import { ColorModeButton } from '@/components/molecules/color-mode-button.molecule';
import { useColorModeValue } from '@/hooks/use-color-mode';
import mobileLogo from '@/assets/brandbook/mobile-logo.png';
import mobileLogoWhite from '@/assets/brandbook/mobile-white.png';
import { useTimeBasedBackground } from '@/utils/timeBasedBackground';

// Props for the LoginWindow component (currently empty)
export type Props = Record<string, never>;

/**
 * Zweistufiges Login/Register-Fenster mit Tabs
 *
 * Bietet eine kombinierte Oberfläche für Anmeldung bestehender
 * und Registrierung neuer Benutzer ohne Passwort.
 */
export function LoginWindow(_props: Props) {
  const navigate = useNavigate();
  const { user, isLoading, login, register } = useAuth();
  const [selectedTab, setSelectedTab] = useState(0);
  const logoSrc = useColorModeValue(mobileLogo, mobileLogoWhite);
  const backgroundImage = useTimeBasedBackground();

  const loginUser = useCallback(
    (username: string) => {
      login.mutate(
        { username },
        {
          onSuccess: async () => {
            toaster.create({
              title: 'Anmeldung erfolgreich',
              description: 'Sie wurden erfolgreich angemeldet.',
              type: 'success',
            });

            await navigate({ to: '/' });
          },
          onError: async (error: Error) => {
            const message = await getApiErrorMessage(error, 'Ein unerwarteter Fehler ist aufgetreten.', 'userLogin');

            toaster.create({
              title: 'Anmeldung fehlgeschlagen',
              description: message,
              type: 'error',
            });
          },
        },
      );
    },
    [login, navigate],
  );

  const registerUser = useCallback(
    (registerData: RegisterUserDto) => {
      register.mutate(registerData, {
        onSuccess: async () => {
          toaster.create({
            title: 'Registrierung erfolgreich',
            description: 'Ihr Account wurde erfolgreich erstellt.',
            type: 'success',
          });

          await navigate({ to: '/' });
        },
        onError: async (error: Error) => {
          const message = await getApiErrorMessage(error, 'Ein unerwarteter Fehler ist aufgetreten.', 'userRegister');

          toaster.create({
            title: 'Registrierung fehlgeschlagen',
            description: message,
            type: 'error',
          });
        },
      });
    },
    [register, navigate],
  );

  useEffect(() => {
    if (!isLoading && user) {
      void navigate({ to: '/' });
    }
  }, [isLoading, user, navigate]);

  return (
    <Box minH="100vh" position="relative" display="flex" alignItems="center" justifyContent="center" overflow="hidden">
      {/* Background with blur effect */}
      <Box position="absolute" bgImage={`url(${backgroundImage})`} zIndex="-2" className="bg-center blur-md bg-no-repeat bg-cover top-0 left-0 right-0 bottom-0" />

      {/* Background overlay */}
      <Box position="absolute" top="0" left="0" right="0" bottom="0" bgGradient="linear(135deg, rgba(0, 61, 122, 0.8) 0%, rgba(0, 61, 122, 0.4) 50%, rgba(227, 6, 19, 0.3) 100%)" zIndex="-1" />

      {/* Dark Mode Switch */}
      <Box position="absolute" top="6" right="6" zIndex="10">
        <ColorModeButton size="md" />
      </Box>

      {/* Login Card */}
      <Box
        position="relative"
        bg="bg.panel"
        borderRadius="16px"
        boxShadow="0 20px 60px rgba(0, 0, 0, 0.3), 0 0 100px rgba(0, 61, 122, 0.2)"
        w="full"
        maxW="440px"
        p={{ base: '8', sm: '12' }}
        m="5"
        css={{
          animation: 'cardEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          '@keyframes cardEntry': {
            from: {
              opacity: 0,
              transform: 'scale(0.9) translateY(50px)',
            },
            to: {
              opacity: 1,
              transform: 'scale(1) translateY(0)',
            },
          },
        }}
      >
        {/* Emergency Stripe */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          height="4px"
          bgGradient="linear(90deg, red.500 0%, blue.600 50%, red.500 100%)"
          borderRadius="16px 16px 0 0"
          css={{
            backgroundSize: '200% 100%',
            animation: 'stripeMove 3s linear infinite',
            '@keyframes stripeMove': {
              '0%': {
                backgroundPosition: '0% 0%',
              },
              '100%': {
                backgroundPosition: '200% 0%',
              },
            },
          }}
        />

        <VStack gap="8">
          {/* Logo Section */}
          <VStack gap="6" textAlign="center">
            {/* Logo */}
            <Box position="relative" display="inline-block">
              <Image src={logoSrc} alt="Bluelight Hub Logo" w="80px" h="80px" objectFit="contain" filter="drop-shadow(0 10px 30px rgba(0, 61, 122, 0.3))" />
              {/* Online indicator */}
              <Box
                position="absolute"
                top="-2px"
                right="-2px"
                w="16px"
                h="16px"
                bg="green.400"
                borderRadius="50%"
                border="3px solid"
                borderColor="bg.panel"
                css={{
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': {
                      opacity: 1,
                      boxShadow: '0 0 0 0 currentColor',
                    },
                    '50%': {
                      opacity: 0.7,
                      boxShadow: '0 0 0 3px currentColor',
                    },
                  },
                }}
              />
            </Box>

            <Heading size="2xl" color="fg">
              Bluelight Hub
            </Heading>
            <Text fontSize="md" color="fg.muted">
              Einsatzmanagement-System
            </Text>
          </VStack>

          {/* Form Container */}
          <Box w="full">
            <Tabs.Root value={selectedTab.toString()} onValueChange={(details) => setSelectedTab(parseInt(details.value))} variant="enclosed" fitted>
              <Tabs.List>
                <Tabs.Trigger value="0">Anmelden</Tabs.Trigger>
                <Tabs.Trigger value="1">Registrieren</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="0">
                <LoginTab onSubmit={(username) => loginUser(username)} isLoading={login.isPending} error={login.error} />
              </Tabs.Content>

              <Tabs.Content value="1">
                <RegisterTab onSubmit={(username) => registerUser({ username })} isLoading={register.isPending} error={register.error} />
              </Tabs.Content>
            </Tabs.Root>
          </Box>

          {/* Footer Info */}
          <VStack gap="4" w="full" pt="6" borderTop="1px solid" borderColor="border.muted">
            {/* Status Pills */}
            <Box display="flex" justifyContent="center" gap="4">
              <Box display="flex" alignItems="center" px="3" py="1.5" bg="bg.muted" borderRadius="20px" fontSize="xs" color="fg.muted">
                <Box
                  w="6px"
                  h="6px"
                  borderRadius="50%"
                  bg="green.400"
                  mr="2"
                  css={{
                    animation: 'pulse 2s infinite',
                  }}
                />
                System online (TODO)
              </Box>
            </Box>

            {/* Version Text */}
            <Text fontSize="2xs" color="fg.muted" textAlign="center">
              Version TODO
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}
