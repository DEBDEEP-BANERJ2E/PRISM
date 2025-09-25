from __future__ import annotations

import os
import json
import uuid
import time
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.neural_network import MLPClassifier
import joblib

# Optional XGBoost support
try:
    from xgboost import XGBClassifier  # type: ignore
    HAS_XGBOOST = True
except Exception:
    HAS_XGBOOST = False


# ============================
# Service and storage settings
# ============================
BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
DATASETS_DIR = STORAGE_DIR / "datasets"
ARTIFACTS_DIR = STORAGE_DIR / "artifacts"
LOGS_DIR = STORAGE_DIR / "logs"

for d in [STORAGE_DIR, DATASETS_DIR, ARTIFACTS_DIR, LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# ============================
# Pydantic schemas (API types)
# ============================
class OptimizationConfig(BaseModel):
    useAutoOptimization: bool = False
    optimizationMethod: Optional[str] = None
    parameterRanges: Optional[Dict[str, List[Any]]] = None


class TrainingConfig(BaseModel):
    trainTestSplit: float = 0.8
    validationStrategy: str = Field("holdout", pattern="^(holdout|k_fold|stratified)$")
    crossValidationFolds: Optional[int] = None
    # Non-standard but practical option to indicate label column name
    labelColumn: Optional[str] = None
    randomState: Optional[int] = 42


class ModelConfiguration(BaseModel):
    modelType: str = Field(..., pattern="^(random_forest|xgboost|neural_network|ensemble)$")
    hyperparameters: Dict[str, Any] = Field(default_factory=dict)
    trainingConfig: TrainingConfig = Field(default_factory=TrainingConfig)
    optimizationConfig: OptimizationConfig = Field(default_factory=OptimizationConfig)


class TrainRequest(BaseModel):
    datasetId: str
    configuration: ModelConfiguration


class PredictRequest(BaseModel):
    inputData: List[Dict[str, Any]]


# ============================
# In-memory job registry
# ============================
class JobState(BaseModel):
    status: str = "queued"  # queued | training | validating | completed | failed
    progress: int = 0
    logs: List[str] = Field(default_factory=list)
    currentMetrics: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    modelId: Optional[str] = None
    resultsPath: Optional[str] = None


JOBS: Dict[str, JobState] = {}


# ============================
# Helpers
# ============================

def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def log(job_id: str, message: str) -> None:
    state = JOBS.get(job_id)
    ts = _now_iso()
    entry = f"[{ts}] {message}"
    if state:
        state.logs.append(entry)
    with open(LOGS_DIR / f"{job_id}.log", "a") as f:
        f.write(entry + "\n")


def save_dataset(df: pd.DataFrame, original_filename: str) -> Dict[str, Any]:
    dataset_id = str(uuid.uuid4())
    dataset_dir = DATASETS_DIR / dataset_id
    dataset_dir.mkdir(parents=True, exist_ok=True)

    # Save parquet for fast reload
    data_path = dataset_dir / "data.parquet"
    df.to_parquet(data_path, index=False)

    meta = {
        "id": dataset_id,
        "fileName": original_filename,
        "rowCount": int(df.shape[0]),
        "columnCount": int(df.shape[1]),
        "columns": [str(c) for c in df.columns],
        "uploadedAt": _now_iso(),
        "dataPath": str(data_path)
    }
    with open(dataset_dir / "meta.json", "w") as f:
        json.dump(meta, f)

    return meta


def load_dataset_meta(dataset_id: str) -> Dict[str, Any]:
    meta_path = DATASETS_DIR / dataset_id / "meta.json"
    if not meta_path.exists():
        raise FileNotFoundError("Dataset not found")
    return json.loads(meta_path.read_text())


def load_dataset_df(dataset_id: str) -> pd.DataFrame:
    meta = load_dataset_meta(dataset_id)
    data_path = Path(meta["dataPath"]) if "dataPath" in meta else DATASETS_DIR / dataset_id / "data.parquet"
    if not data_path.exists():
        raise FileNotFoundError("Dataset data not found")
    return pd.read_parquet(data_path)


def build_preprocess_pipeline(df: pd.DataFrame, label_col: str) -> Tuple[Pipeline, List[str]]:
    features_df = df.drop(columns=[label_col])

    cat_cols = [c for c in features_df.columns if features_df[c].dtype == "object" or str(features_df[c].dtype).startswith("category")]
    num_cols = [c for c in features_df.columns if c not in cat_cols]

    numeric_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, num_cols),
            ("cat", categorical_transformer, cat_cols),
        ]
    )

    pipeline = Pipeline(steps=[("preprocess", preprocessor)])
    return pipeline, list(features_df.columns)


