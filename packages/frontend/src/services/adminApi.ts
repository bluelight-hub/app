import { FetchError, ResponseError } from '@bluelight-hub/shared/client';
import type { AdminPasswordDto, AdminSetupDto } from '@bluelight-hub/shared/client';
import { api } from '@/api/api';
import { logger } from '@/utils/logger.ts';

/**
 * Überprüft, ob ein Admin-Account existiert
 * @returns true wenn ein Admin existiert, false sonst
 */
export async function verifyAdmin(): Promise<boolean> {
  try {
    const response = await api.auth().authControllerVerifyAdmin();
    return response.exists;
  } catch (error) {
    // Spezifische Behandlung basierend auf HTTP-Statuscodes
    if (error instanceof ResponseError) {
      const status = error.response.status;
      // 404 bedeutet: kein Admin existiert
      if (status === 404) return false;
      // Serverfehler (5xx) sollen nicht als "kein Admin" fehlinterpretiert werden
      if (status >= 500) throw error;
      // Andere Client-Fehler sind unerwartet -> eskalieren, um Fehldiagnosen zu vermeiden
      throw error;
    }
    // Netzwerkfehler etc. nicht verschlucken
    if (error instanceof FetchError || error instanceof Error) {
      throw error;
    }
    throw error;
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
    logger.error('Admin setup failed:', error);
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
    logger.error('Admin login failed:', error);
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
