import { logger } from './logger';
import { auditLogger, AuditActionType, AuditSeverity } from './audit';

/**
 * Bestimmt den Aktionstyp basierend auf der HTTP-Methode
 */
function getActionTypeFromMethod(method: string): AuditActionType {
  switch (method.toUpperCase()) {
    case 'GET':
      return AuditActionType.READ;
    case 'POST':
      return AuditActionType.CREATE;
    case 'PUT':
    case 'PATCH':
      return AuditActionType.UPDATE;
    case 'DELETE':
      return AuditActionType.DELETE;
    default:
      return AuditActionType.READ;
  }
}

/**
 * Extrahiert die Ressource aus der URL
 */
function extractResourceFromUrl(url: string): { resource: string; resourceId?: string } {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    
    // Remove 'api' prefix if present
    if (pathSegments[0] === 'api') {
      pathSegments.shift();
    }
    
    // Extract resource and potential ID
    const resource = pathSegments[0] || 'unknown';
    const resourceId = pathSegments.length > 1 && !pathSegments[1].includes('?') 
      ? pathSegments[1] 
      : undefined;
    
    return { resource, resourceId };
  } catch {
    return { resource: 'unknown' };
  }
}

/**
 * Bestimmt den Schweregrad basierend auf der Ressource und Aktion
 */
function determineSeverity(resource: string, method: string): AuditSeverity {
  const criticalResources = ['auth', 'users', 'roles', 'permissions'];
  const highSeverityMethods = ['DELETE', 'PUT', 'PATCH'];
  
  if (resource === 'auth') {
    return AuditSeverity.HIGH;
  }
  
  if (criticalResources.includes(resource) && highSeverityMethods.includes(method.toUpperCase())) {
    return AuditSeverity.HIGH;
  }
  
  if (method.toUpperCase() === 'DELETE') {
    return AuditSeverity.MEDIUM;
  }
  
  return AuditSeverity.LOW;
}

/**
 * Audit-Logging-Middleware für API-Aufrufe
 */
export const auditInterceptorMiddleware = {
  pre: async (context: { url: string; init: RequestInit }) => {
    // Log the start of the request
    const { resource, resourceId } = extractResourceFromUrl(context.url);
    const method = context.init.method || 'GET';
    
    logger.debug('API request initiated', {
      url: context.url,
      method,
      resource,
      resourceId,
    });
    
    // Store request start time for duration calculation
    (context as any).__auditStartTime = Date.now();
    (context as any).__auditResource = resource;
    (context as any).__auditResourceId = resourceId;
    
    return context;
  },

  post: async (context: { url: string; init: RequestInit; response: Response }) => {
    const { response } = context;
    const method = context.init.method || 'GET';
    const resource = (context as any).__auditResource || 'unknown';
    const resourceId = (context as any).__auditResourceId;
    const startTime = (context as any).__auditStartTime || Date.now();
    const duration = Date.now() - startTime;
    
    const actionType = getActionTypeFromMethod(method);
    const severity = determineSeverity(resource, method);
    
    // Prepare audit context
    const auditContext = {
      action: `${method.toLowerCase()}-${resource}`,
      resource,
      resourceId,
      actionType,
      severity,
      httpMethod: method,
      httpPath: new URL(context.url).pathname,
      metadata: {
        duration,
        statusCode: response.status,
        statusText: response.statusText,
      },
    };
    
    if (response.ok) {
      // Log successful request
      await auditLogger.log({
        ...auditContext,
        metadata: {
          ...auditContext.metadata,
          success: true,
        },
      });
    } else {
      // Log failed request
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      // Try to extract error message from response
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const responseClone = response.clone();
          const errorData = await responseClone.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        }
      } catch {
        // Ignore parsing errors
      }
      
      await auditLogger.logError(
        auditContext.action,
        resource,
        errorMessage,
        {
          ...auditContext,
          metadata: {
            ...auditContext.metadata,
            success: false,
          },
        }
      );
    }
    
    return context;
  },
};

/**
 * Kombiniert Auth- und Audit-Interceptoren
 */
export function combineInterceptors(...interceptors: any[]) {
  return {
    pre: async (context: any) => {
      let result = context;
      for (const interceptor of interceptors) {
        if (interceptor.pre) {
          result = await interceptor.pre(result);
        }
      }
      return result;
    },
    post: async (context: any) => {
      let result = context;
      for (const interceptor of interceptors) {
        if (interceptor.post) {
          result = await interceptor.post(result);
        }
      }
      return result;
    },
  };
}