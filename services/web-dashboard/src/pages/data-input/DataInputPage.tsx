import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Card,
  Snackbar,
  Alert,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress
} from '@mui/material';
import {
  Add,
  Delete,
  Upload,
  Download,
  Search,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  DataObject,
  Visibility,
  Close
} from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { tableSyncService } from "../../api/dataScience/TableSyncService";
import { TableData, ColumnDefinition, RowData } from '../../types/dataScience';

const DataInputPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [datasets, setDatasets] = useState<TableData[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<TableData | null>(null);
  const [tableData, setTableData] = useState<TableData>({
    id: '',
    name: '',
    columns: [],
    rows: [],
    length: 0,
    metadata: {
      totalRows: 0,
      totalColumns: 0,
      lastUpdated: new Date(),
      status: "pending"
    }
  });
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'info' | 'success' | 'warning' | 'error' }>({ open: false, message: '', severity: 'info' });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(true);

  // File upload states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[][]>([]);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [datasetName, setDatasetName] = useState('');

  // Load datasets on component mount
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setLoading(true);
        const datasets = await tableSyncService.listDatasets();

        // Transform API response to match expected format
        const transformedDatasets: TableData[] = datasets.map((dataset: any) => ({
          id: dataset.id.toString(),
          name: dataset.title || dataset.name || 'Unnamed Dataset',
          description: dataset.description,
          columns: [],
          rows: [],
          length: 0,
          metadata: {
            totalRows: 0,
            totalColumns: 0,
            lastUpdated: new Date(dataset.updatedAt || dataset.updated_at),
            status: 'completed' as const
          }
        }));

        setDatasets(transformedDatasets);

        if (transformedDatasets.length > 0) {
          setSelectedDataset(transformedDatasets[0]);
        }
      } catch (error) {
        console.error('Error fetching datasets:', error);
        setSnackbar({
          open: true,
          message: `Failed to fetch datasets: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDatasets();
  }, []);

  // Load table data when selected dataset changes
  useEffect(() => {
    const fetchTableData = async () => {
      if (!selectedDataset) return;

      try {
        const data = await tableSyncService.loadTableData(selectedDataset.id);
        setTableData(data);
        setColumns(data.columns);
      } catch (error) {
        console.error('Error fetching table data:', error);
        setSnackbar({
          open: true,
          message: `Failed to fetch table data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    };

    fetchTableData();
  }, [selectedDataset]);

  const handleAddRow = async () => {
    if (!selectedDataset) {
      setSnackbar({
        open: true,
        message: 'Please select a dataset first.',
        severity: 'warning'
      });
      return;
    }

    try {
      const newRow: RowData = {
        id: `new-row-${Date.now()}`,
        rowIndex: tableData.rows.length,
        data: {},
      };

      // Add default values for columns if necessary
      columns.forEach(col => {
        if (col.field !== 'id') {
          newRow.data[col.field] = '';
        }
      });

      // Optimistically update UI
      setTableData(prev => ({
        ...prev,
        rows: [...prev.rows, newRow]
      }));

      // Call API to add row
      await tableSyncService.addRow(selectedDataset.id, newRow);

      setSnackbar({
        open: true,
        message: 'Row added successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error adding row:', error);
      setSnackbar({
        open: true,
        message: `Failed to add row: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
      // Revert UI if API call fails
      setTableData(prev => ({
        ...prev,
        rows: prev.rows.filter(row => row.id !== `new-row-${Date.now()}`)
      }));
    }
  };

  const handleExport = (type: 'csv' | 'json') => {
    if (!selectedDataset || tableData.rows.length === 0) {
      setSnackbar({
        open: true,
        message: 'No data to export.',
        severity: 'warning'
      });
      return;
    }

    try {
      const filename = `${selectedDataset.name}.${type}`;
      let dataStr = '';

      if (type === 'csv') {
        const header = columns.map(col => col.field).join(',');
        const rows = tableData.rows.map(row => columns.map(col => row.data[col.field] || '').join(',')).join('\n');
        dataStr = `${header}\n${rows}`;
      } else if (type === 'json') {
        dataStr = JSON.stringify(tableData.rows.map(row => row.data), null, 2);
      }

      const blob = new Blob([dataStr], { type: type === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setSnackbar({
        open: true,
        message: `Data exported as ${filename} successfully!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      setSnackbar({
        open: true,
        message: `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleStartPreprocessing = async () => {
    if (!selectedDataset) return;

    setIsProcessing(true);

    try {
      console.log('Starting preprocessing for dataset:', selectedDataset.id);
      console.log('Data rows:', tableData.rows.length);

      // Simulate preprocessing
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSnackbar({
        open: true,
        message: 'Data preprocessing completed successfully!',
        severity: 'success'
      });

      // Navigate to next step
      navigate('/app/model-config');
    } catch (error) {
      console.error('Preprocessing error:', error);
      setSnackbar({
        open: true,
        message: `Preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRows = async () => {
    if (!selectedDataset) {
      setSnackbar({
        open: true,
        message: 'Please select a dataset first.',
        severity: 'warning'
      });
      return;
    }

    if (selectedRows.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select rows to delete.',
        severity: 'warning'
      });
      return;
    }

    try {
      // Optimistically update UI
      setTableData(prev => ({
        ...prev,
        rows: prev.rows.filter(row => !selectedRows.includes(row.id))
      }));

      // Call API to delete rows
      await tableSyncService.deleteRows(selectedDataset.id, selectedRows);

      setSnackbar({
        open: true,
        message: 'Rows deleted successfully!',
        severity: 'success'
      });
      setSelectedRows([]);
    } catch (error) {
      console.error('Error deleting rows:', error);
      setSnackbar({
        open: true,
        message: `Failed to delete rows: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
      // Revert UI if API call fails
      const data = await tableSyncService.loadTableData(selectedDataset.id);
      setTableData(data);
    }
  };

  const handleProcessRowUpdate = async (newRow: RowData): Promise<RowData> => {
    if (!selectedDataset) return newRow;

    try {
      // Find the original row to get the old data
      const originalRow = tableData.rows.find(row => row.id === newRow.id);
      if (!originalRow) {
        throw new Error("Original row not found for update.");
      }

      // Identify changed fields
      const changedFields: { [key: string]: any } = {};
      for (const key in newRow.data) {
        if (newRow.data[key] !== originalRow.data[key]) {
          changedFields[key] = newRow.data[key];
        }
      }

      if (Object.keys(changedFields).length > 0) {
        // Update each changed cell in the database
        for (const columnName in changedFields) {
          await tableSyncService.updateCell(selectedDataset.id, newRow.id, columnName, changedFields[columnName]);
        }
        setSnackbar({
          open: true,
          message: 'Row updated successfully!',
          severity: 'success'
        });
      }

      // Update the local state with the new row
      setTableData(prev => ({ ...prev, rows: prev.rows.map(row => (row.id === newRow.id ? newRow : row)) }));
      return newRow;
    } catch (error) {
      console.error('Error updating row:', error);
      setSnackbar({
        open: true,
        message: `Failed to update row: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
      // Return the original row to revert the UI if the update fails
      return tableData.rows.find(row => row.id === newRow.id) || newRow;
    }
  };

  // File upload functions
  const parseCSV = (text: string): { headers: string[], data: any[][] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
      return values;
    });

    return { headers, data };
  };

  const parseXLSX = async (file: File): Promise<{ headers: string[], data: any[][] }> => {
    // For now, we'll use a simple approach. In production, you'd use a library like xlsx
    // For demo purposes, we'll assume it's a CSV-like structure
    const text = await file.text();
    return parseCSV(text);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsParsingFile(true);

    try {
      let headers: string[] = [];
      let data: any[][] = [];

      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const text = await file.text();
        const result = parseCSV(text);
        headers = result.headers;
        data = result.data;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
        const result = await parseXLSX(file);
        headers = result.headers;
        data = result.data;
      } else {
        throw new Error('Unsupported file type. Please upload CSV or XLSX files only.');
      }

      setParsedHeaders(headers);
      setParsedData(data);
      setDatasetName(file.name.replace(/\.(csv|xlsx)$/, ''));
      setUploadDialogOpen(true);
    } catch (error) {
      console.error('Error parsing file:', error);
      setSnackbar({
        open: true,
        message: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleCreateDatasetFromUpload = async () => {
    if (!uploadedFile || parsedHeaders.length === 0) return;

    setIsProcessing(true);
    try {
      // Create new dataset
      const newDataset = {
        name: datasetName,
        description: `Uploaded from ${uploadedFile.name}`,
        columns: parsedHeaders.map((header, index) => ({
          name: header.toLowerCase().replace(/\s+/g, '_'),
          display_name: header,
          data_type: 'string',
          is_required: false,
          validation_rules: {},
          order_index: index
        })),
        rows: parsedData.map((row, index) => ({
          id: `row-${index}`,
          dataset_id: '', // Will be set by backend
          data: parsedHeaders.reduce((acc, header, colIndex) => {
            acc[header.toLowerCase().replace(/\s+/g, '_')] = row[colIndex] || '';
            return acc;
          }, {} as Record<string, any>),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      };

      // Call API to create dataset
      const response = await fetch('http://localhost:3005/api/datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDataset)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create dataset: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create dataset');
      }

      setSnackbar({
        open: true,
        message: 'Dataset created successfully from uploaded file!',
        severity: 'success'
      });

      setUploadDialogOpen(false);
      setUploadedFile(null);
      setParsedData([]);
      setParsedHeaders([]);
      setDatasetName('');

      // Refresh datasets
      const datasets = await tableSyncService.listDatasets();
      const transformedDatasets: TableData[] = datasets.map((dataset: any) => ({
        id: dataset.id.toString(),
        name: dataset.title || dataset.name || 'Unnamed Dataset',
        description: dataset.description,
        columns: [],
        rows: [],
        length: 0,
        metadata: {
          totalRows: 0,
          totalColumns: 0,
          lastUpdated: new Date(dataset.updatedAt || dataset.updated_at),
          status: 'completed' as const
        }
      }));
      setDatasets(transformedDatasets);

    } catch (error) {
      console.error('Error creating dataset:', error);
      setSnackbar({
        open: true,
        message: `Failed to create dataset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading datasets...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        px: 3,
        py: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Data Input
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Import, view, and edit your datasets
            </Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<Upload />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ mr: 1 }}
            >
              Import File
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleAddRow}
              sx={{ mr: 1 }}
              disabled={!selectedDataset}
            >
              Add Row
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExport('csv')}
              disabled={!selectedDataset || tableData.length === 0}
              sx={{ mr: 1 }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExport('json')}
              disabled={!selectedDataset || tableData.length === 0}
            >
              Export JSON
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        {/* Dataset Selection */}
        <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 2 }}>
                Dataset:
              </Typography>
              {selectedDataset ? (
                <Chip
                  icon={<DataObject />}
                  label={selectedDataset.name}
                  color="primary"
                  onDelete={() => setSelectedDataset(null)}
                />
              ) : (
                <Typography color="text.secondary">No dataset selected</Typography>
              )}
            </Box>
          </Box>
        </Card>

        {/* Table toolbar */}
        {selectedDataset && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Box>
              {selectedRows.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleDeleteRows}
                  sx={{ mr: 1 }}
                >
                  Delete Selected ({selectedRows.length})
                </Button>
              )}
              <Button
                variant="contained"
                color="secondary"
                startIcon={isProcessing ? <CircularProgress size={16} /> : <Visibility />}
                onClick={handleStartPreprocessing}
                disabled={!selectedDataset || tableData.length === 0 || isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Start Preprocessing'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Data table */}
        {selectedDataset && (
          <Box sx={{ height: 500, width: '100%' }}>
            <DataGrid
              rows={tableData.rows}
              columns={columns}
              pageSizeOptions={[10, 25, 50]}
              checkboxSelection
              disableRowSelectionOnClick
              onRowSelectionModelChange={(newSelectionModel) => {
                setSelectedRows(newSelectionModel as string[]);
              }}
              rowSelectionModel={selectedRows}
              processRowUpdate={handleProcessRowUpdate}
              onProcessRowUpdateError={(error) => console.error('Error updating row:', error)}
              slots={{ toolbar: GridToolbar }}
              slotProps={{
                toolbar: {
                  csvOptions: { disableToolbarButton: true },
                  printOptions: { disableToolbarButton: true },
                },
              }}
            />
          </Box>
        )}

        {!selectedDataset && (
          <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <DataObject sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Select a dataset to view and edit data
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a dataset from the list above to start working with your data.
            </Typography>
          </Card>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* File Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !isProcessing && setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Create Dataset from File
          {isParsingFile && <CircularProgress size={20} sx={{ ml: 2 }} />}
        </DialogTitle>
        <DialogContent>
          {isParsingFile ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Parsing file...</Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Dataset Name"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                sx={{ mb: 3 }}
              />

              {parsedHeaders.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Preview ({parsedData.length} rows)
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${parsedHeaders.length}, 1fr)`, gap: 1, mb: 1 }}>
                      {parsedHeaders.map((header, index) => (
                        <Typography key={index} variant="subtitle2" sx={{ fontWeight: 'bold', p: 1, bgcolor: 'grey.100' }}>
                          {header}
                        </Typography>
                      ))}
                    </Box>
                    {parsedData.slice(0, 5).map((row, rowIndex) => (
                      <Box key={rowIndex} sx={{ display: 'grid', gridTemplateColumns: `repeat(${parsedHeaders.length}, 1fr)`, gap: 1, mb: 0.5 }}>
                        {row.map((cell, cellIndex) => (
                          <Typography key={cellIndex} variant="body2" sx={{ p: 1, border: '1px solid', borderColor: 'grey.300' }}>
                            {cell || ''}
                          </Typography>
                        ))}
                      </Box>
                    ))}
                    {parsedData.length > 5 && (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
                        ... and {parsedData.length - 5} more rows
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setUploadDialogOpen(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateDatasetFromUpload}
            variant="contained"
            disabled={isProcessing || !datasetName.trim() || parsedHeaders.length === 0}
          >
            {isProcessing ? <CircularProgress size={20} /> : 'Create Dataset'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataInputPage;