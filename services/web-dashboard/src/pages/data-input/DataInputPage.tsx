import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Card,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Delete,
  Upload,
  Download,
  MoreVert,
  Search,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  DataObject,
  Edit,
  Visibility
} from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import WorkflowGuard from '../../components/workflow/WorkflowGuard';
import { Dataset } from '@/types/dataset';
import { tableSyncService } from "../../api/dataScience/TableSyncService";
import { TableData, ColumnDefinition, RowData } from '../../types/dataScience';
import { GridColDef } from '@mui/x-data-grid';

interface DataInputPageHeaderProps {
  handleAddRow: () => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleExport: (type: 'csv' | 'json') => void;
  selectedDataset: TableData | null;
  tableData: TableData;
}

const DataInputPageHeader: React.FC<DataInputPageHeaderProps> = ({
  handleAddRow,
  fileInputRef,
  handleExport,
  selectedDataset,
  tableData,
}) => (
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
          startIcon={<Upload />}
          onClick={() => fileInputRef.current?.click()}
          sx={{ mr: 1 }}
        >
          Import
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".csv,.json,.xlsx"
          onChange={(e) => {
            // Handle file upload
            console.log('File selected:', e.target.files?.[0]);
          }}
        />
        <Button 
          variant="outlined"
          startIcon={<Download />}
          onClick={() => handleExport('csv')}
          disabled={!selectedDataset || tableData.length === 0}
        >
          Export
        </Button>
      </Box>
    </Box>
  </Box>
);

