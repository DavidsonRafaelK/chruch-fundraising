"use client";

import type { ProductListingRow } from "@repo/supabase/queries/products";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";

export function NewArrivals({ products }: { products: ProductListingRow[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
  });
  const [progress, setProgress] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onScroll = useCallback(() => {
    if (!emblaApi) return;
    setProgress(Math.min(1, Math.max(0, emblaApi.scrollProgress())));
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onScroll();
    emblaApi.on("scroll", onScroll);
    emblaApi.on("reInit", onScroll);
    return () => {
      emblaApi.off("scroll", onScroll);
      emblaApi.off("reInit", onScroll);
    };
  }, [emblaApi, onScroll]);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            New arrivals
          </h2>
          <p className="text-pretty text-muted-foreground">
            Our latest products are here. Check out what&apos;s new in store.
          </p>
        </div>
        <Link
          href="/#catalog"
          className="shrink-0 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          See all
        </Link>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-4 flex">
          {products.map((product) => (
            <div
              key={product.id}
              className="min-w-0 flex-[0_0_60%] pl-4 sm:flex-[0_0_33.333%] lg:flex-[0_0_25%]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-6">
        <div
          className="h-0.5 w-64 max-w-[40%] overflow-hidden rounded-full bg-muted"
          /*
           * Decorative mirror of the carousel position — the buttons beside it
           * are the accessible control, so this is hidden from screen readers.
           */
          aria-hidden
        >
          <div
            className="h-full w-1/4 rounded-full bg-foreground transition-transform"
            style={{ transform: `translateX(${progress * 300}%)` }}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Previous products"
            disabled={!canScrollPrev}
            onClick={() => emblaApi?.scrollPrev()}
            className="text-foreground transition-opacity disabled:opacity-30"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next products"
            disabled={!canScrollNext}
            onClick={() => emblaApi?.scrollNext()}
            className="text-foreground transition-opacity disabled:opacity-30"
          >
            <ArrowRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
