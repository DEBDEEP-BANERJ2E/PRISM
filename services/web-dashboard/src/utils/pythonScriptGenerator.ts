import { ModelConfiguration } from '../types/dataScience';

export interface GeneratedScript {
  script: string;
  requirements: string[];
  description: string;
}

export const generatePythonScript = (
  modelType: string,
  configuration: ModelConfiguration,
  datasetInfo: any
): GeneratedScript => {
  const { hyperparameters, trainingConfig, optimizationConfig } = configuration;

  // Generate dummy dataset based on model type
  const dummyData = generateDummyData(modelType, datasetInfo);

  // Model-specific imports and setup
  const modelSetup = getModelSetup(modelType, hyperparameters);

  // Training configuration
  const trainingSetup = getTrainingSetup(trainingConfig, optimizationConfig);

  // Advanced settings (using default values)
  const advancedSetup = '';

  const script = `
# Generated Python Script for ${modelType} Model Training
# Generated on: ${new Date().toISOString()}

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split${modelSetup.imports}
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score${modelSetup.metricsImports}
import matplotlib.pyplot as plt
import seaborn as sns
${modelSetup.additionalImports}

# Set random seed for reproducibility
np.random.seed(42)

# Generate dummy dataset
print("Generating dummy dataset...")
${dummyData.generationCode}

# Split the data
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=${1 - trainingConfig.trainTestSplit},
    random_state=42,
    shuffle=True
)

print(f"Training set size: {X_train.shape}")
print(f"Test set size: {X_test.shape}")

# Initialize and configure the model
print(f"Initializing {modelType} model...")
${modelSetup.modelInitialization}

# Configure hyperparameters
${modelSetup.hyperparameterSetup}

# Advanced settings
${advancedSetup}

# Train the model
print("Training model...")
${modelSetup.trainingCode}

# Make predictions
print("Making predictions...")
y_pred = model.predict(X_test)

# Calculate metrics
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, average='weighted')
recall = recall_score(y_test, y_pred, average='weighted')
f1 = f1_score(y_test, y_pred, average='weighted')

print(f"\\nModel Performance:")
print(f"Accuracy: {accuracy:.4".4f"
print(f"Precision: {precision:.4".4f"
print(f"Recall: {recall:.4".4f"
print(f"F1 Score: {f1:.4".4f"

# Feature importance (if available)
${modelSetup.featureImportance}

# Save model (optional)
${modelSetup.modelSaving}

# Visualization
plt.figure(figsize=(12, 5))

# Confusion Matrix
plt.subplot(1, 2, 1)
from sklearn.metrics import confusion_matrix
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('Confusion Matrix')
plt.xlabel('Predicted')
plt.ylabel('Actual')

# Feature Importance (if available)
${modelSetup.visualizationCode}

plt.tight_layout()
plt.savefig('model_results.png', dpi=300, bbox_inches='tight')
plt.show()

print("\\nModel training completed successfully!")
print("Results visualization saved as 'model_results.png'")
`;

  const requirements = [
    'numpy',
    'pandas',
    'scikit-learn',
    'matplotlib',
    'seaborn',
    ...modelSetup.requirements
  ];

  const description = `This script trains a ${modelType} model using the specified configuration and dummy data. It includes data generation, model training, evaluation, and visualization.`;

  return {
    script,
    requirements: [...new Set(requirements)], // Remove duplicates
    description
  };
};

