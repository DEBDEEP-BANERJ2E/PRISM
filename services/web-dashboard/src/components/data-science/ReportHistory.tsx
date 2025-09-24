import React, { useState } from 'react';
import { Card } from '../common/Card';
import { ReportHistoryItem } from '../../types/dataScience';

interface ReportHistoryProps {
  reports: ReportHistoryItem[];
  onDownload: (reportId: string) => void;
  onRefresh: () => void;
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({
  reports,
  onDownload,
  onRefresh
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed'>('all');

  const handleSort = (field: 'date' | 'title' | 'size') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedReports = reports
    .filter(report => filterStatus === 'all' || report.status === filterStatus)
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="report-history">
      <div className="history-header">
        <h2>Report History</h2>
        <p>View and download previously generated reports.</p>
      </div>

      <Card className="history-controls">
        <div className="controls-row">
          <div className="filter-controls">
            <label>Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'failed')}
            >
              <option value="all">All Reports</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="sort-controls">
            <label>Sort by:</label>
            <button
              className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`}
              onClick={() => handleSort('date')}
            >
              Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              className={`sort-btn ${sortBy === 'title' ? 'active' : ''}`}
              onClick={() => handleSort('title')}
            >
              Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              className={`sort-btn ${sortBy === 'size' ? 'active' : ''}`}
              onClick={() => handleSort('size')}
            >
              Size {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>

          <button className="btn btn-secondary" onClick={onRefresh}>
            🔄 Refresh
          </button>
        </div>
      </Card>

      {filteredAndSortedReports.length === 0 ? (
        <Card className="empty-state">
          <div className="empty-content">
            <div className="empty-icon">📄</div>
            <h3>No Reports Found</h3>
            <p>
              {reports.length === 0
                ? "You haven't generated any reports yet. Create your first report from the Export tab."
                : "No reports match your current filter criteria."
              }
            </p>
          </div>
        </Card>
      ) : (
        <Card className="reports-table">
          <div className="table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Report Title</th>
                  <th>Format</th>
                  <th>Status</th>
                  <th>Size</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedReports.map((report) => (
                  <tr key={report.id} className={`report-row status-${report.status}`}>
                    <td className="report-title">
                      <div className="title-cell">
                        <span className="title-text">{report.title}</span>
                        <span className="report-id">ID: {report.id.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="report-format">
                      <span className={`format-badge format-${report.format.toLowerCase()}`}>
                        {report.format.toUpperCase()}
                      </span>
                    </td>
                    <td className="report-status">
                      <span className={`status-badge status-${report.status}`}>
                        {report.status === 'completed' && '✅'}
                        {report.status === 'failed' && '❌'}
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                    </td>
                    <td className="report-size">
                      {formatFileSize(report.size)}
                    </td>
                    <td className="report-date">
                      {formatDate(report.createdAt)}
                    </td>
                    <td className="report-actions">
                      {report.status === 'completed' && report.downloadUrl ? (
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => onDownload(report.id)}
                          title="Download Report"
                        >
                          📥 Download
                        </button>
                      ) : (
                        <span className="action-disabled">
                          {report.status === 'failed' ? 'Failed' : 'Processing'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="history-stats">
        <h3>Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Total Reports:</span>
            <span className="stat-value">{reports.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Completed:</span>
            <span className="stat-value">{reports.filter(r => r.status === 'completed').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Failed:</span>
            <span className="stat-value">{reports.filter(r => r.status === 'failed').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Size:</span>
            <span className="stat-value">
              {formatFileSize(reports.reduce((total, report) => total + report.size, 0))}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReportHistory;