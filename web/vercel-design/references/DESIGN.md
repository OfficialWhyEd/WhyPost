# vercel DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: None detected
> Colors: 20 · Fonts: 2 · Components: 9
> Icon library: not detected · State: not detected
> Primary theme: light · Dark mode toggle: no · Motion: expressive

## Visual Reference

**Match this design exactly** — study colors, fonts, spacing, and component shapes before writing any UI code.

![vercel Homepage](../screenshots/homepage.png)

---

## 1. Visual Theme & Atmosphere

This is a **light-themed** interface with a cool, approachable feel. The light background emphasizes content clarity. Typography uses **Space Grotesk** throughout — a technical, developer-focused choice that maintains consistency. Spacing follows a **4px base grid** (compact density), with scale: 2, 4, 6, 8, 10, 12, 14, 16px. The palette is predominantly monochromatic with **#0070f3** as the single accent color — used sparingly for interactive elements and emphasis. Motion is expressive — spring physics, layout animations, and staggered reveals are part of the visual language.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| theme-color | `#fafafa` | background | Page background, darkest surface |
| ds-background-100 | `#000000` | text-primary | Headings and body text |
| color-neutral-700 | `#404040` | text-muted | Captions, placeholders, secondary info |
| accents-7 | `#333333` | border | Dividers, card borders, outlines |
| geist-success | `#0070f3` | accent | CTAs, links, focus rings, active states |
| danger | `#de2670` | danger | Error states, destructive actions |
| geist-success-light | `#3291ff` | info | Informational highlights |
| leaderboard-chart-cursor-fill | `#ececee` | unknown | Palette color |
| color-zinc-900 | `#18181b` | unknown | Palette color |
| unknown | `#2c8ce1` | unknown | Palette color |
| unknown | `#ffcade` | unknown | Palette color |
| accents-3 | `#a0a0a0` | unknown | Palette color |
| geist-success-lighter | `#d3e5ff` | unknown | Palette color |
| accents-5 | `#666666` | unknown | Palette color |
| color-violet-100 | `#ede9fe` | unknown | Palette color |
| color-neutral-800 | `#262626` | unknown | Palette color |
| accents-4 | `#878787` | unknown | Palette color |
| unknown | `#cdcdcd` | unknown | Palette color |
| unknown | `#e9d3ff` | unknown | Palette color |
| unknown | `#a853ba` | unknown | Palette color |

### CSS Variable Tokens

```css
--tw-border-style: solid;
--color-background-100: var(--ds-background-100);
--tw-border-style: solid;
--tw-border-style: none;
--tw-border-style: dashed;
--tw-border-style: none;
--tw-border-style: none;
--tw-border-style: solid;
--themed-border: var(--custom-border-color);
--themed-border: var(--custom-border-hover-color);
--border-color: var(--accents-2);
--context-card-tip-stroke: #dbdbdb;
--geist-background: var(--cf-accent-foreground);
--offset-factor-secondary: calc(1 - var(--offset-factor));
--themed-border: transparent;
--themed-border: var(--ds-gray-400);
--tw-border-style: solid;
--tw-border-style: none;
--tw-border-style: solid;
--themed-border: none;
```


---

## 3. Typography Rules

**Font Stack:**
- **Space Grotesk** — Heading 1, Heading 2, Heading 3
- **Space Mono** — Body, Caption, Code

**Font Sources:**

