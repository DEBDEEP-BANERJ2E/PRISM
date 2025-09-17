// PRISM Neo4j Initialization Script
// Graph database for modeling spatial relationships, sensor networks, and knowledge graphs

// Create constraints and indexes
CREATE CONSTRAINT sensor_id_unique IF NOT EXISTS FOR (s:Sensor) REQUIRE s.sensor_id IS UNIQUE;
CREATE CONSTRAINT slope_segment_id_unique IF NOT EXISTS FOR (ss:SlopeSegment) REQUIRE ss.segment_id IS UNIQUE;
CREATE CONSTRAINT mine_site_id_unique IF NOT EXISTS FOR (ms:MineSite) REQUIRE ms.site_id IS UNIQUE;
CREATE CONSTRAINT hexapod_id_unique IF NOT EXISTS FOR (h:Hexapod) REQUIRE h.pod_id IS UNIQUE;

// Create indexes for performance
CREATE INDEX sensor_type_index IF NOT EXISTS FOR (s:Sensor) ON (s.sensor_type);
CREATE INDEX sensor_status_index IF NOT EXISTS FOR (s:Sensor) ON (s.status);
CREATE INDEX slope_stability_index IF NOT EXISTS FOR (ss:SlopeSegment) ON (ss.stability_rating);
CREATE INDEX risk_level_index IF NOT EXISTS FOR (ra:RiskArea) ON (ra.risk_level);

// Create sample mine site
CREATE (ms:MineSite {
    site_id: 'DEMO_MINE_001',
    site_name: 'Demo Open Pit Mine',
    location: point({latitude: -23.5505, longitude: -46.6333}),
    elevation_range: [800, 1200],
    coordinate_system: 'WGS84',
    utm_zone: 23,
    created_at: datetime(),
    updated_at: datetime()
});

// Create slope segments with hierarchical relationships
CREATE (ss1:SlopeSegment {
    segment_id: 'SLOPE_001',
    site_id: 'DEMO_MINE_001',
    location: point({latitude: -23.5500, longitude: -46.6330}),
    slope_angle: 45.0,
    aspect: 180.0,
    curvature: 0.02,
    rock_type: 'Granite',
    joint_orientations: [30, 120, 210],
    stability_rating: 0.75,
    bench_height: 15.0,
    bench_width: 8.0,
    created_at: datetime(),
    updated_at: datetime()
});

CREATE (ss2:SlopeSegment {
    segment_id: 'SLOPE_002',
    site_id: 'DEMO_MINE_001',
    location: point({latitude: -23.5510, longitude: -46.6340}),
    slope_angle: 50.0,
    aspect: 225.0,
    curvature: 0.05,
    rock_type: 'Schist',
    joint_orientations: [45, 135, 270],
    stability_rating: 0.60,
    bench_height: 12.0,
    bench_width: 6.0,
    created_at: datetime(),
    updated_at: datetime()
});

CREATE (ss3:SlopeSegment {
    segment_id: 'SLOPE_003',
    site_id: 'DEMO_MINE_001',
    location: point({latitude: -23.5520, longitude: -46.6350}),
    slope_angle: 40.0,
    aspect: 270.0,
    curvature: -0.01,
    rock_type: 'Granite',
    joint_orientations: [60, 150, 300],
    stability_rating: 0.85,
    bench_height: 18.0,
    bench_width: 10.0,
    created_at: datetime(),
    updated_at: datetime()
});

// Create sensor nodes
CREATE (s1:Sensor {
    sensor_id: 'HEX_001',
    site_id: 'DEMO_MINE_001',
    location: point({latitude: -23.5502, longitude: -46.6332}),
    elevation: 950.0,
    sensor_type: 'hexapod',
    sensor_capabilities: ['tilt', 'accelerometer', 'piezometer', 'temperature', 'humidity', 'strain'],
    installation_date: datetime('2024-01-15T10:00:00Z'),
    status: 'active',
    coverage_radius: 100.0,
    battery_level: 85.0,
    signal_strength: -65.0,
    created_at: datetime(),
    updated_at: datetime()
});

CREATE (s2:Sensor {
    sensor_id: 'HEX_002',
    site_id: 'DEMO_MINE_001',
    location: point({latitude: -23.5512, longitude: -46.6342}),
    elevation: 940.0,
    sensor_type: 'hexapod',
    sensor_capabilities: ['tilt', 'accelerometer', 'piezometer', 'temperature', 'humidity', 'strain'],
    installation_date: datetime('2024-01-20T14:30:00Z'),
    status: 'active',
    coverage_radius: 100.0,
    battery_level: 92.0,
    signal_strength: -58.0,
    created_at: datetime(),
    updated_at: datetime()
});

