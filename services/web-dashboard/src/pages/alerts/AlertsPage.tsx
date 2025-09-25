import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Avatar,
  Divider,
  Alert,
  Badge,
  Tab,
  Tabs,
  Paper
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  NotificationsActive,
  NotificationsOff,
  Visibility,
  VisibilityOff,
  Settings,
  FilterList,
  Refresh,
  Download,
  Add,
  Delete,
  Edit,
  Schedule,
  LocationOn,
  Assessment,
  Sensors,
  Speed
} from '@mui/icons-material';
import { format } from 'date-fns';

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'risk' | 'sensor' | 'system' | 'maintenance';
  location?: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  assignedTo?: string;
  source: string;
  actions?: string[];
}

const AlertsPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);

  // Mock alert data
  const alerts: AlertItem[] = [
    {
      id: 'ALT001',
      title: 'Critical Risk Level Detected',
      description: 'Slope stability analysis indicates critical risk level in Sector 7-A. Immediate evacuation recommended.',
      severity: 'critical',
      category: 'risk',
      location: 'Sector 7-A, Bench 3',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      acknowledged: false,
      resolved: false,
      source: 'AI Risk Assessment Engine',
      actions: ['Evacuate personnel', 'Stop operations', 'Deploy emergency team']
    },
    {
      id: 'ALT002',
      title: 'Sensor Battery Low',
      description: 'Displacement sensor S002 battery level is critically low (12%). Maintenance required.',
      severity: 'high',
      category: 'sensor',
      location: 'Sector B, Bench 3',
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      acknowledged: true,
      resolved: false,
      assignedTo: 'John Smith',
      source: 'Sensor Monitoring System',
      actions: ['Replace battery', 'Check connections', 'Recalibrate sensor']
    },
    {
      id: 'ALT003',
      title: 'Elevated Displacement Detected',
      description: 'Displacement readings exceed threshold in multiple sensors. Trend analysis shows acceleration.',
      severity: 'high',
      category: 'risk',
      location: 'Sector A, Multiple locations',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      acknowledged: true,
      resolved: false,
      assignedTo: 'Sarah Johnson',
      source: 'Displacement Monitoring',
      actions: ['Increase monitoring frequency', 'Deploy additional sensors', 'Assess stability']
    },
    {
      id: 'ALT004',
      title: 'System Performance Degraded',
      description: 'AI model inference time has increased by 40%. System optimization required.',
      severity: 'medium',
      category: 'system',
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      acknowledged: true,
      resolved: true,
      assignedTo: 'Tech Team',
      source: 'System Monitor',
      actions: ['Optimize model', 'Check server resources', 'Update algorithms']
    },
    {
      id: 'ALT005',
      title: 'Scheduled Maintenance Due',
      description: 'Routine maintenance scheduled for sensors in Sector C. Maintenance window: 2024-02-15.',
      severity: 'low',
      category: 'maintenance',
      location: 'Sector C',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      acknowledged: false,
      resolved: false,
      source: 'Maintenance Scheduler',
      actions: ['Schedule maintenance crew', 'Prepare equipment', 'Notify operations']
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Error color="error" />;
      case 'high': return <Warning color="error" />;
      case 'medium': return <Warning color="warning" />;
      case 'low': return <Info color="info" />;
      case 'info': return <Info color="info" />;
      default: return <Info />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'risk': return <Assessment />;
      case 'sensor': return <Sensors />;
      case 'system': return <Speed />;
      case 'maintenance': return <Schedule />;
      default: return <Info />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const severityMatch = filterSeverity === 'all' || alert.severity === filterSeverity;
    const categoryMatch = filterCategory === 'all' || alert.category === filterCategory;
    const resolvedMatch = showResolved || !alert.resolved;
    return severityMatch && categoryMatch && resolvedMatch;
  });

  const alertStats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical' && !a.resolved).length,
    high: alerts.filter(a => a.severity === 'high' && !a.resolved).length,
    unacknowledged: alerts.filter(a => !a.acknowledged && !a.resolved).length,
    resolved: alerts.filter(a => a.resolved).length
  };

  const handleAlertClick = (alert: AlertItem) => {
    setSelectedAlert(alert);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedAlert(null);
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      // Find the alert
      const currentAlert = alerts.find(a => a.id === alertId);
      if (!currentAlert) {
        console.error('Alert not found:', alertId);
        return;
      }

      // Step 1: Create notification in the backend
      const notificationData = {
        title: `Alert Acknowledged: ${currentAlert.title}`,
        message: `Alert "${currentAlert.title}" has been acknowledged.\n\nDescription: ${currentAlert.description}\n\nSeverity: ${currentAlert.severity}\nCategory: ${currentAlert.category}\nLocation: ${currentAlert.location || 'N/A'}\nSource: ${currentAlert.source}`,
        type: 'info',
        severity: currentAlert.severity,
        source: 'alerts',
        alertId: alertId,
        metadata: {
          originalAlert: currentAlert,
          action: 'acknowledged',
          timestamp: new Date().toISOString()
        }
      };

      const createResponse = await fetch('http://localhost:5002/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        console.error('❌ Failed to create notification:', error);
        window.alert('Failed to acknowledge alert. Please try again.');
        return;
      }

      const createResult = await createResponse.json();
      const notificationId = createResult.data.id;
      console.log('✅ Notification created successfully:', createResult.data);

      // Step 2: Automatically approve the notification
      const approveResponse = await fetch(`http://localhost:5002/notifications/${notificationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!approveResponse.ok) {
        const error = await approveResponse.json();
        console.error('❌ Failed to approve notification:', error);
        window.alert('Failed to approve notification. Please try again.');
        return;
      }

      const approveResult = await approveResponse.json();
      console.log('✅ Notification approved successfully:', approveResult.data);

      // Step 3: Automatically send the email
      const emailData = {
        receiverEmail: 'debdeep.banerjee.iotcs27@heritageit.edu.in',
        subject: `🚨 URGENT: ${currentAlert.title}`,
        body: `Alert "${currentAlert.title}" has been acknowledged and requires immediate attention.\n\nDescription: ${currentAlert.description}\n\nSeverity: ${currentAlert.severity.toUpperCase()}\nCategory: ${currentAlert.category}\nLocation: ${currentAlert.location || 'N/A'}\nSource: ${currentAlert.source}\n\nThis is an automated notification from the PRISM system.\n\nPlease acknowledge receipt of this notification.`
      };

      const emailResponse = await fetch(`http://localhost:5002/notifications/${notificationId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (emailResponse.ok) {
        const emailResult = await emailResponse.json();
        console.log('✅ Email sent successfully:', emailResult);

        // Show success message
        window.alert('✅ Alert acknowledged and email sent successfully!');

        // In real app, you might want to update the alert status locally
        console.log('Alert acknowledged, notification created, approved, and email sent:', alertId);
      } else {
        const error = await emailResponse.json();
        console.error('❌ Failed to send email:', error);
        window.alert('Alert acknowledged but failed to send email. Please check notification service.');
      }
    } catch (error) {
      console.error('❌ Error acknowledging alert:', error);
      window.alert('Error acknowledging alert. Please check your connection.');
    }
  };

  const handleResolve = (alertId: string) => {
    // In real app, this would resolve the alert
    console.log('Resolving alert:', alertId);
  };

  const tabLabels = ['All Alerts', 'Critical', 'High Priority', 'Unacknowledged'];

  const getTabAlerts = (tabIndex: number) => {
    switch (tabIndex) {
      case 1: return filteredAlerts.filter(a => a.severity === 'critical' && !a.resolved);
      case 2: return filteredAlerts.filter(a => a.severity === 'high' && !a.resolved);
      case 3: return filteredAlerts.filter(a => !a.acknowledged && !a.resolved);
      default: return filteredAlerts;
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Alerts & Notifications
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Monitor and manage system alerts and notifications
            </Typography>
          </Box>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<Settings />}
            >
              Settings
            </Button>
          </Box>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        {/* Alert Statistics */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <NotificationsActive />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {alertStats.total}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Alerts
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'error.main' }}>
                        <Error />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {alertStats.critical}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Critical
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'warning.main' }}>
                        <Warning />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {alertStats.high}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          High Priority
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'info.main' }}>
                        <NotificationsOff />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {alertStats.unacknowledged}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Unacknowledged
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <CheckCircle />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {alertStats.resolved}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Resolved
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </motion.div>
        </Grid>

        {/* Alerts List */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <CardContent>
                {/* Filters */}
                <Box display="flex" alignItems="center" justifyContent="between" gap={2} mb={3}>
                  <Box display="flex" gap={2}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Severity</InputLabel>
                      <Select
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        label="Severity"
                      >
                        <MenuItem value="all">All Severities</MenuItem>
                        <MenuItem value="critical">Critical</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="info">Info</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        label="Category"
                      >
                        <MenuItem value="all">All Categories</MenuItem>
                        <MenuItem value="risk">Risk</MenuItem>
                        <MenuItem value="sensor">Sensor</MenuItem>
                        <MenuItem value="system">System</MenuItem>
                        <MenuItem value="maintenance">Maintenance</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showResolved}
                        onChange={(e) => setShowResolved(e.target.checked)}
                      />
                    }
                    label="Show Resolved"
                  />
                </Box>

                {/* Tabs */}
                <Tabs
                  value={selectedTab}
                  onChange={(e, newValue) => setSelectedTab(newValue)}
                  sx={{ mb: 3 }}
                >
                  {tabLabels.map((label, index) => (
                    <Tab
                      key={index}
                      label={
                        <Badge
                          badgeContent={getTabAlerts(index).length}
                          color="error"
                          invisible={getTabAlerts(index).length === 0}
                        >
                          {label}
                        </Badge>
                      }
                    />
                  ))}
                </Tabs>

                {/* Alert List */}
                <List>
                  {getTabAlerts(selectedTab).map((alert, index) => (
                    <React.Fragment key={alert.id}>
                      <ListItem
                        sx={{
                          cursor: 'pointer',
                          borderRadius: 2,
                          mb: 1,
                          backgroundColor: alert.acknowledged ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${alert.severity === 'critical' ? 'rgba(244, 67, 54, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.08)'
                          }
                        }}
                        onClick={() => handleAlertClick(alert)}
                      >
                        <ListItemIcon>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getSeverityIcon(alert.severity)}
                            {getCategoryIcon(alert.category)}
                          </Box>
                        </ListItemIcon>
                        
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={2}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {alert.title}
                              </Typography>
                              <Chip
                                label={alert.severity}
                                size="small"
                                color={getSeverityColor(alert.severity) as any}
                                variant="outlined"
                              />
                              {alert.location && (
                                <Chip
                                  icon={<LocationOn />}
                                  label={alert.location}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              {alert.resolved && (
                                <Chip
                                  label="Resolved"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {alert.description}
                              </Typography>
                              <Box display="flex" alignItems="center" gap={2}>
                                <Typography variant="caption" color="text.secondary">
                                  {format(alert.timestamp, 'MMM dd, yyyy HH:mm')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Source: {alert.source}
                                </Typography>
                                {alert.assignedTo && (
                                  <Typography variant="caption" color="text.secondary">
                                    Assigned to: {alert.assignedTo}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          }
                        />
                        
                        <ListItemSecondaryAction>
                          <Box display="flex" gap={1}>
                            {!alert.acknowledged && (
                              <Tooltip title="Acknowledge">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcknowledge(alert.id);
                                  }}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                            )}
                            {!alert.resolved && (
                              <Tooltip title="Resolve">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResolve(alert.id);
                                  }}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < getTabAlerts(selectedTab).length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Alert Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Alert Details</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {selectedAlert && getSeverityIcon(selectedAlert.severity)}
              <Chip
                label={selectedAlert?.severity}
                size="small"
                color={selectedAlert ? getSeverityColor(selectedAlert.severity) as any : 'default'}
              />
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedAlert.title}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedAlert.description}
              </Typography>
              
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body2">
                    {selectedAlert.category}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Source
                  </Typography>
                  <Typography variant="body2">
                    {selectedAlert.source}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body2">
                    {format(selectedAlert.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body2">
                    {selectedAlert.location || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
              
              {selectedAlert.actions && selectedAlert.actions.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Recommended Actions
                  </Typography>
                  <List dense>
                    {selectedAlert.actions.map((action, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={`• ${action}`} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Close
          </Button>
          {selectedAlert && !selectedAlert.acknowledged && (
            <Button
              variant="outlined"
              onClick={() => {
                handleAcknowledge(selectedAlert.id);
                handleCloseDialog();
              }}
            >
              Acknowledge
            </Button>
          )}
          {selectedAlert && !selectedAlert.resolved && (
            <Button
              variant="contained"
              onClick={() => {
                handleResolve(selectedAlert.id);
                handleCloseDialog();
              }}
            >
              Resolve
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertsPage;