import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import {
  AnalyticsData,
  ReportConfiguration,
  ReportMetadata,
  ReportStatus,
  ReportTemplate,
  ReportHistory,
  ReportFile,
  ModelMetrics
} from '../types/reports';

export class ReportService {
  private generationJobs: Map<string, ReportStatus> = new Map();
  private reportsDir = path.join(process.cwd(), 'reports');

  constructor() {
    this.ensureReportsDirectory();
  }

  private async ensureReportsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create reports directory:', error);
    }
  }

  async generateReport(
    reportId: string,
    analyticsData: AnalyticsData,
    configuration: ReportConfiguration,
    metadata: ReportMetadata
  ): Promise<void> {
    // Initialize job status
    this.generationJobs.set(reportId, {
      status: 'generating',
      progress: 0,
      startedAt: new Date(),
      reportId
    });

    try {
      // Generate HTML content
      this.updateProgress(reportId, 20);
      const htmlContent = await this.generateHTMLContent(analyticsData, configuration, metadata);

      // Generate PDF if requested
      if (configuration.format === 'pdf') {
        this.updateProgress(reportId, 60);
        const pdfBuffer = await this.generatePDF(htmlContent, reportId);
        await this.saveReportFile(reportId, pdfBuffer, 'pdf');
      } else if (configuration.format === 'html') {
        await this.saveReportFile(reportId, Buffer.from(htmlContent), 'html');
      }

      // Save to database
      this.updateProgress(reportId, 90);
      await this.saveReportToDatabase(reportId, analyticsData, configuration, metadata);

      // Mark as completed
      this.updateProgress(reportId, 100);
      this.generationJobs.set(reportId, {
        ...this.generationJobs.get(reportId)!,
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        downloadUrl: `/api/reports/${reportId}/download`
      });

    } catch (error) {
      logger.error(`Report generation failed for ${reportId}:`, error);
      this.generationJobs.set(reportId, {
        ...this.generationJobs.get(reportId)!,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private updateProgress(reportId: string, progress: number): void {
    const job = this.generationJobs.get(reportId);
    if (job) {
      this.generationJobs.set(reportId, { ...job, progress });
    }
  }

  private async generateHTMLContent(
    analyticsData: AnalyticsData,
    configuration: ReportConfiguration,
    metadata: ReportMetadata
  ): Promise<string> {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.title || 'Data Science Report'}</title>
    <style>
        ${this.getReportStyles()}
    </style>
</head>
<body>
    <div class="report-container">
        ${this.generateReportHeader(metadata)}
        ${this.generateExecutiveSummary(analyticsData)}
        ${this.generateDataOverview(analyticsData)}
        ${this.generateModelPerformance(analyticsData)}
        ${this.generateFeatureAnalysis(analyticsData)}
        ${this.generateRecommendations(analyticsData)}
        ${this.generateAppendix(analyticsData, configuration)}
        ${this.generateFooter(metadata)}
    </div>
</body>
</html>`;
  }

  private generateReportHeader(metadata: ReportMetadata): string {
    return `
<header class="report-header">
    <h1>${metadata.title || 'Data Science Analysis Report'}</h1>
    <div class="report-meta">
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Author:</strong> ${metadata.author || 'PRISM System'}</p>
        <p><strong>Version:</strong> ${metadata.version || '1.0'}</p>
    </div>
</header>`;
  }

  private generateExecutiveSummary(analyticsData: AnalyticsData): string {
    const bestModel = this.getBestPerformingModel(analyticsData.modelPerformance);
    
    return `
<section class="executive-summary">
    <h2>Executive Summary</h2>
    <div class="summary-grid">
        <div class="summary-card">
            <h3>Best Model</h3>
            <p>${bestModel?.modelType || 'N/A'}</p>
            <p class="metric">Accuracy: ${bestModel ? (bestModel.accuracy * 100).toFixed(1) : 'N/A'}%</p>
        </div>
        <div class="summary-card">
            <h3>Dataset Size</h3>
            <p>${analyticsData.datasetInfo?.totalSamples || 0} samples</p>
            <p>${analyticsData.datasetInfo?.featureCount || 0} features</p>
        </div>
        <div class="summary-card">
            <h3>Key Insights</h3>
            <ul>
                ${this.generateKeyInsights(analyticsData).map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        </div>
    </div>
</section>`;
  }

  private generateDataOverview(analyticsData: AnalyticsData): string {
    return `
<section class="data-overview">
    <h2>Data Overview</h2>
    <div class="data-stats">
        <table class="stats-table">
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total Samples</td><td>${analyticsData.datasetInfo?.totalSamples || 0}</td></tr>
            <tr><td>Features</td><td>${analyticsData.datasetInfo?.featureCount || 0}</td></tr>
            <tr><td>Missing Values</td><td>${analyticsData.datasetInfo?.missingValues || 0}</td></tr>
            <tr><td>Data Quality Score</td><td>${analyticsData.datasetInfo?.qualityScore ? (analyticsData.datasetInfo.qualityScore * 100).toFixed(1) : 'N/A'}%</td></tr>
        </table>
    </div>
    ${this.generateDataDistributionCharts(analyticsData)}
</section>`;
  }

  private generateModelPerformance(analyticsData: AnalyticsData): string {
    const models = Array.isArray(analyticsData.modelPerformance) ? analyticsData.modelPerformance : [analyticsData.modelPerformance];
    
    return `
<section class="model-performance">
    <h2>Model Performance Analysis</h2>
    <div class="performance-grid">
        ${models.map((model: ModelMetrics) => `
            <div class="model-card">
                <h3>${model.modelType}</h3>
                <div class="metrics">
                    <div class="metric">
                        <span class="label">Accuracy:</span>
                        <span class="value">${(model.accuracy * 100).toFixed(2)}%</span>
                    </div>
                    <div class="metric">
                        <span class="label">Precision:</span>
                        <span class="value">${(model.precision * 100).toFixed(2)}%</span>
                    </div>
                    <div class="metric">
                        <span class="label">Recall:</span>
                        <span class="value">${(model.recall * 100).toFixed(2)}%</span>
                    </div>
                    <div class="metric">
                        <span class="label">F1 Score:</span>
                        <span class="value">${(model.f1Score * 100).toFixed(2)}%</span>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>
</section>`;
  }

  private generateFeatureAnalysis(analyticsData: AnalyticsData): string {
    let topFeatures: [string, number][] = [];
    
    if (analyticsData.featureImportance && typeof analyticsData.featureImportance === 'object') {
      topFeatures = Object.entries(analyticsData.featureImportance)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10) as [string, number][];
    }

    return `
<section class="feature-analysis">
    <h2>Feature Importance Analysis</h2>
    <div class="feature-importance">
        <h3>Top 10 Most Important Features</h3>
        <div class="feature-bars">
            ${topFeatures.map(([feature, importance]) => `
                <div class="feature-bar">
                    <span class="feature-name">${feature}</span>
                    <div class="bar-container">
                        <div class="bar" style="width: ${(importance as number) * 100}%"></div>
                        <span class="importance-value">${((importance as number) * 100).toFixed(1)}%</span>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</section>`;
  }

  private generateRecommendations(analyticsData: AnalyticsData): string {
    const recommendations = this.generateModelRecommendations(analyticsData);
    
    return `
<section class="recommendations">
    <h2>Recommendations</h2>
    <div class="recommendations-list">
        ${recommendations.map((rec, index) => `
            <div class="recommendation">
                <h3>${index + 1}. ${rec.title}</h3>
                <p>${rec.description}</p>
                <div class="priority priority-${rec.priority}">${rec.priority.toUpperCase()}</div>
            </div>
        `).join('')}
    </div>
</section>`;
  }

  private generateAppendix(analyticsData: AnalyticsData, configuration: ReportConfiguration): string {
    return `
<section class="appendix">
    <h2>Appendix</h2>
    <h3>Technical Details</h3>
    <div class="technical-details">
        <h4>Model Configuration</h4>
        <pre>${JSON.stringify(configuration, null, 2)}</pre>
        
        <h4>Performance Metrics</h4>
        <pre>${JSON.stringify(analyticsData.modelPerformance, null, 2)}</pre>
    </div>
</section>`;
  }

  private generateFooter(metadata: ReportMetadata): string {
    return `
<footer class="report-footer">
    <p>Generated by PRISM Data Science Platform</p>
    <p>Report ID: ${metadata.reportId || 'N/A'}</p>
    <p>© ${new Date().getFullYear()} PRISM Technologies</p>
</footer>`;
  }

  private getReportStyles(): string {
    return `
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; }
        .report-container { max-width: 1200px; margin: 0 auto; }
        .report-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .report-header h1 { color: #2c3e50; margin-bottom: 10px; }
        .report-meta { display: flex; justify-content: center; gap: 30px; }
        .report-meta p { margin: 5px 0; color: #666; }
        
        section { margin-bottom: 40px; }
        h2 { color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        h3 { color: #34495e; }
        
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; }
        .summary-card h3 { margin-top: 0; color: #2c3e50; }
        .metric { font-size: 1.2em; font-weight: bold; color: #27ae60; }
        
        .stats-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .stats-table th, .stats-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .stats-table th { background-color: #f2f2f2; font-weight: bold; }
        
        .performance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .model-card { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
        .model-card h3 { margin-top: 0; color: #2c3e50; }
        .metrics .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .metrics .label { color: #666; }
        .metrics .value { font-weight: bold; color: #2c3e50; }
        
        .feature-bars { margin-top: 20px; }
        .feature-bar { display: flex; align-items: center; margin: 10px 0; }
        .feature-name { width: 200px; font-size: 0.9em; }
        .bar-container { flex: 1; display: flex; align-items: center; margin-left: 10px; }
        .bar { height: 20px; background: linear-gradient(90deg, #3498db, #2980b9); border-radius: 10px; }
        .importance-value { margin-left: 10px; font-size: 0.8em; color: #666; }
        
        .recommendations-list { margin-top: 20px; }
        .recommendation { background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 8px; position: relative; }
        .recommendation h3 { margin-top: 0; color: #2c3e50; }
        .priority { position: absolute; top: 15px; right: 15px; padding: 5px 10px; border-radius: 15px; font-size: 0.8em; font-weight: bold; }
        .priority-high { background: #e74c3c; color: white; }
        .priority-medium { background: #f39c12; color: white; }
        .priority-low { background: #27ae60; color: white; }
        
        .technical-details pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 0.9em; }
        
        .report-footer { text-align: center; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px; color: #666; }
        
        @media print {
            body { margin: 0; }
            .report-container { max-width: none; }
            section { page-break-inside: avoid; }
        }
    `;
  }

  private async generatePDF(htmlContent: string, _reportId: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private async saveReportFile(reportId: string, buffer: Buffer, format: string): Promise<void> {
    const filename = `report_${reportId}.${format}`;
    const filepath = path.join(this.reportsDir, filename);
    await fs.writeFile(filepath, buffer);
  }

  private async saveReportToDatabase(
    reportId: string,
    _analyticsData: AnalyticsData,
    _configuration: ReportConfiguration,
    _metadata: ReportMetadata
  ): Promise<void> {
    // This would save to the database - implementation depends on your DB setup
    logger.info(`Report ${reportId} saved to database`);
  }

  async getGenerationStatus(reportId: string): Promise<ReportStatus | null> {
    return this.generationJobs.get(reportId) || null;
  }

  async getReportFile(reportId: string): Promise<ReportFile | null> {
    try {
      const job = this.generationJobs.get(reportId);
      if (!job || job.status !== 'completed') {
        return null;
      }

      const filename = `report_${reportId}.pdf`;
      const filepath = path.join(this.reportsDir, filename);
      const buffer = await fs.readFile(filepath);

      return {
        filename,
        buffer,
        mimeType: 'application/pdf'
      };
    } catch (error) {
      logger.error(`Failed to get report file ${reportId}:`, error);
      return null;
    }
  }

  estimateGenerationTime(analyticsData: AnalyticsData, configuration: ReportConfiguration): number {
    // Base time in seconds
    let estimatedTime = 30;
    
    // Add time based on data size
    if (Array.isArray(analyticsData.modelPerformance) && analyticsData.modelPerformance.length > 5) {
      estimatedTime += 15;
    }
    
    // Add time for PDF generation
    if (configuration.format === 'pdf') {
      estimatedTime += 20;
    }
    
    // Add time for charts
    if (configuration.includeCharts) {
      estimatedTime += 25;
    }

    return estimatedTime;
  }

  async getReportHistory(page: number = 1, limit: number = 10): Promise<ReportHistory> {
    // This would query the database for report history
    return {
      reports: [],
      total: 0,
      page,
      limit,
      totalPages: 0
    };
  }

  async getReportTemplates(): Promise<ReportTemplate[]> {
    return [
      {
        id: 'default',
        name: 'Standard Report',
        description: 'Comprehensive analysis report with all sections',
        sections: ['summary', 'data_overview', 'model_performance', 'features', 'recommendations']
      },
      {
        id: 'executive',
        name: 'Executive Summary',
        description: 'High-level overview for stakeholders',
        sections: ['summary', 'model_performance', 'recommendations']
      },
      {
        id: 'technical',
        name: 'Technical Report',
        description: 'Detailed technical analysis for data scientists',
        sections: ['data_overview', 'model_performance', 'features', 'technical_details']
      }
    ];
  }

  async createTemplate(templateData: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const template: ReportTemplate = {
      id: randomUUID(),
      name: templateData.name || 'Custom Template',
      description: templateData.description || '',
      sections: templateData.sections || ['summary'],
      createdAt: new Date()
    };

    // Save to database
    return template;
  }

  private getBestPerformingModel(modelPerformance: ModelMetrics | ModelMetrics[]): ModelMetrics | null {
    if (!modelPerformance) return null;
    
    if (Array.isArray(modelPerformance)) {
      if (modelPerformance.length === 0) return null;
      return modelPerformance.reduce((best, current) => 
        current.accuracy > best.accuracy ? current : best
      );
    }
    
    return modelPerformance;
  }

  private generateKeyInsights(analyticsData: AnalyticsData): string[] {
    const insights: string[] = [];
    
    const bestModel = this.getBestPerformingModel(analyticsData.modelPerformance);
    if (bestModel) {
      insights.push(`Model accuracy: ${(bestModel.accuracy * 100).toFixed(1)}%`);
    }

    if (analyticsData.featureImportance && typeof analyticsData.featureImportance === 'object') {
      const topFeature = Object.entries(analyticsData.featureImportance)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0];
      if (topFeature) {
        insights.push(`Most important feature: ${topFeature[0]} (${((topFeature[1] as number) * 100).toFixed(1)}% importance)`);
      }
    }

    if (analyticsData.datasetInfo?.qualityScore) {
      insights.push(`Data quality score: ${(analyticsData.datasetInfo.qualityScore * 100).toFixed(1)}%`);
    }

    return insights;
  }

  private generateDataDistributionCharts(_analyticsData: AnalyticsData): string {
    // This would generate chart HTML - simplified for now
    return `
    <div class="chart-placeholder">
      <p><em>Data distribution charts would be rendered here</em></p>
    </div>`;
  }

  private generateModelRecommendations(analyticsData: AnalyticsData): Array<{title: string, description: string, priority: string}> {
    const recommendations = [];
    
    const bestModel = this.getBestPerformingModel(analyticsData.modelPerformance);
    if (bestModel && bestModel.accuracy < 0.8) {
      recommendations.push({
        title: 'Improve Model Performance',
        description: 'Current model accuracy is below 80%. Consider feature engineering, hyperparameter tuning, or trying different algorithms.',
        priority: 'high'
      });
    }
    
    if (analyticsData.datasetInfo?.qualityScore && analyticsData.datasetInfo.qualityScore < 0.7) {
      recommendations.push({
        title: 'Enhance Data Quality',
        description: 'Data quality score is below 70%. Focus on data cleaning, handling missing values, and outlier detection.',
        priority: 'high'
      });
    }

    recommendations.push({
      title: 'Monitor Model Performance',
      description: 'Set up regular monitoring to track model performance over time and detect potential drift.',
      priority: 'medium'
    });

    return recommendations;
  }
}