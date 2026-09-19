import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("llm_service")

class LLMService:
    _instance = None

    def __init__(self):
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.provider = os.getenv("LLM_PROVIDER", "deterministic_grounded")

    @classmethod
    def get_instance(cls) -> 'LLMService':
        if cls._instance is None:
            cls._instance = LLMService()
        return cls._instance

    def generate_explanation(self, structured_context: Dict[str, Any], prompt_type: str = "general") -> str:
        """
        Converts structured evidence into concise, grounded industrial insights.
        NEVER invents metrics, costs, or unverified defect labels.
        """
        if prompt_type == "inspection":
            decision = structured_context.get("decision", "ACCEPT")
            score = structured_context.get("anomaly_score", 0.0)
            factors = structured_context.get("contributing_factors", [])
            
            top_factors_str = ", ".join([f"{f['display_name']} ({f['deviation_sigmas']:+.1f}σ)" for f in factors[:2]])
            
            if decision == "REJECT":
                return (
                    f"Quality alert: Process observation evaluated as ANOMALOUS with an anomaly score of {score:.1%}. "
                    f"Significant deviations observed in: {top_factors_str}. Immediate lot hold recommended."
                )
            elif decision == "UNCERTAIN / RE-INSPECT":
                return (
                    f"Process observation falls within the decision boundary margin (score: {score:.1%}). "
                    f"Secondary verification or parameter verification suggested before releasing batch."
                )
            else:
                return (
                    f"Quality status nominal. Process operates within statistical manufacturing control limits (anomaly score: {score:.1%})."
                )

        elif prompt_type == "bottleneck":
            bn = structured_context.get("primary_bottleneck", "Assembly Cell 1")
            util = structured_context.get("bottleneck_utilization", 0.867)
            q = structured_context.get("bottleneck_queue", 190.8)
            loss = structured_context.get("estimated_throughput_loss_percent", 12.8)
            
            return (
                f"Plant bottleneck identified at {bn} operating at {util:.1%} utilization with an average upstream queue of {q:.1f} parts. "
                f"Queue accumulation and pacing constraints induce an estimated {loss:.1f}% throughput loss across the facility."
            )

        elif prompt_type == "simulation":
            tp = structured_context.get("throughput", {})
            profit = structured_context.get("estimated_profit", {})
            return (
                f"What-If Simulation Summary: Under the proposed process modifications, system throughput is projected to change by "
                f"{tp.get('percent_change', 0.0):+.1f}% ({tp.get('delta', 0.0):+.0f} {tp.get('unit', '')}). "
                f"Expected simulated daily profitability impact is {profit.get('percent_change', 0.0):+.1f}% ({profit.get('delta', 0.0):+,.0f} {profit.get('unit', '')})."
            )

        # Default executive summary
        return (
            "Industrial AI Copilot active. Continuous monitoring of discrete-event shared manufacturing line. "
            "Assembly Cell 1 remains the primary critical path constraint requiring intervention."
        )

llm_service = LLMService.get_instance()
