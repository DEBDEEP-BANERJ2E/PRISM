import { AlertInput, AlertSeverity } from '@prism/shared-models/risk';
import { logger } from '../utils/logger';
import { config } from '../config';
import axios, { AxiosInstance } from 'axios';

export interface PrescriptiveAction {
  action_id: string;
  action_type: 'immediate' | 'preventive' | 'monitoring' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimated_cost: number;
  estimated_duration_hours: number;
  required_personnel: string[];
  equipment_needed: string[];
  safety_requirements: string[];
  expected_risk_reduction: number;
  fleet_management_actions?: FleetAction[];
  implementation_steps: string[];
}

export interface FleetAction {
  action_type: 'reroute' | 'stop' | 'evacuate' | 'restrict_access';
  affected_vehicles: string[];
  affected_areas: string[];
  duration_hours: number;
  reason: string;
}

export interface CostBenefitAnalysis {
  total_action_cost: number;
  operational_impact_cost: number;
  safety_risk_cost: number;
  expected_savings: number;
  roi_percentage: number;
  payback_period_hours: number;
  recommendation: 'implement' | 'defer' | 'modify';
}

export class PrescriptiveActionEngine {
  private actionTemplates: Map<string, PrescriptiveAction[]>;
  private fleetManagementClient!: AxiosInstance;

  constructor() {
    this.actionTemplates = new Map();
    this.initializeActionTemplates();
    this.initializeFleetManagementClient();
  }

