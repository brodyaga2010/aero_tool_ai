from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path
import os

# Инициализация базовых путей
DATA_DIR = os.getenv("DATA_DIR", "/app")

# Пути к общим директориям
BASE_DIR = Path(DATA_DIR)
CONFIG_DIR = BASE_DIR / "config"
STATIC_DIR = BASE_DIR / "static"
LOGS_DIR = BASE_DIR / "logs"
MODELS_DIR = BASE_DIR / "models"

# Инициализация конфигурационных путей
CONFIG_FILE = str(CONFIG_DIR / "UserConfig.json")
DATABASE_FILE = str(STATIC_DIR / "SQLite/ToolsAI.db")

# Создаем директории если их нет
for directory in [CONFIG_DIR, STATIC_DIR, LOGS_DIR, MODELS_DIR, STATIC_DIR / "SQLite"]:
    directory.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    message_queue_url: str = Field(default="amqp://guest:guest@rabbitmq:5672/")

    model_config = SettingsConfigDict(
        env_file=".env",
        protected_namespaces=('settings_',)
    )