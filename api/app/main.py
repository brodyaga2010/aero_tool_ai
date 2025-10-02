from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Определяем базовую директорию проекта
BASE_DIR = Path(__file__).parent.parent
STATIC_DIR = BASE_DIR / "static"
RESULTS_DIR = STATIC_DIR / "results"

# Создаем директории если они не существуют
STATIC_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)
from pathlib import Path
import shutil
import tempfile
import os
from typing import List
import zipfile
from .models.yolo_detector import YOLODetector
from .config import Settings

app = FastAPI(title="Tool Detection API", version="1.0.0")

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Монтируем статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")

# Инициализация детектора YOLO
settings = Settings()
detector = YOLODetector(
    model_path1=settings.yolo_model1_path,
    model_path2=settings.yolo_model2_path,
    confidence_threshold=settings.confidence_threshold
)

@app.get("/")
async def read_root():
    return {"status": "ok", "message": "Tool Detection API is running"}

@app.post("/detect/single")
async def detect_single_image(file: UploadFile = File(...)):
    """Endpoint для обработки одного изображения"""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not any(file.filename.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_path = temp_file.name

    try:
        # Обработка изображения через YOLO
        result = await detector.detect_image(temp_path)
        return JSONResponse(content=result)
    finally:
        os.unlink(temp_path)

@app.post("/detect/multiple")
async def detect_multiple_images(files: List[UploadFile] = File(...)):
    """Endpoint для обработки нескольких изображений"""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    results = []
    valid_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
    
    for file in files:
        if not file.filename:
            continue
        if not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
            continue
            
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
            
        try:
            result = await detector.detect_image(temp_path)
            results.append({
                "filename": file.filename,
                "result": result
            })
        finally:
            os.unlink(temp_path)
            
    return JSONResponse(content={"results": results})

@app.post("/detect/archive")
async def detect_from_archive(file: UploadFile = File(...)):
    """Endpoint для обработки архива с изображениями"""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
        
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")

    results = []
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Сохраняем архив
        zip_path = os.path.join(temp_dir, "upload.zip")
        with open(zip_path, "wb") as temp_zip:
            shutil.copyfileobj(file.file, temp_zip)
            
        # Распаковываем архив
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
            
        # Обрабатываем все изображения
        for root, _, files in os.walk(temp_dir):
            for filename in files:
                if any(filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png']):
                    file_path = os.path.join(root, filename)
                    result = await detector.detect_image(file_path)
                    results.append({
                        "filename": filename,
                        "result": result
                    })
                    
        return JSONResponse(content={"results": results})
    
    finally:
        shutil.rmtree(temp_dir)

@app.get("/settings")
async def get_settings():
    """Получить текущие настройки"""
    return {
        "confidence_threshold": settings.confidence_threshold
    }

@app.post("/settings")
async def update_settings(new_settings: Settings):
    """Обновить настройки"""
    settings.confidence_threshold = new_settings.confidence_threshold
    detector.update_confidence_threshold(new_settings.confidence_threshold)
    return {"status": "ok", "message": "Settings updated"}