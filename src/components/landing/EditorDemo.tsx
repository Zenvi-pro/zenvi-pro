import { motion } from "framer-motion";
import { Play, Pause, Volume2, Captions, AudioLines } from "lucide-react";

const EditorDemo = () => {
  return (
    <section className="py-section-sm md:py-section relative" id="demo">
      <div className="mx-auto max-w-content px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-section-title md:text-[48px] md:leading-[1.15] font-semibold text-white mb-4">
            A professional workspace, zero latency
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Edit, enhance, and export with AI assistance—all running on your machine.
          </p>
        </motion.div>

        {/* Editor mockup */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="rounded-xl border border-white/[0.06] bg-[#111111] overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#0D0D0D]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 flex justify-center">
                <span className="text-xs text-muted-foreground">
                  Zenvi Editor
                </span>
              </div>
            </div>

            {/* Editor content */}
            <div className="p-3 md:p-4">
              <div className="grid grid-cols-12 gap-3 md:gap-4">
                {/* Video preview */}
                <div className="col-span-12 lg:col-span-8">
                  <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                    <div className="aspect-video bg-[#0A0A0A] relative flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white/60 ml-0.5" />
                      </div>
                      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-xs text-white/60 font-mono">
                        00:45 / 02:30
                      </div>
                    </div>

                    {/* Playback controls */}
                    <div className="flex items-center gap-3 px-3 py-2.5 border-t border-white/[0.06]">
                      <button className="p-1.5 rounded hover:bg-white/5 transition-colors">
                        <Play className="w-4 h-4 text-white/60" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-white/5 transition-colors">
                        <Pause className="w-4 h-4 text-white/60" />
                      </button>
                      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="w-1/3 h-full bg-primary rounded-full" />
                      </div>
                      <button className="p-1.5 rounded hover:bg-white/5 transition-colors">
                        <Volume2 className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Side panels */}
                <div className="col-span-12 lg:col-span-4 space-y-3 md:space-y-4">
                  {/* Subtitle panel */}
                  <div className="rounded-lg border border-white/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Captions className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-white">
                        Subtitles
                      </span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        AI
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { time: "00:00", text: "Welcome to Zenvi..." },
                        { time: "00:12", text: "Edit smarter with AI..." },
                        { time: "00:28", text: "No cloud required..." },
                      ].map((sub, i) => (
                        <div
                          key={i}
                          className="flex gap-2 text-sm p-2 rounded bg-white/[0.03] hover:bg-white/[0.05] transition-colors cursor-pointer"
                        >
                          <span className="text-muted-foreground font-mono text-xs">
                            {sub.time}
                          </span>
                          <span className="text-white/70">{sub.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Audio panel */}
                  <div className="rounded-lg border border-white/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AudioLines className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-white">
                        Audio
                      </span>
                    </div>
                    {/* Static waveform */}
                    <div className="flex items-end gap-[2px] h-10 mb-3">
                      {Array.from({ length: 40 }).map((_, i) => {
                        const heights = [30, 50, 70, 40, 85, 60, 45, 75, 35, 55, 90, 40, 65, 50, 80, 45, 55, 70, 35, 60, 50, 75, 40, 85, 55, 45, 65, 80, 35, 70, 50, 60, 45, 75, 55, 40, 85, 65, 50, 70];
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-primary/40 rounded-t"
                            style={{ height: `${heights[i % heights.length]}%` }}
                          />
                        );
                      })}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Noise Reduction
                        </span>
                        <span className="text-primary text-xs font-medium">85%</span>
                      </div>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="w-[85%] h-full bg-primary rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="col-span-12 rounded-lg border border-white/[0.06] p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-sm font-medium text-white">
                      Timeline
                    </span>
                    <div className="flex-1 flex items-center gap-4">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span
                          key={i}
                          className="text-[10px] text-muted-foreground/50 font-mono"
                        >
                          {i * 15}s
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Track lanes */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12">
                        Video
                      </span>
                      <div className="flex-1 h-9 bg-white/[0.03] rounded overflow-hidden flex gap-1 p-1">
                        <div className="h-full w-1/4 bg-primary/20 border border-primary/30 rounded flex items-center px-2">
                          <span className="text-[10px] text-white/50 truncate">
                            Intro.mp4
                          </span>
                        </div>
                        <div className="h-full w-2/5 bg-primary/15 border border-primary/20 rounded flex items-center px-2">
                          <span className="text-[10px] text-white/50 truncate">
                            Main_content.mp4
                          </span>
                        </div>
                        <div className="h-full w-1/5 bg-primary/20 border border-primary/30 rounded flex items-center px-2">
                          <span className="text-[10px] text-white/50 truncate">
                            Outro.mp4
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12">
                        Audio
                      </span>
                      <div className="flex-1 h-7 bg-white/[0.03] rounded overflow-hidden flex gap-1 p-1">
                        <div className="h-full w-full bg-white/[0.04] border border-white/[0.06] rounded flex items-center px-2">
                          <span className="text-[10px] text-white/40 truncate">
                            Background_music.mp3
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Playhead */}
                    <div className="relative h-1">
                      <div
                        className="absolute top-0 w-0.5 h-full bg-primary rounded-full"
                        style={{ left: "30%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default EditorDemo;
