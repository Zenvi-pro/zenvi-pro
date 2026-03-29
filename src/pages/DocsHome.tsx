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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const bentoItems = docsNavGroups.flatMap((g) =>
  g.items.map((item) => ({
    ...item,
    group: g.label,
    Icon: iconForSlug[item.slug] ?? BookOpen,
  })),
);

export default function DocsHome() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="max-w-4xl">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.07] to-transparent px-6 py-10 sm:px-10 sm:py-12"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Documentation</p>
        <h1 className="mt-3 max-w-xl font-bold tracking-tight text-white text-3xl sm:text-4xl">
          Learn Zenvi without the guesswork
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/65">
          We are a tiny team. These guides are written to match how the app actually behaves, from the timeline to
          the assistant and the rough edges we are still smoothing out.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            asChild
            className="rounded-full bg-white px-6 text-black hover:bg-white/90"
          >
            <Link to="/docs/start-here">
              Start reading
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-white/[0.12] bg-transparent text-white hover:bg-white/[0.06]"
          >
            <Link to="/download">Download Zenvi</Link>
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduceMotion ? 0 : 0.12, duration: 0.4 }}
        className="mt-12"
      >
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/40">Browse topics</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {bentoItems.map((item, i) => (
            <motion.li
              key={item.slug}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reduceMotion ? 0 : 0.06 + i * 0.03,
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Link
                to={`/docs/${item.slug}`}
                className={cn(
                  "group flex gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all",
                  "hover:border-white/[0.14] hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-primary transition-colors group-hover:bg-primary/15">
                  <item.Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-white/35">
                    {item.group}
                  </span>
                  <span className="mt-0.5 block font-medium text-white group-hover:text-white">{item.title}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60 mt-1" />
              </Link>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      <p className="mt-12 text-center text-sm text-white/40">
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
