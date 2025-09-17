import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { config } from '../config';
import logger from '../utils/logger';

interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  mineSite?: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const redisClient = createClient({ url: config.redis.url });
redisClient.connect().catch(err => logger.error('Redis connection error:', err));

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    
    // Check if user session is still active
    const sessionKey = `session:${decoded.userId}`;
    const sessionData = await redisClient.get(sessionKey);
    
    if (!sessionData) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Attach user info to request
    req.user = decoded;
    
    // Update session activity
    await redisClient.setEx(sessionKey, 3600, JSON.stringify({
      userId: decoded.userId,
      lastActivity: new Date().toISOString()
    }));
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    logger.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

export const requireMineSite = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.mineSite) {
    return res.status(403).json({ error: 'Mine site access required' });
  }
  
  next();
};