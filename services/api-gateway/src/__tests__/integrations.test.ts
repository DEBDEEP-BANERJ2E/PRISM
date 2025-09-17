import request from 'supertest';
import app from '../index';
import { fleetManagementIntegration } from '../integrations/fleet-management';
import { blastPlanningIntegration } from '../integrations/blast-planning';
import { waterManagementIntegration } from '../integrations/water-management';

// Mock the integration modules
jest.mock('../integrations/fleet-management');
jest.mock('../integrations/blast-planning');
jest.mock('../integrations/water-management');

const mockFleetIntegration = fleetManagementIntegration as jest.Mocked<typeof fleetManagementIntegration>;
const mockBlastIntegration = blastPlanningIntegration as jest.Mocked<typeof blastPlanningIntegration>;
const mockWaterIntegration = waterManagementIntegration as jest.Mocked<typeof waterManagementIntegration>;

describe('Integration API Endpoints', () => {
  let authToken: string;

  beforeAll(async () => {
    // Mock authentication for tests
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: 'test.engineer',
        password: 'testpassword123'
      });
    
    authToken = loginResponse.body.token;
  });

  describe('Fleet Management Integration', () => {
    describe('POST /api/integrations/fleet/alert', () => {
      it('should send fleet alert successfully', async () => {
        mockFleetIntegration.sendRockfallAlert.mockResolvedValue(true);

        const alertData = {
          alertId: 'alert-123',
          riskLevel: 0.75,
          affectedArea: {
            coordinates: [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
            description: 'Bench 5 North Wall'
          },
          recommendedActions: ['evacuate_personnel', 'stop_hauling'],
          timestamp: new Date().toISOString()
        };

        const response = await request(app)
          .post('/api/integrations/fleet/alert')
          .set('Authorization', `Bearer ${authToken}`)
          .send(alertData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockFleetIntegration.sendRockfallAlert).toHaveBeenCalledWith(alertData);
      });

      it('should validate required fields', async () => {
        const invalidData = {
          alertId: 'alert-123',
          // Missing required fields
        };

        await request(app)
          .post('/api/integrations/fleet/alert')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);
      });

      it('should require authentication', async () => {
        await request(app)
          .post('/api/integrations/fleet/alert')
          .send({})
          .expect(401);
      });
    });

    describe('POST /api/integrations/fleet/reroute', () => {
      it('should request truck rerouting successfully', async () => {
        mockFleetIntegration.requestTruckRerouting.mockResolvedValue(true);

        const rerouteData = {
          truckIds: ['truck-001', 'truck-002'],
          avoidanceZone: {
            coordinates: [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
            radius: 500
          },
          alternativeRoutes: ['route-a', 'route-b'],
          priority: 'high'
        };

        const response = await request(app)
          .post('/api/integrations/fleet/reroute')
          .set('Authorization', `Bearer ${authToken}`)
          .send(rerouteData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockFleetIntegration.requestTruckRerouting).toHaveBeenCalledWith(rerouteData);
      });
    });

    describe('GET /api/integrations/fleet/trucks', () => {
      it('should get active trucks successfully', async () => {
        const mockTrucks = [
          {
            truckId: 'truck-001',
            currentLocation: { latitude: -23.5, longitude: 46.6, elevation: 1200 },
            status: 'active',
            route: 'main-haul-road'
          }
        ];

        mockFleetIntegration.getActiveTrucks.mockResolvedValue(mockTrucks);

        const response = await request(app)
          .get('/api/integrations/fleet/trucks')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.trucks).toEqual(mockTrucks);
      });
    });
  });

  describe('Blast Planning Integration', () => {
    describe('POST /api/integrations/blast/assessment', () => {
      it('should submit slope stability assessment successfully', async () => {
        mockBlastIntegration.submitSlopeStabilityAssessment.mockResolvedValue(true);

        const assessmentData = {
          assessmentId: 'assessment-123',
          blastId: 'blast-456',
          preBlastRisk: 0.3,
          postBlastRisk: 0.6,
          affectedSlopes: ['slope-a', 'slope-b'],
          recommendations: ['reduce_charge_weight', 'adjust_timing'],
          vibrationPrediction: {
            peakParticleVelocity: 25.5,
            frequency: 15.2,
            duration: 2.1
          },
          timestamp: new Date().toISOString()
        };

        const response = await request(app)
          .post('/api/integrations/blast/assessment')
          .set('Authorization', `Bearer ${authToken}`)
          .send(assessmentData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockBlastIntegration.submitSlopeStabilityAssessment).toHaveBeenCalledWith(assessmentData);
      });
    });

    describe('GET /api/integrations/blast/upcoming', () => {
      it('should get upcoming blasts successfully', async () => {
        const mockBlasts = [
          {
            blastId: 'blast-123',
            location: {
              coordinates: [[100.0, 0.0], [101.0, 0.0]],
              bench: 'Bench-5',
              elevation: 1200
            },
            scheduledTime: new Date().toISOString(),
            explosiveType: 'ANFO',
            chargeWeight: 1500,
            blastPattern: {
              holeSpacing: 5.0,
              rowSpacing: 4.5,
              numberOfHoles: 24
            }
          }
        ];

        mockBlastIntegration.getUpcomingBlasts.mockResolvedValue(mockBlasts);

        const response = await request(app)
          .get('/api/integrations/blast/upcoming?hours=48')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.blasts).toEqual(mockBlasts);
        expect(mockBlastIntegration.getUpcomingBlasts).toHaveBeenCalledWith(48);
      });
    });
  });

  describe('Water Management Integration', () => {
    describe('POST /api/integrations/water/groundwater', () => {
      it('should submit groundwater data successfully', async () => {
        mockWaterIntegration.submitGroundwaterData.mockResolvedValue(true);

        const groundwaterData = {
          data: [
            {
              sensorId: 'gw-sensor-001',
              location: {
                latitude: -23.5,
                longitude: 46.6,
                elevation: 1200,
                depth: 15.5
              },
              measurements: {
                waterLevel: 12.3,
                pressure: 150.2,
                temperature: 18.5,
                conductivity: 450.0,
                pH: 7.2
              },
              timestamp: new Date().toISOString()
            }
          ]
        };

        const response = await request(app)
          .post('/api/integrations/water/groundwater')
          .set('Authorization', `Bearer ${authToken}`)
          .send(groundwaterData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockWaterIntegration.submitGroundwaterData).toHaveBeenCalledWith(groundwaterData.data);
      });
    });

    describe('POST /api/integrations/water/pumping-control', () => {
      it('should control pumping station successfully', async () => {
        mockWaterIntegration.controlPumpingStation.mockResolvedValue(true);

        const controlData = {
          stationId: 'pump-station-001',
          action: 'adjust_rate',
          targetRate: 500,
          duration: 120,
          reason: 'high_water_level_detected',
          priority: 'urgent'
        };

        const response = await request(app)
          .post('/api/integrations/water/pumping-control')
          .set('Authorization', `Bearer ${authToken}`)
          .send(controlData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockWaterIntegration.controlPumpingStation).toHaveBeenCalledWith(controlData);
      });
    });

    describe('POST /api/integrations/water/emergency-drainage', () => {
      it('should request emergency drainage successfully', async () => {
        mockWaterIntegration.requestEmergencyDrainage.mockResolvedValue(true);

        const emergencyData = {
          area: {
            coordinates: [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
            description: 'Critical slope area near processing plant'
          }
        };

        const response = await request(app)
          .post('/api/integrations/water/emergency-drainage')
          .set('Authorization', `Bearer ${authToken}`)
          .send(emergencyData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockWaterIntegration.requestEmergencyDrainage).toHaveBeenCalledWith(emergencyData.area);
      });
    });
  });

  describe('Integration Health Checks', () => {
    describe('GET /api/integrations/health', () => {
      it('should return overall health status', async () => {
        // Mock fetch for health checks
        global.fetch = jest.fn()
          .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) })
          .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) })
          .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) });

        const response = await request(app)
          .get('/api/integrations/health')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.overall).toBe('healthy');
        expect(response.body.services).toHaveLength(3);
      });

      it('should return degraded status when some services are unhealthy', async () => {
        global.fetch = jest.fn()
          .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) })
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) });

        const response = await request(app)
          .get('/api/integrations/health')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(503);

        expect(response.body.overall).toBe('degraded');
      });
    });
  });

  describe('Role-based Access Control', () => {
    it('should deny access to critical operations for viewer role', async () => {
      // Mock a viewer token
      const viewerToken = 'viewer-token'; // In real test, generate proper token

      await request(app)
        .post('/api/integrations/fleet/stop-operations')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          zone: {
            coordinates: [[100.0, 0.0], [101.0, 0.0]],
            description: 'Test zone'
          }
        })
        .expect(403);
    });

    it('should allow engineers to submit assessments', async () => {
      mockBlastIntegration.submitSlopeStabilityAssessment.mockResolvedValue(true);

      const assessmentData = {
        assessmentId: 'assessment-123',
        blastId: 'blast-456',
        preBlastRisk: 0.3,
        postBlastRisk: 0.6,
        affectedSlopes: ['slope-a'],
        recommendations: ['reduce_charge_weight'],
        timestamp: new Date().toISOString()
      };

      await request(app)
        .post('/api/integrations/blast/assessment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(assessmentData)
        .expect(200);
    });
  });
});