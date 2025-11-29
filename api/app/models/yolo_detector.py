import base64
from io import BytesIO
from ultralytics import YOLO
from PIL import Image, ImageDraw
from pathlib import Path
from typing import Dict, Any
from datetime import datetime
import asyncio
from app.models.merger import merge_results
import time

class YOLODetector:
    def __init__(self, model_path1: str, model_path2: str, confidence_threshold: float = 0.5):
        """
        Детектор с двумя моделями YOLO
        Args:
            model_path1: путь к первой модели
            model_path2: путь ко второй модели
            confidence_threshold: порог уверенности
        """
        self.confidence_threshold = confidence_threshold
        # Инициализируем обе модели как YOLO
        self.models = [YOLO(model_path1), YOLO(model_path2)]
        
        for model in self.models:
            model.conf = confidence_threshold

        # Цвета для классов
        self.class_colors = {
            "screwdriver_1": "#1f77b4",        # Синий
            "screwdriver_2": "#2ca02c",        # Зеленый
            "Offset_Phillips": "#ff7f0e",      # Оранжевый
            "Offset_Phillips_screwdriver": "#ff7f0e",  # Оранжевый
            "Side_cutters": "#9467bd",         # Фиолетовый
            "Shernica": "#e377c2",             # Розовый
            "Safety_pliers": "#17becf",        # Бирюзовый
            "Pliers": "#d62728",               # КРАСНЫЙ (вместо желтого)
            "Rotary_wheel": "#8c564b",         # Коричневый
            "Open_end_wrench": "#7f7f7f",      # Серый
            "Oil_can_opener": "#bcbd22",       # Оливковый
            "Adjustable_wrench": "#9c27b0",    # Пурпурный
        }

    def update_confidence_threshold(self, threshold: float):
        """Обновление порога уверенности"""
        self.confidence_threshold = threshold
        for model in self.models:
            model.conf = threshold

    async def _run_model(self, model, image):
        """Асинхронный запуск одной модели"""
        return await asyncio.to_thread(model, image)

    async def detect_image(self, image_path: str) -> Dict[str, Any]:
        """
        Детекция изображения с двумя моделями (асинхронно).
        Для каждого класса оставляем результат с максимальной уверенностью.
        """
        image = Image.open(image_path).convert('RGB')

        start = time.time()

        # Запускаем обе модели параллельно
        results_list = await asyncio.gather(
            *[self._run_model(model, image) for model in self.models]
        )

        final_detections = merge_results(results_list[0], results_list[1], self.models[0].names, self.models[1].names)

        end_time = time.time()
        
        detections = []
        for det in final_detections:
            cls = det["class"]
            color = self.class_colors.get(cls, "#000000")
            if det['confidence'] < 0.50:
                continue
            detections.append({
                "bbox": det["bbox"],
                "confidence": det["confidence"],
                "class": cls,
                "color": color
            })

        # Сохраняем изображение с финальными боксами
        output_dir = Path("static/results")
        output_dir.mkdir(parents=True, exist_ok=True)

        original_extension = Path(image_path).suffix or '.jpg'
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"detected_{timestamp}{original_extension}"
        output_path = output_dir / output_filename

        img_with_boxes = image.copy()
        draw = ImageDraw.Draw(img_with_boxes)

        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            cls = det["class"]

            color = self.class_colors.get(cls, "red")

            img_w, img_h = image.size
            scale = max(img_w, img_h) / 2500  # коэффициент масштабирования
            line_width = max(2, int(6 * scale))  # минимальная толщина = 2 px

            # Рисуем рамку
            draw.rectangle([x1, y1, x2, y2], outline=color, width=line_width)

        img_with_boxes.save(output_path)

        buffered = BytesIO()
        img_with_boxes.save(buffered, format="JPEG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return {
            "detections": detections,
            "image_path": f"/static/results/{output_path.name}",
            "image_size": image.size,
            "processing_time": int((end_time - start)*1000),
            "image_base64": img_base64,
        }