import React from 'react';
import { Card } from '../common/Card';
import { ReportConfiguration } from '../../types/dataScience';

interface SectionEditorProps {
  configuration: ReportConfiguration;
  onConfigChange: (config: Partial<ReportConfiguration>) => void;
  availableSections: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export const SectionEditor: React.FC<SectionEditorProps> = ({
  configuration,
  onConfigChange,
  availableSections
}) => {
  const handleSectionToggle = (sectionId: string) => {
    const updatedSections = configuration.sections.map(section =>
      section.id === sectionId
        ? { ...section, enabled: !section.enabled }
        : section
    );
    onConfigChange({ sections: updatedSections });
  };

  const handleSectionReorder = (sectionId: string, direction: 'up' | 'down') => {
    const currentIndex = configuration.sections.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= configuration.sections.length) return;

    const updatedSections = [...configuration.sections];
    const [movedSection] = updatedSections.splice(currentIndex, 1);
    updatedSections.splice(newIndex, 0, movedSection);

    // Update order numbers
    updatedSections.forEach((section, index) => {
      section.order = index + 1;
    });

    onConfigChange({ sections: updatedSections });
  };

  const getSectionInfo = (sectionId: string) => {
    return availableSections.find(s => s.id === sectionId);
  };

  return (
    <div className="section-editor">
      <div className="editor-header">
        <h2>Report Sections</h2>
        <p>Configure which sections to include in your report and their order.</p>
      </div>

      <Card className="sections-list">
        <h3>Available Sections</h3>
        <div className="sections-container">
          {configuration.sections.map((section, index) => {
            const sectionInfo = getSectionInfo(section.id);
            return (
              <div
                key={section.id}
                className={`section-item ${section.enabled ? 'enabled' : 'disabled'}`}
              >
                <div className="section-header">
                  <div className="section-toggle">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={() => handleSectionToggle(section.id)}
                      />
                      <span className="checkmark"></span>
                    </label>
                  </div>
                  
                  <div className="section-info">
                    <h4>{section.name}</h4>
                    <p>{sectionInfo?.description || 'No description available'}</p>
                  </div>

                  <div className="section-controls">
                    <div className="order-controls">
                      <button
                        className="btn btn-small"
                        onClick={() => handleSectionReorder(section.id, 'up')}
                        disabled={index === 0}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <span className="order-number">{section.order}</span>
                      <button
                        className="btn btn-small"
                        onClick={() => handleSectionReorder(section.id, 'down')}
                        disabled={index === configuration.sections.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>

                {section.enabled && (
                  <div className="section-preview">
                    <div className="preview-content">
                      {section.id === 'summary' && (
                        <div className="preview-text">
                          <strong>Executive Summary:</strong> High-level overview of analysis results, key findings, and model performance metrics.
                        </div>
                      )}
                      {section.id === 'data_overview' && (
                        <div className="preview-text">
                          <strong>Data Overview:</strong> Dataset statistics, data quality metrics, and preprocessing information.
                        </div>
                      )}
                      {section.id === 'model_performance' && (
                        <div className="preview-text">
                          <strong>Model Performance:</strong> Detailed metrics including accuracy, precision, recall, F1-score, and confusion matrices.
                        </div>
                      )}
                      {section.id === 'features' && (
                        <div className="preview-text">
                          <strong>Feature Analysis:</strong> Feature importance rankings, correlations, and impact analysis.
                        </div>
                      )}
                      {section.id === 'recommendations' && (
                        <div className="preview-text">
                          <strong>Recommendations:</strong> Actionable insights and suggestions for model improvement and next steps.
                        </div>
                      )}
                      {section.id === 'technical_details' && (
                        <div className="preview-text">
                          <strong>Technical Details:</strong> Model configuration, hyperparameters, and detailed technical specifications.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="section-summary">
        <h3>Report Summary</h3>
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total Sections:</span>
            <span className="stat-value">{configuration.sections.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Enabled Sections:</span>
            <span className="stat-value">{configuration.sections.filter(s => s.enabled).length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Estimated Pages:</span>
            <span className="stat-value">{Math.ceil(configuration.sections.filter(s => s.enabled).length * 1.5)}</span>
          </div>
        </div>

        <div className="enabled-sections-preview">
          <h4>Report Structure Preview:</h4>
          <ol className="structure-list">
            {configuration.sections
              .filter(s => s.enabled)
              .sort((a, b) => a.order - b.order)
              .map(section => (
                <li key={section.id} className="structure-item">
                  {section.name}
                </li>
              ))}
          </ol>
        </div>
      </Card>

      <Card className="section-tips">
        <h3>Section Tips</h3>
        <div className="tips-list">
          <div className="tip-item">
            <span className="tip-icon">💡</span>
            <div>
              <strong>Executive Summary:</strong> Always include this section for stakeholder reports. It provides a quick overview of key findings.
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">📊</span>
            <div>
              <strong>Model Performance:</strong> Essential for technical audiences. Shows detailed metrics and validation results.
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🔍</span>
            <div>
              <strong>Feature Analysis:</strong> Helps understand which variables drive model predictions and business insights.
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🎯</span>
            <div>
              <strong>Recommendations:</strong> Provides actionable next steps based on analysis results.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SectionEditor;