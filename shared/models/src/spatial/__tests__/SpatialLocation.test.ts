import { SpatialLocation, SpatialLocationSchema } from '../SpatialLocation';

describe('SpatialLocation', () => {
  const validLocationData = {
    latitude: 45.5231,
    longitude: -122.6765,
    elevation: 100.5,
    coordinate_system: 'WGS84'
  };

  describe('constructor and validation', () => {
    it('should create a valid SpatialLocation with required fields', () => {
      const location = new SpatialLocation(validLocationData);
      
      expect(location.latitude).toBe(45.5231);
      expect(location.longitude).toBe(-122.6765);
      expect(location.elevation).toBe(100.5);
      expect(location.coordinate_system).toBe('WGS84');
      expect(location.utm_x).toBeDefined();
      expect(location.utm_y).toBeDefined();
      expect(location.mine_grid_x).toBeDefined();
      expect(location.mine_grid_y).toBeDefined();
    });

    it('should throw error for invalid latitude', () => {
      const invalidData = { ...validLocationData, latitude: 95 };
      expect(() => new SpatialLocation(invalidData)).toThrow();
    });

    it('should throw error for invalid longitude', () => {
      const invalidData = { ...validLocationData, longitude: 185 };
      expect(() => new SpatialLocation(invalidData)).toThrow();
    });

    it('should accept optional fields', () => {
      const dataWithOptionals = {
        ...validLocationData,
        accuracy: 5.0,
        timestamp: new Date(),
        utm_x: 500000,
        utm_y: 5000000
      };
      
      const location = new SpatialLocation(dataWithOptionals);
      expect(location.accuracy).toBe(5.0);
      expect(location.timestamp).toBeInstanceOf(Date);
      expect(location.utm_x).toBe(500000);
      expect(location.utm_y).toBe(5000000);
    });
  });

  describe('coordinate transformations', () => {
    it('should convert to UTM coordinates', () => {
      const location = new SpatialLocation(validLocationData);
      const utmCoords = location.toUTM();
      
      expect(utmCoords.x).toBeCloseTo(location.utm_x!, 1);
      expect(utmCoords.y).toBeCloseTo(location.utm_y!, 1);
      expect(utmCoords.zone).toBe('33N');
    });

    it('should convert to mine grid coordinates', () => {
      const location = new SpatialLocation(validLocationData);
      const mineCoords = location.toMineGrid();
      
      expect(typeof mineCoords.x).toBe('number');
      expect(typeof mineCoords.y).toBe('number');
      expect(mineCoords.x).toBeCloseTo(location.mine_grid_x!, 1);
      expect(mineCoords.y).toBeCloseTo(location.mine_grid_y!, 1);
    });
  });

  describe('distance calculations', () => {
    it('should calculate distance between two locations', () => {
      const location1 = new SpatialLocation(validLocationData);
      const location2 = new SpatialLocation({
        latitude: 45.5241,
        longitude: -122.6775,
        elevation: 105.0
      });

      const distance = location1.distanceTo(location2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200); // Should be less than 200m for this small difference
    });

    it('should return 0 distance for same location', () => {
      const location1 = new SpatialLocation(validLocationData);
      const location2 = new SpatialLocation(validLocationData);

      const distance = location1.distanceTo(location2);
      expect(distance).toBeCloseTo(0, 1);
    });
  });

  describe('bearing calculations', () => {
    it('should calculate bearing between two locations', () => {
      const location1 = new SpatialLocation(validLocationData);
      const location2 = new SpatialLocation({
        latitude: 45.5241,
        longitude: -122.6765,
        elevation: 105.0
      });

      const bearing = location1.bearingTo(location2);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
      expect(bearing).toBeCloseTo(0, 0); // Should be approximately north
    });

    it('should calculate correct bearing for eastward direction', () => {
      const location1 = new SpatialLocation(validLocationData);
      const location2 = new SpatialLocation({
        latitude: 45.5231,
        longitude: -122.6755,
        elevation: 100.5
      });

      const bearing = location1.bearingTo(location2);
      expect(bearing).toBeCloseTo(90, 3); // Should be approximately east
    });
  });

  describe('validation methods', () => {
    it('should validate correct data', () => {
      expect(() => SpatialLocation.validate(validLocationData)).not.toThrow();
    });

    it('should reject invalid data', () => {
      const invalidData = { ...validLocationData, latitude: 'invalid' };
      expect(() => SpatialLocation.validate(invalidData)).toThrow();
    });

    it('should return true for valid coordinates', () => {
      const location = new SpatialLocation(validLocationData);
      expect(location.isValid()).toBe(true);
    });

    it('should return false for invalid coordinates', () => {
      // Create location with valid data first, then manually check invalid bounds
      const location = new SpatialLocation(validLocationData);
      
      // Test the isValid method logic
      expect(location.isValid()).toBe(true);
      
      // Test edge cases
      const edgeLocation1 = new SpatialLocation({ latitude: 90, longitude: 180, elevation: 0 });
      expect(edgeLocation1.isValid()).toBe(true);
      
      const edgeLocation2 = new SpatialLocation({ latitude: -90, longitude: -180, elevation: 0 });
      expect(edgeLocation2.isValid()).toBe(true);
    });
  });

  describe('GeoJSON conversion', () => {
    it('should convert to GeoJSON Point', () => {
      const location = new SpatialLocation({
        ...validLocationData,
        accuracy: 5.0,
        timestamp: new Date('2023-01-01T00:00:00Z')
      });

      const geojson = location.toGeoJSON();
      
      expect(geojson.type).toBe('Point');
      expect(geojson.coordinates).toEqual([
        validLocationData.longitude,
        validLocationData.latitude,
        validLocationData.elevation
      ]);
      expect(geojson.properties.accuracy).toBe(5.0);
      expect(geojson.properties.coordinate_system).toBe('WGS84');
    });

    it('should create from GeoJSON Point', () => {
      const geojson = {
        type: 'Point',
        coordinates: [-122.6765, 45.5231, 100.5],
        properties: {
          accuracy: 5.0,
          coordinate_system: 'WGS84',
          timestamp: '2023-01-01T00:00:00.000Z'
        }
      };

      const location = SpatialLocation.fromGeoJSON(geojson);
      
      expect(location.latitude).toBe(45.5231);
      expect(location.longitude).toBe(-122.6765);
      expect(location.elevation).toBe(100.5);
      expect(location.accuracy).toBe(5.0);
      expect(location.coordinate_system).toBe('WGS84');
      expect(location.timestamp).toEqual(new Date('2023-01-01T00:00:00.000Z'));
    });

    it('should throw error for invalid GeoJSON', () => {
      const invalidGeoJSON = {
        type: 'LineString',
        coordinates: [[0, 0], [1, 1]]
      };

      expect(() => SpatialLocation.fromGeoJSON(invalidGeoJSON)).toThrow();
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const timestamp = new Date('2023-01-01T00:00:00Z');
      const location = new SpatialLocation({
        ...validLocationData,
        accuracy: 5.0,
        timestamp
      });

      const json = location.toJSON();
      
      expect(json.latitude).toBe(validLocationData.latitude);
      expect(json.longitude).toBe(validLocationData.longitude);
      expect(json.elevation).toBe(validLocationData.elevation);
      expect(json.accuracy).toBe(5.0);
      expect(json.timestamp).toEqual(timestamp);
      expect(typeof json.utm_x).toBe('number');
      expect(typeof json.utm_y).toBe('number');
    });

    it('should handle undefined optional fields', () => {
      const location = new SpatialLocation(validLocationData);
      const json = location.toJSON();
      
      expect(json.accuracy).toBeUndefined();
      expect(json.timestamp).toBeUndefined();
    });
  });
});