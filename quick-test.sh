#!/bin/bash

# 빠른 MVP 테스트 스크립트 (최소 기능 테스트)

echo "⚡ Simple-RAG 빠른 테스트"
echo "========================="

# 간단한 체크 함수
check() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
    else
        echo "❌ $1 실패!"
        exit 1
    fi
}

# 1. 의존성 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install --silent
    check "의존성 설치"
else
    echo "✅ 의존성 확인"
fi

# 2. 빌드 테스트
echo "🔨 빌드 테스트 중..."
npm run build > /dev/null 2>&1
check "빌드 성공"

# 3. 개발 서버 실행
echo ""
echo "🚀 개발 서버를 시작합니다..."
echo "   주소: http://localhost:5173"
echo "   종료: Ctrl+C"
echo "========================="
npm run dev