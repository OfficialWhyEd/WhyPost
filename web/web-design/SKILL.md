---
name: web-design
description: Design system skill for web. Activate when building UI components, pages, or any visual elements. Provides exact color tokens, typography scale, spacing grid, component patterns, and craft rules. Read references/DESIGN.md before writing any CSS or JSX.
---

# web Design System

You are building UI for **web**. Dark-themed, neutral palette, sans-serif typography (Geist), compact density on a 4px grid, expressive motion.

## Design Philosophy

- **Layered depth** — use shadow tokens to create a sense of physical layering. Each elevation level has a specific shadow.
- **Gradient accents** — gradients are used thoughtfully for emphasis, not decoration.
- **Type pairing** — Geist for body/UI text, NeuePower for headings/display. Never introduce a third typeface.
- **compact density** — 4px base grid. Every dimension is a multiple of 4.
- **neutral palette** — the color temperature runs neutral, matching the sans-serif typography.
- **Expressive motion** — animations are an integral part of the experience. Use spring physics and layout animations.
- **Lucide icons** — use Lucide for all iconography. Do not mix icon libraries.

## Color System

### Core Palette

| Role | Token | Hex | Use |
|------|-------|-----|-----|
| Background | `--background` | `#000000` | Page/app background |
| Surface | `--surface` | `#0a0a0e` | Cards, panels, modals |
| Text Primary | `--text-primary` | `#ffffff` | Headings, body text |

### Status Colors

| Status | Hex | Use |
|--------|-----|-----|
| Danger | `#e1306c` | Errors, destructive actions |

### CSS Variable Tokens

```css
--border: rgba(255,255,255,0.07);
--border-hi: rgba(255,255,255,0.12);
--accent: oklch(73%0.14 158);
--accent-dim: oklch(73%0.14 158/0.1);
--accent-text: oklch(22%0.06 158);
```

## Typography

### Font Stack

- **Geist** — Heading 1, Heading 2, Heading 3
- **NeuePower** — Body
- **Geist Mono** — Code

### Font Sources

```css
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-Regular.ttf") format("truetype");
  font-weight: 400;
}
@font-face {
  font-family: "Geist Mono";
  src: url("fonts/GeistMono-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Geist Mono";
  src: url("fonts/GeistMono-Regular.ttf") format("truetype");
  font-weight: 400;
}
```

### Type Scale

| Role | Family | Size | Weight |
|------|--------|------|--------|
| Heading 1 | Geist | 18px | 700 |
| Heading 2 | Geist | 14px | 700 |
| Heading 3 | Geist | 12px | 700 |
| Body | NeuePower | 11px | 400 |
| Code | Geist Mono | 14px | 400 |

### Typography Rules

- Body/UI: **Geist**, Headings: **NeuePower** — these are the only display fonts
- Max 3-4 font sizes per screen
- Headings: weight 600-700, body: weight 400
- Use color and opacity for text hierarchy, not additional font sizes
- Line height: 1.5 for body, 1.2 for headings

## Spacing & Layout

### Base Grid: 4px

Every dimension (margin, padding, gap, width, height) must be a multiple of **4px**.

### Spacing Scale

`8, 10, 18, 20, 24, 32, 48, 88` px

### Spacing as Meaning

| Spacing | Use |
|---------|-----|
| 4-8px | Tight: related items (icon + label, avatar + name) |
| 12-16px | Medium: between groups within a section |
| 24-32px | Wide: between distinct sections |
| 48px+ | Vast: major page section breaks |

### Border Radius

Scale: `2px, 5px`
Default: `5px`

### Container

Max-width: `1024px`, centered with auto margins.

## Component Patterns

### Card

```css
.card {
  background: #0a0a0e;
  border-radius: 5px;
  padding: 18px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07),0 24px 80px rgba(0,0,0,0.6);
}
```

```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</div>
```

### Button

