import time
import requests
import random
import pandas as pd
from datetime import datetime
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TRAIN_DATA = os.path.join(BASE_DIR, "data", "samples", "train.csv")

try:
    train_df = pd.read_csv(TRAIN_DATA)
    # Filter out label and account_type
    ref_cols = ["age", "income", "credit_score", "transaction_amount", "num_transactions", "region"]
    normal_samples = train_df[ref_cols].dropna().to_dict(orient="records")
except Exception as e:
    print(f"Warning: could not load train.csv for exact sampling. {e}")
    normal_samples = []

# URLs
# URLs (Update with your EC2 IP for remote simulation)
MODEL_URL = MODEL_URL = "http://13.233.208.13:8011/predict"

def generate_sample(drift=False):
    """Generate a single inference request."""
    if not drift and normal_samples:
        rec = random.choice(normal_samples)
        return {
            "age": int(rec["age"]),
            "income": float(rec["income"]),
            "credit_score": int(rec["credit_score"]),
            "transaction_amount": float(rec["transaction_amount"]),
            "num_transactions": int(rec["num_transactions"]),
            "region": str(rec["region"])
        }
    elif not drift:
        # Fallback pseudo-random if train.csv fails
        return {
            "age": max(18, int(random.gauss(34.1, 9.4))),
            "income": max(10000.0, random.gauss(54900, 15000)),
            "credit_score": max(300, min(850, int(random.gauss(675, 78)))),
            "transaction_amount": max(1.0, random.expovariate(1 / 141.1)),
            "num_transactions": max(1, int(random.gauss(8.1, 2.9))),
            "region": random.choices(["south", "north", "east", "west"], weights=[0.31, 0.30, 0.20, 0.19])[0]
        }
    else:
        # DRIFT: Transactions are much larger, users are older
        return {
            "age": int(random.gauss(55, 5)), # Older
            "income": max(10000.0, random.gauss(50000, 15000)),
            "credit_score": int(random.gauss(650, 80)), # Worse credit
            "transaction_amount": random.uniform(2000, 5000), # EXPLODED
            "num_transactions": random.randint(5, 50),
            "region": "international" # NEW CATEGORY
        }

def run_simulation(total_requests=200, drift_start_at=5):
    print(f"🚀 Starting Traffic Simulation at {datetime.now()}")
    print(f"Targeting: {MODEL_URL}")
    print("-" * 50)
    
    for i in range(total_requests):
        is_drifted = (i >= drift_start_at)
        sample = generate_sample(drift=is_drifted)
        
        try:
            resp = requests.post(MODEL_URL, json=sample)
            if resp.status_code == 200:
                print(f"[{i:03d}] {'🔴 DRIFT' if is_drifted else '🟢 NORMAL'} | {sample['transaction_amount']:7.2f} | {resp.json()['probability']:.4f}")
            else:
                print(f"[{i:03d}] Error: {resp.text}")
        except Exception as e:
            print(f"[{i:03d}] Connection Failed: {e}")
            break
            
        # Measured pace for demo readability
        time.sleep(0.5)

    print("-" * 50)
    print("✅ Simulation Complete.")

if __name__ == "__main__":
    run_simulation()
