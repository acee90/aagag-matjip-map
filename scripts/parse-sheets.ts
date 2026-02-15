/**
 * Google Sheets 맛집 데이터 파싱 스크립트
 *
 * Playwright로 Google Sheets htmlview에 접속하여
 * 각 지역 시트에서 식당 데이터를 추출한다.
 *
 * 사용법:
 *   bun run scripts/parse-sheets.ts                    # 모든 시트 파싱
 *   bun run scripts/parse-sheets.ts --region 인천       # 특정 지역만
 *   bun run scripts/parse-sheets.ts --region 인천,서울   # 여러 지역
 *   bun run scripts/parse-sheets.ts --list              # 시트 목록 출력
 *   bun run scripts/parse-sheets.ts --dry-run           # 파싱만 하고 저장 안함
 */
import { chromium, type Page } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

// ─── Types ───────────────────────────────────────────────────────
export interface Restaurant {
  name: string;
  address: string;
  link: string;
  recommendation: string;
  categories: string[];
}

export interface SheetInfo {
  name: string;
  gid: string;
}

export interface ParseResult {
  region: string;
  restaurants: Restaurant[];
  errors: ParseError[];
}

export interface ParseError {
  rowIdx: number;
  colIdx: number;
  field: string;
  message: string;
  raw?: string;
}

