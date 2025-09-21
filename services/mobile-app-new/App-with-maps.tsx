import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import MapViewDirections from 'react-native-maps-directions';

const Tab = createBottomTabNavigator();

// Sample data
const sampleAlerts = [
  {
    id: '1',
    title: 'High Risk Zone Alert',
    description: 'Elevated rockfall risk detected in Sector A',
    severity: 'high',
    timestamp: '2 minutes ago',
    location: 'Sector A - North Face',
  },
  {
    id: '2',
    title: 'Sensor Maintenance Required',
    description: 'Sensor RS-001 requires calibration',
    severity: 'medium',
    timestamp: '15 minutes ago',
    location: 'Sensor Station 1',
  },
  {
    id: '3',
    title: 'Weather Alert',
    description: 'Heavy rainfall expected - increased risk',
    severity: 'medium',
    timestamp: '1 hour ago',
    location: 'All Sectors',
  },
  {
    id: '4',
    title: 'System Status',
    description: 'All sensors operational',
    severity: 'low',
    timestamp: '2 hours ago',
    location: 'System Wide',
  },
];

const sampleSensors = [
  {
    id: 1,
    name: 'RS-001',
    latitude: 40.7128,
    longitude: -74.006,
    status: 'active',
    type: 'Rockfall Detector',
    location: 'Sector A - North Face',
    lastReading: '2 min ago',
    batteryLevel: 85,
    signalStrength: 'Strong'
  },
  {
    id: 2,
    name: 'RS-002',
    latitude: 40.7138,
    longitude: -74.005,
    status: 'active',
    type: 'Vibration Monitor',
    location: 'Sector B - East Wall',
    lastReading: '1 min ago',
    batteryLevel: 92,
    signalStrength: 'Strong'
  },
  {
    id: 3,
    name: 'RS-003',
    latitude: 40.7118,
    longitude: -74.007,
    status: 'maintenance',
    type: 'Weather Station',
    location: 'Central Monitoring',
    lastReading: '45 min ago',
    batteryLevel: 23,
    signalStrength: 'Weak'
  },
  {
    id: 4,
    name: 'RS-004',
    latitude: 40.7108,
    longitude: -74.008,
    status: 'active',
    type: 'Seismic Monitor',
    location: 'Sector C - South Face',
    lastReading: '30 sec ago',
    batteryLevel: 78,
    signalStrength: 'Strong'
  },
  {
    id: 5,
    name: 'RS-005',
    latitude: 40.7148,
    longitude: -74.004,
    status: 'offline',
    type: 'Rockfall Detector',
    location: 'Sector D - West Wall',
    lastReading: '2 hours ago',
    batteryLevel: 0,
    signalStrength: 'None'
  },
];

