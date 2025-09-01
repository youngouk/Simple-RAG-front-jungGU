#!/bin/bash

# Simple-RAG 프론트엔드 로컬 테스트 스크립트
# MVP 수준의 빠른 테스트를 위한 스크립트

echo "🚀 Simple-RAG 프론트엔드 로컬 테스트 시작"
echo "==========================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수: 성공 메시지
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 함수: 오류 메시지
error() {
    echo -e "${RED}❌ $1${NC}"
}

# 함수: 정보 메시지
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 함수: 경고 메시지
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Node.js 버전 확인
echo ""
info "Node.js 환경 확인"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    success "Node.js 버전: $NODE_VERSION"
else
    error "Node.js가 설치되어 있지 않습니다!"
    exit 1
fi

# 2. 의존성 설치 확인
echo ""
info "의존성 확인 중..."
if [ ! -d "node_modules" ]; then
    warning "node_modules가 없습니다. 의존성을 설치합니다..."
    npm install
    if [ $? -eq 0 ]; then
        success "의존성 설치 완료!"
    else
        error "의존성 설치 실패!"
        exit 1
    fi
else
    success "의존성이 이미 설치되어 있습니다."
fi

# 3. 환경 변수 확인
echo ""
info "환경 변수 확인"
if [ ! -f ".env" ]; then
    warning ".env 파일이 없습니다. .env.example을 복사합니다..."
    cp .env.example .env
    info ".env 파일이 생성되었습니다. 필요한 경우 수정하세요."
else
    success ".env 파일이 존재합니다."
fi

# 4. 빌드 테스트
echo ""
info "프로덕션 빌드 테스트 중..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    success "빌드 성공!"
    # 빌드 크기 확인
    if [ -d "dist" ]; then
        TOTAL_SIZE=$(du -sh dist | cut -f1)
        info "빌드 크기: $TOTAL_SIZE"
    fi
else
    error "빌드 실패! 'npm run build'를 직접 실행하여 오류를 확인하세요."
fi

# 5. 린트 검사
echo ""
info "코드 품질 검사 중..."
npm run lint > /tmp/lint_output.txt 2>&1
if [ $? -eq 0 ]; then
    success "린트 검사 통과!"
else
    warning "린트 경고/오류가 있습니다:"
    cat /tmp/lint_output.txt | head -10
    echo "..."
    info "전체 린트 결과를 보려면 'npm run lint'를 실행하세요."
fi

# 6. 포트 확인
echo ""
info "포트 5173 확인 중..."
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    warning "포트 5173이 이미 사용 중입니다!"
    echo "기존 프로세스를 종료하시겠습니까? (y/n)"
    read -r answer
    if [ "$answer" = "y" ]; then
        PID=$(lsof -Pi :5173 -sTCP:LISTEN -t)
        kill $PID
        success "기존 프로세스를 종료했습니다."
    fi
else
    success "포트 5173을 사용할 수 있습니다."
fi

# 7. 개발 서버 실행 옵션
echo ""
echo "==========================================="
echo "테스트할 모드를 선택하세요:"
echo "1) 개발 서버 실행 (npm run dev)"
echo "2) 프로덕션 빌드 미리보기 (npm run preview)"
echo "3) 프로덕션 서버 실행 (serve)"
echo "4) 종료"
echo "==========================================="
read -p "선택 (1-4): " choice

case $choice in
    1)
        info "개발 서버를 시작합니다..."
        echo ""
        success "서버가 http://localhost:5173 에서 실행됩니다."
        info "종료하려면 Ctrl+C를 누르세요."
        echo ""
        npm run dev
        ;;
    2)
        info "프로덕션 빌드를 미리보기합니다..."
        echo ""
        success "서버가 http://localhost:4173 에서 실행됩니다."
        info "종료하려면 Ctrl+C를 누르세요."
        echo ""
        npm run preview
        ;;
    3)
        info "프로덕션 서버를 시작합니다..."
        PORT=3000
        echo ""
        success "서버가 http://localhost:$PORT 에서 실행됩니다."
        info "종료하려면 Ctrl+C를 누르세요."
        echo ""
        PORT=$PORT npm run serve
        ;;
    4)
        info "테스트를 종료합니다."
        exit 0
        ;;
    *)
        error "잘못된 선택입니다."
        exit 1
        ;;
esac