# Repository Guidelines

## 프로젝트 구조 및 모듈 구성
- `src/main.tsx`가 React + MUI 앱을 기동하고, `src/App.tsx`가 업로드·문서·채팅·통계·관리자 탭을 연결합니다.
- 기능 컴포넌트는 `src/components/`, 라우팅 화면은 `src/pages/`에 배치합니다.
- RAG API 클라이언트는 `src/services/`에, 공용 훅·유틸·타입은 각각 `src/hooks/`, `src/utils/`, `src/types/`에 둡니다.
- 정적 자산은 `public/`, 운영 메모와 절차는 `docs/`에 정리합니다.

## 빌드·테스트·개발 명령어
- `npm install`: `package-lock.json`에 맞춰 의존성을 동기화합니다.
- `npm run dev`: Vite 개발 서버를 `http://localhost:5173`에서 핫 리로드와 함께 실행합니다.
- `npm run lint`: ESLint 규칙을 검사하며, 자동 수정은 `npm run lint -- --fix`로 실행합니다.
- `npm run build`: `dist/`에 프로덕션 번들을 생성하고, `npm run preview`로 결과를 확인합니다.
- `npm run build:railway`: 린트와 빌드를 통합하고 Railway 배포용 런타임 설정을 주입합니다.

## 코딩 스타일 및 네이밍 규칙
- TypeScript + React 환경에서 2스페이스 들여쓰기, 단일 인용부호, 필요한 곳의 트레일링 콤마를 사용합니다.
- 컴포넌트는 PascalCase, 훅은 `use` 접두사의 camelCase, 서비스는 의미 있는 명사형(`promptService`)을 사용합니다.
- 레이아웃은 MUI `sx` 프롭을 활용하고, 네트워크 호출은 서비스 모듈에 모아 UI 코드를 선언적으로 유지합니다.

## 테스트 가이드라인
- 자동화 테스트는 아직 없으므로 업로드, 문서 관리, 채팅, 관리자 대시보드를 수동으로 검증합니다.
- 향후 Vitest + React Testing Library를 도입할 경우, 테스트 파일을 원본과 같은 위치에 `*.test.tsx`로 두고 새 npm 스크립트를 `package.json`과 `docs/`에 기록합니다.

## 커밋 및 PR 가이드라인
- 커밋 메시지는 72자 이하의 간결한 카테고리 접두사 한글 형식(예: `개선: 채팅 대화 높이 조정`)을 따릅니다.
- PR에는 관련 이슈 링크, 동작 변화 요약, UI·DX 변경 시 스크린샷 또는 로그를 포함합니다.
- 수동 검증 항목(업로드, 삭제, 채팅, 대시보드)과 맞춰야 하는 환경 변수 변경 사항을 명시합니다.

## 설정 팁
- 환경 변수는 `.env`에 정의하고 예: `VITE_API_BASE_URL=http://localhost:3000`; `src/services/api.ts`를 통해 로드합니다.
- `generate-config.js`가 배포 시 `dist/config.js`를 생성하므로, 런타임 플래그를 추가할 때 스크립트와 서비스 레이어를 함께 수정합니다.
