"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSiteSettings } from "@/app/actions/content/settings";

interface LegalPage {
  slug: string;
  title: string;
  description: string;
  body: string;
}

interface SettingsFormProps {
  storeName: string;
  whatsapp: string;
  legal: LegalPage[];
}

export const SettingsForm = ({
  storeName,
  whatsapp,
  legal,
}: SettingsFormProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pages, setPages] = useState(legal);

  const updatePage = (slug: string, field: keyof LegalPage, value: string) => {
    setPages((current) =>
      current.map((page) =>
        page.slug === slug ? { ...page, [field]: value } : page
      )
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateSiteSettings({
        storeName: String(form.get("storeName") ?? "").trim(),
        whatsapp: String(form.get("whatsapp") ?? "").trim(),
        legal: pages,
      });

      if (result.ok) {
        toast.success("Settings saved");
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  };

  return (
    <form className="flex max-w-3xl flex-col gap-8" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-4 rounded-xl border p-6">
        <div>
          <h2 className="font-medium">Store</h2>
          <p className="text-muted-foreground text-sm">
            Shown in the storefront header, footer and emails.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="storeName">Store name</Label>
          <Input
            defaultValue={storeName}
            id="storeName"
            maxLength={100}
            name="storeName"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="whatsapp">WhatsApp number</Label>
          <Input
            defaultValue={whatsapp}
            id="whatsapp"
            maxLength={30}
            name="whatsapp"
            placeholder="0812-3456-7890"
          />
          <p className="text-muted-foreground text-xs">
            Customers are sent here after checkout. Leave empty to skip the
            handoff. A leading 0 is converted to 62 automatically.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-6 rounded-xl border p-6">
        <div>
          <h2 className="font-medium">Legal pages</h2>
          <p className="text-muted-foreground text-sm">
            Published at /legal/privacy and /legal/terms on the storefront.
          </p>
        </div>

        {pages.map((page) => (
          <div className="flex flex-col gap-3 border-t pt-6 first:border-t-0 first:pt-0" key={page.slug}>
            <p className="font-mono text-muted-foreground text-xs">
              /legal/{page.slug}
            </p>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`${page.slug}-title`}>Title</Label>
              <Input
                id={`${page.slug}-title`}
                maxLength={200}
                onChange={(event) =>
                  updatePage(page.slug, "title", event.target.value)
                }
                value={page.title}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`${page.slug}-description`}>Summary</Label>
              <Input
                id={`${page.slug}-description`}
                maxLength={500}
                onChange={(event) =>
                  updatePage(page.slug, "description", event.target.value)
                }
                value={page.description}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`${page.slug}-body`}>Content</Label>
              <Textarea
                id={`${page.slug}-body`}
                onChange={(event) =>
                  updatePage(page.slug, "body", event.target.value)
                }
                rows={8}
                value={page.body}
              />
            </div>
          </div>
        ))}
      </section>

      <div>
        <Button disabled={pending} type="submit">
          {pending ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </form>
  );
};
