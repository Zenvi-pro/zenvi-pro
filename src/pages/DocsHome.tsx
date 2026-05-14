import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Sparkles,
  Scissors,
  Film,
  Cpu,
  LifeBuoy,
  ArrowRight,
  Github,
  ArrowUpRight,
} from "lucide-react";
import { docsNavGroups } from "@/docs/docs-nav";
import { cn } from "@/lib/utils";

const iconForSlug: Record<string, typeof BookOpen> = {
  "start-here": BookOpen,
  install: Cpu,
  "assistant-and-models": Sparkles,
  "how-to-prompt": Sparkles,
  "clips-and-timeline": Scissors,
  transitions: Film,
  "video-generation": Film,
  remotion: Film,
  manim: Film,
  troubleshooting: LifeBuoy,
  "open-source": Github,
};

export default function DocsHome() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="max-w-4xl">
      {/* ───────── Hero ───────── */}
      <motion.section
        aria-labelledby="docs-home-heading"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_2px_rgba(50,117,248,0.6)]" aria-hidden />
          Documentation
        </p>

        <h1
          id="docs-home-heading"
          className="mt-5 max-w-2xl text-balance font-serif text-[40px] font-normal leading-[1.04] tracking-[-0.015em] text-white md:text-[52px]"
        >
          Learn Zenvi <em className="italic text-white/95">without the guesswork.</em>
        </h1>

        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/55 md:text-base">
          We&apos;re a tiny team. These guides match how the app actually behaves —
          from the timeline to the assistant to the rough edges we&apos;re still smoothing out.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            to="/docs/start-here"
            className="group inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-black shadow-[0_10px_30px_-12px_rgba(255,255,255,0.45)] transition-all duration-300 hover:shadow-[0_14px_40px_-12px_rgba(50,117,248,0.55)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
          >
            Start reading
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="/login?mode=signup"
            className="group inline-flex h-10 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.03] px-5 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Try Zenvi
            <ArrowUpRight className="h-3.5 w-3.5 text-white/55 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
      </motion.section>

      {/* ───────── Hairline divider ───────── */}
      <div className="my-14 h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" aria-hidden />

      {/* ───────── Topic groups (organized by section) ───────── */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduceMotion ? 0 : 0.1, duration: 0.45 }}
        aria-labelledby="docs-browse-heading"
        className="space-y-12"
      >
        <div className="flex items-end justify-between gap-4">
          <h2
            id="docs-browse-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40"
          >
            Browse topics
          </h2>
          <span className="text-[11px] text-white/30">
            {docsNavGroups.reduce((n, g) => n + g.items.length, 0)} guides
          </span>
        </div>

        {docsNavGroups.map((group, gi) => (
          <motion.div
            key={group.label}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduceMotion ? 0 : 0.12 + gi * 0.05,
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="mb-4 flex items-baseline gap-3">
              <h3 className="font-serif text-[22px] leading-tight tracking-tight text-white md:text-[24px]">
                {group.label}
              </h3>
              <span className="text-[11px] tabular-nums text-white/30">
                {String(group.items.length).padStart(2, "0")}
              </span>
            </div>

            <ul className="grid gap-2.5 sm:grid-cols-2">
              {group.items.map((item) => {
                const Icon = iconForSlug[item.slug] ?? BookOpen;
                return (
                  <li key={item.slug}>
                    <Link
                      to={`/docs/${item.slug}`}
                      className={cn(
                        "group relative flex items-center gap-3.5 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.015] px-4 py-3.5 transition-all duration-300",
                        "hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.045]",
                        "focus-visible:outline-none focus-visible:border-primary focus-visible:bg-white/[0.05]",
                      )}
                    >
                      {/* Hover glow */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-primary/0 blur-2xl transition-all duration-500 group-hover:bg-primary/25"
                      />
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-primary transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-white">
                          {item.title}
                        </span>
                      </span>
                      <ArrowRight
                        className="relative h-3.5 w-3.5 shrink-0 text-white/25 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ))}
      </motion.section>

      {/* ───────── Footer note ───────── */}
      <p className="mt-16 border-t border-white/[0.06] pt-8 text-center text-[13px] text-white/40">
        Something missing? Open an issue on{" "}
        <a
          href="https://github.com/Zenvi-pro/zenvi-core"
          className="text-primary underline-offset-4 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        .
      </p>
    </div>
  );
}
