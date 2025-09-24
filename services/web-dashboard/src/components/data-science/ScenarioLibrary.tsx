import React, { useState } from 'react';
import { Card } from '../common/Card';
import { 
  Scenario, 
  ScenarioResults as ScenarioResultsType 
} from '../../types/dataScience';

interface ScenarioLibraryProps {
  scenarios: Scenario[];
  scenarioResults: { [scenarioId: string]: ScenarioResultsType };
  onScenarioExecute: (scenarioId: string) => void;
  onScenarioUpdate: (scenarioId: string, updates: Partial<Scenario>) => void;
  onScenarioDelete: (scenarioId: string) => void;
  onScenarioSelect: (scenarioId: string, selected: boolean) => void;
  selectedScenarios: string[];
  loading: boolean;
}

export const ScenarioLibrary: React.FC<ScenarioLibraryProps> = ({
  scenarios,
  scenarioResults,
  onScenarioExecute,
  onScenarioUpdate,
  onScenarioDelete,
  onScenarioSelect,
  selectedScenarios,
  loading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'risk'>('updated');
  const [filterBy, setFilterBy] = useState<'all' | 'executed' | 'pending'>('all');
  const [editingScenario, setEditingScenario] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; description: string }>({ name: '', description: '' });

  const filteredAndSortedScenarios = scenarios
    .filter(scenario => {
      // Search filter
      const matchesSearch = scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           scenario.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const hasResults = scenarioResults[scenario.id];
      const matchesFilter = filterBy === 'all' || 
                           (filterBy === 'executed' && hasResults) ||
                           (filterBy === 'pending' && !hasResults);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'risk':
          const aRisk = scenarioResults[a.id]?.riskAssessment.riskScore || 0;
          const bRisk = scenarioResults[b.id]?.riskAssessment.riskScore || 0;
          return bRisk - aRisk;
        default:
          return 0;
      }
    });

  const handleEditStart = (scenario: Scenario) => {
    setEditingScenario(scenario.id);
    setEditForm({
      name: scenario.name,
      description: scenario.description
    });
  };

  const handleEditSave = (scenarioId: string) => {
    onScenarioUpdate(scenarioId, editForm);
    setEditingScenario(null);
  };

  const handleEditCancel = () => {
    setEditingScenario(null);
    setEditForm({ name: '', description: '' });
  };

  const getRiskBadgeClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'risk-badge low';
      case 'medium': return 'risk-badge medium';
      case 'high': return 'risk-badge high';
      case 'critical': return 'risk-badge critical';
      default: return 'risk-badge unknown';
    }
  };

  const getStatusBadgeClass = (scenario: Scenario) => {
    const hasResults = scenarioResults[scenario.id];
    return hasResults ? 'status-badge executed' : 'status-badge pending';
  };

  return (
    <div className="scenario-library">
      <div className="scenario-library__header">
        <h2>Scenario Library</h2>
        <p>Manage and execute your saved scenarios.</p>
      </div>

      <div className="scenario-library__controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search scenarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            <option value="updated">Sort by Updated</option>
            <option value="created">Sort by Created</option>
            <option value="name">Sort by Name</option>
            <option value="risk">Sort by Risk Level</option>
          </select>

          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Scenarios</option>
            <option value="executed">Executed Only</option>
            <option value="pending">Pending Only</option>
          </select>
        </div>
      </div>

      <div className="scenario-library__stats">
        <div className="stat-item">
          <span className="stat-label">Total:</span>
          <span className="stat-value">{scenarios.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Executed:</span>
          <span className="stat-value">{Object.keys(scenarioResults).length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Selected:</span>
          <span className="stat-value">{selectedScenarios.length}</span>
        </div>
      </div>

      <div className="scenario-library__grid">
        {filteredAndSortedScenarios.length === 0 ? (
          <Card className="empty-state">
            <h3>No scenarios found</h3>
            <p>
              {searchTerm || filterBy !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first scenario using the Scenario Builder.'}
            </p>
          </Card>
        ) : (
          filteredAndSortedScenarios.map(scenario => {
            const results = scenarioResults[scenario.id];
            const isSelected = selectedScenarios.includes(scenario.id);
            const isEditing = editingScenario === scenario.id;

            return (
              <Card 
                key={scenario.id} 
                className={`scenario-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="scenario-card__header">
                  <div className="scenario-card__title">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="edit-input"
                        autoFocus
                      />
                    ) : (
                      <h3>{scenario.name}</h3>
                    )}
                  </div>
                  
                  <div className="scenario-card__badges">
                    <span className={getStatusBadgeClass(scenario)}>
                      {results ? 'Executed' : 'Pending'}
                    </span>
                    {results && (
                      <span className={getRiskBadgeClass(results.riskAssessment.overallRisk)}>
                        {results.riskAssessment.overallRisk.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="scenario-card__content">
                  {isEditing ? (
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="edit-textarea"
                      rows={3}
                    />
                  ) : (
                    <p className="scenario-description">
                      {scenario.description || 'No description provided.'}
                    </p>
                  )}

                  <div className="scenario-details">
                    <div className="detail-item">
                      <span className="detail-label">Model:</span>
                      <span className="detail-value">{scenario.modelId}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Parameters:</span>
                      <span className="detail-value">{Object.keys(scenario.parameters).length}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Conditions:</span>
                      <span className="detail-value">{scenario.conditions.length}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Updated:</span>
                      <span className="detail-value">
                        {new Date(scenario.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {results && (
                    <div className="scenario-results-preview">
                      <h4>Results Summary</h4>
                      <div className="results-grid">
                        <div className="result-item">
                          <span className="result-label">Risk Score:</span>
                          <span className="result-value">
                            {(results.riskAssessment.riskScore * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="result-item">
                          <span className="result-label">Confidence:</span>
                          <span className="result-value">
                            {(results.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="result-item">
                          <span className="result-label">Predictions:</span>
                          <span className="result-value">{results.predictions.length}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="scenario-card__actions">
                  <div className="action-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onScenarioSelect(scenario.id, e.target.checked)}
                      />
                      Select for comparison
                    </label>
                  </div>

                  <div className="action-buttons">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleEditSave(scenario.id)}
                          className="action-btn save"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="action-btn cancel"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onScenarioExecute(scenario.id)}
                          disabled={loading}
                          className="action-btn execute"
                        >
                          {results ? 'Re-execute' : 'Execute'}
                        </button>
                        <button
                          onClick={() => handleEditStart(scenario)}
                          className="action-btn edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${scenario.name}"?`)) {
                              onScenarioDelete(scenario.id);
                            }
                          }}
                          className="action-btn delete"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {selectedScenarios.length > 0 && (
        <div className="scenario-library__bulk-actions">
          <Card>
            <h3>Bulk Actions</h3>
            <p>{selectedScenarios.length} scenario(s) selected</p>
            <div className="bulk-action-buttons">
              <button
                onClick={() => {
                  selectedScenarios.forEach(id => onScenarioExecute(id));
                }}
                disabled={loading}
                className="bulk-btn execute"
              >
                Execute All Selected
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${selectedScenarios.length} selected scenarios?`)) {
                    selectedScenarios.forEach(id => onScenarioDelete(id));
                  }
                }}
                className="bulk-btn delete"
              >
                Delete Selected
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};