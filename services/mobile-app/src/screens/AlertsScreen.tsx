import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert as RNAlert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/dataStore';
import { Alert } from '@/types';

export default function AlertsScreen() {
  const {
    alerts,
    isOnline,
    isLoading,
    fetchData,
    acknowledgeAlert,
  } = useDataStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged'>('active');

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    RNAlert.alert(
      'Acknowledge Alert',
      'Are you sure you want to acknowledge this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Acknowledge',
          onPress: async () => {
            await acknowledgeAlert(alertId);
            setSelectedAlert(null);
          },
        },
      ]
    );
  };

  const getFilteredAlerts = () => {
    switch (filter) {
      case 'active':
        return alerts.filter(alert => !alert.acknowledged);
      case 'acknowledged':
        return alerts.filter(alert => alert.acknowledged);
      default:
        return alerts;
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#D97706';
      case 'low': return '#059669';
      default: return '#6B7280';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical': return 'alert-circle';
      case 'high': return 'warning';
      case 'medium': return 'information-circle';
      case 'low': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const renderAlert = ({ item }: { item: Alert }) => (
    <TouchableOpacity
      style={[
        styles.alertCard,
        item.acknowledged && styles.acknowledgedCard,
      ]}
      onPress={() => setSelectedAlert(item)}
    >
      <View style={styles.alertHeader}>
        <Ionicons
          name={getAlertIcon(item.level)}
          size={24}
          color={getAlertColor(item.level)}
        />
        <View style={styles.alertInfo}>
          <Text style={styles.alertTitle}>{item.title}</Text>
          <Text style={styles.alertTime}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
        {item.acknowledged && (
          <Ionicons name="checkmark-circle" size={20} color="#059669" />
        )}
      </View>
      
      <Text style={styles.alertMessage} numberOfLines={2}>
        {item.message}
      </Text>
      
      <View style={styles.alertFooter}>
        <Text style={[styles.alertLevel, { color: getAlertColor(item.level) }]}>
          {item.level.toUpperCase()}
        </Text>
        <Text style={styles.alertLocation}>
          {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const filteredAlerts = getFilteredAlerts();

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['active', 'acknowledged', 'all'].map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterTab,
              filter === filterOption && styles.activeFilterTab,
            ]}
            onPress={() => setFilter(filterOption as any)}
          >
            <Text
              style={[
                styles.filterText,
                filter === filterOption && styles.activeFilterText,
              ]}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Alerts List */}
      <FlatList
        data={filteredAlerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>
              {filter === 'active' ? 'No active alerts' : 'No alerts found'}
            </Text>
          </View>
        }
      />

      {/* Alert Detail Modal */}
      <Modal
        visible={selectedAlert !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedAlert && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedAlert(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Alert Details</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.modalContent}>
              <View style={styles.alertDetailHeader}>
                <Ionicons
                  name={getAlertIcon(selectedAlert.level)}
                  size={32}
                  color={getAlertColor(selectedAlert.level)}
                />
                <View style={styles.alertDetailInfo}>
                  <Text style={styles.alertDetailTitle}>
                    {selectedAlert.title}
                  </Text>
                  <Text style={[
                    styles.alertDetailLevel,
                    { color: getAlertColor(selectedAlert.level) }
                  ]}>
                    {selectedAlert.level.toUpperCase()} PRIORITY
                  </Text>
                </View>
              </View>

              <Text style={styles.alertDetailMessage}>
                {selectedAlert.message}
              </Text>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {selectedAlert.location.latitude.toFixed(6)}, {selectedAlert.location.longitude.toFixed(6)}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedAlert.timestamp).toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Risk Probability</Text>
                <Text style={styles.detailValue}>
                  {(selectedAlert.risk_assessment.risk_probability * 100).toFixed(1)}%
                </Text>
              </View>

              {selectedAlert.risk_assessment.recommended_actions.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Recommended Actions</Text>
                  {selectedAlert.risk_assessment.recommended_actions.map((action, index) => (
                    <Text key={index} style={styles.actionItem}>
                      • {action}
                    </Text>
                  ))}
                </View>
              )}

              {selectedAlert.acknowledged ? (
                <View style={styles.acknowledgedSection}>
                  <Ionicons name="checkmark-circle" size={24} color="#059669" />
                  <Text style={styles.acknowledgedText}>
                    Acknowledged by {selectedAlert.acknowledged_by} at{' '}
                    {selectedAlert.acknowledged_at && 
                      new Date(selectedAlert.acknowledged_at).toLocaleString()
                    }
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.acknowledgeButton}
                  onPress={() => handleAcknowledgeAlert(selectedAlert.id)}
                  disabled={!isOnline}
                >
                  <Text style={styles.acknowledgeButtonText}>
                    {isOnline ? 'Acknowledge Alert' : 'Offline - Cannot Acknowledge'}
                  </Text>
                </TouchableOpacity>
              )}
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 4,
  },
  activeFilterTab: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  alertCard: {
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
  acknowledgedCard: {
    opacity: 0.7,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  alertTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  alertMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertLocation: {
    fontSize: 12,
    color: '#9CA3AF',
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
  alertDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertDetailInfo: {
    marginLeft: 16,
  },
  alertDetailTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  alertDetailLevel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  alertDetailMessage: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionItem: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  acknowledgedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  acknowledgedText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 12,
    flex: 1,
  },
  acknowledgeButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  acknowledgeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});