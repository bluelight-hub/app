import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service zur Geolokalisierung von IP-Adressen.
 * Bietet Informationen über den geografischen Standort einer IP-Adresse.
 *
 * TODO: Integration mit einem GeoIP-Provider (z.B. MaxMind, IPStack, ipapi)
 */
@Injectable()
export class GeoIpService {
  private readonly logger = new Logger(GeoIpService.name);
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.isEnabled = this.configService.get<string>('GEOIP_ENABLED', 'false') === 'true';
  }

  /**
   * Ermittelt die geografischen Informationen zu einer IP-Adresse
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

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export interface GeoIpInfo {
  ip: string;
  country: string;
  countryCode?: string;
  city: string;
  region: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
  isVpn: boolean;
  isProxy: boolean;
  isTor?: boolean;
  org?: string; // Organization/ISP
}
