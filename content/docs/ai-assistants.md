# Use Zenvi from Claude and ChatGPT

Zenvi can be driven by the AI assistant you already use. Ask for an edit in
plain language; the assistant uses Zenvi's editing tools, the same ones the
Zenvi Assistant uses inside the app, and every change is an ordinary undo step.

There are two ways to connect, depending on where your media is:

| Your media is… | Use | Works with |
| --- | --- | --- |
| on your computer | the **Zenvi plugin** (runs locally) | Claude Code, Claude Desktop, Codex, Cursor |
| in Zenvi Cloud | the **Zenvi connector** (remote) | ChatGPT, Claude.ai, Claude Desktop, Claude mobile, Claude Code |

## Claude Code

Install the plugin from inside Claude Code:

```text
/plugin marketplace add Zenvi-pro/zenvi-web
/plugin install zenvi@zenvi
```

You need Node.js 22 or newer and FFmpeg on your computer. Then try:

> Make a 30-second vertical teaser from the clips in ~/Movies/trip, add the
> title "Lisbon", fade the music out at the end, and render it.

Claude looks at frames from the timeline to check its work, renders the video
with FFmpeg, and can open the result in the Zenvi desktop app (`/zenvi:open-in-zenvi`)
or upload it to Zenvi Cloud and give you a web editor link (`/zenvi:share`).

When the Zenvi desktop app already has the same project open, Claude's edits go
straight into the app, so you can watch them land on the timeline.

## ChatGPT

Custom connectors need ChatGPT's developer mode (Plus, Pro, Business,
Enterprise or Edu, on the web).

1. In ChatGPT, open **Settings → Security and login** and turn on **Developer mode**
   (on some plans it sits under **Settings → Apps → Advanced settings**).
2. Go to **chatgpt.com/plugins**, press **+**, and add a remote MCP server named
   **Zenvi** with this URL:

   ```text
   https://zenvi-cloud.whitesky-da3c8402.eastus.azurecontainerapps.io/mcp
   ```

   Choose **OAuth** and leave the client ID and secret empty.
3. ChatGPT sends you to zenvi.pro. Sign in with your Zenvi account and choose **Allow**.
4. In a chat, turn on Zenvi from the tools menu and ask, for example,
   "List my Zenvi projects" or "Make a 15-second square cut of my Launch project and render it."

You can attach a video, image or audio file to the chat and ask Zenvi to use it.
Renders run in Zenvi Cloud; ChatGPT checks on them and gives you a download link.

## Claude.ai and Claude Desktop

1. On claude.ai, open **Customize → Connectors → Add custom connector**.
2. Name it **Zenvi** and paste the same URL as above. Leave the OAuth fields empty.
3. Choose **Connect**, sign in to zenvi.pro and choose **Allow**.

The connector then works in Claude Desktop and on mobile too. Claude can see
preview frames directly while it edits.

## Codex, Cursor and other agents

The Zenvi command line can register itself with these tools:

```bash
zenvi mcp-config codex --install
zenvi mcp-config cursor --install
zenvi mcp-config claude-desktop --install
```

See [Zenvi command line](/docs/zenvi-cli) for installing `zenvi`.

## What a connection can access

A connector can only see and change your own Zenvi Cloud projects, media and
renders. The local plugin only works on the projects and folders you point it at
on your own computer. You can disconnect a connector at any time from the app
that added it (ChatGPT or Claude settings).
