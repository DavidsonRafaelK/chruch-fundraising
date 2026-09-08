import { clerkClient } from "@repo/auth/server";
import { getActor, type Role, ROLES } from "@repo/auth/roles";
import type { Metadata } from "next";
import { env } from "@/env";
import { Header } from "../../components/header";
import { RootOnly } from "../components/root-only";
import { UserTable } from "./components/user-table";

export const metadata: Metadata = {
  title: "Users",
  description: "Invite staff and manage dashboard access.",
};

const asRole = (value: unknown): Role | null =>
  ROLES.includes(value as Role) ? (value as Role) : null;

/**
 * Clerk returns a link to its own ticket endpoint, which on a development
 * instance lands the invitee on the Account Portal. Point the same ticket at
 * our sign-up route so root can copy a link that actually reaches this
 * dashboard. This page is root-only, so surfacing the ticket here is fine -
 * sharing it is the whole point.
 */
const toInviteUrl = (clerkUrl: string | undefined): string | null => {
  if (!clerkUrl) {
    return null;
  }

  try {
    const ticket = new URL(clerkUrl).searchParams.get("ticket");

    if (!ticket) {
      return null;
    }

    const url = new URL("/sign-up", env.NEXT_PUBLIC_APP_URL);

    url.searchParams.set("__clerk_ticket", ticket);

    return url.toString();
  } catch {
    return null;
  }
};

const UsersPage = async () => {
  const actor = await getActor();

  if (actor?.role !== "root") {
    return <RootOnly page="Users" />;
  }

  const clerk = await clerkClient();

  const [users, invitations] = await Promise.all([
    clerk.users.getUserList({ limit: 100 }),
    clerk.invitations.getInvitationList({ status: "pending", limit: 100 }),
  ]);

  return (
    <>
      <Header page="Users" pages={["System"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <UserTable
          currentUserId={actor.id}
          invitations={invitations.data.map((invitation) => ({
            id: invitation.id,
            email: invitation.emailAddress,
            role: asRole(
              (invitation.publicMetadata as { role?: unknown } | null)?.role
            ),
            createdAt: new Date(invitation.createdAt).toISOString(),
            url: toInviteUrl(invitation.url),
          }))}
          users={users.data.map((user) => ({
            id: user.id,
            email: user.emailAddresses.at(0)?.emailAddress ?? "",
            name: [user.firstName, user.lastName].filter(Boolean).join(" "),
            imageUrl: user.imageUrl,
            role: asRole(user.publicMetadata?.role),
          }))}
        />
      </div>
    </>
  );
};

export default UsersPage;
