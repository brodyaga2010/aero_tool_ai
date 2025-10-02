FROM ultralytics/ultralytics:latest-cpu

WORKDIR /app

COPY requirements.txt .

# Устанавливаем ultralytics без зависимостей
RUN pip install --no-cache-dir --no-deps -r requirements.txt

COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "run.py"]