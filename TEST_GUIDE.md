# 🧪 Simple-RAG 프론트엔드 테스트 가이드

## 📋 개요
Simple-RAG 프론트엔드 프로젝트를 로컬 환경에서 테스트하고 Railway에 배포하기 위한 가이드입니다.

## 🚀 빠른 시작

### 1. 최소 테스트 (MVP)
```bash
# 가장 빠른 테스트
./quick-test.sh
```

### 2. 상세 테스트
```bash
# 상세한 테스트 및 옵션 선택
./test-local.sh
```

### 3. Docker 통합 테스트
```bash
# Docker Compose로 전체 스택 테스트
./test-docker.sh
```

## 📁 테스트 스크립트 설명

### **quick-test.sh** ⚡
- **목적**: 가장 빠른 MVP 테스트
- **기능**: 
  - 의존성 자동 설치
  - 빌드 검증
  - 개발 서버 즉시 실행
- **사용 시나리오**: 빠른 동작 확인이 필요할 때

### **test-local.sh** 🔧
- **목적**: 상세한 로컬 환경 테스트
- **기능**:
  - Node.js 환경 검증
  - 의존성 상태 확인
  - 환경 변수 설정
  - 빌드 및 린트 테스트
  - 포트 충돌 검사
  - 3가지 실행 모드 선택 (개발/미리보기/프로덕션)
- **사용 시나리오**: 전체적인 프로젝트 상태 점검

### **test-docker.sh** 🐳
- **목적**: Docker 환경에서 통합 테스트
- **기능**:
  - Docker Compose로 프론트엔드 + 모의 백엔드 실행
  - 컨테이너 관리 (시작/중지/재시작/로그)
  - 프로덕션 환경 시뮬레이션
- **사용 시나리오**: 배포 전 최종 테스트

## 📊 테스트 결과 확인

### ✅ 성공 지표
1. **빌드 성공**: `npm run build` 오류 없음
2. **번들 크기**: dist 폴더 약 1MB 이하
3. **개발 서버**: http://localhost:5173 접속 가능
4. **프로덕션 서버**: http://localhost:3000 접속 가능

### 🔍 주요 확인 사항
- [ ] 페이지 로딩 정상
- [ ] 다크모드 토글 동작
- [ ] 탭 전환 동작
- [ ] API 연결 상태 표시 (정상/오류)
- [ ] 관리자 대시보드 링크 동작

## 🚢 Railway 배포 정보

### 설정 파일
- **railway.toml**: Railway 배포 설정
- **nixpacks.toml**: 빌드 환경 설정
- **package.json**: serve 명령어 포함

### 배포 명령어
```bash
# Railway CLI로 배포 (Railway CLI 설치 필요)
railway up

# 또는 GitHub 연동 후 자동 배포
```

### 환경 변수 (Railway 대시보드에서 설정)
```
NODE_ENV=production
VITE_API_BASE_URL=https://your-backend-url.railway.app
```

## 🐛 문제 해결

### 포트 충돌
```bash
# 5173 포트 사용 중인 프로세스 확인
lsof -i :5173

# 프로세스 종료
kill -9 [PID]
```

### 의존성 오류
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### 빌드 오류
```bash
# TypeScript 오류 확인
npx tsc --noEmit

# 린트 오류 확인
npm run lint
```

## 📈 성능 메트릭

### 현재 상태 (테스트 완료)
- **빌드 시간**: ~4.5초
- **번들 크기**: 
  - vendor: 12.22 KB
  - utils: 12.68 KB
  - router: 32.30 KB
  - ui: 342.15 KB
  - index: 670.88 KB
  - **총합**: ~1.07 MB
- **개발 서버 시작**: ~200ms
- **의존성**: 364 packages

### 개선 가능 영역
1. localStorage → secure storage 마이그레이션
2. console.log 제거 (프로덕션)
3. 번들 크기 최적화 (tree-shaking)
4. 상태 관리 솔루션 도입

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. Node.js 버전: 18.x 이상
2. npm 버전: 8.x 이상
3. 포트 가용성: 5173, 4173, 3000
4. 네트워크 연결 상태

---

**Last Updated**: 2025-01-01
**Version**: MVP 1.0