# PRISM Web Dashboard

## Overview

The PRISM Web Dashboard is a comprehensive React-based platform for the **Predictive Rockfall Intelligence & Safety Management** system. It provides real-time monitoring, risk assessment visualization, and sensor health management for open-pit mining operations.

### 🌟 New Features

- **🎯 Stunning Landing Page**: Full 3D interactive landing page with advanced animations
- **🗺️ Complete Mapbox Integration**: Real-time sensor monitoring with interactive maps
- **📱 Responsive Design**: Optimized for all devices and screen sizes
- **🎨 Advanced Animations**: GSAP, Framer Motion, and Three.js powered visuals
- **⚡ Performance Optimized**: Smooth scrolling and efficient rendering

## Features

### 3D Interactive Risk Visualization
- **Terrain Rendering**: Real-time 3D terrain visualization using Three.js and React Three Fiber
- **Risk Heatmaps**: Dynamic risk probability overlays with color-coded intensity
- **Sensor Markers**: Interactive 3D markers showing hexapod sensor locations and status
- **Camera Controls**: Orbit controls for 360° navigation and zoom
- **Shader-based Effects**: Custom GLSL shaders for risk visualization with pulsing animations

### Temporal Risk Analysis
- **Time Slider**: Interactive timeline control for historical data analysis
- **Playback Controls**: Play/pause/step controls for temporal data visualization
- **Speed Control**: Adjustable playback speed (0.25x to 8x)
- **Time Range Selection**: Multiple time ranges (1 hour to 30 days)
- **Real-time Updates**: Live data streaming with WebSocket connections

### Sensor Health Monitoring
- **Health Dashboard**: Real-time sensor status and health metrics
- **Battery Monitoring**: Battery levels and solar charging status
- **Communication Status**: Signal strength and last communication timestamps
- **Alert Badges**: Visual indicators for sensor health issues
- **Location Tracking**: GPS coordinates and mine grid positions

### Interactive Dashboard
- **Responsive Design**: Mobile-friendly interface with Material-UI components
- **Dark Theme**: Professional dark theme optimized for control room environments
- **Real-time Alerts**: Live alert notifications with graduated severity levels
- **Risk Level Indicators**: Current risk status with color-coded warnings
- **Navigation Drawer**: Organized navigation with feature toggles

## Technology Stack

### Frontend Framework
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe development with full IntelliSense support
- **Vite**: Fast build tool with hot module replacement

### 3D Visualization
- **Three.js**: WebGL-based 3D graphics library
- **React Three Fiber**: React renderer for Three.js
- **React Three Drei**: Useful helpers and abstractions

### UI Components
- **Material-UI (MUI)**: Comprehensive React component library
- **Framer Motion**: Smooth animations and transitions
- **GSAP**: High-performance animations for complex sequences

### State Management
- **Zustand**: Lightweight state management with TypeScript support
- **React Query**: Server state management and caching

### Real-time Communication
- **Socket.io Client**: WebSocket connections for live data streaming
- **Axios**: HTTP client for REST API communication

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with WebGL support

### Installation
```bash
cd services/web-dashboard
npm install
```

### Development
```bash
npm run dev
```
Access the dashboard at `http://localhost:3000`

### Testing
```bash
npm test          # Run tests once
npm run test:watch # Run tests in watch mode
```

### Building
```bash
npm run build
npm run preview   # Preview production build
```

## Architecture

### Component Structure
```
src/
├── components/
│   ├── 3D/                    # 3D visualization components
│   │   └── TerrainVisualization.tsx
│   ├── controls/              # Interactive controls
│   │   └── TimeSlider.tsx
│   ├── layout/                # Layout components
│   │   └── DashboardLayout.tsx
│   └── monitoring/            # Monitoring panels
│       └── SensorHealthPanel.tsx
├── pages/                     # Page components
│   └── Dashboard.tsx
├── store/                     # State management
│   └── dashboardStore.ts
├── types/                     # TypeScript definitions
│   └── index.ts
└── __tests__/                 # Test files
```

### State Management
The dashboard uses Zustand for state management with the following key stores:
- **Dashboard Store**: Main application state including sensor data, risk assessments, and UI preferences
- **Real-time Updates**: WebSocket integration for live data streaming
- **Computed Values**: Derived state for active sensors, alerts, and risk levels

### 3D Rendering Pipeline
1. **Terrain Mesh Generation**: Convert DEM data to Three.js geometry
2. **Risk Color Mapping**: Apply risk probability values as vertex colors
3. **Shader Processing**: Custom GLSL shaders for visual effects
4. **Sensor Positioning**: 3D markers positioned using mine grid coordinates
5. **Animation Loop**: Continuous updates for dynamic effects

## Configuration

### Environment Variables
```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_WEBSOCKET_URL=ws://localhost:8080
VITE_MAPBOX_TOKEN=your_mapbox_token
```

### Dashboard Settings
- **View Mode**: 2D, 3D, or Hybrid visualization
- **Risk Threshold**: Configurable risk probability threshold
- **Animation Speed**: Temporal playback speed control
- **Panel Visibility**: Toggle sensor health and alert panels

## Testing

### Test Coverage
- **Unit Tests**: Component logic and state management
- **Integration Tests**: Component interactions and data flow
- **Visual Tests**: 3D rendering and animation behavior
- **Performance Tests**: Frame rate and memory usage

### Test Structure
```bash
src/__tests__/
├── components/           # Component tests
├── store/               # State management tests
└── setup.ts            # Test configuration
```

## Performance Optimization

### 3D Rendering
- **Level of Detail (LOD)**: Adaptive mesh resolution based on camera distance
- **Frustum Culling**: Only render visible geometry
- **Instanced Rendering**: Efficient rendering of multiple sensor markers
- **Shader Optimization**: Optimized GLSL shaders for real-time performance

### Data Management
- **Lazy Loading**: Load data on demand
- **Caching**: Intelligent caching of API responses
- **Debouncing**: Prevent excessive API calls during user interactions
- **Memory Management**: Proper cleanup of Three.js resources

## Browser Support

### Minimum Requirements
- **Chrome 90+**: Full WebGL 2.0 support
- **Firefox 88+**: WebGL and modern JavaScript features
- **Safari 14+**: WebGL and ES2020 support
- **Edge 90+**: Chromium-based Edge with full feature support

### WebGL Requirements
- WebGL 2.0 support for advanced shader features
- Hardware acceleration enabled
- Minimum 1GB GPU memory for large terrain datasets

## Deployment

### Production Build
```bash
npm run build
```

### Docker Deployment
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### CDN Integration
- Static assets served from CDN
- Gzip compression enabled
- Cache headers optimized for performance

## Contributing

### Development Guidelines
- Follow TypeScript strict mode
- Use ESLint and Prettier for code formatting
- Write comprehensive tests for new features
- Document complex 3D rendering logic

### Code Style
- Functional components with hooks
- Custom hooks for reusable logic
- Proper TypeScript typing
- Consistent naming conventions

## License

This project is part of the PRISM system and follows the same licensing terms.