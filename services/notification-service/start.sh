#!/bin/bash

# Start the notification service
echo "Starting PRISM Notification Service..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | xargs)
fi

# Start the Flask application
echo "Starting Flask application on port 5002..."
python3 app.py