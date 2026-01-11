/**
 * Onboarding Error Codes Mapping Service
 *
 * Definiert alle Fehlercodes und zugehörige Benutzer-Feedback-Texte
 * für den Onboarding-Prozess (Server-Verbindung, Einladungscodes).
 *
 * @module server/constants/error-codes
 */

import { ResponseError } from '@/shared/api/types';

/**
 * Enum für alle Onboarding-Fehlercodes
 *
 * Diese Codes werden vom Backend oder bei Netzwerkfehlern verwendet,
 * um spezifische Fehlerzustände zu identifizieren.
 */
export enum OnboardingErrorCode {
  /** Einladungslink ist abgelaufen */
  INVITE_EXPIRED = 'INVITE_EXPIRED',
  /** Einladungslink wurde bereits verwendet */
  INVITE_ALREADY_USED = 'INVITE_ALREADY_USED',
  /** Einladungslink ist ungültig */
  INVITE_INVALID = 'INVITE_INVALID',
  /** Zu viele Anfragen (Rate Limiting) */
  INVITE_RATE_LIMITED = 'INVITE_RATE_LIMITED',
  /** Server wurde noch nicht eingerichtet */
  SERVER_NOT_SETUP = 'SERVER_NOT_SETUP',
  /** Netzwerkfehler - Server nicht erreichbar */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Unbekannter Fehler */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Interface für strukturierte Fehlerdetails
 *
 * Enthält alle Informationen, die für die Anzeige
 * einer benutzerfreundlichen Fehlermeldung benötigt werden.
 */
export interface OnboardingErrorDetails {
  /** Kurzer Fehlertitel */
  title: string;
  /** Ausführliche Fehlerbeschreibung */
  message: string;
  /** Call-to-Action Text - was der Benutzer tun soll */
  cta: string;
  /** Schweregrad des Fehlers */
  severity: 'error' | 'warning';
  /** Soll der Fehler im Vollbildmodus angezeigt werden? */
  fullscreen: boolean;
  /** Kann der Benutzer die Aktion wiederholen? */
  retryable: boolean;
}

/**
 * Mapping von Fehlercodes zu Fehlerdetails
 *
 * Alle Texte sind auf Deutsch, da die Anwendung primär
 * für deutschsprachige Benutzer entwickelt wird.
 */
const ERROR_CODE_MAPPING: Record<OnboardingErrorCode, OnboardingErrorDetails> = {
  [OnboardingErrorCode.INVITE_EXPIRED]: {
    title: 'Einladungslink abgelaufen',
    message: 'Dieser Einladungslink ist nicht mehr gültig.',
    cta: 'Fordere einen neuen Link bei deinem Administrator an.',
    severity: 'error',
    fullscreen: true,
    retryable: false,
  },
  [OnboardingErrorCode.INVITE_ALREADY_USED]: {
    title: 'Link bereits verwendet',
    message: 'Dieser Einladungslink wurde bereits eingelöst.',
    cta: 'Falls du Probleme hast, kontaktiere deinen Administrator.',
    severity: 'error',
    fullscreen: true,
    retryable: false,
  },
  [OnboardingErrorCode.INVITE_INVALID]: {
    title: 'Ungültiger Link',
    message: 'Dieser Einladungslink ist ungültig.',
    cta: 'Prüfe die URL und versuche es erneut.',
    severity: 'error',
    fullscreen: true,
    retryable: false,
  },
  [OnboardingErrorCode.INVITE_RATE_LIMITED]: {
    title: 'Zu viele Versuche',
    message: 'Du hast zu viele Anfragen gesendet.',
    cta: 'Bitte warte einige Minuten und versuche es erneut.',
    severity: 'warning',
    fullscreen: false,
    retryable: true,
  },
  [OnboardingErrorCode.SERVER_NOT_SETUP]: {
    title: 'Server nicht eingerichtet',
    message: 'Dieser Server wurde noch nicht initialisiert.',
    cta: 'Kontaktiere den Server-Administrator.',
    severity: 'error',
    fullscreen: true,
    retryable: false,
  },
  [OnboardingErrorCode.NETWORK_ERROR]: {
    title: 'Server nicht erreichbar',
    message: 'Der Server konnte nicht erreicht werden.',
    cta: 'Prüfe deine Internetverbindung und versuche es erneut.',
    severity: 'warning',
    fullscreen: false,
    retryable: true,
  },
  [OnboardingErrorCode.UNKNOWN]: {
    title: 'Unerwarteter Fehler',
    message: 'Ein unerwarteter Fehler ist aufgetreten.',
    cta: 'Versuche es erneut oder richte den Server manuell ein.',
    severity: 'error',
    fullscreen: true,
    retryable: true,
  },
};

/**
 * Gibt die Fehlerdetails für einen gegebenen Fehlercode zurück
 *
 * @param errorCode - Der Fehlercode als String
 * @returns Die zugehörigen Fehlerdetails (fallback zu UNKNOWN bei unbekannten Codes)
 *
 * @example
 * ```typescript
 * const details = getOnboardingErrorDetails('INVITE_EXPIRED');
 * console.log(details.title); // "Einladungslink abgelaufen"
 * ```
 */
export function getOnboardingErrorDetails(errorCode: string): OnboardingErrorDetails {
  // Prüfen ob der Code ein gültiger OnboardingErrorCode ist
  if (Object.values(OnboardingErrorCode).includes(errorCode as OnboardingErrorCode)) {
    return ERROR_CODE_MAPPING[errorCode as OnboardingErrorCode];
  }

  // Fallback zu UNKNOWN für unbekannte Codes
  return ERROR_CODE_MAPPING[OnboardingErrorCode.UNKNOWN];
}

/**
 * Interface für API-Fehlerantworten
 */
interface ApiErrorResponse {
  error?: string;
  code?: string;
  message?: string;
}

/**
 * Cache für geparste Error-Daten
 *
 * WeakMap erlaubt Garbage Collection wenn die Response nicht mehr referenziert wird.
 * Verhindert doppeltes Klonen/Parsen bei mehrfachen Aufrufen für denselben Error
 * (z.B. Toast + ErrorCard gleichzeitig).
 */
const errorDataCache = new WeakMap<Response, Promise<ApiErrorResponse | null>>();

/**
 * Extrahiert den Fehlercode aus verschiedenen Fehlertypen
 *
 * Analysiert den Fehler und versucht, einen passenden OnboardingErrorCode
 * zu ermitteln. Unterstützt ResponseError (API), TypeError (Netzwerk)
 * und allgemeine Error-Typen.
 *
 * @param error - Der aufgetretene Fehler (beliebiger Typ)
 * @returns Promise mit dem ermittelten OnboardingErrorCode
 *
 * @example
 * ```typescript
 * try {
 *   await validateInviteCode(code);
 * } catch (error) {
 *   const errorCode = await parseOnboardingErrorCode(error);
 *   const details = getOnboardingErrorDetails(errorCode);
 *   showError(details);
 * }
 * ```
 */
export async function parseOnboardingErrorCode(error: unknown): Promise<OnboardingErrorCode> {
  // Netzwerkfehler erkennen (TypeError bei fetch-Fehlern)
  if (error instanceof TypeError) {
    // TypeError wird von fetch bei Netzwerkproblemen geworfen
    // z.B. "Failed to fetch", "Network request failed"
    return OnboardingErrorCode.NETWORK_ERROR;
  }

  // ResponseError vom API-Client verarbeiten
  if (error instanceof ResponseError) {
    try {
      // Cache-Lookup: Verhindert mehrfaches Klonen/Parsen für denselben Error
      let parsePromise = errorDataCache.get(error.response);

      if (!parsePromise) {
        // Nur einmal clonen und parsen, dann cachen
        parsePromise = error.response
          .clone()
          .json()
          .catch(() => null);
        errorDataCache.set(error.response, parsePromise);
      }

      const errorData = await parsePromise;

      if (errorData) {
        // Priorität: code > error > statusCode-basierte Ableitung
        const code = errorData.code || errorData.error;

        if (code) {
          // Prüfen ob der Code ein gültiger OnboardingErrorCode ist
          if (Object.values(OnboardingErrorCode).includes(code as OnboardingErrorCode)) {
            return code as OnboardingErrorCode;
          }

          // Bekannte Backend-Codes auf OnboardingErrorCode mappen
          const codeMapping: Record<string, OnboardingErrorCode> = {
            INVITE_CODE_EXPIRED: OnboardingErrorCode.INVITE_EXPIRED,
            INVITE_CODE_ALREADY_USED: OnboardingErrorCode.INVITE_ALREADY_USED,
            INVITE_CODE_INVALID: OnboardingErrorCode.INVITE_INVALID,
            INVITE_CODE_NOT_FOUND: OnboardingErrorCode.INVITE_INVALID,
            RATE_LIMITED: OnboardingErrorCode.INVITE_RATE_LIMITED,
            TOO_MANY_REQUESTS: OnboardingErrorCode.INVITE_RATE_LIMITED,
            SERVER_NOT_INITIALIZED: OnboardingErrorCode.SERVER_NOT_SETUP,
            SETUP_REQUIRED: OnboardingErrorCode.SERVER_NOT_SETUP,
          };

          if (codeMapping[code]) {
            return codeMapping[code];
          }
        }
      }

      // Status-basierte Fallbacks
      const status = error.response.status;
      if (status === 429) {
        return OnboardingErrorCode.INVITE_RATE_LIMITED;
      }
      if (status === 503 || status === 502) {
        return OnboardingErrorCode.NETWORK_ERROR;
      }
    } catch {
      // JSON-Parsing fehlgeschlagen - kein spezieller Code extrahierbar
    }

    return OnboardingErrorCode.UNKNOWN;
  }

  // Allgemeine Error-Typen prüfen
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Netzwerkfehler-Patterns erkennen
    if (message.includes('network') || message.includes('fetch') || message.includes('connection') || message.includes('timeout') || message.includes('econnrefused') || message.includes('dns')) {
      return OnboardingErrorCode.NETWORK_ERROR;
    }
  }

  // Fallback für alle anderen Fälle
  return OnboardingErrorCode.UNKNOWN;
}
