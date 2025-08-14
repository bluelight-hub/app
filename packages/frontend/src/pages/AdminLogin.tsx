import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Box, Button, Field, Group, Heading, IconButton, Image, Input, Text, VStack } from '@chakra-ui/react';
import { PiEye, PiEyeClosed, PiLock, PiWarning } from 'react-icons/pi';
import { toaster } from '@/components/ui/toaster.instance';
import { useAuth } from '@/hooks/useAuth.ts';
import { getApiErrorMessage } from '@/utils/apiErrorHandler.ts';
import { ColorModeButton } from '@/components/molecules/color-mode-button.molecule';
import { useColorModeValue } from '@/hooks/use-color-mode';
import mobileLogo from '@/assets/brandbook/mobile-logo.png';
import mobileLogoWhite from '@/assets/brandbook/mobile-white.png';
import { useTimeBasedBackground } from '@/utils/timeBasedBackground';

export function AdminLogin() {
  const navigate = useNavigate();
  const { user, isLoading, isAdminAuthenticated, loginAdmin } = useAuth();
  const logoSrc = useColorModeValue(mobileLogo, mobileLogoWhite);
  const backgroundImage = useTimeBasedBackground();

  const [password, setPassword] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const shakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) {
        clearTimeout(shakeTimerRef.current);
      }
    };
  }, []);

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
        void navigate({ to: '/admin/dashboard' });
      }
      // If user is not logged in at all, redirect to auth
      else if (!user) {
        void navigate({ to: '/auth' });
      }
      // User is logged in but not admin authenticated - stay on this page
    }
  }, [user, hasCheckedAuth, isAdminAuthenticated, navigate]);

  const shakePasswordInput = useCallback(() => {
    setShouldShake(true);
    if (shakeTimerRef.current) {
      clearTimeout(shakeTimerRef.current);
    }
    shakeTimerRef.current = setTimeout(() => {
      setShouldShake(false);
      shakeTimerRef.current = null;
    });
  }, [shakeTimerRef]);

  const loginWithPassword = useCallback(
    (adminPassword: string) =>
      loginAdmin.mutate(
        {
          password: adminPassword,
        },
        {
          onSuccess: async () => {
            toaster.create({
              title: 'Anmeldung erfolgreich',
              description: 'Sie wurden erfolgreich als Administrator angemeldet.',
              type: 'success',
            });

            await navigate({ to: '/admin/dashboard' });
          },
          onError: async (error: Error) => {
            const message = await getApiErrorMessage(error, 'Ein unerwarteter Fehler ist aufgetreten.', 'adminLogin');

            setApiError(message);

            // Shake input for password errors
            if (message.includes('Ungültiges') || message.includes('Passwort')) {
              shakePasswordInput();
            }

            toaster.create({
              title: message.includes('Administratorrechte') ? 'Zugriff verweigert' : 'Anmeldung fehlgeschlagen',
              description: message,
              type: 'error',
            });
          },
        },
      ),
    [loginAdmin, navigate, shakePasswordInput],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      await loginWithPassword(password);
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
    <Box minH="100vh" position="relative" display="flex" alignItems="center" justifyContent="center" overflow="hidden">
      {/* Background with blur effect */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bgImage={`url(${backgroundImage})`}
        bgSize="cover"
        bgPosition="center"
        bgRepeat="no-repeat"
        filter="blur(8px)"
        transform="scale(1.1)"
        zIndex="-2"
      />

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
              Administrator-Anmeldung
            </Text>
          </VStack>

          {/* Form Container */}
          <Box w="full">
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
                  <Box animation={shouldShake ? 'shake' : undefined} w="full" position="relative">
                    {/* Lock Icon */}
                    <Box position="absolute" left="4" top="50%" transform="translateY(-50%)" zIndex="1" color="fg.muted" pointerEvents="none">
                      <PiLock size="18" />
                    </Box>
                    <Group attached w="full">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Geben Sie Ihr Passwort ein"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loginAdmin.isPending}
                        flex="1"
                        pl="12"
                        bg="bg.muted"
                        border="2px solid"
                        borderColor="border.muted"
                        borderRadius="12px"
                        fontSize="16px"
                        py="3.5"
                        _focus={{
                          borderColor: 'blue.solid',
                          bg: 'bg.panel',
                          boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)',
                        }}
                      />
                      <IconButton
                        type="button"
                        aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                        onClick={() => setShowPassword(!showPassword)}
                        variant="outline"
                        disabled={loginAdmin.isPending}
                        borderRadius="0 12px 12px 0"
                        border="2px solid"
                        borderColor="border.muted"
                        borderLeft="none"
                        bg="bg.muted"
                        _focus={{
                          borderColor: 'blue.solid',
                          bg: 'bg.panel',
                        }}
                      >
                        {showPassword ? <PiEyeClosed /> : <PiEye />}
                      </IconButton>
                    </Group>
                  </Box>
                </Field.Root>

                <Button
                  type="submit"
                  colorPalette="red"
                  size="lg"
                  fontSize="16px"
                  fontWeight="semibold"
                  w="full"
                  disabled={loginAdmin.isPending || !password.trim()}
                  loading={loginAdmin.isPending}
                  py="4"
                  borderRadius="12px"
                  bgGradient="linear(135deg, red.500 0%, red.600 100%)"
                  boxShadow="0 10px 25px rgba(239, 68, 68, 0.25)"
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: '0 15px 35px rgba(239, 68, 68, 0.3)',
                  }}
                  _active={{
                    transform: 'translateY(0)',
                  }}
                  transition="all 0.3s ease"
                >
                  {loginAdmin.isPending ? 'Anmeldung...' : 'Sicher anmelden'}
                </Button>
              </VStack>
            </form>
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
                System online
              </Box>
              <Box display="flex" alignItems="center" px="3" py="1.5" bg="bg.muted" borderRadius="20px" fontSize="xs" color="fg.muted">
                <Box w="6px" h="6px" borderRadius="50%" bg="blue.400" mr="2" />
                SSL gesichert
              </Box>
            </Box>

            {/* Version Text */}
            <Text fontSize="2xs" color="fg.muted" textAlign="center">
              Version 2.0.1 | © 2025 DRK
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}
