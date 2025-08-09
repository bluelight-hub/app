import { Box, Container, VStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';

/**
 * Layout-Template für Dashboard-Seiten
 *
 * Stellt eine konsistente Struktur für alle Dashboard-Bereiche bereit
 * mit einheitlichen Abständen und Container-Einstellungen.
 */
interface DashboardLayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: number;
}

export function DashboardLayout({ children, maxWidth = 'lg', padding = 8 }: DashboardLayoutProps) {
  return (
    <Box minH="100vh" bg="bg.canvas">
      <Container maxW={`container.${maxWidth}`} py={padding}>
        <VStack gap={8} align="stretch">
          {children}
        </VStack>
      </Container>
    </Box>
  );
}
