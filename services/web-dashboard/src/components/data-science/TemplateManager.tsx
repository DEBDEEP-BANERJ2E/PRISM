import React, { useState } from 'react';
import { Card } from '../common/Card';
import { ReportTemplate } from '../../types/dataScience';

interface TemplateManagerProps {
  templates: ReportTemplate[];
  currentTemplate?: string;
  onTemplateSelect: (template: ReportTemplate) => void;
  onRefresh: () => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  currentTemplate,
  onTemplateSelect,
  onRefresh
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    sections: [] as string[]
  });

  const availableSections = [
    { id: 'summary', name: 'Executive Summary', description: 'High-level overview and key findings' },
    { id: 'data_overview', name: 'Data Overview', description: 'Dataset statistics and quality metrics' },
    { id: 'model_performance', name: 'Model Performance', description: 'Training results and validation metrics' },
    { id: 'features', name: 'Feature Analysis', description: 'Feature importance and correlations' },
    { id: 'recommendations', name: 'Recommendations', description: 'Actionable insights and next steps' },
    { id: 'technical_details', name: 'Technical Details', description: 'Detailed configuration and parameters' }
  ];

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || newTemplate.sections.length === 0) {
      alert('Please provide a template name and select at least one section.');
      return;
    }

    try {
      // This would call the API to create a new template
      console.log('Creating template:', newTemplate);
      
      // Reset form
      setNewTemplate({ name: '', description: '', sections: [] });
      setShowCreateForm(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('Failed to create template. Please try again.');
    }
  };

  const handleSectionToggle = (sectionId: string) => {
    setNewTemplate(prev => ({
      ...prev,
      sections: prev.sections.includes(sectionId)
        ? prev.sections.filter(id => id !== sectionId)
        : [...prev.sections, sectionId]
    }));
  };

  const getSectionName = (sectionId: string): string => {
    const section = availableSections.find(s => s.id === sectionId);
    return section?.name || sectionId;
  };

  return (
    <div className="template-manager">
      <div className="manager-header">
        <h2>Report Templates</h2>
        <p>Choose from predefined templates or create your own custom template.</p>
      </div>

      <div className="template-actions">
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Create Template'}
        </button>
        <button className="btn btn-secondary" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      {showCreateForm && (
        <Card className="create-template-form">
          <h3>Create New Template</h3>
          <div className="form-content">
            <div className="form-group">
              <label htmlFor="template-name">Template Name</label>
              <input
                id="template-name"
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="template-description">Description</label>
              <textarea
                id="template-description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when to use this template"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Sections to Include</label>
              <div className="sections-checklist">
                {availableSections.map(section => (
                  <label key={section.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newTemplate.sections.includes(section.id)}
                      onChange={() => handleSectionToggle(section.id)}
                    />
                    <span className="checkmark"></span>
                    <div className="section-info">
                      <span className="section-name">{section.name}</span>
                      <span className="section-description">{section.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name.trim() || newTemplate.sections.length === 0}
              >
                Create Template
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="templates-grid">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`template-card ${currentTemplate === template.id ? 'selected' : ''}`}
            onClick={() => onTemplateSelect(template)}
          >
            <div className="template-header">
              <h3>{template.name}</h3>
              {currentTemplate === template.id && (
                <span className="selected-badge">✓ Selected</span>
              )}
            </div>
            
            <p className="template-description">{template.description}</p>
            
            <div className="template-sections">
              <h4>Included Sections:</h4>
              <ul className="sections-list">
                {template.sections.map((sectionId) => (
                  <li key={sectionId} className="section-item">
                    {getSectionName(sectionId)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="template-meta">
              <div className="meta-item">
                <span className="meta-label">Sections:</span>
                <span className="meta-value">{template.sections.length}</span>
              </div>
              {template.createdAt && (
                <div className="meta-item">
                  <span className="meta-label">Created:</span>
                  <span className="meta-value">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="template-actions">
              <button
                className={`btn ${currentTemplate === template.id ? 'btn-secondary' : 'btn-primary'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTemplateSelect(template);
                }}
              >
                {currentTemplate === template.id ? 'Selected' : 'Use Template'}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card className="empty-state">
          <div className="empty-content">
            <div className="empty-icon">📋</div>
            <h3>No Templates Available</h3>
            <p>Create your first custom template to get started.</p>
          </div>
        </Card>
      )}

      <Card className="template-tips">
        <h3>Template Tips</h3>
        <div className="tips-list">
          <div className="tip-item">
            <span className="tip-icon">💡</span>
            <div>
              <strong>Standard Report:</strong> Best for comprehensive analysis with all sections included.
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">👔</span>
            <div>
              <strong>Executive Summary:</strong> Perfect for stakeholder presentations and high-level overviews.
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🔧</span>
            <div>
              <strong>Technical Report:</strong> Ideal for data scientists and technical teams who need detailed analysis.
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🎨</span>
            <div>
              <strong>Custom Templates:</strong> Create templates tailored to your specific reporting needs and audience.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TemplateManager;