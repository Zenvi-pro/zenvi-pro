import { useState } from "react";
import { Carousel } from "@ark-ui/react/carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselImage = {
  full: string;
  thumb?: string;
  heading: string;
  type: "image" | "video";
};

const images: CarouselImage[] = [
  {
    full: "/instant-ai-edits.png",
    thumb: "/instant-ai-edits.png",
    heading: "Instant AI Edits",
    type: "image",
  },
  {
    full: "/local-processing-editor.png",
    thumb: "/local-processing-editor.png",
    heading: "100% Local Processing",
    type: "image",
  },
  {
    full: "/product_demo.mp4",
    heading: "Explainer Videos & Product Demos",
    type: "video",
  },
  {
    full: "/smart_detection.mp4",
    heading: "Smart Scene Detection",
    type: "video",
  },
  {
    full: "/version_control.mp4",
    heading: "Control Hundreds of Versions",
    type: "video",
  },
  {
    full: "/UGC_content.MP4",
    heading: "UGC-Style Content at Scale",
    type: "video",
  },
];

export function ThumbnailsCarousel() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const displayedHeading =
    hoveredIndex === null ? images[activeIndex]?.heading : images[hoveredIndex]?.heading;

  return (
    <Carousel.Root
      defaultPage={0}
      slideCount={images.length}
      className="max-w-5xl p-2 mx-auto"
      onPageChange={(details) => setActiveIndex(details.page)}
    >
      <Carousel.ItemGroup className="overflow-hidden rounded-lg shadow-lg mb-4 border border-white/[0.08]">
        {images.map((image, index) => (
          <Carousel.Item key={index} index={index}>
            {image.type === "video" ? (
              <video
                src={image.full}
                className="w-full h-80 object-cover"
                muted
                loop
                playsInline
                autoPlay
              />
            ) : (
              <img
                src={image.full}
                alt={`Slide ${index + 1}`}
                className="w-full h-80 object-cover"
              />
            )}
          </Carousel.Item>
        ))}
      </Carousel.ItemGroup>

      <div className="mb-4 text-center min-h-9">
        <p className="text-white text-xl md:text-2xl font-semibold transition-opacity duration-200">
          {displayedHeading}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Carousel.PrevTrigger className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0 text-black dark:text-white">
          <ChevronLeft className="h-5 w-5" />
        </Carousel.PrevTrigger>

        <div className="flex gap-2 overflow-x-auto flex-1 px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {images.map((image, index) => (
            <Carousel.Indicator
              key={index}
              index={index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="shrink-0 border-2 border-transparent data-current:border-blue-500 rounded-md overflow-hidden cursor-pointer transition-all hover:border-gray-300"
            >
              {image.type === "video" ? (
                <video
                  src={image.full}
                  className="w-16 h-12 object-cover"
                  muted
                  loop
                  playsInline
                  autoPlay
                />
              ) : (
                <img
                  src={image.thumb}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-16 h-12 object-cover"
                />
              )}
            </Carousel.Indicator>
          ))}
        </div>

        <Carousel.NextTrigger className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0 text-black dark:text-white">
          <ChevronRight className="h-5 w-5" />
        </Carousel.NextTrigger>
      </div>
    </Carousel.Root>
  );
}
