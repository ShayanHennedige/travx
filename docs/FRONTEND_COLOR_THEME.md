# TravX Frontend Color Theme & Palette

A comprehensive reference for the TravX application's color system, theme modes, and component styling. The design follows a **blue + gold + black** aesthetic with a modern, elegant feel. Dark mode is the default; light mode uses softer contrast.

---

## Table of Contents

1. [Theme System](#theme-system)
2. [Color Scales](#color-scales)
3. [Semantic Variables](#semantic-variables)
4. [Component Palette](#component-palette)
5. [Status & Feedback Colors](#status--feedback-colors)
6. [Usage Guidelines](#usage-guidelines)

---

## Theme System

### Mode Toggle

- **Implementation:** `ThemeProvider` in `src/lib/ThemeContext.tsx`
- **Storage:** `localStorage` key `theme` (`"dark"` | `"light"`)
- **Activation:** `light` or `dark` class on `<html>` via `document.documentElement`
- **Default:** Dark mode

### Tailwind Custom Variant

```css
@custom-variant light (&&:where(.light, .light *));
```

Use the `light:` prefix for light-mode-specific styles:

```tsx
className="text-surface-100 light:text-surface-900"
className="bg-surface-800 light:bg-white"
```

### Key Files

| File | Purpose |
|------|---------|
| `src/app/globals.css` | Theme variables, color scales, component classes |
| `src/lib/ThemeContext.tsx` | Theme state, `useTheme()` hook, toggle logic |
| `src/components/layout/Header.tsx` | Theme toggle button in dashboard header |
| `src/app/layout.tsx` | Theme script (beforeInteractive) for initial load |

---

## Color Scales

### Primary (Blue)

Used for links, primary actions, and brand emphasis.

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#eff6ff` | Lightest tint |
| `primary-100` | `#dbeafe` | Light backgrounds |
| `primary-200` | `#bfdbfe` | Borders (light) |
| `primary-300` | `#93c5fd` | Muted emphasis |
| `primary-400` | `#60a5fa` | Links, hover states |
| `primary-500` | `#3b82f6` | Mid blue |
| `primary-600` | `#2563eb` | Primary buttons, focus rings |
| `primary-700` | `#1d4ed8` | Hover, borders |
| `primary-800` | `#1e40af` | Dark backgrounds |
| `primary-900` | `#1e3a8a` | Badges, dark accents |
| `primary-950` | `#172554` | Deepest |

### Accent (Gold)

Brand accent color. Base: **`#e0c16c`** (`accent-500`).

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-50` | `#fdf9ed` | Lightest tint |
| `accent-100` | `#faf0d4` | Light badges, backgrounds |
| `accent-200` | `#f5e5b8` | Borders (light) |
| `accent-300` | `#edd999` | Muted |
| `accent-400` | `#e8cc7a` | Links, hover |
| `accent-500` | `#e0c16c` | Primary gold (buttons, active nav, action button hover) |
| `accent-600` | `#c9a95a` | Hover, focus |
| `accent-700` | `#a88644` | Darker |
| `accent-800` | `#8d7239` | Borders |
| `accent-900` | `#5c4b26` | Badges, dark accents |
| `accent-950` | `#3d3219` | Deepest |

### Surface (Slate / Blue-Black)

Neutrals for backgrounds, borders, and text.

| Token | Hex | Usage |
|-------|-----|-------|
| `surface-50` | `#f8fafc` | Lightest (light mode) |
| `surface-100` | `#f1f5f9` | Light backgrounds |
| `surface-200` | `#e2e8f0` | Borders, dividers (light) |
| `surface-300` | `#cbd5e1` | Muted text (light), labels |
| `surface-400` | `#94a3b8` | Secondary text |
| `surface-500` | `#64748b` | Tertiary text |
| `surface-600` | `#475569` | Borders, muted |
| `surface-700` | `#334155` | Elevated surfaces |
| `surface-800` | `#1e293b` | Cards, inputs |
| `surface-900` | `#0f172a` | Base background (dark) |
| `surface-950` | `#020617` | Deepest dark |

---

## Semantic Variables

Theme-aware CSS variables in `globals.css`:

### Dark Mode (`:root`)

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-base` | `#0f172a` | Page background |
| `--bg-surface` | `#1e293b` | Cards, panels |
| `--bg-surface-elevated` | `#334155` | Raised surfaces |
| `--border-default` | `#334155` | Default borders |
| `--border-subtle` | `#1e293b` | Subtle borders |
| `--text-primary` | `#f8fafc` | Headings, body |
| `--text-secondary` | `#94a3b8` | Secondary text |
| `--text-tertiary` | `#64748b` | Muted text |

### Light Mode (`.light`)

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-base` | `#f1f5f9` | Page background |
| `--bg-surface` | `#ffffff` | Cards, panels |
| `--bg-surface-elevated` | `#f8fafc` | Raised surfaces |
| `--border-default` | `#e2e8f0` | Default borders |
| `--border-subtle` | `#f1f5f9` | Subtle borders |
| `--text-primary` | `#1e293b` | Headings, body |
| `--text-secondary` | `#64748b` | Secondary text |
| `--text-tertiary` | `#94a3b8` | Muted text |

**Usage:** `style={{ backgroundColor: "var(--bg-base)" }}` or via `.card` / `.input` component classes.

---

## Component Palette

### Buttons

| Variant | Dark Mode | Light Mode |
|---------|-----------|------------|
| **Primary** | `bg-primary-600` | Same, focus ring offset adjusted |
| **Secondary** | `bg-surface-700` | `bg-surface-100` |
| **Accent** | `bg-accent-500 text-black` | Same |
| **Ghost** | `text-surface-400` | `text-surface-600` |
| **Danger** | `bg-red-600` | Same |

#### Action Button Gold Hover

Header and action buttons (itinerary page, theme toggle, etc.) use a consistent gold hover:

```tsx
className="hover:bg-accent-500 hover:text-black hover:border-accent-500"
```

**Applies to:**
- Finalize Tour, Generate Vouchers, Download PDF, Back to List
- Edit Itinerary
- Theme toggle (sun/moon) button

Use dark text (`text-black`) on gold for contrast. For secondary/outline buttons, include `hover:border-accent-500` so the border matches on hover.

### Inputs & Forms

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| **Input** | `bg-surface-800 text-surface-100` | `bg-white text-surface-900` |
| **Label** | `text-surface-300` | `text-surface-700` |
| **Border** | `border-surface-600` | `border-surface-300` |
| **Placeholder** | `text-surface-500` | `text-surface-400` |

### Cards

| Type | Dark Mode | Light Mode |
|------|-----------|------------|
| **Card** | `var(--bg-surface)` | `#ffffff` |
| **Card Elevated** | `var(--bg-surface-elevated)` | `#f8fafc` |
| **Shadow** | `--shadow-card-dark` | `--shadow-card` |

---

## Status & Feedback Colors

### Status Badges (Inquiry / Itinerary / Voucher)

| Status | Dark Mode | Light Mode |
|--------|-----------|------------|
| **New** | `bg-primary-900/50 text-primary-300` | `bg-primary-100 text-primary-800` |
| **In Progress** | `bg-accent-900/50 text-accent-300` | `bg-accent-100 text-accent-800` |
| **Quoted** | `bg-purple-900/50 text-purple-300` | `bg-purple-100 text-purple-800` |
| **Confirmed** | `bg-green-900/50 text-green-300` | `bg-green-100 text-green-800` |
| **Cancelled** | `bg-red-900/50 text-red-300` | `bg-red-100 text-red-800` |
| **Completed** | `bg-surface-700 text-surface-300` | `bg-surface-200 text-surface-700` |

### Priority Badges

| Priority | Dark Mode | Light Mode |
|----------|-----------|------------|
| **Low** | `bg-surface-800 text-surface-400` | `bg-surface-100 text-surface-600` |
| **Medium** | `bg-primary-900/50 text-primary-300` | `bg-primary-100 text-primary-700` |
| **High** | `bg-orange-900/50 text-orange-300` | `bg-orange-100 text-orange-700` |
| **Urgent** | `bg-red-900/50 text-red-300` | `bg-red-100 text-red-700` |

### Feedback / Analytics Labels

| Score | Label | Color (Badge) |
|-------|-------|---------------|
| < 50 | Poor | Red |
| 50–70 | Average | Orange |
| 70–90 | Good | Blue (primary) |
| ≥ 90 | Excellent | Green |

### Semantic Status Colors

| Purpose | Hex | Token |
|---------|-----|-------|
| Success | `#10b981` | `--color-success` |
| Warning | `#f59e0b` | `--color-warning` |
| Error | `#ef4444` | `--color-error` |
| Info | `#3b82f6` | `--color-info` |

---

## Usage Guidelines

### Text Contrast

| Context | Dark Mode | Light Mode |
|---------|-----------|------------|
| Primary headings | `text-surface-100` | `text-surface-900` |
| Body text | `text-surface-100` | `text-surface-900` |
| Secondary text | `text-surface-400` | `text-surface-500` or `text-surface-600` |
| Muted text | `text-surface-500` | `text-surface-600` |

### Backgrounds

| Context | Dark Mode | Light Mode |
|---------|-----------|------------|
| Page base | `bg-surface-900` or `var(--bg-base)` | `bg-surface-100` |
| Cards | `card` (uses `var(--bg-surface)`) | Same |
| Inputs | `bg-surface-800` | `bg-white` |
| Sidebar | `bg-surface-900` | `bg-white` |
| Active nav item | `bg-accent-500 text-black` | Same |

### Borders

| Context | Dark Mode | Light Mode |
|---------|-----------|------------|
| Default | `border-surface-600` | `border-surface-200` or `border-surface-300` |
| Subtle | `border-surface-700` | `border-surface-200` |

### Common `light:` Patterns

```tsx
// Headings (primary text - dark in light mode)
className="text-surface-100 light:text-surface-900"

// Secondary / labels
className="text-surface-400 light:text-surface-500"

// Labels in forms
className="text-surface-300 light:text-surface-700"

// Inputs
className="bg-surface-800 light:bg-white text-surface-100 light:text-surface-900 border-surface-600 light:border-surface-300 placeholder:text-surface-500 light:placeholder:text-surface-500"

// Nested content (hotel rows, info panels)
className="bg-surface-800 light:bg-surface-50 border-surface-700 light:border-surface-200"

// Status / badges
className="bg-green-900/50 light:bg-green-100 text-green-300 light:text-green-800 border-green-700/50 light:border-green-200"

// Dividers
className="border-surface-600 light:border-surface-200 divide-surface-600 light:divide-surface-200"

// Modals (theme-aware background)
style={{ backgroundColor: "var(--bg-surface)" }}
```

**Rule of thumb:** Dark mode uses light text (`surface-100`, `surface-400`); light mode uses dark text (`surface-900`, `surface-500`–`surface-700`). Always pair both variants for theme support.

### Typography

- **Font:** DM Sans (heading & body)
- **Headings:** `font-semibold` or `font-bold`
- **Body:** Default weight, `line-height: 1.6`

---

## Quick Reference

| Use Case | Class |
|----------|-------|
| Page background | `bg-surface-900` or `var(--bg-base)` |
| Card | `card` |
| Primary button | `btn-primary` or `Button variant="primary"` |
| Accent button | `btn-accent` or `Button variant="accent"` |
| Action button gold hover | `hover:bg-accent-500 hover:text-black hover:border-accent-500` |
| Input | `input` |
| Label | `label` |
| Status badge | `StatusBadge` or `Badge variant="green"` etc. |
| Theme-aware modal | `style={{ backgroundColor: "var(--bg-surface)" }}` |
| Light-mode override | `light:text-surface-900` etc. |

### Pages Updated for Theme Support

- Itinerary detail, Voucher detail, Drivers, Tour Tracker
- All use `light:` variants for text, backgrounds, borders, and badges

---

*Last updated: February 2026*
