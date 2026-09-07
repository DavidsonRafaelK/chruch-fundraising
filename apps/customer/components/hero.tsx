"use client";

import useEmblaCarousel from "embla-carousel-react";
import { Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AUTOPLAY_INTERVAL_MS = 6000;

export type HeroSlide = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  href: string;
};

export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const onSelect = useCallback(() => {
    if (emblaApi) {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || !playing || slides.length < 2) return;
    const timer = setInterval(() => {
      emblaApi.scrollNext();
    }, AUTOPLAY_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [emblaApi, playing, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  return (
    <section className="full-bleed relative overflow-hidden bg-muted">
      <div ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="relative aspect-4/5 min-w-0 flex-[0_0_100%] sm:aspect-16/9 lg:aspect-21/9"
            >
              <Image
                src={slide.imageUrl}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"
              />
              <div className="absolute inset-0 mx-auto flex max-w-7xl flex-col justify-center gap-4 px-4 sm:px-6 lg:px-8">
                <h1 className="max-w-md font-heading text-3xl font-bold text-balance text-white sm:text-4xl lg:text-5xl">
                  {slide.title}
                </h1>
                <p className="max-w-md text-pretty text-sm text-white/80 sm:text-base">
                  {slide.description}
                </p>
                <Button
                  render={<Link href={slide.href} />}
                  nativeButton={false}
                  size="lg"
                  className="w-fit rounded-full bg-white px-6 text-black hover:bg-white/90"
                >
                  Shop Now
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto flex max-w-7xl items-center justify-between px-4 sm:bottom-6 sm:px-6 lg:px-8">
          <div className="pointer-events-auto flex gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === selectedIndex}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "h-0.5 w-10 transition-colors",
                  index === selectedIndex ? "bg-white" : "bg-white/40",
                )}
              />
            ))}
          </div>

          <div className="pointer-events-auto flex items-center gap-3">
            <span className="font-mono text-xs text-white/80">
              {String(selectedIndex + 1).padStart(2, "0")}/
              {String(slides.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              onClick={() => setPlaying((value) => !value)}
              className="flex size-7 items-center justify-center rounded-full border border-white/50 text-white transition-colors hover:bg-white/15"
            >
              {playing ? (
                <Pause className="size-3" />
              ) : (
                <Play className="size-3" />
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
