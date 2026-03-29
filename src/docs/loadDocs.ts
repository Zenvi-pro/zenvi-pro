const rawModules = import.meta.glob("../../content/docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function pathToSlug(key: string): string {
  const name = key.split("/").pop() || key;
  return name.replace(/\.md$/i, "");
}

export const docSources: Record<string, string> = Object.fromEntries(
  Object.entries(rawModules).map(([path, body]) => [pathToSlug(path), body]),
);

export function getDocBody(slug: string): string | undefined {
  return docSources[slug];
}

export function getAllSlugs(): string[] {
  return Object.keys(docSources);
}
