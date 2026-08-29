# design-sync notes — TaskFlow Design System

Project: https://claude.ai/design/p/232e452b-7b3f-4905-8959-824cb9ae2e46
Synced surface: the shadcn/ui primitives in `frontend/src/components/ui/` (25 exports).

## Repo shape & how the build runs

- This is an **app**, not a published component library. `frontend/dist/` is the
  app bundle, not a library entry, so the converter runs in **synth-entry mode**
  from `src/`.
- Run everything **from the repo root** (where `.design-sync/` lives — the
  converter resolves `previews/`, `.cache/`, `overrides/` relative to cwd).
- Build command:
  ```sh
  node .ds-sync/package-build.mjs --config .design-sync/config.json \
    --node-modules ./frontend/node_modules \
    --entry ./frontend/dist/index.es.js --out ./ds-bundle
  ```
- `--entry ./frontend/dist/index.es.js` **intentionally points at a nonexistent
  file**. `resolveDistEntry` returns null (soft) → synth-entry mode; the PKG_DIR
  walk-up still climbs from that path to `frontend/` (which has the named
  `package.json`). Don't "fix" the entry.
- `cfg.srcDir = "src/components/ui"` scopes discovery to the DS primitives only
  (excludes app/page feature components that need router/query/auth providers).

## The Tailwind v4 theme gap — FIXED in the app (shadcn-migration branch, 2026-07-27)

**Historical (pre-shadcn-migration):** `frontend/src/index.css` had **no `@theme`
block**, so Tailwind v4 never registered the shadcn design tokens as colors — the
color utilities (`bg-primary`, `bg-destructive`, `text-muted-foreground`,
`border-input`, …) were **not compiled into the app build at all**, and the shadcn
components fell back to the global `button {}` / `input {}` element styles, so every
variant rendered identically. To fix it without touching app source (user decision
2026-06-21) the DS bundle used its own corrected stylesheet.

**Now the app itself carries the fix** (so it is no longer a DS-only workaround):
- `index.css` has an `@theme inline` block bridging the HSL tokens into Tailwind's
  color/radius theme, so `bg-primary` / `border-input` / … compile.
- The global `button{}`/`input{}`/`select{}` element rules were moved into
  `@layer base`, so component utility classes (emitted into the `utilities` layer,
  which the cascade ranks above `base`) out-rank them and the shadcn variants win —
  while raw elements stay styled.
- App feature components now consume `<Button>` from `src/components/ui`.

**`ds-theme.css` is therefore largely redundant.** It still works (a copy of
`index.css` + `@theme` + `@source`, with the globals *dropped* rather than layered),
but since the app CSS now handles precedence itself, the intended cleanup is viable:
point `cfg.cssEntry` at the app's compiled `dist/assets/*.css` and delete
`ds-theme.css` + the gen step. Kept for now only because that requires a working
native `vite build` (the current bundler install is Linux-only, so the app build
runs in Docker, not on the host).

Current build still uses the generated stylesheet:
```sh
ln -sfn ../.ds-sync/node_modules .design-sync/node_modules   # once per clone — Tailwind CLI needs it to resolve `@import "tailwindcss"`
.ds-sync/node_modules/.bin/tailwindcss -i .design-sync/ds-theme.css -o frontend/ds-theme.gen.css
```
`cfg.cssEntry = "ds-theme.gen.css"` (relative to `frontend/`).

## Previews & overrides

- All 25 components have authored previews in `.design-sync/previews/`.
- Avatar previews use a **data-URI SVG** image so `AvatarImage` renders offline
  in the headless check.
- The open Radix Select dropdown is shown via `defaultOpen`; the portal renders
  fine in capture. The 8 open-portal Select components use
  `cfg.overrides.<Name> = {cardMode:"single", primaryStory:…}` to avoid
  `[GRID_OVERFLOW]` (the portal escapes a grid cell otherwise).
- `SelectScrollUpButton` surfaces its up-chevron by opening the menu with
  `defaultValue` set to the last item (so it opens scrolled down).

## Known render warns (expected — not new)

- `[FONT_REMOTE] "DM Sans", "Geist Mono", "Fraunces"` — loaded via the Google
  Fonts `@import` in the stylesheet; they load at runtime. **Note:** `Geist Mono`
  is referenced (`code {}` font-family) but is NOT in the Google Fonts import, so
  it falls back to a system monospace. Cosmetic; fix by adding it to the import
  if mono text matters.

## Re-sync risks (what can silently go stale)

- `frontend/ds-theme.gen.css` is gitignored and generated — **a re-sync that
  skips the tailwind compile step will use a stale/missing stylesheet.** Always
  regenerate it (and recreate the `.design-sync/node_modules` symlink on a fresh
  clone) before `package-build.mjs`.
- The compiled utilities are a **fixed set** scanned from `src/components/ui` +
  `.design-sync/previews`. If components start using new utility classes, or new
  components are added, re-run the tailwind compile so the new classes exist.
- `ds-theme.css` duplicates the token `:root` blocks from `src/index.css`. If the
  app's tokens change, update `ds-theme.css` to match (or re-copy from index.css
  and re-add the `@theme`/`@source`/dropped-globals edits).
- Previews assume the current shadcn API (variant/size prop names). A shadcn
  upgrade could change them.