const generateDummyData = (modelType: string, datasetInfo: any) => {
  const numSamples = datasetInfo?.metadata?.rowCount || 1000;
  const numFeatures = datasetInfo?.metadata?.featureCount || 10;

  let generationCode = '';

  switch (modelType) {
    case 'random_forest':
    case 'xgboost':
    case 'lightgbm':
    case 'catboost':
      generationCode = `
# Generate dummy classification data
from sklearn.datasets import make_classification

X, y = make_classification(
    n_samples=${numSamples},
    n_features=${numFeatures},
    n_informative=${Math.floor(numFeatures * 0.7)},
    n_redundant=${Math.floor(numFeatures * 0.2)},
    n_clusters_per_class=1,
    random_state=42
)

# Convert to DataFrame for better visualization
feature_names = [f'feature_{i}' for i in range(X.shape[1])]
df = pd.DataFrame(X, columns=feature_names)
df['target'] = y

print(f"Generated dataset with {len(df)} samples and {len(feature_names)} features")
print(f"Target distribution: {df['target'].value_counts().to_dict()}")`;
      break;

    case 'neural_network':
      generationCode = `
# Generate dummy regression data
from sklearn.datasets import make_regression

X, y = make_regression(
    n_samples=${numSamples},
    n_features=${numFeatures},
    noise=0.1,
    random_state=42
)

# Convert to DataFrame
feature_names = [f'feature_{i}' for i in range(X.shape[1])]
df = pd.DataFrame(X, columns=feature_names)
df['target'] = y

print(f"Generated regression dataset with {len(df)} samples and {len(feature_names)} features")
print(f"Target range: {df['target'].min():.".2f"to {df['target'].max():.".2f"")`;
      break;

    case 'svm':
      generationCode = `
# Generate dummy data with clear decision boundary
from sklearn.datasets import make_classification

X, y = make_classification(
    n_samples=${numSamples},
    n_features=${numFeatures},
    n_informative=3,
    n_redundant=2,
    n_clusters_per_class=1,
    class_sep=2.0,
    random_state=42
)

# Convert to DataFrame
feature_names = [f'feature_{i}' for i in range(X.shape[1])]
df = pd.DataFrame(X, columns=feature_names)
df['target'] = y

print(f"Generated SVM dataset with {len(df)} samples and {len(feature_names)} features")
print(f"Target distribution: {df['target'].value_counts().to_dict()}")`;
      break;

    default:
      generationCode = `
# Generate generic dummy data
np.random.seed(42)
X = np.random.randn(${numSamples}, ${numFeatures})
y = np.random.randint(0, 2, ${numSamples})

# Convert to DataFrame
feature_names = [f'feature_{i}' for i in range(X.shape[1])]
df = pd.DataFrame(X, columns=feature_names)
df['target'] = y

print(f"Generated generic dataset with {len(df)} samples and {len(feature_names)} features")
print(f"Target distribution: {df['target'].value_counts().to_dict()}")`;
  }

  return { generationCode };
};

