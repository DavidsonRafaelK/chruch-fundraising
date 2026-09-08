import { Playfair_Display } from "next/font/google";

/**
 * Editorial serif for storefront headings. Scoped to apps/web rather than the
 * shared design system: the dashboard has no use for it and should not pay to
 * load it.
 */
export const serifDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif-display",
  weight: ["600", "700"],
});