CREATE (s3:Sensor {
    sensor_id: 'FIXED_001',
    site_id: 'DEMO_MINE_001',
    location: point({latitude: -23.5522, longitude: -46.6352}),
    elevation: 930.0,
    sensor_type: 'fixed',
    sensor_capabilities: ['displacement', 'strain', 'temperature'],
    installation_date: datetime('2024-01-10T09:00:00Z'),
    status: 'active',
    coverage_radius: 50.0,
    battery_level: 100.0,
    signal_strength: -45.0,
    created_at: datetime(),
    updated_at: datetime()
});

// Create hexapod mobile robots
CREATE (h1:Hexapod {
    pod_id: 'MOBILE_HEX_001',
    site_id: 'DEMO_MINE_001',
    current_location: point({latitude: -23.5505, longitude: -46.6335}),
    home_location: point({latitude: -23.5500, longitude: -46.6330}),
    elevation: 945.0,
    operational_status: 'autonomous_patrol',
    mission_type: 'inspection',
    battery_level: 78.0,
    last_communication: datetime(),
    capabilities: ['navigation', 'sensor_deployment', 'data_collection', 'cliff_inspection'],
    created_at: datetime(),
    updated_at: datetime()
});

// Create relationships between entities
MATCH (ms:MineSite {site_id: 'DEMO_MINE_001'})
MATCH (ss1:SlopeSegment {segment_id: 'SLOPE_001'})
MATCH (ss2:SlopeSegment {segment_id: 'SLOPE_002'})
MATCH (ss3:SlopeSegment {segment_id: 'SLOPE_003'})
CREATE (ms)-[:CONTAINS]->(ss1)
CREATE (ms)-[:CONTAINS]->(ss2)
CREATE (ms)-[:CONTAINS]->(ss3);

MATCH (ms:MineSite {site_id: 'DEMO_MINE_001'})
MATCH (s1:Sensor {sensor_id: 'HEX_001'})
MATCH (s2:Sensor {sensor_id: 'HEX_002'})
MATCH (s3:Sensor {sensor_id: 'FIXED_001'})
CREATE (ms)-[:HAS_SENSOR]->(s1)
CREATE (ms)-[:HAS_SENSOR]->(s2)
CREATE (ms)-[:HAS_SENSOR]->(s3);

// Create spatial relationships between sensors and slope segments
MATCH (s1:Sensor {sensor_id: 'HEX_001'})
MATCH (ss1:SlopeSegment {segment_id: 'SLOPE_001'})
CREATE (s1)-[:MONITORS {distance_meters: 25.0, coverage_percentage: 0.8}]->(ss1);

MATCH (s2:Sensor {sensor_id: 'HEX_002'})
MATCH (ss2:SlopeSegment {segment_id: 'SLOPE_002'})
CREATE (s2)-[:MONITORS {distance_meters: 30.0, coverage_percentage: 0.75}]->(ss2);

MATCH (s3:Sensor {sensor_id: 'FIXED_001'})
MATCH (ss3:SlopeSegment {segment_id: 'SLOPE_003'})
CREATE (s3)-[:MONITORS {distance_meters: 15.0, coverage_percentage: 0.9}]->(ss3);

// Create sensor network topology
MATCH (s1:Sensor {sensor_id: 'HEX_001'})
MATCH (s2:Sensor {sensor_id: 'HEX_002'})
CREATE (s1)-[:COMMUNICATES_WITH {distance_meters: 150.0, signal_strength: -72.0, protocol: 'LoRaWAN'}]->(s2);

MATCH (s2:Sensor {sensor_id: 'HEX_002'})
MATCH (s3:Sensor {sensor_id: 'FIXED_001'})
CREATE (s2)-[:COMMUNICATES_WITH {distance_meters: 120.0, signal_strength: -68.0, protocol: 'LoRaWAN'}]->(s3);

// Create correlation relationships for spatial analysis
MATCH (s1:Sensor {sensor_id: 'HEX_001'})
MATCH (s2:Sensor {sensor_id: 'HEX_002'})
CREATE (s1)-[:SPATIALLY_CORRELATED {correlation_coefficient: 0.65, lag_minutes: 15}]->(s2);

// Create geological relationships
MATCH (ss1:SlopeSegment {segment_id: 'SLOPE_001'})
MATCH (ss2:SlopeSegment {segment_id: 'SLOPE_002'})
CREATE (ss1)-[:ADJACENT_TO {shared_boundary_length: 45.0, geological_continuity: 0.7}]->(ss2);

