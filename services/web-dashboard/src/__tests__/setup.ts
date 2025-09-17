import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock Three.js
vi.mock('three', () => ({
  BufferGeometry: vi.fn(() => ({
    setAttribute: vi.fn(),
    setIndex: vi.fn()
  })),
  BufferAttribute: vi.fn(),
  ShaderMaterial: vi.fn(),
  Color: vi.fn(),
  Vector3: vi.fn(),
  Mesh: vi.fn(),
  Scene: vi.fn(),
  PerspectiveCamera: vi.fn(),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    render: vi.fn(),
    domElement: document.createElement('canvas')
  }))
}));

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => {
    return React.createElement('div', { 'data-testid': 'canvas' }, children);
  },
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    clock: { elapsedTime: 0 }
  }))
}));

// Mock @react-three/drei
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => React.createElement('div', { 'data-testid': 'orbit-controls' }),
  PerspectiveCamera: () => React.createElement('div', { 'data-testid': 'perspective-camera' }),
  Environment: () => React.createElement('div', { 'data-testid': 'environment' })
}));

// Mock Mapbox GL
vi.mock('mapbox-gl', () => ({
  Map: vi.fn(() => ({
    on: vi.fn(),
    remove: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn()
  })),
  NavigationControl: vi.fn(),
  Marker: vi.fn(() => ({
    setLngLat: vi.fn(),
    addTo: vi.fn()
  }))
}));

// Mock GSAP
vi.mock('gsap', () => ({
  to: vi.fn(),
  from: vi.fn(),
  timeline: vi.fn(() => ({
    to: vi.fn(),
    from: vi.fn()
  }))
}));

// Mock WebSocket
global.WebSocket = vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1
})) as any;