```css
/* Primary */
.btn-primary {
  background: #444444;
  color: #ffffff;
  border-radius: 5px;
  padding: 8px 18px;
  font-weight: 500;
  transition: opacity 150ms ease;
}
.btn-primary:hover { opacity: 0.9; }

/* Ghost */
.btn-ghost {
  background: transparent;
  border: 1px solid #444444;
  color: #ffffff;
  border-radius: 5px;
  padding: 8px 18px;
}
```

```html
<button class="btn-primary">Get Started</button>
<button class="btn-ghost">Learn More</button>
```

### Input

```css
.input {
  background: #000000;
  border: 1px solid #444444;
  border-radius: 5px;
  padding: 8px 10px;
  color: #ffffff;
  font-size: 14px;
}
.input:focus { border-color: var(--accent); outline: none; }
```

```html
<input class="input" type="text" placeholder="Search..." />
```

### Badge / Chip

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: #0a0a0e;
  color: #8c8c8c;
}
```

```html
<span class="badge">New</span>
<span class="badge">Beta</span>
```

### Modal / Dialog

```css
.modal-backdrop { background: rgba(0, 0, 0, 0.6); }
.modal {
  background: #0a0a0e;
  border-radius: 5px;
  padding: 24px;
  max-width: 480px;
  width: 90vw;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07),0 24px 80px rgba(0,0,0,0.6);
}
```

```html
<div class="modal-backdrop">
  <div class="modal">
    <h2>Dialog Title</h2>
    <p>Dialog content.</p>
    <button class="btn-primary">Confirm</button>
    <button class="btn-ghost">Cancel</button>
  </div>
</div>
```

### Table

```css
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left;
  padding: 8px 10px;
  font-weight: 500;
  font-size: 12px;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #444444;
}
.table td {
  padding: 10px;
  border-bottom: 1px solid #444444;
}
```

```html
<table class="table">
  <thead><tr><th>Name</th><th>Status</th><th>Date</th></tr></thead>
  <tbody>
    <tr><td>Item One</td><td>Active</td><td>Jan 1</td></tr>
    <tr><td>Item Two</td><td>Pending</td><td>Jan 2</td></tr>
  </tbody>