MATCH (ss2:SlopeSegment {segment_id: 'SLOPE_002'})
MATCH (ss3:SlopeSegment {segment_id: 'SLOPE_003'})
CREATE (ss2)-[:ADJACENT_TO {shared_boundary_length: 38.0, geological_continuity: 0.4}]->(ss3);

// Create risk propagation relationships
MATCH (ss1:SlopeSegment {segment_id: 'SLOPE_001'})
MATCH (ss2:SlopeSegment {segment_id: 'SLOPE_002'})
CREATE (ss1)-[:RISK_PROPAGATES_TO {propagation_probability: 0.3, time_delay_hours: 2.5}]->(ss2);

// Create hexapod deployment relationships
MATCH (h1:Hexapod {pod_id: 'MOBILE_HEX_001'})
MATCH (ss1:SlopeSegment {segment_id: 'SLOPE_001'})
MATCH (ss2:SlopeSegment {segment_id: 'SLOPE_002'})
CREATE (h1)-[:ASSIGNED_TO_INSPECT]->(ss1)
CREATE (h1)-[:ASSIGNED_TO_INSPECT]->(ss2);

// Create knowledge graph for geological features
CREATE (jf1:JointFamily {
    family_id: 'JF_001',
    orientation: 30.0,
    dip: 75.0,
    spacing: 2.5,
    persistence: 8.0,
    roughness: 'rough',
    infilling: 'clay',
    water_condition: 'dry'
});

CREATE (jf2:JointFamily {
    family_id: 'JF_002',
    orientation: 120.0,
    dip: 85.0,
    spacing: 1.8,
    persistence: 12.0,
    roughness: 'smooth',
    infilling: 'calcite',
    water_condition: 'damp'
});

// Link joint families to slope segments
MATCH (ss1:SlopeSegment {segment_id: 'SLOPE_001'})
MATCH (jf1:JointFamily {family_id: 'JF_001'})
MATCH (jf2:JointFamily {family_id: 'JF_002'})
CREATE (ss1)-[:HAS_JOINT_FAMILY {influence_factor: 0.8}]->(jf1)
CREATE (ss1)-[:HAS_JOINT_FAMILY {influence_factor: 0.6}]->(jf2);

// Create environmental factors
CREATE (wf1:WeatherFactor {
    factor_id: 'RAINFALL_INTENSITY',
    current_value: 15.5,
    threshold_low: 10.0,
    threshold_high: 50.0,
    impact_coefficient: 0.7,
    measurement_unit: 'mm/hour'
});

CREATE (wf2:WeatherFactor {
    factor_id: 'TEMPERATURE_VARIATION',
    current_value: 8.2,
    threshold_low: 5.0,
    threshold_high: 15.0,
    impact_coefficient: 0.4,
    measurement_unit: 'celsius/hour'
});

// Link weather factors to slope segments
MATCH (ss1:SlopeSegment {segment_id: 'SLOPE_001'})
MATCH (ss2:SlopeSegment {segment_id: 'SLOPE_002'})
MATCH (wf1:WeatherFactor {factor_id: 'RAINFALL_INTENSITY'})
MATCH (wf2:WeatherFactor {factor_id: 'TEMPERATURE_VARIATION'})
CREATE (wf1)-[:AFFECTS {impact_weight: 0.8}]->(ss1)
CREATE (wf1)-[:AFFECTS {impact_weight: 0.9}]->(ss2)
CREATE (wf2)-[:AFFECTS {impact_weight: 0.3}]->(ss1)
CREATE (wf2)-[:AFFECTS {impact_weight: 0.4}]->(ss2);

// Create operational constraints
CREATE (oc1:OperationalConstraint {
    constraint_id: 'HAUL_ROAD_001',
    constraint_type: 'transportation',
    location: point({latitude: -23.5508, longitude: -46.6338}),
    importance_level: 'critical',
    operational_hours: '06:00-18:00',
    max_risk_tolerance: 0.25
});

// Link operational constraints to slope segments
MATCH (ss1:SlopeSegment {segment_id: 'SLOPE_001'})
MATCH (ss2:SlopeSegment {segment_id: 'SLOPE_002'})
MATCH (oc1:OperationalConstraint {constraint_id: 'HAUL_ROAD_001'})
CREATE (ss1)-[:THREATENS {threat_level: 0.7, evacuation_time_minutes: 5}]->(oc1)
CREATE (ss2)-[:THREATENS {threat_level: 0.9, evacuation_time_minutes: 3}]->(oc1);