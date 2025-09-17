import { Alert, AlertInput, AlertType, AlertSeverity } from '@prism/shared-models/risk';
import { logger } from '../utils/logger';
import { config } from '../config';
import Redis from 'redis';

export interface DeduplicationRule {
  rule_id: string;
  alert_type: AlertType;
  time_window_minutes: number;
  location_radius_meters?: number;
  source_id_match?: boolean;
  severity_match?: boolean;
  message_similarity_threshold?: number;
  custom_fields?: string[];
}

export interface DuplicateMatch {
  existing_alert_id: string;
  similarity_score: number;
  matching_criteria: string[];
  time_difference_minutes: number;
  location_distance_meters?: number;
}

export class DeduplicationService {
  private redisClient: Redis.RedisClientType;
  private deduplicationRules: Map<AlertType, DeduplicationRule>;
  private isConnected: boolean = false;

  constructor() {
    this.redisClient = Redis.createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port
      },
      password: config.redis.password
    });
    
    this.deduplicationRules = new Map();
    this.initializeDeduplicationRules();
    this.connectRedis();
  }

  /**
   * Connect to Redis
   */
  private async connectRedis(): Promise<void> {
    try {
      await this.redisClient.connect();
      this.isConnected = true;
      logger.info('Connected to Redis for deduplication');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  /**
   * Initialize default deduplication rules
   */
  private initializeDeduplicationRules(): void {
    // Rockfall risk deduplication
    this.deduplicationRules.set('rockfall_risk', {
      rule_id: 'rockfall_risk_dedup',
      alert_type: 'rockfall_risk',
      time_window_minutes: config.alertProcessing.deduplicationWindowMinutes,
      location_radius_meters: 100, // 100 meter radius
      source_id_match: true,
      severity_match: false, // Allow different severities
      message_similarity_threshold: 0.8
    });

    // Sensor failure deduplication
    this.deduplicationRules.set('sensor_failure', {
      rule_id: 'sensor_failure_dedup',
      alert_type: 'sensor_failure',
      time_window_minutes: 60, // Longer window for sensor failures
      source_id_match: true, // Must be same sensor
      severity_match: true,
      message_similarity_threshold: 0.9
    });

    // Communication loss deduplication
    this.deduplicationRules.set('communication_loss', {
      rule_id: 'comm_loss_dedup',
      alert_type: 'communication_loss',
      time_window_minutes: 30,
      source_id_match: true,
      severity_match: true
    });

    // Battery low deduplication
    this.deduplicationRules.set('battery_low', {
      rule_id: 'battery_low_dedup',
      alert_type: 'battery_low',
      time_window_minutes: 240, // 4 hours - battery alerts are less urgent
      source_id_match: true,
      severity_match: true
    });

    // Weather warning deduplication
    this.deduplicationRules.set('weather_warning', {
      rule_id: 'weather_warning_dedup',
      alert_type: 'weather_warning',
      time_window_minutes: 120, // 2 hours
      location_radius_meters: 1000, // 1km radius for weather
      severity_match: false,
      message_similarity_threshold: 0.7
    });

    logger.info(`Initialized ${this.deduplicationRules.size} deduplication rules`);
  }

  /**
   * Check if an alert is a duplicate
   */
  async isDuplicate(alertInput: AlertInput): Promise<boolean> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping deduplication check');
        return false;
      }

      const rule = this.deduplicationRules.get(alertInput.alert_type);
      if (!rule) {
        logger.debug(`No deduplication rule for alert type: ${alertInput.alert_type}`);
        return false;
      }

      const duplicateMatch = await this.findDuplicateMatch(alertInput, rule);
      
      if (duplicateMatch) {
        logger.info(`Duplicate alert detected: ${duplicateMatch.existing_alert_id} (similarity: ${duplicateMatch.similarity_score})`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking for duplicates:', error);
      return false; // Default to not duplicate on error
    }
  }

  /**
   * Find duplicate match for an alert
   */
  private async findDuplicateMatch(
    alertInput: AlertInput,
    rule: DeduplicationRule
  ): Promise<DuplicateMatch | null> {
    try {
      // Get recent alerts of the same type
      const recentAlerts = await this.getRecentAlerts(
        alertInput.alert_type,
        rule.time_window_minutes
      );

      for (const existingAlert of recentAlerts) {
        const match = this.evaluateMatch(alertInput, existingAlert, rule);
        if (match && match.similarity_score >= 0.8) {
          return match;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error finding duplicate match:', error);
      return null;
    }
  }

  /**
   * Evaluate if two alerts match based on deduplication rule
   */
  private evaluateMatch(
    alertInput: AlertInput,
    existingAlert: Alert,
    rule: DeduplicationRule
  ): DuplicateMatch | null {
    const matchingCriteria: string[] = [];
    let similarityScore = 0;
    let totalCriteria = 0;

    // Check source ID match
    if (rule.source_id_match) {
      totalCriteria++;
      if (alertInput.source_id && alertInput.source_id === existingAlert.source_id) {
        matchingCriteria.push('source_id');
        similarityScore += 0.3;
      }
    }

    // Check severity match
    if (rule.severity_match) {
      totalCriteria++;
      if (alertInput.severity === existingAlert.severity) {
        matchingCriteria.push('severity');
        similarityScore += 0.2;
      }
    }

    // Check location proximity
    if (rule.location_radius_meters && alertInput.location && existingAlert.location) {
      totalCriteria++;
      const distance = this.calculateDistance(
        alertInput.location.latitude,
        alertInput.location.longitude,
        existingAlert.location.latitude,
        existingAlert.location.longitude
      );

      if (distance <= rule.location_radius_meters) {
        matchingCriteria.push('location');
        similarityScore += 0.3;
      }
    }

    // Check message similarity
    if (rule.message_similarity_threshold) {
      totalCriteria++;
      const messageSimilarity = this.calculateMessageSimilarity(
        alertInput.message,
        existingAlert.message
      );

      if (messageSimilarity >= rule.message_similarity_threshold) {
        matchingCriteria.push('message');
        similarityScore += 0.2;
      }
    }

    // Check time window
    const timeDifferenceMinutes = this.calculateTimeDifference(
      alertInput.triggered_at,
      existingAlert.triggered_at
    );

    if (timeDifferenceMinutes > rule.time_window_minutes) {
      return null; // Outside time window
    }

    // Normalize similarity score
    if (totalCriteria > 0) {
      similarityScore = similarityScore / (totalCriteria * 0.3); // Normalize to 0-1
    }

    // Return match if similarity is high enough
    if (similarityScore >= 0.6 && matchingCriteria.length >= 2) {
      return {
        existing_alert_id: existingAlert.alert_id,
        similarity_score: similarityScore,
        matching_criteria: matchingCriteria,
        time_difference_minutes: timeDifferenceMinutes,
        location_distance_meters: alertInput.location && existingAlert.location ?
          this.calculateDistance(
            alertInput.location.latitude,
            alertInput.location.longitude,
            existingAlert.location.latitude,
            existingAlert.location.longitude
          ) : undefined
      };
    }

    return null;
  }

  /**
   * Get recent alerts from Redis cache
   */
  private async getRecentAlerts(
    alertType: AlertType,
    timeWindowMinutes: number
  ): Promise<Alert[]> {
    try {
      const cacheKey = `recent_alerts:${alertType}`;
      const alertsJson = await this.redisClient.lRange(cacheKey, 0, -1);
      
      const alerts = alertsJson
        .map(json => {
          try {
            return Alert.fromJSON(JSON.parse(json));
          } catch (error) {
            logger.warn('Failed to parse cached alert:', error);
            return null;
          }
        })
        .filter((alert): alert is Alert => alert !== null);

      // Filter by time window
      const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
      return alerts.filter(alert => alert.triggered_at >= cutoffTime);
    } catch (error) {
      logger.error('Error getting recent alerts from cache:', error);
      return [];
    }
  }

  /**
   * Register an alert in the deduplication cache
   */
  async registerAlert(alert: Alert): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping alert registration');
        return;
      }

      const cacheKey = `recent_alerts:${alert.alert_type}`;
      const alertJson = JSON.stringify(alert.toJSON());
      
      // Add to list
      await this.redisClient.lPush(cacheKey, alertJson);
      
      // Trim list to keep only recent alerts (max 1000)
      await this.redisClient.lTrim(cacheKey, 0, 999);
      
      // Set expiration on the key
      await this.redisClient.expire(cacheKey, 24 * 60 * 60); // 24 hours

      logger.debug(`Registered alert ${alert.alert_id} in deduplication cache`);
    } catch (error) {
      logger.error('Error registering alert in cache:', error);
    }
  }

  /**
   * Get existing alert that matches the input
   */
  async getExistingAlert(alertInput: AlertInput): Promise<Alert | null> {
    try {
      const rule = this.deduplicationRules.get(alertInput.alert_type);
      if (!rule) return null;

      const duplicateMatch = await this.findDuplicateMatch(alertInput, rule);
      if (!duplicateMatch) return null;

      // Get the existing alert from cache
      const recentAlerts = await this.getRecentAlerts(
        alertInput.alert_type,
        rule.time_window_minutes
      );

      return recentAlerts.find(alert => alert.alert_id === duplicateMatch.existing_alert_id) || null;
    } catch (error) {
      logger.error('Error getting existing alert:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate message similarity using simple string comparison
   */
  private calculateMessageSimilarity(message1: string, message2: string): number {
    if (!message1 || !message2) return 0;
    
    // Simple Jaccard similarity based on words
    const words1 = new Set(message1.toLowerCase().split(/\s+/));
    const words2 = new Set(message2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate time difference in minutes
   */
  private calculateTimeDifference(date1: Date, date2: Date): number {
    return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60);
  }

  /**
   * Update deduplication rule
   */
  updateDeduplicationRule(alertType: AlertType, rule: DeduplicationRule): void {
    this.deduplicationRules.set(alertType, rule);
    logger.info(`Updated deduplication rule for ${alertType}`);
  }

  /**
   * Get deduplication rule
   */
  getDeduplicationRule(alertType: AlertType): DeduplicationRule | undefined {
    return this.deduplicationRules.get(alertType);
  }

  /**
   * Get deduplication statistics
   */
  async getDeduplicationStats(): Promise<{
    totalRules: number;
    cacheSize: number;
    duplicatesBlocked: number;
  }> {
    try {
      let cacheSize = 0;
      let duplicatesBlocked = 0;

      // Count cached alerts
      for (const alertType of this.deduplicationRules.keys()) {
        const cacheKey = `recent_alerts:${alertType}`;
        const size = await this.redisClient.lLen(cacheKey);
        cacheSize += size;
      }

      // Get duplicates blocked count (would be stored in Redis in production)
      const duplicatesKey = 'deduplication:duplicates_blocked';
      const duplicatesCount = await this.redisClient.get(duplicatesKey);
      duplicatesBlocked = duplicatesCount ? parseInt(duplicatesCount) : 0;

      return {
        totalRules: this.deduplicationRules.size,
        cacheSize,
        duplicatesBlocked
      };
    } catch (error) {
      logger.error('Error getting deduplication stats:', error);
      return {
        totalRules: this.deduplicationRules.size,
        cacheSize: 0,
        duplicatesBlocked: 0
      };
    }
  }

  /**
   * Clear deduplication cache
   */
  async clearCache(alertType?: AlertType): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, cannot clear cache');
        return;
      }

      if (alertType) {
        const cacheKey = `recent_alerts:${alertType}`;
        await this.redisClient.del(cacheKey);
        logger.info(`Cleared deduplication cache for ${alertType}`);
      } else {
        // Clear all alert type caches
        for (const type of this.deduplicationRules.keys()) {
          const cacheKey = `recent_alerts:${type}`;
          await this.redisClient.del(cacheKey);
        }
        logger.info('Cleared all deduplication caches');
      }
    } catch (error) {
      logger.error('Error clearing deduplication cache:', error);
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.redisClient.disconnect();
        this.isConnected = false;
        logger.info('Disconnected from Redis');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }
}