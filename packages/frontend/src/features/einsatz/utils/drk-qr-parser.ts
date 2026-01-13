/**
 * DRK QR-Code Parser für Personenregistrierung (Story 4-2)
 *
 * Unterstützt zwei Formate:
 * 1. CSV-Format (echte DRK-Meldekarten): Nachname;Vorname;Geburtsdatum;...;Personalnummer;...
 * 2. URL-Format (Legacy): drk://person?mnr={personalnummer}&vn={vorname}&nn={nachname}
 *
 * @module features/einsatz/utils
 */

/**
 * Datenstruktur für geparste DRK QR-Code Daten
 *
 * Entspricht dem Backend DTO RegistrierePersonViaQrCodeDto
 */
export interface DrkQrData {
  /** Personalnummer/Mitgliedsnummer */
  personalnummer: string;
  /** Vorname */
  vorname: string;
  /** Nachname */
  nachname: string;
  /** BOS-Funkkennung (optional) */
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
 * DRK QR-Code Protokoll (Legacy URL-Format)
 */
const DRK_PROTOCOL = 'drk:';

/**
 * Erwarteter Host/Typ für Personen (Legacy URL-Format)
 */
const DRK_PERSON_TYPE = 'person';

/**
 * Pflichtfelder im URL-Format
 */
const REQUIRED_PARAMS = ['mnr', 'vn', 'nn'] as const;

/**
 * Mapping von QR-Parameter zu Feldname (URL-Format)
 */
const PARAM_FIELD_MAP: Record<string, keyof DrkQrData> = {
  mnr: 'personalnummer',
  vn: 'vorname',
  nn: 'nachname',
  fk: 'funkkennung',
};

/**
 * CSV-Format Feldindizes (echte DRK-Meldekarten)
 * Format: Nachname;Vorname;Geburtsdatum;Geschlecht;PLZ;;Nationalität;;PersonalCode;KV;Bereitschaft;;;;;Telefon;Email;Mitgliedsnummer;UUID
 */
const CSV_FIELD_INDEX = {
  NACHNAME: 0,
  VORNAME: 1,
  // GEBURTSDATUM: 2,
  // GESCHLECHT: 3,
  // PLZ: 4,
  // NATIONALITAET: 6,
  PERSONAL_CODE: 8,
  // KREISVERBAND: 9,
  // BEREITSCHAFT: 10,
  // TELEFON: 15,
  // EMAIL: 16,
  MITGLIEDSNUMMER: 17,
  // UUID: 18,
} as const;

/**
 * Minimale Anzahl Felder für gültiges CSV-Format
 */
const CSV_MIN_FIELDS = 18;

/**
 * Parst einen DRK QR-Code String
 *
 * Unterstützt zwei Formate:
 * 1. CSV-Format (echte DRK-Meldekarten): Nachname;Vorname;...;Mitgliedsnummer;...
 * 2. URL-Format (Legacy): drk://person?mnr=12345&vn=Max&nn=Mustermann
 *
 * @param qrData - Roher QR-Code String
 * @returns ParseResult mit DrkQrData bei Erfolg oder strukturiertem Fehler
 *
 * @example CSV-Format (echte DRK-Meldekarte)
 * ```typescript
 * const result = parseDrkQrCode('Vitt;Ruben;07.04.1997;m;29525;;deutsch;;M45GVP3KNS;KV;DRK;;;;;0151;mail;358556;UUID');
 *
 * if (result.success) {
 *   console.log(result.data.nachname);       // "Vitt"
 *   console.log(result.data.vorname);        // "Ruben"
 *   console.log(result.data.personalnummer); // "358556"
 * }
 * ```
 *
 * @example URL-Format (Legacy)
 * ```typescript
 * const result = parseDrkQrCode('drk://person?mnr=12345&vn=Max&nn=Mustermann');
 * ```
 */
export function parseDrkQrCode(qrData: string): ParseResult<DrkQrData> {
  // Validierung - leerer Input
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

  // Prüfe welches Format vorliegt
  if (isCsvFormat(trimmedData)) {
    return parseCsvFormat(trimmedData);
  }

  if (isUrlFormat(trimmedData)) {
    return parseUrlFormat(trimmedData);
  }

  return {
    success: false,
    error: {
      code: DrkQrParseErrorCode.INVALID_PROTOCOL,
      message: 'QR-Code hat unbekanntes Format (weder CSV noch URL)',
    },
  };
}

/**
 * Prüft ob der String im CSV-Format vorliegt (Semikolon-getrennt)
 */
function isCsvFormat(data: string): boolean {
  const fields = data.split(';');
  return fields.length >= CSV_MIN_FIELDS;
}

/**
 * Prüft ob der String im URL-Format vorliegt (drk://...)
 * Erkennt alle drk:// URLs für korrekte Fehlerbehandlung
 */
function isUrlFormat(data: string): boolean {
  return data.toLowerCase().startsWith('drk://');
}

/**
 * Parst das CSV-Format (echte DRK-Meldekarten)
 */
function parseCsvFormat(data: string): ParseResult<DrkQrData> {
  const fields = data.split(';');

  // MEDIUM FIX (8): URL-Decode mit fallback für malformed content
  const decodedFields = fields.map((f) => {
    try {
      return decodeURIComponent(f).trim();
    } catch {
      // Fallback: Use original string if decoding fails (malformed URI)
      return f.trim();
    }
  });

  const nachname = decodedFields[CSV_FIELD_INDEX.NACHNAME];
  const vorname = decodedFields[CSV_FIELD_INDEX.VORNAME];
  const mitgliedsnummer = decodedFields[CSV_FIELD_INDEX.MITGLIEDSNUMMER];
  const personalCode = decodedFields[CSV_FIELD_INDEX.PERSONAL_CODE];

  // Validierung Pflichtfelder
  if (!nachname) {
    return {
      success: false,
      error: {
        code: DrkQrParseErrorCode.EMPTY_FIELD_VALUE,
        message: 'Nachname fehlt im QR-Code',
        field: 'nachname',
      },
    };
  }

  if (!vorname) {
    return {
      success: false,
      error: {
        code: DrkQrParseErrorCode.EMPTY_FIELD_VALUE,
        message: 'Vorname fehlt im QR-Code',
        field: 'vorname',
      },
    };
  }

  // Personalnummer: Bevorzuge Mitgliedsnummer, fallback auf PersonalCode
  const personalnummer = mitgliedsnummer || personalCode;
  if (!personalnummer) {
    return {
      success: false,
      error: {
        code: DrkQrParseErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Mitgliedsnummer fehlt im QR-Code',
        field: 'personalnummer',
      },
    };
  }

  return {
    success: true,
    data: {
      nachname,
      vorname,
      personalnummer,
    },
  };
}

/**
 * Parst das URL-Format (Legacy: drk://person?mnr=...&vn=...&nn=...)
 */
function parseUrlFormat(data: string): ParseResult<DrkQrData> {
  let url: URL;
  try {
    url = new URL(data);
  } catch {
    return {
      success: false,
      error: {
        code: DrkQrParseErrorCode.MALFORMED_URL,
        message: 'QR-Code hat ungültiges URL-Format',
      },
    };
  }

  // Protokoll prüfen (drk://)
  if (url.protocol !== DRK_PROTOCOL) {
    return {
      success: false,
      error: {
        code: DrkQrParseErrorCode.INVALID_PROTOCOL,
        message: `Ungültiges Protokoll: erwartet "${DRK_PROTOCOL}", erhalten "${url.protocol}"`,
      },
    };
  }

  // Typ prüfen (person) - case insensitive
  if (url.hostname.toLowerCase() !== DRK_PERSON_TYPE) {
    return {
      success: false,
      error: {
        code: DrkQrParseErrorCode.INVALID_TYPE,
        message: `Ungültiger Typ: erwartet "${DRK_PERSON_TYPE}", erhalten "${url.hostname}"`,
      },
    };
  }

  const params = url.searchParams;

  // Pflichtfelder prüfen
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

  // All required params validated above, non-null assertions are safe
  const result: DrkQrData = {
    // biome-ignore lint/style/noNonNullAssertion: validated above in REQUIRED_PARAMS loop
    personalnummer: params.get('mnr')!.trim(),
    // biome-ignore lint/style/noNonNullAssertion: validated above in REQUIRED_PARAMS loop
    vorname: params.get('vn')!.trim(),
    // biome-ignore lint/style/noNonNullAssertion: validated above in REQUIRED_PARAMS loop
    nachname: params.get('nn')!.trim(),
  };

  // Optionales Feld: Funkkennung
  const funkkennung = params.get('fk');
  if (funkkennung && funkkennung.trim() !== '') {
    result.funkkennung = funkkennung.trim();
  }

  return {
    success: true,
    data: result,
  };
}

/**
 * Prüft ob ein String ein gültiger DRK QR-Code sein könnte (Quick-Check)
 *
 * Führt nur eine oberflächliche Prüfung durch ohne vollständiges Parsing.
 * Unterstützt beide Formate: CSV (echte DRK-Meldekarten) und URL (Legacy).
 *
 * @param qrData - Roher QR-Code String
 * @returns true wenn das Format grundsätzlich passen könnte
 */
export function isDrkQrCodeFormat(qrData: string): boolean {
  if (!qrData || typeof qrData !== 'string') {
    return false;
  }

  const trimmed = qrData.trim();

  // CSV-Format: Mindestens 18 Semikolon-getrennte Felder
  if (isCsvFormat(trimmed)) {
    return true;
  }

  // URL-Format: drk://person?...
  if (isUrlFormat(trimmed)) {
    return true;
  }

  return false;
}