// Main component implementation
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
  // Explorer effects
  useEffect(() => {
    (async () => {
      try {
        // Use the correct API endpoint
        const res = await fetch('/api/data-science/tables');
        // Check if response is OK before parsing JSON
        if (!res.ok) {
          console.error(`API request failed with status ${res.status}`);
          return;
        }
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error(`Expected JSON response but got ${contentType}`);
          return;
        }
        const json = await res.json();
        if (json.success) setTableNames(json.data as string[]);
      } catch(err) { console.error(err); }
    })();
  }, []);

  const [tableNames, setTableNames] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<GridColDef[]>([]);
  
  useEffect(() => {
    if(!selectedTable) return;
    (async () => {
      try {
        const res = await fetch(`/api/data-science/tables/${selectedTable}`);
        // Check if response is OK before parsing JSON
        if (!res.ok) {
          console.error(`API request failed with status ${res.status}`);
          return;
        }
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error(`Expected JSON response but got ${contentType}`);
          return;
        }
        const json = await res.json();
        if(json.success){
          const rows:any[] = json.data;
          setTableRows(rows.map((r,i)=>({ id:i, ...r })));
          setTableColumns(rows.length? Object.keys(rows[0]).map(k=>({ field:k, headerName:k, flex:1 })) : []);
        }
      } catch(err){ console.error(err); }
    })();
  }, [selectedTable]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Load datasets on component mount
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const datasets = await tableSyncService.listDatasets();
        setDatasets(datasets);
        
        if (datasets.length > 0) {
          setSelectedDataset(datasets[0]);
        }
      } catch (error) {
        console.error('Error fetching datasets:', error);
        setSnackbar({
          open: true,
          message: `Failed to fetch datasets: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    };
    
    fetchDatasets();
  }, []);

  // Load table data when selected dataset changes
  useEffect(() => {
    const fetchTableData = async () => {
      if (!selectedDataset) return;
      
      try {
        const { rows, columns } = await tableSyncService.loadTableData(selectedDataset.id);
        setTableData({ ...selectedDataset, rows, columns });
        setColumns(columns);
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

  // Table event handlers
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    console.log('Table params:', { pagination, filters, sorter });
  };

  const handleCellEdit = (row: any, columnName: string, value: any) => {
    const updatedRows = tableData.rows.map(r =>
      r.id === row.id ? { ...r, data: { ...r.data, [columnName]: value } } : r
    );
    setTableData(prev => ({ ...prev, rows: updatedRows }));
  };

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
          newRow.data[col.field] = ''; // Or some other default value
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

  const handleProcessRowUpdate = useCallback(
    async (newRow: RowData): Promise<RowData> => {
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
        } else {
          setSnackbar({
            open: true,
            message: 'No changes detected for row update.',
            severity: 'info'
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
    },
    [selectedDataset, tableData.rows] // Add tableData.rows to dependencies
  );

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
      if (link.download !== undefined) { // Feature detection for download attribute
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

  // Data preprocessing
  const handleStartPreprocessing = async () => {
    if (!selectedDataset) return;
    
    setIsProcessing(true);
    
    try {
      // Use tableSyncService for preprocessing if needed
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
      navigate('/data-science/feature-engineering');
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
      setSelectedRows([]); // Clear selected rows after deletion
    } catch (error) {
      console.error('Error deleting rows:', error);
      setSnackbar({
        open: true,
        message: `Failed to delete rows: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
      // Revert UI if API call fails (re-fetch data or add deleted rows back)
      // For simplicity, we'll re-fetch the data here. In a real app, you might want a more sophisticated rollback.
      const { rows, columns } = await tableSyncService.loadTableData(selectedDataset.id);
      setTableData({ ...selectedDataset, rows, columns });
    }
  };

  interface DataTableSectionProps {
    selectedDataset: TableData | null;
    tableData: TableData;
    columns: ColumnDefinition[];
    setSelectedRows: (selectionModel: string[]) => void;
    selectedRows: string[];
    handleProcessRowUpdate: (newRow: RowData) => Promise<RowData>;
  }
  
  const DataTableSection: React.FC<DataTableSectionProps> = ({
    selectedDataset,
    tableData,
    columns,
    setSelectedRows,
    selectedRows,
    handleProcessRowUpdate,
  }) => {
    return (
      <>
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
      </>
    );
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <DataInputPageHeader
        handleAddRow={handleAddRow}
        fileInputRef={fileInputRef}
        handleExport={handleExport}
        selectedDataset={selectedDataset}
        tableData={tableData}
      />
      
      {/* Main content */}
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        <DatasetSelectionSection
          datasets={datasets}
          selectedDataset={selectedDataset}
          setSelectedDataset={setSelectedDataset}
          anchorEl={anchorEl}
          setAnchorEl={setAnchorEl}
          handleExport={handleExport}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
        
        {/* Explorer UI */}
        <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6">Database Tables</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {tableNames.map((name) => (
              <Chip
                key={name}
                label={name}
                clickable
                color={selectedTable === name ? 'primary' : 'default'}
                onClick={() => setSelectedTable(name)}
              />
            ))}
          </Box>
        </Card>

        {selectedTable && (
          <Box sx={{ mb: 3, height: 500 }}>
            <DataGrid rows={tableRows} columns={tableColumns} pageSizeOptions={[10, 25, 50]} />
          </Box>
        )}

        {/* Table toolbar */}
        {selectedDataset && (
          <TableToolbarSection
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleDeleteRows={handleDeleteRows}
            selectedRows={selectedRows}
            handleStartPreprocessing={handleStartPreprocessing}
            selectedDataset={selectedDataset}
            tableData={tableData}
            isProcessing={isProcessing}
          />
        )}
        
        {/* Data table */}
        <DataTableSection
          selectedDataset={selectedDataset}
          tableData={tableData}
          columns={columns}
          setSelectedRows={setSelectedRows}
          selectedRows={selectedRows}
          handleProcessRowUpdate={handleProcessRowUpdate}
        />
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
    </Box>
  );
};

// Helper functions for status display
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle fontSize="small" />;
    case 'in_progress':
      return <Refresh fontSize="small" />;
    case 'failed':
      return <ErrorIcon fontSize="small" />;
    default:
      return <DataObject fontSize="small" />;
  }
};

