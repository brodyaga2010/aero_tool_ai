FROM ultralytics/ultralytics:latest

WORKDIR /app

COPY requirements.txt .

# Устанавливаем ultralytics без зависимостей
RUN pip install --no-cache-dir --no-deps -r requirements.txt

COPY . .

# Create directories for shared volumes
RUN mkdir -p /app/models /app/static /app/config /app/logs /app/static/SQLite /app/static/results

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "run.py"]
