# Models and API keys

The assistant sends your messages to a **language model** you choose in the UI, then runs **tools** inside Zenvi (timeline actions, import, generation, and so on). You supply API keys in **Preferences** for the providers you use. Keys stay on your machine in the way the app stores settings.

## Models you may see

These IDs match what the app registers today. Labels in the UI may shorten them.

| Model id | When it shines |
| --- | --- |
| `openai/gpt-4o-mini` | Fast, cheap enough for everyday edits, short plans, simple tool chains. Good default for “trim this” or “add a marker”. |
| `openai/gpt-4o` | Stronger reasoning and instruction following when mini drifts or misses nuance. |
| `anthropic/claude-sonnet-4-6` | Large context and steady planning for messy timelines, long chats, or multi step edits. |
| `anthropic/claude-haiku-4-5` | Quick Anthropic option when you want speed over depth. |
| `ollama/llama3.2` / `ollama/llama3.1` | Local models if Ollama is running and configured. Great for privacy experiments; quality varies by model size. |

The backend may also suggest a **default model** when you use cloud routed chat. A common default is **gpt-4o-mini** for light work.

> **Tip:** For a ten second tweak, use mini or Haiku. For “restructure my whole act three and fix pacing”, use **Sonnet 4.6** if you have Anthropic set up.

## API keys

Add keys in **Preferences** under the AI section for **OpenAI**, **Anthropic**, and any other provider we expose. Without a key for the selected model, sends will fail with a clear error.

## Context and honesty

The assistant only “knows” what the tools return and what you type. If the timeline changed while it was thinking, ask it to **list clips** or **get project info** again before a big operation.
