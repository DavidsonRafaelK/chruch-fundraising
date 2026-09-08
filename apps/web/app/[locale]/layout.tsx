import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import { Toolbar } from "@repo/feature-flags/components/toolbar";
import { getDictionary } from "@repo/internationalization";
import type { ReactNode } from "react";
import { getStoreName } from "@repo/database/settings";
import { CartProvider } from "@/lib/cart";
import { serifDisplay } from "@/lib/fonts";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

interface RootLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

const RootLayout = async ({ children, params }: RootLayoutProperties) => {
  const { locale } = await params;
  const [dictionary, storeName] = await Promise.all([
    getDictionary(locale),
    getStoreName(),
  ]);

  return (
    <html
      className={cn(fonts, serifDisplay.variable, "scroll-smooth")}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <AnalyticsProvider>
          <DesignSystemProvider>
            <CartProvider>
              <Header dictionary={dictionary} storeName={storeName} />
              {children}
              <Footer />
            </CartProvider>
          </DesignSystemProvider>
          <Toolbar />
        </AnalyticsProvider>
      </body>
    </html>
  );
};

export default RootLayout;
