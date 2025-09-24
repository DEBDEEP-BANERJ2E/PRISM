import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Tabs } from '../common/Tabs';
import { 
  Scenario, 
  ScenarioResults as ScenarioResultsType,
  RiskAssessment,
  SensitivityAnalysis,
  PredictionResult
} from '../../types/dataScience';

interface ScenarioResultsProps {
  scenarios: Scenario[];
  scenarioResults: { [scenarioId: string]: ScenarioResultsType };
  selectedScenarios: string[];
}

export const ScenarioResults: React.FC<ScenarioResultsProps> = ({
  scenarios,
  scenarioResults,
  selectedScenarios
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  // Get the first available scenario with results if none selected
  const availableScenarios = scenarios.filter(s => scenarioResults[s.id]);
  const currentScenarioId = selectedScenarioId || availableScenarios[0]?.id || '';
  const currentScenario = scenarios.find(s => s.id === currentScenarioId);
  const currentResults = scenarioResults[currentScenarioId];

  if (availableScenarios.length === 0) {
    return (
      <div className="scenario-results">
        <Card className="empty-state">
          <h3>No scenario results available</h3>
          <p>Execute some scenarios to see detailed results and analysis.</p>
        </Card>
      </div>
    );
  }

  const renderRiskAssessment = (riskAssessment: RiskAssessment) => (
    <Card className="risk-assessment">
      <h3>Risk Assessment</h3>
      
      <div className="risk-overview">
        <div className="risk-level">
          <span className="label">Overall Risk Level:</span>
          <span className={`risk-badge ${riskAssessment.overallRisk}`}>
            {riskAssessment.overallRisk.toUpperCase()}
          </span>
        </div>
        
        <div className="risk-score">
          <span className="label">Risk Score:</span>
          <div className="score-container">
            <div 
              className="score-bar"
              style={{ width: `${riskAssessment.riskScore * 100}%` }}
            ></div>
            <span className="score-value">
              {(riskAssessment.riskScore * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="risk-factors">
        <h4>Risk Factors</h4>
        <div className="factors-list">
          {riskAssessment.factors.map((factor, index) => (
            <div key={index} className="factor-item">
              <div className="factor-header">
                <span className="factor-name">{factor.factor}</span>
                <span className="factor-impact">
                  Impact: {(factor.impact * 100).toFixed(1)}%
                </span>
              </div>
              <div className="factor-bar">
                <div 
                  className="impact-bar"
                  style={{ width: `${factor.impact * 100}%` }}
                ></div>
              </div>
              <div className="factor-confidence">
                Confidence: {(factor.confidence * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="risk-recommendations">
        <h4>Recommendations</h4>
        <ul>
          {riskAssessment.recommendations.map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      </div>

      <div className="risk-validity">
        <small>
          Valid until: {new Date(riskAssessment.validUntil).toLocaleString()}
        </small>
      </div>
    </Card>
  );

  const renderSensitivityAnalysis = (sensitivity: SensitivityAnalysis) => (
    <Card className="sensitivity-analysis">
      <h3>Sensitivity Analysis</h3>
      
      <div className="sensitivity-overview">
        <div className="stability-score">
          <span className="label">Stability Score:</span>
          <div className="score-container">
            <div 
              className="stability-bar"
              style={{ width: `${sensitivity.stabilityScore * 100}%` }}
            ></div>
            <span className="score-value">
              {(sensitivity.stabilityScore * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="most-sensitive">
        <h4>Most Sensitive Parameters</h4>
        <div className="sensitive-params">
          {sensitivity.mostSensitiveParameters.map((param, index) => (
            <span key={index} className="sensitive-param">
              {param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          ))}
        </div>
      </div>

      <div className="parameter-analysis">
        <h4>Parameter Impact Analysis</h4>
        {sensitivity.parameters.map((param, index) => {
          const variance = Math.max(...param.impacts) - Math.min(...param.impacts);
          
          return (
            <div key={index} className="param-analysis-item">
              <div className="param-header">
                <span className="param-name">
                  {param.parameter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="param-variance">
                  Variance: {variance.toFixed(3)}
                </span>
              </div>
              
              <div className="param-chart">
                <div className="chart-container">
                  {param.testValues.map((value, i) => (
                    <div key={i} className="chart-bar">
                      <div 
                        className="bar"
                        style={{ 
                          height: `${(param.impacts[i] / Math.max(...param.impacts)) * 100}%` 
                        }}
                      ></div>
                      <div className="bar-label">
                        {value.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="param-details">
                <span>Base Value: {param.baseValue.toFixed(2)}</span>
                <span>Min Impact: {Math.min(...param.impacts).toFixed(3)}</span>
                <span>Max Impact: {Math.max(...param.impacts).toFixed(3)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );

  const renderPredictions = (predictions: PredictionResult[]) => (
    <Card className="predictions-analysis">
      <h3>Predictions Analysis</h3>
      
      <div className="predictions-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total Predictions:</span>
            <span className="stat-value">{predictions.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Average Confidence:</span>
            <span className="stat-value">
              {(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100).toFixed(1)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">High Confidence (&gt;80%):</span>
            <span className="stat-value">
              {predictions.filter(p => p.confidence > 0.8).length}
            </span>
          </div>
        </div>
      </div>

      <div className="predictions-distribution">
        <h4>Prediction Distribution</h4>
        <div className="distribution-chart">
          {/* Simple histogram of prediction values */}
          {(() => {
            const values = predictions.map(p => typeof p.prediction === 'number' ? p.prediction : 0);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const bins = 10;
            const binSize = (max - min) / bins;
            const histogram = Array(bins).fill(0);
            
            values.forEach(value => {
              const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
              histogram[binIndex]++;
            });
            
            const maxCount = Math.max(...histogram);
            
            return histogram.map((count, index) => (
              <div key={index} className="histogram-bar">
                <div 
                  className="bar"
                  style={{ height: `${(count / maxCount) * 100}%` }}
                ></div>
                <div className="bar-label">
                  {(min + index * binSize).toFixed(2)}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      <div className="predictions-table">
        <h4>Detailed Predictions</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Prediction</th>
                <th>Confidence</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {predictions.slice(0, 10).map(prediction => (
                <tr key={prediction.id}>
                  <td>{prediction.id.slice(-8)}</td>
                  <td>
                    {typeof prediction.prediction === 'number' 
                      ? prediction.prediction.toFixed(4)
                      : prediction.prediction}
                  </td>
                  <td>
                    <div className="confidence-cell">
                      <div 
                        className="confidence-bar"
                        style={{ width: `${prediction.confidence * 100}%` }}
                      ></div>
                      <span>{(prediction.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td>{new Date(prediction.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {predictions.length > 10 && (
            <div className="table-footer">
              Showing 10 of {predictions.length} predictions
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: currentResults && (
        <div className="results-overview">
          <Card className="scenario-info">
            <h3>Scenario Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">{currentScenario?.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Description:</span>
                <span className="info-value">{currentScenario?.description || 'No description'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Model ID:</span>
                <span className="info-value">{currentScenario?.modelId}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Executed:</span>
                <span className="info-value">
                  {new Date(currentResults.executedAt).toLocaleString()}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Overall Confidence:</span>
                <span className="info-value">
                  {(currentResults.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>

          <div className="overview-metrics">
            <Card className="metric-card risk">
              <h4>Risk Level</h4>
              <div className={`metric-value ${currentResults.riskAssessment.overallRisk}`}>
                {currentResults.riskAssessment.overallRisk.toUpperCase()}
              </div>
              <div className="metric-detail">
                Score: {(currentResults.riskAssessment.riskScore * 100).toFixed(1)}%
              </div>
            </Card>

            <Card className="metric-card predictions">
              <h4>Predictions</h4>
              <div className="metric-value">
                {currentResults.predictions.length}
              </div>
              <div className="metric-detail">
                Avg Confidence: {(currentResults.predictions.reduce((sum, p) => sum + p.confidence, 0) / currentResults.predictions.length * 100).toFixed(1)}%
              </div>
            </Card>

            <Card className="metric-card stability">
              <h4>Stability</h4>
              <div className="metric-value">
                {(currentResults.sensitivity.stabilityScore * 100).toFixed(1)}%
              </div>
              <div className="metric-detail">
                {currentResults.sensitivity.mostSensitiveParameters.length} sensitive params
              </div>
            </Card>
          </div>

          <Card className="quick-recommendations">
            <h3>Key Recommendations</h3>
            <ul>
              {currentResults.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </Card>
        </div>
      )
    },
    {
      id: 'risk',
      label: 'Risk Assessment',
      content: currentResults && renderRiskAssessment(currentResults.riskAssessment)
    },
    {
      id: 'sensitivity',
      label: 'Sensitivity Analysis',
      content: currentResults && renderSensitivityAnalysis(currentResults.sensitivity)
    },
    {
      id: 'predictions',
      label: 'Predictions',
      content: currentResults && renderPredictions(currentResults.predictions)
    }
  ];

  return (
    <div className="scenario-results">
      <div className="scenario-results__header">
        <h2>Scenario Results & Analysis</h2>
        
        <div className="scenario-selector">
          <label htmlFor="scenario-select">Select Scenario:</label>
          <select
            id="scenario-select"
            value={currentScenarioId}
            onChange={(e) => setSelectedScenarioId(e.target.value)}
            className="scenario-select"
          >
            {availableScenarios.map(scenario => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentResults ? (
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="results-tabs"
        />
      ) : (
        <Card className="no-results">
          <h3>No results available</h3>
          <p>Select a scenario that has been executed to view results.</p>
        </Card>
      )}
    </div>
  );
};