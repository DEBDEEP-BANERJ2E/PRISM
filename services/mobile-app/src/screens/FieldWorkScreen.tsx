import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFieldWorkStore } from '@/store/fieldWorkStore';
import { MaintenanceTask, IncidentReport } from '@/types';

export default function FieldWorkScreen() {
  const {
    maintenanceTasks,
    incidentReports,
    isLoading,
    fetchMaintenanceTasks,
    createIncidentReport,
    updateTaskStatus,
  } = useFieldWorkStore();

  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    fetchMaintenanceTasks();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for field work');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleStartTask = async (task: MaintenanceTask) => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please enable location services to start tasks');
      return;
    }

    Alert.alert(
      'Start Task',
      `Are you sure you want to start "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            await updateTaskStatus(task.id, 'in_progress', {
              started_at: new Date().toISOString(),
              started_location: {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                elevation: currentLocation.coords.altitude || 0,
                utm_x: 0,
                utm_y: 0,
                mine_grid_x: 0,
                mine_grid_y: 0,
              },
            });
            setSelectedTask(null);
          },
        },
      ]
    );
  };

  const handleCompleteTask = async (task: MaintenanceTask) => {
    Alert.alert(
      'Complete Task',
      `Mark "${task.title}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            await updateTaskStatus(task.id, 'completed', {
              completed_at: new Date().toISOString(),
              completed_location: currentLocation ? {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                elevation: currentLocation.coords.altitude || 0,
                utm_x: 0,
                utm_y: 0,
                mine_grid_x: 0,
                mine_grid_y: 0,
              } : undefined,
            });
            setSelectedTask(null);
          },
        },
      ]
    );
  };

  const handleCreateIncident = () => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please enable location services to report incidents');
      return;
    }
    setShowIncidentModal(true);
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#D97706';
      case 'in_progress': return '#3B82F6';
      case 'completed': return '#059669';
      case 'overdue': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'in_progress': return 'play-circle';
      case 'completed': return 'checkmark-circle';
      case 'overdue': return 'warning';
      default: return 'help-circle';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#D97706';
      case 'low': return '#059669';
      default: return '#6B7280';
    }
  };

  const renderTask = (task: MaintenanceTask) => (
    <TouchableOpacity
      key={task.id}
      style={styles.taskCard}
      onPress={() => setSelectedTask(task)}
    >
      <View style={styles.taskHeader}>
        <Ionicons
          name={getTaskStatusIcon(task.status)}
          size={24}
          color={getTaskStatusColor(task.status)}
        />
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskSensor}>{task.sensor_name}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
          <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.taskDescription} numberOfLines={2}>
        {task.description}
      </Text>
      
      <View style={styles.taskFooter}>
        <Text style={styles.taskDueDate}>
          Due: {new Date(task.due_date).toLocaleDateString()}
        </Text>
        <Text style={[styles.taskStatus, { color: getTaskStatusColor(task.status) }]}>
          {task.status.replace('_', ' ').toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const pendingTasks = maintenanceTasks.filter(task => task.status === 'pending');
  const inProgressTasks = maintenanceTasks.filter(task => task.status === 'in_progress');
  const completedTasks = maintenanceTasks.filter(task => task.status === 'completed');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Field Work</Text>
        <TouchableOpacity
          style={styles.incidentButton}
          onPress={handleCreateIncident}
        >
          <Ionicons name="warning" size={20} color="white" />
          <Text style={styles.incidentButtonText}>Report Incident</Text>
        </TouchableOpacity>
      </View>

      {/* Location Status */}
      {currentLocation && (
        <View style={styles.locationBar}>
          <Ionicons name="location" size={16} color="#059669" />
          <Text style={styles.locationText}>
            Location: {currentLocation.coords.latitude.toFixed(4)}, {currentLocation.coords.longitude.toFixed(4)}
          </Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* In Progress Tasks */}
        {inProgressTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>In Progress ({inProgressTasks.length})</Text>
            {inProgressTasks.map(renderTask)}
          </View>
        )}

        {/* Pending Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Tasks ({pendingTasks.length})</Text>
          {pendingTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No pending tasks</Text>
            </View>
          ) : (
            pendingTasks.map(renderTask)
          )}
        </View>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently Completed ({completedTasks.length})</Text>
            {completedTasks.slice(0, 5).map(renderTask)}
          </View>
        )}
      </ScrollView>

      {/* Task Detail Modal */}
      <Modal
        visible={selectedTask !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onStart={() => handleStartTask(selectedTask)}
            onComplete={() => handleCompleteTask(selectedTask)}
            currentLocation={currentLocation}
          />
        )}
      </Modal>

      {/* Incident Report Modal */}
      <Modal
        visible={showIncidentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <IncidentReportModal
          onClose={() => setShowIncidentModal(false)}
          currentLocation={currentLocation}
          onSubmit={createIncidentReport}
        />
      </Modal>
    </View>
  );
}