```css
@font-face {
  font-family: "Space Mono";
  src: url("fonts/SpaceMono-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Space Mono";
  src: url("fonts/SpaceMono-Regular.ttf") format("truetype");
  font-weight: 400;
}
@font-face {
  font-family: "Space Grotesk";
  src: url("fonts/SpaceGrotesk-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Space Grotesk";
  src: url("fonts/SpaceGrotesk-Regular.ttf") format("truetype");
  font-weight: 400;
}
@font-face {
  font-family: "Roboto Mono";
  src: url("fonts/RobotoMono-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Roboto Mono";
  src: url("fonts/RobotoMono-Regular.ttf") format("truetype");
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
  font-family: "KaTeX_AMS";
  src: url("fonts/KaTeX_AMS-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "KaTeX_Caligraphic";
  src: url("fonts/KaTeX_Caligraphic-700.woff2") format("woff2");
  font-weight: 700;
}
@font-face {
  font-family: "KaTeX_Caligraphic";
  src: url("fonts/KaTeX_Caligraphic-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "KaTeX_Fraktur";
  src: url("fonts/KaTeX_Fraktur-700.woff2") format("woff2");
  font-weight: 700;
}
@font-face {
  font-family: "KaTeX_Fraktur";
  src: url("fonts/KaTeX_Fraktur-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "KaTeX_Main";
  src: url("fonts/KaTeX_Main-700.woff2") format("woff2");
  font-weight: 700;
}
@font-face {
  font-family: "KaTeX_Main";
  src: url("fonts/KaTeX_Main-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "KaTeX_Math";
  src: url("fonts/KaTeX_Math-700.woff2") format("woff2");
  font-weight: 700;
}
@font-face {
  font-family: "KaTeX_Math";
  src: url("fonts/KaTeX_Math-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "KaTeX_SansSerif";
  src: url("fonts/KaTeX_SansSerif-700.woff2") format("woff2");
  font-weight: 700;
}
@font-face {
  font-family: "KaTeX_SansSerif";
  src: url("fonts/KaTeX_SansSerif-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "KaTeX_Script";
  src: url("fonts/KaTeX_Script-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "KaTeX_Size1";
  src: url("fonts/KaTeX_Size1-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "KaTeX_Size2";
  src: url("fonts/KaTeX_Size2-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "KaTeX_Size3";
  src: url("fonts/KaTeX_Size3-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "KaTeX_Size4";
  src: url("fonts/KaTeX_Size4-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "KaTeX_Typewriter";
  src: url("fonts/KaTeX_Typewriter-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "DSEG7 Classic";
  src: url("fonts/DSEG7Classic-700.woff2") format("woff2");
  font-weight: 700;
}
```

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | Space Grotesk | 110px | 700 |
| Heading 2 | Space Grotesk | 100px | 700 |
| Heading 3 | Space Grotesk | 80px | 700 |
| Body | Space Mono | 14px | 400 |
| Caption | Space Mono | 16px | 400 |
| Code | Space Mono | 14px | 400 |

**Typographic Rules:**
- Use **Space Grotesk** for all text — do not mix font families
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

### Layout (1)

**Footer** — `html`

### Navigation (1)

**Navigation** — `html`

### Data Display (2)

**Badge** — `html`

**List** — `html`

### Data Input (2)

**Button** — `html`
- Animation: 

**Input** — `html`
- State: :focus, :placeholder

### Overlay (1)

**Modal** — `html`

### Media (2)

**Image** — `html`

**Icon** — `html`



---

## 5. Layout Principles

- **Base spacing unit:** 4px
- **Spacing scale:** 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24
- **Border radius:** .125rem, .25rem, .375rem, .5rem, .75rem, .8cqw, 1rem, 1px, 1.25cqw, 1.5cqw, 2px, 2.5px, 3px, 4px, 5px, 6px, 6.5px, 7.5px, 8px, 9px, 10px, 12px, 14px, 15cqw, 16px, 20px, 24px, 32px, 40px, 44px, 48px, 52px, 99px, inherit, 64px, 100px, 100%, 128px, 218.427px, 999px, unset
- **Max content width:** 1150px

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 4-8px | Tight: related items within a group |
| 12-16px | Medium: between groups |
| 24-32px | Wide: between sections |
| 48px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

### Flat — subtle depth hints

- `0 0 0 1px var(--ds-gray-alpha-400)`
- `0 0 0 1px var(--accents-2)`
- `0 0 0 1px var(--themed-border)`

### Raised — cards, buttons, interactive elements

- `var(--ds-shadow-border)`
- `var(--ds-shadow-fullscreen)`
- `var(--ds-shadow-border-large)`

### Floating — dropdowns, popovers, modals

- `0 0 10px var(--geist-foreground),0 0 5px var(--geist-foreground)`
- `0 0 10px var(--ds-blue-200),0 0 20px var(--ds-blue-100)`

### Overlay — full-screen overlays, top-level dialogs

