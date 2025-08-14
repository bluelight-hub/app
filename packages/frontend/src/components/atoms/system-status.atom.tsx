import { Badge, HStack, Text, VStack } from '@chakra-ui/react';
import { PiCheckCircle, PiCircle, PiWarningCircle } from 'react-icons/pi';

export interface SystemStatusData {
  /** Verbindungsstatus zum Server */
  isOnline: boolean;
  /** Server Response Zeit in Millisekunden */
  responseTime?: number;
  /** API Version */
  apiVersion?: string;
  /** Zeitstempel des letzten erfolgreichen Health-Checks */
  lastHealthCheck?: Date;
  /** Aktuell wird ein Health-Check durchgeführt */
  isChecking?: boolean;
}

export interface SystemStatusProps {
  /** System Status Daten */
  data: SystemStatusData;
  /** Kompakte Darstellung ohne Details */
  compact?: boolean;
}

/**
 * Zeigt den aktuellen Systemstatus mit Verbindung, Response Zeit und API-Informationen an.
 *
 * Verwendet verschiedene Farb-Indikatoren:
 * - Grün: Online und funktionsfähig
 * - Rot: Offline oder Probleme
 * - Gelb: Überprüfung läuft oder unbekannter Status
 */
export function SystemStatus({ data, compact = false }: SystemStatusProps) {
  const { isOnline, responseTime, apiVersion, lastHealthCheck, isChecking } = data;

  // Status-Bestimmung
  const getStatusInfo = () => {
    if (isChecking) {
      return {
        color: 'yellow' as const,
        icon: PiCircle,
        label: 'Überprüfung...',
        badgeText: 'CHECKING',
      };
    }

    if (!isOnline) {
      return {
        color: 'red' as const,
        icon: PiWarningCircle,
        label: 'Offline',
        badgeText: 'OFFLINE',
      };
    }

    return {
      color: 'green' as const,
      icon: PiCheckCircle,
      label: 'Online',
      badgeText: 'ONLINE',
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Response Zeit formatieren
  const formatResponseTime = (time?: number): string => {
    if (time === undefined) return 'N/A';
    return `${time}ms`;
  };

  // Letzter Check formatieren
  const formatLastCheck = (date?: Date): string => {
    if (!date) return 'Nie';

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Gerade eben';
    if (diffInMinutes < 60) return `vor ${diffInMinutes}min`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `vor ${diffInHours}h`;

    return date.toLocaleDateString('de-DE');
  };

  if (compact) {
    return (
      <HStack gap={2}>
        <StatusIcon size={16} color={`var(--colors-${statusInfo.color}-500)`} />
        <Badge colorPalette={statusInfo.color} size="sm">
          {statusInfo.badgeText}
        </Badge>
        {responseTime !== undefined && (
          <Text fontSize="sm" color="fg.muted">
            {formatResponseTime(responseTime)}
          </Text>
        )}
      </HStack>
    );
  }

  return (
    <VStack align="start" gap={3} p={4} border="1px solid" borderColor="border.default" borderRadius="md" bg="bg.subtle">
      <HStack justify="space-between" width="full">
        <HStack gap={2}>
          <StatusIcon size={20} color={`var(--colors-${statusInfo.color}-500)`} />
          <Text fontWeight="semibold">{statusInfo.label}</Text>
        </HStack>
        <Badge colorPalette={statusInfo.color}>{statusInfo.badgeText}</Badge>
      </HStack>

      <VStack align="start" gap={2} width="full">
        <HStack justify="space-between" width="full">
          <Text fontSize="sm" color="fg.muted">
            Response Zeit:
          </Text>
          <Text fontSize="sm" fontFamily="mono">
            {formatResponseTime(responseTime)}
          </Text>
        </HStack>

        {apiVersion && (
          <HStack justify="space-between" width="full">
            <Text fontSize="sm" color="fg.muted">
              API Version:
            </Text>
            <Text fontSize="sm" fontFamily="mono">
              {apiVersion}
            </Text>
          </HStack>
        )}

        <HStack justify="space-between" width="full">
          <Text fontSize="sm" color="fg.muted">
            Letzter Check:
          </Text>
          <Text fontSize="sm">{formatLastCheck(lastHealthCheck)}</Text>
        </HStack>
      </VStack>
    </VStack>
  );
}
