"use client";

import { cn } from "@repo/design-system/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

export interface HeroSlide {
  id: string;
  image: string;
  title: string;
  description: string;
  cta: { label: string; href: string } | null;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
}

const pad = (value: number): string => String(value).padStart(2, "0");

/**
 * Full-bleed hero. Every slide is stacked and cross-faded rather than
 * translated, so slide count never affects layout and the photograph stays the
 * only thing that moves.
 */
export const HeroCarousel = ({ slides }: HeroCarouselProps) => {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((current) => (current + 1) % slides.length);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const active = slides[index];

  return (
    <section
      aria-label="Featured"
      aria-roledescription="carousel"
      className="relative w-full overflow-hidden bg-neutral-900"
    >
      {/* Cinematic on desktop, taller on phones so the copy still breathes. */}
      <div className="relative aspect-[3/4] w-full sm:aspect-[16/9] lg:aspect-[2.3/1]">
        {slides.map((slide, slideIndex) => (
          <div
            aria-hidden={slideIndex !== index}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-out",
              slideIndex === index ? "opacity-100" : "opacity-0"
            )}
            key={slide.id}
          >
            {/* biome-ignore lint/performance/noImgElement: images come from arbitrary hosts */}
            <img
              alt={slide.title}
              className="h-full w-full object-cover"
              // Only the first slide is above the fold on load.
              loading={slideIndex === 0 ? "eager" : "lazy"}
              src={slide.image}
            />
          </div>
        ))}

        {/* Strongest at the bottom-left, where the copy sits; the top of the
            photograph stays essentially untouched. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent sm:from-black/75 sm:via-black/25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

        <div className="absolute inset-0">
          <div className="absolute right-6 bottom-24 left-6 max-w-[620px] sm:right-auto sm:bottom-[20%] sm:left-[7%] sm:pr-6">
            <h1 className="text-balance font-[family-name:var(--font-serif-display)] font-bold text-3xl text-white leading-[1.05] tracking-tight sm:text-5xl sm:leading-[1.0] lg:text-[68px]">
              {active.title}
            </h1>
            {active.description && (
              <p className="mt-4 line-clamp-3 max-w-[520px] text-[15px] text-white/85 leading-relaxed sm:mt-5 sm:line-clamp-none sm:text-lg lg:text-[21px]">
                {active.description}
              </p>
            )}
            {active.cta && (
              <Link
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-white px-7 font-medium text-black text-sm transition-transform hover:scale-[1.02] sm:mt-8 sm:h-[54px] sm:px-9 lg:h-[62px] lg:min-w-[140px] lg:text-base"
                href={active.cta.href}
              >
                {active.cta.label}
              </Link>
            )}
          </div>

          {slides.length > 1 && (
            <>
              <div className="absolute bottom-8 left-6 flex gap-2 sm:bottom-[7%] sm:left-[7%]">
                {slides.map((slide, slideIndex) => (
                  <button
                    aria-label={`Go to slide ${slideIndex + 1}`}
                    className={cn(
                      "h-[2px] w-[38px] transition-colors lg:w-[55px]",
                      slideIndex === index ? "bg-white" : "bg-white/35"
                    )}
                    key={slide.id}
                    onClick={() => setIndex(slideIndex)}
                    type="button"
                  />
                ))}
              </div>

              <div className="absolute right-6 bottom-7 flex items-center gap-3 sm:right-[6%] sm:bottom-[4%]">
                <span className="font-mono text-white/80 text-xs tabular-nums">
                  {pad(index + 1)} / {pad(slides.length)}
                </span>
                <button
                  aria-label="Next slide"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-white/40 text-white transition-colors hover:bg-white/10"
                  onClick={next}
                  type="button"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
