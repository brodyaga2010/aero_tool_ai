from ultralytics import YOLO
import os

def train_yolo_with_tuning(dataset_yaml: str, weights: str = None, tune_epochs: int = 50, train_epochs: int = 100,
                           batch: int = 16, save_dir: str = "runs/train_auto"):
    """
    Автоматический подбор гиперпараметров и обучение YOLOv8 с их использованием.

    :param dataset_yaml: Путь к YAML файлу датасета
    :param weights: Путь к весам модели. Если None, используется yolov8n.pt
    :param tune_epochs: Количество эпох для подбора гиперпараметров
    :param train_epochs: Количество эпох для финального обучения
    :param batch: Размер батча для обучения
    :param save_dir: Папка для сохранения результатов
    """

    if not os.path.exists(dataset_yaml):
        raise ValueError(f"YAML файл не найден: {dataset_yaml}")

    if weights is None:
        weights = "yolov8n.pt"

    print("=== ШАГ 1: Подбор лучших гиперпараметров ===")
    model = YOLO(weights)

    # # Подбор гиперпараметров
    # tune_results = model.tune(
    #     data=dataset_yaml,
    #     epochs=tune_epochs,
    #     project=os.path.join(save_dir, "tuning"),
    #     name="hyperparameter_tuning",
    #     exist_ok=True
    # )

    # best_hyp = tune_results[0].hyperparameters if tune_results else None

    # if best_hyp:
    #     print("Лучшие гиперпараметры найдены:")
    #     for k, v in best_hyp.items():
    #         print(f"{k}: {v}")
    # else:
    #     print("Не удалось найти лучшие гиперпараметры. Используем стандартные.")

    print("\n=== ШАГ 2: Финальное обучение модели с найденными гиперпараметрами ===")
    # Обучение с найденными гиперпараметрами
    model.train(
        data=dataset_yaml,
        epochs=train_epochs,
        batch=batch,
        project=save_dir,
        name="final_training",
        exist_ok=True,
        # **(best_hyp if best_hyp else {})
    )

    print(f"Обучение завершено. Результаты сохранены в {os.path.join(save_dir, 'final_training')}")
