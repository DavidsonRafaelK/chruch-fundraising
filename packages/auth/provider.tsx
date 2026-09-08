"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import type { ComponentProps } from "react";

type ClerkProviderProperties = ComponentProps<typeof ClerkProvider>;

/**
 * Derived from ClerkProvider rather than imported from `@clerk/types`, which
 * is now a shim over `@clerk/shared` and exports an older Theme than this
 * major version accepts. In that older shape these lived under `layout` and
 * `baseTheme`; they are now `options` and `theme`.
 */
type Appearance = NonNullable<ClerkProviderProperties["appearance"]>;

type AuthProviderProperties = ClerkProviderProperties & {
  privacyUrl?: string;
  termsUrl?: string;
  helpUrl?: string;
};

export const AuthProvider = ({
  privacyUrl,
  termsUrl,
  helpUrl,
  ...properties
}: AuthProviderProperties) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const variables: Appearance["variables"] = {
    fontFamily: "var(--font-sans)",
    fontFamilyButtons: "var(--font-sans)",
    fontWeight: {
      bold: "var(--font-weight-bold)",
      normal: "var(--font-weight-normal)",
      medium: "var(--font-weight-medium)",
    },
  };

  const elements: Appearance["elements"] = {
    dividerLine: "bg-border",
    socialButtonsIconButton: "bg-card",
    navbarButton: "text-foreground",
  };

  const options: Appearance["options"] = {
    privacyPageUrl: privacyUrl,
    termsPageUrl: termsUrl,
    helpPageUrl: helpUrl,
  };

  return (
    <ClerkProvider
      {...properties}
      appearance={{
        options,
        elements,
        variables,
        theme: isDark ? dark : undefined,
      }}
    />
  );
};
