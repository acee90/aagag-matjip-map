#!/usr/bin/env node

/**
 * Gitmoji-aware release automation.
 *
 * Strips emoji prefixes from conventional commits, computes version bumps,
 * generates CHANGELOG entries, and creates release PRs / GitHub Releases.
 *
 * Two modes (determined automatically):
 *   1. Push to main (normal)        → create or update a release PR
 *   2. Push to main (release merge) → create git tag + GitHub Release
 *
 * Requires: git, gh CLI, GH_TOKEN env var.
 * No external npm dependencies.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

// ── Configuration ────────────────────────────────────────────────────────────

const RELEASE_BRANCH = "release-please--branches--main";
const BASE_BRANCH = "main";
const MANIFEST = ".release-please-manifest.json";
const CHANGELOG = "CHANGELOG.md";

/** Strip leading emoji / non-word characters: "✨ feat: x" → "feat: x" */
const GITMOJI_RE = /^[^\w(]*/;

/** Conventional Commit regex */
const CC_RE = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/;

/** Ordered changelog sections (type → heading) */
const SECTIONS = [
  ["feat", "Features"],
  ["fix", "Bug Fixes"],
  ["perf", "Performance"],
  ["refactor", "Refactoring"],
  ["docs", "Documentation"],
];
const SECTION_MAP = Object.fromEntries(SECTIONS);

/** Types that trigger version bumps */
const BUMPS = { feat: "minor", fix: "patch", perf: "patch", refactor: "patch" };

/** Types hidden from the changelog */
const HIDDEN = new Set(["chore", "ci", "build", "style", "test"]);

// ── Shell helpers ────────────────────────────────────────────────────────────

const run = (cmd) => execSync(cmd, { encoding: "utf-8" }).trim();
const tryRun = (cmd) => {
  try {
    return run(cmd);
  } catch {
    return null;
  }
};
const log = (msg) => console.log(`[release] ${msg}`);

// ── Git / GitHub helpers ─────────────────────────────────────────────────────

function repoInfo() {
  const info = JSON.parse(
    run("gh repo view --json url,nameWithOwner"),
  );
  return { url: info.url, slug: info.nameWithOwner };
}

/** Create a lightweight tag on the remote via GitHub API (bypasses GITHUB_TOKEN workflow permission restriction) */
function createRemoteTag(tag, sha) {
  const { slug } = repoInfo();
  run(
    `gh api repos/${slug}/git/refs -f ref="refs/tags/${tag}" -f sha="${sha}"`,
  );
}

function currentVersion() {
  return JSON.parse(readFileSync(MANIFEST, "utf-8"))["."];
}

function getLatestTag() {
  return tryRun("git describe --tags --abbrev=0");
}

function tagExists(t) {
  return tryRun(`git tag -l "${t}"`) === t;
}

/**
 * Parse commits since `ref` (all history if null).
 * Returns [{ hash, subject, stripped, cc }]
 */
function parseCommits(ref) {
  const range = ref ? `${ref}..HEAD` : "";
  const raw = tryRun(`git log ${range} --format="%H %s"`.trim());
  if (!raw) return [];

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const hash = line.slice(0, 40);
      const subject = line.slice(41);
      const stripped = subject.replace(GITMOJI_RE, "");
      const m = stripped.match(CC_RE);
      return {
        hash,
        subject,
        stripped,
        cc: m
          ? { type: m[1], scope: m[2] || null, breaking: !!m[3], desc: m[4] }
          : null,
      };
    });
}

/** Filter out release-bot commits */
function filterRelease(commits) {
  return commits.filter(
    (c) => !/^chore\(main\): release /.test(c.stripped),
  );
}

// ── Version logic ────────────────────────────────────────────────────────────

function nextVersion(ver, commits) {
  const [M, m, p] = ver.split(".").map(Number);
  let lvl = null;

  for (const { cc } of commits) {
    if (!cc) continue;
    if (cc.breaking) return `${M + 1}.0.0`;
    const b = BUMPS[cc.type];
    if (b === "minor") lvl = "minor";
    else if (b === "patch" && lvl !== "minor") lvl = "patch";
  }

  if (!lvl) return null;
  return lvl === "minor" ? `${M}.${m + 1}.0` : `${M}.${m}.${p + 1}`;
}

// ── Changelog ────────────────────────────────────────────────────────────────

function buildChangelog(ver, commits, prevTag, url) {
  const date = new Date().toISOString().slice(0, 10);
  const tag = `v${ver}`;
  const link = prevTag
    ? `${url}/compare/${prevTag}...${tag}`
    : `${url}/tree/${tag}`;

  const groups = new Map();
  for (const { hash, cc } of commits) {
    if (!cc || HIDDEN.has(cc.type)) continue;
    const sec = SECTION_MAP[cc.type];
    if (!sec) continue;
    if (!groups.has(sec)) groups.set(sec, []);
    const scope = cc.scope ? `**${cc.scope}:** ` : "";
    groups
      .get(sec)
      .push(`* ${scope}${cc.desc} ([${hash.slice(0, 7)}](${url}/commit/${hash}))`);
  }

  if (groups.size === 0) return null;

  let md = `## [${ver}](${link}) (${date})\n\n`;
  for (const [, secName] of SECTIONS) {
    const items = groups.get(secName);
    if (!items) continue;
    md += `### ${secName}\n\n${items.join("\n")}\n\n`;
  }
  return md;
}