// Dashboard Screen with Interactive Map
function DashboardScreen() {
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<typeof sampleSensors[0] | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        Alert.alert('Permission Denied', 'Location permission is required for navigation features.');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      // Fallback to NYC coordinates if location fails
      setUserLocation({
        latitude: 40.7128,
        longitude: -74.006,
      });
    }
  };

  const toggleMapType = () => {
    setMapType(mapType === 'standard' ? 'satellite' : 'standard');
  };

  const startNavigation = (sensor: typeof sampleSensors[0]) => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location services to use navigation.');
      return;
    }
    
    setSelectedSensor(sensor);
    setIsNavigating(true);
  };

  const stopNavigation = () => {
    setSelectedSensor(null);
    setIsNavigating(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>PRISM Dashboard</Text>
        <Text style={styles.dashboardSubtitle}>Mine Safety Monitoring System</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="shield-checkmark" size={32} color="#10b981" />
          <Text style={styles.statNumber}>3</Text>
          <Text style={styles.statLabel}>Active Sensors</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="warning" size={32} color="#f59e0b" />
          <Text style={styles.statNumber}>2</Text>
          <Text style={styles.statLabel}>Alerts</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="construct" size={32} color="#ef4444" />
          <Text style={styles.statNumber}>1</Text>
          <Text style={styles.statLabel}>Maintenance</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton} onPress={toggleMapType}>
            <Ionicons
              name={mapType === 'standard' ? 'satellite' : 'map'}
              size={20}
              color="#2563eb"
            />
            <Text style={styles.mapControlText}>
              {mapType === 'standard' ? 'Satellite' : 'Standard'}
            </Text>
          </TouchableOpacity>
          
          {isNavigating && (
            <TouchableOpacity 
              style={[styles.mapControlButton, styles.stopNavigationButton]} 
              onPress={stopNavigation}
            >
              <Ionicons name="stop" size={20} color="#ef4444" />
              <Text style={[styles.mapControlText, { color: '#ef4444' }]}>
                Stop
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <MapView
          style={styles.map}
          mapType={mapType}
          initialRegion={{
            latitude: userLocation?.latitude || 40.7128,
            longitude: userLocation?.longitude || -74.006,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={locationPermission}
          showsMyLocationButton={locationPermission}
          followsUserLocation={isNavigating}
        >
          {/* User Location Marker (if available) */}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              title="Your Location"
              description="Current position"
              pinColor="blue"
            />
          )}

          {/* Sensor Markers */}
          {sampleSensors.map((sensor) => (
            <Marker
              key={sensor.id}
              coordinate={{
                latitude: sensor.latitude,
                longitude: sensor.longitude,
              }}
              title={sensor.name}
              description={`Status: ${sensor.status} - Tap for navigation`}
              pinColor={sensor.status === 'active' ? 'green' : sensor.status === 'maintenance' ? 'orange' : 'red'}
              onCalloutPress={() => startNavigation(sensor)}
            />
          ))}

          {/* Navigation Route - Simple straight line */}
          {isNavigating && selectedSensor && userLocation && (
            <Polyline
              coordinates={[
                userLocation,
                {
                  latitude: selectedSensor.latitude,
                  longitude: selectedSensor.longitude,
                }
              ]}
              strokeColor="#2563eb"
              strokeWidth={4}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>

        {/* Navigation Info */}
        <View style={styles.navigationInfo}>
          {isNavigating && selectedSensor ? (
            <>
              <Ionicons name="navigate" size={16} color="white" />
              <Text style={styles.navigationInfoText}>
                Navigating to {selectedSensor.name}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="information-circle" size={16} color="#6b7280" />
              <Text style={styles.navigationInfoText}>
                {userLocation ? 'Tap sensor markers to start navigation' : 'Enable location for navigation'}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// Alerts Screen with real content
function AlertsScreen() {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return 'warning';
      case 'medium': return 'alert-circle';
      case 'low': return 'information-circle';
      default: return 'help-circle';
    }
  };

  const renderAlert = ({ item }: { item: typeof sampleAlerts[0] }) => (
    <TouchableOpacity style={styles.alertItem}>
      <View style={styles.alertHeader}>
        <Ionicons
          name={getSeverityIcon(item.severity) as keyof typeof Ionicons.glyphMap}
          size={24}
          color={getSeverityColor(item.severity)}
        />
        <View style={styles.alertInfo}>
          <Text style={styles.alertTitle}>{item.title}</Text>
          <Text style={styles.alertTimestamp}>{item.timestamp}</Text>
        </View>
      </View>
      <Text style={styles.alertDescription}>{item.description}</Text>
      <Text style={styles.alertLocation}>📍 {item.location}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sampleAlerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        style={styles.alertsList}
      />
    </View>
  );
}

function SensorsScreen() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'maintenance': return '#f59e0b';
      case 'offline': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'maintenance': return 'construct';
      case 'offline': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getBatteryIcon = (level: number) => {
    if (level > 75) return 'battery-full';
    if (level > 50) return 'battery-half';
    if (level > 25) return 'battery-dead';
    return 'battery-dead';
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return '#10b981';
    if (level > 25) return '#f59e0b';
    return '#ef4444';
  };

  const getSignalIcon = (strength: string) => {
    switch (strength) {
      case 'Strong': return 'wifi';
      case 'Weak': return 'wifi-outline';
      case 'None': return 'close-circle-outline';
      default: return 'wifi-outline';
    }
  };

  const renderSensor = ({ item }: { item: typeof sampleSensors[0] }) => (
    <TouchableOpacity style={styles.sensorItem}>
      <View style={styles.sensorHeader}>
        <View style={styles.sensorNameSection}>
          <Ionicons
            name={getStatusIcon(item.status) as keyof typeof Ionicons.glyphMap}
            size={24}
            color={getStatusColor(item.status)}
          />
          <View style={styles.sensorInfo}>
            <Text style={styles.sensorName}>{item.name}</Text>
            <Text style={styles.sensorType}>{item.type}</Text>
          </View>
        </View>
        <View style={styles.sensorStatus}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.sensorLocation}>📍 {item.location}</Text>

      <View style={styles.sensorMetrics}>
        <View style={styles.metric}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.metricText}>Last: {item.lastReading}</Text>
        </View>

        <View style={styles.metric}>
          <Ionicons
            name={getBatteryIcon(item.batteryLevel) as keyof typeof Ionicons.glyphMap}
            size={16}
            color={getBatteryColor(item.batteryLevel)}
          />
          <Text style={styles.metricText}>{item.batteryLevel}%</Text>
        </View>

        <View style={styles.metric}>
          <Ionicons
            name={getSignalIcon(item.signalStrength) as keyof typeof Ionicons.glyphMap}
            size={16}
            color={item.signalStrength === 'Strong' ? '#10b981' : item.signalStrength === 'Weak' ? '#f59e0b' : '#ef4444'}
          />
          <Text style={styles.metricText}>{item.signalStrength}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.sensorsSummary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {sampleSensors.filter(s => s.status === 'active').length}
          </Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: '#f59e0b' }]}>
            {sampleSensors.filter(s => s.status === 'maintenance').length}
          </Text>
          <Text style={styles.summaryLabel}>Maintenance</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: '#ef4444' }]}>
            {sampleSensors.filter(s => s.status === 'offline').length}
          </Text>
          <Text style={styles.summaryLabel}>Offline</Text>
        </View>
      </View>

      <FlatList
        data={sampleSensors}
        renderItem={renderSensor}
        keyExtractor={(item) => item.id.toString()}
        style={styles.sensorsList}
      />
    </View>
  );
}

