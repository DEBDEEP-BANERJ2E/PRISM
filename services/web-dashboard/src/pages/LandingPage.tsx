import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Plane, Environment, PerspectiveCamera, Float, MeshDistortMaterial, Stars } from '@react-three/drei';
import { motion, useScroll, useTransform, useAnimation } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import {
  Box as MuiBox,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Paper
} from '@mui/material';
import {
  PlayArrow,
  Security,
  Analytics,
  Engineering,
  Terrain,
  Sensors,
  Warning,
  TrendingUp,
  Speed,
  CheckCircle,
  ArrowForward,
  KeyboardArrowDown,
  Science,
  ViewInAr,
  Assessment,
  Timeline,
  Shield,
  Insights,
  Code,
  LinkedIn,
  GitHub,
  Email,
  Person,
  School,
  Work
} from '@mui/icons-material';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// 3D Components
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
          <dodecahedronGeometry args={[1, 0]} />
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
  const theme = useTheme();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.02) * 0.05;
    }
  });

  // Create terraced open-pit mine geometry
  const createPitLevel = (radius: number, depth: number, segments: number = 32) => {
    const geometry = new THREE.RingGeometry(radius * 0.7, radius, 0, Math.PI * 2, segments);
    const vertices = geometry.attributes.position.array as Float32Array;

    // Add some randomness to make it look more natural
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i + 2] = -depth + (Math.random() - 0.5) * 0.5; // Z is depth
    }

    geometry.computeVertexNormals();
    return geometry;
  };

  // Create mining equipment
  const MiningTruck = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      {/* Truck body */}
      <Box args={[2, 1, 4]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#ffeb3b" roughness={0.3} metalness={0.7} />
      </Box>
      {/* Truck bed */}
      <Box args={[1.8, 0.8, 2]} position={[0, 1.2, -1]}>
        <meshStandardMaterial color="#424242" roughness={0.8} metalness={0.2} />
      </Box>
      {/* Wheels */}
      {[[-0.8, -0.2, 1.5], [0.8, -0.2, 1.5], [-0.8, -0.2, -1.5], [0.8, -0.2, -1.5]].map((pos, i) => (
        <Sphere key={i} args={[0.4, 8, 8]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#212121" roughness={0.9} />
        </Sphere>
      ))}
    </group>
  );

  // Create excavator
  const Excavator = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      {/* Base */}
      <Box args={[2, 1, 3]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#ff9800" roughness={0.3} metalness={0.7} />
      </Box>
      {/* Arm */}
      <Box args={[0.3, 0.3, 4]} position={[0, 1.5, 2]} rotation={[0.3, 0, 0]}>
        <meshStandardMaterial color="#ff5722" roughness={0.3} metalness={0.7} />
      </Box>
      {/* Bucket */}
      <Box args={[1.5, 0.8, 0.8]} position={[0, 2.8, 4.5]} rotation={[0.5, 0, 0]}>
        <meshStandardMaterial color="#424242" roughness={0.8} metalness={0.2} />
      </Box>
    </group>
  );

  return (
    <group ref={groupRef}>
      {/* Create multiple pit levels */}
      {[...Array(6)].map((_, i) => (
        <mesh key={i} geometry={createPitLevel(15 - i * 2, i * 2)} position={[0, -i * 2, 0]}>
          <meshStandardMaterial
            color={i % 2 === 0 ? '#8d6e63' : '#6d4c41'}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* Mining roads/ramps */}
      {[...Array(5)].map((_, i) => (
        <Box
          key={`road-${i}`}
          args={[1, 0.1, 8]}
          position={[
            Math.cos((i * Math.PI * 2) / 5) * (12 - i * 1.5),
            -i * 2 + 0.1,
            Math.sin((i * Math.PI * 2) / 5) * (12 - i * 1.5)
          ]}
          rotation={[0, (i * Math.PI * 2) / 5, 0]}
        >
          <meshStandardMaterial color="#424242" roughness={0.8} />
        </Box>
      ))}

      {/* Mining equipment */}
      <MiningTruck position={[8, -2, 3]} />
      <MiningTruck position={[-6, -4, -2]} />
      <Excavator position={[2, -6, 1]} />

      {/* Rock piles */}
      {[...Array(8)].map((_, i) => (
        <group key={`pile-${i}`} position={[
          (Math.random() - 0.5) * 20,
          -Math.random() * 8,
          (Math.random() - 0.5) * 20
        ]}>
          {[...Array(5)].map((_, j) => (
            <Box
              key={j}
              args={[
                0.5 + Math.random() * 0.5,
                0.3 + Math.random() * 0.4,
                0.5 + Math.random() * 0.5
              ]}
              position={[
                (Math.random() - 0.5) * 2,
                Math.random() * 1,
                (Math.random() - 0.5) * 2
              ]}
              rotation={[Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]}
            >
              <meshStandardMaterial
                color={j % 2 === 0 ? '#795548' : '#5d4037'}
                roughness={0.9}
                metalness={0.1}
              />
            </Box>
          ))}
        </group>
      ))}
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

  const SensorPod = ({ position, index }: { position: [number, number, number]; index: number }) => (
    <group position={position}>
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

      {/* Antenna */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
        <meshStandardMaterial
          color={theme.palette.secondary.main}
          emissive={theme.palette.secondary.main}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Status light */}
      <Sphere args={[0.08, 8, 8]} position={[0, 0.4, 0.25]}>
        <meshStandardMaterial
          color={index % 3 === 0 ? '#4caf50' : index % 3 === 1 ? '#ff9800' : '#f44336'}
          emissive={index % 3 === 0 ? '#4caf50' : index % 3 === 1 ? '#ff9800' : '#f44336'}
          emissiveIntensity={0.8}
        />
      </Sphere>

      {/* Detection beam (invisible but shows coverage) */}
      <mesh position={[0, 1, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[2, 4, 8, 1, true]} />
        <meshStandardMaterial
          color={theme.palette.primary.main}
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Mounting pole */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.6, 8]} />
        <meshStandardMaterial color="#424242" roughness={0.8} metalness={0.3} />
      </mesh>
    </group>
  );

  return (
    <group ref={groupRef}>
      {sensorPositions.map((position, index) => (
        <SensorPod key={index} position={position} index={index} />
      ))}

      {/* Warning signs */}
      {[
        [-10, 1, -10], [10, 1, -10], [-10, 1, 10], [10, 1, 10]
      ].map((position, index) => (
        <group key={`sign-${index}`} position={position as [number, number, number]}>
          <Box args={[0.1, 2, 1.5]} position={[0, 1, 0]}>
            <meshStandardMaterial color="#ffeb3b" roughness={0.2} />
          </Box>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
            <meshStandardMaterial color="#424242" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Scene3D() {
  return (
    <>
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
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
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

      {/* Dust clouds */}
      {[...Array(5)].map((_, i) => (
        <Float key={`dust-${i}`} speed={0.5} rotationIntensity={0.1} floatIntensity={0.3}>
          <Sphere
            args={[2 + Math.random() * 3, 8, 8]}
            position={[
              (Math.random() - 0.5) * 40,
              Math.random() * 5 - 2,
              (Math.random() - 0.5) * 40
            ]}
          >
            <meshStandardMaterial
              color="#8d6e63"
              transparent
              opacity={0.1}
              roughness={1}
            />
          </Sphere>
        </Float>
      ))}

      {/* Danger zones (red warning areas) */}
      {[
        [-8, 1, -8], [12, 1, 5], [-5, 1, 10]
      ].map((position, i) => (
        <Float key={`danger-${i}`} speed={2} rotationIntensity={0} floatIntensity={0.2}>
          <Plane
            args={[4, 4]}
            position={position as [number, number, number]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <meshStandardMaterial
              color="#f44336"
              transparent
              opacity={0.3}
              emissive="#f44336"
              emissiveIntensity={0.2}
            />
          </Plane>
        </Float>
      ))}

      {/* Safety zones (green areas) */}
      {[
        [0, 1, -12], [-12, 1, 0], [12, 1, -12]
      ].map((position, i) => (
        <Plane
          key={`safe-${i}`}
          args={[3, 3]}
          position={position as [number, number, number]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial
            color="#4caf50"
            transparent
            opacity={0.2}
            emissive="#4caf50"
            emissiveIntensity={0.1}
          />
        </Plane>
      ))}

      {/* Ground plane */}
      <Plane args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -12, 0]}>
        <meshStandardMaterial color="#2e2e2e" roughness={0.9} />
      </Plane>
    </>
  );
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const controls = useAnimation();

  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    // GSAP Animations
    const tl = gsap.timeline();

    // Hero section animation
    tl.fromTo('.hero-title',
      { opacity: 0, y: 100, scale: 0.8 },
      { opacity: 1, y: 0, scale: 1, duration: 1.5, ease: 'power3.out' }
    )
      .fromTo('.hero-subtitle',
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power2.out' },
        '-=1'
      )
      .fromTo('.hero-buttons',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
        '-=0.5'
      );

    // Features animation with ScrollTrigger
    gsap.fromTo('.feature-card',
      { opacity: 0, y: 100, rotationX: -15 },
      {
        opacity: 1,
        y: 0,
        rotationX: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.features-section',
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse'
        }
      }
    );

    // Stats animation
    gsap.fromTo('.stat-item',
      { opacity: 0, scale: 0.5 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: '.stats-section',
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        }
      }
    );

    setIsLoaded(true);
    controls.start('visible');

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [controls]);

  const features = [
    {
      icon: <Assessment />,
      title: 'AI-Powered Risk Assessment',
      description: 'Advanced machine learning algorithms analyze geological data to predict rockfall risks with 94% accuracy.',
      color: theme.palette.primary.main
    },
    {
      icon: <Sensors />,
      title: 'Real-Time Monitoring',
      description: 'Network of IoT sensors continuously monitor slope stability, ground movement, and environmental conditions.',
      color: theme.palette.secondary.main
    },
    {
      icon: <Warning />,
      title: 'Early Warning System',
      description: 'Automated alerts and notifications provide critical time for evacuation and safety measures.',
      color: theme.palette.error.main
    },
    {
      icon: <Analytics />,
      title: 'Predictive Analytics',
      description: 'Historical data analysis and trend prediction help optimize mining operations and safety protocols.',
      color: theme.palette.info.main
    },
    {
      icon: <ViewInAr />,
      title: 'Digital Twin Technology',
      description: '3D visualization and simulation of mine sites for comprehensive risk analysis and planning.',
      color: theme.palette.success.main
    },
    {
      icon: <Engineering />,
      title: 'Automated Response',
      description: 'Integration with mining equipment for automatic shutdown and rerouting during high-risk conditions.',
      color: theme.palette.warning.main
    }
  ];

  const stats = [
    { value: '94%', label: 'Prediction Accuracy', icon: <TrendingUp /> },
    { value: '24/7', label: 'Continuous Monitoring', icon: <Speed /> },
    { value: '500+', label: 'Active Sensors', icon: <Sensors /> },
    { value: '99.9%', label: 'System Uptime', icon: <CheckCircle /> }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <MuiBox
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%),
          linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)
        `,
        position: 'relative',
        overflow: 'auto'
      }}
    >
      {/* Navigation Header */}
      <MuiBox
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
        }}
      >
        <Container maxWidth="lg">
          <MuiBox
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              PRISM
            </Typography>

            <MuiBox display="flex" gap={2} alignItems="center">
              <Button
                color="inherit"
                onClick={() => navigate('/pricing')}
                sx={{ color: 'text.primary' }}
              >
                Pricing
              </Button>
              <Button
                color="inherit"
                onClick={() => navigate('/waitlist')}
                sx={{ color: 'text.primary' }}
              >
                Join Waitlist
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1)
                  }
                }}
              >
                Login
              </Button>
            </MuiBox>
          </MuiBox>
        </Container>
      </MuiBox>

      {/* Falling Rocks Animation */}
      <MuiBox
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 8 + 4,
              height: Math.random() * 8 + 4,
              backgroundColor: '#8d6e63',
              borderRadius: Math.random() > 0.5 ? '50%' : '20%',
              opacity: Math.random() * 0.7 + 0.3,
              left: `${Math.random() * 100}%`,
              top: '-10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
            animate={{
              y: [0, 1200],
              x: [0, (Math.random() - 0.5) * 100],
              rotate: [0, Math.random() * 360]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: "easeIn",
              delay: Math.random() * 5
            }}
          />
        ))}

        {/* Dust clouds */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`dust-${i}`}
            style={{
              position: 'absolute',
              width: Math.random() * 40 + 20,
              height: Math.random() * 40 + 20,
              backgroundColor: '#8d6e63',
              borderRadius: '50%',
              opacity: 0.1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: 'blur(10px)'
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.3, 0.1],
              x: [0, Math.random() * 50 - 25, 0]
            }}
            transition={{
              duration: Math.random() * 8 + 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </MuiBox>

      {/* Hero Section */}
      <MuiBox
        ref={heroRef}
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2,
          pt: 8, // Account for fixed header
          backgroundImage: 'url(https://www.geostabilization.com/wp-content/uploads/2024/02/US340-Scaling-Rock-Removal-scaled.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >

        {/* Floating Mobile App */}
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          style={{
            position: 'absolute',
            right: '5%',
            top: '20%',
            transform: 'translateY(-20%)',
            zIndex: 10
          }}
        >
          <MuiBox
            sx={{
              width: 260,
              height: 520,
              background: 'linear-gradient(145deg, #1a1a1a, #2d2d2d)',
              borderRadius: 6,
              border: `2px solid ${theme.palette.primary.main}`,
              boxShadow: `0 25px 60px ${alpha(theme.palette.primary.main, 0.4)}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Phone Screen */}
            <MuiBox
              sx={{
                width: '100%',
                height: '100%',
                background: '#000',
                borderRadius: 4,
                p: 2,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Status Bar */}
              <MuiBox
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  color: 'white',
                  fontSize: '0.8rem'
                }}
              >
                <Typography variant="caption">9:41 AM</Typography>
                <Typography variant="caption">100% 🔋</Typography>
              </MuiBox>

              {/* App Header */}
              <MuiBox
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3,
                  pb: 2,
                  borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                }}
              >
                <MuiBox
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Terrain sx={{ fontSize: 18, color: 'white' }} />
                </MuiBox>
                <Typography variant="h6" color="white" fontWeight="bold">
                  PRISM
                </Typography>
              </MuiBox>

              {/* Critical Alert */}
              <motion.div
                animate={{
                  scale: [1, 1.02, 1],
                  boxShadow: [
                    `0 4px 20px ${alpha(theme.palette.error.main, 0.3)}`,
                    `0 8px 30px ${alpha(theme.palette.error.main, 0.6)}`,
                    `0 4px 20px ${alpha(theme.palette.error.main, 0.3)}`
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Paper
                  sx={{
                    p: 2,
                    mb: 2,
                    background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                    border: `1px solid ${theme.palette.error.light}`,
                    borderRadius: 2
                  }}
                >
                  <MuiBox display="flex" alignItems="center" gap={1} mb={1}>
                    <Warning sx={{ color: 'white', fontSize: 20 }} />
                    <Typography variant="subtitle2" color="white" fontWeight="bold">
                      CRITICAL ALERT
                    </Typography>
                  </MuiBox>
                  <Typography variant="body2" color="white" sx={{ mb: 1 }}>
                    Rockfall detected in Sector 7-A
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.8)">
                    Risk Level: 94% • 2 minutes ago
                  </Typography>
                </Paper>
              </motion.div>

              {/* High Priority Alert */}
              <Paper
                sx={{
                  p: 2,
                  mb: 2,
                  background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                  border: `1px solid ${theme.palette.warning.light}`,
                  borderRadius: 2
                }}
              >
                <MuiBox display="flex" alignItems="center" gap={1} mb={1}>
                  <Speed sx={{ color: 'white', fontSize: 20 }} />
                  <Typography variant="subtitle2" color="white" fontWeight="bold">
                    HIGH PRIORITY
                  </Typography>
                </MuiBox>
                <Typography variant="body2" color="white" sx={{ mb: 1 }}>
                  Slope instability detected
                </Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.8)">
                  Risk Level: 78% • 5 minutes ago
                </Typography>
              </Paper>

              {/* Medium Alert */}
              <Paper
                sx={{
                  p: 2,
                  mb: 2,
                  background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                  border: `1px solid ${theme.palette.info.light}`,
                  borderRadius: 2
                }}
              >
                <MuiBox display="flex" alignItems="center" gap={1} mb={1}>
                  <Sensors sx={{ color: 'white', fontSize: 20 }} />
                  <Typography variant="subtitle2" color="white" fontWeight="bold">
                    SENSOR UPDATE
                  </Typography>
                </MuiBox>
                <Typography variant="body2" color="white" sx={{ mb: 1 }}>
                  Sensor S-247 maintenance required
                </Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.8)">
                  Battery: 15% • 1 hour ago
                </Typography>
              </Paper>

              {/* Success Alert */}
              <Paper
                sx={{
                  p: 2,
                  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                  border: `1px solid ${theme.palette.success.light}`,
                  borderRadius: 2
                }}
              >
                <MuiBox display="flex" alignItems="center" gap={1} mb={1}>
                  <CheckCircle sx={{ color: 'white', fontSize: 20 }} />
                  <Typography variant="subtitle2" color="white" fontWeight="bold">
                    ALL CLEAR
                  </Typography>
                </MuiBox>
                <Typography variant="body2" color="white" sx={{ mb: 1 }}>
                  Sector 12-B risk assessment complete
                </Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.8)">
                  Risk Level: 12% • 2 hours ago
                </Typography>
              </Paper>
            </MuiBox>

            {/* Floating notification dots */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                style={{
                  position: 'absolute',
                  right: -6,
                  top: 100 + i * 80,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: i === 0 ? theme.palette.error.main : i === 1 ? theme.palette.warning.main : theme.palette.info.main,
                  boxShadow: `0 0 15px ${i === 0 ? theme.palette.error.main : i === 1 ? theme.palette.warning.main : theme.palette.info.main}`
                }}
                animate={{
                  scale: [1, 1.6, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
              />
            ))}
          </MuiBox>
        </motion.div>

        {/* Hero Content */}
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div style={{ y, opacity }}>
            <MuiBox textAlign="center">
              <Typography
                className="hero-title"
                variant="h1"
                sx={{
                  fontSize: { xs: '3rem', md: '5rem', lg: '6rem' },
                  fontWeight: 900,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 50%, ${theme.palette.info.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2,
                  textShadow: '0 0 30px rgba(0, 255, 136, 0.3)'
                }}
              >
                PRISM
              </Typography>

              <Typography
                className="hero-subtitle"
                variant="h3"
                sx={{
                  fontSize: { xs: '1.5rem', md: '2.5rem' },
                  fontWeight: 300,
                  color: 'text.primary',
                  mb: 2,
                  opacity: 0.9
                }}
              >
                Predictive Rockfall Intelligence
              </Typography>

              <Typography
                className="hero-subtitle"
                variant="h4"
                sx={{
                  fontSize: { xs: '1.2rem', md: '2rem' },
                  fontWeight: 300,
                  color: 'text.secondary',
                  mb: 4
                }}
              >
                & Safety Management
              </Typography>

              <Typography
                className="hero-subtitle"
                variant="h6"
                sx={{
                  maxWidth: 600,
                  mx: 'auto',
                  mb: 6,
                  color: 'text.secondary',
                  lineHeight: 1.6
                }}
              >
                Revolutionary AI-powered system for predicting and preventing rockfall incidents in open-pit mining operations.
                Protecting lives, equipment, and operations through advanced predictive analytics.
              </Typography>

              <MuiBox
                className="hero-buttons"
                display="flex"
                gap={3}
                justifyContent="center"
                flexWrap="wrap"
                sx={{ mt: 4 }}
              >
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrow />}
                  onClick={() => navigate('/waitlist')}
                  sx={{
                    px: 6,
                    py: 3,
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                    border: 'none',
                    borderRadius: 3,
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: `0 16px 48px ${alpha(theme.palette.primary.main, 0.6)}`,
                      background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`
                    }
                  }}
                >
                  Join Waitlist
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<Science />}
                  onClick={() => navigate('/pricing')}
                  sx={{
                    px: 6,
                    py: 3,
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    borderColor: theme.palette.secondary.main,
                    color: theme.palette.secondary.main,
                    borderWidth: 2,
                    borderRadius: 3,
                    '&:hover': {
                      borderColor: theme.palette.secondary.light,
                      backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                      transform: 'translateY(-3px)',
                      boxShadow: `0 16px 48px ${alpha(theme.palette.secondary.main, 0.3)}`
                    }
                  }}
                >
                  View Pricing
                </Button>

                <Button
                  variant="text"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    px: 6,
                    py: 3,
                    fontSize: '1.1rem',
                    color: theme.palette.text.primary,
                    borderRadius: 3,
                    '&:hover': {
                      color: theme.palette.primary.main,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  Login / Signup
                </Button>
              </MuiBox>
            </MuiBox>
          </motion.div>
        </Container>

        {/* Scroll Indicator */}
        <MuiBox
          sx={{
            position: 'absolute',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2
          }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <IconButton
              onClick={() => {
                const featuresSection = document.querySelector('.features-section');
                if (featuresSection) {
                  featuresSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  });
                }
              }}
              sx={{
                color: theme.palette.primary.main,
                fontSize: '2rem',
                cursor: 'pointer',
                '&:hover': {
                  color: theme.palette.primary.light,
                  transform: 'scale(1.1)'
                }
              }}
            >
              <KeyboardArrowDown fontSize="large" />
            </IconButton>
          </motion.div>
        </MuiBox>
      </MuiBox>

      {/* Features Section */}
      <MuiBox className="features-section" sx={{ py: 12, position: 'relative', zIndex: 2 }}>
        <Container maxWidth="lg">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={controls}
          >
            <Typography
              variant="h2"
              textAlign="center"
              gutterBottom
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                fontWeight: 700,
                mb: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              PRISM
            </Typography>
            <Typography
              variant="h5"
              textAlign="center"
              gutterBottom
              sx={{
                fontSize: { xs: '1.2rem', md: '1.5rem' },
                fontWeight: 400,
                mb: 6,
                color: 'text.secondary',
                opacity: 0.9
              }}
            >
              Predictive Rockfall Intelligence & Safety Management
            </Typography>

            <Grid container spacing={4}>
              {features.map((feature, index) => (
                <Grid item xs={12} md={6} lg={4} key={index}>
                  <motion.div
                    className="feature-card"
                    variants={itemVariants}
                    whileHover={{
                      scale: 1.05,
                      rotateY: 5,
                      transition: { duration: 0.3 }
                    }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(feature.color, 0.3)}`,
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          border: `1px solid ${alpha(feature.color, 0.6)}`,
                          boxShadow: `0 20px 40px ${alpha(feature.color, 0.2)}`
                        }
                      }}
                    >
                      {/* Gradient Overlay */}
                      <MuiBox
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: `linear-gradient(90deg, ${feature.color} 0%, ${alpha(feature.color, 0.5)} 100%)`
                        }}
                      />

                      <CardContent sx={{ p: 4 }}>
                        <Avatar
                          sx={{
                            width: 64,
                            height: 64,
                            mb: 3,
                            background: `linear-gradient(135deg, ${feature.color} 0%, ${alpha(feature.color, 0.7)} 100%)`,
                            boxShadow: `0 8px 32px ${alpha(feature.color, 0.3)}`
                          }}
                        >
                          {React.cloneElement(feature.icon, { sx: { fontSize: 32 } })}
                        </Avatar>

                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          {feature.title}
                        </Typography>

                        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          {feature.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </MuiBox>

      {/* Stats Section */}
      <MuiBox className="stats-section" sx={{ py: 12, backgroundColor: alpha(theme.palette.background.paper, 0.5) }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            textAlign="center"
            gutterBottom
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 700,
              mb: 2,
              color: 'text.primary'
            }}
          >
            Proven Performance
          </Typography>

          <Typography
            variant="h6"
            textAlign="center"
            sx={{
              mb: 8,
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto'
            }}
          >
            Real-world results from mining operations worldwide, backed by cutting-edge AI and continuous innovation
          </Typography>

          <Grid container spacing={4} sx={{ mb: 8 }}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <motion.div
                  className="stat-item"
                  whileHover={{
                    scale: 1.05,
                    rotateY: 5,
                    transition: { duration: 0.3 }
                  }}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    sx={{
                      textAlign: 'center',
                      p: 4,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                        boxShadow: `0 20px 40px ${alpha(theme.palette.primary.main, 0.2)}`
                      }
                    }}
                  >
                    {/* Animated background pulse */}
                    <motion.div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
                        zIndex: 0
                      }}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: index * 0.5
                      }}
                    />

                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        mx: 'auto',
                        mb: 3,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        position: 'relative',
                        zIndex: 1,
                        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`
                      }}
                    >
                      {stat.icon}
                    </Avatar>

                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.5, type: "spring", stiffness: 200 }}
                    >
                      <Typography
                        variant="h2"
                        fontWeight="bold"
                        sx={{
                          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          mb: 1,
                          position: 'relative',
                          zIndex: 1
                        }}
                      >
                        {stat.value}
                      </Typography>
                    </motion.div>

                    <Typography variant="body1" color="text.secondary" sx={{ position: 'relative', zIndex: 1 }}>
                      {stat.label}
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Performance Metrics Details */}
          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} md={4}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Card
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.dark, 0.05)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    height: '100%'
                  }}
                >
                  <MuiBox display="flex" alignItems="center" mb={2}>
                    <Avatar
                      sx={{
                        background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                        mr: 2
                      }}
                    >
                      <Timeline />
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold">
                      Risk Reduction
                    </Typography>
                  </MuiBox>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    87% reduction in rockfall incidents across monitored sites
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Early warning system prevents 95% of potential accidents
                    • Automated equipment shutdown saves millions in damage
                    • Zero fatalities in PRISM-protected zones since deployment
                  </Typography>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={4}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
              >
                <Card
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.dark, 0.05)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                    height: '100%'
                  }}
                >
                  <MuiBox display="flex" alignItems="center" mb={2}>
                    <Avatar
                      sx={{
                        background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                        mr: 2
                      }}
                    >
                      <Shield />
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold">
                      Operational Efficiency
                    </Typography>
                  </MuiBox>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    42% improvement in mining operation efficiency
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Predictive maintenance reduces downtime by 60%
                    • Optimized blast patterns increase yield by 23%
                    • Real-time route optimization saves 15% fuel costs
                  </Typography>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={4}>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 }}
              >
                <Card
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.dark, 0.05)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                    height: '100%'
                  }}
                >
                  <MuiBox display="flex" alignItems="center" mb={2}>
                    <Avatar
                      sx={{
                        background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                        mr: 2
                      }}
                    >
                      <Insights />
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold">
                      Cost Savings
                    </Typography>
                  </MuiBox>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    $2.3M average annual savings per mining site
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Insurance premium reductions up to 35%
                    • Equipment damage prevention saves $1.8M annually
                    • Reduced regulatory fines and compliance costs
                  </Typography>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </MuiBox>

      {/* About Section */}
      <MuiBox sx={{ py: 12, backgroundColor: alpha(theme.palette.background.default, 0.5) }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            textAlign="center"
            gutterBottom
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 700,
              mb: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            About PRISM
          </Typography>

          <Typography
            variant="h6"
            textAlign="center"
            sx={{
              mb: 8,
              color: 'text.secondary',
              maxWidth: 800,
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Built by industry experts and cutting-edge AI researchers, PRISM represents the future of mining safety technology.
            Our mission is to protect lives and optimize operations through intelligent prediction and prevention systems.
          </Typography>

          {/* Developer Team */}
          <Typography
            variant="h4"
            textAlign="center"
            gutterBottom
            sx={{
              fontSize: { xs: '1.5rem', md: '2rem' },
              fontWeight: 600,
              mb: 6,
              color: 'text.primary'
            }}
          >
            Meet Our Team
          </Typography>

          <Grid container spacing={4} justifyContent="center">
            {[
              {
                name: 'Debdeep Banerjee',
                role: 'Lead Software Lead and AI Engineer',
                image: 'https://media.licdn.com/dms/image/v2/D5603AQGYNSe1Di7N0g/profile-displayphoto-scale_200_200/B56ZiCH12uHcAc-/0/1754529752886?e=2147483647&v=beta&t=QDcuwmtZeUHoRzJIAliX430m-6YFPX8eAEYxt55sDCo',
                skills: ['Machine Learning', 'Blockchain', 'AI agents', 'Statistical Modeling', 'React-Native and Flutter', 'Typescript and Node.js', 'Apache', 'Redis','Postgres', 'MySQL', 'MongoDB', 'Supabase'],
                linkedin: 'https://linkedin.com/in/debdeep-banerjee',
                github: 'https://github.com/debdeep-banerjee',
                email: 'debdeep@prism-ai.com'
              },
              {
                name: 'Amit Kumar Choubey',
                role: 'Lead Cybersecurity and Blockchain expert and IoT dev',
                image: 'https://media.licdn.com/dms/image/v2/D4D03AQGWP1uqSMnr0Q/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1712329839695?e=2147483647&v=beta&t=GXWV1GtqRKY0SAxuO00l_gEUrJ_VecDXUz6LdB3LU3Y',
                skills: ['Cybersecurity', 'IoT', 'Digital Twin', 'Research', 'Blockchain', 'Hardware dev'],
                linkedin: 'https://linkedin.com/in/sarah-chen',
                github: 'https://github.com/sarah-chen',
                email: 'amit@prism-ai.com'
              },
              {
                name: 'Akash Shukla',
                role: 'Lead Cybersecurity, Backend, and Devops engineer',
                image: 'https://media.licdn.com/dms/image/v2/D5603AQGPk5nqpqP2PA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1728784988478?e=1761177600&v=beta&t=NNbCp22ZcziOGYlEjTS7BRWbF2C82OO6Zq9bQruP1AQ',
                skills: ['Backend', 'Cybersecurity', 'Risk Assessment', 'QA Tester', 'AWS Devops'],
                linkedin: 'https://www.linkedin.com/in/akash-shukla-9b3039297/?originalSubdomain=in',
                github: 'https://github.com/marcus-rodriguez',
                email: 'akash@prism-ai.com'
              },
              {
                name: 'Ahana Acharyya',
                role: 'Lead UI and Full stack dev',
                image: 'https://media.licdn.com/dms/image/v2/D5603AQHW5zafr_nC7A/profile-displayphoto-shrink_400_400/B56ZNooI7GGgAo-/0/1732627178460?e=1761177600&v=beta&t=o9AZ-7lXJBTqY8zI3qOVKBzbVD8Y0ZUZBEAFkIsejBE',
                skills: ['UI and UX', 'Backend Node.js', 'Typescript/React', 'NextJS', 'MongoDB'],
                linkedin: 'https://www.linkedin.com/in/ahana-acharyya-b05b64221/',
                github: 'https://github.com/emily-watson',
                email: 'ahana@prism-ai.com'
              },
              {
                name: 'Supratik Biswas',
                role: 'IoT and software dev',
                image: 'https://media.licdn.com/dms/image/v2/D4E35AQH7JMnkYopCRA/profile-framedphoto-shrink_400_400/profile-framedphoto-shrink_400_400/0/1736518046783?e=1758855600&v=beta&t=AZz4H6BJ5u11xySqmyE56d6rC9bGkPZYxgmfkGXgCHk',
                skills: ['React/TypeScript', 'IoT dev', 'Hardware dev'],
                linkedin: 'https://www.linkedin.com/in/supratik-biswas-396793335/',
                github: 'https://github.com/alex-kim',
                email: 'supratik@prism-ai.com'
              },
              {
                name: 'Arka Manna',
                role: 'Lead IoT and Hardware expert',
                image: 'https://media.licdn.com/dms/image/v2/D5635AQHZ56V7Asg_-g/profile-framedphoto-shrink_400_400/profile-framedphoto-shrink_400_400/0/1719251753796?e=1758736800&v=beta&t=mtLXttJ9UGQVP2nXb0cfhB6DxgiR8JPXs1fBcM0c2lQ',
                skills: ['Research & Development', 'IoT Design', 'Innovation', 'Hardware dev', 'Rock Mechanics', 'Geological Analysis'],
                linkedin: 'https://www.linkedin.com/in/arka-manna-a28536226/',
                github: 'https://github.com/james-thompson',
                email: 'arka@prism-ai.com'
              }
            ].map((member, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                >
                  <Card
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.6)} 100%)`,
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      position: 'relative',
                      overflow: 'hidden',
                      height: '100%',
                      '&:hover': {
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                        boxShadow: `0 15px 40px ${alpha(theme.palette.primary.main, 0.2)}`
                      }
                    }}
                  >
                    {/* Animated background */}
                    <motion.div
                      style={{
                        position: 'absolute',
                        top: -30,
                        right: -30,
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
                        zIndex: 0
                      }}
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: index * 0.5
                      }}
                    />

                    <Avatar
                      src={member.image}
                      sx={{
                        width: 80,
                        height: 80,
                        mx: 'auto',
                        mb: 2,
                        position: 'relative',
                        zIndex: 1,
                        boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.3)}`,
                        border: `3px solid ${alpha(theme.palette.primary.main, 0.2)}`
                      }}
                    />

                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      gutterBottom
                      sx={{
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      {member.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                      sx={{ mb: 2, position: 'relative', zIndex: 1, fontWeight: 500 }}
                    >
                      {member.role}
                    </Typography>

                    {/* Skills */}
                    <MuiBox sx={{ mb: 3, position: 'relative', zIndex: 1 }}>
                      <MuiBox display="flex" flexWrap="wrap" gap={0.5} justifyContent="center">
                        {member.skills.map((skill, skillIndex) => (
                          <motion.div
                            key={skill}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 + skillIndex * 0.1 + 0.5 }}
                          >
                            <Chip
                              label={skill}
                              size="small"
                              sx={{
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.secondary.main, 0.15)} 100%)`,
                                color: 'text.primary',
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                fontSize: '0.7rem',
                                height: 24,
                                '&:hover': {
                                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.25)} 0%, ${alpha(theme.palette.secondary.main, 0.25)} 100%)`,
                                  transform: 'scale(1.05)'
                                }
                              }}
                            />
                          </motion.div>
                        ))}
                      </MuiBox>
                    </MuiBox>

                    {/* Contact Links */}
                    <MuiBox display="flex" gap={1} justifyContent="center" sx={{ position: 'relative', zIndex: 1 }}>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <IconButton
                          size="small"
                          sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            color: 'white',
                            width: 32,
                            height: 32,
                            '&:hover': {
                              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                              boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.4)}`
                            }
                          }}
                          onClick={() => window.open(`mailto:${member.email}`, '_blank')}
                        >
                          <Email sx={{ fontSize: 16 }} />
                        </IconButton>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <IconButton
                          size="small"
                          sx={{
                            background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                            color: 'white',
                            width: 32,
                            height: 32,
                            '&:hover': {
                              background: `linear-gradient(135deg, ${theme.palette.info.light} 0%, ${theme.palette.info.main} 100%)`,
                              boxShadow: `0 4px 15px ${alpha(theme.palette.info.main, 0.4)}`
                            }
                          }}
                          onClick={() => window.open(member.linkedin, '_blank')}
                        >
                          <LinkedIn sx={{ fontSize: 16 }} />
                        </IconButton>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <IconButton
                          size="small"
                          sx={{
                            background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                            color: 'white',
                            width: 32,
                            height: 32,
                            '&:hover': {
                              background: `linear-gradient(135deg, ${theme.palette.secondary.light} 0%, ${theme.palette.secondary.main} 100%)`,
                              boxShadow: `0 4px 15px ${alpha(theme.palette.secondary.main, 0.4)}`
                            }
                          }}
                          onClick={() => window.open(member.github, '_blank')}
                        >
                          <GitHub sx={{ fontSize: 16 }} />
                        </IconButton>
                      </motion.div>
                    </MuiBox>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Mission Statement */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <Card
              sx={{
                mt: 8,
                p: 6,
                textAlign: 'center',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
              }}
            >
              <Typography
                variant="h5"
                fontWeight="bold"
                gutterBottom
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Our Mission
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto', lineHeight: 1.8 }}>
                "To revolutionize mining safety through intelligent prediction systems, ensuring that every worker returns home safely
                while optimizing operational efficiency. PRISM represents our commitment to leveraging AI for the greater good,
                protecting lives and preserving the environment for future generations."
              </Typography>
            </Card>
          </motion.div>
        </Container>
      </MuiBox>

      {/* CTA Section */}
      <MuiBox sx={{ py: 12, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography
            variant="h3"
            gutterBottom
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 700,
              mb: 4
            }}
          >
            Ready to Transform Mine Safety?
          </Typography>

          <Typography variant="h6" color="text.secondary" sx={{ mb: 6, lineHeight: 1.6 }}>
            Join leading mining companies worldwide in revolutionizing safety standards with PRISM's
            AI-powered rockfall prediction and prevention system.
          </Typography>

          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            onClick={() => navigate('/login')}
            sx={{
              px: 6,
              py: 3,
              fontSize: '1.2rem',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: `0 12px 48px ${alpha(theme.palette.primary.main, 0.4)}`,
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: `0 16px 56px ${alpha(theme.palette.primary.main, 0.6)}`
              }
            }}
          >
            Get Started Today
          </Button>
        </Container>
      </MuiBox>
    </MuiBox>
  );
};

export default LandingPage;