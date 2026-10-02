# Zenvi in your browser

Open **[zenvi.pro/editor](/editor/)** to edit in any modern desktop browser. There is
nothing to install, and you do not need an account to start.

The web editor is the same Zenvi you know from the desktop app: tracks, clips,
trims and splits, keyframes, effects, transitions, titles, the properties panel
and export. Projects use the same `.zvn` format, so a project can move between the
desktop app, the browser and the `zenvi` command line.

## Your media stays on your computer

When you are signed out, everything happens inside the browser:

- Imported files are stored in your browser's private storage for this site.
  They are not uploaded anywhere.
- Projects autosave locally. You can reopen them from the **Projects** screen.
- Export renders in the browser and downloads the finished file.

Clearing this site's data in your browser removes those local projects and media.

## Signing in adds the cloud and the Assistant

Sign in with your Zenvi account (the same one you use for the desktop app) to:

- **Save to Zenvi Cloud.** Open the same project on another computer, in the
  desktop app, or from the command line. Media is uploaded once and reused.
- **Use the Zenvi Assistant.** Ask for edits in plain language. It works on the
  timeline in front of you, and every change it makes is a normal undo step.
  Assistant turns use your credits, like on the desktop.
- **Render in Zenvi Cloud** when a project is too long to export comfortably in
  the browser.

## Open a desktop project in the browser

In the desktop app, choose **File → Zenvi Cloud → Open in Web Editor**. Zenvi uploads
any media the cloud does not have yet and opens the project here.

To go the other way, use **File → Zenvi Cloud → Open from Zenvi Cloud…** on the
desktop.

You can also open a `.zvn` file directly from the **Projects** screen. The browser
cannot read the file paths inside a desktop project, so Zenvi asks you to point it
at the media files once ("relink").

## Browser support

Use a current version of Chrome, Edge, Firefox or Safari on a desktop or laptop.
Zenvi decodes and encodes video with the browser's built-in WebCodecs; if your
browser lacks it, the editor tells you when it opens. On phones you can browse your projects and watch
previews; editing needs a larger screen.

## Keyboard shortcuts

The web editor uses the desktop shortcuts: **Space** or **K** to play and pause,
**J** / **L** to shuttle, **←** / **→** to step one frame, **C** for the razor, **S**
to toggle snapping, **M** to add a marker, **Ctrl/⌘ + K** to slice at the playhead,
**Delete** to remove, **Shift + Delete** for ripple delete, **=** / **-** to zoom, and
**Ctrl/⌘ + Z** to undo.
