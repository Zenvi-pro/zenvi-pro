# Video generation

## Generate and add to timeline

You can ask for a new generated video from a **text prompt** and have it land on the timeline at the **playhead** (or a time or track you specify).

```text
Generate a short clip of rain on a window at night, moody, loop friendly, and add it at the playhead.
```

Providers and quotas depend on your plan and keys. Long or high resolution requests take longer.

## Kling V2V insert into selected clip

For **video to video** style edits on a **selected clip**, the assistant can call tooling that sends reference frames or segments to the provider and merges a result back into the timeline. Describe what should change, not the SDK name.

```text
Replace the mug on the desk with a branded bottle, keep the hand motion natural.
```

## Object replace

Similar phrasing works for **replace object** style jobs: be specific about what stays and what changes.

> **Tip:** If generation fails once, shorten the prompt, remove conflicting adjectives, or try again after a few minutes when the service is less loaded.
