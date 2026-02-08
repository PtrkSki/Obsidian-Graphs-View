# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Obsidian Graphs View — a graph view plugin for Obsidian, written in TypeScript, bundled into a single `main.js` via esbuild.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode (esbuild, with sourcemaps)
npm run build        # Type-check (tsc) + production build (minified, no sourcemaps)
npm run lint         # ESLint with obsidian-specific rules
npm run version      # Bump version in manifest.json and versions.json
```

## Architecture

- **Entry point:** `src/main.ts` → compiled to `main.js` (CommonJS, ES2018)
- **Settings:** `src/settings.ts` — `GraphsViewSettings` interface, defaults, and `GraphsViewSettingTab`
- **Plugin class:** `GraphsViewPlugin extends Plugin` in `src/main.ts` — lifecycle (`onload`/`onunload`), commands, ribbon icon, status bar, modal
- **Build config:** `esbuild.config.mjs` — bundles all deps except Obsidian-provided packages (`obsidian`, `electron`, `@codemirror/*`, `@lezer/*`)
- **Plugin metadata:** `manifest.json` (id: `obsidian-graphs-view`, version, minAppVersion) + `versions.json` (version→minAppVersion map)
- **Release artifacts:** `main.js`, `manifest.json`, `styles.css` (optional) — must be at plugin root

## Key Conventions

- TypeScript strict mode enabled (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, etc.)
- Keep `main.ts` minimal — lifecycle only; delegate features to separate modules
- Split files >200-300 lines into focused modules
- Recommended structure: `src/commands/`, `src/ui/`, `src/utils/`, `src/types.ts`
- Use `this.register*` helpers for all listeners/intervals (auto-cleanup on unload)
- Use stable command IDs — never rename after release
- Settings: `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` pattern
- Prefer `async/await`; avoid Node/Electron APIs for mobile compatibility
- ESLint uses `eslint-plugin-obsidianmd` recommended config
- No test framework configured — testing is manual (copy artifacts to vault, reload Obsidian)
- Do not commit `node_modules/` or `main.js`

## AGENTS.md

See `AGENTS.md` for comprehensive Obsidian plugin development guidelines including security/privacy policies, UX copy guidelines, performance practices, troubleshooting, and code examples.
