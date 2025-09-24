import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { 
  Scenario, 
  ScenarioResults as ScenarioResultsType 
} from '../../types/dataScience';
import { scenarioAPI } from '../../api/dataScience/scenarios';

interface ScenarioComparisonProps {
  scenarios: Scenario[];
  scenarioResults: { [scenarioId: string]: ScenarioResultsType };
  onRefresh: () => void;
}

interface ComparisonData {
  scenarios: Scenario[];
  results: ScenarioResultsType[];
  comparison: {
    riskLevels: { [scenarioId: string]: string };
    confidenceScores: { [scenarioId: string]: number };
    recommendations: { [scenarioId: string]: string[] };
    bestScenario: string;
    worstScenario: string;
  };
}

export const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  scenarios,
  scenarioResults,
  onRefresh
}) => {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'chart'>('overview');

  useEffect(() => {
    if (scenarios.length >= 2) {
      loadComparison();
    }
  }, [scenarios]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const scenarioIds = scenarios.map(s => s.id);
      const response = await scenarioAPI.compareScenarios(scenarioIds);
      
      if (response.success && response.data) {
        setComparisonData(response.data);
      }
    } catch (err: any) {
      setError(`Failed to load comparison: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'critical': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getRiskScore = (scenarioId: string) => {
    return scenarioResults[scenarioId]?.riskAssessment.riskScore || 0;
  };

  const getConfidenceScore = (scenarioId: string) => {
    return scenarioResults[scenarioId]?.confidence || 0;
  };

  if (scenarios.length < 2) {
    return (
      <div className="scenario-comparison">
        <Card className="empty-state">
          <h3>Select at least 2 scenarios to compare</h3>
          <p>Go to the Scenario Library and select multiple scenarios to see a detailed comparison.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="scenario-comparison">
        <Card className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading comparison data...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scenario-comparison">
        <Card className="error-state">
          <h3>Error Loading Comparison</h3>
          <p>{error}</p>
          <button onClick={loadComparison} className="retry-btn">
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="scenario-comparison">
      <div className="scenario-comparison__header">
        <h2>Scenario Comparison</h2>
        <p>Compare {scenarios.length} selected scenarios side by side.</p>
        
        <div className="view-mode-tabs">
          <button
            className={`tab-btn ${viewMode === 'overview' ? 'active' : ''}`}
            onClick={() => setViewMode('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${viewMode === 'detailed' ? 'active' : ''}`}
            onClick={() => setViewMode('detailed')}
          >
            Detailed
          </button>
          <button
            className={`tab-btn ${viewMode === 'chart' ? 'active' : ''}`}
            onClick={() => setViewMode('chart')}
          >
            Charts
          </button>
        </div>
      </div>

      {viewMode === 'overview' && (
        <div className="comparison-overview">
          <Card className="comparison-summary">
            <h3>Comparison Summary</h3>
            
            {comparisonData && (
              <div className="summary-grid">
                <div className="summary-item best">
                  <h4>Best Scenario (Lowest Risk)</h4>
                  <div className="scenario-highlight">
                    {scenarios.find(s => s.id === comparisonData.comparison.bestScenario)?.name || 'Unknown'}
                  </div>
                  <div className="risk-info">
                    Risk Level: {comparisonData.comparison.riskLevels[comparisonData.comparison.bestScenario]}
                  </div>
                </div>
                
                <div className="summary-item worst">
                  <h4>Highest Risk Scenario</h4>
                  <div className="scenario-highlight">
                    {scenarios.find(s => s.id === comparisonData.comparison.worstScenario)?.name || 'Unknown'}
                  </div>
                  <div className="risk-info">
                    Risk Level: {comparisonData.comparison.riskLevels[comparisonData.comparison.worstScenario]}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="scenarios-grid">
            <h3>Scenario Overview</h3>
            <div className="scenarios-comparison-grid">
              {scenarios.map(scenario => {
                const results = scenarioResults[scenario.id];
                const riskScore = getRiskScore(scenario.id);
                const confidence = getConfidenceScore(scenario.id);
                
                return (
                  <div key={scenario.id} className="scenario-comparison-card">
                    <h4>{scenario.name}</h4>
                    
                    {results ? (
                      <div className="scenario-metrics">
                        <div className="metric">
                          <span className="metric-label">Risk Score:</span>
                          <div className="metric-value">
                            <div 
                              className="risk-bar"
                              style={{ 
                                width: `${riskScore * 100}%`,
                                backgroundColor: getRiskColor(results.riskAssessment.overallRisk)
                              }}
                            ></div>
                            <span>{(riskScore * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                        
                        <div className="metric">
                          <span className="metric-label">Confidence:</span>
                          <div className="metric-value">
                            <div 
                              className="confidence-bar"
                              style={{ width: `${confidence * 100}%` }}
                            ></div>
                            <span>{(confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                        
                        <div className="metric">
                          <span className="metric-label">Risk Level:</span>
                          <span 
                            className="risk-badge"
                            style={{ backgroundColor: getRiskColor(results.riskAssessment.overallRisk) }}
                          >
                            {results.riskAssessment.overallRisk.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="metric">
                          <span className="metric-label">Predictions:</span>
                          <span>{results.predictions.length}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="no-results">
                        <p>No execution results available</p>
                        <small>Execute this scenario to see comparison data</small>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {viewMode === 'detailed' && (
        <div className="comparison-detailed">
          <Card className="detailed-comparison-table">
            <h3>Detailed Comparison</h3>
            
            <div className="comparison-table">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {scenarios.map(scenario => (
                      <th key={scenario.id}>{scenario.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Risk Score</strong></td>
                    {scenarios.map(scenario => (
                      <td key={scenario.id}>
                        {(getRiskScore(scenario.id) * 100).toFixed(2)}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td><strong>Risk Level</strong></td>
                    {scenarios.map(scenario => {
                      const results = scenarioResults[scenario.id];
                      return (
                        <td key={scenario.id}>
                          {results ? results.riskAssessment.overallRisk : 'N/A'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td><strong>Confidence</strong></td>
                    {scenarios.map(scenario => (
                      <td key={scenario.id}>
                        {(getConfidenceScore(scenario.id) * 100).toFixed(2)}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td><strong>Predictions Count</strong></td>
                    {scenarios.map(scenario => {
                      const results = scenarioResults[scenario.id];
                      return (
                        <td key={scenario.id}>
                          {results ? results.predictions.length : 0}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td><strong>Parameters Count</strong></td>
                    {scenarios.map(scenario => (
                      <td key={scenario.id}>
                        {Object.keys(scenario.parameters).length}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td><strong>Conditions Count</strong></td>
                    {scenarios.map(scenario => (
                      <td key={scenario.id}>
                        {scenario.conditions.length}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td><strong>Created Date</strong></td>
                    {scenarios.map(scenario => (
                      <td key={scenario.id}>
                        {new Date(scenario.createdAt).toLocaleDateString()}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="recommendations-comparison">
            <h3>Recommendations Comparison</h3>
            
            <div className="recommendations-grid">
              {scenarios.map(scenario => {
                const results = scenarioResults[scenario.id];
                return (
                  <div key={scenario.id} className="scenario-recommendations">
                    <h4>{scenario.name}</h4>
                    {results ? (
                      <ul className="recommendations-list">
                        {results.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-recommendations">No recommendations available</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {viewMode === 'chart' && (
        <div className="comparison-charts">
          <Card className="risk-comparison-chart">
            <h3>Risk Score Comparison</h3>
            <div className="chart-container">
              <div className="bar-chart">
                {scenarios.map((scenario, index) => {
                  const riskScore = getRiskScore(scenario.id);
                  const results = scenarioResults[scenario.id];
                  
                  return (
                    <div key={scenario.id} className="bar-item">
                      <div className="bar-label">{scenario.name}</div>
                      <div className="bar-container">
                        <div 
                          className="bar"
                          style={{ 
                            height: `${riskScore * 100}%`,
                            backgroundColor: results ? getRiskColor(results.riskAssessment.overallRisk) : '#6b7280'
                          }}
                        ></div>
                      </div>
                      <div className="bar-value">{(riskScore * 100).toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card className="confidence-comparison-chart">
            <h3>Confidence Score Comparison</h3>
            <div className="chart-container">
              <div className="bar-chart">
                {scenarios.map(scenario => {
                  const confidence = getConfidenceScore(scenario.id);
                  
                  return (
                    <div key={scenario.id} className="bar-item">
                      <div className="bar-label">{scenario.name}</div>
                      <div className="bar-container">
                        <div 
                          className="bar confidence-bar"
                          style={{ height: `${confidence * 100}%` }}
                        ></div>
                      </div>
                      <div className="bar-value">{(confidence * 100).toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="comparison-actions">
        <button onClick={onRefresh} className="refresh-btn">
          Refresh Data
        </button>
        <button 
          onClick={() => window.print()} 
          className="export-btn"
        >
          Export Comparison
        </button>
      </div>
    </div>
  );
};