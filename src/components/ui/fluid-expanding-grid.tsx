"use client";

import React, { useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ProviderModel {
  name: string;
  desc: string;
}

export interface ProviderItem {
  id: string;
  company: string;
  bg: string;
  models: ProviderModel[];
}

interface FluidExpandingGridProps {
  items: ProviderItem[];
  className?: string;
  id?: string;
}

/**
 * Horizontal "one big + two small" pod.
 *
 * Desktop layout (sm+):
 *   ┌────────────┬────────┐
 *   │            │ small1 │
 *   │    BIG     ├────────┤
 *   │            │ small2 │
 *   └────────────┴────────┘
 *
 * Mobile: cards stack vertically (big first, smalls after).
 * Click any small card to promote it to the big slot — the previous big
 * card animates back into the small column. Same magic as before, just
 * rotated 90° so the pod is wide-not-tall.
 */
export function FluidExpandingGrid({
  items,
  className,
  id = "fluid-gallery",
}: FluidExpandingGridProps) {
  // Start with the last item promoted (matches old visual — biggest card lands at the visual anchor).
  const [bigId, setBigId] = useState(() => items[items.length - 1]?.id ?? "");
  const smallIds = items.map((i) => i.id).filter((iid) => iid !== bigId);

  const handleExpand = (itemId: string) => {
    if (itemId === bigId) return;
    setBigId(itemId);
  };

  return (
    <div className={cn("w-full not-prose", className)}>
      <LayoutGroup id={id}>
        <motion.div
          layout
          className={cn(
            "grid w-full gap-4",
            // Mobile: single column, named areas stacked top-to-bottom.
            "grid-cols-1 [grid-template-areas:'big'_'small1'_'small2']",
            // Desktop: big card on the left spanning both rows, two smalls stacked on the right.
            "sm:h-[360px] sm:grid-cols-[1.55fr_1fr] sm:grid-rows-2 sm:gap-5",
            "sm:[grid-template-areas:'big_small1'_'big_small2']"
          )}
        >
          {items.map((item) => {
            const isBig = item.id === bigId;
            const smallIndex = smallIds.indexOf(item.id);
            const area = isBig ? "big" : smallIndex === 0 ? "small1" : "small2";

            return (
              <motion.div
                key={item.id}
                layoutId={`${id}-${item.id}`}
                onClick={() => handleExpand(item.id)}
                style={{ gridArea: area }}
                className={cn(
                  "relative cursor-pointer group w-full h-full overflow-hidden rounded-[24px] bg-[#050505] border border-white/10 transition-colors",
                  // Mobile fallback heights so the cards are still tappable when there's no fixed pod height.
                  "min-h-[120px] sm:min-h-0",
                  isBig
                    ? "z-30 shadow-2xl shadow-black/50"
                    : "z-10 hover:border-white/20"
                )}
                transition={{
                  layout: {
                    type: "spring",
                    stiffness: 130,
                    damping: 24,
                  },
                }}
              >
                {/* Background gradient + mask */}
                <motion.div
                  layoutId={`${id}-${item.id}-mask-wrapper`}
                  className="absolute inset-0 overflow-hidden bg-zinc-900"
                  style={{ borderRadius: 24 }}
                >
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br to-black opacity-50 transition-all duration-1000",
                      item.bg,
                      isBig ? "scale-105 opacity-80" : "scale-100"
                    )}
                  />
                  <motion.div
                    layoutId={`${id}-${item.id}-mask`}
                    className={cn(
                      "absolute inset-0 transition-colors duration-700 pointer-events-none",
                      isBig ? "bg-black/0" : "bg-black/20"
                    )}
                  />

                  {/* Faint play-button watermark on the big card — keeps the original cinematic accent. */}
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none",
                      isBig ? "opacity-25" : "opacity-0 group-hover:opacity-10"
                    )}
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-white flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[10px] border-l-white border-b-[7px] border-b-transparent ml-0.5" />
                    </div>
                  </div>
                </motion.div>

                {/* Content */}
                <motion.div
                  layout="position"
                  className="absolute inset-0 z-10 flex select-none flex-col justify-end p-5 text-white pointer-events-none sm:p-6"
                >
                  <motion.div layout="position" className="mb-auto">
                    <motion.h3
                      layout="position"
                      className={cn(
                        "font-medium tracking-tight text-white drop-shadow-md shadow-black/50 transition-all duration-500",
                        isBig ? "text-2xl sm:text-3xl" : "text-base sm:text-lg"
                      )}
                    >
                      {item.company}
                    </motion.h3>
                  </motion.div>

                  {/* Models list — denser when collapsed, expanded grid when promoted */}
                  <motion.div layout="position" className="relative z-10">
                    <motion.div
                      layout="position"
                      className={cn(
                        "grid gap-x-5 gap-y-3",
                        isBig
                          ? "grid-cols-1 sm:grid-cols-2"
                          : "grid-cols-1"
                      )}
                    >
                      {item.models.map((model, j) => (
                        <motion.div
                          layout="position"
                          key={j}
                          className={cn(
                            "flex flex-col gap-0.5",
                            // In small cards, only show first 2 models to avoid clipping.
                            !isBig && j >= 2 ? "hidden" : ""
                          )}
                        >
                          <motion.h4
                            layout="position"
                            className={cn(
                              "font-medium text-white drop-shadow-md shadow-black/50 truncate",
                              isBig ? "text-sm" : "text-[12px]"
                            )}
                          >
                            {model.name}
                          </motion.h4>
                          <motion.p
                            layout="position"
                            className={cn(
                              "font-normal text-white/75 leading-snug truncate",
                              isBig ? "text-xs" : "text-[10.5px]"
                            )}
                          >
                            {model.desc}
                          </motion.p>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Bottom gradient — keeps text readable over background art */}
                <motion.div
                  layoutId={`${id}-${item.id}-overlay`}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    borderRadius: 24,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)",
                  }}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </LayoutGroup>
    </div>
  );
}

export default FluidExpandingGrid;
