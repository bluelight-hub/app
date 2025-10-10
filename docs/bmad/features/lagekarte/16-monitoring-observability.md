# 16. Monitoring & Observability

## 16.1 Monitoring Stack

**Frontend Monitoring:**
- **Performance Monitoring:** Web Vitals API (nativ im Browser) für Core Web Vitals
  - LCP (Largest Contentful Paint): Map-Rendering-Zeit
  - FID (First Input Delay): POI-Click-Responsiveness
  - CLS (Cumulative Layout Shift): Map-Container-Stabilität
- **Error Tracking:** Browser Console + Optional: Sentry (Frontend SDK)
- **Custom Metrics:** Performance Observer API für Lagekarte-spezifische Metriken

**Backend Monitoring:**
- **Application Monitoring:** NestJS Built-in Logger (Pino für strukturiertes Logging)
- **API Performance:** Custom Interceptor für Response-Time-Tracking
- **Error Tracking:** Optional: Sentry (NestJS Integration) oder Self-Hosted Sentry
- **Infrastructure:** Docker Stats API (Container-Metrics: CPU, Memory)

**Database Monitoring:**
- **Query Performance:** Prisma Query Events (`prisma.$on('query', ...)`)
- **Connection Pool:** PostgreSQL `pg_stat_database` Views
- **Slow Query Log:** PostgreSQL `log_min_duration_statement = 1000` (>1s)

**External API Monitoring:**
- **Nominatim Geocoding:** Rate-Limit-Tracking (Requests/Sekunde)
- **OSM Tile-Server:** Tile-Load-Time, HTTP-Status-Codes (429, 503)

---

## 16.2 Key Metrics (Lagekarte-spezifisch)

### Frontend Metrics

**Performance-Metriken:**
```typescript
// Custom Performance Marks
performance.mark('lagekarte-load-start');
performance.mark('lagekarte-load-end');
performance.measure('lagekarte-load-time', 'lagekarte-load-start', 'lagekarte-load-end');

// Key Metrics to track:
{
  "map_initial_load_time": "Time from route navigation to map visible (Target: <2s)",
  "poi_marker_render_time": "Time to render all POI markers (Target: <500ms)",
  "tile_load_time": "Average tile-loading duration per tile (Target: <200ms)",
  "poi_count": "Total number of POIs on current map (Target: <1000 for optimal perf)",
  "offline_cache_hit_rate": "% of tiles loaded from IndexedDB vs. network",
  "drawing_sync_latency": "Time from drawing completion to backend save (Target: <2s debounce)"
}
```

**User-Interaction-Metriken:**
```typescript
{
  "poi_creation_count": "Number of POIs created per session",
  "geocoding_success_rate": "% of successful geocoding requests",
  "offline_download_count": "Number of offline-region downloads",
  "screenshot_export_count": "ETB-Screenshot-Exports per day"
}
```

**Error-Metriken:**
```typescript
{
  "tile_load_errors": "Failed tile-loads (network errors, 404s)",
  "geocoding_errors": "Nominatim timeouts/rate-limits",
  "poi_save_errors": "Failed POI-creation requests (4xx, 5xx)",
  "indexeddb_quota_exceeded": "Offline-Download failures due to storage quota"
}
```

### Backend Metrics

**API-Performance:**
```typescript
{
  "api_response_time_p50": "Median response time for /lagekarte endpoints (Target: <200ms)",
  "api_response_time_p95": "95th percentile response time (Target: <500ms)",
  "api_response_time_p99": "99th percentile response time (Target: <1s)",
  "api_request_rate": "Requests per second (per endpoint)",
  "api_error_rate": "% of 4xx/5xx responses"
}
```

**Service-Metriken:**
```typescript
{
  "geocoding_cache_hit_rate": "% of geocoding requests served from cache (Target: >80%)",
  "geocoding_api_latency": "Nominatim API response time (External)",
  "poi_creation_latency": "Time from request to DB commit (Target: <500ms)",
  "file_upload_size": "Screenshot file size distribution (Target: <2MB)",
  "state_sync_frequency": "Lagekarte-State updates per minute"
}
```

**Database-Metriken:**
```typescript
{
  "db_query_duration_avg": "Average query duration (Target: <50ms)",
  "db_slow_queries_count": "Queries >1s (Target: 0)",
  "db_connection_pool_utilization": "Active connections / Pool size (Target: <80%)",
  "lagekarte_table_size": "Total rows in Lagekarte table",
  "poi_table_size": "Total rows in LagekartePoi table"
}
```

---

## 16.3 Logging Strategy

### Frontend Logging

**Log-Levels:**
- `DEBUG`: Development-only (Leaflet-Ereignisse, State-Changes)
- `INFO`: User-Actions (POI erstellt, Offline-Download gestartet)
- `WARN`: Recoverable Errors (Tile-Load-Fehler, Geocoding-Timeout)
- `ERROR`: Critical Failures (IndexedDB-Quota, API-5xx-Errors)

**Beispiel-Implementierung:**
```typescript
// utils/logger.ts
export const logger = {
  debug: (message: string, context?: object) => {
    if (import.meta.env.DEV) {
      console.debug(`[LAGEKARTE] ${message}`, context);
    }
  },
  info: (message: string, context?: object) => {
    console.info(`[LAGEKARTE] ${message}`, context);
    // Optional: Send to analytics
  },
  warn: (message: string, error?: Error) => {
    console.warn(`[LAGEKARTE] ${message}`, error);
    // Optional: Send to Sentry (warning-level)
  },
  error: (message: string, error: Error) => {
    console.error(`[LAGEKARTE] ${message}`, error);
    // Optional: Send to Sentry (error-level)
  }
};

// Usage:
logger.info('POI created', { poiId: '123', type: 'EINSATZORT' });
logger.error('Geocoding failed', new Error('Nominatim timeout'));
```

