# zenvi.pro — current state audit

Walked live site with playwright. Screenshots in `audit/zenvi-pro/home-section-00..10.png`. Structured copy in `report.json`.

## Section inventory (in code & on page)

| # | Section | Component | Headline | What's there now |
|---|---|---|---|---|
| 0 | Intro overlay | `IntroOverlay.tsx` | — | One-time animated intro on first session |
| 1 | Navbar | `Navbar.tsx` | — | Logo · Features / Showcase / Pricing / Docs · Log in · **Request Access** |
| 2 | Hero | `Hero.tsx` | (no H1 — wordmark only) | Giant **ZENVI** wordmark masking a beluga-whale video. *"Premier-grade AI editing. Local processing. Zero latency."* + Download for Mac / Watch Demo |
| 3 | Editor demo | `EditorDemo.tsx` | "A professional workspace, zero latency" | Animated mock of Zenvi Editor — video player, subtitles panel, audio panel, timeline w/ Intro/Main/Outro |
| 4 | Features | `Features.tsx` | "Everything you need to edit like a pro" | Timeline mockup + "Instant AI Edits" carousel of mini screenshots |
| 5 | Integrations | `IntegrationsBeam.tsx` | (no headline) | Network diagram — Zenvi central node connecting to NVIDIA, Anthropic, OpenAI, Pika, etc. |
| 6 | Comparison | `Comparison.tsx` | "Why local beats cloud" | 3-col table: Feature / Zenvi (Local) / Cloud Editors — Speed, Privacy, File Size, Internet, Latency, Cost |
| 7 | Pricing | `Pricing.tsx` | "Simple, predictable pricing" | Monthly/Annual toggle · Creator $29 / Pro $99 (Most Popular) / Studio $199 · Lifetime $99 one-time (Mar 29 only) · "Access code required. Invite-only during beta." |
| 8 | Logos | `LogoTicker.tsx` | "Used by creators at" | Marquee of 3 logos (Superteam Canada, Ajna Materials, Passport) repeated 4× |
| 9 | Footer | `Footer.tsx` | — | Tagline · X icon · Product / Legal / Company columns · "Built for creators who value privacy and speed." |

## User flow

- **Public entry:** `/` → scroll → click *Request Access* (header) or *Download for Mac* (hero) or *Get Started/Go Pro/Get Studio/Claim Lifetime Access* (pricing). All four CTAs route through the same `AccessCodeModal`. Hero "Download" first checks for an active sub via Supabase; if no sub, it scrolls to pricing.
- **Sign in / sign up:** `/login` + `/signup` exist with email-link + GitHub + Google SSO. Login has a side-image with caption *"Zenvi sees the frame before you do. A video taken by Jashan (Cofounder, Zenvi) in 2020"* — same whale moment as the hero, recurring here as personal storytelling.
- **Download:** `/download` is gated. Visiting directly returns *"Invalid access link. This link doesn't look right, or may have expired. Check your invite email or join the waitlist to get early access."*
- **Docs:** `/docs` is well-organized — START HERE / ASSISTANT / EDITING / ADVANCED / MORE buckets. Tagline *"We are a tiny team. These guides are written to match how the app actually behaves, from the timeline to the assistant and the rough edges we are still smoothing out."* This is the most honest, human voice on the entire site — and it's buried in docs.

## What's strong (keep)

1. **The whale moment.** Hero ZENVI wordmark masking Jashan's 2020 video is genuinely arresting and personal. Nothing on flora/morphic/etc. is more emotionally specific than this. It's the brand's best asset.
2. **The local-vs-cloud comparison table.** Clean, scannable, fact-based. Direct competitive positioning.
3. **Pricing transparency.** Three tiers + lifetime offer + clear "no per-minute fees, no token limits" language.
4. **Docs voice.** *"We are a tiny team … the rough edges we are still smoothing out."* This sentence should not be hidden in docs.

## What's weak (fix)

