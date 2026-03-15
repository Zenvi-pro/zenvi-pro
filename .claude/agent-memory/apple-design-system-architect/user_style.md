---
name: User collaboration style
description: Observed preferences and workflow patterns for this project
type: user
---

## Request Style
- User provides comprehensive, well-structured briefs with specific technical requirements
- Expects publish-ready output — not scaffolding, not "start here" boilerplate
- Values specificity: exact hex values, contrast ratios, CSS properties, Framer Motion configs
- Comfortable with large output volumes across multiple files simultaneously

## Technical Level
- Clearly experienced with React, TypeScript, Tailwind CSS, Framer Motion
- Familiar with design systems (references Zeroheight, Storybook, W3C tokens)
- Knows shadcn/ui component architecture
- Expects CSS custom properties for tokens, not hardcoded values

## Quality Bar
- Apple HIG level of precision — references Apple design quality explicitly
- WCAG 2.1 AA compliance is a hard requirement, not a nice-to-have
- Expects dark-mode first, not dark-mode as afterthought
- Performance-conscious: canvas for particles, not DOM nodes; transform/opacity animations only

## Project Workflow Note
An automated linter/agent runs alongside edits and actively applies its own cosmic space theme to CSS and component files. This linter:
- Updates index.css HSL variables toward aurora violet primary
- Updates landing components with zenvi.* color namespace references
- Must be worked with, not against — both token systems (zenvi.* namespace + primitive plasma/nebula classes) coexist
