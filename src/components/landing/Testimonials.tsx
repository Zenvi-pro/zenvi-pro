import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const testimonials = [
  {
    quote: "Zenvi completely changed my workflow. Editing that used to take hours now takes minutes. The AI subtitles are scary accurate.",
    author: "Sarah Chen",
    role: "YouTube Creator, 500K subscribers",
    avatar: "SC",
  },
  {
    quote: "Finally, a video editor that respects my privacy. No more uploading sensitive client footage to random cloud services.",
    author: "Marcus Johnson",
    role: "Freelance Video Producer",
    avatar: "MJ",
  },
  {
    quote: "The local AI processing is a game-changer. Real-time edits without any lag, even on my laptop. Incredible engineering.",
    author: "Aisha Patel",
    role: "Content Director, TechFlow",
    avatar: "AP",
  },
  {
    quote: "I've tried every AI video tool out there. Zenvi is the only one that actually delivers on the promise of 'instant' editing.",
    author: "David Kim",
    role: "TikTok Creator, 2M followers",
    avatar: "DK",
  },
  {
    quote: "The noise reduction alone is worth the subscription. My audio has never sounded this clean. My podcast sounds professional now.",
    author: "Emma Rodriguez",
    role: "Podcaster & Educator",
    avatar: "ER",
  },
];

const Testimonials = () => {
  return (
    <section className="py-24 relative overflow-hidden" id="testimonials">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Loved by{" "}
            <span className="gradient-text">creators worldwide</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of creators who've transformed their editing workflow with Zenvi.
          </p>
        </motion.div>

        {/* Testimonials carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-5xl mx-auto px-12"
        >
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/2">
                  <div className="glass-card rounded-xl p-6 h-full flex flex-col">
                    {/* Quote icon */}
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                      <Quote className="w-5 h-5 text-primary" />
                    </div>

                    {/* Quote text */}
                    <p className="text-foreground/90 leading-relaxed flex-grow mb-6">
                      "{testimonial.quote}"
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-purple-green flex items-center justify-center text-sm font-bold text-primary-foreground">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{testimonial.author}</p>
                        <p className="text-muted-foreground text-xs">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="border-border hover:border-primary/50 hover:bg-primary/10" />
            <CarouselNext className="border-border hover:border-primary/50 hover:bg-primary/10" />
          </Carousel>
        </motion.div>

        {/* Partner logos placeholder */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-muted-foreground text-sm mb-6">Trusted by teams at</p>
          <div className="flex justify-center items-center gap-8 flex-wrap opacity-40">
            {["TechCorp", "MediaFlow", "CreatorLabs", "StreamPro", "EditHQ"].map((company) => (
              <span key={company} className="text-lg font-bold text-muted-foreground">
                {company}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
