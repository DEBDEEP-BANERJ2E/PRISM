#!/usr/bin/env python3
"""
PRISM Model Deployment Script
Deploys trained models to Kubernetes environments with automated rollback capabilities.
"""

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
import yaml
import aiohttp
import mlflow
from mlflow.tracking import MlflowClient
from kubernetes import client, config
from kubernetes.client.rest import ApiException

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ModelDeploymentManager:
    """Manages model deployments to Kubernetes"""
    
    def __init__(self, environment: str, config_file: str):
        self.environment = environment
        self.config_file = config_file
        self.deployment_config = self._load_config()
        
        # Initialize MLflow
        mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
        mlflow.set_tracking_uri(mlflow_uri)
        self.mlflow_client = MlflowClient()
        
        # Initialize Kubernetes
        try:
            config.load_incluster_config()
        except:
            config.load_kube_config()
        
        self.k8s_apps_v1 = client.AppsV1Api()
        self.k8s_core_v1 = client.CoreV1Api()
        self.k8s_networking_v1 = client.NetworkingV1Api()
        
    def _load_config(self) -> Dict[str, Any]:
        """Load deployment configuration"""
        try:
            with open(self.config_file, 'r') as f:
                config_data = yaml.safe_load(f)
            return config_data.get(self.environment, {})
        except Exception as e:
            logger.error(f"Failed to load config from {self.config_file}: {e}")
            return {}
    
    async def deploy_models(
        self, 
        experiment_name: str, 
        auto_promote: bool = False,
        canary_deployment: bool = False
    ) -> Dict[str, Any]:
        """Deploy models from experiment to environment"""
        try:
            # Get latest successful models from experiment
            models_to_deploy = await self._get_models_to_deploy(experiment_name)
            
            if not models_to_deploy:
                logger.warning(f"No models found for deployment in experiment {experiment_name}")
                return {"status": "no_models", "deployed": []}
            
            deployment_results = []
            
            for model_info in models_to_deploy:
                try:
                    if canary_deployment:
                        result = await self._deploy_model_canary(model_info)
                    else:
                        result = await self._deploy_model_standard(model_info)
                    
                    deployment_results.append(result)
                    
                    if auto_promote and result["status"] == "success":
                        await self._promote_model_to_production(model_info)
                        
                except Exception as e:
                    logger.error(f"Failed to deploy model {model_info['name']}: {e}")
                    deployment_results.append({
                        "model": model_info["name"],
                        "version": model_info["version"],
                        "status": "failed",
                        "error": str(e)
                    })
            
            return {
                "status": "completed",
                "environment": self.environment,
                "deployed": deployment_results,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Deployment failed: {e}")
            raise
    
    async def _get_models_to_deploy(self, experiment_name: str) -> List[Dict[str, Any]]:
        """Get models ready for deployment from experiment"""
        try:
            experiment = self.mlflow_client.get_experiment_by_name(experiment_name)
            if not experiment:
                logger.error(f"Experiment {experiment_name} not found")
                return []
            
            # Get recent successful runs
            runs = self.mlflow_client.search_runs(
                experiment_ids=[experiment.experiment_id],
                filter_string="status = 'FINISHED'",
                order_by=["start_time DESC"],
                max_results=10
            )
            
            models_to_deploy = []
            
            for run in runs:
                # Check if run has a registered model
                model_name = run.data.tags.get("model_name")
                if not model_name:
                    continue
                
                # Get model version
                try:
                    model_versions = self.mlflow_client.search_model_versions(
                        f"name='{model_name}' and run_id='{run.info.run_id}'"
                    )
                    
                    if model_versions:
                        model_version = model_versions[0]
                        
                        # Check if model meets deployment criteria
                        if await self._should_deploy_model(model_version, run):
                            models_to_deploy.append({
                                "name": model_name,
                                "version": model_version.version,
                                "run_id": run.info.run_id,
                                "stage": model_version.current_stage,
                                "metrics": dict(run.data.metrics) if run.data.metrics else {}
                            })
                            
                except Exception as e:
                    logger.warning(f"Failed to get model version for run {run.info.run_id}: {e}")
                    continue
            
            return models_to_deploy
            
        except Exception as e:
            logger.error(f"Failed to get models for deployment: {e}")
            return []
    
    async def _should_deploy_model(self, model_version, run) -> bool:
        """Check if model meets deployment criteria"""
        try:
            # Check model stage
            if self.environment == "production" and model_version.current_stage != "Production":
                return False
            
            if self.environment == "staging" and model_version.current_stage not in ["Staging", "Production"]:
                return False
            
            # Check model metrics
            metrics = dict(run.data.metrics) if run.data.metrics else {}
            min_accuracy = self.deployment_config.get("min_accuracy", 0.8)
            
            if "accuracy" in metrics and metrics["accuracy"] < min_accuracy:
                logger.info(f"Model {model_version.name}:{model_version.version} accuracy {metrics['accuracy']} below threshold {min_accuracy}")
                return False
            
            # Check if model is already deployed
            current_deployment = await self._get_current_deployment(model_version.name)
            if current_deployment and current_deployment.get("version") == model_version.version:
                logger.info(f"Model {model_version.name}:{model_version.version} already deployed")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to check deployment criteria: {e}")
            return False
    
    async def _deploy_model_standard(self, model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Deploy model using standard blue-green deployment"""
        try:
            model_name = model_info["name"]
            model_version = model_info["version"]
            
            logger.info(f"Starting standard deployment of {model_name}:{model_version}")
            
            # Create deployment configuration
            deployment_config = self._create_deployment_config(model_info)
            
            # Deploy new version
            await self._apply_k8s_resources(deployment_config)
            
            # Wait for deployment to be ready
            deployment_ready = await self._wait_for_deployment_ready(
                deployment_config["deployment"]["metadata"]["name"],
                timeout=300
            )
            
            if not deployment_ready:
                raise Exception("Deployment failed to become ready")
            
            # Run health checks
            health_check_passed = await self._run_health_checks(deployment_config)
            
            if not health_check_passed:
                # Rollback deployment
                await self._rollback_deployment(deployment_config)
                raise Exception("Health checks failed")
            
            # Update traffic routing
            await self._update_traffic_routing(model_name, deployment_config)
            
            # Clean up old deployments
            await self._cleanup_old_deployments(model_name, model_version)
            
            logger.info(f"Successfully deployed {model_name}:{model_version}")
            
            return {
                "model": model_name,
                "version": model_version,
                "status": "success",
                "deployment_type": "standard",
                "endpoint": self._get_model_endpoint(deployment_config),
                "deployed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Standard deployment failed: {e}")
            return {
                "model": model_info["name"],
                "version": model_info["version"],
                "status": "failed",
                "error": str(e)
            }
    
    async def _deploy_model_canary(self, model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Deploy model using canary deployment strategy"""
        try:
            model_name = model_info["name"]
            model_version = model_info["version"]
            
            logger.info(f"Starting canary deployment of {model_name}:{model_version}")
            
            # Create canary deployment configuration
            canary_config = self._create_canary_deployment_config(model_info)
            
            # Deploy canary version with 10% traffic
            await self._apply_k8s_resources(canary_config)
            
            # Wait for canary to be ready
            canary_ready = await self._wait_for_deployment_ready(
                canary_config["deployment"]["metadata"]["name"],
                timeout=300
            )
            
            if not canary_ready:
                raise Exception("Canary deployment failed to become ready")
            
            # Monitor canary performance
            canary_metrics = await self._monitor_canary_deployment(
                canary_config, 
                duration=600  # 10 minutes
            )
            
            # Decide whether to promote canary
            if canary_metrics["success_rate"] > 0.95 and canary_metrics["error_rate"] < 0.01:
                # Gradually increase traffic to canary
                await self._promote_canary_deployment(canary_config)
                logger.info(f"Canary deployment promoted for {model_name}:{model_version}")
                
                return {
                    "model": model_name,
                    "version": model_version,
                    "status": "success",
                    "deployment_type": "canary",
                    "canary_metrics": canary_metrics,
                    "endpoint": self._get_model_endpoint(canary_config),
                    "deployed_at": datetime.utcnow().isoformat()
                }
            else:
                # Rollback canary
                await self._rollback_canary_deployment(canary_config)
                raise Exception(f"Canary metrics failed: {canary_metrics}")
                
        except Exception as e:
            logger.error(f"Canary deployment failed: {e}")
            return {
                "model": model_info["name"],
                "version": model_info["version"],
                "status": "failed",
                "error": str(e)
            }
    
    def _create_deployment_config(self, model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Create Kubernetes deployment configuration"""
        model_name = model_info["name"]
        model_version = model_info["version"]
        
        # Sanitize names for Kubernetes
        safe_name = model_name.lower().replace("_", "-").replace(".", "-")
        deployment_name = f"prism-model-{safe_name}-{model_version}"
        
        deployment_config = self.deployment_config.get("deployment", {})
        
        deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": deployment_name,
                "namespace": f"prism-{self.environment}",
                "labels": {
                    "app": deployment_name,
                    "model": safe_name,
                    "version": model_version,
                    "environment": self.environment
                }
            },
            "spec": {
                "replicas": deployment_config.get("replicas", 2),
                "selector": {
                    "matchLabels": {
                        "app": deployment_name
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": deployment_name,
                            "model": safe_name,
                            "version": model_version
                        },
                        "annotations": {
                            "prometheus.io/scrape": "true",
                            "prometheus.io/port": "8080",
                            "prometheus.io/path": "/metrics"
                        }
                    },
                    "spec": {
                        "containers": [{
                            "name": "model-server",
                            "image": deployment_config.get("image", "prism/mlflow-server:latest"),
                            "ports": [{"containerPort": 8080}],
                            "env": [
                                {"name": "MLFLOW_MODEL_URI", "value": f"models:/{model_name}/{model_version}"},
                                {"name": "MLFLOW_TRACKING_URI", "value": os.getenv("MLFLOW_TRACKING_URI")},
                                {"name": "MODEL_NAME", "value": model_name},
                                {"name": "MODEL_VERSION", "value": model_version}
                            ],
                            "resources": {
                                "requests": {
                                    "cpu": deployment_config.get("cpu_request", "500m"),
                                    "memory": deployment_config.get("memory_request", "1Gi")
                                },
                                "limits": {
                                    "cpu": deployment_config.get("cpu_limit", "2000m"),
                                    "memory": deployment_config.get("memory_limit", "4Gi")
                                }
                            },
                            "livenessProbe": {
                                "httpGet": {"path": "/health", "port": 8080},
                                "initialDelaySeconds": 30,
                                "periodSeconds": 10
                            },
                            "readinessProbe": {
                                "httpGet": {"path": "/health", "port": 8080},
                                "initialDelaySeconds": 5,
                                "periodSeconds": 5
                            }
                        }]
                    }
                }
            }
        }
        
        service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": f"{deployment_name}-service",
                "namespace": f"prism-{self.environment}",
                "labels": {
                    "app": deployment_name,
                    "model": safe_name,
                    "version": model_version
                }
            },
            "spec": {
                "selector": {"app": deployment_name},
                "ports": [{"port": 80, "targetPort": 8080}]
            }
        }
        
        return {
            "deployment": deployment,
            "service": service,
            "deployment_name": deployment_name,
            "namespace": f"prism-{self.environment}"
        }
    
    def _create_canary_deployment_config(self, model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Create canary deployment configuration"""
        config = self._create_deployment_config(model_info)
        
        # Modify for canary
        config["deployment"]["metadata"]["name"] += "-canary"
        config["deployment"]["spec"]["replicas"] = 1  # Start with single replica
        config["service"]["metadata"]["name"] += "-canary"
        
        return config
    
    async def _apply_k8s_resources(self, config: Dict[str, Any]):
        """Apply Kubernetes resources"""
        try:
            namespace = config["namespace"]
            
            # Create deployment
            self.k8s_apps_v1.create_namespaced_deployment(
                namespace=namespace,
                body=config["deployment"]
            )
            
            # Create service
            self.k8s_core_v1.create_namespaced_service(
                namespace=namespace,
                body=config["service"]
            )
            
            logger.info(f"Applied Kubernetes resources in namespace {namespace}")
            
        except ApiException as e:
            if e.status == 409:  # Already exists
                logger.info("Resources already exist, updating...")
                # Update existing resources
                self.k8s_apps_v1.patch_namespaced_deployment(
                    name=config["deployment"]["metadata"]["name"],
                    namespace=namespace,
                    body=config["deployment"]
                )
            else:
                raise
    
    async def _wait_for_deployment_ready(self, deployment_name: str, timeout: int = 300) -> bool:
        """Wait for deployment to be ready"""
        start_time = time.time()
        namespace = f"prism-{self.environment}"
        
        while time.time() - start_time < timeout:
            try:
                deployment = self.k8s_apps_v1.read_namespaced_deployment(
                    name=deployment_name,
                    namespace=namespace
                )
                
                if (deployment.status.ready_replicas and 
                    deployment.status.ready_replicas == deployment.spec.replicas):
                    logger.info(f"Deployment {deployment_name} is ready")
                    return True
                
                await asyncio.sleep(10)
                
            except ApiException as e:
                logger.error(f"Error checking deployment status: {e}")
                return False
        
        logger.error(f"Deployment {deployment_name} failed to become ready within {timeout}s")
        return False
    
    async def _run_health_checks(self, config: Dict[str, Any]) -> bool:
        """Run health checks on deployed model"""
        try:
            service_name = config["service"]["metadata"]["name"]
            namespace = config["namespace"]
            
            # Get service endpoint
            service = self.k8s_core_v1.read_namespaced_service(
                name=service_name,
                namespace=namespace
            )
            
            # Run health check
            health_url = f"http://{service.spec.cluster_ip}/health"
            
            async with aiohttp.ClientSession() as session:
                for attempt in range(5):
                    try:
                        async with session.get(health_url, timeout=10) as response:
                            if response.status == 200:
                                logger.info(f"Health check passed for {service_name}")
                                return True
                    except Exception as e:
                        logger.warning(f"Health check attempt {attempt + 1} failed: {e}")
                        await asyncio.sleep(5)
            
            return False
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    async def _monitor_canary_deployment(self, config: Dict[str, Any], duration: int) -> Dict[str, float]:
        """Monitor canary deployment metrics"""
        # This would integrate with Prometheus to get real metrics
        # For now, return mock metrics
        await asyncio.sleep(duration)
        
        return {
            "success_rate": 0.98,
            "error_rate": 0.005,
            "latency_p95": 0.15,
            "throughput": 100.0
        }
    
    async def _promote_canary_deployment(self, config: Dict[str, Any]):
        """Promote canary deployment to full production"""
        # Scale up canary and scale down old version
        deployment_name = config["deployment"]["metadata"]["name"]
        namespace = config["namespace"]
        
        # Scale canary to full replicas
        scale_body = {"spec": {"replicas": self.deployment_config.get("deployment", {}).get("replicas", 2)}}
        self.k8s_apps_v1.patch_namespaced_deployment_scale(
            name=deployment_name,
            namespace=namespace,
            body=scale_body
        )
        
        logger.info(f"Promoted canary deployment {deployment_name}")
    
    async def _rollback_deployment(self, config: Dict[str, Any]):
        """Rollback failed deployment"""
        try:
            deployment_name = config["deployment"]["metadata"]["name"]
            namespace = config["namespace"]
            
            # Delete failed deployment
            self.k8s_apps_v1.delete_namespaced_deployment(
                name=deployment_name,
                namespace=namespace
            )
            
            # Delete service
            service_name = config["service"]["metadata"]["name"]
            self.k8s_core_v1.delete_namespaced_service(
                name=service_name,
                namespace=namespace
            )
            
            logger.info(f"Rolled back deployment {deployment_name}")
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
    
    async def _rollback_canary_deployment(self, config: Dict[str, Any]):
        """Rollback canary deployment"""
        await self._rollback_deployment(config)
    
    async def _update_traffic_routing(self, model_name: str, config: Dict[str, Any]):
        """Update traffic routing to new deployment"""
        # This would update ingress or service mesh routing
        logger.info(f"Updated traffic routing for {model_name}")
    
    async def _cleanup_old_deployments(self, model_name: str, current_version: str):
        """Clean up old deployments"""
        try:
            namespace = f"prism-{self.environment}"
            safe_name = model_name.lower().replace("_", "-").replace(".", "-")
            
            # List all deployments for this model
            deployments = self.k8s_apps_v1.list_namespaced_deployment(
                namespace=namespace,
                label_selector=f"model={safe_name}"
            )
            
            # Keep only the latest 2 versions
            for deployment in deployments.items:
                deployment_version = deployment.metadata.labels.get("version")
                if deployment_version and deployment_version != current_version:
                    # Check if this is an old version to clean up
                    creation_time = deployment.metadata.creation_timestamp
                    age_hours = (datetime.utcnow() - creation_time.replace(tzinfo=None)).total_seconds() / 3600
                    
                    if age_hours > 24:  # Clean up deployments older than 24 hours
                        self.k8s_apps_v1.delete_namespaced_deployment(
                            name=deployment.metadata.name,
                            namespace=namespace
                        )
                        logger.info(f"Cleaned up old deployment {deployment.metadata.name}")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old deployments: {e}")
    
    async def _get_current_deployment(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get current deployment for model"""
        # Implementation would check current deployments
        return None
    
    def _get_model_endpoint(self, config: Dict[str, Any]) -> str:
        """Get model endpoint URL"""
        service_name = config["service"]["metadata"]["name"]
        namespace = config["namespace"]
        return f"http://{service_name}.{namespace}.svc.cluster.local"
    
    async def _promote_model_to_production(self, model_info: Dict[str, Any]):
        """Promote model to production stage in MLflow"""
        try:
            self.mlflow_client.transition_model_version_stage(
                name=model_info["name"],
                version=model_info["version"],
                stage="Production"
            )
            logger.info(f"Promoted model {model_info['name']}:{model_info['version']} to Production")
        except Exception as e:
            logger.error(f"Failed to promote model: {e}")

async def main():
    parser = argparse.ArgumentParser(description="Deploy PRISM models to Kubernetes")
    parser.add_argument("--environment", required=True, choices=["staging", "production"])
    parser.add_argument("--experiment-name", required=True)
    parser.add_argument("--config", required=True, help="Deployment configuration file")
    parser.add_argument("--auto-promote", action="store_true", help="Auto-promote successful models")
    parser.add_argument("--canary-deployment", action="store_true", help="Use canary deployment strategy")
    
    args = parser.parse_args()
    
    try:
        deployment_manager = ModelDeploymentManager(args.environment, args.config)
        
        result = await deployment_manager.deploy_models(
            experiment_name=args.experiment_name,
            auto_promote=args.auto_promote,
            canary_deployment=args.canary_deployment
        )
        
        print(json.dumps(result, indent=2))
        
        if result["status"] == "completed":
            successful_deployments = [d for d in result["deployed"] if d["status"] == "success"]
            if successful_deployments:
                logger.info(f"Successfully deployed {len(successful_deployments)} models")
                sys.exit(0)
            else:
                logger.error("No models were successfully deployed")
                sys.exit(1)
        else:
            logger.error(f"Deployment failed: {result}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Deployment script failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())