import Link from "next/link";
import { CartDrawer } from "@/components/cart-drawer";
import { MobileNav } from "@/components/mobile-nav";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="-ml-2 md:hidden">
          <MobileNav />
        </div>

        <Link href="/" className="flex items-center">
          <span className="font-bold">Church Fundraising</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:ml-8 md:flex">
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Shop All
          </Link>
        </nav>

        <div className="-mr-2 ml-auto flex items-center">
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}
