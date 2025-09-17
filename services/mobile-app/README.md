# PRISM Mobile Application

A React Native mobile application for the PRISM (Predictive Rockfall Intelligence & Safety Management) system, providing real-time risk monitoring and alert management for mine safety operations.

## Features

### Core Functionality
- **Real-time Risk Monitoring**: View current risk levels and probability assessments
- **Alert Management**: Receive, view, and acknowledge safety alerts
- **Sensor Monitoring**: Track sensor status, battery levels, and locations
- **Offline Capability**: Continue monitoring with cached data when offline
- **Push Notifications**: Receive critical alerts even when app is closed

### Key Screens
- **Dashboard**: Overview of system status, risk levels, and recent alerts
- **Alerts**: Detailed alert management with acknowledgment capabilities
- **Sensors**: Sensor status monitoring with map and list views
- **Profile**: User settings and system status information

## Technical Architecture

### State Management
- **Zustand**: Lightweight state management for authentication and data
- **AsyncStorage**: Persistent storage for offline capabilities
- **NetInfo**: Network connectivity monitoring

### Offline Capabilities
- Automatic data caching for offline access
- Local alert acknowledgment with server sync when online
- Graceful degradation when network is unavailable

### Push Notifications
- Expo Notifications for cross-platform push notifications
- Priority-based notification channels (Critical, High, Medium, Low)
- Alert-specific notification handling and routing

## Installation

### Prerequisites
- Node.js 16+ and npm/yarn
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (for iOS development)
- Android Studio and emulator (for Android development)

### Setup
```bash
cd services/mobile-app
npm install
```

### Development
```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage
The test suite covers:
- Authentication store functionality
- Data store with offline capabilities
- Notification service
- Core screen components
- Error handling and edge cases

## Configuration

### Environment Variables
Create a `.env` file in the project root:
```
API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### Push Notifications
The app uses Expo's push notification service. For production:
1. Configure push notification credentials in Expo
2. Update server endpoints for token registration
3. Set up proper notification channels and priorities

## Deployment

### Development Build
```bash
# Create development build
expo build:android --type apk
expo build:ios --type simulator
```

### Production Build
```bash
# Create production build
expo build:android --type app-bundle
expo build:ios --type archive
```

### App Store Deployment
1. Configure app signing certificates
2. Update app.json with production settings
3. Submit to respective app stores

## Architecture Decisions

### Offline-First Design
The app is designed to work offline-first:
- All critical data is cached locally
- Actions are performed locally and synced when online
- Graceful degradation when network is unavailable

### State Management
- Zustand chosen for simplicity and TypeScript support
- Separate stores for authentication and data management
- Persistent state using AsyncStorage

### Navigation
- React Navigation v6 for type-safe navigation
- Tab-based navigation for main screens
- Modal presentations for detailed views

### Testing Strategy
- Unit tests for business logic and stores
- Component tests for UI interactions
- Integration tests for data flow
- Mocked external dependencies for reliable testing

## Security Considerations

### Authentication
- JWT token-based authentication
- Secure token storage using AsyncStorage
- Automatic token refresh handling

### Data Protection
- Sensitive data encrypted in storage
- Network requests over HTTPS only
- Input validation and sanitization

### Permissions
- Location permissions for sensor mapping
- Notification permissions for alerts
- Camera permissions for incident reporting (future feature)

## Performance Optimizations

### Data Management
- Efficient data caching strategies
- Lazy loading of non-critical data
- Optimized re-renders with proper state management

### UI Performance
- Optimized FlatList rendering for large datasets
- Image optimization and caching
- Proper memory management for maps and visualizations

## Future Enhancements

### Planned Features
- Incident reporting with photo capture
- GPS navigation to sensor locations
- Advanced data visualization
- Voice commands and accessibility improvements

### Technical Improvements
- Background sync capabilities
- Advanced caching strategies
- Performance monitoring and analytics
- Automated testing pipeline

## Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Write tests for new features
3. Use consistent code formatting (Prettier)
4. Follow React Native performance guidelines

### Code Style
- ESLint configuration for code quality
- Prettier for consistent formatting
- TypeScript for type safety
- Conventional commit messages

## Support

For technical support or questions:
- Check the troubleshooting guide
- Review test cases for usage examples
- Contact the development team

## License

This project is part of the PRISM system and is proprietary software for mine safety management.