export type DocsNavItem = {
  slug: string;
  title: string;
};

export type DocsNavGroup = {
  label: string;
  items: DocsNavItem[];
};

/** Order and labels for the docs sidebar. Slugs must match `content/docs/*.md` filenames (without .md). */
export const docsNavGroups: DocsNavGroup[] = [
  {
    label: "Start here",
    items: [
      { slug: "start-here", title: "Welcome" },
      { slug: "install", title: "Install and setup" },
      { slug: "account-and-sign-out", title: "Account and sign out" },
    ],
  },
  {
    label: "Assistant",
    items: [
      { slug: "assistant-and-models", title: "Models and API keys" },
      { slug: "how-to-prompt", title: "How to prompt" },
    ],
  },
  {
    label: "Editing",
    items: [
      { slug: "clips-and-timeline", title: "Clips and timeline" },
      { slug: "transitions", title: "Transitions" },
      { slug: "scene-search", title: "Scene search and smart cuts" },
      { slug: "video-generation", title: "Video generation" },
      { slug: "tts", title: "Text to speech" },
      { slug: "export", title: "Export" },
    ],
  },
  {
    label: "Advanced",
    items: [
      { slug: "remotion", title: "Remotion" },
      { slug: "manim", title: "Manim" },
      { slug: "director-analysis", title: "Director analysis" },
    ],
  },
  {
    label: "More",
    items: [
      { slug: "troubleshooting", title: "Troubleshooting" },
      { slug: "open-source", title: "Open source" },
    ],
  },
];

export const docsNavFlat: DocsNavItem[] = docsNavGroups.flatMap((g) => g.items);

export function getDocTitle(slug: string): string | undefined {
  return docsNavFlat.find((i) => i.slug === slug)?.title;
}
