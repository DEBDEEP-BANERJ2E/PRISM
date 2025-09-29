from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import json
import uuid
from typing import Dict, List, Any

app = Flask(__name__)
CORS(app)  # Enable CORS for all origins

# Load email credentials from environment variables
SENDER_EMAIL = os.environ.get('SENDER_EMAIL')
SENDER_PASSWORD = os.environ.get('SENDER_PASSWORD')

# In-memory storage for notifications (in production, use a database)
notifications: Dict[str, Dict[str, Any]] = {}

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/notifications', methods=['GET'])
def get_notifications():
    """Get all notifications"""
    return jsonify({
        'success': True,
        'data': {
            'notifications': list(notifications.values()),
            'count': len(notifications)
        },
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/notifications/<notification_id>', methods=['GET'])
def get_notification(notification_id: str):
    """Get a specific notification"""
    if notification_id not in notifications:
        return jsonify({'status': 'error', 'message': 'Notification not found'}), 404

    return jsonify({
        'success': True,
        'data': notifications[notification_id],
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/notifications', methods=['POST'])
def create_notification():
    """Create a new notification"""
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'Invalid JSON'}), 400

    notification_id = str(uuid.uuid4())

    notification = {
        'id': notification_id,
        'title': data.get('title', 'New Notification'),
        'message': data.get('message', ''),
        'type': data.get('type', 'info'),  # info, warning, error, success
        'severity': data.get('severity', 'medium'),  # low, medium, high, critical
        'source': data.get('source', 'system'),
        'alertId': data.get('alertId'),
        'status': 'pending',  # pending, approved, rejected, sent
        'createdAt': datetime.utcnow().isoformat(),
        'updatedAt': datetime.utcnow().isoformat(),
        'metadata': data.get('metadata', {})
    }

    notifications[notification_id] = notification

    return jsonify({
        'success': True,
        'data': notification,
        'timestamp': datetime.utcnow().isoformat()
    }), 201

@app.route('/notifications/<notification_id>/approve', methods=['POST'])
def approve_notification(notification_id: str):
    """Approve a notification for email sending"""
    if notification_id not in notifications:
        return jsonify({'status': 'error', 'message': 'Notification not found'}), 404

    notification = notifications[notification_id]
    notification['status'] = 'approved'
    notification['updatedAt'] = datetime.utcnow().isoformat()

    return jsonify({
        'success': True,
        'data': notification,
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/notifications/<notification_id>/reject', methods=['POST'])
def reject_notification(notification_id: str):
    """Reject a notification"""
    if notification_id not in notifications:
        return jsonify({'status': 'error', 'message': 'Notification not found'}), 404

    notification = notifications[notification_id]
    notification['status'] = 'rejected'
    notification['updatedAt'] = datetime.utcnow().isoformat()

    return jsonify({
        'success': True,
        'data': notification,
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/notifications/<notification_id>/send-email', methods=['POST'])
def send_notification_email(notification_id: str):
    """Send email for a notification"""
    if notification_id not in notifications:
        return jsonify({'status': 'error', 'message': 'Notification not found'}), 404

    notification = notifications[notification_id]

    if notification['status'] != 'approved':
        return jsonify({'status': 'error', 'message': 'Notification must be approved before sending email'}), 400

    # Get email configuration from request
    data = request.get_json() or {}
    receiver_email = data.get('receiverEmail', 'ddebdeep.banerjee.iotcs27@heritageit.edu.in')
    subject = data.get('subject', f"PRISM Alert: {notification['title']}")
    body = data.get('body', notification['message'])

    if not all([receiver_email, subject, body]):
        return jsonify({'status': 'error', 'message': 'Missing required email parameters'}), 400

    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print(f"SENDER_EMAIL: {SENDER_EMAIL}")
        print(f"SENDER_PASSWORD: {SENDER_PASSWORD}")
        return jsonify({'status': 'error', 'message': 'Email sender credentials not configured on the server.'}), 500

    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = receiver_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, receiver_email, msg.as_string())
        print("Email sent successfully!")

        # Update notification status
        notification['status'] = 'sent'
        notification['sentAt'] = datetime.utcnow().isoformat()
        notification['updatedAt'] = datetime.utcnow().isoformat()

        return jsonify({
            'success': True,
            'message': 'Email sent successfully!',
            'data': notification,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        print(f"Error sending email: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        if 'server' in locals():
            server.quit()

@app.route('/notifications/bulk-approve', methods=['POST'])
def bulk_approve_notifications():
    """Approve multiple notifications"""
    data = request.get_json()
    if not data or 'notificationIds' not in data:
        return jsonify({'status': 'error', 'message': 'Missing notificationIds'}), 400

    notification_ids = data['notificationIds']
    approved_count = 0

    for nid in notification_ids:
        if nid in notifications:
            notifications[nid]['status'] = 'approved'
            notifications[nid]['updatedAt'] = datetime.utcnow().isoformat()
            approved_count += 1

    return jsonify({
        'success': True,
        'message': f'Approved {approved_count} notifications',
        'approvedCount': approved_count,
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/notifications/bulk-send-email', methods=['POST'])
def bulk_send_emails():
    """Send emails for multiple approved notifications"""
    data = request.get_json()
    if not data or 'notificationIds' not in data:
        return jsonify({'status': 'error', 'message': 'Missing notificationIds'}), 400

    notification_ids = data['notificationIds']
    receiver_email = data.get('receiverEmail', 'debdeep3613@gmail.com')
    sent_count = 0
    failed_count = 0

    for nid in notification_ids:
        if nid in notifications and notifications[nid]['status'] == 'approved':
            try:
                notification = notifications[nid]
                subject = f"PRISM Alert: {notification['title']}"
                body = notification['message']

                msg = MIMEMultipart()
                msg['From'] = SENDER_EMAIL
                msg['To'] = receiver_email
                msg['Subject'] = subject
                msg.attach(MIMEText(body, 'plain'))

                server = smtplib.SMTP('smtp.gmail.com', 587)
                server.starttls()
                server.login(SENDER_EMAIL, SENDER_PASSWORD)
                server.sendmail(SENDER_EMAIL, receiver_email, msg.as_string())

                # Update notification status
                notification['status'] = 'sent'
                notification['sentAt'] = datetime.utcnow().isoformat()
                notification['updatedAt'] = datetime.utcnow().isoformat()

                sent_count += 1
                server.quit()
            except Exception as e:
                print(f"Error sending email for notification {nid}: {e}")
                failed_count += 1
                if 'server' in locals():
                    server.quit()

    return jsonify({
        'success': True,
        'message': f'Sent {sent_count} emails, failed {failed_count}',
        'sentCount': sent_count,
        'failedCount': failed_count,
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/notifications/<notification_id>', methods=['DELETE'])
def delete_notification(notification_id: str):
    """Delete a notification"""
    if notification_id not in notifications:
        return jsonify({'status': 'error', 'message': 'Notification not found'}), 404

    del notifications[notification_id]
    return jsonify({
        'success': True,
        'message': 'Notification deleted successfully',
        'timestamp': datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=False)