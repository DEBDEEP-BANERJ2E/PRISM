import { ProcessedDataset } from '../../types/dataScience';
import { Brain, Zap, Network, Target, Sparkles, Award, TreePine } from 'lucide-react';

// Mock data for demonstration
export const mockData: ProcessedDataset = {
  id: 'mock-dataset-001',
  originalData: {
    id: 'raw-001',
    name: 'Sample Mining Dataset',
    headers: ['rainfall', 'temperature', 'blast_intensity', 'groundwater_level', 'slope_angle', 'slope_stability'],
    rows: [],
    metadata: {
      rowCount: 1000,
      columnCount: 6,
      dataTypes: {
        'rainfall': 'number',
        'temperature': 'number',
        'blast_intensity': 'number',
        'groundwater_level': 'number',
        'slope_angle': 'number',
        'slope_stability': 'number'
      },
      uploadedAt: new Date(),
      fileSize: 1024000,
      fileName: 'mining_data.csv'
    }
  },
  features: Array.from({ length: 1000 }, () =>
    Array.from({ length: 5 }, () => Math.random())
  ),
  labels: Array.from({ length: 1000 }, () => Math.random() > 0.5 ? 1 : 0),
  featureNames: ['rainfall', 'temperature', 'blast_intensity', 'groundwater_level', 'slope_angle'],
  preprocessing: {
    steps: [
      {
        type: 'missing_value_imputation',
        parameters: { strategy: 'mean' },
        appliedAt: new Date()
      },
      {
        type: 'normalization',
        parameters: { method: 'standard' },
        appliedAt: new Date()
      },
      {
        type: 'outlier_removal',
        parameters: { threshold: 3 },
        appliedAt: new Date()
      }
    ],
    statistics: {
      mean: {
        'rainfall': 45.2,
        'temperature': 28.5,
        'blast_intensity': 2.8,
        'groundwater_level': 12.3,
        'slope_angle': 32.1
      },
      std: {
        'rainfall': 15.8,
        'temperature': 8.2,
        'blast_intensity': 1.2,
        'groundwater_level': 4.5,
        'slope_angle': 6.7
      },
      min: {
        'rainfall': 0,
        'temperature': 15,
        'blast_intensity': 0,
        'groundwater_level': 0,
        'slope_angle': 0
      },
      max: {
        'rainfall': 200,
        'temperature': 45,
        'blast_intensity': 10,
        'groundwater_level': 50,
        'slope_angle': 90
      },
      nullCount: {
        'rainfall': 0,
        'temperature': 0,
        'blast_intensity': 0,
        'groundwater_level': 0,
        'slope_angle': 0
      },
      uniqueCount: {
        'rainfall': 150,
        'temperature': 25,
        'blast_intensity': 8,
        'groundwater_level': 45,
        'slope_angle': 67
      }
    },
    qualityScore: 0.85
  },
  metadata: {
    createdAt: new Date(),
    processedAt: new Date(),
    rowCount: 1000,
    featureCount: 5
  }
};

// Model types with comprehensive configuration
export const modelTypes = [
  {
    id: 'random_forest',
    name: 'Random Forest',
    icon: TreePine,
    description: 'Ensemble learning method with multiple decision trees',
    category: 'Tree-based',
    color: 'from-green-500 to-emerald-600',
    pros: ['Handles missing values', 'Feature importance', 'Robust to outliers'],
    cons: ['Slower prediction', 'Memory intensive', 'Less interpretable'],
    defaultParams: {
      n_estimators: 100,
      max_depth: 10,
      min_samples_split: 2,
      min_samples_leaf: 1,
      bootstrap: true
    }
  },
  {
    id: 'xgboost',
    name: 'XGBoost',
    icon: Zap,
    description: 'Optimized gradient boosting with superior performance',
    category: 'Gradient Boosting',
    color: 'from-yellow-500 to-orange-600',
    pros: ['High accuracy', 'Fast training', 'Regularization'],
    cons: ['Complex tuning', 'Resource intensive', 'Overfitting risk'],
    defaultParams: {
      n_estimators: 100,
      max_depth: 6,
      learning_rate: 0.1,
      subsample: 0.8,
      colsample_bytree: 0.8
    }
  },
  {
    id: 'neural_network',
    name: 'Neural Network',
    icon: Network,
    description: 'Deep learning model with multiple hidden layers',
    category: 'Deep Learning',
    color: 'from-purple-500 to-pink-600',
    pros: ['Complex patterns', 'High accuracy', 'Flexible architecture'],
    cons: ['Long training time', 'Requires GPU', 'Black box model'],
    defaultParams: {
      hidden_layers: [64, 32],
      activation: 'relu',
      dropout: 0.2,
      epochs: 100,
      batch_size: 32
    }
  },
  {
    id: 'svm',
    name: 'Support Vector Machine',
    icon: Target,
    description: 'Maximum margin classifier for linear and non-linear data',
    category: 'Kernel Methods',
    color: 'from-blue-500 to-cyan-600',
    pros: ['Effective in high dimensions', 'Memory efficient', 'Versatile kernels'],
    cons: ['Slow on large datasets', 'Sensitive to noise', 'Parameter tuning'],
    defaultParams: {
      kernel: 'rbf',
      C: 1.0,
      gamma: 'scale',
      degree: 3
    }
  },
  {
    id: 'lightgbm',
    name: 'LightGBM',
    icon: Sparkles,
    description: 'Microsoft gradient boosting framework',
    category: 'Gradient Boosting',
    color: 'from-indigo-500 to-blue-600',
    pros: ['Very fast training', 'Low memory usage', 'High accuracy'],
    cons: ['Categorical handling', 'Parameter sensitivity', 'Less mature'],
    defaultParams: {
      n_estimators: 100,
      max_depth: 6,
      learning_rate: 0.1,
      num_leaves: 31,
      subsample: 0.8
    }
  },
  {
    id: 'catboost',
    name: 'CatBoost',
    icon: Award,
    description: 'Yandex categorical boosting algorithm',
    category: 'Gradient Boosting',
    color: 'from-teal-500 to-green-600',
    pros: ['Handles categorical data', 'No preprocessing needed', 'Robust'],
    cons: ['Slower than LightGBM', 'Memory usage', 'Less customizable'],
    defaultParams: {
      iterations: 100,
      depth: 6,
      learning_rate: 0.1,
      l2_leaf_reg: 3,
      border_count: 254
    }
  }
];