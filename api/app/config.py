from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path

class Settings(BaseSettings):
    yolo_model1_path: str = Field(default=str(Path(__file__).parent / "roma.pt"))
    yolo_model2_path: str = Field(default=str(Path(__file__).parent / "sasha.pt"))
    confidence_threshold: float = Field(default=0.5)
    
    model_config = SettingsConfigDict(
        env_file=".env",
        protected_namespaces=('settings_',)
    )