</table>
```

### Navigation

```css
.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
}
.nav-link {
  color: #8c8c8c;
  padding: 8px 10px;
  border-radius: 5px;
  transition: color 150ms;
}
.nav-link:hover { color: #ffffff; }
```

```html
<nav class="nav">
  <a href="/" class="nav-link active">Home</a>
  <a href="/about" class="nav-link">About</a>
  <a href="/pricing" class="nav-link">Pricing</a>
  <button class="btn-primary" style="margin-left: auto">Get Started</button>
</nav>
```

### Extracted Components

These components were found in the codebase:

**BottomBar** (`src/components/BottomBar.tsx`)
- Props: `id`, `label`, `short`, `Icon`, `color`

**Calendar** (`src/components/Calendar.tsx`)
- Variants: `TechNews`, `Tutorial`, `BestOf`, `auto`
- Props: `queue`, `onVideoClick`, `v`

**ChatSidebar** (`src/components/ChatSidebar.tsx`)
- Variants: `chat`, `prompts`
- Props: `onSend`, `msg`, `collapsed`, `onCollapse`

**Dashboard** (`src/components/Dashboard.tsx`)
- Variants: `dark`, `light`
- Props: `state`, `queue`, `memory`, `serverOk`, `onVideoClick`, `v`

**Sidebar** (`src/components/Sidebar.tsx`)
- Variants: `home`, `queue`, `calendar`, `agents`, `memory`, `main`, `dark`, `settings`, `system`, `light`
- Props: `page`, `onNavigate`, `p`, `queueCount`, `theme`, `onToggleTheme`

**SocialConnectModal** (`src/components/SocialConnectModal.tsx`)
- Variants: `disconnected`, `connecting`, `social`, `pipeline`, `connected`, `notify`
- Props: `instagram`, `tiktok`, `youtube`, `gcal`

**VideoPreviewModal** (`src/components/VideoPreviewModal.tsx`)
- Variants: `approve`, `scripted`, `reject`
- Props: `video`, `onClose`, `onRefresh`

**CalendarPage** (`src/pages/CalendarPage.tsx`)
- Variants: `TechNews`, `Tutorial`, `BestOf`, `auto`
- Props: `queue`, `onVideoClick`, `v`

**QueuePage** (`src/pages/QueuePage.tsx`)
- Variants: `tutti`
- Props: `queue`, `onVideoClick`, `v`

**SettingsPage** (`src/pages/SettingsPage.tsx`)
- Variants: `disconnected`, `connecting`, `social`, `pipeline`, `api`, `connected`, `notifiche`
- Props: `instagram`, `tiktok`, `youtube`, `gcal`

## Animation & Motion

This project uses **expressive motion**. Animations are part of the design language.

### Framer Motion

```tsx
// Standard enter animation
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>

// List stagger
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }
```

### CSS Animations

- `shimmer`

### Motion Tokens

- **Duration scale:** `300ms`
- **Animated properties:** `border-color`

### Motion Guidelines

- **Duration:** Use values from the duration scale above. Short (300ms) for micro-interactions, long (300ms) for page transitions
- **Easing:** `ease-out` for enters, `ease-in` for exits
- **Direction:** Elements enter from bottom/right, exit to top/left
- **Reduced motion:** Always respect `prefers-reduced-motion` — disable animations when set

## Depth & Elevation

### Shadow Tokens

- Overlay (modals, dialogs): `inset 0 1px 0 rgba(255,255,255,0.07),0 24px 80px rgba(0,0,0,0.6)`

### Z-Index Scale

`0, 1`

Use these exact values — never invent z-index values.

## Anti-Patterns (Never Do)

- **No blur effects** — no backdrop-blur, no filter: blur()
- **No zebra striping** — tables and lists use borders for separation
- **No invented colors** — every hex value must come from the palette above
- **No arbitrary spacing** — every dimension is a multiple of 4px
- **No extra fonts** — only Geist and NeuePower and Geist Mono are allowed
- **No arbitrary border-radius** — use the scale: 2px, 5px
- **No opacity for disabled states** — use muted colors instead
- **No pill shapes** — this design doesn't use rounded-full / 9999px radius

## Workflow

1. **Read** `references/DESIGN.md` before writing any UI code
2. **Pick colors** from the Color System section — never invent new ones
3. **Set typography** — Geist, NeuePower, Geist Mono only, using the type scale
4. **Build layout** on the 4px grid — check every margin, padding, gap
5. **Match components** to patterns above before creating new ones
6. **Apply elevation** — use shadow tokens
7. **Validate** — every value traces back to a design token. No magic numbers.

## Brand Spec

- **Brand typeface:** Geist

## Quick Reference

```
Background:     #000000
Surface:        #0a0a0e
Text:           #ffffff / (not extracted)
Accent:         (not extracted)
Border:         (not extracted)
Font:           Geist
Spacing:        4px grid
Radius:         5px
Frameworks:     Tailwind CSS, React
Icons:          Lucide
Components:     16 detected
```

## When to Trigger

Activate this skill when:
- Creating new components, pages, or visual elements for web
- Writing CSS, Tailwind classes, styled-components, or inline styles
- Building page layouts, templates, or responsive designs
- Reviewing UI code for design consistency
- The user mentions "web" design, style, UI, or theme
- Generating mockups, wireframes, or visual prototypes

---

# Full Reference Files

> Every output file is embedded below. Claude has full design system context from /skills alone.

## Design System Tokens (DESIGN.md)

# web DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: Tailwind CSS 4.3.0 + React 19.2.6
> Colors: 4 · Fonts: 3 · Components: 16
> Icon library: Lucide · State: not detected
> Primary theme: dark · Dark mode toggle: no · Motion: expressive

---

## 1. Visual Theme & Atmosphere

This is a **dark-themed** interface with a neutral tone. Depth is expressed through layered shadows and subtle surface color variation. Typography pairs **NeuePower** for display/headings with **Geist** for body text, creating clear visual hierarchy through type contrast. Spacing follows a **4px base grid** (compact density), with scale: 8, 10, 18, 20, 24, 32, 48, 88px. Motion is expressive — spring physics, layout animations, and staggered reveals are part of the visual language.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| border | `#000000` | background | Page background, darkest surface |
| surface | `#0a0a0e` | surface | Card and panel backgrounds |
| border | `#ffffff` | text-primary | Headings and body text |
| danger | `#e1306c` | danger | Error states, destructive actions |

