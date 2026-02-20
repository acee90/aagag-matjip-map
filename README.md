# 애객 맛집 지도

전국 맛집 정보를 네이버 지도 위에 표시하는 웹 애플리케이션입니다.

**https://aagag.matjip.site**

## 데이터 출처

이 프로젝트의 맛집 데이터는 **[애객세끼](https://docs.google.com/spreadsheets/d/1VkCrA0KODJUfr89z8vnWNDJLFz2AtOSGG-JsBLzdGww/edit?gid=1137279898#gid=1137279898)** Google Sheets에서 가져왔습니다.

- 전국 110개 지역, 2,033개 맛집
- 카테고리: 한식, 중식, 일식, 양식, 분식, 술안주, 데이트, 단체 등

> 모든 맛집 정보의 저작권은 원저작자(애객세끼)에게 있습니다.

## 주요 기능

- 네이버 지도 기반 맛집 마커 표시
- 현재 위치 기반 주변 맛집 탐색
- 카테고리별 필터링
- 지도 영역 내 맛집 검색
- 모바일/데스크톱 반응형 UI

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | [TanStack Start](https://tanstack.com/start) (React 19, SSR) |
| 지도 | [Naver Maps API](https://www.ncloud.com/product/applicationService/maps) + [react-naver-maps](https://github.com/zeakd/react-naver-maps) |
| 스타일링 | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| 배포 | [Cloudflare Workers](https://workers.cloudflare.com/) |
| 테스트 | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |
| 런타임 | [Bun](https://bun.sh/) |

## 시작하기

```bash
# 의존성 설치
bun install

# 환경변수 설정
cp .env.example .env
# .env 파일에 VITE_NAVER_MAP_CLIENT_ID 설정

# 개발 서버 실행
bun --bun run dev
```

## 스크립트

```bash
bun --bun run dev        # 개발 서버
bun --bun run build      # 프로덕션 빌드
bun --bun run test       # 테스트 실행
bun run deploy           # Cloudflare Workers 배포
bun run parse            # Google Sheets 데이터 파싱
bun run geocode          # 맛집 좌표 데이터 생성 (Nominatim)
```

## 라이선스

MIT
