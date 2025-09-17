import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { body, validationResult } from 'express-validator';
import { config } from '../config';
import logger from '../utils/logger';

const router = Router();
const redisClient = createClient({ url: config.redis.url });
redisClient.connect().catch(err => logger.error('Redis connection error:', err));

// Login endpoint (delegates to user-management service)
router.post('/login', 
  [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      // Forward login request to user-management service
      const response = await fetch(`${config.services.userManagement}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });
      
      if (!response.ok) {
        const error = await response.json();
        return res.status(response.status).json(error);
      }
      
      const userData = await response.json();
      
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: userData.user.userId,
          username: userData.user.username,
          role: userData.user.role,
          mineSite: userData.user.mineSite
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      
      // Store session in Redis
      const sessionKey = `session:${userData.user.userId}`;
      await redisClient.setEx(sessionKey, 86400, JSON.stringify({
        userId: userData.user.userId,
        username: userData.user.username,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      }));
      
      logger.info('User logged in', {
        userId: userData.user.userId,
        username: userData.user.username,
        role: userData.user.role
      });
      
      res.json({
        token,
        user: {
          userId: userData.user.userId,
          username: userData.user.username,
          email: userData.user.email,
          role: userData.user.role,
          mineSite: userData.user.mineSite
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Authentication service unavailable' });
    }
  }
);

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        
        // Remove session from Redis
        await redisClient.del(`session:${decoded.userId}`);
        
        // Add token to blacklist
        const tokenExpiry = decoded.exp - Math.floor(Date.now() / 1000);
        if (tokenExpiry > 0) {
          await redisClient.setEx(`blacklist:${token}`, tokenExpiry, 'true');
        }
        
        logger.info('User logged out', {
          userId: decoded.userId,
          username: decoded.username
        });
      } catch (jwtError) {
        // Token is invalid, but we still want to return success
        logger.warn('Invalid token during logout:', jwtError);
      }
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // Check if session exists
    const sessionKey = `session:${decoded.userId}`;
    const sessionData = await redisClient.get(sessionKey);
    
    if (!sessionData) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Generate new token
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        mineSite: decoded.mineSite
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    // Blacklist old token
    const tokenExpiry = decoded.exp - Math.floor(Date.now() / 1000);
    if (tokenExpiry > 0) {
      await redisClient.setEx(`blacklist:${token}`, tokenExpiry, 'true');
    }
    
    res.json({ token: newToken });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

export { router as authRouter };