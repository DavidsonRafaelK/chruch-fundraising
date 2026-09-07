import { getCategories } from "@repo/supabase/queries/categories";
import { createClient } from "@repo/supabase/server";
import Link from "next/link";
import { whatsappPhoneNumber } from "@/lib/env";

export async function Footer() {
  const supabase = await createClient();
  const categories = await getCategories(supabase);
  /*
   * The store has exactly one contact channel — the same WhatsApp number
   * orders are sent to — so the footer reads it from that env var instead of
   * duplicating a phone number that could drift out of sync with checkout.
   */
  const phone = whatsappPhoneNumber();
  const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, "")}`;

  return (
    <footer className="mt-16 border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <Link href="/" className="font-heading text-lg font-bold">
              Church Fundraising
            </Link>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium text-foreground">
                Contact Us
              </h2>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {phone}
              </a>
            </div>
          </div>

          <nav className="flex flex-col gap-3">
            <h2 className="text-base font-medium text-foreground">Categories</h2>
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Shop All
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/?category=${category.id}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Church Fundraising
        </p>
      </div>
    </footer>
  );
}
