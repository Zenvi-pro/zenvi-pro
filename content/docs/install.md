# Install and setup

## Installers

The easiest path is the **Download** page on this site. It pulls the latest release from our public repo so you always get a build we have tagged.

[Go to Download](/download)

You can also open [GitHub releases](https://github.com/Zenvi-pro/zenvi-core/releases) directly and pick the asset for your OS.

## First launch

After install, open Zenvi like any desktop app. If you use features that talk to our backend (auth, some cloud linked flows), you may need to sign in through the browser flow the app opens for you. Local editing does not require uploading your project video to us.

## Advanced: run from source

If you are developing or packaging yourself, the **zenvi-core** README lists dependencies: Python, PyQt5, FFmpeg, and optionally Manim related libraries for educational animation features. Building **libopenshot** is part of a full source setup.

```bash
# Example: see zenvi-core README for exact steps on your distro
cd zenvi-core
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

For Manim optional extras:

```bash
pip install -r requirements-manim.txt
```

> **Tip:** On Linux, Manim often needs system packages such as Cairo and Pango dev headers. If Manim fails to import, check [Troubleshooting](/docs/troubleshooting).

## Environment variables (self hosting backend)

If you point the app at your own **zenvi-backend**, set the backend URL in your environment or project config as documented in **zenvi-core** `.env.example` (`ZENVI_BACKEND_URL`). Remotion related URLs are only needed if you use those integrations.
