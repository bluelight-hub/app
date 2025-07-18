import {
  RuleContext,
  RuleEvaluationResult,
  PatternRule,
  ThreatSeverity,
  RuleStatus,
  ConditionType,
} from '../rule.interface';

/**
 * Regel zur Erkennung von Session Hijacking Versuchen
 *
 * Erkennt Anzeichen für Session-Übernahme:
 * - Plötzliche IP-Änderungen innerhalb einer Session
 * - User-Agent-Änderungen
 * - Ungewöhnliche Session-Aktivitätsmuster
 */
export class SessionHijackingRule implements PatternRule {
  id: string;
  name: string;
  description: string;
  version: string;
  status: RuleStatus;
  severity: ThreatSeverity;
  conditionType: ConditionType;
  config: {
    patterns: string[];
    matchType: 'any' | 'all';
    lookbackMinutes: number;
    checkIpChange: boolean;
    checkUserAgentChange: boolean;
    checkGeoJump: boolean;
    maxSessionIpChanges: number;
  };
  tags: string[];

  constructor(data: Partial<SessionHijackingRule>) {
    this.id = data.id || 'session-hijacking-default';
    this.name = data.name || 'Session Hijacking Detection';
    this.description = data.description || 'Detects potential session hijacking attempts';
    this.version = data.version || '1.0.0';
    this.status = data.status || RuleStatus.ACTIVE;
    this.severity = data.severity || ThreatSeverity.CRITICAL;
    this.conditionType = ConditionType.PATTERN;
    this.tags = data.tags || ['session-hijacking', 'session-security', 'authentication'];

    this.config = {
      patterns: ['ip-change', 'user-agent-change', 'geo-jump'],
      matchType: 'any',
      lookbackMinutes: 60,
      checkIpChange: true,
      checkUserAgentChange: true,
      checkGeoJump: true,
      maxSessionIpChanges: 2,
      ...data.config,
    };
  }

  async evaluate(context: RuleContext): Promise<RuleEvaluationResult> {
    // This rule requires session context
    const sessionId = (context.metadata as any)?.sessionId;
    if (!sessionId || !context.recentEvents) {
      return { matched: false };
    }

    const cutoffTime = new Date(Date.now() - this.config.lookbackMinutes * 60 * 1000);

    // Get all activities for this session
    const sessionEvents = context.recentEvents
      .filter(
        (event) =>
          (event.metadata as any)?.sessionId === sessionId && event.timestamp >= cutoffTime,
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (sessionEvents.length < 2) {
      return { matched: false };
    }

    // Check for IP changes
    if (this.config.checkIpChange) {
      const ipChanges = this.detectIpChanges(sessionEvents);
      if (ipChanges.count >= this.config.maxSessionIpChanges) {
        return {
          matched: true,
          severity: ThreatSeverity.CRITICAL,
          score: 95,
          reason: `Session hijacking suspected: ${ipChanges.count} IP changes detected in session`,
          evidence: {
            sessionId,
            ipChanges: ipChanges.changes,
            totalChanges: ipChanges.count,
          },
          suggestedActions: ['INVALIDATE_SESSIONS', 'REQUIRE_2FA', 'BLOCK_IP'],
        };
      }
    }

    // Check for User-Agent changes
    if (this.config.checkUserAgentChange) {
      const uaChange = this.detectUserAgentChange(sessionEvents);
      if (uaChange.changed) {
        return {
          matched: true,
          severity: ThreatSeverity.HIGH,
          score: 90,
          reason: `Session hijacking suspected: User-Agent changed during session`,
          evidence: {
            sessionId,
            originalUserAgent: uaChange.original,
            newUserAgent: uaChange.new,
          },
          suggestedActions: ['INVALIDATE_SESSIONS', 'REQUIRE_2FA'],
        };
      }
    }

    // Check for geographic jumps
    if (this.config.checkGeoJump) {
      const geoJump = this.detectGeoJump(sessionEvents);
      if (geoJump.suspicious) {
        return {
          matched: true,
          severity: ThreatSeverity.HIGH,
          score: 85,
          reason: `Session hijacking suspected: Impossible geographic jump detected`,
          evidence: {
            sessionId,
            locations: geoJump.locations,
            distance: geoJump.distance,
            timeMinutes: geoJump.timeMinutes,
          },
          suggestedActions: ['INVALIDATE_SESSIONS', 'REQUIRE_2FA'],
        };
      }
    }

    return { matched: false };
  }

  private detectIpChanges(events: any[]): { count: number; changes: string[] } {
    const ips = new Set<string>();
    const changes: string[] = [];
    let lastIp: string | null = null;

    events.forEach((event) => {
      const ip = event.ipAddress;
      if (ip) {
        ips.add(ip);
        if (lastIp && lastIp !== ip) {
          changes.push(`${lastIp} → ${ip}`);
        }
        lastIp = ip;
      }
    });

    return { count: ips.size - 1, changes };
  }

  private detectUserAgentChange(events: any[]): {
    changed: boolean;
    original?: string;
    new?: string;
  } {
    const userAgents = new Set<string>();
    let firstUA: string | null = null;
    let lastUA: string | null = null;

    events.forEach((event) => {
      const ua = event.userAgent || (event.metadata as any)?.userAgent;
      if (ua) {
        if (!firstUA) firstUA = ua;
        lastUA = ua;
        userAgents.add(ua);
      }
    });

    if (userAgents.size > 1) {
      return { changed: true, original: firstUA!, new: lastUA! };
    }

    return { changed: false };
  }

  private detectGeoJump(events: any[]): {
    suspicious: boolean;
    locations?: any[];
    distance?: number;
    timeMinutes?: number;
  } {
    // This would integrate with GeoIP service in real implementation
    // For now, we'll check if country changes within the session
    const countries = new Set<string>();
    const locations: any[] = [];

    events.forEach((event) => {
      const country = (event.metadata as any)?.country;
      if (country) {
        countries.add(country);
        locations.push({
          country,
          timestamp: event.timestamp,
          ip: event.ipAddress,
        });
      }
    });

    // Simple check: multiple countries in one session is suspicious
    if (countries.size > 1) {
      const firstEvent = events[0];
      const lastEvent = events[events.length - 1];
      const timeMinutes =
        (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / (1000 * 60);

      return {
        suspicious: true,
        locations,
        distance: 1000, // Placeholder
        timeMinutes,
      };
    }

    return { suspicious: false };
  }

  validate(): boolean {
    return this.config.lookbackMinutes > 0 && this.config.maxSessionIpChanges > 0;
  }

  getDescription(): string {
    return `Detects session hijacking through IP changes, User-Agent changes, and geographic anomalies`;
  }
}
