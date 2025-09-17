import { Request, Response } from 'express';
import logger from '../utils/logger';

interface GroundwaterData {
  sensorId: string;
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    depth: number;
  };
  measurements: {
    waterLevel: number;
    pressure: number;
    temperature: number;
    conductivity?: number;
    pH?: number;
  };
  timestamp: string;
}

interface DrainageRecommendation {
  recommendationId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  affectedArea: {
    coordinates: number[][];
    description: string;
  };
  actions: {
    type: 'install_drain' | 'increase_pumping' | 'redirect_flow' | 'emergency_drainage';
    location: number[];
    specifications: any;
    estimatedCost: number;
    timeframe: string;
  }[];
  reasoning: string;
  expectedImpact: {
    pressureReduction: number;
    stabilityImprovement: number;
    riskReduction: number;
  };
  timestamp: string;
}

interface PumpingStationControl {
  stationId: string;
  action: 'start' | 'stop' | 'adjust_rate';
  targetRate?: number; // L/min
  duration?: number; // minutes
  reason: string;
  priority: 'normal' | 'urgent' | 'emergency';
}

interface WaterLevelAlert {
  alertId: string;
  sensorId: string;
  currentLevel: number;
  thresholdLevel: number;
  trend: 'rising' | 'falling' | 'stable';
  rateOfChange: number; // mm/hour
  predictedPeakLevel?: number;
  timeToThreshold?: number; // hours
  riskAssessment: {
    slopeStabilityImpact: number;
    operationalImpact: string;
    recommendedActions: string[];
  };
}

