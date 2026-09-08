"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Switch } from "@repo/design-system/components/ui/switch";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createFaq, type FaqInput, updateFaq } from "@/app/actions/content/faqs";
import type { FaqRow } from "./faq-table";

interface FaqFormProps {
  faq: FaqRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FaqForm = ({ faq, open, onOpenChange }: FaqFormProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(faq?.is_active ?? true);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();

    const input: FaqInput = {
      question: text("question"),
      answer: text("answer"),
      sort_order: Number(text("sort_order") || 0),
      is_active: isActive,
    };

    startTransition(async () => {
      const result = faq
        ? await updateFaq(faq.id, input)
        : await createFaq(input);

      if (result.ok) {
        toast.success(faq ? "Question updated" : "Question added");
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{faq ? "Edit question" : "New question"}</DialogTitle>
          <DialogDescription>
            Shown in the FAQ section on the storefront, ordered by position.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="question">Question</Label>
            <Input
              defaultValue={faq?.question}
              id="question"
              maxLength={300}
              name="question"
              placeholder="How long does delivery take?"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="answer">Answer</Label>
            <Textarea
              defaultValue={faq?.answer}
              id="answer"
              maxLength={5000}
              name="answer"
              required
              rows={6}
            />
          </div>

          <div className="flex items-end gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sort_order">Position</Label>
              <Input
                className="w-24"
                defaultValue={faq?.sort_order ?? 0}
                id="sort_order"
                min={0}
                name="sort_order"
                type="number"
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                checked={isActive}
                id="is_active"
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="is_active">Published</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Saving..." : "Save question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
