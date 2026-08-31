import { requireAdmin } from "@repo/supabase/require-admin";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const user = await requireAdmin();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Admin dashboard</h1>
        <form action={signOut}>
          <button type="submit" className="text-sm underline">
            Sign out
          </button>
        </form>
      </div>
      <p className="mt-2 text-sm text-neutral-500">Signed in as {user.email}</p>
    </div>
  );
}
