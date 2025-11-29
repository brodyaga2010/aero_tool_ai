import asyncio
import datetime
import json
import logging
from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import aio_pika

import shutil
import tempfile
import os
from typing import List
import zipfile
from .models.yolo_detector import YOLODetector
from .config import Settings

from app2.DTO.DataBaseClasses import RecognitionOperationModel, ImageRecognitionDataModel, RecognitionResult, SummaryModel

# Определяем базовую директорию из переменной окружения DATA_DIR или используем fallback
DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).parent.parent))
STATIC_DIR = DATA_DIR / "static"
RESULTS_DIR = STATIC_DIR / "results"
CONFIG_FILE_PATH = DATA_DIR / "config/UserConfig.json"

# Создаем необходимые директории
STATIC_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
(DATA_DIR / "logs").mkdir(parents=True, exist_ok=True)

# Настройка логирования в общий volume
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(DATA_DIR / "logs/app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Создаем директории если они не существуют
STATIC_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Tool Detection API", version="1.0.0")

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

# Инициализация детектора YOLO
settings = Settings()
detector = YOLODetector(
    model_path1=settings.yolo_model1_path,
    model_path2=settings.yolo_model2_path,
    confidence_threshold=settings.confidence_threshold
)

def read_recognition() -> float:
    """Чтение конфигурационного файла"""
    try:
        with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as file:
            return float(json.load(file)["SystemSettings"]["recognition"]["recognition"])/100
    except Exception:
        return 0.5


@app.get("/")
async def read_root():
    """Корневой эндпоинт"""
    logger.info("GET / - Request to the root endpoint")
    return {"status": "ok", "message": "Tool Detection API is running"}

@app.post("/api/recognize/single")
async def detect_single_image(toolset: str = Form(...), file: UploadFile = File(...)):
    """Endpoint для обработки одного изображения"""
    logger.info(f"POST /api/recognize/single - Start processing one image. Toolset: {toolset}, File: {file.filename}")
    
    if not file or not file.filename:
        logger.warning("POST /api/recognize/single - File not provided")
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not any(file.filename.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']):
        logger.warning(f"POST /api/recognize/single - File must be an image: {file.filename}")
        raise HTTPException(status_code=400, detail="File must be an image")
    
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_path = temp_file.name

    try:
        # Обработка изображения через YOLO
        detector.confidence_threshold = read_recognition()
        logger.info(f"Trust threshold set: {detector.confidence_threshold}")
        
        result = await detector.detect_image(temp_path)
        result['file_name'] = file.filename
        result['toolset'] = toolset
        modeled_data = convert_raw_to_model([result]).model_dump()

        logger.info(f"POST /api/recognize/single - Successful processing. Objects found: {len(result.get('detections', []))}")
        
        asyncio.create_task(publish_result(modeled_data)) # Публикация результата в очередь сообщений
        return JSONResponse(content=modeled_data)
    except Exception as e:
        logger.error(f"POST /api/recognize/single - Error while processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    finally:
        os.unlink(temp_path)

@app.post("/api/recognize/multiple")
async def detect_multiple_images(toolset: str = Form(...), files: List[UploadFile] = File(...)):
    """Endpoint для обработки нескольких изображений"""
    logger.info(f"POST /api/recognize/multiple - Start of processing {len(files)} image. Toolset: {toolset}")
    
    if not files:
        logger.warning("POST /api/recognize/multiple - No files provided")
        raise HTTPException(status_code=400, detail="No files provided")
    
    results = []
    valid_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
    processed_files = 0
    
    for file in files:
        if not file.filename:
            continue
        if not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
            logger.warning(f"POST /api/recognize/multiple - Invalid file missing: {file.filename}")
            continue
            
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
            
        try:
            detector.confidence_threshold = read_recognition()
            result = await detector.detect_image(temp_path)
            result['file_name'] = file.filename
            result['toolset'] = toolset
            results.append(result)
            processed_files += 1
        except Exception as e:
            logger.error(f"POST /api/recognize/multiple - Error processing file {file.filename}: {str(e)}")
        finally:
            os.unlink(temp_path)
    
    if not results:
        logger.warning("POST /api/recognize/multiple - Failed to process any files")
        raise HTTPException(status_code=400, detail="No valid images processed")
    
    modeled_data = convert_raw_to_model(results).model_dump()
    asyncio.create_task(publish_result(modeled_data)) # Публикация результата в очередь сообщений

    logger.info(f"POST /api/recognize/multiple - Successfully processed {processed_files} из {len(files)} files")
    return JSONResponse(content=modeled_data)


@app.post("/api/recognize/archive")
async def detect_from_archive(toolset: str = Form(...), file: UploadFile = File(...)):
    """Endpoint для обработки архива с изображениями"""
    logger.info(f"POST /api/recognize/archive - Start of archive processing. Toolset: {toolset}, File: {file.filename}")
    
    if not file or not file.filename:
        logger.warning("POST /api/recognize/archive - No file provided")
        raise HTTPException(status_code=400, detail="No file provided")
        
    if not file.filename.lower().endswith('.zip'):
        logger.warning(f"POST /api/recognize/archive - Invalid archive format: {file.filename}")
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")

    results = []
    temp_dir = tempfile.mkdtemp()
    processed_images = 0
    
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

                    detector.confidence_threshold = read_recognition()
                    result = await detector.detect_image(file_path)
                    result['file_name'] = file.filename
                    result['toolset'] = toolset
                    results.append(result)
                    processed_images += 1
                    
        if not results:
            logger.warning("POST /api/recognize/archive - No suitable images were found in the archive.")
            raise HTTPException(status_code=400, detail="No valid images found in archive")
            
        modeled_data = convert_raw_to_model(results).model_dump()
        asyncio.create_task(publish_result(modeled_data)) # Публикация результата в очередь сообщений

        logger.info(f"POST /api/recognize/archive - Successfully processed {processed_images} images from archive")
        return JSONResponse(content=modeled_data)
    
    except Exception as e:
        logger.error(f"POST /api/recognize/archive - Error processing archive: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    finally:
        shutil.rmtree(temp_dir)

async def publish_result(result: dict):
    """Публикация результата в очередь сообщений"""
    try:
        connection = await aio_pika.connect_robust(settings.message_queue_url)
        channel = await connection.channel()
        await channel.default_exchange.publish(
            aio_pika.Message(body=json.dumps(result).encode()),
            routing_key="analysis_results",
        )
        await connection.close()
        logger.info("The result was successfully sent to the message queue")
    except Exception as e:
        logger.error(f"Error sending to queue: {str(e)}")


def convert_raw_to_model(raw_data_list: List[dict]) -> RecognitionOperationModel:
    """
    Преобразует список данных формата, приведённого в вопросе,
    в единую модель RecognitionOperationModel.
    """
    images = []
    total_detection_time = 0.0
    all_avg_confidences = []

    for raw_data in raw_data_list:
        detections = raw_data.get("detections", [])
        processing_time = raw_data.get("processing_time", 0)
        file_name = raw_data.get("file_name", "")
        image_path = raw_data.get("image_path", "")
        image_base64 = raw_data.get("image_base64", "")
        toolset = raw_data.get("toolset", "")

        if detections:
            avg_confidence = sum(d["confidence"] for d in detections) / len(detections)
        else:
            avg_confidence = 0.0

        results = []
        for det in detections:
            conf = det["confidence"]

            results.append(
                RecognitionResult(
                    id=-1,
                    name=det["class"],
                    confidence=conf,
                    color=det["color"],
                )
            )

        image_model = ImageRecognitionDataModel(
            imageId=str(-1),
            imageUrl=image_path,
            fileName=file_name,
            detectionTime=processing_time,
            imageConfidence=avg_confidence,
            results=results,
            imageBase64=image_base64
        )

        images.append(image_model)
        total_detection_time += processing_time
        all_avg_confidences.append(avg_confidence)

    total_images = len(images)
    average_match = sum(all_avg_confidences) / total_images if total_images > 0 else 0.0

    summary = SummaryModel(
        totalImages=total_images,
        totalDetectionTime=total_detection_time,
        averageMatch=average_match
    )

    toolset = raw_data_list[0].get("toolset", "") if raw_data_list else ""

    operation_model = RecognitionOperationModel(
        id=str(-1),
        timestamp=datetime.datetime.now().isoformat(),
        images=images,
        summary=summary,
        toolset=toolset,
        recognition=read_recognition()
    )

    return operation_model