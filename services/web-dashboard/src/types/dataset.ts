export interface Dataset {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  row_count?: number;
  column_count?: number;
  status?: 'ready' | 'processing' | 'error';
  rows?: number; // Add this line
}

export interface Column {
  id: string;
  name: string;
  displayName?: string;
  type: string;
  dataset_id: string;
  created_at: string;
  updated_at: string;
}

export interface Row {
  id: string;
  dataset_id: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}