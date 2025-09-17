import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { TerrainMesh, RiskHeatmapData } from '@/types';

interface TerrainMeshProps {
  terrainData: TerrainMesh;
  riskHeatmap: RiskHeatmapData | null;
  animationSpeed: number;
}

const TerrainMeshComponent: React.FC<TerrainMeshProps> = ({ 
  terrainData, 
  riskHeatmap, 
  animationSpeed 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Custom shader for risk visualization
  const vertexShader = `
    attribute vec3 color;
    varying vec3 vColor;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vColor = color;
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  const fragmentShader = `
    uniform float time;
    uniform float riskThreshold;
    uniform vec3 lowRiskColor;
    uniform vec3 mediumRiskColor;
    uniform vec3 highRiskColor;
    uniform vec3 criticalRiskColor;
    
    varying vec3 vColor;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    vec3 getRiskColor(float risk) {
      if (risk < 0.25) {
        return mix(lowRiskColor, mediumRiskColor, risk * 4.0);
      } else if (risk < 0.5) {
        return mix(mediumRiskColor, highRiskColor, (risk - 0.25) * 4.0);
      } else if (risk < 0.75) {
        return mix(highRiskColor, criticalRiskColor, (risk - 0.5) * 4.0);
      } else {
        return criticalRiskColor;
      }
    }
    
    void main() {
      float risk = length(vColor);
      vec3 baseColor = getRiskColor(risk);
      
      // Add pulsing effect for high risk areas
      float pulse = sin(time * 3.0) * 0.1 + 0.9;
      if (risk > riskThreshold) {
        baseColor *= pulse;
      }
      
      // Basic lighting
      vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
      float lightIntensity = max(dot(vNormal, lightDirection), 0.3);
      
      gl_FragColor = vec4(baseColor * lightIntensity, 1.0);
    }
  `;
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(terrainData.vertices, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(terrainData.normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(terrainData.uvs, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(terrainData.risk_colors, 3));
    geo.setIndex(new THREE.BufferAttribute(terrainData.indices, 1));
    return geo;
  }, [terrainData]);
  
  const uniforms = useMemo(() => ({
    time: { value: 0 },
    riskThreshold: { value: 0.5 },
    lowRiskColor: { value: new THREE.Color(0x00ff00) },
    mediumRiskColor: { value: new THREE.Color(0xffff00) },
    highRiskColor: { value: new THREE.Color(0xff8000) },
    criticalRiskColor: { value: new THREE.Color(0xff0000) }
  }), []);
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime * animationSpeed;
    }
  });
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
};

interface SensorMarkersProps {
  hexapodStatuses: any[];
  sensorReadings: any[];
}

const SensorMarkers: React.FC<SensorMarkersProps> = ({ hexapodStatuses, sensorReadings }) => {
  return (
    <group>
      {hexapodStatuses.map((hexapod) => (
        <mesh
          key={hexapod.pod_id}
          position={[
            hexapod.location.mine_grid_x,
            hexapod.location.elevation + 2,
            hexapod.location.mine_grid_y
          ]}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={
              hexapod.operational_status === 'active' ? '#00ff00' :
              hexapod.operational_status === 'warning' ? '#ffff00' :
              hexapod.operational_status === 'error' ? '#ff0000' : '#888888'
            }
            emissive={
              hexapod.operational_status === 'active' ? '#004400' :
              hexapod.operational_status === 'warning' ? '#444400' :
              hexapod.operational_status === 'error' ? '#440000' : '#222222'
            }
          />
        </mesh>
      ))}
    </group>
  );
};

interface TerrainVisualizationProps {
  className?: string;
}

const TerrainVisualization: React.FC<TerrainVisualizationProps> = ({ className }) => {
  const {
    riskHeatmap,
    hexapodStatuses,
    sensorReadings,
    animationSpeed,
    riskThreshold
  } = useDashboardStore();
  
  // Mock terrain data - in real implementation, this would come from the digital twin
  const mockTerrainData: TerrainMesh = useMemo(() => {
    const size = 100;
    const vertices = new Float32Array(size * size * 3);
    const normals = new Float32Array(size * size * 3);
    const uvs = new Float32Array(size * size * 2);
    const riskColors = new Float32Array(size * size * 3);
    const indices = new Uint32Array((size - 1) * (size - 1) * 6);
    
    // Generate terrain vertices with some height variation
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = i * size + j;
        const x = (i - size / 2) * 2;
        const z = (j - size / 2) * 2;
        const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 10;
        
        vertices[index * 3] = x;
        vertices[index * 3 + 1] = y;
        vertices[index * 3 + 2] = z;
        
        // Simple normal calculation
        normals[index * 3] = 0;
        normals[index * 3 + 1] = 1;
        normals[index * 3 + 2] = 0;
        
        // UV coordinates
        uvs[index * 2] = i / (size - 1);
        uvs[index * 2 + 1] = j / (size - 1);
        
        // Mock risk colors based on position
        const risk = Math.random();
        riskColors[index * 3] = risk;
        riskColors[index * 3 + 1] = risk;
        riskColors[index * 3 + 2] = risk;
      }
    }
    
    // Generate indices for triangles
    let indexCount = 0;
    for (let i = 0; i < size - 1; i++) {
      for (let j = 0; j < size - 1; j++) {
        const a = i * size + j;
        const b = i * size + j + 1;
        const c = (i + 1) * size + j;
        const d = (i + 1) * size + j + 1;
        
        indices[indexCount++] = a;
        indices[indexCount++] = b;
        indices[indexCount++] = c;
        
        indices[indexCount++] = b;
        indices[indexCount++] = d;
        indices[indexCount++] = c;
      }
    }
    
    return { vertices, normals, uvs, riskColors, indices };
  }, []);
  
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Canvas>
        <PerspectiveCamera makeDefault position={[50, 50, 50]} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minDistance={10}
          maxDistance={200}
        />
        
        <Environment preset="sunset" />
        
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[50, 50, 25]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        <TerrainMeshComponent
          terrainData={mockTerrainData}
          riskHeatmap={riskHeatmap}
          animationSpeed={animationSpeed}
        />
        
        <SensorMarkers
          hexapodStatuses={hexapodStatuses}
          sensorReadings={sensorReadings}
        />
        
        {/* Grid helper for reference */}
        <gridHelper args={[200, 20, '#444444', '#222222']} />
      </Canvas>
    </motion.div>
  );
};

export default TerrainVisualization;