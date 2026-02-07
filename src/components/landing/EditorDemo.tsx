import { motion } from "framer-motion";
import { Play, Pause, Volume2, Captions, Sparkles, AudioLines } from "lucide-react";

const EditorDemo = () => {
  return (
    <section className="py-24 relative overflow-hidden" id="demo">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Powerful editor,{" "}
            <span className="gradient-text">intuitive design</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A professional workspace that feels familiar. Edit, enhance, and export with AI assistance.
          </p>
        </motion.div>

        {/* Editor mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Browser frame */}
          <div className="glass-card rounded-2xl overflow-hidden neon-glow-purple">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-black/30">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
                  <span className="text-primary font-bold">◆</span>
                  <span>zenvi.pro/editor</span>
                </div>
              </div>
            </div>

            {/* Editor content */}
            <div className="p-4 bg-black/50">
              <div className="grid grid-cols-12 gap-4">
                {/* Video preview */}
                <div className="col-span-12 lg:col-span-8">
                  <div className="glass-card rounded-lg overflow-hidden">
                    {/* Video area */}
                    <div className="aspect-video bg-gradient-to-br from-muted to-background relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-sm"
                        >
                          <Play className="w-6 h-6 text-primary ml-1" />
                        </motion.div>
                      </div>
                      
                      {/* Instant preview badge */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                        className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/20 border border-secondary/50"
                      >
                        <Sparkles className="w-4 h-4 text-secondary" />
                        <span className="text-xs font-medium text-secondary">Instant Preview</span>
                      </motion.div>

                      {/* Zenvi.pro watermark */}
                      <div className="absolute top-4 right-4 px-2 py-1 rounded bg-black/40 text-xs text-muted-foreground/60 font-medium tracking-wider">
                        zenvi.pro
                      </div>

                      {/* Timestamp */}
                      <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/60 text-xs text-white font-mono">
                        00:45 / 02:30
                      </div>
                    </div>

                    {/* Playback controls */}
                    <div className="flex items-center gap-4 p-3 bg-muted/30">
                      <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <Play className="w-5 h-5" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <Pause className="w-5 h-5" />
                      </button>
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="w-1/3 h-full gradient-purple-green" />
                      </div>
                      <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Side panels */}
                <div className="col-span-12 lg:col-span-4 space-y-4">
                  {/* Subtitle panel */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="glass-card rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Captions className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Subtitles</span>
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary">AI</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { time: "00:00", text: "Welcome to Zenvi..." },
                        { time: "00:12", text: "Edit smarter with AI..." },
                        { time: "00:28", text: "No cloud required..." },
                      ].map((sub, i) => (
                        <div key={i} className="flex gap-2 text-sm p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                          <span className="text-muted-foreground font-mono text-xs">{sub.time}</span>
                          <span className="text-foreground/80">{sub.text}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Audio panel */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="glass-card rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <AudioLines className="w-4 h-4 text-secondary" />
                      <span className="text-sm font-medium">Audio</span>
                    </div>
                    {/* Waveform visualization */}
                    <div className="flex items-end gap-0.5 h-12 mb-3">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 bg-secondary/60 rounded-t"
                          initial={{ height: "20%" }}
                          animate={{ height: `${20 + Math.random() * 80}%` }}
                          transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            repeatType: "reverse",
                            delay: i * 0.02,
                          }}
                        />
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Noise Reduction</span>
                        <span className="text-secondary">85%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="w-[85%] h-full bg-secondary rounded-full" />
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Timeline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                  className="col-span-12 glass-card rounded-lg p-4"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-sm font-medium">Timeline</span>
                    <div className="flex-1 flex items-center gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span key={i} className="text-xs text-muted-foreground">
                          {i * 15}s
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Track lanes */}
                  <div className="space-y-2">
                    {/* Video track */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16">Video</span>
                      <div className="flex-1 h-10 bg-muted/30 rounded overflow-hidden flex gap-1 p-1">
                        <div className="h-full w-1/4 bg-primary/60 rounded flex items-center px-2">
                          <span className="text-xs truncate">Intro.mp4</span>
                        </div>
                        <div className="h-full w-2/5 bg-primary/40 rounded flex items-center px-2">
                          <span className="text-xs truncate">Main_content.mp4</span>
                        </div>
                        <div className="h-full w-1/5 bg-primary/60 rounded flex items-center px-2">
                          <span className="text-xs truncate">Outro.mp4</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Audio track */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16">Audio</span>
                      <div className="flex-1 h-8 bg-muted/30 rounded overflow-hidden flex gap-1 p-1">
                        <div className="h-full w-full bg-secondary/40 rounded flex items-center px-2">
                          <span className="text-xs truncate">Background_music.mp3</span>
                        </div>
                      </div>
                    </div>

                    {/* Playhead */}
                    <div className="relative h-2">
                      <motion.div
                        className="absolute top-0 w-0.5 h-full bg-primary shadow-lg"
                        style={{ left: "30%" }}
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
        </motion.div>
      </div>
    </section>
  );
};

export default EditorDemo;
