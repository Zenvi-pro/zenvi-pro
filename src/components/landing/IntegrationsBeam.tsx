import { forwardRef, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { UserRound, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZenviLogo } from "@/components/ZenviLogo";
import { AnimatedBeam } from "@/components/ui/animated-beam";

const BeamNode = forwardRef<
  HTMLDivElement,
  { className?: string; icon: ReactNode }
>(({ className, icon }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#111111] shadow-[0_0_20px_-10px_rgba(0,0,0,0.9)]",
      className,
    )}
  >
    {icon}
  </div>
));
BeamNode.displayName = "BeamNode";

export default function IntegrationsBeam() {
  const containerRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const zenviRef = useRef<HTMLDivElement>(null);
  const nvidiaRef = useRef<HTMLDivElement>(null);
  const claudeRef = useRef<HTMLDivElement>(null);
  const openaiRef = useRef<HTMLDivElement>(null);
  const klingRef = useRef<HTMLDivElement>(null);
  const sunoRef = useRef<HTMLDivElement>(null);

  const beamProps = {
    pathColor: "rgba(255,255,255,0.08)",
    pathOpacity: 1,
    pathWidth: 2,
    gradientStartColor: "#0066FF",
    gradientStopColor: "#4DA3FF",
    duration: 3,
  };

  return (
    <section className="py-section-sm md:py-section relative" id="integrations">
      <div className="mx-auto max-w-content px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="relative rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-6 md:p-10"
        >
          {/* containerRef wraps nodes + beams so SVG inset-0 aligns correctly */}
          <div
            ref={containerRef}
            className="relative flex min-h-[280px] w-full items-center justify-center md:min-h-[360px]"
          >
            <div className="flex w-full max-w-4xl flex-row items-center justify-between">
              {/* Left: User */}
              <BeamNode
                ref={userRef}
                icon={<UserRound className="h-5 w-5 text-white" />}
              />

              {/* Center: Zenvi */}
              <BeamNode
                ref={zenviRef}
                className="h-16 w-16 text-white border-primary/40 shadow-[0_0_0_1px_rgba(0,102,255,0.3),0_0_28px_rgba(0,102,255,0.18)]"
                icon={<ZenviLogo size={30} />}
              />

              {/* Right: Integrations */}
              <div className="flex flex-col items-center gap-3">
                <BeamNode
                  ref={nvidiaRef}
                  icon={
                    <img
                      src="https://cdn.simpleicons.org/nvidia/76B900"
                      alt="NVIDIA"
                      className="h-6 w-6"
                    />
                  }
                />
                <BeamNode
                  ref={claudeRef}
                  icon={
                    <img
                      src="https://cdn.simpleicons.org/anthropic/FFFFFF"
                      alt="Claude"
                      className="h-6 w-6"
                    />
                  }
                />
                <BeamNode
                  ref={openaiRef}
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 fill-white"
                      aria-label="OpenAI"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.911 6.046 6.046 0 0 0-6.51-2.9 6.065 6.065 0 0 0-10.775 2.867 5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.843-3.371 2.02-1.168a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.104v-5.677a.79.79 0 0 0-.402-.679zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.41 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.141.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                    </svg>
                  }
                />
                <BeamNode
                  ref={klingRef}
                  icon={<Clapperboard className="h-5 w-5 text-white" />}
                />
                <BeamNode
                  ref={sunoRef}
                  icon={
                    <img
                      src="https://cdn.simpleicons.org/suno/FFFFFF"
                      alt="Suno"
                      className="h-6 w-6"
                    />
                  }
                />
              </div>
            </div>

            {/* Input beam: user → zenvi */}
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={userRef}
              toRef={zenviRef}
              curvature={0}
              delay={0}
              {...beamProps}
            />

            {/* Output beams: zenvi → integrations */}
            {/* Positive curvature bows UP (toward top node), negative bows DOWN */}
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={zenviRef}
              toRef={nvidiaRef}
              curvature={75}
              delay={0.4}
              {...beamProps}
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={zenviRef}
              toRef={claudeRef}
              curvature={35}
              delay={0.6}
              {...beamProps}
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={zenviRef}
              toRef={openaiRef}
              curvature={0}
              delay={0.8}
              {...beamProps}
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={zenviRef}
              toRef={klingRef}
              curvature={-35}
              delay={1.0}
              {...beamProps}
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={zenviRef}
              toRef={sunoRef}
              curvature={-75}
              delay={1.2}
              {...beamProps}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
