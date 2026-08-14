# Models

The assistant sends your messages to a **language model** you choose in the UI, then runs **tools** inside Zenvi (timeline actions, import, generation, and so on).

## Choosing a model

Click the model pill at the bottom of the assistant panel. The menu opens on a short list of the current flagship models, one or two per provider, each tagged with a rough speed/depth hint. **Start typing to search the full catalog** — every model the providers offer, grouped by provider. Searching is how you reach anything outside the featured list.

Providers available today:

| Provider | Notable models | When it shines |
| --- | --- | --- |
| **Anthropic** | Claude Opus 5, Sonnet 5, Fable 5, Haiku 4.5 | Large context and steady planning for messy timelines, long chats, or multi‑step edits. Haiku when you want speed over depth. |
| **OpenAI** | GPT‑5.6 (Sol / Terra / Luna), GPT‑5.4, GPT‑4o, o3 | Strong reasoning and instruction following. The mini and nano variants are the cheap everyday options. |
| **xAI** | Grok 4.5, Grok 4.3 | Fast frontier reasoning, good on long tool chains. |
| **Google** | Gemini 3.6 Flash, Gemini 3.1 Pro | Flash tiers are quick and inexpensive; the Pro tiers need paid Gemini quota. |
| **Ollama** | Llama 3.2 / 3.1 | Runs locally if Ollama is installed and configured. Free, private, and quality varies by model size. |

The backend also picks a **default model** for cloud‑routed chat — commonly a light OpenAI model for everyday work.

> **Tip:** For a ten‑second tweak, use a Flash, mini, or Haiku tier. For “restructure my whole act three and fix pacing”, reach for Claude Opus 5 or GPT‑5.6.

## API keys

**You don't need to add API keys.** Zenvi's backend holds the provider credentials, so the models above work as soon as you're signed in — usage is drawn from your plan's credits (local Ollama models are free). The AI section of **Preferences** only configures the backend URL and video‑generation defaults.

If a model is greyed out or a send fails, that provider isn't configured on the backend rather than on your machine.

## Context and honesty

The assistant only “knows” what the tools return and what you type. If the timeline changed while it was thinking, ask it to **list clips** or **get project info** again before a big operation.
