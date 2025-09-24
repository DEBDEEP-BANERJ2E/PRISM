import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '../../../web-dashboard/src/utils/security';

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const DEFAULT_OPTIONS: Required<RateLimitOptions> = {
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  message: 'Too many requests, please try again later',
  keyGenerator: (req: Request) => req.ip || 'unknown',
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

class ExpressRateLimiter {
  private limiter: RateLimiter;
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.limiter = new RateLimiter(this.options.maxRequests, this.options.windowMs);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.options.keyGenerator(req);
      
      if (!this.limiter.isAllowed(key)) {
        const resetTime = this.limiter.getResetTime(key);
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        
        res.set({
          'X-RateLimit-Limit': this.options.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
          'Retry-After': retryAfter.toString()
        });
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: this.options.message,
          retryAfter
        });
      }

      const remaining = this.limiter.getRemainingRequests(key);
      const resetTime = this.limiter.getResetTime(key);
      
      res.set({
        'X-RateLimit-Limit': this.options.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
      });

      // Track response status for conditional limiting
      const originalSend = res.send;
      res.send = function(body) {
        const statusCode = res.statusCode;
        
        // If we should skip successful/failed requests, remove from limiter
        if (
          (statusCode < 400 && this.options.skipSuccessfulRequests) ||
          (statusCode >= 400 && this.options.skipFailedRequests)
        ) {
          // Note: This is a simplified approach. In production, you'd want
          // more sophisticated tracking to handle this properly.
        }
        
        return originalSend.call(this, body);
      }.bind(this);

      next();
    };
  }
}

// Predefined rate limiters for different endpoints
export const createRateLimiter = (options?: RateLimitOptions) => {
  return new ExpressRateLimiter(options).middleware();
};

// Strict rate limiter for authentication endpoints
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req) => `auth:${req.ip}:${req.body?.email || 'unknown'}`
});

// Moderate rate limiter for API endpoints
export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: 'API rate limit exceeded, please slow down'
});

// Strict rate limiter for file uploads
export const uploadRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 uploads per minute
  message: 'Upload rate limit exceeded, please wait before uploading more files'
});

// Very strict rate limiter for expensive operations (model training)
export const trainingRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 training jobs per hour
  message: 'Training rate limit exceeded, please wait before starting more training jobs',
  keyGenerator: (req) => `training:${req.ip}:${req.user?.id || 'anonymous'}`
});

// Moderate rate limiter for report generation
export const reportRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // 10 reports per 5 minutes
  message: 'Report generation rate limit exceeded, please wait before generating more reports'
});

// Rate limiter for scenario execution
export const scenarioRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 scenarios per minute
  message: 'Scenario execution rate limit exceeded, please slow down'
});

export default ExpressRateLimiter;