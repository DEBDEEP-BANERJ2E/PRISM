# PRISM AI Pipeline - Data Requirements Specification

## Overview
This document outlines all data column requirements for the PRISM AI-powered rockfall prediction system. The data is organized by source type and includes specifications for data types, units, frequency, and quality requirements.

## 🏗️ **1. GEOLOGICAL & STRUCTURAL DATA**

### 1.1 Rock Mass Properties
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `rock_type` | String | - | Categorical | Primary rock type (granite, limestone, sandstone, etc.) | Static | Geological Survey |
| `rock_strength_ucs` | Float | MPa | 0.1-300 | Unconfined Compressive Strength | Static | Lab Testing |
| `rock_density` | Float | kg/m³ | 1500-3500 | Rock density | Static | Lab Testing |
| `porosity` | Float | % | 0-50 | Rock porosity percentage | Static | Lab Testing |
| `permeability` | Float | m/s | 1e-12 to 1e-3 | Hydraulic permeability | Static | Lab Testing |
| `joint_spacing` | Float | m | 0.01-10 | Average joint spacing | Static | Field Survey |
| `joint_orientation_dip` | Float | degrees | 0-90 | Joint dip angle | Static | Field Survey |
| `joint_orientation_strike` | Float | degrees | 0-360 | Joint strike direction | Static | Field Survey |
| `joint_roughness_jrc` | Integer | - | 0-20 | Joint Roughness Coefficient | Static | Field Survey |
| `joint_alteration_ja` | Float | - | 0.75-20 | Joint Alteration Number | Static | Field Survey |
| `rqd_value` | Float | % | 0-100 | Rock Quality Designation | Static | Core Logging |
| `gsm_rating` | Integer | - | 0-100 | Geological Strength Index | Static | Field Assessment |

### 1.2 Slope Geometry
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `slope_height` | Float | m | 1-500 | Total slope height | Static | Survey |
| `slope_angle` | Float | degrees | 10-90 | Overall slope angle | Static | Survey |
| `slope_aspect` | Float | degrees | 0-360 | Slope facing direction | Static | Survey |
| `bench_height` | Float | m | 5-30 | Individual bench height | Static | Survey |
| `bench_width` | Float | m | 3-50 | Bench width | Static | Survey |
| `berm_width` | Float | m | 2-20 | Safety berm width | Static | Survey |
| `catch_bench_spacing` | Float | m | 10-100 | Spacing between catch benches | Static | Survey |

## 📊 **2. SENSOR DATA (Real-time)**

### 2.1 Accelerometer/Seismic Data
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `sensor_id` | String | - | - | Unique sensor identifier | - | System |
| `timestamp` | DateTime | UTC | - | Measurement timestamp | 100Hz-1kHz | Accelerometer |
| `acceleration_x` | Float | m/s² | -50 to 50 | X-axis acceleration | 100Hz-1kHz | Accelerometer |
| `acceleration_y` | Float | m/s² | -50 to 50 | Y-axis acceleration | 100Hz-1kHz | Accelerometer |
| `acceleration_z` | Float | m/s² | -50 to 50 | Z-axis acceleration | 100Hz-1kHz | Accelerometer |
| `velocity_x` | Float | m/s | -10 to 10 | Integrated X velocity | 100Hz | Calculated |
| `velocity_y` | Float | m/s | -10 to 10 | Integrated Y velocity | 100Hz | Calculated |
| `velocity_z` | Float | m/s | -10 to 10 | Integrated Z velocity | 100Hz | Calculated |
| `displacement_x` | Float | mm | -1000 to 1000 | X displacement | 1Hz | Calculated |
| `displacement_y` | Float | mm | -1000 to 1000 | Y displacement | 1Hz | Calculated |
| `displacement_z` | Float | mm | -1000 to 1000 | Z displacement | 1Hz | Calculated |

### 2.2 Strain Gauge Data
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `strain_gauge_id` | String | - | - | Unique gauge identifier | - | System |
| `timestamp` | DateTime | UTC | - | Measurement timestamp | 10Hz | Strain Gauge |
| `strain_value` | Float | µε | -10000 to 10000 | Microstrain measurement | 10Hz | Strain Gauge |
| `stress_value` | Float | MPa | -100 to 100 | Calculated stress | 10Hz | Calculated |
| `temperature_compensation` | Float | °C | -40 to 80 | Temperature for compensation | 10Hz | Built-in Sensor |

### 2.3 Tiltmeter Data
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `tiltmeter_id` | String | - | - | Unique tiltmeter identifier | - | System |
| `timestamp` | DateTime | UTC | - | Measurement timestamp | 1Hz | Tiltmeter |
| `tilt_x` | Float | mrad | -100 to 100 | X-axis tilt | 1Hz | Tiltmeter |
| `tilt_y` | Float | mrad | -100 to 100 | Y-axis tilt | 1Hz | Tiltmeter |
| `temperature` | Float | °C | -40 to 80 | Internal temperature | 1Hz | Built-in Sensor |

