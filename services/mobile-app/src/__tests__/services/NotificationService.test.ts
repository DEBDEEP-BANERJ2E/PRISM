import * as Notifications from 'expo-notifications';
import { NotificationService } from '@/services/NotificationService';

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('initialize', () => {
    it('should initialize notification service correctly', async () => {
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'mock-expo-token',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await NotificationService.initialize();

      expect(Notifications.setNotificationHandler).toHaveBeenCalled();
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications/register',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: 'mock-expo-token' }),
        })
      );
    });

    it('should set up Android notification channels', async () => {
      await NotificationService.initialize();

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        })
      );

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'critical-alerts',
        expect.objectContaining({
          name: 'Critical Alerts',
          importance: Notifications.AndroidImportance.MAX,
        })
      );
    });
  });

  describe('requestPermissions', () => {
    it('should request and return permission status', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false if permissions are denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(false);
    });

    it('should return true if permissions are already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule a local notification', async () => {
      const payload = {
        title: 'Test Alert',
        body: 'This is a test alert',
        data: {
          alertId: '123',
          level: 'high',
        },
      };

      await NotificationService.scheduleLocalNotification(payload);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Test Alert',
            body: 'This is a test alert',
            data: {
              alertId: '123',
              level: 'high',
            },
          }),
          trigger: null,
        })
      );
    });

    it('should use correct channel for critical alerts', async () => {
      const payload = {
        title: 'Critical Alert',
        body: 'Critical situation detected',
        data: {
          level: 'critical',
        },
      };

      await NotificationService.scheduleLocalNotification(payload);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            channelId: 'critical-alerts',
          }),
        })
      );
    });
  });

  describe('clearNotifications', () => {
    it('should clear all notifications', async () => {
      await NotificationService.clearAllNotifications();

      expect(Notifications.dismissAllNotificationsAsync).toHaveBeenCalled();
    });

    it('should clear specific notification', async () => {
      await NotificationService.clearNotification('notification-id');

      expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith(
        'notification-id'
      );
    });
  });

  describe('getExpoPushToken', () => {
    it('should return stored push token', async () => {
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'stored-token',
      });

      await NotificationService.initialize();
      const token = NotificationService.getExpoPushToken();

      expect(token).toBe('stored-token');
    });

    it('should return null if no token is stored', () => {
      const token = NotificationService.getExpoPushToken();
      expect(token).toBeNull();
    });
  });
});