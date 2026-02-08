# Obsidian Graphs View

A graph view plugin for [Obsidian](https://obsidian.md).

## Development

- Requires Node.js v16+ (LTS recommended).
- `npm install` to install dependencies.
- `npm run dev` to start compilation in watch mode.
- `npm run build` to create a production build.
- `npm run lint` to run ESLint.

## Manual installation

Copy `main.js`, `styles.css`, and `manifest.json` to your vault at `VaultFolder/.obsidian/plugins/obsidian-graphs-view/`.

## Releasing

1. Update `minAppVersion` in `manifest.json` if needed.
2. Run `npm version patch`, `npm version minor`, or `npm version major` to bump the version in `manifest.json`, `package.json`, and `versions.json`.
3. Create a GitHub release with the exact version number as the tag (no `v` prefix).
4. Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release.

## API Documentation

See https://docs.obsidian.md
