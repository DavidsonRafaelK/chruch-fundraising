"use client";

import type { Role } from "@repo/auth/roles";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  CopyIcon,
  MailIcon,
  ShieldIcon,
  RefreshCwIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  grantAdmin,
  inviteAdmin,
  removeUserRole,
  resendInvitation,
  revokeInvitation,
} from "@/app/actions/system/users";

interface UserRow {
  id: string;
  email: string;
  name: string;
  imageUrl: string;
  role: Role | null;
}

interface InvitationRow {
  id: string;
  email: string;
  role: Role | null;
  createdAt: string;
  url: string | null;
}

interface UserTableProps {
  users: UserRow[];
  invitations: InvitationRow[];
  currentUserId: string;
}

export const UserTable = ({
  users,
  invitations,
  currentUserId,
}: UserTableProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [lastInvite, setLastInvite] = useState<{
    email: string;
    url: string;
    emailed: boolean;
  } | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
    startTransition(async () => {
      const result = await action();

      if (result.ok) {
        toast.success(done);
        router.refresh();
        return;
      }

      toast.error(result.error ?? "Something went wrong");
    });
  };

  const invite = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const invited = email;

    startTransition(async () => {
      const result = await inviteAdmin({ email: invited });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setEmail("");
      setLastInvite({ email: invited, url: result.url, emailed: result.emailed });
      toast.success(
        result.emailed
          ? `Invitation emailed to ${invited}`
          : "Invitation created - copy the link below to share it"
      );
      router.refresh();
    });
  };

  const fixInvitation = (invitation: InvitationRow) => {
    startTransition(async () => {
      const result = await resendInvitation(invitation.id, invitation.email);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setLastInvite({
        email: invitation.email,
        url: result.url,
        emailed: result.emailed,
      });
      toast.success(
        result.emailed
          ? `Re-sent to ${invitation.email} with a working link`
          : "Fixed - copy the link below to share it"
      );
      router.refresh();
    });
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy - select the link and copy it manually");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border p-4"
        onSubmit={invite}
      >
        <div className="flex min-w-64 flex-1 flex-col gap-2">
          <Label htmlFor="invite-email">Invite someone</Label>
          <Input
            id="invite-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            required
            type="email"
            value={email}
          />
        </div>
        <Button disabled={pending} type="submit">
          <UserPlusIcon className="h-4 w-4" /> Send invite
        </Button>
        <p className="w-full text-muted-foreground text-xs">
          Invitees join as admin. Root is set by hand in Clerk.
        </p>
      </form>

      {lastInvite && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed p-4">
          <p className="font-medium text-sm">
            Invitation link for {lastInvite.email}
          </p>
          <p className="text-muted-foreground text-xs">
            {lastInvite.emailed
              ? "An email was sent, and this link works too."
              : "Email is not configured, so share this link yourself."}
          </p>
          <div className="flex gap-2">
            <Input
              className="font-mono text-xs"
              onFocus={(event) => event.target.select()}
              readOnly
              value={lastInvite.url}
            />
            <Button
              onClick={() => copy(lastInvite.url)}
              size="icon"
              variant="outline"
            >
              <CopyIcon className="h-4 w-4" />
              <span className="sr-only">Copy invitation link</span>
            </Button>
          </div>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-medium">Pending invitations</h2>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="flex items-center gap-2">
                      <MailIcon className="h-4 w-4 text-muted-foreground" />
                      {invitation.email}
                    </TableCell>
                    <TableCell>
                      {invitation.role ? (
                        <Badge variant="secondary">{invitation.role}</Badge>
                      ) : (
                        <Badge variant="destructive">
                          sent from Clerk - no role
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(invitation.createdAt).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {invitation.url && invitation.role !== null && (
                          <Button
                            onClick={() => copy(invitation.url as string)}
                            size="sm"
                            variant="outline"
                          >
                            <CopyIcon className="h-4 w-4" /> Copy link
                          </Button>
                        )}
                        {invitation.role === null && (
                          <Button
                            disabled={pending}
                            onClick={() => fixInvitation(invitation)}
                            size="sm"
                            variant="outline"
                          >
                            <RefreshCwIcon className="h-4 w-4" /> Fix &amp;
                            resend
                          </Button>
                        )}
                        <Button
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => revokeInvitation(invitation.id),
                              "Invitation revoked"
                            )
                          }
                          size="icon"
                          variant="ghost"
                        >
                          <XIcon className="h-4 w-4" />
                          <span className="sr-only">Revoke</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Accounts</h2>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Access</TableHead>
                <TableHead className="w-56 text-right">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {user.name || user.email}
                          {isSelf && (
                            <span className="ml-2 text-muted-foreground text-xs">
                              you
                            </span>
                          )}
                        </span>
                        {user.name && (
                          <span className="text-muted-foreground text-xs">
                            {user.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role ? (
                        <Badge
                          variant={
                            user.role === "root" ? "default" : "secondary"
                          }
                        >
                          {user.role}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">no access</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {user.role === "root" ? (
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <ShieldIcon className="h-3 w-3" />
                            Managed in Clerk
                          </span>
                        ) : (
                          <>
                            {user.role === null && (
                              <Button
                                disabled={pending}
                                onClick={() =>
                                  run(
                                    () => grantAdmin(user.id),
                                    `${user.email} is now an admin`
                                  )
                                }
                                size="sm"
                                variant="outline"
                              >
                                Make admin
                              </Button>
                            )}
                            <Button
                              disabled={pending || isSelf || !user.role}
                              onClick={() =>
                                run(
                                  () => removeUserRole(user.id),
                                  "Access revoked"
                                )
                              }
                              size="icon"
                              variant="ghost"
                            >
                              <XIcon className="h-4 w-4" />
                              <span className="sr-only">Revoke access</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
