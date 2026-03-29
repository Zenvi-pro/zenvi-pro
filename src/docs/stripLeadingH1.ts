/** Remove first markdown H1 line so the layout can own the page title. */
export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#\s+[^\n]+\n*/, "");
}
