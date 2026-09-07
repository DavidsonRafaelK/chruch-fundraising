"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LoginState, login } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardContent>
          <form action={formAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                Church Admin
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in to manage the store.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                required
                autoComplete="current-password"
              />
            </div>

            {state.error ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}

            <Button type="submit" size="lg" disabled={isPending}>
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
