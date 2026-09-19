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
        bundled_csv_gz = settings.BASE_DIR / "app" / "data" / "model3_sample.csv.gz"
        bundled_parquet = settings.BASE_DIR / "app" / "data" / "model3_sample.parquet"
        cache_parquet = settings.CACHE_DIR / "model3_sample.parquet"
        
        # 1. First priority: Bundled gzip CSV (zero external C-library dependency, 100% portable)
        if bundled_csv_gz.exists():
            try:
                logger.info(f"Loading bundled process dataset from {bundled_csv_gz}...")
                self.df = pd.read_csv(bundled_csv_gz, compression="gzip")
                self.df.columns = [c.strip() for c in self.df.columns]
                logger.info(f"Loaded {len(self.df)} process telemetry rows from bundled dataset.")
                return
            except Exception as e:
                logger.warning(f"Failed to load {bundled_csv_gz}: {e}")

        # 2. Second priority: Parquet cache
        for candidate in [bundled_parquet, cache_parquet]:
            if candidate.exists():
                try:
                    logger.info(f"Loading cached dataset from {candidate}...")
                    self.df = pd.read_parquet(candidate)
                    self.df.columns = [c.strip() for c in self.df.columns]
                    logger.info(f"Loaded {len(self.df)} rows from cache.")
                    return
                except Exception as e:
                    logger.warning(f"Failed to load cache from {candidate}: {e}.")

        if os.path.exists(csv_path):
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
                os.makedirs(settings.CACHE_DIR, exist_ok=True)
                self.df.to_parquet(cache_file, index=False)
            except Exception as e:
                logger.warning(f"Could not cache parquet: {e}")
            return

        # Cloud deployment fallback: generate calibrated standalone process dataset
        logger.warning(f"Model 3 data not found at {csv_path}. Initializing calibrated standalone process dataset.")
        self.df = self._generate_fallback_dataframe()

    def _generate_fallback_dataframe(self) -> pd.DataFrame:
        np.random.seed(42)
        n = 2000
        cols = [
            'Blanking_Util', 'Press1_Util', 'Press2_Util', 'Press3_Util', 'Press4_Util',
            'Cell1_Util', 'Cell2_Util', 'Cell3_Util', 'Cell4_Util',
            'Paint1_Util', 'Paint2_Util', 'Quality_Util', 'Forklift_Util',
            'Warehouse1_Queue', 'Warehouse_2_Queue', 'Warehouse_3_Queue', 'Warehouse_4_Queue',
            'Blanking_Queue', 'Press1_Queue', 'Forklift_Blanking_Queue', 'Forklift_Assembly_Queue',
            'Quality_Queue', 'SKU1_Wait_Time', 'SKU2_Wait_Time', 'SKU3_Wait_Time', 'SKU4_Wait_Time',
            'Throughput_Rate'
        ]
        data = {}
        for c in cols:
            if 'Util' in c:
                data[c] = np.random.uniform(0.60, 0.95, n)
            elif 'Queue' in c:
                data[c] = np.random.exponential(15.0, n)
            elif 'Wait' in c:
                data[c] = np.random.normal(45.0, 10.0, n)
            elif 'Throughput' in c:
                data[c] = np.random.normal(2400.0, 150.0, n)
            else:
                data[c] = np.random.uniform(10.0, 50.0, n)
        return pd.DataFrame(data)

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
