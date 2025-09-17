import { Request, Response } from 'express';
import logger from '../utils/logger';

interface FleetAlert {
  alertId: string;
  riskLevel: number;
  affectedArea: {
    coordinates: number[][];
    description: string;
  };
  recommendedActions: string[];
  timestamp: string;
}

interface HaulTruck {
  truckId: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    elevation: number;
  };
  status: 'active' | 'idle' | 'maintenance';
  route: string;
}

interface FleetRerouteRequest {
  truckIds: string[];
  avoidanceZone: {
    coordinates: number[][];
    radius: number;
  };
  alternativeRoutes: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

class FleetManagementIntegration {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.FLEET_MANAGEMENT_URL || 'http://fleet-management:8080';
    this.apiKey = process.env.FLEET_MANAGEMENT_API_KEY || '';
  }

  async sendRockfallAlert(alert: FleetAlert): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/alerts/rockfall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          alertId: alert.alertId,
          type: 'rockfall_risk',
          severity: this.mapRiskLevelToSeverity(alert.riskLevel),
          affectedArea: alert.affectedArea,
          actions: alert.recommendedActions,
          timestamp: alert.timestamp,
          source: 'PRISM-AI'
        })
      });

      if (!response.ok) {
        throw new Error(`Fleet management API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('Rockfall alert sent to fleet management', {
        alertId: alert.alertId,
        responseId: result.responseId
      });

      return true;
    } catch (error) {
      logger.error('Failed to send alert to fleet management:', error);
      return false;
    }
  }

  async requestTruckRerouting(rerouteRequest: FleetRerouteRequest): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/operations/reroute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          requestId: `prism-${Date.now()}`,
          truckIds: rerouteRequest.truckIds,
          avoidanceZone: rerouteRequest.avoidanceZone,
          alternativeRoutes: rerouteRequest.alternativeRoutes,
          priority: rerouteRequest.priority,
          reason: 'rockfall_risk_mitigation',
          requestedBy: 'PRISM-AI',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Fleet rerouting API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('Truck rerouting requested', {
        requestId: result.requestId,
        affectedTrucks: rerouteRequest.truckIds.length
      });

      return true;
    } catch (error) {
      logger.error('Failed to request truck rerouting:', error);
      return false;
    }
  }

  async getActiveTrucks(): Promise<HaulTruck[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/fleet/active`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        }
      });

      if (!response.ok) {
        throw new Error(`Fleet API error: ${response.status}`);
      }

      const trucks = await response.json();
      return trucks.map((truck: any) => ({
        truckId: truck.id,
        currentLocation: truck.location,
        status: truck.status,
        route: truck.currentRoute
      }));
    } catch (error) {
      logger.error('Failed to get active trucks:', error);
      return [];
    }
  }

  async stopOperationsInZone(zone: { coordinates: number[][]; description: string }): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/operations/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          stopId: `prism-stop-${Date.now()}`,
          zone: zone,
          reason: 'critical_rockfall_risk',
          duration: 'indefinite',
          authorizedBy: 'PRISM-AI',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Fleet stop operations API error: ${response.status}`);
      }

      logger.info('Operations stopped in zone', { zone: zone.description });
      return true;
    } catch (error) {
      logger.error('Failed to stop operations in zone:', error);
      return false;
    }
  }

  private mapRiskLevelToSeverity(riskLevel: number): string {
    if (riskLevel >= 0.75) return 'critical';
    if (riskLevel >= 0.5) return 'high';
    if (riskLevel >= 0.25) return 'medium';
    return 'low';
  }
}

export const fleetManagementIntegration = new FleetManagementIntegration();

// Express route handlers
export const fleetRoutes = {
  sendAlert: async (req: Request, res: Response) => {
    try {
      const alert: FleetAlert = req.body;
      const success = await fleetManagementIntegration.sendRockfallAlert(alert);
      
      if (success) {
        res.json({ success: true, message: 'Alert sent to fleet management' });
      } else {
        res.status(500).json({ error: 'Failed to send alert to fleet management' });
      }
    } catch (error) {
      logger.error('Fleet alert route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  requestReroute: async (req: Request, res: Response) => {
    try {
      const rerouteRequest: FleetRerouteRequest = req.body;
      const success = await fleetManagementIntegration.requestTruckRerouting(rerouteRequest);
      
      if (success) {
        res.json({ success: true, message: 'Rerouting request sent' });
      } else {
        res.status(500).json({ error: 'Failed to request rerouting' });
      }
    } catch (error) {
      logger.error('Fleet reroute route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getActiveTrucks: async (req: Request, res: Response) => {
    try {
      const trucks = await fleetManagementIntegration.getActiveTrucks();
      res.json({ trucks });
    } catch (error) {
      logger.error('Get active trucks route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  stopOperations: async (req: Request, res: Response) => {
    try {
      const { zone } = req.body;
      const success = await fleetManagementIntegration.stopOperationsInZone(zone);
      
      if (success) {
        res.json({ success: true, message: 'Operations stopped in specified zone' });
      } else {
        res.status(500).json({ error: 'Failed to stop operations' });
      }
    } catch (error) {
      logger.error('Stop operations route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};