### 2.4 Crack Monitoring
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `crack_monitor_id` | String | - | - | Unique monitor identifier | - | System |
| `timestamp` | DateTime | UTC | - | Measurement timestamp | 0.1Hz | Crack Monitor |
| `crack_width` | Float | mm | 0-100 | Crack opening width | 0.1Hz | LVDT/Optical |
| `crack_length` | Float | m | 0-50 | Visible crack length | Daily | Visual/Photogrammetry |
| `crack_depth` | Float | m | 0-10 | Estimated crack depth | Weekly | GPR/Ultrasonic |

## 🌤️ **3. ENVIRONMENTAL DATA**

### 3.1 Weather Station Data
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `weather_station_id` | String | - | - | Unique station identifier | - | System |
| `timestamp` | DateTime | UTC | - | Measurement timestamp | 10min | Weather Station |
| `temperature` | Float | °C | -50 to 60 | Air temperature | 10min | Temperature Sensor |
| `humidity` | Float | % | 0-100 | Relative humidity | 10min | Humidity Sensor |
| `pressure` | Float | hPa | 800-1100 | Atmospheric pressure | 10min | Barometer |
| `wind_speed` | Float | m/s | 0-50 | Wind speed | 10min | Anemometer |
| `wind_direction` | Float | degrees | 0-360 | Wind direction | 10min | Wind Vane |
| `precipitation` | Float | mm | 0-200 | Rainfall amount | 10min | Rain Gauge |
| `solar_radiation` | Float | W/m² | 0-1500 | Solar irradiance | 10min | Pyranometer |
| `uv_index` | Float | - | 0-15 | UV radiation index | 10min | UV Sensor |

### 3.2 Hydrological Data
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `piezometer_id` | String | - | - | Unique piezometer identifier | - | System |
| `timestamp` | DateTime | UTC | - | Measurement timestamp | 1hr | Piezometer |
| `water_level` | Float | m | 0-100 | Groundwater level | 1hr | Pressure Transducer |
| `pore_pressure` | Float | kPa | 0-1000 | Pore water pressure | 1hr | Piezometer |
| `flow_rate` | Float | L/s | 0-1000 | Water flow rate | 1hr | Flow Meter |
| `water_temperature` | Float | °C | 0-30 | Water temperature | 1hr | Temperature Probe |

## 🛰️ **4. REMOTE SENSING DATA**

### 4.1 LiDAR Data
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `scan_id` | String | - | - | Unique scan identifier | - | System |
| `timestamp` | DateTime | UTC | - | Scan timestamp | Weekly/Monthly | LiDAR |
| `point_x` | Float | m | Site-specific | X coordinate | Per scan | LiDAR |
| `point_y` | Float | m | Site-specific | Y coordinate | Per scan | LiDAR |
| `point_z` | Float | m | Site-specific | Z elevation | Per scan | LiDAR |
| `intensity` | Integer | - | 0-65535 | Return intensity | Per scan | LiDAR |
| `classification` | Integer | - | 1-18 | Point classification | Per scan | Processing |
| `surface_change` | Float | mm | -1000 to 1000 | Change from baseline | Per scan | Analysis |

### 4.2 Photogrammetry Data
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `image_id` | String | - | - | Unique image identifier | - | System |
| `timestamp` | DateTime | UTC | - | Image capture time | Daily | Camera |
| `camera_position_x` | Float | m | Site-specific | Camera X position | Per image | GPS/Survey |
| `camera_position_y` | Float | m | Site-specific | Camera Y position | Per image | GPS/Survey |
| `camera_position_z` | Float | m | Site-specific | Camera Z position | Per image | GPS/Survey |
| `camera_orientation_roll` | Float | degrees | -180 to 180 | Camera roll angle | Per image | IMU |
| `camera_orientation_pitch` | Float | degrees | -90 to 90 | Camera pitch angle | Per image | IMU |
| `camera_orientation_yaw` | Float | degrees | -180 to 180 | Camera yaw angle | Per image | IMU |
| `image_quality_score` | Float | - | 0-1 | Image quality metric | Per image | Analysis |

