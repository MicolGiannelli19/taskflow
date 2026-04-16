# UI System

## Overview

The frontend uses a two-layer styling approach:

1. **shadcn/ui** — an open-source component library that ships unstyled, copy-pasteable components into the codebase (`src/components/ui/`). Components are owned by the project, not a black-box dependency.
2. **CSS Modules** — scoped `.module.css` files per component for layout and page-level styles.

Both layers are themed through a single set of CSS custom properties defined in `src/index.css`.

---

## External library: shadcn/ui

shadcn/ui was added because it provides accessible, composable primitives (button, badge, input, select, etc.) without imposing a visual style. The components use **Tailwind CSS** for their internal utility classes and **Radix UI** for accessibility primitives.

### What was installed

| Component | Location |
|-----------|----------|
| `badge` | `src/components/ui/badge.tsx` |
| `button` | `src/components/ui/button.tsx` |
| `input` | `src/components/ui/input.tsx` |
| `textarea` | `src/components/ui/textarea.tsx` |
| `select` | `src/components/ui/select.tsx` |
| `card` | `src/components/ui/card.tsx` |
| `label` | `src/components/ui/label.tsx` |
| `avatar` | `src/components/ui/avatar.tsx` |
| `separator` | `src/components/ui/separator.tsx` |

To add more components:
```bash
npx shadcn@latest add <component-name>
```

### How it was set up

1. Installed Tailwind v4 and its Vite plugin (`tailwindcss`, `@tailwindcss/vite`).
2. Added the Tailwind plugin to `vite.config.ts` and `@import "tailwindcss"` to `index.css`.
3. Created `components.json` manually (shadcn's config file) pointing to `src/components/ui/` and `src/lib/utils.ts`.
4. Ran `npx shadcn@latest add <components>` to scaffold each component.

> **Do not edit files inside `src/components/ui/`** — they are intended to be consumed as-is. Override their appearance through CSS variables (see below).

---

## Design tokens

All visual values live as CSS custom properties in `src/index.css`. There are two sets:

### shadcn-compatible variables (HSL, used by `components/ui/`)

```css
--background, --foreground
--card, --card-foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--border, --input, --ring
--radius
```

### Plain colour tokens (used by CSS Modules)

```css
--color-background   /* #FAFAF7 — warm off-white page background */
--color-surface      /* #F3EFE8 — column and panel backgrounds */
--color-card         /* #FFFFFF — ticket and form card backgrounds */
--color-border       /* #E6E0D6 — all borders */
--color-text         /* #2D2A26 — primary text */
--color-text-muted   /* #8A8278 — secondary / label text */
--color-primary      /* #9B6B2F — warm amber, interactive elements */
--color-primary-hover
--priority-low-color / --priority-low-bg
--priority-medium-color / --priority-medium-bg
--priority-high-color / --priority-high-bg
--column-width       /* 272px */
--column-gap         /* 12px */
--card-radius        /* 8px */
--shadow-xs / --shadow-sm / --shadow-md
--font-sans          /* DM Sans */
--font-display       /* Fraunces (italic headings) */
```

### Typography

Fonts are loaded from Google Fonts in `index.html`:
- **DM Sans** — body and UI text, friendly geometric sans-serif
- **Fraunces** — display headings and logo, optical-size italic serif

---

## Current styling approach: CSS Modules

Each component currently has a `.module.css` file alongside it. Global element styles (buttons, inputs, headings, links) are defined directly in `index.css`.

This was the existing pattern in the codebase and was preserved during the design pass.

---

## TODO

- [ ] **Deprecate CSS Modules** — migrate component styles to Tailwind utility classes. This aligns with how shadcn/ui works internally and removes the dual-system maintenance burden. CSS Modules and Tailwind classes currently coexist but long-term only one approach should be used.

- [ ] **Make the design system configurable through variables** — the colour tokens in `index.css` are hardcoded hex values. These should be driven by a single source of truth (e.g. a `theme.ts` config or a Tailwind theme extension in `index.css` via `@theme`) so that swapping the palette requires changing values in one place only, rather than hunting through the CSS variable declarations.
