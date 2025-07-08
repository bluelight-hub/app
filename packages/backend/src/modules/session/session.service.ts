import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, SessionActivity } from '../../../prisma/generated/prisma';
import { UAParser } from 'ua-parser-js';
import {
  SessionWithUser,
  SessionWithDetails,
  DeviceInfo,
  LocationInfo,
  SessionRiskFactors,
  SESSION_EVENTS,
  SUSPICIOUS_FLAGS,
  RISK_SCORE_THRESHOLDS,
  SuspiciousFlag,
} from './types/session.types';
import { SessionNotFoundException } from './exceptions/session.exceptions';
import {
  SessionActivityDto,
  CreateSessionActivityDto,
  SessionFilterDto,
  SessionStatisticsDto,
  DeviceType,
  ActivityType,
} from './dto/session.dto';

/**
 * Service für die Verwaltung und Überwachung von Benutzersitzungen
 *
 * Dieser Service bietet umfassende Funktionen für:
 * - Session-Erstellung und -Verwaltung
 * - Risikobewertung und Anomalieerkennung
 * - Aktivitätsverfolgung und Heartbeat-Updates
 * - Statistiken und Analysen
 * - Session-Revozierung und -Cleanup
 *
 * @class SessionService
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly sessionCache = new Map<string, SessionWithUser>();
  private readonly locationCache = new Map<string, LocationInfo>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Erweitert eine bestehende Session mit Monitoring-Daten
   */
  async enhanceSession(
    sessionId: string,
    ipAddress: string,
    userAgent: string,
    loginMethod = 'password',
  ): Promise<SessionWithUser> {
    const deviceInfo = this.parseUserAgent(userAgent);
    const location = await this.getLocationFromIp(ipAddress);
    const riskFactors = await this.assessSessionRisk(sessionId, ipAddress, deviceInfo, location);
    const riskScore = this.calculateRiskScore(riskFactors);
    const suspiciousFlags = this.getSuspiciousFlags(riskFactors);

    const session = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        location: location ? `${location.city}, ${location.country}` : null,
        deviceType: deviceInfo.type as DeviceType,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        loginMethod,
        riskScore,
        suspiciousFlags,
        lastHeartbeat: new Date(),
      },
      include: { user: true },
    });

    // Cache session
    this.sessionCache.set(session.id, session);

    // Emit event
    this.eventEmitter.emit(SESSION_EVENTS.SESSION_CREATED, session);

    // Log high-risk sessions
    if (riskScore >= RISK_SCORE_THRESHOLDS.HIGH) {
      this.logger.warn(`High risk session detected: ${session.id} (score: ${riskScore})`);
      this.eventEmitter.emit(SESSION_EVENTS.SESSION_RISK_DETECTED, {
        session,
        riskScore,
        factors: suspiciousFlags,
      });
    }

    return session;
  }

  /**
   * Holt alle Sessions mit optionalen Filtern
   */
  async getSessions(filter: SessionFilterDto): Promise<SessionWithUser[]> {
    const where: Prisma.SessionWhereInput = {};

    if (filter.userId) where.userId = filter.userId;
    if (filter.isOnline !== undefined) where.isOnline = filter.isOnline;
    if (filter.isRevoked !== undefined) where.isRevoked = filter.isRevoked;
    if (filter.minRiskScore !== undefined) where.riskScore = { gte: filter.minRiskScore };
    if (filter.maxRiskScore !== undefined) {
      where.riskScore = { ...(where.riskScore as any), lte: filter.maxRiskScore };
    }
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
    }
    if (filter.deviceType) where.deviceType = filter.deviceType;
    if (filter.location) where.location = { contains: filter.location };
    if (filter.suspiciousFlags?.length) {
      where.suspiciousFlags = { hasSome: filter.suspiciousFlags };
    }

    return this.prisma.session.findMany({
      where,
      include: { user: true },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  /**
   * Holt eine spezifische Session mit Details
   */
  async getSessionDetails(sessionId: string): Promise<SessionWithDetails> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: true,
        activities: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
      },
    });

    if (!session) {
      throw new SessionNotFoundException(sessionId);
    }

    return session;
  }

  /**
   * Trackt eine Session-Aktivität
   */
  async trackActivity(
    sessionId: string,
    activity: CreateSessionActivityDto,
    ipAddress?: string,
  ): Promise<SessionActivity> {
    // Update session activity
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: new Date(),
        activityCount: { increment: 1 },
      },
    });

    // Create activity record
    const sessionActivity = await this.prisma.sessionActivity.create({
      data: {
        sessionId,
        ...activity,
        ipAddress,
      },
    });

    // Emit activity event
    this.eventEmitter.emit(SESSION_EVENTS.SESSION_ACTIVITY, {
      sessionId,
      activity: sessionActivity,
    });

    return sessionActivity;
  }

  /**
   * Aktualisiert den Session-Heartbeat
   */
  async updateHeartbeat(sessionId: string): Promise<void> {
    const session = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastHeartbeat: new Date(),
        isOnline: true,
      },
      include: { user: true },
    });

    // Update cache
    this.sessionCache.set(session.id, session);

    this.eventEmitter.emit(SESSION_EVENTS.SESSION_HEARTBEAT, session);
  }

  /**
   * Markiert inaktive Sessions als offline
   */
  async markInactiveSessions(): Promise<number> {
    const heartbeatTimeout = this.configService.get<number>('SESSION_HEARTBEAT_TIMEOUT', 60000); // 1 minute
    const threshold = new Date(Date.now() - heartbeatTimeout);

    const result = await this.prisma.session.updateMany({
      where: {
        isOnline: true,
        lastHeartbeat: { lt: threshold },
        isRevoked: false,
      },
      data: {
        isOnline: false,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} sessions as offline`);
    }

    return result.count;
  }

  /**
   * Berechnet Session-Statistiken
   */
  async getSessionStatistics(userId?: string): Promise<SessionStatisticsDto> {
    const where: Prisma.SessionWhereInput = userId ? { userId } : {};

    const [
      totalSessions,
      activeSessions,
      revokedSessions,
      highRiskSessions,
      sessions,
      recentActivities,
    ] = await Promise.all([
      this.prisma.session.count({ where }),
      this.prisma.session.count({ where: { ...where, isOnline: true, isRevoked: false } }),
      this.prisma.session.count({ where: { ...where, isRevoked: true } }),
      this.prisma.session.count({
        where: { ...where, riskScore: { gte: RISK_SCORE_THRESHOLDS.HIGH } },
      }),
      this.prisma.session.findMany({
        where,
        select: { deviceType: true, location: true, browser: true, os: true },
      }),
      this.prisma.sessionActivity.findMany({
        where: userId ? { session: { userId } } : {},
        orderBy: { timestamp: 'desc' },
        take: 20,
        include: { session: { include: { user: true } } },
      }),
    ]);

    // Calculate distributions
    const deviceTypeDistribution = this.calculateDistribution(sessions, 'deviceType');
    const locationDistribution = this.calculateDistribution(sessions, 'location');
    const browserDistribution = this.calculateDistribution(sessions, 'browser');
    const osDistribution = this.calculateDistribution(sessions, 'os');

    return {
      totalSessions,
      activeSessions,
      revokedSessions,
      highRiskSessions,
      deviceTypeDistribution,
      locationDistribution,
      browserDistribution,
      osDistribution,
      recentActivities: recentActivities.map(this.mapSessionActivity),
    };
  }

  /**
   * Revoziert eine Session
   */
  async revokeSession(sessionId: string, reason: string): Promise<void> {
    const session = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
        isOnline: false,
      },
      include: { user: true },
    });

    // Remove from cache
    this.sessionCache.delete(sessionId);

    // Emit termination event
    this.eventEmitter.emit(SESSION_EVENTS.SESSION_TERMINATED, {
      session,
      reason,
    });

    this.logger.log(`Session ${sessionId} revoked: ${reason}`);
  }

  /**
   * Revoziert alle Sessions eines Benutzers
   */
  async revokeUserSessions(userId: string, reason: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
        isOnline: false,
      },
    });

    // Clear user sessions from cache
    for (const [id, session] of this.sessionCache.entries()) {
      if (session.user.id === userId) {
        this.sessionCache.delete(id);
      }
    }

    this.logger.log(`Revoked ${result.count} sessions for user ${userId}: ${reason}`);
    return result.count;
  }

  /**
   * Bewertet Session-Risikofaktoren
   */
  private async assessSessionRisk(
    sessionId: string,
    ipAddress: string,
    deviceInfo: DeviceInfo,
    location: LocationInfo | null,
  ): Promise<SessionRiskFactors> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      throw new SessionNotFoundException(sessionId);
    }

    // Get user's session history
    const userSessions = await this.prisma.session.findMany({
      where: {
        userId: session.userId,
        id: { not: sessionId },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const factors: SessionRiskFactors = {
      newLocation: false,
      newDevice: false,
      unusualTime: false,
      rapidLocationChange: false,
      suspiciousUserAgent: false,
      highFailedLoginCount: false,
      concurrentSessionLimit: false,
    };

    // Check for new location
    if (location && userSessions.length > 0) {
      const knownLocations = userSessions.map((s) => s.location).filter(Boolean);
      factors.newLocation = !knownLocations.includes(`${location.city}, ${location.country}`);
    }

    // Check for new device
    const deviceSignature = `${deviceInfo.type}-${deviceInfo.browser}-${deviceInfo.os}`;
    const knownDevices = userSessions
      .map((s) => `${s.deviceType}-${s.browser}-${s.os}`)
      .filter(Boolean);
    factors.newDevice = !knownDevices.includes(deviceSignature);

    // Check for unusual login time
    const hour = new Date().getHours();
    factors.unusualTime = hour < 6 || hour > 23;

    // Check for rapid location change
    if (location && userSessions.length > 0) {
      const lastSession = userSessions[0];
      if (lastSession.location && lastSession.lastActivityAt) {
        const timeDiff = Date.now() - lastSession.lastActivityAt.getTime();
        const locationChanged = lastSession.location !== `${location.city}, ${location.country}`;
        factors.rapidLocationChange = locationChanged && timeDiff < 3600000; // 1 hour
      }
    }

    // Check for suspicious user agent
    factors.suspiciousUserAgent = this.isSuspiciousUserAgent(deviceInfo);

    // Check failed login count
    factors.highFailedLoginCount = session.user.failedLoginCount > 3;

    // Check concurrent session limit
    const activeSessions = await this.prisma.session.count({
      where: {
        userId: session.userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });
    factors.concurrentSessionLimit = activeSessions > 5;

    return factors;
  }

  /**
   * Berechnet den Risiko-Score basierend auf Faktoren
   */
  private calculateRiskScore(factors: SessionRiskFactors): number {
    let score = 0;

    if (factors.newLocation) score += 20;
    if (factors.newDevice) score += 15;
    if (factors.unusualTime) score += 10;
    if (factors.rapidLocationChange) score += 30;
    if (factors.suspiciousUserAgent) score += 25;
    if (factors.highFailedLoginCount) score += 20;
    if (factors.concurrentSessionLimit) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Konvertiert Risikofaktoren in Suspicious Flags
   */
  private getSuspiciousFlags(factors: SessionRiskFactors): SuspiciousFlag[] {
    const flags: SuspiciousFlag[] = [];

    if (factors.newLocation) flags.push(SUSPICIOUS_FLAGS.NEW_LOCATION);
    if (factors.newDevice) flags.push(SUSPICIOUS_FLAGS.NEW_DEVICE);
    if (factors.unusualTime) flags.push(SUSPICIOUS_FLAGS.UNUSUAL_TIME);
    if (factors.rapidLocationChange) flags.push(SUSPICIOUS_FLAGS.RAPID_LOCATION_CHANGE);
    if (factors.suspiciousUserAgent) flags.push(SUSPICIOUS_FLAGS.SUSPICIOUS_USER_AGENT);
    if (factors.highFailedLoginCount) flags.push(SUSPICIOUS_FLAGS.HIGH_FAILED_LOGIN_COUNT);
    if (factors.concurrentSessionLimit) flags.push(SUSPICIOUS_FLAGS.CONCURRENT_SESSION_LIMIT);

    return flags;
  }

  /**
   * Parst User-Agent String
   */
  private parseUserAgent(userAgent: string): DeviceInfo {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    let deviceType: string = DeviceType.UNKNOWN;
    if (result.device.type) {
      deviceType = result.device.type.toLowerCase();
    } else if (result.os.name?.includes('Android') || result.os.name?.includes('iOS')) {
      deviceType = DeviceType.MOBILE;
    } else {
      deviceType = DeviceType.DESKTOP;
    }

    return {
      type: deviceType,
      browser: result.browser.name || 'Unknown',
      browserVersion: result.browser.version || 'Unknown',
      os: result.os.name || 'Unknown',
      osVersion: result.os.version || 'Unknown',
    };
  }

  /**
   * Holt Location-Informationen von IP (Mock-Implementierung)
   */
  private async getLocationFromIp(ipAddress: string): Promise<LocationInfo | null> {
    // Check cache first
    if (this.locationCache.has(ipAddress)) {
      return this.locationCache.get(ipAddress)!;
    }

    // Mock implementation - in production, use a real IP geolocation service
    const mockLocations: LocationInfo[] = [
      { city: 'Berlin', country: 'Germany', region: 'Berlin', timezone: 'Europe/Berlin' },
      { city: 'Munich', country: 'Germany', region: 'Bavaria', timezone: 'Europe/Berlin' },
      { city: 'Hamburg', country: 'Germany', region: 'Hamburg', timezone: 'Europe/Berlin' },
      { city: 'Frankfurt', country: 'Germany', region: 'Hesse', timezone: 'Europe/Berlin' },
    ];

    const location = mockLocations[Math.floor(Math.random() * mockLocations.length)];
    this.locationCache.set(ipAddress, location);

    return location;
  }

  /**
   * Prüft ob User-Agent verdächtig ist
   */
  private isSuspiciousUserAgent(deviceInfo: DeviceInfo): boolean {
    const suspiciousPatterns = [
      'bot',
      'crawler',
      'spider',
      'scraper',
      'curl',
      'wget',
      'python',
      'java',
    ];

    const userAgentLower = `${deviceInfo.browser} ${deviceInfo.os}`.toLowerCase();
    return suspiciousPatterns.some((pattern) => userAgentLower.includes(pattern));
  }

  /**
   * Berechnet Verteilung für Statistiken
   */
  private calculateDistribution(items: any[], field: string): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const item of items) {
      const value = item[field] || 'Unknown';
      distribution[value] = (distribution[value] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Mappt SessionActivity zu DTO
   */
  private mapSessionActivity(
    activity: SessionActivity & { session: SessionWithUser },
  ): SessionActivityDto {
    return {
      id: activity.id,
      sessionId: activity.sessionId,
      timestamp: activity.timestamp,
      activityType: activity.activityType as ActivityType,
      resource: activity.resource,
      method: activity.method,
      statusCode: activity.statusCode,
      duration: activity.duration,
      ipAddress: activity.ipAddress,
      metadata: activity.metadata as Record<string, any>,
    };
  }
}