// ─── Constants ───────────────────────────────────────────────────
const SPREADSHEET_ID = "1VkCrA0KODJUfr89z8vnWNDJLFz2AtOSGG-JsBLzdGww";
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/htmlview/sheet?headers=true&gid=`;

/** 헤더 행 (Row 6)에 있는 카테고리 목록 */
const KNOWN_CATEGORIES = [
  "한식",
  "중식",
  "일식",
  "양식",
  "아시아",
  "지중해",
  "분식",
  "간식",
  "단체",
  "데이트",
  "술안주",
  "체인점",
  "등산",
];

/**
 * 시트 목록 (html/애객세끼 - Google Drive.html의 items.push에서 추출)
 * 메인화면, 필독 공지사항은 데이터 시트가 아니므로 제외
 */
const SHEETS: SheetInfo[] = [
  { name: "서울", gid: "1764281125" },
  { name: "인천", gid: "1101901996" },
  { name: "대전", gid: "1470212723" },
  { name: "대구", gid: "2134776055" },
  { name: "울산", gid: "1482917301" },
  { name: "부산", gid: "843336361" },
  { name: "문경", gid: "135860271" },
  { name: "상주", gid: "1678440470" },
  { name: "영주", gid: "1989603595" },
  { name: "울진", gid: "950822491" },
  { name: "예천", gid: "829581411" },
  { name: "봉화", gid: "615327319" },
  { name: "안동", gid: "172261138" },
  { name: "영양", gid: "1322616804" },
  { name: "의성", gid: "233598081" },
  { name: "청송", gid: "1105849734" },
  { name: "영덕", gid: "1649800181" },
  { name: "김천", gid: "1802312842" },
  { name: "구미", gid: "56449280" },
  { name: "성주", gid: "913103829" },
  { name: "칠곡", gid: "1774265509" },
  { name: "고령", gid: "104379723" },
  { name: "영천", gid: "1252314913" },
  { name: "포항", gid: "1117093253" },
  { name: "경산", gid: "1168202526" },
  { name: "청도", gid: "1599432355" },
  { name: "경주", gid: "994204553" },
  { name: "광주", gid: "1311453212" },
  { name: "가평", gid: "65784687" },
  { name: "고양", gid: "399815991" },
  { name: "경기 광주", gid: "607463924" },
  { name: "구리", gid: "7233106" },
  { name: "군포", gid: "165599850" },
  { name: "김포", gid: "1566543247" },
  { name: "남양주", gid: "1781441040" },
  { name: "부천", gid: "118086494" },
  { name: "성남", gid: "152791801" },
  { name: "수원", gid: "153120515" },
  { name: "시흥", gid: "943692441" },
  { name: "안산", gid: "620112581" },
  { name: "안성", gid: "159443344" },
  { name: "안양", gid: "83106709" },
  { name: "양주", gid: "457828926" },
  { name: "양평", gid: "992302764" },
  { name: "여주", gid: "1179403659" },
  { name: "용인", gid: "498938031" },
  { name: "의왕", gid: "2108171998" },
  { name: "의정부", gid: "1079131704" },
  { name: "이천", gid: "267344825" },
  { name: "오산", gid: "427865077" },
  { name: "파주", gid: "1874925416" },
  { name: "평택", gid: "1488259377" },
  { name: "하남", gid: "1567515917" },
  { name: "포천", gid: "324385594" },
  { name: "동두천", gid: "1127474116" },
  { name: "화성", gid: "1090092744" },
  { name: "광명", gid: "1964653717" },
  { name: "연천", gid: "727118968" },
  { name: "강릉", gid: "2096124464" },
  { name: "강원 고성", gid: "1356100276" },
  { name: "동해", gid: "1621954528" },
  { name: "양양", gid: "1382564726" },
  { name: "속초", gid: "1510821413" },
  { name: "원주", gid: "1563586259" },
  { name: "영월", gid: "221208032" },
  { name: "춘천", gid: "1145812703" },
  { name: "태백", gid: "448011755" },
  { name: "평창", gid: "1204258887" },
  { name: "홍천", gid: "503394524" },
  { name: "철원", gid: "1148427279" },
  { name: "화천", gid: "217531185" },
  { name: "양구", gid: "1531642651" },
  { name: "인제", gid: "1944946777" },
  { name: "정선", gid: "552842335" },
  { name: "삼척", gid: "702242849" },
  { name: "횡성", gid: "106931021" },
  { name: "제주", gid: "55350706" },
  { name: "충주", gid: "403562165" },
  { name: "청주", gid: "380123996" },
  { name: "제천", gid: "1567106117" },
  { name: "홍성", gid: "492779338" },
  { name: "단양", gid: "636372226" },
  { name: "음성", gid: "1726504066" },
  { name: "괴산", gid: "277333331" },
  { name: "진천", gid: "360176114" },
  { name: "증평", gid: "1584353713" },
  { name: "보은", gid: "3296196" },
  { name: "옥천", gid: "909843959" },
  { name: "영동", gid: "658285858" },
  { name: "천안", gid: "1266516432" },
  { name: "아산", gid: "412928136" },
  { name: "서산", gid: "2120431700" },
  { name: "당진", gid: "860662004" },
  { name: "공주", gid: "1741400618" },
  { name: "보령", gid: "1316452979" },
  { name: "계룡", gid: "1973076414" },
  { name: "논산", gid: "634732849" },
  { name: "예산", gid: "671053445" },
  { name: "부여", gid: "2066180002" },
  { name: "서천", gid: "466593551" },
  { name: "청양", gid: "1437002200" },
  { name: "태안", gid: "1372860226" },
  { name: "금산", gid: "283644272" },
  { name: "세종", gid: "1027141593" },
  { name: "전주", gid: "808456728" },
  { name: "익산", gid: "1890930267" },
  { name: "군산", gid: "677034994" },
  { name: "정읍", gid: "1272970106" },
  { name: "남원", gid: "1886790415" },
  { name: "김제", gid: "1449819952" },
  { name: "무주", gid: "1024405322" },
  { name: "완주", gid: "171494214" },
  { name: "부안", gid: "1353382801" },
  { name: "고창", gid: "707990597" },
  { name: "임실", gid: "518668009" },
  { name: "순창", gid: "547290663" },
  { name: "진안", gid: "1943143667" },
  { name: "장수", gid: "171150825" },
  { name: "목포", gid: "2000520802" },
  { name: "여수", gid: "1972876699" },
  { name: "순천", gid: "1275601090" },
  { name: "나주", gid: "453564984" },
  { name: "광양", gid: "150991399" },
  { name: "담양", gid: "1619094237" },
  { name: "곡성", gid: "724939762" },
  { name: "구례", gid: "461616522" },
  { name: "고흥", gid: "688446940" },
  { name: "보성", gid: "151532950" },
  { name: "화순", gid: "1856026990" },
  { name: "장흥", gid: "490236243" },
  { name: "강진", gid: "348535966" },
  { name: "해남", gid: "91212962" },
  { name: "영암", gid: "637324474" },
  { name: "무안", gid: "905359729" },
  { name: "함평", gid: "1454162704" },
  { name: "영광", gid: "1638352814" },
  { name: "장성", gid: "324433896" },
  { name: "완도", gid: "1161266900" },
  { name: "진도", gid: "1048279336" },
  { name: "신안", gid: "2015213613" },
  { name: "거창", gid: "2086386103" },
  { name: "함양", gid: "1811312711" },
  { name: "합천", gid: "1499330478" },
  { name: "창녕", gid: "1740168341" },
  { name: "밀양", gid: "1709005892" },
  { name: "양산", gid: "29255220" },
  { name: "산청", gid: "2085112773" },
  { name: "의령", gid: "115920508" },
  { name: "함안", gid: "1407801415" },
  { name: "창원", gid: "2094205466" },
  { name: "김해", gid: "1251913152" },
  { name: "하동", gid: "1786850165" },
  { name: "진주", gid: "1415527726" },
  { name: "사천", gid: "833474594" },
  { name: "경남 고성", gid: "2055469803" },
  { name: "남해", gid: "582480594" },
  { name: "통영", gid: "1020923418" },
  { name: "거제", gid: "1361625686" },
  { name: "울릉", gid: "2030967592" },
];

// ─── Parsing Logic ───────────────────────────────────────────────

/**
 * Google redirect URL에서 실제 URL을 추출한다.
 * 예: https://www.google.com/url?q=https://map.naver.com/...&sa=D...
 *   → https://map.naver.com/...
 */
function extractRealUrl(googleUrl: string): string {
  if (!googleUrl) return "";
  try {
    const url = new URL(googleUrl);
    const q = url.searchParams.get("q");
    return q ? decodeURIComponent(q) : googleUrl;
  } catch {
    return googleUrl;
  }
}

/**
 * 한 시트 페이지에서 모든 식당 데이터를 파싱한다.
 *
 * 시트 구조 (블록 단위, 블록당 식당 5개 가로 배치):
 *   - 블록 시작 행: 식당 이름 (col 2~6)
 *   - +2: 주소
 *   - +4: 링크 ("바로가기" 텍스트, <a> 태그)
 *   - +6: "추천사유" 라벨
 *   - +8: 추천사유 텍스트
 *   - +10: "카테고리 분류" 라벨
 *   - +12: 카테고리 값 (col2~17에 걸쳐 텍스트로 표시)
 *
 * 첫 번째 블록은 Row 28부터, 이후 29행 간격으로 반복.
 */
async function parseSheet(page: Page, region: string, gid: string): Promise<ParseResult> {
  const url = `${BASE_URL}${gid}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  try {
    await page.waitForSelector("table.waffle", { timeout: 15000 });
  } catch {
    return { region, restaurants: [], errors: [{ rowIdx: -1, colIdx: -1, field: "page", message: "table.waffle not found" }] };
  }

  const result = await page.evaluate(
    ({ knownCategories }) => {
      const table = document.querySelector("table.waffle")!;
      const rows = Array.from(table.querySelectorAll("tr"));
      const restaurants: Array<{
        name: string;
        address: string;
        link: string;
        recommendation: string;
        categoryTexts: string[];
        rowIdx: number;
        colIdx: number;
      }> = [];
      const errors: ParseError[] = [];

      // 시스템 라벨 패턴 (블록 시작행이 아닌 행들)
      const SYSTEM_RE = /^(추천사유|카테고리 분류|카테고리|바로가기|오류|A|등산|검색|IMG)$/;
      const CAT_SET = new Set(knownCategories);

      // 동적 블록 시작점 탐지: 모든 이름 행을 개별 탐색
      const blockStarts: number[] = [];
      for (let i = 20; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll("td, th")).slice(1);
        const texts = cells.slice(1, 6).map((c) => c.textContent?.trim() || "");
        const nonEmpty = texts.filter((t) => t && !SYSTEM_RE.test(t) && !CAT_SET.has(t));
        if (nonEmpty.length === 0) continue;

        // +2 행에 주소가 있는지 확인
        const addrRow = rows[i + 2];
        if (!addrRow) continue;
        const addrCells = Array.from(addrRow.querySelectorAll("td, th")).slice(1);
        const addrTexts = addrCells.slice(1, 6).map((c) => c.textContent?.trim() || "");
        const hasAddr = addrTexts.some((t) => t.length > 3);
        if (!hasAddr) continue;

        // +4 행에 "바로가기" 링크가 있는지 확인
        const linkRow = rows[i + 4];
        if (linkRow) {
          const linkCells = Array.from(linkRow.querySelectorAll("td, th")).slice(1);
          const linkTexts = linkCells.slice(1, 6).map((c) => c.textContent?.trim() || "");
          if (linkTexts.some((t) => t === "바로가기")) {
            blockStarts.push(i);
            // 다음 블록은 최소 15행 뒤에 있으므로 스킵
            i += 14;
            continue;
          }
        }

        // 링크행 확인이 안되면 주소 패턴으로 판단
        if (hasAddr) {
          blockStarts.push(i);
          i += 14;
        }
      }

      if (blockStarts.length === 0) {
        errors.push({ rowIdx: -1, colIdx: -1, field: "block", message: "No data blocks found" });
        return { restaurants, errors };
      }

      // 블록 순회
      for (const blockStart of blockStarts) {
        const nameRow = rows[blockStart];
        const addrRow = rows[blockStart + 2];
        const linkRow = rows[blockStart + 4];
        const recRow = rows[blockStart + 8];
        const catRow = rows[blockStart + 12];

        if (!nameRow) break;

        const nameCells = Array.from(nameRow.querySelectorAll("td, th")).slice(1);
        const addrCells = addrRow ? Array.from(addrRow.querySelectorAll("td, th")).slice(1) : [];
        const linkCells = linkRow ? Array.from(linkRow.querySelectorAll("td, th")).slice(1) : [];
        const recCells = recRow ? Array.from(recRow.querySelectorAll("td, th")).slice(1) : [];
        const catCells = catRow ? Array.from(catRow.querySelectorAll("td, th")).slice(1) : [];

        // 각 블록에서 최대 5개 식당 (col 1~5, 0-indexed after slice)
        for (let col = 1; col <= 5; col++) {
          const nameCell = nameCells[col];
          const name = nameCell?.textContent?.trim() || "";
          if (!name) continue;

          const address = addrCells[col]?.textContent?.trim() || "";
          const linkEl = linkCells[col]?.querySelector("a") as HTMLAnchorElement | null;
          const link = linkEl?.href || "";
          const recommendation = recCells[col]?.textContent?.trim() || "";

          // 카테고리 파싱: col 기준으로 catRow의 해당 열 범위에서 텍스트 추출
          // 카테고리는 col 2~17 (0-indexed: 1~16) 영역에 각 식당별로 3칸씩 분포
          // col1 식당 → catRow col1~3, col2 식당 → catRow col4~6, ...
          // 실제로는 catRow에서 텍스트가 있는 셀 = 해당 식당의 카테고리
          const categoryTexts: string[] = [];
          // 카테고리 행에서 해당 식당 열 범위의 텍스트 수집
          // 각 식당은 catRow에서 약 3칸을 차지
          const catStartCol = 1 + (col - 1) * 3;
          for (let ci = catStartCol; ci < catStartCol + 3 && ci < catCells.length; ci++) {
            const catText = catCells[ci]?.textContent?.trim();
            if (catText && knownCategories.includes(catText)) {
              categoryTexts.push(catText);
            }
          }

          restaurants.push({
            name,
            address,
            link,
            recommendation,
            categoryTexts,
            rowIdx: blockStart,
            colIdx: col,
          });
        }
      }

      return { restaurants, errors };
    },
    { knownCategories: KNOWN_CATEGORIES }
  );

  // 후처리
  const allRestaurants: Restaurant[] = result.restaurants.map((r) => ({
    name: r.name,
    address: r.address,
    link: extractRealUrl(r.link),
    recommendation: r.recommendation,
    categories: [...new Set(r.categoryTexts)], // 중복 제거
  }));

  const errors: ParseError[] = [...result.errors];

  // 시스템 라벨 필터링 — 블록 간격 드리프트로 잘못 파싱된 행 제거
  const SYSTEM_LABELS = ["바로가기", "추천사유", "카테고리 분류", "오류", "검색", "IMG"];
  const CATEGORY_NAMES = new Set(KNOWN_CATEGORIES);

  const restaurants = allRestaurants.filter((r) => {
    // name이 시스템 라벨이면 제거
    if (SYSTEM_LABELS.includes(r.name)) return false;
    // name이 카테고리명이면 제거 (예: "한식", "데이트")
    if (CATEGORY_NAMES.has(r.name)) return false;
    // address가 시스템 라벨이면 제거 (주소행이 이름으로 밀린 경우)
    if (SYSTEM_LABELS.includes(r.address)) return false;
    // address가 카테고리명이면 제거
    if (CATEGORY_NAMES.has(r.address)) return false;
    // name에 "맛집"이 포함되고 link가 없으면 추천사유 텍스트가 이름으로 밀린 것
    if (r.name.includes("맛집") && !r.link) return false;
    return true;
  });

  // 유효성 검증
  restaurants.forEach((r, i) => {
    if (!r.name || r.name.length < 2) {
      errors.push({ rowIdx: -1, colIdx: -1, field: "name", message: `Invalid name: "${r.name}"`, raw: r.name });
    }
    if (!r.address) {
      errors.push({ rowIdx: -1, colIdx: -1, field: "address", message: `Missing address for "${r.name}"` });
    }
    if (r.categories.length === 0) {
      errors.push({ rowIdx: -1, colIdx: -1, field: "categories", message: `No categories for "${r.name}"` });
    }
  });

  return { region, restaurants, errors };
}

