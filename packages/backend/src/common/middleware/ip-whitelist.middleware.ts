import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { IpWhitelistService } from '../../modules/admin/security/ip-whitelist/ip-whitelist.service';
import { AuditLogService } from '../../modules/admin/security/audit-log/audit-log.service';

/**
 * Middleware to enforce IP whitelist restrictions
 * Only allows requests from whitelisted IP addresses when enabled
 */
@Injectable()
export class IpWhitelistMiddleware implements NestMiddleware {
    private readonly logger = new Logger(IpWhitelistMiddleware.name);

    constructor(
        private readonly ipWhitelistService: IpWhitelistService,
        private readonly auditLogService: AuditLogService,
        private readonly configService: ConfigService,
    ) {}

    async use(req: Request, res: Response, next: NextFunction) {
        // Check if IP whitelist enforcement is enabled
        const isEnabled = this.configService.get('IP_WHITELIST_ENABLED', 'false') === 'true';
        
        if (!isEnabled) {
            this.logger.debug('IP whitelist enforcement disabled, allowing all requests');
            return next();
        }

        // Skip whitelist check for admin whitelist endpoints themselves
        if (req.path.startsWith('/admin/security/whitelist')) {
            this.logger.debug('Skipping IP whitelist check for admin endpoint');
            return next();
        }

        // Skip whitelist check for health endpoints
        if (req.path.startsWith('/health')) {
            return next();
        }

        const clientIp = this.getClientIp(req);
        this.logger.debug(`Checking IP whitelist for: ${clientIp}`);

        try {
            const isWhitelisted = await this.ipWhitelistService.isIpWhitelisted(clientIp);
            
            if (isWhitelisted) {
                this.logger.debug(`IP ${clientIp} is whitelisted, allowing request`);
                
                // Log successful access (but don't block on logging failure)
                this.auditLogService.logIpWhitelistAccess(
                    clientIp,
                    true,
                    this.getUserId(req),
                    req.get('User-Agent'),
                ).catch(error => {
                    this.logger.warn(`Failed to log IP access: ${error.message}`);
                });
                
                return next();
            } else {
                this.logger.warn(`IP ${clientIp} is not whitelisted, blocking request to ${req.method} ${req.path}`);
                
                // Log failed access attempt
                this.auditLogService.logIpWhitelistAccess(
                    clientIp,
                    false,
                    this.getUserId(req),
                    req.get('User-Agent'),
                ).catch(error => {
                    this.logger.warn(`Failed to log IP access denial: ${error.message}`);
                });
                
                throw new ForbiddenException('Access denied: IP address not whitelisted');
            }
        } catch (error) {
            if (error instanceof ForbiddenException) {
                throw error;
            }
            
            // If whitelist check fails due to DB issues, etc., we need to decide:
            // - Fail open (allow access) for availability
            // - Fail closed (deny access) for security
            // We'll fail closed for security by default, but make it configurable
            const failOpenOnError = this.configService.get('IP_WHITELIST_FAIL_OPEN', 'false') === 'true';
            
            if (failOpenOnError) {
                this.logger.error(`IP whitelist check failed for ${clientIp}, failing open due to configuration`, error.stack);
                return next();
            } else {
                this.logger.error(`IP whitelist check failed for ${clientIp}, failing closed for security`, error.stack);
                throw new ForbiddenException('Access denied: Unable to verify IP whitelist status');
            }
        }
    }

    private getClientIp(request: Request): string {
        return (
            request.get('x-forwarded-for')?.split(',')[0] ||
            request.get('x-real-ip') ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            'unknown'
        );
    }

    private getUserId(request: Request): string {
        // TODO: Extract user ID from authentication context when auth is implemented
        // For now, return a placeholder
        return (request as any).user?.id || 'anonymous';
    }
}