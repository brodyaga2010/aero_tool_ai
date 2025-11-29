
import os
import shutil
import tarfile
import zipfile
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

from app3.dataset import create_yolo_dataset_with_yaml
from app3.train import train_yolo_with_tuning

# Определяем базовую директорию проекта. Если docker-compose монтирует общий
# том в /app, то можно настроить DATA_DIR=/app в compose. Иначе используем проектную структуру.
DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).parent.parent))

# Ensure DATA_DIR is a Path pointing to a directory root that contains static, models, config, logs
BASE_DIR = DATA_DIR
STATIC_DIR = BASE_DIR / "static"
ARCHIVES_DIR = STATIC_DIR / "archives"
UPLOAD_DIR = ARCHIVES_DIR / "uploads"
EXTRACTED_DIR = ARCHIVES_DIR / "extracted"
YMLS_DIR = ARCHIVES_DIR / "YMLS"

# Настройка логирования: пишем в DATA_DIR/logs/app3.log (shared volume)
logs_path = BASE_DIR / "logs"
logs_path.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(logs_path / "app3.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Создаем директории если они не существуют
STATIC_DIR.mkdir(exist_ok=True)
ARCHIVES_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)
EXTRACTED_DIR.mkdir(exist_ok=True)
YMLS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Tool Detection Updater API", version="1.0.0")

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Монтируем статические файлы из общего тома
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
async def read_root():
    logger.info("GET / - Request to root endpoint")
    return {"status": "ok", "message": "Tool Detection API is running"}


def extract_archive(file_path: str, extract_to: str) -> bool:
    """Распаковывает архив в указанную папку"""
    try:
        if file_path.endswith('.zip'):
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(extract_to)
        elif file_path.endswith(('.tar', '.tar.gz', '.tgz')):
            with tarfile.open(file_path, 'r:*') as tar_ref:
                tar_ref.extractall(extract_to)
        else:
            return False
        return True
    except Exception as e:
        print(f"Ошибка при распаковке: {e}")
        return False

@app.post("/api/extract-archives")
async def extract_two_archives(
    archive1: UploadFile = File(..., description="Первый архив (ZIP или TAR)"),
    archive2: UploadFile = File(..., description="Второй архив (ZIP или TAR)"),
    toolset: str = Form(...)):
    """
    Принимает два архива и распаковывает их в папку
    """
    # Проверяем расширения файлов
    allowed_extensions = ['.zip', '.tar', '.tar.gz', '.tgz']
    
    file1_name = getattr(archive1, 'filename', '') or ''
    file2_name = getattr(archive2, 'filename', '') or ''
    file1_ext = Path(file1_name).suffix.lower()
    file2_ext = Path(file2_name).suffix.lower()
    
    # Для tar.gz файлов проверяем полное расширение
    if file1_name.lower().endswith('.tar.gz'):
        file1_ext = '.tar.gz'
    if file2_name.lower().endswith('.tar.gz'):
        file2_ext = '.tar.gz'
    
    if file1_ext not in allowed_extensions or file2_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail="Поддерживаются только ZIP и TAR архивы"
        )
    
    # Создаем уникальную папку для этой операции
    import uuid
    upload_uuid = str(uuid.uuid4())
    extract_path = EXTRACTED_DIR / upload_uuid
    extract_path.mkdir(exist_ok=True)
    
    # Пути для каждого архива
    archive1_path = extract_path / "archive1"
    archive2_path = extract_path / "archive2"
    
    file1_path = None
    file2_path = None
    

    try:
        # Сохраняем первый архив
        file1_path = UPLOAD_DIR / f"archive1_{upload_uuid}_{file1_name}"
        with open(file1_path, "wb") as buffer:
            shutil.copyfileobj(archive1.file, buffer)

        # Сохраняем второй архив
        file2_path = UPLOAD_DIR / f"archive2_{upload_uuid}_{file2_name}"
        with open(file2_path, "wb") as buffer:
            shutil.copyfileobj(archive2.file, buffer)

        # Распаковываем архивы в соответствующие папки
        archive1_path.mkdir(exist_ok=True)
        archive2_path.mkdir(exist_ok=True)

        success1 = extract_archive(str(file1_path), str(archive1_path))
        success2 = extract_archive(str(file2_path), str(archive2_path))

        if not success1 or not success2:
            raise HTTPException(
                status_code=400,
                detail="Ошибка при распаковке архивов. Проверьте целостность файлов."
            )

        # Получаем список распакованных файлов для каждого архива
        archive1_files = []
        archive2_files = []

        for root, dirs, files in os.walk(archive1_path):
            for file in files:
                relative_path = os.path.relpath(os.path.join(root, file), archive1_path)
                archive1_files.append(relative_path)

        for root, dirs, files in os.walk(archive2_path):
            for file in files:
                relative_path = os.path.relpath(os.path.join(root, file), archive2_path)
                archive2_files.append(relative_path)

        path_to_archive1_content = str(archive1_path)
        path_to_archive2_content = str(archive2_path)

        # Логируем пути для отладки
        logger.info(f"Путь к содержимому первого архива: {path_to_archive1_content}")
        logger.info(f"Путь к содержимому второго архива: {path_to_archive2_content}")

        # Пример использования
        class_dict = {
            0: "Adjustable_wrench",
            1: "screwdriver_1",
            2: "screwdriver_2",
            3: "Offset_Phillips_screwdriver",
            4: "Side_cutters",
            5: "Shernica",
            6: "Safety_pliers",
            7: "Pliers",
            8: "Rotary_wheel",
            9: "Open_end_wrench",
            10: "Oil_can_opener"
        }

        create_yolo_dataset_with_yaml(path_to_archive1_content, path_to_archive2_content, str(YMLS_DIR), class_dict)

        yml_dir = YMLS_DIR / "dataset.yaml"

        # train expects str paths
        # Используем директорию models для сохранения новых моделей
        train_yolo_with_tuning(str(yml_dir), "model1_1.pt", 5, 5, 16, str(BASE_DIR / "models"))

        return {"status": "success"}
    
    except Exception as e:
        # Очищаем в случае ошибки
        if extract_path.exists():
            shutil.rmtree(extract_path)
        logger.error(f"Ошибка при обработке архивов: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сервера: {str(e)}")
    
    finally:
        # Удаляем временные файлы архивов
        for file_path in [file1_path, file2_path]:
            if file_path and file_path.exists():
                file_path.unlink()
        return { "status": "success" }