// ─── CLI ─────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const listMode = args.includes("--list");
  const dryRun = args.includes("--dry-run");
  const regionIdx = args.indexOf("--region");
  const regionFilter = regionIdx !== -1 ? args[regionIdx + 1]?.split(",") : null;

  if (listMode) {
    console.log("Available sheets:");
    SHEETS.forEach((s) => console.log(`  ${s.name} (gid=${s.gid})`));
    console.log(`\nTotal: ${SHEETS.length} sheets`);
    return;
  }

  const sheetsToProcess = regionFilter ? SHEETS.filter((s) => regionFilter.includes(s.name)) : SHEETS;

  if (sheetsToProcess.length === 0) {
    console.error("No matching sheets found. Use --list to see available sheets.");
    process.exit(1);
  }

  console.log(`Parsing ${sheetsToProcess.length} sheets...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allResults: ParseResult[] = [];

  for (const sheet of sheetsToProcess) {
    process.stdout.write(`  ${sheet.name}...`);
    try {
      const result = await parseSheet(page, sheet.name, sheet.gid);
      allResults.push(result);
      const errStr = result.errors.length > 0 ? ` (${result.errors.length} warnings)` : "";
      console.log(` ${result.restaurants.length} restaurants${errStr}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(` ERROR: ${msg}`);
      allResults.push({ region: sheet.name, restaurants: [], errors: [{ rowIdx: -1, colIdx: -1, field: "fatal", message: msg }] });
    }
  }

  await browser.close();

  // 결과 저장
  if (!dryRun) {
    const outDir = resolve("data");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    // 지역별 개별 파일
    for (const result of allResults) {
      if (result.restaurants.length > 0) {
        const filename = resolve(outDir, `${result.region}.json`);
        writeFileSync(filename, JSON.stringify(result.restaurants, null, 2) + "\n", "utf-8");
      }
    }

    // 전체 통합 파일
    const all = allResults.flatMap((r) =>
      r.restaurants.map((rest) => ({
        ...rest,
        region: r.region,
      }))
    );
    writeFileSync(resolve(outDir, "restaurants-all.json"), JSON.stringify(all, null, 2) + "\n", "utf-8");

    console.log(`\nSaved to data/ directory`);
  }

  // 요약
  const totalRestaurants = allResults.reduce((sum, r) => sum + r.restaurants.length, 0);
  const totalErrors = allResults.reduce((sum, r) => sum + r.errors.length, 0);
  console.log(`\nTotal: ${totalRestaurants} restaurants, ${totalErrors} warnings`);

  // 에러 상세 출력
  if (totalErrors > 0) {
    console.log("\n=== WARNINGS ===");
    for (const result of allResults) {
      if (result.errors.length > 0) {
        console.log(`\n[${result.region}]`);
        result.errors.forEach((e) => {
          console.log(`  Row ${e.rowIdx} Col ${e.colIdx}: ${e.field} - ${e.message}`);
        });
      }
    }
  }
}

// 직접 실행시에만 main 호출
if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { parseSheet, SHEETS, KNOWN_CATEGORIES, BASE_URL, extractRealUrl };