### 4.3 Satellite Data
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `satellite_id` | String | - | - | Satellite identifier | - | System |
| `timestamp` | DateTime | UTC | - | Image acquisition time | Weekly | Satellite |
| `pixel_x` | Integer | - | 0-10000 | Pixel X coordinate | Per image | Satellite |
| `pixel_y` | Integer | - | 0-10000 | Pixel Y coordinate | Per image | Satellite |
| `band_1_blue` | Integer | - | 0-65535 | Blue band reflectance | Per image | Satellite |
| `band_2_green` | Integer | - | 0-65535 | Green band reflectance | Per image | Satellite |
| `band_3_red` | Integer | - | 0-65535 | Red band reflectance | Per image | Satellite |
| `band_4_nir` | Integer | - | 0-65535 | Near-infrared reflectance | Per image | Satellite |
| `ndvi` | Float | - | -1 to 1 | Normalized Difference Vegetation Index | Per image | Calculated |

## ⚡ **5. OPERATIONAL DATA**

### 5.1 Blasting Data
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `blast_id` | String | - | - | Unique blast identifier | - | System |
| `timestamp` | DateTime | UTC | - | Blast execution time | Per blast | Operations |
| `blast_location_x` | Float | m | Site-specific | Blast X coordinate | Per blast | Survey |
| `blast_location_y` | Float | m | Site-specific | Blast Y coordinate | Per blast | Survey |
| `blast_location_z` | Float | m | Site-specific | Blast elevation | Per blast | Survey |
| `explosive_type` | String | - | Categorical | Type of explosive used | Per blast | Operations |
| `explosive_weight` | Float | kg | 0-10000 | Total explosive weight | Per blast | Operations |
| `hole_count` | Integer | - | 1-500 | Number of blast holes | Per blast | Operations |
| `hole_diameter` | Float | mm | 50-500 | Blast hole diameter | Per blast | Operations |
| `hole_depth` | Float | m | 1-50 | Average hole depth | Per blast | Operations |
| `burden_distance` | Float | m | 1-20 | Burden distance | Per blast | Operations |
| `spacing_distance` | Float | m | 1-20 | Hole spacing | Per blast | Operations |
| `delay_timing` | Integer | ms | 0-10000 | Delay sequence timing | Per blast | Operations |

### 5.2 Equipment Data
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `equipment_id` | String | - | - | Unique equipment identifier | - | System |
| `timestamp` | DateTime | UTC | - | Data timestamp | 1min | Telematics |
| `equipment_type` | String | - | Categorical | Equipment type (excavator, truck, etc.) | Static | System |
| `location_x` | Float | m | Site-specific | Equipment X position | 1min | GPS |
| `location_y` | Float | m | Site-specific | Equipment Y position | 1min | GPS |
| `location_z` | Float | m | Site-specific | Equipment elevation | 1min | GPS |
| `engine_hours` | Float | hours | 0-50000 | Total engine hours | 1min | Telematics |
| `fuel_consumption` | Float | L/hr | 0-500 | Fuel consumption rate | 1min | Telematics |
| `load_weight` | Float | tonnes | 0-400 | Current load weight | 1min | Load Cells |
| `vibration_level` | Float | m/s² | 0-50 | Equipment vibration | 1min | Accelerometer |

## 🎯 **6. HISTORICAL INCIDENT DATA**

### 6.1 Rockfall Events
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `incident_id` | String | - | - | Unique incident identifier | - | System |
| `timestamp` | DateTime | UTC | - | Incident occurrence time | Per incident | Observation |
| `location_x` | Float | m | Site-specific | Incident X coordinate | Per incident | Survey |
| `location_y` | Float | m | Site-specific | Incident Y coordinate | Per incident | Survey |
| `location_z` | Float | m | Site-specific | Incident elevation | Per incident | Survey |
| `volume_estimate` | Float | m³ | 0.001-10000 | Estimated rockfall volume | Per incident | Assessment |
| `severity_level` | Integer | - | 1-5 | Incident severity (1=minor, 5=major) | Per incident | Assessment |
| `trigger_mechanism` | String | - | Categorical | Primary trigger (weather, blasting, etc.) | Per incident | Investigation |
| `damage_cost` | Float | USD | 0-10000000 | Associated damage cost | Per incident | Finance |
| `downtime_hours` | Float | hours | 0-1000 | Operational downtime | Per incident | Operations |
| `injuries_count` | Integer | - | 0-50 | Number of injuries | Per incident | Safety |
| `fatalities_count` | Integer | - | 0-10 | Number of fatalities | Per incident | Safety |

## 🔬 **7. LABORATORY TEST DATA**

