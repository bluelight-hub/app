/**
 * Encryption Port - Framework-agnostic Encryption Interface.
 *
 * Dieser Port ermöglicht die Ver- und Entschlüsselung von sensiblen Daten
 * (z.B. API-Tokens) im Application Layer ohne direkte Abhängigkeit von
 * Kryptographie-Bibliotheken.
 *
 * **Clean Architecture:**
 * - Domain/Application Layer hängen von diesem Port ab (Dependency Inversion)
 * - Infrastructure Layer implementiert diesen Port mit AES-256-GCM
 * - Ermöglicht einfaches Testen (Mock Encryption) und Framework-Unabhängigkeit
 *
 * **Sicherheitsanforderungen:**
 * - Verwendung von AES-256-GCM für authentifizierte Verschlüsselung
 * - IV wird pro Verschlüsselung neu generiert (16 bytes)
 * - Format: `{iv}:{authTag}:{cipherText}` (alle Base64-kodiert)
 * - Key aus Umgebungsvariable INTEGRATION_ENCRYPTION_KEY (64 hex chars = 32 bytes)
 *
 * @module domain/ports
 * @see AesEncryptionAdapter - Infrastructure Adapter für AES-256-GCM
 */

/**
 * Framework-agnostisches Encryption Interface.
 *
 * Verwendet von Application Layer Handlers, die sensible Daten
 * (z.B. API-Tokens für externe Dienste) verschlüsseln müssen.
 */
export interface IEncryptionPort {
  /**
   * Verschlüsselt einen Klartext-String mit AES-256-GCM.
   *
   * @param plainText - Der zu verschlüsselnde Klartext
   * @returns Der verschlüsselte Text im Format `{iv}:{authTag}:{cipherText}` (Base64)
   * @throws Error wenn Key nicht konfiguriert oder Verschlüsselung fehlschlägt
   */
  encrypt(plainText: string): string;

  /**
   * Entschlüsselt einen verschlüsselten String.
   *
   * @param cipherText - Der verschlüsselte Text im Format `{iv}:{authTag}:{cipherText}`
   * @returns Der entschlüsselte Klartext
   * @throws Error wenn Key nicht konfiguriert, Format ungültig oder Entschlüsselung fehlschlägt
   */
  decrypt(cipherText: string): string;
}
