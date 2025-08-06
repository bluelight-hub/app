import type { AdminPasswordDto, AdminSetupDto } from '@bluelight-hub/shared/client';
import { api } from '@/api/api';

/**
 * Überprüft, ob ein Admin-Account existiert
 * @returns true wenn ein Admin existiert, false sonst
 */
export async function verifyAdmin(): Promise<boolean> {
  try {
    const response = await api.auth().authControllerVerifyAdmin();
    return response.exists;
  } catch (_error) {
    // Bei Fehler nehmen wir an, dass kein Admin existiert
    return false;
  }
}

/**
 * Richtet den ersten Admin-Account ein
 * @param password Das Admin-Passwort
 * @returns true bei Erfolg, false bei Fehler
 */
export async function setupAdmin(password: string): Promise<boolean> {
  try {
    const setupData: AdminSetupDto = { password };
    await api.auth().authControllerAdminSetup({
      adminSetupDto: setupData,
    });
    // Backend setzt httpOnly Cookie, kein Token im Response
    return true;
  } catch (error) {
    console.error('Admin setup failed:', error);
    return false;
  }
}

/**
 * Meldet einen Admin an
 * @param password Das Admin-Passwort
 * @returns true bei Erfolg, false bei Fehler
 */
export async function loginAdmin(password: string): Promise<boolean> {
  try {
    const loginData: AdminPasswordDto = { password };
    await api.auth().authControllerAdminLogin({
      adminPasswordDto: loginData,
    });
    // Backend setzt httpOnly Cookie, kein Token im Response
    return true;
  } catch (error) {
    console.error('Admin login failed:', error);
    return false;
  }
}

/**
 * Fehlerklasse für Authentifizierungsfehler
 */
export class AuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Fehlerklasse für Admin existiert bereits
 */
export class AdminExistsError extends AuthError {
  constructor() {
    super(409, 'Ein Admin-Account existiert bereits');
    this.name = 'AdminExistsError';
  }
}

/**
 * Fehlerklasse für ungültige Anmeldedaten
 */
export class InvalidCredentialsError extends AuthError {
  constructor() {
    super(401, 'Ungültige Anmeldedaten');
    this.name = 'InvalidCredentialsError';
  }
}
