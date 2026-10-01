# Zenvi command line

`zenvi` edits Zenvi projects from a terminal. It works on the same `.zvn`
files as the desktop app and the web editor, renders with FFmpeg, and is how
coding agents like Claude Code, Codex and Cursor edit video with Zenvi.

## Install

You need **Node.js 22 or newer** and **FFmpeg**:

- macOS: `brew install node ffmpeg`
- Windows: `winget install OpenJS.NodeJS FFmpeg`
- Linux: install `nodejs` (22+) and `ffmpeg` from your distribution

If you use Claude Code, installing the Zenvi plugin also installs `zenvi`
(see [Use Zenvi from Claude and ChatGPT](/docs/ai-assistants)). Run
`zenvi doctor` to check that everything is in place.

## A first edit

```bash
zenvi new trip.zvn --profile "HD 1080p 30 fps"
zenvi add ~/Movies/trip/beach.mp4             # imports the file and places it
zenvi add ~/Movies/trip/sunset.mp4            # goes after the last clip
zenvi title "Lisbon, 2026" --at 0 --duration 4
zenvi split --at 6                            # cut everything under 6 s
zenvi clips                                   # list clips and their ids
zenvi fade <clip-id> --out 2                  # fade one clip out
zenvi transition <clip-id> --name fade        # fade into the next clip
zenvi frame 2.5 preview.png                   # look at one frame
zenvi render trip.mp4
```

Every edit is saved into the project together with its undo history, so
`zenvi undo` works across commands and the desktop app can undo them too.

Add `--json` to any command to get machine-readable results (this is what
agents use).

## Open the result

- `zenvi open` shows the project in the Zenvi desktop app.
- `zenvi open --web` uploads it to Zenvi Cloud and opens it in the
  [web editor](/docs/web-editor).

## Sign in

`zenvi login` opens zenvi.pro in your browser, the same way the desktop app
signs in. Signing in enables Zenvi Cloud (`zenvi push`, `zenvi pull`,
`zenvi cloud ls`) and the AI tools that run on Zenvi's servers, such as media
search and video generation. For a computer without a browser, use
`zenvi login --device` and approve the code from any other device.

## Use it from coding agents

```bash
zenvi mcp-config claude-code --install
zenvi mcp-config codex --install
zenvi mcp-config cursor --install
```

`zenvi mcp` runs the same editing tools as a local MCP server. When the
desktop app has the same project open, edits go to the app instead of the file.
