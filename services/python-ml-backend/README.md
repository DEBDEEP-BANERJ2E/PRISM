Python ML Backend

A minimal FastAPI-based microservice that:
- Accepts CSV/XLSX dataset uploads
- Trains ML models with real algorithms (RandomForest, optional XGBoost, MLP)
- Tracks training progress and returns metrics
- Persists artifacts (joblib model, metrics JSON)
- Supports predictions and feature importance retrieval

Endpoints
- GET /health
- POST /api/datasets/upload -> { datasetId }
- POST /models/train { datasetId, configuration }
- GET /models/train/{jobId}/progress
- GET /models/train/{jobId}/results
- GET /models -> list saved models
- DELETE /models/{modelId}
- POST /models/{modelId}/predict { inputData: [ {feature: value} ] }
- GET /models/{modelId}/feature-importance
- GET /models/{modelId}/metrics
- GET /models/{modelId}/data-distributions
- POST /models/compare { modelIds: [id, ...] }
- GET /models/{modelId}/export?format=json|csv|excel

Run locally
1) python -m venv .venv && source .venv/bin/activate
2) pip install -r requirements.txt
3) uvicorn app.main:app --host 0.0.0.0 --port 3002

Config mapping to web-dashboard
- web-dashboard client currently hits API_BASE_URL/api/...; set VITE_API_URL to api-gateway if used
- data-science-backend AIPipelineClient targets AI_PIPELINE_URL (default http://localhost:3002). Set env in services/data-science-backend/.env:
  AI_PIPELINE_URL=http://localhost:3002

Dataset notes
- The label column defaults to "target" if present, else the last column. You can override via:
  configuration.trainingConfig.labelColumn or configuration.hyperparameters.label_column
- Supported uploads: CSV, XLSX, XLS

Storage
- Artifacts and datasets stored under services/python-ml-backend/storage
