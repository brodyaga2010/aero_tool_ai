from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path
import os


class Settings(BaseSettings):
    """Application settings.

    Will try to resolve model paths relative to an optional DATA_DIR env var
    which is set by docker-compose. If DATA_DIR is not set, falls back to
    the package-local files included in the image.
    """
    # Base data directory inside container where docker-compose mounts shared volumes
    data_dir: str = Field(default=os.environ.get("DATA_DIR", "/app"))

    # model files (prefer DATA_DIR/models/*.pt)
    yolo_model1_path: str = Field(default="")
    yolo_model2_path: str = Field(default="")

    confidence_threshold: float = Field(default=0.5)
    message_queue_url: str = Field(default="amqp://guest:guest@rabbitmq:5672/")

    model_config = SettingsConfigDict(
        env_file=".env",
        protected_namespaces=("settings_",)
    )

    def __init__(self, **values):
        super().__init__(**values)
        base = Path(self.data_dir)

        # Prefer mounted models in DATA_DIR/models, else fall back to package files
        model1_candidate = base / "models" / "model1.pt"
        model2_candidate = base / "models" / "model2.pt"

        if model1_candidate.exists():
            self.yolo_model1_path = str(model1_candidate)
        else:
            # fallback to package-file in app/ directory
            pkg_model1 = Path(__file__).parent / "model1.pt"
            self.yolo_model1_path = str(pkg_model1)

        if model2_candidate.exists():
            self.yolo_model2_path = str(model2_candidate)
        else:
            pkg_model2 = Path(__file__).parent / "model2.pt"
            self.yolo_model2_path = str(pkg_model2)

        # Ensure logs directory exists when data_dir is a mount
        logs_dir = base / "logs"
        try:
            logs_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            # Best-effort: ignore permission errors here; runtime code should handle write errors
            pass