### CSS Variable Tokens

```css
--border: rgba(255,255,255,0.07);
--border-hi: rgba(255,255,255,0.12);
--accent: oklch(73%0.14 158);
--accent-dim: oklch(73%0.14 158/0.1);
--accent-text: oklch(22%0.06 158);
```


---

## 3. Typography Rules

**Font Stack:**
- **Geist** — Heading 1, Heading 2, Heading 3
- **NeuePower** — Body
- **Geist Mono** — Code

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | Geist | 18px | 700 |
| Heading 2 | Geist | 14px | 700 |
| Heading 3 | Geist | 12px | 700 |
| Body | NeuePower | 11px | 400 |
| Code | Geist Mono | 14px | 400 |

**Typographic Rules:**
- Limit to 3 font families max per screen
- Use **Geist** for body/UI text, **NeuePower** for display/headings
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

### Layout (1)

**Sidebar** — `src/components/Sidebar.tsx`
- Variants: `home`, `queue`, `calendar`, `agents`, `memory`, `main`, `dark`, `settings`, `system`, `light`
- Props: `page`, `onNavigate`, `p`, `queueCount`, `theme`, `onToggleTheme`
- Animation: framer-motion, transition: {type: 'spring' as const, stiffness: 500, damping: 30}, animate-presence
- State: useState

```tsx
<div style={{ position: 'relative' }}>
      <motion.button
        onClick={onClick}
        onHoverStart={(
```

### Navigation (3)

**BottomBar** — `src/components/BottomBar.tsx`
- Props: `id`, `label`, `short`, `Icon`, `color`
- Animation: framer-motion, transition: {type: 'spring' as const, stiffness: 480, damping: 28}, animate-presence
- State: useState, useRef

```tsx
<svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>
    </svg>
```

**SocialConnectModal** — `src/components/SocialConnectModal.tsx`
- Variants: `disconnected`, `connecting`, `social`, `pipeline`, `connected`, `notify`
- Props: `instagram`, `tiktok`, `youtube`, `gcal`
- Animation: motion-variant: variants={backdrop}, motion-variant: variants={panel}, motion-variant: variants={contentVariants}
- State: useState

```tsx
<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/>
    </svg>
```

**SettingsPage** — `src/pages/SettingsPage.tsx`
- Variants: `disconnected`, `connecting`, `social`, `pipeline`, `api`, `connected`, `notifiche`
- Props: `instagram`, `tiktok`, `youtube`, `gcal`
- Animation: motion-variant: variants={containerVariants}, motion-variant: variants={itemVariants}, framer-motion
- State: useState

```tsx
<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/>
    </svg>
```

### Data Display (4)

**Calendar** — `src/components/Calendar.tsx`
- Variants: `TechNews`, `Tutorial`, `BestOf`, `auto`
- Props: `queue`, `onVideoClick`, `v`
- Animation: framer-motion, transition: {type: 'spring' as const, stiffness: 500, damping: 30}, animate-presence
- State: useState, useRef

```tsx
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="#E1306C" strokeWidth="2.2"/>
      <circle cx="12" cy="12" r="4.5" stroke="#E1306C" strokeWidth="2.2"/>
      <circle cx="17.5" cy="6.5" r="1.3" fill="#E1306C"/>
    </svg>
```

**Statistics** — `src/components/Statistics.tsx`
- Props: `state`, `queue`
- Animation: motion-variant: variants={containerVariants}, motion-variant: variants={cellVariants}, motion-variant: variants={cellVariants}

```tsx
<span style={{
      fontFamily: 'NeuePower, Geist, sans-serif',
      fontSize: size, fontWeight: 900, lineHeight: 1,
      color: color ?? 'var(--text
```

