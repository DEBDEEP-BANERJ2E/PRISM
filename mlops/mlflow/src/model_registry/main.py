import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import mlflow
from mlflow.tracking import MlflowClient
from mlflow.exceptions import MlflowException
import uvicorn
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import os
from datetime import datetime
import json

from .model_lifecycle import ModelLifecycleManager
from .deployment_manager import DeploymentManager
from .monitoring import ModelMonitor
from .validation import ModelValidator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models
class ModelRegistrationRequest(BaseModel):
    name: str
    version: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[Dict[str, str]] = None
    run_id: str

class ModelPromotionRequest(BaseModel):
    name: str
    version: str
    stage: str  # "Staging", "Production", "Archived"
    description: Optional[str] = None

class ModelDeploymentRequest(BaseModel):
    name: str
    version: str
    deployment_config: Dict[str, Any]
    target_environment: str  # "staging", "production"

class ModelValidationRequest(BaseModel):
    name: str
    version: str
    validation_dataset_path: str
    validation_config: Dict[str, Any]

# Global managers
lifecycle_manager = None
deployment_manager = None
model_monitor = None
model_validator = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global lifecycle_manager, deployment_manager, model_monitor, model_validator
    
    # Initialize MLflow
    mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    mlflow.set_tracking_uri(mlflow_uri)
    
    # Initialize managers
    lifecycle_manager = ModelLifecycleManager()
    deployment_manager = DeploymentManager()
    model_monitor = ModelMonitor()
    model_validator = ModelValidator()
    
    logger.info("Model Registry service started")
    yield
    
    # Shutdown
    logger.info("Model Registry service shutting down")

