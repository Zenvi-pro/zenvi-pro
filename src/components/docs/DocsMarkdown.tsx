import { forwardRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Link } from "react-router-dom";
import { DocsCallout } from "./DocsCallout";
import { DocsCodeBlock } from "./DocsCodeBlock";
import { cn } from "@/lib/utils";

export type DocsMarkdownProps = {
  content: string;
  className?: string;
};

export const DocsMarkdown = forwardRef<HTMLElement, DocsMarkdownProps>(function DocsMarkdown(
  { content, className },
  ref,
) {
  const components = useMemo(
    () => ({
      a: ({
        href,
        children,
        ...props
      }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => {
        if (href?.startsWith("/")) {
          return (
            <Link to={href} className="text-primary underline-offset-4 hover:underline font-medium" {...props}>
              {children}
            </Link>
          );
        }
        if (href?.startsWith("http")) {
          return (
            <a
              href={href}
              className="text-primary underline-offset-4 hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          );
        }
        return (
          <a href={href} className="text-primary underline-offset-4 hover:underline" {...props}>
            {children}
          </a>
        );
      },
      h1: ({ className: c, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1
          className={cn("font-bold tracking-tight text-3xl text-white mb-6 mt-2", c)}
          {...props}
        />
      ),
      h2: ({ className: c, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2
          className={cn(
            "scroll-mt-28 font-semibold text-xl text-white mt-12 mb-4 pb-2 border-b border-white/[0.08]",
            c,
          )}
          {...props}
        />
      ),
      h3: ({ className: c, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3 className={cn("scroll-mt-28 font-semibold text-lg text-white mt-8 mb-3", c)} {...props} />
      ),
      h4: ({ className: c, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h4 className={cn("font-semibold text-base text-white mt-6 mb-2", c)} {...props} />
      ),
      p: ({ className: c, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p className={cn("text-white/80 leading-relaxed my-4", c)} {...props} />
      ),
      ul: ({ className: c, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
        <ul className={cn("my-4 list-disc pl-6 text-white/80 space-y-2", c)} {...props} />
      ),
      ol: ({ className: c, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
        <ol className={cn("my-4 list-decimal pl-6 text-white/80 space-y-2", c)} {...props} />
      ),
      li: ({ className: c, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
        <li className={cn("leading-relaxed", c)} {...props} />
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => <DocsCallout>{children}</DocsCallout>,
      hr: () => <hr className="my-10 border-white/[0.08]" />,
      table: ({ children }: { children?: React.ReactNode }) => (
        <div className="my-6 overflow-x-auto rounded-lg border border-white/[0.08]">
          <table className="w-full text-sm text-left text-white/85">{children}</table>
        </div>
      ),
      thead: ({ children }: { children?: React.ReactNode }) => (
        <thead className="bg-white/[0.05] text-white text-xs uppercase tracking-wide">{children}</thead>
      ),
      th: ({ children }: { children?: React.ReactNode }) => (
        <th className="px-4 py-3 font-semibold border-b border-white/[0.08]">{children}</th>
      ),
      td: ({ children }: { children?: React.ReactNode }) => (
        <td className="px-4 py-3 border-b border-white/[0.06] text-white/75">{children}</td>
      ),
      tr: ({ children }: { children?: React.ReactNode }) => (
        <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>
      ),
      code: ({
        inline,
        className,
        children,
        ...props
      }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) => {
        const match = /language-(\w+)/.exec(className || "");
        const code = String(children).replace(/\n$/, "");
        if (inline) {
          return (
            <code
              className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.8125rem] text-primary-foreground"
              {...props}
            >
              {children}
            </code>
          );
        }
        return <DocsCodeBlock code={code} language={match?.[1] || "plaintext"} />;
      },
      pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    }),
    [],
  );

  return (
    <article ref={ref} className={cn("docs-prose max-w-[42rem]", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
});
