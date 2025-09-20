import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Sphere, Plane, Environment, PerspectiveCamera, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '@mui/material';

// 3D Components from LandingPage
function FallingRocks() {
  const groupRef = useRef<THREE.Group>(null);
  const rocksRef = useRef<Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; rotation: THREE.Vector3 }>>([]);
  const theme = useTheme();

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Animate falling rocks
      rocksRef.current.forEach((rock, index) => {
        if (rock.mesh) {
          // Apply gravity and movement
          rock.velocity.y -= 9.8 * delta * 0.5; // Gravity
          rock.mesh.position.add(rock.velocity.clone().multiplyScalar(delta));

          // Rotate rocks as they fall
          rock.mesh.rotation.x += rock.rotation.x * delta;
          rock.mesh.rotation.y += rock.rotation.y * delta;
          rock.mesh.rotation.z += rock.rotation.z * delta;

          // Reset rocks that fall too far
          if (rock.mesh.position.y < -15) {
            rock.mesh.position.set(
              (Math.random() - 0.5) * 30,
              15 + Math.random() * 10,
              (Math.random() - 0.5) * 30
            );
            rock.velocity.set(
              (Math.random() - 0.5) * 2,
              0,
              (Math.random() - 0.5) * 2
            );
          }
        }
      });
    }
  });

  // Create rocks with physics
  const createRocks = () => {
    const rocks = [];
    for (let i = 0; i < 15; i++) {
      rocks.push(
        <mesh
          key={i}
          ref={(ref) => {
            if (ref && !rocksRef.current[i]) {
              rocksRef.current[i] = {
                mesh: ref,
                velocity: new THREE.Vector3(
                  (Math.random() - 0.5) * 2,
                  0,
                  (Math.random() - 0.5) * 2
                ),
                rotation: new THREE.Vector3(
                  (Math.random() - 0.5) * 4,
                  (Math.random() - 0.5) * 4,
                  (Math.random() - 0.5) * 4
                )
              };
            }
          }}
          position={[
            (Math.random() - 0.5) * 30,
            15 + Math.random() * 10,
            (Math.random() - 0.5) * 30
          ]}
          scale={[
            0.3 + Math.random() * 0.8,
            0.3 + Math.random() * 0.8,
            0.3 + Math.random() * 0.8
          ]}
          rotation={[Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]}
        >
          <dodecahedronGeometry args={[1]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? '#8d6e63' : i % 3 === 1 ? '#5d4037' : '#6d4c41'}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      );
    }
    return rocks;
  };

  return (
    <group ref={groupRef}>
      {createRocks()}
    </group>
  );
}

function OpenPitMine() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.02) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Create multiple pit levels */}
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[0, -i * 2, 0]}>
          <ringGeometry args={[(15 - i * 2) * 0.7, 15 - i * 2, 32]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#8d6e63' : '#6d4c41'}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* Mining equipment */}
      <Box args={[2, 1, 4]} position={[8, -2, 3]}>
        <meshStandardMaterial color="#ffeb3b" roughness={0.3} metalness={0.7} />
      </Box>
      <Box args={[2, 1, 4]} position={[-6, -4, -2]}>
        <meshStandardMaterial color="#ffeb3b" roughness={0.3} metalness={0.7} />
      </Box>
    </group>
  );
}

function SensorNetwork() {
  const groupRef = useRef<THREE.Group>(null);
  const theme = useTheme();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        // Pulsing effect for sensors
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3 + index) * 0.1;
        child.scale.setScalar(scale);
      });
    }
  });

  // Realistic sensor positions around the mine pit
  const sensorPositions: [number, number, number][] = [
    // Rim sensors
    [-12, 2, -12], [12, 2, -12], [-12, 2, 12], [12, 2, 12],
    [0, 2, -15], [0, 2, 15], [-15, 2, 0], [15, 2, 0],
    // Mid-level sensors
    [-8, -2, -8], [8, -2, -8], [-8, -2, 8], [8, -2, 8],
    // Deep sensors
    [-4, -6, -4], [4, -6, -4], [-4, -6, 4], [4, -6, 4],
    [0, -8, 0]
  ];

  return (
    <group ref={groupRef}>
      {sensorPositions.map((position, index) => (
        <group key={index} position={position}>
          {/* Sensor housing */}
          <Box args={[0.4, 0.6, 0.4]}>
            <meshStandardMaterial
              color={theme.palette.primary.main}
              emissive={theme.palette.primary.main}
              emissiveIntensity={0.2}
              roughness={0.3}
              metalness={0.7}
            />
          </Box>

          {/* Status light */}
          <Sphere args={[0.08, 8, 8]} position={[0, 0.4, 0.25]}>
            <meshStandardMaterial
              color={index % 3 === 0 ? '#4caf50' : index % 3 === 1 ? '#ff9800' : '#f44336'}
              emissive={index % 3 === 0 ? '#4caf50' : index % 3 === 1 ? '#ff9800' : '#f44336'}
              emissiveIntensity={0.8}
            />
          </Sphere>
        </group>
      ))}
    </group>
  );
}

const Scene3D: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[25, 15, 25]} />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          autoRotate
          autoRotateSpeed={0.3}
          minDistance={15}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2.2}
        />

        {/* Realistic mining lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[20, 20, 10]}
          intensity={1.2}
          castShadow
        />

        {/* Additional lighting for depth */}
        <pointLight position={[0, 10, 0]} intensity={0.5} color="#ffffff" />
        <pointLight position={[-15, 5, -15]} intensity={0.3} color="#ff9800" />
        <pointLight position={[15, 5, 15]} intensity={0.3} color="#2196f3" />

        {/* Environment */}
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
        <Environment preset="dawn" />

        {/* Fog for atmosphere */}
        <fog attach="fog" args={['#1a1a1a', 30, 100]} />

        {/* 3D Elements */}
        <OpenPitMine />
        <FallingRocks />
        <SensorNetwork />

        {/* Ground plane */}
        <Plane args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -12, 0]}>
          <meshStandardMaterial color="#2e2e2e" roughness={0.9} />
        </Plane>
      </Canvas>
    </div>
  );
};

export default Scene3D;