import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Industrial AI Copilot"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    PROJECT_ROOT: Path = BASE_DIR.parent
    
    # Organizer dataset location
    DATA_DIR: str = os.getenv(
        "ORGANIZER_DATA_DIR", 
        r"C:\Users\SHAMSREENIR\Downloads\Manufacturing Data Shared Facility - Discrete-Event Simulation\Manufacturing Data Shared Facility - Discrete-Event Simulation"
    )
    
    # Primary dataset paths
    MODEL3_CSV_PATH: str = os.path.join(DATA_DIR, "Model 3", "Model_3.csv")
    MODEL3_PARAMS_PATH: str = os.path.join(DATA_DIR, "Model 3", "ParametersFile.xls")
    MAT_FILE_PATH: str = os.path.join(DATA_DIR, "3000Samplesv3.mat")
    
    # Cache directory for trained models and preprocessed analytics
    CACHE_DIR: Path = BASE_DIR / "cache"
    
    # Economic Defaults (Simulated Assumptions)
    DEFAULT_UNIT_SALE_PRICE: float = 120.0     # Currency units (INR) per finished product
    DEFAULT_UNIT_MATERIAL_COST: float = 45.0   # Currency units per raw blank
    DEFAULT_SCRAP_COST_PER_UNIT: float = 35.0  # Loss per scrapped unit
    DEFAULT_REWORK_COST_PER_UNIT: float = 18.0 # Additional processing cost for rework
    DEFAULT_DOWNTIME_COST_PER_HOUR: float = 4500.0 # Line stoppage hourly cost
    
    # Quality Anomaly Defaults
    DEFAULT_ANOMALY_THRESHOLD: float = 0.65    # Isolation forest anomaly cutoff
    
    # Demo Mode
    DEMO_MODE: bool = False

    class Config:
        case_sensitive = True

settings = Settings()
os.makedirs(settings.CACHE_DIR, exist_ok=True)
