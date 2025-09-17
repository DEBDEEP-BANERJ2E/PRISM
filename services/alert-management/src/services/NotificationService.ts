import { Alert, NotificationChannel, AlertNotification } from '@prism/shared-models/risk';
import { logger } from '../utils/logger';
import { config } from '../config';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import axios from 'axios';

export interface NotificationTemplate {
  subject: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface NotificationResult {
  success: boolean;
  notificationId: string;
  error?: string;
  deliveredAt?: Date;
}

export class NotificationService {
  private twilioClient: twilio.Twilio | null = null;
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTwilio();
    this.initializeEmail();
  }

  /**
   * Initialize Twilio SMS client
   */
  private initializeTwilio(): void {
    try {
      if (config.notifications.twilio.accountSid && config.notifications.twilio.authToken) {
        this.twilioClient = twilio(
          config.notifications.twilio.accountSid,
          config.notifications.twilio.authToken
        );
        logger.info('Twilio SMS client initialized');
      } else {
        logger.warn('Twilio credentials not configured, SMS notifications disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize Twilio client:', error);
    }
  }

  /**
   * Initialize email transporter
   */
  private initializeEmail(): void {
    try {
      if (config.notifications.email.auth.user && config.notifications.email.auth.pass) {
        this.emailTransporter = nodemailer.createTransport({
          host: config.notifications.email.host,
          port: config.notifications.email.port,
          secure: config.notifications.email.secure,
          auth: config.notifications.email.auth
        });
        logger.info('Email transporter initialized');
      } else {
        logger.warn('Email credentials not configured, email notifications disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Send initial notifications for a new alert
   */
  async sendInitialNotifications(alert: Alert): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      // Get notification template based on alert
      const template = this.getNotificationTemplate(alert);
      
      // Send to default recipients based on severity
      const recipients = this.getDefaultRecipients(alert);
      const channels = this.getDefaultChannels(alert);

      for (const recipient of recipients) {
        for (const channel of channels) {
          try {
            const result = await this.sendNotification(
              channel,
              recipient,
              template,
              alert
            );
            results.push(result);
          } catch (error) {
            logger.error(`Failed to send ${channel} notification to ${recipient}:`, error);
            results.push({
              success: false,
              notificationId: `failed_${Date.now()}`,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      logger.info(`Sent ${results.length} initial notifications for alert ${alert.alert_id}`);
      return results;
    } catch (error) {
      logger.error('Error sending initial notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification via specific channel
   */
  async sendNotification(
    channel: NotificationChannel,
    recipient: string,
    template: NotificationTemplate,
    alert: Alert
  ): Promise<NotificationResult> {
    const notificationId = `${channel}_${recipient}_${Date.now()}`;

    try {
      switch (channel) {
        case 'sms':
          return await this.sendSMS(recipient, template, alert, notificationId);
        case 'email':
          return await this.sendEmail(recipient, template, alert, notificationId);
        case 'push':
          return await this.sendPushNotification(recipient, template, alert, notificationId);
        case 'webhook':
          return await this.sendWebhook(recipient, template, alert, notificationId);
        default:
          throw new Error(`Unsupported notification channel: ${channel}`);
      }
    } catch (error) {
      logger.error(`Error sending ${channel} notification:`, error);
      return {
        success: false,
        notificationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(
    phoneNumber: string,
    template: NotificationTemplate,
    alert: Alert,
    notificationId: string
  ): Promise<NotificationResult> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: this.formatSMSMessage(template, alert),
        from: config.notifications.twilio.fromNumber,
        to: phoneNumber
      });

      logger.info(`SMS sent to ${phoneNumber}, SID: ${message.sid}`);

      return {
        success: true,
        notificationId,
        deliveredAt: new Date()
      };
    } catch (error) {
      logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    emailAddress: string,
    template: NotificationTemplate,
    alert: Alert,
    notificationId: string
  ): Promise<NotificationResult> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not initialized');
    }

    try {
      const mailOptions = {
        from: config.notifications.email.from,
        to: emailAddress,
        subject: this.formatEmailSubject(template, alert),
        html: this.formatEmailBody(template, alert),
        priority: this.mapPriorityToEmail(template.priority)
      };

      const info = await this.emailTransporter.sendMail(mailOptions);

      logger.info(`Email sent to ${emailAddress}, MessageID: ${info.messageId}`);

      return {
        success: true,
        notificationId,
        deliveredAt: new Date()
      };
    } catch (error) {
      logger.error(`Failed to send email to ${emailAddress}:`, error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    deviceToken: string,
    template: NotificationTemplate,
    alert: Alert,
    notificationId: string
  ): Promise<NotificationResult> {
    // This is a placeholder implementation
    // In a real system, you would integrate with FCM, APNS, or another push service
    
    try {
      logger.info(`Push notification would be sent to device ${deviceToken}`);
      
      // Simulate push notification sending
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        notificationId,
        deliveredAt: new Date()
      };
    } catch (error) {
      logger.error(`Failed to send push notification to ${deviceToken}:`, error);
      throw error;
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    webhookUrl: string,
    template: NotificationTemplate,
    alert: Alert,
    notificationId: string
  ): Promise<NotificationResult> {
    try {
      const payload = {
        notification_id: notificationId,
        alert: alert.toJSON(),
        template: template,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(webhookUrl, payload, {
        timeout: config.notifications.webhook.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PRISM-Alert-System/1.0'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info(`Webhook sent to ${webhookUrl}, status: ${response.status}`);
        return {
          success: true,
          notificationId,
          deliveredAt: new Date()
        };
      } else {
        throw new Error(`Webhook returned status ${response.status}`);
      }
    } catch (error) {
      logger.error(`Failed to send webhook to ${webhookUrl}:`, error);
      throw error;
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(alert: Alert): Promise<NotificationResult[]> {
    const failedNotifications = alert.getFailedNotifications();
    const results: NotificationResult[] = [];

    for (const notification of failedNotifications) {
      if (notification.retry_count >= config.alertProcessing.maxRetryAttempts) {
        logger.warn(`Max retry attempts reached for notification ${notification.notification_id}`);
        continue;
      }

      try {
        const template = this.getNotificationTemplate(alert);
        const result = await this.sendNotification(
          notification.channel,
          notification.recipient,
          template,
          alert
        );
        results.push(result);
      } catch (error) {
        logger.error(`Retry failed for notification ${notification.notification_id}:`, error);
        results.push({
          success: false,
          notificationId: notification.notification_id,
          error: error instanceof Error ? error.message : 'Retry failed'
        });
      }
    }

    return results;
  }

  /**
   * Get notification template based on alert
   */
  private getNotificationTemplate(alert: Alert): NotificationTemplate {
    const templates: Record<string, NotificationTemplate> = {
      'rockfall_risk': {
        subject: `🚨 ${alert.severity.toUpperCase()} Rockfall Risk Alert`,
        body: `Alert: ${alert.title}\n\nMessage: ${alert.message}\n\nLocation: ${alert.location ? `${alert.location.latitude}, ${alert.location.longitude}` : 'Unknown'}\n\nTime: ${alert.triggered_at.toISOString()}\n\nAlert ID: ${alert.alert_id}`,
        priority: alert.severity === 'emergency' ? 'urgent' : alert.severity === 'critical' ? 'high' : 'normal'
      },
      'sensor_failure': {
        subject: `⚠️ Sensor Failure Alert`,
        body: `Sensor Alert: ${alert.title}\n\nMessage: ${alert.message}\n\nSensor ID: ${alert.source_id}\n\nTime: ${alert.triggered_at.toISOString()}\n\nAlert ID: ${alert.alert_id}`,
        priority: alert.severity === 'critical' ? 'high' : 'normal'
      },
      'default': {
        subject: `Alert: ${alert.title}`,
        body: `${alert.message}\n\nTime: ${alert.triggered_at.toISOString()}\n\nAlert ID: ${alert.alert_id}`,
        priority: 'normal'
      }
    };

    return templates[alert.alert_type] || templates['default'];
  }

  /**
   * Get default recipients based on alert severity
   */
  private getDefaultRecipients(alert: Alert): string[] {
    // This would typically come from a configuration or database
    const recipients: Record<string, string[]> = {
      'emergency': ['emergency@mine.com', '+1234567890'],
      'critical': ['supervisor@mine.com', '+1234567891'],
      'warning': ['operator@mine.com'],
      'info': ['operator@mine.com']
    };

    return recipients[alert.severity] || recipients['info'];
  }

  /**
   * Get default channels based on alert severity
   */
  private getDefaultChannels(alert: Alert): NotificationChannel[] {
    const channels: Record<string, NotificationChannel[]> = {
      'emergency': ['sms', 'email', 'push', 'webhook'],
      'critical': ['sms', 'email', 'push'],
      'warning': ['email', 'push'],
      'info': ['email']
    };

    return channels[alert.severity] || channels['info'];
  }

  /**
   * Format SMS message
   */
  private formatSMSMessage(template: NotificationTemplate, alert: Alert): string {
    // Keep SMS messages concise due to character limits
    return `${alert.severity.toUpperCase()}: ${alert.title}. ${alert.message.substring(0, 100)}${alert.message.length > 100 ? '...' : ''}`;
  }

  /**
   * Format email subject
   */
  private formatEmailSubject(template: NotificationTemplate, alert: Alert): string {
    return `[PRISM] ${template.subject}`;
  }

  /**
   * Format email body
   */
  private formatEmailBody(template: NotificationTemplate, alert: Alert): string {
    const prescriptiveActions = alert.metadata.prescriptive_actions;
    const actionsHtml = prescriptiveActions ? 
      `<h3>Recommended Actions:</h3><ul>${prescriptiveActions.map((action: any) => `<li><strong>${action.priority.toUpperCase()}:</strong> ${action.description}</li>`).join('')}</ul>` : '';

    return `
      <html>
        <body>
          <h2>${template.subject}</h2>
          <p><strong>Alert ID:</strong> ${alert.alert_id}</p>
          <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
          <p><strong>Type:</strong> ${alert.alert_type}</p>
          <p><strong>Time:</strong> ${alert.triggered_at.toISOString()}</p>
          ${alert.location ? `<p><strong>Location:</strong> ${alert.location.latitude}, ${alert.location.longitude}</p>` : ''}
          
          <h3>Message:</h3>
          <p>${alert.message}</p>
          
          ${actionsHtml}
          
          <hr>
          <p><small>This is an automated alert from the PRISM Rockfall Prediction System.</small></p>
        </body>
      </html>
    `;
  }

  /**
   * Map priority to email priority
   */
  private mapPriorityToEmail(priority: string): 'low' | 'normal' | 'high' {
    const mapping: Record<string, 'low' | 'normal' | 'high'> = {
      'low': 'low',
      'normal': 'normal',
      'high': 'high',
      'urgent': 'high'
    };
    return mapping[priority] || 'normal';
  }
}