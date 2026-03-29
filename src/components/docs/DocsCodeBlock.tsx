import { useState, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type DocsCodeBlockProps = {
  code: string;
  language: string;
  className?: string;
};

export function DocsCodeBlock({ code, language, className }: DocsCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lang = language === "text" || !language ? "plaintext" : language;

  return (
    <div
      className={cn(
        "group relative my-6 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d1117] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]",
        className,
      )}
    >
      <div className="flex h-9 items-center gap-2 border-b border-white/[0.06] bg-black/40 px-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/90" />
        </span>
        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-white/35">
          {lang}
        </span>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "ml-auto inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-white/50 transition-colors",
            "hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={lang === "plaintext" ? "text" : lang}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: "1rem 1.125rem",
            background: "transparent",
            fontSize: "0.8125rem",
            lineHeight: 1.65,
          }}
          codeTagProps={{
            className: "font-mono",
          }}
          PreTag="div"
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
