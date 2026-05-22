# WhyPost — Mission Control

## Product Purpose
Content automation system that produces and publishes 5-7 short-form videos per day (Instagram Reels, TikTok, YouTube Shorts) at zero cost using existing Claude Pro subscription. Python agents run headless on Mac, UI is a real-time mission control dashboard.

## Register
product

## Users
Solo operator (Edoardo, Italian, indie developer/creator). Power user who monitors the pipeline without touching the CLI. Needs instant situational awareness: buffer health, agent activity, video queue, content strategy.

## Tone
Operational, minimal, precise. Italian labels throughout. No marketing fluff — this is a tool, not a product page. Every element must earn its space.

## Brand
- **Font**: NeuePower (headings, numbers), Geist (body), Geist Mono (data/metrics)
- **Accent**: OKLCH emerald-green — signals health, activity, readiness
- **Surface**: Near-black Linear-grade depth hierarchy
- **Motion**: Spring physics only. No bounce. No elastic. Purposeful.

## Anti-references
- No SaaS dashboard clichés (blue/purple gradient cards)
- No Dribbble-style decorative animations
- No generic 3-column equal card grids
- No Inter font

## Strategic Principles
- Buffer-first: always maintain 7-day video buffer
- Zero extra cost: Claude Pro subscription only (no API fees)
- Agents are named entities: MAIN, EXEL, SCRIPT, ASSET, CLACK, SAFETY, PUBLISHER, TELEMETRY, OPUS
- config.yaml is the single source of truth — UI writes back to it via POST /config
- No scrollable internal windows anywhere in the UI
