import logging
from typing import Dict, Optional, Any, List
import mlflow
from mlflow.tracking import MlflowClient
from mlflow.exceptions import MlflowException
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class ModelLifecycleManager:
    """Manages the complete lifecycle of ML models in MLflow"""
    
    def __init__(self):
        self.client = MlflowClient()
    
    async def register_model(
        self, 
        name: str, 
        version: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None,
        run_id: str = None
    ) -> Dict[str, Any]:
        """Register a new model version"""
        try:
            # Create registered model if it doesn't exist
            try:
                self.client.get_registered_model(name)
            except MlflowException:
                self.client.create_registered_model(
                    name=name,
                    description=description or f"PRISM AI model: {name}"
                )
                logger.info(f"Created new registered model: {name}")
            
            # Register model version
            model_version = self.client.create_model_version(
                name=name,
                source=f"runs:/{run_id}/model",
                run_id=run_id,
                description=description
            )
            
            # Add tags if provided
            if tags:
                for key, value in tags.items():
                    self.client.set_model_version_tag(name, model_version.version, key, value)
            
            # Add default tags
            default_tags = {
                "registered_at": datetime.utcnow().isoformat(),
                "system": "PRISM",
                "model_type": self._infer_model_type(name)
            }
            
            for key, value in default_tags.items():
                self.client.set_model_version_tag(name, model_version.version, key, value)
            
            logger.info(f"Registered model version: {name}:{model_version.version}")
            
            return {
                "name": model_version.name,
                "version": model_version.version,
                "stage": model_version.current_stage,
                "creation_timestamp": model_version.creation_timestamp,
                "run_id": model_version.run_id,
                "status": "registered"
            }
            
        except Exception as e:
            logger.error(f"Failed to register model {name}: {e}")
            raise
    
    async def promote_model(
        self,
        name: str,
        version: str,
        stage: str,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Promote model to a different stage"""
        try:
            # Validate stage
            valid_stages = ["None", "Staging", "Production", "Archived"]
            if stage not in valid_stages:
                raise ValueError(f"Invalid stage: {stage}. Must be one of {valid_stages}")
            
            # Get current model version
            current_version = self.client.get_model_version(name, version)
            
            # If promoting to Production, archive current production models
            if stage == "Production":
                await self._archive_current_production_models(name, version)
            
            # Transition model version
            self.client.transition_model_version_stage(
                name=name,
                version=version,
                stage=stage,
                archive_existing_versions=False
            )
            
            # Add promotion metadata
            promotion_tags = {
                "promoted_at": datetime.utcnow().isoformat(),
                "promoted_from": current_version.current_stage,
                "promoted_to": stage
            }
            
            if description:
                promotion_tags["promotion_description"] = description
            
            for key, value in promotion_tags.items():
                self.client.set_model_version_tag(name, version, key, value)
            
            logger.info(f"Promoted model {name}:{version} from {current_version.current_stage} to {stage}")
            
            return {
                "name": name,
                "version": version,
                "previous_stage": current_version.current_stage,
                "new_stage": stage,
                "promotion_timestamp": datetime.utcnow().isoformat(),
                "status": "promoted"
            }
            
        except Exception as e:
            logger.error(f"Failed to promote model {name}:{version} to {stage}: {e}")
            raise
    
    async def _archive_current_production_models(self, name: str, exclude_version: str):
        """Archive current production models when promoting a new one"""
        try:
            production_versions = self.client.get_latest_versions(name, stages=["Production"])
            
            for version in production_versions:
                if version.version != exclude_version:
                    self.client.transition_model_version_stage(
                        name=name,
                        version=version.version,
                        stage="Archived",
                        archive_existing_versions=False
                    )
                    
                    # Add archival metadata
                    self.client.set_model_version_tag(
                        name, version.version, "archived_at", datetime.utcnow().isoformat()
                    )
                    self.client.set_model_version_tag(
                        name, version.version, "archived_reason", "replaced_by_new_production"
                    )
                    
                    logger.info(f"Archived previous production model {name}:{version.version}")
        
        except Exception as e:
            logger.warning(f"Failed to archive current production models: {e}")
    
    def _infer_model_type(self, name: str) -> str:
        """Infer model type from name"""
        name_lower = name.lower()
        
        if "rockfall" in name_lower or "slope" in name_lower:
            return "rockfall_prediction"
        elif "gnn" in name_lower or "graph" in name_lower:
            return "graph_neural_network"
        elif "temporal" in name_lower or "time" in name_lower:
            return "temporal_analysis"
        elif "pinn" in name_lower or "physics" in name_lower:
            return "physics_informed"
        elif "anomaly" in name_lower:
            return "anomaly_detection"
        else:
            return "general"
    
    async def get_model_lineage(self, name: str, version: str) -> Dict[str, Any]:
        """Get model lineage and dependencies"""
        try:
            model_version = self.client.get_model_version(name, version)
            run = self.client.get_run(model_version.run_id)
            
            # Get parent runs (if any)
            parent_runs = []
            if run.data.tags.get("mlflow.parentRunId"):
                parent_run_id = run.data.tags["mlflow.parentRunId"]
                parent_run = self.client.get_run(parent_run_id)
                parent_runs.append({
                    "run_id": parent_run.info.run_id,
                    "experiment_id": parent_run.info.experiment_id,
                    "start_time": parent_run.info.start_time,
                    "end_time": parent_run.info.end_time
                })
            
            # Get data sources
            data_sources = []
            if run.data.tags.get("data_sources"):
                data_sources = json.loads(run.data.tags["data_sources"])
            
            # Get model dependencies
            dependencies = []
            if run.data.tags.get("model_dependencies"):
                dependencies = json.loads(run.data.tags["model_dependencies"])
            
            return {
                "model": {
                    "name": name,
                    "version": version,
                    "run_id": model_version.run_id
                },
                "parent_runs": parent_runs,
                "data_sources": data_sources,
                "dependencies": dependencies,
                "creation_timestamp": model_version.creation_timestamp,
                "lineage_generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get model lineage for {name}:{version}: {e}")
            raise
    
    async def compare_models(self, models: List[Dict[str, str]]) -> Dict[str, Any]:
        """Compare multiple model versions"""
        try:
            comparison_data = []
            
            for model_info in models:
                name = model_info["name"]
                version = model_info["version"]
                
                model_version = self.client.get_model_version(name, version)
                run = self.client.get_run(model_version.run_id)
                
                comparison_data.append({
                    "name": name,
                    "version": version,
                    "stage": model_version.current_stage,
                    "metrics": dict(run.data.metrics) if run.data.metrics else {},
                    "params": dict(run.data.params) if run.data.params else {},
                    "tags": dict(model_version.tags) if model_version.tags else {},
                    "creation_timestamp": model_version.creation_timestamp,
                    "run_id": model_version.run_id
                })
            
            # Calculate metric differences
            metric_comparison = {}
            if len(comparison_data) >= 2:
                base_metrics = comparison_data[0]["metrics"]
                for metric_name in base_metrics:
                    metric_comparison[metric_name] = []
                    for model_data in comparison_data:
                        if metric_name in model_data["metrics"]:
                            metric_comparison[metric_name].append({
                                "model": f"{model_data['name']}:{model_data['version']}",
                                "value": model_data["metrics"][metric_name]
                            })
            
            return {
                "models": comparison_data,
                "metric_comparison": metric_comparison,
                "comparison_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to compare models: {e}")
            raise
    
    async def get_model_performance_history(self, name: str) -> Dict[str, Any]:
        """Get performance history across all versions of a model"""
        try:
            versions = self.client.search_model_versions(f"name='{name}'")
            
            performance_history = []
            for version in versions:
                run = self.client.get_run(version.run_id)
                
                performance_data = {
                    "version": version.version,
                    "stage": version.current_stage,
                    "creation_timestamp": version.creation_timestamp,
                    "metrics": dict(run.data.metrics) if run.data.metrics else {},
                    "run_id": version.run_id
                }
                
                performance_history.append(performance_data)
            
            # Sort by version number
            performance_history.sort(key=lambda x: int(x["version"]))
            
            return {
                "model_name": name,
                "performance_history": performance_history,
                "total_versions": len(performance_history),
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance history for {name}: {e}")
            raise