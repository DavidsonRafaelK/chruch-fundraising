"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  MessageCircleQuestionIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteFaq } from "@/app/actions/content/faqs";
import { ConfirmDelete } from "../../components/confirm-delete";
import { FaqForm } from "./faq-form";

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export const FaqTable = ({ faqs }: { faqs: FaqRow[] }) => {
  const router = useRouter();
  const [editing, setEditing] = useState<FaqRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<FaqRow | null>(null);
  const [pending, startTransition] = useTransition();

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: FaqRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) {
      return;
    }

    startTransition(async () => {
      const result = await deleteFaq(deleting.id);

      if (result.ok) {
        toast.success("Question deleted");
        setDeleting(null);
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {faqs.length} question{faqs.length === 1 ? "" : "s"}
        </p>
        <Button onClick={openNew} size="sm">
          <PlusIcon className="h-4 w-4" /> New question
        </Button>
      </div>

      {faqs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <MessageCircleQuestionIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium">No questions yet</p>
            <p className="text-muted-foreground text-sm">
              The storefront hides the FAQ section until you add one.
            </p>
          </div>
          <Button onClick={openNew} size="sm" variant="outline">
            <PlusIcon className="h-4 w-4" /> New question
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faqs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">
                    {row.sort_order}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.question}</span>
                      <span className="line-clamp-1 text-muted-foreground text-xs">
                        {row.answer}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.is_active ? "default" : "secondary"}>
                      {row.is_active ? "Published" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        onClick={() => openEdit(row)}
                        size="icon"
                        variant="ghost"
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        onClick={() => setDeleting(row)}
                        size="icon"
                        variant="ghost"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {formOpen && (
        <FaqForm
          faq={editing}
          key={editing?.id ?? "new"}
          onOpenChange={setFormOpen}
          open={formOpen}
        />
      )}

      <ConfirmDelete
        description={`"${deleting?.question}" will be removed from the storefront. This cannot be undone.`}
        onConfirm={confirmDelete}
        onOpenChange={(open) => !open && setDeleting(null)}
        open={deleting !== null}
        pending={pending}
        title="Delete question?"
      />
    </div>
  );
};