### Backend Logging (NestJS + Pino)

**Strukturiertes Logging:**
```typescript
// main.ts - Pino Logger Setup
import { Logger } from 'nestjs-pino';

app.useLogger(app.get(Logger));

// lagekarte.service.ts
@Injectable()
export class LagekarteService {
  private readonly logger = new Logger(LagekarteService.name);

  async createPoi(einsatzId: string, dto: CreatePoiDto) {
    this.logger.log({
      msg: 'Creating POI',
      einsatzId,
      poiType: dto.type,
      hasAddress: !!dto.adresse
    });

    try {
      // ... POI-Erstellung
      this.logger.log({ msg: 'POI created successfully', poiId: poi.id });
      return poi;
    } catch (error) {
      this.logger.error({
        msg: 'POI creation failed',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
```

**Log-Aggregation (Production):**
- **Option 1 (Self-Hosted):** Loki + Grafana (Docker-Container)
- **Option 2 (Managed):** Sentry (Error-Tracking + Performance)
- **Aktuelle Empfehlung:** Docker JSON-Logs → Loki → Grafana (DSGVO-konform, kostenlos)

---

## 16.4 Dashboards & Alerts

### Grafana Dashboard (Monitoring-Stack)

**Panel 1: Lagekarte Performance**
- Map-Load-Time (p50, p95, p99)
- POI-Render-Time
- Tile-Load-Time (Average)

**Panel 2: API Health**
- Request Rate (Requests/Minute)
- Response Time (p50, p95, p99)
- Error Rate (4xx, 5xx)

**Panel 3: External Dependencies**
- Nominatim Response Time
- OSM Tile-Server Availability
- Geocoding Cache Hit-Rate

**Panel 4: Resource Usage**
- PostgreSQL Connection Pool
- Backend Container CPU/Memory
- IndexedDB Quota Usage (Frontend, via Custom Metric)

### Alert-Rules

**Critical Alerts (PagerDuty/Email):**
```yaml
# Prometheus Alert Rules
groups:
  - name: lagekarte_critical
    rules:
      - alert: LagekarteAPIDown
        expr: up{job="bluelight-backend"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Lagekarte Backend ist nicht erreichbar"

      - alert: HighAPIErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Lagekarte API Error-Rate >5% (5xx-Errors)"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_database_connections{database="bluelight_hub"} > 80
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL Connection Pool >80% ausgelastet"
```

**Warning Alerts (Slack/Teams):**
```yaml
      - alert: SlowGeocodingAPI
        expr: nominatim_response_time_seconds > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Nominatim Geocoding >3s Response-Time"

      - alert: HighTileLoadErrors
        expr: rate(tile_load_errors_total[10m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Viele Tile-Load-Fehler (OSM-Server-Problem?)"
```

---

## 16.5 Performance-Monitoring-Implementierung

### Custom Interceptor (Backend - Response-Time-Tracking)

```typescript
// common/interceptors/performance.interceptor.ts
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const route = req.route?.path || req.url;

        // Log to Prometheus/Grafana
        httpResponseTime.labels(req.method, route, '200').observe(duration / 1000);

        if (duration > 1000) {
          Logger.warn(`Slow API call: ${req.method} ${route} took ${duration}ms`);
        }
      })
    );
  }
}
```

### Frontend Performance-Observer

```typescript
// hooks/usePerformanceMonitoring.ts
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          // Send to analytics/Sentry
          logger.info(`Performance: ${entry.name} = ${entry.duration}ms`);

          // Optional: Send to custom backend endpoint
          if (entry.duration > 2000) {
            api.monitoring().reportSlowMetric({
              metric: entry.name,
              duration: entry.duration,
              timestamp: Date.now()
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['measure', 'navigation'] });

    return () => observer.disconnect();
  }, []);
};
```

---

## 16.6 Monitoring-Stack Deployment

**Docker Compose Integration:**
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - bluelight-network

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3030:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    networks:
      - bluelight-network

  loki:
    image: grafana/loki:latest
    volumes:
      - ./monitoring/loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    ports:
      - "3100:3100"
    networks:
      - bluelight-network

volumes:
  prometheus_data:
  grafana_data:
  loki_data:

networks:
  bluelight-network:
    external: true
```

**Prometheus Configuration:**
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'bluelight-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
```

---

## 16.7 Key Takeaways

**Self-Hosted Monitoring-Stack:**
- ✅ DSGVO-konform (keine Daten verlassen das LAN)
- ✅ Kostenlos (Open Source)
- ✅ Volle Kontrolle über Metriken und Alerts
- ⚠️ Mehr Setup-Aufwand vs. Managed Services
- ⚠️ Requires Docker + Storage für Time-Series-Data

**Critical Metrics für Lagekarte:**
- Map-Load-Time <2s (NFR1)
- POI-Render-Time <500ms (NFR1)
- Geocoding-Cache-Hit-Rate >80% (Rate-Limit-Schutz)
- API-Error-Rate <5% (Reliability-Target)

**Monitoring-First-Approach:**
- Performance-Metriken von Anfang an einbauen (nicht nachträglich)
- Custom Metrics > Generic APM (Lagekarte-spezifische Insights)
- Alerts nur für Actionable Metrics (keine "Nice-to-Know"-Alerts)

---
