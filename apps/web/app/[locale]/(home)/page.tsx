import { showBetaFeature } from "@repo/feature-flags";
import { getDictionary } from "@repo/internationalization";
import { createStoreMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { FAQ } from "./components/faq";
import { FeaturedCollection } from "./components/featured-collection";
import { Hero } from "./components/hero";
import { NewArrivals } from "./components/new-arrivals";

interface HomeProps {
  params: Promise<{
    locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: HomeProps): Promise<Metadata> => {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return createStoreMetadata(dictionary.web.home.meta);
};

const Home = async ({ params }: HomeProps) => {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);
  const betaFeature = await showBetaFeature();

  return (
    <>
      {betaFeature && (
        <div className="w-full bg-black py-2 text-center text-white">
          Beta feature now available
        </div>
      )}
      <Hero dictionary={dictionary} />
      <NewArrivals />
      <FeaturedCollection />
      <FAQ dictionary={dictionary} />
    </>
  );
};

export default Home;
