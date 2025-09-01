#!/bin/bash

# Docker Compose를 사용한 통합 테스트 스크립트

echo "🐳 Docker Compose 통합 테스트 시작"
echo "==========================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 함수 정의
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Docker 확인
if ! command -v docker &> /dev/null; then
    error "Docker가 설치되어 있지 않습니다!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose가 설치되어 있지 않습니다!"
    exit 1
fi

# 선택 메뉴
echo ""
echo "테스트 옵션을 선택하세요:"
echo "1) Docker Compose로 전체 스택 실행"
echo "2) 컨테이너 정리 및 재시작"
echo "3) 로그 확인"
echo "4) 컨테이너 중지 및 삭제"
echo "5) 종료"
echo "==========================================="
read -p "선택 (1-5): " choice

case $choice in
    1)
        info "Docker Compose로 서비스를 시작합니다..."
        docker-compose -f docker-compose.test.yml up --build -d
        
        if [ $? -eq 0 ]; then
            success "서비스가 시작되었습니다!"
            echo ""
            info "서비스 상태:"
            docker-compose -f docker-compose.test.yml ps
            echo ""
            success "프론트엔드: http://localhost:3000"
            success "백엔드 API: http://localhost:8000"
            echo ""
            info "로그를 보려면 './test-docker.sh' 실행 후 3번을 선택하세요."
        else
            error "서비스 시작 실패!"
            exit 1
        fi
        ;;
    
    2)
        info "기존 컨테이너를 정리하고 재시작합니다..."
        docker-compose -f docker-compose.test.yml down
        docker-compose -f docker-compose.test.yml up --build -d
        
        if [ $? -eq 0 ]; then
            success "서비스가 재시작되었습니다!"
        else
            error "재시작 실패!"
            exit 1
        fi
        ;;
    
    3)
        info "서비스 로그를 표시합니다..."
        docker-compose -f docker-compose.test.yml logs -f
        ;;
    
    4)
        warning "모든 컨테이너를 중지하고 삭제합니다..."
        docker-compose -f docker-compose.test.yml down -v
        
        if [ $? -eq 0 ]; then
            success "모든 컨테이너가 제거되었습니다."
        else
            error "컨테이너 제거 실패!"
            exit 1
        fi
        ;;
    
    5)
        info "종료합니다."
        exit 0
        ;;
    
    *)
        error "잘못된 선택입니다."
        exit 1
        ;;
esac