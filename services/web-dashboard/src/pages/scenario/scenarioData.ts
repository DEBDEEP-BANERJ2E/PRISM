export interface Scenario {
  id: string;
  name: string;
  description: string;
  parameters: {
    rainfall: number;
    temperature: number;
    blastIntensity: number;
    groundwaterLevel: number;
    slopeAngle: number;
  };
  results: {
    riskLevel: number;
    timeToFailure: number;
    affectedArea: number;
    confidence: number;
  };
  status: 'draft' | 'running' | 'completed' | 'failed';
}

export const sampleScenarios: Scenario[] = [
  {
    id: '1',
    name: 'Heavy Rainfall Scenario',
    description: 'Simulate heavy rainfall conditions',
    parameters: {
      rainfall: 150,
      temperature: 25,
      blastIntensity: 3,
      groundwaterLevel: 8,
      slopeAngle: 35
    },
    results: {
      riskLevel: 0,
      timeToFailure: 0,
      affectedArea: 0,
      confidence: 0
    },
    status: 'draft'
  },
  {
    id: '2',
    name: 'High Temperature Scenario',
    description: 'Simulate conditions with elevated temperatures',
    parameters: {
      rainfall: 50,
      temperature: 40,
      blastIntensity: 2,
      groundwaterLevel: 10,
      slopeAngle: 30
    },
    results: {
      riskLevel: 0,
      timeToFailure: 0,
      affectedArea: 0,
      confidence: 0
    },
    status: 'draft'
  },
  {
    id: '3',
    name: 'Increased Blast Intensity',
    description: 'Simulate the impact of higher blast intensity',
    parameters: {
      rainfall: 80,
      temperature: 20,
      blastIntensity: 7,
      groundwaterLevel: 7,
      slopeAngle: 40
    },
    results: {
      riskLevel: 0,
      timeToFailure: 0,
      affectedArea: 0,
      confidence: 0
    },
    status: 'draft'
  }
];