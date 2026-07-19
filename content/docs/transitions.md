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

## AI generated transition (Kling O1 Pro frame morph)

For a **generated bridge** between clip A and clip B, Zenvi uses **Kling O1 Pro frame morph**: the **last frame of clip A** and the **first frame of clip B** are sent to Runware, which generates a 5-second video that evolves smoothly between them. The result is inserted on the timeline between the clips.

```text
Organic morph, keep lighting consistent with clip A.
```

Generation can take time and may need a retry if the provider is busy.

> **Tip:** Pick clips that actually touch or sit close on the timeline so the insert position is obvious. If the tool errors, reselect clips and try a shorter hint.
