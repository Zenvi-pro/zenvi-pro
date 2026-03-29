# Troubleshooting

## Assistant says the model failed

Check **Preferences** for the provider you selected (**OpenAI**, **Anthropic**, **Ollama**). Confirm the key is present and billing is healthy. Try a smaller model (for example **gpt-4o-mini**) to rule out quota spikes.

## Backend or network errors

If features need **zenvi-backend**, verify it is running and that **ZENVI_BACKEND_URL** in your environment matches. Firewall and VPN rules sometimes block local ports.

## Remotion fetch failed

Confirm **REMOTION_*** URLs in `.env` and that the render service completed. Retry once the asset exists in the bucket your backend expects.

## Manim or Cairo errors

On Linux, install **libcairo2-dev**, **libpango1.0-dev**, **pkg-config**, then reinstall **requirements-manim.txt**. See [Manim](/docs/manim).

## FFmpeg or media import issues

Ensure **FFmpeg** is installed and visible on `PATH` for source builds. Corrupt or exotic codecs may need a rewrap through FFmpeg outside Zenvi first.

## OAuth or sign in loops

Sign out everywhere (site and app), clear site data for the auth domain if your browser stuck an old cookie, then sign in again.

> **Tip:** Note the **exact error string** from chat or the status bar. It saves time when you file feedback or search the issue list on GitHub.
