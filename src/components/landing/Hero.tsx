import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onOpenAccessCode: () => void;
}

const Hero = ({ onOpenAccessCode }: HeroProps) => {
  const [osLabel, setOsLabel] = useState("Mac");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) setOsLabel("Windows");
    else if (/Linux/i.test(ua) && !/Android/i.test(ua)) setOsLabel("Linux");
    else setOsLabel("Mac");
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20">
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-hero-mobile md:text-hero text-white mb-6"
        >
          Edit video at machine speed,
          <br className="hidden sm:block" />
          {" "}not cloud speed.
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Premier-grade AI editing. Local processing. Zero latency.
          <br className="hidden md:block" />
          Your footage never leaves your machine.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button
            onClick={onOpenAccessCode}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white text-base font-medium px-8 py-6 rounded-lg"
          >
            Download for {osLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-white/10 hover:border-white/20 hover:bg-white/[0.03] text-white text-base px-8 py-6 rounded-lg"
          >
            <Play className="w-4 h-4 mr-2" />
            Watch Demo
          </Button>
        </motion.div>

        {/* Product video */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          className="mt-20 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
        >
          <div className="aspect-video bg-black">
            <iframe
              className="h-full w-full"
              src="https://www.youtube-nocookie.com/embed/5Nc7iPDJ4tw"
              title="Zenvi product demo"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
