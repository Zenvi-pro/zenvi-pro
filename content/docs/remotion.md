# Remotion

**Remotion** is a React based way to describe motion graphics as code. In Zenvi, some flows **render** Remotion projects on a service, then **pull the finished video** into your library or timeline through backend integration (for example Supabase hosted assets).

## When you care about Remotion

If a feature mentions a **Remotion render** or **fetching a Remotion video**, you need the right **backend** and **service URLs** running, as in **zenvi-core** `.env.example` (`REMOTION_PRODUCT_LAUNCH_URL`, backend URL). You do not have to write React inside Zenvi for basic editing; Remotion is for template driven motion pieces your stack already knows about.

## Learning Remotion itself

For the programming model (compositions, sequences, props), use the official Remotion documentation. Zenvi docs stay focused on **how we pull the result into the app**, not how to author every composition.

[Remotion documentation](https://www.remotion.dev/docs)

> **Tip:** If fetch fails, confirm the Remotion server is up and that your backend URL matches the environment the desktop app uses.
