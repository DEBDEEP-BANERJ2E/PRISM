# PRISM Notification Service

A Flask-based notification service that handles email notifications for the PRISM safety management system.

## Features

- **Notification Management**: Create, read, update, and delete notifications
- **Email Integration**: Send email notifications using Gmail SMTP
- **Status Tracking**: Track notification status (pending, approved, rejected, sent)
- **Bulk Operations**: Approve and send multiple notifications at once
- **CORS Support**: Cross-origin resource sharing for web applications

## Setup

### Prerequisites

- Python 3.7+
- Gmail account with app password (for email functionality)

### Installation

1. **Create virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   SENDER_EMAIL=your-email@gmail.com
   SENDER_PASSWORD=your-app-password
   FLASK_ENV=development
   FLASK_DEBUG=True
   ```

4. **Start the service:**
   ```bash
   # Using the startup script
   ./start.sh

   # Or manually
   source .venv/bin/activate
   python3 app.py
   ```

The service will start on `http://localhost:5002`

## API Endpoints

### Notifications

- `GET /notifications` - Get all notifications
- `GET /notifications/<id>` - Get specific notification
- `POST /notifications` - Create new notification
- `DELETE /notifications/<id>` - Delete notification

### Notification Actions

- `POST /notifications/<id>/approve` - Approve notification
- `POST /notifications/<id>/reject` - Reject notification
- `POST /notifications/<id>/send-email` - Send email for notification

### Bulk Operations

- `POST /notifications/bulk-approve` - Approve multiple notifications
- `POST /notifications/bulk-send-email` - Send emails for multiple notifications

### Health Check

- `GET /health` - Service health check

## Email Configuration

To enable email functionality:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Update `.env` file** with your credentials:
   ```env
   SENDER_EMAIL=your-email@gmail.com
   SENDER_PASSWORD=your-app-password
   ```

## Integration with PRISM Dashboard

The notification service integrates with the PRISM web dashboard:

1. **Alerts Page**: When users acknowledge alerts, notifications are created
2. **Notifications Page**: Users can review, approve, and send email notifications
3. **Email Delivery**: Approved notifications can be sent to configured recipients

## Development

### Running in Development Mode

```bash
export FLASK_ENV=development
export FLASK_DEBUG=True
python3 app.py
```

### Testing the API

```bash
# Test health endpoint
curl http://localhost:5002/health

# Create a test notification
curl -X POST http://localhost:5002/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test notification",
    "type": "info",
    "severity": "medium"
  }'
```

## Production Deployment

For production deployment:

1. Use a production WSGI server (gunicorn)
2. Configure proper logging
3. Set up environment variables securely
4. Use a database instead of in-memory storage
5. Configure proper CORS origins

## Security Considerations

- Store email credentials securely (use environment variables or secret management)
- Validate input data thoroughly
- Implement rate limiting for API endpoints
- Use HTTPS in production
- Consider email service alternatives (SendGrid, AWS SES) for high volume

## Troubleshooting

### Common Issues

1. **Email sending fails**: Check Gmail app password and 2FA settings
2. **CORS errors**: Verify CORS configuration in Flask app
3. **Port conflicts**: Ensure port 5002 is available
4. **Environment variables**: Check .env file exists and is loaded

### Logs

Check the console output for detailed error messages and debugging information.