class WaterManagementIntegration {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.WATER_MANAGEMENT_URL || 'http://water-management:8080';
    this.apiKey = process.env.WATER_MANAGEMENT_API_KEY || '';
  }

  async submitGroundwaterData(data: GroundwaterData[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/monitoring/groundwater`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          dataPoints: data,
          source: 'PRISM-Hexapod',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Water management API error: ${response.status}`);
      }

      logger.info('Groundwater data submitted', {
        dataPoints: data.length,
        sensors: data.map(d => d.sensorId)
      });

      return true;
    } catch (error) {
      logger.error('Failed to submit groundwater data:', error);
      return false;
    }
  }

  async submitDrainageRecommendation(recommendation: DrainageRecommendation): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/recommendations/drainage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          recommendationId: recommendation.recommendationId,
          priority: recommendation.priority,
          affectedArea: recommendation.affectedArea,
          proposedActions: recommendation.actions,
          technicalReasoning: recommendation.reasoning,
          impactAnalysis: recommendation.expectedImpact,
          generatedBy: 'PRISM-AI',
          timestamp: recommendation.timestamp
        })
      });

      if (!response.ok) {
        throw new Error(`Drainage recommendation API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('Drainage recommendation submitted', {
        recommendationId: recommendation.recommendationId,
        priority: recommendation.priority,
        responseId: result.responseId
      });

      return true;
    } catch (error) {
      logger.error('Failed to submit drainage recommendation:', error);
      return false;
    }
  }

  async controlPumpingStation(control: PumpingStationControl): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/control/pumping-station`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          controlId: `prism-${Date.now()}`,
          stationId: control.stationId,
          command: {
            action: control.action,
            targetRate: control.targetRate,
            duration: control.duration
          },
          justification: control.reason,
          priority: control.priority,
          authorizedBy: 'PRISM-AI',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Pumping station control API error: ${response.status}`);
      }

      logger.info('Pumping station control executed', {
        stationId: control.stationId,
        action: control.action,
        priority: control.priority
      });

      return true;
    } catch (error) {
      logger.error('Failed to control pumping station:', error);
      return false;
    }
  }

  async sendWaterLevelAlert(alert: WaterLevelAlert): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/alerts/water-level`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          alertId: alert.alertId,
          sensorId: alert.sensorId,
          waterLevelData: {
            current: alert.currentLevel,
            threshold: alert.thresholdLevel,
            trend: alert.trend,
            changeRate: alert.rateOfChange,
            predictedPeak: alert.predictedPeakLevel,
            timeToThreshold: alert.timeToThreshold
          },
          riskAssessment: alert.riskAssessment,
          severity: this.calculateAlertSeverity(alert),
          source: 'PRISM-AI',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Water level alert API error: ${response.status}`);
      }

      logger.info('Water level alert sent', {
        alertId: alert.alertId,
        sensorId: alert.sensorId,
        severity: this.calculateAlertSeverity(alert)
      });

      return true;
    } catch (error) {
      logger.error('Failed to send water level alert:', error);
      return false;
    }
  }

  async getActivePumpingStations(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/infrastructure/pumping-stations`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        }
      });

      if (!response.ok) {
        throw new Error(`Pumping stations API error: ${response.status}`);
      }

      const stations = await response.json();
      return stations.filter((station: any) => station.status === 'active');
    } catch (error) {
      logger.error('Failed to get active pumping stations:', error);
      return [];
    }
  }

  async getDrainageInfrastructure(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/infrastructure/drainage`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        }
      });

      if (!response.ok) {
        throw new Error(`Drainage infrastructure API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get drainage infrastructure:', error);
      return [];
    }
  }

  async requestEmergencyDrainage(area: { coordinates: number[][]; description: string }): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/emergency/drainage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          emergencyId: `prism-emergency-${Date.now()}`,
          affectedArea: area,
          reason: 'critical_slope_stability_risk',
          requestedActions: [
            'immediate_water_removal',
            'emergency_pumping',
            'temporary_drainage_installation'
          ],
          priority: 'critical',
          requestedBy: 'PRISM-AI',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Emergency drainage API error: ${response.status}`);
      }

      logger.info('Emergency drainage requested', { area: area.description });
      return true;
    } catch (error) {
      logger.error('Failed to request emergency drainage:', error);
      return false;
    }
  }

  private calculateAlertSeverity(alert: WaterLevelAlert): string {
    const levelExcess = (alert.currentLevel - alert.thresholdLevel) / alert.thresholdLevel;
    const riskLevel = alert.riskAssessment.slopeStabilityImpact;

    if (levelExcess > 0.5 || riskLevel > 0.8) return 'critical';
    if (levelExcess > 0.2 || riskLevel > 0.6) return 'high';
    if (levelExcess > 0.1 || riskLevel > 0.4) return 'medium';
    return 'low';
  }
}

export const waterManagementIntegration = new WaterManagementIntegration();

// Express route handlers
export const waterRoutes = {
  submitGroundwaterData: async (req: Request, res: Response) => {
    try {
      const data: GroundwaterData[] = req.body.data;
      const success = await waterManagementIntegration.submitGroundwaterData(data);
      
      if (success) {
        res.json({ success: true, message: 'Groundwater data submitted' });
      } else {
        res.status(500).json({ error: 'Failed to submit groundwater data' });
      }
    } catch (error) {
      logger.error('Groundwater data route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  submitDrainageRecommendation: async (req: Request, res: Response) => {
    try {
      const recommendation: DrainageRecommendation = req.body;
      const success = await waterManagementIntegration.submitDrainageRecommendation(recommendation);
      
      if (success) {
        res.json({ success: true, message: 'Drainage recommendation submitted' });
      } else {
        res.status(500).json({ error: 'Failed to submit recommendation' });
      }
    } catch (error) {
      logger.error('Drainage recommendation route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  controlPumpingStation: async (req: Request, res: Response) => {
    try {
      const control: PumpingStationControl = req.body;
      const success = await waterManagementIntegration.controlPumpingStation(control);
      
      if (success) {
        res.json({ success: true, message: 'Pumping station control executed' });
      } else {
        res.status(500).json({ error: 'Failed to control pumping station' });
      }
    } catch (error) {
      logger.error('Pumping station control route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  sendWaterLevelAlert: async (req: Request, res: Response) => {
    try {
      const alert: WaterLevelAlert = req.body;
      const success = await waterManagementIntegration.sendWaterLevelAlert(alert);
      
      if (success) {
        res.json({ success: true, message: 'Water level alert sent' });
      } else {
        res.status(500).json({ error: 'Failed to send alert' });
      }
    } catch (error) {
      logger.error('Water level alert route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getActivePumpingStations: async (req: Request, res: Response) => {
    try {
      const stations = await waterManagementIntegration.getActivePumpingStations();
      res.json({ stations });
    } catch (error) {
      logger.error('Get pumping stations route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getDrainageInfrastructure: async (req: Request, res: Response) => {
    try {
      const infrastructure = await waterManagementIntegration.getDrainageInfrastructure();
      res.json({ infrastructure });
    } catch (error) {
      logger.error('Get drainage infrastructure route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  requestEmergencyDrainage: async (req: Request, res: Response) => {
    try {
      const { area } = req.body;
      const success = await waterManagementIntegration.requestEmergencyDrainage(area);
      
      if (success) {
        res.json({ success: true, message: 'Emergency drainage requested' });
      } else {
        res.status(500).json({ error: 'Failed to request emergency drainage' });
      }
    } catch (error) {
      logger.error('Emergency drainage route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};