- `0 0 30px var(--ds-blue-400),0 0 60px var(--ds-blue-200)`
- `0 1.8px 3.6px #0000000d,0 10.8px 21.6px #00000014,inset 0-.9px #0000001a,inset 0 1.8px 1.8px #ffffff1a,inset 3.6px 0 3.6px #0000001a`
- `inset 0 1px #ffffff40,0 1px 1px #00000005,0 4px 8px -4px #00000008,0 16px 24px -8px #00000008`

### Z-Index Scale

`0, 1, 2, 3, 4, 5, 9, 10, 15, 20, 25, 26, 30, 40, 50, 80, 99, 100, 101, 200, 211, 500, 1000, 2000, 2001, 4999, 5000, 9998, 9999, 99998, 99999, 100000, 1000000, 99999999, 999999999`



---

## 7. Animation & Motion

This project uses **expressive motion**. Animations are an integral part of the experience.

### CSS Animations

- `@keyframes soft-fade-in`
- `@keyframes show`
- `@keyframes hide`
- `@keyframes fade-in`
- `@keyframes fade-out`
- `@keyframes spinner-opacity`
- `@keyframes slide-in`
- `@keyframes blue-glow`

### Animated Components

- **Button**: 

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#0070f3` for interactive elements (buttons, links, focus rings)
- Use `#fafafa` as the primary page background
- Use **Space Grotesk** for all UI text
- Follow the **4px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: .125rem, .25rem, .375rem, .5rem, .75rem
- Reuse existing components from Section 4 before creating new ones

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't mix font families — use Space Grotesk consistently
- Don't use arbitrary spacing values — stick to multiples of 4px
- Don't create custom box-shadow values outside the system tokens
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't duplicate component patterns — check Section 4 first
- Don't use backdrop-blur or blur effects

### Anti-Patterns (detected from codebase)

- No blur or backdrop-blur effects
- No zebra striping on tables/lists


---

## 9. Responsive Behavior

| Name | Value | Source |
|---|---|---|
| xs | 370px | css |
| xs | 374px | css |
| xs | 375px | css |
| xs | 383px | css |
| xs | 384px | css |
| xs | 400px | css |
| xs | 401px | css |
| xs | 427px | css |
| xs | 440px | css |
| xs | 450px | css |
| xs | 470px | css |
| xs | 480px | css |
| sm | 500px | css |
| sm | 540px | css |
| sm | 600px | css |
| sm | 601px | css |
| sm | 610px | css |
| sm | 640px | css |
| md | 650px | css |
| md | 660px | css |
| md | 670px | css |
| md | 740px | css |
| md | 750px | css |
| md | 768px | css |
| lg | 769px | css |
| lg | 800px | css |
| lg | 960px | css |
| lg | 961px | css |
| lg | 992px | css |
| lg | 1000px | css |
| lg | 1020px | css |
| lg | 1024px | css |
| xl | 1036px | css |
| xl | 1050px | css |
| xl | 1070px | css |
| xl | 1080px | css |
| xl | 1100px | css |
| xl | 1108px | css |
| xl | 1120px | css |
| xl | 1150px | css |
| xl | 1151px | css |
| xl | 1200px | css |
| xl | 1201px | css |
| xl | 1240px | css |
| xl | 1250px | css |
| 2xl | 1400px | css |
| 2xl | 1600px | css |
| 2xl | 2300px | css |

**Approach:** Use `@media (min-width: ...)` queries matching the breakpoints above.


---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #fafafa
Border: 1px solid #333333
Radius: 10px
Padding: 16px
Font: Space Grotesk
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg #0070f3, text white
Ghost: bg transparent, border #333333
Padding: 8px 16px
Radius: 10px
Hover: opacity 0.9 or lighter shade
Focus: ring with #0070f3
```

### Build a Page Layout

```
Background: #fafafa
Max-width: 1150px, centered
Grid: 4px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #fafafa
Label: #404040 (muted, 12px, uppercase)
Value: #000000 (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #fafafa
Input border: 1px solid #333333
Focus: border-color #0070f3
Label: #404040 12px
Spacing: 16px between fields
Radius: 10px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: Space Grotesk, type scale from Section 3
4. Spacing: 4px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```
