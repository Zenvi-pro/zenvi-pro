---
name: Design system file locations
description: Where every design system artifact lives in the Zenvi project
type: reference
---

## Token Files
- **CSS tokens**: `src/index.css` — CSS custom properties in :root
- **JSON tokens**: `src/design-system/tokens.json` — W3C DTCG format, canonical reference
- **Tailwind config**: `tailwind.config.ts` — Primitive palette + animations + shadows

## Component Files
- `src/components/ui/button.tsx` — Zenvi-extended Button with space variants
- `src/components/ui/card.tsx` — Glass/Featured/Interactive/Cosmic card variants
- `src/components/ui/input.tsx` — Space-themed Input + FormField compound
- `src/components/ui/tooltip.tsx`, `dialog.tsx`, `sheet.tsx` — Radix primitives (space theme applied via CSS)

## Background System
- `src/components/landing/StarField.tsx` — Canvas particle system, parallax scroll
- `src/components/landing/NebulaBackground.tsx` — Layered nebula + aurora + grid + orbs
- Usage pattern: `<StarField />` + `<NebulaBackground />` as first children of `relative overflow-hidden` section

## Landing Components (linter-managed, space-themed)
- `src/components/landing/Hero.tsx` — Uses StarField + NebulaBackground
- `src/components/landing/Navbar.tsx` — Frosted glass on scroll, cosmic logo
- `src/components/landing/Features.tsx` — Glass cards, aurora category labels
- `src/components/landing/Pricing.tsx` — Featured card with nebula gradient
- `src/components/landing/Footer.tsx`
- `src/components/landing/WaitlistModal.tsx`
- `src/components/landing/AccessCodeModal.tsx`
- `src/components/landing/IntroOverlay.tsx`
- `src/components/ZenviLogo.tsx` — `cosmic` prop for gradient stroke

## Docs
- `src/design-system/tokens.json` — Full W3C token spec with $descriptions
- This memory directory — architectural decisions and patterns
