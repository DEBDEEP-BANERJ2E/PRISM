#!/bin/bash

# PRISM Web Dashboard - Vercel Deployment Script
# Usage: ./deploy.sh [preview|production]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the web-dashboard directory."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed. Please install it with: npm install -g vercel"
    exit 1
fi

# Determine deployment type
DEPLOYMENT_TYPE=${1:-preview}

print_status "Starting PRISM Web Dashboard deployment..."
print_status "Deployment type: $DEPLOYMENT_TYPE"

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Run linting
print_status "Running linting..."
if npm run lint; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    exit 1
fi

# Run type checking
print_status "Running type checking..."
if npm run type-check; then
    print_success "Type checking passed"
else
    print_error "Type checking failed"
    exit 1
fi

# Run tests
print_status "Running tests..."
if npm test; then
    print_success "Tests passed"
else
    print_error "Tests failed"
    exit 1
fi

# Build the project
print_status "Building the project..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Deploy to Vercel
print_status "Deploying to Vercel..."

if [ "$DEPLOYMENT_TYPE" = "production" ]; then
    print_status "Deploying to production..."
    DEPLOYMENT_URL=$(vercel --prod --confirm)
else
    print_status "Deploying to preview..."
    DEPLOYMENT_URL=$(vercel --confirm)
fi

if [ $? -eq 0 ]; then
    print_success "Deployment completed successfully!"
    print_success "Deployment URL: $DEPLOYMENT_URL"
    
    # Open the deployment URL in browser (optional)
    if command -v open &> /dev/null; then
        read -p "Open deployment URL in browser? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open "$DEPLOYMENT_URL"
        fi
    fi
    
    # Show deployment information
    echo
    print_status "Deployment Information:"
    echo "  URL: $DEPLOYMENT_URL"
    echo "  Type: $DEPLOYMENT_TYPE"
    echo "  Time: $(date)"
    echo "  Git Commit: $(git rev-parse --short HEAD)"
    echo "  Git Branch: $(git branch --show-current)"
    
else
    print_error "Deployment failed"
    exit 1
fi

print_success "PRISM Web Dashboard deployment completed! 🚀"