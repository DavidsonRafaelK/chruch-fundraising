"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { PackageIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteProduct } from "@/app/actions/content/products";
import { ConfirmDelete } from "../../components/confirm-delete";
import { ProductForm } from "./product-form";

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ProductRow {
  id: string;
  title: string;
  short_description: string;
  long_description: string | null;
  ingredients: string | null;
  category_id: string;
  category_name: string;
  price: string;
  is_available: boolean;
  image_url: string;
  image_url_2: string | null;
  image_url_3: string | null;
}

interface ProductTableProps {
  products: ProductRow[];
  categories: CategoryOption[];
}

export const ProductTable = ({ products, categories }: ProductTableProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProductRow | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return products;
    }

    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(needle) ||
        product.category_name.toLowerCase().includes(needle)
    );
  }, [products, query]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: ProductRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) {
      return;
    }

    startTransition(async () => {
      const result = await deleteProduct(deleting.id);

      if (result.ok) {
        toast.success("Product deleted");
        setDeleting(null);
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          className="max-w-xs"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name or category"
          value={query}
        />
        <Button disabled={categories.length === 0} onClick={openNew} size="sm">
          <PlusIcon className="h-4 w-4" /> New product
        </Button>
      </div>

      {categories.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
          Add a category in the database before creating products - every
          product must belong to one.
        </p>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <PackageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-medium">
            {products.length === 0 ? "No products yet" : "Nothing matches"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.title}</span>
                      <span className="line-clamp-1 text-muted-foreground text-xs">
                        {row.short_description}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.category_name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    Rp{Number(row.price).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.is_available ? "default" : "secondary"}>
                      {row.is_available ? "Available" : "Hidden"}
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
        <ProductForm
          categories={categories}
          key={editing?.id ?? "new"}
          onOpenChange={setFormOpen}
          open={formOpen}
          product={editing}
        />
      )}

      <ConfirmDelete
        description={`"${deleting?.title}" will be removed from the catalogue. Past orders keep their saved copy of the name and price.`}
        onConfirm={confirmDelete}
        onOpenChange={(open) => !open && setDeleting(null)}
        open={deleting !== null}
        pending={pending}
        title="Delete product?"
      />
    </div>
  );
};
