import { Request } from 'express';

/**
 * Utility-Funktionen für die Extraktion von Request-Kontextinformationen.
 * Behandelt Proxy-Konfigurationen und Edge Cases.
 */

/**
 * Extrahiert relevante Informationen aus einem HTTP Request.
 * Behandelt Proxy-Header korrekt und gibt sichere Defaults zurück.
 *
 * @param request - Express Request Objekt
 * @returns Extrahierte Request-Informationen
 */
export function extractRequestInfo(request: Request | undefined): {
  ipAddress: string | undefined;
  userAgent: string | undefined;
} {
  if (!request) {
    return {
      ipAddress: undefined,
      userAgent: undefined,
    };
  }

  // IP-Adresse extrahieren mit Proxy-Unterstützung
  const ipAddress = extractIpAddress(request);

  // User-Agent extrahieren
  const userAgent = extractUserAgent(request);

  return {
    ipAddress,
    userAgent,
  };
}

/**
 * Extrahiert die IP-Adresse aus dem Request.
 * Berücksichtigt verschiedene Proxy-Header in der richtigen Reihenfolge.
 *
 * @param request - Express Request Objekt
 * @returns IP-Adresse oder undefined
 */
function extractIpAddress(request: Request): string | undefined {
  // Priorität 1: X-Forwarded-For Header (kann mehrere IPs enthalten)
  const xForwardedFor = request.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // X-Forwarded-For kann mehrere IPs enthalten (client, proxy1, proxy2, ...)
    // Die erste IP ist die ursprüngliche Client-IP
    const ips = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor.split(',').map((ip) => ip.trim());

    if (Array.isArray(ips)) {
      return ips[0];
    }

    return ips.split(',')[0].trim();
  }

  // Priorität 2: X-Real-IP Header (oft von Nginx verwendet)
  const xRealIp = request.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    return xRealIp;
  }

  // Priorität 3: X-Client-IP Header
  const xClientIp = request.headers['x-client-ip'];
  if (xClientIp && typeof xClientIp === 'string') {
    return xClientIp;
  }

  // Priorität 4: CF-Connecting-IP (Cloudflare)
  const cfConnectingIp = request.headers['cf-connecting-ip'];
  if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    return cfConnectingIp;
  }

  // Fallback: Direkte Socket-Verbindung
  const socketRemoteAddress = request.socket?.remoteAddress;
  if (socketRemoteAddress) {
    // IPv6 zu IPv4 mapping entfernen (::ffff:192.168.1.1 -> 192.168.1.1)
    return socketRemoteAddress.replace(/^::ffff:/, '');
  }

  // Letzter Fallback: Express ip property
  return request.ip || undefined;
}

/**
 * Extrahiert den User-Agent aus dem Request.
 *
 * @param request - Express Request Objekt
 * @returns User-Agent String oder undefined
 */
function extractUserAgent(request: Request): string | undefined {
  const userAgent = request.headers['user-agent'];

  if (!userAgent) {
    return undefined;
  }

  // User-Agent kann theoretisch ein Array sein (bei mehreren Headern)
  if (Array.isArray(userAgent)) {
    return userAgent[0];
  }

  return userAgent;
}

/**
 * Validiert und normalisiert eine IP-Adresse.
 *
 * @param ip - Zu validierende IP-Adresse
 * @returns Normalisierte IP-Adresse oder undefined
 */
export function normalizeIpAddress(ip: string | undefined): string | undefined {
  if (!ip) {
    return undefined;
  }

  // Entferne Whitespace
  const trimmed = ip.trim();

  // Basis-Validierung für IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(trimmed)) {
    // Validiere jeden Oktet
    const octets = trimmed.split('.');
    if (
      octets.every((octet) => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      })
    ) {
      return trimmed;
    }
  }

  // Basis-Validierung für IPv6 (vereinfacht)
  const ipv6Regex = /^([\da-fA-F]{0,4}:){2,7}[\da-fA-F]{0,4}$/;
  if (ipv6Regex.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return undefined;
}
