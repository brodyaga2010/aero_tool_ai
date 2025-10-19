import os
import shutil
import random
import yaml

def create_yolo_dataset_with_yaml(
    images_dir: str,
    labels_dir: str,
    save_dir: str,
    class_dict: dict,
    val_split: float = 0.2,
    seed: int = 42,
    yaml_filename: str = "dataset.yaml"
):
    """
    Создает датасет YOLO с разбиением на train/val и генерацией YAML файла.
    Копируются только изображения с аннотациями.

    :param images_dir: Путь к папке с изображениями
    :param labels_dir: Путь к папке с аннотациями
    :param save_dir: Путь, куда сохранить датасет
    :param class_dict: Словарь классов, например {0: "class0", 1: "class1"}
    :param val_split: Доля валидационного набора
    :param seed: Random seed для воспроизводимости
    :param yaml_filename: Имя YAML файла
    """

    # Проверяем существование папок
    if not os.path.exists(images_dir):
        raise ValueError(f"Папка с изображениями не найдена: {images_dir}")
    if not os.path.exists(labels_dir):
        raise ValueError(f"Папка с аннотациями не найдена: {labels_dir}")

    # Создаем структуру YOLO только для train/val
    for folder in ["images/train", "images/val", "labels/train", "labels/val"]:
        os.makedirs(os.path.join(save_dir, folder), exist_ok=True)

    # Получаем список изображений с аннотациями
    all_images = []
    missing_labels = []
    for f in os.listdir(images_dir):
        if f.lower().endswith(('.png', '.jpg', '.jpeg')):
            label_file = os.path.splitext(f)[0] + ".txt"
            if os.path.exists(os.path.join(labels_dir, label_file)):
                all_images.append(f)
            else:
                missing_labels.append(f)

    if missing_labels:
        print(f"Внимание! Пропущено {len(missing_labels)} изображений без аннотаций:")
        for f in missing_labels:
            print(f" - {f}")

    # Перемешиваем и делим на train/val
    random.seed(seed)
    random.shuffle(all_images)
    val_count = int(len(all_images) * val_split)
    val_images = all_images[:val_count]
    train_images = all_images[val_count:]

    print(f"Всего изображений с аннотациями: {len(all_images)}")
    print(f"Train: {len(train_images)}, Val: {len(val_images)}")

    # Функция для копирования файлов
    def copy_files(file_list, subset):
        for img_file in (file_list):
            img_src = os.path.join(images_dir, img_file)
            label_file = os.path.splitext(img_file)[0] + ".txt"
            label_src = os.path.join(labels_dir, label_file)

            img_dst = os.path.join(save_dir, f"images/{subset}", img_file)
            label_dst = os.path.join(save_dir, f"labels/{subset}", label_file)

            shutil.copy(img_src, img_dst)
            shutil.copy(label_src, label_dst)

    copy_files(train_images, "train")
    copy_files(val_images, "val")

    # Создание YAML файла без test
    yaml_dict = {
        "path": save_dir,
        "train": "images/train",
        "val": "images/val",
        "nc": len(class_dict),
        "names": class_dict
    }

    yaml_path = os.path.join(save_dir, yaml_filename)
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(yaml_dict, f, sort_keys=False, allow_unicode=True)
    print("yaml_dict " + str(yaml_dict))
    print(f"YAML файл создан: {yaml_path}")
    print(f"Датасет сохранен в {save_dir}")

# Пример использования
# class_dict = {
#     0: "Adjustable_wrench",
#     1: "screwdriver_1",
#     2: "screwdriver_2",
#     3: "Offset_Phillips_screwdriver",
#     4: "Side_cutters",
#     5: "Shernica",
#     6: "Safety_pliers",
#     7: "Pliers",
#     8: "Rotary_wheel",
#     9: "Open_end_wrench",
#     10: "Oil_can_opener"
# }
# create_yolo_dataset_with_yaml("path/to/images", "path/to/labels", "path/to/save", class_dict)
