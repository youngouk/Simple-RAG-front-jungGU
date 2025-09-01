# Railway 최적화된 프론트엔드 Dockerfile
# Multi-stage build for production optimization

# Stage 1: Dependencies 설치
FROM node:18-alpine AS deps
WORKDIR /app

# package.json과 package-lock.json만 먼저 복사 (의존성 캐싱 최적화)
COPY package*.json ./

# 프로덕션 의존성만 설치 (개발 의존성 제외)
RUN npm ci --only=production --frozen-lockfile

# Stage 2: Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# 전체 의존성 설치 (devDependencies 포함)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# 소스 코드 복사
COPY . .

# TypeScript 및 ESLint 검사 (빌드 시 오류 조기 발견)
RUN npm run lint

# 프로덕션 빌드
RUN npm run build

# Stage 3: Production runtime
FROM nginx:alpine AS production

# 불필요한 nginx 기본 파일 제거
RUN rm -rf /usr/share/nginx/html/*

# 빌드된 파일을 nginx html 디렉토리에 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# Railway용 nginx 설정 파일 생성
RUN echo 'server { \
    listen $PORT; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gzip 압축 설정 \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_proxied expired no-cache no-store private must-revalidate auth; \
    gzip_types \
        text/plain \
        text/css \
        text/xml \
        text/javascript \
        application/javascript \
        application/xml+rss \
        application/json; \
    \
    # SPA 라우팅을 위한 설정 \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # 정적 자산 캐싱 \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # 보안 헤더 추가 \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header Referrer-Policy "no-referrer-when-downgrade" always; \
    add_header Content-Security-Policy "default-src '\''self'\'' http: https: data: blob: '\''unsafe-inline'\'';" always; \
    \
    # Health check endpoint \
    location /health { \
        access_log off; \
        return 200 "healthy\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf.template

# Railway PORT 환경 변수를 nginx 설정에 적용하는 스크립트
COPY <<EOF /docker-entrypoint.d/30-envsubst-on-templates.sh
#!/bin/sh
set -e

# Railway에서 제공하는 PORT 환경 변수를 nginx 설정에 적용
envsubst '\$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec "\$@"
EOF

# 스크립트 실행 권한 부여
RUN chmod +x /docker-entrypoint.d/30-envsubst-on-templates.sh

# Railway에서 동적으로 할당하는 포트 사용
EXPOSE $PORT

# nginx 실행 (Railway 환경에서 PORT 변수 사용)
CMD ["sh", "-c", "envsubst '\\$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]