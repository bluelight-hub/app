/**
 * Permission Hook für Befehl-Aktionen
 *
 * Bestimmt basierend auf der Einsatz-Rolle des aktuellen Users,
 * welche Befehl-Aktionen erlaubt sind.
 *
 * Story 5.2 AC8
 */

import { useCurrentUser } from '@/features/auth';
import { useEinsatzRollen } from '@/features/einsatz';
import { EinsatzRolleDtoRolleEnum } from '@/shared';

export interface BefehlPermissions {
  /** Darf Befehle erstellen (BEFEHLSGEBER oder ERSTELLER) */
  canCreate: boolean;
  /** Darf Befehle quittieren (EMPFAENGER) */
  canQuittieren: boolean;
  /** Darf Befehle korrigieren (BEFEHLSGEBER oder ERSTELLER) */
  canKorrigieren: boolean;
  /** Darf Befehle exportieren (BEFEHLSGEBER oder ERSTELLER) */
  canExport: boolean;
  /** Darf Metriken einsehen (nur BEFEHLSGEBER) */
  canViewMetriken: boolean;
  /** Darf alle Befehle einsehen (alle Rollen) */
  canViewAll: boolean;
  /** Ist nur Beobachter (read-only) */
  isBeobachter: boolean;
  /** Aktuelle Rolle des Users (null wenn keine) */
  rolle: string | null;
  /** Laden die Rollen-Daten noch? */
  isLoading: boolean;
}

/**
 * Hook zur Bestimmung der Befehl-Berechtigungen des aktuellen Users
 *
 * @param einsatzId - Einsatz-ID für Rollen-Abfrage
 * @returns Berechtigungs-Flags basierend auf der Einsatz-Rolle
 */
export function useBefehlPermissions(einsatzId: string): BefehlPermissions {
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const { data: rollen, isLoading: isRollenLoading } = useEinsatzRollen(einsatzId);

  const isLoading = isUserLoading || isRollenLoading;

  const meineRolle = rollen?.find((r) => r.userId === user?.id)?.rolle ?? null;

  const istBefehlsgeberOderErsteller = meineRolle === EinsatzRolleDtoRolleEnum.Befehlsgeber || meineRolle === EinsatzRolleDtoRolleEnum.Ersteller;

  return {
    canCreate: istBefehlsgeberOderErsteller,
    canQuittieren: meineRolle === EinsatzRolleDtoRolleEnum.Empfaenger,
    canKorrigieren: istBefehlsgeberOderErsteller,
    canExport: istBefehlsgeberOderErsteller,
    canViewMetriken: meineRolle === EinsatzRolleDtoRolleEnum.Befehlsgeber,
    canViewAll: meineRolle !== null,
    isBeobachter: meineRolle === EinsatzRolleDtoRolleEnum.Beobachter,
    rolle: meineRolle,
    isLoading,
  };
}
