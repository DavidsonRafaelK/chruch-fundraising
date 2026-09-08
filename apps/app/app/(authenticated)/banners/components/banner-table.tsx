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
import { ImageIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteBanner } from "@/app/actions/content/banners";
import { ConfirmDelete } from "../../components/confirm-delete";
import { BannerForm } from "./banner-form";

export interface BannerRow {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  link_label: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const formatWindow = (row: BannerRow): string => {
  const format = (value: string) => new Date(value).toLocaleDateString();

  if (row.starts_at && row.ends_at) {
    return `${format(row.starts_at)} - ${format(row.ends_at)}`;
  }
  if (row.starts_at) {
    return `From ${format(row.starts_at)}`;
  }
  if (row.ends_at) {
    return `Until ${format(row.ends_at)}`;
  }

  return "Always";
};

/** Active is a stored flag; live also accounts for the scheduling window. */
const isLive = (row: BannerRow): boolean => {
  const now = Date.now();

  return (
    row.is_active &&
    (!row.starts_at || new Date(row.starts_at).getTime() <= now) &&
    (!row.ends_at || new Date(row.ends_at).getTime() > now)
  );
};

export const BannerTable = ({ banners }: { banners: BannerRow[] }) => {
  const router = useRouter();
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<BannerRow | null>(null);
  const [pending, startTransition] = useTransition();

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: BannerRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) {
      return;
    }

    startTransition(async () => {
      const result = await deleteBanner(deleting.id);

      if (result.ok) {
        toast.success("Banner deleted");
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
          {banners.length} banner{banners.length === 1 ? "" : "s"}
        </p>
        <Button onClick={openNew} size="sm">
          <PlusIcon className="h-4 w-4" /> New banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium">No banners yet</p>
            <p className="text-muted-foreground text-sm">
              Add one to control what the storefront hero shows.
            </p>
          </div>
          <Button onClick={openNew} size="sm" variant="outline">
            <PlusIcon className="h-4 w-4" /> New banner
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">
                    {row.sort_order}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.title}</span>
                      {row.subtitle && (
                        <span className="line-clamp-1 text-muted-foreground text-xs">
                          {row.subtitle}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatWindow(row)}
                  </TableCell>
                  <TableCell>
                    {isLive(row) ? (
                      <Badge>Live</Badge>
                    ) : (
                      <Badge variant="secondary">
                        {row.is_active ? "Scheduled" : "Inactive"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        onClick={() => openEdit(row)}
                        size="icon"
                        variant="ghost"
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span className="sr-only">Edit {row.title}</span>
                      </Button>
                      <Button
                        onClick={() => setDeleting(row)}
                        size="icon"
                        variant="ghost"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="sr-only">Delete {row.title}</span>
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
        <BannerForm
          banner={editing}
          key={editing?.id ?? "new"}
          onOpenChange={setFormOpen}
          open={formOpen}
        />
      )}

      <ConfirmDelete
        description={`"${deleting?.title}" will be removed from the storefront. This cannot be undone.`}
        onConfirm={confirmDelete}
        onOpenChange={(open) => !open && setDeleting(null)}
        open={deleting !== null}
        pending={pending}
        title="Delete banner?"
      />
    </div>
  );
};
