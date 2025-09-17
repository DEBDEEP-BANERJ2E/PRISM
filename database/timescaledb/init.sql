-- PRISM TimescaleDB Initialization Script
-- Time-series data for sensor readings, alerts, and system metrics

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS sensor_data;
CREATE SCHEMA IF NOT EXISTS alerts;
CREATE SCHEMA IF NOT EXISTS system_metrics;
CREATE SCHEMA IF NOT EXISTS user_management;

-- Sensor data tables
CREATE TABLE sensor_data.sensor_readings (
    id BIGSERIAL,
    sensor_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    location_elevation DOUBLE PRECISION,
    measurements JSONB NOT NULL,
    quality_flags JSONB,
    battery_level REAL,
    signal_strength REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('sensor_data.sensor_readings', 'timestamp');

-- Create indexes
CREATE INDEX idx_sensor_readings_sensor_id ON sensor_data.sensor_readings (sensor_id, timestamp DESC);
CREATE INDEX idx_sensor_readings_location ON sensor_data.sensor_readings USING GIST (
    ll_to_earth(location_lat, location_lon)
);
CREATE INDEX idx_sensor_readings_measurements ON sensor_data.sensor_readings USING GIN (measurements);

-- Hexapod status table
CREATE TABLE sensor_data.hexapod_status (
    id BIGSERIAL,
    pod_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    location_elevation DOUBLE PRECISION,
    operational_status VARCHAR(20) NOT NULL,
    sensor_health JSONB,
    power_status JSONB,
    last_communication TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('sensor_data.hexapod_status', 'timestamp');
CREATE INDEX idx_hexapod_status_pod_id ON sensor_data.hexapod_status (pod_id, timestamp DESC);

-- Risk assessments table
CREATE TABLE alerts.risk_assessments (
    id BIGSERIAL,
    assessment_id UUID DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    spatial_extent JSONB, -- GeoJSON polygon
    risk_probability REAL NOT NULL,
    confidence_interval_lower REAL,
    confidence_interval_upper REAL,
    time_to_failure REAL, -- hours
    contributing_factors TEXT[],
    alert_level INTEGER NOT NULL CHECK (alert_level BETWEEN 1 AND 4),
    recommended_actions TEXT[],
    explanation TEXT,
    model_version VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('alerts.risk_assessments', 'timestamp');
CREATE INDEX idx_risk_assessments_alert_level ON alerts.risk_assessments (alert_level, timestamp DESC);
CREATE INDEX idx_risk_assessments_probability ON alerts.risk_assessments (risk_probability DESC, timestamp DESC);

-- Alert notifications table
CREATE TABLE alerts.notifications (
    id BIGSERIAL,
    notification_id UUID DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    recipient_type VARCHAR(20) NOT NULL, -- 'sms', 'email', 'push', 'webhook'
    recipient_address VARCHAR(255) NOT NULL,
    message_content TEXT,
    delivery_status VARCHAR(20) DEFAULT 'pending',
    delivered_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('alerts.notifications', 'timestamp');
CREATE INDEX idx_notifications_assessment_id ON alerts.notifications (assessment_id);
CREATE INDEX idx_notifications_status ON alerts.notifications (delivery_status, timestamp DESC);

-- System metrics table
CREATE TABLE system_metrics.service_metrics (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ NOT NULL,
    service_name VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    labels JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('system_metrics.service_metrics', 'timestamp');
CREATE INDEX idx_service_metrics_service ON system_metrics.service_metrics (service_name, metric_name, timestamp DESC);

-- User management tables
CREATE TABLE user_management.users (
    id SERIAL PRIMARY KEY,
    user_id UUID DEFAULT gen_random_uuid() UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'operator',
    mine_site VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_management.user_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID DEFAULT gen_random_uuid() UNIQUE,
    user_id UUID NOT NULL REFERENCES user_management.users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_user_sessions_user_id ON user_management.user_sessions (user_id);
CREATE INDEX idx_user_sessions_expires ON user_management.user_sessions (expires_at);

-- Create retention policies
SELECT add_retention_policy('sensor_data.sensor_readings', INTERVAL '2 years');
SELECT add_retention_policy('sensor_data.hexapod_status', INTERVAL '2 years');
SELECT add_retention_policy('alerts.risk_assessments', INTERVAL '5 years');
SELECT add_retention_policy('alerts.notifications', INTERVAL '1 year');
SELECT add_retention_policy('system_metrics.service_metrics', INTERVAL '90 days');

-- Create continuous aggregates for common queries
CREATE MATERIALIZED VIEW sensor_data.sensor_readings_hourly
WITH (timescaledb.continuous) AS
SELECT 
    sensor_id,
    time_bucket('1 hour', timestamp) AS bucket,
    AVG((measurements->>'displacement')::REAL) AS avg_displacement,
    MAX((measurements->>'displacement')::REAL) AS max_displacement,
    AVG((measurements->>'tilt_x')::REAL) AS avg_tilt_x,
    AVG((measurements->>'tilt_y')::REAL) AS avg_tilt_y,
    AVG((measurements->>'temperature')::REAL) AS avg_temperature,
    AVG(battery_level) AS avg_battery_level,
    COUNT(*) AS reading_count
FROM sensor_data.sensor_readings
GROUP BY sensor_id, bucket;

-- Add refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('sensor_data.sensor_readings_hourly',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Create functions for common operations
CREATE OR REPLACE FUNCTION sensor_data.get_recent_readings(
    p_sensor_id VARCHAR(50),
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    timestamp TIMESTAMPTZ,
    measurements JSONB,
    battery_level REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT sr.timestamp, sr.measurements, sr.battery_level
    FROM sensor_data.sensor_readings sr
    WHERE sr.sensor_id = p_sensor_id
      AND sr.timestamp >= NOW() - (p_hours || ' hours')::INTERVAL
    ORDER BY sr.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA sensor_data TO prism_user;
GRANT USAGE ON SCHEMA alerts TO prism_user;
GRANT USAGE ON SCHEMA system_metrics TO prism_user;
GRANT USAGE ON SCHEMA user_management TO prism_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sensor_data TO prism_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA alerts TO prism_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA system_metrics TO prism_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA user_management TO prism_user;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sensor_data TO prism_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA alerts TO prism_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA system_metrics TO prism_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA user_management TO prism_user;