# B_muscle

개인 운동 기록용 웹 앱. 모바일 브라우저에서 열어서 운동하면서 바로 쓰는 용도로 만들었습니다.

**서비스 주소:** https://b-muscle.vercel.app (홈 화면에 추가하면 앱처럼 사용 가능)

## 기술 스택
- Expo SDK 57 + React Native Web (정적 웹 export, `expo export -p web`)
- Supabase: Auth(Google 로그인) + Postgres + Edge Function
- Google Gemini API (무료 티어): 과거 운동 기록 텍스트를 구조화 데이터로 변환
- Vercel: GitHub `main` 브랜치에 push하면 자동 배포

## 주요 기능
- 운동 시작/세트 기록, 루틴 템플릿, 주간·월간 통계
- **과거 기록 가져오기**: 텍스트(예: 워드문서 내용)를 붙여넣으면 Gemini가 날짜/종목/세트/무게/횟수/드롭세트/보조중량/홀드/칼로리를 파싱해서 미리보기 후 일괄 저장
- **홈 대시보드**: 운동 종목별 최근 기록(무게×횟수×세트)과 전체 기간 최고 기록(PR)을 카드로 표시
- Google 계정으로 로그인 (이메일/비밀번호 방식은 사용하지 않음)

## 환경변수 / 시크릿
| 이름 | 위치 | 용도 |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env`, Vercel 프로젝트 환경변수 | Supabase 클라이언트 연결 |
| `GEMINI_API_KEY` | Supabase Edge Function 시크릿 (`supabase secrets set`) | 과거 기록 파싱용 Gemini 호출 |

Gemini 키는 결제 계정이 연결되지 않은 Google Cloud 프로젝트에서 발급해야 무료 한도 초과 시 과금 없이 그냥 차단됩니다.

## 배포 방법
```bash
npx expo export -p web        # 로컬 빌드 확인
git push origin main           # Vercel이 자동으로 빌드/배포
```
Edge Function 수정 시에는 별도로 배포 필요:
```bash
npx supabase functions deploy parse-workout-log --project-ref ghdfebfqqmxqkflbbkkf
```

## 알려진 제약
- Gemini 무료 티어는 분당/일별 호출 한도가 있어 몰릴 경우 "사용량이 넘어가서 이용할 수 없습니다" 메시지가 뜰 수 있음 (자동 재시도 5회 포함, 실패해도 과금 없음).
- Google 로그인은 Supabase 대시보드(Authentication → Providers)에 Google OAuth Client ID/Secret이 등록되어 있어야 동작함.
