import os
import sys
import uvicorn
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier

# Add project root to path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

from driftwatch.sdk import DriftWatcher
from driftwatch.utils.logger import get_logger

logger = get_logger("model_server")
app = FastAPI(title="DriftWatch - Real-World Model Server")

# Global variables
TRAIN_DATA = os.path.join(BASE_DIR, "data", "samples", "train.csv")
API_URL    = os.getenv("API_URL", "http://localhost:8010/api/v1/check")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", 5))

model = None
watcher = None
in_memory_batch = []
needs_retrain = False # New flag for deferred reset

class InferenceRequest(BaseModel):
    age: int
    income: float
    credit_score: int
    transaction_amount: float
    num_transactions: int
    region: str

class InferenceResponse(BaseModel):
    prediction: int
    probability: float
    timestamp: str

@app.post("/predict", response_model=InferenceResponse)
async def predict(req: InferenceRequest):
    global in_memory_batch, model, needs_retrain
    
    data_dict = req.dict()
    in_memory_batch.append(data_dict)
    
    features = ["age", "income", "credit_score", "transaction_amount", "num_transactions"]
    df = pd.DataFrame([data_dict])
    X = df[features]
    
    pred = model.predict(X)[0]
    proba = model.predict_proba(X)[0][1]
    
    # Check for retrain signal
    if os.path.exists("RETRAIN_SIGNAL"):
        logger.info("♻️ RETRAIN SIGNAL QUEUED. Waiting for full batch completion to re-baseline...")
        needs_retrain = True
        try:
            os.remove("RETRAIN_SIGNAL")
        except:
            pass
    
    if len(in_memory_batch) >= BATCH_SIZE:
        import threading
        # Run drift check in background
        threading.Thread(target=trigger_drift_check, args=(list(in_memory_batch),)).start()
        
        # If we need to retrain, use this full batch as the new reference
        if needs_retrain:
            try:
                logger.info("🛠️ RETRAINING IN PROGRESS... Updating model reference.")
                new_ref = pd.DataFrame(list(in_memory_batch))
                watcher.set_reference(new_ref)
                needs_retrain = False
                logger.info("✅ MODEL RETRAINED. System should now report STABLE.")
            except Exception as e:
                logger.error(f"Retrain failed: {e}")
                
        in_memory_batch = []
    
    return InferenceResponse(
        prediction=int(pred),
        probability=float(proba),
        timestamp=datetime.utcnow().isoformat()
    )

def trigger_drift_check(batch_data):
    logger.info(f"🚀 Processing batch of {len(batch_data)} for drift...")
    serving_df = pd.DataFrame(batch_data)
    
    try:
        # 1. Local check
        report = watcher.check(serving_df, tag=f"prod_batch_{datetime.now().strftime('%H%M%S')}")
        logger.info(f"Drift Results: {report.severity.upper()} | Drifted: {report.drifted_features}")
        
        # 2. Sync to Dashboard API
        import requests
        payload = {
            "training": watcher._reference.to_dict(orient="records"),
            "serving":  serving_df.to_dict(orient="records"),
            "label_column": "is_fraud",
            "explain": True
        }
        requests.post(API_URL, json=payload, timeout=10)
        logger.info("✓ Synced to Dashboard")
    except Exception as e:
        logger.error(f"Drift check failed: {e}")

@app.get("/health")
def health():
    return {"status": "ok", "batch_queue": len(in_memory_batch), "model_ready": model is not None}

def startup():
    global model, watcher
    print("--- STARTING MODEL SERVER ---", flush=True)
    try:
        print(f"Reading training data: {TRAIN_DATA}", flush=True)
        train_df = pd.read_csv(TRAIN_DATA)
        
        print("Initializing DriftWatcher SDK...", flush=True)
        # Ensure reference matches the serving data (plus label) to avoid false Schema Drift
        ref_cols = ["age", "income", "credit_score", "transaction_amount", "num_transactions", "region", "is_fraud"]
        watcher = DriftWatcher(reference=train_df[ref_cols].copy(), label_column="is_fraud")
        
        print("Training RandomForest model...", flush=True)
        FEATURES = ["age", "income", "credit_score", "transaction_amount", "num_transactions"]
        TARGET   = "is_fraud"
        train_clean = train_df[FEATURES + [TARGET]].dropna()
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(train_clean[FEATURES], train_clean[TARGET])
        
        print("✓ All systems ready", flush=True)
    except Exception as e:
        print(f"FATAL ERROR DURING STARTUP: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    startup()
    uvicorn.run(app, host="0.0.0.0", port=8011)
