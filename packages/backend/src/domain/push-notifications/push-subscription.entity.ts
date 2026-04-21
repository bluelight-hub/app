import { Result } from '@domain/common/result';

/**
 * Props zur Rekonstruktion einer PushSubscription aus der Persistenzschicht.
 */
export interface ReconstructPushSubscriptionProps {
  readonly id: string;
  readonly userId: string;
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Props zur Erstellung einer neuen PushSubscription via Client-Registrierung.
 *
 * `id`, `createdAt`, `updatedAt` werden von der Persistenzschicht gesetzt
 * (`@id @default(cuid())` bzw. `@default(now())` / `@updatedAt`).
 */
export interface CreatePushSubscriptionProps {
  readonly userId: string;
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

const HTTPS_PROTOCOL = 'https:';

/**
 * Base64Url-Alphabet (RFC 4648 §5): A-Z, a-z, 0-9, '-', '_'. Kein Padding,
 * kein '+'/'/'-Char. Wird auf p256dh/auth angewendet, um poison keys bereits
 * am Domain-Rand abzulehnen — die kryptographische Prüfung bleibt `web-push`.
 */
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Hostname-Patterns, die für Web-Push-Endpoints nicht erreichbar sein dürfen
 * (SSRF-Schutz). Verhindert, dass der Server VAPID-signierte POSTs an eine
 * interne/private IP schickt, wenn ein Client einen manipulierten Endpoint
 * registriert.
 */
const SSRF_BLOCKED_HOSTNAMES = new Set(['localhost', 'ip6-localhost', 'ip6-loopback']);
const SSRF_BLOCKED_IP_PATTERNS: RegExp[] = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^0\.0\.0\.0$/, /^::1$/, /^fc00:/i, /^fd00:/i, /^fe80:/i];

function isPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (SSRF_BLOCKED_HOSTNAMES.has(lower)) return true;
  const stripped = lower.startsWith('[') && lower.endsWith(']') ? lower.slice(1, -1) : lower;
  return SSRF_BLOCKED_IP_PATTERNS.some((pattern) => pattern.test(stripped));
}

/**
 * PushSubscription-Entity (Domain-Layer, framework-agnostisch).
 *
 * Repräsentiert die Web-Push-Registrierung eines Client-Geräts eines Users.
 * Die Kombination aus `userId + endpoint` ist semantisch eindeutig; auf der
 * DB-Seite wird zusätzlich `endpoint` UNIQUE erzwungen, damit mehrere User
 * sich nicht denselben Endpoint (Zweit-Registrierung nach Geräte-Tausch)
 * teilen.
 *
 * Validierung:
 * - `endpoint` muss eine HTTPS-URL auf einen öffentlichen Host sein (kein
 *   Loopback/RFC1918/Link-Local — SSRF-Schutz).
 * - `p256dh` und `auth` müssen nicht-leere Base64Url-Strings sein (die
 *   kryptographische Validität prüft `web-push` beim ersten Send).
 */
export class PushSubscription {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly endpoint: string,
    public readonly p256dh: string,
    public readonly auth: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /**
   * Erstellt eine neue PushSubscription-Instanz aus einem Client-Registrierungs-
   * POST.
   *
   * **Transiente Felder:** `id` wird als leerer String zurückgegeben, bis der
   * Persistenz-Adapter (`PrismaPushSubscriptionRepository.upsertByEndpoint`)
   * den Datensatz schreibt und eine neue Instanz via {@link reconstruct} mit
   * echter ID liefert. `createdAt`/`updatedAt` sind Entwurfs-Zeitstempel, die
   * Prisma beim Upsert durch `@default(now())` / `@updatedAt` überschreibt.
   * Domain-Code ausserhalb der Konstruktions→Upsert-Kette darf sich auf diese
   * Felder nicht verlassen.
   */
  static create(props: CreatePushSubscriptionProps): Result<PushSubscription> {
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail('PushSubscription.userId darf nicht leer sein');
    }

    const endpoint = props.endpoint?.trim();
    if (!endpoint) {
      return Result.fail('PushSubscription.endpoint darf nicht leer sein');
    }

    let parsed: URL;
    try {
      parsed = new URL(endpoint);
    } catch {
      return Result.fail('PushSubscription.endpoint muss eine gültige URL sein');
    }

    if (parsed.protocol !== HTTPS_PROTOCOL) {
      return Result.fail('PushSubscription.endpoint muss HTTPS verwenden');
    }

    if (isPrivateHostname(parsed.hostname)) {
      return Result.fail('PushSubscription.endpoint darf keinen privaten/internen Host adressieren');
    }

    const p256dh = props.p256dh?.trim();
    if (!p256dh) {
      return Result.fail('PushSubscription.p256dh darf nicht leer sein');
    }
    if (!BASE64URL_PATTERN.test(p256dh)) {
      return Result.fail('PushSubscription.p256dh muss Base64Url-kodiert sein');
    }

    const auth = props.auth?.trim();
    if (!auth) {
      return Result.fail('PushSubscription.auth darf nicht leer sein');
    }
    if (!BASE64URL_PATTERN.test(auth)) {
      return Result.fail('PushSubscription.auth muss Base64Url-kodiert sein');
    }

    const now = new Date();
    return Result.ok(new PushSubscription('', userId, endpoint, p256dh, auth, now, now));
  }

  /**
   * Rekonstruiert eine PushSubscription aus einem persistierten Datensatz.
   * Überspringt die Validierungen (Datenbankseitig bereits gewährleistet).
   */
  static reconstruct(props: ReconstructPushSubscriptionProps): PushSubscription {
    return new PushSubscription(props.id, props.userId, props.endpoint, props.p256dh, props.auth, props.createdAt, props.updatedAt);
  }

  /**
   * Liefert den Host-Teil des Endpoints. Wird für strukturiertes Logging
   * genutzt, um keine vollständigen Endpoint-Tokens in die Logs zu schreiben
   * (AC4).
   */
  getEndpointHost(): string {
    try {
      return new URL(this.endpoint).host;
    } catch {
      return 'invalid-endpoint';
    }
  }
}
