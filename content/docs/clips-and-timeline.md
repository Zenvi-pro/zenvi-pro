# Clips and timeline

## Project basics

The assistant can **open**, **save**, and **create** projects, **list files** in the project, **list clips** on the timeline, **list layers** and **markers**, and report **project metadata**. Ask in plain language:

```text
List all clips on the timeline with their positions.
```

## Import

Use **import files** style requests. The app resolves paths through its file tooling.

```text
Import the MP4 from my Desktop into the project.
```

## Split at playhead vs new clip from file

**Split at playhead** cuts the timeline clip where the playhead sits. **New clip from file** selects a range on a source file and can then be added to the timeline. See [How to prompt](/docs/how-to-prompt) for disambiguation phrases.

## Tracks and markers

```text
Add a marker at the playhead called "hero line".
```

```text
Add another video track above the current one.
```

## Playback and navigation

```text
Play from here.
```

```text
Go to the start of the timeline.
```

Undo and redo are available as tools when you need to walk back a change.

## Remove clips

Name the clip or say “remove the selected clip” if selection is clear:

```text
Remove the clip I have selected.
```

> **Tip:** If the assistant lists clip IDs internally, you usually do not need to copy them. Describe clips by position or content and confirm before destructive deletes.
