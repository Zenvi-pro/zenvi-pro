# Transitions

## Built in transition library

Zenvi includes a **transition library** like a classic NLE. The assistant can **list** transitions, **search** by name or vibe, and **add** a transition **between two clips** or **on a clip** edge.

Examples:

```text
Search transitions with "dissolve" in the name.
```

```text
Add a crossfade between the clip on track 1 at 10s and the next clip.
```

Tune the exact wording to how your timeline is arranged. If unsure, ask the assistant to **list clips** first.

## AI generated transition (morph between two clips)

For a **generated bridge** between clip A and clip B, the app uses a video pipeline (for example **Kling V2V** style generation) that samples the end of A and the start of B, then inserts the result between them. In chat, use the **transition clips** flow: pick **clip A**, then **clip B**, then describe the motion.

```text
Organic morph, keep lighting consistent with clip A.
```

Generation can take time and may need a retry if the provider is busy.

> **Tip:** Pick clips that actually touch or sit close on the timeline so the insert position is obvious. If the tool errors, reselect clips and try a shorter hint.
