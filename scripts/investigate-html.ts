/**
 * HTML 구조 분석 스크립트
 * Google Sheets HTML export의 데이터 구조를 파악한다.
 */
import { readFileSync } from "fs";
import * as cheerio from "cheerio";

const html = readFileSync("html/애객세끼 - Google Drive.html", "utf-8");
const $ = cheerio.load(html);

// 1. 전체 div/section 구조 파악
console.log("=== TOP-LEVEL STRUCTURE ===");
$("body > *").each((i, el) => {
  const tag = (el as cheerio.TagElement).tagName;
  const id = $(el).attr("id") || "";
  const cls = $(el).attr("class") || "";
  const textLen = $(el).text().length;
  console.log(`  ${i}: <${tag}> id="${id}" class="${cls}" textLen=${textLen}`);
});

// 2. sheets-viewport 내부 구조
console.log("\n=== SHEETS VIEWPORT ===");
const viewport = $("#sheets-viewport");
console.log("viewport children:", viewport.children().length);
viewport.children().each((i, el) => {
  const tag = (el as cheerio.TagElement).tagName;
  const id = $(el).attr("id") || "";
  const cls = $(el).attr("class") || "";
  const textLen = $(el).text().length;
  console.log(`  ${i}: <${tag}> id="${id}" class="${cls}" textLen=${textLen}`);
});

// 3. 모든 table 태그 찾기
console.log("\n=== ALL TABLES ===");
$("table").each((i, el) => {
  const id = $(el).attr("id") || "";
  const cls = $(el).attr("class") || "";
  const rows = $(el).find("tr").length;
  const firstCellText = $(el).find("td").first().text().substring(0, 50);
  console.log(`  table ${i}: id="${id}" class="${cls}" rows=${rows} firstCell="${firstCellText}"`);
});

// 4. 한국어 주소 패턴으로 텍스트 검색
console.log("\n=== KOREAN ADDRESS SEARCH ===");
const allText = $("body").text();
const addrMatches = allText.match(/인천\s*(미추홀|부평|서구|중구|연수|계양|남동|동구)/g);
console.log("주소 패턴 매치:", addrMatches ? addrMatches.length : 0);
if (addrMatches) {
  console.log("샘플:", addrMatches.slice(0, 5));
}

// 5. 네이버 맵 링크 검색
console.log("\n=== NAVER MAP LINKS ===");
const naverLinks = $('a[href*="map.naver.com"]');
console.log("네이버 맵 링크 수:", naverLinks.length);
naverLinks.slice(0, 3).each((i, el) => {
  console.log(`  ${$(el).text().substring(0, 30)} -> ${$(el).attr("href")?.substring(0, 60)}`);
});

// 6. href 속성에서 naver 검색
const allHrefs: string[] = [];
$("[href]").each((_, el) => {
  const href = $(el).attr("href") || "";
  if (href.includes("naver") || href.includes("map")) allHrefs.push(href.substring(0, 80));
});
console.log("\n=== ALL NAVER/MAP HREFS ===");
console.log("총:", allHrefs.length);
allHrefs.slice(0, 5).forEach((h) => console.log("  ", h));

// 7. grid-container 같은 시트 콘텐츠 영역
console.log("\n=== GRID CONTAINERS ===");
$(".grid-container, .grid-table-container, [class*='grid']").each((i, el) => {
  const tag = (el as cheerio.TagElement).tagName;
  const id = $(el).attr("id") || "";
  const cls = $(el).attr("class") || "";
  const childCount = $(el).children().length;
  const textLen = $(el).text().length;
  console.log(`  ${i}: <${tag}> id="${id}" class="${cls}" children=${childCount} textLen=${textLen}`);
});

// 8. softmerge 셀 (Google Sheets 특유의 구조)
console.log("\n=== SOFTMERGE CELLS ===");
const softmerge = $(".softmerge, [class*='softmerge']");
console.log("softmerge 셀 수:", softmerge.length);

// 9. data-* 속성이 있는 요소들
console.log("\n=== DATA ATTRIBUTES ===");
$("[data-sheets-value]").each((i, el) => {
  const val = $(el).attr("data-sheets-value") || "";
  console.log(`  ${i}: ${val.substring(0, 100)}`);
});

// 10. 모든 시트 ID (gid) 파악
console.log("\n=== SHEET IDs ===");
const sheetDivs = $("div[id]").filter((_, el) => {
  const id = $(el).attr("id") || "";
  return /^\d+$/.test(id);
});
console.log("숫자 ID div 수:", sheetDivs.length);
sheetDivs.each((i, el) => {
  const id = $(el).attr("id") || "";
  const display = $(el).css("display") || $(el).attr("style") || "";
  const childCount = $(el).children().length;
  const textLen = $(el).text().length;
  console.log(`  ${id}: display="${display}" children=${childCount} textLen=${textLen}`);
});