app = FastAPI(
    title="PRISM Model Registry",
    description="MLflow-based model lifecycle management for PRISM AI models",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        client = MlflowClient()
        # Test MLflow connection
        client.search_experiments()
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "mlflow_uri": mlflow.get_tracking_uri()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.post("/models/register")
async def register_model(request: ModelRegistrationRequest):
    """Register a new model version"""
    try:
        result = await lifecycle_manager.register_model(
            name=request.name,
            version=request.version,
            description=request.description,
            tags=request.tags or {},
            run_id=request.run_id
        )
        return result
    except Exception as e:
        logger.error(f"Model registration failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/models/promote")
async def promote_model(request: ModelPromotionRequest):
    """Promote model to different stage"""
    try:
        result = await lifecycle_manager.promote_model(
            name=request.name,
            version=request.version,
            stage=request.stage,
            description=request.description
        )
        return result
    except Exception as e:
        logger.error(f"Model promotion failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/models/validate")
async def validate_model(request: ModelValidationRequest, background_tasks: BackgroundTasks):
    """Validate model performance"""
    try:
        # Start validation in background
        background_tasks.add_task(
            model_validator.validate_model,
            request.name,
            request.version,
            request.validation_dataset_path,
            request.validation_config
        )
        
        return {
            "message": "Model validation started",
            "model": f"{request.name}:{request.version}",
            "status": "in_progress"
        }
    except Exception as e:
        logger.error(f"Model validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/models/deploy")
async def deploy_model(request: ModelDeploymentRequest, background_tasks: BackgroundTasks):
    """Deploy model to target environment"""
    try:
        # Start deployment in background
        background_tasks.add_task(
            deployment_manager.deploy_model,
            request.name,
            request.version,
            request.deployment_config,
            request.target_environment
        )
        
        return {
            "message": "Model deployment started",
            "model": f"{request.name}:{request.version}",
            "environment": request.target_environment,
            "status": "in_progress"
        }
    except Exception as e:
        logger.error(f"Model deployment failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/models")
async def list_models():
    """List all registered models"""
    try:
        client = MlflowClient()
        models = client.search_registered_models()
        
        result = []
        for model in models:
            latest_versions = client.get_latest_versions(model.name)
            result.append({
                "name": model.name,
                "description": model.description,
                "creation_timestamp": model.creation_timestamp,
                "last_updated_timestamp": model.last_updated_timestamp,
                "latest_versions": [
                    {
                        "version": v.version,
                        "stage": v.current_stage,
                        "creation_timestamp": v.creation_timestamp,
                        "last_updated_timestamp": v.last_updated_timestamp
                    }
                    for v in latest_versions
                ]
            })
        
        return {"models": result}
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_name}")
async def get_model(model_name: str):
    """Get model details"""
    try:
        client = MlflowClient()
        model = client.get_registered_model(model_name)
        versions = client.search_model_versions(f"name='{model_name}'")
        
        return {
            "name": model.name,
            "description": model.description,
            "creation_timestamp": model.creation_timestamp,
            "last_updated_timestamp": model.last_updated_timestamp,
            "versions": [
                {
                    "version": v.version,
                    "stage": v.current_stage,
                    "description": v.description,
                    "creation_timestamp": v.creation_timestamp,
                    "last_updated_timestamp": v.last_updated_timestamp,
                    "run_id": v.run_id,
                    "tags": dict(v.tags) if v.tags else {}
                }
                for v in versions
            ]
        }
    except MlflowException as e:
        if "RESOURCE_DOES_NOT_EXIST" in str(e):
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_name}/versions/{version}")
async def get_model_version(model_name: str, version: str):
    """Get specific model version details"""
    try:
        client = MlflowClient()
        model_version = client.get_model_version(model_name, version)
        
        # Get run details
        run = client.get_run(model_version.run_id)
        
        return {
            "name": model_version.name,
            "version": model_version.version,
            "stage": model_version.current_stage,
            "description": model_version.description,
            "creation_timestamp": model_version.creation_timestamp,
            "last_updated_timestamp": model_version.last_updated_timestamp,
            "run_id": model_version.run_id,
            "tags": dict(model_version.tags) if model_version.tags else {},
            "run_info": {
                "experiment_id": run.info.experiment_id,
                "status": run.info.status,
                "start_time": run.info.start_time,
                "end_time": run.info.end_time,
                "artifact_uri": run.info.artifact_uri
            },
            "metrics": dict(run.data.metrics) if run.data.metrics else {},
            "params": dict(run.data.params) if run.data.params else {}
        }
    except MlflowException as e:
        if "RESOURCE_DOES_NOT_EXIST" in str(e):
            raise HTTPException(status_code=404, detail=f"Model version {model_name}:{version} not found")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/deployments")
async def list_deployments():
    """List all model deployments"""
    try:
        deployments = await deployment_manager.list_deployments()
        return {"deployments": deployments}
    except Exception as e:
        logger.error(f"Failed to list deployments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/deployments/{deployment_id}")
async def get_deployment(deployment_id: str):
    """Get deployment details"""
    try:
        deployment = await deployment_manager.get_deployment(deployment_id)
        if not deployment:
            raise HTTPException(status_code=404, detail=f"Deployment {deployment_id} not found")
        return deployment
    except Exception as e:
        logger.error(f"Failed to get deployment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/deployments/{deployment_id}")
async def delete_deployment(deployment_id: str):
    """Delete a deployment"""
    try:
        result = await deployment_manager.delete_deployment(deployment_id)
        return result
    except Exception as e:
        logger.error(f"Failed to delete deployment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/monitoring/models/{model_name}/metrics")
async def get_model_metrics(model_name: str, start_time: Optional[str] = None, end_time: Optional[str] = None):
    """Get model monitoring metrics"""
    try:
        metrics = await model_monitor.get_model_metrics(model_name, start_time, end_time)
        return {"metrics": metrics}
    except Exception as e:
        logger.error(f"Failed to get model metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/monitoring/models/{model_name}/drift-detection")
async def detect_drift(model_name: str, reference_data_path: str, current_data_path: str):
    """Detect data drift for a model"""
    try:
        drift_report = await model_monitor.detect_drift(model_name, reference_data_path, current_data_path)
        return drift_report
    except Exception as e:
        logger.error(f"Drift detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        log_level="info"
    )