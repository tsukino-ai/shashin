# AGENTS.md — Shashin Project

## Project Overview

A photo gallery application built with Astro + React, deployed to Cloudflare Pages. Uses PhotoSwipe for image viewing and TUS protocol for resumable uploads to Cloudflare R2.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Astro | `^6.3.7` |
| UI | React | `^19.2.6` |
| Styling | Tailwind CSS | `^4.1.6` |
| Language | TypeScript | `^6.0.3` |
| Adapter | `@astrojs/cloudflare` | `^13.5.4` |
| Gallery | PhotoSwipe | `^5.4.4` |
| Upload | TUS JS Client | `^4.3.1` |
| Deploy | Wrangler / Cloudflare Pages | latest |

## Critical Rules

### 1. Always Consult Docs First

**REQUIRED SKILL:** Use `consult-project-docs` before any technical decision.

All framework and library documentation is available offline in `.ref/`:

- Astro docs → `.ref/astro-docs/`
- React docs → `.ref/react-docs/`
- Tailwind docs → `.ref/tailwind-docs/`
- TypeScript docs → `.ref/typescript-docs/`
- Cloudflare / Wrangler docs → `.ref/cloudflare-docs/`
- PhotoSwipe docs → `.ref/photoswipe-docs/`
- TUS protocol → `.ref/tus-docs/`

**You MUST consult docs when:**
- Designing features or components (brainstorming phase)
- Writing implementation plans
- Using any API for the first time in a session
- Configuring Astro, Tailwind, or Cloudflare bindings
- Working with PhotoSwipe or TUS upload logic
- Encountering build/runtime errors you don't immediately understand
- Modifying `astro.config.mjs`, `wrangler.toml`, or styling config

**Never rely on memory or assumptions. The docs in `.ref/` match the exact versions installed in this project.**

### 2. Configuration Files

| File | Purpose |
|------|---------|
| `astro.config.mjs` | Astro framework config (output: server, Cloudflare adapter, React integration) |
| `wrangler.toml` | Cloudflare Workers/Pages deploy config, R2 bucket bindings |
| `tsconfig.json` | TypeScript strict mode, Astro types |
| `package.json` | Dependencies and scripts |

### 3. Project Structure

```
src/
  api/          # API routes (Astro server endpoints)
  components/   # React + Astro components
  layouts/      # Astro page layouts
  lib/          # Shared utilities
  pages/        # Astro pages (file-based routing)
  styles/       # Global styles
  types/        # TypeScript type definitions
  worker.ts     # Cloudflare Worker entry
public/         # Static assets
```

### 4. Development Workflow

1. **Brainstorm / Plan** → Check `consult-project-docs` skill, search `.ref/` for relevant patterns
2. **Implement** → Follow docs-verified approach
3. **Test** → Run `npm run build` before claiming completion
4. **Deploy** → Use `npm run deploy` (Wrangler)
