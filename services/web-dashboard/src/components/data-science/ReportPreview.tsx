import React from 'react';
import { Card } from '../common/Card';
import { 
  AnalyticsData, 
  ReportConfiguration, 
  ReportMetadata 
} from '../../types/dataScience';

interface ReportPreviewProps {
  analyticsData?: AnalyticsData;
  configuration: ReportConfiguration;
  metadata: ReportMetadata;
  onConfigChange: (config: Partial<ReportConfiguration>) => void;
  onMetadataChange: (metadata: Partial<ReportMetadata>) => void;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  analyticsData,
  configuration,
  metadata,
  onConfigChange,
  onMetadataChange
}) => {
  const handleMetadataInputChange = (field: keyof ReportMetadata, value: string) => {
    onMetadataChange({ [field]: value });
  };

  const getBestModel = () => {
    if (!analyticsData?.modelPerformance) return null;
    // For single model, return it directly
    return analyticsData.modelPerformance;
  };

  const getKeyInsights = () => {
    const insights: string[] = [];
    
    if (analyticsData?.modelPerformance) {
      const model = analyticsData.modelPerformance;
      insights.push(`Model accuracy: ${(model.accuracy * 100).toFixed(1)}%`);
      insights.push(`F1 Score: ${(model.f1Score * 100).toFixed(1)}%`);
    }

    if (analyticsData?.featureImportance?.features?.length > 0) {
      const topFeature = analyticsData.featureImportance.features[0];
      insights.push(`Most important feature: ${topFeature.name} (${(topFeature.importance * 100).toFixed(1)}%)`);
    }

    if (analyticsData?.modelInfo?.datasetSize) {
      insights.push(`Dataset size: ${analyticsData.modelInfo.datasetSize.toLocaleString()} samples`);
    }

    return insights;
  };

  const enabledSections = configuration.sections.filter(s => s.enabled).sort((a, b) => a.order - b.order);

  return (
    <div className="report-preview">
      <div className="preview-controls">
        <Card className="metadata-editor">
          <h3>Report Metadata</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="report-title">Title</label>
              <input
                id="report-title"
                type="text"
                value={metadata.title || ''}
                onChange={(e) => handleMetadataInputChange('title', e.target.value)}
                placeholder="Report Title"
              />
            </div>
            <div className="form-group">
              <label htmlFor="report-author">Author</label>
              <input
                id="report-author"
                type="text"
                value={metadata.author || ''}
                onChange={(e) => handleMetadataInputChange('author', e.target.value)}
                placeholder="Author Name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="report-version">Version</label>
              <input
                id="report-version"
                type="text"
                value={metadata.version || ''}
                onChange={(e) => handleMetadataInputChange('version', e.target.value)}
                placeholder="1.0"
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="report-description">Description</label>
              <textarea
                id="report-description"
                value={metadata.description || ''}
                onChange={(e) => handleMetadataInputChange('description', e.target.value)}
                placeholder="Brief description of the report"
                rows={3}
              />
            </div>
          </div>
        </Card>

        <Card className="format-options">
          <h3>Format Options</h3>
          <div className="format-controls">
            <div className="form-group">
              <label>Output Format</label>
              <select
                value={configuration.format}
                onChange={(e) => onConfigChange({ format: e.target.value as 'pdf' | 'html' | 'docx' })}
              >
                <option value="pdf">PDF</option>
                <option value="html">HTML</option>
                <option value="docx">Word Document</option>
              </select>
            </div>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={configuration.includeCharts}
                  onChange={(e) => onConfigChange({ includeCharts: e.target.checked })}
                />
                Include Charts & Visualizations
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={configuration.includeRawData}
                  onChange={(e) => onConfigChange({ includeRawData: e.target.checked })}
                />
                Include Raw Data Tables
              </label>
            </div>
          </div>
        </Card>
      </div>

      <div className="preview-content">
        <Card className="report-preview-card">
          <div className="report-document">
            {/* Report Header */}
            <header className="report-header">
              <h1>{metadata.title || 'Data Science Analysis Report'}</h1>
              <div className="report-meta">
                <p><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
                <p><strong>Author:</strong> {metadata.author || 'PRISM System'}</p>
                <p><strong>Version:</strong> {metadata.version || '1.0'}</p>
              </div>
              {metadata.description && (
                <p className="report-description">{metadata.description}</p>
              )}
            </header>

            {/* Report Sections */}
            {enabledSections.map((section) => (
              <section key={section.id} className={`report-section section-${section.id}`}>
                {section.id === 'summary' && (
                  <>
                    <h2>Executive Summary</h2>
                    <div className="summary-content">
                      {analyticsData ? (
                        <>
                          <div className="summary-grid">
                            <div className="summary-card">
                              <h3>Model Performance</h3>
                              {getBestModel() && (
                                <>
                                  <p className="metric">Accuracy: {(getBestModel()!.accuracy * 100).toFixed(1)}%</p>
                                  <p className="metric">F1 Score: {(getBestModel()!.f1Score * 100).toFixed(1)}%</p>
                                </>
                              )}
                            </div>
                            <div className="summary-card">
                              <h3>Dataset Info</h3>
                              <p>{analyticsData.modelInfo?.datasetSize?.toLocaleString() || 'N/A'} samples</p>
                              <p>Model: {analyticsData.modelInfo?.type || 'N/A'}</p>
                            </div>
                            <div className="summary-card">
                              <h3>Key Insights</h3>
                              <ul>
                                {getKeyInsights().map((insight, index) => (
                                  <li key={index}>{insight}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="no-data">No analytics data available. Run model training to generate content.</p>
                      )}
                    </div>
                  </>
                )}

                {section.id === 'data_overview' && (
                  <>
                    <h2>Data Overview</h2>
                    <div className="data-overview-content">
                      {analyticsData ? (
                        <div className="data-stats">
                          <table className="stats-table">
                            <tbody>
                              <tr><td>Total Samples</td><td>{analyticsData.modelInfo?.datasetSize?.toLocaleString() || 'N/A'}</td></tr>
                              <tr><td>Model Type</td><td>{analyticsData.modelInfo?.type || 'N/A'}</td></tr>
                              <tr><td>Training Time</td><td>{analyticsData.modelInfo?.trainingTime ? `${analyticsData.modelInfo.trainingTime}s` : 'N/A'}</td></tr>
                              <tr><td>Created</td><td>{analyticsData.modelInfo?.createdAt ? new Date(analyticsData.modelInfo.createdAt).toLocaleDateString() : 'N/A'}</td></tr>
                            </tbody>
                          </table>
                          {configuration.includeCharts && (
                            <div className="chart-placeholder">
                              <p><em>Data distribution charts will be included in the final report</em></p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="no-data">Data overview will be generated from analytics data.</p>
                      )}
                    </div>
                  </>
                )}

                {section.id === 'model_performance' && (
                  <>
                    <h2>Model Performance Analysis</h2>
                    <div className="performance-content">
                      {analyticsData?.modelPerformance ? (
                        <div className="performance-metrics">
                          <div className="metrics-grid">
                            <div className="metric-card">
                              <span className="metric-label">Accuracy</span>
                              <span className="metric-value">{(analyticsData.modelPerformance.accuracy * 100).toFixed(2)}%</span>
                            </div>
                            <div className="metric-card">
                              <span className="metric-label">Precision</span>
                              <span className="metric-value">{(analyticsData.modelPerformance.precision * 100).toFixed(2)}%</span>
                            </div>
                            <div className="metric-card">
                              <span className="metric-label">Recall</span>
                              <span className="metric-value">{(analyticsData.modelPerformance.recall * 100).toFixed(2)}%</span>
                            </div>
                            <div className="metric-card">
                              <span className="metric-label">F1 Score</span>
                              <span className="metric-value">{(analyticsData.modelPerformance.f1Score * 100).toFixed(2)}%</span>
                            </div>
                          </div>
                          {configuration.includeCharts && (
                            <div className="chart-placeholder">
                              <p><em>Performance charts (ROC curves, confusion matrix) will be included</em></p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="no-data">Model performance metrics will be displayed here.</p>
                      )}
                    </div>
                  </>
                )}

                {section.id === 'features' && (
                  <>
                    <h2>Feature Importance Analysis</h2>
                    <div className="features-content">
                      {analyticsData?.featureImportance?.features ? (
                        <div className="feature-importance">
                          <h3>Top Features</h3>
                          <div className="feature-list">
                            {analyticsData.featureImportance.features.slice(0, 10).map((feature, index) => (
                              <div key={feature.name} className="feature-item">
                                <span className="feature-rank">#{index + 1}</span>
                                <span className="feature-name">{feature.name}</span>
                                <div className="feature-bar">
                                  <div 
                                    className="feature-bar-fill" 
                                    style={{ width: `${feature.importance * 100}%` }}
                                  />
                                </div>
                                <span className="feature-importance">{(feature.importance * 100).toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="no-data">Feature importance analysis will be displayed here.</p>
                      )}
                    </div>
                  </>
                )}

                {section.id === 'recommendations' && (
                  <>
                    <h2>Recommendations</h2>
                    <div className="recommendations-content">
                      <div className="recommendation-item">
                        <h3>Model Performance</h3>
                        <p>Based on the current model performance, consider the following improvements:</p>
                        <ul>
                          <li>Collect additional training data to improve model generalization</li>
                          <li>Experiment with feature engineering techniques</li>
                          <li>Try ensemble methods to boost performance</li>
                        </ul>
                      </div>
                      <div className="recommendation-item">
                        <h3>Data Quality</h3>
                        <p>Enhance data quality through:</p>
                        <ul>
                          <li>Regular data validation and cleaning processes</li>
                          <li>Monitoring for data drift over time</li>
                          <li>Implementing automated quality checks</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {section.id === 'technical_details' && (
                  <>
                    <h2>Technical Details</h2>
                    <div className="technical-content">
                      {analyticsData?.modelInfo ? (
                        <div className="technical-info">
                          <h3>Model Configuration</h3>
                          <pre className="config-display">
                            {JSON.stringify(analyticsData.modelInfo.configuration, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <p className="no-data">Technical details will be included in the final report.</p>
                      )}
                    </div>
                  </>
                )}
              </section>
            ))}

            {/* Report Footer */}
            <footer className="report-footer">
              <p>Generated by PRISM Data Science Platform</p>
              <p>© {new Date().getFullYear()} PRISM Technologies</p>
            </footer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReportPreview;