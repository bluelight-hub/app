/**
 * DRK QR-Code Parser für Personenregistrierung (Story 4-2)
 *
 * Parst QR-Codes im DRK-Format: drk://person?mnr={personalnummer}&vn={vorname}&nn={nachname}[&fk={funkkennung}]
 *
 * @module features/einsatz/utils
 */

/**
 * Datenstruktur für geparste DRK QR-Code Daten
 *
 * Entspricht dem Backend DTO RegistrierePersonViaQrCodeDto
 */
export interface DrkQrData {
  /** Personalnummer (DRK-Parameter "mnr") */
  personalnummer: string;
  /** Vorname (DRK-Parameter "vn") */
  vorname: string;
  /** Nachname (DRK-Parameter "nn") */
  nachname: string;
  /** BOS-Funkkennung (DRK-Parameter "fk", optional) */
  funkkennung?: string;
}

/**
 * Parse-Ergebnis mit Erfolg oder Fehler
 */
export type ParseResult<T> = { success: true; data: T } | { success: false; error: DrkQrParseError };

/**
 * Fehlercodes für QR-Code Parsing
 */
export enum DrkQrParseErrorCode {
  /** QR-Code ist leer oder kein String */
  EMPTY_INPUT = 'EMPTY_INPUT',
  /** Falsches Protokoll (erwartet: drk://) */
  INVALID_PROTOCOL = 'INVALID_PROTOCOL',
  /** Falscher Host/Typ (erwartet: person) */
  INVALID_TYPE = 'INVALID_TYPE',
  /** Pflichtfeld fehlt */
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  /** Feldwert ist leer */
  EMPTY_FIELD_VALUE = 'EMPTY_FIELD_VALUE',
  /** URL konnte nicht geparst werden */
  MALFORMED_URL = 'MALFORMED_URL',
}

/**
 * Strukturierter Parsing-Fehler
 */
export interface DrkQrParseError {
  code: DrkQrParseErrorCode;
  message: string;
  field?: string;
}

/**
 * DRK QR-Code Protokoll
 */
const DRK_PROTOCOL = 'drk:';

/**
 * Erwarteter Host/Typ für Personen
 */
const DRK_PERSON_TYPE = 'person';

/**
 * Pflichtfelder im QR-Code
 */
const REQUIRED_PARAMS = ['mnr', 'vn', 'nn'] as const;

/**
 * Mapping von QR-Parameter zu Feldname
 */
const PARAM_FIELD_MAP: Record<string, keyof DrkQrData> = {
  mnr: 'personalnummer',
  vn: 'vorname',
  nn: 'nachname',
  fk: 'funkkennung',
};

/**
 * Parst einen DRK QR-Code String
 *
 * @param qrData - Roher QR-Code String
 * @returns ParseResult mit DrkQrData bei Erfolg oder strukturiertem Fehler
 *
 * @example
 * ```typescript
 * const result = parseDrkQrCode('drk://person?mnr=12345&vn=Max&nn=Mustermann');
 *
 * if (result.success) {
 *   console.log(result.data.personalnummer); // "12345"
 *   console.log(result.data.vorname);        // "Max"
 *   console.log(result.data.nachname);       // "Mustermann"
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 *
 * @example Mit optionaler Funkkennung
 * ```typescript
 * const result = parseDrkQrCode('drk://person?mnr=12345&vn=Max&nn=Mustermann&fk=Florian%201');
 *
 * if (result.success) {
 *   console.log(result.data.funkkennung); // "Florian 1"
 * }
 * ```
 */
export function parseDrkQrCode(qrData: string): ParseResult<DrkQrData> {
  // AC2: Validierung - leerer Input
  if (!qrData || typeof qrData !== 'string' || qrData.trim() === '') {
    return {
      success: false,
      error: {
        code: DrkQrParseErrorCode.EMPTY_INPUT,
        message: 'QR-Code ist leer',
      },
    };
  }

  const trimmedData = qrData.trim();

  // URL parsen
  let url: URL;
  try {
    url = new URL(trimmedData);
  } catch {
    return {
      success: false,
      error: {
        code: DrkQrParseErrorCode.MALFORMED_URL,
        message: 'QR-Code hat ungültiges Format',
      },
    };
  }

  // AC2: Validierung - Protokoll prüfen (drk://)
  if (url.protocol !== DRK_PROTOCOL) {
    return {
      success: false,
      error: {
        code: DrkQrParseErrorCode.INVALID_PROTOCOL,
        message: `Ungültiges Protokoll: erwartet "${DRK_PROTOCOL}", erhalten "${url.protocol}"`,
      },
    };
  }

  // AC2: Validierung - Typ prüfen (person)
  // Bei drk://person wird "person" als hostname erkannt
  if (url.hostname !== DRK_PERSON_TYPE) {
    return {
      success: false,
      error: {
        code: DrkQrParseErrorCode.INVALID_TYPE,
        message: `Ungültiger Typ: erwartet "${DRK_PERSON_TYPE}", erhalten "${url.hostname}"`,
      },
    };
  }

  const params = url.searchParams;

  // AC2: Pflichtfelder prüfen
  for (const param of REQUIRED_PARAMS) {
    const value = params.get(param);

    if (value === null) {
      return {
        success: false,
        error: {
          code: DrkQrParseErrorCode.MISSING_REQUIRED_FIELD,
          message: `Pflichtfeld "${PARAM_FIELD_MAP[param]}" (${param}) fehlt`,
          field: PARAM_FIELD_MAP[param],
        },
      };
    }

    // Leere Werte sind nicht erlaubt
    if (value.trim() === '') {
      return {
        success: false,
        error: {
          code: DrkQrParseErrorCode.EMPTY_FIELD_VALUE,
          message: `Feld "${PARAM_FIELD_MAP[param]}" (${param}) darf nicht leer sein`,
          field: PARAM_FIELD_MAP[param],
        },
      };
    }
  }

  // Daten extrahieren (URL-Decode wird von URL.searchParams automatisch gemacht)
  const data: DrkQrData = {
    personalnummer: params.get('mnr')!.trim(),
    vorname: params.get('vn')!.trim(),
    nachname: params.get('nn')!.trim(),
  };

  // Optionales Feld: Funkkennung
  const funkkennung = params.get('fk');
  if (funkkennung && funkkennung.trim() !== '') {
    data.funkkennung = funkkennung.trim();
  }

  return {
    success: true,
    data,
  };
}

/**
 * Prüft ob ein String ein gültiger DRK QR-Code sein könnte (Quick-Check)
 *
 * Führt nur eine oberflächliche Prüfung durch ohne vollständiges Parsing.
 * Nützlich für UI-Feedback während des Scannens.
 *
 * @param qrData - Roher QR-Code String
 * @returns true wenn das Format grundsätzlich passen könnte
 */
export function isDrkQrCodeFormat(qrData: string): boolean {
  if (!qrData || typeof qrData !== 'string') {
    return false;
  }

  const trimmed = qrData.trim().toLowerCase();
  return trimmed.startsWith('drk://person?');
}