**StatusBadge** — `src/components/StatusBadge.tsx`
- Props: `status`, `serverOk`
- Animation: framer-motion, transition: {duration: 1.8, repeat: Infinity, ease: 'easeInOut'}, animate: {shouldPulse ? { scale: [1, 1.4, 1], opacity: [1, 0.35, 1]}
- State: memo

```tsx
<motion.div
      style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }}
      animate={shouldPulse ? { scale: [1, 1.4, 1], opacity: [1, 0.35, 1] } : {}}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
```

**CalendarPage** — `src/pages/CalendarPage.tsx`
- Variants: `TechNews`, `Tutorial`, `BestOf`, `auto`
- Props: `queue`, `onVideoClick`, `v`
- Animation: framer-motion, transition: {type: 'spring' as const, stiffness: 500, damping: 30}, animate-presence
- State: useState, useRef

```tsx
d + 6
```

### Overlay (5)

**AgentGrid** — `src/components/AgentGrid.tsx`
- Animation: motion-variant: variants={containerVariants}, motion-variant: variants={itemVariants}, framer-motion
- State: useState, memo

**ChatSidebar** — `src/components/ChatSidebar.tsx`
- Variants: `chat`, `prompts`
- Props: `onSend`, `msg`, `collapsed`, `onCollapse`
- Animation: motion-variant: variants={msgVariants}, framer-motion, transition: {type: 'spring' as const, stiffness: 500, damping: 30}
- State: useState, useRef

```tsx
<div style={{
        width: 44, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        borderLeft: '1px solid var(--border
```

**Dashboard** — `src/components/Dashboard.tsx`
- Variants: `dark`, `light`
- Props: `state`, `queue`, `memory`, `serverOk`, `onVideoClick`, `v`, `lastRefresh`, `onRefresh` (+4 more)
- Animation: framer-motion, transition: {type: 'spring' as const, stiffness: 500, damping: 30}, animate-presence
- State: useState

**QueuePanel** — `src/components/QueuePanel.tsx`
- Props: `queue`, `onVideoClick`, `v`
- Animation: motion-variant: variants={groupVariants}, motion-variant: variants={itemVariants}, framer-motion

```tsx
<div style={{ padding: '16px 18px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 className="section-title">CODA VIDEO.</h2>
        <span style={{ fontSize: 10, color: 'var(--text-3
```

**QueuePage** — `src/pages/QueuePage.tsx`
- Variants: `tutti`
- Props: `queue`, `onVideoClick`, `v`
- Animation: motion-variant: variants={listVariants}, motion-variant: variants={rowVariants}, framer-motion
- State: useState

```tsx
<motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Page header */}
      <div style={{
        padding: '20px 28px 0',
        borderBottom: '1px solid var(--border
```

### Media (1)

**VideoPreviewModal** — `src/components/VideoPreviewModal.tsx`
- Variants: `approve`, `scripted`, `reject`
- Props: `video`, `onClose`, `onRefresh`
- Animation: framer-motion, transition: {type: 'spring' as const, stiffness: 340, damping: 30}, animate-presence
- State: useState, useRef

### Other (2)

**AgentsPage** — `src/pages/AgentsPage.tsx`
- Props: `state`
- Animation: motion-variant: variants={containerVariants}, motion-variant: variants={cardVariants}, framer-motion
- State: memo

```tsx
<motion.div
      style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}
      animate={running ? { scale: [1, 1.5, 1], opacity: [1, 0.35, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
```

**MemoryPage** — `src/pages/MemoryPage.tsx`
- Props: `memory`
- Animation: motion-variant: variants={containerVariants}, motion-variant: variants={itemVariants}, framer-motion

```tsx
<motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring' as const, stiffness: 400, damping: 28 }}
      style={{
        padding: '18px 20px',
        background: 'var(--surf-1
```



---

## 5. Layout Principles

- **Base spacing unit:** 4px
- **Spacing scale:** 8, 10, 18, 20, 24, 32, 48, 88
- **Border radius:** 2px, 5px
- **Max content width:** 1024px
- **Container:** Tailwind `container` class with responsive padding

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 4-8px | Tight: related items within a group |
| 12-16px | Medium: between groups |
| 24-32px | Wide: between sections |
| 48px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

### Overlay — full-screen overlays, top-level dialogs

- `inset 0 1px 0 rgba(255,255,255,0.07),0 24px 80px rgba(0,0,0,0.6)`

### Z-Index Scale

`0, 1`



---

## 7. Animation & Motion

This project uses **expressive motion**. Animations are an integral part of the experience.

### Framer Motion Patterns

```tsx
// Standard enter animation
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>

// List stagger
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } }
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 }
}
```

### CSS Animations

- `@keyframes shimmer`

### Animated Components

- **AgentGrid**: motion-variant: variants={containerVariants}, motion-variant: variants={itemVariants}, framer-motion
- **BottomBar**: framer-motion, transition: {type: 'spring' as const, stiffness: 480, damping: 28}, animate-presence
- **Calendar**: framer-motion, transition: {type: 'spring' as const, stiffness: 500, damping: 30}, animate-presence
- **ChatSidebar**: motion-variant: variants={msgVariants}, framer-motion, transition: {type: 'spring' as const, stiffness: 500, damping: 30}
- **Dashboard**: framer-motion, transition: {type: 'spring' as const, stiffness: 500, damping: 30}, animate-presence

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#000000` as the primary page background
- Pair **Geist** (body) with **NeuePower** (display) — these are the only allowed fonts
- Follow the **4px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: 2px, 5px
- Reuse existing components from Section 4 before creating new ones
- Use **Lucide** for all icons

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't introduce additional font families beyond Geist and NeuePower and Geist Mono
- Don't use arbitrary spacing values — stick to multiples of 4px
- Don't create custom box-shadow values outside the system tokens
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't duplicate component patterns — check Section 4 first
- Don't mix icon libraries — consistency matters
- Don't use backdrop-blur or blur effects

### Anti-Patterns (detected from codebase)

- No blur or backdrop-blur effects
- No zebra striping on tables/lists


---

## 9. Responsive Behavior

No breakpoints detected. Consider adding responsive breakpoints to the design system.

---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #0a0a0e
Border: 1px solid var(--border)
Radius: 5px
Padding: 18px
Font: Geist
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg var(--accent), text white
Ghost: bg transparent, border var(--border)
Padding: 8px 18px
Radius: 5px
Hover: opacity 0.9 or lighter shade
Focus: ring with var(--accent)
```

### Build a Page Layout

```
Background: #000000
Max-width: 1024px, centered
Grid: 4px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #0a0a0e
Label: var(--text-muted) (muted, 12px, uppercase)
Value: #ffffff (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #000000
Input border: 1px solid var(--border)
Focus: border-color var(--accent)
Label: var(--text-muted) 12px
Spacing: 18px between fields
Radius: 5px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: Geist, type scale from Section 3
4. Spacing: 4px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```

## Bundled Fonts (fonts/)

The following font files are bundled in the `fonts/` directory:

- `fonts/Geist-Black.ttf`
- `fonts/Geist-Bold.ttf`
- `fonts/Geist-ExtraBold.ttf`
- `fonts/Geist-ExtraLight.ttf`
- `fonts/Geist-Light.ttf`
- `fonts/Geist-Medium.ttf`
- `fonts/Geist-Regular.ttf`
- `fonts/Geist-SemiBold.ttf`
- `fonts/Geist-Thin.ttf`
- `fonts/GeistMono-Black.ttf`
- `fonts/GeistMono-Bold.ttf`
- `fonts/GeistMono-ExtraBold.ttf`
- `fonts/GeistMono-ExtraLight.ttf`
- `fonts/GeistMono-Light.ttf`
- `fonts/GeistMono-Medium.ttf`
- `fonts/GeistMono-Regular.ttf`
- `fonts/GeistMono-SemiBold.ttf`
- `fonts/GeistMono-Thin.ttf`

Use these local font files in `@font-face` declarations instead of fetching from Google Fonts.

