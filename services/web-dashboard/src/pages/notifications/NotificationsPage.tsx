import React, { useState, useEffect } from 'react';
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
  Alert,
  Badge,
  Tab,
  Tabs,
  Paper,
  Divider
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  NotificationsOff,
  CheckCircle,
  Cancel,
  Email,
  Send,
  Refresh,
  FilterList,
  Info,
  Warning,
  Error,
  CheckCircle as SuccessIcon,
  Schedule
} from '@mui/icons-material';
import { format } from 'date-fns';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  alertId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  metadata?: any;
}

const NotificationsPage: React.FC = () => {
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState(0);
  const [emailForm, setEmailForm] = useState({
    receiverEmail: 'debdeep3613@gmail.com',
    subject: '',
    body: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await fetch('http://localhost:5002/notifications');
      if (response.ok) {
        const result = await response.json();
        setNotificationsList(result.data.notifications || []);
      } else {
        console.error('Failed to load notifications');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info color="info" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      case 'success': return <SuccessIcon color="success" />;
      default: return <Info />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'rejected': return 'error';
      case 'sent': return 'success';
      default: return 'default';
    }
  };

  const filteredNotifications = notificationsList.filter(notification => {
    const statusMatch = filterStatus === 'all' || notification.status === filterStatus;
    const typeMatch = filterType === 'all' || notification.type === filterType;
    return statusMatch && typeMatch;
  });

  const notificationStats = {
    total: notificationsList.length,
    pending: notificationsList.filter(n => n.status === 'pending').length,
    approved: notificationsList.filter(n => n.status === 'approved').length,
    sent: notificationsList.filter(n => n.status === 'sent').length,
    rejected: notificationsList.filter(n => n.status === 'rejected').length
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    setSelectedNotification(notification);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedNotification(null);
  };

  const handleApprove = async (notificationId: string) => {
    try {
      const response = await fetch(`http://localhost:5002/notifications/${notificationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await loadNotifications(); // Reload notifications
        window.alert('Notification approved successfully!');
      } else {
        const error = await response.json();
        console.error('Failed to approve notification:', error);
        window.alert('Failed to approve notification. Please try again.');
      }
    } catch (error) {
      console.error('Error approving notification:', error);
      window.alert('Error approving notification. Please check your connection.');
    }
  };

  const handleReject = async (notificationId: string) => {
    try {
      const response = await fetch(`http://localhost:5002/notifications/${notificationId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await loadNotifications(); // Reload notifications
        window.alert('Notification rejected.');
      } else {
        const error = await response.json();
        console.error('Failed to reject notification:', error);
        window.alert('Failed to reject notification. Please try again.');
      }
    } catch (error) {
      console.error('Error rejecting notification:', error);
      window.alert('Error rejecting notification. Please check your connection.');
    }
  };

  const handleSendEmail = async (notificationId: string) => {
    if (!selectedNotification) return;

    setEmailForm({
      receiverEmail: 'debdeep3613@gmail.com',
      subject: `PRISM Alert: ${selectedNotification.title}`,
      body: selectedNotification.message
    });
    setEmailDialogOpen(true);
  };

  const handleEmailSubmit = async () => {
    if (!selectedNotification) return;

    setIsLoading(true);
    try {
      const emailData = {
        receiverEmail: emailForm.receiverEmail,
        subject: emailForm.subject,
        body: emailForm.body
      };

      const response = await fetch(`http://localhost:5002/notifications/${selectedNotification.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Email sent successfully:', result);
        window.alert('Email sent successfully!');
        await loadNotifications(); // Reload notifications
        setEmailDialogOpen(false);
        setSelectedNotification(null);
      } else {
        const error = await response.json();
        console.error('Failed to send email:', error);
        window.alert('Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      window.alert('Error sending email. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    const pendingNotifications = notificationsList.filter(n => n.status === 'pending');
    if (pendingNotifications.length === 0) {
      window.alert('No pending notifications to approve.');
      return;
    }

    const notificationIds = pendingNotifications.map(n => n.id);

    try {
      const response = await fetch('http://localhost:5002/notifications/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      });

      if (response.ok) {
        await loadNotifications(); // Reload notifications
        window.alert(`Approved ${notificationIds.length} notifications!`);
      } else {
        const error = await response.json();
        console.error('Failed to bulk approve:', error);
        window.alert('Failed to approve notifications. Please try again.');
      }
    } catch (error) {
      console.error('Error bulk approving:', error);
      window.alert('Error approving notifications. Please check your connection.');
    }
  };

  const handleBulkSendEmail = async () => {
    const approvedNotifications = notificationsList.filter(n => n.status === 'approved');
    if (approvedNotifications.length === 0) {
      window.alert('No approved notifications to send emails for.');
      return;
    }

    const notificationIds = approvedNotifications.map(n => n.id);

    try {
      const response = await fetch('http://localhost:5002/notifications/bulk-send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds,
          receiverEmail: 'debdeep3613@gmail.com'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Bulk email result:', result);
        await loadNotifications(); // Reload notifications
        window.alert(`Sent ${result.sentCount} emails successfully!${result.failedCount > 0 ? ` ${result.failedCount} failed.` : ''}`);
      } else {
        const error = await response.json();
        console.error('Failed to bulk send emails:', error);
        window.alert('Failed to send emails. Please try again.');
      }
    } catch (error) {
      console.error('Error bulk sending emails:', error);
      window.alert('Error sending emails. Please check your connection.');
    }
  };

  const getTabNotifications = (tabIndex: number) => {
    switch (tabIndex) {
      case 1: return filteredNotifications.filter(n => n.status === 'pending');
      case 2: return filteredNotifications.filter(n => n.status === 'approved');
      case 3: return filteredNotifications.filter(n => n.status === 'sent');
      default: return filteredNotifications;
    }
  };

  const tabLabels = ['All Notifications', 'Pending', 'Approved', 'Sent'];

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
              Notifications & Email Management
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Review and approve notifications for email delivery
            </Typography>
          </Box>

          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadNotifications}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircle />}
              onClick={handleBulkApprove}
              disabled={notificationStats.pending === 0}
            >
              Approve All Pending
            </Button>
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleBulkSendEmail}
              disabled={notificationStats.approved === 0}
            >
              Send All Approved
            </Button>
          </Box>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        {/* Notification Statistics */}
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
                      <Notifications color="primary" />
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {notificationStats.total}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Notifications
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
                      <Schedule color="warning" />
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {notificationStats.pending}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pending Approval
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
                      <CheckCircle color="info" />
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {notificationStats.approved}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Approved
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
                      <Email color="success" />
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {notificationStats.sent}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Sent
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
                      <Cancel color="error" />
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {notificationStats.rejected}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Rejected
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </motion.div>
        </Grid>

        {/* Notifications List */}
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
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        label="Status"
                      >
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="approved">Approved</MenuItem>
                        <MenuItem value="sent">Sent</MenuItem>
                        <MenuItem value="rejected">Rejected</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        label="Type"
                      >
                        <MenuItem value="all">All Types</MenuItem>
                        <MenuItem value="info">Info</MenuItem>
                        <MenuItem value="warning">Warning</MenuItem>
                        <MenuItem value="error">Error</MenuItem>
                        <MenuItem value="success">Success</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
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
                          badgeContent={getTabNotifications(index).length}
                          color="error"
                          invisible={getTabNotifications(index).length === 0}
                        >
                          {label}
                        </Badge>
                      }
                    />
                  ))}
                </Tabs>

                {/* Notification List */}
                <List>
                  {getTabNotifications(selectedTab).map((notification, index) => (
                    <React.Fragment key={notification.id}>
                      <ListItem
                        sx={{
                          cursor: 'pointer',
                          borderRadius: 2,
                          mb: 1,
                          backgroundColor:
                            notification.status === 'pending' ? 'rgba(255, 193, 7, 0.1)' :
                            notification.status === 'approved' ? 'rgba(33, 150, 243, 0.1)' :
                            notification.status === 'sent' ? 'rgba(76, 175, 80, 0.1)' :
                            'rgba(244, 67, 54, 0.1)',
                          border: `1px solid ${
                            notification.status === 'pending' ? 'rgba(255, 193, 7, 0.3)' :
                            notification.status === 'approved' ? 'rgba(33, 150, 243, 0.3)' :
                            notification.status === 'sent' ? 'rgba(76, 175, 80, 0.3)' :
                            'rgba(244, 67, 54, 0.3)'
                          }`,
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.08)'
                          }
                        }}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <ListItemIcon>
                          {getTypeIcon(notification.type)}
                        </ListItemIcon>

                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={2}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {notification.title}
                              </Typography>
                              <Chip
                                label={notification.status}
                                size="small"
                                color={getStatusColor(notification.status) as any}
                                variant="outlined"
                              />
                              <Chip
                                label={notification.type}
                                size="small"
                                color={notification.type === 'error' ? 'error' : 'default'}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {notification.message.length > 100
                                  ? `${notification.message.substring(0, 100)}...`
                                  : notification.message
                                }
                              </Typography>
                              <Box display="flex" alignItems="center" gap={2}>
                                <Typography variant="caption" color="text.secondary">
                                  {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Source: {notification.source}
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />

                        <ListItemSecondaryAction>
                          <Box display="flex" gap={1}>
                            {notification.status === 'pending' && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApprove(notification.id);
                                    }}
                                  >
                                    <CheckCircle />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReject(notification.id);
                                    }}
                                  >
                                    <Cancel />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {notification.status === 'approved' && (
                              <Tooltip title="Send Email">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendEmail(notification.id);
                                  }}
                                >
                                  <Email />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < getTabNotifications(selectedTab).length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Notification Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Notification Details</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {selectedNotification && getTypeIcon(selectedNotification.type)}
              <Chip
                label={selectedNotification?.status}
                size="small"
                color={selectedNotification ? getStatusColor(selectedNotification.status) as any : 'default'}
              />
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {selectedNotification && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedNotification.title}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedNotification.message}
              </Typography>

              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body2">
                    {selectedNotification.type}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Severity
                  </Typography>
                  <Typography variant="body2">
                    {selectedNotification.severity}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Source
                  </Typography>
                  <Typography variant="body2">
                    {selectedNotification.source}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body2">
                    {selectedNotification.status}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created At
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(selectedNotification.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Updated At
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(selectedNotification.updatedAt), 'MMM dd, yyyy HH:mm:ss')}
                  </Typography>
                </Grid>
                {selectedNotification.sentAt && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Sent At
                    </Typography>
                    <Typography variant="body2">
                      {format(new Date(selectedNotification.sentAt), 'MMM dd, yyyy HH:mm:ss')}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Close
          </Button>
          {selectedNotification && selectedNotification.status === 'pending' && (
            <>
              <Button
                variant="outlined"
                onClick={() => {
                  handleApprove(selectedNotification.id);
                  handleCloseDialog();
                }}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  handleReject(selectedNotification.id);
                  handleCloseDialog();
                }}
              >
                Reject
              </Button>
            </>
          )}
          {selectedNotification && selectedNotification.status === 'approved' && (
            <Button
              variant="contained"
              onClick={() => {
                handleSendEmail(selectedNotification.id);
                handleCloseDialog();
              }}
            >
              Send Email
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Email Dialog */}
      <Dialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Send Email Notification</Typography>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Receiver Email"
              value={emailForm.receiverEmail}
              onChange={(e) => setEmailForm(prev => ({ ...prev, receiverEmail: e.target.value }))}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Subject"
              value={emailForm.subject}
              onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Message"
              value={emailForm.body}
              onChange={(e) => setEmailForm(prev => ({ ...prev, body: e.target.value }))}
              margin="normal"
              multiline
              rows={6}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEmailSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationsPage;