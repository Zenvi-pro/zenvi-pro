---
name: Zenvi project context
description: Stack, brand identity, design system decisions, and key architectural choices for the Zenvi website
type: project
---

## Stack
- Vite + React 18 + TypeScript
- Tailwind CSS v3 (NOT Next.js — this is Vite)
- Framer Motion v12 (already installed)
- Radix UI primitives + shadcn/ui component base
- React Router v6
- Supabase auth + TanStack Query
- No Next.js — do NOT use next/font, next/image, or any Next.js APIs

## Brand Identity
- **Product**: Local-first AI video editor — "Edit video at machine speed, not cloud speed"
- **Core value**: Privacy + speed — footage never leaves the user's machine
- **Aesthetic**: Interplanetary/space theme — deep void, cosmic gradients, aurora accents
- **Quality target**: Apple-level precision — pixel-perfect, minimalist, premium

## Color Architecture Decision
- An active linter/AI agent is managing the CSS and component files alongside this system
- The linter chose **aurora violet (#8b5cf6) as primary** in shadcn HSL tokens (--primary: 258 90% 66%)
- The design system spec defines **plasma blue (#0066FF)** as brand primary in the primitive palette
- Both coexist: shadcn components use the HSL vars (violet), primitive Tailwind classes use plasma-500 (blue)
- The zenvi.* color namespace in Tailwind contains: zenvi-aurora-violet, zenvi-aurora-cyan, zenvi-stellar-muted, zenvi-cosmic-mid, etc.

## Key Files
- `tailwind.config.ts` — Full space palette: plasma, nebula, aurora, stellar, infrared, space, void, stardust, ion
- `src/index.css` — CSS custom property tokens, glass/glow/star-field/nebula classes, keyframes
- `src/design-system/tokens.json` — W3C DTCG format token file (canonical reference)
- `src/components/landing/StarField.tsx` — Canvas particle system star field with parallax
- `src/components/landing/NebulaBackground.tsx` — Layered space background (nebula + aurora + grid + orbs)
- `src/components/ui/button.tsx` — Extended with cosmic/ghost-space/nebula/destructive/aurora variants + loading state
- `src/components/ui/card.tsx` — Glass/FeaturedCard/InteractiveCard/CosmicCard variants
- `src/components/ui/input.tsx` — Plasma glow focus, infrared error, FormField compound
- `src/components/ZenviLogo.tsx` — Has `cosmic` prop that renders aurora-to-violet gradient stroke

## Animation Architecture
- **Ambient animations**: star-drift (8s), aurora-shift (12s), float-slow (9s) — CSS keyframes
- **Interactive animations**: Framer Motion, ease-out-expo [0.16,1,0.3,1] for enter, 250-400ms range
- **Always wrapped**: prefers-reduced-motion disables all ambient; interactive retains instant state change
- **Never animate box-shadow directly** — use opacity on a pseudo-element layer for performance

## Accessibility Rules
- All text/bg combinations verified against WCAG 2.1 AA
- Primary text (#f0f0ff) on bg (#0a0a0f) = 14.2:1 (AAA)
- Link text (plasma-300 #4D88FF) on bg = 7.1:1 (AAA)
- Error text (infrared-300 #FF7070) on bg = 5.9:1 (AA)
- Disabled states intentionally < 4.5:1 — always pair with aria-disabled + opacity on container
- Minimum touch target: 44×44px via min-h-[44px] min-w-[44px] on icon-only buttons

## Component Naming Convention
- Variant names in buttonVariants: cosmic, ghost-space, nebula, destructive, ghost, link, aurora
- Backward-compat aliases: default (= cosmic), secondary, outline preserved for existing usage
- Cards: Card (glass), FeaturedCard (nebula glow), InteractiveCard (hover lift), CosmicCard (plasma border)

## How to Add Star Field to Any Section
```tsx
<section className="relative overflow-hidden">
  <StarField count={150} parallaxFactor={0.05} />
  <NebulaBackground aurora grid orbs intensity={0.8} />
  <div className="relative z-10">
    {/* content */}
  </div>
</section>
```

**Why:** z-index layering — background components are absolute positioned, content must be `relative z-10` to render above them.
