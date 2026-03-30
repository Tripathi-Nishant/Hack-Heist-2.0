from driftwatch.action_engine import ActionEngine
import pytest

def test_concept_drift_action():
    report = {
        "overall_severity": "critical",
        "features_checked": 10,
        "drifted_count": 0,
        "schema": {"overall_severity": "stable"},
        "features": {},
        "current_rows": 1000
    }
    
    # 1. Action Engine should identify concept drift if passed
    result = ActionEngine.analyze_drift_profile(report, concept_drift=True)
    assert result["drift_type"] == "Concept Drift"
    assert result["recommended_action"] == "RETRAIN_MODEL"
    assert result["decision"] == "PAUSE" # Severe concept drift pauses pipeline
    
def test_cost_decision():
    report = {
        "overall_severity": "warning",
        "features_checked": 10,
        "drifted_count": 5, # 50%
        "schema": {"overall_severity": "stable"},
        "features": {"price": {"severity": "warning", "type":"numerical"}},
        "current_rows": 5000 # 5000 * 0.5 = 2500 affected * 0.5 = 1250 impact > cost(500)*2 -> ACT
    }
    
    result = ActionEngine.analyze_drift_profile(report, concept_drift=False)
    assert result["drift_type"] == "Numerical Drift"
    assert result["recommended_action"] == "RECALIBRATE_THRESHOLDS"
    assert result["decision"] == "ACT"
    assert result["estimated_impact_cost"] == 1250.0

def test_schema_drift():
    report = {
        "overall_severity": "critical",
        "features_checked": 10,
        "drifted_count": 0,
        "schema": {"overall_severity": "critical"},
        "features": {},
        "current_rows": 1000
    }
    
    result = ActionEngine.analyze_drift_profile(report, concept_drift=False)
    assert result["drift_type"] == "Schema Drift"
    assert result["recommended_action"] == "STOP_PIPELINE"
    assert result["decision"] == "PAUSE"
