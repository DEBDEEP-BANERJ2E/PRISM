import { Request, Response, NextFunction } from 'express';
import { AuditLogger, AuditLogEntry } from '../../../web-dashboard/src/utils/security';

interface AuditMiddlewareOptions {
  includeBody?: boolean;
  includeQuery?: boolean;
  includeHeaders?: boolean;
  excludeRoutes?: string[];
  sensitiveFields?: string[];
}

const DEFAULT_OPTIONS: AuditMiddlewareOptions = {
  includeBody: true,
  includeQuery: true,
  includeHeaders: false,
  excludeRoutes: ['/health', '/metrics'],
  sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization']
};

class ExpressAuditLogger {
  private logger: AuditLogger;
  private options: AuditMiddlewareOptions;

  constructor(options: AuditMiddlewareOptions = {}) {
    this.logger = new AuditLogger();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip excluded routes
      if (this.options.excludeRoutes?.some(route => req.path.includes(route))) {
        return next();
      }

      const startTime = Date.now();
      const originalSend = res.send;

      // Capture request details
      const requestDetails = {
        method: req.method,
        path: req.path,
        query: this.options.includeQuery ? this.sanitizeData(req.query) : undefined,
        body: this.options.includeBody ? this.sanitizeData(req.body) : undefined,
        headers: this.options.includeHeaders ? this.sanitizeData(req.headers) : undefined,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer')
      };

      // Override res.send to capture response
      res.send = function(body) {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;

        // Log the audit entry
        this.logger.log({
          userId: req.user?.id,
          action: `${req.method} ${req.path}`,
          resource: this.getResourceFromPath(req.path),
          details: {
            request: requestDetails,
            response: {
              statusCode: res.statusCode,
              duration,
              size: body ? Buffer.byteLength(body) : 0
            }
          },
          ipAddress: this.getClientIP(req),
          userAgent: req.get('User-Agent'),
          success,
          error: success ? undefined : this.extractErrorFromResponse(body)
        });

        return originalSend.call(this, body);
      }.bind(this);

      next();
    };
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const field of this.options.sensitiveFields || []) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  private getResourceFromPath(path: string): string {
    // Extract resource type from API path
    const pathParts = path.split('/').filter(Boolean);
    
    if (pathParts.length >= 2 && pathParts[0] === 'api') {
      return pathParts[1]; // e.g., /api/data -> 'data'
    }
    
    return pathParts[0] || 'unknown';
  }

  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private extractErrorFromResponse(body: any): string | undefined {
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        return parsed.error || parsed.message;
      } catch {
        return body.substring(0, 200); // Truncate long error messages
      }
    }
    
    if (typeof body === 'object' && body !== null) {
      return body.error || body.message;
    }
    
    return undefined;
  }

  getLogs(filter?: Partial<AuditLogEntry>) {
    return this.logger.getLogs(filter);
  }
}

// Create audit middleware instances for different purposes
export const createAuditLogger = (options?: AuditMiddlewareOptions) => {
  return new ExpressAuditLogger(options).middleware();
};

// General audit logging for all API requests
export const generalAuditLog = createAuditLogger({
  includeBody: false, // Don't log request bodies by default for performance
  includeQuery: true,
  includeHeaders: false
});

// Detailed audit logging for sensitive operations
export const detailedAuditLog = createAuditLogger({
  includeBody: true,
  includeQuery: true,
  includeHeaders: true,
  sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization', 'cookie']
});

// Security-focused audit logging
export const securityAuditLog = createAuditLogger({
  includeBody: true,
  includeQuery: true,
  includeHeaders: true,
  excludeRoutes: [], // Log everything for security
  sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'session']
});

// Performance audit logging (minimal data)
export const performanceAuditLog = createAuditLogger({
  includeBody: false,
  includeQuery: false,
  includeHeaders: false,
  excludeRoutes: ['/health', '/metrics', '/status']
});

export default ExpressAuditLogger;