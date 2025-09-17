-- PRISM PostGIS Initialization Script
-- Spatial data for mine geometry, sensor locations, and risk zones

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS mine_geometry;
CREATE SCHEMA IF NOT EXISTS sensor_network;
CREATE SCHEMA IF NOT EXISTS risk_zones;
CREATE SCHEMA IF NOT EXISTS environmental;

-- Mine geometry tables
CREATE TABLE mine_geometry.mine_sites (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(50) UNIQUE NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    elevation_range NUMRANGE,
    coordinate_system VARCHAR(50) DEFAULT 'WGS84',
    utm_zone INTEGER,
    mine_grid_origin GEOMETRY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mine_sites_boundary ON mine_geometry.mine_sites USING GIST (boundary);
CREATE INDEX idx_mine_sites_site_id ON mine_geometry.mine_sites (site_id);

CREATE TABLE mine_geometry.slope_segments (
    id SERIAL PRIMARY KEY,
    segment_id VARCHAR(50) UNIQUE NOT NULL,
    site_id VARCHAR(50) NOT NULL REFERENCES mine_geometry.mine_sites(site_id),
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    slope_angle REAL,
    aspect REAL,
    curvature REAL,
    rock_type VARCHAR(100),
    joint_orientations REAL[],
    stability_rating REAL CHECK (stability_rating BETWEEN 0 AND 1),
    bench_height REAL,
    bench_width REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slope_segments_geometry ON mine_geometry.slope_segments USING GIST (geometry);
CREATE INDEX idx_slope_segments_site_id ON mine_geometry.slope_segments (site_id);
CREATE INDEX idx_slope_segments_stability ON mine_geometry.slope_segments (stability_rating);

-- Digital Elevation Models
CREATE TABLE mine_geometry.dem_data (
    id SERIAL PRIMARY KEY,
    dem_id VARCHAR(50) UNIQUE NOT NULL,
    site_id VARCHAR(50) NOT NULL REFERENCES mine_geometry.mine_sites(site_id),
    raster_data RASTER,
    resolution REAL, -- meters per pixel
    acquisition_date TIMESTAMPTZ,
    data_source VARCHAR(100), -- 'UAV', 'LiDAR', 'Satellite'
    processing_method VARCHAR(100),
    accuracy_horizontal REAL,
    accuracy_vertical REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dem_data_raster ON mine_geometry.dem_data USING GIST (ST_ConvexHull(raster_data));
CREATE INDEX idx_dem_data_site_id ON mine_geometry.dem_data (site_id);
CREATE INDEX idx_dem_data_acquisition ON mine_geometry.dem_data (acquisition_date DESC);

-- Sensor network tables
CREATE TABLE sensor_network.sensor_nodes (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(50) UNIQUE NOT NULL,
    site_id VARCHAR(50) NOT NULL REFERENCES mine_geometry.mine_sites(site_id),
    location GEOMETRY(POINT, 4326) NOT NULL,
    elevation REAL,
    sensor_type VARCHAR(50) NOT NULL, -- 'hexapod', 'fixed', 'mobile'
    sensor_capabilities TEXT[],
    installation_date TIMESTAMPTZ,
    last_maintenance TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',
    coverage_radius REAL, -- meters
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sensor_nodes_location ON sensor_network.sensor_nodes USING GIST (location);
CREATE INDEX idx_sensor_nodes_site_id ON sensor_network.sensor_nodes (site_id);
CREATE INDEX idx_sensor_nodes_type ON sensor_network.sensor_nodes (sensor_type);
CREATE INDEX idx_sensor_nodes_status ON sensor_network.sensor_nodes (status);

-- Sensor network topology (spatial relationships)
CREATE TABLE sensor_network.sensor_connections (
    id SERIAL PRIMARY KEY,
    from_sensor_id VARCHAR(50) NOT NULL REFERENCES sensor_network.sensor_nodes(sensor_id),
    to_sensor_id VARCHAR(50) NOT NULL REFERENCES sensor_network.sensor_nodes(sensor_id),
    connection_type VARCHAR(50) NOT NULL, -- 'communication', 'spatial_correlation', 'redundancy'
    distance REAL,
    signal_strength REAL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_sensor_id, to_sensor_id, connection_type)
);

CREATE INDEX idx_sensor_connections_from ON sensor_network.sensor_connections (from_sensor_id);
CREATE INDEX idx_sensor_connections_to ON sensor_network.sensor_connections (to_sensor_id);

-- Risk zones and spatial analysis
CREATE TABLE risk_zones.risk_areas (
    id SERIAL PRIMARY KEY,
    risk_area_id VARCHAR(50) UNIQUE NOT NULL,
    site_id VARCHAR(50) NOT NULL REFERENCES mine_geometry.mine_sites(site_id),
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    risk_level INTEGER CHECK (risk_level BETWEEN 1 AND 4),
    risk_probability REAL CHECK (risk_probability BETWEEN 0 AND 1),
    confidence_interval NUMRANGE,
    time_to_failure REAL, -- hours
    contributing_factors TEXT[],
    affected_infrastructure TEXT[],
    evacuation_zones GEOMETRY(MULTIPOLYGON, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_risk_areas_geometry ON risk_zones.risk_areas USING GIST (geometry);
CREATE INDEX idx_risk_areas_site_id ON risk_zones.risk_areas (site_id);
CREATE INDEX idx_risk_areas_risk_level ON risk_zones.risk_areas (risk_level, risk_probability DESC);
CREATE INDEX idx_risk_areas_expires ON risk_zones.risk_areas (expires_at);

-- Environmental data
CREATE TABLE environmental.weather_stations (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) UNIQUE NOT NULL,
    site_id VARCHAR(50) NOT NULL REFERENCES mine_geometry.mine_sites(site_id),
    location GEOMETRY(POINT, 4326) NOT NULL,
    elevation REAL,
    station_type VARCHAR(50), -- 'automatic', 'manual', 'satellite'
    capabilities TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weather_stations_location ON environmental.weather_stations USING GIST (location);
CREATE INDEX idx_weather_stations_site_id ON environmental.weather_stations (site_id);

-- Spatial functions for common operations
CREATE OR REPLACE FUNCTION sensor_network.find_nearby_sensors(
    p_location GEOMETRY,
    p_radius_meters REAL DEFAULT 1000
)
RETURNS TABLE (
    sensor_id VARCHAR(50),
    distance_meters REAL,
    sensor_type VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sn.sensor_id,
        ST_Distance(ST_Transform(sn.location, 3857), ST_Transform(p_location, 3857)) AS distance_meters,
        sn.sensor_type
    FROM sensor_network.sensor_nodes sn
    WHERE ST_DWithin(ST_Transform(sn.location, 3857), ST_Transform(p_location, 3857), p_radius_meters)
      AND sn.status = 'active'
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION risk_zones.get_risk_at_location(
    p_location GEOMETRY,
    p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    risk_level INTEGER,
    risk_probability REAL,
    time_to_failure REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ra.risk_level,
        ra.risk_probability,
        ra.time_to_failure
    FROM risk_zones.risk_areas ra
    WHERE ST_Contains(ra.geometry, p_location)
      AND (ra.expires_at IS NULL OR ra.expires_at > p_timestamp)
    ORDER BY ra.risk_probability DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mine_geometry.get_slope_properties(
    p_location GEOMETRY
)
RETURNS TABLE (
    segment_id VARCHAR(50),
    slope_angle REAL,
    aspect REAL,
    rock_type VARCHAR(100),
    stability_rating REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.segment_id,
        ss.slope_angle,
        ss.aspect,
        ss.rock_type,
        ss.stability_rating
    FROM mine_geometry.slope_segments ss
    WHERE ST_Contains(ss.geometry, p_location)
    ORDER BY ss.stability_rating
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create spatial indexes for performance
CREATE INDEX idx_risk_areas_spatial_temporal ON risk_zones.risk_areas 
USING GIST (geometry, expires_at);

-- Views for common queries
CREATE VIEW sensor_network.active_sensor_coverage AS
SELECT 
    sn.sensor_id,
    sn.location,
    sn.sensor_type,
    ST_Buffer(ST_Transform(sn.location, 3857), sn.coverage_radius) AS coverage_area_3857,
    ST_Transform(ST_Buffer(ST_Transform(sn.location, 3857), sn.coverage_radius), 4326) AS coverage_area
FROM sensor_network.sensor_nodes sn
WHERE sn.status = 'active';

CREATE VIEW risk_zones.current_risk_summary AS
SELECT 
    ra.site_id,
    ra.risk_level,
    COUNT(*) AS area_count,
    AVG(ra.risk_probability) AS avg_probability,
    MIN(ra.time_to_failure) AS min_time_to_failure,
    ST_Union(ra.geometry) AS combined_geometry
FROM risk_zones.risk_areas ra
WHERE ra.expires_at IS NULL OR ra.expires_at > NOW()
GROUP BY ra.site_id, ra.risk_level;

-- Grant permissions
GRANT USAGE ON SCHEMA mine_geometry TO prism_user;
GRANT USAGE ON SCHEMA sensor_network TO prism_user;
GRANT USAGE ON SCHEMA risk_zones TO prism_user;
GRANT USAGE ON SCHEMA environmental TO prism_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA mine_geometry TO prism_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sensor_network TO prism_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA risk_zones TO prism_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA environmental TO prism_user;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mine_geometry TO prism_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sensor_network TO prism_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA risk_zones TO prism_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA environmental TO prism_user;