const getModelSetup = (modelType: string, hyperparameters: any) => {
  const baseImports = '\nfrom sklearn.ensemble import RandomForestClassifier';
  const baseMetrics = ', roc_auc_score';

  let imports = baseImports;
  let metricsImports = baseMetrics;
  let additionalImports = '';
  let modelInitialization = '';
  let hyperparameterSetup = '';
  let trainingCode = '';
  let featureImportance = '';
  let modelSaving = '';
  let visualizationCode = '';
  let requirements: string[] = ['scikit-learn'];

  switch (modelType) {
    case 'random_forest':
      modelInitialization = `model = RandomForestClassifier(random_state=42)`;
      hyperparameterSetup = `
model.n_estimators = ${hyperparameters.n_estimators}
model.max_depth = ${hyperparameters.max_depth}
model.min_samples_split = ${hyperparameters.min_samples_split}
model.min_samples_leaf = ${hyperparameters.min_samples_leaf}
model.bootstrap = ${hyperparameters.bootstrap}`;
      trainingCode = `model.fit(X_train, y_train)`;
      featureImportance = `
# Feature importance
feature_importance = pd.DataFrame({
    'feature': feature_names,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\\nTop 5 important features:")
print(feature_importance.head())`;
      modelSaving = `import joblib
joblib.dump(model, 'random_forest_model.pkl')
print("Model saved as 'random_forest_model.pkl'")`;
      break;

    case 'xgboost':
      imports += '\nimport xgboost as xgb';
      modelInitialization = `model = xgb.XGBClassifier(random_state=42)`;
      hyperparameterSetup = `
model.n_estimators = ${hyperparameters.n_estimators}
model.max_depth = ${hyperparameters.max_depth}
model.learning_rate = ${hyperparameters.learning_rate || 0.1}
model.subsample = ${hyperparameters.subsample || 0.8}
model.colsample_bytree = ${hyperparameters.colsample_bytree || 0.8}`;
      trainingCode = `model.fit(X_train, y_train)`;
      featureImportance = `
# Feature importance
feature_importance = pd.DataFrame({
    'feature': feature_names,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\\nTop 5 important features:")
print(feature_importance.head())`;
      requirements.push('xgboost');
      break;

    case 'neural_network':
      imports += '\nfrom sklearn.neural_network import MLPClassifier';
      modelInitialization = `model = MLPClassifier(random_state=42)`;
      hyperparameterSetup = `
model.hidden_layer_sizes = ${hyperparameters.hidden_layer_sizes || '(100, 50)'}
model.activation = '${hyperparameters.activation || 'relu'}'
model.learning_rate_init = ${hyperparameters.learning_rate_init || 0.001}
model.max_iter = ${hyperparameters.max_iter || 1000}`;
      trainingCode = `model.fit(X_train, y_train)`;
      modelSaving = `joblib.dump(model, 'neural_network_model.pkl')
print("Model saved as 'neural_network_model.pkl'")`;
      break;

    case 'svm':
      imports += '\nfrom sklearn.svm import SVC';
      modelInitialization = `model = SVC(random_state=42)`;
      hyperparameterSetup = `
model.C = ${hyperparameters.C || 1.0}
model.kernel = '${hyperparameters.kernel || 'rbf'}'
model.gamma = '${hyperparameters.gamma || 'scale'}'`;
      trainingCode = `model.fit(X_train, y_train)`;
      modelSaving = `joblib.dump(model, 'svm_model.pkl')
print("Model saved as 'svm_model.pkl'")`;
      break;

    case 'lightgbm':
      imports += '\nimport lightgbm as lgb';
      modelInitialization = `model = lgb.LGBMClassifier(random_state=42)`;
      hyperparameterSetup = `
model.n_estimators = ${hyperparameters.n_estimators}
model.max_depth = ${hyperparameters.max_depth}
model.learning_rate = ${hyperparameters.learning_rate || 0.1}
model.num_leaves = ${hyperparameters.num_leaves || 31}`;
      trainingCode = `model.fit(X_train, y_train)`;
      featureImportance = `
# Feature importance
feature_importance = pd.DataFrame({
    'feature': feature_names,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\\nTop 5 important features:")
print(feature_importance.head())`;
      requirements.push('lightgbm');
      break;

    case 'catboost':
      imports += '\nfrom catboost import CatBoostClassifier';
      modelInitialization = `model = CatBoostClassifier(verbose=False, random_state=42)`;
      hyperparameterSetup = `
model.iterations = ${hyperparameters.iterations || 1000}
model.depth = ${hyperparameters.depth || 6}
model.learning_rate = ${hyperparameters.learning_rate || 0.1}`;
      trainingCode = `model.fit(X_train, y_train)`;
      featureImportance = `
# Feature importance
feature_importance = pd.DataFrame({
    'feature': feature_names,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\\nTop 5 important features:")
print(feature_importance.head())`;
      requirements.push('catboost');
      break;
  }

  return {
    imports,
    metricsImports,
    additionalImports,
    modelInitialization,
    hyperparameterSetup,
    trainingCode,
    featureImportance,
    modelSaving,
    visualizationCode,
    requirements
  };
};

const getTrainingSetup = (trainingConfig: any, optimizationConfig: any) => {
  let setup = '';

  if (optimizationConfig.useAutoOptimization) {
    setup += `
# Auto optimization setup
from sklearn.model_selection import ${optimizationConfig.optimizationMethod === 'grid_search' ? 'GridSearchCV' : 'RandomizedSearchCV'}

param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [5, 10, 15, None],
    'min_samples_split': [2, 5, 10]
}

${optimizationConfig.optimizationMethod === 'grid_search' ? 'grid_search' : 'random_search'} = ${optimizationConfig.optimizationMethod === 'grid_search' ? 'GridSearchCV' : 'RandomizedSearchCV'}(
    model,
    param_grid,
    cv=${optimizationConfig.cv || 5},
    scoring='${optimizationConfig.scoring}',
    n_jobs=${optimizationConfig.n_jobs || -1}
)

print("Performing hyperparameter optimization...")
${optimizationConfig.optimizationMethod === 'grid_search' ? 'grid_search' : 'random_search'}.fit(X_train, y_train)
model = ${optimizationConfig.optimizationMethod === 'grid_search' ? 'grid_search' : 'random_search'}.best_estimator_

print(f"Best parameters: {model.get_params()}")
`;
  }

  return setup;
};
