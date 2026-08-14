# Video generation

Zenvi uses **Kling O1 Pro** via Runware for all AI video generation.

## Generate and add to timeline

Ask for a new generated video from a **text prompt** and have it land on the timeline at the **playhead** (or a time or track you specify).

```text
Generate a short clip of rain on a window at night, moody, loop friendly, and add it at the playhead.
```

Duration is **5 or 10 seconds** (Kling O1 Pro). Resolution follows your project aspect ratio (landscape, portrait, or square).

## Object replace in a clip

Select a clip and describe what should change. The app sends the clip segment (up to 10 seconds) to Kling O1 Pro for **video-edit** generation while preserving camera motion and lighting.

```text
Replace the mug on the desk with a branded bottle, keep the hand motion natural.
```

The result is added to imported clips — drag it onto the timeline to replace the original.

> **Tip:** If generation fails once, shorten the prompt, remove conflicting adjectives, or try again after a few minutes when the service is less loaded.
