import React, { useState } from 'react';
import { Card } from '../common/Card';
import { ReportConfiguration, ReportMetadata } from '../../types/dataScience';

interface ExportControlsProps {
  configuration: ReportConfiguration;
  metadata: ReportMetadata;
  onConfigChange: (config: Partial<ReportConfiguration>) => void;
  onMetadataChange: (metadata: Partial<ReportMetadata>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  hasData: boolean;
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  configuration,
  metadata,
  onConfigChange,
  onMetadataChange,
  onGenerate,
  isGenerating,
  hasData
}) => {
  const [selectedFormat, setSelectedFormat] = useState(configuration.format);

  const handleFormatChange = (format: 'pdf' | 'html' | 'docx') => {
    setSelectedFormat(format);
    onConfigChange({ format });
  };

  const formatOptions = [
    {
      id: 'pdf',
      name: 'PDF Document',
      description: 'Professional PDF report with charts and formatting',
      icon: '📄',
      features: ['Print-ready', 'Charts included', 'Professional layout', 'Shareable']
    },
    {
      id: 'html',
      name: 'HTML Report',
      description: 'Interactive web-based report',
      icon: '🌐',
      features: ['Interactive charts', 'Responsive design', 'Web-friendly', 'Fast generation']
    },
    {
      id: 'docx',
      name: 'Word Document',
      description: 'Editable Microsoft Word document',
      icon: '📝',
      features: ['Editable content', 'Word compatible', 'Easy collaboration', 'Template support']
    }
  ];

  const getEstimatedSize = () => {
    let baseSize = 2; // MB
    
    if (configuration.includeCharts) {
      baseSize += 5;
    }
    
    if (configuration.includeRawData) {
      baseSize += 3;
    }
    
    const enabledSections = configuration.sections.filter(s => s.enabled).length;
    baseSize += enabledSections * 0.5;
    
    return baseSize.toFixed(1);
  };

  const getEstimatedTime = () => {
    let baseTime = 30; // seconds
    
    if (configuration.format === 'pdf') {
      baseTime += 20;
    }
    
    if (configuration.includeCharts) {
      baseTime += 25;
    }
    
    const enabledSections = configuration.sections.filter(s => s.enabled).length;
    baseTime += enabledSections * 5;
    
    return Math.ceil(baseTime);
  };

  return (
    <div className="export-controls">
      <div className="export-header">
        <h2>Export Configuration</h2>
        <p>Configure your report format and generate the final document.</p>
      </div>

      {/* Format Selection */}
      <Card className="format-selection">
        <h3>Output Format</h3>
        <div className="format-options">
          {formatOptions.map((format) => (
            <div
              key={format.id}
              className={`format-option ${selectedFormat === format.id ? 'selected' : ''}`}
              onClick={() => handleFormatChange(format.id as 'pdf' | 'html' | 'docx')}
            >
              <div className="format-header">
                <span className="format-icon">{format.icon}</span>
                <div className="format-info">
                  <h4>{format.name}</h4>
                  <p>{format.description}</p>
                </div>
                <div className="format-radio">
                  <input
                    type="radio"
                    name="format"
                    value={format.id}
                    checked={selectedFormat === format.id}
                    onChange={() => handleFormatChange(format.id as 'pdf' | 'html' | 'docx')}
                  />
                </div>
              </div>
              <div className="format-features">
                {format.features.map((feature, index) => (
                  <span key={index} className="feature-tag">{feature}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Export Options */}
      <Card className="export-options">
        <h3>Export Options</h3>
        <div className="options-grid">
          <div className="option-group">
            <h4>Content Options</h4>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={configuration.includeCharts}
                onChange={(e) => onConfigChange({ includeCharts: e.target.checked })}
              />
              <span className="checkmark"></span>
              Include Charts & Visualizations
              <small>Embed interactive charts and graphs in the report</small>
            </label>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={configuration.includeRawData}
                onChange={(e) => onConfigChange({ includeRawData: e.target.checked })}
              />
              <span className="checkmark"></span>
              Include Raw Data Tables
              <small>Add detailed data tables to the appendix</small>
            </label>
          </div>

          <div className="option-group">
            <h4>Quality Settings</h4>
            <div className="form-group">
              <label>Chart Resolution</label>
              <select defaultValue="high">
                <option value="standard">Standard (72 DPI)</option>
                <option value="high">High (150 DPI)</option>
                <option value="print">Print Quality (300 DPI)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Page Size</label>
              <select defaultValue="a4">
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Generation Summary */}
      <Card className="generation-summary">
        <h3>Generation Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Sections</span>
            <span className="summary-value">
              {configuration.sections.filter(s => s.enabled).length} enabled
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Format</span>
            <span className="summary-value">{selectedFormat.toUpperCase()}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Estimated Size</span>
            <span className="summary-value">{getEstimatedSize()} MB</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Estimated Time</span>
            <span className="summary-value">{getEstimatedTime()}s</span>
          </div>
        </div>
      </Card>

      {/* Generation Controls */}
      <Card className="generation-controls">
        <div className="controls-content">
          <div className="generation-info">
            <h3>Ready to Generate</h3>
            {hasData ? (
              <p>Your report is configured and ready to generate. Click the button below to create your document.</p>
            ) : (
              <div className="warning-message">
                <span className="warning-icon">⚠️</span>
                <div>
                  <p><strong>No Analytics Data Available</strong></p>
                  <p>Please run model training first to generate analytics data for your report.</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="generation-actions">
            <button
              className="btn btn-primary btn-large"
              onClick={onGenerate}
              disabled={isGenerating || !hasData}
            >
              {isGenerating ? (
                <>
                  <span className="spinner"></span>
                  Generating Report...
                </>
              ) : (
                <>
                  <span className="generate-icon">📊</span>
                  Generate Report
                </>
              )}
            </button>
            
            {!hasData && (
              <p className="help-text">
                Go to <strong>Model Configuration</strong> to train a model and generate analytics data.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Tips & Best Practices */}
      <Card className="tips-section">
        <h3>Tips & Best Practices</h3>
        <div className="tips-list">
          <div className="tip-item">
            <span className="tip-icon">💡</span>
            <div>
              <strong>PDF Format:</strong> Best for sharing and printing. Includes high-quality charts and professional formatting.
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🚀</span>
            <div>
              <strong>HTML Format:</strong> Fastest generation time. Great for quick reviews and web sharing.
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">✏️</span>
            <div>
              <strong>Word Format:</strong> Perfect when you need to edit content or collaborate with others.
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">📈</span>
            <div>
              <strong>Charts:</strong> Including charts increases file size but provides better visual insights.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ExportControls;