function prependChangelog(entry) {
  if (!existsSync(CHANGELOG)) {
    writeFileSync(CHANGELOG, `# Changelog\n\n${entry}`);
    return;
  }
  const text = readFileSync(CHANGELOG, "utf-8");
  const m = text.match(/^(# .+\n)\n*/);
  if (m) {
    const rest = text.slice(m[0].length);
    writeFileSync(CHANGELOG, `${m[1]}\n${entry}${rest}`);
  } else {
    writeFileSync(CHANGELOG, `# Changelog\n\n${entry}${text}`);
  }
}

// ── File updates ─────────────────────────────────────────────────────────────

function bumpFiles(ver) {
  const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
  pkg.version = ver;
  writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

  const man = JSON.parse(readFileSync(MANIFEST, "utf-8"));
  man["."] = ver;
  writeFileSync(MANIFEST, JSON.stringify(man, null, 2) + "\n");
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const url = repoInfo().url;
  const ver = currentVersion();
  let tag = getLatestTag();

  log(`version=${ver}  latest-tag=${tag ?? "(none)"}`);

  // ── Bootstrap: create baseline tag if no tags exist ────────────────────────
  if (!tag) {
    // Find the commit that first introduced the current version in package.json
    const commit =
      tryRun(
        `git log --format=%H -1 -S'"version": "${ver}"' -- package.json`,
      ) ||
      tryRun(`git log --format=%H -1 -- ${MANIFEST}`) ||
      run("git rev-parse HEAD");
    const t = `v${ver}`;
    log(`No tags found — creating baseline ${t} on ${commit.slice(0, 7)}`);
    run(`git tag ${t} ${commit}`); // local tag for git log
    createRemoteTag(t, commit); // remote tag via API (avoids workflows permission issue)
    tag = t;
  }

  // ── Mode 1: release-PR merge detected → tag + GitHub Release ──────────────
  const vtag = `v${ver}`;
  if (tag !== vtag && !tagExists(vtag)) {
    log(`Version ${ver} not tagged — creating release…`);
    const cs = filterRelease(parseCommits(tag));
    const notes = buildChangelog(ver, cs, tag, url) ?? `Release ${vtag}\n`;
    writeFileSync("/tmp/release-notes.md", notes);

    // Use gh release create --target to create tag + release via API
    // (avoids GITHUB_TOKEN workflows permission restriction on git push)
    const head = run("git rev-parse HEAD");
    run(
      `gh release create ${vtag} --target ${head} --title "${vtag}" --notes-file /tmp/release-notes.md`,
    );
    tryRun(`git push origin --delete ${RELEASE_BRANCH}`);
    log(`Done — ${vtag} released`);
    return;
  }

  // ── Mode 2: normal push → create / update release PR ──────────────────────
  const cs = filterRelease(parseCommits(tag));
  if (!cs.length) {
    log("No new commits since last release.");
    return;
  }

  const next = nextVersion(ver, cs);
  if (!next) {
    log("Only hidden commit types — no release needed.");
    return;
  }

  log(`Next version: ${next}`);

  // Prepare release branch
  run('git config user.name "github-actions[bot]"');
  run('git config user.email "github-actions[bot]@users.noreply.github.com"');
  run(`git checkout -B ${RELEASE_BRANCH}`);

  bumpFiles(next);
  const entry = buildChangelog(next, cs, tag, url);
  if (entry) prependChangelog(entry);

  run(`git add package.json ${MANIFEST} ${CHANGELOG}`);
  run(`git commit -m "chore(main): release ${next}"`);
  run(`git push -f origin ${RELEASE_BRANCH}`);

  // Create or update PR
  const body = `:robot: *Automated release PR*\n\n---\n\n${entry ?? ""}`;
  writeFileSync("/tmp/pr-body.md", body);

  const existing = tryRun(
    `gh pr list --head ${RELEASE_BRANCH} --base ${BASE_BRANCH} --json number --jq ".[0].number"`,
  );

  if (existing) {
    run(
      `gh pr edit ${existing} --title "chore(main): release ${next}" --body-file /tmp/pr-body.md`,
    );
    log(`Updated PR #${existing}`);
  } else {
    const prUrl = run(
      `gh pr create --base ${BASE_BRANCH} --head ${RELEASE_BRANCH} ` +
        `--title "chore(main): release ${next}" --body-file /tmp/pr-body.md`,
    );
    log(`Created ${prUrl}`);
  }

  run(`git checkout ${BASE_BRANCH}`);
  log("Done.");
}

main();
