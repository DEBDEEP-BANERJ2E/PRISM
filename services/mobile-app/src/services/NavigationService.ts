import * as Location from 'expo-location';
import { Linking, Alert, Platform } from 'react-native';
import { SpatialLocation } from '@/types';

export interface NavigationRoute {
  distance: number; // in meters
  duration: number; // in seconds
  bearing: number; // in degrees
  instructions: string[];
}

export class NavigationService {
  private static currentLocation: Location.LocationObject | null = null;
  private static watchId: Location.LocationSubscription | null = null;

  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return false;
      }

      // Request background location for continuous tracking
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        console.log('Background location permission denied');
        // Continue without background permission - foreground is sufficient for basic navigation
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  static async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Location permissions not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      this.currentLocation = location;
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  static async startLocationTracking(
    onLocationUpdate: (location: Location.LocationObject) => void
  ): Promise<void> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Location permissions not granted');
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          this.currentLocation = location;
          onLocationUpdate(location);
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  static stopLocationTracking(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  static calculateDistance(
    from: SpatialLocation,
    to: SpatialLocation
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  static calculateBearing(
    from: SpatialLocation,
    to: SpatialLocation
  ): number {
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    return ((θ * 180) / Math.PI + 360) % 360; // Bearing in degrees
  }

  static formatDistance(distance: number): string {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  }

  static formatBearing(bearing: number): string {
    const directions = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
    ];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  }

  static async navigateToLocation(
    destination: SpatialLocation,
    label?: string
  ): Promise<void> {
    const destinationLabel = label || 'Destination';
    
    Alert.alert(
      'Navigation Options',
      `Navigate to ${destinationLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use External App',
          onPress: () => this.openExternalNavigation(destination, destinationLabel),
        },
        {
          text: 'Use Built-in',
          onPress: () => this.startBuiltInNavigation(destination, destinationLabel),
        },
      ]
    );
  }

  private static async openExternalNavigation(
    destination: SpatialLocation,
    label: string
  ): Promise<void> {
    const { latitude, longitude } = destination;
    
    // Try different navigation apps based on platform
    const navigationOptions = [];

    if (Platform.OS === 'ios') {
      // Apple Maps
      navigationOptions.push({
        name: 'Apple Maps',
        url: `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
      });
    }

    // Google Maps (available on both platforms)
    navigationOptions.push({
      name: 'Google Maps',
      url: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`,
    });

    // Waze
    navigationOptions.push({
      name: 'Waze',
      url: `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
    });

    // Try to open the first available app
    for (const option of navigationOptions) {
      try {
        const canOpen = await Linking.canOpenURL(option.url);
        if (canOpen) {
          await Linking.openURL(option.url);
          return;
        }
      } catch (error) {
        console.error(`Error opening ${option.name}:`, error);
      }
    }

    // Fallback to basic maps URL
    const fallbackUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    try {
      await Linking.openURL(fallbackUrl);
    } catch (error) {
      Alert.alert('Error', 'Unable to open navigation app');
    }
  }

  private static async startBuiltInNavigation(
    destination: SpatialLocation,
    label: string
  ): Promise<void> {
    try {
      const currentLocation = await this.getCurrentLocation();
      if (!currentLocation) {
        Alert.alert('Error', 'Unable to get current location');
        return;
      }

      const currentSpatialLocation: SpatialLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        elevation: currentLocation.coords.altitude || 0,
        utm_x: 0,
        utm_y: 0,
        mine_grid_x: 0,
        mine_grid_y: 0,
      };

      const distance = this.calculateDistance(currentSpatialLocation, destination);
      const bearing = this.calculateBearing(currentSpatialLocation, destination);

      Alert.alert(
        'Navigation Info',
        `Distance to ${label}: ${this.formatDistance(distance)}\n` +
        `Direction: ${this.formatBearing(bearing)} (${Math.round(bearing)}°)\n\n` +
        'Use the compass and distance information to navigate to the destination.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error starting built-in navigation:', error);
      Alert.alert('Error', 'Unable to calculate navigation route');
    }
  }

  static async getNavigationRoute(
    from: SpatialLocation,
    to: SpatialLocation
  ): Promise<NavigationRoute> {
    const distance = this.calculateDistance(from, to);
    const bearing = this.calculateBearing(from, to);
    
    // Estimate duration (assuming walking speed of 5 km/h)
    const walkingSpeedKmh = 5;
    const duration = (distance / 1000) / walkingSpeedKmh * 3600; // seconds

    const instructions = [
      `Head ${this.formatBearing(bearing)} for ${this.formatDistance(distance)}`,
      'You will arrive at your destination',
    ];

    return {
      distance,
      duration,
      bearing,
      instructions,
    };
  }

  static isLocationNearDestination(
    current: SpatialLocation,
    destination: SpatialLocation,
    threshold: number = 50 // meters
  ): boolean {
    const distance = this.calculateDistance(current, destination);
    return distance <= threshold;
  }

  static async shareLocation(location: SpatialLocation, message?: string): Promise<void> {
    const { latitude, longitude } = location;
    const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    const shareMessage = message 
      ? `${message}\n\nLocation: ${locationUrl}`
      : `My location: ${locationUrl}`;

    try {
      // In a real app, you would use Expo.Sharing or react-native-share
      console.log('Sharing location:', shareMessage);
      Alert.alert('Share Location', shareMessage);
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Unable to share location');
    }
  }

  static convertCoordinates(location: SpatialLocation): {
    decimal: string;
    dms: string;
    utm: string;
    mineGrid: string;
  } {
    const { latitude, longitude, utm_x, utm_y, mine_grid_x, mine_grid_y } = location;

    // Decimal degrees
    const decimal = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

    // Degrees, minutes, seconds
    const latDMS = this.decimalToDMS(latitude, 'lat');
    const lonDMS = this.decimalToDMS(longitude, 'lon');
    const dms = `${latDMS}, ${lonDMS}`;

    // UTM coordinates
    const utm = `${utm_x.toFixed(2)}, ${utm_y.toFixed(2)}`;

    // Mine grid coordinates
    const mineGrid = `${mine_grid_x.toFixed(2)}, ${mine_grid_y.toFixed(2)}`;

    return { decimal, dms, utm, mineGrid };
  }

  private static decimalToDMS(decimal: number, type: 'lat' | 'lon'): string {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutes = Math.floor((absolute - degrees) * 60);
    const seconds = ((absolute - degrees - minutes / 60) * 3600).toFixed(2);

    const direction = type === 'lat' 
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'W');

    return `${degrees}°${minutes}'${seconds}"${direction}`;
  }
}