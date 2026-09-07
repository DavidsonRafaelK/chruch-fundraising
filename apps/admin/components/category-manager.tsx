"use client";

import type { Tables } from "@repo/supabase/types";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/app/(admin)/categories/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CategoryManager({
  categories,
}: {
  categories: Tables<"categories">[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setEditingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              run(async () => {
                const result = await createCategory({
                  name: String(data.get("name") ?? ""),
                  hasIngredients: data.get("hasIngredients") === "on",
                });
                if (result.success) {
                  form.reset();
                }
                return result;
              });
            }}
          >
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <Label htmlFor="name">New category</Label>
              <Input id="name" name="name" required maxLength={100} />
            </div>
            <label className="flex items-center gap-2 py-2 text-sm">
              <input type="checkbox" name="hasIngredients" className="size-4" />
              Has ingredients
            </label>
            <Button type="submit" disabled={pending}>
              Add category
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              No categories yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3"
                >
                  {editingId === category.id ? (
                    <form
                      className="flex flex-1 flex-wrap items-center gap-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const data = new FormData(event.currentTarget);
                        run(() =>
                          updateCategory(category.id, {
                            name: String(data.get("name") ?? ""),
                            hasIngredients: data.get("hasIngredients") === "on",
                          }),
                        );
                      }}
                    >
                      <Input
                        name="name"
                        defaultValue={category.name}
                        required
                        maxLength={100}
                        className="max-w-64 flex-1"
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="hasIngredients"
                          defaultChecked={category.has_ingredients}
                          className="size-4"
                        />
                        Has ingredients
                      </label>
                      <div className="ml-auto flex gap-1">
                        <Button
                          type="submit"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Save category"
                          disabled={pending}
                        >
                          <Check />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Cancel editing"
                          onClick={() => setEditingId(null)}
                        >
                          <X />
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">
                        {category.name}
                      </span>
                      {category.has_ingredients && (
                        <Badge variant="outline">Ingredients</Badge>
                      )}
                      <div className="ml-auto flex gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${category.name}`}
                          onClick={() => {
                            setError(null);
                            setEditingId(category.id);
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Delete ${category.name}`}
                          disabled={pending}
                          onClick={() => run(() => deleteCategory(category.id))}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
