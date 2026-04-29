# Satisfactory Layout Planner

A "Figma-lite" web tool for planning factory layouts in the game **Satisfactory**.

**User story:** "As a user, I want to plan my factory layout in the tool, so I can see the total dimensions needed, before I start building in-game."

## Domain reference

- The in-game world is built on a foundation grid. **Foundations are 8m × 8m.**
- Buildings are sized in meters and are not always whole multiples of 8m (e.g. a Constructor is 10m × 10m).
- The planner snaps placed buildings to a **1m grid**. The 8m foundation grid is rendered as a heavier overlay.
- Coordinates and sizes throughout the codebase are stored in **meters**, not pixels. Conversion to pixels happens only at render time via `PIXELS_PER_METER` in [`src/lib/constants.ts`](src/lib/constants.ts).

## Stack

- **React 19** + **TypeScript** + **Vite 8**, with the React Compiler (Babel) plugin.
- **Konva** + **react-konva** for the 2D canvas (shapes, drag, pan/zoom, marquee selection, copy/paste).
- **Zustand** with `persist` middleware for state. The user's layout is persisted to **localStorage** under the key in `STORAGE_KEY`. There are no accounts and no backend.
- **Tailwind CSS v4** + **shadcn/ui** (New York style, neutral base) for chrome around the canvas. Components are added on demand via `npx shadcn@latest add <component>` — no need to re-run init.
- **No router.** Single page; everything lives on the canvas.

## Deployment

GitHub Pages, via `npm run deploy` (uses `gh-pages` to publish `dist/`). The Vite `base` is set to `/satisfactory-layout-planner/` to match the Pages path.

## Project structure

```
src/
  components/
    canvas/       Konva stage, building shapes, grid, transformer
    panels/       Toolbar, properties panel, sidebars
    ui/           shadcn/ui components (auto-generated)
  store/          Zustand stores (layoutStore.ts is the main one)
  types/          Domain types (PlacedBuilding, BuildingType, etc.)
  lib/            Constants and pure utilities (cn, conversions)
  hooks/          React hooks (created on demand)
```

Path alias `@/` resolves to `src/`.

## Conventions

- Buildings are stored as a `Record<BuildingId, PlacedBuilding>` keyed by id, not as an array — selection and updates stay O(1).
- Snap rounding is centralized; do not re-implement `Math.round(x / GRID)` inline.
- Konva `dragBoundFunc` is the canonical place to enforce snapping during drag.
- For copy/paste, store building data in the Zustand `clipboard` field — do **not** use the system clipboard API.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — typecheck + build to `dist/`
- `npm run lint` — ESLint
- `npm run preview` — preview the production build locally
- `npm run deploy` — build and publish to GitHub Pages
