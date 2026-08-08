# HyperFrames motion graphics

**HyperFrames** turns HTML/CSS + seekable animation into deterministic MP4 videos. In Zenvi, the motion-graphics agent uses a seeded **motion-block catalog** (titles, lower-thirds, charts, social overlays) and can fall through to custom HyperFrames HTML when needed. URL product demos plan via the backend, then render on the HyperFrames service and import into your library.

## When you care about HyperFrames

If a feature mentions a **motion graphic**, **product demo from URL**, or **fetching a HyperFrames video**, you need the **backend** and **`HYPERFRAMES_URL`** pointing at the render service (see **zenvi-core** / **zenvi-backend** `.env.example`). You do not author React compositions in Zenvi — HyperFrames compositions are HTML.

## Learning HyperFrames itself

For the programming model (data attributes, GSAP timelines, catalog blocks), use the official HyperFrames documentation.

[HyperFrames documentation](https://hyperframes.heygen.com/introduction)

> **Tip:** If fetch fails, confirm the HyperFrames server is up (`GET /api/v1/health`) and that `HYPERFRAMES_URL` matches the environment the desktop app uses.