def build_model(config: ModelConfiguration) -> Any:
    hp = config.hyperparameters or {}
    if config.modelType == "random_forest":
        return RandomForestClassifier(
            n_estimators=int(hp.get("n_estimators", 100)),
            max_depth=None if hp.get("max_depth") in (None, "null") else int(hp.get("max_depth")),
            min_samples_split=int(hp.get("min_samples_split", 2)),
            min_samples_leaf=int(hp.get("min_samples_leaf", 1)),
            random_state=hp.get("random_state", 42),
            n_jobs=-1,
        )
    elif config.modelType == "xgboost":
        if not HAS_XGBOOST:
            raise HTTPException(status_code=400, detail="xgboost is not installed on the server. Install xgboost or choose a different modelType.")
        return XGBClassifier(
            n_estimators=int(hp.get("n_estimators", 200)),
            learning_rate=float(hp.get("learning_rate", 0.1)),
            max_depth=int(hp.get("max_depth", 6)),
            subsample=float(hp.get("subsample", 1.0)),
            colsample_bytree=float(hp.get("colsample_bytree", 1.0)),
            random_state=hp.get("random_state", 42),
            tree_method=hp.get("tree_method", "hist"),
            n_jobs=-1,
            eval_metric=hp.get("eval_metric", "logloss"),
        )
    elif config.modelType == "neural_network":
        return MLPClassifier(
            hidden_layer_sizes=tuple(hp.get("hidden_layers", [100, 50])),
            activation=hp.get("activation", "relu"),
            learning_rate_init=float(hp.get("learning_rate", 0.001)),
            batch_size=int(hp.get("batch_size", 32)),
            max_iter=int(hp.get("epochs", 100)),
            random_state=hp.get("random_state", 42),
            verbose=False,
        )
    elif config.modelType == "ensemble":
        base_models = []
        # RF
        base_models.append(("rf", build_model(ModelConfiguration(modelType="random_forest", hyperparameters=config.hyperparameters, trainingConfig=config.trainingConfig, optimizationConfig=config.optimizationConfig))))
        # XGB or MLP
        if HAS_XGBOOST:
            base_models.append(("xgb", build_model(ModelConfiguration(modelType="xgboost", hyperparameters=config.hyperparameters, trainingConfig=config.trainingConfig, optimizationConfig=config.optimizationConfig))))
        else:
            base_models.append(("mlp", build_model(ModelConfiguration(modelType="neural_network", hyperparameters=config.hyperparameters, trainingConfig=config.trainingConfig, optimizationConfig=config.optimizationConfig))))
        voting = config.hyperparameters.get("voting", "soft")
        if voting not in ("soft", "hard"):
            voting = "soft"
        return VotingClassifier(estimators=base_models, voting=voting, n_jobs=-1 if voting == "hard" else None)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported modelType: {config.modelType}")


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_proba: Optional[np.ndarray]) -> Dict[str, Any]:
    metrics: Dict[str, Any] = {}
    average = "weighted"
    metrics["accuracy"] = float(accuracy_score(y_true, y_pred))
    metrics["precision"] = float(precision_score(y_true, y_pred, average=average, zero_division=0))
    metrics["recall"] = float(recall_score(y_true, y_pred, average=average, zero_division=0))
    metrics["f1Score"] = float(f1_score(y_true, y_pred, average=average, zero_division=0))

    # ROC-AUC only when suitable
    try:
        if y_proba is not None:
            # Handle binary or multi-class
            if y_proba.ndim == 1 or y_proba.shape[1] == 1:
                proba = y_proba if y_proba.ndim == 1 else y_proba[:, 0]
                metrics["rocAuc"] = float(roc_auc_score(y_true, proba))
            else:
                metrics["rocAuc"] = float(roc_auc_score(y_true, y_proba, multi_class="ovr"))
        else:
            metrics["rocAuc"] = float("nan")
    except Exception:
        metrics["rocAuc"] = float("nan")

    cm = confusion_matrix(y_true, y_pred)
    metrics["confusionMatrix"] = cm.tolist()
    try:
        report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
        metrics["classificationReport"] = report
    except Exception:
        metrics["classificationReport"] = {}
    return metrics


