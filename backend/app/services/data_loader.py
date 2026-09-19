import os
import logging
import pandas as pd
import numpy as np
import xlrd
from typing import Dict, Any, Tuple, Optional
from ..core.config import settings

logger = logging.getLogger("data_loader")
logging.basicConfig(level=logging.INFO)

class DataLoader:
    _instance: Optional['DataLoader'] = None
    
    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self.stats: Dict[str, Dict[str, float]] = {}
        self.simulation_params: Dict[str, Any] = {}
        self.is_loaded: bool = False
        
    @classmethod
    def get_instance(cls) -> 'DataLoader':
        if cls._instance is None:
            cls._instance = DataLoader()
            cls._instance.load_all()
        return cls._instance

    def load_all(self):
        if self.is_loaded:
            return
        
        logger.info("Initializing DataLoader...")
        self._load_parameters()
        self._load_model3_dataset()
        self._compute_baselines()
        self.is_loaded = True
        logger.info("DataLoader initialization complete.")

    def _load_parameters(self):
        xls_path = settings.MODEL3_PARAMS_PATH
        if not os.path.exists(xls_path):
            logger.warning(f"ParametersFile.xls not found at {xls_path}. Using fallback parameters.")
            self._use_fallback_params()
            return
        
        try:
            book = xlrd.open_workbook(xls_path)
            if "Sheet2" in book.sheet_names():
                sheet = book.sheet_by_name("Sheet2")
                current_module = ""
                for r in range(1, sheet.nrows):
                    module = str(sheet.cell_value(r, 0)).strip()
                    if module:
                        current_module = module
                    param = str(sheet.cell_value(r, 1)).strip()
                    val = sheet.cell_value(r, 2)
                    var_name = str(sheet.cell_value(r, 3)).strip()
                    
                    if param and val != "":
                        try:
                            num_val = float(val)
                            self.simulation_params[f"{current_module}_{param}"] = num_val
                            if var_name:
                                self.simulation_params[var_name] = num_val
                        except (ValueError, TypeError):
                            pass
            logger.info(f"Loaded {len(self.simulation_params)} simulation parameters from ParametersFile.xls")
        except Exception as e:
            logger.error(f"Error reading ParametersFile.xls: {e}")
            self._use_fallback_params()

    def _use_fallback_params(self):
        self.simulation_params = {
            "Forklift_Velocity": 5.0,
            "Forklift_Units": 8.0,
            "Blanking_Capacity": 6.0,
            "Press1_Capacity": 2.0,
            "Press2_Capacity": 2.0,
            "Press3_Capacity": 2.0,
            "Press4_Capacity": 2.0,
            "Cell1_Capacity": 8.0,
            "Cell2_Capacity": 2.0,
            "Cell3_Capacity": 2.0,
            "Cell4_Capacity": 5.0,
            "Conveyor_Capacity": 3600.0,
            "Quality_Capacity": 80.0,
        }

    def _load_model3_dataset(self):
        csv_path = settings.MODEL3_CSV_PATH
        cache_file = settings.CACHE_DIR / "model3_sample.parquet"
        
        if cache_file.exists():
            try:
                logger.info(f"Loading cached dataset from {cache_file}...")
                self.df = pd.read_parquet(cache_file)
                logger.info(f"Loaded {len(self.df)} rows from cache.")
                return
            except Exception as e:
                logger.warning(f"Failed to load cache: {e}. Reading raw CSV.")

        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"Model 3 CSV not found at: {csv_path}")

        logger.info(f"Reading Model 3 dataset from {csv_path} (loading 60,000 rows for high-fidelity interactive performance)...")
        # 60,000 rows provides exceptional statistical representation with fast response times
        self.df = pd.read_csv(csv_path, nrows=60000)
        
        # Clean column names
        self.df.columns = [c.strip() for c in self.df.columns]
        
        # Handle small missing values if any
        self.df.ffill(inplace=True)
        self.df.bfill(inplace=True)
        
        try:
            logger.info("Caching sample to parquet for instant future restarts...")
            self.df.to_parquet(cache_file, index=False)
        except Exception as e:
            logger.warning(f"Could not cache parquet: {e}")

    def _compute_baselines(self):
        if self.df is None:
            return
        
        num_cols = self.df.select_dtypes(include=[np.number]).columns
        desc = self.df[num_cols].describe().T
        
        for col in num_cols:
            self.stats[col] = {
                "mean": float(desc.loc[col, "mean"]),
                "std": float(desc.loc[col, "std"]),
                "min": float(desc.loc[col, "min"]),
                "25%": float(desc.loc[col, "25%"]),
                "50%": float(desc.loc[col, "50%"]),
                "75%": float(desc.loc[col, "75%"]),
                "max": float(desc.loc[col, "max"]),
            }

    def get_column_stats(self, col_name: str) -> Dict[str, float]:
        return self.stats.get(col_name, {"mean": 0.0, "std": 1.0, "min": 0.0, "max": 1.0})

    def get_sample_row(self, index: Optional[int] = None) -> pd.Series:
        if self.df is None or len(self.df) == 0:
            raise RuntimeError("Dataset not loaded")
        if index is None or index < 0 or index >= len(self.df):
            index = int(np.random.randint(0, len(self.df)))
        return self.df.iloc[index]

    def compute_health_score(self) -> float:
        if not self.stats:
            return 88.5
        cell1_util = self.stats.get("Cell1_Util", {}).get("mean", 0.867)
        quality_q = self.stats.get("Quality_Queue", {}).get("mean", 47.9)
        util_cols = [c for c in self.stats.keys() if c.endswith("_Util")]
        line_avg_util = float(np.mean([self.stats[c]["mean"] for c in util_cols])) if util_cols else 0.612
        
        util_penalty = min(25.0, max(0.0, (cell1_util - line_avg_util) * 50.0))
        quality_penalty = min(20.0, max(0.0, (quality_q - 30.0) * 0.8))
        score = 100.0 - util_penalty - quality_penalty
        return round(float(np.clip(score, 50.0, 99.0)), 1)

data_loader = DataLoader.get_instance()
