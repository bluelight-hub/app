# Story: ETB Error Handling & Monitoring

## Story ID
etb-1.14

## Titel
Robustes Error Handling und Monitoring für ETB

## Beschreibung
Als **DevOps Engineer** möchte ich umfassendes Error Handling und Monitoring implementieren, damit das ETB-System zuverlässig läuft und Probleme schnell erkannt werden.

## Akzeptanzkriterien
- [ ] Globaler Error Boundary für React implementiert
- [ ] Backend Error Handler mit strukturierten Logs
- [ ] Retry-Mechanismen für API-Calls
- [ ] Circuit Breaker für externe Services
- [ ] Health Check Endpoints erweitert
- [ ] Metriken-Collection implementiert
- [ ] Structured Logging eingeführt
- [ ] Error-Tracking mit Sentry/Alternative

## Technical Implementation

### 1. Frontend Error Boundary
```typescript
// packages/frontend/src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react'
import { captureException } from '@sentry/react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Send to monitoring
    captureException(error, {
      contexts: {
        react: { componentStack: errorInfo.componentStack }
      }
    })
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.retry)
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Etwas ist schiefgelaufen
            </h1>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten'}
            </p>
            <button
              onClick={this.retry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

### 2. Backend Error Handling & Logging
```typescript
// packages/backend/src/common/filters/all-exceptions.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Request, Response } from 'express'
import { LoggerService } from '../services/logger.service'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exception instanceof Error ? exception.message : 'Unknown error',
      correlationId: request.headers['x-correlation-id'] || generateId(),
    }

    // Structured logging
    this.logger.error({
      ...errorResponse,
      stack: exception instanceof Error ? exception.stack : undefined,
      userId: request.user?.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    // Send to monitoring
    if (status >= 500) {
      this.sendToMonitoring(exception, request)
    }

    response.status(status).json(errorResponse)
  }

  private sendToMonitoring(exception: unknown, request: Request) {
    // Sentry, DataDog, etc.
  }
}
```

### 3. Circuit Breaker Implementation
```typescript
// packages/backend/src/common/decorators/circuit-breaker.decorator.ts
import CircuitBreaker from 'opossum'

const breakers = new Map<string, CircuitBreaker>()

export function WithCircuitBreaker(options?: CircuitBreaker.Options) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const breakerKey = `${target.constructor.name}.${propertyKey}`

    descriptor.value = async function (...args: any[]) {
      let breaker = breakers.get(breakerKey)
      
      if (!breaker) {
        breaker = new CircuitBreaker(originalMethod.bind(this), {
          timeout: 3000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000,
          ...options,
        })

        breaker.on('open', () => {
          console.warn(`Circuit breaker opened for ${breakerKey}`)
        })

        breaker.on('halfOpen', () => {
          console.info(`Circuit breaker half-open for ${breakerKey}`)
        })

        breakers.set(breakerKey, breaker)
      }

      return breaker.fire(...args)
    }

    return descriptor
  }
}

// Usage in service
export class ExternalApiService {
  @WithCircuitBreaker({ timeout: 5000 })
  async callExternalApi(data: any) {
    // API call that might fail
  }
}
```

### 4. Health Checks & Metrics
```typescript
// packages/backend/src/health/etb-health.indicator.ts
import { Injectable } from '@nestjs/common'
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus'
import { PrometheusService } from '../monitoring/prometheus.service'

@Injectable()
export class EtbHealthIndicator extends HealthIndicator {
  private readonly metrics = {
    etbEntryCreationRate: new Counter({
      name: 'etb_entry_creation_rate',
      help: 'Rate of ETB entry creation',
    }),
    etbResponseTime: new Histogram({
      name: 'etb_response_time_ms',
      help: 'ETB API response time',
      buckets: [10, 50, 100, 500, 1000],
    }),
    activeEtbSessions: new Gauge({
      name: 'active_etb_sessions',
      help: 'Number of active ETB sessions',
    }),
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check ETB-specific health
      const dbHealthy = await this.checkDatabase()
      const cacheHealthy = await this.checkCache()
      const queueHealthy = await this.checkQueues()

      const isHealthy = dbHealthy && cacheHealthy && queueHealthy

      return this.getStatus(key, isHealthy, {
        database: dbHealthy,
        cache: cacheHealthy,
        queues: queueHealthy,
        metrics: {
          entriesPerMinute: this.metrics.etbEntryCreationRate.get(),
          avgResponseTime: this.metrics.etbResponseTime.get(),
          activeSessions: this.metrics.activeEtbSessions.get(),
        },
      })
    } catch (error) {
      return this.getStatus(key, false, { error: error.message })
    }
  }
}
```

### 5. Structured Logging Configuration
```typescript
// packages/backend/src/common/services/logger.service.ts
import winston from 'winston'
import { ElasticsearchTransport } from 'winston-elasticsearch'

export class LoggerService {
  private logger: winston.Logger

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: 'etb-service',
        environment: process.env.NODE_ENV,
      },
      transports: [
        // Console for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        // File for production
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
        }),
        // Elasticsearch for centralized logging
        new ElasticsearchTransport({
          level: 'info',
          clientOpts: {
            node: process.env.ELASTICSEARCH_URL,
          },
          index: 'etb-logs',
        }),
      ],
    })
  }

  log(level: string, message: string, meta?: any) {
    this.logger.log(level, message, meta)
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta)
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta)
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta)
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta)
  }
}
```

## Dependencies
- @sentry/react für Frontend Error Tracking
- @sentry/node für Backend Error Tracking
- opossum für Circuit Breaker
- winston für Structured Logging
- @nestjs/terminus für Health Checks
- prom-client für Prometheus Metrics

## Aufwandsschätzung
- Backend: 8 Story Points
- Frontend: 5 Story Points
- DevOps Setup: 5 Story Points

## Testing
- Unit Tests für Error Handlers
- Integration Tests für Circuit Breaker
- Load Tests für Retry-Mechanismen
- Chaos Engineering Tests