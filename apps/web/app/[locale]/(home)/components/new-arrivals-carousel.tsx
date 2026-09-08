"use client";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@repo/design-system/components/ui/carousel";
import { cn } from "@repo/design-system/lib/utils";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ProductCard,
  type ProductCardData,
} from "../../components/product-card";

interface NewArrivalsCarouselProps {
  products: ProductCardData[];
}

/**
 * Built on the shared Embla carousel rather than a hand-rolled slider, so drag
 * and touch support come for free. The track is translated; products never
 * wrap, and the card at the right edge stays partially visible so the section
 * reads as scrollable.
 */
export const NewArrivalsCarousel = ({ products }: NewArrivalsCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!api) {
      return;
    }

    const sync = () => {
      setSelected(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };

    sync();
    api.on("select", sync);
    api.on("reInit", sync);

    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  // A scroll-position indicator, not a fill bar: a short segment slides along.
  const segmentWidth = snapCount > 0 ? 100 / snapCount : 100;

  return (
    <>
      {/* No right padding: the track runs to the viewport edge while the first
          card stays aligned with the heading. */}
      <div className="mt-9 pl-5 sm:pl-6 lg:pl-12">
        <Carousel
          opts={{ align: "start", containScroll: "trimSnaps" }}
          setApi={setApi}
        >
          <CarouselContent className="-ml-5">
            {products.map((product) => (
              <CarouselItem
                className="basis-[72%] pl-5 sm:basis-[45%] lg:basis-[360px]"
                key={product.id}
              >
                <ProductCard product={product} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="mx-auto mt-12 flex max-w-[1600px] items-center justify-between gap-6 px-5 sm:px-6 lg:px-12">
        <div className="h-[3px] w-[180px] overflow-hidden rounded-full bg-neutral-200 sm:w-[240px]">
          <div
            className="h-full rounded-full bg-foreground transition-transform duration-300 ease-out"
            style={{
              width: `${segmentWidth}%`,
              transform: `translateX(${selected * 100}%)`,
            }}
          />
        </div>

        <div className="flex items-center gap-6">
          <button
            aria-label="Previous products"
            className={cn(
              "transition-colors",
              canPrev
                ? "text-foreground hover:opacity-70"
                : "cursor-not-allowed text-neutral-300"
            )}
            disabled={!canPrev}
            onClick={() => api?.scrollPrev()}
            type="button"
          >
            <ArrowLeftIcon className="h-[22px] w-[22px]" />
          </button>
          <button
            aria-label="Next products"
            className={cn(
              "transition-colors",
              canNext
                ? "text-foreground hover:opacity-70"
                : "cursor-not-allowed text-neutral-300"
            )}
            disabled={!canNext}
            onClick={() => api?.scrollNext()}
            type="button"
          >
            <ArrowRightIcon className="h-[22px] w-[22px]" />
          </button>
        </div>
      </div>
    </>
  );
};

export const NewArrivalsHeader = () => (
  <div className="mx-auto flex max-w-[1600px] items-end justify-between gap-6 px-5 sm:px-6 lg:px-12">
    <div>
      <h2 className="font-[family-name:var(--font-serif-display)] font-bold text-3xl leading-tight tracking-tight sm:text-4xl lg:text-[42px]">
        New arrivals
      </h2>
      <p className="mt-2.5 text-[17px] text-muted-foreground">
        Our latest products are here. Check out what&apos;s new in store.
      </p>
    </div>
    <Link
      className="shrink-0 font-semibold text-base hover:underline"
      href="/products"
    >
      See all
    </Link>
  </div>
);
