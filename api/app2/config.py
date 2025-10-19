from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path

class Settings(BaseSettings):
    message_queue_url: str = Field(default="amqp://guest:guest@localhost:5672/")

    model_config = SettingsConfigDict(
        env_file=".env",
        protected_namespaces=('settings_',)
    )