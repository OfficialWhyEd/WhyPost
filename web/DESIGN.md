# WhyPost Design System

## Color Tokens (OKLCH)

```css
/* Dark mode (default) */
--bg:        #070709            /* canvas */
--surf-1:    #0f1011            /* primary surface */
--surf-2:    #141516            /* elevated surface */
--surf-3:    #1c1d1f            /* highest surface */
--border:    rgba(255,255,255,0.07)
--border-hi: rgba(255,255,255,0.12)
--text:      #eff0f2            /* primary text */
--text-2:    #9ca3af            /* secondary text */
--text-3:    #6b7280            /* tertiary/muted */
--accent:    oklch(73% 0.14 158)  /* emerald green */
--danger:    oklch(65% 0.19 24)   /* red */
--warn:      oklch(73% 0.15 68)   /* amber */
--inset-hi:  rgba(255,255,255,0.05)

/* Light mode: [data-theme="light"] overrides */
--bg:        oklch(97% 0.004 160)
--text:      oklch(12% 0.008 160)
--accent:    oklch(38% 0.14 158)  /* darker for contrast */
```

## Typography

| Class | Font | Size | Weight | Use |
|-------|------|------|--------|-----|
| `.section-title` | NeuePower | 18px | 900 | Section headers |
| `.label` | Geist | 11px | 700 | Uppercase data labels |
| `.mono` | Geist Mono | — | — | Numbers, metrics, times |
| body | Geist | 14px | 400 | General text |

## Spacing
- Component padding: 13-18px
- Inner gaps: 4-8px
- Section gaps: 10-14px
- Border radius: 12px (panels), 8px (buttons), 20px (tags/chips)

## Component Patterns

### Surface cards
```css
background: var(--surf-1);
border: 1px solid var(--border);
border-radius: 12px;
box-shadow: inset 0 1px 0 var(--inset-hi);
```

### Active tags (topics whitelist)
```css
background: var(--accent-dim);  /* rgba(accent, 0.1) */
border: 1px solid rgba(52,211,153,0.22);
color: var(--accent);
border-radius: 20px;
```

### Blacklist chips
```css
background: rgba(248,113,113,0.06);
border: 1px solid rgba(248,113,113,0.18);
color: var(--danger);
```

### Agent status dots
- Running: `var(--accent)` — pulsing scale animation
- Error: `var(--danger)` — static
- Idle: `var(--border-hi)` — static

## Motion Rules
- All transitions: `type: 'spring', stiffness: 480, damping: 28`
- Page transitions: `duration: 0.35, ease: [0.16, 1, 0.3, 1]`
- Hover lift: `y: -1` or `y: -2`
- Press: `scale: 0.92-0.97`
- NO bounce, NO elastic, NO linear easing for UI elements
- Shimmer animations: `ease: 'easeInOut'` only

## Layout Rules
- No internal scrollable windows
- Status column: `flex: 1` + right column `360px`
- BottomBar: `1fr | 1px | 280px | 1px | 196px` grid
- Calendar: `repeat(7, 1fr)` grid, cells `minHeight: 116px`
- CalendarPage: `repeat(7, 1fr)` × `repeat(N, 1fr)` — fills 100% height, no overflow

## Agent Names (canonical)
MAIN · EXEL · SCRIPT · ASSET · CLACK · SAFETY · PUBLISHER · TELEMETRY · OPUS