### 7.1 Material Properties
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `sample_id` | String | - | - | Unique sample identifier | - | System |
| `collection_date` | Date | - | - | Sample collection date | Per sample | Field |
| `location_x` | Float | m | Site-specific | Sample X coordinate | Per sample | Survey |
| `location_y` | Float | m | Site-specific | Sample Y coordinate | Per sample | Survey |
| `location_z` | Float | m | Site-specific | Sample elevation | Per sample | Survey |
| `ucs_strength` | Float | MPa | 0.1-300 | Unconfined compressive strength | Per sample | Lab |
| `tensile_strength` | Float | MPa | 0.01-30 | Tensile strength | Per sample | Lab |
| `cohesion` | Float | kPa | 0-10000 | Cohesion parameter | Per sample | Lab |
| `friction_angle` | Float | degrees | 10-60 | Internal friction angle | Per sample | Lab |
| `elastic_modulus` | Float | GPa | 0.1-100 | Young's modulus | Per sample | Lab |
| `poisson_ratio` | Float | - | 0.1-0.5 | Poisson's ratio | Per sample | Lab |

## 📍 **8. SPATIAL REFERENCE DATA**

### 8.1 Coordinate System
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `coordinate_system` | String | - | - | Spatial reference system (e.g., UTM Zone 33N) | Static | Survey |
| `datum` | String | - | - | Geodetic datum (e.g., WGS84) | Static | Survey |
| `elevation_datum` | String | - | - | Vertical datum (e.g., MSL) | Static | Survey |
| `site_boundary_x` | Float | m | Site-specific | Site boundary X coordinates | Static | Survey |
| `site_boundary_y` | Float | m | Site-specific | Site boundary Y coordinates | Static | Survey |

## 🔧 **9. SYSTEM METADATA**

### 9.1 Data Quality Indicators
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `data_quality_score` | Float | - | 0-1 | Overall data quality score | Per record | System |
| `completeness_score` | Float | - | 0-1 | Data completeness percentage | Per record | System |
| `accuracy_score` | Float | - | 0-1 | Data accuracy assessment | Per record | System |
| `timeliness_score` | Float | - | 0-1 | Data timeliness score | Per record | System |
| `sensor_health_status` | String | - | Categorical | Sensor operational status | Per record | System |
| `calibration_date` | Date | - | - | Last calibration date | Per sensor | Maintenance |
| `battery_level` | Float | % | 0-100 | Sensor battery level | Per record | System |
| `signal_strength` | Float | dBm | -120 to 0 | Communication signal strength | Per record | System |

## 📊 **10. DERIVED/CALCULATED FEATURES**

### 10.1 Risk Indicators
| Column Name | Data Type | Unit | Range | Description | Frequency | Source |
|-------------|-----------|------|-------|-------------|-----------|---------|
| `stability_factor` | Float | - | 0-10 | Calculated stability factor | Real-time | AI Model |
| `failure_probability` | Float | - | 0-1 | Probability of failure | Real-time | AI Model |
| `risk_level` | Integer | - | 1-5 | Categorical risk level | Real-time | AI Model |
| `time_to_failure` | Float | hours | 0-8760 | Estimated time to failure | Real-time | AI Model |
| `confidence_interval` | Float | - | 0-1 | Prediction confidence | Real-time | AI Model |

## 📋 **DATA COLLECTION PRIORITIES**

### **Critical (Must Have)**
1. **Sensor Data**: Accelerometer, strain gauge, tiltmeter readings
2. **Weather Data**: Temperature, precipitation, wind
3. **Geological Data**: Rock properties, joint characteristics
4. **Historical Incidents**: Past rockfall events and triggers

### **Important (Should Have)**
1. **LiDAR/Photogrammetry**: Surface change detection
2. **Hydrological Data**: Groundwater levels, pore pressure
3. **Operational Data**: Blasting records, equipment locations

### **Nice to Have (Could Have)**
1. **Satellite Data**: Regional monitoring
2. **Advanced Lab Tests**: Detailed material properties
3. **Equipment Telematics**: Detailed operational data

## 🔄 **DATA FLOW REQUIREMENTS**

### **Real-time Streams** (< 1 second latency)
- Accelerometer data (100Hz-1kHz)
- Critical alert triggers
- System health monitoring

### **Near Real-time** (1-60 seconds)
- Strain gauge data (10Hz)
- Tiltmeter data (1Hz)
- Weather station data (10min)

### **Batch Processing** (Hourly/Daily)
- LiDAR scans
- Photogrammetry analysis
- Historical data aggregation
- Model training updates

## 📏 **DATA QUALITY STANDARDS**

### **Accuracy Requirements**
- Displacement measurements: ±0.1mm
- Temperature: ±0.5°C
- Pressure: ±0.1%
- GPS coordinates: ±1m

### **Completeness Requirements**
- Critical sensors: >99% uptime
- Weather data: >95% completeness
- Historical records: 100% for incidents

### **Timeliness Requirements**
- Emergency alerts: <5 seconds
- Risk updates: <1 minute
- Routine monitoring: <10 minutes

This comprehensive data specification provides the foundation for building a robust AI pipeline that can accurately predict rockfall events and ensure mining safety.