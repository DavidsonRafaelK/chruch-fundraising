import "server-only";

import { currentUser } from "@clerk/nextjs/server";

/**
 * Admin identity is owned by Clerk, stored in the user's publicMetadata.
 *
 * Every database call goes through Prisma, which connects as `postgres` and
 * therefore bypasses row level security. That makes these checks the only
 * thing standing between a signed-in user and the store's data, so call
 * requireAdmin/requireRoot in every server action and route handler that
 * reads or writes admin data.
 */
export const ROLES = ["root", "admin"] as const;

export type Role = (typeof ROLES)[number];

export interface Actor {
  id: string;
  role: Role;
  label: string;
}

const parseRole = (value: unknown): Role | null =>
  ROLES.includes(value as Role) ? (value as Role) : null;

export const getActor = async (): Promise<Actor | null> => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const role = parseRole(user.publicMetadata?.role);

  if (!role) {
    return null;
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return {
    id: user.id,
    role,
    label: name || user.emailAddresses.at(0)?.emailAddress || user.id,
  };
};

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export const requireAdmin = async (): Promise<Actor> => {
  const actor = await getActor();

  if (!actor) {
    throw new ForbiddenError("Admin access required");
  }

  return actor;
};

export const requireRoot = async (): Promise<Actor> => {
  const actor = await getActor();

  if (actor?.role !== "root") {
    throw new ForbiddenError("Root access required");
  }

  return actor;
};
