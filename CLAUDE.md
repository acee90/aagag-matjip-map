# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install              # Install dependencies
bun --bun run dev        # Dev server on port 3000
bun --bun run build      # Production build
bun --bun run test       # Run tests (vitest)
bun run deploy           # Build + deploy to Cloudflare Workers
bun run cf-typegen       # Generate Cloudflare Worker types
```

Add shadcn components with: `pnpm dlx shadcn@latest add <component>`

```bash
bun run parse                        # Parse all region sheets
bun run parse -- --region 인천        # Parse specific region
bun run parse -- --region 인천,서울   # Parse multiple regions
bun run parse:list                   # List available sheets
```

## Architecture

**TanStack Start** full-stack React app deployed to **Cloudflare Workers**.

- **Framework**: TanStack Start (built on TanStack Router) with SSR enabled
- **Styling**: Tailwind CSS v4 + shadcn/ui (new-york style, zinc base, CSS variables in `src/styles.css`)
- **Deployment**: Cloudflare Workers via `@cloudflare/vite-plugin` (SSR environment) + wrangler
- **Testing**: Vitest + @testing-library/react (jsdom)

### Routing

File-based routing — routes live in `src/routes/`. TanStack Router auto-generates `src/routeTree.gen.ts` (do not edit). The root layout is in `src/routes/__root.tsx` and uses a `shellComponent` pattern for the HTML document shell.

Route files use dot-notation for nesting (e.g., `start.ssr.spa-mode.tsx` → `/demo/start/ssr/spa-mode`).

### Path Alias

`@/*` → `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`)

### Key Directories

- `src/components/` — shared components (Header, future UI components)
- `src/components/ui/` — shadcn/ui components (auto-generated, do not manually edit)
- `src/lib/utils.ts` — `cn()` utility for merging Tailwind classes
- `src/routes/demo/` — demo/starter routes (prefixed with `demo`, safe to delete)
- `scripts/parse-sheets.ts` — Playwright-based Google Sheets parser (extracts restaurant data per region)
- `data/` — parsed restaurant JSON files (`{region}.json`, `restaurants-all.json`)

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
