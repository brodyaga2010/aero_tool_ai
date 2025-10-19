import asyncio
import aio_pika
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import sqlite3
import json
import logging

from .config import Settings
from app2.DTO.DataBaseClasses import HistoryResponse, RecognitionHistorySummary
from app2.DTO.DataBaseClasses import OperationDetailsResponse, RecognitionOperationModel, ImageRecognitionDataModel, RecognitionResult, SummaryModel, HistoryStatistics

# Определяем базовую директорию проекта
BASE_DIR = Path(__file__).parent.parent
STATIC_DIR = BASE_DIR / "static"
DB_DIR = STATIC_DIR / "SQLite"
CONFIG_FILE_PATH = BASE_DIR / "config/UserConfig.json"

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(BASE_DIR / "logs/app2.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Создаем директории если они не существуют
STATIC_DIR.mkdir(exist_ok=True)
DB_DIR.mkdir(exist_ok=True)
from pathlib import Path
import shutil
import tempfile
import os
from typing import Any, Dict, List

app = FastAPI(title="Tool Detection Settings API", version="1.0.0")
settings = Settings()

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

def get_db_connection():
    conn = sqlite3.connect(f"{DB_DIR}/ToolsAI.db")
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/")
async def read_root():
    logger.info("GET / - Request to root endpoint")
    return {"status": "ok", "message": "Tool Detection API is running"}


def read_config_file() -> Dict[str, Any]:
    """Чтение конфигурационного файла"""
    try:
        with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Config file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON in config file")
    
def write_config_file(config: Dict[str, Any]) -> None:
    """Запись конфигурационного файла"""
    try:
        with open(CONFIG_FILE_PATH, 'w', encoding='utf-8') as file:
            json.dump(config, file, indent=4, ensure_ascii=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error writing config file: {str(e)}")

@app.get("/api/settings")
async def get_config():
    """
    Получить содержимое конфигурационного файла
    """
    logger.info("GET /api/settings - Request to get configuration")
    return read_config_file()
    

@app.post("/api/settings")
async def update_settings(settings_data: dict):
    """
    Обновить настройки SystemSettings
    """
    logger.info("POST /api/settings - Request to update settings")
    try:
        # Читаем текущий конфиг
        config = read_config_file()
        
        # Обновляем только секцию SystemSettings
        config["SystemSettings"] = settings_data["SystemSettings"]

        # Сохраняем изменения
        write_config_file(config)
        
        logger.info("POST /api/settings - Settings updated successfully")
        return {"message": "Settings updated successfully", "settings": config["SystemSettings"]}
        
    except Exception as e:
        logger.error(f"POST /api/settings - Error updating settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")

# Метод для получения истории с пагинацией
@app.get("/api/history", response_model=HistoryResponse)
def get_history(page: int = Query(1, ge=1), limit: int = Query(10, ge=1)):
    logger.info(f"GET /api/history - Request for history page {page}, limit {limit}")
    offset = (page - 1) * limit
    conn = get_db_connection()
    cursor = conn.cursor()

    # Получаем операции с пагинацией
    cursor.execute("""
        SELECT * FROM RecognitionOperation
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
    """, (limit, offset))
    operations = cursor.fetchall()

    result_list = []

    for op in operations:
        op_id = op["id"]

        # Получаем суммарное время и средний overallMatch по изображениям
        cursor.execute("""
            SELECT SUM(detection_time) as total_detection, AVG(image_confidence) as avg_conf
            FROM ImageRecognitionData
            WHERE op_id = ?
        """, (op_id,))
        stats = cursor.fetchone()
        total_detection = stats["total_detection"] or 0
        avg_match = op['overall_match']

        summary = RecognitionHistorySummary(
            id=str(op_id),
            timestamp=op["timestamp"],
            imageCount=op["images_count"], 
            detectionTime=total_detection,
            overallMatch=avg_match,
            recognition=op["recognition"]
        )
        result_list.append(summary)

    conn.close()
    logger.info(f"GET /api/history - Returned {len(result_list)} history records")
    return HistoryResponse(operations=result_list)

@app.get("/api/images/{image_id}")
def get_image(image_id: int):
    logger.info(f"GET /api/images/{image_id} - Request for image")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
                SELECT image_url FROM ImageRecognitionData WHERE image_id = ?
            """, (image_id,))
        image_row = cursor.fetchone()
        if not image_row:
            logger.warning(f"GET /api/images/{image_id} - Image not found")
            raise HTTPException(status_code=404, detail="Image not found")
        conn.close()

        current_file_dir = os.path.dirname(os.path.abspath(__file__))
        image_url = image_row["image_url"]
        logger.info(f"GET /api/images/{image_id} - Image found, returning file")
        return FileResponse(f"{current_file_dir}/../{image_url}", media_type="image/jpeg")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"GET /api/images/{image_id} - Error retrieving image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
# Метод для получения информации об операции по id
@app.get("/api/history/{operation_id}", response_model=OperationDetailsResponse)
def get_operation(operation_id: int):
    logger.info(f"GET /api/history/{operation_id} - Request for operation details")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Получаем операцию
        cursor.execute("""
            SELECT * FROM RecognitionOperation WHERE id = ?
        """, (operation_id,))
        op_row = cursor.fetchone()
        if not op_row:
            conn.close()
            logger.warning(f"GET /api/history/{operation_id} - Operation not found")
            raise HTTPException(status_code=404, detail="Operation not found")

        # Получаем изображения для операции
        cursor.execute("""
            SELECT * FROM ImageRecognitionData WHERE op_id = ?
        """, (operation_id,))
        image_rows = cursor.fetchall()

        images_list = []
        total_detection_time = 0

        for img in image_rows:
            image_id = img["image_id"]
            total_detection_time += img["detection_time"]

            # Получаем результаты распознавания для изображения
            cursor.execute("""
                SELECT * FROM RecognitionResult WHERE image_id = ?
            """, (image_id,))
            result_rows = cursor.fetchall()

            results_list = []
            for res in result_rows:
                confidence_value = float(res["confidence"])
                results_list.append(RecognitionResult(
                    id=res["id"],
                    name=res["name"],
                    confidence=round(confidence_value, 4),
                    color=res["color"]
                ))

            images_list.append(ImageRecognitionDataModel(
                imageId=str(img["image_id"]),
                imageUrl=img["image_url"],
                fileName=img["file_name"],
                detectionTime=img["detection_time"],
                imageConfidence=round(img["image_confidence"], 4),
                results=results_list
            ))
        

        summary = SummaryModel(
            totalImages=len(images_list),
            totalDetectionTime=total_detection_time,
            averageMatch=round(op_row["overall_match"], 4)
        )

        operation_data = RecognitionOperationModel(
            id=str(op_row["id"]),
            timestamp=op_row["timestamp"],
            images=images_list,
            summary=summary,
            toolset=op_row["kit_name"],
            recognition=op_row["recognition"]
        )

        conn.close()
        logger.info(f"GET /api/history/{operation_id} - Operation details retrieved successfully")
        return OperationDetailsResponse(operation=operation_data)
    except HTTPException as http_exc:
        raise http_exc  
    except Exception as e:
        logger.error(f"GET /api/history/{operation_id} - Error retrieving operation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    
@app.get('/api/statistics/history', response_model=HistoryStatistics)
def get_statistics():
    logger.info("GET /api/statistics/history - Request for history statistics")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
 
        cursor.execute("""SELECT
                        (SELECT COUNT(*) FROM RecognitionOperation) as total_operations,
                        (SELECT COUNT(*) FROM ImageRecognitionData) as total_images,
                        (SELECT AVG(detection_time) FROM ImageRecognitionData) as avg_processing_time,
                        (SELECT AVG(confidence) FROM RecognitionResult) as avg_confidence;""")

        stat_row = cursor.fetchone()
        if not stat_row:
                conn.close()
                logger.warning("GET /api/statistics/history - Statistics not found")
                raise HTTPException(status_code=404, detail="Statistic not found")
   
        statistic = HistoryStatistics(
            totalOperations=stat_row["total_operations"],
            totalImages=stat_row["total_images"],
            averageProcessingTime=int(stat_row["avg_processing_time"] or 0),
            averageAccuracy=round(float(stat_row["avg_confidence"] or 0), 4)
        )

        conn.close()
        logger.info("GET /api/statistics/history - Statistics retrieved successfully")
        return statistic
    except HTTPException as http_exc:
        raise http_exc  
    except Exception as e:
        logger.error(f"GET /api/statistics/history - Error retrieving statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Основной обработчик сообщений ---
async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            data = json.loads(message.body.decode())
            operation = RecognitionOperationModel(**data)
            logger.info(f"Processing message from RabbitMQ: Operation ID {operation.id}")

            conn = get_db_connection()
            cursor = conn.cursor()

            # --- Вставляем операцию ---
            cursor.execute("""
                INSERT INTO RecognitionOperation (timestamp, images_count, overall_match, kit_name, recognition)
                VALUES (?, ?, ?, ?, ?)
            """, (
                operation.timestamp,
                operation.summary.totalImages,
                operation.summary.averageMatch,
                operation.toolset,
                operation.recognition
            ))
            op_id = cursor.lastrowid

            # --- Вставляем изображения ---
            for img in operation.images:
                cursor.execute("""
                    INSERT INTO ImageRecognitionData (image_url, file_name, detection_time, image_confidence, row_results, op_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    img.imageUrl,
                    img.fileName,
                    img.detectionTime,
                    img.imageConfidence,
                    json.dumps([r.dict() for r in img.results]),  # сохраняем исходные результаты в JSON
                    op_id
                ))
                image_id = cursor.lastrowid

                # --- Вставляем результаты распознавания ---
                for res in img.results:
                    cursor.execute("""
                        INSERT INTO RecognitionResult (name, confidence, color, image_id)
                        VALUES (?, ?, ?, ?)
                    """, (
                        res.name,
                        res.confidence,
                        res.color,
                        image_id,
                    ))

            conn.commit()
            conn.close()
            logger.info(f"Operation {operation.id} successfully saved to database")

        except Exception as e:
            logger.error(f"Error processing message: {e}")


# --- Консьюмер ---
async def consume_rabbitmq():
    logger.info("Starting RabbitMQ consumer")
    connection = await aio_pika.connect_robust("amqp://guest:guest@localhost/")
    channel = await connection.channel()
    queue = await channel.declare_queue("analysis_results", durable=True)
    await queue.consume(process_message)
    logger.info("Listening for analysis results...")
    await asyncio.Future()

# --- Фоновый таск при старте ---
@app.on_event("startup")
async def startup_event():
    logger.info("App2 starting up - creating RabbitMQ consumer task")
    asyncio.create_task(consume_rabbitmq())