function ProfileScreen() {
  const userInfo = {
    name: 'John Smith',
    role: 'Safety Engineer',
    department: 'Mine Operations',
    employeeId: 'EMP-2024-001',
    email: 'john.smith@prismmine.com',
    phone: '+1 (555) 123-4567',
    lastLogin: '2 hours ago',
  };

  const appInfo = {
    version: '1.0.0',
    buildNumber: '2024.1.15',
    lastSync: '5 minutes ago',
    dataUsage: '2.3 MB',
  };

  const ProfileItem = ({ icon, title, value, onPress }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    value: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity style={styles.profileItem} onPress={onPress}>
      <View style={styles.profileItemLeft}>
        <Ionicons name={icon} size={20} color="#6b7280" />
        <Text style={styles.profileItemTitle}>{title}</Text>
      </View>
      <View style={styles.profileItemRight}>
        <Text style={styles.profileItemValue}>{value}</Text>
        {onPress && <Ionicons name="chevron-forward" size={16} color="#6b7280" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* User Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#2563eb" />
        </View>
        <Text style={styles.userName}>{userInfo.name}</Text>
        <Text style={styles.userRole}>{userInfo.role}</Text>
        <Text style={styles.userDepartment}>{userInfo.department}</Text>
      </View>

      {/* User Information Section */}
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>User Information</Text>
        <ProfileItem icon="id-card-outline" title="Employee ID" value={userInfo.employeeId} />
        <ProfileItem icon="mail-outline" title="Email" value={userInfo.email} />
        <ProfileItem icon="call-outline" title="Phone" value={userInfo.phone} />
        <ProfileItem icon="time-outline" title="Last Login" value={userInfo.lastLogin} />
      </View>

      {/* App Information Section */}
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>App Information</Text>
        <ProfileItem icon="information-circle-outline" title="Version" value={appInfo.version} />
        <ProfileItem icon="build-outline" title="Build" value={appInfo.buildNumber} />
        <ProfileItem icon="sync-outline" title="Last Sync" value={appInfo.lastSync} />
        <ProfileItem icon="cloud-download-outline" title="Data Usage" value={appInfo.dataUsage} />
      </View>

      {/* Action Buttons */}
      <View style={styles.profileActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="settings-outline" size={20} color="#2563eb" />
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="help-circle-outline" size={20} color="#2563eb" />
          <Text style={styles.actionButtonText}>Help & Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.logoutButton]}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={[styles.actionButtonText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Dashboard') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Alerts') {
              iconName = focused ? 'warning' : 'warning-outline';
            } else if (route.name === 'Sensors') {
              iconName = focused ? 'radio' : 'radio-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: 'gray',
          headerStyle: {
            backgroundColor: '#1f2937',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Alerts" component={AlertsScreen} />
        <Tab.Screen name="Sensors" component={SensorsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Dashboard Styles
  dashboardHeader: {
    backgroundColor: '#1f2937',
    padding: 24,
    alignItems: 'center',
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    minWidth: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  mapControlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mapControlText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  navigationInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationInfoText: {
    marginLeft: 6,
    fontSize: 12,
    color: 'white',
  },
  stopNavigationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },

  alertsList: {
    flex: 1,
    padding: 16,
  },
  alertItem: {
    backgroundColor: '#f9fafb',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e5e7eb',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertInfo: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  alertDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  alertLocation: {
    fontSize: 12,
    color: '#6b7280',
  },
  // Sensors Screen Styles
  sensorsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9fafb',
    padding: 16,
    marginBottom: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  sensorsList: {
    flex: 1,
    padding: 16,
  },
  sensorItem: {
    backgroundColor: '#f9fafb',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e5e7eb',
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sensorNameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sensorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  sensorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sensorType: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  sensorStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sensorLocation: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  sensorMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  // Profile Screen Styles
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: '#2563eb',
    marginBottom: 2,
  },
  userDepartment: {
    fontSize: 14,
    color: '#6b7280',
  },
  profileSection: {
    backgroundColor: '#f9fafb',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileItemTitle: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 12,
  },
  profileItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileItemValue: {
    fontSize: 14,
    color: '#1f2937',
    marginRight: 8,
  },
  profileActions: {
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#2563eb',
    marginLeft: 12,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
  },
  logoutText: {
    color: '#ef4444',
  },
});