interface DatasetSelectionSectionProps {
  datasets?: TableData[];
  selectedDataset: TableData | null;
  setSelectedDataset: (dataset: TableData | null) => void;
  anchorEl: null | HTMLElement;
  setAnchorEl: (anchorEl: null | HTMLElement) => void;
  handleExport: (type: 'csv' | 'json') => void;
  getStatusColor?: (status: string) => 'success' | 'error' | 'warning' | 'info' | 'default';
  getStatusIcon?: (status: string) => React.ReactElement;
}

// Mock data for hardcoded values
const mockDatasets: TableData[] = [
  {
    id: 'dataset-1',
    name: 'Sample Dataset 1',
    columns: [],
    rows: [],
    length: 0,
    metadata: { 
      totalRows: 100, 
      totalColumns: 10, 
      lastUpdated: new Date(), 
      status: "completed" 
    }
  },
  {
    id: 'dataset-2',
    name: 'Sample Dataset 2',
    columns: [],
    rows: [],
    length: 0,
    metadata: { 
      totalRows: 50, 
      totalColumns: 5, 
      lastUpdated: new Date(), 
      status: "in_progress" 
    }
  }
];

const DatasetSelectionSection: React.FC<DatasetSelectionSectionProps> = ({
  datasets = mockDatasets,
  selectedDataset,
  setSelectedDataset,
  anchorEl,
  setAnchorEl,
  handleExport,
  getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  },
  getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle fontSize="small" />;
      case 'in_progress': return <Refresh fontSize="small" />;
      case 'failed': return <ErrorIcon fontSize="small" />;
      default: return <DataObject fontSize="small" />;
    }
  },
}) => {
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDatasetSelect = (dataset: TableData) => {
    setSelectedDataset(dataset);
    handleMenuClose();
  };

  return (
    <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ mr: 2 }}>
            Dataset:
          </Typography>
          {selectedDataset ? (
            <Chip
              icon={getStatusIcon(selectedDataset.metadata?.status || 'unknown')}
              label={selectedDataset.name}
              color={getStatusColor(selectedDataset.metadata?.status || 'unknown')}
              onDelete={() => setSelectedDataset(null)}
              onClick={handleMenuOpen}
              sx={{ cursor: 'pointer' }}
            />
          ) : (
            <Button onClick={handleMenuOpen} variant="outlined">
              Select Dataset
            </Button>
          )}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            {datasets.map((dataset) => (
              <MenuItem key={dataset.id} onClick={() => handleDatasetSelect(dataset)}>
                <ListItemIcon>
                  {getStatusIcon(dataset.metadata?.status || 'unknown')}
                </ListItemIcon>
                <ListItemText primary={dataset.name} />
                <Chip
                  label={dataset.metadata?.status || 'unknown'}
                  size="small"
                  color={getStatusColor(dataset.metadata?.status || 'unknown')}
                  sx={{ ml: 1 }}
                />
              </MenuItem>
            ))}
          </Menu>
        </Box>
        <Box>
          <Button
            startIcon={<Download />}
            onClick={() => handleExport('csv')}
            disabled={!selectedDataset}
            sx={{ mr: 1 }}
          >
            Export CSV
          </Button>
          <Button
            startIcon={<Download />}
            onClick={() => handleExport('json')}
            disabled={!selectedDataset}
          >
            Export JSON
          </Button>
        </Box>
      </Box>
    </Card>
  );
};

interface TableToolbarSectionProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleDeleteRows: () => Promise<void>;
  selectedRows: string[];
  handleStartPreprocessing: () => Promise<void>;
  selectedDataset: TableData | null;
  tableData: TableData;
  isProcessing: boolean;
}

const TableToolbarSection: React.FC<TableToolbarSectionProps> = ({
  searchTerm,
  setSearchTerm,
  handleDeleteRows,
  selectedRows,
  handleStartPreprocessing,
  selectedDataset,
  tableData,
  isProcessing,
}) => {
  return (
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
          startIcon={<Visibility />}
          onClick={handleStartPreprocessing}
          disabled={!selectedDataset || tableData.length === 0 || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Start Preprocessing'}
        </Button>
      </Box>
    </Box>
  );
};

export default DataInputPage;