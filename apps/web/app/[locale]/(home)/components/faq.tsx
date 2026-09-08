import { database } from "@repo/database";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/design-system/components/ui/accordion";
import { Button } from "@repo/design-system/components/ui/button";
import type { Dictionary } from "@repo/internationalization";
import { PhoneCall } from "lucide-react";
import Link from "next/link";

interface FAQProps {
  dictionary: Dictionary;
}

/**
 * Questions are admin-managed at /faqs in the dashboard. The heading and CTA
 * still come from the dictionary; only the entries moved to the database.
 * The section hides itself when nothing is published.
 */
export const FAQ = async ({ dictionary }: FAQProps) => {
  const faqs = await database.faqs
    .findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    })
    .catch(() => []);

  if (faqs.length === 0) {
    return null;
  }

  return (
    <div className="w-full py-16 sm:py-20 lg:py-32">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="max-w-xl text-left font-[family-name:var(--font-serif-display)] font-bold text-3xl tracking-tight md:text-[42px]">
                {dictionary.web.home.faq.title}
              </h2>
              <p className="max-w-xl text-left text-lg text-muted-foreground leading-relaxed lg:max-w-lg">
                {dictionary.web.home.faq.description}
              </p>
            </div>
            <div>
              <Button asChild className="gap-4" variant="outline">
                <Link href="/contact">
                  {dictionary.web.home.faq.cta}
                  <PhoneCall className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Accordion className="w-full" collapsible type="single">
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="whitespace-pre-wrap">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
};