# ============================
# FastAPI app
# ============================
app = FastAPI(title="Python ML Pipeline", version="0.1.0")

# CORS for local dev and Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": _now_iso()}


# ----------------------------
# Dataset upload (CSV/XLSX)
# ----------------------------
@app.post("/api/datasets/upload")
async def upload_dataset(file: UploadFile = File(...)):
    try:
        filename = file.filename or "uploaded"
        suffix = (filename.split(".")[-1] or "").lower()
        if suffix not in ("csv", "xlsx", "xls"):
            raise HTTPException(status_code=400, detail="Only CSV or Excel files are supported")

        content = await file.read()
        if suffix == "csv":
            from io import BytesIO
            df = pd.read_csv(BytesIO(content))
        else:
            from io import BytesIO
            df = pd.read_excel(BytesIO(content))

        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded dataset is empty")

        meta = save_dataset(df, filename)
        return {"success": True, "data": {"datasetId": meta["id"], "metadata": meta}, "timestamp": _now_iso()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------
# Model training
# ----------------------------
@app.post("/models/train")
async def start_training(req: TrainRequest):
    dataset_id = req.datasetId
    config = req.configuration

    # Create job
    job_id = str(uuid.uuid4())
    JOBS[job_id] = JobState(status="queued", progress=0, logs=[], currentMetrics=None, error=None, modelId=None)

    def _train_job():
        state = JOBS[job_id]
        try:
            state.status = "training"
            log(job_id, f"Loading dataset {dataset_id}")
            df = load_dataset_df(dataset_id)

            # Determine label column
            label_col = (
                config.trainingConfig.labelColumn
                or config.hyperparameters.get("label_column")
                or ("target" if "target" in df.columns else str(df.columns[-1]))
            )
            if label_col not in df.columns:
                raise ValueError(f"Label column '{label_col}' not found in dataset")

            # Shuffle for randomness
            df = df.sample(frac=1.0, random_state=config.trainingConfig.randomState).reset_index(drop=True)

            split = float(config.trainingConfig.trainTestSplit)
            if split <= 0 or split >= 1:
                split = 0.8

            n = len(df)
            n_train = max(1, int(n * split))

            preprocess, feature_cols = build_preprocess_pipeline(df, label_col)

            X = df.drop(columns=[label_col])
            y = df[label_col]

            X_train, X_test = X.iloc[:n_train], X.iloc[n_train:]
            y_train, y_test = y.iloc[:n_train], y.iloc[n_train:]

            log(job_id, f"Fitting model type={config.modelType} on {len(X_train)} samples, validating on {len(X_test)} samples")
            model = build_model(config)

            full_pipeline = Pipeline(steps=[
                ("prep", preprocess),
                ("model", model),
            ])

            # Fit
            full_pipeline.fit(X_train, y_train)
            state.progress = 60
            log(job_id, "Model fit completed")

            # Predict and metrics
            y_pred = full_pipeline.predict(X_test)
            y_proba = None
            if hasattr(full_pipeline.named_steps["model"], "predict_proba"):
                try:
                    y_proba = full_pipeline.predict_proba(X_test)
                except Exception:
                    y_proba = None

            metrics = compute_metrics(y_test.values, y_pred, y_proba)
            state.currentMetrics = metrics
            state.progress = 85
            log(job_id, f"Validation metrics: {json.dumps(metrics)}")

            # Feature importance if available
            feature_importance: Optional[Dict[str, float]] = None
            try:
                model_step = full_pipeline.named_steps["model"]
                prep_step: ColumnTransformer = full_pipeline.named_steps["prep"].named_steps["preprocess"] if isinstance(full_pipeline.named_steps["prep"], Pipeline) else full_pipeline.named_steps["prep"]
                feature_names = []
                for name, transformer, cols in prep_step.transformers_:
                    if name == "num":
                        feature_names.extend(cols)
                    elif name == "cat":
                        ohe: OneHotEncoder = transformer.named_steps["onehot"]
                        # Use feature names out_ if available
                        try:
                            ohe_feature_names = list(ohe.get_feature_names_out(cols))
                        except Exception:
                            ohe_feature_names = [f"{c}_oh" for c in cols]
                        feature_names.extend(ohe_feature_names)

                if hasattr(model_step, "feature_importances_"):
                    importances = model_step.feature_importances_
                    feature_importance = {str(k): float(v) for k, v in zip(feature_names, importances)}
                elif hasattr(model_step, "coef_"):
                    coefs = np.ravel(model_step.coef_)
                    feature_importance = {str(k): float(abs(v)) for k, v in zip(feature_names, coefs)}
            except Exception:
                feature_importance = None

            # Persist model
            model_id = str(uuid.uuid4())
            model_path = ARTIFACTS_DIR / f"{model_id}.joblib"
            joblib.dump(full_pipeline, model_path)

            metrics_path = ARTIFACTS_DIR / f"{model_id}_metrics.json"
            results_obj = {
                "id": str(uuid.uuid4()),
                "modelId": model_id,
                "configuration": json.loads(config.json()),
                "metrics": {
                    "training": metrics,  # Using same metrics for simplicity
                    "validation": {
                        "folds": 1,
                        "scores": [metrics.get("accuracy")],
                        "meanScore": metrics.get("accuracy"),
                        "stdScore": 0.0,
                        "metrics": [metrics],
                    },
                    "test": metrics,
                },
                "featureImportance": feature_importance,
                "trainingTime": 0,
                "artifacts": {
                    "modelPath": str(model_path),
                    "configPath": str(ARTIFACTS_DIR / f"{model_id}_config.json"),
                    "metricsPath": str(metrics_path),
                },
                "createdAt": _now_iso(),
            }
            metrics_path.write_text(json.dumps(results_obj))

            # Save config
            (ARTIFACTS_DIR / f"{model_id}_config.json").write_text(config.json())

            state.modelId = model_id
            state.resultsPath = str(metrics_path)
            state.status = "completed"
            state.progress = 100
            log(job_id, f"Training complete. modelId={model_id}")
        except Exception as e:
            state.status = "failed"
            state.error = str(e)
            state.progress = min(state.progress, 95)
            log(job_id, f"Training failed: {e}")

    t = threading.Thread(target=_train_job, daemon=True)
    t.start()

    return {"trainingJobId": job_id, "estimatedDuration": 180}


@app.get("/models/train/{job_id}/progress")
async def training_progress(job_id: str):
    state = JOBS.get(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "status": state.status,
        "progress": state.progress,
        "currentMetrics": state.currentMetrics,
        "logs": state.logs[-100:],
        "error": state.error,
    }


@app.get("/models/train/{job_id}/results")
async def training_results(job_id: str):
    state = JOBS.get(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="Job not found")
    if state.status != "completed" or not state.resultsPath:
        raise HTTPException(status_code=400, detail="Results not available yet")
    try:
        return json.loads(Path(state.resultsPath).read_text())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------
# Model management and predict
# ----------------------------
@app.get("/models")
async def list_models():
    models = []
    for p in ARTIFACTS_DIR.glob("*_metrics.json"):
        try:
            data = json.loads(p.read_text())
            models.append({
                "id": data.get("modelId"),
                "name": f"Model {data.get('modelId')[:8]}",
                "type": data.get("configuration", {}).get("modelType"),
                "metrics": data.get("metrics", {}).get("test"),
                "trainingTime": data.get("trainingTime"),
                "createdAt": data.get("createdAt"),
            })
        except Exception:
            continue
    return {"models": models}


@app.delete("/models/{model_id}")
async def delete_model(model_id: str):
    paths = [ARTIFACTS_DIR / f"{model_id}.joblib", ARTIFACTS_DIR / f"{model_id}_metrics.json", ARTIFACTS_DIR / f"{model_id}_config.json"]
    deleted = 0
    for p in paths:
        if p.exists():
            p.unlink()
            deleted += 1
    return {"deleted": deleted}


@app.post("/models/{model_id}/predict")
async def predict(model_id: str, req: PredictRequest):
    model_path = ARTIFACTS_DIR / f"{model_id}.joblib"
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    try:
        pipe: Pipeline = joblib.load(model_path)
        X = pd.DataFrame(req.inputData)
        preds = pipe.predict(X)
        response: Dict[str, Any] = {
            "predictions": [str(p) for p in preds],
            "confidence": [],
            "modelMetadata": {"modelId": model_id}
        }
        if hasattr(pipe.named_steps.get("model"), "predict_proba"):
            try:
                proba = pipe.predict_proba(X)
                if proba.ndim == 1:
                    response["confidence"] = [float(p) for p in proba]
                else:
                    # Max probability per sample
                    response["confidence"] = [float(np.max(row)) for row in proba]
            except Exception:
                response["confidence"] = []
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models/{model_id}/feature-importance")
async def feature_importance(model_id: str):
    model_path = ARTIFACTS_DIR / f"{model_id}.joblib"
    metrics_path = ARTIFACTS_DIR / f"{model_id}_metrics.json"
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    try:
        data = json.loads(metrics_path.read_text()) if metrics_path.exists() else {}
        fi = data.get("featureImportance")
        return {"featureImportance": fi or {}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models/{model_id}/metrics")
async def model_metrics(model_id: str):
    metrics_path = ARTIFACTS_DIR / f"{model_id}_metrics.json"
    if not metrics_path.exists():
        raise HTTPException(status_code=404, detail="Model metrics not found")
    return json.loads(metrics_path.read_text()).get("metrics", {})


@app.get("/models/{model_id}/data-distributions")
async def data_distributions(model_id: str):
    # Basic placeholder: derive from training config if available later
    return {"message": "Not implemented in this minimal version"}


@app.post("/models/compare")
async def compare_models(modelIds: Dict[str, List[str]]):
    ids = modelIds.get("modelIds", [])
    out = {}
    for mid in ids:
        metrics_path = ARTIFACTS_DIR / f"{mid}_metrics.json"
        if metrics_path.exists():
            data = json.loads(metrics_path.read_text())
            out[mid] = data.get("metrics", {}).get("test")
    return out


@app.get("/models/{model_id}/export")
async def export_model(model_id: str, format: str = "json"):
    metrics_path = ARTIFACTS_DIR / f"{model_id}_metrics.json"
    if not metrics_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    data = json.loads(metrics_path.read_text())

    if format == "json":
        return JSONResponse(content=data)
    elif format == "csv":
        # Export feature importance as CSV when present
        fi = data.get("featureImportance") or {}
        if not fi:
            return JSONResponse(content={"message": "No feature importance available"})
        import io, csv
        s = io.StringIO()
        w = csv.writer(s)
        w.writerow(["feature", "importance"])
        for k, v in fi.items():
            w.writerow([k, v])
        return JSONResponse(content={"csv": s.getvalue()})
    elif format == "excel":
        # Return JSON with base64 of excel would be heavy; keep JSON response placeholder
        return JSONResponse(content={"message": "Excel export not implemented in minimal version"})
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")


# ----------------------------
# Preprocess endpoints (minimal)
# ----------------------------
@app.post("/preprocess")
async def start_preprocess(payload: Dict[str, Any]):
    job_id = str(uuid.uuid4())
    JOBS[job_id] = JobState(status="processing", progress=0, logs=[], currentMetrics=None, error=None)

    def _job():
        try:
            for i in range(5):
                time.sleep(0.3)
                JOBS[job_id].progress = (i + 1) * 20
                log(job_id, f"Preprocessing step {i+1}/5")
            JOBS[job_id].status = "completed"
        except Exception as e:
            JOBS[job_id].status = "failed"
            JOBS[job_id].error = str(e)

    threading.Thread(target=_job, daemon=True).start()
    return {"jobId": job_id, "estimatedDuration": 10}


@app.get("/preprocess/{job_id}/status")
async def preprocess_status(job_id: str):
    state = JOBS.get(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "status": "completed" if state.status == "completed" else ("processing" if state.status in ("processing", "training") else state.status),
        "progress": state.progress,
        "result": None,
        "error": state.error,
    }


# Compatibility routes expected by web-dashboard frontend
@app.get("/api/data-science/model-types")
async def ds_model_types():
    return {
        "success": True,
        "data": {
            "modelTypes": [
                {
                    "type": "random_forest",
                    "name": "Random Forest",
                    "description": "Ensemble method using multiple decision trees. Good for most tabular data problems.",
                    "defaultHyperparameters": {
                        "n_estimators": 100,
                        "max_depth": None,
                        "min_samples_split": 2,
                        "min_samples_leaf": 1,
                        "random_state": 42
                    }
                },
                {
                    "type": "xgboost",
                    "name": "XGBoost",
                    "description": "Gradient boosting framework optimized for speed and performance.",
                    "defaultHyperparameters": {
                        "n_estimators": 100,
                        "learning_rate": 0.1,
                        "max_depth": 6,
                        "subsample": 1.0,
                        "colsample_bytree": 1.0,
                        "random_state": 42
                    }
                },
                {
                    "type": "neural_network",
                    "name": "Neural Network",
                    "description": "Multi-layer perceptron for complex pattern recognition.",
                    "defaultHyperparameters": {
                        "hidden_layers": [100, 50],
                        "activation": "relu",
                        "learning_rate": 0.001,
                        "batch_size": 32,
                        "epochs": 100,
                        "dropout": 0.2,
                        "random_state": 42
                    }
                },
                {
                    "type": "ensemble",
                    "name": "Ensemble",
                    "description": "Combines multiple models for improved performance and robustness.",
                    "defaultHyperparameters": {
                        "models": ["random_forest", "xgboost"],
                        "voting": "soft",
                        "weights": None
                    }
                }
            ]
        },
        "timestamp": _now_iso()
    }

@app.post("/api/data-science/validate-configuration")
async def ds_validate_config(payload: Dict[str, Any]):
    cfg = payload.get("configuration")
    if not cfg:
        return {"success": True, "data": {"isValid": False, "errors": [{"field": "configuration", "message": "Missing", "code": "MISSING"}], "warnings": []}, "timestamp": _now_iso()}
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []
    try:
        mc = ModelConfiguration(**cfg)
    except Exception as e:
        errors.append({"field": "configuration", "message": str(e), "code": "INVALID"})
        return {"success": True, "data": {"isValid": False, "errors": errors, "warnings": warnings}, "timestamp": _now_iso()}

    if mc.trainingConfig.trainTestSplit <= 0.1 or mc.trainingConfig.trainTestSplit >= 0.9:
        errors.append({"field": "trainingConfig.trainTestSplit", "message": "Train/test split must be between 0.1 and 0.9", "code": "INVALID_SPLIT_RATIO", "value": mc.trainingConfig.trainTestSplit})
    if mc.trainingConfig.validationStrategy == "k_fold":
        if not mc.trainingConfig.crossValidationFolds or mc.trainingConfig.crossValidationFolds < 2:
            errors.append({"field": "trainingConfig.crossValidationFolds", "message": "Cross-validation folds must be at least 2", "code": "INVALID_CV_FOLDS", "value": mc.trainingConfig.crossValidationFolds})

    if mc.modelType == "xgboost" and not HAS_XGBOOST:
        warnings.append({"field": "modelType", "message": "xgboost not installed on server", "code": "MISSING_DEP"})

    hp = mc.hyperparameters or {}
    if mc.modelType == "xgboost" and "learning_rate" in hp:
        try:
            lr = float(hp["learning_rate"])
            if lr <= 0 or lr > 1:
                errors.append({"field": "hyperparameters.learning_rate", "message": "learning_rate must be between 0 and 1", "code": "INVALID_HYPERPARAMETER", "value": lr})
        except Exception:
            errors.append({"field": "hyperparameters.learning_rate", "message": "learning_rate must be numeric", "code": "INVALID_HYPERPARAMETER"})
    if mc.modelType == "neural_network" and "hidden_layers" in hp and not isinstance(hp["hidden_layers"], (list, tuple)):
        errors.append({"field": "hyperparameters.hidden_layers", "message": "hidden_layers must be an array", "code": "INVALID_HYPERPARAMETER", "value": hp["hidden_layers"]})

    return {"success": True, "data": {"isValid": len(errors) == 0, "errors": errors, "warnings": warnings}, "timestamp": _now_iso()}

@app.post("/api/data-science/train")
async def ds_train(payload: Dict[str, Any]):
    req = TrainRequest(**payload)
    return await start_training(req)

@app.get("/api/data-science/training/{job_id}/status")
async def ds_training_status(job_id: str):
    return await training_progress(job_id)

@app.get("/api/data-science/training/{job_id}/progress")
async def ds_training_progress(job_id: str):
    return await training_progress(job_id)

@app.get("/api/data-science/training/{job_id}/results")
async def ds_training_results(job_id: str):
    return await training_results(job_id)

@app.get("/api/data-science/models")
async def ds_models():
    return await list_models()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "3001"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
