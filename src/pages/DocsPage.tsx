import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { DocsTOC, type TocHeading } from "@/components/docs/DocsTOC";
import { getDocBody } from "@/docs/loadDocs";
import { getDocTitle } from "@/docs/docs-nav";
import { stripLeadingH1 } from "@/docs/stripLeadingH1";

function DocsArticleNotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-white">Page not found</h1>
      <p className="mt-3 text-white/60 leading-relaxed">
        That doc does not exist or was moved. Pick a topic from the sidebar or start from the docs home.
      </p>
      <Link
        to="/docs"
        className="mt-6 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Back to documentation home
      </Link>
    </div>
  );
}

export default function DocsPage() {
  const { slug } = useParams<{ slug: string }>();
  const raw = slug ? getDocBody(slug) : undefined;
  const title = slug ? getDocTitle(slug) : undefined;
  const content = raw ? stripLeadingH1(raw) : "";
  const valid = Boolean(slug && raw && title);

  const articleRef = useRef<HTMLElement>(null);
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!valid) {
      setHeadings([]);
      return;
    }
    const el = articleRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      const nodes = el.querySelectorAll("h2[id], h3[id]");
      setHeadings(
        [...nodes].map((node) => ({
          id: node.id,
          text: node.textContent?.trim() ?? "",
          level: node.tagName === "H3" ? 3 : 2,
        })),
      );
    });
    return () => cancelAnimationFrame(id);
  }, [slug, content, valid]);

  useEffect(() => {
    const article = articleRef.current;
    if (!article || !valid || headings.length === 0) return;

    const elements = headings
      .map((h) => {
        try {
          return article.querySelector(`#${CSS.escape(h.id)}`);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Element[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -72% 0px", threshold: [0, 0.25, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings, slug, valid]);

  if (!valid) {
    return <DocsArticleNotFound />;
  }

  return (
    <div className="flex w-full gap-10 xl:gap-14">
      <div className="min-w-0 flex-1">
        <nav className="mb-8 flex flex-wrap items-center gap-1.5 text-sm text-white/45" aria-label="Breadcrumb">
          <Link
            to="/docs"
            className="transition-colors hover:text-white focus-visible:outline-none focus-visible:text-primary"
          >
            Docs
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/25" aria-hidden />
          <span className="text-white/80 font-medium">{title}</span>
        </nav>

        <header className="mb-10 border-b border-white/[0.06] pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        </header>

        <DocsMarkdown ref={articleRef} content={content} />
      </div>
      <DocsTOC headings={headings} activeId={activeId} />
    </div>
  );
}
