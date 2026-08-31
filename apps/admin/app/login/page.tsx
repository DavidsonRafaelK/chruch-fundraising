"use client";

import { useActionState } from "react";
import { type LoginState, login } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border p-6"
      >
        <h1 className="text-lg font-semibold">Admin login</h1>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded border px-3 py-2"
          />
        </label>

        {state.error ? (
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
