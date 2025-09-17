import { Request, Response } from 'express';
import logger from '../utils/logger';

interface BlastPlan {
  blastId: string;
  location: {
    coordinates: number[][];
    bench: string;
    elevation: number;
  };
  scheduledTime: string;
  explosiveType: string;
  chargeWeight: number;
  blastPattern: {
    holeSpacing: number;
    rowSpacing: number;
    numberOfHoles: number;
  };
}

interface SlopeStabilityAssessment {
  assessmentId: string;
  blastId: string;
  preBlastRisk: number;
  postBlastRisk: number;
  affectedSlopes: string[];
  recommendations: string[];
  vibrationPrediction: {
    peakParticleVelocity: number;
    frequency: number;
    duration: number;
  };
  timestamp: string;
}

interface BlastOptimizationRequest {
  blastId: string;
  currentPlan: BlastPlan;
  slopeStabilityData: {
    riskMap: number[][];
    criticalZones: string[];
    stabilityFactors: number[];
  };
  constraints: {
    maxVibration: number;
    minFragmentation: number;
    safetyBuffer: number;
  };
}

class BlastPlanningIntegration {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.BLAST_PLANNING_URL || 'http://blast-planning:8080';
    this.apiKey = process.env.BLAST_PLANNING_API_KEY || '';
  }

  async submitSlopeStabilityAssessment(assessment: SlopeStabilityAssessment): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/assessments/slope-stability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          assessmentId: assessment.assessmentId,
          blastId: assessment.blastId,
          riskAnalysis: {
            preBlastRisk: assessment.preBlastRisk,
            postBlastRisk: assessment.postBlastRisk,
            riskIncrease: assessment.postBlastRisk - assessment.preBlastRisk
          },
          affectedSlopes: assessment.affectedSlopes,
          recommendations: assessment.recommendations,
          vibrationPrediction: assessment.vibrationPrediction,
          assessmentTime: assessment.timestamp,
          source: 'PRISM-AI'
        })
      });

      if (!response.ok) {
        throw new Error(`Blast planning API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('Slope stability assessment submitted', {
        assessmentId: assessment.assessmentId,
        blastId: assessment.blastId,
        responseId: result.responseId
      });

      return true;
    } catch (error) {
      logger.error('Failed to submit slope stability assessment:', error);
      return false;
    }
  }

  async requestBlastOptimization(request: BlastOptimizationRequest): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/optimization/blast-design`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          requestId: `prism-opt-${Date.now()}`,
          blastId: request.blastId,
          currentDesign: request.currentPlan,
          slopeConstraints: {
            riskMap: request.slopeStabilityData.riskMap,
            criticalZones: request.slopeStabilityData.criticalZones,
            stabilityFactors: request.slopeStabilityData.stabilityFactors
          },
          optimizationConstraints: request.constraints,
          objectives: [
            'minimize_slope_impact',
            'maintain_fragmentation',
            'reduce_vibration'
          ],
          requestedBy: 'PRISM-AI',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Blast optimization API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('Blast optimization requested', {
        requestId: result.requestId,
        blastId: request.blastId
      });

      return result;
    } catch (error) {
      logger.error('Failed to request blast optimization:', error);
      return null;
    }
  }

  async getUpcomingBlasts(timeWindow: number = 72): Promise<BlastPlan[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/schedule/upcoming?hours=${timeWindow}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        }
      });

      if (!response.ok) {
        throw new Error(`Blast schedule API error: ${response.status}`);
      }

      const blasts = await response.json();
      return blasts.map((blast: any) => ({
        blastId: blast.id,
        location: blast.location,
        scheduledTime: blast.scheduledTime,
        explosiveType: blast.explosiveType,
        chargeWeight: blast.chargeWeight,
        blastPattern: blast.pattern
      }));
    } catch (error) {
      logger.error('Failed to get upcoming blasts:', error);
      return [];
    }
  }

  async postponeBlast(blastId: string, reason: string, newTime?: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/schedule/postpone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          blastId: blastId,
          reason: reason,
          newScheduledTime: newTime,
          postponedBy: 'PRISM-AI',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Blast postponement API error: ${response.status}`);
      }

      logger.info('Blast postponed', { blastId, reason });
      return true;
    } catch (error) {
      logger.error('Failed to postpone blast:', error);
      return false;
    }
  }

  async submitVibrationPrediction(blastId: string, prediction: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/predictions/vibration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'PRISM'
        },
        body: JSON.stringify({
          blastId: blastId,
          prediction: prediction,
          modelVersion: 'PRISM-v1.0',
          confidence: prediction.confidence,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Vibration prediction API error: ${response.status}`);
      }

      logger.info('Vibration prediction submitted', { blastId });
      return true;
    } catch (error) {
      logger.error('Failed to submit vibration prediction:', error);
      return false;
    }
  }
}

export const blastPlanningIntegration = new BlastPlanningIntegration();

// Express route handlers
export const blastRoutes = {
  submitAssessment: async (req: Request, res: Response) => {
    try {
      const assessment: SlopeStabilityAssessment = req.body;
      const success = await blastPlanningIntegration.submitSlopeStabilityAssessment(assessment);
      
      if (success) {
        res.json({ success: true, message: 'Slope stability assessment submitted' });
      } else {
        res.status(500).json({ error: 'Failed to submit assessment' });
      }
    } catch (error) {
      logger.error('Blast assessment route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  requestOptimization: async (req: Request, res: Response) => {
    try {
      const request: BlastOptimizationRequest = req.body;
      const result = await blastPlanningIntegration.requestBlastOptimization(request);
      
      if (result) {
        res.json({ success: true, optimizationResult: result });
      } else {
        res.status(500).json({ error: 'Failed to request optimization' });
      }
    } catch (error) {
      logger.error('Blast optimization route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getUpcomingBlasts: async (req: Request, res: Response) => {
    try {
      const timeWindow = parseInt(req.query.hours as string) || 72;
      const blasts = await blastPlanningIntegration.getUpcomingBlasts(timeWindow);
      res.json({ blasts });
    } catch (error) {
      logger.error('Get upcoming blasts route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  postponeBlast: async (req: Request, res: Response) => {
    try {
      const { blastId, reason, newTime } = req.body;
      const success = await blastPlanningIntegration.postponeBlast(blastId, reason, newTime);
      
      if (success) {
        res.json({ success: true, message: 'Blast postponed successfully' });
      } else {
        res.status(500).json({ error: 'Failed to postpone blast' });
      }
    } catch (error) {
      logger.error('Postpone blast route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  submitVibrationPrediction: async (req: Request, res: Response) => {
    try {
      const { blastId, prediction } = req.body;
      const success = await blastPlanningIntegration.submitVibrationPrediction(blastId, prediction);
      
      if (success) {
        res.json({ success: true, message: 'Vibration prediction submitted' });
      } else {
        res.status(500).json({ error: 'Failed to submit prediction' });
      }
    } catch (error) {
      logger.error('Vibration prediction route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};