  /**
   * Initialize fleet management API client
   */
  private initializeFleetManagementClient(): void {
    this.fleetManagementClient = axios.create({
      baseURL: config.fleetManagement.apiUrl,
      timeout: config.fleetManagement.timeout,
      headers: {
        'Authorization': `Bearer ${config.fleetManagement.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Initialize action templates for different risk scenarios
   */
  private initializeActionTemplates(): void {
    // Rockfall risk actions
    this.actionTemplates.set('rockfall_risk_critical', [
      {
        action_id: 'evacuate_immediate',
        action_type: 'immediate',
        priority: 'critical',
        description: 'Immediately evacuate all personnel from the affected bench and adjacent areas',
        estimated_cost: 50000,
        estimated_duration_hours: 2,
        required_personnel: ['Safety Officer', 'Shift Supervisor', 'Security Team'],
        equipment_needed: ['Emergency vehicles', 'Communication radios', 'Barriers'],
        safety_requirements: ['Emergency evacuation protocol', 'Personnel accountability', 'Area isolation'],
        expected_risk_reduction: 0.95,
        fleet_management_actions: [
          {
            action_type: 'evacuate',
            affected_vehicles: ['all_in_zone'],
            affected_areas: ['high_risk_zone'],
            duration_hours: 24,
            reason: 'Critical rockfall risk detected'
          }
        ],
        implementation_steps: [
          'Activate emergency alert system',
          'Direct all personnel to evacuation routes',
          'Stop all equipment operations in affected area',
          'Establish safety perimeter',
          'Conduct personnel headcount'
        ]
      },
      {
        action_id: 'stop_operations',
        action_type: 'immediate',
        priority: 'critical',
        description: 'Halt all mining operations in the affected area and adjacent benches',
        estimated_cost: 100000,
        estimated_duration_hours: 24,
        required_personnel: ['Operations Manager', 'Shift Supervisor'],
        equipment_needed: ['Communication systems'],
        safety_requirements: ['Safe equipment shutdown procedures'],
        expected_risk_reduction: 0.85,
        fleet_management_actions: [
          {
            action_type: 'stop',
            affected_vehicles: ['haul_trucks', 'excavators', 'dozers'],
            affected_areas: ['affected_bench', 'adjacent_benches'],
            duration_hours: 24,
            reason: 'Critical rockfall risk - operations suspended'
          }
        ],
        implementation_steps: [
          'Issue immediate stop work order',
          'Secure all equipment in safe positions',
          'Notify all operators via radio',
          'Document equipment locations',
          'Implement area access restrictions'
        ]
      },
      {
        action_id: 'emergency_scaling',
        action_type: 'preventive',
        priority: 'high',
        description: 'Deploy emergency scaling team to remove loose rock from unstable areas',
        estimated_cost: 25000,
        estimated_duration_hours: 8,
        required_personnel: ['Certified Scalers', 'Safety Spotter', 'Equipment Operator'],
        equipment_needed: ['Scaling bars', 'Safety harnesses', 'Excavator with scaling attachment'],
        safety_requirements: ['Fall protection', 'Exclusion zone', 'Emergency communication'],
        expected_risk_reduction: 0.70,
        implementation_steps: [
          'Assess scaling requirements from safe distance',
          'Establish exclusion zone',
          'Deploy certified scaling team',
          'Remove loose rock systematically',
          'Inspect and document results'
        ]
      }
    ]);

    this.actionTemplates.set('rockfall_risk_high', [
      {
        action_id: 'restrict_access',
        action_type: 'immediate',
        priority: 'high',
        description: 'Restrict access to affected area and implement enhanced monitoring',
        estimated_cost: 15000,
        estimated_duration_hours: 12,
        required_personnel: ['Safety Officer', 'Security Guard'],
        equipment_needed: ['Barriers', 'Warning signs', 'Additional sensors'],
        safety_requirements: ['Access control', 'Enhanced monitoring'],
        expected_risk_reduction: 0.60,
        fleet_management_actions: [
          {
            action_type: 'restrict_access',
            affected_vehicles: ['all_vehicles'],
            affected_areas: ['high_risk_zone'],
            duration_hours: 12,
            reason: 'High rockfall risk - access restricted'
          }
        ],
        implementation_steps: [
          'Install physical barriers',
          'Post warning signage',
          'Deploy additional monitoring sensors',
          'Brief all personnel on restrictions',
          'Establish alternative routes'
        ]
      },
      {
        action_id: 'increase_monitoring',
        action_type: 'monitoring',
        priority: 'high',
        description: 'Deploy additional sensors and increase monitoring frequency',
        estimated_cost: 8000,
        estimated_duration_hours: 4,
        required_personnel: ['Geotechnical Engineer', 'Technician'],
        equipment_needed: ['Portable sensors', 'Data loggers', 'Communication equipment'],
        safety_requirements: ['Safe sensor deployment procedures'],
        expected_risk_reduction: 0.30,
        implementation_steps: [
          'Identify optimal sensor locations',
          'Deploy additional monitoring equipment',
          'Configure real-time data transmission',
          'Increase monitoring frequency',
          'Set up enhanced alert thresholds'
        ]
      }
    ]);

    this.actionTemplates.set('sensor_failure', [
      {
        action_id: 'deploy_backup_sensors',
        action_type: 'immediate',
        priority: 'medium',
        description: 'Deploy backup sensors to maintain monitoring coverage',
        estimated_cost: 5000,
        estimated_duration_hours: 2,
        required_personnel: ['Technician', 'Safety Spotter'],
        equipment_needed: ['Backup sensors', 'Installation tools', 'Communication equipment'],
        safety_requirements: ['Safe access procedures', 'Fall protection if required'],
        expected_risk_reduction: 0.80,
        implementation_steps: [
          'Identify backup sensor locations',
          'Deploy and configure backup sensors',
          'Test communication links',
          'Update monitoring system configuration',
          'Schedule failed sensor repair'
        ]
      },
      {
        action_id: 'increase_inspection_frequency',
        action_type: 'monitoring',
        priority: 'medium',
        description: 'Increase visual inspection frequency in affected area',
        estimated_cost: 2000,
        estimated_duration_hours: 1,
        required_personnel: ['Geotechnical Engineer', 'Safety Officer'],
        equipment_needed: ['Inspection equipment', 'Documentation tools'],
        safety_requirements: ['Safe inspection procedures'],
        expected_risk_reduction: 0.40,
        implementation_steps: [
          'Schedule additional inspections',
          'Brief inspection personnel',
          'Document inspection findings',
          'Report any anomalies immediately',
          'Maintain inspection logs'
        ]
      }
    ]);
  }

  /**
   * Generate prescriptive actions for an alert
   */
  async generateActions(alertInput: AlertInput): Promise<PrescriptiveAction[]> {
    try {
      logger.info(`Generating prescriptive actions for alert type: ${alertInput.alert_type}, severity: ${alertInput.severity}`);

      // Get base actions from templates
      const templateKey = `${alertInput.alert_type}_${alertInput.severity}`;
      let baseActions = this.actionTemplates.get(templateKey) || [];

      // If no specific template, try generic severity-based actions
      if (baseActions.length === 0) {
        baseActions = this.getGenericActions(alertInput.severity);
      }

      // Customize actions based on alert context
      const customizedActions = await this.customizeActions(baseActions, alertInput);

      // Perform cost-benefit analysis
      const analyzedActions = await this.performCostBenefitAnalysis(customizedActions, alertInput);

      // Sort by priority and expected risk reduction
      const sortedActions = this.prioritizeActions(analyzedActions);

      logger.info(`Generated ${sortedActions.length} prescriptive actions for alert ${alertInput.alert_id}`);

      return sortedActions;
    } catch (error) {
      logger.error('Error generating prescriptive actions:', error);
      throw error;
    }
  }

  /**
   * Execute fleet management actions
   */
  async executeFleetActions(actions: PrescriptiveAction[]): Promise<void> {
    try {
      for (const action of actions) {
        if (action.fleet_management_actions && action.fleet_management_actions.length > 0) {
          for (const fleetAction of action.fleet_management_actions) {
            await this.executeFleetAction(fleetAction);
          }
        }
      }
    } catch (error) {
      logger.error('Error executing fleet actions:', error);
      throw error;
    }
  }

  /**
   * Execute individual fleet management action
   */
  private async executeFleetAction(fleetAction: FleetAction): Promise<void> {
    try {
      const payload = {
        action_type: fleetAction.action_type,
        affected_vehicles: fleetAction.affected_vehicles,
        affected_areas: fleetAction.affected_areas,
        duration_hours: fleetAction.duration_hours,
        reason: fleetAction.reason,
        timestamp: new Date().toISOString()
      };

      const response = await this.fleetManagementClient.post('/actions', payload);

      if (response.status === 200 || response.status === 201) {
        logger.info(`Fleet action executed successfully: ${fleetAction.action_type}`);
      } else {
        throw new Error(`Fleet management API returned status ${response.status}`);
      }
    } catch (error) {
      logger.error(`Failed to execute fleet action ${fleetAction.action_type}:`, error);
      throw error;
    }
  }

  /**
   * Get generic actions based on severity
   */
  private getGenericActions(severity: AlertSeverity): PrescriptiveAction[] {
    const genericActions: Record<AlertSeverity, PrescriptiveAction[]> = {
      'emergency': [
        {
          action_id: 'emergency_response',
          action_type: 'immediate',
          priority: 'critical',
          description: 'Activate emergency response protocol',
          estimated_cost: 25000,
          estimated_duration_hours: 1,
          required_personnel: ['Emergency Response Team'],
          equipment_needed: ['Emergency equipment'],
          safety_requirements: ['Emergency protocols'],
          expected_risk_reduction: 0.80,
          implementation_steps: ['Activate emergency protocol', 'Deploy response team']
        }
      ],
      'critical': [
        {
          action_id: 'critical_response',
          action_type: 'immediate',
          priority: 'high',
          description: 'Implement critical safety measures',
          estimated_cost: 15000,
          estimated_duration_hours: 2,
          required_personnel: ['Safety Team'],
          equipment_needed: ['Safety equipment'],
          safety_requirements: ['Critical safety protocols'],
          expected_risk_reduction: 0.70,
          implementation_steps: ['Implement safety measures', 'Monitor situation']
        }
      ],
      'warning': [
        {
          action_id: 'warning_response',
          action_type: 'preventive',
          priority: 'medium',
          description: 'Implement preventive measures',
          estimated_cost: 5000,
          estimated_duration_hours: 4,
          required_personnel: ['Operations Team'],
          equipment_needed: ['Standard equipment'],
          safety_requirements: ['Standard safety protocols'],
          expected_risk_reduction: 0.50,
          implementation_steps: ['Implement preventive measures', 'Increase monitoring']
        }
      ],
      'info': [
        {
          action_id: 'info_response',
          action_type: 'monitoring',
          priority: 'low',
          description: 'Continue monitoring and document',
          estimated_cost: 1000,
          estimated_duration_hours: 1,
          required_personnel: ['Monitoring Team'],
          equipment_needed: ['Monitoring equipment'],
          safety_requirements: ['Standard monitoring protocols'],
          expected_risk_reduction: 0.20,
          implementation_steps: ['Continue monitoring', 'Document findings']
        }
      ]
    };

    return genericActions[severity] || genericActions['info'];
  }

  /**
   * Customize actions based on alert context
   */
  private async customizeActions(
    baseActions: PrescriptiveAction[],
    alertInput: AlertInput
  ): Promise<PrescriptiveAction[]> {
    return baseActions.map(action => {
      // Customize based on location, time, weather, etc.
      let customizedAction = { ...action };

      // Adjust costs based on location accessibility
      if (alertInput.location) {
        // If location is remote or difficult to access, increase costs
        customizedAction.estimated_cost *= 1.2;
        customizedAction.estimated_duration_hours *= 1.5;
      }

      // Adjust based on time of day
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 18) {
        // Night operations cost more
        customizedAction.estimated_cost *= 1.3;
        customizedAction.required_personnel.push('Night Shift Supervisor');
      }

      // Add weather considerations
      customizedAction.safety_requirements.push('Weather assessment required');

      return customizedAction;
    });
  }

  /**
   * Perform cost-benefit analysis on actions
   */
  private async performCostBenefitAnalysis(
    actions: PrescriptiveAction[],
    alertInput: AlertInput
  ): Promise<PrescriptiveAction[]> {
    return actions.map(action => {
      const analysis = this.calculateCostBenefit(action, alertInput);
      
      return {
        ...action,
        cost_benefit_analysis: analysis
      };
    });
  }

  /**
   * Calculate cost-benefit analysis for an action
   */
  private calculateCostBenefit(action: PrescriptiveAction, alertInput: AlertInput): CostBenefitAnalysis {
    const operationalCostPerHour = config.costBenefit.defaultOperationalCostPerHour;
    const safetyCostMultiplier = config.costBenefit.defaultSafetyCostMultiplier;
    
    // Calculate operational impact cost
    const operationalImpactCost = action.estimated_duration_hours * operationalCostPerHour;
    
    // Calculate safety risk cost (potential cost of incident)
    const riskProbability = alertInput.metadata?.risk_probability || 0.5;
    const safetyCost = operationalCostPerHour * safetyCostMultiplier;
    const safetyRiskCost = riskProbability * safetyCost;
    
    // Calculate expected savings from risk reduction
    const expectedSavings = action.expected_risk_reduction * safetyRiskCost;
    
    // Total action cost
    const totalActionCost = action.estimated_cost + operationalImpactCost;
    
    // Calculate ROI
    const netBenefit = expectedSavings - totalActionCost;
    const roiPercentage = totalActionCost > 0 ? (netBenefit / totalActionCost) * 100 : 0;
    
    // Calculate payback period
    const paybackPeriodHours = totalActionCost > 0 ? totalActionCost / (expectedSavings / action.estimated_duration_hours) : 0;
    
    // Make recommendation
    let recommendation: 'implement' | 'defer' | 'modify' = 'implement';
    if (roiPercentage < -50) {
      recommendation = 'defer';
    } else if (roiPercentage < 0) {
      recommendation = 'modify';
    }

    return {
      total_action_cost: totalActionCost,
      operational_impact_cost: operationalImpactCost,
      safety_risk_cost: safetyRiskCost,
      expected_savings: expectedSavings,
      roi_percentage: roiPercentage,
      payback_period_hours: paybackPeriodHours,
      recommendation
    };
  }

  /**
   * Prioritize actions based on priority, risk reduction, and cost-benefit
   */
  private prioritizeActions(actions: PrescriptiveAction[]): PrescriptiveAction[] {
    const priorityWeights = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    return actions.sort((a, b) => {
      // Primary sort: priority
      const priorityDiff = priorityWeights[b.priority] - priorityWeights[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort: expected risk reduction
      const riskReductionDiff = b.expected_risk_reduction - a.expected_risk_reduction;
      if (Math.abs(riskReductionDiff) > 0.1) return riskReductionDiff;
      
      // Tertiary sort: ROI (if cost-benefit analysis available)
      const aRoi = (a as any).cost_benefit_analysis?.roi_percentage || 0;
      const bRoi = (b as any).cost_benefit_analysis?.roi_percentage || 0;
      return bRoi - aRoi;
    });
  }

  /**
   * Get action template by key
   */
  getActionTemplate(templateKey: string): PrescriptiveAction[] | undefined {
    return this.actionTemplates.get(templateKey);
  }

  /**
   * Add or update action template
   */
  setActionTemplate(templateKey: string, actions: PrescriptiveAction[]): void {
    this.actionTemplates.set(templateKey, actions);
    logger.info(`Updated action template: ${templateKey}`);
  }
}