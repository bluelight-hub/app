import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Guard zur Überprüfung ob die IP-Adresse des Anfragenden auf der Allowlist steht.
 * Wird für besonders sensitive Operationen verwendet.
 */
@Injectable()
export class IpAllowlistGuard implements CanActivate {
  private readonly logger = new Logger(IpAllowlistGuard.name);
  private readonly allowedIps: Set<string>;
  private readonly ipAllowlistEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.ipAllowlistEnabled =
      this.configService.get<string>('SECURITY_IP_ALLOWLIST_ENABLED', 'false') === 'true';
    const ipList = this.configService.get<string>('SECURITY_ALLOWED_IPS', '');
    this.allowedIps = new Set(
      ipList
        .split(',')
        .map((ip) => ip.trim())
        .filter((ip) => ip),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    // Skip check if IP allowlist is not enabled
    if (!this.ipAllowlistEnabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    if (!clientIp) {
      this.logger.error('Could not determine client IP address');
      throw new ForbiddenException('Access denied: Unable to verify IP address');
    }

    if (!this.allowedIps.has(clientIp)) {
      this.logger.warn(`Access denied for IP: ${clientIp}`);
      throw new ForbiddenException('Access denied: IP address not allowed');
    }

    this.logger.debug(`Access granted for IP: ${clientIp}`);
    return true;
  }

  private getClientIp(request: Request): string | null {
    // Check for forwarded IP addresses (when behind proxy/load balancer)
    const forwardedIps = request.headers['x-forwarded-for'];
    if (forwardedIps) {
      const ips = (forwardedIps as string).split(',').map((ip) => ip.trim());
      return ips[0]; // Use the first IP (original client)
    }

    // Check for real IP header (some proxies use this)
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    // Fall back to request IP
    return request.ip || null;
  }
}