1. **No H1.** The hero's "ZENVI" is visual-only. No H1 anywhere on the homepage — SEO and accessibility hit, and the first H2 ("A professional workspace, zero latency") is generic.
2. **Hero copy reads like feature labels.** *"Premier-grade AI editing. Local processing. Zero latency."* — three nouns, no verbs, no identity. The whale visual is doing emotional work the copy doesn't match. Compare to Flora's *"Your creative environment"* or Cardboard's *"Edit videos at the speed of thought"*.
3. **No three-act compression.** The page goes Editor → Features → Integrations → Comparison → Pricing → Logos. That's a feature dump, not a story. Every reference site collapses to 3 named acts (Flora: Ideate/Iterate/Scale, Morphic: Canvas/Copilot/Compose).
4. **"Everything you need to edit like a pro"** ships as a kerned letter-span with no spaces in the DOM (extracts as `Everythingyouneedtoeditlikeapro`). Bad for accessibility, copy-paste, and SEO.
5. **No customer voice.** Three logos on a marquee, zero outcome quotes. Mosaic's quote wall ("tripled vertical video output at talkSPORT") is the gold standard. You have three named users — get one number from each.
6. **CTA verb soup.** Across the page there are six different action verbs: *Request Access · Download for Mac · Watch Demo · Get Started · Go Pro · Get Studio · Claim Lifetime Access*. All route to the same modal. Cardboard has two. Flora has two. Pick two.
7. **Logos buried below pricing.** Trust signals work hardest when they appear before the ask. Move the logo strip to right after the hero or right after the editor demo.
8. **Story thread breaks after the hero.** The whale moment doesn't recur until the login page. The homepage closes with *"Built for creators who value privacy and speed."* — functional, not memorable. The page needs a closing line that ties back to the whale and the founder's voice.
9. **Mobile is unclear.** The mobile full-page screenshot was mostly black past the hero — intersection-observer-gated sections may not be firing on mobile viewports. Needs a dedicated mobile pass.

## Proposed story arc

The whale moment is the door. Once a visitor walks through it, the story should answer three questions in order: *what is this, who's it for, and why should I trust it.*

```
1. HERO            — the whale moment. New copy that opens an emotional door,
                     not feature labels. (Hero.tsx)

2. PROOF STRIP     — small "Used by creators at" line w/ one outcome quote.
                     (LogoTicker.tsx — moved up & expanded)

3. WHAT IT IS      — three named acts. Three sentences. Three product shots.
                     (Features.tsx — collapsed from current grid)

4. HOW IT FEELS    — the editor demo as a live, breathing surface.
                     (EditorDemo.tsx — keep, possibly tighter)

5. WHY LOCAL       — the comparison table. (Comparison.tsx — keep mostly as-is)

6. WHO'S USING IT  — full customer quote wall + named-creator work.
                     (new section, or expanded LogoTicker)

7. PRICING         — keep, but reduce CTA verbs to one. (Pricing.tsx)

8. CLOSING LINE    — single sentence that ties back to the whale + founder
                     voice. (Footer.tsx top half — new band above footer)
```

The integration-beam can fold into "What it is" as a sub-element, or move to docs.

## Where to start

The hero copy + the missing H1 + the move of trust signals up the page give the biggest emotional ROI for the least scope. Concrete first edits, in suggested order:

- **A. Hero copy rewrite** — keep the whale mask, replace feature-label sub-copy with an identity sentence. Add a proper H1 (visually hidden if needed to preserve the wordmark aesthetic). *(Hero.tsx)*
- **B. Move logo ticker up + add one quote** — logos directly under the hero, with one named outcome line. *(Index.tsx ordering + LogoTicker.tsx)*
- **C. Collapse features to three acts** — rewrite headlines/copy in `Features.tsx` around three named verbs. Pick the verbs first; everything else follows.
- **D. Reduce CTA verbs to two** — *Request Access* (primary) + *Watch Demo* (secondary). Pricing-card CTAs all say the same thing.
- **E. Closing band** — new section above the footer with a single sentence + the founder voice from docs.

Decision points before A: do you want to keep "Request Access" gating (Martini-style exclusivity), or open it up to "Get Started Free" (Flora/Cardboard-style funnel)? The whole tonal register downstream depends on this.
