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

export function FluidExpandingGrid({
  items,
  className,
  id = "fluid-gallery",
}: FluidExpandingGridProps) {
  // Enforce exactly 3 items logic based on the user's prompt
  const [layout, setLayout] = useState(() => {
    const ids = items.map((item) => item.id);
    return {
      row1: ids.slice(0, 2),
      row2: ids.slice(2, Math.min(items.length, 4)),
    };
  });

  const handleExpand = (itemId: string) => {
    const inRow1 = layout.row1.includes(itemId);
    const inRow2 = layout.row2.includes(itemId);

    if (
      (inRow1 && layout.row1.length === 1) ||
      (inRow2 && layout.row2.length === 1)
    )
      return;

    if (inRow1) {
      const neighbor = layout.row1.find((i) => i !== itemId)!;
      setLayout({
        row1: [itemId],
        row2: [neighbor, ...layout.row2.filter((i) => i !== neighbor)].slice(
          0,
          2
        ),
      });
    } else {
      const neighbor = layout.row2.find((i) => i !== itemId)!;
      setLayout({
        row1: [neighbor, ...layout.row1.filter((i) => i !== neighbor)].slice(
          0,
          2
        ),
        row2: [itemId],
      });
    }
  };

  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center overflow-hidden not-prose",
        className
      )}
    >
      <div className="w-full max-w-3xl mx-auto">
        <LayoutGroup id={id}>
          <motion.div
            layout
            className="grid grid-cols-2 grid-rows-2 gap-6 w-full h-[340px] sm:h-[540px]"
          >
            {items.map((item) => {
              const isRow1 = layout.row1.includes(item.id);
              const rowArr = isRow1 ? layout.row1 : layout.row2;
              const isSelected = rowArr.length === 1 && rowArr[0] === item.id;

              const gridRow = isRow1 ? 1 : 2;
              let gridColumn = "";
              if (isSelected) {
                gridColumn = "1 / span 2";
              } else {
                if (isRow1) {
                  gridColumn = layout.row1.indexOf(item.id) === 0 ? "1" : "2";
                } else {
                  gridColumn = layout.row2.indexOf(item.id) === 0 ? "1" : "2";
                }
              }

              return (
                <motion.div
                  key={item.id}
                  layoutId={`${id}-${item.id}`}
                  onClick={() => handleExpand(item.id)}
                  style={{ gridRow, gridColumn } as any}
                  className={cn(
                    "relative cursor-pointer group w-full h-full rounded-[32px] overflow-hidden bg-[#050505] border border-white/10 transition-colors",
                    isSelected ? "z-30 shadow-2xl shadow-black/50" : "z-10 hover:border-white/20"
                  )}
                  transition={{
                    layout: {
                      type: "spring",
                      stiffness: 100,
                      damping: 25,
                    },
                  }}
                >
                  {/* Background Gradient & Mask */}
                  <motion.div
                    layoutId={`${id}-${item.id}-mask-wrapper`}
                    className="absolute inset-0 overflow-hidden bg-zinc-900"
                    style={{ borderRadius: 32 }}
                  >
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br to-black opacity-50 transition-all duration-1000",
                      item.bg,
                      isSelected ? "scale-105 opacity-80" : "scale-100"
                    )} />
                    <motion.div
                      layoutId={`${id}-${item.id}-mask`}
                      className={cn(
                        "absolute inset-0 transition-colors duration-700 pointer-events-none",
                        isSelected ? "bg-black/0" : "bg-black/20"
                      )}
                    />
                    
                    {/* Fake play button placeholder for video */}
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none",
                      isSelected ? "opacity-30" : "opacity-0 group-hover:opacity-10"
                    )}>
                      <div className="w-16 h-16 rounded-full border border-white flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Content */}
                  <motion.div
                    layout="position"
                    className="absolute inset-0 p-6 flex flex-col justify-end text-white z-10 select-none pointer-events-none"
                  >
                    <motion.div layout="position" className="mb-auto">
                      <motion.h3
                        layout="position"
                        className={cn(
                          "font-medium tracking-tight text-white shadow-black/50 drop-shadow-md transition-all duration-500",
                          isSelected ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                        )}
                      >
                        {item.company}
                      </motion.h3>
                    </motion.div>

                    {/* Models List */}
                    <motion.div layout="position" className="relative z-10">
                      <motion.div 
                        layout="position" 
                        className={cn(
                          "grid gap-x-6 gap-y-4",
                          isSelected ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
                        )}
                      >
                        {item.models.map((model, j) => (
                          <motion.div layout="position" key={j} className="flex flex-col gap-0.5">
                            <motion.h4 layout="position" className="text-sm font-medium text-white shadow-black/50 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis">
                              {model.name}
                            </motion.h4>
                            <motion.p layout="position" className="text-xs text-white/80 font-normal leading-snug whitespace-nowrap overflow-hidden text-ellipsis">
                              {model.desc}
                            </motion.p>
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  {/* Overlays */}
                  <motion.div
                    layoutId={`${id}-${item.id}-overlay`}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      borderRadius: 32,
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)",
                    }}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </LayoutGroup>
      </div>
    </div>
  );
}

export default FluidExpandingGrid;
