"use server";

import { clerkClient } from "@repo/auth/server";
import { requireRoot, type Role } from "@repo/auth/roles";
import { resend } from "@repo/email";
import { InviteTemplate } from "@repo/email/templates/invite";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/env";
import { recordAudit } from "../content/audit";

const emailSchema = z.string().trim().email("Enter a valid email address");

type ActionResult = { ok: true } | { ok: false; error: string };

type InviteResult =
  | { ok: true; url: string; emailed: boolean }
  | { ok: false; error: string };

const revalidate = () => {
  revalidatePath("/system/users");
};

/**
 * Root is deliberately not grantable from this dashboard. It is the account
 * that manages every other account, so it is set by hand in the Clerk
 * dashboard (Users -> Public metadata) and never through a form that a
 * misclick could trigger. Everything here only ever deals in `admin`.
 */
const readRole = (metadata: unknown): Role | null => {
  const role = (metadata as { role?: unknown } | null)?.role;

  return role === "root" || role === "admin" ? role : null;
};

const getRole = async (userId: string): Promise<Role | null> => {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);

  return readRole(user.publicMetadata);
};

export const inviteAdmin = async (input: {
  email: string;
}): Promise<InviteResult> => {
  try {
    const actor = await requireRoot();
    const email = emailSchema.parse(input.email);

    const clerk = await clerkClient();

    const invitation = await clerk.invitations.createInvitation({
      redirectUrl: new URL("/sign-up", env.NEXT_PUBLIC_APP_URL).toString(),
      // Copied onto the user when the invitation is accepted. Without it the
      // new account signs in and immediately hits the staff-only screen.
      publicMetadata: { role: "admin" },
      emailAddress: email,
      // Clerk's own email points at its hosted Account Portal, which is not
      // this dashboard: on a development instance the ticket endpoint ignores
      // the redirect and lands the invitee on accounts.dev. We send the ticket
      // straight to our own sign-up route instead.
      notify: false,
    });

    const url = buildInviteUrl(invitation.url);

    if (!url) {
      return { ok: false, error: "Clerk did not return a usable ticket" };
    }

    const emailed = await sendInviteEmail(email, url);

    await recordAudit(
      actor,
      "create",
      "invitation",
      invitation.id,
      `Invited ${email} as admin`
    );
    revalidate();

    return { ok: true, url, emailed };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

/**
 * Clerk hands back a link to its own ticket endpoint. The ticket itself is the
 * credential, so we lift it out and point it at our sign-up route, which the
 * Clerk SignUp component picks up from `__clerk_ticket`.
 */
const buildInviteUrl = (clerkUrl: string | undefined): string | null => {
  if (!clerkUrl) {
    return null;
  }

  let ticket: string | null;

  try {
    ticket = new URL(clerkUrl).searchParams.get("ticket");
  } catch {
    return null;
  }

  if (!ticket) {
    return null;
  }

  const url = new URL("/sign-up", env.NEXT_PUBLIC_APP_URL);

  url.searchParams.set("__clerk_ticket", ticket);

  return url.toString();
};

/** Best effort: the caller still shows the link so it can be shared by hand. */
const sendInviteEmail = async (
  email: string,
  url: string
): Promise<boolean> => {
  if (!(resend && env.RESEND_FROM)) {
    return false;
  }

  try {
    await resend.emails.send({
      from: env.RESEND_FROM,
      to: email,
      subject: "You have been invited to the dashboard",
      react: InviteTemplate({ storeName: "Acme Inc", url }),
    });

    return true;
  } catch {
    return false;
  }
};

/**
 * Replaces an invitation that was created in the Clerk Dashboard.
 *
 * Those carry no role and no redirect, so the invitee lands on Clerk's Account
 * Portal and, even if they get through, has no dashboard access. Revoking and
 * re-creating through `inviteAdmin` fixes both.
 */
export const resendInvitation = async (
  id: string,
  email: string
): Promise<InviteResult> => {
  try {
    await requireRoot();

    const clerk = await clerkClient();

    await clerk.invitations.revokeInvitation(id);

    return await inviteAdmin({ email });
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

export const revokeInvitation = async (id: string): Promise<ActionResult> => {
  try {
    const actor = await requireRoot();
    const clerk = await clerkClient();

    await clerk.invitations.revokeInvitation(id);

    await recordAudit(actor, "delete", "invitation", id, "Revoked invitation");
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

/**
 * Grants admin to an account that already exists - the repair path for anyone
 * invited before invitations carried a role.
 */
export const grantAdmin = async (userId: string): Promise<ActionResult> => {
  try {
    const actor = await requireRoot();

    if ((await getRole(userId)) === "root") {
      return { ok: false, error: "Root accounts are managed in Clerk" };
    }

    const clerk = await clerkClient();

    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { role: "admin" },
    });

    await recordAudit(actor, "update", "user", userId, "Granted admin access");
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

export const removeUserRole = async (userId: string): Promise<ActionResult> => {
  try {
    const actor = await requireRoot();

    if (actor.id === userId) {
      return { ok: false, error: "You cannot remove your own access" };
    }

    // Never let one root strip another from here; that belongs in Clerk.
    if ((await getRole(userId)) === "root") {
      return { ok: false, error: "Root accounts are managed in Clerk" };
    }

    const clerk = await clerkClient();

    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { role: null },
    });

    await recordAudit(
      actor,
      "update",
      "user",
      userId,
      "Revoked dashboard access"
    );
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

const toMessage = (error: unknown): string => {
  if (error instanceof z.ZodError) {
    return error.issues.at(0)?.message ?? "Invalid input";
  }

  if (error && typeof error === "object" && "errors" in error) {
    const clerkErrors = (error as { errors?: { message?: string }[] }).errors;

    return clerkErrors?.at(0)?.message ?? "Clerk rejected the request";
  }

  return error instanceof Error ? error.message : "Something went wrong";
};
