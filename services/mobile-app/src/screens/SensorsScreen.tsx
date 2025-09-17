import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useDataStore } from '@/store/dataStore';
import { Sensor } from '@/types';

export default function SensorsScreen() {
  const { sensors, isLoading, fetchData } = useDataStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#059669';
      case 'offline': return '#DC2626';
      case 'maintenance': return '#D97706';
      case 'error': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return 'radio';
      case 'offline': return 'radio-outline';
      case 'maintenance': return 'construct';
      case 'error': return 'warning';
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
    if (level > 50) return '#059669';
    if (level > 25) return '#D97706';
    return '#DC2626';
  };

  const renderSensor = ({ item }: { item: Sensor }) => (
    <TouchableOpacity
      style={styles.sensorCard}
      onPress={() => setSelectedSensor(item)}
    >
      <View style={styles.sensorHeader}>
        <Ionicons
          name={getStatusIcon(item.status)}
          size={24}
          color={getStatusColor(item.status)}
        />
        <View style={styles.sensorInfo}>
          <Text style={styles.sensorName}>{item.name}</Text>
          <Text style={styles.sensorType}>{item.type}</Text>
        </View>
        <View style={styles.sensorStats}>
          <View style={styles.batteryContainer}>
            <Ionicons
              name={getBatteryIcon(item.battery_level)}
              size={16}
              color={getBatteryColor(item.battery_level)}
            />
            <Text style={[styles.batteryText, { color: getBatteryColor(item.battery_level) }]}>
              {item.battery_level}%
            </Text>
          </View>
          <View style={styles.signalContainer}>
            <Ionicons
              name="wifi"
              size={16}
              color={item.signal_strength > 50 ? '#059669' : '#D97706'}
            />
            <Text style={styles.signalText}>{item.signal_strength}%</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.sensorDetails}>
        <Text style={styles.locationText}>
          {item.location.latitude.toFixed(6)}, {item.location.longitude.toFixed(6)}
        </Text>
        <Text style={styles.lastReadingText}>
          Last reading: {new Date(item.last_reading).toLocaleString()}
        </Text>
      </View>
      
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMapView = () => {
    if (sensors.length === 0) return null;

    const region = {
      latitude: sensors[0].location.latitude,
      longitude: sensors[0].location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    return (
      <MapView style={styles.map} initialRegion={region}>
        {sensors.map((sensor) => (
          <Marker
            key={sensor.id}
            coordinate={{
              latitude: sensor.location.latitude,
              longitude: sensor.location.longitude,
            }}
            title={sensor.name}
            description={`Status: ${sensor.status} | Battery: ${sensor.battery_level}%`}
            pinColor={getStatusColor(sensor.status)}
            onPress={() => setSelectedSensor(sensor)}
          />
        ))}
      </MapView>
    );
  };

  return (
    <View style={styles.container}>
      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={20} color={viewMode === 'list' ? 'white' : '#6B7280'} />
          <Text style={[styles.toggleText, viewMode === 'list' && styles.activeToggleText]}>
            List
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'map' && styles.activeToggle]}
          onPress={() => setViewMode('map')}
        >
          <Ionicons name="map" size={20} color={viewMode === 'map' ? 'white' : '#6B7280'} />
          <Text style={[styles.toggleText, viewMode === 'map' && styles.activeToggleText]}>
            Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'list' ? (
        <FlatList
          data={sensors}
          renderItem={renderSensor}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="radio-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No sensors found</Text>
            </View>
          }
        />
      ) : (
        renderMapView()
      )}

      {/* Sensor Detail Modal */}
      <Modal
        visible={selectedSensor !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedSensor && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedSensor(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Sensor Details</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.modalContent}>
              <View style={styles.sensorDetailHeader}>
                <Ionicons
                  name={getStatusIcon(selectedSensor.status)}
                  size={32}
                  color={getStatusColor(selectedSensor.status)}
                />
                <View style={styles.sensorDetailInfo}>
                  <Text style={styles.sensorDetailName}>
                    {selectedSensor.name}
                  </Text>
                  <Text style={styles.sensorDetailType}>
                    {selectedSensor.type}
                  </Text>
                </View>
              </View>

              <View style={styles.statusSection}>
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(selectedSensor.status) }]}>
                  <Text style={styles.statusIndicatorText}>
                    {selectedSensor.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsContainer}>
                <View style={styles.metricCard}>
                  <Ionicons
                    name={getBatteryIcon(selectedSensor.battery_level)}
                    size={24}
                    color={getBatteryColor(selectedSensor.battery_level)}
                  />
                  <Text style={styles.metricValue}>{selectedSensor.battery_level}%</Text>
                  <Text style={styles.metricLabel}>Battery</Text>
                </View>
                
                <View style={styles.metricCard}>
                  <Ionicons
                    name="wifi"
                    size={24}
                    color={selectedSensor.signal_strength > 50 ? '#059669' : '#D97706'}
                  />
                  <Text style={styles.metricValue}>{selectedSensor.signal_strength}%</Text>
                  <Text style={styles.metricLabel}>Signal</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  Latitude: {selectedSensor.location.latitude.toFixed(6)}
                </Text>
                <Text style={styles.detailValue}>
                  Longitude: {selectedSensor.location.longitude.toFixed(6)}
                </Text>
                <Text style={styles.detailValue}>
                  Elevation: {selectedSensor.location.elevation.toFixed(2)}m
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Installation</Text>
                <Text style={styles.detailValue}>
                  Installed: {new Date(selectedSensor.installation_date).toLocaleDateString()}
                </Text>
                {selectedSensor.maintenance_due && (
                  <Text style={styles.detailValue}>
                    Maintenance Due: {new Date(selectedSensor.maintenance_due).toLocaleDateString()}
                  </Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Last Reading</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedSensor.last_reading).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
  },
  activeToggle: {
    backgroundColor: '#3B82F6',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeToggleText: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  map: {
    flex: 1,
  },
  sensorCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sensorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sensorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sensorType: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  sensorStats: {
    alignItems: 'flex-end',
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  batteryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signalText: {
    fontSize: 12,
    color: '#6B7280',
  },
  sensorDetails: {
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  lastReadingText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  sensorDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sensorDetailInfo: {
    marginLeft: 16,
  },
  sensorDetailName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  sensorDetailType: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusIndicatorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  metricCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    minWidth: 80,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
});