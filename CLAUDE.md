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
