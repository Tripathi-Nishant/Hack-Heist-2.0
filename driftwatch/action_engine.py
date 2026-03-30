"""
Intelligent Action Engine & Cost-Aware Decision system.
"""

from typing import Dict, Any

class ActionEngine:
    # Hardcoded business costs (Hackathon Demo Defaults)
    COST_OF_RETRAIN = 500  # Cost to trigger retrain/pipeline shift
    IMPACT_PER_DRIFTED_ROW = 0.5  # Cost of a bad prediction due to drift

    @classmethod
    def analyze_drift_profile(cls, report_dict: Dict[str, Any], concept_drift: bool = False) -> Dict[str, Any]:
        """Runs the action engine on a raw drift report before finalization."""
        
        # 1. Determine Primary Drift Type
        drift_type = cls._determine_drift_type(report_dict, concept_drift)
        
        # 2. Recommended Action
        action = cls._recommend_action(drift_type)
        
        # 3. Cost-Aware Decision
        decision, confidence, calculated_impact = cls._evaluate_cost_decision(report_dict, drift_type)

        return {
            "drift_type": drift_type,
            "recommended_action": action,
            "decision": decision,
            "confidence_score": confidence,
            "estimated_impact_cost": calculated_impact
        }

    @classmethod
    def _determine_drift_type(cls, report_dict: Dict[str, Any], concept_drift: bool) -> str:
        schema = report_dict.get("schema", {})
        if schema.get("overall_severity") in ("warning", "critical"):
            return "Schema Drift"
            
        if concept_drift:
            return "Concept Drift"
            
        # Check feature level
        features = report_dict.get("features", {})
        num_drift = 0
        cat_drift = 0
        for f, details in features.items():
            if details.get("severity") in ("warning", "critical"):
                if details.get("type") == "numerical":
                    num_drift += 1
                else:
                    cat_drift += 1
                    
        if num_drift > 0:
            return "Numerical Drift"
        elif cat_drift > 0:
            return "Categorical Drift"
            
        return "No Drift"

    @classmethod
    def _recommend_action(cls, drift_type: str) -> str:
        mapping = {
            "Numerical Drift": "RECALIBRATE_THRESHOLDS",
            "Concept Drift": "RETRAIN_MODEL",
            "Schema Drift": "STOP_PIPELINE",
            "Categorical Drift": "ALERT_MONITOR",
            "No Drift": "CONTINUE"
        }
        return mapping.get(drift_type, "CONTINUE")

    @classmethod
    def _evaluate_cost_decision(cls, report_dict: Dict[str, Any], drift_type: str):
        if drift_type == "No Drift":
            return "IGNORE", 0.99, 0.0
            
        if drift_type == "Schema Drift" or drift_type == "Concept Drift":
            # For severe stuff, pause the system immediately
            if report_dict.get("overall_severity") == "critical":
                return "PAUSE", 0.95, 9999.0
                
        # Calculate impact based on drifted features and current volume
        current_rows = report_dict.get("current_rows", 0)
        drifted_count = report_dict.get("drifted_count", 0)
        features_checked = report_dict.get("features_checked", 1)  # avoid div zero
        
        # Rough heuristic: proportion of affected rows
        drift_ratio = drifted_count / features_checked
        affected_rows = current_rows * drift_ratio
        
        estimated_impact = affected_rows * cls.IMPACT_PER_DRIFTED_ROW
        
        # 3-level cost decision
        if estimated_impact > (2 * cls.COST_OF_RETRAIN):
            decision = "ACT"
            confidence = 0.92
        elif estimated_impact > cls.COST_OF_RETRAIN:
            decision = "MONITOR"
            confidence = 0.85
        else:
            decision = "IGNORE"
            confidence = 0.88
            
        # Give a small artificial bump to confidence for realism in demo
        return decision, round(confidence, 2), round(estimated_impact, 2)
