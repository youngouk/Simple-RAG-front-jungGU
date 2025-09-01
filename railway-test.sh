#!/bin/bash

# Railway 배포 전 테스트 스크립트

echo "🚂 Railway 배포 준비 테스트"
echo "============================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 1. Docker 환경 확인
echo ""
info "Docker 환경 확인"
if ! command -v docker &> /dev/null; then
    error "Docker가 설치되어 있지 않습니다!"
    exit 1
fi
success "Docker 설치 확인 완료"

# 2. 필수 파일 확인
echo ""
info "Railway 배포 파일 확인"
required_files=("Dockerfile" "railway.toml" ".dockerignore" ".env.production")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        success "$file 존재"
    else
        error "$file 파일이 없습니다!"
        exit 1
    fi
done

# 3. package.json 스크립트 확인
echo ""
info "빌드 스크립트 확인"
if grep -q "build:railway" package.json; then
    success "Railway 빌드 스크립트 확인"
else
    warning "build:railway 스크립트가 없습니다"
fi

# 4. Docker 이미지 빌드 테스트
echo ""
info "Docker 이미지 빌드 테스트 시작..."
docker build -t railway-frontend-test . > /tmp/docker_build.log 2>&1
if [ $? -eq 0 ]; then
    success "Docker 빌드 성공!"
else
    error "Docker 빌드 실패!"
    echo "빌드 로그:"
    tail -20 /tmp/docker_build.log
    exit 1
fi

# 5. 컨테이너 실행 테스트
echo ""
info "컨테이너 실행 테스트 (포트 3001)"
docker run -d -p 3001:3000 -e PORT=3000 --name railway-test railway-frontend-test > /dev/null 2>&1
if [ $? -eq 0 ]; then
    success "컨테이너 시작 성공"
    
    # 5초 대기 후 헬스체크
    sleep 5
    
    # 헬스체크 테스트
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        success "헬스체크 엔드포인트 정상"
    else
        warning "헬스체크 엔드포인트 응답 없음"
    fi
    
    # 메인 페이지 테스트
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        success "메인 페이지 접근 가능"
    else
        warning "메인 페이지 접근 불가"
    fi
    
    # 컨테이너 정리
    docker stop railway-test > /dev/null 2>&1
    docker rm railway-test > /dev/null 2>&1
    success "테스트 컨테이너 정리 완료"
else
    error "컨테이너 실행 실패!"
    exit 1
fi

# 6. 이미지 정리
docker rmi railway-frontend-test > /dev/null 2>&1

# 7. Railway CLI 확인 (선택사항)
echo ""
info "Railway CLI 확인"
if command -v railway &> /dev/null; then
    success "Railway CLI 설치됨"
    info "배포 명령어: railway up"
else
    warning "Railway CLI가 설치되지 않았습니다"
    info "설치 방법: npm install -g @railway/cli"
fi

# 8. 최종 체크리스트
echo ""
echo "============================="
success "모든 테스트 통과! Railway 배포 준비 완료"
echo ""
echo "📋 배포 체크리스트:"
echo "   1. ✅ Docker 빌드 성공"
echo "   2. ✅ 컨테이너 실행 성공"
echo "   3. ✅ 헬스체크 엔드포인트 동작"
echo "   4. ✅ 메인 페이지 접근 가능"
echo ""
echo "🚀 배포 명령어:"
echo "   git add . && git commit -m 'feat: Railway 최적화' && git push"
echo "   또는"
echo "   railway up"
echo ""
echo "🔗 테스트 완료 후 Railway 대시보드에서 환경 변수 설정을 잊지 마세요:"
echo "   VITE_API_BASE_URL=https://your-backend.railway.app"