# TaskFlow Design System — conventions

A shadcn/ui (new-york) component set for the TaskFlow task-management app. Warm,
earthy palette: a brown **primary** (`#9B6B2F`), cream background, DM Sans body
text, and italic **Fraunces** display headings. Every component is exported on
`window.TaskFlow` and renders fully styled from the shipped `styles.css` — no
theme provider or wrapper is required.

## Setup

- Import components by name (e.g. `Button`, `Card`, `Select`). They work
  standalone — there is **no** `ThemeProvider`/context to mount.
- Styling ships in `styles.css` (it `@import`s `_ds_bundle.css`): the design
  tokens plus the compiled Tailwind v4 utilities the components use. Load it
  once at the app root.

## Styling idiom

Style components through their **variant props**, not by inventing classes:

| Component | Props |
|---|---|
| `Button` | `variant`: `default` (brown) · `secondary` · `destructive` (red) · `outline` · `ghost` · `link`; `size`: `default` · `sm` · `lg` · `icon` |
| `Badge` | `variant`: `default` · `secondary` · `destructive` · `outline` |
| `Separator` | `orientation`: `horizontal` · `vertical` |

For your own layout glue, prefer the design **tokens** over hard-coded values.
They are CSS variables (shadcn HSL tokens + raw values):

- Color: `hsl(var(--primary))`, `var(--color-primary)` (`#9B6B2F`),
  `hsl(var(--secondary))`, `hsl(var(--destructive))`, `hsl(var(--muted))`,
  `hsl(var(--accent))`, `hsl(var(--border))`, `var(--color-surface)`,
  `var(--color-text)`, `var(--color-text-muted)`.
- Type: `var(--font-sans)` (DM Sans), `var(--font-display)` (Fraunces — used
  italic for h1). Radius: `var(--radius)` (0.5rem). Shadows: `var(--shadow-sm)`.

The shadcn color utilities (`bg-primary`, `text-primary-foreground`,
`bg-card`, `text-muted-foreground`, `border-input`, …) are available, as are
common layout utilities (`flex`, `grid`, `gap-*`, `rounded-md`, `border`). The
shipped CSS is a fixed compiled set — for utilities outside the components'
vocabulary, use inline styles with the tokens above.

## Composition

Compound components are assembled from their parts:

- **Card** = `Card > CardHeader (CardTitle, CardDescription) + CardContent + CardFooter`
- **Select** = `Select > SelectTrigger (SelectValue) + SelectContent (SelectItem, SelectGroup, SelectLabel, SelectSeparator)`
- **Avatar** = `Avatar > AvatarImage + AvatarFallback` (fallback shows when the image is absent/loading)

Read the per-component `*.prompt.md` and `*.d.ts` for the full prop contracts.

## Idiomatic example

```tsx
<Card style={{ width: 320 }}>
  <CardHeader>
    <CardTitle>Design the onboarding flow</CardTitle>
    <CardDescription>Sketch the first-run experience.</CardDescription>
  </CardHeader>
  <CardContent>
    <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
      Cover the empty state and the invite step.
    </p>
  </CardContent>
  <CardFooter style={{ justifyContent: 'space-between' }}>
    <Badge variant="secondary">In progress</Badge>
    <Button size="sm">Open</Button>
  </CardFooter>
</Card>
```
