import { database } from "@repo/database";
import type { Dictionary } from "@repo/internationalization";
import { HeroCarousel, type HeroSlide } from "./hero-carousel";

interface HeroProps {
  dictionary: Dictionary;
}

/**
 * Slides are admin-managed: every active, in-window banner becomes one slide,
 * ordered by sort_order. Editing them lives at /banners in the dashboard.
 */
const getSlides = async (): Promise<HeroSlide[]> => {
  const now = new Date();

  const banners = await database.banners.findMany({
    where: {
      is_active: true,
      AND: [
        { OR: [{ starts_at: null }, { starts_at: { lte: now } }] },
        { OR: [{ ends_at: null }, { ends_at: { gt: now } }] },
      ],
    },
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
  });

  return banners.map((banner) => ({
    id: banner.id,
    image: banner.image_url,
    title: banner.title,
    description: banner.subtitle ?? "",
    cta: banner.link_url
      ? { label: banner.link_label ?? "Shop now", href: banner.link_url }
      : null,
  }));
};

export const Hero = async ({ dictionary }: HeroProps) => {
  const slides = await getSlides().catch(() => []);

  // A store with no banners published still gets a hero, using the site copy.
  const fallback: HeroSlide[] = [
    {
      id: "fallback",
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2400",
      title: dictionary.web.home.meta.title,
      description: dictionary.web.home.meta.description,
      cta: { label: "Shop now", href: "/products" },
    },
  ];

  return <HeroCarousel slides={slides.length > 0 ? slides : fallback} />;
};
