# nginx/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package.json и устанавливаем ВСЕ зависимости (включая dev)
COPY package*.json ./
RUN npm install

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# ---- Финальный образ ----
FROM nginx:alpine

# Копируем собранный статический клиент (и, возможно, серверную часть — см. ниже!)
COPY --from=builder /app/build/client /usr/share/nginx/html
# (опционально) COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]