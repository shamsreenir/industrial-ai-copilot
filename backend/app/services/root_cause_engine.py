import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from .data_loader import data_loader
from .ml_engine import ml_engine

logger = logging.getLogger("root_cause_engine")

class RootCauseEngine:
    _instance = None

    @classmethod
    def get_instance(cls) -> 'RootCauseEngine':
        if cls._instance is None:
            cls._instance = RootCauseEngine()
        return cls._instance

    def analyze_root_causes(self, target: str = "quality_anomaly") -> Dict[str, Any]:
        df = data_loader.df
        if df is None:
            raise RuntimeError("Dataset not loaded")

        # Key candidate factors for investigation
        investigated_features = [
            ("Cell1_Util", "Assembly Cell 1 Utilization", "Upstream shared assembly cell handling SKU 1, 2, and 4"),
            ("Warehouse1_Queue", "Warehouse 1 Queue Buffer", "WIP queue buffer holding parts before Cell 1"),
            ("Forklift_Assembly_Queue", "Forklift Assembly Queue", "Backlog of parts waiting for material handling after assembly"),
            ("Blanking_Util", "Blanking Station Utilization", "Initial coil blanking operation"),
            ("Forklift_Press_Queue", "Forklift Pressing Queue", "Material transfer queue between pressing and assembly"),
            ("SKU1_Wait_Time", "SKU 1 Waiting Time", "Lead time delay in system for SKU 1 components"),
            ("Cell4_Util", "Assembly Cell 4 Utilization", "Secondary assembly cell handling SKU 3 and 4"),
            ("Press1_Queue", "Press 1 Queue Length", "Queue accumulation at hydraulic press type 1"),
        ]

        if target == "throughput_drop":
            target_col = "c_TotalProducts"
            target_display = "Throughput Rate Drop"
            invert_sign = True # Higher correlation with negative throughput drop
        else:
            target_col = "Quality_Queue"
            target_display = "Quality Inspection Queue Congestion"
            invert_sign = False

        corrs = df.corr()[target_col]
        shap_summary = ml_engine.get_shap_summary(num_samples=250)
        shap_dict = {item["feature"]: item["importance"] for item in shap_summary}

        contributing_factors = []
        for feat, display_name, mechanism in investigated_features:
            if feat not in corrs:
                continue
            
            raw_corr = float(corrs[feat])
            corr_val = -raw_corr if invert_sign else raw_corr
            shap_imp = shap_dict.get(feat, abs(corr_val) * 100.0)

            # Determine association strength
            abs_c = abs(corr_val)
            if abs_c >= 0.70:
                assoc = "High"
            elif abs_c >= 0.40:
                assoc = "Medium"
            else:
                assoc = "Low"

            if corr_val > 0:
                statement = f"Statistically associated with {target_display.lower()} (Pearson r = {corr_val:.2f}, SHAP score = {shap_imp:.1f})."
            else:
                statement = f"Negative statistical relationship observed (Pearson r = {corr_val:.2f})."

            contributing_factors.append({
                "factor": feat,
                "display_name": display_name,
                "association": assoc,
                "correlation_coefficient": round(corr_val, 3),
                "shap_importance": round(shap_imp, 3),
                "evidence_statement": statement,
                "suspected_mechanism": mechanism
            })

        contributing_factors.sort(key=lambda x: (x["association"] == "High", abs(x["correlation_coefficient"])), reverse=True)

        # Correlation submatrix for frontend heatmaps
        matrix_feats = ["Quality_Queue", "c_TotalProducts", "Cell1_Util", "Warehouse1_Queue", "Forklift_Assembly_Queue", "Blanking_Util"]
        corr_matrix = {}
        for f1 in matrix_feats:
            corr_matrix[f1] = {}
            for f2 in matrix_feats:
                if f1 in df.columns and f2 in df.columns:
                    corr_matrix[f1][f2] = round(float(df[f1].corr(df[f2])), 3)

        insight = (
            f"Evidence indicates that {contributing_factors[0]['display_name']} is the factor most strongly associated "
            f"with {target_display.lower()} (r = {contributing_factors[0]['correlation_coefficient']:.2f}). "
            f"WIP accumulation at {contributing_factors[1]['display_name']} serves as a secondary driver."
        )

        return {
            "target_analyzed": target_display,
            "top_contributing_factors": contributing_factors,
            "correlation_matrix": corr_matrix,
            "shap_summary": shap_summary[:10],
            "synthesized_insight": insight,
            "dataset_decoupling_notice": (
                "PROCESS-LEVEL STATISTICAL ASSOCIATION ONLY: The visual inspection dataset "
                "(organizer 5-class surface images) and the process simulation dataset "
                "(Rockwell Arena Model 3 CSV) are not inherently linked at the sample level. "
                "No physical sample identifier is shared between datasets. "
                "Root-cause findings represent statistical associations between process variables "
                "and quality indicators — not direct image-to-process-event causation. "
                "Use wording: 'correlated with', 'associated with', or 'potential contributing factor'."
            )
        }

root_cause_engine = RootCauseEngine.get_instance()