// Task Detail Modal Component
interface TaskDetailModalProps {
  task: MaintenanceTask;
  onClose: () => void;
  onStart: () => void;
  onComplete: () => void;
  currentLocation: Location.LocationObject | null;
}

function TaskDetailModal({ task, onClose, onStart, onComplete, currentLocation }: TaskDetailModalProps) {
  const handleNavigateToSensor = () => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Location services are required for navigation');
      return;
    }

    // This would integrate with a mapping service or navigation app
    Alert.alert(
      'Navigate to Sensor',
      `Navigate to ${task.sensor_name} at coordinates ${task.sensor_location.latitude.toFixed(4)}, ${task.sensor_location.longitude.toFixed(4)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Navigate',
          onPress: () => {
            // Open external navigation app or internal map
            console.log('Navigate to sensor:', task.sensor_location);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Task Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.modalContent}>
        <View style={styles.taskDetailHeader}>
          <Text style={styles.taskDetailTitle}>{task.title}</Text>
          <Text style={styles.taskDetailSensor}>{task.sensor_name}</Text>
        </View>

        <Text style={styles.taskDetailDescription}>{task.description}</Text>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Priority</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
            <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Due Date</Text>
          <Text style={styles.detailValue}>
            {new Date(task.due_date).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Sensor Location</Text>
          <Text style={styles.detailValue}>
            {task.sensor_location.latitude.toFixed(6)}, {task.sensor_location.longitude.toFixed(6)}
          </Text>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={handleNavigateToSensor}
          >
            <Ionicons name="navigate" size={20} color="#3B82F6" />
            <Text style={styles.navigateButtonText}>Navigate to Sensor</Text>
          </TouchableOpacity>
        </View>

        {task.instructions && (
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Instructions</Text>
            <Text style={styles.detailValue}>{task.instructions}</Text>
          </View>
        )}

        {task.required_tools && task.required_tools.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Required Tools</Text>
            {task.required_tools.map((tool, index) => (
              <Text key={index} style={styles.toolItem}>• {tool}</Text>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.modalActions}>
        {task.status === 'pending' && (
          <TouchableOpacity style={styles.startButton} onPress={onStart}>
            <Text style={styles.startButtonText}>Start Task</Text>
          </TouchableOpacity>
        )}
        
        {task.status === 'in_progress' && (
          <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
            <Text style={styles.completeButtonText}>Complete Task</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Incident Report Modal Component
interface IncidentReportModalProps {
  onClose: () => void;
  currentLocation: Location.LocationObject | null;
  onSubmit: (report: Partial<IncidentReport>) => Promise<void>;
}

function IncidentReportModal({ onClose, currentLocation, onSubmit }: IncidentReportModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Error', 'Location is required for incident reports');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        severity,
        location: {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          elevation: currentLocation.coords.altitude || 0,
          utm_x: 0,
          utm_y: 0,
          mine_grid_x: 0,
          mine_grid_y: 0,
        },
        timestamp: new Date().toISOString(),
        reported_by: 'current_user', // This would be the actual user
        status: 'open',
      });

      Alert.alert('Success', 'Incident report submitted successfully');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit incident report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Report Incident</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.modalContent}>
        {/* Form fields would go here - simplified for brevity */}
        <Text style={styles.formNote}>
          Incident reporting form would include:
          - Title and description fields
          - Severity selection
          - Photo capture capability
          - Location confirmation
          - Submit button
        </Text>
      </ScrollView>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical': return '#DC2626';
    case 'high': return '#EA580C';
    case 'medium': return '#D97706';
    case 'low': return '#059669';
    default: return '#6B7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  incidentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  incidentButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0FDF4',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#059669',
  },
  content: {
    flex: 1,
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
  taskCard: {
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
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskInfo: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  taskSensor: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  taskDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskDueDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  taskStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
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
  taskDetailHeader: {
    marginBottom: 16,
  },
  taskDetailTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
  },
  taskDetailSensor: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  taskDetailDescription: {
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
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  navigateButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  toolItem: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  modalActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  startButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  formNote: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 32,
  },
});