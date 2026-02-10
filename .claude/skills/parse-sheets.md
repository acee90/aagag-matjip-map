# Parse Sheets Skill

맛집 데이터 파싱 및 검증을 관리하는 스킬.

## Trigger
사용자가 `/parse-sheets` 또는 "파싱", "시트 파싱", "맛집 데이터 추출" 등을 요청할 때.

## Context
- Google Sheets "애객세끼" 스프레드시트에서 맛집 데이터를 Playwright로 추출
- 스크립트: `scripts/parse-sheets.ts`
- 출력: `data/{지역명}.json`, `data/restaurants-all.json`

## 시트 구조
- 각 시트는 지역별 (서울, 인천, 대전, ...)
- 데이터는 **블록 단위** (5개 식당씩 가로 배치, 29행 간격)
- 블록 내 행 구조:
  - +0: 식당 이름 (col 2~6)
  - +2: 주소
  - +4: 링크 ("바로가기" 텍스트, `<a>` 태그)
  - +6: "추천사유" 라벨
  - +8: 추천사유 텍스트
  - +10: "카테고리 분류" 라벨
  - +12: 카테고리 값 (col별 3칸씩)
  - +15: 이미지

## Workflow

### 1. 특정 지역 파싱
```bash
bun run parse -- --region 인천
bun run parse -- --region 인천,서울,부산
```

### 2. 전체 파싱
```bash
bun run parse
```

### 3. 시트 목록 확인
```bash
bun run parse:list
```

### 4. 드라이런 (저장 없이 파싱만)
```bash
bun run parse -- --dry-run --region 인천
```

## 병렬 파싱 & 검증 (Subagent 사용)
여러 지역을 파싱할 때, 각 지역을 **Bash subagent**로 병렬 실행:

```
각 지역에 대해 Task tool (subagent_type: "Bash") 사용:
  bun run scripts/parse-sheets.ts --region {지역명}
```

파싱 결과 검증도 각 지역별로 **general-purpose subagent**를 병렬로 띄워서:
- data/{지역명}.json 파일 읽기
- 이름이 비어있거나 이상한 항목 탐지
- 주소 패턴 검증 (해당 지역명 포함 여부)
- 네이버 지도 링크 유효성 확인
- 카테고리 빈 항목 확인
- 중복 항목 탐지

## 파싱 에러 디버깅
warning이 발생하면:
1. 해당 rowIdx/colIdx로 시트에서 위치 확인
2. `scripts/parse-sheets.ts`의 카테고리 매핑 로직 확인
3. 블록 간격이 29가 아닌 경우 자동 감지 로직 확인

## 알려진 이슈
- 카테고리가 3칸이 아닌 경우 매핑 누락 가능 (카테고리 열 범위 조정 필요)
- 시트마다 첫 번째 블록 시작 행이 다를 수 있음 (자동 감지 로직으로 대응)
- Google redirect URL (`google.com/url?q=...`)을 실제 URL로 변환 필요 (구현됨)
