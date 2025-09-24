import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { 
  Scenario, 
  ScenarioResults as ScenarioResultsType,
  AnalyticsData 
} from '../../types/dataScience';

interface RiskHeatmapProps {
  scenarios: Scenario[];
  scenarioResults: { [scenarioId: string]: ScenarioResultsType };
  analyticsData?: AnalyticsData;
}

interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  riskLevel: string;
  scenarioId?: string;
  scenarioName?: string;
}

interface HeatmapData {
  cells: HeatmapCell[];
  xAxis: { label: string; values: number[] };
  yAxis: { label: string; values: number[] };
  colorScale: { min: number; max: number };
}

export const RiskHeatmap: React.FC<RiskHeatmapProps> = ({
  scenarios,
  scenarioResults,
  analyticsData
}) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [selectedParameters, setSelectedParameters] = useState<{ x: string; y: string }>({ x: '', y: '' });
  const [availableParameters, setAvailableParameters] = useState<string[]>([]);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [viewMode, setViewMode] = useState<'risk' | 'confidence'>('risk');

  useEffect(() => {
    // Extract available parameters from scenarios
    const allParameters = new Set<string>();
    scenarios.forEach(scenario => {
      Object.keys(scenario.parameters).forEach(param => allParameters.add(param));
    });
    setAvailableParameters(Array.from(allParameters));

    // Set default parameters if available
    const paramArray = Array.from(allParameters);
    if (paramArray.length >= 2 && !selectedParameters.x && !selectedParameters.y) {
      setSelectedParameters({
        x: paramArray[0],
        y: paramArray[1]
      });
    }
  }, [scenarios]);

  useEffect(() => {
    if (selectedParameters.x && selectedParameters.y) {
      generateHeatmapData();
    }
  }, [selectedParameters, scenarios, scenarioResults, viewMode]);

  const generateHeatmapData = () => {
    if (!selectedParameters.x || !selectedParameters.y) return;

    // Get parameter ranges
    const xValues: number[] = [];
    const yValues: number[] = [];
    
    scenarios.forEach(scenario => {
      const xVal = scenario.parameters[selectedParameters.x];
      const yVal = scenario.parameters[selectedParameters.y];
      if (typeof xVal === 'number') xValues.push(xVal);
      if (typeof yVal === 'number') yValues.push(yVal);
    });

    if (xValues.length === 0 || yValues.length === 0) return;

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    // Create grid
    const gridSize = 20;
    const xStep = (xMax - xMin) / (gridSize - 1);
    const yStep = (yMax - yMin) / (gridSize - 1);

    const cells: HeatmapCell[] = [];
    let minValue = Infinity;
    let maxValue = -Infinity;

    // Generate interpolated risk values for grid
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = xMin + i * xStep;
        const y = yMin + j * yStep;
        
        // Find nearest scenarios and interpolate
        const value = interpolateRiskValue(x, y);
        const riskLevel = getRiskLevel(value);
        
        cells.push({
          x: i,
          y: j,
          value,
          riskLevel
        });

        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    }

    // Add actual scenario points
    scenarios.forEach(scenario => {
      const results = scenarioResults[scenario.id];
      if (!results) return;

      const xVal = scenario.parameters[selectedParameters.x];
      const yVal = scenario.parameters[selectedParameters.y];
      
      if (typeof xVal === 'number' && typeof yVal === 'number') {
        const xGrid = Math.round((xVal - xMin) / xStep);
        const yGrid = Math.round((yVal - yMin) / yStep);
        
        if (xGrid >= 0 && xGrid < gridSize && yGrid >= 0 && yGrid < gridSize) {
          const actualValue = viewMode === 'risk' 
            ? results.riskAssessment.riskScore 
            : results.confidence;
          
          // Update the cell with actual scenario data
          const cellIndex = cells.findIndex(c => c.x === xGrid && c.y === yGrid);
          if (cellIndex >= 0) {
            cells[cellIndex] = {
              ...cells[cellIndex],
              value: actualValue,
              riskLevel: getRiskLevel(actualValue),
              scenarioId: scenario.id,
              scenarioName: scenario.name
            };
          }
        }
      }
    });

    setHeatmapData({
      cells,
      xAxis: {
        label: selectedParameters.x.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        values: Array.from({ length: gridSize }, (_, i) => xMin + i * xStep)
      },
      yAxis: {
        label: selectedParameters.y.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        values: Array.from({ length: gridSize }, (_, i) => yMin + i * yStep)
      },
      colorScale: { min: minValue, max: maxValue }
    });
  };

  const interpolateRiskValue = (x: number, y: number): number => {
    // Simple inverse distance weighting interpolation
    let weightedSum = 0;
    let totalWeight = 0;

    scenarios.forEach(scenario => {
      const results = scenarioResults[scenario.id];
      if (!results) return;

      const xVal = scenario.parameters[selectedParameters.x];
      const yVal = scenario.parameters[selectedParameters.y];
      
      if (typeof xVal === 'number' && typeof yVal === 'number') {
        const distance = Math.sqrt((x - xVal) ** 2 + (y - yVal) ** 2);
        const weight = distance === 0 ? 1e6 : 1 / (distance + 1e-6);
        
        const value = viewMode === 'risk' 
          ? results.riskAssessment.riskScore 
          : results.confidence;
        
        weightedSum += value * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  };

  const getRiskLevel = (value: number): string => {
    if (viewMode === 'confidence') {
      if (value > 0.8) return 'high';
      if (value > 0.6) return 'medium';
      return 'low';
    } else {
      if (value > 0.8) return 'critical';
      if (value > 0.6) return 'high';
      if (value > 0.3) return 'medium';
      return 'low';
    }
  };

  const getCellColor = (cell: HeatmapCell): string => {
    if (viewMode === 'confidence') {
      // Blue scale for confidence
      const intensity = cell.value;
      return `rgba(59, 130, 246, ${intensity})`;
    } else {
      // Red-yellow-green scale for risk
      const intensity = cell.value;
      if (intensity > 0.7) return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
      if (intensity > 0.4) return `rgba(245, 158, 11, ${0.3 + intensity * 0.7})`;
      return `rgba(16, 185, 129, ${0.3 + (1 - intensity) * 0.7})`;
    }
  };

  const formatParameterName = (param: string) => {
    return param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (availableParameters.length < 2) {
    return (
      <div className="risk-heatmap">
        <Card className="empty-state">
          <h3>Insufficient Parameters</h3>
          <p>At least 2 parameters are required to generate a risk heatmap. Create scenarios with multiple parameters to enable this visualization.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="risk-heatmap">
      <div className="risk-heatmap__header">
        <h2>Risk Heatmap</h2>
        <p>Visualize risk patterns across different parameter combinations.</p>
      </div>

      <Card className="heatmap-controls">
        <div className="controls-grid">
          <div className="control-group">
            <label htmlFor="x-parameter">X-Axis Parameter:</label>
            <select
              id="x-parameter"
              value={selectedParameters.x}
              onChange={(e) => setSelectedParameters(prev => ({ ...prev, x: e.target.value }))}
              className="parameter-select"
            >
              <option value="">Select parameter</option>
              {availableParameters.map(param => (
                <option key={param} value={param}>
                  {formatParameterName(param)}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="y-parameter">Y-Axis Parameter:</label>
            <select
              id="y-parameter"
              value={selectedParameters.y}
              onChange={(e) => setSelectedParameters(prev => ({ ...prev, y: e.target.value }))}
              className="parameter-select"
            >
              <option value="">Select parameter</option>
              {availableParameters.map(param => (
                <option key={param} value={param}>
                  {formatParameterName(param)}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>View Mode:</label>
            <div className="view-mode-buttons">
              <button
                className={`mode-btn ${viewMode === 'risk' ? 'active' : ''}`}
                onClick={() => setViewMode('risk')}
              >
                Risk Level
              </button>
              <button
                className={`mode-btn ${viewMode === 'confidence' ? 'active' : ''}`}
                onClick={() => setViewMode('confidence')}
              >
                Confidence
              </button>
            </div>
          </div>
        </div>
      </Card>

      {heatmapData && (
        <Card className="heatmap-visualization">
          <div className="heatmap-container">
            <div className="heatmap-y-axis">
              <div className="axis-label">{heatmapData.yAxis.label}</div>
              <div className="axis-values">
                {heatmapData.yAxis.values.slice().reverse().map((value, index) => (
                  <div key={index} className="axis-tick">
                    {value.toFixed(2)}
                  </div>
                ))}
              </div>
            </div>

            <div className="heatmap-main">
              <div className="heatmap-grid">
                {heatmapData.cells.map((cell, index) => (
                  <div
                    key={index}
                    className={`heatmap-cell ${cell.scenarioId ? 'has-scenario' : ''}`}
                    style={{
                      backgroundColor: getCellColor(cell),
                      gridColumn: cell.x + 1,
                      gridRow: 20 - cell.y
                    }}
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {cell.scenarioId && (
                      <div className="scenario-marker"></div>
                    )}
                  </div>
                ))}
              </div>

              <div className="heatmap-x-axis">
                <div className="axis-values">
                  {heatmapData.xAxis.values.filter((_, i) => i % 4 === 0).map((value, index) => (
                    <div key={index} className="axis-tick">
                      {value.toFixed(2)}
                    </div>
                  ))}
                </div>
                <div className="axis-label">{heatmapData.xAxis.label}</div>
              </div>
            </div>

            <div className="heatmap-legend">
              <div className="legend-title">
                {viewMode === 'risk' ? 'Risk Level' : 'Confidence Level'}
              </div>
              <div className="legend-scale">
                <div className="scale-bar">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className="scale-segment"
                      style={{
                        backgroundColor: getCellColor({
                          x: 0, y: 0, value: i / 9, riskLevel: getRiskLevel(i / 9)
                        })
                      }}
                    ></div>
                  ))}
                </div>
                <div className="scale-labels">
                  <span>{viewMode === 'risk' ? 'Low Risk' : 'Low Confidence'}</span>
                  <span>{viewMode === 'risk' ? 'High Risk' : 'High Confidence'}</span>
                </div>
              </div>
            </div>
          </div>

          {hoveredCell && (
            <div className="heatmap-tooltip">
              <div className="tooltip-content">
                <div className="tooltip-header">
                  {hoveredCell.scenarioName || 'Interpolated Value'}
                </div>
                <div className="tooltip-body">
                  <div className="tooltip-item">
                    <span>X ({heatmapData.xAxis.label}):</span>
                    <span>{heatmapData.xAxis.values[hoveredCell.x]?.toFixed(2)}</span>
                  </div>
                  <div className="tooltip-item">
                    <span>Y ({heatmapData.yAxis.label}):</span>
                    <span>{heatmapData.yAxis.values[hoveredCell.y]?.toFixed(2)}</span>
                  </div>
                  <div className="tooltip-item">
                    <span>{viewMode === 'risk' ? 'Risk Score' : 'Confidence'}:</span>
                    <span>{(hoveredCell.value * 100).toFixed(1)}%</span>
                  </div>
                  <div className="tooltip-item">
                    <span>Level:</span>
                    <span className={`level-badge ${hoveredCell.riskLevel}`}>
                      {hoveredCell.riskLevel.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="heatmap-insights">
        <h3>Insights</h3>
        <div className="insights-grid">
          <div className="insight-item">
            <h4>Parameter Correlation</h4>
            <p>
              Analyze how {formatParameterName(selectedParameters.x)} and {formatParameterName(selectedParameters.y)} 
              interact to influence {viewMode === 'risk' ? 'risk levels' : 'prediction confidence'}.
            </p>
          </div>
          
          <div className="insight-item">
            <h4>Risk Hotspots</h4>
            <p>
              {viewMode === 'risk' 
                ? 'Red areas indicate high-risk parameter combinations that require careful monitoring.'
                : 'Blue areas show parameter combinations with high prediction confidence.'}
            </p>
          </div>
          
          <div className="insight-item">
            <h4>Scenario Coverage</h4>
            <p>
              Markers show actual scenario positions. Consider creating scenarios in unexplored 
              parameter regions to improve coverage.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};