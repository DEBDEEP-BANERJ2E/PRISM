import logging
import asyncio
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid
import aiohttp
import yaml
from kubernetes import client, config
from kubernetes.client.rest import ApiException
import mlflow
from mlflow.tracking import MlflowClient

logger = logging.getLogger(__name__)

class DeploymentManager:
    """Manages model deployments to Kubernetes"""
    
    def __init__(self):
        self.mlflow_client = MlflowClient()
        self.deployments = {}  # In-memory store, should use persistent storage in production
        
        # Initialize Kubernetes client
        try:
            config.load_incluster_config()  # For in-cluster deployment
        except:
            try:
                config.load_kube_config()  # For local development
            except:
                logger.warning("Could not load Kubernetes config")
        
        self.k8s_apps_v1 = client.AppsV1Api()
        self.k8s_core_v1 = client.CoreV1Api()
        self.k8s_networking_v1 = client.NetworkingV1Api()
    
    async def deploy_model(
        self,
        model_name: str,
        model_version: str,
        deployment_config: Dict[str, Any],
        target_environment: str
    ) -> Dict[str, Any]:
        """Deploy model to Kubernetes"""
        try:
            deployment_id = str(uuid.uuid4())
            
            # Get model information
            model_version_obj = self.mlflow_client.get_model_version(model_name, model_version)
            model_uri = f"models:/{model_name}/{model_version}"
            
            # Create deployment configuration
            k8s_config = self._create_k8s_deployment_config(
                deployment_id=deployment_id,
                model_name=model_name,
                model_version=model_version,
                model_uri=model_uri,
                deployment_config=deployment_config,
                environment=target_environment
            )
            
            # Deploy to Kubernetes
            await self._deploy_to_k8s(k8s_config, target_environment)
            
            # Store deployment metadata
            deployment_metadata = {
                "deployment_id": deployment_id,
                "model_name": model_name,
                "model_version": model_version,
                "model_uri": model_uri,
                "environment": target_environment,
                "config": deployment_config,
                "status": "deploying",
                "created_at": datetime.utcnow().isoformat(),
                "k8s_resources": k8s_config
            }
            
            self.deployments[deployment_id] = deployment_metadata
            
            # Start monitoring deployment
            asyncio.create_task(self._monitor_deployment(deployment_id))
            
            logger.info(f"Started deployment {deployment_id} for model {model_name}:{model_version}")
            
            return {
                "deployment_id": deployment_id,
                "status": "deploying",
                "model": f"{model_name}:{model_version}",
                "environment": target_environment,
                "created_at": deployment_metadata["created_at"]
            }
            
        except Exception as e:
            logger.error(f"Failed to deploy model {model_name}:{model_version}: {e}")
            raise
    
    def _create_k8s_deployment_config(
        self,
        deployment_id: str,
        model_name: str,
        model_version: str,
        model_uri: str,
        deployment_config: Dict[str, Any],
        environment: str
    ) -> Dict[str, Any]:
        """Create Kubernetes deployment configuration"""
        
        # Sanitize names for Kubernetes
        safe_model_name = model_name.lower().replace("_", "-").replace(".", "-")
        deployment_name = f"prism-model-{safe_model_name}-{model_version}-{deployment_id[:8]}"
        
        # Default configuration
        default_config = {
            "replicas": 2,
            "cpu_request": "500m",
            "cpu_limit": "2000m",
            "memory_request": "1Gi",
            "memory_limit": "4Gi",
            "port": 8080,
            "health_check_path": "/health",
            "model_serving_framework": "mlflow"
        }
        
        # Merge with provided config
        config_merged = {**default_config, **deployment_config}
        
        # Create deployment manifest
        deployment_manifest = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": deployment_name,
                "namespace": f"prism-{environment}",
                "labels": {
                    "app": deployment_name,
                    "model": safe_model_name,
                    "version": model_version,
                    "environment": environment,
                    "deployment-id": deployment_id,
                    "managed-by": "prism-mlops"
                }
            },
            "spec": {
                "replicas": config_merged["replicas"],
                "selector": {
                    "matchLabels": {
                        "app": deployment_name
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": deployment_name,
                            "model": safe_model_name,
                            "version": model_version
                        }
                    },
                    "spec": {
                        "containers": [{
                            "name": "model-server",
                            "image": self._get_model_serving_image(config_merged["model_serving_framework"]),
                            "ports": [{
                                "containerPort": config_merged["port"]
                            }],
                            "env": [
                                {"name": "MLFLOW_MODEL_URI", "value": model_uri},
                                {"name": "MLFLOW_TRACKING_URI", "value": mlflow.get_tracking_uri()},
                                {"name": "MODEL_NAME", "value": model_name},
                                {"name": "MODEL_VERSION", "value": model_version},
                                {"name": "DEPLOYMENT_ID", "value": deployment_id},
                                {"name": "ENVIRONMENT", "value": environment}
                            ],
                            "resources": {
                                "requests": {
                                    "cpu": config_merged["cpu_request"],
                                    "memory": config_merged["memory_request"]
                                },
                                "limits": {
                                    "cpu": config_merged["cpu_limit"],
                                    "memory": config_merged["memory_limit"]
                                }
                            },
                            "livenessProbe": {
                                "httpGet": {
                                    "path": config_merged["health_check_path"],
                                    "port": config_merged["port"]
                                },
                                "initialDelaySeconds": 30,
                                "periodSeconds": 10
                            },
                            "readinessProbe": {
                                "httpGet": {
                                    "path": config_merged["health_check_path"],
                                    "port": config_merged["port"]
                                },
                                "initialDelaySeconds": 5,
                                "periodSeconds": 5
                            }
                        }]
                    }
                }
            }
        }
        
        # Create service manifest
        service_manifest = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": f"{deployment_name}-service",
                "namespace": f"prism-{environment}",
                "labels": {
                    "app": deployment_name,
                    "model": safe_model_name,
                    "version": model_version
                }
            },
            "spec": {
                "selector": {
                    "app": deployment_name
                },
                "ports": [{
                    "port": 80,
                    "targetPort": config_merged["port"],
                    "protocol": "TCP"
                }],
                "type": "ClusterIP"
            }
        }
        
        # Create ingress manifest if external access is needed
        ingress_manifest = None
        if config_merged.get("external_access", False):
            ingress_manifest = {
                "apiVersion": "networking.k8s.io/v1",
                "kind": "Ingress",
                "metadata": {
                    "name": f"{deployment_name}-ingress",
                    "namespace": f"prism-{environment}",
                    "annotations": {
                        "nginx.ingress.kubernetes.io/rewrite-target": "/",
                        "cert-manager.io/cluster-issuer": "letsencrypt-prod"
                    }
                },
                "spec": {
                    "tls": [{
                        "hosts": [f"{deployment_name}.prism.mining"],
                        "secretName": f"{deployment_name}-tls"
                    }],
                    "rules": [{
                        "host": f"{deployment_name}.prism.mining",
                        "http": {
                            "paths": [{
                                "path": "/",
                                "pathType": "Prefix",
                                "backend": {
                                    "service": {
                                        "name": f"{deployment_name}-service",
                                        "port": {"number": 80}
                                    }
                                }
                            }]
                        }
                    }]
                }
            }
        
        return {
            "deployment": deployment_manifest,
            "service": service_manifest,
            "ingress": ingress_manifest,
            "deployment_name": deployment_name,
            "namespace": f"prism-{environment}"
        }
    
    def _get_model_serving_image(self, framework: str) -> str:
        """Get appropriate model serving image"""
        images = {
            "mlflow": "prism/mlflow-server:latest",
            "torchserve": "pytorch/torchserve:latest",
            "tensorflow": "tensorflow/serving:latest",
            "triton": "nvcr.io/nvidia/tritonserver:latest"
        }
        return images.get(framework, images["mlflow"])
    
    async def _deploy_to_k8s(self, k8s_config: Dict[str, Any], environment: str):
        """Deploy resources to Kubernetes"""
        try:
            namespace = k8s_config["namespace"]
            
            # Ensure namespace exists
            await self._ensure_namespace(namespace)
            
            # Deploy resources
            deployment_result = self.k8s_apps_v1.create_namespaced_deployment(
                namespace=namespace,
                body=k8s_config["deployment"]
            )
            
            service_result = self.k8s_core_v1.create_namespaced_service(
                namespace=namespace,
                body=k8s_config["service"]
            )
            
            ingress_result = None
            if k8s_config["ingress"]:
                ingress_result = self.k8s_networking_v1.create_namespaced_ingress(
                    namespace=namespace,
                    body=k8s_config["ingress"]
                )
            
            logger.info(f"Successfully deployed resources to namespace {namespace}")
            
        except ApiException as e:
            logger.error(f"Kubernetes API error during deployment: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to deploy to Kubernetes: {e}")
            raise
    
    async def _ensure_namespace(self, namespace: str):
        """Ensure namespace exists"""
        try:
            self.k8s_core_v1.read_namespace(namespace)
        except ApiException as e:
            if e.status == 404:
                # Create namespace
                namespace_manifest = {
                    "apiVersion": "v1",
                    "kind": "Namespace",
                    "metadata": {
                        "name": namespace,
                        "labels": {
                            "managed-by": "prism-mlops"
                        }
                    }
                }
                self.k8s_core_v1.create_namespace(body=namespace_manifest)
                logger.info(f"Created namespace {namespace}")
            else:
                raise
    
    async def _monitor_deployment(self, deployment_id: str):
        """Monitor deployment status"""
        try:
            deployment_info = self.deployments[deployment_id]
            deployment_name = deployment_info["k8s_resources"]["deployment_name"]
            namespace = deployment_info["k8s_resources"]["namespace"]
            
            # Wait for deployment to be ready
            max_wait_time = 600  # 10 minutes
            wait_interval = 10
            elapsed_time = 0
            
            while elapsed_time < max_wait_time:
                try:
                    deployment = self.k8s_apps_v1.read_namespaced_deployment(
                        name=deployment_name,
                        namespace=namespace
                    )
                    
                    if deployment.status.ready_replicas == deployment.spec.replicas:
                        # Deployment is ready
                        self.deployments[deployment_id]["status"] = "ready"
                        self.deployments[deployment_id]["ready_at"] = datetime.utcnow().isoformat()
                        logger.info(f"Deployment {deployment_id} is ready")
                        break
                    
                except ApiException as e:
                    if e.status == 404:
                        logger.warning(f"Deployment {deployment_name} not found")
                        break
                
                await asyncio.sleep(wait_interval)
                elapsed_time += wait_interval
            
            if elapsed_time >= max_wait_time:
                self.deployments[deployment_id]["status"] = "timeout"
                logger.error(f"Deployment {deployment_id} timed out")
            
        except Exception as e:
            logger.error(f"Failed to monitor deployment {deployment_id}: {e}")
            self.deployments[deployment_id]["status"] = "error"
            self.deployments[deployment_id]["error"] = str(e)
    
    async def list_deployments(self) -> List[Dict[str, Any]]:
        """List all deployments"""
        return list(self.deployments.values())
    
    async def get_deployment(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Get deployment details"""
        deployment = self.deployments.get(deployment_id)
        
        if deployment:
            # Get current Kubernetes status
            try:
                deployment_name = deployment["k8s_resources"]["deployment_name"]
                namespace = deployment["k8s_resources"]["namespace"]
                
                k8s_deployment = self.k8s_apps_v1.read_namespaced_deployment(
                    name=deployment_name,
                    namespace=namespace
                )
                
                deployment["k8s_status"] = {
                    "replicas": k8s_deployment.spec.replicas,
                    "ready_replicas": k8s_deployment.status.ready_replicas or 0,
                    "available_replicas": k8s_deployment.status.available_replicas or 0,
                    "conditions": [
                        {
                            "type": condition.type,
                            "status": condition.status,
                            "reason": condition.reason,
                            "message": condition.message
                        }
                        for condition in (k8s_deployment.status.conditions or [])
                    ]
                }
                
            except ApiException:
                deployment["k8s_status"] = {"error": "Could not fetch Kubernetes status"}
        
        return deployment
    
    async def delete_deployment(self, deployment_id: str) -> Dict[str, Any]:
        """Delete a deployment"""
        try:
            deployment = self.deployments.get(deployment_id)
            if not deployment:
                raise ValueError(f"Deployment {deployment_id} not found")
            
            deployment_name = deployment["k8s_resources"]["deployment_name"]
            namespace = deployment["k8s_resources"]["namespace"]
            
            # Delete Kubernetes resources
            try:
                self.k8s_apps_v1.delete_namespaced_deployment(
                    name=deployment_name,
                    namespace=namespace
                )
            except ApiException as e:
                if e.status != 404:
                    raise
            
            try:
                self.k8s_core_v1.delete_namespaced_service(
                    name=f"{deployment_name}-service",
                    namespace=namespace
                )
            except ApiException as e:
                if e.status != 404:
                    raise
            
            if deployment["k8s_resources"]["ingress"]:
                try:
                    self.k8s_networking_v1.delete_namespaced_ingress(
                        name=f"{deployment_name}-ingress",
                        namespace=namespace
                    )
                except ApiException as e:
                    if e.status != 404:
                        raise
            
            # Remove from local store
            del self.deployments[deployment_id]
            
            logger.info(f"Deleted deployment {deployment_id}")
            
            return {
                "deployment_id": deployment_id,
                "status": "deleted",
                "deleted_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to delete deployment {deployment_id}: {e}")
            raise
    
    async def scale_deployment(self, deployment_id: str, replicas: int) -> Dict[str, Any]:
        """Scale a deployment"""
        try:
            deployment = self.deployments.get(deployment_id)
            if not deployment:
                raise ValueError(f"Deployment {deployment_id} not found")
            
            deployment_name = deployment["k8s_resources"]["deployment_name"]
            namespace = deployment["k8s_resources"]["namespace"]
            
            # Update deployment replicas
            body = {"spec": {"replicas": replicas}}
            self.k8s_apps_v1.patch_namespaced_deployment_scale(
                name=deployment_name,
                namespace=namespace,
                body=body
            )
            
            # Update local store
            deployment["config"]["replicas"] = replicas
            deployment["scaled_at"] = datetime.utcnow().isoformat()
            
            logger.info(f"Scaled deployment {deployment_id} to {replicas} replicas")
            
            return {
                "deployment_id": deployment_id,
                "replicas": replicas,
                "status": "scaling",
                "scaled_at": deployment["scaled_at"]
            }
            
        except Exception as e:
            logger.error(f"Failed to scale deployment {deployment_id}: {e}")
            raise