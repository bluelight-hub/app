import * as crypto from 'node:crypto';

const MASTER_KEY_HEX_LENGTH = 64;
const AES_ALGORITHM = 'aes-256-gcm';
const GCM_IV_LENGTH = 12;
const DERIVED_KEY_LENGTH = 32;
const HKDF_SALT = Buffer.from('bluelight-hub/master-key/v1', 'utf8');

export interface V1EncryptedPayload {
  version: 'v1';
  alg: 'aes-256-gcm';
  scope: string;
  key: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  aad: string;
}

export function parseMasterSecretKey(rawKey: string): Buffer {
  const trimmed = rawKey.trim();

  if (!trimmed) {
    throw new Error('MASTER_SECRET darf nicht leer sein.');
  }

  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length === MASTER_KEY_HEX_LENGTH) {
    return Buffer.from(trimmed, 'hex');
  }

  try {
    const base64Decoded = Buffer.from(trimmed, 'base64');
    if (base64Decoded.length === DERIVED_KEY_LENGTH) {
      return base64Decoded;
    }
  } catch {
    // no-op: handled by passphrase fallback below
  }

  // Kompatibilitätsmodus: passphrase-basierte Ableitung per scrypt
  return crypto.scryptSync(trimmed, HKDF_SALT, DERIVED_KEY_LENGTH);
}

export function deriveScopedKey(masterKey: Buffer, scope: string): Buffer {
  if (!scope.trim()) {
    throw new Error('Scope für Key-Ableitung darf nicht leer sein.');
  }

  const hkdfResult = crypto.hkdfSync('sha256', masterKey, HKDF_SALT, Buffer.from(scope, 'utf8'), DERIVED_KEY_LENGTH);
  return Buffer.from(hkdfResult);
}

export function encryptV1String(plainText: string, options: { masterKey: Buffer; scope: string; key: string }): string {
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const scopedKey = deriveScopedKey(options.masterKey, options.scope);
  const aad = JSON.stringify({ scope: options.scope, key: options.key, version: 1 });

  const cipher = crypto.createCipheriv(AES_ALGORITHM, scopedKey, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));

  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload: V1EncryptedPayload = {
    version: 'v1',
    alg: 'aes-256-gcm',
    scope: options.scope,
    key: options.key,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    aad,
  };

  return JSON.stringify(payload);
}

export function decryptV1String(
  encryptedPayload: string,
  options: {
    masterKey: Buffer;
    expectedScope?: string;
    expectedKey?: string;
  },
): string {
  const payload = parseV1Payload(encryptedPayload);

  if (options.expectedScope && payload.scope !== options.expectedScope) {
    throw new Error(`Ungültiger Scope für Secret-Entschlüsselung: ${payload.scope}`);
  }

  if (options.expectedKey && payload.key !== options.expectedKey) {
    throw new Error(`Ungültiger Secret-Key-Kontext: ${payload.key}`);
  }

  const scopedKey = deriveScopedKey(options.masterKey, payload.scope);
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, scopedKey, Buffer.from(payload.iv, 'base64'));
  decipher.setAAD(Buffer.from(payload.aad, 'utf8'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

  const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}

export function isLegacyCiphertextFormat(value: string): boolean {
  if (!value || value.trim().length === 0) {
    return false;
  }

  if (value.trim().startsWith('{')) {
    return false;
  }

  return value.split(':').length === 3;
}

export function isV1EncryptedPayload(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as Partial<V1EncryptedPayload>;
    return parsed.version === 'v1' && parsed.alg === 'aes-256-gcm' && typeof parsed.scope === 'string' && typeof parsed.key === 'string';
  } catch {
    return false;
  }
}

function parseV1Payload(payload: string): V1EncryptedPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('Ungültiges Secret-Payload-Format: JSON erwartet.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Ungültiges Secret-Payload-Format: Objekt erwartet.');
  }

  const candidate = parsed as Partial<V1EncryptedPayload>;

  if (
    candidate.version !== 'v1' ||
    candidate.alg !== 'aes-256-gcm' ||
    typeof candidate.scope !== 'string' ||
    typeof candidate.key !== 'string' ||
    typeof candidate.iv !== 'string' ||
    typeof candidate.authTag !== 'string' ||
    typeof candidate.ciphertext !== 'string' ||
    typeof candidate.aad !== 'string'
  ) {
    throw new Error('Ungültiges Secret-Payload-Format: Pflichtfelder fehlen.');
  }

  return candidate as V1EncryptedPayload;
}
