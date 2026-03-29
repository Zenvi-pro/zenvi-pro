# How to prompt

The assistant is steered by a system policy that prefers **clear outcomes** and **safe disambiguation**. You win when you sound like a director talking to an editor, not like an API manual.

## Clip on the timeline vs new clip from a file

If you say “clip this” without context, the model may need to choose between:

1. **Split the selected clip at the playhead** (two clips on the timeline).
2. **Create a new clip from a source file** with a time range.

Say explicitly what you want:

```text
Split the clip on the timeline at the playhead.
```

```text
From my interview file, make a new clip from 1:20 to 2:05 and add it at the playhead.
```

## After creating a clip from a file

The app flow often creates a clip first, then asks if you want it on the timeline. You can answer in natural language:

```text
Yes, add it at the playhead.
```

## Generate video

Describe the shot, mood, and length hints. You do not need to name internal tools.

```text
Generate a 5 second B-roll of morning light through blinds, soft and slow, and place it after the current clip.
```

## Transitions

For **built in** transitions, name the style or say “crossfade between these two clips”. For **AI generated bridges** between two clips, use the **transition clips** control in chat to pick clip A and clip B, then describe the morph:

```text
Smooth morph, keep skin tones natural, no flashy effects.
```

> **Tip:** Attach **@clip** context when you mean “this exact clip” so the model does not guess wrong.

## Director style review

Ask for analysis in plain language:

```text
How is the pacing in the second half? Any jarring transition spots?
```

The read only **director** tools answer from project state without mutating the timeline until you ask for edits.
