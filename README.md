# 나음 (Health Agent)

디지털 건강 문진표 기반 AI 건강 상담 서비스

사용자가 구조화된 문진표(기본 정보, 증상, 통증 강도, 방문 목적)를 작성하면, Neo4j 지식 그래프에서 관련 의학 정보를 조회하고 Gemini AI가 추가 질문 생성 및 최종 분석 결과를 제공합니다. 결과 화면에서 AI 채팅 상담, 주변 병원/약국 검색까지 이어집니다.

## 주요 기능

- **다단계 문진표** — 기본 정보, 증상 체크리스트, 기타 증상, 통증 강도를 단계별로 입력
- **AI 증상 분석** — Neo4j 의학 지식 그래프 + Gemini AI를 결합한 증상 분석 및 가이드 제공
- **추가 질문 생성** — AI가 맥락에 맞는 추가 질문을 동적으로 생성하여 분석 정확도 향상
- **AI 채팅 상담** — 분석 결과를 바탕으로 Gemini 기반 실시간 채팅 상담
- **주변 병원/약국 검색** — HIRA 공공 API + 네이버 지도 연동, 마커 클릭 시 네이버 지도 검색으로 이동
- **문진 이력 저장/조회** — Supabase DB에 분석 결과 자동 저장, `/history`에서 과거 기록 열람
- **증상 일지 트래커** — 매일 컨디션 점수·증상·메모 기록, Recharts 30일 추이 차트
- **Google 소셜 로그인** — Supabase Auth 기반, 미로그인 시 익명 기기 ID 폴백

## 기술 스택

| 영역 | 도구 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript (strict mode) |
| 스타일링 | TailwindCSS v4 + shadcn/ui |
| 폰트 | Pretendard Variable |
| 런타임 | React 19 |
| 패키지 매니저 | pnpm |
| AI 에이전트 | Google Gemini API (`gemini-2.5-flash`) |
| 지식 그래프 | Neo4j |
| 데이터베이스 | Supabase (PostgreSQL) + Drizzle ORM |
| 인증 | Supabase Auth (Google OAuth) |
| 차트 | Recharts |
| 지도 | 네이버 지도 JavaScript API v3 |
| 병원/약국 API | 건강보험심사평가원(HIRA) 공공 API |

## 데이터 흐름

```
문진표 작성 → Neo4j 증상 검색 → Gemini 추가 질문 생성 → 사용자 답변 → Gemini 최종 분석 → 결과 화면
                                                                                          ├── AI 채팅 상담
                                                                                          ├── 주변 병원 검색 (네이버 지도)
                                                                                          └── 주변 약국 검색 (네이버 지도)
```

## 시작하기

### 환경 변수 설정

`.env.local` 파일을 생성하고 아래 변수를 설정합니다.

```env
GEMINI_API_KEY=                    # Google Gemini API 키
NEO4J_URI=                         # Neo4j 연결 URI
NEO4J_USER=                        # Neo4j 사용자명
NEO4J_PASSWORD=                    # Neo4j 비밀번호
DATABASE_URL=                      # Supabase PostgreSQL 연결 문자열
NEXT_PUBLIC_SUPABASE_URL=          # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon key
HIRA_API_KEY=                      # 건강보험심사평가원 API 키
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=   # 네이버 클라우드 플랫폼 Client ID
```

> 비밀번호에 특수문자(`#`, `!` 등)가 포함된 경우 반드시 따옴표로 감싸세요.

### 설치 및 실행

```bash
pnpm install
```

### 데이터베이스 설정

```bash
pnpm db:generate   # Drizzle ORM 마이그레이션 파일 생성
pnpm db:migrate    # 마이그레이션 적용
pnpm db:push       # 스키마 직접 반영 (대안)
```

### 개발 서버

```bash
pnpm dev
```

[https://health-agent-theta.vercel.app/](https://health-agent-theta.vercel.app/)에서 확인할 수 있습니다.

### 프로덕션 빌드

```bash
pnpm build
pnpm start
```

## 프로젝트 구조

```
src/
  app/
    page.tsx                # 문진표 메인 페이지 (다단계 폼)
    chat/page.tsx           # AI 채팅 상담 페이지
    tracker/page.tsx        # 증상 일지 트래커
    history/page.tsx        # 문진 이력 목록
    history/[id]/page.tsx   # 문진 이력 상세
    api/
      chat/                 # 채팅 메시지 → Gemini 스트리밍 응답
      disease/              # 증상 검색 → 컨텍스트 → 추가 질문 → 분석
      hospitals/            # HIRA 병원 검색
      pharmacies/           # HIRA 약국 검색
      symptoms/             # Neo4j 증상 노드 목록
      intake-records/       # 문진 이력 CRUD
      symptom-logs/         # 증상 일지 CRUD
      auth/callback/        # OAuth 콜백
  components/
    intake/                 # 문진표 단계별 컴포넌트
    chat/                   # 채팅 UI 컴포넌트
    auth/                   # 인증 프로바이더
    ui/                     # shadcn/ui + 네이버 지도, 하단 내비 등
  db/
    schema.ts               # Drizzle ORM 스키마 (intake_records, symptom_logs)
    index.ts                # DB 연결
  lib/                      # Gemini, Neo4j, HIRA 클라이언트 및 유틸리티
  types/                    # 추가 타입 정의
```

## 데이터베이스 스키마

| 테이블 | 설명 |
|---|---|
| `intake_records` | 문진 기록 (폼 데이터, AI 분석 결과, 진료과 코드, 지식 그래프 컨텍스트) |
| `symptom_logs` | 증상 일지 (날짜별 컨디션 점수, 증상 목록, 메모) |

## 디자인 시스템

- **Primary Color**: Teal `#006974` — 신뢰감과 차분함을 전달하는 의료 테마
- **Surface**: Near-white `#f7fafa` — 깔끔한 임상적 분위기
- **Font**: Pretendard Variable — 한국어 최적화 가변 폰트
- **Border Radius**: `rounded-2xl` (1rem) 일관 적용
- **Mobile First**: 44px 이상 터치 타겟, 접근성 고려

## 주의사항

> 이 서비스의 모든 분석 결과는 참고용이며, 의학적 진단을 대체하지 않습니다. 정확한 진단과 치료를 위해 반드시 의료 전문가와 상담하세요.
