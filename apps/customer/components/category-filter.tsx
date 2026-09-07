import type { Tables } from "@repo/supabase/types";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function CategoryFilter({
  categories,
  activeCategoryId,
}: {
  categories: Tables<"categories">[];
  activeCategoryId?: string;
}) {
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link
        href="/"
        className={cn(
          "shrink-0 rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors",
          !activeCategoryId
            ? "border-primary bg-primary text-primary-foreground"
            : "bg-background text-foreground hover:bg-muted",
        )}
      >
        All
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/?category=${category.id}`}
          className={cn(
            "shrink-0 rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors",
            activeCategoryId === category.id
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background text-foreground hover:bg-muted",
          )}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
