import * as Location from 'expo-location';
import { Linking, Alert } from 'react-native';
import { NavigationService } from '@/services/NavigationService';
import { SpatialLocation } from '@/types';

// Mock Expo Location
jest.mock('expo-location');
const mockLocation = Location as jest.Mocked<typeof Location>;

// Mock React Native modules
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

const mockLinking = Linking as jest.Mocked<typeof Linking>;
const mockAlert = Alert as jest.Mocked<typeof Alert>;

const mockSpatialLocation1: SpatialLocation = {
  latitude: 37.7749,
  longitude: -122.4194,
  elevation: 100,
  utm_x: 0,
  utm_y: 0,
  mine_grid_x: 0,
  mine_grid_y: 0,
};

const mockSpatialLocation2: SpatialLocation = {
  latitude: 37.7849,
  longitude: -122.4094,
  elevation: 120,
  utm_x: 0,
  utm_y: 0,
  mine_grid_x: 0,
  mine_grid_y: 0,
};

describe('NavigationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermissions', () => {
    it('should request and return permission status', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockLocation.requestBackgroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      const result = await NavigationService.requestPermissions();

      expect(result).toBe(true);
      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(mockLocation.requestBackgroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false if foreground permissions are denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      const result = await NavigationService.requestPermissions();

      expect(result).toBe(false);
    });

    it('should continue without background permissions', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockLocation.requestBackgroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      const result = await NavigationService.requestPermissions();

      expect(result).toBe(true); // Should still return true for foreground permission
    });
  });

  describe('getCurrentLocation', () => {
    it('should get current location successfully', async () => {
      const mockLocationObject = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 100,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      };

      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockLocation.getCurrentPositionAsync.mockResolvedValue(mockLocationObject);

      const result = await NavigationService.getCurrentLocation();

      expect(result).toEqual(mockLocationObject);
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.High,
      });
    });

    it('should return null if permissions are denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      const result = await NavigationService.getCurrentLocation();

      expect(result).toBeNull();
      expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      const distance = NavigationService.calculateDistance(
        mockSpatialLocation1,
        mockSpatialLocation2
      );

      // Expected distance is approximately 1.57 km
      expect(distance).toBeGreaterThan(1500);
      expect(distance).toBeLessThan(1600);
    });

    it('should return 0 for same location', () => {
      const distance = NavigationService.calculateDistance(
        mockSpatialLocation1,
        mockSpatialLocation1
      );

      expect(distance).toBe(0);
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing between two points correctly', () => {
      const bearing = NavigationService.calculateBearing(
        mockSpatialLocation1,
        mockSpatialLocation2
      );

      // Should be roughly northeast (around 45 degrees)
      expect(bearing).toBeGreaterThan(30);
      expect(bearing).toBeLessThan(60);
    });

    it('should return 0 for same location', () => {
      const bearing = NavigationService.calculateBearing(
        mockSpatialLocation1,
        mockSpatialLocation1
      );

      expect(bearing).toBe(0);
    });
  });

  describe('formatDistance', () => {
    it('should format distance in meters for short distances', () => {
      expect(NavigationService.formatDistance(500)).toBe('500m');
      expect(NavigationService.formatDistance(999)).toBe('999m');
    });

    it('should format distance in kilometers for long distances', () => {
      expect(NavigationService.formatDistance(1000)).toBe('1.0km');
      expect(NavigationService.formatDistance(1500)).toBe('1.5km');
      expect(NavigationService.formatDistance(2500)).toBe('2.5km');
    });
  });

  describe('formatBearing', () => {
    it('should format bearing as compass directions', () => {
      expect(NavigationService.formatBearing(0)).toBe('N');
      expect(NavigationService.formatBearing(45)).toBe('NE');
      expect(NavigationService.formatBearing(90)).toBe('E');
      expect(NavigationService.formatBearing(135)).toBe('SE');
      expect(NavigationService.formatBearing(180)).toBe('S');
      expect(NavigationService.formatBearing(225)).toBe('SW');
      expect(NavigationService.formatBearing(270)).toBe('W');
      expect(NavigationService.formatBearing(315)).toBe('NW');
    });

    it('should handle bearing values over 360', () => {
      expect(NavigationService.formatBearing(405)).toBe('NE'); // 405 % 360 = 45
    });
  });

  describe('navigateToLocation', () => {
    it('should show navigation options alert', async () => {
      await NavigationService.navigateToLocation(mockSpatialLocation1, 'Test Location');

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Navigation Options',
        'Navigate to Test Location?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Use External App' }),
          expect.objectContaining({ text: 'Use Built-in' }),
        ])
      );
    });

    it('should use default label when none provided', async () => {
      await NavigationService.navigateToLocation(mockSpatialLocation1);

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Navigation Options',
        'Navigate to Destination?',
        expect.any(Array)
      );
    });
  });

  describe('getNavigationRoute', () => {
    it('should return navigation route with correct calculations', async () => {
      const route = await NavigationService.getNavigationRoute(
        mockSpatialLocation1,
        mockSpatialLocation2
      );

      expect(route.distance).toBeGreaterThan(1500);
      expect(route.distance).toBeLessThan(1600);
      expect(route.bearing).toBeGreaterThan(30);
      expect(route.bearing).toBeLessThan(60);
      expect(route.duration).toBeGreaterThan(1000); // Should be over 1000 seconds
      expect(route.instructions).toHaveLength(2);
      expect(route.instructions[0]).toContain('Head');
      expect(route.instructions[1]).toContain('arrive');
    });
  });

  describe('isLocationNearDestination', () => {
    it('should return true when within threshold', () => {
      const nearLocation: SpatialLocation = {
        ...mockSpatialLocation1,
        latitude: mockSpatialLocation1.latitude + 0.0001, // Very close
      };

      const result = NavigationService.isLocationNearDestination(
        mockSpatialLocation1,
        nearLocation,
        50 // 50 meter threshold
      );

      expect(result).toBe(true);
    });

    it('should return false when outside threshold', () => {
      const result = NavigationService.isLocationNearDestination(
        mockSpatialLocation1,
        mockSpatialLocation2,
        50 // 50 meter threshold
      );

      expect(result).toBe(false);
    });
  });

  describe('convertCoordinates', () => {
    it('should convert coordinates to different formats', () => {
      const result = NavigationService.convertCoordinates(mockSpatialLocation1);

      expect(result.decimal).toBe('37.774900, -122.419400');
      expect(result.dms).toContain('37°46\'29.64"N');
      expect(result.dms).toContain('122°25\'9.84"W');
      expect(result.utm).toBe('0.00, 0.00');
      expect(result.mineGrid).toBe('0.00, 0.00');
    });
  });

  describe('startLocationTracking', () => {
    it('should start location tracking with callback', async () => {
      const mockCallback = jest.fn();
      const mockSubscription = { remove: jest.fn() };

      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockLocation.watchPositionAsync.mockResolvedValue(mockSubscription as any);

      await NavigationService.startLocationTracking(mockCallback);

      expect(mockLocation.watchPositionAsync).toHaveBeenCalledWith(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        expect.any(Function)
      );
    });

    it('should throw error if permissions are denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      await expect(
        NavigationService.startLocationTracking(jest.fn())
      ).rejects.toThrow('Location permissions not granted');
    });
  });

  describe('stopLocationTracking', () => {
    it('should stop location tracking', () => {
      const mockSubscription = { remove: jest.fn() };
      
      // Simulate active tracking
      (NavigationService as any).watchId = mockSubscription;
      
      NavigationService.stopLocationTracking();

      expect(mockSubscription.remove).toHaveBeenCalled();
    });

    it('should handle no active tracking gracefully', () => {
      // Should not throw error when no tracking is active
      expect(() => NavigationService.stopLocationTracking()).not.toThrow();
    });
  });
});