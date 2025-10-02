# nginx/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY react-app/package*.json ./
RUN npm ci --silent
COPY react-app/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
# (опционально) COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]