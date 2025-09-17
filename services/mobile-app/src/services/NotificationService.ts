import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { NotificationPayload } from '@/types';

export class NotificationService {
  private static expoPushToken: string | null = null;

  static async initialize() {
    // Set up notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Get push token
    await this.registerForPushNotifications();

    // Set up notification listeners
    this.setupNotificationListeners();
  }

  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }

    return true;
  }

  private static async registerForPushNotifications() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // Create alert-specific channels
      await Notifications.setNotificationChannelAsync('critical-alerts', {
        name: 'Critical Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('high-alerts', {
        name: 'High Priority Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFA500',
      });
    }

    if (Device.isDevice) {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;
      console.log('Expo Push Token:', token);
      
      // Send token to your server
      await this.sendTokenToServer(token);
    }
  }

  private static async sendTokenToServer(token: string) {
    try {
      await fetch('http://localhost:3000/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error('Error sending push token to server:', error);
    }
  }

  private static setupNotificationListeners() {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // You can handle the notification here if needed
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      if (data?.alertId) {
        // Navigate to alert details or acknowledge alert
        this.handleAlertNotification(data.alertId as string);
      }
    });
  }

  private static handleAlertNotification(alertId: string) {
    // This would typically navigate to the alert or show an alert modal
    console.log('Handling alert notification for:', alertId);
  }

  static async scheduleLocalNotification(payload: NotificationPayload) {
    const channelId = this.getChannelIdForAlert(payload.data?.level);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
      },
      trigger: null, // Show immediately
      ...(Platform.OS === 'android' && { 
        content: { 
          ...payload, 
          channelId 
        } 
      }),
    });
  }

  private static getChannelIdForAlert(level?: string): string {
    switch (level) {
      case 'critical':
        return 'critical-alerts';
      case 'high':
        return 'high-alerts';
      default:
        return 'default';
    }
  }

  static async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  static async clearNotification(notificationId: string) {
    await Notifications.dismissNotificationAsync(notificationId);
  }

  static getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}