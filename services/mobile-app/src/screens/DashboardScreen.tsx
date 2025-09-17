import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/dataStore';
import { Alert, RiskAssessment } from '@/types';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const {
    alerts,
    sensors,
    riskAssessments,
    isOnline,
    lastSync,
    isLoading,
    fetchData,
  } = useDataStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getActiveAlerts = () => {
    return alerts.filter(alert => !alert.acknowledged);
  };

  const getOnlineSensors = () => {
    return sensors.filter(sensor => sensor.status === 'online');
  };

  const getCurrentRiskLevel = () => {
    if (riskAssessments.length === 0) return 'low';
    
    const latest = riskAssessments.reduce((latest, current) => 
      new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
    );

    if (latest.risk_probability > 0.75) return 'critical';
    if (latest.risk_probability > 0.5) return 'high';
    if (latest.risk_probability > 0.25) return 'medium';
    return 'low';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#D97706';
      case 'low': return '#059669';
      default: return '#6B7280';
    }
  };

  const activeAlerts = getActiveAlerts();
  const onlineSensors = getOnlineSensors();
  const currentRiskLevel = getCurrentRiskLevel();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Connection Status */}
      <View style={[styles.statusBar, { backgroundColor: isOnline ? '#059669' : '#DC2626' }]}>
        <Ionicons 
          name={isOnline ? 'wifi' : 'wifi-outline'} 
          size={16} 
          color="white" 
        />
        <Text style={styles.statusText}>
          {isOnline ? 'Online' : 'Offline'} • Last sync: {
            lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'
          }
        </Text>
      </View>

      {/* Risk Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Risk Level</Text>
        <View style={[styles.riskCard, { borderLeftColor: getRiskColor(currentRiskLevel) }]}>
          <View style={styles.riskHeader}>
            <Ionicons 
              name="warning" 
              size={24} 
              color={getRiskColor(currentRiskLevel)} 
            />
            <Text style={[styles.riskLevel, { color: getRiskColor(currentRiskLevel) }]}>
              {currentRiskLevel.toUpperCase()}
            </Text>
          </View>
          {riskAssessments.length > 0 && (
            <Text style={styles.riskProbability}>
              Risk Probability: {(riskAssessments[0]?.risk_probability * 100).toFixed(1)}%
            </Text>
          )}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="warning-outline" size={24} color="#EA580C" />
            <Text style={styles.statNumber}>{activeAlerts.length}</Text>
            <Text style={styles.statLabel}>Active Alerts</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="radio-outline" size={24} color="#059669" />
            <Text style={styles.statNumber}>{onlineSensors.length}</Text>
            <Text style={styles.statLabel}>Online Sensors</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="pulse-outline" size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>{sensors.length}</Text>
            <Text style={styles.statLabel}>Total Sensors</Text>
          </View>
        </View>
      </View>

      {/* Recent Alerts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Alerts</Text>
        {activeAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#059669" />
            <Text style={styles.emptyStateText}>No active alerts</Text>
          </View>
        ) : (
          activeAlerts.slice(0, 3).map((alert) => (
            <TouchableOpacity key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Ionicons 
                  name="warning" 
                  size={20} 
                  color={getRiskColor(alert.level)} 
                />
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.alertMessage} numberOfLines={2}>
                {alert.message}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Sensor Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sensor Status</Text>
        {sensors.slice(0, 5).map((sensor) => (
          <View key={sensor.id} style={styles.sensorCard}>
            <View style={styles.sensorHeader}>
              <Ionicons 
                name="radio" 
                size={16} 
                color={sensor.status === 'online' ? '#059669' : '#DC2626'} 
              />
              <Text style={styles.sensorName}>{sensor.name}</Text>
              <Text style={styles.sensorBattery}>{sensor.battery_level}%</Text>
            </View>
            <Text style={styles.sensorLocation}>
              {sensor.location.latitude.toFixed(4)}, {sensor.location.longitude.toFixed(4)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  riskCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  riskLevel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  riskProbability: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  alertTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  alertMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  sensorCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sensorName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  sensorBattery: {
    fontSize: 12,
    color: '#6B7280',
  },
  sensorLocation: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 24,
  },
});