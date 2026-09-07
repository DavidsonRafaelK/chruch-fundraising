import { requireAdmin } from "@repo/supabase/require-admin";
import { AdminSidebar } from "@/components/admin-sidebar";

/*
 * The layout's requireAdmin() is for the shell (it needs the signed-in
 * email). It is NOT the authorization boundary — every page and action
 * under here calls requireAdmin() itself, because a layout does not re-run
 * on client-side navigations between its children.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <AdminSidebar email={user.email ?? ""} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
    </div>
  );
}
