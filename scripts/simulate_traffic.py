import time
import requests
import random
import pandas as pd
from datetime import datetime

# URLs
# URLs (Update with your EC2 IP for remote simulation)
MODEL_URL = "http://65.2.180.52:8011/predict"

def generate_sample(drift=False):
    """Generate a single inference request."""
    if not drift:
        return {
            "age": max(18, int(random.gauss(34.1, 9.4))),
            "income": max(10000.0, random.gauss(54900, 15000)),
            "credit_score": max(300, min(850, int(random.gauss(675, 78)))),
            "transaction_amount": max(1.0, random.expovariate(1 / 141.1)),
            "num_transactions": max(1, int(random.gauss(8.1, 2.9))),
            "region": random.choices(
                ["south", "north", "east", "west"], 
                weights=[0.31, 0.30, 0.20, 0.19]
            )[0]
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

def run_simulation(total_requests=100, drift_start_at=20):
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
            
        # Fast simulation
        time.sleep(0.1)

    print("-" * 50)
    print("✅ Simulation Complete.")

if __name__ == "__main__":
    run_simulation()
