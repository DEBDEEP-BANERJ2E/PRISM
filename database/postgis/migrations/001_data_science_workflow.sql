-- Data Science Workflow Database Schema
-- Migration: 001_data_science_workflow.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Datasets table for storing raw and processed data
CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    raw_data JSONB NOT NULL,
    processed_data JSONB,
    preprocessing_config JSONB,
    preprocessing_statistics JSONB,
    quality_score DECIMAL(3,2),
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- Reference to user when user management is implemented
    
    -- Indexes for performance
    CONSTRAINT datasets_name_check CHECK (LENGTH(name) > 0),
    CONSTRAINT datasets_quality_score_check CHECK (quality_score >= 0 AND quality_score <= 1)
);

-- Create indexes for datasets
CREATE INDEX IF NOT EXISTS idx_datasets_status ON datasets(status);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON datasets(created_at);
CREATE INDEX IF NOT EXISTS idx_datasets_created_by ON datasets(created_by);

-- Trained models table
CREATE TABLE IF NOT EXISTS trained_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    name VARCHAR(255),
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('random_forest', 'xgboost', 'neural_network', 'ensemble')),
    configuration JSONB NOT NULL,
    training_metrics JSONB NOT NULL,
    validation_metrics JSONB NOT NULL,
    test_metrics JSONB,
    feature_importance JSONB,
    model_path VARCHAR(500),
    config_path VARCHAR(500),
    metrics_path VARCHAR(500),
    training_time_seconds INTEGER,
    status VARCHAR(50) DEFAULT 'training' CHECK (status IN ('queued', 'training', 'validating', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT trained_models_name_check CHECK (name IS NULL OR LENGTH(name) > 0),
    CONSTRAINT trained_models_training_time_check CHECK (training_time_seconds >= 0)
);

-- Create indexes for trained_models
CREATE INDEX IF NOT EXISTS idx_trained_models_dataset_id ON trained_models(dataset_id);
CREATE INDEX IF NOT EXISTS idx_trained_models_model_type ON trained_models(model_type);
CREATE INDEX IF NOT EXISTS idx_trained_models_status ON trained_models(status);
CREATE INDEX IF NOT EXISTS idx_trained_models_created_at ON trained_models(created_at);

-- Scenarios table for scenario planning
CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    model_id UUID NOT NULL REFERENCES trained_models(id) ON DELETE CASCADE,
    parameters JSONB NOT NULL,
    conditions JSONB NOT NULL,
    results JSONB,
    status VARCHAR(50) DEFAULT 'created' CHECK (status IN ('created', 'running', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT scenarios_name_check CHECK (LENGTH(name) > 0)
);

-- Create indexes for scenarios
CREATE INDEX IF NOT EXISTS idx_scenarios_model_id ON scenarios(model_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status);
CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON scenarios(created_at);
CREATE INDEX IF NOT EXISTS idx_scenarios_name ON scenarios(name);

-- Reports table for generated reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB NOT NULL,
    configuration JSONB NOT NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'html', 'docx')),
    file_path VARCHAR(500),
    file_size INTEGER,
    status VARCHAR(50) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    
    -- Related entities (can be null for cross-entity reports)
    dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
    model_id UUID REFERENCES trained_models(id) ON DELETE SET NULL,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT reports_title_check CHECK (LENGTH(title) > 0),
    CONSTRAINT reports_file_size_check CHECK (file_size IS NULL OR file_size >= 0)
);

-- Create indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_dataset_id ON reports(dataset_id);
CREATE INDEX IF NOT EXISTS idx_reports_model_id ON reports(model_id);
CREATE INDEX IF NOT EXISTS idx_reports_scenario_id ON reports(scenario_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_format ON reports(format);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Job queue table for tracking long-running operations
CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(100) NOT NULL CHECK (job_type IN ('data_preprocessing', 'model_training', 'scenario_execution', 'report_generation')),
    entity_id UUID NOT NULL, -- ID of the related entity (dataset, model, scenario, report)
    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    message TEXT,
    result JSONB,
    error_details TEXT,
    estimated_duration_seconds INTEGER,
    actual_duration_seconds INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Create indexes for job_queue
CREATE INDEX IF NOT EXISTS idx_job_queue_job_type ON job_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_job_queue_entity_id ON job_queue(entity_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_created_at ON job_queue(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trained_models_updated_at BEFORE UPDATE ON trained_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE datasets IS 'Stores raw and processed datasets for machine learning workflows';
COMMENT ON TABLE trained_models IS 'Stores trained machine learning models and their metadata';
COMMENT ON TABLE scenarios IS 'Stores scenario planning configurations and results';
COMMENT ON TABLE reports IS 'Stores generated reports in various formats';
COMMENT ON TABLE job_queue IS 'Tracks long-running asynchronous operations';

COMMENT ON COLUMN datasets.quality_score IS 'Data quality score from 0.0 to 1.0';
COMMENT ON COLUMN trained_models.training_time_seconds IS 'Total training time in seconds';
COMMENT ON COLUMN job_queue.progress IS 'Job completion progress from 0 to 100';