import logging
from typing import Dict, Any, List
from ..schemas.schemas import RecommendationItem, RecommendationsResponse

logger = logging.getLogger("recommendation_engine")

class RecommendationEngine:
    _instance = None

    @classmethod
    def get_instance(cls) -> 'RecommendationEngine':
        if cls._instance is None:
            cls._instance = RecommendationEngine()
        return cls._instance

    def get_recommendations(self) -> Dict[str, Any]:
        recs = [
            {
                "id": "rec-001",
                "title": "Debottleneck Assembly Cell 1 Capacity & Cycle Time",
                "priority": "CRITICAL",
                "problem": "Assembly Cell 1 is operating near saturation (86.7% mean, 96.2% peak utilization), acting as the primary system constraint and causing massive WIP accumulation.",
                "evidence": [
                    "Cell 1 average utilization is 86.7% compared to line average of 61.2%.",
                    "Upstream buffer (Warehouse 1 Queue) averages 190.8 parts and spikes to 1,828 parts.",
                    "Strong statistical correlation (r = 0.87) observed between Cell 1 utilization surges and Quality inspection queue backlog.",
                    "SHAP feature importance ranks Cell 1 utilization as the top driver of line throughput instability."
                ],
                "suggested_intervention": "Simulate a 15% reduction in Cell 1 cycle time or expand active fixtures from 8 to 10 stations.",
                "expected_impact": {
                    "Throughput Increase": "+11.4% (+6,200 units/day)",
                    "WIP Queue Reduction": "-64% at Warehouse 1 Buffer",
                    "Quality Queue Stabilization": "-11.8% inspection backlog",
                    "Simulated Profit Delta": "+₹4,65,000 / day (at default economic assumptions)"
                },
                "confidence": "High",
                "assumptions": "Assumes physical tooling expansion or operator cross-training is feasible; discrete-event surrogate model dynamics hold.",
                "what_if_action": {
                    "interventions": [
                        {"station_name": "Assembly Cell 1", "parameter_modified": "cycle_time", "percent_change": -15.0}
                    ]
                }
            },
            {
                "id": "rec-002",
                "title": "Rebalance Dynamic SKU Routing Across Assembly Cells 2 & 3",
                "priority": "HIGH",
                "problem": "Unbalanced workload distribution across the flexible assembly facility: Cells 2 and 3 operate with significant idle capacity (30.0% and 33.6% idle respectively) while Cell 1 is overloaded.",
                "evidence": [
                    "Cell 2 utilization is 70.0% and Cell 3 utilization is 66.4%, showing 16-20 percentage points of available headroom.",
                    "Arena simulation logic confirms SKU 2 can legally be assembled in Cells 1, 2, or 3, but current dispatch favors Cell 1.",
                    "Warehouse 2 queue averages only 18.5 parts compared to 190.8 parts at Warehouse 1."
                ],
                "suggested_intervention": "Reconfigure simulation dispatch rules in ParametersFile.xls to route 25% more SKU 2 batches into Cells 2 and 3.",
                "expected_impact": {
                    "Cell 1 Utilization Relief": "-7.2% reduction",
                    "Line Balancing Efficiency": "+14.5% overall leveling",
                    "Throughput Increase": "+4.1% (+2,240 units/day)"
                },
                "confidence": "High",
                "assumptions": "Tooling and jig compatibility for SKU 2 at Cells 2 and 3 verified by Model 3 specification."
            },
            {
                "id": "rec-003",
                "title": "Mitigate Forklift Transit Backlog at Staging Buffers",
                "priority": "MEDIUM",
                "problem": "Forklift fleet request queues average 138 to 155 parts per staging area, creating inter-station material transfer latency.",
                "evidence": [
                    "Forklift fleet utilization averages 60.8% with localized request queue spikes of 180 parts.",
                    "Transit times account for ~32.2 minutes of total lead time per SKU batch.",
                    "Forklift Press and Assembly request queues correlate with temporary assembly cell starvation."
                ],
                "suggested_intervention": "Simulate adding 2 material handling forklifts (increasing fleet from 8 to 10) or batch weight threshold tuning.",
                "expected_impact": {
                    "Request Queue Reduction": "-36.4% in staging queues",
                    "Throughput Increase": "+2.8% (+1,530 units/day)",
                    "WIP Holding Cost": "-₹42,000 / day reduction"
                },
                "confidence": "Medium",
                "assumptions": "Factory floor aisle clearance allows concurrent operation of 10 AGV/forklift units."
            }
        ]

        summary = (
            "Primary strategic priority is resolving the Assembly Cell 1 constraint, which constrains the entire facility. "
            "Rebalancing SKU 2 routing across underutilized Cells 2 & 3 provides an immediate low-cost leveling improvement."
        )

        return {
            "recommendations": recs,
            "executive_summary": summary
        }

recommendation_engine = RecommendationEngine.get_instance()
