FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# Устанавливаем системные зависимости для OpenCV
# Установка системных зависимостей ТОЛЬКО для opencv-python-headless и базовых библиотек
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем PyTorch и TorchVision из CPU-индекса
RUN pip install --no-cache-dir \
    torch==2.8.0 \
    torchvision==0.23.0 \
    --index-url https://download.pytorch.org/whl/cpu

# Копируем requirements.txt
COPY requirements.txt .

# Устанавливаем ultralytics без зависимостей
RUN pip install --no-cache-dir -r requirements.txt

# Устанавливаем остальные зависимости вручную (без torch)
RUN pip install --no-cache-dir \
    numpy==2.2.6 \
    opencv-python-headless==4.12.0.88 \
    requests==2.32.5 \
    pillow==11.3.0 \
    typing_extensions==4.15.0
# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "run.py"]