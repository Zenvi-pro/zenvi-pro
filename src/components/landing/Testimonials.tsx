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
    quote: "What used to take my team a full day now takes an hour. Zenvi's AI cuts through tedious editing like butter—and my footage never leaves my MacBook.",
    author: "Sarah Chen",
    role: "Documentary Filmmaker",
    avatar: "SC",
  },
  {
    quote: "As a lawyer, client confidentiality is everything. Zenvi lets me edit sensitive deposition videos without uploading a single frame to the cloud.",
    author: "Marcus Williams",
    role: "Legal Video Consultant",
    avatar: "MW",
  },
  {
    quote: "I shoot on-location with unreliable WiFi. Zenvi's local processing means I can edit 4K footage in real-time, anywhere in the world.",
    author: "Aisha Okonkwo",
    role: "Travel Content Creator",
    avatar: "AO",
  },
  {
    quote: "The auto-subtitles are insanely accurate—even with my guests' accents. I've saved hundreds of hours this year alone.",
    author: "David Park",
    role: "Podcast Host, The Daily Brief",
    avatar: "DP",
  },
  {
    quote: "Our agency switched from Premiere to Zenvi for quick-turn social content. The noise reduction and smart clipping pay for themselves.",
    author: "Elena Vasquez",
    role: "Creative Director, Bloom Media",
    avatar: "EV",
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

        {/* Partner logos - Zenvi branded watermarks */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-muted-foreground text-sm mb-6">Built for professionals at</p>
          <div className="flex justify-center items-center gap-10 flex-wrap">
            {[
              { name: "Zenvi Studio", icon: "◆" },
              { name: "Zenvi Pro", icon: "▲" },
              { name: "Zenvi Creator", icon: "●" },
              { name: "Zenvi Enterprise", icon: "■" },
            ].map((tier) => (
              <div key={tier.name} className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity">
                <span className="text-primary text-lg">{tier.icon}</span>
                <span className="text-sm font-medium text-muted-foreground tracking-wide">{tier.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
