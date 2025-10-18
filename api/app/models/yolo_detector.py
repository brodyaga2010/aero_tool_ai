from ultralytics import YOLO
from PIL import Image, ImageDraw
from pathlib import Path
from typing import Dict, Any
from datetime import datetime
import asyncio
from app.models.merger import merge_results

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

        # Загружаем модели на нужное устройство
        self.models = [YOLO(model_path1), YOLO(model_path2)]

        for model in self.models:
            model.conf = confidence_threshold

        # Цвета для классов
        self.class_colors = {
            "screwdriver_1": "blue",
            "screwdriver_2": "green",
            "Offset_Phillips": "orange",
            "Side_cutters": "purple",
            "Shernica": "pink",
            "Safety_pliers": "cyan",
            "Pliers": "yellow",
            "Rotary_wheel": "brown",
            "Open_end_wrench": "lime",
            "Oil_can_opener": "magenta",
            "Adjustable_wrench": "teal",
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

        # Запускаем обе модели параллельно
        results_list = await asyncio.gather(
            *[self._run_model(model, image) for model in self.models]
        )

        final_detections = merge_results(results_list[0], results_list[1], self.models[0].names, self.models[1].names)

        detections = []
        for det in final_detections.values():
            cls = det["class"]
            color = self.class_colors.get(cls, "red")

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
            scale = max(img_w, img_h) / 1000  # коэффициент масштабирования
            line_width = max(2, int(6 * scale))  # минимальная толщина = 2 px

            # Рисуем рамку
            draw.rectangle([x1, y1, x2, y2], outline=color, width=line_width)

        img_with_boxes.save(output_path)

        return {
            "detections": detections,
            "image_path": f"/static/results/{output_path.name}",
            "image_size": image.size
        }