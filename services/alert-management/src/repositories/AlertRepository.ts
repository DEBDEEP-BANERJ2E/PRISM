import { Pool, PoolClient } from 'pg';
import { Alert, AlertData, AlertStatus, AlertSeverity, AlertType } from '@prism/shared-models/risk';
import { logger } from '../utils/logger';
import { config } from '../config';
import { AlertFilter, AlertStats } from '../services/AlertManagementService';

export class AlertRepository {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.username,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.initializeDatabase();
  }

  /**
   * Initialize database tables
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const client = await this.pool.connect();
      
      // Create alerts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS alerts (
          alert_id VARCHAR(255) PRIMARY KEY,
          alert_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          location_latitude DECIMAL(10, 8),
          location_longitude DECIMAL(11, 8),
          location_elevation DECIMAL(10, 3),
          risk_level VARCHAR(20),
          source_id VARCHAR(255),
          source_type VARCHAR(50),
          triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
          acknowledged_at TIMESTAMP WITH TIME ZONE,
          acknowledged_by VARCHAR(255),
          resolved_at TIMESTAMP WITH TIME ZONE,
          resolved_by VARCHAR(255),
          suppressed_until TIMESTAMP WITH TIME ZONE,
          escalation_rules JSONB DEFAULT '[]',
          notifications JSONB DEFAULT '[]',
          related_alerts JSONB DEFAULT '[]',
          metadata JSONB DEFAULT '{}',
          tags JSONB DEFAULT '[]',
          priority_score INTEGER,
          auto_resolve BOOLEAN DEFAULT false,
          auto_resolve_after_minutes INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
        CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
        CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
        CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at);
        CREATE INDEX IF NOT EXISTS idx_alerts_source_id ON alerts(source_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_location ON alerts(location_latitude, location_longitude);
        CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority_score);
        CREATE INDEX IF NOT EXISTS idx_alerts_tags ON alerts USING GIN(tags);
      `);

      client.release();
      logger.info('Alert database initialized successfully');
    } catch (error) {
      logger.error('Error initializing alert database:', error);
      throw error;
    }
  }

  /**
   * Create a new alert
   */
  async create(alert: Alert): Promise<Alert> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO alerts (
          alert_id, alert_type, severity, status, title, message,
          location_latitude, location_longitude, location_elevation,
          risk_level, source_id, source_type, triggered_at,
          acknowledged_at, acknowledged_by, resolved_at, resolved_by,
          suppressed_until, escalation_rules, notifications,
          related_alerts, metadata, tags, priority_score,
          auto_resolve, auto_resolve_after_minutes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
          $25, $26, $27, $28
        )
        RETURNING *
      `;

      const values = [
        alert.alert_id,
        alert.alert_type,
        alert.severity,
        alert.status,
        alert.title,
        alert.message,
        alert.location?.latitude,
        alert.location?.longitude,
        alert.location?.elevation,
        alert.risk_level,
        alert.source_id,
        alert.source_type,
        alert.triggered_at,
        alert.acknowledged_at,
        alert.acknowledged_by,
        alert.resolved_at,
        alert.resolved_by,
        alert.suppressed_until,
        JSON.stringify(alert.escalation_rules),
        JSON.stringify(alert.notifications),
        JSON.stringify(alert.related_alerts),
        JSON.stringify(alert.metadata),
        JSON.stringify(alert.tags),
        alert.priority_score,
        alert.auto_resolve,
        alert.auto_resolve_after_minutes,
        alert.created_at,
        alert.updated_at
      ];

      const result = await client.query(query, values);
      return this.mapRowToAlert(result.rows[0]);
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find alert by ID
   */
  async findById(alertId: string): Promise<Alert | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM alerts WHERE alert_id = $1';
      const result = await client.query(query, [alertId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToAlert(result.rows[0]);
    } catch (error) {
      logger.error('Error finding alert by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update alert
   */
  async update(alertId: string, updates: Partial<AlertData>): Promise<Alert> {
    const client = await this.pool.connect();
    
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          const dbField = this.mapFieldToColumn(key);
          if (dbField) {
            updateFields.push(`${dbField} = $${paramIndex}`);
            values.push(this.serializeValue(key, value));
            paramIndex++;
          }
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      paramIndex++;

      values.push(alertId); // For WHERE clause

      const query = `
        UPDATE alerts 
        SET ${updateFields.join(', ')}
        WHERE alert_id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Alert ${alertId} not found`);
      }
      
      return this.mapRowToAlert(result.rows[0]);
    } catch (error) {
      logger.error('Error updating alert:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find alerts with filtering and pagination
   */
  async findWithFilter(
    filter: AlertFilter,
    page: number = 1,
    limit: number = 50
  ): Promise<{ alerts: Alert[]; total: number }> {
    const client = await this.pool.connect();
    
    try {
      const { whereClause, values } = this.buildWhereClause(filter);
      const offset = (page - 1) * limit;

      // Count query
      const countQuery = `SELECT COUNT(*) FROM alerts ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Data query
      const dataQuery = `
        SELECT * FROM alerts 
        ${whereClause}
        ORDER BY triggered_at DESC, priority_score DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `;
      
      const dataResult = await client.query(dataQuery, [...values, limit, offset]);
      const alerts = dataResult.rows.map(row => this.mapRowToAlert(row));

      return { alerts, total };
    } catch (error) {
      logger.error('Error finding alerts with filter:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get alert statistics
   */
  async getStats(filter: AlertFilter = {}): Promise<AlertStats> {
    const client = await this.pool.connect();
    
    try {
      const { whereClause, values } = this.buildWhereClause(filter);

      // Basic counts
      const basicStatsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
          COUNT(CASE WHEN status = 'suppressed' THEN 1 END) as suppressed
        FROM alerts ${whereClause}
      `;
      
      const basicStats = await client.query(basicStatsQuery, values);
      const stats = basicStats.rows[0];

      // Status breakdown
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM alerts ${whereClause}
        GROUP BY status
      `;
      const statusResult = await client.query(statusQuery, values);
      const byStatus: Record<AlertStatus, number> = {
        active: 0,
        acknowledged: 0,
        resolved: 0,
        suppressed: 0
      };
      statusResult.rows.forEach(row => {
        byStatus[row.status as AlertStatus] = parseInt(row.count);
      });

      // Severity breakdown
      const severityQuery = `
        SELECT severity, COUNT(*) as count
        FROM alerts ${whereClause}
        GROUP BY severity
      `;
      const severityResult = await client.query(severityQuery, values);
      const bySeverity: Record<AlertSeverity, number> = {
        info: 0,
        warning: 0,
        critical: 0,
        emergency: 0
      };
      severityResult.rows.forEach(row => {
        bySeverity[row.severity as AlertSeverity] = parseInt(row.count);
      });

      // Type breakdown
      const typeQuery = `
        SELECT alert_type, COUNT(*) as count
        FROM alerts ${whereClause}
        GROUP BY alert_type
      `;
      const typeResult = await client.query(typeQuery, values);
      const byType: Record<AlertType, number> = {
        rockfall_risk: 0,
        sensor_failure: 0,
        communication_loss: 0,
        battery_low: 0,
        calibration_due: 0,
        maintenance_required: 0,
        weather_warning: 0,
        system_error: 0
      };
      typeResult.rows.forEach(row => {
        byType[row.alert_type as AlertType] = parseInt(row.count);
      });

      // Resolution time stats
      const resolutionTimeQuery = `
        SELECT 
          AVG(EXTRACT(EPOCH FROM (resolved_at - triggered_at))/60) as avg_resolution_minutes,
          AVG(EXTRACT(EPOCH FROM (acknowledged_at - triggered_at))/60) as avg_acknowledgment_minutes
        FROM alerts 
        ${whereClause} AND resolved_at IS NOT NULL
      `;
      const resolutionStats = await client.query(resolutionTimeQuery, values);
      const resolutionData = resolutionStats.rows[0];

      return {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        acknowledged: parseInt(stats.acknowledged),
        resolved: parseInt(stats.resolved),
        suppressed: parseInt(stats.suppressed),
        byStatus,
        bySeverity,
        byType,
        averageResolutionTimeMinutes: parseFloat(resolutionData.avg_resolution_minutes) || 0,
        averageAcknowledgmentTimeMinutes: parseFloat(resolutionData.avg_acknowledgment_minutes) || 0,
        falsePositiveRate: 0 // Would need additional tracking to calculate this
      };
    } catch (error) {
      logger.error('Error getting alert stats:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Build WHERE clause for filtering
   */
  private buildWhereClause(filter: AlertFilter): { whereClause: string; values: any[] } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filter.status && filter.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex})`);
      values.push(filter.status);
      paramIndex++;
    }

    if (filter.severity && filter.severity.length > 0) {
      conditions.push(`severity = ANY($${paramIndex})`);
      values.push(filter.severity);
      paramIndex++;
    }

    if (filter.alertType && filter.alertType.length > 0) {
      conditions.push(`alert_type = ANY($${paramIndex})`);
      values.push(filter.alertType);
      paramIndex++;
    }

    if (filter.startDate) {
      conditions.push(`triggered_at >= $${paramIndex}`);
      values.push(filter.startDate);
      paramIndex++;
    }

    if (filter.endDate) {
      conditions.push(`triggered_at <= $${paramIndex}`);
      values.push(filter.endDate);
      paramIndex++;
    }

    if (filter.sourceId) {
      conditions.push(`source_id = $${paramIndex}`);
      values.push(filter.sourceId);
      paramIndex++;
    }

    if (filter.acknowledged === true) {
      conditions.push('acknowledged_at IS NOT NULL');
    } else if (filter.acknowledged === false) {
      conditions.push('acknowledged_at IS NULL');
    }

    if (filter.resolved === true) {
      conditions.push('resolved_at IS NOT NULL');
    } else if (filter.resolved === false) {
      conditions.push('resolved_at IS NULL');
    }

    if (filter.suppressed === true) {
      conditions.push('suppressed_until IS NOT NULL AND suppressed_until > NOW()');
    } else if (filter.suppressed === false) {
      conditions.push('(suppressed_until IS NULL OR suppressed_until <= NOW())');
    }

    if (filter.location) {
      // Use PostGIS for location filtering if available, otherwise use simple distance calculation
      conditions.push(`
        (6371000 * acos(cos(radians($${paramIndex})) * cos(radians(location_latitude)) * 
        cos(radians(location_longitude) - radians($${paramIndex + 1})) + 
        sin(radians($${paramIndex})) * sin(radians(location_latitude)))) <= $${paramIndex + 2}
      `);
      values.push(filter.location.latitude, filter.location.longitude, filter.location.radius);
      paramIndex += 3;
    }

    if (filter.tags && filter.tags.length > 0) {
      conditions.push(`tags ?| $${paramIndex}`);
      values.push(filter.tags);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values };
  }

  /**
   * Map database row to Alert object
   */
  private mapRowToAlert(row: any): Alert {
    const alertData: AlertData = {
      alert_id: row.alert_id,
      alert_type: row.alert_type,
      severity: row.severity,
      status: row.status,
      title: row.title,
      message: row.message,
      location: row.location_latitude && row.location_longitude ? {
        latitude: parseFloat(row.location_latitude),
        longitude: parseFloat(row.location_longitude),
        elevation: row.location_elevation ? parseFloat(row.location_elevation) : 0,
        coordinate_system: 'WGS84',
        utm_x: 0, // Would need to calculate
        utm_y: 0, // Would need to calculate
        mine_grid_x: 0, // Would need to calculate
        mine_grid_y: 0  // Would need to calculate
      } : undefined,
      risk_level: row.risk_level,
      source_id: row.source_id,
      source_type: row.source_type,
      triggered_at: row.triggered_at,
      acknowledged_at: row.acknowledged_at,
      acknowledged_by: row.acknowledged_by,
      resolved_at: row.resolved_at,
      resolved_by: row.resolved_by,
      suppressed_until: row.suppressed_until,
      escalation_rules: JSON.parse(row.escalation_rules || '[]'),
      notifications: JSON.parse(row.notifications || '[]'),
      related_alerts: JSON.parse(row.related_alerts || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      tags: JSON.parse(row.tags || '[]'),
      priority_score: row.priority_score,
      auto_resolve: row.auto_resolve,
      auto_resolve_after_minutes: row.auto_resolve_after_minutes,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return new Alert(alertData);
  }

  /**
   * Map field name to database column
   */
  private mapFieldToColumn(field: string): string | null {
    const fieldMap: Record<string, string> = {
      'status': 'status',
      'acknowledged_at': 'acknowledged_at',
      'acknowledged_by': 'acknowledged_by',
      'resolved_at': 'resolved_at',
      'resolved_by': 'resolved_by',
      'suppressed_until': 'suppressed_until',
      'metadata': 'metadata',
      'notifications': 'notifications',
      'escalation_rules': 'escalation_rules',
      'priority_score': 'priority_score'
    };

    return fieldMap[field] || null;
  }

  /**
   * Serialize value for database storage
   */
  private serializeValue(field: string, value: any): any {
    const jsonFields = ['metadata', 'notifications', 'escalation_rules', 'related_alerts', 'tags'];
    
    if (jsonFields.includes(field)) {
      return JSON.stringify(value);
    }
    
    return value;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Alert repository database connection closed');
    } catch (error) {
      logger.error('Error closing alert repository database connection:', error);
    }
  }
}