import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service zur Geolokalisierung von IP-Adressen
 *
 * Bietet Funktionen zur Ermittlung geografischer Informationen
 * basierend auf IP-Adressen. Unterstützt die Erkennung von
 * VPNs, Proxies und die Berechnung von Distanzen zwischen
 * geografischen Punkten.
 *
 * @class GeoIpService
 * @todo Integration mit einem GeoIP-Provider (z.B. MaxMind, IPStack, ipapi)
 *
 * @example
 * ```typescript
 * const location = await geoIpService.getLocationInfo('8.8.8.8');
 * if (location) {
 *   logger.info(`IP ist in ${location.city}, ${location.country}`);
 * }
 * ```
 */
@Injectable()
export class GeoIpService {
  private readonly logger = new Logger(GeoIpService.name);

  /**
   * Gibt an, ob der GeoIP-Service aktiviert ist
   * @private
   * @property {boolean} isEnabled
   */
  private readonly isEnabled: boolean;

  /**
   * Konstruktor des GeoIpService
   *
   * @param {ConfigService} configService - NestJS ConfigService
   */
  constructor(private configService: ConfigService) {
    this.isEnabled = this.configService.get<string>('GEOIP_ENABLED', 'false') === 'true';
  }

  /**
   * Ermittelt die geografischen Informationen zu einer IP-Adresse
   *
   * Gibt Informationen wie Land, Stadt, Zeitzone und VPN/Proxy-Status
   * zurück. Private/lokale IPs werden speziell behandelt.
   *
   * @param {string} ipAddress - Die zu analysierende IP-Adresse
   * @returns {Promise<GeoIpInfo | null>} Geografische Informationen oder null
   *
   * @example
   * ```typescript
   * const info = await geoIpService.getLocationInfo('192.168.1.1');
   * // Returns: { ip: '192.168.1.1', country: 'Local', city: 'Local', ... }
   *
   * const info = await geoIpService.getLocationInfo('8.8.8.8');
   * // Returns: { ip: '8.8.8.8', country: 'United States', city: 'Mountain View', ... }
   * ```
   */
  async getLocationInfo(ipAddress: string): Promise<GeoIpInfo | null> {
    if (!this.isEnabled) {
      return null;
    }

    // Skip for local/private IPs
    if (this.isPrivateIp(ipAddress)) {
      return {
        ip: ipAddress,
        country: 'Local',
        city: 'Local',
        region: 'Local',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isVpn: false,
        isProxy: false,
      };
    }

    try {
      // TODO: Implement actual GeoIP lookup
      // Example with ipapi.co (free tier available):
      // const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      // const data = await response.json();

      // Placeholder implementation
      this.logger.debug(`GeoIP lookup for ${ipAddress} - not implemented yet`);

      return null;
    } catch (error) {
      this.logger.error(`GeoIP lookup failed for ${ipAddress}:`, error);
      return null;
    }
  }

  /**
   * Berechnet die Distanz zwischen zwei geografischen Punkten
   *
   * Verwendet die Haversine-Formel zur Berechnung der Großkreisentfernung
   * zwischen zwei Punkten auf der Erdoberfläche.
   *
   * @param {number} lat1 - Breitengrad des ersten Punkts
   * @param {number} lon1 - Längengrad des ersten Punkts
   * @param {number} lat2 - Breitengrad des zweiten Punkts
   * @param {number} lon2 - Längengrad des zweiten Punkts
   * @returns {number} Distanz in Kilometern (gerundet)
   *
   * @example
   * ```typescript
   * // Distanz zwischen Berlin und München
   * const distance = geoIpService.calculateDistance(
   *   52.520008, 13.404954,  // Berlin
   *   48.135125, 11.581981   // München
   * );
   * logger.info(`Distanz: ${distance} km`); // ~504 km
   * ```
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius der Erde in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
  }

  /**
   * Prüft ob eine IP-Adresse privat/lokal ist
   *
   * Erkennt private IPv4 und IPv6 Adressbereiche gemäß RFC 1918
   * und RFC 4193.
   *
   * @private
   * @param {string} ip - Zu prüfende IP-Adresse
   * @returns {boolean} true wenn IP privat/lokal ist
   *
   * @example
   * ```typescript
   * this.isPrivateIp('192.168.1.1'); // true
   * this.isPrivateIp('10.0.0.1');    // true
   * this.isPrivateIp('8.8.8.8');     // false
   * this.isPrivateIp('::1');         // true (IPv6 loopback)
   * ```
   */
  private isPrivateIp(ip: string): boolean {
    const privateRanges = [
      /^10\./, // 10.0.0.0 - 10.255.255.255
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0 - 172.31.255.255
      /^192\.168\./, // 192.168.0.0 - 192.168.255.255
      /^127\./, // 127.0.0.0 - 127.255.255.255 (loopback)
      /^::1$/, // IPv6 loopback
      /^fe80::/, // IPv6 link-local
      /^fc00::/, // IPv6 unique local
    ];

    return privateRanges.some((range) => range.test(ip));
  }

  /**
   * Konvertiert Grad in Radiant
   *
   * Hilfsfunktion für geografische Berechnungen.
   *
   * @private
   * @param {number} deg - Wert in Grad
   * @returns {number} Wert in Radiant
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

/**
 * Informationen über den geografischen Standort einer IP-Adresse
 *
 * Enthält alle relevanten geografischen und Netzwerk-Informationen
 * zu einer IP-Adresse.
 *
 * @interface GeoIpInfo
 *
 * @example
 * ```typescript
 * const geoInfo: GeoIpInfo = {
 *   ip: '8.8.8.8',
 *   country: 'United States',
 *   countryCode: 'US',
 *   city: 'Mountain View',
 *   region: 'California',
 *   latitude: 37.4056,
 *   longitude: -122.0775,
 *   timezone: 'America/Los_Angeles',
 *   isVpn: false,
 *   isProxy: false,
 *   isTor: false,
 *   org: 'Google LLC'
 * };
 * ```
 */
export interface GeoIpInfo {
  /**
   * Die analysierte IP-Adresse
   * @property {string} ip
   */
  ip: string;

  /**
   * Name des Landes
   * @property {string} country
   * @example "Germany"
   */
  country: string;

  /**
   * ISO-Ländercode (2 Zeichen)
   * @property {string} [countryCode]
   * @example "DE"
   */
  countryCode?: string;

  /**
   * Name der Stadt
   * @property {string} city
   * @example "Berlin"
   */
  city: string;

  /**
   * Region/Bundesland
   * @property {string} region
   * @example "Brandenburg"
   */
  region: string;

  /**
   * Geografische Breite
   * @property {number} [latitude]
   * @example 52.520008
   */
  latitude?: number;

  /**
   * Geografische Länge
   * @property {number} [longitude]
   * @example 13.404954
   */
  longitude?: number;

  /**
   * Zeitzone des Standorts
   * @property {string} timezone
   * @example "Europe/Berlin"
   */
  timezone: string;

  /**
   * Indikator ob die IP von einem VPN stammt
   * @property {boolean} isVpn
   */
  isVpn: boolean;

  /**
   * Indikator ob die IP von einem Proxy stammt
   * @property {boolean} isProxy
   */
  isProxy: boolean;

  /**
   * Indikator ob die IP vom Tor-Netzwerk stammt
   * @property {boolean} [isTor]
   */
  isTor?: boolean;

  /**
   * Organisation/Internet Service Provider
   * @property {string} [org]
   * @example "Deutsche Telekom AG"
   */
  org?: string;
}
