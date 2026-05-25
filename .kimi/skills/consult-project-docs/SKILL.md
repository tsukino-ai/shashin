---
name: consult-project-docs
description: Use when designing features, planning implementation, or writing code that involves Astro, React, Tailwind CSS, Cloudflare Workers, PhotoSwipe, TUS uploads, or TypeScript in this project
---

# Consult Project Docs

## Overview

This project maintains offline copies of all framework and library documentation in `.ref/`. **Never guess API behavior, configuration options, or integration patterns.** Always consult the local docs before making technical decisions or writing code.

## When to Use

**MANDATORY — consult docs BEFORE proceeding when:**

- Designing a new feature or component (brainstorming phase)
- Writing or reviewing an implementation plan
- Using an API, hook, or component for the first time in this session
- Configuring Astro, Cloudflare adapter, or Tailwind
- Working with PhotoSwipe gallery or TUS upload logic
- Encountering build errors, type errors, or runtime behavior you don't immediately understand
- Modifying `astro.config.mjs`, `wrangler.toml`, or `tailwindcss` config

**Check docs even if you "think you know" — frameworks update APIs between versions.**

## Doc Locations

| Technology | Local Path | Key Sections |
|-----------|------------|--------------|
| **Astro** | `.ref/astro-docs/src/content/docs/en/` | `basics/`, `guides/`, `reference/`, `integrations/` |
| **React** | `.ref/react-docs/src/content/` | `learn/`, `reference/`, `community/` |
| **Tailwind CSS** | `.ref/tailwind-docs/src/docs/` | Utility class references, `configuration/`, `customization/` |
| **TypeScript** | `.ref/typescript-docs/docs/` | Handbook, release notes, config references |
| **Cloudflare Workers/Pages** | `.ref/cloudflare-docs/src/content/docs/` | `workers/`, `pages/`, `r2/`, `durable-objects/` |
| **Wrangler** | `.ref/cloudflare-docs/src/content/docs/workers/wrangler/` | CLI commands, configuration |
| **PhotoSwipe** | `.ref/photoswipe-docs/docs/` | `getting-started.md`, `options.md`, `api.md`, React guides |
| **TUS Protocol** | `.ref/tus-docs/protocol.md` | Upload protocol specification |
| **PostCSS / Autoprefixer** | `.ref/astro-docs/src/content/docs/en/guides/styling.md` (Astro styling guide) | Build tool integration |

## How to Consult

1. **Identify the technology** involved in your current task
2. **Use Grep** to search `.ref/` for keywords, API names, or error messages
3. **Read the relevant `.md` or `.mdx` files** — focus on official examples and configuration sections
4. **If docs are unclear**, search the corresponding GitHub repo for issues or source context
5. **Apply what you learned** — do not fall back to memory or assumptions

### Quick Search Patterns

```bash
# Search Astro docs for a specific API or concept
grep -r "server islands" .ref/astro-docs/src/content/docs/en/

# Search Cloudflare docs for R2 or Workers bindings
grep -r "R2Bucket" .ref/cloudflare-docs/src/content/docs/

# Search PhotoSwipe docs for options or React usage
grep -r "dataSource" .ref/photoswipe-docs/docs/

# Search Tailwind docs for a specific utility
grep -r "backdrop-blur" .ref/tailwind-docs/src/docs/
```

## Red Flags — STOP and Read Docs

- "I think the API works like this..."
- "In my experience with React/Astro..." (different project, different versions)
- "I'll just try it and see if it compiles"
- "The error message is confusing, I'll work around it"
- Writing configuration values from memory
- Implementing a feature before checking if the framework has a built-in way

**All of these mean: Search `.ref/` first. Verify with docs.**

## Version Context

This project uses:
- Astro `^6.3.7`
- React `^19.2.6`
- Tailwind CSS `^4.1.6`
- TypeScript `^6.0.3`
- `@astrojs/cloudflare` `^13.5.4`
- PhotoSwipe `^5.4.4`
- TUS JS Client `^4.3.1`

**Documentation in `.ref/` matches these versions.** External web docs may describe newer or older APIs.
