import type { AuthUserResponseDtoRoleEnum, ManagedUserResponseDtoRoleEnum } from '@/shared';

export type AuthRole = AuthUserResponseDtoRoleEnum | ManagedUserResponseDtoRoleEnum | string | undefined;

export interface AuthContextSummary {
  roleLabel: string;
  permissionLevelLabel: string;
  permissionHint: string;
  primaryActionLabel: string;
  nextActionLabel: string;
  restrictedActionLabel?: string;
  restrictedActionHint?: string;
}

const USER_ROLE = 'USER';
const ADMIN_ROLE = 'ADMIN';
const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

/**
 * Prüft ob die gegebene Rolle eine Admin-Rolle ist.
 *
 * Unterstützt sowohl Enum-Werte als auch String-Werte für Flexibilität.
 * Die Admin-Rollen werden lazy evaluiert um Test-Mocking zu ermöglichen.
 */
export const isAdmin = (role: AuthRole): boolean => {
  if (!role) return false;

  return role === ADMIN_ROLE || role === SUPER_ADMIN_ROLE;
};

export function getAuthContextSummary(role: AuthRole, isAdminAuthenticated: boolean): AuthContextSummary {
  switch (role) {
    case SUPER_ADMIN_ROLE:
      return isAdminAuthenticated
        ? {
            roleLabel: 'Super-Administrator',
            permissionLevelLabel: 'Systemweiter Zugriff aktiv',
            permissionHint: 'Dieses Konto kann operative und administrative Aufgaben vollständig ausführen.',
            primaryActionLabel: 'Einsatz auswählen oder neu anlegen',
            nextActionLabel: 'Öffnen Sie einen Einsatz im Dashboard oder wechseln Sie bei Bedarf in den Admin-Bereich.',
          }
        : {
            roleLabel: 'Super-Administrator',
            permissionLevelLabel: 'Operativer Zugriff aktiv',
            permissionHint: 'Die administrative Sitzung ist noch nicht bestätigt.',
            primaryActionLabel: 'Einsatz auswählen oder neu anlegen',
            nextActionLabel: 'Arbeiten Sie operativ weiter oder öffnen Sie den Admin-Login für Verwaltungsaufgaben.',
            restrictedActionLabel: 'Admin-Bereich',
            restrictedActionHint: 'Für System- und Verwaltungsfunktionen zuerst den Admin-Login öffnen.',
          };

    case ADMIN_ROLE:
      return isAdminAuthenticated
        ? {
            roleLabel: 'Administrator',
            permissionLevelLabel: 'Verwaltungszugriff aktiv',
            permissionHint: 'Dieses Konto kann operative Arbeit und Verwaltungsaufgaben ausführen.',
            primaryActionLabel: 'Einsatz auswählen oder neu anlegen',
            nextActionLabel: 'Öffnen Sie einen Einsatz im Dashboard oder wechseln Sie bei Bedarf in den Admin-Bereich.',
          }
        : {
            roleLabel: 'Administrator',
            permissionLevelLabel: 'Operativer Zugriff aktiv',
            permissionHint: 'Verwaltungsfunktionen benötigen eine zusätzliche Administrator-Anmeldung.',
            primaryActionLabel: 'Einsatz auswählen oder neu anlegen',
            nextActionLabel: 'Arbeiten Sie operativ weiter oder öffnen Sie den Admin-Login für Verwaltungsaufgaben.',
            restrictedActionLabel: 'Admin-Bereich',
            restrictedActionHint: 'Für Verwaltungsfunktionen zuerst den Admin-Login öffnen.',
          };

    case USER_ROLE:
      return {
        roleLabel: 'Einsatzkraft',
        permissionLevelLabel: 'Operativer Zugriff',
        permissionHint: 'Dieses Konto kann Einsätze öffnen und neue Einsätze anlegen.',
        primaryActionLabel: 'Einsatz auswählen oder neu anlegen',
        nextActionLabel: 'Öffnen Sie einen bestehenden Einsatz oder legen Sie direkt einen neuen Einsatz an.',
        restrictedActionLabel: 'Verwaltungsfunktionen',
        restrictedActionHint: 'Verwaltungsfunktionen sind für dieses Konto nicht freigegeben.',
      };

    default:
      return {
        roleLabel: 'Unbekannte Rolle',
        permissionLevelLabel: 'Zugriff wird geprüft',
        permissionHint: 'Die Rolle konnte noch nicht eindeutig zugeordnet werden.',
        primaryActionLabel: 'Einsatz auswählen oder neu anlegen',
        nextActionLabel: 'Prüfen Sie den sichtbaren Kontext und melden Sie sich bei Bedarf erneut an.',
      };
  }
}
