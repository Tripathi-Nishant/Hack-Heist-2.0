import sys
import os

# Add project root to path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, BASE_DIR)

from driftwatch.database.db import get_connection

def clear_db():
    print("Clearing database history for a fresh dashboard...")
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Clear reports and alert logs
        cur.execute("TRUNCATE TABLE alert_log CASCADE;")
        cur.execute("TRUNCATE TABLE drift_reports CASCADE;")
        
        conn.commit()
        cur.close()
        conn.close()
        print("✅ Database cleared successfully! Your dashboard is now fresh.")
    except Exception as e:
        print(f"Error clearing DB: {e}")

if __name__ == "__main__":
    clear_db()
