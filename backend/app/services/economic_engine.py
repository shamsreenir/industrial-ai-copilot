import logging
from typing import Dict, Any, List, Optional
from ..schemas.schemas import EconomicParameters, EconomicAnalysisResponse
from .data_loader import data_loader

logger = logging.getLogger("economic_engine")

class EconomicEngine:
    _instance = None

    @classmethod
    def get_instance(cls) -> 'EconomicEngine':
        if cls._instance is None:
            cls._instance = EconomicEngine()
        return cls._instance

    def calculate_economics(
        self, 
        params: Optional[EconomicParameters] = None,
        defect_rate: float = 0.042,
        scrap_rate: float = 0.024,
        rework_rate: float = 0.018,
        throughput_units: Optional[int] = None
    ) -> Dict[str, Any]:
        if params is None:
            params = EconomicParameters()

        if throughput_units is None:
            # Baseline mean daily production from Model 3 dataset (24h run)
            throughput_units = int(data_loader.stats.get("c_TotalProducts", {}).get("mean", 54747))

        # Verified good units after quality check
        daily_scrap_units = int(round(throughput_units * scrap_rate))
        daily_rework_units = int(round(throughput_units * rework_rate))
        daily_verified_good_units = throughput_units - daily_scrap_units

        # Revenue calculations
        daily_potential_revenue = throughput_units * params.unit_sale_price
        daily_actual_revenue = daily_verified_good_units * params.unit_sale_price
        
        # Cost calculations
        daily_raw_material_cost = throughput_units * params.unit_material_cost
        daily_scrap_cost = daily_scrap_units * params.scrap_cost_per_unit
        daily_rework_cost = daily_rework_units * params.rework_cost_per_unit
        
        # Bottleneck downtime estimation (12.8% loss of 24h = ~3.07 hours equivalent line delay)
        downtime_hours_equivalent = 3.07
        daily_downtime_cost = downtime_hours_equivalent * params.downtime_cost_per_hour
        
        total_daily_loss = daily_scrap_cost + daily_rework_cost + daily_downtime_cost
        net_operating_margin = daily_actual_revenue - daily_raw_material_cost - total_daily_loss
        profitability_impact_percent = (total_daily_loss / daily_potential_revenue * 100.0) if daily_potential_revenue > 0 else 0.0

        formula_trace = [
            {"metric": "Daily Verified Good Units", "formula": "Total Units - Scrap Units", "calculation": f"{throughput_units:,} - {daily_scrap_units:,} = {daily_verified_good_units:,} units"},
            {"metric": "Potential Revenue", "formula": "Total Units × Unit Sale Price", "calculation": f"{throughput_units:,} × ₹{params.unit_sale_price:.2f} = ₹{daily_potential_revenue:,.2f}"},
            {"metric": "Actual Revenue", "formula": "Verified Units × Unit Sale Price", "calculation": f"{daily_verified_good_units:,} × ₹{params.unit_sale_price:.2f} = ₹{daily_actual_revenue:,.2f}"},
            {"metric": "Scrap Cost", "formula": "Scrap Units × Scrap Cost per Unit", "calculation": f"{daily_scrap_units:,} × ₹{params.scrap_cost_per_unit:.2f} = ₹{daily_scrap_cost:,.2f}"},
            {"metric": "Rework Cost", "formula": "Rework Units × Rework Cost per Unit", "calculation": f"{daily_rework_units:,} × ₹{params.rework_cost_per_unit:.2f} = ₹{daily_rework_cost:,.2f}"},
            {"metric": "Bottleneck Downtime Cost", "formula": "Equivalent Line Delay Hours × Hourly Downtime Cost", "calculation": f"{downtime_hours_equivalent:.2f} hrs × ₹{params.downtime_cost_per_hour:.2f}/hr = ₹{daily_downtime_cost:,.2f}"},
            {"metric": "Total Daily Loss", "formula": "Scrap Cost + Rework Cost + Downtime Cost", "calculation": f"₹{daily_scrap_cost:,.2f} + ₹{daily_rework_cost:,.2f} + ₹{daily_downtime_cost:,.2f} = ₹{total_daily_loss:,.2f}"},
            {"metric": "Net Operating Margin", "formula": "Actual Revenue - Raw Material Cost - Total Daily Loss", "calculation": f"₹{daily_actual_revenue:,.2f} - ₹{daily_raw_material_cost:,.2f} - ₹{total_daily_loss:,.2f} = ₹{net_operating_margin:,.2f}"}
        ]

        return {
            "is_simulated_assumption": True,
            "parameters_used": params,
            "daily_gross_production_units": throughput_units,
            "daily_verified_good_units": daily_verified_good_units,
            "daily_scrap_units": daily_scrap_units,
            "daily_rework_units": daily_rework_units,
            "daily_potential_revenue": round(daily_potential_revenue, 2),
            "daily_actual_revenue": round(daily_actual_revenue, 2),
            "daily_scrap_cost": round(daily_scrap_cost, 2),
            "daily_rework_cost": round(daily_rework_cost, 2),
            "daily_downtime_cost": round(daily_downtime_cost, 2),
            "total_daily_loss": round(total_daily_loss, 2),
            "net_operating_margin": round(net_operating_margin, 2),
            "profitability_impact_percent": round(profitability_impact_percent, 2),
            "formula_trace": formula_trace
        }

economic_engine = EconomicEngine.get_instance()
